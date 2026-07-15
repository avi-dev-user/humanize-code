# Research Corpus: AI-Tells in Code and Text (2024-2026)

The evidence base behind this skill. Five deep-research rounds, hundreds of sources, 3-vote adversarial verification per claim (a claim needed to survive skeptics actively trying to refute it). Findings are grouped by category. Each carries a confidence level and primary sources.

Use this file when you need the *why* behind a rule, the strength of the evidence, or a citation. For day-to-day work the 16 tells in SKILL.md are enough.

---

## A. Practical code-level tells (the core of this skill)

Round result: 23 of 25 claims confirmed. This is the most directly actionable category.

- **Comments/docstrings are the clearest code-level fingerprint.** AI over-comments nearly every line, restates *what* trivial code does rather than *why*, and generates docstrings even on trivial functions. Human comments cluster around complex sections and preserve intent. Confidence: high (6+ independent sources + arXiv 2408.14007 on AI-comment quality). Mechanism: RLHF helpfulness bias.
- **Naming is a two-sided tell.** Over-descriptive sentence-names (`numberOfActiveUsersFromDatabaseTable`) AND generic bland ones (`data`, `result`, `temp`), oscillating within one file. Confidence: medium (blog consensus + arXiv 2506.12014, 2506.17323; no hard frequency data).
- **Error handling fails in two opposite directions.** Silent suppression (empty `catch`) and over-defensive redundancy (needless null checks, retry-wrapping-retry that turns 5 attempts into 25). Confidence: high. Sources: Greptile, matklad.github.io/2025/08/23/retry-loop-retry.html (real Netflix Metaflow PR), a `no-empty-catch` ESLint rule built from analyzing 500 AI mistakes.
- **Happy-path bias.** Solves the common/toy case, silently drops edge/boundary cases (null/empty, off-by-one pagination, max/zero, unexpected type, race, partial failure, permission checks on untested branches). Confidence: high. Source: GitHub's own blog checklist ("Off-by-one errors in pagination. Missing permission checks on a branch that's never hit in tests."), Greptile ("handles 95% of cases perfectly but silently drops the other 5%"). NOTE: the 95/5 is rhetorical, not a measured statistic.
- **Redundancy / low reuse.** Duplicate utility functions with slightly different names, validation reimplemented in several places, while the surface looks clean. **The one code-level tell with real quantitative backing:** peer-reviewed MSR '26 study (arXiv 2601.21276) measured 1.87x more semantic (Type-4) clones in AI PRs; GitClear (211M lines) found duplicated blocks grew ~8x in 2024, copy/paste exceeding refactored code for the first time.
- **Over-engineering.** Simple task solved in a complex way (manual membership loop vs `if item in list`), higher cyclomatic complexity than human solutions. Confidence: high (unusually well-backed: arXiv 2503.06327 documents 21.95% unnecessary control flows in CodeLlama; 2501.16857 higher cyclomatic complexity; 2503.05012 developer study).
- **"Looks right but wrong."** Passes tests while diverging from intent. GitHub's official reviewer guidance names three AI-specific pitfalls: hallucinated APIs, ignored constraints, incorrect logic; and warns AI tends to delete/skip a failing test rather than fix the cause. Source: docs.github.com/en/copilot/tutorials/review-ai-generated-code (first-party). Corroborated by Kent Beck's documented observation of agents deleting failing tests.

### Refuted here (do NOT flag)
- "AI code is unnaturally uniform / lacks personality." Rejected 0-3. Uniformity is not a discriminator.
- "AI code is structurally flawless (textbook SRP, proper exception handling, zero dead imports)." Rejected 0-3. Dead/unused imports and real defects DO appear in AI code.

---

## B. Text / writing tells (comments, commits, PRs, docs, chat)

Round result: vocabulary tells are academically robust; structural tells are blog-level consensus; several specific structural claims were refuted.

- **AI vocabulary is real and quantified.** Kobak et al. (Science Advances 2025, 15M+ PubMed abstracts): excess-usage ratios delve r=28.0, underscores r=13.8, showcasing r=10.7; estimated >=13.5% of 2024 abstracts show LLM processing (up to 40% in some subcorpora). Matsui (Perspectives on Medical Education, Dec 2025, 27.5M records): 103 of 135 candidate AI terms rose significantly. Kousha & Thelwall (Scientometrics 2026): delve +1,500%, underscore +1,000%, intricate +700% (2022-2024). Confidence: high.
- **The tell-list is DYNAMIC, not static.** After "delve" was publicly flagged as ChatGPT overuse in early 2024, its frequency measurably dropped soon after (Geng & Trotta, ACL Findings 2025, arXiv 2502.09606) as authors self-corrected. Meanwhile common, less-suspicious words (significant, additionally) kept rising because their ubiquity makes them unremarkable. IMPLICATION: any fixed word blocklist has a shelf life. The principle (plain, why-focused, terse) is what is stable; the specific words need periodic refresh.
- **Vocabulary studies self-limit.** The method is corpus-level and correlational, a lower bound, and cannot distinguish direct LLM authorship from humans who adopted LLM vocabulary by imitation. So word-frequency is weak evidence for judging any *single* piece of text. Source: Kobak et al. verbatim caveats.
- **Structural text tells (weaker, blog/essay-level):** bold-header bullet lists ("the bullet-point stack with a bold mini-heading, a colon, and a tidy explanation underneath"), "negative parallelism" ("it's not just X, it's Y" / "not only... but also"), consecutive short sentences for false emphasis, "X is the Y of Z" metaphor formula. Source consensus: Wikipedia "Signs of AI writing" (~15,000-word community essay, the best single catalog), shvbsle.in "Various LLM Smells", popularai.org.
- **Refuted:** em-dash frequency as a *detector* (0-3, twice); the "not only...but" claim as strongly-sourced (mixed); triadic-structure and exact frequency multipliers; a training-mechanism explanation for why AI "likes" a word (0-3). Avoiding em-dash remains a valid style rule; em-dash *frequency* is just not a reliable discriminator.

