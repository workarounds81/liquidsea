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
