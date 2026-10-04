import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { auth as before } from "./fixtures/4-catch-altitude/before.mjs";
import { auth as after } from "./fixtures/4-catch-altitude/after.mjs";

for (const [label, expression, expected] of [
  ["empty list", "[]", "0"],
  ["list", "[1, 2, 3]", "3"],
  ["generator", "(n for n in range(4))", "4"],
  ["empty iterator", "iter([])", "0"],
]) {
  test(`comment cleanup preserves counting: ${label}`, () => {
    for (const phase of ["before", "after"]) {
      const path = fileURLToPath(new URL(`./fixtures/1-over-commenting/${phase}.py`, import.meta.url));
      const output = execFileSync("python3", ["-c",
        "import runpy, sys; runpy.run_path(sys.argv[1], init_globals={'users': " + expression + "})", path],
        { encoding: "utf8", timeout: 5000 });
      assert.equal(output.trim(), expected, phase);
    }
  });
}

function response() {
  return {
    locals: {},
    status(code) { this.code = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

for (const [phase, auth] of [["before", before], ["after", after]]) {
  test(`${phase}: malformed session is rejected before database access`, async () => {
    const res = response();
    let calls = 0;
    let queries = 0;
    await auth({ headers: { session: "invalid json" } }, res,
      () => { calls++; }, {
        decode: value => value,
        db: { async getUser() { queries++; return {}; } },
      });
    assert.equal(res.code, 401);
    assert.equal(res.body, "Unauthorized");
    assert.equal(calls, 0);
    assert.equal(queries, 0);
  });

  test(`${phase}: valid session preserves user and continues once`, async () => {
    const res = response();
    const user = { id: 7 };
    let calls = 0;
    let queries = 0;
    await auth({ headers: { session: '{"id":7}' } }, res, () => { calls++; }, {
      decode: value => value,
      db: { async getUser(id) { queries++; assert.equal(id, 7); return user; } },
    });
    assert.equal(res.locals.user, user);
    assert.equal(calls, 1);
    assert.equal(queries, 1);
    assert.equal(res.code, undefined);
  });
}

test("broad catch masks a database outage; corrected catch propagates the original error", async () => {
  const outage = new Error("database unavailable");
  const dependencies = {
    decode: value => value,
    db: { async getUser() { throw outage; } },
  };
  const req = { headers: { session: '{"id":7}' } };
  const next = () => assert.fail("must not continue after a database failure");
  const oldResponse = response();
  await before(req, oldResponse, next, dependencies);
  assert.equal(oldResponse.code, 401);
  const newResponse = response();
  await assert.rejects(after(req, newResponse, next, dependencies), error => error === outage);
  assert.equal(newResponse.code, undefined);
  assert.equal(newResponse.locals.user, undefined);
});
