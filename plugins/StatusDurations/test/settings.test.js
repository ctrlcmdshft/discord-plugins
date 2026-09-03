const test = require("node:test");
const assert = require("node:assert/strict");
const {normalize, parseDurations} = require("../src/settings");
test("keeps exactly five usable duration choices", () => assert.deepEqual(normalize({durations:[10,20,30,40,50]}).durations,[10,20,30,40,50]));
test("falls back when choices are incomplete", () => assert.deepEqual(normalize({durations:[10,20]}).durations,[15,60,480,1440,4320]));
test("parses comma separated minutes", () => assert.deepEqual(parseDurations("15, 60  480"),[15,60,480]));
