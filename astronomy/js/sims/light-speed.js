// Sim 44 — Light, and why the universe has a speed limit.
//
// George's question: "light has no mass, so our universe is limited to the
// speed of light?" The logic runs the other way, and this sim is built to show
// that rather than assert it.
//
// TWO PANELS:
//
// 1. THE SPEED LIMIT. Pour kinetic energy into a 1 kg mass and watch what the
//    two theories predict. Newton says K = ½mv², so v = c·√(2K/mc²) — a curve
//    that sails straight past c and keeps going. Einstein says K = (γ−1)mc²,
//    so γ = 1 + K/mc² and
//         v/c = √(1 − 1/γ²)
//    which climbs steeply, then bends over and hugs c forever. Both curves are
//    plotted from the same energy axis, so the divergence IS the physics. The
//    energy needed for v = c exactly is infinite — the readout shows the bill
//    growing as you drag.
//    Nature settled this in a lab: Bertozzi (1964) accelerated electrons and
//    timed their flight. Their energy went up by a factor of 30; their speed
//    stopped at c. The shaded band marks where he measured.
//
// 2. LIGHT'S JOURNEY. A photon leaves and we run the clock: t = d/c, computed
//    from real distances. The Sun is 8 minutes 19 seconds away, so the Sun you
//    can see is always the Sun of eight minutes ago; Andromeda is 2.5 million
//    years stale. Includes the 16.6-minute delay across Earth's orbit that
//    Rømer used in 1676 to prove light travels at all — the first measurement
//    of c, made from the timing of Jupiter's moon Io.
//
// THE POINT, stated honestly: c is not a limit because light happens to obey
// it. c is the invariant speed built into spacetime, and ANYTHING massless is
// obliged to travel at exactly c — light, gluons, gravitational waves. Light is
// the messenger we noticed first, not the cause. What is really being limited
// is causality: the rate at which any influence can propagate.
//
// Hand checks reproduced by the code at run time:
//   γ(0.999c) = 22.37                          (plan's known-value table)
//   1 AU / c  = 499.0 s = 8 min 19 s
//   2 AU / c  = 16.63 min                      (Rømer's delay)
//   Moon 1.282 s · Proxima 4.2465 yr · Andromeda 2.537 Myr
//   K to take 1 kg to 0.999c = (γ−1)mc² = 1.92×10¹⁸ J

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    C, C2, AU, LY, YEAR, DAY, fmtNum, sci, fmtTime, fmtLen,
  } = A;

  const CIT_SR = '1905 Einstein - Zur Elektrodynamik bewegter Körper (On the Electrodynamics of Moving Bodies)';
  const CIT_E = '1905 Einstein - Ist die Trägheit eines Körpers von seinem Energieinhalt abhängig? (Does the Inertia of a Body Depend Upon Its Energy Content?)';
  const CIT_BERT = '1964 Bertozzi - Speed and Kinetic Energy of Relativistic Electrons';
  const CIT_ROMER = '1676 Rømer - Démonstration touchant le mouvement de la lumière trouvé par M. Roemer (Demonstration Concerning the Motion of Light)';
  const CIT_SUN = '1992 Mitalas, Sills - On the Photon Diffusion Time Scale for the Sun';

  // Distances in metres. Everything the sim prints is d/c computed from these —
  // no light-times are stored. Values that genuinely vary say so in `note`.
  const DESTINATIONS = [
    { key: 'moon', name: 'the Moon', d: 3.84400e8, note: 'mean Earth–Moon distance', tag: 'Apollo crews had a 2.6 s round-trip lag' },
    { key: 'sun', name: 'the Sun', d: AU, note: '1 astronomical unit, exact by definition', tag: 'the Sun you see is always this old' },
    { key: 'romer', name: "across Earth's orbit", d: 2 * AU, note: 'the diameter of our orbit', tag: 'the delay Rømer timed in 1676 — the first proof light is not instant' },
    { key: 'mars', name: 'Mars, at its closest', d: 5.57e10, note: 'closest approach ≈0.372 AU; at its farthest it is ~6× this', tag: 'why rovers drive themselves' },
    { key: 'jupiter', name: 'Jupiter', d: 5.2038 * AU, note: 'mean orbital radius', tag: "Io's eclipses were Rømer's clock" },
    { key: 'voyager', name: 'Voyager 1', d: 168 * AU, note: '≈168 AU in mid-2026, receding ~3.6 AU per year', tag: 'the most distant thing we have ever spoken to' },
    { key: 'proxima', name: 'Proxima Centauri', d: 4.2465 * LY, note: 'the nearest star to the Sun', tag: 'the closest star, and still a 4-year message' },
    { key: 'sgra', name: 'the Galactic Centre', d: 8178 * 3.0856775815e16, note: 'R₀ = 8178 pc (GRAVITY Collaboration, 2019)', tag: 'the black hole at the middle of our galaxy' },
    { key: 'andromeda', name: 'the Andromeda Galaxy', d: 2.537e6 * LY, note: 'nearest large galaxy', tag: 'visible to the naked eye — and 2.5 million years out of date' },
  ];

  // Kinetic energy axis, in units of mc². 1e-4 → v/c ≈ 0.014; 1e3 → 0.9999995.
  const K_MIN = 1e-4;
  const K_MAX = 1e3;
  // Bertozzi drove electrons from 0.5 MeV to 15 MeV of kinetic energy; an
  // electron's rest energy is 0.511 MeV, so in these units that is K/mc² ≈ 1→29.
  const BERT_LO = 0.5 / 0.511;
  const BERT_HI = 15 / 0.511;

  const relV = (k) => { const g = 1 + k; return Math.sqrt(1 - 1 / (g * g)); }; // v/c
  const newtV = (k) => Math.sqrt(2 * k);                                       // v/c, Newton

  // "10⁻⁴" for the log axis. constants.js keeps its own sup() private, so this
  // is the small local copy rather than a reach into the engine's internals.
  const SUPS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const supDigits = (n) => String(n).split('').map((ch) => SUPS[ch] || ch).join('');

  class LightSpeedSim extends Sim {
    init() {
      this.mode = 'limit';        // 'limit' | 'journey'
      this.k = 0.35;              // kinetic energy in units of mc²
      this.massKg = 1;
      this.destIdx = 1;           // the Sun
      this.t = 0;                 // seconds of photon flight, simulated
      this.flying = false;
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'the speed limit', value: 'limit' },
        { label: "light's journey", value: 'journey' },
      ], { initial: 'limit', onSelect: (v) => this.setMode(v) });

      this.kSlider = slider(c, {
        label: 'kinetic energy poured in',
        min: K_MIN, max: K_MAX, value: this.k, log: true,
        format: (v) => `${sci(v * this.massKg * C2, 2)} J  =  ${fmtNum(v, v < 1 ? 3 : 1)} × mc²`,
        oninput: (v) => {
          this.k = v;
          if (relV(v) > 0.999 && !this._citedSR) { this._citedSR = true; this.cite(CIT_SR); }
          this.updateReadout();
          this.poke();
        },
      });

      this.destBtns = buttonRow(c, DESTINATIONS.map((d) => ({ label: d.name, value: d.key })), {
        initial: 'sun',
        onSelect: (v) => {
          this.destIdx = DESTINATIONS.findIndex((d) => d.key === v);
          if (v === 'romer' || v === 'jupiter') this.cite(CIT_ROMER);
          this.launch();
        },
      });

      this.launchBtn = actionButton(c, 'send a photon', () => this.launch());
      this.setMode('limit');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.kSlider, v === 'limit');
      show(this.destBtns, v === 'journey');
      this.launchBtn.style.display = v === 'journey' ? '' : 'none';
      if (v === 'journey') this.launch();
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    get dest() { return DESTINATIONS[this.destIdx]; }

    launch() {
      this.t = 0;
      this.flying = true;
      this.updateReadout();
      this.poke();
    }

    /* ---------------- physics ---------------- */

    limitNumbers() {
      const k = this.k;
      const gamma = 1 + k;
      const v = relV(k) * C;             // m/s, relativistic
      const vN = newtV(k) * C;           // m/s, what Newton would predict
      const E = k * this.massKg * C2;    // J of kinetic energy supplied
      const rest = this.massKg * C2;     // J of rest energy
      // Energy still needed to reach 0.999c and 0.99999c, from here.
      const kFor = (frac) => 1 / Math.sqrt(1 - frac * frac) - 1;
      return {
        k, gamma, v, vN, E, rest,
        vFrac: v / C, vNFrac: vN / C,
        toThreeNines: Math.max(0, kFor(0.999) - k) * this.massKg * C2,
        shortfall: C - v,
      };
    }

    journeyNumbers() {
      const d = this.dest.d;
      const total = d / C;               // seconds
      return { d, total, elapsed: Math.min(this.t, total), done: this.t >= total };
    }

    update(dt) {
      if (this.mode !== 'journey' || !this.flying) return;
      const n = this.journeyNumbers();
      // Fit any journey into ~7 wall seconds, whatever its true duration.
      this.t += (n.total / 7) * dt;
      if (this.t >= n.total) {
        this.t = n.total;
        this.flying = false;
        this.updateReadout();
      } else if (!this._lastTick || Math.abs(this.t - this._lastTick) > n.total / 60) {
        this._lastTick = this.t;
        this.updateReadout();
      }
    }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'journey') return this.journeyReadout();
      const n = this.limitNumbers();
      setReadout(this.readoutEl, [
        [
          [`${fmtNum(this.massKg, 0)} kg given `, null], [`${sci(n.E, 2)} J`, 'yellow'],
          [' of kinetic energy  ·  γ = 1 + K/mc² = ', null], [fmtNum(n.gamma, n.gamma < 10 ? 3 : 1), 'cyan'],
        ],
        [
          ["EINSTEIN — v = c·√(1 − 1/γ²) = ", null],
          [`${fmtNum(n.v / 1000, 0)} km/s = ${fmtNum(n.vFrac, 6)} c`, 'green'],
        ],
        [
          ['NEWTON — v = √(2K/m) = ', null],
          [`${fmtNum(n.vN / 1000, 0)} km/s = ${fmtNum(n.vNFrac, 3)} c`, n.vNFrac > 1 ? 'red' : null],
          [n.vNFrac > 1 ? '  ← Newton has already broken the universe' : '  (still below c — the two theories agree when speeds are small)', n.vNFrac > 1 ? 'red' : null],
        ],
        [
          ['you are ', null], [`${sci(n.shortfall, 3)} m/s`, 'orange'], [' short of c. ', null],
          n.toThreeNines > 0
            ? [`Reaching 0.999 c would take another ${sci(n.toThreeNines, 2)} J; reaching c exactly would take infinite energy — which is the whole point.`, null]
            : ['Past 0.999 c now. No finite amount of energy will ever close the last gap.', null],
        ],
        [
          ['A photon skipped all of this: it has no mass, so it does not have the choice. Massless ⇒ exactly c, always, for every observer.', null],
        ],
      ]);
    }

    journeyReadout() {
      const n = this.journeyNumbers();
      const d = this.dest;
      setReadout(this.readoutEl, [
        [
          [`${d.name} — `, 'yellow'],
          [`${fmtLen(d.d, 3)}`, 'cyan'],
          [`  (${d.note})`, null],
        ],
        [
          ['light-time t = d/c = ', null], [fmtTime(n.total, 3), 'green'],
          [n.done ? '  ·  arrived.' : `  ·  in flight: ${fmtTime(n.elapsed, 2)}`, null],
        ],
        [
          ['So you are not seeing it now — you are seeing it as it was ', null],
          [fmtTime(n.total, 2), 'pink'],
          [` ago. ${d.tag}.`, null],
        ],
        this.dest.key === 'sun' ? [
          ['And that 8-minute trip is the easy part: the energy leaving the Sun today was made in its core and spent of order 10⁴–10⁵ years random-walking out through the plasma before it ever reached the surface.', null],
        ] : [
          ['Nothing — no particle, no signal, no influence — outruns this. It is not a limit on light; it is a limit on cause and effect.', null],
        ],
      ]);
    }

    /* ---------------- drawing ---------------- */

    render() {
      if (this.mode === 'journey') return this.renderJourney();
      this.renderLimit();
    }

    renderLimit() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.limitNumbers();

      // plot frame: x = log10(K/mc²), y = v/c from 0 to 1.35
      const x0 = compact ? 42 : 64;
      const x1 = w - (compact ? 14 : 26);
      const y0 = compact ? 40 : 52;
      const y1 = h - (compact ? 78 : 92);
      const lx0 = Math.log10(K_MIN);
      const lx1 = Math.log10(K_MAX);
      const V_TOP = 1.35;
      const X = (k) => x0 + ((Math.log10(k) - lx0) / (lx1 - lx0)) * (x1 - x0);
      const Y = (v) => y1 - (v / V_TOP) * (y1 - y0);

      // Bertozzi's measured band, drawn first so the curves sit on top
      this.cache.draw(`bert-${w}x${h}`, (g) => g.rectangle(
        X(BERT_LO), y0, X(BERT_HI) - X(BERT_LO), y1 - y0,
        opts(410, { stroke: COLORS.muted, strokeWidth: 1, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 9 }),
      ));
      label(ctx, compact ? 'Bertozzi 1964' : 'Bertozzi measured electrons here, 1964', (X(BERT_LO) + X(BERT_HI)) / 2, y0 - 6,
        { color: COLORS.muted, size: compact ? 10 : 12, align: 'center' });

      // Axes. Two cache entries, not one: SketchCache draws only the Drawable
      // the build function RETURNS, so a builder that makes two shapes silently
      // loses the first.
      const axO = opts(411, { stroke: COLORS.ink, strokeWidth: 1.6 });
      this.cache.draw(`axisY-${w}x${h}`, (g) => g.line(x0, y0 - 2, x0, y1, axO));
      this.cache.draw(`axisX-${w}x${h}`, (g) => g.line(x0, y1, x1, y1, axO));
      // the speed of light, as a line you cannot cross
      this.cache.draw(`cline-${w}x${h}`, (g) => g.line(x0, Y(1), x1, Y(1), opts(412, {
        stroke: COLORS.yellow, strokeWidth: 2, strokeLineDash: [9, 7],
      })));
      label(ctx, 'c = 299,792,458 m/s', x1 - 4, Y(1) - 8, { color: COLORS.yellow, size: compact ? 11.5 : 13.5, align: 'right' });

      // the two predictions
      const curve = (fn, color, width) => {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
        let started = false;
        for (let px = x0; px <= x1; px += 2) {
          const k = 10 ** (lx0 + ((px - x0) / (x1 - x0)) * (lx1 - lx0));
          const v = fn(k);
          if (v > V_TOP) { started = false; continue; }   // Newton leaves the roof
          const py = Y(v);
          if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
        }
        ctx.stroke();
      };
      curve(newtV, COLORS.red, 1.6);
      curve(relV, COLORS.green, 2.4);

      // Label placement is hand-tuned around three occupied zones: the Bertozzi
      // band caption (top centre), the c line and its caption (right), and the
      // curves themselves. Upper-left and lower-right are the empty quadrants.
      label(ctx, compact ? 'Newton' : "Newton's prediction — no limit at all", X(1.4e-3), Y(1.22),
        { color: COLORS.red, size: compact ? 11 : 13 });
      label(ctx, compact ? 'Einstein' : 'Einstein — and the universe', x1 - 8, Y(0.58),
        { color: COLORS.green, size: compact ? 11 : 13.5, align: 'right' });

      // the reader's current state, on both curves
      const kx = X(n.k);
      ctx.setLineDash([4, 5]); ctx.strokeStyle = COLORS.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(kx, y1); ctx.lineTo(kx, Y(Math.min(n.vFrac, V_TOP))); ctx.stroke();
      ctx.setLineDash([]);
      rc.circle(kx, Y(n.vFrac), 11, opts(413, { stroke: COLORS.green, strokeWidth: 2.2 }));
      if (n.vNFrac <= V_TOP) rc.circle(kx, Y(n.vNFrac), 9, opts(414, { stroke: COLORS.red, strokeWidth: 1.6 }));

      // axis ticks
      for (let e = -4; e <= 3; e++) {
        const px = X(10 ** e);
        if (px < x0 - 1 || px > x1 + 1) continue;
        rc.line(px, y1, px, y1 + 5, opts(415 + e + 4, { stroke: COLORS.muted, strokeWidth: 1.1 }));
        if (!compact || e % 2 !== 0) {
          label(ctx, e === 0 ? '1' : `10${supDigits(e)}`, px, y1 + 18,
            { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'center' });
        }
      }
      label(ctx, 'kinetic energy poured in  (× mc²)  →', (x0 + x1) / 2, y1 + 34,
        { color: COLORS.ink, size: compact ? 11 : 13, align: 'center' });
      for (const v of [0.5, 1]) {
        label(ctx, v === 1 ? 'c' : `${v}c`, x0 - 6, Y(v) + 4, { color: COLORS.muted, size: compact ? 10 : 12, align: 'right' });
      }
      label(ctx, 'speed', x0 - (compact ? 32 : 50), (y0 + y1) / 2, { color: COLORS.ink, size: compact ? 11 : 13 });

      // a photon, always pinned to the ceiling
      sparkle(rc, x0 + 16, Y(1), 7, { color: COLORS.yellow, seed: 430 });
      label(ctx, compact ? 'photons: always here' : 'every massless thing rides this line, always',
        x0 + 30, Y(1) + 17, { color: COLORS.yellow, size: compact ? 10.5 : 12.5, align: 'left' });

      label(ctx, compact
        ? 'massless ⇒ exactly c'
        : 'c is not light’s speed limit — it is spacetime’s. Anything without mass must travel at exactly c.',
        (x0 + x1) / 2, h - 32, { color: COLORS.muted, size: compact ? 11 : 12.5, align: 'center' });
    }

    renderJourney() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.journeyNumbers();
      const d = this.dest;
      const frac = n.total > 0 ? n.elapsed / n.total : 1;

      const x0 = compact ? 40 : 74;
      const x1 = w - (compact ? 40 : 74);
      const y = h * 0.42;

      // Earth, and the destination
      this.cache.draw(`earth-${w}x${h}`, (g) => g.circle(x0, y, 34, opts(440, {
        stroke: COLORS.cyan, strokeWidth: 2, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.7, hachureGap: 9,
      })));
      label(ctx, 'here', x0, y + 52, { color: COLORS.cyan, size: 13, align: 'center' });
      if (!compact) stickFigure(rc, x0 - 4, y - 62, { scale: 0.5, seed: 441, color: COLORS.muted });

      this.cache.draw(`dest-${d.key}-${w}x${h}`, (g) => g.circle(x1, y, 40, opts(442, {
        stroke: COLORS.yellow, strokeWidth: 2,
      })));
      label(ctx, d.name, x1, y + 58, { color: COLORS.yellow, size: compact ? 12 : 14.5, align: 'center' });

      // the track, and the photon on it
      this.cache.draw(`track-${w}x${h}`, (g) => g.line(x0 + 36, y, x1 - 42, y, opts(443, {
        stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [7, 7],
      })));
      const px = x0 + 36 + frac * (x1 - 42 - (x0 + 36));
      sparkle(rc, px, y, 9, { color: COLORS.yellow, seed: 444 });
      rc.circle(px, y, 15, opts(445, { stroke: COLORS.yellow, strokeWidth: 1.4 }));

      // elapsed / total clocks
      label(ctx, `t = ${fmtTime(n.elapsed, 2)}`, px, y - 30, { color: COLORS.yellow, size: compact ? 12 : 14.5, align: 'center' });
      label(ctx, `total light-time  ${fmtTime(n.total, 3)}`, w / 2, compact ? 30 : 40,
        { color: COLORS.green, size: compact ? 14 : 18, align: 'center' });
      label(ctx, `distance ${fmtLen(d.d, 3)}   ·   speed 299,792,458 m/s   ·   t = d/c`, w / 2, compact ? 50 : 64,
        { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });

      if (n.done) {
        label(ctx, compact ? 'arrived — you are seeing the past' : `arrived. What you see of ${d.name} left ${fmtTime(n.total, 2)} ago.`,
          w / 2, y + 108, { color: COLORS.pink, size: compact ? 12 : 15, align: 'center' });
      }

      notToScale(rc, ctx, compact ? w - 66 : w - 84, h - 66);
      label(ctx, compact ? 'nothing outruns this' : 'no particle, signal or influence travels faster — this is a limit on cause and effect, not on light',
        w / 2, h - 34, { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });
    }
  }

  A.register('lightSpeed', LightSpeedSim);
})();
