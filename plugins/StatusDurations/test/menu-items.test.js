const test = require("node:test");
const assert = require("node:assert/strict");
const {findLabelTextNode, findStatusItems, getTimedDurationItems} = require("../src/menu");

test("recognizes custom timed labels instead of only Discord defaults", () => {
  const items = ["For 10 Minutes", "For 30 Minutes", "For 2 Hours", "For 1 Day", "For 3 Days", "Forever"].map((text) => ({textContent: text, dataset: {}}));
  const menu = {querySelectorAll: () => items};
  assert.equal(getTimedDurationItems(menu).length, 5);
});

test("recognizes items already bound by the plugin", () => {
  const items = Array.from({length: 5}, (_, index) => ({textContent: `Custom ${index}`, dataset: {statusdurationsBound: "true"}}));
  assert.deepEqual(getTimedDurationItems({querySelectorAll: () => items}), items);
});

test("finds only the visible duration label text node", () => {
  const icon = {textContent: ""};
  const label = {textContent: "For 1 Hour"};
  const originalDocument = global.document;
  const originalNodeFilter = global.NodeFilter;
  global.NodeFilter = {SHOW_TEXT: 4};
  global.document = {
    createTreeWalker() {
      const nodes = [icon, label];
      let index = -1;
      return {currentNode: null, nextNode() { this.currentNode = nodes[++index]; return Boolean(this.currentNode); }};
    }
  };
  try { assert.equal(findLabelTextNode({}), label); }
  finally { global.document = originalDocument; global.NodeFilter = originalNodeFilter; }
});

test("finds the active status in both account and status menus", () => {
  const items = [
    {textContent: "Idle", closest: () => null},
    {textContent: "Idle Ends in 15m", closest: () => null},
    {textContent: "Do Not Disturb", closest: () => null}
  ];
  const root = {querySelectorAll: (selector) => selector.includes("role") ? items : []};
  assert.deepEqual(findStatusItems(root, "idle"), items.slice(0, 2));
});

test("finds Discord's styled account status row without matching unrelated items", () => {
  const idle = {textContent: "Idle", closest: () => null};
  const member = {textContent: "Scott Idle", closest: () => null};
  const root = {querySelectorAll: (selector) => selector.includes('class*=') ? [idle, member] : []};
  assert.deepEqual(findStatusItems(root, "idle"), [idle]);
});
