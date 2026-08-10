const test = require("node:test");
const assert = require("node:assert/strict");
const {formatMinutes, nextTimeTodayOrTomorrow} = require("../src/manualStatusTimer");

test("formatMinutes labels common custom durations", () => {
  assert.equal(formatMinutes(20), "20 minutes");
  assert.equal(formatMinutes(60), "1 hour");
  assert.equal(formatMinutes(150), "2h 30m");
});

test("nextTimeTodayOrTomorrow rejects invalid values", () => {
  assert.equal(nextTimeTodayOrTomorrow("nope"), null);
  assert.equal(nextTimeTodayOrTomorrow("25:00"), null);
});
