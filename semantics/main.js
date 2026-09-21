// Entry point for Doodle Semantics. Classic scripts on window.Astro;
// the shared engine and sims self-register. This only boots the page.
// (No KaTeX here — nothing on this page is an equation.)

(() => {
  const A = window.Astro;

  const backtop = document.getElementById('backtop');
  if (backtop) {
    window.addEventListener('scroll', () => {
      backtop.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    backtop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  document.fonts.ready.then(A.bootSims);
})();
