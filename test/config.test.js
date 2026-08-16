import assert from "node:assert/strict";
import test from "node:test";
import { validateConfig } from "../src/config.js";

const valid = {
  version: 1,
  targets: [{ name: "Example", url: "https://example.com" }],
  budgets: { scores: { performance: 0.9 }, metrics: { "largest-contentful-paint": 2500 } }
};

test("normalizes a valid configuration", () => {
  const config = validateConfig(valid);
  assert.equal(config.targets[0].url, "https://example.com/");
  assert.equal(config.regression.maximumScoreDrop, 0.05);
});

test("rejects non-web protocols", () => {
  assert.throws(
    () => validateConfig({ ...valid, targets: [{ name: "File", url: "file:///tmp/a" }] }),
    /HTTP or HTTPS/
  );
});

test("rejects unsupported budget names", () => {
  assert.throws(
    () => validateConfig({ ...valid, budgets: { scores: { security: 1 }, metrics: {} } }),
    /Unsupported score budget/
  );
});

