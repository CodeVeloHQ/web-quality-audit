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
  assert.equal(config.settings.runs, 1);
  assert.equal(config.settings.warmupRuns, 0);
});

test("normalizes repeat-run settings", () => {
  const config = validateConfig({
    ...valid,
    settings: {
      runs: 5,
      warmup_runs: 1,
      delay_between_runs_ms: 1500,
      blocked_url_patterns: ["*://tracking.example.com/*"]
    }
  });
  assert.equal(config.settings.runs, 5);
  assert.equal(config.settings.warmupRuns, 1);
  assert.equal(config.settings.delayBetweenRunsMs, 1500);
  assert.deepEqual(config.settings.blockedUrlPatterns, ["*://tracking.example.com/*"]);
});

test("rejects invalid repeat-run settings", () => {
  assert.throws(() => validateConfig({ ...valid, settings: { runs: 0 } }), /settings.runs/);
  assert.throws(
    () => validateConfig({ ...valid, settings: { warmup_runs: 1.5 } }),
    /must be an integer/
  );
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
