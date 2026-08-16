import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

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
      const run = await lighthouse(target.url, {
        port: chrome.port,
        output: "json",
        logLevel: options.verbose ? "info" : "error"
      });
      if (!run?.lhr) throw new Error(`Lighthouse returned no result for ${target.url}`);
      results.push({ target, lhr: run.lhr });
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
