// Sim 11 — Dark matter (remake): FIT THE TELESCOPE DATA.
//
// Epistemically honest structure: the white points are the DATA — a
// Rubin-style measured rotation curve (rising, then stubbornly flat ~220 km/s,
// with error bars). The curve is your MODEL:
//   v(r) = √(G·M(<r)/r)
//   visible: exponential disk, M(<r) = M_d[1 − (1+r/R_d)e^(−r/R_d)]
//            (M_d = 6×10¹⁰ M_sun, R_d = 3 kpc — Milky-Way-like)
//   halo:    pseudo-isothermal, M(<r) = 4πρ₀r_c²(r − r_c·arctan(r/r_c))
// Start with visible matter only: the model misses the data badly (RMS ~90
// km/s). Turn the halo on and tune it: the fit locks in — you just discovered
// that ~5× the visible mass is invisible. The fit meter (RMS of residuals) is
// the same logic astronomers actually use.
// NB: engine reserves this.rc for the RoughCanvas — halo core is this.rCore.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, sparkle,
    slider, buttonRow, setReadout, fmtNum, sci,
  } = A;

  const G = 4.30091e-6;        // kpc·(km/s)²/M_sun
  const R_MAX = 30;            // kpc
  const M_DISK = 6e10;         // M_sun
  const R_D = 3.0;             // kpc
  const N_STARS = 9;

  // "Telescope data": deterministic Rubin-style flat curve + scatter ±~6 km/s
  const DATA = [];
  for (let i = 0; i < 10; i++) {
    const r = 4 + i * 2.7;
    const jitter = (((i * 0.6180339) % 1) - 0.5) * 11;
    DATA.push({ r, v: 222 * (1 - Math.exp(-r / 2.5)) + jitter, err: 10 });
  }

  class DarkMatterSim extends Sim {
    init() {
      this.halo = false;         // start honest: visible matter only → bad fit
      this.rho0 = 0.013;
      this.rCore = 4.0;
      this.t = 0;
      this.stars = [];
      for (let i = 0; i < N_STARS; i++) {
        const r = 3 + i * (R_MAX - 4) / (N_STARS - 1);
        this.stars.push({ r, phi: (i * 2.399) % (Math.PI * 2), seed: 360 + i });
      }
      this.buildControls();
      this.updateReadout();
    }

    diskMass(r) { return M_DISK * (1 - (1 + r / R_D) * Math.exp(-r / R_D)); }
    haloMass(r) {
      const k = 4 * Math.PI * this.rho0 * 4.5e9 * this.rCore * this.rCore;
      return k * (r - this.rCore * Math.atan(r / this.rCore));
    }
    vVisible(r) { return r > 0.01 ? Math.sqrt(G * this.diskMass(r) / r) : 0; }
    vModel(r) {
      const m = this.diskMass(r) + (this.halo ? this.haloMass(r) : 0);
      return r > 0.01 ? Math.sqrt(G * m / r) : 0;
    }
    // RMS misfit of the model against the data — the fit meter
    rms() {
      let s = 0;
      for (const d of DATA) { const e = this.vModel(d.r) - d.v; s += e * e; }
      return Math.sqrt(s / DATA.length);
    }

    buildControls() {
      const c = this.controlsEl;
      this.haloBtns = buttonRow(c, [
        { label: 'visible matter only', value: false },
        { label: '+ invisible halo', value: true },
      ], {
        initial: false,
        onSelect: (v) => {
          this.halo = v;
          this.cite(v
            ? '1970 Rubin, Ford - Rotation of the Andromeda Nebula from a Spectroscopic Survey of Emission Regions'
            : '1933 Zwicky - Die Rotverschiebung von extragalaktischen Nebeln (The Redshift of Extragalactic Nebulae)');
          this.updateReadout();
          this.poke();
        },
      });
      this.rhoSlider = slider(c, {
        label: 'halo density ρ₀',
        min: 0.004, max: 0.03, step: 0.001, value: this.rho0,
        format: (v) => `${fmtNum(v * 1000, 0)}`,
        oninput: (v) => { this.rho0 = v; this.updateReadout(); this.poke(); },
      });
      this.rcSlider = slider(c, {
        label: 'halo core radius',
        min: 1.5, max: 9, step: 0.1, value: this.rCore,
        format: (v) => `${fmtNum(v, 1)} kpc`,
        oninput: (v) => { this.rCore = v; this.updateReadout(); this.poke(); },
      });
    }

    verdict() {
      const e = this.rms();
      if (e <= 15) return { txt: `FITS! (off by only ${fmtNum(e, 0)} km/s on average)`, cls: 'green', col: COLORS.green };
      if (e <= 40) return { txt: `getting closer — off by ${fmtNum(e, 0)} km/s`, cls: 'yellow', col: COLORS.yellow };
      return { txt: `way off — misses the data by ${fmtNum(e, 0)} km/s`, cls: 'red', col: COLORS.red };
    }

    updateReadout() {
      const vd = this.verdict();
      const mVis = this.diskMass(R_MAX);
      const mHalo = this.halo ? this.haloMass(R_MAX) : 0;
      const lines = [
        [
          ['white points = what telescopes measure. Curve = YOUR model.  → ', null],
          [vd.txt, vd.cls],
        ],
      ];
      if (!this.halo) {
        lines.push([[
          'all the stars, gas and dust we can see cannot spin a galaxy this fast at the edge — the model has to fall off, the data refuses to. Try "+ invisible halo".',
          null,
        ]]);
      } else {
        lines.push([
          ['mass inside 30 kpc — visible: ', null], [`${sci(mVis, 1)} M☉`, 'orange'],
          ['   invisible halo: ', null], [`${sci(mHalo, 1)} M☉`, 'pink'],
          [`   →  ${fmtNum(mHalo / mVis, 1)}× more dark than visible (and halos extend far beyond the plot)`, null],
        ]);
        if (this.rms() <= 15) {
          lines.push([['this is Rubin & Ford\'s discovery: the fit REQUIRES unseen mass. Its gravity is confirmed many ways — its identity is still unknown.', 'green']]);
        }
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      for (const s of this.stars) {
        s.phi += dt * (this.vModel(s.r) / s.r) * 0.06;
      }
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      // layout: side-by-side on desktop, stacked on mobile — the PLOT always shows
      const galX = 0;
      const galY = 0;
      const galW = compact ? w : w * 0.42;
      const galH = compact ? h * 0.44 : h;
      const gcx = galX + galW * 0.5;
      const gcy = galY + galH * 0.52;
      const galR = Math.min(galW, galH) * (compact ? 0.4 : 0.38);

      // --- the galaxy ---
      if (this.halo) {
        const hr = galR * (1.2 + this.rCore / 9);
        rc.circle(gcx, gcy, hr * 2, opts(380, { stroke: COLORS.pink, strokeWidth: 1.2, strokeLineDash: [4, 7] }));
        label(ctx, 'invisible halo', gcx, gcy - hr - 6, { color: COLORS.pink, size: 12, align: 'center' });
      }
      this.cache.draw(`bulge-${galW | 0}-${galH | 0}`, (g) => g.circle(gcx, gcy, galR * 0.42, opts(381, {
        stroke: COLORS.yellow, strokeWidth: 1.6, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.6, hachureGap: 7,
      })));
      // three log-spiral arms with star dots
      for (let armI = 0; armI < 3; armI++) {
        const arm = (armI * Math.PI * 2) / 3;
        let path = '';
        for (let t2 = 0.12; t2 <= 1; t2 += 0.08) {
          const ang = arm + t2 * 2.6;
          const rr = Math.pow(t2, 0.8) * galR;
          const x = gcx + Math.cos(ang) * rr;
          const y = gcy + Math.sin(ang) * rr * 0.82;
          path += (path ? ' L' : 'M') + ` ${x} ${y}`;
        }
        this.cache.draw(`arm-${armI}-${galW | 0}-${galH | 0}`, (g) => g.path(path, opts(383 + armI, { stroke: COLORS.muted, strokeWidth: 1.3 })));
        // stars sprinkled on the arm
        for (let t2 = 0.2; t2 <= 1; t2 += 0.16) {
          const ang = arm + t2 * 2.6 + 0.06;
          const rr = Math.pow(t2, 0.8) * galR;
          ctx.fillStyle = COLORS.ink;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(gcx + Math.cos(ang) * rr, gcy + Math.sin(ang) * rr * 0.82, 1.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      // tracer stars with speed arrows
      for (const s of this.stars) {
        const rr = (s.r / R_MAX) * galR;
        const x = gcx + Math.cos(s.phi) * rr;
        const y = gcy + Math.sin(s.phi) * rr * 0.82;
        const outer = s.r > 12;
        ctx.fillStyle = outer ? COLORS.cyan : COLORS.ink;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        const v = this.vModel(s.r);
        const vlen = (v / 250) * 17;
        const tx = -Math.sin(s.phi); const ty = Math.cos(s.phi) * 0.82;
        ctx.strokeStyle = outer ? COLORS.cyan : COLORS.muted;
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tx * vlen, y + ty * vlen); ctx.stroke();
      }
      label(ctx, 'speed arrows respond to YOUR model', gcx, galY + galH - 8, { color: COLORS.muted, size: 11, align: 'center' });

      // --- the rotation-curve plot (always drawn) ---
      const px0 = compact ? 46 : galW + 46;
      const px1 = w - 24;
      const py0 = compact ? galH + 18 : 40;
      const py1 = h - (compact ? 34 : 60);
      const vMax = 300;
      const X = (r) => px0 + (r / R_MAX) * (px1 - px0);
      const Y = (v) => py1 - (v / vMax) * (py1 - py0);
      this.cache.draw(`axes-${w}x${h}`, (g) => g.path(`M ${px0} ${py0} L ${px0} ${py1} L ${px1} ${py1}`, opts(390, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      label(ctx, 'orbital speed (km/s)', px0 + 4, py0 - 6, { color: COLORS.muted, size: 11, align: 'left' });
      label(ctx, 'radius (kpc)', (px0 + px1) / 2, py1 + 18, { color: COLORS.muted, size: 11, align: 'center' });
      label(ctx, '220', px0 - 5, Y(220) + 4, { color: COLORS.muted, size: 10.5, align: 'right' });

      // model curve (color = fit verdict)
      const vd = this.verdict();
      ctx.strokeStyle = vd.col;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let r = 0.3; r <= R_MAX; r += 0.4) { const x = X(r), y = Y(Math.min(this.vModel(r), vMax)); r <= 0.35 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      // visible-only reference (when halo is on, show what visible alone did)
      if (this.halo) {
        ctx.strokeStyle = COLORS.orange;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let r = 0.3; r <= R_MAX; r += 0.4) { const x = X(r), y = Y(this.vVisible(r)); r <= 0.35 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        label(ctx, 'visible only', X(24), Y(this.vVisible(24)) + 16, { color: COLORS.orange, size: 11, align: 'center' });
      }
      // DATA points with error bars — drawn last, on top: data outranks models
      for (const d of DATA) {
        const x = X(d.r);
        const y = Y(d.v);
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, Y(d.v - d.err)); ctx.lineTo(x, Y(d.v + d.err)); ctx.stroke();
        ctx.fillStyle = COLORS.ink;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }
      label(ctx, 'MODEL: ' + vd.txt, (px0 + px1) / 2, py0 + 14, { color: vd.col, size: compact ? 11.5 : 13, align: 'center' });
      label(ctx, 'white points = telescope data (Rubin-style)', (px0 + px1) / 2, py0 + 30, { color: COLORS.muted, size: 10.5, align: 'center' });
      sparkle(rc, px1 - 12, py1 - 10, 5, { color: COLORS.pink, seed: 399 });
    }
  }

  A.register('darkMatter', DarkMatterSim);
})();
