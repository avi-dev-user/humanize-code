# Technical prose review

Use this reference only for in-scope comments, documentation, commit messages, or PR text. Improve clarity and accuracy; do not classify or disguise authorship.

## Wording

Replace vague claims with concrete behavior. For example, "provides seamless error handling" is less useful than "retries a timed-out request once, then returns the error" when that is what the code does. Preserve domain terminology and enough detail to explain the contract. Do not use a word blocklist.

## Structure

Use paragraphs, lists, tables, and headings when they help the reader follow the information. Follow repository templates. Explain the problem, resulting behavior, verification, and relevant limitations; scale detail to complexity.

## Comments

Preserve explanations of constraints, public API contracts, examples required by documentation tools, license notices, and attribution. Remove redundant draft narration only when it adds no useful information. Follow the team's comment language without imposing an arbitrary line limit.

## Punctuation and meaningful text

Follow explicit local conventions for editable prose. Punctuation alone is not a defect. Do not rewrite string literals, regexes, translated text, snapshots, or quotations for style. Changes to user-visible text need their own task justification.

## Attribution

Preserve existing attribution and follow project requirements for disclosure. A cleanup request does not authorize removing acknowledgments or hiding AI involvement.

## Evidence limits

The research corpus contains population-level observations about writing. These cannot establish authorship or quality for an individual passage. Judge the passage by its accuracy, clarity, and purpose.
