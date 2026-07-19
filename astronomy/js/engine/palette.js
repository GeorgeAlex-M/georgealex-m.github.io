// Excalidraw-dark palette — keep in sync with the CSS variables in css/doodle.css.
// All engine/sim files are classic scripts sharing the window.Astro namespace,
// loaded in dependency order by index.html — this makes the page work even when
// opened directly from disk (file://), where ES modules are blocked.

(() => {
  const A = (window.Astro = window.Astro || {});

  A.COLORS = {
    bg: '#1e1e1e',
    grid: 'rgba(255, 255, 255, 0.055)',
    ink: '#f8f9fa',
    muted: '#adb5bd',
    cyan: '#04d9ff',
    green: '#69db7c',
    orange: '#ffa94d',
    pink: '#f783ac',
    yellow: '#ffd43b',
    red: '#ff8787',
  };

  A.FONT_HAND = "'Gochi Hand', 'Segoe Print', 'Comic Sans MS', cursive";
  A.FONT_BODY = "'Patrick Hand', 'Segoe Print', 'Comic Sans MS', cursive";

  A.GRID_STEP = 24; // px, matches the CSS body background
})();
