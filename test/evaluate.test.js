import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBudgets, evaluateRegression } from "../src/evaluate.js";

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

