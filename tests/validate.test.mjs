import { test } from "node:test";
import assert from "node:assert/strict";
import { CHECKS } from "../scripts/validate.mjs";

for (const [name, fn] of Object.entries(CHECKS)) {
  test(name, () => {
    const errs = fn();
    assert.deepEqual(errs, [], errs.join("\n"));
  });
}
