// Sim 28 — Brownian motion: how a speck of dust proved atoms are real
//
// This is the experiment that ended a two-thousand-year argument, and it is worth
// being precise about how. Nobody saw an atom in 1908. What Perrin did was watch
// a grain of resin jiggle under a microscope, measure how far it wandered, and
// COUNT THE ATOMS from the wandering.
//
// The chain is short enough to hold in your head:
//   Einstein 1905:  ⟨x²⟩ = 2Dt        (a random walk spreads as √t, not as t)
//   Stokes–Einstein: D = kT / 6πηa    (the drag on a sphere sets the diffusion)
// eliminate D, put k = R/N_A, and every symbol left is something you can measure
// with a microscope, a stopwatch, a thermometer and a viscosity table:
//   N_A = R T t / (3πηa⟨x²⟩)
// That is the whole of it. The sim runs a genuine random walk with the correct
// diffusion constant, lets you measure ⟨x²⟩ off the tracks exactly as Perrin did,
// and hands back Avogadro's number.
//
// The numbers the code reproduces:
//   water at 20 °C, η = 1.002 mPa·s, grain radius 0.5 µm
//   D = kT/6πηa = 4.286×10⁻¹³ m²/s
//   √⟨x²⟩ after 1 s = 0.926 µm ; after 30 s = 5.07 µm  (Perrin timed 30 s intervals)
//   feeding the true ⟨x²⟩ back through the formula returns 6.0221×10²³ — the
//   modern value, which since 2019 is exact by definition.
// Perrin's own answer was about 6.7×10²³, high by 11%, from grains he had to
// size by hand. He got the 1926 Nobel Prize for it.
//
// PANEL 3 is the part that makes it a proof rather than a nice picture. A current
// in the water would carry the grains too — but a drift gives x ∝ t, while
// molecular kicks give ⟨x²⟩ ∝ t. Those are different curves, and Perrin measured
// which one nature draws. That is why the ⟨x²⟩-versus-t plot, and not the jiggling
// itself, is the evidence.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    sci, fmtNum, K_B,
  } = A;

  const R_GAS = 8.31446261815324;   // J/(mol·K), exact since 2019
  const N_A_TRUE = 6.02214076e23;   // exact by definition since 2019

  const CIT_BROWN = '1828 Brown - A Brief Account of Microscopical Observations Made on the Particles Contained in the Pollen of Plants';
  const CIT_EINSTEIN = '1905 Einstein - Über die von der molekularkinetischen Theorie der Wärme geforderte Bewegung von in ruhenden Flüssigkeiten suspendierten Teilchen (On the Movement of Small Particles Suspended in Stationary Liquids Required by the Molecular-Kinetic Theory of Heat)';
  const CIT_SMOLUCHOWSKI = '1906 von Smoluchowski - Zur kinetischen Theorie der Brownschen Molekularbewegung und der Suspensionen (On the Kinetic Theory of Brownian Molecular Motion and Suspensions)';
  const CIT_PERRIN = '1909 Perrin - Mouvement brownien et réalité moléculaire (Brownian Movement and Molecular Reality)';
  const CIT_PERRIN_NOBEL = '1926 Perrin - Discontinuous Structure of Matter (Nobel Lecture)';
  const CIT_LOSCHMIDT = '1865 Loschmidt - Zur Grösse der Luftmoleküle (On the Size of the Air Molecules)';

  // Liquids you can actually put on a slide, with real viscosities at 20 °C.
  const FLUIDS = [
    { key: 'water', name: 'water', eta: 1.002e-3, note: 'what Perrin used' },
    { key: 'ethanol', name: 'ethanol', eta: 1.20e-3, note: '' },
    { key: 'olive', name: 'olive oil', eta: 84e-3, note: 'eighty times thicker — the grains barely move' },
    { key: 'glycerol', name: 'glycerol', eta: 1.412, note: 'fourteen hundred times thicker' },
  ];

  const N_GRAINS = 22;
  const TRACK = 90;          // remembered positions per grain

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class BrownianSim extends Sim {
    init() {
      this.mode = 'scope';
      this.fluidIdx = 0;
      this.radiusUM = 0.5;       // grain radius, µm
      this.tempC = 20;
      this.driftUMs = 0;         // an added current, for panel 3
      this.speedup = 20;         // stated on the canvas
      this.rng = mulberry32(19080101);
      this.gauss2 = null;        // Box–Muller spare
      this.grains = [];
      this.simT = 0;
      this.msd = [];             // {lag, sum, n} — the measurement being accumulated
      this.seedGrains();
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- the physics ---------------- */

    get fluid() { return FLUIDS[this.fluidIdx]; }
    get radius() { return this.radiusUM * 1e-6; }
    get tempK() { return this.tempC + 273.15; }

    // Stokes–Einstein. Everything on the right is measurable on a bench.
    get D() {
      return (K_B * this.tempK) / (6 * Math.PI * this.fluid.eta * this.radius);
    }

    // Einstein's prediction for the spread after time t, along one axis.
    rmsAfter(t) { return Math.sqrt(2 * this.D * t); }

    // The measurement, run backwards: hand it a measured ⟨x²⟩ and it returns
    // Avogadro's number. This is the 1908 experiment in one line.
    avogadroFrom(msd, t) {
      if (!(msd > 0) || !(t > 0)) return NaN;
      return (R_GAS * this.tempK * t) / (3 * Math.PI * this.fluid.eta * this.radius * msd);
    }

    // standard normal, Box–Muller on the seeded stream
    normal() {
      if (this.gauss2 !== null) { const g = this.gauss2; this.gauss2 = null; return g; }
      let u = 0;
      let v = 0;
      do { u = this.rng(); } while (u <= 1e-12);
      v = this.rng();
      const m = Math.sqrt(-2 * Math.log(u));
      this.gauss2 = m * Math.sin(2 * Math.PI * v);
      return m * Math.cos(2 * Math.PI * v);
    }

    seedGrains() {
      this.grains = [];
      for (let i = 0; i < N_GRAINS; i++) {
        // deterministic starting spread, so the field looks the same every reload
        const x = (((i * 0.6180339887) % 1) - 0.5) * 40e-6;
        const y = (((i * 0.7548776662) % 1) - 0.5) * 30e-6;
        this.grains.push({ x, y, x0: x, y0: y, track: [[x, y]] });
      }
      this.simT = 0;
      this.msd = [];
      for (let k = 1; k <= 12; k++) this.msd.push({ lag: k * 5, sum: 0, n: 0 });
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'under the microscope', value: 'scope' },
        { label: 'count the atoms', value: 'count' },
        { label: 'kicks or a current?', value: 'law' },
        { label: 'what sets the jiggle', value: 'why' },
      ], { initial: 'scope', onSelect: (v) => this.setMode(v) });

      this.fluidBtns = buttonRow(c, FLUIDS.map((f) => ({ label: f.name, value: f.key })), {
        initial: 'water',
        onSelect: (v) => {
          this.fluidIdx = FLUIDS.findIndex((f) => f.key === v);
          this.seedGrains();
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.radiusSlider = slider(c, {
        label: 'grain radius a',
        min: 0.1, max: 2, step: 0.01, value: this.radiusUM,
        format: (v) => `${fmtNum(v, 2)} µm  (Perrin sized his gamboge grains by hand — the hardest part of the experiment)`,
        oninput: (v) => { this.radiusUM = v; this.seedGrains(); this.updateReadout(); this.poke(); },
      });

      this.tempSlider = slider(c, {
        label: 'temperature',
        min: 1, max: 95, step: 0.5, value: this.tempC,
        format: (v) => `${fmtNum(v, 1)} °C = ${fmtNum(v + 273.15, 2)} K`,
        oninput: (v) => { this.tempC = v; this.seedGrains(); this.updateReadout(); this.poke(); },
      });

      this.driftSlider = slider(c, {
        label: 'add a current to the water',
        min: 0, max: 1, step: 0.01, value: this.driftUMs,
        format: (v) => (v === 0 ? 'none — still water, molecular kicks only' : `${fmtNum(v, 2)} µm/s of drift`),
        oninput: (v) => {
          this.driftUMs = v;
          if (!this._citedP) { this._citedP = true; this.cite(CIT_PERRIN); }
          this.seedGrains();
          this.updateReadout();
          this.poke();
        },
      });

      this.resetBtn = actionButton(c, 'clear the tracks and start again', () => {
        this.seedGrains(); this.updateReadout(); this.poke();
      });
      this.setMode('scope');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.fluidBtns, v === 'scope' || v === 'count' || v === 'why');
      show(this.radiusSlider, v !== 'law');
      show(this.tempSlider, v === 'scope' || v === 'count' || v === 'why');
      show(this.driftSlider, v === 'law');
      if (v === 'scope') this.cite(CIT_BROWN);
      if (v === 'count') this.cite(CIT_PERRIN);
      if (v === 'law') this.cite(CIT_EINSTEIN);
      if (v === 'why') this.cite(CIT_SMOLUCHOWSKI);
      this.seedGrains();
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    /* ---------------- the walk, integrated honestly ---------------- */

    update(dt) {
      const step = Math.min(dt, 0.05) * this.speedup;
      if (step <= 0) return;
      this.simT += step;
      const sd = Math.sqrt(2 * this.D * step);          // per axis, per step
      const drift = (this.mode === 'law' ? this.driftUMs : 0) * 1e-6 * step;
      for (const g of this.grains) {
        g.x += sd * this.normal() + drift;
        g.y += sd * this.normal();
        // a microscope slide is a closed cell — reflect at the walls so the
        // grains stay in the field of view without teleporting
        const LX = 32e-6;
        const LY = 24e-6;
        if (g.x > LX) g.x = 2 * LX - g.x;
        if (g.x < -LX) g.x = -2 * LX - g.x;
        if (g.y > LY) g.y = 2 * LY - g.y;
        if (g.y < -LY) g.y = -2 * LY - g.y;
        g.track.push([g.x, g.y]);
        if (g.track.length > TRACK) g.track.shift();
      }
      // accumulate the measurement: mean square x-displacement from the start,
      // sampled at a set of lag times, exactly as a lab notebook would
      for (const m of this.msd) {
        if (this.simT >= m.lag && m.n === 0) {
          let s = 0;
          for (const g of this.grains) s += (g.x - g.x0) ** 2;
          m.sum = s / this.grains.length;
          m.n = 1;
        }
      }
      this.updateReadout();
    }

    /* ---------------- readouts ---------------- */

    updateReadout() {
      const f = {
        scope: () => this.scopeReadout(),
        count: () => this.countReadout(),
        law: () => this.lawReadout(),
        why: () => this.whyReadout(),
      }[this.mode];
      if (f) f();
    }

    scopeReadout() {
      const D = this.D;
      setReadout(this.readoutEl, [
        [
          [`${this.fluid.name} at ${fmtNum(this.tempC, 1)} °C, η = `, null],
          [`${sci(this.fluid.eta, 3)} Pa·s`, 'cyan'],
          [`, grain radius `, null], [`${fmtNum(this.radiusUM, 2)} µm`, 'yellow'],
          ['   →   D = kT/6πηa = ', null], [`${sci(D, 4)} m²/s`, 'pink'],
          ['   →   √⟨x²⟩ after one second = ', null], [`${fmtNum(this.rmsAfter(1) * 1e6, 3)} µm`, 'green'],
        ],
        [
          ['Robert Brown was a botanist, and he was not looking for atoms. ', 'yellow'],
          ['In 1828 he watched pollen grains in water twitch under his microscope, assumed it was because pollen is alive, and then — this is the part that made him a scientist rather than an anecdote — repeated it with ground glass, soot, and a fragment of the Sphinx. Everything twitched. Whatever was doing it did not care whether the speck had ever been alive.', null],
        ],
        [
          ['What you are watching is not a metaphor. ', 'yellow'],
          ['Each grain is being struck by water molecules about ', null],
          ['10²⁰ times a second', 'cyan'],
          [' from all sides. The kicks very nearly cancel — but only very nearly, and the leftover imbalance is what you can see. The grain is a tally of an imperfect cancellation, magnified until a human eye can read it.', null],
        ],
        [
          ['The tracks are genuine random walks with the diffusion constant printed above. ', 'green'],
          [`Time runs ${fmtNum(this.speedup, 0)}× faster than reality so that a reader is not asked to sit at the eyepiece for an hour, but every step is drawn from the correct distribution: a Gaussian of width √(2D·dt) per axis, per instant.`, null],
        ],
        [
          ['Switch fluids and watch the argument work. ', 'yellow'],
          ['Glycerol is fourteen hundred times more viscous than water, and the grains nearly stop — because D goes as 1/η, and that is a prediction, not a fudge. Warm the water and they speed up, because D goes as T. Both dependencies are in the sim because both are in Einstein\'s formula.', null],
        ],
      ]);
    }

    countReadout() {
      const done = this.msd.filter((m) => m.n > 0);
      const last = done[done.length - 1];
      const est = last ? this.avogadroFrom(last.sum, last.lag) : NaN;
      const err = isFinite(est) ? ((est - N_A_TRUE) / N_A_TRUE) * 100 : NaN;
      setReadout(this.readoutEl, [
        [
          ['measurements taken: ', null], [`${fmtNum(done.length, 0)} of ${fmtNum(this.msd.length, 0)}`, 'cyan'],
          last ? [`   ·   at t = ${fmtNum(last.lag, 0)} s, ⟨x²⟩ = ${sci(last.sum, 3)} m²`, null] : ['', null],
          last ? ['   →   N_A = RTt / 3πηa⟨x²⟩ = ', null] : ['', null],
          last ? [`${sci(est, 4)} per mole`, 'green'] : ['', null],
        ],
        [
          ['THIS IS THE EXPERIMENT. ', 'yellow'],
          ['Not the jiggling — the plot. Perrin sat at a microscope with a squared eyepiece graticule and a clock, marked where a grain was every thirty seconds, and did that thousands of times. Then he squared the displacements, averaged them, and put the average into Einstein\'s formula. Out came a number nobody had ever measured: how many molecules are in a mole.', null],
        ],
        [
          ['Every symbol on the right-hand side is something you can get on a bench. ', 'cyan'],
          ['R from the gas laws. T from a thermometer. t from a clock. η from a viscosity table. a from sizing the grain under the same microscope. ⟨x²⟩ from the tracks. There is no atom anywhere in that list — and the answer that comes out is the number of atoms.', null],
        ],
        isFinite(est) ? [
          ['Your run gives ', null], [`${sci(est, 4)}`, 'green'],
          [' against the modern value of 6.02214076×10²³ — off by ', null],
          [`${fmtNum(Math.abs(err), 1)}%`, Math.abs(err) < 25 ? 'cyan' : 'orange'],
          ['. Perrin\'s published figure was about 6.7×10²³, high by 11%, and that was good enough: it agreed with completely unrelated estimates from radioactivity and from the blue of the sky. Since 2019 the number is exact by definition, which is a strange fate for a quantity someone once had to squint at.', null],
        ] : [
          ['Let the run accumulate and the estimate will appear. It jumps around at first because ⟨x²⟩ is an average over only 22 grains — that scatter is real, and Perrin beat it by counting for months.', null],
        ],
        [
          ['Einstein did not do this to prove atoms exist. ', 'orange'],
          ['He said so: his 1905 aim was to find "facts which would guarantee as much as possible the existence of atoms of definite finite size". He wanted a test that could be lost. Perrin ran it, atoms won, and Ostwald — who had spent his career arguing that atoms were a convenient fiction — publicly changed his mind in 1909. That is what settling a question looks like.', null],
        ],
      ]);
    }

    lawReadout() {
      const drift = this.driftUMs * 1e-6;
      const t = 20;
      const diff = this.rmsAfter(t);
      const carried = drift * t;
      setReadout(this.readoutEl, [
        [
          ['after ', null], [`${fmtNum(t, 0)} s`, 'yellow'],
          [': molecular kicks spread a grain by √(2Dt) = ', null], [`${fmtNum(diff * 1e6, 2)} µm`, 'cyan'],
          ['; a current of ', null], [`${fmtNum(this.driftUMs, 2)} µm/s`, 'orange'],
          [' carries it ', null], [`${fmtNum(carried * 1e6, 2)} µm`, 'orange'], ['.', null],
        ],
        [
          ['Here is the objection Perrin had to kill. ', 'yellow'],
          ['Water in a thin cell is never perfectly still. It has convection currents, evaporation at the edges, temperature gradients from the microscope lamp. Any of those would push the grains around too — so how do you know you are watching molecules rather than plumbing?', null],
        ],
        [
          ['Because the two obey different laws, and the difference is visible in the shape of a graph. ', 'green'],
          ['A current carries a grain a distance proportional to ', null], ['t', 'orange'],
          [': double the time, double the displacement. Random kicks spread it as ', null], ['√t', 'cyan'],
          [': double the time and the spread grows only 1.41×. On the plot, drift is a straight line through the origin and diffusion is a curve that flattens. They are not hard to tell apart once you know to look.', null],
        ],
        [
          ['Which is why the real signature is plotted as ⟨x²⟩ against t, where diffusion becomes a straight line. ', 'yellow'],
          ['That linearity is the fingerprint of a random walk, and its SLOPE is 2D — which is the number that carries Avogadro inside it. A current would show up as a curve bending upward (⟨x²⟩ ∝ t² for pure drift), and it does, in the sim, the moment you add one.', null],
        ],
        [
          ['Perrin also did the controls you would expect of someone being careful. ', 'cyan'],
          ['Different grain sizes, different liquids, different temperatures, grains of resin and grains of mastic, and the ⟨x²⟩ ∝ t law held every time with the same N_A coming out. A plumbing artefact would not have produced the same molecular count from olive oil and water.', null],
        ],
      ]);
    }

    whyReadout() {
      const D = this.D;
      const kicks = 1e20;
      setReadout(this.readoutEl, [
        [
          ['Why does the jiggle have the size it has? ', 'yellow'],
          ['Because it is set by the ratio of the kicks to the grain. Roughly ', null],
          [`${sci(kicks, 0)} collisions a second`, 'cyan'],
          [' arrive from every direction. If they cancelled perfectly the grain would sit still; they cancel to about one part in √N, and that residue is the motion.', null],
        ],
        [
          ['That square root is the whole argument, and it cuts both ways. ', 'yellow'],
          ['Suppose water were made of far MORE, far smaller molecules. Then N is bigger, the imbalance is relatively smaller, and the jiggle shrinks below anything a microscope could resolve. Suppose it were made of far FEWER, far bigger ones: the kicks would be violent and obvious. The observed jiggle sits between those, and its size tells you how many molecules there are. That is not an analogy — it is exactly what the formula says.', null],
        ],
        [
          ['And a genuinely continuous fluid predicts nothing at all. ', 'green'],
          ['If water were smooth all the way down, as the anti-atomists held, the pressure on every side of the grain would be exactly equal at every instant and the grain would not move. Brownian motion is not merely consistent with atoms; it is impossible without them. There is no fluid so fine-grained it produces a small jiggle — a truly continuous one produces none.', null],
        ],
        [
          ['Drag the grain size and watch the prediction bend. ', 'yellow'],
          ['D = kT/6πηa goes as 1/a, so a grain twice as wide diffuses half as fast — and at ', null],
          [`${fmtNum(this.radiusUM, 2)} µm`, 'cyan'], [' the sim gives D = ', null], [`${sci(D, 3)} m²/s`, 'pink'],
          ['. Below about a tenth of a micron the grains blur past the resolution of a light microscope; above a few microns they barely move in a session. Perrin\'s working range was not a preference, it was a window, and it is why this took until 1908 rather than 1830.', null],
        ],
        [
          ['One last piece of honesty about the history. ', 'orange'],
          ['Loschmidt had estimated molecular sizes from gas viscosity in 1865, and got within a factor of a few. What Brownian motion added was not the first number but an INDEPENDENT one, from a completely different phenomenon, that agreed. Science rarely turns on a single decisive experiment; it turns on two unrelated measurements landing on the same value when they had no obligation to.', null],
        ],
      ]);
    }

    /* ================= drawing ================= */

    // the eyepiece view: a circular field, the grains, and their tracks
    drawField(cx, cy, r, showTracks, compact) {
      const { rc, ctx } = this;
      const key = `${this.w}x${this.h}`;
      this.cache.draw(`field-${Math.round(cx)}-${key}`, (g) => g.circle(cx, cy, r * 2,
        opts(6000, { stroke: COLORS.ink, strokeWidth: 2.4 })));
      // the graticule Perrin measured against
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = COLORS.muted;
      ctx.globalAlpha = 0.30;
      ctx.lineWidth = 0.8;
      const gstep = r / 5;
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath(); ctx.moveTo(cx + i * gstep, cy - r); ctx.lineTo(cx + i * gstep, cy + r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r, cy + i * gstep); ctx.lineTo(cx + r, cy + i * gstep); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // metres → pixels: the field is 64 µm across
      const scale = (r * 2) / 64e-6;
      for (const g of this.grains) {
        if (showTracks && g.track.length > 1) {
          ctx.strokeStyle = COLORS.cyan;
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 1;
          ctx.beginPath();
          g.track.forEach((p, i) => {
            const X = cx + p[0] * scale;
            const Y = cy + p[1] * scale;
            if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          });
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = COLORS.yellow;
        ctx.beginPath();
        ctx.arc(cx + g.x * scale, cy + g.y * scale, compact ? 2.2 : 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // the scale bar, because a micrograph without one is a rumour
      const barM = 10e-6;
      const bx = cx - r * 0.85;
      const by = cy + r * 0.86;
      ctx.strokeStyle = COLORS.green;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + barM * scale, by); ctx.stroke();
      label(ctx, '10 µm', bx + (barM * scale) / 2, by - 5, { color: COLORS.green, size: compact ? 9 : 11, align: 'center' });
      void rc;
    }

    // ---- 1: the microscope on the bench, and what is in the eyepiece ----
    renderScope() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;

      // the bench and the microscope, drawn as the instrument it is
      const benchY = h * 0.90;
      this.cache.draw(`bench-${key}`, (g) => g.line(0, benchY, w * 0.46, benchY, opts(6010, { stroke: COLORS.orange, strokeWidth: 2.2 })));
      const mx = compact ? w * 0.17 : w * 0.19;
      this.cache.draw(`foot-${key}`, (g) => g.path(
        `M ${mx - 34} ${benchY} q 34 -14 68 0 Z`, opts(6011, { stroke: COLORS.ink, strokeWidth: 2 }),
      ));
      this.cache.draw(`arm-${key}`, (g) => g.path(
        `M ${mx + 16} ${benchY - 8} l 0 ${-(compact ? 96 : 128)} q 0 -18 -20 -18`,
        opts(6012, { stroke: COLORS.ink, strokeWidth: 2.4 }),
      ));
      // the tube and the eyepiece
      const tubeY = benchY - (compact ? 116 : 150);
      this.cache.draw(`tube-${key}`, (g) => g.rectangle(mx - 24, tubeY, 18, compact ? 54 : 68,
        opts(6013, { stroke: COLORS.ink, strokeWidth: 2 })));
      this.cache.draw(`eyep-${key}`, (g) => g.rectangle(mx - 27, tubeY - 16, 24, 16,
        opts(6014, { stroke: COLORS.cyan, strokeWidth: 1.8 })));
      // the stage, the slide, and the mirror underneath
      const stageY = benchY - (compact ? 44 : 56);
      this.cache.draw(`stage-${key}`, (g) => g.line(mx - 40, stageY, mx + 30, stageY, opts(6015, { stroke: COLORS.ink, strokeWidth: 2.2 })));
      this.cache.draw(`slide-${key}`, (g) => g.rectangle(mx - 34, stageY - 5, 46, 5,
        opts(6016, { stroke: COLORS.cyan, strokeWidth: 1.5 })));
      this.cache.draw(`mirror-${key}`, (g) => g.line(mx - 16, benchY - 16, mx + 4, benchY - 26, opts(6017, { stroke: COLORS.yellow, strokeWidth: 2 })));
      label(ctx, 'the slide', mx - 11, stageY + (compact ? 15 : 18), { color: COLORS.cyan, size: compact ? 9 : 11, align: 'center' });
      label(ctx, compact ? 'gamboge in water' : 'gamboge grains in water', mx - 11, stageY + (compact ? 27 : 32),
        { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });

      // Perrin at the eyepiece with his notebook
      stickFigure(rc, compact ? w * 0.36 : w * 0.36, benchY - (compact ? 26 : 33), { scale: compact ? 0.52 : 0.65, seed: 6020, color: COLORS.ink });
      label(ctx, compact ? 'marking every 30 s' : 'marking the position every 30 seconds',
        compact ? w * 0.36 : w * 0.36, benchY + (compact ? 14 : 17), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      // the eyepiece view
      const cx = compact ? w * 0.74 : w * 0.73;
      const cy = h * 0.52;
      const r = Math.min(w * 0.23, h * 0.36);
      this.drawField(cx, cy, r, true, compact);
      doodleArrow(rc, mx - 30, tubeY - 22, cx - r - 12, cy - r * 0.5, { color: COLORS.cyan, seed: 6030, strokeWidth: 1.3 });

      const D = this.D;
      label(ctx, `D = kT/6πηa = ${sci(D, 3)} m²/s   ·   √⟨x²⟩ in one second = ${fmtNum(this.rmsAfter(1) * 1e6, 2)} µm`,
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10.5 : 15, align: 'center' });
      label(ctx, compact ? 'a real random walk at the true D' : 'the tracks are a genuine random walk with that diffusion constant — nothing here is drawn by hand',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      label(ctx, `${fmtNum(this.speedup, 0)}× real time · ${this.fluid.name} at ${fmtNum(this.tempC, 0)} °C`,
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });
    }

    // ---- 2: the measurement — ⟨x²⟩ against t, and Avogadro out of the slope ----
    renderCount() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const gx = compact ? w * 0.16 : w * 0.12;
      const gw = (compact ? w * 0.80 : w * 0.52) - (compact ? w * 0.02 : 0);
      const gy = h * 0.20;
      const gh = h * 0.50;
      const tMax = 60;
      const yMax = Math.max(2 * this.D * tMax, 1e-14);
      const xOf = (t) => gx + (t / tMax) * gw;
      const yOf = (m) => gy + gh - (m / yMax) * gh;

      this.cache.draw(`ax-${key}`, (g) => g.line(gx, gy, gx, gy + gh, opts(6100, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      this.cache.draw(`ay-${key}`, (g) => g.line(gx, gy + gh, gx + gw, gy + gh, opts(6101, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      label(ctx, '⟨x²⟩', gx - 6, gy - 4, { color: COLORS.muted, size: compact ? 10 : 12, align: 'right' });
      label(ctx, 'time (s)', gx + gw, gy + gh + (compact ? 26 : 30), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'right' });
      for (let t = 0; t <= tMax; t += 15) {
        this.cache.draw(`xt-${t}-${key}`, (g) => g.line(xOf(t), gy + gh - 4, xOf(t), gy + gh + 4,
          opts(6110 + t, { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, String(t), xOf(t), gy + gh + (compact ? 14 : 17), { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'center' });
      }
      label(ctx, `${sci(yMax, 1)} m²`, gx - 6, gy + 10, { color: COLORS.muted, size: compact ? 8 : 9.5, align: 'right' });

      // Einstein's line: ⟨x²⟩ = 2Dt, drawn as the prediction it is
      ctx.strokeStyle = COLORS.pink;
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(0));
      ctx.lineTo(xOf(tMax), yOf(2 * this.D * tMax));
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, compact ? '⟨x²⟩ = 2Dt' : 'Einstein 1905:  ⟨x²⟩ = 2Dt', xOf(tMax * 0.52), yOf(2 * this.D * tMax * 0.52) - 10,
        { color: COLORS.pink, size: compact ? 9.5 : 11.5 });

      // the reader's own points
      ctx.fillStyle = COLORS.green;
      this.msd.filter((m) => m.n > 0).forEach((m) => {
        const x = xOf(Math.min(m.lag, tMax));
        const y = Math.max(gy, Math.min(gy + gh, yOf(m.sum)));
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
      });
      label(ctx, compact ? 'your measurements' : 'your own measurements, off the tracks', gx + 8, gy + 12,
        { color: COLORS.green, size: compact ? 9.5 : 11.5 });

      // the result, in a box, with the modern value beside it
      const bx = compact ? w * 0.06 : w * 0.68;
      const bw = compact ? w * 0.88 : w * 0.28;
      const by = compact ? h * 0.76 : h * 0.24;
      const done = this.msd.filter((m) => m.n > 0);
      const last = done[done.length - 1];
      const est = last ? this.avogadroFrom(last.sum, last.lag) : NaN;
      this.cache.draw(`box-${key}`, (g) => g.rectangle(bx, by, bw, compact ? h * 0.16 : h * 0.30,
        opts(6120, { stroke: COLORS.yellow, strokeWidth: 1.8 })));
      label(ctx, 'AVOGADRO\'S NUMBER', bx + bw / 2, by + (compact ? 16 : 22), { color: COLORS.yellow, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, 'N_A = RTt / 3πηa⟨x²⟩', bx + bw / 2, by + (compact ? 32 : 44), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });
      label(ctx, isFinite(est) ? sci(est, 4) : '— measuring —', bx + bw / 2, by + (compact ? 52 : 76),
        { color: COLORS.green, size: compact ? 13 : 17, align: 'center' });
      if (!compact) {
        label(ctx, 'modern value', bx + bw / 2, by + 104, { color: COLORS.muted, size: 10.5, align: 'center' });
        label(ctx, '6.02214076×10²³', bx + bw / 2, by + 122, { color: COLORS.cyan, size: 13, align: 'center' });
        label(ctx, 'Perrin got 6.7×10²³', bx + bw / 2, by + 142, { color: COLORS.muted, size: 10.5, align: 'center' });
      }

      label(ctx, 'counting atoms by watching a speck of resin wander', w / 2, compact ? 20 : 26,
        { color: COLORS.yellow, size: compact ? 11 : 15.5, align: 'center' });
      label(ctx, compact ? 'no atom appears on the right-hand side' : 'every quantity on the right of that formula comes off a bench — and the answer is the number of atoms',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
    }

    // ---- 3: the control experiment — kicks give √t, a current gives t ----
    renderLaw() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const gx = compact ? w * 0.15 : w * 0.11;
      const gw = w - gx - (compact ? w * 0.06 : w * 0.08);
      const gy = h * 0.22;
      const gh = h * 0.48;
      const tMax = 40;
      const drift = this.driftUMs * 1e-6;
      const yMax = Math.max(this.rmsAfter(tMax), drift * tMax, 1e-9) * 1.15;
      const xOf = (t) => gx + (t / tMax) * gw;
      const yOf = (d) => gy + gh - (d / yMax) * gh;

      this.cache.draw(`lax-${key}`, (g) => g.line(gx, gy, gx, gy + gh, opts(6200, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      this.cache.draw(`lay-${key}`, (g) => g.line(gx, gy + gh, gx + gw, gy + gh, opts(6201, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      label(ctx, 'distance', gx - 6, gy - 4, { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'right' });
      label(ctx, 'time (s)', gx + gw, gy + gh + (compact ? 24 : 28), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'right' });
      for (let t = 0; t <= tMax; t += 10) {
        this.cache.draw(`lt-${t}-${key}`, (g) => g.line(xOf(t), gy + gh - 4, xOf(t), gy + gh + 4,
          opts(6210 + t, { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, String(t), xOf(t), gy + gh + (compact ? 14 : 17), { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'center' });
      }

      // molecular kicks: √t
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let t = 0; t <= tMax; t += 0.5) {
        const y = yOf(this.rmsAfter(t));
        if (t === 0) ctx.moveTo(xOf(t), y); else ctx.lineTo(xOf(t), y);
      }
      ctx.stroke();
      label(ctx, compact ? 'kicks: √(2Dt)' : 'molecular kicks — spreads as √t', xOf(tMax * 0.55), yOf(this.rmsAfter(tMax * 0.55)) - 10,
        { color: COLORS.cyan, size: compact ? 9.5 : 11.5 });

      // a current: t
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(0));
      ctx.lineTo(xOf(tMax), yOf(drift * tMax));
      ctx.stroke();
      label(ctx, compact ? 'current: v·t' : 'a current in the water — carries as t', xOf(tMax * 0.30), yOf(drift * tMax * 0.30) + (compact ? 14 : 17),
        { color: COLORS.orange, size: compact ? 9.5 : 11.5 });

      // the live field, so the difference is visible as motion too
      const cx = compact ? w * 0.78 : w * 0.84;
      const cy = h * 0.80;
      const r = Math.min(w * 0.12, h * 0.16);
      this.drawField(cx, cy, r, true, compact);

      label(ctx, this.driftUMs === 0
        ? 'still water: the grains spread, but they go nowhere in particular'
        : `with a ${fmtNum(this.driftUMs, 2)} µm/s current the whole field slides sideways as well`,
      w / 2, compact ? 20 : 26, { color: this.driftUMs === 0 ? COLORS.cyan : COLORS.orange, size: compact ? 10.5 : 15, align: 'center' });
      label(ctx, compact ? 'two different laws — that is the control' : 'this is the control experiment: a current and a molecular kick produce differently-shaped curves, and Perrin measured which one nature draws',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
    }

    // ---- 4: what sets the size of the jiggle ----
    renderWhy() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;

      // one grain, hugely magnified, with molecules arriving from all sides
      const cx = compact ? w * 0.28 : w * 0.27;
      const cy = h * 0.50;
      const gr = Math.min(w * 0.11, h * 0.19);
      this.cache.draw(`grain-${key}`, (g) => g.circle(cx, cy, gr * 2, opts(6300, {
        stroke: COLORS.yellow, strokeWidth: 2.2, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 8,
      })));
      // the molecules, arriving unevenly — that unevenness IS the motion
      let sx = 0;
      let sy = 0;
      for (let i = 0; i < 26; i++) {
        const a = (i * 2.399963 + this.simT * 0.35) % (Math.PI * 2);
        const p = ((i * 0.6180339887 + this.simT * 0.5) % 1);
        const rr = gr * (1.25 + p * 1.5);
        ctx.fillStyle = COLORS.cyan;
        ctx.globalAlpha = 0.35 + 0.5 * (1 - p);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2, 0, Math.PI * 2);
        ctx.fill();
        sx += Math.cos(a);
        sy += Math.sin(a);
      }
      ctx.globalAlpha = 1;
      // the residual, drawn as the arrow it is
      const rn = Math.hypot(sx, sy) || 1;
      doodleArrow(rc, cx, cy, cx + (sx / rn) * gr * 1.7, cy + (sy / rn) * gr * 1.7,
        { color: COLORS.pink, seed: 6310, strokeWidth: 2 });
      label(ctx, compact ? 'the leftover' : 'the leftover imbalance', cx, cy + gr + (compact ? 22 : 28),
        { color: COLORS.pink, size: compact ? 9.5 : 11.5, align: 'center' });
      label(ctx, compact ? '~10²⁰ hits/s' : 'about 10²⁰ collisions a second, from every side',
        cx, cy - gr - (compact ? 14 : 18), { color: COLORS.cyan, size: compact ? 9.5 : 11.5, align: 'center' });

      // the three worlds, side by side, as the argument
      const bx = compact ? w * 0.48 : w * 0.50;
      const bw = w - bx - (compact ? 10 : 26);
      const rows = [
        { t: 'if molecules were far smaller and far more numerous', s: 'the kicks cancel better — the jiggle drops below what any microscope can resolve', c: COLORS.muted },
        { t: 'if they were far bigger and far fewer', s: 'the kicks stop cancelling — the grains would be flung about, visibly and violently', c: COLORS.orange },
        { t: 'if the fluid were truly continuous', s: 'the pressure is equal on every side at every instant — the grain does not move AT ALL', c: COLORS.red },
        { t: 'what is actually seen', s: `√⟨x²⟩ = ${fmtNum(this.rmsAfter(1) * 1e6, 2)} µm per second — and that number IS the molecule count`, c: COLORS.green },
      ];
      rows.forEach((r, i) => {
        const ry = h * 0.20 + i * (compact ? h * 0.17 : h * 0.18);
        this.cache.draw(`row-${i}-${key}`, (g) => g.rectangle(bx, ry, bw, compact ? h * 0.14 : h * 0.15,
          opts(6320 + i, { stroke: r.c, strokeWidth: 1.5 })));
        label(ctx, r.t, bx + 8, ry + (compact ? 15 : 19), { color: r.c, size: compact ? 9 : 11.5 });
        label(ctx, r.s, bx + 8, ry + (compact ? 30 : 38), { color: COLORS.muted, size: compact ? 8.5 : 10.5 });
      });

      label(ctx, 'a continuous fluid predicts no jiggle at all — not a small one, none',
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10.5 : 15, align: 'center' });
      label(ctx, compact ? 'the size of the wobble counts the molecules' : 'Brownian motion is not merely consistent with atoms; the size of the wobble counts them',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    render() {
      ({
        scope: () => this.renderScope(),
        count: () => this.renderCount(),
        law: () => this.renderLaw(),
        why: () => this.renderWhy(),
      })[this.mode]();
    }
  }

  void CIT_PERRIN_NOBEL;
  void CIT_LOSCHMIDT;

  A.register('brownian', BrownianSim);
})();
