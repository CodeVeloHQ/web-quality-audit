# Web Quality Audit

Budget-driven Lighthouse audits for websites and web applications. Run audits locally or
in GitHub Actions, enforce quality thresholds, compare results with a baseline, and
produce JSON and Markdown reports suitable for continuous delivery.

> **Release status:** Initial public alpha. Lighthouse results naturally vary between
> runs, so choose budgets with realistic tolerance and validate them against repeated
> measurements.

## Features

- Multiple URL targets from one YAML configuration
- Performance, accessibility, best-practices, and SEO score budgets
- Core Web Vitals and supporting metric budgets
- Baseline regression checks
- JSON and Markdown reports
- Automatic GitHub job-summary output
- Configuration-only validation for pull-request checks
- Containerized GitHub Action

## Requirements

- Node.js 22.19 or newer
- Chrome or Chromium for local audits

## Install

```shell
npm install
```

Validate the example configuration without launching Chrome:

```shell
npm run audit -- --config config.example.yaml --validate
```

Run an audit:

```shell
npm run audit -- --config config.example.yaml
```

Reports are written to `reports/web-quality-report.json` and
`reports/web-quality-report.md` by default. A failed budget or regression produces exit
code `1`; configuration and execution errors produce exit code `2`.

## Configuration

Start with [`config.example.yaml`](config.example.yaml). Score budgets use values from
`0` to `1`. Metric budgets use milliseconds, except Cumulative Layout Shift, which is
unitless.

```yaml
version: 1
targets:
  - name: Example homepage
    url: https://example.com/
budgets:
  scores:
    performance: 0.90
    accessibility: 0.95
  metrics:
    largest-contentful-paint: 2500
    cumulative-layout-shift: 0.10
```

The full machine-readable contract is available in
[`schema/config.schema.json`](schema/config.schema.json).

## Regression checks

Pass an earlier `web-quality-report.json` file as a baseline:

```shell
npm run audit -- --config config.example.yaml --baseline previous-report.json
```

Targets are matched by requested URL. A regression fails when a category score drops or
a metric increases beyond the configured tolerance.

## GitHub Action

Copy the example configuration into your repository and add:

```yaml
- uses: CodeVeloHQ/web-quality-audit@v0
  with:
    config: web-quality-audit.yaml
```

See [`examples/github-workflow.yml`](examples/github-workflow.yml) for a complete job.
The Action uses a container with Chromium, adds the Markdown report to the job summary,
and leaves both report files in the configured output directory. Add
`actions/upload-artifact` in the consuming workflow when reports should be retained.

The `v0` reference will be created with the first tagged release. Until then, reference a
specific commit SHA when testing the Action.

## CLI options

```text
--config <file>          Audit configuration (required)
--output <directory>     Override the report directory
--baseline <file>        Previous JSON report for regression checks
--chrome-path <path>     Chrome or Chromium executable
--validate               Validate without running Lighthouse
--verbose                Show Lighthouse progress
```

## Project boundary

This repository is a standalone public tool. It does not contain CodeVelo client data,
private monitoring configuration, platform databases, deployment topology, preview
routing, or internal service integrations.

## License

[MIT](LICENSE) © 2026 CodeVelo.dev LLC.
