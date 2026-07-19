# Code Examples: AI-Tell -> Human Fix

Concrete before/after pairs for each tell. Language-neutral where possible; the pattern is what matters, not the syntax. Numbering matches `SKILL.md`.

---

## 1. Over-commenting / guide-comments

**AI (smell):**
```python
# Initialize the counter to zero
counter = 0
# Loop through each user in the list
for user in users:
    # Increment the counter by one
    counter += 1
# Return the final count
return counter
```

**Human (fix):** the code says all of this already.
```python
return len(users)
```

**AI (smell) - auto docstring on a trivial fn:**
```python
def add(a, b):
    """Add two numbers together and return their sum.

    Args:
        a: The first number.
        b: The second number.
    Returns:
        The sum of a and b.
    """
    return a + b
```

**Human (fix):** no docstring needed. Keep docstrings for non-obvious contracts only.
```python
def add(a, b):
    return a + b
```

**When a comment IS justified (why, not what):**
```python
# the upstream server drops the connection after 30s idle, so ping every 25s
socket.set_keepalive(25_000)
```

**AI (smell) - width-padded section dividers, uniform across the file:**
```python
# -- config ---------------------------------------------------------
DEBUG = False

# -- websocket sync -------------------------------------------------
def connect(): ...

# -- helpers --------------------------------------------------------
def clamp(x): ...
```
The dashes are counted out to a fixed column on every section, including trivial ones. A human rarely pads to a set width uniformly.

**Human (fix):** let the code group itself, or use one plain label where a section is genuinely large.
```python
DEBUG = False

def connect(): ...

def clamp(x): ...
```

CALIBRATE: a single labeled divider in a long file is fine and human-normal. The tell is uniform, width-padded dividers repeated across the file, especially on short/trivial sections. Do not flag one plain section label.

Rule of thumb: human comments cluster around the hard parts and explain *why*. AI comments are evenly spread and explain *what*.

---

## 2. Redundancy / duplication

**AI (smell):** two near-identical validators.
```ts
function isValidUserEmail(email: string) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}
function checkEmailFormat(addr: string) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(addr);
}
```

**Human (fix):** one helper, reused.
```ts
function isEmail(value: string) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(value);
}
```

Before writing a new helper, grep the repo. If an equivalent already exists, use it.

---

## 3. Defensive bloat

**AI (smell):** guards on values the type/flow already guarantees.
```ts
function totalPrice(items: CartItem[]): number {
  if (!items) return 0;                 // items is typed non-null
  if (!Array.isArray(items)) return 0;  // the type already says array
  if (items.length === 0) return 0;     // sum of empty is already 0
  return items.reduce((s, i) => s + i.price, 0);
}
```

**Human (fix):**
```ts
function totalPrice(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.price, 0);
}
```

**AI (smell) - retry wrapping retry (5 attempts becomes 25):**
```ts
async function fetchWithRetry(url: string) {
  for (let i = 0; i < 5; i++) {
    try {
      return await retryingHttpClient.get(url); // client already retries 5x
    } catch { /* try again */ }
  }
}
```

**Human (fix):** one layer.
```ts
async function fetch(url: string) {
  return retryingHttpClient.get(url);
}
```

---

## 3b. Needless type escape

**AI (smell):** casts to `any` to read a field the type already declares.
```ts
// res.locals type ALREADY has: secondaryScope?: {...}
const rows = await service.list(userId, (res.locals as any).secondaryScope);
```
Worse, the same object is accessed typed one line up (`res.locals.userId`) and cast the next, so it reads inconsistent.

**Human (fix):** use the typed access; the cast was pure noise.
```ts
const rows = await service.list(res.locals.userId, res.locals.secondaryScope);
```

VERIFY first: open the type declaration. If the field is missing, the honest fix is to *add it to the type*, not to cast. Same for `@ts-ignore` / `# type: ignore` hiding an error the code should actually resolve.

---

## 4. Silent swallow, or catch at the wrong altitude

**AI (smell a) - bare swallow:**
```ts
try {
  await saveOrder(order);
} catch {
  // move along, nothing to see here
}
```

**Human (fix):** either let it throw, or handle via the project's real mechanism.
```ts
try {
  await saveOrder(order);
} catch (err) {
  notifyUser('saving the order failed');
  throw err;
}
```

Never a bare empty `catch {}`. A `no-empty-catch` lint rule was literally built by analyzing AI mistakes.

**AI (smell b) - catch too broad, wrong layer:** one try/catch wraps token parsing AND DB lookups, returns 401 for everything.
```ts
try {
  const session = JSON.parse(decode(header)); // bad token -> should be 401
  const user = await db.getUser(session.id);   // DB down -> becomes a wrong 401
  res.locals.user = user;
  next();
} catch {
  return res.status(401).send('Unauthorized'); // masks a 500 as an auth failure
}
```

**Human (fix):** narrow the catch to what actually throws the handled error; let infra failures surface honestly.
```ts
let session;
try {
  session = JSON.parse(decode(header));
} catch {
  return res.status(401).send('Unauthorized'); // only the parse is an auth failure
}
const user = await db.getUser(session.id); // a DB error here throws -> 500, not 401
res.locals.user = user;
next();
```

