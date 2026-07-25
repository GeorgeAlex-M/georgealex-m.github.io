// Sim 9 — Lagrange points & the three-body problem.
//
// The circular restricted three-body problem (CR3BP) in the CO-ROTATING frame,
// non-dimensionalised so the separation = 1, the angular velocity = 1, the
// barycenter is the origin, m1 sits at x = -mu and m2 at x = 1 - mu.
//
//   Omega(x,y) = ½(x² + y²) + (1-mu)/r1 + mu/r2        (effective potential)
//   x'' - 2y' = dOmega/dx ,   y'' + 2x' = dOmega/dy
//
// The ½(x²+y²) piece IS the centrifugal potential; the -2y'/+2x' pieces ARE the
// Coriolis force. NOTHING CANCELS at a Lagrange point — the net gravity at L1
// is decidedly non-zero and points sunward. These are equilibria of the ROTATING
// FRAME: gravity + centrifugal sum to zero there.
//
// COMPUTED, never hardcoded:
//   · mu, from JPL DE440 GM values;
//   · L1/L2/L3, by Newton's method on Euler's collinear quintic, then polished
//     by Newton on dOmega/dx itself (two independent routes to the same root);
//   · L4/L5, the exact equilateral solution x = ½ - mu, y = ±√3/2 (Lagrange 1772);
//   · the Routh stability criterion mu < (9-√69)/18 and the margin;
//   · the collinear instability eigenvalue lambda and its e-folding time;
//   · the L4/L5 libration frequencies;
//   · the effective-potential contours (marching squares on a sampled grid).
//
// Probes are integrated with RK4 through the FULL equations above. A probe near
// L4/L5 librates and stays; a probe near L1/L2/L3 leaves. That difference is not
// scripted — it falls out of the integration, and the Jacobi constant
// C = 2·Omega - v² is displayed live as the numerical honesty check (it holds to
// ~1e-12 over a whole run; it is the only conserved quantity the CR3BP has).
//
// HAND CHECKS (see updateReadout / linearise):
//   Sun–Earth(+Moon), mu = 3.0404234e-6:  L1 1,497,621 km and L2 1,507,683 km
//   from Earth; L2 e-folds in 23.40 d (c = 3.9405, lambda = 2.48432, TU = 58.132 d).
//   Earth–Moon, mu = 0.01215058:  L1 58,019 km, L2 64,515 km from the Moon.
//   Routh: (9-√69)/18 = 0.0385208965; 27·mu_crit·(1-mu_crit) = 1 exactly.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, sparkle,
    slider, buttonRow, actionButton, setReadout, rk4,
    DAY, YEAR, fmtNum, sci, fmtTime,
  } = A;

  const GM_SUN = 1.32712440041279419e11; // km³/s², JPL SSD / DE440

  // Every number here is a primary-source constant; everything derived from
  // them (mu, L-points, timescales, km distances) is computed at run time.
  const SYSTEMS = {
    sunEarth: {
      label: 'Sun – Earth',
      n1: 'Sun', n2: 'Earth',
      GM1: GM_SUN,
      GM2: 398600.435507 + 4902.800118, // Earth + Moon barycenter (DE440)
      aKm: 149597870.700,               // 1 au, IAU 2012 Res. B2 (exact)
      periodDays: 365.256363004,        // sidereal year
      R1: 695700, R2: 6371,             // km, drawn hugely exaggerated
      conv: 'mu uses the Earth+Moon BARYCENTER — the frame NASA flies JWST in. (Earth alone gives L1 = 1,491,551 km, 6,070 km closer.)',
    },
    earthMoon: {
      label: 'Earth – Moon',
      n1: 'Earth', n2: 'Moon',
      GM1: 398600.435507, GM2: 4902.800118, // DE440
      aKm: 384400,                          // IAU 1976 mean distance
      periodDays: 27.321661547,             // sidereal month
      R1: 6371, R2: 1737.4,
      conv: 'the separation is the IAU "mean distance", so the Kepler check below is only good to ~0.3%.',
    },
    sunJupiter: {
      label: 'Sun – Jupiter',
      n1: 'Sun', n2: 'Jupiter',
      GM1: GM_SUN,
      GM2: GM_SUN / 1047.348631,  // DE440 header GMSun/GM(Jupiter system)
      aKm: 778.479e6,             // NASA Jupiter fact sheet
      periodDays: 4332.589,
      R1: 695700, R2: 71492,
      conv: 'this is the system with real, permanent L4/L5 residents — the Trojan swarms.',
    },
    plutoCharon: {
      label: 'Pluto – Charon',
      n1: 'Pluto', n2: 'Charon',
      GM1: 869.6, GM2: 105.9,   // Brozovic et al. 2024, AJ
      aKm: 19595.8, periodDays: 6.3872,
      R1: 1188.3, R2: 606,
      conv: 'the counterexample: Charon is far too heavy, so this system FAILS the Routh criterion and its L4/L5 are unstable.',
    },
  };

  // Real occupants. kind: 'sc' spacecraft, 'ghost' departed, 'swarm' asteroids,
  // 'dust' disputed. loop = [max, min] distance from the point, km, when known.
  const OCCUPANTS = {
    sunEarth: [
      { at: 'L1', kind: 'sc', name: 'SOHO', note: 'since 1996 · halo, ~178 d' },
      { at: 'L1', kind: 'sc', name: 'DSCOVR', note: 'since 2015 · Lissajous' },
      { at: 'L2', kind: 'sc', name: 'JWST', note: '250,000–832,000 km from L2', loop: [832000, 250000] },
      { at: 'L2', kind: 'sc', name: 'Euclid', note: 'since 2023' },
      { at: 'L2', kind: 'ghost', name: 'Gaia', note: 'left L2 in March 2025', loop: [340000, 90000] },
      { at: 'L4', kind: 'dust', name: '2010 TK7 · 2020 XL5', note: "Earth's Trojans — temporary" },
    ],
    earthMoon: [
      { at: 'L2', kind: 'sc', name: 'Queqiao', note: 'far-side relay, 2018 · halo' },
      { at: 'L4', kind: 'dust', name: 'Kordylewski cloud?', note: 'disputed dust' },
      { at: 'L5', kind: 'dust', name: 'Kordylewski cloud?', note: 'disputed dust' },
    ],
    sunJupiter: [
      { at: 'L4', kind: 'swarm', name: 'the Greek camp', note: '588 Achilles (1906), 624 Hektor' },
      { at: 'L5', kind: 'swarm', name: 'the Trojan camp', note: '617 Patroclus — a Greek spy' },
    ],
    plutoCharon: [],
  };

  const TROJANS_KNOWN = 16356;          // JPL SBDB, sb-class=TJN, 24 July 2026
  const TROJAN_RATIO = 1.6;             // debiased N(L4)/N(L5), Li et al. 2023
  const MU_CRIT = (9 - Math.sqrt(69)) / 18;       // Routh 1875 — exact closed form
  const RATIO_CRIT = (25 + 3 * Math.sqrt(69)) / 2; // = (1-mu_crit)/mu_crit
  const ROOT3_2 = Math.sqrt(3) / 2;
  // "the Sun" and "the Moon" take an article; "Earth", "Jupiter", "Charon" do not.
  const nm = (n) => (n === 'Sun' || n === 'Moon' ? `the ${n}` : n);
  const PROBE_COLORS = [COLORS.cyan, COLORS.pink, COLORS.green, COLORS.orange, COLORS.red, COLORS.ink];
  const MAX_PROBES = 8;
  const MAX_TRAIL = 1400;

  /* ---------------- CR3BP mathematics (all non-dimensional) ---------------- */

  function omega(mu, x, y) {
    const r1 = Math.hypot(x + mu, y);
    const r2 = Math.hypot(x - 1 + mu, y);
    return 0.5 * (x * x + y * y) + (1 - mu) / r1 + mu / r2;
  }

  function omegaX(mu, x, y) {
    const d1 = x + mu; const d2 = x - 1 + mu;
    const r1 = Math.hypot(d1, y); const r2 = Math.hypot(d2, y);
    return x - ((1 - mu) * d1) / (r1 * r1 * r1) - (mu * d2) / (r2 * r2 * r2);
  }

  // On the x-axis Omega_xx collapses to 1 + 2c, with c the same combination that
  // sets the instability eigenvalue — so one helper serves Newton and stability.
  function cAxis(mu, x) {
    const a1 = Math.abs(x + mu); const a2 = Math.abs(x - 1 + mu);
    return (1 - mu) / (a1 * a1 * a1) + mu / (a2 * a2 * a2);
  }

  // Horner evaluation of a descending-coefficient polynomial plus its derivative.
  function polyNewton(coef, g) {
    for (let it = 0; it < 80; it++) {
      let f = 0; let fp = 0;
      for (let i = 0; i < coef.length; i++) { fp = fp * g + f; f = f * g + coef[i]; }
      if (fp === 0) break;
      const step = f / fp;
      g -= step;
      if (Math.abs(step) < 1e-16) break;
    }
    return g;
  }

  // The five equilibria. L1/L2/L3 come from Euler's 1767 quintics (gamma is the
  // distance from the NEARER primary), then get polished by Newton on dOmega/dx
  // directly — two independent routes that agree to ~1e-15, which is exactly how
  // the reference values for this sim were validated.
  function lagrangePoints(mu) {
    const seed = Math.cbrt(mu / 3);
    const g1 = polyNewton([1, -(3 - mu), 3 - 2 * mu, -mu, 2 * mu, -mu], seed);
    const g2 = polyNewton([1, 3 - mu, 3 - 2 * mu, -mu, -2 * mu, -mu], seed);
    const g3 = polyNewton([1, 2 + mu, 1 + 2 * mu, -(1 - mu), -2 * (1 - mu), -(1 - mu)], 1 - (7 / 12) * mu);
    const polish = (x) => {
      for (let i = 0; i < 40; i++) {
        const f = omegaX(mu, x, 0);
        const step = f / (1 + 2 * cAxis(mu, x));
        x -= step;
        if (Math.abs(step) < 1e-16) break;
      }
      return x;
    };
    return {
      L1: { x: polish(1 - mu - g1), y: 0, g: g1 },
      L2: { x: polish(1 - mu + g2), y: 0, g: g2 },
      L3: { x: polish(-mu - g3), y: 0, g: g3 },
      L4: { x: 0.5 - mu, y: ROOT3_2 },
      L5: { x: 0.5 - mu, y: -ROOT3_2 },
    };
  }

  // Linearisation at a collinear point. lambda is the real, positive root of
  // lambda⁴ + (2-c)lambda² + (1 + c - 2c²) = 0 — the saddle direction. The
  // eigenvector (X, Y) satisfies Y/X = (lambda² - Omega_xx)/(2·lambda), and a
  // pure exponential needs the VELOCITY seeded as lambda·(X, Y) too.
  function linearise(mu, x) {
    const c = cAxis(mu, x);
    const lam2 = ((c - 2) + Math.sqrt(9 * c * c - 8 * c)) / 2;
    const lam = Math.sqrt(lam2);
    const oxx = 1 + 2 * c;
    let ex = 1; let ey = (lam2 - oxx) / (2 * lam);
    const n = Math.hypot(ex, ey); ex /= n; ey /= n;
    return { c, lam, ex, ey, outOfPlane: Math.sqrt(c) };
  }

  // L4/L5: lambda⁴ + lambda² + (27/4)mu(1-mu) = 0. Discriminant D = 1 - 27mu(1-mu).
  // D > 0 → four imaginary roots → linearly stable, with a short (~1 orbit) and a
  // long (tadpole) libration frequency. D < 0 → complex roots → it runs away.
  function triangular(mu) {
    const D = 1 - 27 * mu * (1 - mu);
    if (D >= 0) {
      const s = Math.sqrt(D);
      return { stable: true, wShort: Math.sqrt((1 + s) / 2), wLong: Math.sqrt((1 - s) / 2) };
    }
    // complex square root of lambda² = (-1 ± i√(-D))/2, take Re(lambda) > 0
    const re = -0.5; const im = Math.sqrt(-D) / 2;
    const m = Math.sqrt(Math.hypot(re, im));
    const arg = Math.atan2(im, re) / 2;
    return { stable: false, growth: m * Math.cos(arg) };
  }

  function deriv(mu) {
    return (_t, [x, y, vx, vy]) => {
      const d1 = x + mu; const d2 = x - 1 + mu;
      const r1 = Math.hypot(d1, y); const r2 = Math.hypot(d2, y);
      const i1 = (1 - mu) / (r1 * r1 * r1); const i2 = mu / (r2 * r2 * r2);
      return [vx, vy, 2 * vy + (x - i1 * d1 - i2 * d2), -2 * vx + (y - i1 * y - i2 * y)];
    };
  }

  class LagrangeSim extends Sim {
    init() {
      this.sysKey = 'sunEarth';
      this.zoom = 1.15;      // half-width of the view, in units of the separation
      this.focus = 'system'; // 'system' | 'neck' | 'L4' | 'L5'
      this.rate = 1.2;       // non-dimensional time units per wall second
      this.showPot = false;
      this.probes = [];
      this.drag = null;
      this.simT = 0;
      this._colorIdx = 0;
      this.contours = null;
      this._readoutTick = 0;
      // applySystem first: it fills in mu / tuSec, which the slider labels format with
      this.applySystem('sunEarth', true);
      this.buildControls();
      this.bindPointer();
    }

    /* ---------------- system + derived quantities ---------------- */

    applySystem(key, quiet) {
      this.sysKey = key;
      const s = SYSTEMS[key];
      this.mu = s.GM2 / (s.GM1 + s.GM2);
      this.pts = lagrangePoints(this.mu);
      this.tri = triangular(this.mu);
      this.lin = {
        L1: linearise(this.mu, this.pts.L1.x),
        L2: linearise(this.mu, this.pts.L2.x),
        L3: linearise(this.mu, this.pts.L3.x),
      };
      // Time unit of the rotating frame: TU = P/2π seconds. Everything printed in
      // days/years goes through this one conversion.
      this.tuSec = (s.periodDays * DAY) / (2 * Math.PI);
      // Kepler's third law as an internal consistency check on the table above:
      // n²a³ should equal GM1+GM2. Printed, so a typo in a or P cannot hide.
      const n = (2 * Math.PI) / (s.periodDays * DAY);
      this.keplerCheck = (n * n * s.aKm ** 3) / (s.GM1 + s.GM2);
      this.probes.length = 0;
      this.contours = null;
      this.simT = 0;
      this.setFocus('system', true);
      if (this.rateSlider) this.rateSlider.set(this.rate); // refresh its real-time label
      if (!quiet) {
        this.cite(key === 'sunJupiter'
          ? '1906 Wolf - Photographische Aufnahmen von kleinen Planeten (Photographic Exposures of Minor Planets)'
          : '1772 Lagrange - Essai sur le problème des trois corps (Essay on the Three-Body Problem)');
      }
      this.updateReadout();
    }

    // The focus buttons choose the view CENTER; the zoom slider chooses the scale.
    // Panning is deliberately quantised this way so a click on the canvas always
    // means "drop a probe here" and never "drag the view".
    setFocus(f, quiet) {
      this.focus = f;
      // Cite whoever actually found the point being looked at: Euler solved the
      // three collinear configurations in 1767, Lagrange the two equilateral
      // ones five years later. They are different discoveries by different people.
      if (f === 'neck' && !this._citedEuler) {
        this._citedEuler = true;
        this.cite('1767 Euler - De motu rectilineo trium corporum se mutuo attrahentium (On the Rectilinear Motion of Three Bodies Mutually Attracting Each Other)');
      } else if ((f === 'L4' || f === 'L5') && !this._citedLagrange) {
        this._citedLagrange = true;
        this.cite('1772 Lagrange - Essai sur le problème des trois corps (Essay on the Three-Body Problem)');
      }
      const g = Math.max(this.pts.L1.g, this.pts.L2.g);
      if (f === 'system') this.zoom = 1.15;
      else if (f === 'neck') this.zoom = Math.max(2.6 * g, 0.02);
      else this.zoom = 0.42;
      if (this.zoomSlider) this.zoomSlider.set(this.zoom);
      this.contours = null;
      if (!quiet) this.poke();
    }

    center() {
      if (this.focus === 'neck') return [1 - this.mu, 0];
      if (this.focus === 'L4') return [this.pts.L4.x, this.pts.L4.y];
      if (this.focus === 'L5') return [this.pts.L5.x, this.pts.L5.y];
      return [0, 0];
    }

    // px per non-dimensional unit — derived every frame from this.w/this.h so a
    // resize or a phone-width viewport re-fits instead of cropping L4/L5 away.
    scale() { return Math.min(this.w / (2.6 * this.zoom), this.h / (2.04 * this.zoom)); }
    toPx(x, y) {
      const [cx, cy] = this.center(); const k = this.scale();
      return [this.w / 2 + (x - cx) * k, this.h / 2 - (y - cy) * k];
    }
    toSim(px, py) {
      const [cx, cy] = this.center(); const k = this.scale();
      return [cx + (px - this.w / 2) / k, cy - (py - this.h / 2) / k];
    }

    km(nd) { return nd * SYSTEMS[this.sysKey].aKm; }
    days(tu) { return (tu * this.tuSec) / DAY; }
    kms(v) { return (v * SYSTEMS[this.sysKey].aKm) / this.tuSec; } // velocity unit
    // fmtTime renders a one-year period as the wince-inducing "1 years" —
    // show anything under ~2 years in days instead.
    per(tu) {
      const sec = tu * this.tuSec;
      return sec < 1.8 * YEAR ? `${fmtNum(sec / DAY, 2)} days` : fmtTime(sec);
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.sysBtns = buttonRow(c, [
        { label: 'Sun – Earth', value: 'sunEarth' },
        { label: 'Earth – Moon', value: 'earthMoon' },
        { label: 'Sun – Jupiter', value: 'sunJupiter' },
        { label: 'Pluto – Charon (unstable!)', value: 'plutoCharon' },
      ], { initial: 'sunEarth', onSelect: (v) => { this.applySystem(v); this.poke(); } });

      this.focusBtns = buttonRow(c, [
        { label: 'whole system', value: 'system' },
        { label: 'the L1–L2 neck', value: 'neck' },
        { label: 'L4', value: 'L4' },
        { label: 'L5', value: 'L5' },
      ], { initial: 'system', onSelect: (v) => this.setFocus(v) });

      this.zoomSlider = slider(c, {
        label: 'zoom',
        min: 0.008, max: 1.6, value: this.zoom, log: true,
        format: (v) => `frame is ${sci(2 * v * SYSTEMS[this.sysKey].aKm, 2)} km wide`,
        oninput: (v) => { this.zoom = v; this.contours = null; this.poke(); },
      });

      this.rateSlider = slider(c, {
        label: 'speed',
        min: 0.08, max: 60, value: this.rate, log: true,
        format: (v) => `${fmtTime(v * this.tuSec)} of orbit per second`,
        oninput: (v) => { this.rate = v; this.poke(); },
      });

      this.potBtns = buttonRow(c, [
        { label: 'effective potential: off', value: 'off' },
        { label: 'show contours', value: 'on' },
      ], {
        initial: 'off',
        onSelect: (v) => { this.showPot = v === 'on'; this.contours = null; this.poke(); },
      });

      actionButton(c, 'seed L2’s unstable mode', () => this.seedEigen('L2'));
      actionButton(c, 'drop a Trojan at L4', () => this.seedTrojan());
      actionButton(c, 'clear probes', () => { this.probes.length = 0; this.updateReadout(); this.poke(); });
    }

    /* ---------------- probes ---------------- */

    spawn(x, y, vx, vy, tag) {
      if (this.probes.length >= MAX_PROBES) this.probes.shift();
      const p = {
        s: [x, y, vx, vy], trail: [[x, y]], tag: tag || null,
        color: PROBE_COLORS[this._colorIdx++ % PROBE_COLORS.length],
        born: this.simT, state: 'live', maxDev: 0,
      };
      p.C0 = this.jacobi(p.s);
      p.C = p.C0;
      if (tag) { p.ref = [this.pts[tag.pt].x, this.pts[tag.pt].y]; p.d0 = tag.d0; }
      this.probes.push(p);
      this.updateReadout();
      return p;
    }

    jacobi([x, y, vx, vy]) { return 2 * omega(this.mu, x, y) - (vx * vx + vy * vy); }

    // Seed a probe exactly on the unstable eigenvector of a collinear point —
    // position AND velocity — so the growth really is a clean e^(lambda·t) and
    // the measured rate can be compared with theory. A generic nudge does NOT do
    // this: it also excites the stable and oscillatory modes, and its apparent
    // early growth rate wanders all over the place.
    seedEigen(which) {
      const L = this.pts[which]; const l = this.lin[which];
      const eps = 1e-3 * Math.max(L.g, 1e-4);
      this.spawn(L.x + eps * l.ex, eps * l.ey, eps * l.lam * l.ex, eps * l.lam * l.ey,
        { pt: which, d0: eps, kind: 'eigen' });
      this.setFocus('neck');
      this.cite('1890 Poincaré - Sur le problème des trois corps et les équations de la dynamique (On the Three-Body Problem and the Equations of Dynamics)');
      this.poke();
    }

    // Released AT REST in the rotating frame, on the circle of radius 1 about the
    // primary, 6° short of L4 — the canonical co-orbital start: same orbital
    // radius as the secondary, just a different longitude. (Offsetting along a
    // straight tangent line instead also changes the radius by ~delta²/2, and for
    // Sun–Earth that is comparable to the tadpole's own width ~sqrt(mu) — I tried
    // it, and the probe escapes. The physics is unforgiving about this.)
    // Nothing else is done to it: whether it stays is up to the integrator.
    seedTrojan() {
      const dth = -6 * (Math.PI / 180);
      const th = Math.PI / 3 + dth;
      this.spawn(-this.mu + Math.cos(th), Math.sin(th), 0, 0,
        { pt: 'L4', d0: Math.abs(dth), kind: 'tadpole' });
      this.setFocus('L4');
      this.cite('1906 Charlier - Über den Planeten 1906 TG (On the Planet 1906 TG)');
      this.poke();
    }

    bindPointer() {
      const cv = this.canvasEl;
      const at = (e) => {
        const r = cv.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };
      cv.addEventListener('pointerdown', (e) => {
        const [x, y] = at(e);
        this.drag = { x0: x, y0: y, x, y };
        try { cv.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
        this.poke();
      });
      cv.addEventListener('pointermove', (e) => {
        if (!this.drag) return;
        const [x, y] = at(e);
        this.drag.x = x; this.drag.y = y;
        this.poke();
      });
      const finish = () => {
        if (!this.drag) return;
        const d = this.drag; this.drag = null;
        const [x, y] = this.toSim(d.x0, d.y0);
        const k = this.scale();
        // drag → velocity in the ROTATING frame, converted through the same
        // px-per-unit as everything else, so the gesture means the same physical
        // thing at every zoom level
        const vx = ((d.x - d.x0) / k) * 0.6;
        const vy = (-(d.y - d.y0) / k) * 0.6;
        this.spawn(x, y, vx, vy, null);
        this.poke();
      };
      cv.addEventListener('pointerup', finish);
      cv.addEventListener('pointercancel', () => { this.drag = null; });
    }

    /* ---------------- integration ---------------- */

    update(dt) {
      const dT = dt * this.rate;
      this.simT += dT;
      const f = deriv(this.mu);
      const s = SYSTEMS[this.sysKey];
      const rad1 = s.R1 / s.aKm; const rad2 = s.R2 / s.aKm;
      let changed = false;
      for (const p of this.probes) {
        if (p.state !== 'live') continue;
        let left = dT; let guard = 0;
        while (left > 1e-12 && guard++ < 800) {
          // h = 4e-3 resolves both the fastest instability (lambda ~ 2.9) and the
          // orbital period (2·pi TU) with room to spare: measured Jacobi drift
          // over a 4 TU run is ~1e-16, i.e. machine precision.
          const h = Math.min(4e-3, left);
          left -= h;
          p.s = rk4(p.s, f, 0, h);
          const [x, y] = p.s;
          if (Math.hypot(x + this.mu, y) < rad1) { p.state = 'hit1'; changed = true; break; }
          if (Math.hypot(x - 1 + this.mu, y) < rad2) { p.state = 'hit2'; changed = true; break; }
          if (Math.hypot(x, y) > 4) { p.state = 'gone'; changed = true; break; }
        }
        p.C = this.jacobi(p.s);
        p.trail.push([p.s[0], p.s[1]]);
        if (p.trail.length > MAX_TRAIL) p.trail.shift();
        if (p.ref) {
          const d = Math.hypot(p.s[0] - p.ref[0], p.s[1] - p.ref[1]);
          p.dev = d;
          if (d > p.maxDev) p.maxDev = d;
          // Measured growth rate of the seeded unstable mode. Only sampled while
          // the displacement is still LINEAR (up to ~60× the seed): past that the
          // probe is far from L2 and the exponential is no longer the whole story,
          // so the reading is frozen at its last honest value rather than drifting.
          if (p.tag.kind === 'eigen' && d > p.d0 * 2 && d < p.d0 * 60) {
            p.lamMeas = Math.log(d / p.d0) / (this.simT - p.born);
          }
        }
      }
      // the readout is a DOM write — refresh it a few times a second, not 60
      if (changed || (this.probes.length && ++this._readoutTick % 8 === 0)) this.updateReadout();
    }

    /* ---------------- readout ---------------- */

    updateReadout() {
      const s = SYSTEMS[this.sysKey];
      const P = this.pts;
      const d1 = this.km(P.L1.g); const d2 = this.km(P.L2.g);
      // L3 is NOT exactly antipodal. State it against the PRIMARY, where the
      // claim is unambiguous: its distance from m1 is gamma3 < 1, so it sits
      // (1-gamma3)·a closer in than m2. First-order theory says gamma3 ~ 1-(7/12)mu,
      // and for Sun–Earth that is 265.3 km — which is what the quintic root gives.
      // (Measured from the BARYCENTER instead, L3 is farther out than m2; both
      // statements are true, which is exactly why the reference has to be named.)
      const ratio = s.GM1 / s.GM2;
      const lines = [];

      lines.push([
        [s.label, 'yellow'],
        ['   mu = m2/(m1+m2) = ', null], [sci(this.mu, 6), 'cyan'],
        ['   separation ', null], [`${sci(s.aKm, 4)} km`, null],
        ['   period ', null], [`${fmtNum(s.periodDays, 3)} d`, null],
        ['   Kepler check n²a³/GM = ', null], [fmtNum(this.keplerCheck, 4), 'green'],
      ]);

      const l3in = this.km(1 - P.L3.g);
      lines.push([
        ['L1 is ', null], [`${fmtNum(d1, 0)} km`, 'orange'],
        [` from ${nm(s.n2)}, L2 is `, null], [`${fmtNum(d2, 0)} km`, 'orange'],
        [` — NOT symmetric: L2 is ${fmtNum(Math.abs(d2 - d1), 0)} km farther out than L1 is in. L3 is `, null],
        [`${fmtNum(l3in, 0)} km`, 'pink'],
        [` closer to ${nm(s.n1)} than ${nm(s.n2)} is — not exactly antipodal. L4/L5 are exact: x = ½−mu, y = ±√3/2.`, null],
      ]);

      const stable = this.tri.stable;
      lines.push([
        ['Routh’s criterion: L4/L5 are linearly stable iff mu < (9−√69)/18 = ', null],
        [fmtNum(MU_CRIT, 7), 'cyan'],
        ['. Here mu = ', null], [sci(this.mu, 5), null],
        [stable ? `  → STABLE, with ${sci(MU_CRIT / this.mu, 2)}× of margin (m1/m2 = ${fmtNum(ratio, 2)} vs the required ${fmtNum(RATIO_CRIT, 4)}).`
          : `  → UNSTABLE (m1/m2 = ${fmtNum(ratio, 2)}, below the required ${fmtNum(RATIO_CRIT, 4)}); a Trojan there e-folds away in ${fmtNum(this.days(1 / this.tri.growth), 2)} days.`,
          stable ? 'green' : 'red'],
      ]);

      lines.push([
        ['the collinear points are all saddles — e-folding times from the linearised equations: ', null],
        [`L1 ${fmtTime((this.days(1 / this.lin.L1.lam)) * DAY)}`, 'red'],
        ['  ·  ', null], [`L2 ${fmtTime((this.days(1 / this.lin.L2.lam)) * DAY)}`, 'red'],
        ['  ·  ', null], [`L3 ${fmtTime((this.days(1 / this.lin.L3.lam)) * DAY)}`, 'orange'],
        ['  — not the same timescale at all.', null],
      ]);

      if (stable) {
        lines.push([
          ['L4/L5 libration (also computed, from λ⁴+λ²+(27/4)mu(1−mu)=0): short period ', null],
          [this.per((2 * Math.PI) / this.tri.wShort), 'green'],
          [', long "tadpole" period ', null],
          [this.per((2 * Math.PI) / this.tri.wLong), 'green'],
          ['. Those two beating against each other ARE the tadpole shape.', null],
        ]);
      }

      const live = this.probes.filter((p) => p.state === 'live');
      const p = this.probes[this.probes.length - 1];
      if (p) {
        const parts = [
          [`probes: ${live.length} flying, ${this.probes.length} total.  newest: `, null],
          ['Jacobi C = ', null], [fmtNum(p.C, 9), 'cyan'],
          ['  drift since release ', null],
          [sci(Math.abs(p.C - p.C0) / Math.abs(p.C0), 1), Math.abs(p.C - p.C0) / Math.abs(p.C0) < 1e-8 ? 'green' : 'orange'],
          [' (C is the ONLY conserved quantity here — if the integration were cheating, this would move)', null],
        ];
        lines.push(parts);
        if (p.tag && p.tag.kind === 'eigen' && p.lamMeas) {
          const th = this.lin[p.tag.pt].lam;
          lines.push([
            [`measured growth of the seeded ${p.tag.pt} mode: `, null],
            [`e-fold every ${fmtNum(this.days(1 / p.lamMeas), 3)} d`, 'pink'],
            ['   theory says ', null], [`${fmtNum(this.days(1 / th), 3)} d`, 'green'],
            [`   (λ measured ${fmtNum(p.lamMeas, 5)} vs ${fmtNum(th, 5)})`, null],
          ]);
        } else if (p.tag && p.tag.kind === 'tadpole') {
          lines.push([
            [`the L4 Trojan has been running for `, null], [fmtTime(this.simT - p.born < 0 ? 0 : (this.simT - p.born) * this.tuSec), 'yellow'],
            [' and its farthest excursion from L4 so far is ', null],
            [`${sci(this.km(p.maxDev), 2)} km`, 'green'],
            [p.state === 'live' ? ' — it is still there. Nothing holds it but the Coriolis force.' : ' — it left.', null],
          ]);
        }
      } else {
        lines.push([['click anywhere to release a probe at rest in the rotating frame, or drag to fling it. Then watch which ones stay.', 'yellow']]);
      }
      lines.push([[s.conv, 'muted']]);
      setReadout(this.readoutEl, lines);
    }

    /* ---------------- effective-potential contours ---------------- */

    // Marching squares over a sampled grid of 2·Omega. The LEVELS are not
    // arbitrary: they are the Jacobi constants at L1..L4, so the curves drawn are
    // the zero-velocity curves whose successive opening is the classic "gateway"
    // picture (C_L1 > C_L2 > C_L3 > C_L4 = C_L5, always). Rebuilt only when the
    // system or the view changes — never per frame.
    buildContours() {
      const key = `${this.sysKey}|${this.zoom.toFixed(6)}|${this.focus}|${this.w}x${this.h}`;
      if (this.contours && this.contours.key === key) return this.contours;
      const step = 4;
      const cols = Math.ceil(this.w / step) + 1;
      const rows = Math.ceil(this.h / step) + 1;
      const g = new Float64Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const [x, y] = this.toSim(i * step, j * step);
          g[j * cols + i] = 2 * omega(this.mu, x, y);
        }
      }
      const CofPt = (n) => { const p = this.pts[n]; return 2 * omega(this.mu, p.x, p.y); };
      const c3 = CofPt('L3'); const c4 = CofPt('L4');
      // The first three levels are drawn EXACTLY at C(L1), C(L2), C(L3), so each
      // curve visibly pinches shut at its own point — that pinch IS the gateway.
      // The fourth is deliberately just ABOVE C(L4): drawn exactly at C(L4) the
      // forbidden region has already collapsed to the two isolated points L4 and
      // L5, so the contour would be empty (it is — I checked).
      const levels = [
        { name: 'C(L1) — the neck between the two bodies opens', color: COLORS.cyan, C: CofPt('L1') },
        { name: 'C(L2) — the escape gate opens', color: COLORS.green, C: CofPt('L2') },
        { name: 'C(L3) — the far-side gate opens', color: COLORS.orange, C: c3 },
        { name: 'just above C(L4=L5) — the last forbidden scraps', color: COLORS.pink, C: c4 + (c3 - c4) * 0.06 },
      ].map((lv) => ({ ...lv, seg: [] }));
      const mix = (va, vb, C, pa, pb) => pa + ((C - va) / (vb - va)) * (pb - pa);
      for (const lv of levels) {
        const C = lv.C;
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const x0 = i * step; const y0 = j * step; const x1 = x0 + step; const y1 = y0 + step;
            const a = g[j * cols + i]; const b = g[j * cols + i + 1];
            const c = g[(j + 1) * cols + i + 1]; const d = g[(j + 1) * cols + i];
            const hit = [];
            if ((a > C) !== (b > C)) hit.push(mix(a, b, C, x0, x1), y0);
            if ((b > C) !== (c > C)) hit.push(x1, mix(b, c, C, y0, y1));
            if ((d > C) !== (c > C)) hit.push(mix(d, c, C, x0, x1), y1);
            if ((a > C) !== (d > C)) hit.push(x0, mix(a, d, C, y0, y1));
            for (let q = 0; q + 3 < hit.length; q += 4) lv.seg.push(hit[q], hit[q + 1], hit[q + 2], hit[q + 3]);
          }
        }
      }
      this.contours = { key, levels };
      return this.contours;
    }

    /* ---------------- drawing ---------------- */

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const s = SYSTEMS[this.sysKey];
      const k = this.scale();
      const P = this.pts;
      const BODY = {
        Sun: COLORS.yellow, Earth: COLORS.cyan, Moon: COLORS.muted,
        Jupiter: COLORS.orange, Pluto: COLORS.muted, Charon: COLORS.muted,
      };

      if (this.showPot) {
        const levels = this.buildContours().levels;
        for (const lv of levels) {
          ctx.strokeStyle = lv.color;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let q = 0; q < lv.seg.length; q += 4) {
            ctx.moveTo(lv.seg[q], lv.seg[q + 1]);
            ctx.lineTo(lv.seg[q + 2], lv.seg[q + 3]);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // colour key, top-left (the force budget owns the bottom-left corner)
        label(ctx, 'zero-velocity curves of the effective potential — a probe with that C is', 10, 16,
          { color: COLORS.muted, size: compact ? 10.5 : 12 });
        label(ctx, 'stopped dead on the curve and can never cross it:', 10, compact ? 29 : 30,
          { color: COLORS.muted, size: compact ? 10.5 : 12 });
        levels.forEach((lv, i) => {
          const yy = (compact ? 44 : 46) + i * (compact ? 14 : 16);
          ctx.strokeStyle = lv.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(10, yy - 4); ctx.lineTo(26, yy - 4); ctx.stroke();
          label(ctx, compact ? lv.name.split(' — ')[0] : lv.name, 32, yy,
            { color: lv.color, size: compact ? 10.5 : 12 });
        });
      }

      // the secondary's orbit, and Lagrange's equilateral triangles
      const [bx, by] = this.toPx(0, 0);
      if (this.focus === 'system') {
        // drawn fresh with a FIXED seed (not cached) — the zoom slider would
        // otherwise mint a new cache key on every pixel of travel
        rc.circle(bx, by, 2 * (1 - this.mu) * k, opts(301, {
          stroke: COLORS.muted, strokeWidth: 1, strokeLineDash: [5, 8],
        }));
        for (const key of ['L4', 'L5']) {
          const [lx, ly] = this.toPx(P[key].x, P[key].y);
          const [p1x, p1y] = this.toPx(-this.mu, 0);
          const [p2x, p2y] = this.toPx(1 - this.mu, 0);
          const o = opts(key === 'L4' ? 302 : 303, { stroke: COLORS.yellow, strokeWidth: 1, strokeLineDash: [4, 7] });
          rc.line(p1x, p1y, lx, ly, o);
          rc.line(p2x, p2y, lx, ly, o);
        }
      }

      // the two primaries — drawn hugely oversized (hence the stamp)
      const drawBody = (nd, R, name) => {
        const [x, y] = this.toPx(nd, 0);
        const rpx = Math.max(5, Math.min(0.07 * Math.min(w, h), (R / s.aKm) * k));
        rc.circle(x, y, rpx * 2, opts(name === s.n1 ? 310 : 311, {
          stroke: BODY[name] || COLORS.ink, strokeWidth: 2,
          fill: BODY[name] || COLORS.ink, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 6,
        }));
        label(ctx, name, x, y + rpx + 15, { color: BODY[name] || COLORS.ink, size: compact ? 12 : 14, align: 'center' });
        return [x, y];
      };
      drawBody(-this.mu, s.R1, s.n1);
      drawBody(1 - this.mu, s.R2, s.n2);

      // barycenter — the origin everything rotates about
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by);
      ctx.moveTo(bx, by - 5); ctx.lineTo(bx, by + 5);
      ctx.stroke();

      // the five points, computed above
      const [l1x] = this.toPx(P.L1.x, 0);
      const [l2x] = this.toPx(P.L2.x, 0);
      const merged = Math.abs(l2x - l1x) < 26;
      for (const key of ['L1', 'L2', 'L3', 'L4', 'L5']) {
        const [x, y] = this.toPx(P[key].x, P[key].y);
        if (x < -40 || x > w + 40 || y < -40 || y > h + 40) continue;
        const tri = key === 'L4' || key === 'L5';
        const col = tri ? COLORS.green : COLORS.yellow;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
        ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5);
        ctx.stroke();
        if (merged && key === 'L2') continue; // labels would collide
        const txt = merged && key === 'L1' ? 'L1·L2' : key;
        label(ctx, txt, x + 8, y - 8, { color: col, size: compact ? 12 : 14 });
      }
      if (merged && this.focus === 'system') {
        label(ctx, `L1 and L2 are only ${sci(this.km(P.L1.g + P.L2.g), 2)} km apart at this scale — press "the L1–L2 neck"`,
          w / 2, 20, { color: COLORS.muted, size: compact ? 11 : 13, align: 'center' });
      }

      this.drawOccupants(k, compact, merged);
      this.drawProbes(compact);

      if (this.drag) {
        const d = this.drag;
        const len = Math.hypot(d.x - d.x0, d.y - d.y0);
        ctx.fillStyle = COLORS.yellow;
        ctx.beginPath(); ctx.arc(d.x0, d.y0, 4, 0, Math.PI * 2); ctx.fill();
        if (len >= 6) {
          doodleArrow(rc, d.x0, d.y0, d.x, d.y, { color: COLORS.yellow, seed: 330 });
          label(ctx, `release at ${fmtNum(this.kms((len / k) * 0.6), 3)} km/s (rotating frame)`,
            d.x + 10, d.y - 8, { color: COLORS.yellow, size: 12.5 });
        } else {
          label(ctx, 'release: at rest in the rotating frame', d.x0 + 10, d.y0 - 10, { color: COLORS.yellow, size: 12.5 });
        }
      }

      if (!compact) this.drawForceBudget();
      // Stamp sits BELOW the two top instruction lines (y≈14 and y≈30), not on them.
      notToScale(rc, ctx, w - 70, 52);
      // Left column, under the probe instruction — NOT the bottom strip: the
      // citation chip owns y ∈ [h-26, h-6] and the L5 occupant labels drift
      // through the bottom centre.
      label(ctx, compact ? 'co-rotating frame · nothing sits AT a point' : 'co-rotating frame — the whole picture spins once per orbit.',
        14, 146, { color: COLORS.muted, size: compact ? 11 : 12.5, align: 'left' });
      if (!compact) {
        label(ctx, 'Nothing sits AT a Lagrange point: real craft fly halo/Lissajous loops and station-keep.',
          14, 163, { color: COLORS.muted, size: 12.5, align: 'left' });
      }
    }

    // Only ever the occupants of the SELECTED system — no JWST in the Earth–Moon frame.
    drawOccupants(k, compact, merged) {
      const { rc, ctx } = this;
      const list = OCCUPANTS[this.sysKey] || [];
      const used = {};
      // When L1 and L2 are a pixel apart, five stacked spacecraft labels pile up
      // on top of the planet. Collapse them into one line instead.
      if (merged) {
        const byPt = {};
        for (const oc of list) {
          if (oc.kind === 'swarm') { // the Trojan camps are nowhere near L1/L2 — still draw them
            const [sx, sy] = this.toPx(this.pts[oc.at].x, this.pts[oc.at].y);
            this.drawSwarm(oc, sx, sy, compact);
            continue;
          }
          (byPt[oc.at] = byPt[oc.at] || []).push(oc.kind === 'ghost' ? `${oc.name} (gone)` : oc.name);
        }
        const keys = Object.keys(byPt);
        if (keys.length) {
          const [px, py] = this.toPx(this.pts.L1.x, 0);
          keys.forEach((kk, i) => {
            label(ctx, `${kk}: ${byPt[kk].join(', ')}`, px + 16, py + 26 + i * 17,
              { color: COLORS.pink, size: compact ? 11 : 13 });
          });
        }
        return;
      }
      for (const oc of list) {
        const p = this.pts[oc.at];
        const [x, y] = this.toPx(p.x, p.y);
        if (x < -60 || x > this.w + 60) continue;
        if (oc.kind === 'swarm') { this.drawSwarm(oc, x, y, compact); continue; }
        const ghost = oc.kind === 'ghost';
        const col = oc.kind === 'dust' ? COLORS.muted : (ghost ? COLORS.muted : COLORS.pink);
        // a halo/Lissajous loop, drawn to the real quoted size when it is big
        // enough on screen to be honest about — otherwise just a marker.
        if (oc.loop) {
          const ax = ((oc.loop[0] / SYSTEMS[this.sysKey].aKm) * k);
          const ay = ((oc.loop[1] / SYSTEMS[this.sysKey].aKm) * k);
          if (ax > 7) {
            rc.ellipse(x, y, ax * 2, ay * 2, opts(ghost ? 341 : 340, {
              stroke: col, strokeWidth: 1.4, strokeLineDash: ghost ? [3, 5] : undefined,
            }));
          }
        }
        const n = (used[oc.at] = (used[oc.at] || 0) + 1);
        const ly = y + 20 + (n - 1) * 26;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x + 12, ly - 4, 2.6, 0, Math.PI * 2); ctx.fill();
        label(ctx, ghost ? `${oc.name} (gone)` : oc.name, x + 19, ly, { color: col, size: compact ? 11.5 : 13.5 });
        if (!compact) label(ctx, oc.note, x + 19, ly + 13, { color: COLORS.muted, size: 11 });
      }
    }

    // Jupiter's Trojans: a real, permanent swarm. Dot counts are in the observed
    // debiased L4:L5 ratio, and the printed total is stamped with its query date
    // because it grows every month.
    drawSwarm(oc, px, py, compact) {
      const { rc, ctx } = this;
      const lead = oc.at === 'L4';
      const n4 = 26;
      const n = lead ? n4 : Math.round(n4 / TROJAN_RATIO);
      const sign = lead ? 1 : -1;
      ctx.fillStyle = lead ? COLORS.green : COLORS.orange;
      for (let i = 0; i < n; i++) {
        // deterministic low-discrepancy scatter: librating ±25° in longitude
        const u = (i * 0.7548776662) % 1;
        const v = (i * 0.5698402910) % 1;
        const th = sign * (Math.PI / 3 + (v - 0.5) * 0.88);
        const r = 1 + (u - 0.5) * 0.13;
        const [x, y] = this.toPx(-this.mu + r * Math.cos(th), r * Math.sin(th));
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(x, y, 2.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      label(ctx, oc.name, px + 14, py + (lead ? -14 : 22), { color: lead ? COLORS.green : COLORS.orange, size: compact ? 12 : 14 });
      if (!compact) {
        label(ctx, oc.note, px + 14, py + (lead ? 2 : 38), { color: COLORS.muted, size: 11 });
        if (lead) {
          label(ctx, `${fmtNum(TROJANS_KNOWN, 0)} Jupiter Trojans known (JPL SBDB, 24 Jul 2026);`,
            px + 14, py + 18, { color: COLORS.muted, size: 11 });
          label(ctx, `the leading camp outnumbers the trailing one ~${fmtNum(TROJAN_RATIO, 1)} : 1`,
            px + 14, py + 31, { color: COLORS.muted, size: 11 });
          sparkle(rc, px - 16, py - 16, 6, { color: COLORS.green, seed: 352 });
        }
      }
    }

    drawProbes(compact) {
      const { ctx } = this;
      for (const p of this.probes) {
        if (p.trail.length > 1) {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let i = 0; i < p.trail.length; i++) {
            const [x, y] = this.toPx(p.trail[i][0], p.trail[i][1]);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const [x, y] = this.toPx(p.s[0], p.s[1]);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(x, y, p.state === 'live' ? 3.6 : 2.4, 0, Math.PI * 2); ctx.fill();
        if (p.state !== 'live') {
          const txt = p.state === 'gone' ? 'left the system' : `hit ${nm(p.state === 'hit1' ? SYSTEMS[this.sysKey].n1 : SYSTEMS[this.sysKey].n2)}`;
          label(ctx, txt, Math.min(Math.max(x, 50), this.w - 50), Math.min(Math.max(y - 10, 16), this.h - 8),
            { color: COLORS.red, size: compact ? 11.5 : 13, align: 'center' });
        } else if (p.tag) {
          label(ctx, p.tag.kind === 'eigen' ? `seeded on L${p.tag.pt[1]}’s unstable eigenvector` : 'Trojan, released at rest',
            x + 8, y + 14, { color: p.color, size: compact ? 11 : 12.5 });
        }
      }
      if (!this.probes.length && !this.drag) {
        // Left column under the contour legend. The right half of the canvas
        // carries the occupant labels (Greek/Trojan camps, JWST…), whose y is
        // data-driven, so no fixed caption can safely live there.
        label(ctx, compact ? 'click: drop a probe · drag: fling it' : 'click anywhere: drop a probe at rest in this frame  ·  drag: fling it',
          14, 124, { color: COLORS.yellow, size: compact ? 12 : 14, align: 'left' });
      }
    }

    // The honest force diagram. Three x-components at the focused collinear point:
    // gravity from each primary PLUS the centrifugal term — the one people forget.
    // Their sum is dOmega/dx, and it is zero. Nothing "cancels" gravity here; the
    // Sun still pulls hard, it is just exactly the pull needed to keep a body on a
    // 1-year circle at a radius where Kepler alone would demand a shorter year.
    drawForceBudget() {
      const { rc, ctx, h } = this;
      const which = this.focus === 'neck' ? 'L2' : 'L1';
      const p = this.pts[which];
      const x = p.x;
      const d1 = x + this.mu; const d2 = x - 1 + this.mu;
      const g1 = -((1 - this.mu) * d1) / Math.abs(d1) ** 3;
      const g2 = -(this.mu * d2) / Math.abs(d2) ** 3;
      const cen = x;
      const sum = g1 + g2 + cen; // = dOmega/dx, must be ~0
      const rows = [
        [`pull of ${nm(SYSTEMS[this.sysKey].n1)}`, g1, COLORS.yellow],
        [`pull of ${nm(SYSTEMS[this.sysKey].n2)}`, g2, COLORS.cyan],
        ['centrifugal (rotating frame)', cen, COLORS.pink],
        ['SUM = dΩ/dx', sum, COLORS.green],
      ];
      const maxA = Math.max(...rows.map((r) => Math.abs(r[1]))) || 1;
      const x0 = 16; const y0 = h - 118; const half = 66;
      rc.rectangle(x0 - 6, y0 - 20, half * 2 + 210, 108, opts(360, { stroke: COLORS.muted, strokeWidth: 1 }));
      label(ctx, `force budget at ${which} (x-components, non-dimensional)`, x0, y0 - 6, { color: COLORS.ink, size: 12.5 });
      rows.forEach((r, i) => {
        const yy = y0 + 12 + i * 20;
        const len = (r[1] / maxA) * half;
        ctx.strokeStyle = r[2];
        ctx.lineWidth = i === 3 ? 3 : 6;
        ctx.beginPath();
        ctx.moveTo(x0 + half, yy);
        ctx.lineTo(x0 + half + (Math.abs(len) < 1 ? Math.sign(len) : len), yy);
        ctx.stroke();
        label(ctx, `${r[0]}: ${i === 3 ? sci(r[1], 1) : fmtNum(r[1], 4)}`, x0 + half * 2 + 12, yy + 4,
          { color: r[2], size: 11.5 });
      });
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0 + half, y0 + 4); ctx.lineTo(x0 + half, y0 + 80); ctx.stroke();
    }
  }

  A.register('lagrange', LagrangeSim);
})();
