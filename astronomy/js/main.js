// Entry point for The Doodle Universe.
//
// All engine and sim files are classic scripts sharing the window.Astro
// namespace, loaded in dependency order by index.html (see the <script> block
// there). Each sim file registers itself; this file only boots the page.
// Adding a new simulation = 1 sim file + 1 <script> tag + 1 page section.

(() => {
  const A = window.Astro;

  // ---- KaTeX auto-render (scripts are deferred; retry covers slow loads) ----
  function renderMath() {
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    } else {
      setTimeout(renderMath, 120);
    }
  }
  renderMath();

  // ---- back-to-top button ----
  const backtop = document.getElementById('backtop');
  if (backtop) {
    window.addEventListener('scroll', () => {
      backtop.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    backtop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ---- boot sims after fonts load (canvas labels use Gochi Hand) ----
  document.fonts.ready.then(A.bootSims);
})();
