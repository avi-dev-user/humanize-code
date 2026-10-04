# Contributing

Review patterns must identify concrete maintenance or correctness problems, not presumed authorship.

## Adding or changing a pattern

- Explain the failure mode, preconditions, and cases that should remain unchanged.
- Include a source when making an empirical claim; document its limitations in `references/research-corpus.md`.
- Update `SKILL.md`, the README table, and the numbered examples together.
- Add executable regression coverage when the example changes behavior or demonstrates a behavior-preserving transformation. State which fixtures remain illustrative.
- Preserve useful boundary tests, runtime validation, meaningful text, and attribution.

## Checks

Run `npm test` with Node.js 20 or newer and Python 3. Run `shellcheck install.sh` when changing the installer; CI also checks it. Tests cover the package structure and selected executable examples, not the behavior of an LLM following the instructions.

Use clear prose and the repository's existing conventions. Punctuation and vocabulary are not authorship detectors or reasons to fail CI.
