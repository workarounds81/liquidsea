#!/usr/bin/env node
"use strict";

/**
 * Build-time OG / social share images (1200x630 PNG) — one per digest issue,
 * plus a site default and the apple-touch-icon. Runs AFTER eleventy, writing
 * into _site/assets/og/.
 *
 * Pipeline: satori (layout + committed fonts -> SVG with text as paths)
 * then resvg (SVG -> PNG). Same generative "sounding" bar data as the site.
 */

const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");
const { soundingBars, dealDepths, PALETTE } = require("../src/_lib/sounding.js");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "_site", "assets", "og");
const DEALS_DIR = path.join(ROOT, "src", "data", "deals");
const W = 1200;
const H = 630;

const fontDisplay = fs.readFileSync(path.join(ROOT, "src/assets/fonts/archivo-black-latin-400-normal.woff"));
const fontMono = fs.readFileSync(path.join(ROOT, "src/assets/fonts/spline-sans-mono-latin-600-normal.woff"));

const el = (type, style, children) => ({ type, props: { style, children } });
const txt = (type, style, text) => ({ type, props: { style, children: text } });

function usd(n) {
  if (n === null || n === undefined) return "Undisclosed";
  const fmt = (v) => {
    const s = (Math.round(v * 10) / 10).toFixed(1);
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  };
  if (n >= 1e9) return `$${fmt(n / 1e9)}B`;
  if (n >= 1e6) return `$${fmt(n / 1e6)}M`;
  if (n >= 1e3) return `$${fmt(n / 1e3)}K`;
  return `$${n}`;
}

/* Bars rendered as absolutely-positioned divs — same data as the site SVGs. */
function barField(seed, values, fieldW, fieldH) {
  const bars = soundingBars({ seed, columns: 48, values });
  const children = [
    el("div", { position: "absolute", top: 0, left: 0, width: fieldW, height: 6, background: PALETTE.foam }),
  ];
  for (const b of bars) {
    children.push(
      el("div", {
        position: "absolute",
        top: 6,
        left: Math.round(b.x * fieldW),
        width: Math.max(6, Math.round(b.w * fieldW)),
        height: Math.round(b.depth * (fieldH - 14)),
        background: b.color,
      })
    );
  }
  return el("div", { position: "relative", width: fieldW, height: fieldH, display: "flex" }, children);
}

function issueCard({ issue, title, stats, bars }) {
  return el(
    "div",
    {
      width: W, height: H, display: "flex", flexDirection: "column",
      background: PALETTE.ink, color: PALETTE.foam, padding: 0,
    },
    [
      // Masthead band
      el(
        "div",
        {
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "28px 56px 0 56px",
        },
        [
          txt("div", { fontFamily: "Archivo Black", fontSize: 40, color: PALETTE.foam }, "LIQUIDSEA"),
          txt("div", { fontFamily: "Spline Sans Mono", fontSize: 22, color: PALETTE.mango, letterSpacing: 2 }, issue ? `ISSUE ${issue}` : "SEA INVESTMENT DEAL FLOW"),
        ]
      ),
      // Title
      el("div", { display: "flex", flexGrow: 1, alignItems: "center", padding: "0 56px" }, [
        txt(
          "div",
          { fontFamily: "Archivo Black", fontSize: title.length > 34 ? 64 : 76, lineHeight: 1.04, color: PALETTE.foam, maxWidth: 1088 },
          title
        ),
      ]),
      // Stats line
      stats
        ? txt("div", { fontFamily: "Spline Sans Mono", fontSize: 24, color: PALETTE.mango, letterSpacing: 2, padding: "0 56px 22px 56px" }, stats)
        : el("div", { display: "flex" }, []),
      // Sounding strip
      bars,
    ]
  );
}

async function renderPng(element, outFile) {
  const { default: satori } = await import("satori");
  const svg = await satori(element, {
    width: W,
    height: H,
    fonts: [
      { name: "Archivo Black", data: fontDisplay, weight: 400, style: "normal" },
      { name: "Spline Sans Mono", data: fontMono, weight: 600, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  fs.writeFileSync(outFile, png);
  console.log(`  ✓ ${path.relative(ROOT, outFile)}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Per-issue cards
  for (const fname of fs.readdirSync(DEALS_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const issue = fname.replace(/\.json$/, "");
    const data = JSON.parse(fs.readFileSync(path.join(DEALS_DIR, fname), "utf8"));
    const deals = data.deals || [];
    const md = fs.readFileSync(path.join(ROOT, "src/content/digest", `${issue}.md`), "utf8");
    const titleMatch = md.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    const title = titleMatch ? titleMatch[1] : `Issue ${issue}`;
    const total = deals.reduce((s, d) => s + (typeof d.amount_usd === "number" ? d.amount_usd : 0), 0);
    const [year, week] = issue.split("-");

    const card = issueCard({
      issue: `${year}·W${week}`,
      title,
      stats: `${deals.length} DEALS · ${usd(total).toUpperCase()} DISCLOSED`,
      bars: barField(`issue-${issue}`, dealDepths(deals), W, 170),
    });
    await renderPng(card, path.join(OUT_DIR, `${issue}.png`));
  }

  // Site default card
  const def = issueCard({
    issue: null,
    title: "Where Southeast Asia's investment capital surfaces.",
    stats: "WEEKLY DIGEST + EVENTS · SG TH VN ID PH MY",
    bars: barField("liquidsea-default", null, W, 170),
  });
  await renderPng(def, path.join(OUT_DIR, "default.png"));

  // Apple touch icon (180x180) from the favicon geometry.
  const iconSvg = fs
    .readFileSync(path.join(ROOT, "src/assets/favicon.svg"), "utf8")
    .replace("<svg ", '<svg width="180" height="180" ');
  const iconPng = new Resvg(iconSvg, { fitTo: { mode: "width", value: 180 } }).render().asPng();
  fs.writeFileSync(path.join(OUT_DIR, "apple-touch-icon.png"), iconPng);
  console.log("  ✓ _site/assets/og/apple-touch-icon.png");
}

main().catch((e) => {
  console.error("OG generation failed:", e);
  process.exit(1);
});
