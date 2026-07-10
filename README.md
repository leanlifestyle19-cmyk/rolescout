# RoleScout SG

Personal job-matching PWA. Scores Singapore public-sector roles against a
transformation / BPR / change-management / Lean-Six-Sigma profile at
SAD / Head / Deputy Director / Director level.

## What it does
- **Matches** — auto-fetches the Careers@Gov feed (via OpenGovSG's public
  GitHub mirror, CORS-enabled, refreshed several times daily), filters to
  target seniority, scores % match, flags NEW roles since your last visit,
  shows closing dates.
- **Scan JD** — hospital clusters (SingHealth / NHG / NUHS), MOHH, A*STAR
  and most stat boards have no public feed, so paste any JD text and it is
  scored against the same profile model (match %, hit/missing competencies,
  level detection).
- **Sources** — directory of the portals worth checking weekly, with
  pre-built searches.
- **Tracker** — save roles (from Matches or Scan), track status
  Interested → Applied → Interview → Offer, stored locally in IndexedDB.

## Deploy (GitHub Pages)
1. New repo → upload `index.html`, `sw.js`, `manifest.json`, `icon-192.png`, `README.md`.
2. Settings → Pages → deploy from `main` branch root.
3. Open the Pages URL on your phone → Add to Home Screen.

## Deploy discipline (from master AAR)
- Bump `CACHE` in `sw.js` on **every** `index.html` change (date form: `rolescout-YYYYMMDD`).
- Upload `sw.js` and `index.html` together.
- If the feed URL/host ever changes, update the `BYPASS` list in `sw.js` in the same commit.

## Honest limits
- Only Careers@Gov can be auto-fetched from the browser (public CORS mirror).
  Cluster/A*STAR portals are SuccessFactors/Workday with no public API — use
  Scan JD for those.
- Match % is a keyword heuristic to rank and triage, not a verdict. Read the JD.


# RoleScout cluster scraper

Weekly GitHub Action that scrapes SingHealth's careers portal (Management & Admin
category, ~9 pages) into `data/cluster-jobs.json`, fetching full JD text only for
NEW roles at Assistant Director level and above. RoleScout (the PWA) fetches this
JSON from raw.githubusercontent.com — same pattern OpenGovSG uses for Careers@Gov.

## Setup (once)
1. Put `scraper.mjs`, `.github/workflows/scrape.yml`, this README in your RoleScout repo
   (or its own repo).
2. Run once locally to verify + seed: `node scraper.mjs` (Node 18+), commit `data/`.
3. Push. Actions tab → "Scrape cluster jobs" → Run workflow (manual test).
4. In RoleScout `index.html`, set:
   const CLUSTER_FEED = "https://raw.githubusercontent.com/<user>/<repo>/main/data/cluster-jobs.json";
   and bump the sw.js cache name.

## Notes
- Schedule is Mon & Thu 06:30 SGT; adjust the cron if you want.
- Be a good citizen: keep the 1.5s delays; this is light personal use of public pages,
  but respect the portal's terms and stop if asked.
- SuccessFactors markup is stable but not guaranteed; if a run logs "0 links",
  the parser regex needs a refresh — open an issue for future-you.
- To add NHG/NUHS later: append entries to SOURCES with their category URLs
  (same SuccessFactors platform, same URL shape).
# rolescout

