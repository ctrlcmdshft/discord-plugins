const test = require("node:test");
const assert = require("node:assert/strict");
const {countdownLabel, nextCountdownDelay} = require("../src/menu");

test("formats active status countdowns", () => {
  const now = Date.now();
  assert.equal(countdownLabel(now + 45_000).startsWith("Ends in 45s"), true);
  assert.equal(countdownLabel(now + 15 * 60_000).startsWith("Ends in 15m"), true);
  assert.equal(countdownLabel(now + 90 * 60_000).startsWith("Ends in 1h 30m"), true);
});

test("updates countdowns only as often as their visible label can change", () => {
  assert.equal(nextCountdownDelay(45_000, 0), 1000);
  assert.equal(nextCountdownDelay(90_000, 0), 30_000);
  assert.equal(nextCountdownDelay(0, 0), null);
});
