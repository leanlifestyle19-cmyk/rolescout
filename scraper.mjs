#!/usr/bin/env node
// RoleScout cluster scraper — SingHealth (SuccessFactors) → data/cluster-jobs.json
// No dependencies. Run: node scraper.mjs
// Polite: ~9 listing pages + detail pages ONLY for new target-level jobs, 1.5s apart.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

const SOURCES = [
  { name: "SingHealth", base: "https://careers.singhealth.com.sg",
    category: "/go/SingHealth-Management-Admin/647544", pageSize: 25, pages: 9 },
  { name: "NHG", base: "https://careers.nhghealth.com.sg",
    category: "/go/Corporate-Functions/732644", pageSize: 25, pages: 8 },
  { name: "NUHS", base: "https://www.nuhscareers.edu.sg",
    category: "/go/Administration/566044", pageSize: 25, pages: 10 },
  { name: "A*STAR", base: "https://careers.a-star.edu.sg",
    category: "/go/Corporate-Careers/748144", pageSize: 25, pages: 8 },
];

// Only fetch detail JDs for titles at/near the target band:
const LEVEL_RE = /(senior assistant director|assistant director|deputy director|\bdirector\b|\bhead\b|\bchief\b)/i;

const OUT = "data/cluster-jobs.json";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "RoleScout-personal/1.0 (weekly personal job alert)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return await res.text();
}

// Parse SuccessFactors listing HTML: anchors like /(INST)/job/SLUG/12345/ (title = anchor text)
function parseListing(html, base) {
  const jobs = new Map();
  const re = /href="(?:https?:\/\/[^"\/]+)?\/?([A-Za-z]+)?\/?job\/([^"]+?)\/(\d+)\/?"[^>]*>([^<]{4,})</g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const inst = (m[1] || "").toUpperCase();
    const id = m[3];
    const title = m[4].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
    if (!title || /^(«|»|\d+)$/.test(title)) continue;
    const url = `${base}/${inst ? inst + "/" : ""}job/${m[2]}/${id}/`;
    if (!jobs.has(id)) jobs.set(id, { id, title, inst, url });
  }
  return [...jobs.values()];
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
}

async function main() {
  mkdirSync("data", { recursive: true });
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { jobs: [] };
  const prevById = new Map(prev.jobs.map(j => [j.id, j]));

  const all = [];
  for (const src of SOURCES) {
    for (let p = 0; p < src.pages; p++) {
      const url = `${src.base}${src.category}/${p === 0 ? "" : p * src.pageSize + "/"}`;
      try {
        const html = await get(url);
        const batch = parseListing(html, src.base);
        console.log(`${src.name} page ${p + 1}: ${batch.length} links`);
        if (!batch.length && p > 0) break;                 // ran past last page
        for (const j of batch) all.push({ ...j, source: src.name });
      } catch (e) { console.error(`listing fail ${url}: ${e.message}`); }
      await sleep(1500);
    }
  }

  // Dedupe across pages
  const byId = new Map();
  for (const j of all) if (!byId.has(j.id)) byId.set(j.id, j);
  const jobs = [...byId.values()];
  console.log(`Total unique listings: ${jobs.length}`);

  // Detail-fetch JDs only for NEW target-level jobs (reuse old JD text otherwise)
  let fetched = 0;
  for (const j of jobs) {
    const old = prevById.get(j.id);
    if (old && old.jd) { j.jd = old.jd; continue; }
    if (!LEVEL_RE.test(j.title)) { j.jd = ""; continue; }
    try {
      const html = await get(j.url);
      j.jd = stripTags(html).slice(0, 12000);
      fetched++;
      await sleep(1500);
    } catch (e) { j.jd = ""; console.error(`detail fail ${j.url}: ${e.message}`); }
  }
  console.log(`Detail pages fetched (new target-level): ${fetched}`);

  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), jobs }, null, 1));
  console.log(`Wrote ${OUT}`);
}
main().catch(e => { console.error(e); process.exit(1); });
