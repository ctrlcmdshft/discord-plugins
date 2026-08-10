const test = require("node:test");
const assert = require("node:assert/strict");
const {normalizeSettings} = require("../src/settings");

test("normalizeSettings keeps valid values", () => {
  assert.deepEqual(normalizeSettings({
    awayMinutes: 45,
    restoreDelaySeconds: 10,
    enableAutoAway: true,
    manualPresets: [5, 75],
    customDurationMinutes: 12,
    restoreManualTimersToOnline: false,
    showQuickButton: true,
    skipVoice: false,
    onlyWhenOnline: false,
    showToasts: false,
    debugFastMode: true
  }), {
    awayMinutes: 45,
    restoreDelaySeconds: 10,
    enableAutoAway: true,
    manualPresets: [5, 75],
    customDurationMinutes: 12,
    restoreManualTimersToOnline: false,
    showQuickButton: true,
    skipVoice: false,
    onlyWhenOnline: false,
    showToasts: false,
    debugFastMode: true
  });
});

test("normalizeSettings clamps numeric values", () => {
  const settings = normalizeSettings({
    awayMinutes: 999,
    restoreDelaySeconds: -5
  });

  assert.equal(settings.awayMinutes, 240);
  assert.equal(settings.restoreDelaySeconds, 0);
});

test("normalizeSettings sanitizes preset list", () => {
  const settings = normalizeSettings({
    manualPresets: [10, "20", -1, 10, 1500, 45.2]
  });

  assert.deepEqual(settings.manualPresets, [10, 20, 45]);
});

test("normalizeSettings falls back for invalid numbers", () => {
  const settings = normalizeSettings({
    awayMinutes: "nope",
    restoreDelaySeconds: Number.NaN
  });

  assert.equal(settings.awayMinutes, 15);
  assert.equal(settings.restoreDelaySeconds, 5);
});
