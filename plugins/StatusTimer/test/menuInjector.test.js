const test = require("node:test");
const assert = require("node:assert/strict");
const {inferStatusKind, statusKindFromText} = require("../src/menuInjector");

test("inferStatusKind blocks unsupported status menus", () => {
  global.document = {
    querySelectorAll: () => [],
  };

  assert.equal(inferStatusKind({}, "unsupported"), null);
  assert.equal(inferStatusKind({}, "online"), null);
  assert.equal(inferStatusKind({}, null), null);
});

test("inferStatusKind allows tracked idle and dnd menus", () => {
  global.document = {
    querySelectorAll: (selector) => selector.includes("aria-expanded") ? [] : [{textContent: "Online Idle Do Not Disturb Invisible", querySelectorAll: () => []}],
  };

  assert.equal(inferStatusKind({}, "idle"), "idle");
  assert.equal(inferStatusKind({}, "dnd"), "dnd");
  assert.equal(inferStatusKind({}, "invisible"), "invisible");
});

test("statusKindFromText detects supported status menu text", () => {
  assert.equal(statusKindFromText("Invisible You will appear offline"), "invisible");
  assert.equal(statusKindFromText("Online"), "unsupported");
  assert.equal(statusKindFromText("Do Not Disturb You will not receive desktop notifications"), "dnd");
  assert.equal(statusKindFromText("Idle"), "idle");
});