A catch in the wrong place (too broad, too late) hides the real failure and sends the client down the wrong recovery path.

---

## 5. Happy-path bias

**AI (smell):** works on the common case, silently wrong at the edge.
```ts
function page(items: T[], pageNum: number, size: number) {
  const start = pageNum * size; // off-by-one if pageNum is 1-based
  return items.slice(start, start + size);
}
```

**Human (fix):** handle the boundary that actually exists in this codebase, and be explicit.
```ts
// pages are 1-based here (like the rest of the API)
function page(items: T[], pageNum: number, size: number) {
  const start = (pageNum - 1) * size;
  return items.slice(start, start + size);
}
```

Other happy-path drops to check for: empty input, max/zero values, unexpected type, an auth check on a branch tests never hit, partial failure, concurrency. Verify boundary behavior; do not trust "tests pass".

---

## 6. Over-engineering

**AI (smell):** manual loop for a built-in.
```python
found = False
for x in items:
    if x == target:
        found = True
        break
```

**Human (fix):**
```python
found = target in items
```

**AI (smell) - premature abstraction:**
```ts
interface Formatter { format(v: unknown): string; }
class DateFormatter implements Formatter { /* only impl, one caller */ }
```

**Human (fix):** a function, until a second implementation actually exists.
```ts
function formatDate(v: Date): string { /* ... */ }
```

---

## 7. Single-use helper

**AI (smell):** extracted, called once, hides nothing complex.
```ts
function buildGreeting(name: string) { return `Hello ${name}`; }
// ...one call site...
el.textContent = buildGreeting(user.name);
```

**Human (fix):** inline it.
```ts
el.textContent = `Hello ${user.name}`;
```

Extract only when it removes real duplication or genuinely clarifies a complex expression.

---

## 8. Bipolar naming

**AI (smell):** verbose sentence-name next to bland generic, same file.
```ts
const numberOfActiveUsersFromDatabaseTable = rows.length;
const data = rows.map(r => r.id);
const temp = data.filter(Boolean);
```

**Human (fix):** precise, short, consistent voice.
```ts
const activeCount = rows.length;
const ids = rows.map(r => r.id).filter(Boolean);
```

---

## 9. Internal inconsistency

If the file next to yours uses 2-space indent, no semicolons, `camelCase`, and early-return error handling, your new code does the same. Do not introduce semicolons in a semicolon-free file, or `try/catch` where the neighbors use result objects. Everything written in one task should read as one author.

---

## 10. Dead code / unused imports

**AI (smell):**
```ts
import { useState, useEffect, useMemo } from 'react'; // useMemo unused
import _ from 'lodash';                                 // never referenced
const [open, setOpen] = useState(false);
const legacyFlag = false; // never read
```

**Human (fix):** remove `useMemo`, the `lodash` import, and `legacyFlag`. AI code *does* leave these behind; actually look.

---

## 11. Hallucinated APIs

**AI (smell):** plausible-looking calls that do not exist.
```ts
// there is no `.firstOrNull()` on this array type, and `parseISO` takes no options arg
const user = users.firstOrNull();
const d = parseISO(input, { strict: true });
```

**Human (fix):** verify each symbol against the real declaration/docs, then use what exists.
```ts
const user = users[0] ?? null;
const d = parseISO(input); // validate separately if needed
```

VERIFY: for any non-local symbol or parameter, confirm it exists with that signature before trusting it. Hallucinated APIs are an officially documented AI pitfall.

---

## 12. AI punctuation

Never em-dash, en-dash, ellipsis-as-single-char, or smart quotes, anywhere (code, comments, commit, PR, chat). Use a plain hyphen `-`, or rewrite with a comma/parentheses.

---

## 13. AI vocabulary (comments, commits, PRs, docs)

Avoid: delve, underscore(s), showcase, intricate, pivotal, crucial, meticulous, boast, comprehensive, notably, furthermore, "it's worth noting", "testament to", "in today's fast-paced world". Write plainly.

The list is dynamic (words fade once flagged), so treat it as examples. The stable rule is: plain, direct, why-focused wording.

---

## 14. Deleted or skipped failing tests

**AI (smell):** a test fails, so the change makes it pass by removing it.
```diff
-  it('rejects an expired token', () => { expect(verify(expired)).toBe(false); });
+  it.skip('rejects an expired token', () => { expect(verify(expired)).toBe(false); });
```

**Human (fix):** fix the code so the test passes honestly. The failing test was the signal, not the obstacle.

---

## 15. Over-testing

**AI (smell):** the PR for a one-line bugfix adds 12 edge-case tests nobody asked for, several asserting implementation details (a private method was called), not behavior.

**Human (fix):** test the behavior the change is about. One or two focused tests that would fail if the contract regresses. Do not bolt on unrequested edge tests.

---

## 16. Over-structured commit / PR

**AI (smell):**
```
feat: implement comprehensive user authentication flow

This commit introduces a robust and comprehensive solution:
- Added login functionality
- Added logout functionality
- Added session handling
- Updated the imports accordingly
- Improved overall code quality
```

**Human (fix):**
```
add JWT login/logout with session refresh

refresh token rotates on each use so a stolen token is single-use
```

Short, why-focused, matches the repo's commit voice. Do not add an AI co-author trailer unless the project asks for one.
