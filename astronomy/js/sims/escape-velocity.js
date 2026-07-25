// Sim 7 — Escaping a world's gravity: Newton's cannonball, made real.
//
// THREE MODES, all computed in SI from measured GM and R (never from prose numbers):
//
// 1. CANNONBALL (the sandbox). You drag from the muzzle to set launch speed and
//    direction; the ball is then integrated with velocity Verlet under EXACT
//    inverse-square gravity, a = -GM r̂ / r². Nothing about the outcome is
//    scripted. Every frame the shot's fate is re-derived from its *integrated*
//    state via the two conserved quantities:
//        specific orbital energy   ε = v²/2 − GM/r
//        eccentricity vector       e⃗ = (v⃗ × h⃗)/GM − r̂
//    with a = −GM/(2ε), r_p = a(1−e) (valid for a<0 too), r_a = a(1+e).
//        ε ≥ 0            → ESCAPE          (cyan)
//        ε < 0, r_p ≤ R   → SUBORBITAL arc  (orange — it comes back down)
//        ε < 0, r_p > R   → CLOSED ORBIT    (green)
//    Verlet is symplectic, so ε stays put over many orbits — which is exactly
//    why the classification is allowed to be read off the integration.
//
// 2. ROCKET. Tsiolkovsky: Δv = v_e ln(m0/m1), with v_e = Isp·g0. The LEO budget
//    it is measured against is itself computed: v_circ at 200 km + ascent losses
//    − the free ride from Earth's rotation at the launch latitude.
//
// 3. NEWTON'S MOON TEST. The 1687 measurement-vs-model check: take g at Earth's
//    surface, scale it down by the inverse square out to the Moon, and compare
//    with the Moon's ACTUAL centripetal acceleration 4π²r/T². Agreement is
//    computed, not asserted (it lands near 99%, and near 100% once you account
//    for the Moon orbiting the barycentre rather than Earth's centre).
//
// Hand checks (all reproduced by the code at run time):
//   Earth   v_esc = √(2·3.986004418e14/6.371e6) = 11 186 m/s  ✓ 11.186 km/s
//   Earth   v_circ(surface) = 7 910 m/s ✓ ;  g = GM/R² = 9.820 m/s²
//   Moon 2 376 m/s · Mars 5 027 m/s · Jupiter 59 530 m/s · Ceres 517 m/s · Sun 617.7 km/s
//   Moon test: predicted 2.698e-3 vs observed 2.723e-3 m/s² → 99.1%
//
// Drawn but exaggerated: the mountain, the cannon, the ball, and (in mode 3)
// the Earth–Moon distance — each carries a "not to scale!" stamp.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure,
    slider, buttonRow, actionButton, setReadout, verletStep,
    R_EARTH, DAY, fmtNum, sci, fmtLen,
  } = A;

  // GM is quoted rather than G×M because GM is what orbit determination actually
  // measures — it is known to ~10 significant figures while G is known to ~5.
  // (Check: G·M_EARTH from constants.js = 3.98604e14, matching the value below.)
  const BODIES = {
    earth:   { name: 'Earth',    GM: 3.986004418e14,  R: 6.371e6,  color: COLORS.cyan },
    moon:    { name: 'the Moon', GM: 4.9048695e12,    R: 1.7374e6, color: COLORS.ink },
    mars:    { name: 'Mars',     GM: 4.282837e13,     R: 3.3895e6, color: COLORS.red },
    // Jupiter's R is the equatorial 1-bar radius — the surface the published
    // 59.5 km/s escape velocity is quoted at (it has no solid surface at all).
    jupiter: { name: 'Jupiter',  GM: 1.26686534e17,   R: 7.1492e7, color: COLORS.orange },
    ceres:   { name: 'Ceres',    GM: 6.26325e10,      R: 4.696e5,  color: COLORS.pink },
    sun:     { name: 'the Sun',  GM: 1.32712440018e20, R: 6.957e8, color: COLORS.yellow },
  };

  const G0 = 9.80665;            // m/s² — standard gravity, the constant *defining* Isp
  // All four Isp values are VACUUM figures (sea-level Isp is lower — part of
  // what the ascent-loss term absorbs). thrust/dryMass are published values,
  // carried so the sim can COMPUTE whether an engine can lift itself off a pad
  // instead of asserting it: the most an engine can hold up is thrust/g₀, and
  // an ion thruster's few hundred millinewtons cannot even hold up the thruster.
  const ENGINES = [
    { label: 'solid booster',  isp: 268,  note: 'Shuttle-SRB class',      thrust: 12.45e6, dryMass: 87000 },
    { label: 'kerosene + LOX', isp: 348,  note: 'Merlin-1D Vacuum class', thrust: 981e3,   dryMass: 470 },
    { label: 'hydrogen + LOX', isp: 452,  note: 'RS-25 class',            thrust: 1.86e6,  dryMass: 3177 },
    { label: 'xenon ion',      isp: 3120, note: 'NSTAR class',            thrust: 0.092,   dryMass: 8.3 },
  ];

  const LEO_ALT = 2.0e5;          // m — a low parking orbit
  const ASCENT_LOSS = 1.9e3;      // m/s — gravity + steering + drag (empirically 1.5–2.0 km/s)
  const OMEGA_EARTH = 7.2921150e-5; // rad/s — sidereal rotation
  const LAUNCH_LAT = (28.5 * Math.PI) / 180; // Cape Canaveral

  const R_MOON_ORBIT = 3.84399e8;      // m — semi-major axis of the lunar orbit
  const T_MOON = 27.321661 * DAY;      // s — sidereal month
  const MOON_MASS_RATIO = 0.0123000371; // M_moon / M_earth

  const MAX_SHOTS = 8;
  const TRAIL_MAX = 1400;
  const LETTERS = 'ABCDEFGH';
  const VERDICT_COLOR = { suborbital: COLORS.orange, orbit: COLORS.green, escape: COLORS.cyan };

  class EscapeSim extends Sim {
    init() {
      this.bodyKey = 'earth';
      this.body = BODIES.earth;
      this.mode = 'cannon';        // 'cannon' | 'rocket' | 'moon'
      this.altFrac = 0.15;         // launch height as a fraction of R
      this.speedFrac = 0.72;       // launch speed as a fraction of v_esc at launch radius
      this.aimDeg = 0;             // 0° = along the local horizon (Newton's cannon)
      this.engineIdx = 1;
      this.massRatio = 12;
      this.moonExp = 2.6;          // deliberately NOT 2 — the reader finds it
      this.shots = [];
      this.drag = null;
      this.tNow = 0;
      this._shotCount = 0;
      this.buildControls();
      this.bindPointer();
      this.updateReadout();
    }

    /* ---------------- derived physics ---------------- */

    get rLaunch() { return this.body.R * (1 + this.altFrac); }
    vEsc(r) { return Math.sqrt((2 * this.body.GM) / r); }
    vCirc(r) { return Math.sqrt(this.body.GM / r); }
    // One surface-grazing orbit is made to take ~8 wall seconds, whatever the body.
    get timeRate() {
      const R = this.body.R;
      return (2 * Math.PI * Math.sqrt((R * R * R) / this.body.GM)) / 8;
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: "Newton's cannon", value: 'cannon' },
        { label: 'the rocket problem', value: 'rocket' },
        { label: "Newton's Moon test", value: 'moon' },
      ], { initial: 'cannon', onSelect: (v) => this.setMode(v) });

      this.bodyBtns = buttonRow(c, [
        { label: 'Earth', value: 'earth' },
        { label: 'Moon', value: 'moon' },
        { label: 'Mars', value: 'mars' },
        { label: 'Jupiter', value: 'jupiter' },
        { label: 'Ceres', value: 'ceres' },
        { label: 'the Sun', value: 'sun' },
      ], {
        initial: 'earth',
        onSelect: (v) => {
          this.bodyKey = v;
          this.body = BODIES[v];
          this.shots.length = 0;      // trajectories belong to their world
          this._shotCount = 0;
          this.cache.invalidate();
          this.refreshSliders();
          this.updateReadout();
          this.poke();
        },
      });

      this.altSlider = slider(c, {
        label: 'launch height',
        min: 0.02, max: 0.6, value: this.altFrac,
        format: (v) => fmtLen(v * this.body.R, 0),
        oninput: (v) => {
          this.altFrac = v;
          this.cache.invalidate();
          this.refreshSliders();
          this.updateReadout();
          this.poke();
        },
      });

      this.speedSlider = slider(c, {
        label: 'muzzle speed',
        min: 0.05, max: 1.4, value: this.speedFrac,
        format: (v) => `${fmtNum((v * this.vEsc(this.rLaunch)) / 1000, 2)} km/s = ${fmtNum(v, 2)} × v_esc`,
        oninput: (v) => { this.speedFrac = v; this.updateReadout(); this.poke(); },
      });

      this.angleSlider = slider(c, {
        label: 'launch angle',
        min: -30, max: 90, step: 1, value: this.aimDeg,
        format: (v) => `${fmtNum(v, 0)}° above the horizon`,
        oninput: (v) => { this.aimDeg = v; this.poke(); },
      });

      this.engineBtns = buttonRow(c, ENGINES.map((e, i) => ({ label: e.label, value: i })), {
        initial: this.engineIdx,
        onSelect: (i) => { this.engineIdx = i; this.updateReadout(); this.poke(); },
      });

      this.mrSlider = slider(c, {
        label: 'mass ratio m₀/m₁',
        min: 1.05, max: 40, value: this.massRatio, log: true,
        format: (v) => `${fmtNum(v, 2)} → ${fmtNum(100 * (1 - 1 / v), 1)}% propellant`,
        oninput: (v) => { this.massRatio = v; this.updateReadout(); this.poke(); },
      });

      // The Moon test is a FIT, not a statement. The reader sweeps the exponent
      // n in a ∝ 1/rⁿ and watches the model bar slide against the fixed measured
      // bar; the agreement peaks at n = 2 and nowhere else. That is Newton's
      // 1666/1687 argument reproduced as a measurement rather than asserted.
      this.expSlider = slider(c, {
        label: 'test a force law  a ∝ 1/rⁿ',
        min: 1, max: 3, step: 0.01, value: this.moonExp,
        format: (v) => `n = ${fmtNum(v, 2)}${Math.abs(v - 2) < 0.005 ? '  ← inverse square' : ''}`,
        oninput: (v) => {
          this.moonExp = v;
          if (Math.abs(v - 2) < 0.005 && !this._citedMoonFit) {
            this._citedMoonFit = true;
            this.cite('1687 Newton - Philosophiae Naturalis Principia Mathematica (Mathematical Principles of Natural Philosophy)');
          }
          this.updateReadout();
          this.poke();
        },
      });

      this.fireBtn = actionButton(c, 'fire!', () => { this.fire(this.speedFrac * this.vEsc(this.rLaunch), this.aimDeg); });
      this.clearBtn = actionButton(c, 'clear shots', () => { this.shots.length = 0; this._shotCount = 0; this.updateReadout(); this.poke(); });

      this.setMode('cannon');
    }

    // The three modes need different controls; hide rather than rebuild so the
    // reader's settings survive a round trip.
    setMode(v) {
      this.mode = v;
      // Drop any drag in flight: a pointerdown in cannon mode followed by a
      // mode switch (a second touch on the buttons) would otherwise fire a
      // shot on pointerup while the rocket or Moon panel is on screen.
      this.drag = null;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      const cannon = v === 'cannon';
      const rocket = v === 'rocket';
      [this.bodyBtns, this.altSlider, this.speedSlider, this.angleSlider].forEach((c) => show(c, cannon));
      [this.engineBtns, this.mrSlider].forEach((c) => show(c, rocket));
      show(this.expSlider, v === 'moon');
      this.fireBtn.style.display = cannon ? '' : 'none';
      this.clearBtn.style.display = cannon ? '' : 'none';
      // Cite the paper whose equation is actually on screen: the rocket panel
      // computes Δv = v_e·ln(m₀/m₁), which IS the 1903 paper.
      if (rocket) this.cite('1903 Tsiolkovsky - Исследование мировых пространств реактивными приборами (Exploration of Cosmic Space by Means of Reaction Devices)');
      if (v === 'moon') this.cite('1687 Newton - Philosophiae Naturalis Principia Mathematica (Mathematical Principles of Natural Philosophy)');
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    refreshSliders() {
      this.altSlider.set(this.altFrac);
      this.speedSlider.set(this.speedFrac);
    }

    /* ---------------- pointer: drag from the muzzle ---------------- */

    bindPointer() {
      const cv = this.canvasEl;
      const pos = (e) => {
        const rect = cv.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
      };
      cv.addEventListener('pointerdown', (e) => {
        if (this.mode !== 'cannon') return;
        const [x, y] = pos(e);
        this.drag = { x, y };
        try { cv.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
        this.poke();
      });
      cv.addEventListener('pointermove', (e) => {
        if (!this.drag) return;
        const [x, y] = pos(e);
        this.drag.x = x;
        this.drag.y = y;
        this.applyDrag();
        this.poke();
      });
      const finish = () => {
        if (!this.drag) return;
        this.applyDrag();
        this.drag = null;
        this.fire(this.speedFrac * this.vEsc(this.rLaunch), this.aimDeg);
      };
      cv.addEventListener('pointerup', finish);
      cv.addEventListener('pointercancel', () => { this.drag = null; this.poke(); });
    }

    // Drag vector → (speed, angle). Length is measured from the muzzle, so a
    // drag of dragFull pixels is exactly escape speed at the launch radius.
    applyDrag() {
      const g = this.geom();
      const [mx, my] = this.muzzle(g);
      const dx = this.drag.x - mx;
      const dy = this.drag.y - my;
      const len = Math.hypot(dx, dy);
      const dragFull = Math.min(this.w, this.h) * 0.3;
      this.speedFrac = Math.max(0.05, Math.min(1.4, len / dragFull));
      if (len > 6) {
        const deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
        this.aimDeg = Math.max(-30, Math.min(90, deg));
        this.angleSlider.set(this.aimDeg);
      }
      this.speedSlider.set(this.speedFrac);
      this.updateReadout();
    }

    /* ---------------- firing & integration ---------------- */

    fire(speed, aimDeg) {
      const r0 = this.rLaunch;
      const a = (aimDeg * Math.PI) / 180;
      // body-centred coordinates, y DOWN to match the screen; the muzzle sits at
      // the top of the globe, so "up" is −y and the local horizon is +x.
      const shot = {
        x: 0, y: -r0,
        vx: speed * Math.cos(a), vy: -speed * Math.sin(a),
        trail: [[0, -r0]],
        live: true, done: null, t: 0, v0: speed, aim: aimDeg,
        letter: LETTERS[this._shotCount % LETTERS.length],
      };
      this._shotCount++;
      this.shots.push(shot);
      if (this.shots.length > MAX_SHOTS) this.shots.shift();
      if (!this._citedShot) {
        this._citedShot = true;
        this.cite('1728 Newton - De mundi systemate (A Treatise of the System of the World)');
      }
      this.updateReadout();
      this.poke();
    }

    // Conserved quantities read straight off the integrated state.
    classify(s) {
      const { GM, R } = this.body;
      const r = Math.hypot(s.x, s.y);
      const v2 = s.vx * s.vx + s.vy * s.vy;
      const eps = v2 / 2 - GM / r;                       // specific orbital energy
      const hz = s.x * s.vy - s.y * s.vx;                // specific angular momentum
      const ex = (s.vy * hz) / GM - s.x / r;             // eccentricity vector
      const ey = (-s.vx * hz) / GM - s.y / r;
      const e = Math.hypot(ex, ey);
      const a = -GM / (2 * eps);
      const rp = a * (1 - e);                            // works for a<0, e>1 too
      // Apogee exists whenever the energy is negative — including the straight-up
      // shot, which is a degenerate ellipse with e = 1 exactly (h = 0). Testing
      // e < 1 instead of ε < 0 would call that one "unbound", which it is not.
      const ra = eps < 0 ? a * (1 + e) : Infinity;
      // A shot that has already hit the ground is suborbital, whatever its
      // energy says. Fire steeply downward at more than v_esc and the state is
      // genuinely unbound (ε > 0) while the trajectory still intersects the
      // planet — the hyperbola just happens to pass below the surface. Reading
      // the energy alone would label a visible crater "ESCAPE".
      const verdict = s.done === 'impact'
        ? 'suborbital'
        : (eps >= 0 ? 'escape' : (rp <= R ? 'suborbital' : 'orbit'));
      return { r, v: Math.sqrt(v2), eps, e, a, rp, ra, verdict };
    }

    update(dt) {
      this.tNow += dt;
      if (this.mode !== 'cannon') return;
      const { GM, R } = this.body;
      const g = this.geom();
      const farM = (Math.max(this.w, this.h) * 1.15) / g.pxPerM;
      const acc = (x, y) => {
        const rr = Math.hypot(x, y);
        const k = -GM / (rr * rr * rr);
        return [k * x, k * y];
      };
      let changed = false;

      for (const s of this.shots) {
        if (!s.live) continue;
        let remaining = dt * this.timeRate;
        let guard = 0;
        while (remaining > 1e-9 && guard++ < 600) {
          const r = Math.hypot(s.x, s.y);
          // Step ≈ 1/400 of the LOCAL orbital timescale: automatically tiny at
          // perigee (where the acceleration swings fastest) and generous far out.
          const h = Math.min(remaining, 0.0025 * 2 * Math.PI * Math.sqrt((r * r * r) / GM));
          remaining -= h;
          verletStep(s, acc, h);
          s.t += h;
          const rNew = Math.hypot(s.x, s.y);
          if (rNew <= R) {
            // put the ball on the ground rather than under it
            const k = R / rNew;
            s.x *= k; s.y *= k;
            s.live = false;
            s.done = 'impact';
            changed = true;
            break;
          }
          if (rNew > farM) {
            s.live = false;
            s.done = this.classify(s).verdict === 'escape' ? 'gone' : 'offscreen';
            changed = true;
            break;
          }
          s.trail.push([s.x, s.y]);
          if (s.trail.length > TRAIL_MAX) s.trail.shift();
        }
        if (s.live) {
          const c = this.classify(s);
          // The cannonball that "never lands at all" is from De mundi systemate,
          // NOT the Principia — the section's prose says so, so the on-canvas
          // chip has to agree with it. The Principia's own content (Book III,
          // Prop. 4) is demonstrated by the Moon test, and is cited there.
          if (c.verdict === 'orbit' && !this._citedOrbit) {
            this._citedOrbit = true;
            this.cite('1728 Newton - De mundi systemate (A Treatise of the System of the World)');
          }
          // Escaping is still Newton's geometry, not Tsiolkovsky's — his 1903
          // equation is about how a rocket buys Δv, and is cited in that panel.
          if (c.verdict === 'escape' && !this._citedEscape) {
            this._citedEscape = true;
            this.cite('1728 Newton - De mundi systemate (A Treatise of the System of the World)');
          }
        }
      }
      if (changed) this.updateReadout();
    }

    /* ---------------- rocket & Moon-test arithmetic ---------------- */

    rocketNumbers() {
      const eng = ENGINES[this.engineIdx];
      const ve = eng.isp * G0;
      const dv = ve * Math.log(this.massRatio);
      const propFrac = 1 - 1 / this.massRatio;
      const vLeo = Math.sqrt(BODIES.earth.GM / (BODIES.earth.R + LEO_ALT));
      const spin = OMEGA_EARTH * R_EARTH * Math.cos(LAUNCH_LAT);
      const budget = vLeo + ASCENT_LOSS - spin;
      const mrNeeded = Math.exp(budget / ve);
      // Liftoff needs thrust > weight. The heaviest thing an engine can hold up
      // at Earth's surface is m_max = F/g₀; if that is less than the engine's own
      // dry mass, no vehicle built around it can leave the pad at any mass ratio.
      const liftMass = eng.thrust / G0;
      const canLift = liftMass > eng.dryMass;
      return {
        eng, ve, dv, propFrac, vLeo, spin, budget, mrNeeded,
        fracNeeded: 1 - 1 / mrNeeded, liftMass, canLift,
      };
    }

    moonNumbers() {
      const GM = BODIES.earth.GM;
      const gSurf = GM / (R_EARTH * R_EARTH);
      const n = this.moonExp;
      // The reader's trial force law, scaled from the surface out to the Moon.
      const predicted = gSurf * (R_EARTH / R_MOON_ORBIT) ** n;
      // What is actually measured: the Moon's centripetal acceleration, from its
      // distance and period alone — no force law assumed anywhere in this number.
      const observed = (4 * Math.PI * Math.PI * R_MOON_ORBIT) / (T_MOON * T_MOON);
      const inverseSq = gSurf * (R_EARTH / R_MOON_ORBIT) ** 2;
      const corrected = inverseSq * (1 + MOON_MASS_RATIO);          // Moon orbits the barycentre
      // The exponent that would fit exactly, solved rather than guessed:
      // n* = ln(g/a_obs) / ln(r/R).
      const nBest = Math.log(gSurf / observed) / Math.log(R_MOON_ORBIT / R_EARTH);
      return {
        gSurf, predicted, observed, corrected, inverseSq, n, nBest,
        dist: R_MOON_ORBIT / R_EARTH,
        agree: (inverseSq / observed) * 100,
        agreeCorr: (corrected / observed) * 100,
        miss: Math.abs(predicted / observed - 1),
      };
    }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'rocket') return this.rocketReadout();
      if (this.mode === 'moon') return this.moonReadout();
      const { R, GM, name } = this.body;
      const rL = this.rLaunch;
      const kms = (v) => `${fmtNum(v / 1000, 2)} km/s`;
      const last = this.shots[this.shots.length - 1];
      const lines = [
        [
          [name, 'yellow'],
          [` — surface gravity ${fmtNum(GM / (R * R), 2)} m/s²   ·   v_circ = `, null], [kms(this.vCirc(R)), 'green'],
          ['   ·   v_esc = ', null], [kms(this.vEsc(R)), 'cyan'],
          [` (= √2 × v_circ, and it does not depend on which way you aim)`, null],
        ],
        [
          [`firing from ${fmtLen(this.altFrac * R, 0)} up`, null],
          ['   ·   there v_circ = ', null], [kms(this.vCirc(rL)), 'green'],
          [', v_esc = ', null], [kms(this.vEsc(rL)), 'cyan'],
          ['   ·   your muzzle speed ', null],
          [`${kms(this.speedFrac * this.vEsc(rL))} = ${fmtNum(this.speedFrac, 2)} × v_esc`, 'yellow'],
          [` at ${fmtNum(this.aimDeg, 0)}°`, null],
        ],
      ];
      if (last) {
        const c = this.classify(last);
        const verdictText = {
          suborbital: 'SUBORBITAL — perigee is below the surface, so it comes back down',
          orbit: 'IN ORBIT — perigee clears the ground; it will keep going round',
          escape: 'ESCAPE — energy is positive; it never comes back',
        }[c.verdict];
        lines.push([
          [`shot ${last.letter}, measured from the integration: `, null],
          [`ε = ${sci(c.eps, 2)} J/kg`, c.eps >= 0 ? 'cyan' : 'orange'],
          ['   ·   e = ', null], [fmtNum(c.e, 3), 'pink'],
          ['   ·   apogee ', null],
          [isFinite(c.ra) ? `${fmtLen(c.ra - R, 0)} up` : 'none — unbound', 'yellow'],
          ['   ·   perigee ', null],
          [!isFinite(c.rp) ? 'none — exactly parabolic'
            : (c.rp <= R ? `${fmtLen(R - c.rp, 0)} BELOW the ground` : `${fmtLen(c.rp - R, 0)} up`),
            c.rp <= R ? 'red' : 'green'],
        ]);
        lines.push([[verdictText, c.verdict === 'escape' ? 'cyan' : (c.verdict === 'orbit' ? 'green' : 'orange')]]);
      } else {
        lines.push([['drag from the cannon — length sets the speed, direction sets the aim — then let go. Weak shots fall back, the right shot circles the world, a harder one leaves forever.', 'yellow']]);
      }
      setReadout(this.readoutEl, lines);
    }

    rocketReadout() {
      const n = this.rocketNumbers();
      const kms = (v) => `${fmtNum(v / 1000, 2)} km/s`;
      // Δv alone does not get you to orbit — you must also be able to lift off.
      const enough = n.dv >= n.budget && n.canLift;
      if (enough && !this._citedGoddard) {
        this._citedGoddard = true;
        this.cite('1919 Goddard - A Method of Reaching Extreme Altitudes');
      }
      setReadout(this.readoutEl, [
        [
          [`${n.eng.label} (${n.eng.note})`, 'yellow'],
          [` — vacuum Isp ${fmtNum(n.eng.isp, 0)} s, so exhaust velocity v_e = Isp × g₀ = `, null],
          [kms(n.ve), 'cyan'],
        ],
        [
          [`mass ratio ${fmtNum(this.massRatio, 2)} → `, null],
          [`${fmtNum(100 * n.propFrac, 1)}% of the rocket is propellant`, 'orange'],
          ['   ·   Δv = v_e ln(m₀/m₁) = ', null], [kms(n.dv), 'green'],
        ],
        [
          ['the real bill for low Earth orbit: orbital speed at 200 km ', null], [kms(n.vLeo), 'cyan'],
          [' + gravity/steering/drag losses ', null], [kms(ASCENT_LOSS), 'red'],
          [' − the free ride from Earth\'s spin at 28.5° ', null], [kms(n.spin), 'green'],
          [' = ', null], [kms(n.budget), 'yellow'],
        ],
        n.canLift ? [
          [enough ? 'that reaches orbit — with ' : 'not enough — short by ', enough ? 'green' : 'red'],
          [kms(Math.abs(n.dv - n.budget)), enough ? 'green' : 'red'],
          [enough ? ' to spare.' : '.', null],
          [`  This engine needs a mass ratio of ${fmtNum(n.mrNeeded, 2)} — `, null],
          [`${fmtNum(100 * n.fracNeeded, 1)}% propellant`, 'orange'],
          [' — which is why a rocket on the pad is essentially a tank with a nozzle.', null],
        ] : [
          // The Δv is real, but it is unreachable from the ground: F/g₀ is less
          // than the thruster's own mass, so it cannot even hold ITSELF up.
          ['the Δv is real, but this engine can never leave the pad', 'red'],
          [` — it pushes with ${fmtNum(n.eng.thrust * 1e3, 0)} mN, enough to hold up `, null],
          [`${fmtNum(n.liftMass * 1e3, 1)} g`, 'orange'],
          [` against Earth's gravity, while the thruster alone weighs ${fmtNum(n.eng.dryMass, 1)} kg. `, null],
          ['Thrust must exceed weight to lift off; ion engines are switched on ', null],
          ['after', 'yellow'],
          [' a chemical rocket has done the launching, then push for months.', null],
        ],
      ]);
    }

    moonReadout() {
      const m = this.moonNumbers();
      const close = m.miss < 0.02;
      setReadout(this.readoutEl, [
        [
          ['Newton\'s test — Principia Book III, Prop. 4 (1687)', 'yellow'],
          [` — gravity at Earth's surface is GM/R² = ${fmtNum(m.gSurf, 3)} m/s². The Moon sits ${fmtNum(m.dist, 1)} Earth-radii out.`, null],
        ],
        [
          [`YOUR LAW — a ∝ 1/r^${fmtNum(m.n, 2)}, scaled from the surface to the Moon: `, null],
          [`${sci(m.predicted, 3)} m/s²`, 'cyan'],
        ],
        [
          ['MEASUREMENT — the Moon\'s real centripetal acceleration 4π²r/T² (sidereal month ', null],
          [`${fmtNum(T_MOON / DAY, 3)} days`, null], ['): ', null], [`${sci(m.observed, 3)} m/s²`, 'green'],
        ],
        [
          ['your law is off by ', null],
          [`${m.miss > 9 ? sci(m.miss * 100, 0) : fmtNum(m.miss * 100, m.miss < 0.1 ? 2 : 0)}%`, close ? 'green' : 'red'],
          ['.  The exponent that fits exactly is ', null],
          [`n = ${fmtNum(m.nBest, 3)}`, 'yellow'],
          [' — solved from the data, not assumed. Set n = 2 and the miss drops to ', null],
          [`${fmtNum(Math.abs(m.inverseSq / m.observed - 1) * 100, 1)}%`, 'pink'],
          ['; the leftover is real physics, not sloppiness — the Moon orbits the common centre of mass, so the honest comparison uses G(M⊕+M☾)/r², which lands at ', null],
          [`${fmtNum(m.agreeCorr, 2)}%`, 'pink'],
          ['.', null],
        ],
        [
          ['Newton first ran this in 1666 with a poor figure for the Earth\'s size and recalled only that the two "answer pretty nearly" — his phrase, from a memorandum written about fifty years later, not from the Principia.', null],
        ],
      ]);
    }

    /* ---------------- geometry & drawing ---------------- */

    geom() {
      const compact = this.w < 640;
      const Rpx = Math.min(this.w, this.h) * (compact ? 0.2 : 0.17);
      const cx = compact ? this.w * 0.5 : this.w * 0.4;
      const cy = this.h * (compact ? 0.66 : 0.62);
      return { compact, Rpx, cx, cy, pxPerM: Rpx / this.body.R };
    }

    muzzle(g) { return [g.cx, g.cy - this.rLaunch * g.pxPerM]; }

    render() {
      if (this.mode === 'rocket') return this.renderRocket();
      if (this.mode === 'moon') return this.renderMoonTest();
      this.renderCannon();
    }

    renderCannon() {
      const { rc, ctx, w, h } = this;
      const g = this.geom();
      const { cx, cy, Rpx, pxPerM, compact } = g;
      const key = `${this.bodyKey}-${Rpx | 0}-${w}x${h}`;
      const col = this.body.color;

      // the world
      this.cache.draw(`world-${key}`, (gen) => gen.circle(cx, cy, Rpx * 2, opts(301, {
        stroke: col, strokeWidth: 2.2, fill: col, fillStyle: 'hachure', fillWeight: 0.7, hachureGap: 11,
      })));

      // the reference circle: the orbit you get at EXACTLY v_circ for this height
      const rLpx = this.rLaunch * pxPerM;
      this.cache.draw(`vcirc-${key}-${(this.altFrac * 100) | 0}`, (gen) => gen.circle(cx, cy, rLpx * 2, opts(302, {
        stroke: COLORS.green, strokeWidth: 1.1, strokeLineDash: [5, 8],
      })));

      // mountain: height is TRUE (its tip is the launch radius), width exaggerated
      const [mx, my] = this.muzzle(g);
      const mw = compact ? 15 : 20;
      this.cache.draw(`mtn-${key}-${(this.altFrac * 100) | 0}`, (gen) => gen.path(
        `M ${cx - mw} ${cy - Rpx + 2} L ${mx} ${my} L ${cx + mw} ${cy - Rpx + 2}`,
        opts(303, { stroke: COLORS.ink, strokeWidth: 1.8 }),
      ));

      // trails, in body-centred metres → pixels
      for (const s of this.shots) {
        const c = this.classify(s);
        const cc = VERDICT_COLOR[c.verdict];
        if (s.trail.length > 1) {
          ctx.strokeStyle = cc;
          ctx.globalAlpha = s.live ? 0.85 : 0.55;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let i = 0; i < s.trail.length; i++) {
            const x = cx + s.trail[i][0] * pxPerM;
            const y = cy + s.trail[i][1] * pxPerM;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const bx = cx + s.x * pxPerM;
        const by = cy + s.y * pxPerM;
        if (s.live) {
          ctx.fillStyle = cc;
          ctx.beginPath();
          ctx.arc(bx, by, 3.6, 0, Math.PI * 2);
          ctx.fill();
        } else if (s.done === 'impact') {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            rc.line(bx, by, bx + Math.cos(a) * 8, by + Math.sin(a) * 8, opts(310 + i, { stroke: COLORS.orange, strokeWidth: 1.3 }));
          }
        }
        // frozen shots may be off the page — pin their letter to the edge so the
        // reader can still tell which arc went where
        const lx = Math.max(14, Math.min(this.w - 90, bx + 7));
        const ly = Math.max(18, Math.min(this.h - 40, by - 6));
        const tag = s.done === 'offscreen' ? `${s.letter} — still bound, apogee off the page`
          : (s.done === 'gone' ? `${s.letter} — gone` : s.letter);
        label(ctx, tag, lx, ly, { color: cc, size: 13 });
      }

      // aim preview (live while dragging, and always from the sliders)
      const speed = this.speedFrac * this.vEsc(this.rLaunch);
      const aim = (this.aimDeg * Math.PI) / 180;
      const dragFull = Math.min(w, h) * 0.3;
      const alen = 16 + (speed / this.vEsc(this.rLaunch)) * dragFull;
      const ax = mx + Math.cos(aim) * alen;
      const ay = my - Math.sin(aim) * alen;
      doodleArrow(rc, mx, my, ax, ay, { color: COLORS.yellow, seed: 320, strokeWidth: 1.8 });
      rc.circle(mx, my, 7, opts(321, { stroke: COLORS.yellow, strokeWidth: 1.6 }));
      // flip the caption inside when the arrow tip nears the right edge, or a
      // fast shot writes its speed off the canvas
      const rightSide = ax > w - 80;
      label(ctx, `${fmtNum(speed / 1000, 2)} km/s`, rightSide ? ax - 6 : ax + 6, ay - 8,
        { color: COLORS.yellow, size: 13, align: rightSide ? 'right' : 'left' });

      // stick figure gunner, for scale-that-is-not-to-scale. stickFigure takes
      // the HEAD centre and hangs ~26 px of body below it at scale 0.5, so sit
      // it on the actual circle at its own x — not at the top of the globe.
      if (!compact) {
        const gx = cx - mw - 16;
        const gy = cy - Math.sqrt(Math.max(0, Rpx * Rpx - (gx - cx) ** 2));
        stickFigure(rc, gx, gy - 26, { scale: 0.5, seed: 322, color: COLORS.muted });
      }

      // legend
      const legend = [['falls back', COLORS.orange], ['orbits', COLORS.green], ['escapes', COLORS.cyan]];
      let ly = 20;
      for (const [t, c] of legend) {
        label(ctx, t, 12, ly, { color: c, size: compact ? 12.5 : 14 });
        ly += 17;
      }
      label(ctx, compact ? 'click or drag anywhere' : 'aim: click or drag anywhere — distance from the cannon sets the speed, direction sets the aim.',
        w - 12, 20, { color: COLORS.muted, size: compact ? 12 : 13.5, align: 'right' });
      // NOT at h-10: the engine's citation chip owns the full-width band
      // y ∈ [h-26, h-6] and would bury this caption under an opaque box.
      label(ctx, 'no air — Newton stipulated it; in reality drag only fades a few hundred km up, which is why the rocket panel parks at 200 km',
        w / 2, h - 58, { color: COLORS.muted, size: compact ? 11 : 12.5, align: 'center' });
      notToScale(rc, ctx, compact ? w - 66 : w - 80, h - 40);
    }

    renderRocket() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.rocketNumbers();
      const rx = compact ? w * 0.24 : w * 0.22;
      const bodyW = compact ? 44 : 58;
      const topY = 60;
      const botY = h - 90;
      const tankTop = topY + 46;

      // hull
      this.cache.draw(`hull-${w}x${h}`, (gen) => gen.path(
        `M ${rx - bodyW / 2} ${botY} L ${rx - bodyW / 2} ${tankTop - 8} L ${rx} ${topY} L ${rx + bodyW / 2} ${tankTop - 8} L ${rx + bodyW / 2} ${botY} Z`,
        opts(330, { stroke: COLORS.ink, strokeWidth: 2 }),
      ));
      this.cache.draw(`fins-${w}x${h}`, (gen) => gen.path(
        `M ${rx - bodyW / 2} ${botY - 34} L ${rx - bodyW / 2 - 18} ${botY + 6} L ${rx - bodyW / 2} ${botY} Z `
        + `M ${rx + bodyW / 2} ${botY - 34} L ${rx + bodyW / 2 + 18} ${botY + 6} L ${rx + bodyW / 2} ${botY} Z`,
        opts(331, { stroke: COLORS.ink, strokeWidth: 1.6 }),
      ));

      // Propellant fill. The bar height is the propellant MASS fraction drawn as
      // a length — it is not tank volume: LOX and RP-1 have different densities
      // and real tank geometry is not a prism. Hence the label and the stamp.
      const tankH = botY - tankTop;
      const fillH = tankH * n.propFrac;
      rc.rectangle(rx - bodyW / 2 + 3, botY - fillH, bodyW - 6, fillH, opts(332, {
        stroke: COLORS.orange, strokeWidth: 1.4, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.9, hachureGap: 6,
      }));
      label(ctx, `${fmtNum(100 * n.propFrac, 1)}% of the launch MASS`, rx, botY - fillH - 8, { color: COLORS.orange, size: 13, align: 'center' });
      label(ctx, `${fmtNum(100 * (1 - n.propFrac), 1)}% everything else`, rx, tankTop + 12, { color: COLORS.muted, size: 12, align: 'center' });

      // Exhaust. An ion thruster has no combustion plume at all — it emits a
      // faint, very fast xenon beam of a few hundred millinewtons, so drawing it
      // with a chemical flame would contradict the readout two lines below.
      if (n.eng.thrust < 1e3) {
        rc.path(`M ${rx} ${botY} q ${-2} ${44} ${2} ${88}`, opts(340, { stroke: COLORS.cyan, strokeWidth: 1 }));
        label(ctx, 'a whisper of xenon', rx + 8, botY + 60, { color: COLORS.cyan, size: 11.5 });
      } else {
        for (let i = 0; i < 3; i++) {
          rc.path(`M ${rx - 12 + i * 12} ${botY} q ${-4} ${18 + i * 5} ${4} ${30 + i * 6}`, opts(340 + i, { stroke: i === 1 ? COLORS.yellow : COLORS.red, strokeWidth: 1.6 }));
        }
      }

      // Δv bars vs the computed LEO budget
      const bx = compact ? w * 0.42 : w * 0.46;
      // leave room for the value written past the bar's end ("9.28 km/s" ≈ 50 px)
      const bw = w - bx - 96;
      const scale = bw / Math.max(n.budget, n.dv, 1);
      const rows = [
        ['your Δv = v_e ln(m₀/m₁)', n.dv, n.dv >= n.budget ? COLORS.green : COLORS.red],
        ['what LEO actually costs', n.budget, COLORS.yellow],
      ];
      let by = compact ? 46 : 78;
      for (const [t, val, c] of rows) {
        label(ctx, t, bx, by - 8, { color: c, size: compact ? 12 : 13.5 });
        rc.rectangle(bx, by, Math.max(2, val * scale), 20, opts(t === rows[0][0] ? 350 : 351, {
          stroke: c, strokeWidth: 1.6, fill: c, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 7,
        }));
        label(ctx, `${fmtNum(val / 1000, 2)} km/s`, bx + Math.max(2, val * scale) + 8, by + 15, { color: c, size: 13 });
        by += 62;
      }
      // the budget, itemised
      const items = compact ? [
        [`orbit speed @ ${fmtLen(LEO_ALT, 0)}`, n.vLeo, COLORS.cyan],
        ['+ gravity & drag losses', ASCENT_LOSS, COLORS.red],
        ["− Earth's spin (28.5°)", -n.spin, COLORS.green],
      ] : [
        [`orbital speed at ${fmtLen(LEO_ALT, 0)}`, n.vLeo, COLORS.cyan],
        ['+ gravity, steering & drag losses', ASCENT_LOSS, COLORS.red],
        ["− Earth's spin at 28.5° latitude", -n.spin, COLORS.green],
      ];
      for (const [t, val, c] of items) {
        label(ctx, `${t}: ${val < 0 ? '−' : ''}${fmtNum(Math.abs(val) / 1000, 2)} km/s`, bx, by, { color: c, size: compact ? 11 : 13 });
        by += 19;
      }
      label(ctx, `Δv = v_e · ln(m₀/m₁)`, bx, by + 14, { color: COLORS.ink, size: compact ? 13 : 15 });
      label(ctx, `v_e = ${fmtNum(n.eng.isp, 0)} s × ${fmtNum(G0, 3)} m/s² = ${fmtNum(n.ve / 1000, 2)} km/s`, bx, by + 33, { color: COLORS.cyan, size: compact ? 11.5 : 13 });
      if (!n.canLift) {
        label(ctx, 'ion drives win the equation and lose the launch:', bx, by + 55, { color: COLORS.pink, size: compact ? 11.5 : 13 });
        label(ctx, `${fmtNum(n.eng.thrust * 1e3, 0)} mN holds up ${fmtNum(n.liftMass * 1e3, 1)} g — the thruster alone is ${fmtNum(n.eng.dryMass, 1)} kg.`,
          bx, by + 72, { color: COLORS.pink, size: compact ? 11.5 : 13 });
      }
      // the fill bar reads as a volume but encodes a mass fraction
      notToScale(rc, ctx, compact ? w - 66 : w - 80, h - 40);
    }

    renderMoonTest() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const m = this.moonNumbers();
      const ey = h * 0.4;
      const ex = compact ? w * 0.2 : w * 0.16;
      const Rpx = compact ? 34 : 48;
      const mx = w - (compact ? 46 : 84);

      this.cache.draw(`mt-earth-${w}x${h}`, (gen) => gen.circle(ex, ey, Rpx * 2, opts(360, {
        stroke: COLORS.cyan, strokeWidth: 2.2, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.7, hachureGap: 10,
      })));
      // The Moon's orbit, drawn as the arc it actually is: it is always falling
      // toward Earth and always missing — the cannonball idea, at 60 Earth radii.
      // (The old version ran a dashed line INTO the planet, which reads as the
      // Moon crashing.)
      this.cache.draw(`mt-arc-${w}x${h}`, (gen) => gen.path(
        `M ${mx} ${ey - 70 - 34} Q ${(ex + mx) / 2} ${ey - 150} ${ex + Rpx + 30} ${ey - 96}`,
        opts(361, { stroke: COLORS.muted, strokeWidth: 1.1, strokeLineDash: [5, 8] }),
      ));
      rc.circle(mx, ey - 70, 26, opts(362, { stroke: COLORS.ink, strokeWidth: 1.8 }));
      label(ctx, 'the Moon', mx, ey - 70 + 44, { color: COLORS.ink, size: 13, align: 'center' });
      label(ctx, 'always falling, always missing', (ex + mx) / 2, ey - 128,
        { color: COLORS.muted, size: compact ? 10.5 : 12, align: 'center' });

      // The apple sits ON the surface — g = GM/R² is the surface value — and its
      // arrow points at Earth's centre, i.e. along the true radial direction.
      const aAng = 0.55;
      const apx = ex + Math.cos(aAng) * (Rpx + 7);
      const apy = ey + Math.sin(aAng) * (Rpx + 7);
      rc.circle(apx, apy, 9, opts(363, { stroke: COLORS.red, strokeWidth: 1.6 }));
      doodleArrow(rc, apx, apy, apx - Math.cos(aAng) * 26, apy - Math.sin(aAng) * 26,
        { color: COLORS.red, seed: 364, strokeWidth: 1.5 });
      label(ctx, `g = ${fmtNum(m.gSurf, 2)} m/s²`, apx + 12, apy + 16, { color: COLORS.red, size: 12.5 });
      doodleArrow(rc, mx, ey - 70, mx - 34, ey - 62, { color: COLORS.green, seed: 365, strokeWidth: 1.5 });
      label(ctx, `${sci(m.observed, 2)} m/s²`, mx - 40, ey - 84, { color: COLORS.green, size: 12.5, align: 'right' });
      label(ctx, `${fmtNum(m.dist, 1)} Earth radii →`, (ex + mx) / 2, ey + 4, { color: COLORS.muted, size: compact ? 11.5 : 13, align: 'center' });

      // model vs measurement, drawn as bars (log-free: they are nearly equal)
      const by0 = h - (compact ? 130 : 140);
      const bw = Math.min(260, w * 0.5);
      const big = Math.max(m.predicted, m.observed);
      const close = m.miss < 0.02;
      const bars = [
        [`YOUR LAW  a ∝ 1/r^${fmtNum(m.n, 2)} = ${sci(m.predicted, 3)} m/s²`, m.predicted, close ? COLORS.green : COLORS.red, 370],
        [`MEASURED  4π²r/T² = ${sci(m.observed, 3)} m/s²`, m.observed, COLORS.green, 371],
      ];
      let by = by0;
      for (const [t, val, c, seed] of bars) {
        label(ctx, t, 16, by - 6, { color: c, size: compact ? 11.5 : 13 });
        // clamp so an n=1 model (60× too big) cannot draw off the canvas
        rc.rectangle(16, by, Math.max(2, Math.min(1, val / big) * bw), 16,
          opts(seed, { stroke: c, strokeWidth: 1.5, fill: c, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 6 }));
        by += 42;
      }
      // fit meter — it collapses to zero only at the inverse square
      const meterW = bw;
      const bad = Math.min(1, Math.log10(1 + m.miss * 9) / Math.log10(10));
      rc.rectangle(16, by, meterW, 12, opts(372, { stroke: COLORS.muted, strokeWidth: 1.1 }));
      rc.rectangle(16, by, Math.max(1.5, bad * meterW), 12, opts(373, {
        stroke: close ? COLORS.green : COLORS.red, strokeWidth: 1.2,
        fill: close ? COLORS.green : COLORS.red, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 5,
      }));
      label(ctx, close ? `off by ${fmtNum(m.miss * 100, 2)}% — that is the inverse square` : `off by ${m.miss > 9 ? sci(m.miss * 100, 0) : fmtNum(m.miss * 100, 0)}% — try another n`,
        16, by + 30, { color: close ? COLORS.yellow : COLORS.red, size: compact ? 13 : 16 });
      label(ctx, `best fit n = ${fmtNum(m.nBest, 3)}  ·  at n = 2 the miss is ${fmtNum(Math.abs(m.inverseSq / m.observed - 1) * 100, 1)}% (${fmtNum(m.agreeCorr, 2)}% once the Moon's own mass counts)`,
        16, by + 48, { color: COLORS.pink, size: compact ? 10.5 : 12.5 });
      notToScale(rc, ctx, compact ? w - 66 : w - 80, 26);
    }
  }

  A.register('escape', EscapeSim);
})();
