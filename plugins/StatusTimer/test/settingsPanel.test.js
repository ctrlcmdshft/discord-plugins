const test = require("node:test");
const assert = require("node:assert/strict");
const {createSettingsPanel} = require("../src/settingsPanel");

test("createSettingsPanel returns a DOM node without throwing", () => {
  const element = createElementStub();
  global.document = {
    createElement: () => element
  };

  const panel = createSettingsPanel({
    settings: {
      get(key) {
        return {
          idlePresets: [15, 60],
          dndPresets: [15, 60],
          invisiblePresets: [15, 60],
          restoreManualTimersToOnline: true,
          showToasts: true
        }[key];
      },
      set() {}
    },
    manualTimer: {
      getActiveTimer() {
        return null;
      },
      setStatusForMinutes() {},
      cancel() {}
    }
  });

  assert.equal(panel, element);
  assert.match(panel.innerHTML, /Idle/);
  assert.match(panel.innerHTML, /Do Not Disturb/);
  assert.match(panel.innerHTML, /Invisible/);
});

function createElementStub() {
  return {
    className: "",
    innerHTML: "",
    addEventListener() {},
    querySelector() {
      return null;
    }
  };
}
