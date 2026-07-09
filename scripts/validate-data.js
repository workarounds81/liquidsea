#!/usr/bin/env node
"use strict";

/**
 * LiquidSea data validator — zero dependencies.
 *
 * Lints every data file against the schemas documented in CONTRIBUTING-DATA.md
 * and exits non-zero on any violation, failing the GitHub Actions build.
 * This is the safety net for hand edits AND future automated PRs.
 *
 * Checks: valid JSON, exact fields (no extras, no missing), enum values,
 * ISO-8601 dates, https source URLs, editorial notes <= 40 words,
 * no duplicate deals across all issues, deal file <-> digest markdown pairing.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEALS_DIR = path.join(ROOT, "src", "data", "deals");
const EVENTS_FILE = path.join(ROOT, "src", "data", "events.json");
const DIGEST_DIR = path.join(ROOT, "src", "content", "digest");

const CATEGORIES = ["DeFi", "Infra", "Gaming", "RWA", "Payments", "AI", "Other"];
const ROUND_TYPES = ["Pre-seed", "Seed", "Series A", "Strategic", "Token", "Undisclosed"];
const EVENT_TYPES = ["Conference", "Meetup", "Hackathon", "Demo Day", "Side Event"];

const DEAL_FIELDS = [
  "project_name", "one_line_description", "category", "country_or_region",
  "round_type", "amount_usd", "lead_investors", "other_investors",
  "announced_date", "source_url", "editorial_note",
];
const EVENT_FIELDS = [
  "event_name", "city", "country", "venue", "start_date", "end_date",
  "type", "organizer", "url", "is_featured", "one_line_pitch", "added_date",
];
const OPTIONAL_FIELDS = ["sample"]; // marks seeded demo data

const errors = [];
function fail(file, msg) {
  errors.push(`  ✗ ${path.relative(ROOT, file)} — ${msg}`);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isISODate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
function isHttpUrl(v) {
  return typeof v === "string" && /^https?:\/\/\S+$/.test(v);
}
function wordCount(s) {
  return String(s).trim().split(/\s+/).filter(Boolean).length;
}
function isStringArray(v) {
  return Array.isArray(v) && v.every(isNonEmptyString);
}
function checkExactFields(file, obj, allowed, label) {
  for (const key of allowed) {
    if (!(key in obj)) fail(file, `${label}: missing field "${key}"`);
  }
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key) && !OPTIONAL_FIELDS.includes(key)) {
      fail(file, `${label}: unknown field "${key}" (schema is strict — see CONTRIBUTING-DATA.md)`);
    }
  }
}

/* ---------- Deals ---------- */
const seenDeals = new Map(); // normalized name+date -> file
const dealIssues = new Set();

if (!fs.existsSync(DEALS_DIR)) {
  fail(DEALS_DIR, "deals directory missing");
} else {
  for (const fname of fs.readdirSync(DEALS_DIR).sort()) {
    const file = path.join(DEALS_DIR, fname);
    if (!/^\d{4}-(0[1-9]|[1-4]\d|5[0-3])\.json$/.test(fname)) {
      fail(file, `filename must be YYYY-WW.json (ISO week), got "${fname}"`);
      continue;
    }
    const issue = fname.replace(/\.json$/, "");
    dealIssues.add(issue);

    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      fail(file, `invalid JSON: ${e.message}`);
      continue;
    }
    if (typeof data !== "object" || Array.isArray(data)) {
      fail(file, "top level must be an object { issue, deals }");
      continue;
    }
    if (data.issue !== issue) fail(file, `"issue" (${data.issue}) must match filename (${issue})`);
    if (!Array.isArray(data.deals) || data.deals.length === 0) {
      fail(file, `"deals" must be a non-empty array`);
      continue;
    }

    data.deals.forEach((deal, i) => {
      const label = `deal[${i}] (${deal && deal.project_name ? deal.project_name : "?"})`;
      if (typeof deal !== "object" || deal === null) return fail(file, `${label}: not an object`);
      checkExactFields(file, deal, DEAL_FIELDS, label);

      if (!isNonEmptyString(deal.project_name)) fail(file, `${label}: project_name must be a non-empty string`);
      if (!isNonEmptyString(deal.one_line_description)) fail(file, `${label}: one_line_description must be a non-empty string`);
      if (!CATEGORIES.includes(deal.category)) fail(file, `${label}: category "${deal.category}" not in ${CATEGORIES.join("/")}`);
      if (!isNonEmptyString(deal.country_or_region)) fail(file, `${label}: country_or_region must be a non-empty string`);
      if (!ROUND_TYPES.includes(deal.round_type)) fail(file, `${label}: round_type "${deal.round_type}" not in ${ROUND_TYPES.join("/")}`);
      if (!(deal.amount_usd === null || (typeof deal.amount_usd === "number" && deal.amount_usd > 0))) {
        fail(file, `${label}: amount_usd must be a positive number or null`);
      }
      if (!isStringArray(deal.lead_investors)) fail(file, `${label}: lead_investors must be an array of strings (may be empty)`);
      if (!isStringArray(deal.other_investors)) fail(file, `${label}: other_investors must be an array of strings (may be empty)`);
      if (!isISODate(deal.announced_date)) fail(file, `${label}: announced_date must be a valid ISO-8601 date (YYYY-MM-DD)`);
      if (!isHttpUrl(deal.source_url)) fail(file, `${label}: source_url must be a valid http(s) URL`);
      if (!isNonEmptyString(deal.editorial_note)) {
        fail(file, `${label}: editorial_note must be a non-empty string`);
      } else if (wordCount(deal.editorial_note) > 40) {
        fail(file, `${label}: editorial_note is ${wordCount(deal.editorial_note)} words (max 40)`);
      }

      // Duplicate detection, within and across issues.
      if (isNonEmptyString(deal.project_name) && isISODate(deal.announced_date)) {
        const key = `${deal.project_name.trim().toLowerCase()}|${deal.announced_date}`;
        if (seenDeals.has(key)) {
          fail(file, `${label}: duplicate of deal already in ${seenDeals.get(key)}`);
        } else {
          seenDeals.set(key, path.relative(ROOT, file));
        }
      }
    });
  }
}

