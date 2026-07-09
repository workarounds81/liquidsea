"use strict";

module.exports = {
  layout: "layouts/digest.njk",
  tags: ["digest"],
  permalink: (data) => `/digest/${data.issue}/index.html`,
  eleventyComputed: {
    // The week's deal file lives at src/data/deals/<issue>.json and arrives
    // through global data as deals[issue]. Shadowing under a new name keeps
    // the raw map available to other templates.
    issueDeals: (data) => ((data.deals || {})[data.issue] || {}).deals || [],
    ogImage: (data) => `/assets/og/${data.issue}.png`,
  },
};
