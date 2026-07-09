# LiquidSea — liquidsea.net

Curated SEA investment deal-flow digest and events calendar. A weekly
editorial digest of disclosed private-market fundraises across Singapore,
Thailand, Vietnam, Indonesia, the Philippines and Malaysia, plus a living
calendar of regional investment and tech events.

Built with [Eleventy](https://www.11ty.dev/) (Nunjucks templates), deployed to
GitHub Pages by GitHub Actions. No database, no backend — all content lives in
this repo as data files.

## Quick start

```bash
npm install
npm start          # dev server at http://localhost:8080
npm run validate   # lint all data files against the schemas
npm run build      # validate + build site + generate OG images into _site/
```

## Where things live

| What | Where |
| --- | --- |
| Weekly deal data | `src/data/deals/YYYY-WW.json` |
| Weekly editorial | `src/content/digest/YYYY-WW.md` |
| Events calendar | `src/data/events.json` |
| Site name/domain/email + **Web3Forms key** | `src/data/site.json` |
| Templates | `src/_includes/` |
| Generative "sounding strip" system | `src/_lib/sounding.js` |
| Styles (single file) | `src/assets/css/main.css` |
| Self-hosted fonts (OFL-licensed, committed) | `src/assets/fonts/` |
| Sponsor logos (when they exist) | `src/assets/sponsors/` |
| Data validator (CI safety net) | `scripts/validate-data.js` |
| OG/social image generator | `scripts/generate-og.js` |
| Deploy workflow | `.github/workflows/deploy.yml` |

## The three documents that matter

- **[RUNBOOK.md](RUNBOOK.md)** — how to publish a weekly issue by hand in
  under 15 minutes.
- **[CONTRIBUTING-DATA.md](CONTRIBUTING-DATA.md)** — the strict data schemas;
  the contract for human edits and future automated PRs alike.
- **[DEPLOY.md](DEPLOY.md)** — one-time setup: GitHub Pages, DNS records for
  liquidsea.net, ImprovMX email forwarding, Web3Forms key.

## Scope

The editorial digest covers only deals that have **already closed and been
publicly disclosed**, at companies headquartered in the six markets above,
any sector. It does not cover live/in-progress fundraises, confidential
placement materials, or deals the editor is personally involved in raising —
see "What doesn't belong here" in CONTRIBUTING-DATA.md. Disclosed personal
deal involvement (e.g. syndicating access to a private round) belongs on
`/opportunities/`, kept clearly separate from the independent tape.
