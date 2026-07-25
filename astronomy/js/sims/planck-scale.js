// Sim 51 — Where quantum gravity has to take over.
//
// The previous three sims all rest on the same compromise: quantum fields treated
// properly, spacetime left classical. This one draws the boundary of that
// compromise, and it draws it from two rules nobody disputes.
//
//   QUANTUM MECHANICS: you cannot localise a mass m better than its Compton
//   wavelength, lambda_C = hbar/(mc). Squeeze harder and you create particles
//   rather than pinning it down. Light things are big and fuzzy.
//
//   GENERAL RELATIVITY: pack a mass m inside its Schwarzschild radius,
//   r_s = 2Gm/c^2, and it is a black hole. Heavy things are big and dark.
//
// Plot both against mass and they cross. Below the crossing, quantum fuzziness is
// the bigger effect and gravity is irrelevant. Above it, gravity wins and quantum
// mechanics is irrelevant. AT the crossing you cannot do either without the other
// — the object's quantum uncertainty is the same size as its own horizon. Solving
// lambda_C = r_s gives
//     m = sqrt(hbar c / 2G) = 1.539e-8 kg   (the Planck mass over root 2)
//     length = sqrt(2 hbar G / c^3) = 2.29e-35 m  (root-2 Planck lengths)
// The Planck scale is not a number someone chose. It is where the two rules
// collide, and the sim finds it by intersecting the curves.
//
// Reference values the sim computes from the constants, never hardcodes:
//   l_P = sqrt(hbar G/c^3) = 1.616e-35 m
//   t_P = l_P/c             = 5.391e-44 s
//   m_P = sqrt(hbar c/G)    = 2.176e-8 kg   (about a flea's egg — not small!)
//   E_P = m_P c^2           = 1.22e19 GeV   (a quadrillion times the LHC)
//   T_P = E_P/k_B           = 1.417e32 K
//
// PANEL 2 is the honest scoreboard: what could actually be tested. Nothing here
// is a measurement of quantum gravity — there are none. There are proposals with
// real numbers attached, and limits that rule things out.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    G, C, C2, HBAR, K_B, M_SUN, M_EARTH, fmtNum, sci, fmtLen,
  } = A;

  const CIT_ROVELLI = '2004 Rovelli - Quantum Gravity';
  const CIT_BOSE = '2017 Bose et al. - Spin Entanglement Witness for Quantum Gravity';
  const CIT_HAWK76 = '1976 Hawking - Breakdown of Predictability in Gravitational Collapse';
  const CIT_PENROSE = '1965 Penrose - Gravitational Collapse and Space-Time Singularities';
  const CIT_BD = '1982 Birrell, Davies - Quantum Fields in Curved Space';

  const L_P = Math.sqrt((HBAR * G) / (C2 * C));
  const T_P = L_P / C;
  const M_P = Math.sqrt((HBAR * C) / G);
  const E_P_J = M_P * C2;
  const E_P_GEV = E_P_J / 1.602176634e-10;
  const TEMP_P = E_P_J / K_B;

  // Where the two rules collide: hbar/(mc) = 2Gm/c^2.
  const M_CROSS = Math.sqrt((HBAR * C) / (2 * G));
  const L_CROSS = (2 * G * M_CROSS) / C2;

  const OBJECTS = [
    { name: 'an electron', m: 9.1093837015e-31 },
    { name: 'a proton', m: 1.67262192369e-27 },
    { name: 'a virus', m: 1e-18 },
    { name: 'the Bose et al. test mass', m: 1e-14 },
    { name: 'a grain of dust', m: 1e-9 },
    { name: 'you', m: 70 },
    { name: 'the Earth', m: M_EARTH },
    { name: 'the Sun', m: M_SUN },
  ];

  const FRONTIER = [
    {
      title: 'gravity-mediated entanglement',
      status: 'proposed, not yet done',
      col: 'green',
      detail: 'Put two ~10⁻¹⁴ kg masses in superposition side by side. If gravity is quantum it can entangle them; if it is classical it cannot. A tabletop answer to "is gravity quantum" — and the hardest interferometry ever attempted.',
    },
    {
      title: 'primordial gravitational waves',
      status: 'searched, limit r < 0.036',
      col: 'orange',
      detail: 'Inflation should have frozen in ripples of spacetime itself (sim 49). Detecting them would be seeing gravitons produced by expansion — quantum gravity, indirectly. Not found yet.',
    },
    {
      title: 'Lorentz invariance at the Planck scale',
      status: 'tested, no violation seen',
      col: 'cyan',
      detail: 'Some quantum-gravity models make light speed depend faintly on energy. Gamma-ray bursts a billion light-years away arrive with their high- and low-energy photons together to within seconds, ruling that out at and beyond the Planck energy.',
    },
    {
      title: 'the singularity itself',
      status: 'open — no data at all',
      col: 'red',
      detail: 'Penrose proved GR predicts its own breakdown. Loop quantum gravity replaces it with a bounce, string theory with holography. Nothing has been observed either way, and there is no experiment on the horizon.',
    },
  ];

  class PlanckScaleSim extends Sim {
    init() {
      this.mode = 'map';
      this.logM = Math.log10(M_CROSS);
      this.phase = 0;
      this.buildControls();
      this.updateReadout();
    }

    compton(m) { return HBAR / (m * C); }
    rs(m) { return (2 * G * m) / C2; }

    numbers() {
      const m = 10 ** this.logM;
      const lc = this.compton(m);
      const rs = this.rs(m);
      return {
        m, lc, rs,
        quantumWins: lc > rs,
        ratio: lc / rs,
        nearPlanck: Math.abs(Math.log10(lc / rs)) < 1,
      };
    }

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'the map of physics', value: 'map' },
        { label: 'what could actually be tested', value: 'frontier' },
      ], { initial: 'map', onSelect: (v) => this.setMode(v) });

      this.mSlider = slider(c, {
        label: 'mass of the thing you are describing',
        min: 1e-36, max: 1e36, value: 10 ** this.logM, log: true,
        format: (v) => `${sci(v, 2)} kg`,
        oninput: (v) => {
          this.logM = Math.log10(v);
          if (this.numbers().nearPlanck && !this._citedR) { this._citedR = true; this.cite(CIT_BD); }
          this.updateReadout(); this.poke();
        },
      });

      this.objBtns = buttonRow(c, OBJECTS.map((o) => ({ label: o.name, value: o.name })), {
        initial: 'a proton',
        onSelect: (v) => {
          this.logM = Math.log10(OBJECTS.find((o) => o.name === v).m);
          this.mSlider.set(10 ** this.logM);
          this.updateReadout(); this.poke();
        },
      });

      // Rovelli's book is the standing reference for "what happens at this scale",
      // and Penrose is why we know the question cannot be dodged.
      actionButton(c, 'go to the Planck scale', () => {
        this.logM = Math.log10(M_CROSS);
        this.mSlider.set(M_CROSS);
        this.cite(CIT_ROVELLI);
        this.updateReadout(); this.poke();
      });
      actionButton(c, 'why the singularity forces the issue', () => {
        this.setMode('frontier');
        this.cite(CIT_PENROSE);
      });
      this.setMode('map');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.mSlider, v === 'map');
      show(this.objBtns, v === 'map');
      if (v === 'frontier' && !this._citedB) { this._citedB = true; this.cite(CIT_BOSE); }
      if (v === 'map' && !this._citedH) { this._citedH = true; this.cite(CIT_HAWK76); }
      this.cache.invalidate(); this.updateReadout(); this.poke();
    }

    update(dt) { this.phase += dt; }

    updateReadout() {
      if (this.mode === 'frontier') return this.frontierReadout();
      const n = this.numbers();
      setReadout(this.readoutEl, [
        [
          [`mass ${sci(n.m, 3)} kg`, 'yellow'],
          ['  ·  quantum size (Compton) ', null], [fmtLen(n.lc, 3), 'cyan'],
          ['  ·  gravitational size (Schwarzschild) ', null], [fmtLen(n.rs, 3), 'orange'],
        ],
        n.nearPlanck ? [
          ['THE PLANCK SCALE. ', 'pink'],
          ['The two sizes are within a factor of ten of each other, so you cannot use one theory and neglect the other. Quantum mechanics says this thing is smeared over about the same distance as its own event horizon — and nobody knows how to write down physics here. This is not a hard problem; it is an unsolved one.', null],
        ] : n.quantumWins ? [
          ['Quantum side. ', 'cyan'],
          ['Its quantum fuzziness is ', null], [`${sci(n.ratio, 2)}×`, 'cyan'],
          [' bigger than its gravitational radius, so gravity is utterly negligible and ordinary quantum mechanics is exact. Every experiment ever done with particles lives here.', null],
        ] : [
          ['Gravity side. ', 'orange'],
          ['Its gravitational radius is ', null], [`${sci(1 / n.ratio, 2)}×`, 'orange'],
          [' bigger than its quantum fuzziness, so general relativity is exact and quantum uncertainty is irrelevant. Every star, planet and galaxy lives here.', null],
        ],
        [
          ['The crossing is at m = √(ħc/2G) = ', null], [`${sci(M_CROSS, 4)} kg`, 'pink'],
          [' and ', null], [`${sci(L_CROSS, 3)} m`, 'pink'],
          [' — the Planck scale, found by intersecting the two curves rather than being asserted. Note the mass is not small: 1.5×10⁻⁸ kg is a visible speck. It is the LENGTH that is impossible.', null],
        ],
        [
          [`ℓ_P = ${sci(L_P, 4)} m  ·  t_P = ${sci(T_P, 4)} s  ·  m_P = ${sci(M_P, 4)} kg  ·  E_P = ${sci(E_P_GEV, 4)} GeV  ·  T_P = ${sci(TEMP_P, 4)} K`, null],
        ],
      ]);
    }

    frontierReadout() {
      setReadout(this.readoutEl, [
        [
          ['There is no measurement of quantum gravity. None. ', 'red'],
          ['That is the honest headline, and everything below is either a proposal or a limit that rules something out.', null],
        ],
        [
          ['The most promising near-term test is the first one on the canvas: if two masses can be entangled by nothing but their mutual gravity, then gravity cannot be classical — a classical field cannot create entanglement. The experiment needs masses around 10⁻¹⁴ kg held in superposition for seconds. It has not been done, but it is not science fiction either; it is engineering.', null],
        ],
        [
          ['Meanwhile the Planck energy is ', null], [`${sci(E_P_GEV, 3)} GeV`, 'yellow'],
          [' and the LHC reaches about 1.4×10⁴ GeV — a factor of ', null],
          [sci(E_P_GEV / 1.4e4, 2), 'red'],
          [' short. We will not be building our way there. Any evidence will come from the sky, from tabletop quantum experiments, or from a theoretical consistency argument.', null],
        ],
      ]);
    }

    /* ---------------- drawing ---------------- */

    renderMap() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.numbers();
      const x0 = compact ? 44 : 72;
      const x1 = w - (compact ? 16 : 30);
      const y0 = compact ? 54 : 68;
      const y1 = h - (compact ? 52 : 64);
      const lm0 = -36; const lm1 = 36;
      const ll0 = -40; const ll1 = 14;
      const X = (lm) => x0 + ((lm - lm0) / (lm1 - lm0)) * (x1 - x0);
      const Y = (ll) => y1 - ((ll - ll0) / (ll1 - ll0)) * (y1 - y0);

      this.cache.draw(`max-${w}x${h}`, (g) => g.line(x0, y1, x1, y1, opts(1500, { stroke: COLORS.ink, strokeWidth: 1.6 })));
      this.cache.draw(`may-${w}x${h}`, (g) => g.line(x0, y0, x0, y1, opts(1501, { stroke: COLORS.ink, strokeWidth: 1.6 })));

      // Compton wavelength: falls as 1/m
      ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let lm = lm0; lm <= lm1; lm += 0.4) {
        const px = X(lm); const py = Y(Math.log10(this.compton(10 ** lm)));
        if (lm === lm0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // Schwarzschild radius: rises with m
      ctx.strokeStyle = COLORS.orange; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let lm = lm0; lm <= lm1; lm += 0.4) {
        const px = X(lm); const py = Y(Math.log10(this.rs(10 ** lm)));
        if (lm === lm0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      label(ctx, compact ? 'quantum size' : 'quantum size  ħ/mc', X(-32), Y(Math.log10(this.compton(1e-32))) - 8,
        { color: COLORS.cyan, size: compact ? 9.5 : 12 });
      label(ctx, compact ? 'horizon' : 'gravitational size  2Gm/c²', X(24), Y(Math.log10(this.rs(1e24))) - 8,
        { color: COLORS.orange, size: compact ? 9.5 : 12, align: 'right' });

      // the crossing
      const cxp = X(Math.log10(M_CROSS));
      const cyp = Y(Math.log10(L_CROSS));
      rc.circle(cxp, cyp, 16, opts(1502, { stroke: COLORS.pink, strokeWidth: 2.4 }));
      label(ctx, compact ? 'Planck' : 'the Planck scale — both rules at once, neither theory valid',
        cxp + 14, cyp - 14, { color: COLORS.pink, size: compact ? 10 : 12.5 });

      // real objects along the curves
      for (const o of OBJECTS) {
        const lm = Math.log10(o.m);
        if (lm < lm0 || lm > lm1) continue;
        const bigger = Math.max(this.compton(o.m), this.rs(o.m));
        const px = X(lm); const py = Y(Math.log10(bigger));
        ctx.fillStyle = COLORS.muted;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
        if (!compact) label(ctx, o.name, px + 5, py - 5, { color: COLORS.muted, size: 10 });
      }

      // the reader's position
      const px = X(this.logM);
      const py = Y(Math.log10(Math.max(n.lc, n.rs)));
      rc.circle(px, py, 12, opts(1503, { stroke: n.nearPlanck ? COLORS.pink : (n.quantumWins ? COLORS.cyan : COLORS.orange), strokeWidth: 2.2 }));

      label(ctx, 'mass  →', (x0 + x1) / 2, y1 + (compact ? 20 : 26), { color: COLORS.ink, size: compact ? 10.5 : 12.5, align: 'center' });
      label(ctx, 'size', x0 - (compact ? 30 : 46), (y0 + y1) / 2, { color: COLORS.ink, size: compact ? 10.5 : 12.5 });
      label(ctx, compact ? 'where the two lines meet, both apply' : 'where the two lines meet, an object is as fuzzy as it is heavy — and no theory we have covers it',
        (x0 + x1) / 2, y0 - (compact ? 12 : 16), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      label(ctx, `ℓ_P = ${sci(L_P, 3)} m   ·   t_P = ${sci(T_P, 3)} s   ·   E_P = ${sci(E_P_GEV, 3)} GeV`,
        (x0 + x1) / 2, h - (compact ? 8 : 10), { color: COLORS.muted, size: compact ? 9 : 11.5, align: 'center' });
    }

    renderFrontier() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      label(ctx, 'no measurement of quantum gravity exists — here is what might change that',
        w / 2, compact ? 22 : 28, { color: COLORS.yellow, size: compact ? 11.5 : 15, align: 'center' });

      const top = compact ? 44 : 56;
      const rowH = (h - top - 24) / FRONTIER.length;
      FRONTIER.forEach((f, i) => {
        const y = top + i * rowH;
        const col = COLORS[f.col];
        this.cache.draw(`fr-${i}-${w}x${h}`, (g) => g.rectangle(14, y, w - 28, rowH - 10, opts(1520 + i, {
          stroke: col, strokeWidth: 1.4,
        })));
        label(ctx, f.title, 26, y + (compact ? 17 : 21), { color: col, size: compact ? 11.5 : 14.5 });
        label(ctx, f.status, w - 26, y + (compact ? 17 : 21), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'right' });
        if (!compact) {
          // wrap the detail text by hand — canvas has no wrapping
          const words = f.detail.split(' ');
          let line = ''; let ly = y + 40;
          ctx.font = `12px ${A.FONT_BODY}`;
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > w - 60) {
              label(ctx, line, 26, ly, { color: COLORS.muted, size: 12 });
              line = word; ly += 16;
            } else line = test;
          }
          if (line) label(ctx, line, 26, ly, { color: COLORS.muted, size: 12 });
        }
      });
      notToScale(rc, ctx, compact ? w - 66 : w - 84, h - 14);
    }

    render() {
      if (this.mode === 'frontier') return this.renderFrontier();
      this.renderMap();
    }
  }

  A.register('planck', PlanckScaleSim);
})();
