import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

function wait(milliseconds) {
  return milliseconds > 0 ? new Promise((resolve) => setTimeout(resolve, milliseconds)) : null;
}

export async function auditTargets(config, options = {}) {
  const userDataDir = await mkdtemp(path.join(tmpdir(), "web-quality-audit-"));
  const chrome = await launch({
    chromePath: options.chromePath,
    chromeFlags: config.settings.chromeFlags,
    userDataDir
  });
  try {
    const results = [];
    for (const target of config.targets) {
      const lhrs = [];
      const totalRuns = config.settings.warmupRuns + config.settings.runs;
      for (let index = 0; index < totalRuns; index += 1) {
        const isWarmup = index < config.settings.warmupRuns;
        if (options.verbose) {
          const label = isWarmup
            ? `warmup ${index + 1}/${config.settings.warmupRuns}`
            : `sample ${index - config.settings.warmupRuns + 1}/${config.settings.runs}`;
          process.stderr.write(`Auditing ${target.url} (${label})\n`);
        }
        const run = await lighthouse(
          target.url,
          {
            port: chrome.port,
            output: "json",
            logLevel: options.verbose ? "info" : "error"
          },
          {
            extends: "lighthouse:default",
            settings: { blockedUrlPatterns: config.settings.blockedUrlPatterns }
          }
        );
        if (!run?.lhr) throw new Error(`Lighthouse returned no result for ${target.url}`);
        if (!isWarmup) lhrs.push(run.lhr);
        if (index < totalRuns - 1) await wait(config.settings.delayBetweenRunsMs);
      }
      results.push({ target, lhrs });
    }
    return results;
  } finally {
    await chrome.kill();
    try {
      await rm(userDataDir, {
        force: true,
        maxRetries: 10,
        recursive: true,
        retryDelay: 200
      });
    } catch (error) {
      process.stderr.write(
        `Warning: unable to remove temporary Chrome profile ${userDataDir}: ${error.message}\n`
      );
    }
  }
}
