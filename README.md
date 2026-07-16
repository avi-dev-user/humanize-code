# humanize-code

[![CI](https://github.com/avi-dev-user/humanize-code/actions/workflows/ci.yml/badge.svg)](https://github.com/avi-dev-user/humanize-code/actions/workflows/ci.yml)

A [Claude Code](https://claude.com/claude-code) skill that reviews code you (or any AI) wrote and strips the "AI tells" so it reads as if a careful senior engineer wrote it.

It is a focused self-review pass, not a linter: scan a diff, find the recurring patterns that leak "machine-authored", verify each one against the real code, and fix it (or report it for you to fix).

## Why

Reviews of AI-generated code consistently find higher defect rates, with up to ~89% of the issues being stylistic/structural "code smells" rather than outright bugs, plus elevated rates of specific vulnerabilities. Worse, human reviewers are measurably *less* critical of AI code, because its surface plausibility hides the problems. This skill is the disciplined pass that catches what looks fine on the surface.

The patterns are model-agnostic and language-agnostic. They come from structured research (2024-2026): peer-reviewed papers, large-scale industry code-review datasets, and official vendor guidance, each claim run through adversarial verification. Sources and confidence levels are in [`references/research-corpus.md`](references/research-corpus.md).

## The tells

| # | Tell | One-line fix |
|---|------|--------------|
| 1 | Over-commenting / guide-comments | Delete what-comments; keep short why-comments on the hard parts |
| 2 | Redundancy / duplication | Dedupe into one helper; reuse what the repo already has |
| 3 | Defensive bloat | Remove guards the type/flow already guarantees |
| 3b | Needless type escape (`as any`, `@ts-ignore`) | Use the typed access; if the type is wrong, fix the type |
| 4 | Silent swallow / catch at wrong altitude | Never bare `catch {}`; narrow the catch, map infra errors honestly |
| 5 | Happy-path bias | Handle the edge/boundary cases that actually exist |
| 6 | Over-engineering | Collapse to the simplest form that works |
| 7 | Single-use helper | Inline it at the one call site |
| 8 | Bipolar naming | Precise, short, one consistent voice |
| 9 | Internal inconsistency | Mirror the adjacent code exactly |
| 10 | Dead code / unused imports | Remove them (AI code does leave these) |
| 11 | Hallucinated APIs | Verify every symbol/param exists |
| 12 | AI punctuation (em-dash etc.) | Plain hyphen or comma |
| 13 | AI vocabulary | Plain, direct wording |
| 14 | Deleted/skipped failing tests | Fix the code, not the test |
| 15 | Over-testing | Test behavior, not implementation |
| 16 | Over-structured commit/PR | Short, why-focused, match the repo voice |

Full before/after code for every tell: [`references/code-examples.md`](references/code-examples.md).
Prose tells (commits, PRs, docs): [`references/text-writing-tells.md`](references/text-writing-tells.md).

## What it deliberately does NOT flag

Chasing these produces false positives, so the skill leaves them alone (all tested and refuted):

- "AI code is unnaturally uniform / lacks personality." Not a discriminator.
- "AI code is structurally flawless." False, real AI code has mess.
- Em-dash *frequency* as a detector. Avoiding em-dash is a style choice; frequency does not classify.
- Precise blog multipliers ("1.7x more issues", "95%/5%"). Most failed verification.

## Install

The skill is a single directory. Drop it into your Claude Code skills folder:

```bash
git clone https://github.com/avi-dev-user/humanize-code.git
./humanize-code/install.sh          # copies into ~/.claude/skills/humanize-code
```

Or manually:

```bash
mkdir -p ~/.claude/skills/humanize-code
cp -R humanize-code/SKILL.md humanize-code/references ~/.claude/skills/humanize-code/
```

Claude Code picks up skills dynamically, no restart needed.

## Use

In Claude Code:

```
/humanize-code                 # scan current uncommitted changes
/humanize-code --staged        # scan staged changes only
/humanize-code src/auth.ts     # scan a specific file or directory
```

The skill verifies each finding against the real code before acting, applies fixes to code it just generated, and reports (rather than auto-editing) code you already have. It never commits for you.

### Pin a comment language

If your team writes code comments in a specific human language, add one line to `SKILL.md` under "Comment-language rule", e.g. `Comment language for this repo: Hebrew.` With no such line the skill follows the repo's existing convention.

## Tests

The repo ships a validator that runs in CI (no LLM needed):

```bash
npm test
```

It checks: valid frontmatter, no AI punctuation anywhere in the repo, every reference link resolves, the tell list in `SKILL.md` and `README.md` stays in sync with `references/code-examples.md`, and every fixture has a distinct before/after pair.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). New tells need a source and should survive the "is this actually a reliable signal, or a false positive?" bar. `npm test` must pass.

## License

[MIT](LICENSE).
