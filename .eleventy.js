"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { soundingSVG, dealDepths } = require("./src/_lib/sounding.js");
const { pixelGlobeSVG, starfieldSVG } = require("./src/_lib/globe.js");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const COUNTRY_CODES = {
  Singapore: "SG",
  Thailand: "TH",
  Vietnam: "VN",
  Indonesia: "ID",
  Philippines: "PH",
  Malaysia: "MY",
};

function parseISO(d) {
  // Treat bare dates as UTC so builds are timezone-independent.
  return new Date(`${String(d).slice(0, 10)}T00:00:00Z`);
}

function niceDate(d) {
  const dt = parseISO(d);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

  /* ---------- Filters ---------- */

  // $6.5M / $800K / Undisclosed — the ticker read.
  eleventyConfig.addFilter("usd", (n) => {
    if (n === null || n === undefined) return "Undisclosed";
    const fmt = (v) => {
      const s = (Math.round(v * 10) / 10).toFixed(1);
      return s.endsWith(".0") ? s.slice(0, -2) : s;
    };
    if (n >= 1e9) return `$${fmt(n / 1e9)}B`;
    if (n >= 1e6) return `$${fmt(n / 1e6)}M`;
    if (n >= 1e3) return `$${fmt(n / 1e3)}K`;
    return `$${n}`;
  });

  eleventyConfig.addFilter("niceDate", niceDate);

  eleventyConfig.addFilter("dateRange", (start, end) => {
    if (!end || end === start) return niceDate(start);
    const s = parseISO(start);
    const e = parseISO(end);
    if (s.getUTCFullYear() === e.getUTCFullYear() && s.getUTCMonth() === e.getUTCMonth()) {
      return `${s.getUTCDate()}–${e.getUTCDate()} ${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
    }
    return `${niceDate(start)} – ${niceDate(end)}`;
  });

  eleventyConfig.addFilter("rfc3339", (d) => `${String(d).slice(0, 10)}T00:00:00Z`);

  // "2026-25" -> "2026 · W25"
  eleventyConfig.addFilter("weekLabel", (issue) => {
    const [year, week] = String(issue).split("-");
    return `${year} · W${week}`;
  });

  eleventyConfig.addFilter("cc", (country) => COUNTRY_CODES[country] || String(country).slice(0, 2).toUpperCase());

  eleventyConfig.addFilter("totalUsd", (deals) =>
    (deals || []).reduce((sum, d) => sum + (typeof d.amount_usd === "number" ? d.amount_usd : 0), 0)
  );

  eleventyConfig.addFilter("topDeals", (deals, n) =>
    [...(deals || [])]
      .sort((a, b) => (b.amount_usd || 0) - (a.amount_usd || 0))
      .slice(0, n)
  );

  eleventyConfig.addFilter("upcomingEvents", (events, nowISO) => {
    const now = parseISO(nowISO);
    return (events || [])
      .filter((e) => parseISO(e.end_date || e.start_date) >= now)
      .sort((a, b) => parseISO(a.start_date) - parseISO(b.start_date));
  });

  eleventyConfig.addFilter("pastEvents", (events, nowISO) => {
    const now = parseISO(nowISO);
    return (events || [])
      .filter((e) => parseISO(e.end_date || e.start_date) < now)
      .sort((a, b) => parseISO(b.start_date) - parseISO(a.start_date));
  });

  eleventyConfig.addFilter("featuredFirst", (events) => {
    const list = [...(events || [])];
    return [...list.filter((e) => e.is_featured), ...list.filter((e) => !e.is_featured)];
  });

  eleventyConfig.addFilter("jsonld", (obj) => JSON.stringify(obj, null, 0));

  // Content-hash for cache busting: assets keep stable names but every deploy
  // that changes them forces browsers past their cached copy.
  const hashCache = {};
  eleventyConfig.addFilter("assetHash", (srcPath) => {
    if (!hashCache[srcPath]) {
      hashCache[srcPath] = crypto.createHash("md5").update(fs.readFileSync(srcPath)).digest("hex").slice(0, 8);
    }
    return hashCache[srcPath];
  });

  eleventyConfig.addFilter("countryList", (deals) => {
    const seen = new Set();
    (deals || []).forEach((d) => seen.add(COUNTRY_CODES[d.country_or_region] || d.country_or_region));
    return [...seen].join(" ");
  });

  /* ---------- Shortcodes ---------- */

  // Generic decorative strip: {% sounding "seed-string", 120, 60 %}
  eleventyConfig.addShortcode("sounding", (seed, height = 120, columns = 60, animate = false) =>
    soundingSVG({ seed, height, columns, animate })
  );

  // Pixelated rotating world map (hero decoration). Pass a suffix when the
  // globe appears more than once on a page so SVG ids stay unique.
  eleventyConfig.addShortcode("pixelGlobe", (idSuffix = "") => pixelGlobeSVG({ idSuffix }));

  // Pixel starfield (hero background decoration).
  eleventyConfig.addShortcode("starfield", () => starfieldSVG());

  // Issue header strip — bars encode the week's deal sizes.
  eleventyConfig.addShortcode("issueSounding", (issue, deals, height = 160, animate = false, macd = false) =>
    soundingSVG({
      seed: `issue-${issue}`,
      values: dealDepths(deals),
      height,
      columns: Math.max(48, (deals || []).length * 8),
      animate,
      macd,
      label: `Generative sounding chart for issue ${issue}: one highlighted column per deal, depth scaled to round size${macd ? ", with a MACD-style momentum histogram below" : ""}.`,
    })
  );

  // JSON-LD: Article for digest issues.
  eleventyConfig.addShortcode("jsonldArticle", (siteUrl, siteName, pageUrl, title, summary, date, issue) => {
    const obj = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: summary,
      datePublished: `${String(date).slice(0, 10)}T00:00:00Z`,
      url: `${siteUrl}${pageUrl}`,
      image: [`${siteUrl}/assets/og/${issue}.png`],
      author: { "@type": "Organization", name: siteName, url: siteUrl },
      publisher: { "@type": "Organization", name: siteName, url: siteUrl },
    };
    return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
  });

  // JSON-LD: Event list for the calendar page (rich-results eligible).
  eleventyConfig.addShortcode("jsonldEvents", (siteUrl, events) => {
    const list = (events || []).map((e) => ({
      "@context": "https://schema.org",
      "@type": "Event",
      name: e.event_name,
      startDate: e.start_date,
      endDate: e.end_date || e.start_date,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: e.venue || e.city,
        address: { "@type": "PostalAddress", addressLocality: e.city, addressCountry: e.country },
      },
      description: e.one_line_pitch,
      organizer: { "@type": "Organization", name: e.organizer },
      url: e.url,
    }));
    return `<script type="application/ld+json">${JSON.stringify(list)}</script>`;
  });

  /* ---------- Collections ---------- */

  eleventyConfig.addCollection("digest", (api) =>
    api
      .getFilteredByGlob("src/content/digest/*.md")
      .sort((a, b) => String(b.data.issue).localeCompare(String(a.data.issue)))
  );

  return {
    // GITHUB_PAGES_PROJECT_URL=1 builds for the free workarounds81.github.io/liquidsea/
    // address (no custom domain yet). Once liquidsea.net DNS is live, build without it
    // so every internal link is root-relative again — see DEPLOY.md.
    pathPrefix: process.env.GITHUB_PAGES_PROJECT_URL ? "/liquidsea/" : "/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
