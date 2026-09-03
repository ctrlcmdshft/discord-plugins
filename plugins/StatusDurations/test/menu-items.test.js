const test = require("node:test");
const assert = require("node:assert/strict");
const {getTimedDurationItems} = require("../src/menu");

test("recognizes custom timed labels instead of only Discord defaults", () => {
  const items = ["For 10 Minutes", "For 30 Minutes", "For 2 Hours", "For 1 Day", "For 3 Days", "Forever"].map((text) => ({textContent: text, dataset: {}}));
  const menu = {querySelectorAll: () => items};
  assert.equal(getTimedDurationItems(menu).length, 5);
});
