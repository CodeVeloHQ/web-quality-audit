#!/usr/bin/env node

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadConfig } from "./config.js";
import { aggregateLighthouseResults, evaluateBudgets, evaluateRegression } from "./evaluate.js";
import { auditTargets } from "./lighthouse.js";
import { createMarkdownReport } from "./report.js";

function usage() {
  return `Usage: web-quality-audit --config <file> [options]

Options:
  --output <directory>  Override the configured report directory
  --baseline <file>     Compare with a previous JSON report
  --chrome-path <path>  Use a specific Chrome or Chromium executable
  --validate            Validate configuration without running Lighthouse
  --verbose             Show Lighthouse progress
  --help                Show this help
`;
}

function parseArgs(argv) {
  const args = { verbose: false, validate: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help") args.help = true;
    else if (value === "--verbose") args.verbose = true;
    else if (value === "--validate") args.validate = true;
    else if (["--config", "--output", "--baseline", "--chrome-path"].includes(value)) {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`${value} requires a value`);
      }
      args[value.slice(2).replace("-", "Path")] = next;
      index += 1;
    } else if (value !== "") {
      throw new Error(`Unknown option: ${value}`);
    }
  }
  return args;
}

async function loadBaseline(filePath) {
  if (!filePath) return new Map();
  const parsed = JSON.parse(await readFile(path.resolve(filePath), "utf8"));
  return new Map((parsed.results ?? []).map((result) => [result.requestedUrl, result]));
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(usage());
    return 0;
  }
  if (!args.config) throw new Error("--config is required");
  const config = await loadConfig(args.config);
  if (args.validate) {
    process.stdout.write(`Configuration valid: ${config.targets.length} target(s)\n`);
    return 0;
  }

  const baselines = await loadBaseline(args.baseline);
  const rawResults = await auditTargets(config, {
    chromePath: args.chromePath ?? process.env.CHROME_PATH,
    verbose: args.verbose
  });
  const results = rawResults.map(({ target, lhrs }) => {
    const normalized = aggregateLighthouseResults(lhrs, target);
    const failures = [
      ...evaluateBudgets(normalized, config.budgets),
      ...evaluateRegression(normalized, baselines.get(normalized.requestedUrl), config.regression)
    ];
    return { ...normalized, failures, passed: failures.length === 0 };
  });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    passed: results.every((result) => result.passed),
    results
  };
  const outputDirectory = path.resolve(args.output ?? config.settings.outputDirectory);
  await mkdir(outputDirectory, { recursive: true });
  const jsonPath = path.join(outputDirectory, "web-quality-report.json");
  const markdownPath = path.join(outputDirectory, "web-quality-report.md");
  const markdown = createMarkdownReport(report);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, markdown, "utf8");
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
  }
  process.stdout.write(`${markdown}\nReports: ${outputDirectory}\n`);
  return report.passed ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`web-quality-audit: ${error.message}\n`);
    process.exitCode = 2;
  });
