const test = require("node:test");
const assert = require("node:assert/strict");
const {nextOccurrence, earliestTime} = require("../src/profileController");

test("nextOccurrence schedules a time later today", () => {
  const now = new Date("2026-08-10T09:00:00");
  const result = new Date(nextOccurrence("17:30", now));
  assert.equal(result.getHours(), 17);
  assert.equal(result.getMinutes(), 30);
  assert.equal(result.getDate(), now.getDate());
});

test("nextOccurrence rolls past times into tomorrow", () => {
  const now = new Date("2026-08-10T18:00:00");
  const result = new Date(nextOccurrence("09:00", now));
  assert.equal(result.getHours(), 9);
  assert.equal(result.getDate(), now.getDate() + 1);
  assert.equal(earliestTime(null, 5000, 2000), 2000);
});
