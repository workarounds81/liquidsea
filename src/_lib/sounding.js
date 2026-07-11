"use strict";

/**
 * LiquidSea "Sounding Strip" — deterministic generative echogram.
 *
 * The site's signature element: sonar-style depth bars seeded from a string
 * (issue number, event name…) so the same input always draws the same strip.
 * Used as an 11ty shortcode for inline SVG headers, and by scripts/generate-og.js
 * to draw the social-share images from the identical bar data.
 */

const PALETTE = {
  ink: "#0C1F23",
  foam: "#EFF5F0",
  tide: "#0E7C66",
  chili: "#FF4B33",
  mango: "#FFB320",
  monsoon: "#46656C",
};

/* xmur3 string hash — turns any string into a 32-bit seed. */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/* mulberry32 PRNG — fast, deterministic, good enough for graphics. */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seedStr) {
  return mulberry32(xmur3(String(seedStr))());
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Core bar model shared by SVG shortcode and OG renderer.
 * Returns an array of { x, w, depth (0..1), color, tick } in a unit-width space.
 *
 * `values` (optional): array of numbers 0..1 — "signal" columns (e.g. deal
 * sizes) planted at regular intervals among random-walk "noise" columns.
 */
function soundingBars({ seed, columns = 60, values = null }) {
  const rng = makeRng(seed);
  const bars = [];
  const colW = 1 / columns;
  const barW = colW * 0.62;

  // Which columns carry a planted signal value?
  const signalAt = new Map();
  if (values && values.length) {
    const step = Math.max(2, Math.floor(columns / values.length));
    values.forEach((v, i) => {
      const col = Math.min(columns - 1, Math.floor(step / 2) + i * step);
      signalAt.set(col, clamp(v, 0.15, 1));
    });
  }
  const maxSignal = values && values.length ? Math.max(...values) : null;

  let depth = 0.3 + rng() * 0.4; // random-walk state for noise columns
  for (let i = 0; i < columns; i++) {
    depth = clamp(depth + (rng() - 0.5) * 0.34, 0.08, 0.72);
    const isSignal = signalAt.has(i);
    const d = isSignal ? signalAt.get(i) : depth;

    let color = PALETTE.tide;
    if (isSignal) {
      // Biggest deal of the week burns chili; other signals go mango.
      color = signalAt.get(i) === clamp(maxSignal, 0.15, 1) ? PALETTE.chili : PALETTE.mango;
    } else if (rng() < 0.07) {
      color = PALETTE.mango;
    }

    bars.push({
      x: i * colW + (colW - barW) / 2,
      w: barW,
      depth: d,
      color,
      tick: isSignal || rng() < 0.25, // bright "seafloor" tick at the bar's end
    });
  }
  return bars;
}

/**
 * Render the strip as an inline SVG string.
 * Decorative by default (aria-hidden); pass `label` to expose it as an image.
 */
function soundingSVG({
  seed,
  values = null,
  width = 1200,
  height = 160,
  columns = 60,
  animate = false,
  background = "none",
  label = null,
  macd = false,
} = {}) {
  const bars = soundingBars({ seed, columns, values });
  const parts = [];
  const macdH = macd ? 54 : 0;
  const totalH = height + macdH;
  const aria = label
    ? `role="img" aria-label="${escapeAttr(label)}"`
    : `aria-hidden="true" focusable="false"`;

  parts.push(
    `<svg class="sounding${animate ? " sounding--animate" : ""}" ${aria} viewBox="0 0 ${width} ${totalH}" width="${width}" height="${totalH}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">`
  );
  if (background !== "none") {
    parts.push(`<rect width="${width}" height="${height}" fill="${background}"/>`);
  }
  // Surface line the soundings hang from.
  parts.push(`<rect x="0" y="0" width="${width}" height="4" fill="currentColor"/>`);

  bars.forEach((b, i) => {
    const x = (b.x * width).toFixed(2);
    const w = (b.w * width).toFixed(2);
    const h = (b.depth * (height - 14)).toFixed(2);
    // --d staggers the one-time scan-in; --d2 staggers the slow ambient swell
    // (entry offset pre-baked so the CSS needs no calc()). Numeric
    // transform-origin in view-box units: Safari mishandles keyword origins
    // with fill-box on SVG elements, so never rely on them.
    const barStyle = `--d:${i * 14}ms;--d2:${i * 110 + 1400}ms;transform-origin:0px 4px`;
    parts.push(
      `<rect class="sounding__bar" style="${barStyle}" x="${x}" y="4" width="${w}" height="${h}" fill="${b.color}"/>`
    );
    if (b.tick) {
      parts.push(
        `<rect class="sounding__bar" style="${barStyle}" x="${x}" y="${(4 + Number(h)).toFixed(2)}" width="${w}" height="4" fill="${PALETTE.ink === b.color ? PALETTE.mango : PALETTE.ink}"/>`
      );
    }
  });

  // EMA overlay — exponentially smoothed depth line traced across the strip,
  // finished with an upward arrowhead at its last point.
  const alpha = 0.28;
  let ema = 0;
  const emaPts = bars.map((b, i) => {
    ema = i === 0 ? b.depth : alpha * b.depth + (1 - alpha) * ema;
    return { x: (b.x + b.w / 2) * width, y: 4 + ema * (height - 14) };
  });
  if (emaPts.length > 1) {
    const d = emaPts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");
    parts.push(
      `<path class="sounding__ema" pathLength="1" vector-effect="non-scaling-stroke" fill="none" d="M ${d}"/>`
    );
    const tip = emaPts[emaPts.length - 1];
    parts.push(
      `<path class="sounding__emahead" fill="currentColor" d="M ${tip.x.toFixed(1)} ${(tip.y - 16).toFixed(1)} L ${(tip.x - 9).toFixed(1)} ${(tip.y + 2).toFixed(1)} L ${(tip.x + 9).toFixed(1)} ${(tip.y + 2).toFixed(1)} Z"/>`
    );
  }

  // MACD-style momentum zone below the tape: fast/slow EMA divergence as a
  // histogram around a zero line, with the signal line swept in mango.
  if (macd && bars.length > 2) {
    const emaSeries = (arr, period) => {
      const a = 2 / (period + 1);
      let e = arr[0];
      return arr.map((v, i) => (e = i ? a * v + (1 - a) * e : v));
    };
    const depths = bars.map((b) => b.depth);
    const fast = emaSeries(depths, 4);
    const slow = emaSeries(depths, 9);
    const macdLine = fast.map((v, i) => v - slow[i]);
    const signal = emaSeries(macdLine, 3);
    const hist = macdLine.map((v, i) => v - signal[i]);

    const zero = height + 10 + (macdH - 10) / 2;
    const amp = Math.max(0.0001, ...hist.map(Math.abs), ...signal.map(Math.abs));
    const scale = (macdH - 18) / 2 / amp;

    parts.push(`<rect x="0" y="${height + 4}" width="${width}" height="2" fill="${PALETTE.monsoon}" opacity="0.55"/>`);
    parts.push(`<rect x="0" y="${(zero - 0.75).toFixed(2)}" width="${width}" height="1.5" fill="currentColor" opacity="0.3"/>`);

    bars.forEach((b, i) => {
      const h = Math.max(1, Math.abs(hist[i]) * scale);
      const up = hist[i] >= 0;
      const x = ((b.x + b.w * 0.2) * width).toFixed(2);
      const w = (b.w * 0.6 * width).toFixed(2);
      const y = (up ? zero - h : zero).toFixed(2);
      // Origin pinned to the zero line so histogram bars grow out of it.
      parts.push(
        `<rect class="sounding__macd" style="--dm:${i * 14 + 900}ms;transform-origin:0px ${zero.toFixed(2)}px" x="${x}" y="${y}" width="${w}" height="${h.toFixed(2)}" fill="${up ? PALETTE.tide : PALETTE.chili}"/>`
      );
    });

    const sd = bars
      .map((b, i) => `${((b.x + b.w / 2) * width).toFixed(1)} ${(zero - signal[i] * scale).toFixed(1)}`)
      .join(" L ");
    parts.push(
      `<path class="sounding__macdline" pathLength="1" vector-effect="non-scaling-stroke" fill="none" d="M ${sd}"/>`
    );
  }

  parts.push(`</svg>`);
  return parts.join("");
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Normalize a digest issue's deal amounts to 0..1 depths for the strip. */
function dealDepths(deals) {
  const amounts = (deals || []).map((d) => (typeof d.amount_usd === "number" ? d.amount_usd : 0));
  const max = Math.max(1, ...amounts);
  return amounts.map((a) => (a === 0 ? 0.2 : 0.25 + 0.75 * (a / max)));
}

module.exports = { PALETTE, soundingBars, soundingSVG, dealDepths, makeRng };
