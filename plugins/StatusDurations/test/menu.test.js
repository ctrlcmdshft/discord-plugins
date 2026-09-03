const test = require("node:test");
const assert = require("node:assert/strict");
const {countdownLabel} = require("../src/menu");

test("formats active status countdowns", () => {
  const now = Date.now();
  assert.equal(countdownLabel(now + 45_000).startsWith("Ends in 45s"), true);
  assert.equal(countdownLabel(now + 15 * 60_000).startsWith("Ends in 15m"), true);
  assert.equal(countdownLabel(now + 90 * 60_000).startsWith("Ends in 1h 30m"), true);
});
