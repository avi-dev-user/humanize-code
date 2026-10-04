# Code Review Examples

Concrete before/after pairs for each review pattern. Apply only after checking the stated contract. Language-neutral where possible; the pattern is what matters, not the syntax. Numbering matches `SKILL.md`.

---

## 1. Over-commenting / guide-comments

**Before (review candidate):**
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

**After (under the stated contract):** count any finite iterable, including generators, without requiring a length. For a known sequence, `len(users)` is appropriate.
```python
return sum(1 for _ in users)
```

**Before (review candidate) - auto docstring on a trivial fn:**
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

**After (under the stated contract):** omit the redundant draft only if the project does not require public API documentation. Preserve useful contracts and documentation tooling requirements.
```python
def add(a, b):
    return a + b
```

**When a comment IS justified (why, not what):**
```python
# the upstream server drops the connection after 30s idle, so ping every 25s
socket.set_keepalive(25_000)
```

**Before (review candidate) - width-padded section dividers, uniform across the file:**
```python
# -- config ---------------------------------------------------------
DEBUG = False

# -- websocket sync -------------------------------------------------
def connect(): ...

# -- helpers --------------------------------------------------------
def clamp(x): ...
```
Repeated dividers can add clutter, but formatting alone is not a finding. Follow the repository navigation convention.

**After (under the stated contract):** let the code group itself, or use one plain label where a section is genuinely large.
```python
DEBUG = False

def connect(): ...

def clamp(x): ...
```

Keep dividers that help navigation. Suggest removal only when they obscure the structure of the code in scope.

Keep comments that explain reasoning, contracts, or constraints. Comment density does not establish authorship.

---

## 2. Redundancy / duplication

**Before (review candidate):** two near-identical validators.
```ts
function isValidUserEmail(email: string) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}
function checkEmailFormat(addr: string) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(addr);
}
```

**After (under the stated contract):** one helper, reused.
```ts
function isEmail(value: string) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(value);
}
```

Before writing a new helper, grep the repo. If an equivalent already exists, use it.

---

## 3. Defensive bloat

**Before (review candidate):** guards on an internal value whose callers are verified to supply validated arrays. A TypeScript annotation alone does not establish this runtime guarantee; retain validation for external input.
```ts
function totalPrice(items: CartItem[]): number {
  if (!items) return 0;                 // items is typed non-null
  if (!Array.isArray(items)) return 0;  // the type already says array
  if (items.length === 0) return 0;     // sum of empty is already 0
  return items.reduce((s, i) => s + i.price, 0);
}
```

**After (under the stated contract):**
```ts
function totalPrice(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.price, 0);
}
```

**Before (review candidate) - retry wrapping retry (5 attempts becomes 25):**
```ts
async function fetchWithRetry(url: string) {
  for (let i = 0; i < 5; i++) {
    try {
      return await retryingHttpClient.get(url); // client already retries 5x
    } catch { /* try again */ }
  }
}
```

**After (under the stated contract):** one layer.
```ts
async function fetch(url: string) {
  return retryingHttpClient.get(url);
}
```

---

## 3b. Needless type escape

**Before (review candidate):** casts to `any` to read a field the type already declares.
```ts
// res.locals type ALREADY has: secondaryScope?: {...}
const rows = await service.list(userId, (res.locals as any).secondaryScope);
```
Worse, the same object is accessed typed one line up (`res.locals.userId`) and cast the next, so it reads inconsistent.

**After (under the stated contract):** use the typed access; the cast was pure noise.
```ts
const rows = await service.list(userId, res.locals.secondaryScope);
```

VERIFY first: open the type declaration. If the field is missing, verify that it exists at runtime before correcting the declaration. Do not invent a type to suppress an error. Same for `@ts-ignore` / `# type: ignore` hiding an error the code should actually resolve.

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

**After (under the stated contract):** either let it throw, or handle via the project's real mechanism.
```ts
try {
  await saveOrder(order);
} catch (err) {
  notifyUser('saving the order failed');
  throw err;
}
```

An intentionally ignored failure may be appropriate for documented best-effort work. Confirm the recovery contract before changing error propagation.

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

**After (under the stated contract):** narrow the catch to what actually throws the handled error; let infra failures surface honestly.
```ts
let session;
try {
  session = JSON.parse(decode(header));
} catch {
  return res.status(401).send('Unauthorized'); // only the parse is an auth failure
}
const user = await db.getUser(session.id); // let the application error handler map this failure
res.locals.user = user;
next();
```

A catch in the wrong place hides the real failure. This isolated example assumes a validated session shape and an application error handler that handles rejected promises. It does not implement token verification, expiry checks, missing-user handling, or a complete authentication system. Executable versions are in `tests/fixtures/4-catch-altitude/`.

---

## 5. Happy-path bias

**Before (review candidate):** works on the common case, silently wrong at the edge.
```ts
function page(items: T[], pageNum: number, size: number) {
  const start = pageNum * size; // off-by-one if pageNum is 1-based
  return items.slice(start, start + size);
}
```

