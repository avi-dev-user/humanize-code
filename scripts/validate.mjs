// Structural validator for the humanize-code skill. No LLM needed.
// Exports pure check functions; run directly (`node scripts/validate.mjs`) for a CLI report.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Forbidden "AI punctuation", declared by code point so this source file stays clean itself.
const FORBIDDEN = {
  "em-dash": "—",
  "en-dash": "–",
  "ellipsis": "…",
  "left-single-quote": "‘",
  "right-single-quote": "’",
  "left-double-quote": "“",
  "right-double-quote": "”",
};

const TEXT_EXTS = new Set([".md", ".mjs", ".js", ".json", ".sh", ".yml", ".yaml"]);
const SKIP_DIRS = new Set(["node_modules", ".git"]);

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

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

// --- checks (each returns an array of error strings; empty means pass) ---

export function checkFrontmatter() {
  const errs = [];
  const src = read("SKILL.md");
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

export function checkNoAiPunctuation() {
  const errs = [];
  for (const file of walk(ROOT)) {
    const ext = file.slice(file.lastIndexOf("."));
    if (!TEXT_EXTS.has(ext)) continue;
    if (file === fileURLToPath(import.meta.url)) continue; // this file names the chars by code point only
    const src = readFileSync(file, "utf8");
    for (const [label, ch] of Object.entries(FORBIDDEN)) {
      const idx = src.indexOf(ch);
      if (idx !== -1) {
        const line = src.slice(0, idx).split("\n").length;
        errs.push(`${file.replace(ROOT + "/", "")}:${line}: contains ${label}`);
      }
    }
  }
  return errs;
}

export function checkLocalLinksResolve() {
  const errs = [];
  const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const rel of ["SKILL.md", "README.md", "CONTRIBUTING.md"]) {
    const src = read(rel);
    let m;
    while ((m = linkRe.exec(src)) !== null) {
      let target = m[1].trim();
      if (/^https?:\/\//.test(target) || target.startsWith("#")) continue;
      target = target.split("#")[0];
      if (!existsSync(join(ROOT, target))) errs.push(`${rel}: broken link -> ${target}`);
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

export function checkTellsInSync() {
  const skill = tokensFromTable(read("SKILL.md"));
  const readme = tokensFromTable(read("README.md"));
  const examples = tokensFromHeadings(read("references/code-examples.md"));
  if (skill.size === 0) return ["SKILL.md: no tells found in quick-reference table"];
  return [
    ...diffSets(skill, readme, "SKILL.md", "README.md"),
    ...diffSets(skill, examples, "SKILL.md", "code-examples.md"),
  ];
}

export function checkFixtures() {
  const errs = [];
  const dir = join(ROOT, "tests", "fixtures");
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

export function runAll() {
  const results = {};
  for (const [name, fn] of Object.entries(CHECKS)) results[name] = fn();
  return results;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
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
