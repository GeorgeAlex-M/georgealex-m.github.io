// Sim 47 — Dark energy in your kitchen (why it never touches anything nearby).
//
// Sim 12 shows dark energy from the outside: four universes, four a(t) curves.
// This one starts in a kitchen, because the question people actually have is
// "if space is being pushed apart, why isn't my table being pushed apart?"
//
// The answer is a single comparison, made at every scale by a zoom slider.
// Dark energy has a FIXED density — expanding space makes more space, and each
// cubic metre carries the same amount, which is what makes it different from
// everything else:
//     rho_Lambda = Omega_Lambda * rho_crit,  rho_crit = 3H0^2/(8 pi G)
//     H0 = 67.4 km/s/Mpc, Omega_m = 0.315  (Planck 2018 VI)
//   -> rho_crit  = 8.53e-27 kg/m^3
//   -> rho_Lambda = 5.85e-27 kg/m^3   — about six milligrams in an Earth-sized volume
//
// Matter, by contrast, DILUTES: pack it into a planet and its local density is
// astronomical; spread it over the cosmos and it thins out to 2.69e-27 kg/m^3.
// So the sim computes, at each zoom level, the mean matter density enclosed and
// puts it head to head with the fixed rho_Lambda:
//     kitchen air    1.2 kg/m^3        -> matter wins by 2e26
//     the Earth      5514 kg/m^3       -> matter wins by 9e29
//     solar system   5.2e-9 kg/m^3     -> matter wins by 9e17
//     the Galaxy     ~2.4e-23 kg/m^3   -> matter wins by ~4000
//     cosmic average 2.69e-27 kg/m^3   -> DARK ENERGY WINS, 2.17 to 1
// The crossover is the whole lesson: dark energy is everywhere, including the
// kitchen, and it loses everywhere that anything else is present. It only wins
// in the emptiness between galaxy clusters — which is most of the universe.
//
// Panel 2 makes the "fixed vs diluting" point directly: run the scale factor
// back and forward and watch matter's density fall as a^-3 while Lambda's stays
// flat. They crossed over at z ~ 0.3 in density (and the ACCELERATION turned on
// earlier, at z ~ 0.67, because acceleration needs rho_Lambda > rho_m/2 — the
// sim solves for both rather than quoting them).
//
// Hand checks reproduced by the code:
//   rho_crit(67.4) = 8.53e-27 kg/m^3;  rho_Lambda = 5.85e-27
//   dark energy inside Earth's volume = 6.3 milligrams
//   rho_Lambda / rho_m,cosmic = 0.685/0.315 = 2.175
//   acceleration begins at a = (Omega_m/(2 Omega_L))^(1/3) -> z = 0.67

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    G, C2, M_SUN, M_EARTH, R_EARTH, AU, PC, fmtNum, sci, fmtLen,
  } = A;

  const CIT_EIN = '1917 Einstein - Kosmologische Betrachtungen zur allgemeinen Relativitätstheorie (Cosmological Considerations in the General Theory of Relativity)';
  const CIT_RIESS = '1998 Riess et al. - Observational Evidence from Supernovae for an Accelerating Universe and a Cosmological Constant';
  const CIT_PERL = '1999 Perlmutter et al. - Measurements of Ω and Λ from 42 High-Redshift Supernovae';
  const CIT_PLANCK = '2020 Planck Collaboration - Planck 2018 results. VI. Cosmological parameters';

  // Planck 2018 VI
  const H0_KMSMPC = 67.4;
  const OMEGA_M = 0.315;
  const OMEGA_L = 1 - OMEGA_M;                     // flat universe
  const H0 = (H0_KMSMPC * 1000) / (1e6 * PC);      // s⁻¹
  const RHO_CRIT = (3 * H0 * H0) / (8 * Math.PI * G);
  const RHO_L = OMEGA_L * RHO_CRIT;                // kg/m³ — fixed, forever
  const RHO_M_COSMIC = OMEGA_M * RHO_CRIT;

  // Scales, smallest to largest. `rho` is the MEAN matter density enclosed at
  // that scale — the honest quantity to compare against a uniform rho_Lambda.
  const SCALES = [
    { key: 'kitchen', name: 'your kitchen', R: 2.0, rho: 1.2, what: 'air', art: 'kitchen' },
    { key: 'earth', name: 'the Earth', R: R_EARTH, rho: M_EARTH / ((4 / 3) * Math.PI * R_EARTH ** 3), what: 'rock and iron', art: 'earth' },
    { key: 'solar', name: 'the solar system', R: 30.07 * AU, rho: M_SUN / ((4 / 3) * Math.PI * (30.07 * AU) ** 3), what: 'mostly Sun', art: 'solar' },
    { key: 'galaxy', name: 'the Milky Way', R: 100e3 * PC, rho: (1.5e12 * M_SUN) / ((4 / 3) * Math.PI * (100e3 * PC) ** 3), what: 'stars, gas and halo', art: 'galaxy' },
    { key: 'cluster', name: 'the Local Group', R: 1.5e6 * PC, rho: (3e12 * M_SUN) / ((4 / 3) * Math.PI * (1.5e6 * PC) ** 3), what: 'two big galaxies and change', art: 'group' },
    { key: 'cosmos', name: 'the whole universe', R: 4.4e26, rho: RHO_M_COSMIC, what: 'the cosmic average', art: 'cosmos' },
  ];

  class DarkEnergyHereSim extends Sim {
    init() {
      this.mode = 'scale';
      this.scaleIdx = 0;
      this.aVal = 1;          // scale factor for panel 2
      this.phase = 0;
      this.buildControls();
      this.updateReadout();
    }

    get scale() { return SCALES[this.scaleIdx]; }

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'zoom out from your kitchen', value: 'scale' },
        { label: 'why it only wins later', value: 'dilute' },
      ], { initial: 'scale', onSelect: (v) => this.setMode(v) });

      this.scaleBtns = buttonRow(c, SCALES.map((s) => ({ label: s.name, value: s.key })), {
        initial: 'kitchen',
        onSelect: (v) => {
          this.scaleIdx = SCALES.findIndex((s) => s.key === v);
          if (v === 'cosmos' && !this._citedR) { this._citedR = true; this.cite(CIT_RIESS); }
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });

      this.aSlider = slider(c, {
        label: 'size of the universe',
        min: 0.05, max: 3, step: 0.005, value: this.aVal,
        format: (v) => `a = ${fmtNum(v, 3)}${v < 1 ? `  (redshift z = ${fmtNum(1 / v - 1, 2)})` : v > 1 ? '  (the future)' : '  (today)'}`,
        oninput: (v) => {
          this.aVal = v;
          if (!this._citedP) { this._citedP = true; this.cite(CIT_PLANCK); }
          this.updateReadout(); this.poke();
        },
      });
      this.setMode('scale');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.scaleBtns, v === 'scale');
      show(this.aSlider, v === 'dilute');
      if (v === 'dilute' && !this._citedE) { this._citedE = true; this.cite(CIT_EIN); }
      this.cache.invalidate(); this.updateReadout(); this.poke();
    }

    /* ---------------- physics ---------------- */

    scaleNumbers() {
      const s = this.scale;
      const V = (4 / 3) * Math.PI * s.R ** 3;
      return {
        s, V,
        rhoM: s.rho,
        deMass: RHO_L * V,                 // kg of dark energy inside that volume
        ratio: s.rho / RHO_L,              // >1 → matter wins
        matterWins: s.rho > RHO_L,
      };
    }

    diluteNumbers() {
      const a = this.aVal;
      const rhoM = RHO_M_COSMIC / (a * a * a);   // matter dilutes as a⁻³
      const rhoL = RHO_L;                        // Lambda does not dilute. At all.
      // Densities are equal when a³ = Ω_m/Ω_Λ.
      const aEq = Math.cbrt(OMEGA_M / OMEGA_L);
      // Acceleration needs rho_L > rho_m/2  (from ä/a ∝ −(ρ+3p)/2 with p=−ρc² for Λ),
      // i.e. a³ > Ω_m/(2Ω_Λ).
      const aAcc = Math.cbrt(OMEGA_M / (2 * OMEGA_L));
      return {
        a, rhoM, rhoL,
        aEq, zEq: 1 / aEq - 1,
        aAcc, zAcc: 1 / aAcc - 1,
        accelerating: a > aAcc,
        lambdaBigger: rhoL > rhoM,
      };
    }

    update(dt) { this.phase += dt; }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'dilute') return this.diluteReadout();
      const n = this.scaleNumbers();
      setReadout(this.readoutEl, [
        [
          ['dark energy has the SAME density everywhere and always: ', null],
          [`${sci(RHO_L, 3)} kg/m³`, 'pink'],
          [`  (Ω_Λ = ${fmtNum(OMEGA_L, 3)} × ρ_crit, from H₀ = ${H0_KMSMPC} km/s/Mpc)`, null],
        ],
        [
          ['inside ', null], [n.s.name, 'yellow'], [' there is ', null],
          [`${sci(n.deMass, 3)} kg`, 'pink'], [' of it', null],
          [n.s.key === 'earth' ? ` — about ${fmtNum(n.deMass * 1e6, 1)} milligrams, for the entire planet` : '', null],
        ],
        [
          ['mean density of ordinary + dark matter at this scale: ', null],
          [`${sci(n.rhoM, 3)} kg/m³`, 'green'], [` (${n.s.what})`, null],
        ],
        n.matterWins ? [
          ['matter wins here by a factor of ', null], [sci(n.ratio, 3), 'green'],
          ['. Gravity holds this together completely; dark energy does not stretch your kitchen, the Earth, the solar system or the galaxy by any measurable amount.', null],
        ] : [
          ['DARK ENERGY WINS here — by ', null], [`${fmtNum(1 / n.ratio, 3)}×`, 'pink'],
          ['. Averaged over the whole universe there is more dark energy than matter, which is why the expansion is speeding up. Nothing changed about dark energy; the matter just ran out.', null],
        ],
      ]);
    }

    diluteReadout() {
      const d = this.diluteNumbers();
      setReadout(this.readoutEl, [
        [
          [`a = ${fmtNum(d.a, 3)}`, 'yellow'],
          [d.a < 1 ? `  (redshift z = ${fmtNum(1 / d.a - 1, 2)}, the past)` : d.a > 1 ? '  (the future)' : '  (today)', null],
          ['  ·  matter ', null], [`${sci(d.rhoM, 3)} kg/m³`, 'green'],
          ['  ·  dark energy ', null], [`${sci(d.rhoL, 3)} kg/m³`, 'pink'],
        ],
        [
          ['Matter dilutes as a⁻³ — the same stuff spread through more space. Dark energy does not dilute at all: every new cubic metre of space arrives with its own ', null],
          [`${sci(RHO_L, 2)} kg/m³`, 'pink'], [' already in it. That is the entire difference.', null],
        ],
        [
          ['The two densities were equal at ', null], [`a = ${fmtNum(d.aEq, 3)}  (z = ${fmtNum(d.zEq, 2)})`, 'cyan'],
          ['. But the expansion started ACCELERATING earlier than that, at ', null],
          [`a = ${fmtNum(d.aAcc, 3)}  (z = ${fmtNum(d.zAcc, 2)})`, 'orange'],
          [' — because acceleration only needs ρ_Λ to beat ρ_m/2, not ρ_m. Both numbers are solved here, not looked up.', null],
        ],
        [
          [d.accelerating
            ? 'At this size the universe is accelerating: the push has already won.'
            : 'At this size the universe is still decelerating — matter is dense enough to keep pulling the brakes on.', d.accelerating ? 'pink' : 'green'],
          [' Riess and Perlmutter found the turnover in 1998–99 by watching distant supernovae come in fainter than a coasting universe allows.', null],
        ],
      ]);
    }

    /* ---------------- scene drawings ---------------- */

    drawKitchen(compact) {
      const { rc, ctx, w, h } = this;
      const k = `${w}x${h}`;
      const floorY = h * 0.76;
      this.cache.draw(`floor-${k}`, (g) => g.line(0, floorY, w, floorY, opts(1000, { stroke: COLORS.ink, strokeWidth: 2 })));

      // window with a view of the sky
      this.cache.draw(`win-${k}`, (g) => g.rectangle(w * 0.62, h * 0.20, 118, 92, opts(1001, { stroke: COLORS.cyan, strokeWidth: 2 })));
      this.cache.draw(`winx-${k}`, (g) => g.line(w * 0.62 + 59, h * 0.20, w * 0.62 + 59, h * 0.20 + 92, opts(1002, { stroke: COLORS.cyan, strokeWidth: 1.2 })));
      this.cache.draw(`winy-${k}`, (g) => g.line(w * 0.62, h * 0.20 + 46, w * 0.62 + 118, h * 0.20 + 46, opts(1003, { stroke: COLORS.cyan, strokeWidth: 1.2 })));

      // table with a mug on it
      const tx = w * 0.22;
      const ty = h * 0.56;
      this.cache.draw(`table-${k}`, (g) => g.rectangle(tx, ty, 150, 10, opts(1004, { stroke: COLORS.orange, strokeWidth: 2 })));
      this.cache.draw(`leg1-${k}`, (g) => g.line(tx + 12, ty + 10, tx + 12, floorY, opts(1005, { stroke: COLORS.orange, strokeWidth: 1.8 })));
      this.cache.draw(`leg2-${k}`, (g) => g.line(tx + 138, ty + 10, tx + 138, floorY, opts(1006, { stroke: COLORS.orange, strokeWidth: 1.8 })));
      this.cache.draw(`mug-${k}`, (g) => g.path(
        `M ${tx + 60} ${ty} l 3 -26 l 26 0 l 3 26 Z`, opts(1007, { stroke: COLORS.ink, strokeWidth: 1.6 }),
      ));
      this.cache.draw(`handle-${k}`, (g) => g.path(
        `M ${tx + 92} ${ty - 20} q 12 4 0 14`, opts(1008, { stroke: COLORS.ink, strokeWidth: 1.4 }),
      ));
      this.cache.draw(`steam-${k}`, (g) => g.path(
        `M ${tx + 72} ${ty - 30} q 8 -10 0 -18 q -8 -8 2 -16`, opts(1009, { stroke: COLORS.muted, strokeWidth: 1.2 }),
      ));

      // a chair and a person
      this.cache.draw(`chairb-${k}`, (g) => g.line(w * 0.46, ty + 26, w * 0.46, floorY, opts(1010, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      this.cache.draw(`chairs-${k}`, (g) => g.line(w * 0.44, ty + 26, w * 0.50, ty + 26, opts(1011, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      stickFigure(rc, w * 0.47, ty - 34, { scale: compact ? 0.72 : 0.92, seed: 1012, color: COLORS.ink });
      // no caption here: the tug-of-war bar owns the strip below the floor line
    }

    drawScaleArt(art, compact) {
      const { rc, ctx, w, h } = this;
      const cx = w * 0.5;
      const cy = h * 0.46;
      const k = `${art}-${w}x${h}`;
      const R = Math.min(w, h) * (compact ? 0.20 : 0.24);
      if (art === 'kitchen') return this.drawKitchen(compact);
      if (art === 'earth') {
        this.cache.draw(`e-${k}`, (g) => g.circle(cx, cy, R * 2, opts(1020, {
          stroke: COLORS.cyan, strokeWidth: 2.2, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 12,
        })));
        this.cache.draw(`ec-${k}`, (g) => g.path(
          `M ${cx - R * 0.5} ${cy - R * 0.3} q ${R * 0.3} ${-R * 0.3} ${R * 0.6} ${0} q ${-R * 0.1} ${R * 0.4} ${-R * 0.5} ${R * 0.3} Z`,
          opts(1021, { stroke: COLORS.green, strokeWidth: 1.6, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 8 }),
        ));
      } else if (art === 'solar') {
        this.cache.draw(`s-${k}`, (g) => g.circle(cx, cy, 30, opts(1030, {
          stroke: COLORS.yellow, strokeWidth: 2, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 6,
        })));
        [0.30, 0.48, 0.66, 0.86].forEach((f, i) => {
          this.cache.draw(`o-${i}-${k}`, (g) => g.circle(cx, cy, R * 2 * f, opts(1031 + i, {
            stroke: COLORS.muted, strokeWidth: 1, strokeLineDash: [5, 7],
          })));
          rc.circle(cx + Math.cos(i * 1.3) * R * f, cy + Math.sin(i * 1.3) * R * f, 7, opts(1035 + i, { stroke: COLORS.cyan, strokeWidth: 1.4 }));
        });
      } else if (art === 'galaxy') {
        for (let arm = 0; arm < 2; arm++) {
          let d = '';
          for (let t = 0; t <= 24; t++) {
            const th = (t / 24) * 3.2 + arm * Math.PI;
            const rr = R * (0.14 + (t / 24) * 0.9);
            d += `${t === 0 ? 'M' : 'L'} ${cx + Math.cos(th) * rr} ${cy + Math.sin(th) * rr * 0.42} `;
          }
          this.cache.draw(`arm-${arm}-${k}`, (g) => g.path(d, opts(1040 + arm, { stroke: COLORS.cyan, strokeWidth: 1.6 })));
        }
        this.cache.draw(`bulge-${k}`, (g) => g.circle(cx, cy, 34, opts(1042, {
          stroke: COLORS.yellow, strokeWidth: 1.8, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.6, hachureGap: 7,
        })));
        this.cache.draw(`halo-${k}`, (g) => g.circle(cx, cy, R * 2.2, opts(1043, {
          stroke: COLORS.pink, strokeWidth: 1.2, strokeLineDash: [7, 9],
        })));
      } else if (art === 'group') {
        [[cx - R * 0.6, cy, 1], [cx + R * 0.65, cy - R * 0.2, 0.8], [cx + R * 0.1, cy + R * 0.5, 0.4]].forEach(([gx, gy, s], i) => {
          this.cache.draw(`g-${i}-${k}`, (gg) => gg.ellipse(gx, gy, 90 * s, 34 * s, opts(1050 + i, { stroke: COLORS.cyan, strokeWidth: 1.6 })));
        });
      } else if (art === 'cosmos') {
        for (let i = 0; i < 26; i++) {
          const gx = ((i * 0.6180339887) % 1) * w;
          const gy = 40 + ((i * 0.7548776662) % 1) * (h - 120);
          this.cache.draw(`cg-${i}-${k}`, (g) => g.ellipse(gx, gy, 26, 11, opts(1060 + i, { stroke: COLORS.cyan, strokeWidth: 1.2 })));
        }
      }
    }

    /* ---------------- panels ---------------- */

    render() {
      if (this.mode === 'dilute') return this.renderDilute();
      this.renderScale();
    }

    renderScale() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.scaleNumbers();

      this.drawScaleArt(n.s.art, compact);

      // the dark-energy fog: the same everywhere, at every zoom level. That is
      // the point — it never gets thicker or thinner as you zoom.
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = COLORS.pink;
      for (let i = 0; i < 120; i++) {
        const x = ((i * 0.6180339887) % 1) * w;
        const y = ((i * 0.7548776662) % 1) * h;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // the head-to-head bar
      const by = h - (compact ? 74 : 86);
      const bw = w - 40;
      const lg = Math.log10(n.ratio);                    // >0 matter wins
      const span = 30;                                   // decades shown each way
      const midX = 20 + bw / 2;
      rc.line(20, by, 20 + bw, by, opts(1080, { stroke: COLORS.muted, strokeWidth: 1.4 }));
      rc.line(midX, by - 12, midX, by + 12, opts(1081, { stroke: COLORS.ink, strokeWidth: 1.8 }));
      const px = midX + Math.max(-1, Math.min(1, lg / span)) * (bw / 2 - 12);
      rc.circle(px, by, 15, opts(1082, { stroke: n.matterWins ? COLORS.green : COLORS.pink, strokeWidth: 2.4 }));
      label(ctx, 'dark energy wins', 22, by + 30, { color: COLORS.pink, size: compact ? 10.5 : 12.5 });
      label(ctx, 'gravity wins', 20 + bw, by + 30, { color: COLORS.green, size: compact ? 10.5 : 12.5, align: 'right' });
      label(ctx, 'equal', midX, by - 18, { color: COLORS.muted, size: compact ? 10 : 11.5, align: 'center' });

      label(ctx, `${n.s.name}: matter is ${n.matterWins ? sci(n.ratio, 2) + '× denser' : fmtNum(1 / n.ratio, 2) + '× thinner'} than dark energy`,
        w / 2, compact ? 22 : 28, { color: n.matterWins ? COLORS.green : COLORS.pink, size: compact ? 12 : 16, align: 'center' });
      label(ctx, `ρ_Λ = ${sci(RHO_L, 3)} kg/m³ everywhere  ·  dark energy inside: ${sci(n.deMass, 2)} kg`,
        w / 2, compact ? 40 : 48, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, compact ? 'pink dots: the same density at every zoom' : 'the pink dots never thin out as you zoom — that is what "constant density" means',
        w / 2, compact ? 56 : 66, { color: COLORS.pink, size: compact ? 10 : 12, align: 'center' });
      if (n.s.art !== 'kitchen') notToScale(rc, ctx, compact ? w - 66 : w - 84, h - 26);
    }

    renderDilute() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const d = this.diluteNumbers();
      const x0 = compact ? 48 : 72;
      const x1 = w - (compact ? 18 : 32);
      const y0 = compact ? 62 : 76;
      const y1 = h - (compact ? 66 : 80);
      const aMin = 0.05;
      const aMax = 3;
      const lx0 = Math.log10(aMin);
      const lx1 = Math.log10(aMax);
      const X = (a) => x0 + ((Math.log10(a) - lx0) / (lx1 - lx0)) * (x1 - x0);
      const rhoAt = (a) => RHO_M_COSMIC / (a * a * a);
      const ly0 = Math.log10(RHO_L) - 2.2;
      const ly1 = Math.log10(rhoAt(aMin));
      const Y = (r) => y1 - ((Math.log10(r) - ly0) / (ly1 - ly0)) * (y1 - y0);

      this.cache.draw(`dax-${w}x${h}`, (g) => g.line(x0, y1, x1, y1, opts(1090, { stroke: COLORS.ink, strokeWidth: 1.6 })));
      this.cache.draw(`day-${w}x${h}`, (g) => g.line(x0, y0, x0, y1, opts(1091, { stroke: COLORS.ink, strokeWidth: 1.6 })));

      // matter: falls as a^-3
      ctx.strokeStyle = COLORS.green; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let px = x0; px <= x1; px += 2) {
        const a = 10 ** (lx0 + ((px - x0) / (x1 - x0)) * (lx1 - lx0));
        const py = Y(rhoAt(a));
        if (px === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // dark energy: flat, forever
      ctx.strokeStyle = COLORS.pink; ctx.lineWidth = 2.2; ctx.beginPath();
      ctx.moveTo(x0, Y(RHO_L)); ctx.lineTo(x1, Y(RHO_L)); ctx.stroke();

      label(ctx, 'matter  ∝ a⁻³', X(0.09), Y(rhoAt(0.09)) - 10, { color: COLORS.green, size: compact ? 11 : 13 });
      label(ctx, 'dark energy — flat', x1 - 6, Y(RHO_L) - 10, { color: COLORS.pink, size: compact ? 11 : 13, align: 'right' });

      // the two solved milestones
      for (const [a, txt, col] of [[d.aAcc, compact ? 'accel.' : 'acceleration begins', COLORS.orange], [d.aEq, compact ? 'equal' : 'densities equal', COLORS.cyan]]) {
        const px = X(a);
        ctx.setLineDash([4, 5]); ctx.strokeStyle = col; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y1); ctx.stroke(); ctx.setLineDash([]);
        label(ctx, `${txt}  z=${fmtNum(1 / a - 1, 2)}`, px + 5, y0 + (col === COLORS.orange ? 14 : 30),
          { color: col, size: compact ? 10 : 12 });
      }

      // where the reader is
      const px = X(d.a);
      rc.circle(px, Y(d.rhoM), 12, opts(1092, { stroke: COLORS.green, strokeWidth: 2 }));
      rc.circle(px, Y(d.rhoL), 12, opts(1093, { stroke: COLORS.pink, strokeWidth: 2 }));
      rc.line(px, y0, px, y1, opts(1094, { stroke: COLORS.yellow, strokeWidth: 1.2, strokeLineDash: [3, 6] }));

      label(ctx, d.accelerating ? 'the push is winning — expansion accelerating' : 'gravity still winning — expansion slowing',
        w / 2, compact ? 24 : 30, { color: d.accelerating ? COLORS.pink : COLORS.green, size: compact ? 12 : 16, align: 'center' });
      label(ctx, `nothing about dark energy changes across this whole plot — only the matter thins out`,
        w / 2, compact ? 42 : 50, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, 'size of the universe  a  →', (x0 + x1) / 2, y1 + (compact ? 24 : 30), { color: COLORS.ink, size: compact ? 11 : 13, align: 'center' });
      label(ctx, 'density', x0 - (compact ? 34 : 52), (y0 + y1) / 2, { color: COLORS.ink, size: compact ? 10.5 : 12.5 });
    }
  }

  A.register('deHere', DarkEnergyHereSim);
})();
