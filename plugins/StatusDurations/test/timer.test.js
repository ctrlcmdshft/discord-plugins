const test = require("node:test");
const assert = require("node:assert/strict");
const {shouldCancelForStatusChange} = require("../src/timer");

test("cancels a timer after a manual status change", () => {
  assert.equal(shouldCancelForStatusChange({status: "idle", activatedAt: 1_000}, "online", 4_000), true);
  assert.equal(shouldCancelForStatusChange({status: "idle", activatedAt: 1_000}, "idle", 4_000), false);
  assert.equal(shouldCancelForStatusChange({status: "idle", activatedAt: 1_000}, "online", 2_000), false);
  assert.equal(shouldCancelForStatusChange({status: "idle", activatedAt: 1_000}, null, 4_000), false);
});
