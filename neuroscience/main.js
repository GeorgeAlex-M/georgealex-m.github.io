// Entry point for Doodle Neuroscience. Classic scripts on window.Astro;
// the shared engine and sims self-register. This only boots the page.

(() => {
  const A = window.Astro;

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

  const backtop = document.getElementById('backtop');
  if (backtop) {
    window.addEventListener('scroll', () => {
      backtop.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    backtop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  document.fonts.ready.then(A.bootSims);
})();
