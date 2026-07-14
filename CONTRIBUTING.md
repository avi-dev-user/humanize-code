# Contributing

Thanks for improving `humanize-code`. The bar for this project is deliberately high: a bad "tell" is worse than a missing one, because it trains people to flag false positives.

## The bar for a new tell

Before adding a tell, it must clear all three:

1. **A source.** A peer-reviewed paper, a large-scale industry dataset, official vendor guidance, or a strong cross-source practitioner consensus. Add the citation to `references/research-corpus.md`.
2. **A real failure mode.** The pattern should produce worse code (harder to read, wrong at the edges, hides a defect), not just "looks AI". "Looks AI" alone is not enough, see the refuted list.
3. **Not already refuted.** Check the "What is NOT a reliable tell" sections. Uniformity, structural flawlessness, and em-dash frequency were tested and rejected. Do not re-add them.

## When you add or change a tell

- Update `SKILL.md` (the numbered list and the quick-reference table).
- Update the table in `README.md` to match.
- Add a before/after pair in `references/code-examples.md` with the same number.
- Optionally add a fixture under `tests/fixtures/<n-slug>/` with `before.*` and `after.*`.
- Run `npm test`. It enforces that these stay in sync and that nothing introduces AI punctuation.

## Style rules for this repo

- No em-dash, en-dash, single-char ellipsis, or smart quotes anywhere. Plain hyphen or comma. The validator fails the build on these.
- Keep prose plain and direct. This project is about not writing like an AI; the docs should practice it.
- Keep `SKILL.md` lean. Depth goes in `references/`, loaded on demand.

## Running the checks

```bash
npm test        # runs the validator and the fixture checks
```

CI runs the same command on every push and pull request.
