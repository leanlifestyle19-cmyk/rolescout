// careersgov.mjs — merge Careers@Gov listings (via OpenGovSG mirror) into data/cluster-jobs.json
// Runs AFTER scraper.mjs in the same Action. Node 18+. No dependencies.
//
// Source: https://github.com/opengovsg/careersgovsg-jobs-data (refreshed continuously)
// URL patterns per platform documented in that repo's job-listings.instructions.md

import { readFileSync, writeFileSync } from 'node:fs';

const MIRROR = 'https://raw.githubusercontent.com/opengovsg/careersgovsg-jobs-data/main/data/job-listings.json';
const OUT = 'data/cluster-jobs.json';

// Target-level filter: SAD / AD / DD / Director / Head-of roles
const LEVEL_RE = /(senior assistant director|assistant director|deputy director|\bdirector\b|\bhead\b)/i;
const JD_CAP = 4000; // chars per job — keeps the committed file small

function stripHtml(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

function jobUrl(j) {
  if (j.platform === 'hrp') return `https://jobs.careers.gov.sg/jobs/hrp/${j.jobId}/${j.postingNo}`;
  if (j.platform === 'greenhouse') return `https://jobs.careers.gov.sg/jobs/greenhouse/${j.jobId}?gh_jid=${j.jobId}`;
  if (j.platform === 'workable') return `https://apply.workable.com/j/${j.postingNo}`;
  return '';
}

function fmtDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
}

const res = await fetch(MIRROR);
if (!res.ok) { console.error(`Careers@Gov mirror fetch failed: HTTP ${res.status} — keeping existing data`); process.exit(0); }
const all = await res.json();
console.log(`Careers@Gov mirror: ${all.length} live listings`);

const now = Date.now();
const picked = all.filter(j =>
  LEVEL_RE.test(j.jobTitle || '') &&
  (j.closingDate == null || j.closingDate > now)
);
console.log(`Target-level after filter: ${picked.length}`);

const govJobs = picked.map(j => {
  const posted = fmtDate(j.startDate);
  const jdBody = [stripHtml(j.jobDescription), stripHtml(j.jobResponsibilities), stripHtml(j.jobRequirements)]
    .filter(Boolean).join(' ');
  const jd = `${posted ? 'Posting Date: ' + posted + '. ' : ''}${j.closingDateText ? j.closingDateText + '. ' : ''}${jdBody}`.slice(0, JD_CAP);
  return {
    id: `gov-${j.platform}-${j.jobId}-${j.postingNo || 'x'}`,
    title: (j.jobTitle || '').trim(),
    inst: (j.agency || '').trim(),
    url: jobUrl(j),
    source: 'Careers@Gov',
    jd
  };
}).filter(j => j.url && j.title);

// merge: drop stale Careers@Gov entries (postings churn), keep cluster jobs, append fresh gov set
let data = { updated: new Date().toISOString().slice(0, 10), jobs: [] };
try { data = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { console.log('No existing cluster-jobs.json — creating fresh'); }
const clusterJobs = (data.jobs || []).filter(j => j.source !== 'Careers@Gov');
data.jobs = [...clusterJobs, ...govJobs];
data.updated = new Date().toISOString().slice(0, 10);
writeFileSync(OUT, JSON.stringify(data, null, 1));
console.log(`Wrote ${OUT}: ${clusterJobs.length} cluster + ${govJobs.length} Careers@Gov = ${data.jobs.length} total`);
