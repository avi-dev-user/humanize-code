# Text / Writing Tells

For any prose an AI produces around code: commit messages, PR descriptions, code comments, docs, README, and chat replies. These leak "AI authorship" as much as the code does.

Evidence strength: vocabulary tells are academically robust (Kobak et al., Science Advances 2025, on millions of documents). Structural tells are strong cross-source consensus but blog/essay-level. See research-corpus.md section B.

---

## Vocabulary (the quantified tell)

Overused by AI, rare in terse human technical writing:

delve, underscore(s), showcase, intricate, pivotal, crucial, meticulous, boast(s), comprehensive, robust, seamless, notably, furthermore, moreover, leverage (as verb), utilize (use "use"), facilitate, "it's worth noting", "it's important to note", "in conclusion", "testament to", "a wide range of", "in today's fast-paced world", "let's dive in".

**FIX:** plain, direct words. "use" not "utilize", "so" not "furthermore", drop "it's worth noting" entirely and just say the thing.

**Critical: the list is DYNAMIC.** After "delve" was publicly flagged in 2024, AI usage of it measurably dropped. Any fixed blocklist decays. Treat the words above as examples of a *category*, not a checklist to grep. The stable rule: plain, why-focused, terse. Do not judge text solely by "does it contain word X" (word-frequency is corpus-level evidence, weak for any single passage).

---

## Structure

### Bold-header bullet stacks
**AI:** every list item is `**Bold mini-heading:** a tidy explanation underneath.`, uniformly. The single most spotted formatting tell per editors.

**Human:** prose where prose fits; a plain list where a list fits; bold used sparingly for genuine emphasis, not as a template on every item.

### Negative parallelism / false contrast
**AI:** "It's not just X, it's Y." / "This isn't about A, it's about B." / "not only... but also...", used for rhetorical lift with no real content.

**Human:** state the point directly. If there is a genuine contrast, make it once.

### "X is the Y of Z" metaphor formula
**AI:** "Redis is the Swiss Army knife of caching." reflexively.

**Human:** describe what it does.

### Manufactured emphasis via consecutive short sentences
**AI:** "The result was clear. It worked. Every time." for drama.

**Human:** one sentence.

### Symmetric triads and over-parallel structure
**AI:** answers that always come in three balanced parts, every bullet the same length and shape.

**Human:** as many points as the content needs, uneven when the content is uneven.

The best single catalog of these is Wikipedia's "Signs of AI writing" (~15,000 words, community-maintained).

---

## Commit messages

**AI (smell):**
```
feat: implement comprehensive and robust user authentication

This commit introduces a seamless solution that leverages JWT:
- Added login functionality
- Added logout functionality
- Updated imports accordingly
- Improved overall code quality and maintainability
```

**Human (fix):**
```
add JWT login/logout with refresh rotation

refresh token rotates each use, so a leaked token is single-use
```

Short subject, body only if there is a *why* worth recording. Match the repo's existing commit voice. Never a Claude/AI co-author trailer.

---

## PR descriptions

**AI (smell):** long, bullet-heavy, restates the diff line by line, "comprehensive overview", sections for everything even when empty.

**Human (fix):** what changed and why, what to watch when reviewing, anything non-obvious. Matched to the actual commits, not inflated.

---

## Code comments (recap, see also code-examples.md)

Your team's comment language (if any), short (1 line, max 2), why-not-what, only where a reader would genuinely wonder. No auto-docstrings on trivial functions. Cluster around the hard parts; leave the obvious clean.

---

## What is NOT a reliable text tell (refuted)

- **Em-dash frequency as a detector** (rejected 0-3, twice). Avoiding em-dash stays a hard style rule (and a known AI fingerprint to eliminate), but you cannot reliably classify text as AI *by counting dashes*.
- **A training-mechanism story for why AI "prefers" a word** (rejected 0-3). No verified mechanism; do not repeat these explanations as fact.
- **Exact frequency multipliers** from popular articles. Unverified; do not cite as precise numbers.
