const test = require("node:test");
const assert = require("node:assert/strict");
const {CommandRegistry} = require("../src/commandRegistry");

test("CommandRegistry can list and run provider commands", async () => {
  let didRun = false;
  const registry = new CommandRegistry({});
  registry.registerProvider(() => [
    {
      id: "dynamic.test",
      title: "Dynamic Test",
      run: () => {
        didRun = true;
      }
    }
  ]);

  assert.equal(registry.list()[0].id, "dynamic.test");
  await registry.run("dynamic.test");
  assert.equal(didRun, true);
});
