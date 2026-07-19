// Entry point for The Doodle Universe.
// Adding a new simulation = 1 import + 1 register() line (see the plan's
// add-a-sim recipe). Everything else is wired automatically from
// <canvas data-sim="..."> elements in index.html.

import { register, bootSims } from './engine/sim.js';
import { BlackHoleSim } from './sims/black-hole.js';
import { FallingInSim } from './sims/falling-in.js';
import { OrbitsSim } from './sims/orbits-precession.js';

register('blackHole', BlackHoleSim);
register('fallingIn', FallingInSim);
register('orbits', OrbitsSim);

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
document.fonts.ready.then(bootSims);
