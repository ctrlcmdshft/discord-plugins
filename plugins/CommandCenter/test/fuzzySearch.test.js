const test = require("node:test");
const assert = require("node:assert/strict");
const {fuzzySearch, scoreMatch} = require("../src/fuzzySearch");

test("scoreMatch accepts empty query", () => {
  assert.equal(scoreMatch("", "Copy Current Discord Location").matched, true);
});

test("scoreMatch ranks exact and prefix matches above loose matches", () => {
  const exact = scoreMatch("copy", "copy");
  const prefix = scoreMatch("copy", "copy channel link");
  const loose = scoreMatch("ccl", "copy channel link");

  assert.equal(exact.matched, true);
  assert.equal(prefix.matched, true);
  assert.equal(loose.matched, true);
  assert.ok(exact.score > prefix.score);
  assert.ok(prefix.score > loose.score);
});

test("fuzzySearch searches title, subtitle, category, and keywords", () => {
  const commands = [
    {id: "a", title: "Show Version", category: "General", keywords: ["about"]},
    {id: "b", title: "Copy Current Discord Location", category: "Clipboard", keywords: ["channel"]}
  ];

  assert.equal(fuzzySearch("about", commands)[0].id, "a");
  assert.equal(fuzzySearch("clip", commands)[0].id, "b");
});
