// Sim 38 — Rutherford's gold foil: the afternoon the atom got a nucleus
//
// This one is easy to draw honestly, because the apparatus was real, small, and
// sat in a darkened basement room in Manchester. Geiger and Marsden let their
// eyes dark-adapt for half an hour, then sat at a microscope counting individual
// flashes of light on a zinc-sulphide screen, by eye, for months.
//
// PANEL 1 — the apparatus, and the measurement.
// Everything the arm reports comes from the Rutherford cross-section:
//     dσ/dΩ = (D/4)² / sin⁴(θ/2)     with     D = Z₁Z₂e²/(4πε₀E)
// D is the head-on distance of closest approach; for a 7.68 MeV α on gold it is
// 29.624 fm. Counts into a detector of solid angle ΔΩ are
//     R(θ) = N₀ · (n t) · (dσ/dΩ) · ΔΩ
// and with the apparatus constants drawn on the canvas that gives, for 1 µm of
// gold: ~54,000 flashes a minute at 5°, 43 a minute at 30°, and one every four
// and a half minutes at 150°. That spread — a factor of 240,000 across the arc —
// IS the experiment. Drag the arm and the sim counts real Poisson flashes.
//
// PANEL 2 — why the old model did not merely fit worse; it was excluded.
// In Thomson's atom the positive charge is spread through the whole sphere, so
// the biggest kick a single atom can give is θ₁ ≈ D/R_atom = 0.0126° (the code
// integrates the actual equation of motion and gets 0.0125° at grazing incidence,
// which is a decent check on both). Crossing a 2 µm foil an α meets t/2R ≈ 7,800
// atoms, so the random walk gives θ_rms = θ₁√N ≈ 1.1°, and the chance of ever
// reaching 90° is exp(−(90/θ_rms)²) ≈ 10⁻²⁸⁶⁰. Rutherford ran this same
// comparison in 1911 and put the compound-scattering probability at order
// 10⁻³⁵⁰⁰; the exact digit depends on the assumed atomic radius, and the exponent
// is thousands either way. Meanwhile Geiger and Marsden had actually seen
// backscattering, at about 1 in 8000. That is not a discrepancy. That is a
// model being deleted.
//
// The trajectories are integrated, not drawn by hand — velocity Verlet on
//     F = k/r²            (Rutherford: all the charge at a point)
//     F = k·r/R³  (r<R)   (Thomson: charge spread uniformly through the sphere)
// and the resulting angle is checked against the exact tan(θ/2) = D/2b.
//
// PANEL 3 — the scale. Gold's atomic radius is 135 pm; its nuclear radius is
// 1.2·A^⅓ = 6.98 fm. The ratio is 19,300, so a nucleus the size of a 1 cm marble
// puts the edge of the atom 193 m away — a whole stadium, stands included. By
// volume the nucleus is 1.4×10⁻¹³ of the atom. By mass it is 99.978%.
//
// PANEL 4 — the question that follows, which almost nobody answers correctly.
// If atoms are that empty, why doesn't your hand go through the table? Not
// because the atoms are solid. Because electron clouds repel electrostatically
// AND because the Pauli exclusion principle forbids them interpenetrating — which
// is what makes matter stiff rather than merely repulsive. That matter is stable
// at all is a theorem, and a hard one: Dyson and Lenard proved it in 1967.
//
// Hand checks reproduced by the code:
//   D(α, Au, 7.68 MeV) = 29.624 fm ; b₉₀ = D/2 = 14.812 fm ; σ(>90°) = 6.89 barn
//   n_Au = 5.907e28 /m³ ; 1 µm foil → P(>90°) = 4.07e-5 = 1 in 24,600
//   α speed = 1.925e7 m/s (β = 0.064, so classical mechanics is legitimate here)

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    sci, fmtNum,
  } = A;

  const E_CH = 1.602176634e-19;
  const EPS0 = 8.8541878128e-12;
  const AMU = 1.66053906660e-27;
  const N_A = 6.02214076e23;
  const MEV_FM = 1.43996454;          // e²/4πε₀ in MeV·fm
  const M_ALPHA = 4.001506179127 * AMU - 2 * 9.1093837015e-31;  // the bare He nucleus
  const Z_ALPHA = 2;
  const D2R = Math.PI / 180;

  // Apparatus constants, stated on the canvas rather than hidden in a fit.
  const N0 = 1e6;        // α particles per second reaching the foil
  const D_OMEGA = 1e-3;  // sr — the solid angle the microscope's screen subtends

  const CIT_THOMSON = '1904 Thomson - On the Structure of the Atom: an Investigation of the Stability and Periods of Oscillation of a number of Corpuscles arranged at equal intervals around the Circumference of a Circle';
  const CIT_GM1909 = '1909 Geiger, Marsden - On a Diffuse Reflection of the α-Particles';
  const CIT_RUTH = '1911 Rutherford - The Scattering of α and β Particles by Matter and the Structure of the Atom';
  const CIT_GM1913 = '1913 Geiger, Marsden - The Laws of Deflexion of α Particles through Large Angles';
  const CIT_BOHR = '1913 Bohr - On the Constitution of Atoms and Molecules';
  const CIT_RUTH1919 = '1919 Rutherford - Collision of α Particles with Light Atoms. IV. An Anomalous Effect in Nitrogen';
  const CIT_DYSON = '1967 Dyson, Lenard - Stability of Matter. I';
  const CIT_LIEB = '1975 Lieb, Thirring - Bound for the Kinetic Energy of Fermions Which Proves the Stability of Matter';

  // Real foils, with real densities and real atomic radii (empirical values).
  const FOILS = [
    { key: 'au', name: 'gold', Z: 79, Aw: 196.966569, rho: 19320, Ratom: 135e-12, color: '#ffd43b' },
    { key: 'pt', name: 'platinum', Z: 78, Aw: 195.084, rho: 21450, Ratom: 135e-12, color: '#adb5bd' },
    { key: 'ag', name: 'silver', Z: 47, Aw: 107.8682, rho: 10490, Ratom: 160e-12, color: '#f8f9fa' },
    { key: 'cu', name: 'copper', Z: 29, Aw: 63.546, rho: 8960, Ratom: 135e-12, color: '#ffa94d' },
    { key: 'al', name: 'aluminium', Z: 13, Aw: 26.9815385, rho: 2700, Ratom: 125e-12, color: '#04d9ff' },
    { key: 'c', name: 'carbon', Z: 6, Aw: 12.011, rho: 2260, Ratom: 70e-12, color: '#69db7c' },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RutherfordSim extends Sim {
    init() {
      this.mode = 'lab';
      this.foilIdx = 0;
      this.thetaDeg = 30;
      this.thickUM = 1.0;
      this.energyMeV = 7.68;      // the α from radium-C′ (²¹⁴Po), Geiger–Marsden's source
      this.bFM = 20;              // impact parameter for panel 2, in femtometres
      this.flashes = [];          // live scintillations on the screen
      this.tally = new Map();     // angle -> {counts, seconds} — the reader's own dataset
      this.watchT = 0;
      this.simT = 0;
      this.rng = mulberry32(19090601);
      this.buildControls();
      this.updateReadout();
    }

    get foil() { return FOILS[this.foilIdx]; }
    get thickness() { return this.thickUM * 1e-6; }

    /* ---------------- the physics ---------------- */

    numbers() {
      const f = this.foil;
      const E = this.energyMeV;
      const D = (Z_ALPHA * f.Z * MEV_FM) / E * 1e-15;         // closest approach, m
      const n = (f.rho * N_A) / (f.Aw * 1e-3);                // atoms per m³
      const nt = n * this.thickness;                          // atoms per m²
      const b90 = D / 2;
      const sigma90 = Math.PI * b90 * b90;                    // σ(θ > 90°)
      const p90 = nt * sigma90;
      const v = Math.sqrt((2 * E * 1e6 * E_CH) / M_ALPHA);

      // Thomson's model, run properly: the biggest single-atom kick, the random
      // walk across the foil, and the odds of ever reaching 90°.
      const th1 = D / f.Ratom;                                // rad
      const nAtoms = this.thickness / (2 * f.Ratom);
      const thRms = th1 * Math.sqrt(nAtoms);
      const thRmsDeg = thRms / D2R;
      const log10Thomson = -((90 / thRmsDeg) ** 2) / Math.LN10;

      // When does the formula stop being true? When the α would touch.
      const rNuc = 1.2 * Math.cbrt(f.Aw) * 1e-15;
      const rAlpha = 1.2 * Math.cbrt(4) * 1e-15;
      const touches = D < rNuc + rAlpha;

      return {
        f, D, n, nt, b90, sigma90, p90, v, beta: v / 299792458,
        th1Deg: th1 / D2R, nAtoms, thRmsDeg, log10Thomson, rNuc, rAlpha, touches,
      };
    }

    // Counts per second into the microscope at angle θ.
    rateAt(thetaDeg) {
      const { D, nt } = this.numbers();
      const s = Math.sin((thetaDeg * D2R) / 2);
      if (s < 1e-6) return Infinity;
      return N0 * nt * ((D / 4) ** 2 / s ** 4) * D_OMEGA;
    }

    // Exact scattering angle for an impact parameter b: tan(θ/2) = D/2b.
    exactAngle(b) {
      const { D } = this.numbers();
      return 2 * Math.atan(D / (2 * b));
    }

    // Velocity Verlet on the real force law, so the drawn path is integrated
    // rather than sketched. mode 'point' = Rutherford, 'sphere' = Thomson.
    //
    // The integration cannot simply start at x = −r0 moving in +x: at any finite
    // r0 the α has already been pushed, so it is neither at full speed nor aimed
    // along the asymptote, and starting it that way put the b = D/2 case out by
    // 2.1°. Instead the start is taken from the two conserved quantities of the
    // ASYMPTOTE — energy v(r0)² = v0²(1 − D/r0), and angular momentum L = m·v0·b
    // (clockwise for an inbound ray at y = +b) — which makes the finite start
    // radius almost free: the same case now lands within 0.03° of the exact
    // tan(θ/2) = D/2b, across the whole slider range.
    trajectory(b, mode, xMax, steps) {
      const n = this.numbers();
      const f = n.f;
      const k = (Z_ALPHA * f.Z * E_CH * E_CH) / (4 * Math.PI * EPS0);
      const R = f.Ratom;
      const v0 = n.v;
      const acc = (x, y) => {
        const r = Math.max(1e-16, Math.hypot(x, y));
        const F = mode === 'sphere' && r < R ? (k * r) / R ** 3 : k / (r * r);
        return [((F / M_ALPHA) * x) / r, ((F / M_ALPHA) * y) / r];
      };
      // start well outside both the turning point and the aim offset
      const r0 = Math.max(xMax, 3 * b);
      const y0 = Math.min(b, r0 * 0.999);
      const x0 = -Math.sqrt(Math.max(0, r0 * r0 - y0 * y0));
      const rx = x0 / r0;
      const ry = y0 / r0;
      let x = x0;
      let y = y0;
      let vx;
      let vy;
      if (mode === 'sphere') {
        // the α starts far outside a neutral atom, so the asymptote is the start
        vx = v0; vy = 0;
      } else {
        const vMag2 = v0 * v0 * Math.max(0, 1 - n.D / r0);
        const vt = -(v0 * b) / r0;                                 // along θ̂
        const vr = -Math.sqrt(Math.max(0, vMag2 - vt * vt));       // inward
        vx = vr * rx + vt * -ry;
        vy = vr * ry + vt * rx;
      }
      const dt = (2 * r0) / v0 / steps;
      const pts = [[x, y]];
      const every = Math.ceil(steps / 240);
      for (let i = 0; i < steps; i++) {
        let [ax, ay] = acc(x, y);
        x += vx * dt + 0.5 * ax * dt * dt;
        y += vy * dt + 0.5 * ay * dt * dt;
        const [bx, by] = acc(x, y);
        vx += 0.5 * (ax + bx) * dt;
        vy += 0.5 * (ay + by) * dt;
        if (i % every === 0) pts.push([x, y]);
      }
      pts.push([x, y]);
      return { pts, theta: Math.atan2(vy, vx) };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'the darkened room, 1909', value: 'lab' },
        { label: 'pudding vs nucleus', value: 'atoms' },
        { label: 'if the atom were a stadium', value: 'stadium' },
        { label: 'then why is the table solid?', value: 'hand' },
      ], { initial: 'lab', onSelect: (v) => this.setMode(v) });

      this.foilBtns = buttonRow(c, FOILS.map((f) => ({ label: f.name, value: f.key })), {
        initial: 'au',
        onSelect: (v) => {
          this.foilIdx = FOILS.findIndex((f) => f.key === v);
          this.tally.clear();
          this.flashes = [];
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.angleSlider = slider(c, {
        label: 'where the microscope arm is pointing',
        min: 3, max: 175, step: 1, value: this.thetaDeg,
        format: (v) => {
          const r = this.rateAt(v) * 60;
          return `${fmtNum(v, 0)}°  →  ${r > 1 ? `${sci(r, 3)} flashes per minute` : `one flash every ${fmtNum(1 / r, 1)} minutes`}`;
        },
        oninput: (v) => {
          this.thetaDeg = v;
          this.flashes = [];
          if (!this._citedGM) { this._citedGM = true; this.cite(CIT_GM1913); }
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.thickSlider = slider(c, {
        label: 'foil thickness',
        min: 0.05, max: 5, step: 0.01, value: this.thickUM,
        format: (v) => `${fmtNum(v, 2)} µm  (gold leaf is beaten to about 0.1 µm)`,
        oninput: (v) => { this.thickUM = v; this.tally.clear(); this.updateReadout(); this.poke(); },
      });

      this.energySlider = slider(c, {
        label: 'α-particle energy',
        min: 3, max: 12, step: 0.01, value: this.energyMeV,
        format: (v) => `${fmtNum(v, 2)} MeV  (radium-C′ gives 7.68 MeV — Geiger and Marsden's source)`,
        oninput: (v) => { this.energyMeV = v; this.tally.clear(); this.updateReadout(); this.poke(); },
      });

      this.bSlider = slider(c, {
        label: 'how close the α aims at the centre (impact parameter b)',
        min: 1, max: 300, value: this.bFM, log: true,
        format: (v) => `b = ${fmtNum(v, 1)} fm  →  Rutherford deflects it ${fmtNum(this.exactAngle(v * 1e-15) / D2R, 2)}°`,
        oninput: (v) => {
          this.bFM = v;
          if (!this._citedR) { this._citedR = true; this.cite(CIT_RUTH); }
          this.updateReadout();
          this.poke();
        },
      });

      this.clearBtn = actionButton(c, 'throw away the tally sheet', () => {
        this.tally.clear(); this.flashes = []; this.updateReadout(); this.poke();
      });
      this.setMode('lab');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.foilBtns, v === 'lab' || v === 'atoms');
      show(this.angleSlider, v === 'lab');
      show(this.thickSlider, v === 'lab');
      show(this.energySlider, v === 'lab' || v === 'atoms');
      show(this.bSlider, v === 'atoms');
      this.clearBtn.style.display = v === 'lab' ? '' : 'none';
      if (v === 'lab') this.cite(CIT_GM1909);
      if (v === 'atoms') this.cite(CIT_THOMSON);
      if (v === 'stadium') this.cite(CIT_RUTH);
      if (v === 'hand') this.cite(CIT_DYSON);
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    update(dt) {
      this.simT += dt;
      if (this.mode !== 'lab') return;
      // Real Poisson arrivals at the computed rate, sped up so that a reader is
      // not asked to sit in the dark for four minutes like Marsden was.
      const SPEEDUP = 60;
      const lambda = this.rateAt(this.thetaDeg) * dt * SPEEDUP;
      this.watchT += dt * SPEEDUP;
      let n = 0;
      let p = Math.exp(-Math.min(60, lambda));
      let u = this.rng();
      let acc = p;
      while (u > acc && n < 400) { n += 1; p *= lambda / n; acc += p; }
      for (let i = 0; i < Math.min(n, 40); i++) {
        this.flashes.push({ fx: this.rng(), fy: this.rng(), t: 0 });
      }
      const key = Math.round(this.thetaDeg);
      const rec = this.tally.get(key) || { counts: 0, seconds: 0 };
      rec.counts += n;
      rec.seconds += dt * SPEEDUP;
      this.tally.set(key, rec);
      for (const f of this.flashes) f.t += dt;
      this.flashes = this.flashes.filter((f) => f.t < 0.45);
      if (this.flashes.length > 300) this.flashes.splice(0, this.flashes.length - 300);
    }

    /* ---------------- readouts ---------------- */

    updateReadout() {
      const f = {
        lab: () => this.labReadout(),
        atoms: () => this.atomsReadout(),
        stadium: () => this.stadiumReadout(),
        hand: () => this.handReadout(),
      }[this.mode];
      if (f) f();
    }

    labReadout() {
      const n = this.numbers();
      const r5 = this.rateAt(5);
      const r150 = this.rateAt(150);
      const rNow = this.rateAt(this.thetaDeg);
      const rec = this.tally.get(Math.round(this.thetaDeg));
      setReadout(this.readoutEl, [
        [
          [`${fmtNum(this.thickUM, 2)} µm of `, null], [n.f.name, 'yellow'],
          [` (Z = ${n.f.Z}), α at `, null], [`${fmtNum(this.energyMeV, 2)} MeV`, 'orange'],
          ['   ·   distance of closest approach D = Z₁Z₂e²/4πε₀E = ', null],
          [`${fmtNum(n.D * 1e15, 3)} fm`, 'cyan'],
          ['   ·   atoms in the way n·t = ', null], [`${sci(n.nt, 3)} per m²`, null],
        ],
        [
          ['At ', null], [`${fmtNum(this.thetaDeg, 0)}°`, 'yellow'],
          [' the cross-section (D/4)²/sin⁴(θ/2) gives ', null],
          [rNow * 60 > 1 ? `${sci(rNow * 60, 3)} flashes per minute` : `one flash every ${fmtNum(1 / (rNow * 60), 1)} minutes`, 'pink'],
          ['. The sim draws genuine Poisson arrivals at that rate, sped up sixtyfold — Marsden was not sped up.', null],
        ],
        [
          ['This is the whole discovery, in one number. ', 'yellow'],
          ['Between 5° and 150° the rate falls by a factor of ', null],
          [`${sci(r5 / r150, 3)}`, 'orange'],
          [', and every point of that curve follows 1/sin⁴(θ/2). Geiger and Marsden spent 1913 confirming exactly that shape over exactly that range, by eye, one flash at a time, in the dark. Nothing else in the apparatus can produce that law: it comes from ', null],
          ['all the positive charge sitting at a point', 'cyan'], ['.', null],
        ],
        rec ? [
          ['Your tally at ', null], [`${fmtNum(this.thetaDeg, 0)}°`, 'yellow'],
          [': ', null], [`${fmtNum(rec.counts, 0)} flashes`, 'green'],
          [` in ${fmtNum(rec.seconds, 0)} s of counting = `, null],
          [`${fmtNum((rec.counts / Math.max(rec.seconds, 0.001)) * 60, 2)} per minute`, 'green'],
          [`, against ${fmtNum(rNow * 60, 2)} predicted. Move the arm and the dots build the curve on the right — that curve is the measurement, not a plot of the formula.`, null],
        ] : [
          ['Leave the arm somewhere and let it count. Your own points appear on the graph at the right; the smooth line is the prediction.', null],
        ],
        [
          ['The probability of a single α coming back past 90° at all: ', null],
          ['σ = πb₉₀² with b₉₀ = D/2 = ', null], [`${fmtNum(n.b90 * 1e15, 3)} fm`, 'cyan'],
          [`, so σ = ${fmtNum(n.sigma90 * 1e28, 3)} barn and P = n·t·σ = `, null],
          [`${sci(n.p90, 3)}`, 'pink'],
          [` — about 1 in ${fmtNum(1 / n.p90, 0)}. Geiger and Marsden measured roughly 1 in 8,000 off a thick platinum reflector in 1909, where multiple scattering through the depth adds to the single-scattering figure. Rutherford said it was as if you had fired a fifteen-inch shell at tissue paper and it came back and hit you.`, null],
        ],
        n.touches ? [
          ['CAREFUL — the formula has just stopped being true. ', 'red'],
          [`At ${fmtNum(this.energyMeV, 2)} MeV the α closes to ${fmtNum(n.D * 1e15, 2)} fm, which is inside ${fmtNum((n.rNuc + n.rAlpha) * 1e15, 2)} fm — the two nuclei would touch, and the nuclear force takes over from the Coulomb force. This is not a bug: it is how the size of the nucleus was first measured. Rutherford found exactly this breakdown for light elements, and in 1919 pushed it far enough to knock a proton out of nitrogen.`, null],
        ] : [
          ['Why the formula is trustworthy here: the α turns around at ', null],
          [`${fmtNum(n.D * 1e15, 2)} fm`, 'cyan'],
          [`, while the ${n.f.name} nucleus is only ${fmtNum(n.rNuc * 1e15, 2)} fm across — so it never touches, and the force is pure Coulomb all the way. Raise the energy far enough and it does touch, the formula breaks, and the departure tells you the nuclear radius.`, null],
        ],
      ]);
    }

    atomsReadout() {
      const n = this.numbers();
      const b = this.bFM * 1e-15;
      const thR = this.exactAngle(b) / D2R;
      setReadout(this.readoutEl, [
        [
          ['Same α, same atom, same aim (b = ', null], [`${fmtNum(this.bFM, 1)} fm`, 'yellow'],
          ['). Thomson\'s atom deflects it by ', null], [`${fmtNum(n.th1Deg, 5)}° at most`, 'green'],
          [' — Rutherford\'s deflects it by ', null], [`${fmtNum(thR, 2)}°`, 'pink'], ['.', null],
        ],
        [
          ['Where Thomson\'s number comes from. ', 'yellow'],
          ['Spread the positive charge through the whole sphere and the field an α ever feels is tiny: the strongest kick is θ ≈ D/R_atom = ', null],
          [`${fmtNum(n.th1Deg, 5)}°`, 'green'],
          ['. The sim integrates the actual equation of motion inside a uniformly charged sphere, and gets the same answer at grazing incidence — the estimate and the integration agree, which is how you know neither is a fudge.', null],
        ],
        [
          ['Then do the random walk, which is what Rutherford did. ', 'yellow'],
          [`Crossing ${fmtNum(this.thickUM, 2)} µm of ${n.f.name} the α meets about `, null],
          [`${sci(n.nAtoms, 3)} atoms`, 'cyan'],
          [', each nudging it in a random direction, so the deflections add in quadrature: θ_rms = θ₁√N = ', null],
          [`${fmtNum(n.thRmsDeg, 3)}°`, 'orange'],
          ['. The chance of a random walk of that size ever reaching 90° is roughly exp(−(90/θ_rms)²) = ', null],
          [`10^${fmtNum(n.log10Thomson, 0)}`, 'red'], ['.', null],
        ],
        [
          ['Read that exponent again. ', 'yellow'],
          ['Not "unlikely". Not "a poor fit". There are about 10⁸⁰ atoms in the observable universe. Rutherford ran the same comparison in 1911 and put the number at around 10⁻³⁵⁰⁰; the digit depends on what you assume for the atomic radius, and it is thousands either way. And Geiger and Marsden had already SEEN the backscattering, at about one α in eight thousand. The plum pudding was not adjusted. It was deleted, by a factor no adjustment could reach.', null],
        ],
        [
          ['What replaced it is uncomfortably specific: ', 'yellow'],
          ['all the positive charge, and 99.98% of the mass, in a volume about 10⁻¹³ of the atom. Which immediately broke classical physics in a different way — an electron orbiting a point charge radiates and should spiral in within about 10⁻¹¹ s. Rutherford\'s atom cannot exist for a nanosecond under Maxwell\'s equations. Bohr fixed that in 1913 by quantising the orbits, and the fix worked, and nobody could say why until Schrödinger and Heisenberg.', null],
        ],
      ]);
    }

    stadiumReadout() {
      const n = this.numbers();
      const ratio = n.f.Ratom / n.rNuc;
      const volFrac = (n.rNuc / n.f.Ratom) ** 3;
      const massFrac = 1 - (n.f.Z * 9.1093837015e-31) / (n.f.Aw * AMU);
      return setReadout(this.readoutEl, [
        [
          ['A ', null], [n.f.name, 'yellow'], [' atom is ', null],
          [`${fmtNum(n.f.Ratom * 1e12, 0)} pm`, 'cyan'], [' across at the electrons; its nucleus is ', null],
          [`${fmtNum(n.rNuc * 1e15, 2)} fm`, 'pink'], [' — a ratio of ', null],
          [`${fmtNum(ratio, 0)}`, 'orange'], [' to one.', null],
        ],
        [
          ['So put the nucleus on the centre spot as a single grain of rice, about 1 cm long. ', 'yellow'],
          ['The nearest electron is then ', null], [`${fmtNum((0.01 * ratio) / 2, 0)} m`, 'cyan'],
          [' away — the far touchline, the stands, the back row. Everything between is empty. By volume the nucleus is ', null],
          [`${sci(volFrac, 2)}`, 'pink'], [' of the atom: the atom is 99.99999999999% nothing.', null],
        ],
        [
          ['And yet the grain of rice is ', null], [`${fmtNum(massFrac * 100, 3)}%`, 'orange'],
          [' of the weight of the stadium. All 79 electrons of a gold atom together weigh less than a fortieth of one percent of it. When you stand on a floor you are standing on almost perfectly empty space held apart by fields — and the mass under your feet is concentrated into specks a hundred thousand times smaller than the atoms they anchor.', null],
        ],
        [
          ['One honest caveat about "empty". ', 'yellow'],
          ['The electrons are not tiny planets leaving gaps you could walk through. They are a standing wave filling the whole volume, with a well-defined density everywhere. "Empty" is the right word for how much MASS is out there and how far an α can travel unbothered. It is the wrong word if it makes you expect a hole. The next panel is what happens when you try to use one.', null],
        ],
      ]);
    }

    handReadout() {
      setReadout(this.readoutEl, [
        [
          ['If atoms are 99.99999999999% empty, why does the table hold your hand up? ', 'yellow'],
          ['Almost every popular answer to this is wrong, including the common one that "the electrons repel". That is half of it, and the smaller half.', null],
        ],
        [
          ['Part one: electrostatic repulsion. ', 'cyan'],
          ['The outer electrons of your skin and the outer electrons of the table are both negative, so as the surfaces approach, the clouds push apart. True — but on its own this would make matter springy and compressible, not solid, and it would not stop you pressing the atoms into each other if you pushed hard enough.', null],
        ],
        [
          ['Part two, and the one that actually makes matter stiff: the Pauli exclusion principle. ', 'pink'],
          ['Electrons are fermions; no two of them can occupy the same quantum state. To push two filled electron clouds into the same space you would have to promote electrons into higher, faster states — which costs enormous energy. That energy cost, not the electrostatic push, is why a table resists with the ferocity it does. It is the same effect, scaled up, that holds a white dwarf against its own gravity (section 23).', null],
        ],
        [
          ['This is a theorem, and it was hard. ', 'yellow'],
          ['That matter does not simply collapse — that N atoms occupy a volume proportional to N rather than shrinking together — was not proved until Dyson and Lenard did it in 1967, and it was made tractable by Lieb and Thirring in 1975. Without exclusion, the energy of ordinary matter would scale as N^(7/5) instead of N, and a glass of water would release something like the energy of a nuclear weapon on being poured. "Solid" is not a property of the atoms. It is a property of the antisymmetry of the wavefunction.', null],
        ],
        [
          ['So: nothing touches. ', 'orange'],
          ['Your hand never contacts the table. The nearest nucleus of your skin gets to within a few hundred picometres of the nearest nucleus of the wood and stops, held off by a field and by an exclusion rule. Every sensation of touch you have ever had is that stand-off, reported by nerve endings. The atom really is empty — and it is exactly as impossible to walk through as it feels.', null],
        ],
      ]);
    }

    /* ================= drawing ================= */

    // ---- 1909: the basement room, the brass chamber, and Marsden ----
    renderLab() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const n = this.numbers();

      // the room
      const floorY = h * 0.88;
      this.cache.draw(`rfloor-${key}`, (g) => g.line(0, floorY, w, floorY, opts(3001, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      this.cache.draw(`rdoor-${key}`, (g) => g.rectangle(w * 0.005, h * 0.30, compact ? 30 : 42, floorY - h * 0.30,
        opts(3002, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      this.cache.draw(`rcurtain-${key}`, (g) => g.path(
        `M ${w * 0.10} ${h * 0.06} l 0 ${h * 0.22} q ${compact ? 14 : 18} -8 ${compact ? 28 : 36} 0 l 0 ${-h * 0.22} Z`,
        opts(3003, { stroke: COLORS.muted, strokeWidth: 1.3, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 7 }),
      ));
      label(ctx, 'blackout', w * 0.10 + (compact ? 14 : 18), h * 0.31, { color: COLORS.muted, size: compact ? 9 : 10.5, align: 'center' });

      // --- the evacuated brass chamber, seen from above ---
      const cx = compact ? w * 0.34 : w * 0.31;
      const cy = h * 0.52;
      const R = Math.min(w * (compact ? 0.26 : 0.22), h * 0.34);
      this.cache.draw(`cham-${key}`, (g) => g.circle(cx, cy, R * 2, opts(3010, { stroke: COLORS.orange, strokeWidth: 2.4 })));
      this.cache.draw(`cham2-${key}`, (g) => g.circle(cx, cy, R * 2 - 12, opts(3011, { stroke: COLORS.orange, strokeWidth: 1 })));
      // the pump line
      this.cache.draw(`pump-${key}`, (g) => g.path(
        `M ${cx} ${cy + R} l 0 ${compact ? 22 : 30} l ${compact ? -26 : -34} 0`, opts(3012, { stroke: COLORS.muted, strokeWidth: 1.6 }),
      ));
      label(ctx, 'to the pump', cx - (compact ? 30 : 40), cy + R + (compact ? 26 : 34), { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'right' });

      // the lead block and the radium source
      const sx = cx - R * 0.80;
      this.cache.draw(`lead-${key}`, (g) => g.rectangle(sx - 26, cy - 15, 26, 30, opts(3020, {
        stroke: COLORS.muted, strokeWidth: 1.8, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.6, hachureGap: 5,
      })));
      ctx.fillStyle = COLORS.green;
      ctx.beginPath(); ctx.arc(sx - 13, cy, 3, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'radium', sx - 13, cy - 21, { color: COLORS.green, size: compact ? 8.5 : 10, align: 'center' });
      label(ctx, 'in lead', sx - 13, cy + 28, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'center' });
      // the collimating slit
      this.cache.draw(`colli-${key}`, (g) => g.path(
        `M ${sx + 2} ${cy - 12} l 0 8 M ${sx + 2} ${cy + 4} l 0 8`, opts(3021, { stroke: COLORS.muted, strokeWidth: 2 }),
      ));

      // the incoming beam
      ctx.strokeStyle = COLORS.green;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx + 4, cy); ctx.lineTo(cx - 5, cy); ctx.stroke();

      // the foil, at the centre, on its mount
      this.cache.draw(`foilm-${key}`, (g) => g.line(cx, cy - 22, cx, cy + 22, opts(3030, { stroke: n.f.color, strokeWidth: 3 })));
      this.cache.draw(`foilmt-${key}`, (g) => g.line(cx, cy + 22, cx, cy + R * 0.75, opts(3031, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      label(ctx, `${n.f.name}, ${fmtNum(this.thickUM, 2)} µm`, cx, cy - 28, { color: n.f.color, size: compact ? 9 : 11, align: 'center' });

      // the rotating arm, at whatever angle the reader chose
      const th = this.thetaDeg * D2R;
      const ax = cx + Math.cos(th) * R * 0.90;
      const ay = cy - Math.sin(th) * R * 0.90;
      rc.line(cx, cy, ax, ay, opts(3040, { stroke: COLORS.cyan, strokeWidth: 2.2 }));
      // the zinc-sulphide screen and the microscope tube
      const sw = compact ? 22 : 28;
      rc.rectangle(ax - sw / 2, ay - 7, sw, 14, opts(3041, { stroke: COLORS.yellow, strokeWidth: 1.8 }));
      const mx = cx + Math.cos(th) * (R * 0.90 + (compact ? 24 : 32));
      const my = cy - Math.sin(th) * (R * 0.90 + (compact ? 24 : 32));
      rc.line(ax, ay, mx, my, opts(3042, { stroke: COLORS.cyan, strokeWidth: 3 }));
      rc.circle(mx, my, compact ? 13 : 16, opts(3043, { stroke: COLORS.cyan, strokeWidth: 1.8 }));

      // the flashes, actually landing on the screen
      ctx.save();
      for (const f of this.flashes) {
        const a = Math.max(0, 1 - f.t / 0.45);
        ctx.globalAlpha = a;
        ctx.fillStyle = COLORS.yellow;
        const px = ax + (f.fx - 0.5) * (sw - 6);
        const py = ay + (f.fy - 0.5) * 10;
        ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // the angle arc, so the reader can read θ off the drawing
      ctx.strokeStyle = COLORS.muted;
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 0.95, cy); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.36, -th, 0); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, `θ = ${fmtNum(this.thetaDeg, 0)}°`, cx + R * 0.44, cy - R * 0.20,
        { color: COLORS.cyan, size: compact ? 11 : 13 });

      // Marsden, at the eyepiece, in the dark, with a tally sheet
      const px2 = compact ? w * 0.30 : w * 0.27;
      stickFigure(rc, px2, floorY - (compact ? 26 : 32), { scale: compact ? 0.5 : 0.62, seed: 3050, color: COLORS.ink });
      label(ctx, compact ? 'counting by eye' : 'counting flashes by eye · 30 min to dark-adapt',
        px2, floorY + 15, { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      // --- the reader's own dataset, plotted on the right ---
      const gx = compact ? w * 0.63 : w * 0.585;
      const gw = w - gx - (compact ? 14 : 28);
      const gy0 = h * 0.16;
      const gh = h * 0.56;
      this.cache.draw(`gax-${key}`, (g) => g.line(gx, gy0 + gh, gx + gw, gy0 + gh, opts(3060, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      this.cache.draw(`gay-${key}`, (g) => g.line(gx, gy0, gx, gy0 + gh, opts(3061, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      label(ctx, 'θ  (5° … 175°)', gx + gw / 2, gy0 + gh + 16, { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'center' });
      label(ctx, 'flashes/min', gx - 4, gy0 - 5, { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'right' });
      label(ctx, '(log)', gx - 4, gy0 + 9, { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'right' });

      const LOG_LO = -2;
      const LOG_HI = 5.2;
      const xOf = (t) => gx + ((t - 5) / 170) * gw;
      const yOf = (r) => gy0 + gh - ((Math.log10(Math.max(1e-3, r)) - LOG_LO) / (LOG_HI - LOG_LO)) * gh;

      ctx.strokeStyle = COLORS.pink;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let t = 5; t <= 175; t += 1) {
        const y = yOf(this.rateAt(t) * 60);
        if (t === 5) ctx.moveTo(xOf(t), y); else ctx.lineTo(xOf(t), y);
      }
      ctx.stroke();
      label(ctx, '1/sin⁴(θ/2)', xOf(96), yOf(this.rateAt(96) * 60) - 10, { color: COLORS.pink, size: compact ? 10 : 12 });

      // the reader's measured points
      ctx.fillStyle = COLORS.green;
      this.tally.forEach((rec, t) => {
        if (rec.seconds < 0.4) return;
        const r = (rec.counts / rec.seconds) * 60;
        if (r <= 0) return;
        const x = xOf(t);
        const y = yOf(r);
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
      });
      // where the arm is right now
      ctx.strokeStyle = COLORS.cyan;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xOf(this.thetaDeg), gy0); ctx.lineTo(xOf(this.thetaDeg), gy0 + gh); ctx.stroke();
      ctx.setLineDash([]);

      label(ctx, `${sci(this.rateAt(this.thetaDeg) * 60, 3)} flashes per minute at ${fmtNum(this.thetaDeg, 0)}°`,
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 12 : 16.5, align: 'center' });
      label(ctx, `apparatus: ${sci(N0, 0)} α/s onto the foil, screen subtending ${sci(D_OMEGA, 0)} sr · counting sped up 60×`,
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    // ---- the two atoms, side by side, with integrated trajectories ----
    renderAtoms() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const n = this.numbers();
      const b = this.bFM * 1e-15;
      const half = w / 2;
      const cyc = h * 0.52;
      const Rpx = Math.min(half * 0.34, h * 0.30);
      const Ratom = n.f.Ratom;

      this.cache.draw(`split-${key}`, (g) => g.line(half, h * 0.13, half, h * 0.86,
        opts(3100, { stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [8, 8] })));

      // === LEFT: Thomson's atom, drawn at true relative scale (it is the atom) ===
      const lx = half * 0.5;
      this.cache.draw(`pud-${key}`, (g) => g.circle(lx, cyc, Rpx * 2, opts(3110, {
        stroke: COLORS.green, strokeWidth: 2, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 9,
      })));
      for (let i = 0; i < 14; i++) {
        const a = (i * 2.399963) % (Math.PI * 2);
        const r = 0.28 + ((i * 0.6180339887) % 1) * 0.64;
        const ex = lx + Math.cos(a) * r * Rpx;
        const ey = cyc + Math.sin(a) * r * Rpx;
        this.cache.draw(`pele-${i}-${key}`, (g) => g.circle(ex, ey, 7, opts(3120 + i, { stroke: COLORS.cyan, strokeWidth: 1.3 })));
      }
      label(ctx, "THOMSON, 1904", lx, h * 0.155, { color: COLORS.green, size: compact ? 12 : 15, align: 'center' });
      label(ctx, compact ? 'charge spread through the sphere' : 'positive charge spread through the whole sphere',
        lx, h * 0.155 + (compact ? 15 : 19), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'center' });

      // the trajectory, integrated inside a uniformly charged sphere
      const scaleL = Rpx / Ratom;
      const trajT = this.trajectory(Math.min(b * 400, Ratom * 0.95), 'sphere', Ratom * 3, 4000);
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      trajT.pts.forEach((p, i) => {
        const X = lx + p[0] * scaleL;
        const Y = cyc - p[1] * scaleL;
        if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      });
      ctx.stroke();
      label(ctx, `deflection: ${fmtNum(Math.abs(trajT.theta / D2R), 5)}°`, lx, h * 0.80,
        { color: COLORS.orange, size: compact ? 11 : 13.5, align: 'center' });
      label(ctx, `most it can EVER do: ${fmtNum(n.th1Deg, 4)}°`, lx, h * 0.80 + (compact ? 15 : 18),
        { color: COLORS.green, size: compact ? 10 : 12, align: 'center' });
      label(ctx, `so 90° needs a fluke of 1 in 10^${fmtNum(-n.log10Thomson, 0)}`, lx, h * 0.80 + (compact ? 29 : 35),
        { color: COLORS.red, size: compact ? 10 : 12.5, align: 'center' });

      // === RIGHT: Rutherford's atom ===
      const rx = half * 1.5;
      this.cache.draw(`ratom-${key}`, (g) => g.circle(rx, cyc, Rpx * 2, opts(3130, {
        stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [5, 6],
      })));
      for (let i = 0; i < 14; i++) {
        const a = (i * 2.399963) % (Math.PI * 2);
        const r = 0.34 + ((i * 0.6180339887) % 1) * 0.60;
        const ex = rx + Math.cos(a) * r * Rpx;
        const ey = cyc + Math.sin(a) * r * Rpx;
        ctx.fillStyle = COLORS.cyan;
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      this.cache.draw(`nuc-${key}`, (g) => g.circle(rx, cyc, 11, opts(3131, {
        stroke: COLORS.red, strokeWidth: 2.2, fill: COLORS.red, fillStyle: 'solid',
      })));
      label(ctx, 'RUTHERFORD, 1911', rx, h * 0.155, { color: COLORS.red, size: compact ? 12 : 15, align: 'center' });
      label(ctx, compact ? 'all of it at a point' : 'all of it at a point, 19,000× smaller than the atom',
        rx, h * 0.155 + (compact ? 15 : 19), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'center' });

      // the hyperbola, integrated on the point-charge law and drawn at nuclear scale
      const scaleR = (Rpx * 0.42) / (60e-15);
      const trajR = this.trajectory(b, 'point', 400e-15, 6000);
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      trajR.pts.forEach((p) => {
        const X = rx + p[0] * scaleR;
        const Y = cyc - p[1] * scaleR;
        if (X < rx - half * 0.48 || X > rx + half * 0.48 || Y < h * 0.20 || Y > h * 0.78) { started = false; return; }
        if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
      });
      ctx.stroke();
      label(ctx, `deflection: ${fmtNum(this.exactAngle(b) / D2R, 2)}°`, rx, h * 0.80,
        { color: COLORS.orange, size: compact ? 11 : 13.5, align: 'center' });
      label(ctx, compact
        ? `tan(θ/2) = D/2b, D = ${fmtNum(n.D * 1e15, 1)} fm`
        : `exact: tan(θ/2) = D/2b, with D = ${fmtNum(n.D * 1e15, 2)} fm`,
      rx, h * 0.80 + (compact ? 15 : 18), { color: COLORS.cyan, size: compact ? 10 : 12, align: 'center' });
      label(ctx, `and 1 α in ${fmtNum(1 / n.p90, 0)} really does come back`, rx, h * 0.80 + (compact ? 29 : 35),
        { color: COLORS.pink, size: compact ? 10 : 12.5, align: 'center' });
      notToScale(rc, ctx, Math.min(rx + (compact ? 52 : 74), w - 62), h * 0.24);

      label(ctx, 'same α, same aim, two atoms', w / 2, compact ? 20 : 26,
        { color: COLORS.yellow, size: compact ? 12.5 : 17, align: 'center' });
      void doodleArrow;
    }

    // ---- the scale model: a real stadium and one grain of rice ----
    renderStadium() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const n = this.numbers();
      const cx = w / 2;
      const cy = h * 0.52;
      // The stands reach 1.6× the pitch, and two caption lines hang below them, so
      // the pitch is sized from the height that leaves room for both — not from the
      // pitch alone, which pushed "the back row" clean off the bottom of the canvas.
      const ph = Math.min(w * 0.46 * 0.62, (h * 0.60) / 1.6);
      const pw = ph / 0.62;

      // the stands, drawn as three nested rings of terracing
      for (let i = 3; i >= 1; i--) {
        const f = 1 + i * 0.20;
        this.cache.draw(`stand-${i}-${key}`, (g) => g.rectangle(
          cx - (pw * f) / 2, cy - (ph * f) / 2, pw * f, ph * f,
          opts(3200 + i, {
            stroke: COLORS.muted, strokeWidth: 1.3,
            fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 8 + i * 2,
          }),
        ));
      }
      // the floodlight pylons
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((s, i) => {
        const fx = cx + s[0] * (pw * 1.6) / 2;
        const fy = cy + s[1] * (ph * 1.6) / 2;
        this.cache.draw(`pyl-${i}-${key}`, (g) => g.path(
          `M ${fx} ${fy} l 0 ${-22} m -9 0 l 18 0`, opts(3210 + i, { stroke: COLORS.yellow, strokeWidth: 1.6 }),
        ));
      });

      // the pitch
      this.cache.draw(`pitch-${key}`, (g) => g.rectangle(cx - pw / 2, cy - ph / 2, pw, ph, opts(3220, {
        stroke: COLORS.green, strokeWidth: 2, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 12,
      })));
      this.cache.draw(`halfway-${key}`, (g) => g.line(cx, cy - ph / 2, cx, cy + ph / 2, opts(3221, { stroke: COLORS.green, strokeWidth: 1.6 })));
      this.cache.draw(`circle-${key}`, (g) => g.circle(cx, cy, ph * 0.30, opts(3222, { stroke: COLORS.green, strokeWidth: 1.5 })));
      this.cache.draw(`boxL-${key}`, (g) => g.rectangle(cx - pw / 2, cy - ph * 0.24, pw * 0.13, ph * 0.48, opts(3223, { stroke: COLORS.green, strokeWidth: 1.3 })));
      this.cache.draw(`boxR-${key}`, (g) => g.rectangle(cx + pw / 2 - pw * 0.13, cy - ph * 0.24, pw * 0.13, ph * 0.48, opts(3224, { stroke: COLORS.green, strokeWidth: 1.3 })));

      // the nucleus: one grain of rice on the centre spot
      ctx.fillStyle = COLORS.red;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 3.4, 1.9, 0.3, 0, Math.PI * 2);
      ctx.fill();
      rc.circle(cx, cy, compact ? 34 : 44, opts(3230, { stroke: COLORS.red, strokeWidth: 1.5 }));
      doodleArrow(rc, cx + (compact ? 30 : 40), cy - (compact ? 26 : 34), cx + 6, cy - 4,
        { color: COLORS.red, seed: 3231, strokeWidth: 1.5 });
      label(ctx, 'the nucleus:', cx + (compact ? 36 : 46), cy - (compact ? 40 : 50), { color: COLORS.red, size: compact ? 10.5 : 13 });
      label(ctx, 'one grain of rice', cx + (compact ? 36 : 46), cy - (compact ? 27 : 34), { color: COLORS.red, size: compact ? 10.5 : 13 });
      label(ctx, `— and ${fmtNum(100 * (1 - (n.f.Z * 9.1093837015e-31) / (n.f.Aw * AMU)), 3)}% of the mass`,
        cx + (compact ? 36 : 46), cy - (compact ? 14 : 18), { color: COLORS.orange, size: compact ? 10 : 12 });

      // a couple of spectators, for scale, in the stands
      stickFigure(rc, cx - (pw * 1.55) / 2 + 12, cy - ph * 0.30, { scale: compact ? 0.30 : 0.38, seed: 3240, color: COLORS.ink });
      stickFigure(rc, cx + (pw * 1.55) / 2 - 12, cy + ph * 0.34, { scale: compact ? 0.30 : 0.38, seed: 3241, color: COLORS.ink });

      // the electron shell, at the back of the stands
      label(ctx, 'the nearest electron', cx, cy + (ph * 1.6) / 2 + (compact ? 16 : 22),
        { color: COLORS.cyan, size: compact ? 10.5 : 13, align: 'center' });
      label(ctx, `${fmtNum((0.01 * (n.f.Ratom / n.rNuc)) / 2, 0)} m away — the back row`, cx, cy + (ph * 1.6) / 2 + (compact ? 30 : 40),
        { color: COLORS.cyan, size: compact ? 10.5 : 13, align: 'center' });

      label(ctx, `one ${n.f.name} atom, blown up until the nucleus is a grain of rice`, w / 2, compact ? 20 : 26,
        { color: COLORS.yellow, size: compact ? 12 : 16.5, align: 'center' });
      label(ctx, `atom ${fmtNum(n.f.Ratom * 1e12, 0)} pm · nucleus ${fmtNum(n.rNuc * 1e15, 2)} fm · ratio ${fmtNum(n.f.Ratom / n.rNuc, 0)} : 1 · the nucleus is ${sci((n.rNuc / n.f.Ratom) ** 3, 1)} of the volume`,
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9 : 11.5, align: 'center' });
    }

    // ---- the kitchen table, and why the hand stops ----
    renderHand() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;

      // the kitchen: a table, a mug, a chair back
      const tableY = h * 0.58;
      const tx = compact ? w * 0.04 : w * 0.06;
      const tw = compact ? w * 0.46 : w * 0.42;
      this.cache.draw(`table-${key}`, (g) => g.rectangle(tx, tableY, tw, 12, opts(3300, {
        stroke: COLORS.orange, strokeWidth: 2.2, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 6,
      })));
      this.cache.draw(`tleg1-${key}`, (g) => g.line(tx + 16, tableY + 12, tx + 16, h * 0.90, opts(3301, { stroke: COLORS.orange, strokeWidth: 2 })));
      this.cache.draw(`tleg2-${key}`, (g) => g.line(tx + tw - 16, tableY + 12, tx + tw - 16, h * 0.90, opts(3302, { stroke: COLORS.orange, strokeWidth: 2 })));
      this.cache.draw(`tfloor-${key}`, (g) => g.line(0, h * 0.90, w, h * 0.90, opts(3303, { stroke: COLORS.muted, strokeWidth: 1.5 })));
      // a mug on the table
      this.cache.draw(`mug-${key}`, (g) => g.path(
        `M ${tx + tw - 60} ${tableY - 30} l 3 28 l 22 0 l 3 -28 Z`, opts(3304, { stroke: COLORS.cyan, strokeWidth: 1.6 }),
      ));
      this.cache.draw(`mugh-${key}`, (g) => g.path(
        `M ${tx + tw - 32} ${tableY - 24} q 10 6 0 14`, opts(3305, { stroke: COLORS.cyan, strokeWidth: 1.4 }),
      ));

      // the hand, resting on the table
      const hx = tx + tw * 0.34;
      const hy = tableY - 4;
      this.cache.draw(`palm-${key}`, (g) => g.path(
        `M ${hx - 34} ${hy} q -4 -22 12 -26 q 6 -16 12 -2 q 4 -18 12 -3 q 5 -14 11 0 q 8 -4 9 8 q 2 14 -8 23 Z`,
        opts(3310, { stroke: COLORS.ink, strokeWidth: 2 }),
      ));
      this.cache.draw(`wrist-${key}`, (g) => g.path(
        `M ${hx - 36} ${hy - 2} l -28 -14 M ${hx - 26} ${hy - 22} l -30 -12`, opts(3311, { stroke: COLORS.ink, strokeWidth: 1.8 }),
      ));
      label(ctx, 'your hand · the table', hx - 4, h * 0.68, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });

      // the zoom bubble into the contact
      const zx = compact ? w * 0.72 : w * 0.70;
      const zy = h * 0.44;
      const zr = Math.min(w * 0.24, h * 0.32);
      this.cache.draw(`bubble-${key}`, (g) => g.circle(zx, zy, zr * 2, opts(3320, { stroke: COLORS.cyan, strokeWidth: 2 })));
      this.cache.draw(`bline-${key}`, (g) => g.path(
        `M ${hx + 10} ${hy - 10} L ${zx - zr * 0.78} ${zy + zr * 0.62}`, opts(3321, { stroke: COLORS.cyan, strokeWidth: 1.1, strokeLineDash: [5, 5] }),
      ));

      // inside the bubble: two electron clouds meeting and NOT touching
      const gap = zr * 0.16;
      const cr = zr * 0.42;
      this.cache.draw(`cloudA-${key}`, (g) => g.circle(zx - cr - gap / 2, zy, cr * 2, opts(3330, {
        stroke: COLORS.cyan, strokeWidth: 1.6, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 6,
      })));
      this.cache.draw(`cloudB-${key}`, (g) => g.circle(zx + cr + gap / 2, zy, cr * 2, opts(3331, {
        stroke: COLORS.pink, strokeWidth: 1.6, fill: COLORS.pink, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 6,
      })));
      ctx.fillStyle = COLORS.red;
      ctx.beginPath(); ctx.arc(zx - cr - gap / 2, zy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(zx + cr + gap / 2, zy, 2.4, 0, Math.PI * 2); ctx.fill();

      // the two forces holding them apart, labelled correctly
      doodleArrow(rc, zx - gap * 0.4, zy - zr * 0.60, zx - gap * 2.4, zy - zr * 0.60, { color: COLORS.yellow, seed: 3340, strokeWidth: 1.6 });
      doodleArrow(rc, zx + gap * 0.4, zy - zr * 0.60, zx + gap * 2.4, zy - zr * 0.60, { color: COLORS.yellow, seed: 3341, strokeWidth: 1.6 });
      label(ctx, 'they never touch', zx, zy - zr * 0.74, { color: COLORS.yellow, size: compact ? 10 : 12, align: 'center' });
      label(ctx, '1. electron clouds repel', zx, zy + zr * 0.56, { color: COLORS.cyan, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, '2. Pauli exclusion forbids', zx, zy + zr * 0.56 + (compact ? 14 : 17), { color: COLORS.pink, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, 'them sharing the same state', zx, zy + zr * 0.56 + (compact ? 27 : 33), { color: COLORS.pink, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, '— and (2) is what makes it stiff', zx, zy + zr * 0.56 + (compact ? 40 : 49), { color: COLORS.orange, size: compact ? 10 : 12.5, align: 'center' });

      label(ctx, 'the atom is 99.99999999999% empty — and the table still holds', w / 2, compact ? 20 : 26,
        { color: COLORS.yellow, size: compact ? 12 : 16.5, align: 'center' });
      label(ctx, 'that matter does not simply collapse is a theorem, and it took until 1967 to prove',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    render() {
      ({
        lab: () => this.renderLab(),
        atoms: () => this.renderAtoms(),
        stadium: () => this.renderStadium(),
        hand: () => this.renderHand(),
      })[this.mode]();
    }
  }

  void CIT_BOHR;
  void CIT_RUTH1919;
  void CIT_LIEB;

  A.register('rutherford', RutherfordSim);
})();
