// Structural validator for the humanize-code skill. No LLM needed.
// Exports pure check functions; run directly (`node scripts/validate.mjs`) for a CLI report.
// Every check takes an optional repo root so tests can point it at a fixture repo.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, extname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Forbidden "AI punctuation", by code point so this source stays free of the glyphs it hunts.
const FORBIDDEN = {
  "em-dash": "\u2014",
  "en-dash": "\u2013",
  "ellipsis": "\u2026",
  "left-single-quote": "\u2018",
  "right-single-quote": "\u2019",
  "left-double-quote": "\u201c",
  "right-double-quote": "\u201d",
};

const TEXT_EXTS = new Set([".md", ".mjs", ".js", ".json", ".sh", ".yml", ".yaml"]);
const SKIP_DIRS = new Set(["node_modules", ".git"]);
// Fixtures are intentional bad examples (they demonstrate the tells), so they are exempt from the punctuation scan.
const PUNCT_EXEMPT = join("tests", "fixtures");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

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
  if (!/^description:\s*\S/m.test(fm)) errs.push("SKILL.md: frontmatter missing description");
  return errs;
}

export function checkNoAiPunctuation(root = ROOT) {
  const errs = [];
  for (const file of walk(root)) {
    if (!TEXT_EXTS.has(extname(file))) continue;
    if (relative(root, file).startsWith(PUNCT_EXEMPT)) continue;
    const src = readFileSync(file, "utf8");
    for (const [label, ch] of Object.entries(FORBIDDEN)) {
      const idx = src.indexOf(ch);
      if (idx !== -1) {
        const line = src.slice(0, idx).split("\n").length;
        errs.push(`${relative(root, file)}:${line}: contains ${label}`);
      }
    }
  }
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
  if (!existsSync(dir)) return errs;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    const files = readdirSync(full);
    const before = files.find((f) => f.startsWith("before."));
    const after = files.find((f) => f.startsWith("after."));
    if (!before) errs.push(`fixture ${name}: missing before.*`);
    if (!after) errs.push(`fixture ${name}: missing after.*`);
    if (before && after) {
      const b = readFileSync(join(full, before), "utf8");
      const a = readFileSync(join(full, after), "utf8");
      if (b.trim() === a.trim()) errs.push(`fixture ${name}: before and after are identical`);
    }
  }
  return errs;
}

export const CHECKS = {
  frontmatter: checkFrontmatter,
  "no-ai-punctuation": checkNoAiPunctuation,
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
