import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const SCORE_IDS = new Set(["performance", "accessibility", "best-practices", "seo"]);
const METRIC_IDS = new Set([
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
  "interaction-to-next-paint"
]);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertNumber(value, label, minimum, maximum = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}`);
  }
}

export function validateConfig(raw) {
  assertObject(raw, "Configuration");
  if (raw.version !== 1) throw new Error("Configuration version must be 1");
  if (!Array.isArray(raw.targets) || raw.targets.length === 0) {
    throw new Error("At least one target is required");
  }

  const targets = raw.targets.map((target, index) => {
    assertObject(target, `Target ${index + 1}`);
    if (typeof target.name !== "string" || target.name.trim() === "") {
      throw new Error(`Target ${index + 1} requires a name`);
    }
    let url;
    try {
      url = new URL(target.url);
    } catch {
      throw new Error(`Target ${target.name} has an invalid URL`);
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(`Target ${target.name} must use HTTP or HTTPS`);
    }
    return { name: target.name.trim(), url: url.toString() };
  });

  const budgets = raw.budgets ?? {};
  assertObject(budgets, "budgets");
  const scores = budgets.scores ?? {};
  const metrics = budgets.metrics ?? {};
  assertObject(scores, "budgets.scores");
  assertObject(metrics, "budgets.metrics");
  for (const [id, value] of Object.entries(scores)) {
    if (!SCORE_IDS.has(id)) throw new Error(`Unsupported score budget: ${id}`);
    assertNumber(value, `Score budget ${id}`, 0, 1);
  }
  for (const [id, value] of Object.entries(metrics)) {
    if (!METRIC_IDS.has(id)) throw new Error(`Unsupported metric budget: ${id}`);
    assertNumber(value, `Metric budget ${id}`, 0);
  }
  if (Object.keys(scores).length + Object.keys(metrics).length === 0) {
    throw new Error("At least one score or metric budget is required");
  }

  const regression = raw.regression ?? {};
  assertObject(regression, "regression");
  const maximumScoreDrop = regression.maximum_score_drop ?? 0.05;
  const maximumMetricIncreasePercent = regression.maximum_metric_increase_percent ?? 10;
  assertNumber(maximumScoreDrop, "maximum_score_drop", 0, 1);
  assertNumber(maximumMetricIncreasePercent, "maximum_metric_increase_percent", 0);

  const settings = raw.settings ?? {};
  assertObject(settings, "settings");
  const chromeFlags = settings.chrome_flags ?? ["--headless", "--no-sandbox"];
  if (!Array.isArray(chromeFlags) || chromeFlags.some((flag) => typeof flag !== "string")) {
    throw new Error("settings.chrome_flags must be an array of strings");
  }

  return {
    version: 1,
    targets,
    settings: {
      outputDirectory: settings.output_directory ?? "reports",
      chromeFlags
    },
    budgets: { scores, metrics },
    regression: { maximumScoreDrop, maximumMetricIncreasePercent }
  };
}

export async function loadConfig(filePath) {
  const absolutePath = path.resolve(filePath);
  const content = await readFile(absolutePath, "utf8");
  return validateConfig(YAML.parse(content));
}

