# RUNBOOK — publishing a weekly issue by hand

Target: **under 15 minutes**. You edit two files, commit, done. GitHub Actions
validates, builds, generates the social images, and deploys.

## Before you start (one-time)

- Know your issue number: ISO year + ISO week, e.g. `2026-28`.
  Quick check: <https://www.epochconverter.com/weeknumbers> — or just add 1 to
  last week's issue.
- You can do all of this in the browser on github.com (Add file → Create new
  file), or locally in any text editor.

## The 15-minute loop

### Minute 0–8 — File 1: the deals

Create `src/data/deals/2026-28.json` (copy last week's file as a starting
point). For each deal fill the 11 fields — schema and a full example live in
[CONTRIBUTING-DATA.md](CONTRIBUTING-DATA.md). The rules you'll actually trip on:

- `amount_usd` is a raw number (`6500000`), or `null` if undisclosed
- dates are `YYYY-MM-DD`
- `editorial_note` max 40 words — this is your voice, spend it well
- keep `"issue": "2026-28"` matching the filename

### Minute 8–13 — File 2: the editorial

Create `src/content/digest/2026-28.md` (again, copy last week's). Update the
front matter (`issue`, `title`, `date`, `summary`), delete or rewrite the
`hiring:` block (omit it entirely if nobody's hiring), then write 2–4 short
intro paragraphs in markdown.

### Minute 13–15 — Ship it

Working locally:

```bash
npm run validate        # catches every schema mistake before it ships
git add src/data/deals/2026-28.json src/content/digest/2026-28.md
git commit -m "Issue 2026-28"
git push
```

Working on github.com: just commit both files to `main` — the build runs the
same validation and **will refuse to deploy** bad data, so you can't break the
site with a typo. If the Actions run goes red, open it, read the validator's
message (it names the file and field), fix, recommit.

That's it. The deploy takes ~2 minutes. The new issue appears on the home
page, in the archive, in the RSS feed, and gets its own generated share image
— no other steps.

## Adding or editing an event (any time, 2 minutes)

Open `src/data/events.json`, add an object with the 12 fields (see
CONTRIBUTING-DATA.md), commit. Featured (paid) events: set
`"is_featured": true`. Past events archive themselves — never delete anything.

## When something looks wrong

- **Build failed?** Actions tab → open the red run → the validate step prints
  exactly which file and field is bad.
- **Event still showing after it ended?** The site rebuilds weekly on Monday;
  to hide it sooner, run the workflow manually (Actions → Run workflow).
- **Preview locally:** `npm install` once, then `npm start` and open
  <http://localhost:8080>.
