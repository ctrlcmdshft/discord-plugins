const test = require("node:test");
const assert = require("node:assert/strict");
const {StatusAdapter} = require("../src/statusAdapter");

test("does not invent an online status when Discord's store is unavailable", () => {
  const adapter = new StatusAdapter();
  assert.equal(adapter.current(), null);
});

test("reports read and write compatibility separately", () => {
  const adapter = new StatusAdapter();
  adapter.store = {settings: {status: {status: {value: "online"}}}};
  assert.deepEqual(adapter.health(), {available:false, canRead:true, canWrite:false});
  adapter.actions = {updateAsync() {}};
  assert.deepEqual(adapter.health(), {available:true, canRead:true, canWrite:true});
  assert.equal(adapter.set("invalid-status"), false);
});

test("reports a synchronous status update failure", () => {
  const adapter = new StatusAdapter();
  adapter.store = {settings: {status: {status: {value: "online"}}}};
  adapter.actions = {updateAsync() { throw new Error("unsupported"); }};
  const originalError = console.error;
  console.error = () => {};
  try { assert.equal(adapter.set("idle"), false); }
  finally { console.error = originalError; }
});
