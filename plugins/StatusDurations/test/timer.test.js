const test = require("node:test");
const assert = require("node:assert/strict");
const {Timer, shouldCancelForStatusChange} = require("../src/timer");

test("cancels a timer after a manual status change", () => {
  assert.equal(shouldCancelForStatusChange({status: "idle", activatedAt: 1_000}, "online", 4_000), true);
  assert.equal(shouldCancelForStatusChange({status: "idle", activatedAt: 1_000}, "idle", 4_000), false);
  assert.equal(shouldCancelForStatusChange({status: "idle", activatedAt: 1_000}, "online", 2_000), false);
  assert.equal(shouldCancelForStatusChange({status: "idle", activatedAt: 1_000}, null, 4_000), false);
});

test("persists active timers through BetterDiscord's scoped data API", () => {
  const calls = [];
  const data = {load:() => null, save:(key, value) => calls.push(["save", key, value]), delete:(key) => calls.push(["delete", key])};
  const clock = {setTimeout:() => 1, clearTimeout:() => {}};
  const timer = new Timer({adapter:{current:()=>"online", set:()=>true}, notify:()=>{}, data, clock});
  assert.equal(timer.activate("idle", 15), true);
  assert.equal(calls[0][1], "active");
  assert.equal(calls[0][2].status, "idle");
  assert.equal(calls[0][2].previousStatus, "online");
});
