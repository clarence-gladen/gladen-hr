#!/usr/bin/env node
/**
 * WEBSITE HEALTH ALARM  —  gladen.com.sg
 *
 * Catches the class of failure that has twice gone undetected for weeks:
 *   · Aug 2026: sitemap_index.xml returned 404 for 3 weeks. Google saw no new
 *     content at all. Nobody noticed until an audit.
 *   · Aug 2026: the office-cleaning quote landing page carried <meta robots
 *     noindex> and could never rank. Undetected for months.
 *
 * Both would have been caught within a week by the checks below.
 *
 * Run:  node scripts/check-site-health.mjs
 * Exits 1 if anything FAILS, so a scheduled CI run turns a silent website
 * problem into an email. Warnings are advisory and do not fail the run.
 */

const SITE = process.env.SITE_URL || "https://gladen.com.sg";
const UA = "GladenHealthCheck/1.0 (+https://gladen.com.sg)";

/** Business-critical pages. If any of these stops being indexable, leads stop. */
const CRITICAL_PAGES = [
  "/",
  "/office-contract-cleaning-quote/",
  "/commercial-office-cleaning/",
  "/commercial-industry-cleaning/",
  "/commercial-facility-management/",
  "/commercial-nea-approved/",
  "/about/",
  "/contact-us/",
  "/insight/",
];

/** Sitemap should never shrink below roughly what we know is published. */
const MIN_POSTS_IN_SITEMAP = 15;

const failures = [];
const warnings = [];
const passes = [];

const fail = (m) => failures.push(m);
const warn = (m) => warnings.push(m);
const pass = (m) => passes.push(m);

async function get(path) {
  const p = String(path);
  const url = p.startsWith("http") ? p : SITE + p;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body, finalUrl: res.url };
  } catch (e) {
    return { ok: false, status: 0, body: "", finalUrl: url, error: e.message };
  }
}

// ── 1. robots.txt ────────────────────────────────────────────────────────────
async function checkRobots() {
  const r = await get("/robots.txt");
  if (!r.ok) {
    fail(`robots.txt returned HTTP ${r.status} (expected 200)`);
    return null;
  }

  if (/^\s*Disallow:\s*\/\s*$/im.test(r.body)) {
    fail("robots.txt contains a blanket 'Disallow: /' — the whole site is blocked from Google");
  }
  const sitemapLine = r.body.match(/^\s*Sitemap:\s*(\S+)/im);
  if (!sitemapLine) {
    fail("robots.txt does not declare a Sitemap: line");
  } else {
    pass(`robots.txt OK, points to ${sitemapLine[1]}`);
    return sitemapLine[1];
  }
  return null;
}

// ── 2. Sitemaps ──────────────────────────────────────────────────────────────
async function checkSitemaps(declaredSitemap) {
  const indexUrl = declaredSitemap || SITE + "/sitemap_index.xml";
  const idx = await get(indexUrl);

  if (!idx.ok) {
    fail(
      `Sitemap index returned HTTP ${idx.status} at ${indexUrl} — ` +
        `Google cannot discover new pages. (This is the Aug 2026 failure.)`
    );
    return;
  }
  if (!idx.body.includes("<sitemapindex") && !idx.body.includes("<urlset")) {
    fail(
      `Sitemap index at ${indexUrl} returned HTTP 200 but is not XML — ` +
        `likely a WordPress "page not found" page rendering with a 200.`
    );
    return;
  }

  const children = [...idx.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (children.length === 0) {
    fail("Sitemap index contains no child sitemaps");
    return;
  }
  pass(`Sitemap index OK (${children.length} child sitemaps)`);

  for (const child of children) {
    const c = await get(child);
    const name = child.replace(SITE, "");
    if (!c.ok) {
      fail(`Child sitemap ${name} returned HTTP ${c.status}`);
      continue;
    }
    const urls = [...c.body.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
    if (urls === 0) {
      warn(`Child sitemap ${name} is empty`);
    } else if (name.includes("post-sitemap") && urls < MIN_POSTS_IN_SITEMAP) {
      fail(
        `post-sitemap.xml lists only ${urls} URLs (expected at least ${MIN_POSTS_IN_SITEMAP}) — ` +
          `posts may have been unpublished or the sitemap is regenerating incorrectly`
      );
    } else {
      pass(`Child sitemap ${name} OK (${urls} URLs)`);
    }
  }
}

// ── 3. Critical pages: reachable AND indexable ───────────────────────────────
async function checkCriticalPages() {
  for (const path of CRITICAL_PAGES) {
    const r = await get(path);

    if (!r.ok) {
      fail(`${path} returned HTTP ${r.status}`);
      continue;
    }

    const robotsMeta = r.body.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i);
    const content = robotsMeta ? robotsMeta[1].toLowerCase() : "";

    if (content.includes("noindex")) {
      fail(
        `${path} is set to NOINDEX — it cannot appear in Google. ` +
          `(This is the Aug 2026 quote-page failure.) Check Rank Math → Advanced → Robots Meta.`
      );
      continue;
    }

    if (!/<link[^>]+rel=["']canonical["']/i.test(r.body)) {
      warn(`${path} has no canonical tag`);
    }

    const redirected = new URL(r.finalUrl).pathname !== path;
    if (redirected) warn(`${path} redirected to ${new URL(r.finalUrl).pathname}`);

    pass(`${path} OK (200, indexable)`);
  }
}

// ── 4. Advisory: statutory rates approaching expiry ──────────────────────────
// Advisory only — the hard failure lives in the test suite (rate-freshness.test.ts).
// This gives lead time to research new figures before January arrives.
async function checkRateLeadTime() {
  try {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = "supabase/migrations";
    let newest = null;
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
      const sql = readFileSync(join(dir, f), "utf8");
      for (const s of sql.matchAll(/insert\s+into\s+cpf_rates\b[\s\S]*?;/gi))
        for (const d of s[0].matchAll(/'(\d{4}-\d{2}-\d{2})'/g))
          if (!newest || d[1] > newest) newest = d[1];
    }
    if (!newest) {
      warn("Could not read CPF rate effective dates from migrations");
      return;
    }

    const now = new Date();
    const newestYear = Number(newest.slice(0, 4));
    if (newestYear < now.getFullYear()) {
      fail(`CPF rates are STALE — newest set is ${newest}, it is now ${now.getFullYear()}`);
    } else if (now.getMonth() >= 9 && newestYear === now.getFullYear()) {
      // From October, flag that next year's rates are not in yet.
      warn(
        `CPF rates expire on 1 Jan ${now.getFullYear() + 1} and next year's set is not seeded yet. ` +
          `Check cpf.gov.sg for the new tables and add a migration before January payroll.`
      );
    } else {
      pass(`CPF rates current (effective ${newest})`);
    }
  } catch {
    // Running outside the repo — skip silently.
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────
console.log(`\nWebsite health check — ${SITE}`);
console.log(`${new Date().toISOString()}\n`);

const declared = await checkRobots();
await checkSitemaps(declared);
await checkCriticalPages();
await checkRateLeadTime();

for (const p of passes) console.log(`  ok    ${p}`);
if (warnings.length) {
  console.log("");
  for (const w of warnings) console.log(`  warn  ${w}`);
}
if (failures.length) {
  console.log("");
  for (const f of failures) console.log(`  FAIL  ${f}`);
}

console.log(
  `\n${passes.length} passed · ${warnings.length} warning(s) · ${failures.length} failure(s)\n`
);

if (failures.length) {
  console.error("Website health check FAILED — see failures above.");
  process.exit(1);
}
console.log("All critical checks passed.");
