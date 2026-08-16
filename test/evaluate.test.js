import assert from "node:assert/strict";
import test from "node:test";
import { aggregateLighthouseResults, evaluateBudgets, evaluateRegression } from "../src/evaluate.js";

const result = {
  scores: { performance: 0.88, accessibility: 0.97 },
  metrics: { "largest-contentful-paint": 2800, "cumulative-layout-shift": 0.05 }
};

test("reports score and metric budget failures", () => {
  const failures = evaluateBudgets(result, {
    scores: { performance: 0.9, accessibility: 0.95 },
    metrics: { "largest-contentful-paint": 2500 }
  });
  assert.deepEqual(failures.map((failure) => failure.id), [
    "performance",
    "largest-contentful-paint"
  ]);
});

test("detects regressions beyond configured tolerances", () => {
  const failures = evaluateRegression(
    result,
    {
      scores: { performance: 0.96 },
      metrics: { "largest-contentful-paint": 2400 }
    },
    { maximumScoreDrop: 0.05, maximumMetricIncreasePercent: 10 }
  );
  assert.equal(failures.length, 2);
});

test("accepts results inside budgets", () => {
  const failures = evaluateBudgets(result, {
    scores: { performance: 0.8 },
    metrics: { "largest-contentful-paint": 3000 }
  });
  assert.deepEqual(failures, []);
});

test("aggregates repeated Lighthouse samples with medians and ranges", () => {
  const lhrs = [80, 95, 90].map((performance, index) => ({
    finalDisplayedUrl: "https://example.com/",
    fetchTime: `2026-08-16T00:00:0${index}.000Z`,
    lighthouseVersion: "13.4.1",
    categories: { performance: { score: performance / 100 } },
    audits: {
      "largest-contentful-paint": { numericValue: [3200, 2200, 2500][index] },
      "total-blocking-time": { numericValue: [400, 100, 200][index] }
    }
  }));
  const aggregate = aggregateLighthouseResults(lhrs, {
    name: "Example",
    url: "https://example.com/"
  });
  assert.equal(aggregate.sampleCount, 3);
  assert.equal(aggregate.scores.performance, 0.9);
  assert.equal(aggregate.metrics["largest-contentful-paint"], 2500);
  assert.deepEqual(aggregate.variability.metrics["total-blocking-time"], {
    min: 100,
    max: 400
  });
  assert.equal(aggregate.samples.length, 3);
});
