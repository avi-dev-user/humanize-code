# humanize-code

[![CI](https://github.com/avi-dev-user/humanize-code/actions/workflows/ci.yml/badge.svg)](https://github.com/avi-dev-user/humanize-code/actions/workflows/ci.yml)

A [Claude Code](https://claude.com/claude-code) skill to review AI-generated code for maintainability, consistency, and common structural code smells. It also works on human-written code.

It is a focused self-review pass: scan a diff, identify potential maintenance problems, verify each one against the real code, and fix it (or report it for you to fix). The goal is better code, with no claim about who authored it.

## Why

Plausible-looking code can still duplicate logic, hide failures, or rely on incorrect API assumptions. This skill checks those problems against the actual code and project conventions. Its research notes provide background, not a way to classify who wrote a change.

## Review patterns

| # | Pattern | Review guidance |
|---|------|--------------|
| 1 | Over-commenting / guide-comments | Remove redundant narration; preserve contracts and rationale |
| 2 | Redundancy / duplication | Share logic only when contracts match |
| 3 | Defensive bloat | Remove guards only after verifying runtime boundaries |
| 3b | Needless type escape (`as any`, `@ts-ignore`) | Verify runtime and declared types before removing escapes |
| 4 | Silent swallow / catch at wrong altitude | Preserve intended recovery; distinguish failure causes |
| 5 | Happy-path bias | Handle the edge/boundary cases that actually exist |
| 6 | Over-engineering | Collapse to the simplest form that works |
| 7 | Single-use helper | Inline only when the helper adds no clarity or boundary |
| 8 | Bipolar naming | Precise, short, one consistent voice |
| 9 | Internal inconsistency | Follow local conventions without copying defects |
| 10 | Dead code / unused imports | Verify side effects and consumers before removal |
| 11 | Hallucinated APIs | Verify every symbol/param exists |
| 12 | Prose style consistency | Follow explicit conventions; preserve meaningful text |
| 13 | Unclear wording | Improve meaning, not word-blocklist compliance |
| 14 | Deleted/skipped failing tests | Resolve failures against the intended contract |
| 15 | Low-value tests | Preserve real regression and boundary coverage |
| 16 | Unclear commit/PR explanation | Explain purpose, risk, and verification |

Examples and preconditions: [references/code-examples.md](references/code-examples.md).
Prose review guidance: [references/text-writing-tells.md](references/text-writing-tells.md).
Research notes: [references/research-corpus.md](references/research-corpus.md).

The skill does not treat punctuation, vocabulary, comment density, or single-use helpers as defects by themselves. Cleanup must preserve behavior; intentional bug fixes must identify and verify the corrected contract. Useful regression and boundary tests stay.

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

The skill verifies findings against the real code. Review requests produce a report; requests to fix code authorize scoped edits. Reports explain the location, evidence, impact, and verification limits. Commits require a user request.

### Pin a comment language

If your team writes code comments in a specific human language, add one line to `SKILL.md` under "Comment-language rule", e.g. `Comment language for this repo: Hebrew.` With no such line the skill follows the repo's existing convention.

## Tests

The repo ships a validator that runs in CI (no LLM needed):

```bash
npm test
```

Requires Node.js 20 or newer and Python 3. Structural checks cover frontmatter, local Markdown file links in the entry documents, pattern-number consistency, and distinct before/after fixtures. Executable examples check counting behavior (including iterators) and authentication error handling. The TypeScript type-escape fixture is illustrative, not compiled. These tests do not prove that an LLM will follow the skill or verify external research sources.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). New patterns need a concrete failure mode, evidence, and a false-positive check. `npm test` must pass.

## License

[MIT](LICENSE).
