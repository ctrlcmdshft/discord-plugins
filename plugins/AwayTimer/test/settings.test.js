const test = require("node:test");
const assert = require("node:assert/strict");
const {normalizeSettings, parsePresetTextDetailed} = require("../src/settings");

test("normalizeSettings keeps valid values", () => {
  assert.deepEqual(normalizeSettings({
    manualPresets: [5, 75],
    customDurationMinutes: 12,
    restoreManualTimersToOnline: false,
    showQuickButton: true,
    showToasts: false
  }), {
    manualPresets: [5, 75],
    customDurationMinutes: 12,
    restoreManualTimersToOnline: false,
    showQuickButton: true,
    showToasts: false
  });
});

test("normalizeSettings clamps custom duration values", () => {
  const settings = normalizeSettings({
    customDurationMinutes: 9999
  });

  assert.equal(settings.customDurationMinutes, 4320);
});

test("normalizeSettings sanitizes preset list", () => {
  const settings = normalizeSettings({
    manualPresets: [10, "20", -1, 10, 5000, 45.2]
  });

  assert.deepEqual(settings.manualPresets, [10, 20, 45]);
});

test("normalizeSettings falls back for invalid custom duration", () => {
  const settings = normalizeSettings({
    customDurationMinutes: "nope"
  });

  assert.equal(settings.customDurationMinutes, 30);
});

test("parsePresetTextDetailed reports invalid values", () => {
  assert.deepEqual(parsePresetTextDetailed("abc, 15, -1, 60, 5000"), {
    presets: [15, 60],
    invalidCount: 3
  });
});