---

## C. Security and vulnerabilities (quantitative background)

Round result: 16 claims confirmed. Not day-to-day style, but explains why the self-review matters.

- **AI code carries more CWE-classified vulnerabilities than human code.** Peer-reviewed (IEEE ISSRE 2025, arXiv 2508.21634, 500k+ Python/Java samples): elevated command injection (CWE-78: 13,419 vs 2,243 human) and hardcoded credentials (CWE-798). Complementary CodeRabbit data on XSS (2.74x) and insecure object references (1.91x), though the CodeRabbit "overall 1.7x" headline failed verification.
- **Iterative "improve this" makes security WORSE, not better.** IEEE-ISTAS 2025 (arXiv 2506.11022): +37.6% critical vulnerabilities after 5 refinement iterations. Even when explicitly asked to "improve security," the model (GPT-4o) fixes visible flaws while introducing new, subtler ones (crypto misuse, over-engineering, outdated patterns). Tested worst-case (no human review between iterations).
- **Model-specific security data (2025 frontier models).** SonarSource benchmark (Dec 2025, 4,000+ Java tasks): blocker-severity vulnerabilities per MLOC: GPT-5.2 High 16, Opus 4.5 Thinking 44, GPT-5.1 High 53, Gemini 3 Pro 66, Claude Sonnet 4.5 198 (by far the worst). Vendor benchmark (SonarSource sells the analyzer), so medium confidence, but methodologically transparent.

---

## D. Code smells (quantitative background)

- **~89% of all AI-introduced issues are code smells,** not bugs or security. Large-scale study (arXiv 2603.28592, 304k+ AI-authored commits from 6,275 repos: Copilot, Claude, Cursor, Gemini, Devin): 89.1-89.3% code smells, ~5.8% bugs, ~4.7% security. SonarSource corroborates: code smells were 92-96% of all issues across every frontier model. The core problem with AI code is quiet stylistic/structural debt that looks fine and passes tests.
- **Code smells increase varies by model.** Java study (arXiv 2510.03029): average +63.34% vs human reference, but Falcon-7B best (+42%), Codex worst (+85%). So a tell-list should describe the general pattern, not depend on one model.
- **"Machine signature" worsens with capability.** arXiv 2605.02741: larger/more capable models produce MORE procedural bloat (Long Method), not less; humans concentrate defects in state management, LLMs shift to procedural. "Greater model capability correlated with method bloat." Single recent preprint, medium confidence.
- **Density can mislead.** Causal study (arXiv 2606.13298, 151 repos): architectural-smell *density* falls 6.7% after agentic-AI adoption, but raw smell counts are flat (+1.1%, n.s.) while LOC grows 12.8%. The "improvement" is a denominator artifact of faster code growth. Peer-reviewed (Euromicro SEAA 2026).
- **Reviewer bias.** Humans are measurably *less* critical of AI PRs than of equivalent human PRs, despite AI PRs having more issues, because surface plausibility masks the problems (MSR '26). This is why disciplined self-review beats trusting a casual human pass.

---

## E. Automated detection tools (what they actually check)

Thin category, mostly refuted or vendor-opaque, treat with skepticism.

- **Perplexity/burstiness heuristics are unreliable** for detection (per Pangram's own writeup, "why perplexity and burstiness fail to detect AI"). Pangram instead uses a supervised classifier trained on labeled AI-vs-human text (>97% recall claimed, vendor number).
- No verifiable public methodology was found for how CodeRabbit / Qodo / Sourcegraph Cody detect AI-authored *code* patterns specifically. Vendor claims did not survive verification. Do not cite tool internals as fact.

---

## Global caveats

1. The domain is largely qualitative. Only redundancy/reuse and over-engineering have genuine quantitative or peer-reviewed backing; GitHub's official docs anchor the review-skepticism finding. Comments, naming, and error-handling rest on strong cross-source blog consensus plus partial academic corroboration.
2. Do NOT quote blog multipliers as precise stats. The only measured figures that held: ~1.87x clones (MSR '26) and ~8x duplication growth (GitClear dataset).
3. Several primary sources sell detection or review tooling (Pangram, Greptile, aquilax, SonarSource, CodeRabbit). Each cited claim was corroborated by an independent non-commercial source, but note the conflict of interest.
4. All tells are model-behavior- and prompt-dependent and may weaken as models improve or when the developer prompts for terse human-style code. Findings reflect 2024-2026 material. Re-verify periodically.

## Source shortlist (verified, highest-value)

- GitHub, "Review AI-generated code" (docs.github.com/en/copilot/tutorials/review-ai-generated-code) - official, the review-pitfalls anchor
- github.blog "agent pull requests are everywhere, here's how to review them" - concrete reviewer checklist
- Greptile, "AI code review" (greptile.com/blog/ai-code-review)
- arXiv 2601.21276 (redundancy, MSR '26), 2408.14007 (comments), 2503.06327 / 2501.16857 (over-engineering)
- arXiv 2508.21634 (security), 2603.28592 (code smells at scale), 2508.14727 (Claude-inclusive Java benchmark)
- Kobak et al. Science Advances 2025 + Geng & Trotta ACL 2025 (vocabulary, dynamic list)
- SonarSource benchmark, Dec 2025 (frontier-model code quality)
- Wikipedia "Signs of AI writing" (text tells catalog)
