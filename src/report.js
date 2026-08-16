const LABELS = {
  performance: "Performance",
  accessibility: "Accessibility",
  "best-practices": "Best practices",
  seo: "SEO",
  "first-contentful-paint": "First Contentful Paint",
  "largest-contentful-paint": "Largest Contentful Paint",
  "total-blocking-time": "Total Blocking Time",
  "cumulative-layout-shift": "Cumulative Layout Shift",
  "speed-index": "Speed Index",
  "interaction-to-next-paint": "Interaction to Next Paint"
};

function score(value) {
  return typeof value === "number" ? `${Math.round(value * 100)}` : "—";
}

function metric(id, value) {
  if (typeof value !== "number") return "—";
  return id === "cumulative-layout-shift" ? value.toFixed(3) : `${Math.round(value)} ms`;
}

export function createMarkdownReport(report) {
  const lines = [
    "# Web quality audit",
    "",
    `**Status:** ${report.passed ? "✅ Passed" : "❌ Failed"}`,
    "",
    `Generated: ${report.generatedAt}`,
    ""
  ];

  for (const entry of report.results) {
    lines.push(`## ${entry.name}`, "", `[${entry.finalUrl}](${entry.finalUrl})`, "");
    lines.push("| Category | Score |", "| --- | ---: |");
    for (const [id, value] of Object.entries(entry.scores)) {
      lines.push(`| ${LABELS[id] ?? id} | ${score(value)} |`);
    }
    lines.push("", "| Metric | Value |", "| --- | ---: |");
    for (const [id, value] of Object.entries(entry.metrics)) {
      lines.push(`| ${LABELS[id] ?? id} | ${metric(id, value)} |`);
    }
    lines.push("");
    if (entry.failures.length) {
      lines.push("### Failures", "");
      for (const failure of entry.failures) lines.push(`- ${failure.message}`);
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

