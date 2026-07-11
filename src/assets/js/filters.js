/* Site-wide motion pause toggle — the accessibility control for all
   animations (the OS reduce-motion signal is ignored by design; see CSS). */
(function () {
  "use strict";
  var btn = document.querySelector("[data-motion-toggle]");
  if (!btn) return;
  var KEY = "ls-motion";
  var root = document.documentElement;
  function apply(off) {
    root.classList.toggle("motion-off", off);
    btn.setAttribute("aria-pressed", String(off));
    btn.textContent = off ? "▶" : "⏸";
    btn.setAttribute("aria-label", off ? "Resume animations" : "Pause animations");
  }
  apply(root.classList.contains("motion-off"));
  btn.addEventListener("click", function () {
    var off = !root.classList.contains("motion-off");
    try { localStorage.setItem(KEY, off ? "off" : "on"); } catch (e) { /* private mode */ }
    apply(off);
  });
})();

/* Events calendar filters — vanilla JS, no dependencies (~1KB). */
(function () {
  "use strict";
  var root = document.querySelector("[data-filter-root]");
  if (!root) return;

  var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-event]"));
  var empty = document.querySelector("[data-empty]");
  var state = { country: "all", type: "all" };

  function apply() {
    var shown = 0;
    cards.forEach(function (card) {
      var ok =
        (state.country === "all" || card.getAttribute("data-country") === state.country) &&
        (state.type === "all" || card.getAttribute("data-type") === state.type);
      card.hidden = !ok;
      if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var parts = btn.getAttribute("data-filter").split(":");
      var key = parts[0];
      state[key] = parts.slice(1).join(":");
      buttons.forEach(function (other) {
        if (other.getAttribute("data-filter").indexOf(key + ":") === 0) {
          other.setAttribute("aria-pressed", String(other === btn));
        }
      });
      apply();
    });
  });
})();
