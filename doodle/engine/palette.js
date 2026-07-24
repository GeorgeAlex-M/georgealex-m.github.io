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

  // Visible wavelength (nm) → approximate perceived sRGB (Bruton's algorithm),
  // with an intensity roll-off at the deep-violet and deep-red edges.
  A.wavelengthRGB = function (nm) {
    let r = 0; let g = 0; let b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / (440 - 380); b = 1; }
    else if (nm >= 440 && nm < 490) { g = (nm - 440) / (490 - 440); b = 1; }
    else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / (510 - 490); }
    else if (nm >= 510 && nm < 580) { r = (nm - 510) / (580 - 510); g = 1; }
    else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / (645 - 580); }
    else if (nm >= 645 && nm <= 780) { r = 1; }
    let f = 1;
    if (nm >= 380 && nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
    else if (nm > 700 && nm <= 780) f = 0.3 + (0.7 * (780 - nm)) / 80;
    else if (nm < 380 || nm > 780) f = 0;
    const c = (x) => (x <= 0 ? 0 : Math.round(255 * Math.pow(x * f, 0.8)));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  };

  // Blackbody temperature (K) → approximate sRGB star colour
  // (Tanner Helland's widely-used fit; good ~1000–40000 K).
  A.blackbodyRGB = function (kelvin) {
    const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
    let r; let g; let b;
    if (t <= 66) r = 255; else r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    if (t <= 66) g = 99.4708025861 * Math.log(t) - 161.1195681661;
    else g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    const cl = (x) => Math.max(0, Math.min(255, Math.round(x)));
    return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
  };
})();
