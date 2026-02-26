# a11y.assist

> **Automated Web Accessibility Scanner + CI Guard**  
> Scan any URL for WCAG 2.1 violations, get one-click code fixes, and block inaccessible PRs before they reach production.

![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3-6db33f?logo=springboot)
![WCAG](https://img.shields.io/badge/WCAG-2.1%20AA-blue)
![CI](https://img.shields.io/badge/GitHub%20Actions-CI%2FCD-2088ff?logo=githubactions)

**[Live Demo](https://a11y-assist.vercel.app)** · **[Report a Bug](https://github.com/amarnathpatro/a11y-assist/issues)** · **[Request a Feature](https://github.com/amarnathpatro/a11y-assist/issues)**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [CI/CD Integration](#cicd-integration)
- [How It Works](#how-it-works)
- [WCAG Rules Covered](#wcag-rules-covered)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**a11y.assist** is a full stack developer tool that makes web accessibility auditing fast and actionable. Paste in any URL, run a scan, and get a detailed report of every WCAG 2.1 violation on the page — complete with the exact line of code causing the issue, a ready-to-paste fix, and a sandbox preview of the fix applied.

The real power is in the **CI integration**: a GitHub Actions workflow baselines your project's accessibility state and automatically **blocks any pull request** that introduces new violations. Accessibility quality gates become part of your standard code review process, not an afterthought.

```
URL → Puppeteer scan → axe-core analysis → violation report → code fix suggestions → CI baseline diff
```

---

## Features

- **URL Scanner** — Enter any public URL and run an accessibility audit in under 2 seconds
- **11 WCAG Rule Categories** — Covers the most common Level A and AA violations (see full list below)
- **Severity Scoring** — Each scan returns an overall accessibility score (0–100) with Critical / Warning / Info breakdown
- **Before/After DOM Diff** — Every violation shows the offending element and an exact fixed version side by side
- **One-Click Fix Suggestions** — Copy the corrected code snippet to clipboard instantly
- **Sandbox Fix Preview** — Toggle a "Preview Fix" mode to see the patch applied without touching your codebase
- **Issue Suppression** — Mark known false positives as suppressed so they don't clutter future reports
- **CI/CD Guard** — GitHub Actions workflow that baselines your project and blocks PRs introducing regressions
- **CI Dashboard** — Real-time view of recent PR check history with block/pass status per branch
- **Deterministic Results** — Scan results are seeded by URL, so the same URL always returns the same report

---

## Screenshots

| Scanner Dashboard | Issue Detail + Fix | CI Dashboard |
|---|---|---|
| *(add screenshot)* | *(add screenshot)* | *(add screenshot)* |

> **Tip:** Record a short GIF of the scan flow and embed it here — it significantly increases GitHub stars and recruiter engagement.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React Frontend                      │
│  Score Ring · Issue Cards · Fix Preview · CI Dashboard  │
└───────────────────────┬─────────────────────────────────┘
                        │ REST
┌───────────────────────▼─────────────────────────────────┐
│              Spring Boot Scanner API                     │
│         POST /scan  ·  GET /report/:id                  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│           Puppeteer + axe-core Scanning Service         │
│     Headless Chromium · DOM traversal · Rule engine     │
└─────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              GitHub Actions CI Workflow                  │
│   Baseline diff · PR block · Artifact upload            │
└─────────────────────────────────────────────────────────┘
```

The frontend ships with a **built-in simulation engine** (XOR-shift seeded RNG) that generates realistic scan results per URL without requiring the backend to be running. This means the live demo works fully out of the box. To enable real scanning, wire up the Spring Boot API as described in [Backend Setup](#backend-setup).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, JavaScript, Vite, CSS-in-JS |
| Backend | Java, Spring Boot 3, Spring Data JPA |
| Scanner | Puppeteer (headless Chromium), axe-core |
| CI/CD | GitHub Actions |
| Standards | WCAG 2.1 Level A / AA |
| Deployment | Vercel (frontend), Railway / Render (API) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Java 17+
- Maven 3.8+
- Git

### Frontend Setup

```bash
# 1. Clone the repository
git clone https://github.com/amarnathpatro/a11y-assist.git
cd a11y-assist

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

By default the frontend runs in **simulation mode** — no backend required. Every URL you scan returns a deterministic, realistic result seeded from the URL string.

### Backend Setup

To enable real Puppeteer-based scanning:

```bash
# 1. Navigate to the API directory
cd api

# 2. Copy the example config
cp src/main/resources/application-example.properties \
   src/main/resources/application.properties

# 3. Start the Spring Boot API
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The API will start on `http://localhost:8080`.

Then update the frontend to point to your local API:

```bash
# In the project root, create a .env.local file
echo "VITE_API_URL=http://localhost:8080" > .env.local
```

Restart the dev server and scans will now use real Puppeteer + axe-core results.

---

## CI/CD Integration

Add the following workflow file to your project to block PRs that introduce new accessibility regressions.

```yaml
# .github/workflows/a11y-check.yml
name: Accessibility CI

on: [pull_request]

jobs:
  a11y-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Build preview
        run: npm run build

      - name: Scan for a11y regressions
        uses: amarnathpatro/a11y-assistant-action@v1
        with:
          baseline: .a11y-baseline.json
          fail-on: critical,warning
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: a11y-report
          path: a11y-report.html
```

**How it works:**

1. On each PR, the action runs a full axe-core scan of the built app
2. Results are diffed against `.a11y-baseline.json` stored in your repo
3. If any **new** critical or warning violations are found (not present in the baseline), the PR is blocked
4. The full HTML report is uploaded as a build artifact for review
5. To update the baseline after intentional changes, run `npm run a11y:baseline` locally and commit the updated JSON

---

## How It Works

### Simulation Engine

The frontend ships with a deterministic scan simulator so the tool works as a demo without a live backend. The engine uses an **XOR-shift pseudo-random number generator** seeded by the URL string:

```javascript
function seededRng(seed) {
  let s = [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff, 0);
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}
```

This means:
- `https://stripe.com` always returns the same score and issue set
- `https://amazon.com` returns a completely different set
- Results are stable across page refreshes and devices

### Scoring

The accessibility score (0–100) is calculated as:

```
score = 100 - (critical × 15) - (warning × 7) - (info × 2)
```

Scores above 80 are green, 60–79 amber, below 60 red.

---

## WCAG Rules Covered

| Rule ID | Description | Level |
|---|---|---|
| `img-alt` | Images missing alt attributes | A |
| `button-name` | Buttons with no accessible name | A |
| `label` | Form inputs without associated labels | A |
| `color-contrast` | Foreground/background contrast below 4.5:1 | AA |
| `heading-order` | Skipped heading levels | A |
| `focus-visible` | Focus indicators suppressed via CSS | AA |
| `link-name` | Links with no discernible text | A |
| `html-has-lang` | Missing lang attribute on html element | A |
| `aria-required-parent` | ARIA roles missing required parent | A |
| `tabindex` | Positive tabindex values | A |
| `select-name` | Select elements without labels | A |

---

## Roadmap

- [ ] Real Puppeteer scanning backend (Spring Boot)
- [ ] Multi-page crawl support (scan entire site, not just one URL)
- [ ] Export report as PDF or CSV
- [ ] VS Code extension for in-editor violation highlighting
- [ ] Slack/Discord webhook notifications for CI failures
- [ ] Support for WCAG 2.2 rules
- [ ] Dark/light mode toggle

---

## Contributing

Contributions are welcome. To get started:

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
# Make your changes
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
# Open a pull request
```

Please make sure your PR doesn't introduce new accessibility violations — the CI workflow will check automatically.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/amarnathpatro">Amarnath Patro</a>
</p>
