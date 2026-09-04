const test = require("node:test");
const assert = require("node:assert/strict");
const StatusDurations = require("../src/index");

test("parses readable duration text", () => {
  assert.equal(StatusDurations.parseDuration("15m"), 15);
  assert.equal(StatusDurations.parseDuration("1h 30m"), 90);
  assert.equal(StatusDurations.parseDuration("2 days"), 2880);
  assert.equal(Number.isNaN(StatusDurations.parseDuration("tomorrow")), true);
});

test("validates duration range and uniqueness", () => {
  assert.equal(StatusDurations.validateDurations([5, 15, 30, 60, 120]).message, "");
  const duplicate = StatusDurations.validateDurations([5, 15, 15, 60, 120]);
  assert.equal(duplicate.message, "Each duration must be different.");
  assert.deepEqual([...duplicate.invalidIndexes], [1, 2]);
  assert.equal(StatusDurations.validateDurations([0, 15, 30, 60, 120]).message, "Use whole-number durations between 1 minute and 3 days.");
});
