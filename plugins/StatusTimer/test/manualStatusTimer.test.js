const test = require("node:test");
const assert = require("node:assert/strict");
const {formatClockTime, formatMinutes, nextTimeTodayOrTomorrow} = require("../src/manualStatusTimer");

test("formatMinutes labels common custom durations", () => {
  assert.equal(formatMinutes(20), "20 minutes");
  assert.equal(formatMinutes(60), "1 hour");
  assert.equal(formatMinutes(150), "2h 30m");
  assert.equal(formatMinutes(1440), "1 day");
  assert.equal(formatMinutes(4320), "3 days");
});

test("nextTimeTodayOrTomorrow rejects invalid values", () => {
  assert.equal(nextTimeTodayOrTomorrow("nope"), null);
  assert.equal(nextTimeTodayOrTomorrow("25:00"), null);
});

test("formatClockTime returns a readable local time", () => {
  assert.match(formatClockTime(new Date("2026-01-01T12:30:00").getTime()), /12:30|0:30/);
});