/* ---------- Deal file <-> digest markdown pairing ---------- */
const digestIssues = new Set(
  fs.existsSync(DIGEST_DIR)
    ? fs.readdirSync(DIGEST_DIR).filter((f) => /^\d{4}-\d{2}\.md$/.test(f)).map((f) => f.replace(/\.md$/, ""))
    : []
);
for (const issue of dealIssues) {
  if (!digestIssues.has(issue)) {
    fail(path.join(DEALS_DIR, `${issue}.json`), `no matching editorial file src/content/digest/${issue}.md`);
  }
}
for (const issue of digestIssues) {
  if (!dealIssues.has(issue)) {
    fail(path.join(DIGEST_DIR, `${issue}.md`), `no matching deals file src/data/deals/${issue}.json`);
  }
}
// Light front-matter sanity check on each digest markdown file.
for (const issue of digestIssues) {
  const file = path.join(DIGEST_DIR, `${issue}.md`);
  const text = fs.readFileSync(file, "utf8");
  if (!/^---\n[\s\S]*?\n---/.test(text)) fail(file, "missing YAML front matter block");
  if (!new RegExp(`issue:\\s*["']?${issue}["']?`).test(text)) fail(file, `front matter "issue" must be "${issue}"`);
  for (const key of ["title:", "date:", "summary:"]) {
    if (!text.includes(key)) fail(file, `front matter missing "${key.slice(0, -1)}"`);
  }
}

/* ---------- Events ---------- */
if (!fs.existsSync(EVENTS_FILE)) {
  fail(EVENTS_FILE, "events.json missing");
} else {
  let events;
  try {
    events = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
  } catch (e) {
    fail(EVENTS_FILE, `invalid JSON: ${e.message}`);
    events = null;
  }
  if (events && !Array.isArray(events)) {
    fail(EVENTS_FILE, "top level must be an array of event objects");
  } else if (events) {
    const seenEvents = new Set();
    events.forEach((ev, i) => {
      const label = `event[${i}] (${ev && ev.event_name ? ev.event_name : "?"})`;
      if (typeof ev !== "object" || ev === null) return fail(EVENTS_FILE, `${label}: not an object`);
      checkExactFields(EVENTS_FILE, ev, EVENT_FIELDS, label);

      if (!isNonEmptyString(ev.event_name)) fail(EVENTS_FILE, `${label}: event_name must be a non-empty string`);
      if (!isNonEmptyString(ev.city)) fail(EVENTS_FILE, `${label}: city must be a non-empty string`);
      if (!isNonEmptyString(ev.country)) fail(EVENTS_FILE, `${label}: country must be a non-empty string`);
      if (!(ev.venue === null || isNonEmptyString(ev.venue))) fail(EVENTS_FILE, `${label}: venue must be a string or null`);
      if (!isISODate(ev.start_date)) fail(EVENTS_FILE, `${label}: start_date must be ISO-8601 (YYYY-MM-DD)`);
      if (!isISODate(ev.end_date)) fail(EVENTS_FILE, `${label}: end_date must be ISO-8601 (YYYY-MM-DD)`);
      if (isISODate(ev.start_date) && isISODate(ev.end_date) && ev.end_date < ev.start_date) {
        fail(EVENTS_FILE, `${label}: end_date is before start_date`);
      }
      if (!EVENT_TYPES.includes(ev.type)) fail(EVENTS_FILE, `${label}: type "${ev.type}" not in ${EVENT_TYPES.join("/")}`);
      if (!isNonEmptyString(ev.organizer)) fail(EVENTS_FILE, `${label}: organizer must be a non-empty string`);
      if (!isHttpUrl(ev.url)) fail(EVENTS_FILE, `${label}: url must be a valid http(s) URL`);
      if (typeof ev.is_featured !== "boolean") fail(EVENTS_FILE, `${label}: is_featured must be true or false`);
      if (!isNonEmptyString(ev.one_line_pitch)) {
        fail(EVENTS_FILE, `${label}: one_line_pitch must be a non-empty string`);
      } else if (ev.one_line_pitch.length > 200) {
        fail(EVENTS_FILE, `${label}: one_line_pitch is ${ev.one_line_pitch.length} chars (max 200)`);
      }
      if (!isISODate(ev.added_date)) fail(EVENTS_FILE, `${label}: added_date must be ISO-8601 (YYYY-MM-DD)`);

      if (isNonEmptyString(ev.event_name) && isISODate(ev.start_date)) {
        const key = `${ev.event_name.trim().toLowerCase()}|${ev.start_date}`;
        if (seenEvents.has(key)) fail(EVENTS_FILE, `${label}: duplicate event (same name + start_date)`);
        seenEvents.add(key);
      }
    });
  }
}

/* ---------- Report ---------- */
if (errors.length) {
  console.error(`\nDATA VALIDATION FAILED — ${errors.length} problem(s):\n`);
  console.error(errors.join("\n"));
  console.error("\nSchemas are documented in CONTRIBUTING-DATA.md.\n");
  process.exit(1);
} else {
  console.log(`✓ Data valid: ${dealIssues.size} digest issue(s), events.json OK, no duplicates.`);
}
