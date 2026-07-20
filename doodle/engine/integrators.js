// Numerical integrators.
//
// rk4: classic Runge–Kutta 4 for small ODE systems (state = array of numbers).
// verletStep: velocity Verlet for 2D orbital mechanics (symplectic — energy
//   drift stays bounded over many orbits, unlike Euler).
// binetDeriv: the orbit equation in Schwarzschild spacetime,
//   d²u/dφ² + u = GM/L² + 3GM u²/c²   (u = 1/r, L = specific angular momentum)
//   — the EXACT equatorial geodesic equation, so perihelion precession and the
//   ISCO instability emerge from the integration rather than being scripted.
//   Newtonian gravity is the same equation without the u² term.

(() => {
  const A = (window.Astro = window.Astro || {});

  function rk4(state, deriv, t, dt) {
    const n = state.length;
    const k1 = deriv(t, state);
    const s2 = new Array(n);
    for (let i = 0; i < n; i++) s2[i] = state[i] + (dt / 2) * k1[i];
    const k2 = deriv(t + dt / 2, s2);
    const s3 = new Array(n);
    for (let i = 0; i < n; i++) s3[i] = state[i] + (dt / 2) * k2[i];
    const k3 = deriv(t + dt / 2, s3);
    const s4 = new Array(n);
    for (let i = 0; i < n; i++) s4[i] = state[i] + dt * k3[i];
    const k4 = deriv(t + dt, s4);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = state[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
    return out;
  }

  // One velocity-Verlet step in 2D. accFn(x, y) -> [ax, ay].
  // Mutates and returns the body object { x, y, vx, vy }.
  function verletStep(body, accFn, dt) {
    const [ax0, ay0] = accFn(body.x, body.y);
    body.x += body.vx * dt + 0.5 * ax0 * dt * dt;
    body.y += body.vy * dt + 0.5 * ay0 * dt * dt;
    const [ax1, ay1] = accFn(body.x, body.y);
    body.vx += 0.5 * (ax0 + ax1) * dt;
    body.vy += 0.5 * (ay0 + ay1) * dt;
    return body;
  }

  // Derivative function for the Binet orbit equation. State: [u, du/dφ].
  // gmOverL2 = GM/L², relTerm = 3GM/c² (set 0 for Newton; multiply by an
  // exaggeration factor N to make tiny precessions visible — display the true
  // N=1 number alongside).
  function binetDeriv(gmOverL2, relTerm) {
    return (_phi, [u, du]) => [du, gmOverL2 + relTerm * u * u - u];
  }

  Object.assign(A, { rk4, verletStep, binetDeriv });
})();
