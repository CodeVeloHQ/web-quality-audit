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

