import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CHECKS,
  runAll,
  checkFrontmatter,
  checkLocalLinksResolve,
  checkTellsInSync,
  checkFixtures,
} from "../scripts/validate.mjs";

// Build a throwaway repo from {relpath: content} and return its root.
function makeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), "hc-validate-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

// --- positive: the real repo satisfies its own rules ---
for (const [name, fn] of Object.entries(CHECKS)) {
  test(`real repo passes: ${name}`, () => {
    const errs = fn();
    assert.deepEqual(errs, [], errs.join("\n"));
  });
}

// --- the registry is what we expect (guards against a check being silently dropped) ---
test("CHECKS registry has the expected checks", () => {
  assert.deepEqual(Object.keys(CHECKS).sort(), [
    "fixtures",
    "frontmatter",
    "local-links-resolve",
    "tells-in-sync",
  ]);
});

// --- negative: each check actually detects its violation ---

test("frontmatter: detects missing frontmatter", () => {
  const root = makeRepo({ "SKILL.md": "# no frontmatter here\n" });
  try {
    assert.ok(checkFrontmatter(root).length > 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("local-links-resolve: detects a broken link", () => {
  const root = makeRepo({
    "SKILL.md": "see [x](references/missing.md)\n",
    "README.md": "ok\n",
    "CONTRIBUTING.md": "ok\n",
  });
  try {
    const errs = checkLocalLinksResolve(root);
    assert.ok(errs.some((e) => e.includes("missing.md")), errs.join("\n"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("tells-in-sync: detects a tell present in SKILL but missing from README", () => {
  const root = makeRepo({
    "SKILL.md": "| # | Tell | Fix |\n|---|---|---|\n| 1 | a | x |\n| 2 | b | y |\n",
    "README.md": "| # | Tell | Fix |\n|---|---|---|\n| 1 | a | x |\n",
    "references/code-examples.md": "## 1. a\n## 2. b\n",
  });
  try {
    const errs = checkTellsInSync(root);
    assert.ok(errs.some((e) => e.includes("2")), errs.join("\n"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fixtures: detects identical before/after", () => {
  const root = makeRepo({
    [join("tests", "fixtures", "dup", "before.py")]: "x = 1\n",
    [join("tests", "fixtures", "dup", "after.py")]: "x = 1\n",
  });
  try {
    const errs = checkFixtures(root);
    assert.ok(errs.some((e) => e.includes("identical")), errs.join("\n"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fixtures: detects a missing after.*", () => {
  const root = makeRepo({
    [join("tests", "fixtures", "solo", "before.py")]: "x = 1\n",
  });
  try {
    const errs = checkFixtures(root);
    assert.ok(errs.some((e) => e.includes("missing after")), errs.join("\n"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- runAll must report, not throw, when a required file is missing ---
test("runAll reports a crashed check instead of throwing", () => {
  const root = makeRepo({ "placeholder.txt": "empty repo, no SKILL.md\n" });
  try {
    const results = runAll(root);
    assert.ok(results.frontmatter.length > 0, "missing SKILL.md should surface as an error");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const description of ['description:', 'description: ""', "description: ''", 'description: "   "']) {
  test(`frontmatter: rejects empty description (${description})`, () => {
    const root = makeRepo({ "SKILL.md": `---\nname: humanize-code\n${description}\nlicense: MIT\n---\n` });
    try {
      assert.ok(checkFrontmatter(root).some(error => error.includes("description")));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

for (const files of [{}, { "tests/fixtures/.gitkeep": "" }]) {
  test(`fixtures: rejects ${Object.keys(files).length ? "empty" : "missing"} fixture collection`, () => {
    const root = makeRepo(files);
    try {
      assert.ok(checkFixtures(root).length > 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

for (const phase of ["before", "after"]) {
  test(`fixtures: rejects ambiguous ${phase} files`, () => {
    const root = makeRepo({
      "tests/fixtures/example/before.py": "old\n",
      "tests/fixtures/example/after.py": "new\n",
      [`tests/fixtures/example/${phase}.js`]: "alternative\n",
    });
    try {
      assert.ok(checkFixtures(root).some(error => error.includes(phase)));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test("fixtures: rejects a directory masquerading as a sample file", () => {
  const root = makeRepo({
    "tests/fixtures/example/before.py/nested": "old\n",
    "tests/fixtures/example/after.py": "new\n",
  });
  try {
    const errors = checkFixtures(root);
    assert.ok(errors.some(error => error.includes("before")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
