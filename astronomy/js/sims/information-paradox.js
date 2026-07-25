// Sim 50 — The information paradox, drawn as the Page curve.
//
// Sim 48 showed horizons are warm. Sim 14 showed black holes evaporate. Put the
// two together and you get the sharpest unsolved problem in theoretical physics.
//
// THE SETUP, in numbers the sim computes:
//   Bekenstein-Hawking entropy   S/k_B = 4 pi G M^2 / (hbar c) = A/(4 l_P^2)
//   evaporation lifetime         t = 5120 pi G^2 M^3 / (hbar c^4)
//   one solar mass -> S/k_B = 1.05e77 and t = 2.1e67 years
// That entropy is enormous — vastly more than the star that collapsed — and by
// Bekenstein's reading it counts the information hidden behind the horizon.
//
// THE CONTRADICTION. Hawking's 1975 radiation is exactly thermal: it depends on
// M alone and carries no imprint of WHAT fell in. So as the hole evaporates the
// radiation's entanglement entropy rises monotonically, and at the end the
// information is simply gone (Hawking 1976). But quantum mechanics is unitary —
// a pure state cannot evolve into a mixed one. Page (1993) pointed out what
// unitarity demands instead: the entropy must rise, turn over, and come back
// down to zero as the last of it is emitted.
//
// THE PAGE CURVE, as plotted here (an idealisation, and the sim says so):
//   coarse-grained radiation entropy   S_th(t) = S_BH(M0) - S_BH(M(t))
//   Hawking's answer                   S_rad = S_th                (rises forever)
//   unitarity's answer                 S_rad = min(S_th, S_BH(M))  (rises, then falls)
// They separate at the PAGE TIME, where the hole has radiated half its entropy:
//   S_BH(M) = S_BH(M0)/2  ->  M = M0/sqrt(2)  ->  t/t_evap = 1 - 2^(-3/2) = 0.6464
// which the sim solves rather than quotes.
//
// STATUS: OPEN. Since 2019-20 the replica-wormhole / island calculations do
// reproduce the Page curve from a gravitational path integral, which is real
// progress; what it MEANS — how the information actually gets out, and whether
// the semiclassical picture can be trusted that far — is still argued about.
// The evidence badge says speculative, and that is not false modesty.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    G, C, C2, HBAR, K_B, M_SUN, YEAR, fmtNum, sci, fmtLen, fmtTime, schwarzschildRadius,
  } = A;

  const CIT_BEK = '1973 Bekenstein - Black Holes and Entropy';
  const CIT_HAWK75 = '1975 Hawking - Particle Creation by Black Holes';
  const CIT_HAWK76 = '1976 Hawking - Breakdown of Predictability in Gravitational Collapse';
  const CIT_PAGE = '1993 Page - Information in Black Hole Radiation';
  const CIT_ISLAND = '2021 Almheiri, Hartman, Maldacena, Shaghoulian, Tajdini - The Entropy of Hawking Radiation';

  // t/t_evap at which the hole has radiated half its entropy. Solved, not quoted:
  // S ∝ M², M(t) = M0(1−t/t_evap)^(1/3), so S/S0 = (1−t/t_evap)^(2/3) = 1/2.
  const PAGE_FRACTION = 1 - Math.pow(2, -1.5);

  const PRESETS = [
    { key: 'sun', name: 'one solar mass', M: M_SUN },
    { key: 'earth', name: "Earth's mass", M: 5.9722e24 },
    { key: 'mountain', name: 'a mountain (10¹² kg)', M: 1e12 },
    { key: 'sgra', name: 'Sgr A*', M: 4.15e6 * M_SUN },
  ];

  class InfoParadoxSim extends Sim {
    init() {
      this.mode = 'page';
      this.M0 = 1e12;          // start small enough that the lifetime is comprehensible
      this.frac = 0.35;        // t / t_evap
      this.phase = 0;
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- physics ---------------- */

    entropy(M) { return (4 * Math.PI * G * M * M) / (HBAR * C); }        // in units of k_B
    lifetime(M) { return (5120 * Math.PI * G * G * M * M * M) / (HBAR * C2 * C2); }  // s
    tempOf(M) { return (HBAR * C * C2) / (8 * Math.PI * G * M * K_B); }  // K

    numbers() {
      const M0 = this.M0;
      const S0 = this.entropy(M0);
      const t = this.frac;
      const M = M0 * Math.cbrt(Math.max(0, 1 - t));
      const S = this.entropy(M);
      const sTh = S0 - S;                     // coarse-grained radiation entropy
      return {
        M0, S0, M, S, sTh,
        hawking: sTh,                          // rises monotonically
        page: Math.min(sTh, S),                // rises, then falls
        tEvap: this.lifetime(M0),
        tPage: this.lifetime(M0) * PAGE_FRACTION,
        T: M > 0 ? this.tempOf(M) : Infinity,
        rs: schwarzschildRadius(M),
        pastPage: t > PAGE_FRACTION,
      };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'the Page curve', value: 'page' },
        { label: 'the numbers', value: 'numbers' },
      ], { initial: 'page', onSelect: (v) => this.setMode(v) });

      this.timeSlider = slider(c, {
        label: 'how far through the evaporation',
        min: 0, max: 0.9999, step: 0.0001, value: this.frac,
        format: (v) => `${fmtNum(v * 100, 2)}% of the lifetime${v > PAGE_FRACTION ? '  — past the Page time' : ''}`,
        oninput: (v) => {
          this.frac = v;
          if (v > PAGE_FRACTION && !this._citedPage) { this._citedPage = true; this.cite(CIT_PAGE); }
          this.updateReadout(); this.poke();
        },
      });

      this.massBtns = buttonRow(c, PRESETS.map((p) => ({ label: p.name, value: p.key })), {
        initial: 'mountain',
        onSelect: (v) => {
          this.M0 = PRESETS.find((p) => p.key === v).M;
          this.massSlider.set(this.M0);
          if (!this._citedBek) { this._citedBek = true; this.cite(CIT_BEK); }
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });

      this.massSlider = slider(c, {
        label: 'starting mass',
        min: 1e9, max: 1e40, value: this.M0, log: true,
        format: (v) => (v >= 1e26 ? `${sci(v / M_SUN, 2)} M☉` : `${sci(v, 2)} kg`),
        oninput: (v) => { this.M0 = v; this.cache.invalidate(); this.updateReadout(); this.poke(); },
      });

      actionButton(c, 'jump to the Page time', () => {
        this.frac = PAGE_FRACTION;
        this.timeSlider.set(this.frac);
        this.cite(CIT_PAGE);
        this.updateReadout(); this.poke();
      });
      this.setMode('page');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.timeSlider, v === 'page');
      show(this.massBtns, v === 'numbers');
      show(this.massSlider, v === 'numbers');
      if (v === 'page' && !this._citedH76) { this._citedH76 = true; this.cite(CIT_HAWK76); }
      this.cache.invalidate(); this.updateReadout(); this.poke();
    }

    update(dt) { this.phase += dt; }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'numbers') return this.numbersReadout();
      const n = this.numbers();
      setReadout(this.readoutEl, [
        [
          [`${fmtNum(this.frac * 100, 2)}% through the evaporation`, 'yellow'],
          ['  ·  mass left ', null], [`${fmtNum((n.M / n.M0) * 100, 1)}%`, 'cyan'],
          ['  ·  hole entropy ', null], [`${fmtNum((n.S / n.S0) * 100, 1)}%`, 'cyan'],
          ['  ·  temperature ', null], [`${sci(n.T, 2)} K`, 'orange'],
        ],
        [
          ["HAWKING's answer — radiation entropy ", null], [sci(n.hawking, 3), 'red'],
          [' and still climbing. His radiation is exactly thermal: it depends only on the mass, so it carries no record of what fell in. At the end the hole is gone and the information with it.', null],
        ],
        [
          ["UNITARITY's answer — radiation entropy ", null], [sci(n.page, 3), 'green'],
          [n.pastPage
            ? '. Past the Page time the curve has turned over and is heading back to zero: the radiation is becoming a pure state again, so the information is coming out.'
            : '. Before the Page time the two answers agree exactly — which is why nothing looks wrong until the hole is half gone.', null],
        ],
        [
          ['The two predictions split at the Page time, ', null],
          [`${fmtNum(PAGE_FRACTION * 100, 2)}% of the lifetime`, 'pink'],
          [' — where the hole has radiated half its entropy (M = M₀/√2). That is solved from S ∝ M², not looked up. Quantum mechanics says one curve; Hawking\'s calculation says the other; both cannot be right.', null],
        ],
      ]);
    }

    numbersReadout() {
      const n = this.numbers();
      const yr = n.tEvap / YEAR;
      setReadout(this.readoutEl, [
        [
          [`a ${sci(n.M0, 3)} kg black hole`, 'yellow'],
          ['  ·  horizon ', null], [fmtLen(schwarzschildRadius(n.M0), 3), 'cyan'],
          ['  ·  Hawking temperature ', null], [`${sci(this.tempOf(n.M0), 3)} K`, 'orange'],
        ],
        [
          ['Bekenstein–Hawking entropy S = 4πGM²/ħc = ', null], [`${sci(n.S0, 4)} k_B`, 'pink'],
          ['  — one quarter of the horizon area in Planck units. For comparison, the entropy of an ordinary star is around 10⁵⁸ k_B, so collapsing it into a black hole multiplies its entropy by a colossal factor. Whatever that number is counting, it is not the atoms.', null],
        ],
        [
          ['evaporation lifetime t = 5120πG²M³/ħc⁴ = ', null],
          [yr > 1 ? `${sci(yr, 3)} years` : fmtTime(n.tEvap, 3), 'green'],
          ['  ·  the Page time falls at ', null],
          [yr > 1 ? `${sci((n.tPage / YEAR), 3)} years` : fmtTime(n.tPage, 3), 'pink'],
        ],
        [
          ['Because t ∝ M³, small holes die fast and big ones effectively never do: a solar-mass hole needs ~2×10⁶⁷ years, which is why no astrophysical black hole has yet reached its Page time. The paradox is real but nothing in the sky has got there.', null],
        ],
      ]);
    }

    /* ---------------- drawing ---------------- */

    renderPage() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.numbers();

      const x0 = compact ? 48 : 76;
      const x1 = w - (compact ? 18 : 150);
      const y0 = compact ? 58 : 72;
      const y1 = h - (compact ? 56 : 68);
      const X = (t) => x0 + t * (x1 - x0);
      const Y = (s) => y1 - (s / n.S0) * (y1 - y0);

      // axes
      this.cache.draw(`pax-${w}x${h}`, (g) => g.line(x0, y1, x1, y1, opts(1400, { stroke: COLORS.ink, strokeWidth: 1.6 })));
      this.cache.draw(`pay-${w}x${h}`, (g) => g.line(x0, y0, x0, y1, opts(1401, { stroke: COLORS.ink, strokeWidth: 1.6 })));
      label(ctx, 'entropy of the radiation', x0 - 6, y0 - 10, { color: COLORS.ink, size: compact ? 10.5 : 12.5 });
      label(ctx, 'time  →', (x0 + x1) / 2, y1 + (compact ? 22 : 28), { color: COLORS.ink, size: compact ? 10.5 : 12.5, align: 'center' });
      label(ctx, 'evaporated', x1, y1 + (compact ? 22 : 28), { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'right' });

      const sThAt = (t) => n.S0 * (1 - Math.pow(1 - t, 2 / 3));
      const sBhAt = (t) => n.S0 * Math.pow(1 - t, 2 / 3);

      // Hawking: monotonic
      ctx.strokeStyle = COLORS.red; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.004) {
        const px = X(Math.min(t, 1)); const py = Y(sThAt(Math.min(t, 1)));
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // the hole's own entropy, dashed — the ceiling unitarity imposes
      ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1.3; ctx.setLineDash([5, 6]); ctx.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.004) {
        const px = X(Math.min(t, 1)); const py = Y(sBhAt(Math.min(t, 1)));
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.setLineDash([]);
      // Page: the min of the two
      ctx.strokeStyle = COLORS.green; ctx.lineWidth = 3; ctx.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.004) {
        const tt = Math.min(t, 1);
        const px = X(tt); const py = Y(Math.min(sThAt(tt), sBhAt(tt)));
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // the Page time
      const pxP = X(PAGE_FRACTION);
      ctx.strokeStyle = COLORS.pink; ctx.lineWidth = 1.3; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(pxP, y0); ctx.lineTo(pxP, y1); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, compact ? 'Page time' : `Page time — ${fmtNum(PAGE_FRACTION * 100, 1)}%`, pxP + 5, y0 + 12,
        { color: COLORS.pink, size: compact ? 10 : 12 });

      // where the reader is
      const pxN = X(this.frac);
      rc.circle(pxN, Y(n.hawking), 9, opts(1402, { stroke: COLORS.red, strokeWidth: 1.8 }));
      rc.circle(pxN, Y(n.page), 11, opts(1403, { stroke: COLORS.green, strokeWidth: 2.2 }));

      label(ctx, 'Hawking — information lost', X(0.06), Y(sThAt(0.92)) - (compact ? 6 : 8),
        { color: COLORS.red, size: compact ? 10 : 12.5 });
      label(ctx, 'unitarity — information returns', X(0.06), Y(sThAt(0.92)) + (compact ? 10 : 12),
        { color: COLORS.green, size: compact ? 10 : 12.5 });
      label(ctx, "the hole's own entropy", X(0.62), Y(sBhAt(0.62)) - 8,
        { color: COLORS.cyan, size: compact ? 9.5 : 11.5 });

      // the shrinking hole, drawn to the right on desktop
      if (!compact) {
        const cx = w - 74;
        const cy = h * 0.30;
        const R = 44 * Math.cbrt(Math.max(0.002, 1 - this.frac));
        rc.circle(cx, cy, R * 2, opts(1404, { stroke: COLORS.ink, strokeWidth: 2, fill: '#000000', fillStyle: 'solid' }));
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + this.phase * 0.6;
          const rr = R + 12 + ((this.phase * 26 + i * 9) % 26);
          sparkle(rc, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 4, { color: COLORS.orange, seed: 1410 + i });
        }
        label(ctx, `${fmtNum((n.M / n.M0) * 100, 1)}% left`, cx, cy + 66, { color: COLORS.muted, size: 12, align: 'center' });
      }

      label(ctx, compact ? 'idealised curve — see the prose' : 'idealised construction: S_rad = min(coarse-grained, the hole\'s own) — the real calculation is far harder, but this is the shape at issue',
        (x0 + x1) / 2, h - (compact ? 10 : 12), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'center' });
    }

    renderNumbers() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.numbers();
      const cx = w * (compact ? 0.5 : 0.28);
      const cy = h * 0.44;
      const R = Math.min(w, h) * (compact ? 0.16 : 0.19);

      this.cache.draw(`nh-${w}x${h}`, (g) => g.circle(cx, cy, R * 2, opts(1420, {
        stroke: COLORS.ink, strokeWidth: 2.4, fill: '#000000', fillStyle: 'solid',
      })));
      // the horizon area, shaded — because the entropy IS the area
      this.cache.draw(`nring-${w}x${h}`, (g) => g.circle(cx, cy, R * 2.16, opts(1421, {
        stroke: COLORS.pink, strokeWidth: 1.6, strokeLineDash: [5, 6],
      })));
      label(ctx, 'S = A / 4ℓ_P²', cx, cy - R - 18, { color: COLORS.pink, size: compact ? 12 : 14.5, align: 'center' });
      label(ctx, `horizon ${fmtLen(schwarzschildRadius(n.M0), 2)}`, cx, cy + R + 24,
        { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });

      const bx = compact ? 16 : w * 0.52;
      let by = compact ? h - 118 : h * 0.24;
      const line = (t, v, col) => {
        label(ctx, t, bx, by, { color: COLORS.muted, size: compact ? 10 : 12.5 });
        label(ctx, v, bx, by + (compact ? 15 : 19), { color: col, size: compact ? 12 : 15.5 });
        by += compact ? 34 : 46;
      };
      line('entropy S = 4πGM²/ħc', `${sci(n.S0, 4)} k_B`, COLORS.pink);
      line('lifetime t = 5120πG²M³/ħc⁴', n.tEvap / YEAR > 1 ? `${sci(n.tEvap / YEAR, 3)} years` : fmtTime(n.tEvap, 3), COLORS.green);
      line('the Page time falls at', n.tPage / YEAR > 1 ? `${sci(n.tPage / YEAR, 3)} years` : fmtTime(n.tPage, 3), COLORS.yellow);
      if (!compact) line('Hawking temperature', `${sci(this.tempOf(n.M0), 3)} K`, COLORS.orange);

      notToScale(rc, ctx, compact ? w - 66 : w - 84, h - 26);
    }

    render() {
      if (this.mode === 'numbers') return this.renderNumbers();
      this.renderPage();
    }
  }

  A.register('paradox', InfoParadoxSim);
})();
