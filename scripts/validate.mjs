// Structural validator for the humanize-code skill. No LLM needed.
// Exports pure check functions; run directly (`node scripts/validate.mjs`) for a CLI report.
// Every check takes an optional repo root so tests can point it at a fixture repo.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel, root = ROOT) {
  return readFileSync(join(root, rel), "utf8");
}

// --- checks (each returns an array of error strings; empty means pass) ---

export function checkFrontmatter(root = ROOT) {
  const errs = [];
  const src = read("SKILL.md", root);
  if (!src.startsWith("---\n")) {
    errs.push("SKILL.md: missing frontmatter opening ---");
    return errs;
  }
  const end = src.indexOf("\n---", 4);
  if (end === -1) {
    errs.push("SKILL.md: missing frontmatter closing ---");
    return errs;
  }
  const fm = src.slice(4, end);
  if (!/^name:\s*humanize-code\s*$/m.test(fm)) errs.push("SKILL.md: frontmatter name must be 'humanize-code'");
  // Read only this line: \s also matches newlines and can consume the next field.
  const description = fm.match(/^description:[ \t]*(.*)$/m)?.[1].trim();
  const content = description?.replace(/^(?:"(.*)"|'(.*)')$/, (_, double, single) => double ?? single).trim();
  if (!content) errs.push("SKILL.md: frontmatter missing or empty description");
  return errs;
}

export function checkLocalLinksResolve(root = ROOT) {
  const errs = [];
  const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const rel of ["SKILL.md", "README.md", "CONTRIBUTING.md"]) {
    const src = read(rel, root);
    let m;
    while ((m = linkRe.exec(src)) !== null) {
      let target = m[1].trim();
      if (/^https?:\/\//.test(target) || target.startsWith("#")) continue;
      target = target.split("#")[0];
      if (!existsSync(join(root, target))) errs.push(`${rel}: broken link -> ${target}`);
    }
  }
  return errs;
}

function tokensFromTable(src) {
  const set = new Set();
  for (const line of src.split("\n")) {
    const m = line.match(/^\|\s*(\d+[a-z]?)\s*\|/);
    if (m) set.add(m[1]);
  }
  return set;
}

function tokensFromHeadings(src) {
  const set = new Set();
  for (const line of src.split("\n")) {
    const m = line.match(/^##\s+(\d+[a-z]?)\.\s/);
    if (m) set.add(m[1]);
  }
  return set;
}

function diffSets(a, b, labelA, labelB) {
  const errs = [];
  for (const t of a) if (!b.has(t)) errs.push(`tell ${t} in ${labelA} but missing from ${labelB}`);
  for (const t of b) if (!a.has(t)) errs.push(`tell ${t} in ${labelB} but missing from ${labelA}`);
  return errs;
}

export function checkTellsInSync(root = ROOT) {
  const skill = tokensFromTable(read("SKILL.md", root));
  const readme = tokensFromTable(read("README.md", root));
  const examples = tokensFromHeadings(read("references/code-examples.md", root));
  if (skill.size === 0) return ["SKILL.md: no tells found in quick-reference table"];
  return [
    ...diffSets(skill, readme, "SKILL.md", "README.md"),
    ...diffSets(skill, examples, "SKILL.md", "code-examples.md"),
  ];
}

export function checkFixtures(root = ROOT) {
  const errs = [];
  const dir = join(root, "tests", "fixtures");
  if (!existsSync(dir)) return ["tests/fixtures: missing fixture directory"];
  const fixtures = readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory());
  if (fixtures.length === 0) return ["tests/fixtures: no fixture pairs found"];
  for (const { name } of fixtures) {
    const full = join(dir, name);
    const entries = readdirSync(full, { withFileTypes: true });
    const pair = {};
    for (const phase of ["before", "after"]) {
      const matches = entries.filter(entry => entry.name.startsWith(`${phase}.`));
      if (matches.length === 0) {
        errs.push(`fixture ${name}: missing ${phase}.*`);
      } else if (matches.length !== 1) {
        errs.push(`fixture ${name}: expected one ${phase}.* file, found ${matches.length}`);
      } else if (!matches[0].isFile()) {
        errs.push(`fixture ${name}: ${matches[0].name} must be a regular file`);
      } else {
        pair[phase] = matches[0].name;
      }
    }
    if (pair.before && pair.after) {
      const b = readFileSync(join(full, pair.before), "utf8");
      const a = readFileSync(join(full, pair.after), "utf8");
      if (b.trim() === a.trim()) errs.push(`fixture ${name}: before and after are identical`);
    }
  }
  return errs;
}

export const CHECKS = {
  frontmatter: checkFrontmatter,
  "local-links-resolve": checkLocalLinksResolve,
  "tells-in-sync": checkTellsInSync,
  fixtures: checkFixtures,
};

export function runAll(root = ROOT) {
  const results = {};
  for (const [name, fn] of Object.entries(CHECKS)) {
    try {
      results[name] = fn(root);
    } catch (err) {
      results[name] = [`check crashed: ${err.message}`];
    }
  }
  return results;
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = runAll();
  let failed = 0;
  for (const [name, errs] of Object.entries(results)) {
    if (errs.length === 0) {
      console.log(`ok   ${name}`);
    } else {
      failed += errs.length;
      console.log(`FAIL ${name}`);
      for (const e of errs) console.log(`     ${e}`);
    }
  }
  console.log(failed === 0 ? "\nall checks passed" : `\n${failed} problem(s)`);
  process.exit(failed === 0 ? 0 : 1);
}
