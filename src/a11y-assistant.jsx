import { useState } from "react";

// ─── Deterministic seeded RNG ───────────────────────────────────────────────
function seededRng(seed) {
  let s = [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff, 0);
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Issue pool ──────────────────────────────────────────────────────────────
const ISSUE_POOL = [
  {
    id: "img-alt", severity: "critical", rule: "img-alt",
    wcag: "WCAG 2.1 – 1.1.1 Non-text Content (Level A)",
    description: "Image is missing an alt attribute. Screen readers cannot convey image content to blind users.",
    variants: [
      { element: '<img src="/hero.jpg" class="hero-banner">', fix: '<img src="/hero.jpg" class="hero-banner" alt="Team collaborating in a bright open-plan office">', file: "components/Hero.jsx", line: 42 },
      { element: '<img src="/logo.png" class="brand-logo">', fix: '<img src="/logo.png" class="brand-logo" alt="Acme Inc. company logo">', file: "components/Header.jsx", line: 18 },
      { element: '<img src="/product.webp" id="product-img">', fix: '<img src="/product.webp" id="product-img" alt="Wireless noise-cancelling headphones in midnight black">', file: "pages/Product.jsx", line: 91 },
    ],
  },
  {
    id: "button-name", severity: "critical", rule: "button-name",
    wcag: "WCAG 2.1 – 4.1.2 Name, Role, Value (Level A)",
    description: "Button contains only an icon with no accessible name. Keyboard and screen reader users cannot identify its purpose.",
    variants: [
      { element: '<button class="close-modal"><svg>...</svg></button>', fix: '<button class="close-modal" aria-label="Close modal"><svg aria-hidden="true">...</svg></button>', file: "components/Modal.jsx", line: 118 },
      { element: '<button class="menu-toggle"><svg>...</svg></button>', fix: '<button class="menu-toggle" aria-label="Open navigation menu" aria-expanded="false"><svg aria-hidden="true">...</svg></button>', file: "components/Nav.jsx", line: 34 },
      { element: '<button class="share-btn"><svg>...</svg></button>', fix: '<button class="share-btn" aria-label="Share this article"><svg aria-hidden="true">...</svg></button>', file: "components/Post.jsx", line: 77 },
    ],
  },
  {
    id: "color-contrast", severity: "warning", rule: "color-contrast",
    wcag: "WCAG 2.1 – 1.4.3 Contrast Minimum (Level AA)",
    description: "Foreground/background color combination fails the minimum contrast ratio of 4.5:1 for normal text.",
    variants: [
      { element: '<p class="subtitle" style="color:#9CA3AF;">Subtitle text</p>', fix: '<p class="subtitle" style="color:#6B7280;">Subtitle text</p>', file: "components/Card.jsx", line: 77, note: "Ratio was 2.85:1 → fixed to 4.63:1" },
      { element: '<span class="badge" style="color:#D1D5DB;background:#F9FAFB;">New</span>', fix: '<span class="badge" style="color:#374151;background:#F9FAFB;">New</span>', file: "components/Badge.jsx", line: 12, note: "Ratio was 1.92:1 → fixed to 7.8:1" },
      { element: '<a class="footer-link" style="color:#94A3B8;">Privacy Policy</a>', fix: '<a class="footer-link" style="color:#475569;">Privacy Policy</a>', file: "components/Footer.jsx", line: 55, note: "Ratio was 3.1:1 → fixed to 5.74:1" },
    ],
  },
  {
    id: "label", severity: "critical", rule: "label",
    wcag: "WCAG 2.1 – 1.3.1 Info and Relationships (Level A)",
    description: "Form input has no associated <label> element. Placeholder text disappears on input and is not a substitute.",
    variants: [
      { element: '<input type="email" placeholder="Enter your email">', fix: '<label for="email">Email address</label>\n<input id="email" type="email" placeholder="Enter your email">', file: "pages/Signup.jsx", line: 203 },
      { element: '<input type="search" placeholder="Search...">', fix: '<label for="search" class="sr-only">Search</label>\n<input id="search" type="search" placeholder="Search...">', file: "components/SearchBar.jsx", line: 9 },
      { element: '<textarea placeholder="Your message"></textarea>', fix: '<label for="msg">Your message</label>\n<textarea id="msg" placeholder="Your message"></textarea>', file: "pages/Contact.jsx", line: 88 },
    ],
  },
  {
    id: "heading-order", severity: "warning", rule: "heading-order",
    wcag: "WCAG 2.1 – 1.3.1 Info and Relationships (Level A)",
    description: "Heading levels are skipped, disrupting the document outline navigated by screen reader users.",
    variants: [
      { element: "<h4>Related Articles</h4>", fix: "<h3>Related Articles</h3>", file: "components/Sidebar.jsx", line: 55, note: "h2 → h4 skips h3" },
      { element: "<h5>Team Members</h5>", fix: "<h3>Team Members</h3>", file: "pages/About.jsx", line: 130, note: "h2 → h5 skips h3 and h4" },
      { element: "<h3>FAQ</h3>", fix: "<h2>FAQ</h2>", file: "pages/Help.jsx", line: 22, note: "Page starts with h3 — should be h2" },
    ],
  },
  {
    id: "focus-visible", severity: "warning", rule: "focus-visible",
    wcag: "WCAG 2.1 – 2.4.7 Focus Visible (Level AA)",
    description: "Focus outline is removed via CSS, making it impossible for keyboard-only users to track where focus is.",
    variants: [
      { element: "a.nav-link { outline: none; }", fix: "a.nav-link:focus-visible {\n  outline: 2px solid #2563EB;\n  outline-offset: 2px;\n  border-radius: 2px;\n}", file: "styles/nav.css", line: 14 },
      { element: "button { outline: 0 !important; }", fix: "button:focus-visible {\n  outline: 2px solid #7C3AED;\n  outline-offset: 3px;\n}", file: "styles/global.css", line: 38 },
      { element: ".card:focus { outline: none; }", fix: ".card:focus-visible {\n  outline: 2px solid #0EA5E9;\n  outline-offset: 4px;\n  border-radius: 8px;\n}", file: "components/Card.module.css", line: 62 },
    ],
  },
  {
    id: "aria-required-parent", severity: "critical", rule: "aria-required-parent",
    wcag: "WCAG 2.1 – 1.3.1 Info and Relationships (Level A)",
    description: "Element with role='option' is not contained within a required parent role='listbox'. This breaks the ARIA ownership contract.",
    variants: [
      { element: '<div role="option">Item A</div>', fix: '<div role="listbox" aria-label="Options">\n  <div role="option" aria-selected="false">Item A</div>\n</div>', file: "components/Dropdown.jsx", line: 49 },
    ],
  },
  {
    id: "link-name", severity: "critical", rule: "link-name",
    wcag: "WCAG 2.1 – 2.4.4 Link Purpose (Level A)",
    description: "Link has no discernible text. Screen readers will announce it as an empty or unlabelled link.",
    variants: [
      { element: '<a href="/more"><svg>...</svg></a>', fix: '<a href="/more" aria-label="Read more about our services"><svg aria-hidden="true">...</svg></a>', file: "components/Card.jsx", line: 88 },
      { element: '<a href="/profile"><img src="/avatar.png"></a>', fix: '<a href="/profile"><img src="/avatar.png" alt="View your profile"></a>', file: "components/Header.jsx", line: 61 },
    ],
  },
  {
    id: "html-lang", severity: "info", rule: "html-has-lang",
    wcag: "WCAG 2.1 – 3.1.1 Language of Page (Level A)",
    description: "The <html> element is missing a lang attribute. Screen readers use this to select the correct language voice engine.",
    variants: [
      { element: "<html>", fix: '<html lang="en">', file: "index.html", line: 1 },
    ],
  },
  {
    id: "tabindex", severity: "info", rule: "tabindex",
    wcag: "WCAG 2.1 – 2.1.1 Keyboard (Level A)",
    description: "A tabindex value greater than 0 creates an unpredictable tab order that confuses keyboard navigation.",
    variants: [
      { element: '<div tabindex="5" class="promo-banner">', fix: '<div tabindex="0" class="promo-banner">', file: "components/Banner.jsx", line: 7 },
    ],
  },
  {
    id: "select-name", severity: "warning", rule: "select-name",
    wcag: "WCAG 2.1 – 1.3.1 Info and Relationships (Level A)",
    description: "<select> has no accessible label. Assistive technology users cannot determine the purpose of this control.",
    variants: [
      { element: '<select name="country"><option>US</option>...</select>', fix: '<label for="country">Country</label>\n<select id="country" name="country"><option>US</option>...</select>', file: "components/AddressForm.jsx", line: 44 },
    ],
  },
];

// ─── Generate scan result from URL ──────────────────────────────────────────
function generateScanResult(url) {
  const rng = seededRng(url);
  const score = Math.floor(rng() * 62) + 35;
  const issueCount = score >= 85 ? Math.floor(rng() * 2) + 1
    : score >= 65 ? Math.floor(rng() * 3) + 2
    : Math.floor(rng() * 4) + 3;

  const shuffled = [...ISSUE_POOL].sort(() => rng() - 0.5);
  const picked = shuffled.slice(0, Math.min(issueCount, shuffled.length));

  const issues = picked.map((template, idx) => {
    const variant = template.variants[Math.floor(rng() * template.variants.length)];
    const lineOffset = Math.floor(rng() * 40) - 20;
    return {
      id: idx + 1,
      severity: template.severity,
      rule: template.rule,
      wcag: template.wcag,
      description: template.description,
      element: variant.element,
      fix: variant.fix,
      file: variant.file,
      line: Math.max(1, variant.line + lineOffset),
      note: variant.note || null,
    };
  });

  const nodeCount = Math.floor(rng() * 400) + 80;
  const scanTime = (rng() * 2.8 + 0.4).toFixed(1);
  const pageCount = Math.floor(rng() * 8) + 1;
  return { score, issues, nodeCount, scanTime, pageCount };
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CI_YAML = `# .github/workflows/a11y-check.yml
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
        uses: your-org/a11y-assistant-action@v1
        with:
          baseline: .a11y-baseline.json
          fail-on: critical,warning
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: a11y-report
          path: a11y-report.html`;

const SEVERITY_META = {
  critical: { color: "#FF4444", bg: "rgba(255,68,68,0.12)", label: "CRITICAL" },
  warning:  { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", label: "WARNING" },
  info:     { color: "#60A5FA", bg: "rgba(96,165,250,0.12)", label: "INFO" },
};

const SCAN_LABELS = [
  "Initialising Puppeteer",
  "Fetching DOM…",
  "Running axe-core rules",
  "Checking ARIA attributes",
  "Analysing colour contrast",
  "Auditing keyboard paths",
  "Building report…",
];

// ─── Sub-components ──────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 44, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  const color = score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#FF4444";
  return (
    <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1E293B" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
      <text x="60" y="58" textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg) translate(0,-120px)", fill: color, fontSize: "22px", fontWeight: 700, fontFamily: "monospace" }}>{score}</text>
      <text x="60" y="76" textAnchor="middle"
        style={{ transform: "rotate(90deg) translate(0,-120px)", fill: "#64748B", fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.1em" }}>A11Y</text>
    </svg>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative", marginTop: "12px" }}>
      <pre style={{ background: "#090E1A", border: "1px solid #1E293B", borderRadius: "8px", padding: "16px 52px 16px 16px", margin: 0, fontSize: "12px", lineHeight: 1.7, color: "#A5F3FC", fontFamily: "monospace", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{code}</pre>
      <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{ position: "absolute", top: "10px", right: "10px", background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${copied ? "#22C55E" : "#334155"}`, color: copied ? "#22C55E" : "#94A3B8", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s" }}>
        {copied ? "✓ copied" : "copy"}
      </button>
    </div>
  );
}

function IssueCard({ issue, expanded, onToggle }) {
  const [previewApplied, setPreviewApplied] = useState(false);
  const meta = SEVERITY_META[issue.severity];
  return (
    <div style={{ background: expanded ? "#0D1525" : "#0A111E", border: `1px solid ${expanded ? "#1E3A5F" : "#141E30"}`, borderLeft: `3px solid ${meta.color}`, borderRadius: "10px", marginBottom: "8px", overflow: "hidden", transition: "all 0.2s" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", cursor: "pointer", userSelect: "none" }}>
        <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40`, borderRadius: "4px", padding: "2px 8px", fontSize: "10px", fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{meta.label}</span>
        <code style={{ color: "#7DD3FC", fontSize: "13px", fontFamily: "monospace" }}>{issue.rule}</code>
        <span style={{ color: "#475569", fontSize: "12px", marginLeft: "auto", whiteSpace: "nowrap" }}>{issue.file}:{issue.line}</span>
        <span style={{ color: "#334155", fontSize: "16px", marginLeft: "8px" }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid #141E30" }}>
          <p style={{ color: "#94A3B8", fontSize: "13px", lineHeight: 1.7, margin: "14px 0 6px" }}>{issue.description}</p>
          {issue.note && <div style={{ color: "#F59E0B", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontFamily: "monospace", marginBottom: "8px" }}>⚠ {issue.note}</div>}
          <span style={{ display: "inline-block", background: "#0F172A", border: "1px solid #1E293B", color: "#64748B", borderRadius: "4px", padding: "2px 10px", fontSize: "11px", fontFamily: "monospace", marginBottom: "12px" }}>{issue.wcag}</span>
          <div style={{ marginBottom: "4px" }}>
            <div style={{ color: "#64748B", fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>← BEFORE</div>
            <pre style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: "8px", padding: "12px 16px", margin: 0, fontSize: "12px", color: "#FCA5A5", fontFamily: "monospace", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{issue.element}</pre>
          </div>
          <div style={{ margin: "10px 0 4px" }}>
            <div style={{ color: "#64748B", fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>→ SUGGESTED FIX</div>
            <CodeBlock code={issue.fix} />
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            <button onClick={() => setPreviewApplied(!previewApplied)} style={{ background: previewApplied ? "rgba(34,197,94,0.15)" : "rgba(96,165,250,0.1)", border: `1px solid ${previewApplied ? "#22C55E60" : "#60A5FA40"}`, color: previewApplied ? "#22C55E" : "#60A5FA", borderRadius: "7px", padding: "7px 16px", fontSize: "12px", cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s" }}>
              {previewApplied ? "✓ Fix Applied in Preview" : "⬡ Preview Fix (Sandbox)"}
            </button>
            <button style={{ background: "transparent", border: "1px solid #1E293B", color: "#475569", borderRadius: "7px", padding: "7px 16px", fontSize: "12px", cursor: "pointer", fontFamily: "monospace" }}>Mark as Suppressed</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CIPanel() {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg,#22C55E20,#16A34A40)", border: "1px solid #22C55E30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>⚙</div>
        <div>
          <div style={{ color: "#E2E8F0", fontSize: "14px", fontWeight: 600 }}>GitHub Actions Integration</div>
          <div style={{ color: "#64748B", fontSize: "12px" }}>Block PRs that introduce a11y regressions</div>
        </div>
        <span style={{ marginLeft: "auto", background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid #22C55E30", borderRadius: "20px", padding: "4px 12px", fontSize: "11px", fontFamily: "monospace" }}>● ACTIVE</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
        {[{ label: "Last scan", value: "2 min ago" }, { label: "PRs blocked", value: "3 this week" }, { label: "Auto-fixed", value: "12 total" }].map(s => (
          <div key={s.label} style={{ background: "#090E1A", border: "1px solid #141E30", borderRadius: "8px", padding: "14px" }}>
            <div style={{ color: "#334155", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "6px" }}>{s.label.toUpperCase()}</div>
            <div style={{ color: "#E2E8F0", fontSize: "18px", fontWeight: 700, fontFamily: "monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ color: "#64748B", fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: "8px" }}>.github/workflows/a11y-check.yml</div>
      <div style={{ position: "relative" }}>
        <pre style={{ background: "#090E1A", border: "1px solid #1E293B", borderRadius: "10px", padding: "20px", margin: 0, fontSize: "11.5px", lineHeight: 1.8, color: "#94A3B8", fontFamily: "monospace", overflowX: "auto", maxHeight: "360px", overflowY: "auto" }}>
          {CI_YAML.split("\n").map((line, i) => {
            if (line.trim().startsWith("#")) return <div key={i} style={{ color: "#475569" }}>{line}</div>;
            if (line.includes(":") && !line.trim().startsWith("-")) {
              const colon = line.indexOf(":");
              return <div key={i}><span style={{ color: "#7DD3FC" }}>{line.slice(0, colon)}</span><span>{line.slice(colon)}</span></div>;
            }
            if (line.trim().startsWith("-")) return <div key={i} style={{ color: "#A5F3FC" }}>{line}</div>;
            return <div key={i}>{line}</div>;
          })}
        </pre>
        <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ position: "absolute", top: "12px", right: "12px", background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${copied ? "#22C55E" : "#334155"}`, color: copied ? "#22C55E" : "#94A3B8", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>
          {copied ? "✓ copied" : "copy yaml"}
        </button>
      </div>
      <div style={{ marginTop: "16px", background: "#090E1A", border: "1px solid #141E30", borderRadius: "10px", padding: "16px" }}>
        <div style={{ color: "#64748B", fontSize: "11px", fontFamily: "monospace", marginBottom: "10px", letterSpacing: "0.06em" }}>RECENT PR CHECKS</div>
        {[{ pr: "#247", branch: "feat/new-modal", status: "blocked", issues: "2 critical" }, { pr: "#245", branch: "fix/nav-styles", status: "passed", issues: "0 new" }, { pr: "#243", branch: "chore/deps", status: "passed", issues: "0 new" }, { pr: "#241", branch: "feat/signup-form", status: "blocked", issues: "1 critical, 1 warning" }].map(pr => (
          <div key={pr.pr} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 0", borderBottom: "1px solid #0F172A" }}>
            <span style={{ color: "#475569", fontSize: "12px", fontFamily: "monospace", width: "40px" }}>{pr.pr}</span>
            <span style={{ color: "#7DD3FC", fontSize: "12px", fontFamily: "monospace", flex: 1 }}>{pr.branch}</span>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: pr.status === "blocked" ? "#FF4444" : "#22C55E", background: pr.status === "blocked" ? "rgba(255,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${pr.status === "blocked" ? "#FF444430" : "#22C55E30"}`, borderRadius: "4px", padding: "2px 8px" }}>
              {pr.status === "blocked" ? "✗ BLOCKED" : "✓ PASSED"}
            </span>
            <span style={{ color: "#475569", fontSize: "11px", fontFamily: "monospace" }}>{pr.issues}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function A11yAssistant() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("issues");
  const [scanLabel, setScanLabel] = useState(SCAN_LABELS[0]);
  const [lastScannedUrl, setLastScannedUrl] = useState("");

  const handleScan = () => {
    const target = url.trim() || "https://example.com";
    setScanning(true);
    setResult(null);
    setProgress(0);
    setExpandedId(null);
    setFilter("all");
    let p = 0, labelIdx = 0;
    const labelTimer = setInterval(() => {
      labelIdx = Math.min(labelIdx + 1, SCAN_LABELS.length - 1);
      setScanLabel(SCAN_LABELS[labelIdx]);
    }, 320);
    const interval = setInterval(() => {
      p += Math.random() * 16 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        clearInterval(labelTimer);
        setTimeout(() => {
          setScanning(false);
          setLastScannedUrl(target);
          const r = generateScanResult(target);
          setResult(r);
          if (r.issues.length > 0) setExpandedId(1);
        }, 300);
      }
      setProgress(Math.min(p, 100));
    }, 200);
  };

  const filtered = result
    ? (filter === "all" ? result.issues : result.issues.filter(i => i.severity === filter))
    : [];

  const counts = result
    ? {
        critical: result.issues.filter(i => i.severity === "critical").length,
        warning: result.issues.filter(i => i.severity === "warning").length,
        info: result.issues.filter(i => i.severity === "info").length,
      }
    : { critical: 0, warning: 0, info: 0 };

  return (
    <div style={{ minHeight: "100vh", background: "#060B14", fontFamily: "'JetBrains Mono','Fira Code',monospace", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0A111E; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 3px; }
        input::placeholder { color: #334155 !important; }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:1} }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #0F172A", background: "linear-gradient(180deg,#080D19,#060B14)", padding: "0 32px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 0", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "linear-gradient(135deg,#1D4ED8,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}>⬡</div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: 800, fontFamily: "'Syne',sans-serif", color: "#F1F5F9" }}>a11y<span style={{ color: "#7C3AED" }}>.assist</span></div>
            <div style={{ fontSize: "11px", color: "#334155", letterSpacing: "0.1em" }}>ACCESSIBILITY SCANNER + CI GUARD</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            {["issues", "ci"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "rgba(124,58,237,0.15)" : "transparent", border: `1px solid ${tab === t ? "#7C3AED50" : "#141E30"}`, color: tab === t ? "#A78BFA" : "#475569", borderRadius: "7px", padding: "7px 16px", fontSize: "12px", cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t === "issues" ? "⚡ Issues" : "⚙ CI / GitHub"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px" }}>
        {tab === "issues" ? (
          <div>
            {/* Scanner bar */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", background: "#0A111E", border: "1px solid #141E30", borderRadius: "12px", padding: "12px 14px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#334155" }}>◌</span>
                <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
                  style={{ width: "100%", background: "#090E1A", border: "1px solid #1E293B", borderRadius: "8px", padding: "10px 12px 10px 34px", color: "#7DD3FC", fontSize: "13px", outline: "none", fontFamily: "monospace" }}
                  placeholder="https://your-app.com — try different URLs!" />
              </div>
              <button onClick={handleScan} disabled={scanning} style={{ background: scanning ? "#1E293B" : "linear-gradient(135deg,#1D4ED8,#7C3AED)", border: "none", borderRadius: "8px", padding: "10px 24px", color: scanning ? "#475569" : "#fff", fontSize: "13px", fontWeight: 600, cursor: scanning ? "not-allowed" : "pointer", fontFamily: "monospace", boxShadow: scanning ? "none" : "0 0 20px rgba(124,58,237,0.3)", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                {scanning ? `${Math.round(progress)}%` : "⬡ Run Scan"}
              </button>
            </div>

            {scanning && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ height: "3px", background: "#0F172A", borderRadius: "2px", overflow: "hidden", marginBottom: "10px" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#1D4ED8,#7C3AED)", transition: "width 0.2s ease", borderRadius: "2px" }} />
                </div>
                <div style={{ color: "#475569", fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.06em", animation: "shimmer 1s ease-in-out infinite" }}>↳ {scanLabel}…</div>
              </div>
            )}

            {result && (
              <div style={{ animation: "fadeInUp 0.4s ease" }}>
                {/* Scanned URL chip */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                  <span style={{ color: "#334155", fontSize: "11px", letterSpacing: "0.08em" }}>SCANNED:</span>
                  <span style={{ background: "#0A111E", border: "1px solid #1E293B", color: "#7DD3FC", borderRadius: "6px", padding: "3px 12px", fontSize: "12px", fontFamily: "monospace" }}>{lastScannedUrl}</span>
                  <span style={{ marginLeft: "auto", color: "#334155", fontSize: "11px" }}>{result.pageCount} page{result.pageCount > 1 ? "s" : ""} · {result.nodeCount} nodes · {result.scanTime}s</span>
                </div>

                {/* Score + counts */}
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "20px", marginBottom: "28px" }}>
                  <div style={{ background: "#0A111E", border: "1px solid #141E30", borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                    <ScoreRing score={result.score} />
                    <div style={{ color: "#475569", fontSize: "10px", letterSpacing: "0.1em", marginTop: "8px" }}>OVERALL SCORE</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                    {Object.entries(counts).map(([sev, n]) => {
                      const m = SEVERITY_META[sev];
                      return (
                        <div key={sev} onClick={() => setFilter(filter === sev ? "all" : sev)} style={{ background: "#0A111E", border: `1px solid ${m.color}20`, borderRadius: "12px", padding: "18px", cursor: "pointer", outline: filter === sev ? `2px solid ${m.color}60` : "none", transition: "all 0.2s" }}>
                          <div style={{ color: m.color, fontSize: "28px", fontWeight: 700, lineHeight: 1 }}>{n}</div>
                          <div style={{ color: m.color, fontSize: "11px", marginTop: "6px", letterSpacing: "0.08em" }}>{m.label}</div>
                          <div style={{ color: "#334155", fontSize: "11px", marginTop: "2px" }}>issues found</div>
                        </div>
                      );
                    })}
                    <div style={{ background: "#0A111E", border: "1px solid #141E30", borderRadius: "12px", padding: "18px" }}>
                      <div style={{ color: "#E2E8F0", fontSize: "28px", fontWeight: 700, lineHeight: 1 }}>{result.issues.length}</div>
                      <div style={{ color: "#64748B", fontSize: "11px", marginTop: "6px", letterSpacing: "0.08em" }}>TOTAL</div>
                      <div style={{ color: "#334155", fontSize: "11px", marginTop: "2px" }}>violations</div>
                    </div>
                    <div style={{ background: "#0A111E", border: "1px solid #141E30", borderRadius: "12px", padding: "18px" }}>
                      <div style={{ color: "#E2E8F0", fontSize: "28px", fontWeight: 700, lineHeight: 1 }}>{result.nodeCount}</div>
                      <div style={{ color: "#64748B", fontSize: "11px", marginTop: "6px", letterSpacing: "0.08em" }}>NODES</div>
                      <div style={{ color: "#334155", fontSize: "11px", marginTop: "2px" }}>scanned</div>
                    </div>
                    <div style={{ background: "#0A111E", border: "1px solid #141E30", borderRadius: "12px", padding: "18px" }}>
                      <div style={{ color: "#E2E8F0", fontSize: "28px", fontWeight: 700, lineHeight: 1 }}>{result.scanTime}s</div>
                      <div style={{ color: "#64748B", fontSize: "11px", marginTop: "6px", letterSpacing: "0.08em" }}>SCAN TIME</div>
                      <div style={{ color: "#334155", fontSize: "11px", marginTop: "2px" }}>Puppeteer</div>
                    </div>
                  </div>
                </div>

                {/* Filter */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
                  <span style={{ color: "#334155", fontSize: "11px", letterSpacing: "0.08em" }}>FILTER:</span>
                  {["all", "critical", "warning", "info"].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? (f === "all" ? "rgba(255,255,255,0.08)" : SEVERITY_META[f]?.bg) : "transparent", border: `1px solid ${filter === f ? (f === "all" ? "#334155" : SEVERITY_META[f]?.color + "50") : "#141E30"}`, color: filter === f ? (f === "all" ? "#E2E8F0" : SEVERITY_META[f]?.color) : "#475569", borderRadius: "20px", padding: "4px 14px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em", transition: "all 0.2s" }}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>

                {filtered.length > 0
                  ? filtered.map(issue => <IssueCard key={issue.id} issue={issue} expanded={expandedId === issue.id} onToggle={() => setExpandedId(expandedId === issue.id ? null : issue.id)} />)
                  : <div style={{ textAlign: "center", padding: "40px", color: "#334155" }}>No {filter !== "all" ? filter : ""} issues for this URL.</div>
                }
              </div>
            )}

            {!result && !scanning && (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "#334155" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>⬡</div>
                <div style={{ fontSize: "14px", marginBottom: "8px" }}>Enter any URL and run a scan</div>
                <div style={{ fontSize: "12px", color: "#1E293B" }}>Every URL produces unique results — try a few and compare!</div>
              </div>
            )}
          </div>
        ) : <CIPanel />}
      </div>
    </div>
  );
}
