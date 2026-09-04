const test = require("node:test");
const assert = require("node:assert/strict");
const {normalize, parseDurations, Settings} = require("../src/settings");
test("keeps exactly five usable duration choices", () => assert.deepEqual(normalize({durations:[10,20,30,40,50]}).durations,[10,20,30,40,50]));
test("sorts duration choices from shortest to longest", () => assert.deepEqual(normalize({durations:[480,15,1440,60,30]}).durations,[15,30,60,480,1440]));
test("falls back when choices are incomplete", () => assert.deepEqual(normalize({durations:[10,20]}).durations,[15,60,480,1440,4320]));
test("parses comma separated minutes", () => assert.deepEqual(parseDurations("15, 60  480"),[15,60,480]));
test("uses BetterDiscord's scoped data signature", () => {
  const calls = [];
  const data = {load:(key) => (calls.push(["load", key]), null), save:(key, value) => calls.push(["save", key, value])};
  const settings = new Settings(null, data);
  settings.setDurations([5, 15, 30, 60, 120]);
  assert.equal(calls[0][1], "settings");
  assert.equal(calls[1][1], "settings");
});
