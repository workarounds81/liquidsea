"use strict";

// Build-time clock. Event visibility (upcoming vs archive) is decided against
// this timestamp, so the site "ages" correctly on every rebuild — the deploy
// workflow also rebuilds weekly on a schedule for exactly this reason.
module.exports = {
  now: new Date().toISOString().slice(0, 10),
  year: new Date().getUTCFullYear(),
};
