// Apply theme before first paint to prevent flash.
// Must run before React mounts. Loaded as external script to comply with CSP.
(function () {
  try {
    var stored = JSON.parse(localStorage.getItem("loadout-theme") || "{}");
    var theme = stored.state && stored.state.theme;
    var resolved =
      theme === "dark" || theme === "light"
        ? theme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.classList.add(resolved);
  } catch (e) {
    document.documentElement.classList.add(
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    );
  }
})();
