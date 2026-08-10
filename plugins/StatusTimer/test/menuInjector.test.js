const test = require("node:test");
const assert = require("node:assert/strict");
const {inferStatusKind} = require("../src/menuInjector");

test("inferStatusKind blocks unsupported status menus", () => {
  global.document = {
    querySelectorAll: () => []
  };

  assert.equal(inferStatusKind({}, "unsupported"), null);
  assert.equal(inferStatusKind({}, null), null);
});

test("inferStatusKind allows tracked idle and dnd menus", () => {
  global.document = {
    querySelectorAll: () => [{textContent: "Online Idle Do Not Disturb Invisible"}]
  };

  assert.equal(inferStatusKind({}, "idle"), "idle");
  assert.equal(inferStatusKind({}, "dnd"), "dnd");
});
