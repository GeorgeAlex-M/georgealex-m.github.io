// Entry point for the open-to-work page.
//
// Same architecture as astronomy/js/main.js: the engine and the sim are classic
// scripts sharing the window.Astro namespace, loaded in dependency order by
// index.html. Sims boot after fonts load, because every canvas label is drawn
// in Gochi Hand and a fallback-font first paint is exactly the frame someone
// screenshots.

(() => {
  const A = window.Astro;

  // ---- back-to-top ----
  const backtop = document.getElementById('backtop');
  if (backtop) {
    window.addEventListener('scroll', () => {
      backtop.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    backtop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // The dark/light toggle wires itself up in doodle/engine/palette.js — do NOT
  // add a second listener here, or one click would flip the theme twice.

  document.fonts.ready.then(A.bootSims);
})();
