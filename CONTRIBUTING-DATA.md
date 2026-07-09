# Contributing data to LiquidSea

All site content lives in the repo as data files. This document is the contract:
any pull request that touches data — written by a human or by an automated
routine — must follow it exactly. `npm run validate` enforces every rule below
and the GitHub Actions build fails on violations.

## File layout & naming

| Content | Path | Naming rule |
| --- | --- | --- |
| Weekly deals | `src/data/deals/YYYY-WW.json` | ISO year + ISO week number, zero-padded (`2026-05.json`, `2026-27.json`) |
| Weekly editorial | `src/content/digest/YYYY-WW.md` | Must match its deals file 1:1 |
| Events calendar | `src/data/events.json` | Single file, top-level JSON array |

Every deals file **must** have a matching editorial markdown file and vice
versa — the validator rejects orphans.

## Deals file schema (`src/data/deals/YYYY-WW.json`)

Top level is an object:

```json
{
  "issue": "2026-27",
  "deals": [ { …deal objects… } ]
}
```

- `issue` (string, required) — must equal the filename without `.json`.
- `deals` (array, required) — at least one deal object.
- Optional: `"sample": true` marks seeded demo data. No other extra keys allowed.

### Deal object — all 11 fields required, no extras

| Field | Type | Rule |
| --- | --- | --- |
| `project_name` | string | Non-empty |
| `one_line_description` | string | Non-empty, one sentence |
| `category` | enum | One of `DeFi`, `Infra`, `Gaming`, `RWA`, `Payments`, `AI`, `Other` |
| `country_or_region` | string | Non-empty (`Singapore`, `Vietnam`, `Regional`, …) |
| `round_type` | enum | One of `Pre-seed`, `Seed`, `Series A`, `Strategic`, `Token`, `Undisclosed` |
| `amount_usd` | number \| null | Positive number in whole USD (`6500000`), or `null` if undisclosed |
| `lead_investors` | string[] | May be empty `[]`, entries non-empty |
| `other_investors` | string[] | May be empty `[]`, entries non-empty |
| `announced_date` | string | ISO-8601 date `YYYY-MM-DD`, must be a real calendar date |
| `source_url` | string | Valid `http(s)://` URL, required |
| `editorial_note` | string | 1–2 sentences, **max 40 words**, written in the editor's voice |

Example:

```json
{
  "project_name": "BarongPay",
  "one_line_description": "Stablecoin payroll rails for Indonesia's gig platforms.",
  "category": "Payments",
  "country_or_region": "Indonesia",
  "round_type": "Seed",
  "amount_usd": 6500000,
  "lead_investors": ["Selat Capital"],
  "other_investors": ["Krakatoa Ventures", "Nusantara Angels"],
  "announced_date": "2026-06-16",
  "source_url": "https://example.com/barongpay-seed",
  "editorial_note": "Payroll is the wedge everyone forgot — if BarongPay clears BI licensing, the gig-economy float alone is a business."
}
```

## Editorial file schema (`src/content/digest/YYYY-WW.md`)

YAML front matter + markdown body (the issue intro, 2–4 short paragraphs):

```markdown
---
issue: "2026-27"            # required, must match filename
title: "RWA gets real in Bangkok"   # required
date: "2026-07-03"          # required, ISO date the issue is published
summary: "One-sentence meta description used for SEO and social cards."  # required
hiring:                     # OPTIONAL — section renders only when present
  - company: "Jalan Finance"
    role: "Structured Finance Analyst, Jakarta"
    url: "https://example.com/jobs/jalan-analyst"
---
Intro paragraphs in markdown…
```

## Event object (`src/data/events.json`) — all 12 fields required, no extras

| Field | Type | Rule |
| --- | --- | --- |
| `event_name` | string | Non-empty |
| `city` | string | Non-empty |
| `country` | string | Non-empty |
| `venue` | string \| null | `null` if not announced |
| `start_date` | string | ISO-8601 `YYYY-MM-DD` |
| `end_date` | string | ISO-8601, `>= start_date`; single-day events repeat `start_date` |
| `type` | enum | One of `Conference`, `Meetup`, `Hackathon`, `Demo Day`, `Side Event` |
| `organizer` | string | Non-empty |
| `url` | string | Valid `http(s)://` URL |
| `is_featured` | boolean | `true` = paid featured slot, pinned top with featured styling |
| `one_line_pitch` | string | Non-empty, max 200 characters |
| `added_date` | string | ISO-8601 date the entry was added |

Events whose `end_date` has passed auto-hide from `/events/` at build time and
appear on `/events/archive/` instead. Nothing is ever deleted.

## Checklist for automated PRs

An automated PR is acceptable only if **all** of these hold:

- [ ] All JSON files parse (`npm run validate` exits 0)
- [ ] Filenames follow `YYYY-WW.json` (valid ISO week 01–53)
- [ ] Every deals file has its matching digest `.md`, and vice versa
- [ ] No duplicate deals: same `project_name` + `announced_date` must not
      appear twice anywhere in the repo
- [ ] No duplicate events: same `event_name` + `start_date`
- [ ] All dates are ISO-8601 (`YYYY-MM-DD`) and real calendar dates
- [ ] Every deal has a working `source_url` (https preferred)
- [ ] Every `editorial_note` is ≤ 40 words
- [ ] Enum fields use exact values listed above (case-sensitive)
- [ ] No fields beyond the schema (the validator is strict on purpose)

Run locally before opening the PR:

```bash
npm run validate
```
