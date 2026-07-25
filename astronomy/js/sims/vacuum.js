// Sim 48 — The vacuum is not a place. It is a point of view.
//
// This is the opening of Chapter XIII, and the single idea the whole of quantum
// field theory in curved spacetime is built on: THERE IS NO OBSERVER-INDEPENDENT
// ANSWER TO "HOW MANY PARTICLES ARE HERE?" Fulling showed in 1973 that splitting
// a field into positive and negative frequencies — which is how you define a
// particle at all — depends on your notion of time, and different observers have
// different notions of time. So they disagree about the contents of empty space,
// and both are right.
//
// PANEL 1 — TWO OBSERVERS. One coasts, one accelerates, in the same empty
// Minkowski spacetime. The coasting one measures vacuum. The accelerating one
// measures a thermal bath at the Unruh temperature
//     T = h-bar * a / (2 pi c k_B) = 4.0552e-21 * a  kelvin
// and also acquires a horizon: at proper distance c^2/a behind them there is a
// surface from which no signal will ever reach them, for as long as they keep
// accelerating. The horizon and the heat arrive together — that is the clue.
// The numbers are brutal, which is why nobody has measured it:
//     standing on Earth (9.81 m/s^2)   -> 3.98e-20 K
//     a neutron star surface (1.3e12)  -> 5.2e-9 K
//     to feel one single kelvin        -> 2.47e20 m/s^2
//     to feel room temperature         -> 7.40e22 m/s^2
//
// PANEL 2 — THE SAME FORMULA AT A HORIZON. A black hole's horizon has a surface
// gravity kappa = c^4/(4GM). Put THAT into the Unruh formula, unchanged, and out
// comes Hawking's temperature:
//     h-bar*kappa/(2 pi c k_B) = h-bar c^3/(8 pi G M k_B)
// The sim computes both expressions independently and shows their ratio, which is
// 1 to machine precision. Hawking radiation is not a separate phenomenon bolted
// onto black holes; it is this effect, with gravity supplying the acceleration.
// Check: 1 solar mass -> 6.17e-8 K, matching the value in sim 14.
//
// Everything here is standard, textbook, and UNMEASURED in the real regime — the
// evidence badge says so. Only analogue systems (fluids, BECs, optical fibres)
// have shown the effect's mathematical cousins.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    G, C, C2, HBAR, K_B, M_SUN, M_EARTH, fmtNum, sci, fmtLen, schwarzschildRadius,
  } = A;

  const CIT_FULLING = '1973 Fulling - Nonuniqueness of Canonical Field Quantization in Riemannian Space-Time';
  const CIT_UNRUH = '1976 Unruh - Notes on Black-Hole Evaporation';
  const CIT_HAWK = '1975 Hawking - Particle Creation by Black Holes';
  const CIT_PARKER = '1968 Parker - Particle Creation in Expanding Universes';
  const CIT_BD = '1982 Birrell, Davies - Quantum Fields in Curved Space';

  // T = hbar a / (2 pi c k_B). The constant works out to 4.0552e-21 K per m/s².
  const K_PER_ACC = HBAR / (2 * Math.PI * C * K_B);

  const ACC_PRESETS = [
    { key: 'earth', name: 'standing on Earth', a: 9.80665 },
    { key: 'jet', name: 'a fighter pilot (9g)', a: 9 * 9.80665 },
    { key: 'centrifuge', name: 'a lab centrifuge', a: 1e6 },
    { key: 'neutron', name: 'a neutron-star surface', a: 1.29e12 },
    { key: 'kelvin', name: 'enough to feel 1 K', a: 1 / (HBAR / (2 * Math.PI * C * K_B)) },
    { key: 'room', name: 'enough to feel a warm room', a: 300 / (HBAR / (2 * Math.PI * C * K_B)) },
  ];

  const BH_PRESETS = [
    { key: 'sun', name: 'one solar mass', M: M_SUN },
    { key: 'sgra', name: 'Sgr A*', M: 4.15e6 * M_SUN },
    { key: 'primordial', name: 'a primordial black hole', M: 1e12 },
    { key: 'earthmass', name: "Earth's mass", M: M_EARTH },
  ];

  const N_PAIRS = 26;

  class VacuumSim extends Sim {
    init() {
      this.mode = 'observers';
      this.acc = 1e20;
      this.bhM = M_SUN;
      this.phase = 0;
      this.pairs = [];
      for (let i = 0; i < N_PAIRS; i++) {
        this.pairs.push({
          fx: (i * 0.6180339887) % 1,
          fy: (i * 0.7548776662) % 1,
          ph: (i * 0.381966) % 1,
          sp: 0.6 + ((i * 7) % 5) * 0.16,
        });
      }
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- physics ---------------- */

    unruhT(a) { return K_PER_ACC * a; }
    rindlerD(a) { return C2 / a; }

    // Surface gravity of a Schwarzschild horizon.
    kappa(M) { return (C2 * C2) / (4 * G * M); }

    bhNumbers() {
      const M = this.bhM;
      const k = this.kappa(M);
      // two independent routes to the same temperature
      const viaUnruh = this.unruhT(k);
      const viaHawking = (HBAR * C * C2) / (8 * Math.PI * G * M * K_B);
      return {
        M, k, viaUnruh, viaHawking,
        ratio: viaUnruh / viaHawking,
        rs: schwarzschildRadius(M),
      };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'two observers, one vacuum', value: 'observers' },
        { label: 'the same formula at a horizon', value: 'horizon' },
        { label: 'is it just time dilation?', value: 'dilation' },
      ], { initial: 'observers', onSelect: (v) => this.setMode(v) });

      this.accBtns = buttonRow(c, ACC_PRESETS.map((p) => ({ label: p.name, value: p.key })), {
        initial: 'kelvin',
        onSelect: (v) => {
          this.acc = ACC_PRESETS.find((p) => p.key === v).a;
          this.accSlider.set(this.acc);
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });

      this.accSlider = slider(c, {
        label: 'proper acceleration',
        min: 1, max: 1e24, value: this.acc, log: true,
        format: (v) => `${sci(v, 2)} m/s²  =  ${sci(v / 9.80665, 2)} g`,
        oninput: (v) => {
          this.acc = v;
          if (!this._citedU) { this._citedU = true; this.cite(CIT_UNRUH); }
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });

      this.bhBtns = buttonRow(c, BH_PRESETS.map((p) => ({ label: p.name, value: p.key })), {
        initial: 'sun',
        onSelect: (v) => {
          this.bhM = BH_PRESETS.find((p) => p.key === v).M;
          this.bhSlider.set(this.bhM);
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });

      // Panel 3: where you hover outside a horizon, in units of r_s.
      this.hoverSlider = slider(c, {
        label: 'hover at this radius',
        min: 1.001, max: 12, value: 1.5, log: true,
        format: (v) => `r = ${fmtNum(v, 3)} r_s  ·  time runs ${fmtNum(1 / Math.sqrt(1 - 1 / v), 2)}× slower than far away`,
        oninput: (v) => { this.hoverR = v; this.updateReadout(); this.poke(); },
      });
      this.hoverR = 1.5;

      // Panel 3: a constant-velocity observer, for the decisive comparison.
      this.betaSlider = slider(c, {
        label: 'or just move fast (no acceleration)',
        min: 0, max: 0.99999, step: 0.00001, value: 0.999,
        format: (v) => `v = ${fmtNum(v, 5)} c  ·  γ = ${fmtNum(1 / Math.sqrt(1 - v * v), 2)}`,
        oninput: (v) => { this.beta = v; this.updateReadout(); this.poke(); },
      });
      this.beta = 0.999;

      this.bhSlider = slider(c, {
        label: 'black-hole mass',
        min: 1e8, max: 1e40, value: this.bhM, log: true,
        format: (v) => (v >= 1e26 ? `${sci(v / M_SUN, 2)} M☉` : `${sci(v, 2)} kg`),
        oninput: (v) => {
          this.bhM = v;
          if (!this._citedH) { this._citedH = true; this.cite(CIT_HAWK); }
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });
      this.setMode('observers');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.accBtns, v === 'observers');
      show(this.accSlider, v === 'observers' || v === 'dilation');
      show(this.bhBtns, v === 'horizon');
      show(this.bhSlider, v === 'horizon');
      show(this.hoverSlider, v === 'dilation');
      show(this.betaSlider, v === 'dilation');
      if (v === 'observers' && !this._citedF) { this._citedF = true; this.cite(CIT_FULLING); }
      this.cache.invalidate(); this.updateReadout(); this.poke();
    }

    update(dt) { this.phase += dt; }

    // Panel 3. Two separate questions that people (reasonably) conflate:
    //   (a) does time dilation CAUSE the particles?  No — and the constant-
    //       velocity observer proves it: gamma can be enormous while the Unruh
    //       temperature stays exactly zero. Dilation merely RESCALES frequency;
    //       it never mixes positive and negative frequency, and only that mixing
    //       creates particles.
    //   (b) is temperature related to time dilation at all?  Yes, exactly, via
    //       Tolman: a static observer hovering at r measures the Hawking
    //       temperature BLUESHIFTED by precisely the time-dilation factor,
    //           T_local = T_inf / sqrt(1 - r_s/r)
    //       so the same 1/sqrt(...) that slows their clock heats their thermometer.
    dilationNumbers() {
      const v = this.beta;
      const gammaMoving = 1 / Math.sqrt(1 - v * v);
      const r = this.hoverR;                      // in units of r_s
      const redshift = Math.sqrt(1 - 1 / r);      // sqrt(1 - r_s/r)
      const dilation = 1 / redshift;              // clock slowdown factor
      const n = this.bhNumbers();
      return {
        v, gammaMoving,
        tMoving: 0,                               // exactly zero, at any gamma
        tAccel: this.unruhT(this.acc),
        r, redshift, dilation,
        tFar: n.viaHawking,
        tLocal: n.viaHawking / redshift,          // Tolman blueshift
      };
    }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'horizon') return this.horizonReadout();
      if (this.mode === 'dilation') return this.dilationReadout();
      const T = this.unruhT(this.acc);
      const d = this.rindlerD(this.acc);
      setReadout(this.readoutEl, [
        [
          ['proper acceleration ', null], [`${sci(this.acc, 3)} m/s²`, 'cyan'],
          ['  ·  Unruh temperature T = ħa/(2πck_B) = ', null],
          [`${sci(T, 3)} K`, 'pink'],
        ],
        [
          ['The coasting observer measures ', null], ['nothing at all', 'green'],
          ['. The accelerating one, in the SAME region of the SAME empty spacetime, measures a thermal bath at that temperature. Neither is mistaken — "how many particles are here" simply has no observer-independent answer.', null],
        ],
        [
          ['Accelerating also gives you a horizon: ', null],
          [`${fmtLen(d, 3)} behind you`, 'orange'],
          [' there is a surface whose signals can never catch you while you keep accelerating. The heat and the horizon arrive together, and that is the whole clue — wherever there is a horizon, there is a temperature.', null],
        ],
        [
          ['For scale: standing on Earth gives ', null], [`${sci(this.unruhT(9.80665), 2)} K`, 'cyan'],
          ['. To feel a single kelvin you need ', null], [`${sci(1 / K_PER_ACC, 3)} m/s²`, 'yellow'],
          [' — about ', null], [`${sci(1 / K_PER_ACC / 9.80665, 2)} g`, 'yellow'],
          ['. This is why the effect has never been measured directly, only in analogue systems.', null],
        ],
      ]);
    }

    dilationReadout() {
      const d = this.dilationNumbers();
      setReadout(this.readoutEl, [
        [
          ['THE TEST. ', 'yellow'],
          ['Move at constant velocity ', null], [`${fmtNum(d.v, 5)} c`, 'cyan'],
          [' — your clock runs ', null], [`${fmtNum(d.gammaMoving, 2)}× slower`, 'cyan'],
          [' than a clock at rest. Unruh temperature you measure: ', null],
          ['exactly 0 K', 'green'],
          ['. Enormous time dilation, zero particles.', null],
        ],
        [
          ['Now accelerate instead, at ', null], [`${sci(this.acc, 2)} m/s²`, 'orange'],
          ['. Temperature: ', null], [`${sci(d.tAccel, 3)} K`, 'pink'],
          ['. So time dilation is NOT what makes the particles — you can have all the dilation you like and still see a perfect vacuum. The particles need a horizon, which only acceleration gives you.', null],
        ],
        [
          ['Why the slow-motion picture fails: dilation just rescales frequencies (a slow clock calls every wave slower). Creating particles needs positive and negative frequencies to get MIXED together, and only a change of horizon does that. Rescaling ≠ mixing.', null],
        ],
        [
          ['BUT you were onto something. ', 'yellow'],
          ['Hover at ', null], [`r = ${fmtNum(d.r, 3)} r_s`, 'cyan'],
          [' outside the hole: your clock runs ', null], [`${fmtNum(d.dilation, 3)}× slower`, 'cyan'],
          [' than far away — and the Hawking temperature you feel is blueshifted by ', null],
          ['the very same factor', 'pink'],
          [': ', null], [`${sci(d.tFar, 3)} K → ${sci(d.tLocal, 3)} K`, 'pink'],
          ['. That is the Tolman relation. Time dilation does not create the heat, but wherever a clock slows, the temperature rises in exact lockstep — and at the horizon both blow up together.', null],
        ],
      ]);
    }

    horizonReadout() {
      const n = this.bhNumbers();
      setReadout(this.readoutEl, [
        [
          [`${sci(n.M / M_SUN, 3)} solar masses`, 'yellow'],
          ['  ·  horizon radius ', null], [fmtLen(n.rs, 3), 'cyan'],
          ['  ·  surface gravity κ = c⁴/4GM = ', null], [`${sci(n.k, 3)} m/s²`, 'orange'],
        ],
        [
          ['Unruh\'s formula, fed that surface gravity: T = ħκ/(2πck_B) = ', null],
          [`${sci(n.viaUnruh, 4)} K`, 'pink'],
        ],
        [
          ['Hawking\'s formula, computed independently: T = ħc³/(8πGMk_B) = ', null],
          [`${sci(n.viaHawking, 4)} K`, 'green'],
          ['  ·  ratio = ', null], [fmtNum(n.ratio, 6), 'yellow'],
        ],
        [
          ['They are the same expression. Hawking radiation is not a special property of black holes — it is what any observer with a horizon measures, with gravity supplying the acceleration. That identity is the reason people believe gravity and thermodynamics are secretly the same subject.', null],
        ],
      ]);
    }

    /* ---------------- drawing ---------------- */

    drawThermometer(x, y, hgt, T, compact) {
      const { rc, ctx } = this;
      const w = compact ? 16 : 20;
      this.cache.draw(`thermo-${x | 0}-${y | 0}-${hgt | 0}`, (g) => g.path(
        `M ${x - w / 2} ${y} l 0 ${-hgt} q 0 ${-w / 2} ${w / 2} ${-w / 2} q ${w / 2} 0 ${w / 2} ${w / 2} l 0 ${hgt} Z`,
        opts(1200, { stroke: COLORS.ink, strokeWidth: 1.8 }),
      ));
      this.cache.draw(`bulb-${x | 0}-${y | 0}`, (g) => g.circle(x, y + w * 0.7, w * 1.6, opts(1201, { stroke: COLORS.ink, strokeWidth: 1.8 })));
      // log fill: 1e-25 K at the bottom, 1e12 K at the top
      const lo = -25; const hi = 12;
      const f = Math.max(0, Math.min(1, (Math.log10(Math.max(T, 1e-30)) - lo) / (hi - lo)));
      ctx.fillStyle = COLORS.pink;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x - w / 2 + 3, y - f * hgt, w - 6, f * hgt);
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(x, y + w * 0.7, w * 0.7, 0, Math.PI * 2); ctx.fill();
      label(ctx, `${sci(T, 2)} K`, x, y - hgt - w - 8, { color: COLORS.pink, size: compact ? 11.5 : 13.5, align: 'center' });
    }

    // Fizzing virtual pairs — drawn only for the observer who can see them.
    drawFizz(x0, y0, w, h, intensity) {
      const { ctx } = this;
      ctx.save();
      for (const p of this.pairs) {
        const t = (this.phase * p.sp + p.ph) % 1;
        const a = Math.sin(Math.PI * t);              // fade in and out
        ctx.globalAlpha = a * intensity;
        const x = x0 + p.fx * w;
        const y = y0 + p.fy * h;
        const sep = 3 + a * 7;
        ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(x - sep, y, 2.6, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = COLORS.pink;
        ctx.beginPath(); ctx.arc(x + sep, y, 2.6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    render() {
      if (this.mode === 'horizon') return this.renderHorizon();
      if (this.mode === 'dilation') return this.renderDilation();
      this.renderObservers();
    }

    renderDilation() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const d = this.dilationNumbers();

      // ---- top half: the decisive comparison, two rows ----
      const rowY = compact ? 62 : 76;
      const gap = compact ? 62 : 76;

      const row = (y, title, sub, temp, col, seed) => {
        stickFigure(rc, 44, y, { scale: compact ? 0.5 : 0.62, seed, color: col });
        label(ctx, title, 84, y + 4, { color: col, size: compact ? 11.5 : 13.5 });
        label(ctx, sub, 84, y + (compact ? 19 : 22), { color: COLORS.muted, size: compact ? 9.5 : 11.5 });
        const tx = w - (compact ? 14 : 24);
        const hot = temp > 0;
        label(ctx, hot ? `${sci(temp, 2)} K` : '0 K exactly', tx, y + 6,
          { color: hot ? COLORS.pink : COLORS.green, size: compact ? 12.5 : 16, align: 'right' });
        label(ctx, hot ? 'particles!' : 'no particles', tx, y + (compact ? 21 : 24),
          { color: hot ? COLORS.pink : COLORS.green, size: compact ? 9.5 : 11.5, align: 'right' });
      };

      label(ctx, compact ? 'does dilation make particles?' : 'DOES TIME DILATION MAKE THE PARTICLES?  Two observers, both with slowed clocks:',
        14, compact ? 26 : 32, { color: COLORS.yellow, size: compact ? 11.5 : 14.5 });

      row(rowY, `constant velocity  ${fmtNum(d.v, 5)} c`,
        `clock ${fmtNum(d.gammaMoving, 2)}× slower — but no acceleration, so no horizon`,
        0, COLORS.cyan, 1270);
      row(rowY + gap, `accelerating  ${sci(this.acc, 2)} m/s²`,
        `has a horizon ${fmtLen(this.rindlerD(this.acc), 2)} behind`,
        d.tAccel, COLORS.pink, 1271);

      label(ctx, compact ? '⇒ dilation alone gives nothing' : '⇒ all the dilation you like still gives a perfect vacuum. It is the horizon that does it, not the slow clock.',
        14, rowY + gap * 2 - (compact ? 16 : 12), { color: COLORS.ink, size: compact ? 10.5 : 13 });

      // ---- bottom half: Tolman — the real link ----
      const py0 = rowY + gap * 2 + (compact ? 4 : 12);
      const py1 = h - (compact ? 44 : 54);
      const px0 = compact ? 46 : 74;
      const px1 = w - (compact ? 18 : 34);
      const rMin = 1.02;
      const rMax = 12;
      const X = (r) => px0 + ((Math.log10(r) - Math.log10(rMin)) / (Math.log10(rMax) - Math.log10(rMin))) * (px1 - px0);
      const fac = (r) => 1 / Math.sqrt(1 - 1 / r);
      const fMax = fac(rMin);
      const Y = (f) => py1 - (Math.log10(f) / Math.log10(fMax)) * (py1 - py0);

      this.cache.draw(`tax-${w}x${h}`, (g) => g.line(px0, py1, px1, py1, opts(1280, { stroke: COLORS.ink, strokeWidth: 1.5 })));
      this.cache.draw(`tay-${w}x${h}`, (g) => g.line(px0, py0, px0, py1, opts(1281, { stroke: COLORS.ink, strokeWidth: 1.5 })));

      // one curve, drawn twice — because they are the same function
      ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 3.4; ctx.globalAlpha = 0.5; ctx.beginPath();
      for (let x = px0; x <= px1; x += 2) {
        const r = 10 ** (Math.log10(rMin) + ((x - px0) / (px1 - px0)) * (Math.log10(rMax) - Math.log10(rMin)));
        const y = Y(fac(r));
        if (x === px0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = COLORS.pink; ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]); ctx.beginPath();
      for (let x = px0; x <= px1; x += 2) {
        const r = 10 ** (Math.log10(rMin) + ((x - px0) / (px1 - px0)) * (Math.log10(rMax) - Math.log10(rMin)));
        const y = Y(fac(r));
        if (x === px0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.setLineDash([]);

      const mx = X(d.r);
      rc.circle(mx, Y(d.dilation), 12, opts(1282, { stroke: COLORS.yellow, strokeWidth: 2.2 }));
      label(ctx, compact ? 'clock slowdown  =  temperature rise'
        : 'clock slowdown (cyan)  and  temperature blueshift (pink)  —  the same curve, 1/√(1−r_s/r)',
        (px0 + px1) / 2, py0 - (compact ? 6 : 8), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      label(ctx, `×${fmtNum(d.dilation, 2)}`, mx + 16, Y(d.dilation) + 4, { color: COLORS.yellow, size: compact ? 11 : 13 });
      label(ctx, 'horizon', px0 + 4, py1 - 6, { color: COLORS.red, size: compact ? 9.5 : 11.5 });
      label(ctx, 'far away', px1 - 4, py1 - 6, { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'right' });
      label(ctx, 'distance from the hole  →', (px0 + px1) / 2, py1 + (compact ? 16 : 20),
        { color: COLORS.ink, size: compact ? 10 : 12, align: 'center' });
    }

    renderObservers() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const half = w / 2;
      const T = this.unruhT(this.acc);
      const d = this.rindlerD(this.acc);
      // how visible the fizz should be: nothing at 1e-20 K, obvious by 1 K
      const vis = Math.max(0, Math.min(1, (Math.log10(Math.max(T, 1e-30)) + 12) / 12));

      this.cache.draw(`split-${w}x${h}`, (g) => g.line(half, 34, half, h - 34, opts(1210, {
        stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [8, 8],
      })));

      // a faint fixed starfield on both sides — the SAME empty spacetime
      for (let i = 0; i < 16; i++) {
        const sx = ((i * 0.6180339887) % 1) * w;
        const sy = 50 + ((i * 0.7548776662) % 1) * (h - 140);
        this.cache.draw(`star-${i}-${w}x${h}`, (g) => g.line(sx - 2, sy, sx + 2, sy, opts(1220 + i, {
          stroke: COLORS.muted, strokeWidth: 1,
        })));
      }

      /* ---- left: coasting ---- */
      label(ctx, compact ? 'coasting' : 'COASTING — no acceleration', half * 0.5, compact ? 24 : 30,
        { color: COLORS.green, size: compact ? 12.5 : 15.5, align: 'center' });
      stickFigure(rc, half * 0.5, h * 0.42, { scale: compact ? 0.9 : 1.2, seed: 1230, color: COLORS.green });
      label(ctx, 'measures: vacuum', half * 0.5, h * 0.68, { color: COLORS.green, size: compact ? 12 : 14, align: 'center' });
      label(ctx, compact ? 'nothing here' : 'zero particles. Empty space, exactly as advertised.',
        half * 0.5, h * 0.68 + 20, { color: COLORS.muted, size: compact ? 10.5 : 12, align: 'center' });

      /* ---- right: accelerating ---- */
      label(ctx, compact ? 'accelerating' : 'ACCELERATING — same spacetime', half * 1.5, compact ? 24 : 30,
        { color: COLORS.pink, size: compact ? 12.5 : 15.5, align: 'center' });
      this.drawFizz(half + 12, 46, half - 24, h - 130, vis);

      const fx = half * 1.5;
      const fy = h * 0.42;
      stickFigure(rc, fx, fy, { scale: compact ? 0.9 : 1.2, seed: 1231, color: COLORS.pink });
      // rocket flame under the figure, pointing the acceleration
      for (let i = 0; i < 3; i++) {
        rc.path(`M ${fx - 8 + i * 8} ${fy + (compact ? 58 : 74)} q ${-3} ${14 + i * 4} ${3} ${24 + i * 5}`,
          opts(1240 + i, { stroke: i === 1 ? COLORS.yellow : COLORS.orange, strokeWidth: 1.5 }));
      }
      doodleArrow(rc, fx + (compact ? 40 : 52), fy + 30, fx + (compact ? 40 : 52), fy - 26,
        { color: COLORS.orange, seed: 1243, strokeWidth: 1.6 });
      label(ctx, 'a', fx + (compact ? 48 : 60), fy, { color: COLORS.orange, size: 14 });

      label(ctx, 'measures: a warm bath', half * 1.5, h * 0.68, { color: COLORS.pink, size: compact ? 12 : 14, align: 'center' });
      label(ctx, `${sci(T, 3)} K of particles that the other observer says are not there`,
        half * 1.5, h * 0.68 + 20, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      // Be honest about the cartoon: the standard "pairs popping out of the
      // vacuum" picture is a visual aid, not the derivation. The real mechanism
      // is that the two observers' positive-frequency modes are mixtures of each
      // other, so one's vacuum is the other's populated state.
      if (!compact) {
        label(ctx, 'the little pairs are a cartoon — the real mechanism is frequency mixing, not particles popping',
          half * 1.5, h * 0.68 + 36, { color: COLORS.muted, size: 10.5, align: 'center' });
      }

      // the Rindler horizon, behind the accelerating observer
      const hy = h - 46;
      this.cache.draw(`rindler-${w}x${h}`, (g) => g.line(half + 10, hy, w - 10, hy, opts(1250, {
        stroke: COLORS.red, strokeWidth: 1.8, strokeLineDash: [7, 6],
      })));
      label(ctx, compact ? `horizon ${fmtLen(d, 1)} back` : `their horizon — ${fmtLen(d, 2)} behind them, and no signal from beyond it will ever arrive`,
        half * 1.5, hy + 16, { color: COLORS.red, size: compact ? 9.5 : 11.5, align: 'center' });

      this.drawThermometer(compact ? w - 26 : w - 40, h * 0.50, compact ? 90 : 120, T, compact);
      label(ctx, compact ? 'same spacetime, two answers' : 'the same region of the same empty spacetime — and the two observers disagree about what is in it',
        w / 2, h - 12, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
    }

    renderHorizon() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.bhNumbers();
      const cx = w * (compact ? 0.34 : 0.30);
      const cy = h * 0.46;
      const R = Math.min(w, h) * (compact ? 0.19 : 0.22);

      // the hole and its horizon
      this.cache.draw(`hole-${w}x${h}`, (g) => g.circle(cx, cy, R * 2, opts(1260, {
        stroke: COLORS.ink, strokeWidth: 2.4, fill: '#000000', fillStyle: 'solid',
      })));
      this.cache.draw(`glow-${w}x${h}`, (g) => g.circle(cx, cy, R * 2.3, opts(1261, {
        stroke: COLORS.orange, strokeWidth: 1.2, strokeLineDash: [6, 7],
      })));
      label(ctx, 'horizon', cx, cy + R + 26, { color: COLORS.ink, size: compact ? 11.5 : 13.5, align: 'center' });

      // pairs fizzing at the horizon, one falling in and one escaping
      this.drawFizz(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2, 0.9);

      // the surface-gravity arrow
      doodleArrow(rc, cx + R * 1.9, cy, cx + R * 1.15, cy, { color: COLORS.orange, seed: 1262, strokeWidth: 1.8 });
      label(ctx, `κ = ${sci(n.k, 2)} m/s²`, cx + R * 2.0, cy - 8, { color: COLORS.orange, size: compact ? 10.5 : 12.5 });

      // the two routes, side by side
      const bx = compact ? w * 0.56 : w * 0.55;
      let by = compact ? 60 : 78;
      label(ctx, 'two formulas, one number', bx, by - 24, { color: COLORS.yellow, size: compact ? 12 : 15 });
      label(ctx, 'Unruh, fed κ:', bx, by, { color: COLORS.pink, size: compact ? 11 : 13 });
      label(ctx, `T = ħκ/(2πck_B)`, bx, by + 18, { color: COLORS.muted, size: compact ? 10.5 : 12.5 });
      label(ctx, `${sci(n.viaUnruh, 4)} K`, bx, by + 40, { color: COLORS.pink, size: compact ? 13 : 16 });
      by += 74;
      label(ctx, 'Hawking, direct:', bx, by, { color: COLORS.green, size: compact ? 11 : 13 });
      label(ctx, `T = ħc³/(8πGMk_B)`, bx, by + 18, { color: COLORS.muted, size: compact ? 10.5 : 12.5 });
      label(ctx, `${sci(n.viaHawking, 4)} K`, bx, by + 40, { color: COLORS.green, size: compact ? 13 : 16 });
      by += 68;
      label(ctx, `ratio = ${fmtNum(n.ratio, 6)}  —  identical, not merely similar`,
        bx, by, { color: COLORS.yellow, size: compact ? 11 : 13.5 });

      this.drawThermometer(compact ? w - 24 : w - 38, h * 0.52, compact ? 90 : 120, n.viaHawking, compact);
      notToScale(rc, ctx, compact ? w - 70 : w - 92, h - 54);
      label(ctx, compact ? 'gravity supplies the acceleration' : 'a horizon is a horizon: gravity simply supplies the acceleration, and the same formula returns Hawking\'s temperature',
        w / 2, h - 12, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
    }
  }

  A.register('vacuum', VacuumSim);
})();
