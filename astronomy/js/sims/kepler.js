// Sim 8 — Kepler's three laws.
//
// Three views, each a MEASUREMENT rather than a statement of the law.
//
// 1 "the ellipse"  — drag the perihelion / aphelion handles to set a and e on
//   the canvas. Both foci are drawn, the Sun in one of them, the other marked
//   empty. The panel at the bottom does the historical test: a CIRCLE of the
//   same a with the Sun offset by ae and an equant point ae on the other side
//   (Ptolemy's construction with the "bisected eccentricity" Kepler used) is
//   swept at uniform angular rate about the equant, and we scan mean anomaly
//   for the largest heliocentric-longitude difference from the true ellipse.
//   For Mars (e = 0.09341) that comes out 8.96 arcminutes, peaking at the
//   octants — Kepler's eight minutes, recomputed instead of quoted.
//
// 2 "equal areas"  — the planet is integrated with velocity Verlet from
//   Newtonian gravity alone (no analytic orbit anywhere). Positions are
//   sampled at equal time intervals; each wedge's area is accumulated as a
//   shoelace/triangle sum with the Sun as pivot, A = ½Σ(xᵢyᵢ₊₁ − xᵢ₊₁yᵢ).
//   The 12 measured areas, their spread, and the total against πab are all
//   printed. The leftover spread is the polygon's chord error — it always
//   UNDER-measures and falls as (samples)⁻², which the samples slider shows.
//
// 3 "T² ∝ a³"      — log-log scatter of the eight real planets (NASA mean
//   orbital elements + sidereal periods), the exact 3/2 line, an ordinary
//   least-squares slope computed live from the data, and a residual panel
//   comparing each planet's offset with the Newtonian mass-term prediction
//   −½log₁₀(1+m/M). Drag a hypothetical planet along the a-axis to read its
//   predicted period.
//
// Everything is computed in SI from GM_sun (JPL DE440) — the *measured*
// quantity — rather than from G·M_sun, because G is known to only 2.2×10⁻⁵.
// Hand checks that must hold (all verified against NASA/JPL published values):
//   a = 1 AU, massless      → T = 365.256898 d (NOT 365.25)
//   Mercury (a, e above)    → v_p = 58.976 km/s, v_a = 38.859 km/s  (NASA: 58.97 / 38.86)
//   Halley  (e = 0.9679360) → v_p/v_a = 61.375 = (1+e)/(1−e)
//   8 planets, OLS on log–log → slope 1.4998265, R² = 0.99999999
//   Jupiter mass term       → ΔT = −2.068 d = −4.7705×10⁻⁴ of the period

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, FONT_HAND, label, doodleArrow, notToScale,
    slider, buttonRow, actionButton, setReadout, verletStep,
    AU, YEAR, DAY, fmtNum, fmtTime, sci,
  } = A;

  // Heliocentric gravitational constant, JPL planetary ephemeris DE440.
  // Known to ~10 significant figures; M_sun = GM/G only to ~5, because of G.
  const GM_SUN = 1.32712440041279419e20;   // m³ s⁻²
  const NW = 12;                            // wedges per orbit in view 2
  const RAD2ARCMIN = (180 / Math.PI) * 60;
  // Residual panel: how close a planet's measured offset must sit to the
  // mass-term prediction to be called agreement. 1×10⁻⁴ dex ≈ 0.023% in period.
  // This is a deliberately honest cut: Jupiter (7×10⁻⁵) and Saturn (2×10⁻⁵)
  // pass, so the mass term is visible where it is biggest — while Uranus
  // (3.1×10⁻⁴) and Neptune (2.5×10⁻⁴) fail, because their offsets are 20–30×
  // their own mass terms and come from mutual perturbations and the element
  // set's own precision, NOT from G(M+m). Drawing them red is the point.
  const AGREE = 1e-4;                       // dex
  const MOON_ARCMIN = 31.1;                 // Moon's mean apparent diameter

  // NASA NSSDC planetary fact sheets: a and e from "Mean Orbital Elements
  // (J2000)", T is the SIDEREAL orbit period from "Orbital parameters".
  // Those same pages carry a top-table semimajor axis that disagrees with the
  // mean elements by up to 0.37% (Saturn) — mixing the two sets injects fake
  // scatter ten times bigger than the physics below, so it is never used.
  // gm is the DE440 system GM in km³ s⁻² (Earth's includes the Moon).
  // [name, tag, a/AU, T/days, e, gm]
  const PLANETS = [
    ['Mercury', 'Me', 0.38709893, 87.969, 0.20563069, 22031.868551],
    ['Venus', 'V', 0.72333199, 224.701, 0.00677323, 324858.592],
    ['Earth', 'E', 1.00000011, 365.256, 0.01671022, 403503.235625],
    ['Mars', 'Ma', 1.52366231, 686.980, 0.09341233, 42828.375816],
    ['Jupiter', 'J', 5.20336301, 4332.589, 0.04839266, 126712764.1],
    ['Saturn', 'S', 9.53707032, 10755.699, 0.05415060, 37940584.8418],
    ['Uranus', 'U', 19.19126393, 30685.400, 0.04716771, 5794556.4],
    ['Neptune', 'N', 30.06896348, 60189.018, 0.00858587, 6836527.100580],
  ];
  // Ceres and Halley come from the JPL Small-Body Database (full precision);
  // Pluto from the NSSDC fact sheet. They stretch the x-range from 1.4 to 1.9
  // dex and the slope barely moves — the most persuasive version of the plot.
  const EXTRAS = [
    ['Ceres', 'Ce', 2.765552595034094, 1679.853119758983, 0.07969229514816586, 62.6284],
    ['Pluto', 'Pl', 39.48168677, 90560, 0.24880766, 975.5],
    ['Halley', '1P', 17.92863504856923, 27728.04608790421, 0.9679359956953211, 0],
  ];

  const PRESETS = {
    mercury: { a: 0.38709893, e: 0.20563069, name: 'Mercury' },
    earth: { a: 1.00000011, e: 0.01671022, name: 'Earth' },
    mars: { a: 1.52366231, e: 0.09341233, name: "Mars — Kepler's war" },
    halley: { a: 17.92863504856923, e: 0.9679359956953211, name: "Halley's comet (1P)" },
  };

  const CIT_NOVA = '1609 Kepler - Astronomia Nova Aitiologetos, seu Physica Coelestis, tradita commentariis de motibus stellae Martis, ex observationibus G. V. Tychonis Brahe (New Astronomy, Based upon Causes, or Celestial Physics, Treated by Means of Commentaries on the Motions of the Star Mars, from the Observations of Tycho Brahe)';
  const CIT_HARM = '1619 Kepler - Harmonices Mundi Libri V (The Five Books of the Harmony of the World)';
  const CIT_TYCHO = '1602 Brahe - Astronomiae Instauratae Progymnasmata (Introductory Exercises Toward the Restoration of Astronomy)';
  const CIT_PRINCIPIA = '1687 Newton - Philosophiae Naturalis Principia Mathematica (Mathematical Principles of Natural Philosophy)';
  const CIT_HALLEY = '1705 Halley - Astronomiae Cometicae Synopsis (A Synopsis of the Astronomy of Comets)';

  /* ---------------- small numerical helpers ---------------- */

  const period = (aM) => 2 * Math.PI * Math.sqrt((aM * aM * aM) / GM_SUN); // s

  // Kepler's equation M = E − e·sinE by Newton iteration.
  function eccAnomaly(M, e) {
    let E = e < 0.8 ? M : Math.PI;
    for (let i = 0; i < 60; i++) {
      const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-13) break;
    }
    return E;
  }

  function trueAnomaly(M, e) {
    const E = eccAnomaly(M, e);
    return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  }

  // THE 8-ARCMINUTE TEST, computed.
  // Rival model: a circle of radius a centred at C, the Sun at (−ae, 0), an
  // equant point Q at (+ae, 0), the planet on the circle moving so that its
  // angle *seen from Q* grows uniformly. Apsidal distances then match the
  // ellipse exactly — it is the longitudes that give it away. Returns the
  // largest |Δλ| in radians, scanned over one revolution.
  // Checks: e = 0.01671 → 0.25′;  0.09341 → 8.96′ at M ≈ 45°;  0.20563 → 53.7′.
  function circleResidual(e) {
    let worst = 0;
    const N = 1440;
    for (let i = 0; i < N; i++) {
      const M = (i / N) * Math.PI * 2;
      const dir = [-Math.cos(M), Math.sin(M)];
      // ray from Q hits the unit circle: |Q + t·dir| = 1, take t > 0
      const b = 2 * (e * dir[0]);
      const c = e * e - 1;
      const t = (-b + Math.sqrt(b * b - 4 * c)) / 2;
      const px = e + t * dir[0];
      const py = t * dir[1];
      // longitude seen from the Sun, measured from the perihelion direction (−x)
      const nuCircle = Math.atan2(py, -(px + e));
      let d = nuCircle - trueAnomaly(M, e);
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > Math.abs(worst)) worst = d;
    }
    return Math.abs(worst);
  }

  // Verlet substeps between recorded samples. A near-parabolic orbit whips
  // through perihelion, so the step count has to grow as (1−e) shrinks or the
  // energy visibly drifts. Measured over one full orbit: Mercury holds
  // |ΔE/E| ≈ 3×10⁻¹⁴ at 80 substeps, Halley needs ~1200 to reach 10⁻⁶.
  const substepsFor = (e) =>
    Math.max(8, Math.min(2500, Math.round(80 * Math.pow(0.8 / Math.max(1 - e, 0.02), 0.85))));

  // Ordinary least squares on [x, y] pairs.
  function fitLine(pts) {
    const n = pts.length;
    let mx = 0; let my = 0;
    for (const p of pts) { mx += p[0]; my += p[1]; }
    mx /= n; my /= n;
    let sxy = 0; let sxx = 0;
    for (const p of pts) { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) ** 2; }
    const m = sxy / sxx;
    const b = my - m * mx;
    let ssr = 0; let sst = 0;
    for (const p of pts) { ssr += (p[1] - (m * p[0] + b)) ** 2; sst += (p[1] - my) ** 2; }
    return { m, b, r2: 1 - ssr / sst, rms: Math.sqrt(ssr / n) };
  }

  const fmtAU = (v, d = 4) => `${fmtNum(v, d)} AU`;

  class KeplerSim extends Sim {
    init() {
      this.view = 'ellipse';
      this.aAU = PRESETS.mars.a;
      this.ecc = PRESETS.mars.e;
      this.presetKey = 'mars';
      this.M1 = 0;                 // mean anomaly of the view-1 planet
      this.samples = 64;           // polygon samples per wedge (view 2)
      this.orbitSeconds = 14;
      this.dataset = '8';
      this.hypoA = 3.0;            // hypothetical planet, AU (view 3)
      this.drag = null;
      this.resid = circleResidual(this.ecc);
      this.buildControls();
      this.bindPointer();
      this.resetSweep();
      this.updateReadout();
      this.cite(CIT_NOVA);
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.viewBtns = buttonRow(c, [
        { label: '1 · the ellipse', value: 'ellipse' },
        { label: '2 · equal areas', value: 'areas' },
        { label: '3 · T² ∝ a³', value: 'third' },
      ], {
        initial: 'ellipse',
        onSelect: (v) => {
          this.view = v;
          if (v === 'areas') this.resetSweep();
          this.cite(v === 'third' ? CIT_HARM : CIT_NOVA);
          this.syncControls();
          this.updateReadout();
          this.poke();
        },
      });

      this.presetBtns = buttonRow(c, [
        { label: 'Mercury', value: 'mercury' },
        { label: 'Earth', value: 'earth' },
        { label: 'Mars', value: 'mars' },
        { label: 'Halley', value: 'halley' },
      ], {
        initial: 'mars',
        onSelect: (v) => {
          const p = PRESETS[v];
          this.presetKey = v;
          this.setOrbit(p.a, p.e);
          if (v === 'halley') this.cite(CIT_HALLEY);
          else if (v === 'mars') this.cite(CIT_TYCHO);
          this.poke();
        },
      });

      this.aSlider = slider(c, {
        label: 'semi-major axis a',
        min: 0.05, max: 45, value: this.aAU, log: true,
        format: (v) => `${fmtNum(v, v < 1 ? 3 : 2)} AU`,
        oninput: (v) => { this.presetKey = null; this.setOrbit(v, this.ecc); this.poke(); },
      });
      this.eSlider = slider(c, {
        label: 'eccentricity e',
        min: 0, max: 0.985, step: 0.0005, value: this.ecc,
        format: (v) => fmtNum(v, 4),
        oninput: (v) => { this.presetKey = null; this.setOrbit(this.aAU, v); this.poke(); },
      });
      this.sampleSlider = slider(c, {
        label: 'position samples / wedge',
        min: 8, max: 256, value: this.samples, log: true,
        format: (v) => fmtNum(Math.round(v), 0),
        oninput: (v) => { this.samples = Math.round(v); this.resetSweep(); this.poke(); },
      });
      this.speedSlider = slider(c, {
        label: 'one orbit takes',
        min: 4, max: 60, value: this.orbitSeconds, log: true,
        format: (v) => `${fmtNum(v, 0)} s`,
        oninput: (v) => { this.orbitSeconds = v; },
      });
      this.dataBtns = buttonRow(c, [
        { label: 'the 8 planets', value: '8' },
        { label: '+ Ceres, Pluto, Halley', value: '11' },
      ], {
        initial: '8',
        onSelect: (v) => {
          this.dataset = v;
          // Widening the data set is where the residual panel earns its keep:
          // the deviations are read against T² = 4π²a³/G(M+m), which is Newton's
          // correction to Kepler's law, not Kepler's own statement of it.
          if (!this._citedNewton) {
            this._citedNewton = true;
            this.cite(CIT_PRINCIPIA);
          }
          this.updateReadout();
          this.poke();
        },
      });
      this.restartBtn = actionButton(c, 'sweep again', () => { this.resetSweep(); this.poke(); });

      this.syncControls();
    }

    // Controls are built once; each view shows only the ones it uses.
    syncControls() {
      const show = (api, on) => { if (api) api.el.style.display = on ? '' : 'none'; };
      const orbit = this.view === 'ellipse' || this.view === 'areas';
      show(this.presetBtns, orbit);
      show(this.aSlider, orbit);
      show(this.eSlider, orbit);
      show(this.sampleSlider, this.view === 'areas');
      show(this.speedSlider, this.view === 'areas');
      show(this.dataBtns, this.view === 'third');
      // "sweep again" is the only action button, so its whole row can go with it
      const on = this.view === 'areas' ? '' : 'none';
      this.restartBtn.style.display = on;
      if (this.restartBtn.parentElement) this.restartBtn.parentElement.style.display = on;
    }

    setOrbit(aAU, e) {
      this.aAU = Math.max(0.05, Math.min(45, aAU));
      this.ecc = Math.max(0, Math.min(0.985, e));
      this.aSlider.set(this.aAU);
      this.eSlider.set(this.ecc);
      this.resid = circleResidual(this.ecc);
      if (this.view === 'areas') this.resetSweep();
      this.updateReadout();
    }

    /* ---------------- pointer: drag the orbit, drag the test planet ------- */

    bindPointer() {
      const cv = this.canvasEl;
      const pos = (e) => {
        const r = cv.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };
      cv.addEventListener('pointerdown', (e) => {
        const [x, y] = pos(e);
        if (this.view === 'ellipse' && this.geo1) {
          const g = this.geo1;
          const dp = Math.hypot(x - g.xPeri, y - g.cy);
          const da = Math.hypot(x - g.xApo, y - g.cy);
          if (Math.min(dp, da) > 40) return;
          // freeze the layout for the whole drag: the view auto-fits to the
          // orbit, so a live refit would make the handle crawl away from the
          // finger. It snaps to the new fit on release.
          this.drag = { kind: dp <= da ? 'peri' : 'apo', g };
        } else if (this.view === 'third' && this.geo3) {
          if (y > this.geo3.yBase + 30) return;
          this.drag = { kind: 'hypo', g: this.geo3 };
          this.setHypoFromX(x);
        } else return;
        try { cv.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
        this.poke();
      });
      cv.addEventListener('pointermove', (e) => {
        if (!this.drag) return;
        const [x] = pos(e);
        if (this.drag.kind === 'hypo') this.setHypoFromX(x);
        else this.dragApsis(x);
        this.poke();
      });
      const finish = () => { if (this.drag) { this.drag = null; this.poke(); } };
      cv.addEventListener('pointerup', finish);
      cv.addEventListener('pointercancel', finish);
    }

    // Perihelion sits left of the Sun, aphelion right. Dragging either one
    // rewrites (a, e) straight from the two focal distances:
    //   a = (r_p + r_a)/2 ,  e = (r_a − r_p)/(r_a + r_p).
    dragApsis(x) {
      const g = this.drag.g;
      let rp = (g.xSun - g.xPeri) / g.px;
      let ra = (g.xApo - g.xSun) / g.px;
      if (this.drag.kind === 'peri') rp = Math.max(0.01, (g.xSun - x) / g.px);
      else ra = Math.max(0.01, (x - g.xSun) / g.px);
      if (ra < rp) { const t = ra; ra = rp; rp = t; }
      this.presetKey = null;
      this.setOrbit((rp + ra) / 2, (ra - rp) / (ra + rp));
    }

    setHypoFromX(x) {
      const g = this.geo3;
      const la = g.lx0 + ((x - g.x0) / (g.x1 - g.x0)) * (g.lx1 - g.lx0);
      // keep the marker inside the plotted decade range so its caption has a home
      this.hypoA = Math.max(10 ** g.lx0, Math.min(10 ** g.lx1, 10 ** la));
      this.updateReadout();
    }

    /* ---------------- view 2: integrate, then measure ---------------- */

    resetSweep() {
      const a = this.aAU * AU;
      const e = this.ecc;
      const T = period(a);
      const S = this.samples;
      const K = substepsFor(e);
      const steps = NW * S * K;
      const rp = a * (1 - e);
      const vp = Math.sqrt((GM_SUN / a) * ((1 + e) / (1 - e)));  // vis-viva at perihelion
      const body = { x: rp, y: 0, vx: 0, vy: vp };
      this.sweep = {
        a, e, T, S, K, steps, h: T / steps, body,
        i: 0, n: 0, px: rp, py: 0, A: 0, arc: 0,
        poly: [[rp, 0]], wedges: [],
        rMax: rp, vMin: vp, vMax: vp, vAtRMax: vp,
        E0: 0.5 * vp * vp - GM_SUN / rp,
        drift: 0, closure: 0, done: false,
      };
      this._subAcc = 0;
      // A paused sim (reduced motion) must still show a finished, readable
      // frame — fast-forward the whole orbit, with a ceiling so the worst-case
      // setting (256 samples × 2500 substeps × 12 wedges) cannot freeze a tab.
      if (!this.playing && this.view === 'areas') this.integrate(Math.min(steps, 1.2e6));
    }

    accel(X, Y) {
      const r2 = X * X + Y * Y;
      const f = -GM_SUN / (r2 * Math.sqrt(r2));
      return [f * X, f * Y];
    }

    integrate(n) {
      const s = this.sweep;
      const acc = (X, Y) => this.accel(X, Y);
      for (let k = 0; k < n && s.i < s.steps; k++) {
        verletStep(s.body, acc, s.h);
        s.i++;
        if (s.i % s.K === 0) this.recordSample();
      }
      if (s.i >= s.steps && !s.done) {
        s.done = true;
        const b = s.body;
        const E1 = 0.5 * (b.vx * b.vx + b.vy * b.vy) - GM_SUN / Math.hypot(b.x, b.y);
        s.drift = (E1 - s.E0) / Math.abs(s.E0);
        // after exactly one formula period, how far from the launch point?
        s.closure = Math.hypot(b.x - s.a * (1 - s.e), b.y) / (s.a * (1 - s.e));
        this.updateReadout();
      }
    }

    // Every number in view 2 comes from here. No analytic area is ever used:
    // the wedge area is the signed shoelace sum of the triangles
    // (Sun, sample i, sample i+1), which is exactly the polygon the sim draws.
    recordSample() {
      const s = this.sweep;
      const b = s.body;
      s.A += 0.5 * (s.px * b.y - b.x * s.py);
      s.arc += Math.hypot(b.x - s.px, b.y - s.py);
      s.px = b.x; s.py = b.y;
      s.poly.push([b.x, b.y]);
      s.n++;
      const r = Math.hypot(b.x, b.y);
      const v = Math.hypot(b.vx, b.vy);
      if (r > s.rMax) { s.rMax = r; s.vAtRMax = v; }
      if (v > s.vMax) s.vMax = v;
      if (v < s.vMin) s.vMin = v;
      if (s.n % s.S === 0) {
        s.wedges.push({ poly: s.poly, area: s.A, arc: s.arc });
        s.poly = [[b.x, b.y]];
        s.A = 0; s.arc = 0;
        this.updateReadout();
      }
    }

    sweepStats() {
      const s = this.sweep;
      const ws = s.wedges;
      if (!ws.length) return null;
      let sum = 0; let mn = Infinity; let mx = -Infinity;
      let amn = Infinity; let amx = -Infinity;
      for (const w of ws) {
        sum += w.area;
        if (w.area < mn) mn = w.area;
        if (w.area > mx) mx = w.area;
        if (w.arc < amn) amn = w.arc;
        if (w.arc > amx) amx = w.arc;
      }
      const mean = sum / ws.length;
      return {
        n: ws.length, mean, sum, spread: (mx - mn) / mean, arcRatio: amx / amn,
        vsExact: sum / (Math.PI * s.a * s.a * Math.sqrt(1 - s.e * s.e)),
      };
    }

    update(dt) {
      if (this.view === 'ellipse') {
        // exact Kepler-equation motion — fast at perihelion, slow at aphelion,
        // which is the area law showing up before we have measured it
        this.M1 = (this.M1 + dt * 0.7) % (Math.PI * 2);
      } else if (this.view === 'areas') {
        const s = this.sweep;
        if (!s || s.done) return;
        this._subAcc += dt * (s.steps / this.orbitSeconds);
        const n = Math.floor(this._subAcc);
        this._subAcc -= n;
        if (n > 0) this.integrate(Math.min(n, 200000));
      }
    }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.view === 'ellipse') this.readEllipse();
      else if (this.view === 'areas') this.readAreas();
      else this.readThird();
    }

    orbitTitle() {
      const p = this.presetKey ? PRESETS[this.presetKey].name : 'your own orbit';
      return `${p} — a = ${fmtAU(this.aAU)}, e = ${fmtNum(this.ecc, 4)}`;
    }

    readEllipse() {
      const a = this.aAU;
      const e = this.ecc;
      const bOverA = Math.sqrt(1 - e * e);
      const cKm = (a * e * AU) / 1e3;
      const flatKm = (a * (1 - bOverA) * AU) / 1e3;
      const T = period(a * AU);
      const arcmin = this.resid * RAD2ARCMIN;
      setReadout(this.readoutEl, [
        [[this.orbitTitle(), 'yellow'], ['   ·  drag the two handles to reshape it', null]],
        [
          ['b/a = √(1−e²) = ', null], [fmtNum(bOverA, 6), 'green'],
          [' — the oval is only ', null], [`${fmtNum((1 - bOverA) * 100, 3)}%`, 'green'],
          [' flatter than a circle (', null], [`${sci(flatKm, 2)} km`, null], ['). ', null],
          ['The visible giveaway is the Sun sitting ', null],
          [`c = ae = ${sci(cKm, 2)} km`, 'orange'], [' off-centre.', null],
        ],
        [
          ['perihelion a(1−e) = ', null], [fmtAU(a * (1 - e)), 'cyan'],
          ['   aphelion a(1+e) = ', null], [fmtAU(a * (1 + e)), 'pink'],
          ['   r₁ + r₂ = 2a = ', null], [fmtAU(2 * a), 'green'],
          [' at every single point of the curve', null],
        ],
        [
          ['period T = 2π√(a³/GM☉) = ', null], [fmtTime(T, 3), 'yellow'],
          [' — slide e and watch it not move. e is nowhere in that formula.', null],
        ],
        [
          ['the circle test: ', 'orange'],
          ['a circle + equant with this eccentricity misses the ellipse\'s longitude by up to ', null],
          [arcmin >= 90 ? `${fmtNum(arcmin / 60, 2)}°` : `${fmtNum(arcmin, 2)}′`, 'red'],
          ['. Tycho Brahe\'s naked eye was good to 1–2′.', null],
        ],
      ]);
    }

    readAreas() {
      const s = this.sweep;
      const st = this.sweepStats();
      const a = this.aAU;
      const e = this.ecc;
      const dtWedge = s.T / NW;
      const lines = [[
        [this.orbitTitle(), 'yellow'],
        [`   ·  ${NW} wedges, each swept in exactly T/${NW} = ${fmtTime(dtWedge, 2)}`, null],
      ]];
      if (!st) {
        lines.push([['integrating… (velocity Verlet, Newtonian gravity only — nothing about areas is assumed)', 'muted']]);
      } else {
        const auu = AU * AU;
        lines.push([
          [`measured wedge areas (${st.n}/${NW} done): mean = `, null],
          [`${sci(st.mean / auu, 4)} AU²`, 'green'],
          ['   spread (max−min)/mean = ', null],
          [`${sci(st.spread * 100, 3)} %`, 'cyan'],
          ['   Σ areas / πab = ', null],
          [fmtNum(st.vsExact, 6), 'green'],
        ]);
        lines.push([
          ['same areas, wildly different journeys: the longest wedge\'s path is ', null],
          [`${fmtNum(st.arcRatio, 3)}×`, 'orange'],
          [' the shortest — measured arc lengths, not a formula.', null],
        ]);
      }
      const vTheory = (1 + e) / (1 - e);
      lines.push([
        ['speeds from the integration: v_max/v_min = ', null],
        [fmtNum(s.vMax / s.vMin, 5), 'pink'],
        ['   vis-viva says (1+e)/(1−e) = ', null], [fmtNum(vTheory, 5), 'cyan'],
        [`   (${fmtNum(s.vMax / 1e3, 3)} → ${fmtNum(s.vMin / 1e3, 3)} km/s)`, null],
      ]);
      lines.push([
        ['measured aphelion r_max = ', null], [fmtAU(s.rMax / AU), 'pink'],
        ['   formula a(1+e) = ', null], [fmtAU(a * (1 + e)), 'cyan'],
        s.done
          ? ['   ·  after exactly one T the orbit closed to ', null]
          : ['   ·  still integrating…', null],
      ]);
      if (s.done) {
        lines[lines.length - 1].push([sci(s.closure * 100, 2) + ' %', 'green']);
        lines[lines.length - 1].push([`, energy drift ΔE/E = ${sci(Math.abs(s.drift), 1)}`, null]);
      }
      lines.push([
        ['honest small print: ', 'muted'],
        ['the leftover spread is the polygon, not the physics — chords cut inside the arc so every wedge is measured slightly SMALL, worst where the planet swings fastest. Raise the samples slider and the spread falls as samples⁻².', 'muted'],
      ]);
      setReadout(this.readoutEl, lines);
    }

    activeData() {
      return this.dataset === '11' ? PLANETS.concat(EXTRAS) : PLANETS;
    }

    readThird() {
      const rows = this.activeData();
      const pts = rows.map((p) => [Math.log10(p[2]), Math.log10(p[3] / (YEAR / DAY))]);
      const fit = fitLine(pts);
      const hypoT = period(this.hypoA * AU);
      // Jupiter's mass term, straight from the two-body period formula:
      // T(M+m)/T(M) = 1/√(1+m/M). Nothing here is fitted.
      const jup = PLANETS[4];
      const mOverM = (jup[5] * 1e9) / GM_SUN;
      const shift = 1 / Math.sqrt(1 + mOverM) - 1;
      const aJ = jup[2] * AU;
      const dTdays = (period(aJ) * shift) / DAY;
      setReadout(this.readoutEl, [
        [
          [`least-squares slope of log T vs log a (${rows.length} bodies): `, null],
          [fmtNum(fit.m, 6), 'green'],
          ['   Kepler\'s "sesquialterate" 3/2 = ', null], ['1.5', 'cyan'],
          ['   R² = ', null], [fmtNum(fit.r2, 9), 'green'],
          ['   RMS residual = ', null], [`${sci(fit.rms, 2)} dex`, null],
        ],
        [
          ['it is 1.4999, not 1.5000, and that is the interesting part. ', null],
          ['Jupiter\'s mass term: ', 'orange'],
          [`T shrinks by ${sci(Math.abs(shift), 4)} of itself = ${fmtNum(Math.abs(dTdays), 3)} days`, 'orange'],
          [' because T² = 4π²a³/G(M+m), not 4π²a³/GM.', null],
        ],
        [
          ['Uranus and Neptune also sit low — but ~20× lower than their mass terms allow. That part is not gravity, it is what you get from fitting mean elements to planets that shove each other around.', 'muted'],
        ],
        [
          ['your test planet: ', 'yellow'], ['a = ', null], [fmtAU(this.hypoA, 3), 'yellow'],
          ['  →  T = 2π√(a³/GM☉) = ', null], [fmtTime(hypoT, 4), 'pink'],
          [` (${fmtNum(hypoT / DAY, 1)} days)`, null],
          ['   ·  drag it along the axis', null],
        ],
      ]);
    }

    /* ---------------- rendering ---------------- */

    render() {
      if (this.view === 'ellipse') this.renderEllipse();
      else if (this.view === 'areas') this.renderAreas();
      else this.renderThird();
    }

    // Keep a centred label inside the canvas — on a comet-like orbit the Sun
    // sits almost against the left edge, and its caption would run off.
    clampCentre(text, x, size) {
      const ctx = this.ctx;
      ctx.font = `${size}px ${FONT_HAND}`;
      const half = ctx.measureText(text).width / 2 + 6;
      return Math.max(half, Math.min(this.w - half, x));
    }

    // Fit the whole orbit (span 2a wide, 2b tall) into a box.
    // With fitCircle, the grey "same a" comparison circle (radius a, so taller
    // than the ellipse by 1/√(1−e²)) is included in the fit — but only while it
    // is still close enough to the ellipse to be worth drawing at all. Past
    // e ≈ 0.75 it would dwarf the orbit and spill off the canvas, so it goes.
    layout(x0, y0, bw, bh, fitCircle) {
      const a = this.aAU;
      const b = a * Math.sqrt(1 - this.ecc * this.ecc);
      const showCircle = fitCircle && a <= 1.5 * b;
      const px = Math.min(bw / (2 * a), bh / (2 * (showCircle ? a : b)));
      const cx = x0 + bw / 2;
      const cy = y0 + bh / 2;
      return {
        px, cx, cy, a, b, showCircle,
        xSun: cx - a * this.ecc * px,
        xEmpty: cx + a * this.ecc * px,
        xPeri: cx - a * px,
        xApo: cx + a * px,
      };
    }

    renderEllipse() {
      const { rc, ctx, w, h } = this;
      const compact = w < 560;
      // one explicit vertical stack, so nothing collides at 375 px:
      // orbit box · caption · scale bar · the arcminute ruler
      const panelY = h - (compact ? 50 : 74);
      const capY = panelY - 52;
      const barY = panelY - 28;
      const g = this.drag && this.drag.g ? this.drag.g : this.layout(24, 34, w - 48, capY - 50, true);
      this.geo1 = g;
      const { px, cx, cy, a, b, xSun, xEmpty, xPeri, xApo, showCircle } = g;

      // a perfect circle of the same a, for comparison — for Earth you cannot
      // tell the two curves apart, which is the whole point
      if (showCircle) {
        rc.circle(cx, cy, 2 * a * px, opts(801, {
          stroke: COLORS.muted, strokeWidth: 1.1, strokeLineDash: [5, 7],
        }));
      }
      rc.ellipse(cx, cy, 2 * a * px, 2 * b * px, opts(802, { stroke: COLORS.green, strokeWidth: 2.2 }));

      // the two foci
      rc.circle(xSun, cy, 22, opts(803, {
        stroke: COLORS.yellow, strokeWidth: 2, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 1,
      }));
      const k = 7;
      rc.line(xEmpty - k, cy - k, xEmpty + k, cy + k, opts(804, { stroke: COLORS.muted, strokeWidth: 1.6 }));
      rc.line(xEmpty - k, cy + k, xEmpty + k, cy - k, opts(805, { stroke: COLORS.muted, strokeWidth: 1.6 }));

      // the planet, moving on the exact Kepler solution
      const E = eccAnomaly(this.M1, this.ecc);
      const pxP = cx + (a * (Math.cos(E) - this.ecc)) * px;
      const pyP = cy - b * Math.sin(E) * px;
      const r1 = a * (1 - this.ecc * Math.cos(E));
      const r2 = 2 * a - r1;
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = COLORS.cyan;
      ctx.beginPath(); ctx.moveTo(xSun, cy); ctx.lineTo(pxP, pyP); ctx.stroke();
      ctx.strokeStyle = COLORS.pink;
      ctx.beginPath(); ctx.moveTo(xEmpty, cy); ctx.lineTo(pxP, pyP); ctx.stroke();
      ctx.fillStyle = COLORS.green;
      ctx.beginPath(); ctx.arc(pxP, pyP, 5, 0, Math.PI * 2); ctx.fill();

      // handles
      for (const [hx, col, txt, dist] of [
        [xPeri, COLORS.cyan, 'perihelion', a * (1 - this.ecc)],
        [xApo, COLORS.pink, 'aphelion', a * (1 + this.ecc)],
      ]) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(hx, cy, 6, 0, Math.PI * 2); ctx.fill();
        rc.circle(hx, cy, 22, opts(806 + (hx === xPeri ? 0 : 1), { stroke: col, strokeWidth: 1.2, strokeLineDash: [3, 4] }));
        label(ctx, `${txt} ${fmtNum(dist, 3)} AU`, hx, cy + 34, {
          color: col, size: compact ? 11 : 13, align: hx === xPeri ? 'left' : 'right',
        });
      }

      // For a near-circular orbit the two foci nearly coincide, so the two
      // labels have to step apart or they overprint each other.
      const sz = compact ? 11.5 : 14;
      const sunTxt = 'the Sun — at ONE focus';
      const emptyTxt = compact ? 'empty focus — nothing there' : 'the other focus — nothing there';
      ctx.font = `${sz}px ${FONT_HAND}`;
      const near = xEmpty - xSun < (ctx.measureText(sunTxt).width + ctx.measureText(emptyTxt).width) / 2 + 14;
      label(ctx, sunTxt, this.clampCentre(sunTxt, xSun, sz), cy - 26, { color: COLORS.yellow, size: sz, align: 'center' });
      label(ctx, emptyTxt, this.clampCentre(emptyTxt, near ? cx : xEmpty, sz), cy - (near ? 46 : 26),
        { color: COLORS.muted, size: sz, align: 'center' });
      label(ctx, `r₁ = ${fmtNum(r1, 3)} + r₂ = ${fmtNum(r2, 3)}  →  2a = ${fmtNum(2 * a, 3)} AU`,
        w / 2, 22, { color: COLORS.green, size: compact ? 11.5 : 14.5, align: 'center' });
      label(ctx, showCircle
        ? 'dashed grey = a perfect circle of the same a'
        : 'too stretched for a same-a circle to fit on screen — that is the point',
      w / 2, capY, { color: COLORS.muted, size: compact ? 11 : 13, align: 'center' });

      // Scale bar in AU. The drawing auto-fits the orbit, so this is the only
      // honest statement of how big it really is — pick the largest 1/2/5×10ⁿ
      // that still fits comfortably.
      let barAU = 0;
      let barPx = 0;
      for (let ex = -3; ex <= 2; ex++) {
        for (const m of [1, 2, 5]) {
          const p = m * 10 ** ex * px;
          if (p >= 55 && p <= w * 0.42) { barAU = m * 10 ** ex; barPx = p; }
        }
      }
      if (barAU) {
        const bx = 20;
        rc.line(bx, barY, bx + barPx, barY, opts(808, { stroke: COLORS.yellow, strokeWidth: 1.6 }));
        rc.line(bx, barY - 5, bx, barY + 5, opts(809, { stroke: COLORS.yellow, strokeWidth: 1.6 }));
        rc.line(bx + barPx, barY - 5, bx + barPx, barY + 5, opts(810, { stroke: COLORS.yellow, strokeWidth: 1.6 }));
        label(ctx, `${fmtNum(barAU, 3)} AU`, bx + barPx + 8, barY + 4, { color: COLORS.yellow, size: 12.5 });
      }
      if (!compact) notToScale(rc, ctx, w - 74, 24);

      this.drawArcminPanel(panelY, compact);
    }

    // Kepler's eight minutes, drawn on a log ruler of arcminutes.
    drawArcminPanel(y, compact) {
      const { rc, ctx, w } = this;
      const x0 = 54;
      const x1 = w - 22;
      const LO = -1;   // 0.1′
      const HI = 3;    // 1000′
      const at = (arcmin) => x0
        + ((Math.log10(Math.min(Math.max(arcmin, 10 ** LO), 10 ** HI)) - LO) / (HI - LO)) * (x1 - x0);
      const val = this.resid * RAD2ARCMIN;

      label(ctx, compact ? 'could a circle fake it?' : 'could a circle have faked it?',
        x0, y - 6, { color: COLORS.ink, size: compact ? 11 : 13 });

      // Tycho's band, 1–2′
      ctx.fillStyle = 'rgba(105, 219, 124, 0.20)';
      ctx.fillRect(at(1), y + 4, at(2) - at(1), 16);
      rc.line(x0, y + 20, x1, y + 20, opts(811, { stroke: COLORS.muted, strokeWidth: 1.2 }));
      for (const t of [0.1, 1, 10, 100, 1000]) {
        const tx = at(t);
        rc.line(tx, y + 16, tx, y + 24, opts(812 + Math.round(Math.log10(t)) + 1, { stroke: COLORS.muted, strokeWidth: 1 }));
        label(ctx, `${t}′`, tx, y + 36, { color: COLORS.muted, size: 10.5, align: 'center' });
      }
      label(ctx, compact ? 'Tycho' : "Tycho's eye 1–2′", at(1.4), y + 16, { color: COLORS.green, size: 10.5, align: 'center' });
      if (!compact) {
        // an anchor for anyone who has never thought in arcminutes
        const mx0 = at(MOON_ARCMIN);
        ctx.strokeStyle = COLORS.muted;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(mx0, y + 16); ctx.lineTo(mx0, y + 24); ctx.stroke();
        label(ctx, `full Moon ${MOON_ARCMIN}′`, mx0, y + 36, { color: COLORS.muted, size: 10.5, align: 'center' });
      }
      // the 8′ mark
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(at(8), y + 2); ctx.lineTo(at(8), y + 26); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, "Kepler's 8′", at(8), y - 6, { color: COLORS.orange, size: compact ? 10 : 12, align: 'center' });
      // the live marker
      const mx = at(val);
      ctx.fillStyle = COLORS.red;
      ctx.beginPath();
      ctx.moveTo(mx, y + 20); ctx.lineTo(mx - 6, y + 8); ctx.lineTo(mx + 6, y + 8);
      ctx.closePath(); ctx.fill();
      if (!compact) {
        const vTxt = val >= 90 ? `${fmtNum(val / 60, 2)}°` : `${fmtNum(val, 2)}′`;
        ctx.font = `12.5px ${FONT_HAND}`;
        const vW = ctx.measureText(vTxt).width;
        label(ctx, vTxt, Math.min(mx + 9, w - vW - 6), y + 18, { color: COLORS.red, size: 12.5 });
      }
    }

    renderAreas() {
      const { rc, ctx, w, h } = this;
      const compact = w < 560;
      const barH = compact ? 84 : 92;
      const g = this.layout(24, 28, w - 48, h - barH - 46);
      const { px, cx, cy, xSun } = g;
      const s = this.sweep;
      const toX = (X) => xSun + (X / AU) * px;
      const toY = (Y) => cy - (Y / AU) * px;

      // every shaded wedge IS the polygon whose area was measured
      const fills = ['rgba(105,219,124,0.20)', 'rgba(4,217,255,0.16)'];
      const drawPoly = (poly, fill) => {
        if (poly.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(xSun, cy);
        for (const p of poly) ctx.lineTo(toX(p[0]), toY(p[1]));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = 'rgba(248,249,250,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      };
      s.wedges.forEach((wd, i) => drawPoly(wd.poly, fills[i % 2]));
      drawPoly(s.poly, 'rgba(255,212,59,0.30)');

      // Sun + planet
      rc.circle(xSun, cy, 20, opts(820, {
        stroke: COLORS.yellow, strokeWidth: 2, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 1,
      }));
      const bx = toX(s.body.x);
      const by = toY(s.body.y);
      ctx.fillStyle = COLORS.green;
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
      const v = Math.hypot(s.body.vx, s.body.vy);
      const vs = 46 / Math.max(s.vMax, 1);
      doodleArrow(rc, bx, by, bx + s.body.vx * vs, by - s.body.vy * vs, { color: COLORS.pink, seed: 821 });
      const vTxt = `${fmtNum(v / 1e3, 2)} km/s`;
      const vSize = compact ? 11 : 13;
      ctx.font = `${vSize}px ${FONT_HAND}`;
      const vW = ctx.measureText(vTxt).width;
      // drop the speed caption below the planet when it would sit on the header
      label(ctx, vTxt, Math.max(6, Math.min(bx + 10, w - vW - 6)), by - 10 < 36 ? by + 20 : by - 10,
        { color: COLORS.pink, size: vSize });

      label(ctx, `each shaded wedge = ${fmtTime(s.T / NW, 2)} of travel`, w / 2, 18, {
        color: COLORS.ink, size: compact ? 11.5 : 14.5, align: 'center',
      });

      // measured-area bars, deviations magnified
      const st = this.sweepStats();
      const y0 = h - barH;
      const bw = (w - 44) / NW;
      label(ctx, 'measured area of each wedge', 22, y0 + 10, { color: COLORS.muted, size: compact ? 10.5 : 12.5 });
      if (st) {
        let maxDev = 1e-12;
        for (const wd of s.wedges) maxDev = Math.max(maxDev, Math.abs(wd.area / st.mean - 1));
        const mag = 18 / maxDev;              // biggest deviation → 18 px
        const base = y0 + 52;
        const nomH = 22;
        for (let i = 0; i < NW; i++) {
          const wd = s.wedges[i];
          const x = 22 + i * bw;
          if (!wd) {
            rc.rectangle(x + 2, base - 6, bw - 5, 6, opts(830 + i, { stroke: '#555', strokeWidth: 1 }));
            continue;
          }
          const dev = wd.area / st.mean - 1;
          const hgt = nomH + dev * mag;
          rc.rectangle(x + 2, base - hgt, bw - 5, hgt, opts(830 + i, {
            stroke: i % 2 ? COLORS.cyan : COLORS.green, strokeWidth: 1.4,
            fill: i % 2 ? COLORS.cyan : COLORS.green, fillStyle: 'hachure', fillWeight: 0.6, hachureGap: 6,
          }));
        }
        ctx.strokeStyle = COLORS.muted;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(22, base - nomH); ctx.lineTo(w - 22, base - nomH); ctx.stroke();
        ctx.setLineDash([]);
        const magText = `differences magnified ×${sci(mag / nomH * 100, 1)} · spread ${sci(st.spread * 100, 2)}%`;
        if (compact) label(ctx, magText, w / 2, h - 6, { color: COLORS.yellow, size: 10, align: 'center' });
        else {
          label(ctx, magText, w - 22, y0 + 10, { color: COLORS.yellow, size: 12, align: 'right' });
          notToScale(rc, ctx, w - 78, base + 18);
        }
      }
    }

    renderThird() {
      const { rc, ctx, w, h } = this;
      const compact = w < 560;
      const rows = this.activeData();
      const pts = rows.map((p) => [Math.log10(p[2]), Math.log10(p[3] / (YEAR / DAY))]);
      const fit = fitLine(pts);

      const x0 = compact ? 34 : 48;
      const x1 = w - 16;
      const yTop = 24;
      const residH = compact ? 104 : 108;
      const yBase = h - residH - 34;
      const lx0 = -0.75;
      const lx1 = 1.85;
      const ly0 = -0.95;
      const ly1 = 2.65;
      const X = (l) => x0 + ((l - lx0) / (lx1 - lx0)) * (x1 - x0);
      const Y = (l) => yBase - ((l - ly0) / (ly1 - ly0)) * (yBase - yTop);
      this.geo3 = { x0, x1, lx0, lx1, yBase };

      this.cache.draw(`axes-${w}x${h}`, (gg) => gg.path(
        `M ${x0} ${yTop} L ${x0} ${yBase} L ${x1} ${yBase}`,
        opts(840, { stroke: COLORS.muted, strokeWidth: 1.6 }),
      ));
      // decade ticks, labelled in the units people actually think in
      for (const dec of [-0.5, 0, 0.5, 1, 1.5]) {
        const tx = X(dec);
        ctx.strokeStyle = COLORS.muted;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(tx, yBase); ctx.lineTo(tx, yBase + 5); ctx.stroke();
        label(ctx, fmtNum(10 ** dec, dec < 0 ? 2 : 1), tx, yBase + 16,
          { color: COLORS.muted, size: 10.5, align: 'center' });
      }
      for (const dec of [0, 1, 2]) {
        const ty = Y(dec);
        ctx.beginPath(); ctx.moveTo(x0 - 5, ty); ctx.lineTo(x0, ty); ctx.stroke();
        label(ctx, `${10 ** dec}`, x0 - 8, ty + 4, { color: COLORS.muted, size: 10.5, align: 'right' });
      }
      label(ctx, compact ? 'a (AU) →' : 'semi-major axis a  (AU) →', (x0 + x1) / 2, yBase + 32,
        { color: COLORS.ink, size: compact ? 11 : 13, align: 'center' });
      ctx.save();
      ctx.translate(compact ? 11 : 15, (yTop + yBase) / 2);
      ctx.rotate(-Math.PI / 2);
      label(ctx, compact ? 'T (yr) →' : 'period T  (years) →', 0, 0, { color: COLORS.ink, size: compact ? 11 : 13, align: 'center' });
      ctx.restore();

      // Kepler's exact 3/2 line (in AU and years its intercept is ~0)
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(X(lx0), Y(1.5 * lx0)); ctx.lineTo(X(lx1), Y(1.5 * lx1)); ctx.stroke();
      // the fitted line, on top — visually the same line, which is the point
      ctx.strokeStyle = COLORS.orange;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(X(lx0), Y(fit.m * lx0 + fit.b));
      ctx.lineTo(X(lx1), Y(fit.m * lx1 + fit.b));
      ctx.stroke();
      ctx.setLineDash([]);
      // legend in the empty top-left corner (above the line = nothing orbits there)
      label(ctx, 'Kepler: T² = a³, slope exactly 3/2', x0 + 8, yTop + 12,
        { color: COLORS.cyan, size: compact ? 10.5 : 12.5 });
      label(ctx, `measured fit to these ${rows.length}: slope ${fmtNum(fit.m, 5)}`, x0 + 8, yTop + 28,
        { color: COLORS.orange, size: compact ? 10.5 : 12.5 });

      // the real planets
      rows.forEach((p, i) => {
        const cxp = X(pts[i][0]);
        const cyp = Y(pts[i][1]);
        rc.circle(cxp, cyp, 9, opts(850 + i, { stroke: COLORS.green, strokeWidth: 1.8 }));
        // Halley sits almost exactly on top of Uranus (a differs by 7%), so
        // the extra bodies get their tags on the other side of the marker
        const below = i >= PLANETS.length;
        label(ctx, p[1], cxp + 8, cyp + (below ? 16 : -7), { color: COLORS.green, size: compact ? 10 : 12 });
      });

      // the reader's hypothetical planet
      const hl = Math.log10(this.hypoA);
      const hT = period(this.hypoA * AU) / YEAR;
      const hx = X(hl);
      const hy = Y(Math.log10(hT));
      ctx.strokeStyle = COLORS.yellow;
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx, yBase); ctx.lineTo(hx, hy); ctx.lineTo(x0, hy);
      ctx.stroke();
      ctx.setLineDash([]);
      rc.circle(hx, hy, 13, opts(870, { stroke: COLORS.yellow, strokeWidth: 2 }));
      // caption parked in the empty corner above the line — the dashed leader
      // already ties it to the marker, and nothing can overprint a planet tag
      label(ctx, `drag me: a = ${fmtNum(this.hypoA, 2)} AU → T = ${fmtNum(hT, 2)} yr`, x0 + 8, yTop + 46,
        { color: COLORS.yellow, size: compact ? 10.5 : 12.5 });

      this.drawResiduals(rows, pts, yBase + 52, residH - 62, x0, x1, lx0, lx1, compact);
    }

    // Residual panel: c = log T − (3/2) log a for each planet, against the
    // Newtonian mass-term prediction. The +8.2×10⁻⁶ offset in the prediction
    // is not a fudge — it is ½log₁₀(4π²/GM☉) in AU and Julian years, i.e. the
    // fact that "T² = a³" is itself only true to 3.8×10⁻⁵.
    drawResiduals(rows, pts, y0, hgt, x0, x1, lx0, lx1, compact) {
      const { rc, ctx } = this;
      const base = 0.5 * Math.log10((4 * Math.PI * Math.PI) / (GM_SUN * (YEAR * YEAR) / (AU * AU * AU)));
      const meas = pts.map((p) => p[1] - 1.5 * p[0]);
      const pred = rows.map((p) => base - 0.5 * Math.log10(1 + (p[5] * 1e9) / GM_SUN));
      let lo = 0; let hi = 0;
      for (const v of meas.concat(pred)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      const pad = (hi - lo) * 0.28 + 1e-6;   // keep dots clear of the captions
      lo -= pad; hi += pad;
      const X = (l) => x0 + ((l - lx0) / (lx1 - lx0)) * (x1 - x0);
      const Y = (v) => y0 + hgt - ((v - lo) / (hi - lo)) * hgt;

      ctx.strokeStyle = COLORS.muted;
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, Y(0)); ctx.lineTo(x1, Y(0)); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, compact ? 'residual (dex)' : 'residual  log T − 1.5·log a   (dex)', x0, y0 - 4,
        { color: COLORS.ink, size: compact ? 10.5 : 12.5 });
      label(ctx, `full scale ≈ ${sci(hi - lo, 1)} dex`, x1, y0 - 4,
        { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'right' });

      rows.forEach((p, i) => {
        const cx = X(pts[i][0]);
        // predicted: a short cyan tick
        rc.line(cx - 7, Y(pred[i]), cx + 7, Y(pred[i]), opts(880 + i, { stroke: COLORS.cyan, strokeWidth: 1.4 }));
        // green = the measured offset agrees with the prediction to better than
        // AGREE. Jupiter (7×10⁻⁵) and Saturn (2×10⁻⁵) make it; Uranus (3.1×10⁻⁴)
        // and Neptune (2.5×10⁻⁴) miss by 20–30× their own mass term.
        ctx.fillStyle = Math.abs(meas[i] - pred[i]) < AGREE ? COLORS.green : COLORS.red;
        ctx.beginPath(); ctx.arc(cx, Y(meas[i]), 3.4, 0, Math.PI * 2); ctx.fill();
        const tagY = Math.max(y0 + 12, Math.min(y0 + hgt - 2, Y(meas[i]) + (meas[i] > pred[i] ? -6 : 12)));
        label(ctx, p[1], cx + 5, tagY, { color: COLORS.muted, size: compact ? 9 : 10.5 });
      });
      label(ctx, compact ? 'cyan tick = mass-term prediction'
        : `cyan tick = what T² = 4π²a³/G(M+m) predicts · dot = measured · green = agrees to ${sci(AGREE, 0)} dex`,
      x0, y0 + hgt + 14, { color: COLORS.muted, size: compact ? 9.5 : 11.5 });
      if (!compact) notToScale(rc, ctx, x1 - 62, y0 + 14);
    }
  }

  A.register('kepler', KeplerSim);
})();
