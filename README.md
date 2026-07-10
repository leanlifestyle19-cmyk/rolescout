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