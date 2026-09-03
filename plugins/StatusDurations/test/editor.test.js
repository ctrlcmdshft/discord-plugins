const test = require("node:test");
const assert = require("node:assert/strict");
const StatusDurations = require("../src/index");

test("parses readable duration text", () => {
  assert.equal(StatusDurations.parseDuration("15m"), 15);
  assert.equal(StatusDurations.parseDuration("1h 30m"), 90);
  assert.equal(StatusDurations.parseDuration("2 days"), 2880);
  assert.equal(Number.isNaN(StatusDurations.parseDuration("tomorrow")), true);
});
