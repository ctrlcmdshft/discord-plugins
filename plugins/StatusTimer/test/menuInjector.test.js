const test = require("node:test");
const assert = require("node:assert/strict");
const {inferStatusKind, statusKindFromText} = require("../src/menuInjector");

test("inferStatusKind blocks unsupported status menus", () => {
  global.document = {
    querySelectorAll: () => [],
  };

  assert.equal(inferStatusKind({}, "unsupported"), null);
  assert.equal(inferStatusKind({}, null), null);
});

test("inferStatusKind allows tracked idle and dnd menus", () => {
  global.document = {
    querySelectorAll: (selector) => selector.includes("aria-expanded") ? [] : [{textContent: "Online Idle Do Not Disturb Invisible", querySelectorAll: () => []}],
  };

  assert.equal(inferStatusKind({}, "idle"), "idle");
  assert.equal(inferStatusKind({}, "dnd"), "dnd");
});

test("statusKindFromText detects unsupported invisible menu text", () => {
  assert.equal(statusKindFromText("Invisible You will appear offline"), "unsupported");
  assert.equal(statusKindFromText("Do Not Disturb You will not receive desktop notifications"), "dnd");
  assert.equal(statusKindFromText("Idle"), "idle");
});

test("inferStatusKind prefers expanded status item over stale fallback", () => {
  const expandedInvisible = {
    textContent: "Invisible You will appear offline",
    contains: () => false
  };
  global.document = {
    querySelectorAll: (selector) => selector.includes("aria-expanded") ? [expandedInvisible] : [expandedInvisible],
  };

  assert.equal(inferStatusKind({contains: () => false}, "idle"), null);
});
