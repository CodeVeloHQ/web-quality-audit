function percentage(value) {
  return Math.round(value * 100);
}

export function normalizeLighthouseResult(lhr, target) {
  const scores = {};
  for (const id of ["performance", "accessibility", "best-practices", "seo"]) {
    const score = lhr.categories?.[id]?.score;
    if (typeof score === "number") scores[id] = score;
  }

  const metrics = {};
  for (const id of [
    "first-contentful-paint",
    "largest-contentful-paint",
    "total-blocking-time",
    "cumulative-layout-shift",
    "speed-index",
    "interaction-to-next-paint"
  ]) {
    const value = lhr.audits?.[id]?.numericValue;
    if (typeof value === "number") metrics[id] = value;
  }

  return {
    name: target.name,
    requestedUrl: target.url,
    finalUrl: lhr.finalDisplayedUrl ?? lhr.finalUrl ?? target.url,
    fetchedAt: lhr.fetchTime ?? new Date().toISOString(),
    lighthouseVersion: lhr.lighthouseVersion,
    scores,
    metrics
  };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function aggregateGroup(samples, property) {
  const ids = new Set(samples.flatMap((sample) => Object.keys(sample[property])));
  const aggregate = {};
  const ranges = {};
  for (const id of ids) {
    const values = samples
      .map((sample) => sample[property][id])
      .filter((value) => typeof value === "number");
    if (values.length !== samples.length) continue;
    aggregate[id] = median(values);
    ranges[id] = { min: Math.min(...values), max: Math.max(...values) };
  }
  return { aggregate, ranges };
}

export function aggregateLighthouseResults(lhrs, target) {
  if (!Array.isArray(lhrs) || lhrs.length === 0) {
    throw new Error(`No Lighthouse samples are available for ${target.url}`);
  }
  const samples = lhrs.map((lhr) => normalizeLighthouseResult(lhr, target));
  const scores = aggregateGroup(samples, "scores");
  const metrics = aggregateGroup(samples, "metrics");
  const last = samples.at(-1);
  return {
    name: target.name,
    requestedUrl: target.url,
    finalUrl: last.finalUrl,
    fetchedAt: last.fetchedAt,
    lighthouseVersion: last.lighthouseVersion,
    sampleCount: samples.length,
    aggregation: "median",
    scores: scores.aggregate,
    metrics: metrics.aggregate,
    variability: { scores: scores.ranges, metrics: metrics.ranges },
    samples: samples.map(({ fetchedAt, scores: sampleScores, metrics: sampleMetrics }) => ({
      fetchedAt,
      scores: sampleScores,
      metrics: sampleMetrics
    }))
  };
}

export function evaluateBudgets(result, budgets) {
  const failures = [];
  for (const [id, minimum] of Object.entries(budgets.scores)) {
    const actual = result.scores[id];
    if (typeof actual !== "number") {
      failures.push({ type: "missing-score", id, message: `${id} score is unavailable` });
    } else if (actual < minimum) {
      failures.push({
        type: "score-budget",
        id,
        actual,
        expected: minimum,
        message: `${id} score ${percentage(actual)} is below ${percentage(minimum)}`
      });
    }
  }
  for (const [id, maximum] of Object.entries(budgets.metrics)) {
    const actual = result.metrics[id];
    if (typeof actual !== "number") {
      failures.push({ type: "missing-metric", id, message: `${id} metric is unavailable` });
    } else if (actual > maximum) {
      failures.push({
        type: "metric-budget",
        id,
        actual,
        expected: maximum,
        message: `${id} ${actual.toFixed(2)} exceeds ${maximum}`
      });
    }
  }
  return failures;
}

export function evaluateRegression(result, baseline, limits) {
  if (!baseline) return [];
  const failures = [];
  for (const [id, current] of Object.entries(result.scores)) {
    const previous = baseline.scores?.[id];
    if (typeof previous === "number" && previous - current > limits.maximumScoreDrop) {
      failures.push({
        type: "score-regression",
        id,
        actual: current,
        baseline: previous,
        message: `${id} score dropped from ${percentage(previous)} to ${percentage(current)}`
      });
    }
  }
  for (const [id, current] of Object.entries(result.metrics)) {
    const previous = baseline.metrics?.[id];
    if (typeof previous !== "number" || previous <= 0) continue;
    const increase = ((current - previous) / previous) * 100;
    if (increase > limits.maximumMetricIncreasePercent) {
      failures.push({
        type: "metric-regression",
        id,
        actual: current,
        baseline: previous,
        message: `${id} increased ${increase.toFixed(1)}% from baseline`
      });
    }
  }
  return failures;
}
