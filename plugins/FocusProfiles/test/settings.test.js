const test = require("node:test");
const assert = require("node:assert/strict");
const {normalizeProfile, normalizeSettings} = require("../src/settings");

test("normalizes a profile and rejects invalid channel ids", () => {
  const profile = normalizeProfile({id: "deep-work", name: " Deep Work ", status: "dnd", durationMinutes: "90", mutedGuildIds: ["123456", "123456", "bad"], hiddenGuildIds: ["654321"]}, 0);
  assert.equal(profile.name, "Deep Work");
  assert.equal(profile.durationMinutes, 90);
  assert.deepEqual(profile.mutedGuildIds, ["123456"]);
  assert.deepEqual(profile.hiddenGuildIds, ["654321"]);
  assert.equal(profile.dndText, "");
});

test("uses starter profiles for missing settings", () => {
  const settings = normalizeSettings();
  assert.equal(settings.profiles.length, 3);
  assert.equal(settings.profiles[0].name, "Work");
});
