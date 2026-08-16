import assert from "node:assert/strict";
import test from "node:test";
import { createMarkdownReport } from "../src/report.js";

test("creates a readable failing report", () => {
  const markdown = createMarkdownReport({
    passed: false,
    generatedAt: "2026-08-16T00:00:00.000Z",
    results: [
      {
        name: "Example",
        finalUrl: "https://example.com/",
        scores: { performance: 0.8 },
        metrics: { "largest-contentful-paint": 3000 },
        failures: [{ message: "performance score 80 is below 90" }]
      }
    ]
  });
  assert.match(markdown, /❌ Failed/);
  assert.match(markdown, /Largest Contentful Paint \| 3000 ms/);
  assert.match(markdown, /performance score 80 is below 90/);
});

test("reports repeated samples", () => {
  const markdown = createMarkdownReport({
    passed: true,
    generatedAt: "2026-08-16T00:00:00.000Z",
    results: [
      {
        name: "Example",
        finalUrl: "https://example.com/",
        sampleCount: 3,
        aggregation: "median",
        scores: { performance: 0.9 },
        metrics: { "largest-contentful-paint": 2500, "total-blocking-time": 200 },
        samples: [
          { scores: { performance: 0.8 }, metrics: { "largest-contentful-paint": 3000, "total-blocking-time": 300 } },
          { scores: { performance: 0.9 }, metrics: { "largest-contentful-paint": 2500, "total-blocking-time": 200 } },
          { scores: { performance: 0.95 }, metrics: { "largest-contentful-paint": 2200, "total-blocking-time": 100 } }
        ],
        failures: []
      }
    ]
  });
  assert.match(markdown, /median of 3 measured runs/);
  assert.match(markdown, /### Samples/);
  assert.match(markdown, /\| 3 \| 95 \| 2200 ms \| 100 ms \|/);
});