**After (under the stated contract):** handle the boundary that actually exists in this codebase, and be explicit.
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

**Before (review candidate):** manual loop for a built-in.
```python
found = False
for x in items:
    if x == target:
        found = True
        break
```

**After (under the stated contract):**
```python
found = target in items
```

**Before (review candidate) - premature abstraction:**
```ts
interface Formatter { format(v: unknown): string; }
class DateFormatter implements Formatter { /* only impl, one caller */ }
```

**After (under the stated contract):** a function if the interface has no meaningful domain, isolation, or testing role. One implementation alone does not make an interface wrong.
```ts
function formatDate(v: Date): string { /* ... */ }
```

---

## 7. Single-use helper

**Before (review candidate):** extracted, called once, hides nothing complex.
```ts
function buildGreeting(name: string) { return `Hello ${name}`; }
// ...one call site...
el.textContent = buildGreeting(user.name);
```

**After (under the stated contract):** inline it.
```ts
el.textContent = `Hello ${user.name}`;
```

Keep helpers that explain domain intent or isolate side effects, even when called once.

---

## 8. Bipolar naming

**Before (review candidate):** verbose sentence-name next to bland generic, same file.
```ts
const numberOfActiveUsersFromDatabaseTable = rows.length;
const data = rows.map(r => r.id);
const temp = data.filter(Boolean);
```

**After (under the stated contract):** precise, short, consistent voice.
```ts
const activeCount = rows.length;
const ids = rows.map(r => r.id).filter(Boolean);
```

---

## 9. Internal inconsistency

If the file next to yours uses 2-space indent, no semicolons, `camelCase`, and early-return error handling, your new code does the same. Do not introduce semicolons in a semicolon-free file, or `try/catch` where the neighbors use result objects. Follow local conventions without reproducing known defects.

---

## 10. Dead code / unused imports

**Before (review candidate):**
```ts
import { useState, useEffect, useMemo } from 'react'; // useMemo unused
import _ from 'lodash';                                 // never referenced
const [open, setOpen] = useState(false);
const legacyFlag = false; // never read
```

**After (under the stated contract):** remove unused bindings only after checking module initialization side effects and non-obvious consumers. Preserve required side-effect imports.

---

## 11. Hallucinated APIs

**Before (review candidate):** plausible-looking calls that do not exist.
```ts
// there is no `.firstOrNull()` on this array type, and `parseISO` takes no options arg
const user = users.firstOrNull();
const d = parseISO(input, { strict: true });
```

**After (under the stated contract):** verify each symbol against the real declaration/docs, then use what exists.
```ts
const user = users[0] ?? null;
const d = parseISO(input); // validate separately if needed
```

VERIFY: for any non-local symbol or parameter, confirm it exists with that signature before trusting it. Hallucinated APIs are an officially documented AI pitfall.

---

## 12. Prose style consistency

Punctuation is not an authorship signal. An explicit project convention may justify editing in-scope prose, but never mechanically rewrite literals, localized strings, regexes, snapshots, or quotations.

For example, preserve `const label = "Loading\u2026";`: changing the displayed text is a product change, not cleanup. A documentation sentence may be reworded when doing so improves clarity under the local style guide.

---

## 13. Unclear wording

**Before:** "This comprehensive helper facilitates processing."

**After:** "Retries a failed upload once before returning the error."

Use the latter only if it accurately describes the implementation. Preserve domain terms such as "robust regression"; a vocabulary blocklist would damage meaning.

---

## 14. Deleted or skipped failing tests

**Before (review candidate):** a test fails, so the change makes it pass by removing it.
```diff
-  it('rejects an expired token', () => { expect(verify(expired)).toBe(false); });
+  it.skip('rejects an expired token', () => { expect(verify(expired)).toBe(false); });
```

**After (under the stated contract):** fix the code so the test passes honestly. The failing test was the signal, not the obstacle.

---

## 15. Low-value tests

A test that asserts a private helper was called may unnecessarily couple to implementation. Replace it with an observable contract assertion only if the coverage remains equivalent.

Keep tests for expired tokens, empty input, partial failure, and other real boundaries even when nobody explicitly requested them. Test count alone is not evidence of over-testing. Before removing a test, identify what failure it catches and which remaining test protects that behavior.

---

## 16. Over-structured commit / PR

**Before (review candidate):**
```
feat: implement comprehensive user authentication flow

This commit introduces a robust and comprehensive solution:
- Added login functionality
- Added logout functionality
- Added session handling
- Updated the imports accordingly
- Improved overall code quality
```

**After (under the stated contract):**
```
add JWT login/logout with session refresh

refresh token rotates on each use so a stolen token is single-use
```

Short, why-focused, matches the repo's commit voice. Preserve attribution and follow project disclosure requirements. Use the project PR template when present.
