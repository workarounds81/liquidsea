"use strict";

/**
 * Pixel globe — a deterministic, build-time SVG of a pixelated world map
 * panning behind a circular mask, which reads as a slowly rotating globe.
 * Land is drawn from coarse lat/lon boxes rasterized to a 6° grid, so the
 * whole thing compiles to three compact <path> elements (tide land, mango
 * Southeast Asia, chili Singapore) duplicated with <use> for a seamless loop.
 * Rotation itself is CSS (`.globe__spin`), so reduced-motion can freeze it.
 */

const { PALETTE, makeRng } = require("./sounding.js");

// Rough continent boxes: [lonMin, lonMax, latMin, latMax]. Chunky on purpose —
// at 6° pixels nobody needs coastlines, they need a recognizable silhouette.
const LAND = [
  // North America
  [-168, -140, 55, 71], [-140, -95, 48, 70], [-95, -60, 45, 62],
  [-125, -70, 30, 49], [-115, -95, 15, 30], [-92, -82, 8, 16],
  [-72, -60, 66, 78],
  // Greenland
  [-52, -22, 60, 82],
  // South America
  [-80, -50, -5, 10], [-75, -40, -20, -5], [-72, -55, -40, -20], [-72, -64, -55, -40],
  // Europe
  [-9, 2, 36, 44], [-5, 25, 44, 55], [5, 30, 55, 65], [10, 40, 65, 71],
  [-10, -1, 50, 59], [25, 60, 45, 70],
  // Africa
  [-17, 35, 20, 36], [-15, 15, 4, 20], [15, 42, 4, 20],
  [10, 40, -12, 4], [15, 35, -35, -12], [43, 50, -26, -12],
  // Asia
  [60, 180, 50, 77], [46, 60, 38, 52], [60, 120, 35, 50],
  [100, 135, 20, 42], [80, 100, 25, 35], [35, 60, 12, 42],
  [68, 90, 8, 32], [90, 110, 10, 28],
  // Maritime Southeast Asia
  [95, 106, -6, 6], [105, 116, -9, -5], [109, 119, -4, 7],
  [119, 141, -10, 2], [141, 151, -10, -2], [117, 127, 5, 19],
  // Japan
  [128, 146, 31, 46],
  // Australia / New Zealand
  [113, 154, -39, -11], [166, 179, -47, -34],
];

const SEA_BOX = [92, 142, -11, 23]; // the six LiquidSea markets, roughly
const SG_BOX = [102, 108, -2, 4];   // Singapore gets the chili pixel

function isLand(lon, lat) {
  return LAND.some((b) => lon >= b[0] && lon < b[1] && lat >= b[2] && lat < b[3]);
}
function inBox(box, lon, lat) {
  return lon >= box[0] && lon < box[1] && lat >= box[2] && lat < box[3];
}

function pixelGlobeSVG({ idSuffix = "" } = {}) {
  const cellDeg = 6;                 // degrees per pixel-cell
  const px = 6;                      // SVG units per cell
  const cols = 360 / cellDeg;        // 60
  const rows = 180 / cellDeg;        // 30
  const mapW = cols * px;            // 360
  const size = rows * px;            // 180 — globe diameter
  const dot = px - 1.4;              // gap between pixels

  const paths = { land: [], sea: [], sg: [] };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const lon = -180 + col * cellDeg + cellDeg / 2;
      const lat = 90 - row * cellDeg - cellDeg / 2;
      if (!isLand(lon, lat)) continue;
      const key = inBox(SG_BOX, lon, lat) ? "sg" : inBox(SEA_BOX, lon, lat) ? "sea" : "land";
      paths[key].push(`M${col * px} ${row * px}h${dot}v${dot}h-${dot}z`);
    }
  }

  // Unique ids per instance — the globe can appear more than once per page.
  const mapId = `worldmap${idSuffix}`;
  const clipId = `globeclip${idSuffix}`;
  return [
    `<svg class="globe" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">`,
    `<defs><g id="${mapId}">`,
    `<path fill="${PALETTE.tide}" d="${paths.land.join("")}"/>`,
    `<path fill="${PALETTE.mango}" d="${paths.sea.join("")}"/>`,
    `<path fill="${PALETTE.chili}" d="${paths.sg.join("")}"/>`,
    `</g><clipPath id="${clipId}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}"/></clipPath></defs>`,
    `<g clip-path="url(#${clipId})"><g class="globe__spin">`,
    `<use href="#${mapId}"/><use href="#${mapId}" x="${mapW}"/>`,
    `</g></g>`,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="none" stroke="${PALETTE.monsoon}" stroke-width="1.5"/>`,
    `</svg>`,
  ].join("");
}

/**
 * Pixel starfield — deterministic square "stars" in three parallax layers.
 * Each layer drifts and twinkles via CSS; the far layer is slightly blurred.
 * Rendered absolutely behind the hero, so it costs no layout and no JS.
 */
function starfieldSVG({ seed = "liquidsea-stars", count = 66, width = 1440, height = 760 } = {}) {
  const rng = makeRng(seed);
  const layers = [[], [], []];
  for (let i = 0; i < count; i++) {
    const x = (rng() * width).toFixed(0);
    const y = (rng() * height).toFixed(0);
    const s = (1.6 + rng() * 2.8).toFixed(1);
    const roll = rng();
    const color = roll < 0.72 ? PALETTE.foam : roll < 0.92 ? PALETTE.tide : PALETTE.mango;
    const o = (0.18 + rng() * 0.5).toFixed(2);
    layers[i % 3].push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${color}" opacity="${o}"/>`);
  }
  return [
    `<svg class="stars" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">`,
    `<g class="stars__layer stars__layer--1">${layers[0].join("")}</g>`,
    `<g class="stars__layer stars__layer--2">${layers[1].join("")}</g>`,
    `<g class="stars__layer stars__layer--3">${layers[2].join("")}</g>`,
    `</svg>`,
  ].join("");
}

module.exports = { pixelGlobeSVG, starfieldSVG };
