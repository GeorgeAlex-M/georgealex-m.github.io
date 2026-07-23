// Sim 11 — Dark matter (galaxy rotation curves).
//
// Physics: orbital speed depends only on the mass enclosed, v(r) = √(GM(<r)/r).
//  - Visible matter: an exponential disk, M_disk(<r) = M_d·[1 − (1+r/R_d)e^(−r/R_d)].
//    Alone, this gives a Keplerian-ish FALLOFF past a few R_d.
//  - Dark halo: pseudo-isothermal, M_halo(<r) = 4πρ₀r_c²(r − r_c·arctan(r/r_c)),
//    whose enclosed mass keeps growing ∝ r at large r, so v → const (FLAT).
// Parameters are tuned to a Milky-Way-like galaxy: flat curve ≈ 220 km/s,
// disk mass ~6×10¹⁰ M_sun, R_d ≈ 3 kpc. Tracer stars orbit at the model's v(r),
// so toggling the halo visibly speeds up the outer stars.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, sparkle,
    slider, buttonRow, setReadout, fmtNum,
  } = A;

  const G = 4.30091e-6;        // kpc·(km/s)²/M_sun  (galactic-unit gravitational constant)
  const R_MAX = 30;            // kpc, plotted radius
  const M_DISK = 6e10;         // M_sun
  const R_D = 3.0;             // kpc, disk scale length
  const N_STARS = 9;

  class DarkMatterSim extends Sim {
    init() {
      this.halo = true;
      this.rho0 = 0.013;        // scaled halo density (slider); default → flat ~220 km/s
      this.rCore = 4.0;         // kpc, halo core radius (slider). NB: NOT this.rc —
                                // the engine uses this.rc for the RoughCanvas.
      this.t = 0;
      this.stars = [];
      for (let i = 0; i < N_STARS; i++) {
        const r = 3 + i * (R_MAX - 4) / (N_STARS - 1);
        this.stars.push({ r, phi: (i * 2.399) % (Math.PI * 2), seed: 360 + i });
      }
      this.buildControls();
      this.updateReadout();
    }

    // enclosed masses (M_sun)
    diskMass(r) { return M_DISK * (1 - (1 + r / R_D) * Math.exp(-r / R_D)); }
    haloMass(r) {
      // 4π ρ0 rc² (r − rc·atan(r/rc)); ρ0 scaled so the default gives a flat
      // ~220 km/s Milky-Way-like curve (verified against v(r) at 10–30 kpc)
      const k = 4 * Math.PI * this.rho0 * 4.5e9 * this.rCore * this.rCore;
      return k * (r - this.rCore * Math.atan(r / this.rCore));
    }
    vVisible(r) { return r > 0.01 ? Math.sqrt(G * this.diskMass(r) / r) : 0; }
    vTotal(r) {
      const m = this.diskMass(r) + (this.halo ? this.haloMass(r) : 0);
      return r > 0.01 ? Math.sqrt(G * m / r) : 0;
    }
    vObserved(r) { return this.halo ? this.vTotal(r) : this.vVisible(r); }

    buildControls() {
      const c = this.controlsEl;
      this.haloBtns = buttonRow(c, [
        { label: 'visible matter only', value: false },
        { label: '+ dark-matter halo', value: true },
      ], {
        initial: true,
        onSelect: (v) => {
          this.halo = v;
          this.cite(v
            ? '1970 Rubin, Ford - Rotation of the Andromeda Nebula from a Spectroscopic Survey of Emission Regions'
            : '1933 Zwicky - Die Rotverschiebung von extragalaktischen Nebeln (The Redshift of Extragalactic Nebulae)');
          this.updateReadout();
          this.poke();
        },
      });
      this.rcSlider = slider(c, {
        label: 'halo core radius',
        min: 1.5, max: 9, step: 0.1, value: this.rCore,
        format: (v) => `${fmtNum(v, 1)} kpc`,
        oninput: (v) => { this.rCore = v; this.updateReadout(); this.poke(); },
      });
      this.rhoSlider = slider(c, {
        label: 'halo density',
        min: 0.004, max: 0.03, step: 0.001, value: this.rho0,
        format: (v) => `${fmtNum(v * 1000, 1)}`,
        oninput: (v) => { this.rho0 = v; this.updateReadout(); this.poke(); },
      });
    }

    updateReadout() {
      const vOut = this.vObserved(R_MAX);
      const vVisOut = this.vVisible(R_MAX);
      const totM = this.diskMass(R_MAX) + (this.halo ? this.haloMass(R_MAX) : 0);
      const darkFrac = this.halo ? this.haloMass(R_MAX) / totM : 0;
      const lines = [
        [
          ['at the edge (r = 30 kpc): visible matter alone predicts ', null],
          [`${fmtNum(vVisOut, 0)} km/s`, 'orange'],
          ['. Observed: ', null],
          [`${fmtNum(vOut, 0)} km/s`, 'cyan'],
        ],
        this.halo
          ? [['the halo holds ', null], [`${fmtNum(darkFrac * 100, 0)}%`, 'pink'], [' of the enclosed mass — the flat curve is the fingerprint of unseen matter.', null]]
          : [['the outer stars are orbiting far too fast for the light we see — the curve should have fallen off. It doesn\'t. Toggle the halo on.', 'yellow']],
        [['the gravity is measured many ways; WHAT the dark matter is remains unknown (no particle caught yet).', 'green']],
      ];
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      for (const s of this.stars) {
        // angular speed ω = v/r; scale so it animates nicely
        const v = this.vObserved(s.r);
        s.phi += dt * (v / s.r) * 0.06;
      }
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      // left: doodle galaxy with tracer stars; right: the rotation curve plot
      const galW = compact ? w : w * 0.44;
      const gcx = galW * 0.5;
      const gcy = h * 0.5;
      const galR = Math.min(galW, h) * 0.4;

      // dark halo glow (if on)
      if (this.halo) {
        rc.circle(gcx, gcy, galR * 2.1, opts(380, { stroke: COLORS.pink, strokeWidth: 1.2, strokeLineDash: [4, 7] }));
        label(ctx, 'dark-matter halo (invisible)', gcx, gcy - galR - 6, { color: COLORS.pink, size: 12.5, align: 'center' });
      }
      // spiral galaxy body
      this.cache.draw(`gcore-${galW | 0}`, (g) => g.circle(gcx, gcy, galR * 0.5, opts(381, {
        stroke: COLORS.yellow, strokeWidth: 1.6, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.6, hachureGap: 8,
      })));
      for (const arm of [0, Math.PI]) {
        let path = `M ${gcx} ${gcy}`;
        for (let t = 0; t <= 1; t += 0.1) {
          const ang = arm + t * 3.2;
          const rr = t * galR;
          path += ` L ${gcx + Math.cos(ang) * rr} ${gcy + Math.sin(ang) * rr}`;
        }
        this.cache.draw(`arm-${arm}-${galW | 0}`, (g) => g.path(path, opts(382 + arm, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      }
      // tracer stars
      for (const s of this.stars) {
        const rr = (s.r / R_MAX) * galR;
        const x = gcx + Math.cos(s.phi) * rr;
        const y = gcy + Math.sin(s.phi) * rr;
        ctx.fillStyle = s.r > 12 ? COLORS.cyan : COLORS.ink;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        // speed vector
        const v = this.vObserved(s.r);
        const vlen = (v / 250) * 16;
        const tx = -Math.sin(s.phi); const ty = Math.cos(s.phi);
        ctx.strokeStyle = s.r > 12 ? COLORS.cyan : COLORS.muted;
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tx * vlen, y + ty * vlen); ctx.stroke();
      }
      label(ctx, 'outer stars carry a speed arrow — watch them when you toggle the halo', gcx, h - 12, { color: COLORS.muted, size: compact ? 10.5 : 12, align: 'center' });

      if (compact) return;

      // ---- rotation-curve plot ----
      const px0 = galW + 40;
      const px1 = w - 24;
      const py0 = 40;
      const py1 = h - 60;
      const vMax = 300;
      const X = (r) => px0 + (r / R_MAX) * (px1 - px0);
      const Y = (v) => py1 - (v / vMax) * (py1 - py0);
      this.cache.draw(`axes-${w}x${h}`, (g) => g.path(`M ${px0} ${py0} L ${px0} ${py1} L ${px1} ${py1}`, opts(390, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      label(ctx, 'orbital speed →', px0 - 8, py0 + 2, { color: COLORS.muted, size: 11.5, align: 'right' });
      label(ctx, 'radius (kpc) →', (px0 + px1) / 2, py1 + 20, { color: COLORS.muted, size: 11.5, align: 'center' });
      label(ctx, '220', px0 - 6, Y(220) + 4, { color: COLORS.muted, size: 10.5, align: 'right' });

      // visible-only curve (orange, falls off)
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      for (let r = 0.2; r <= R_MAX; r += 0.4) { const x = X(r), y = Y(this.vVisible(r)); r === 0.2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.setLineDash([]);
      // observed curve (cyan)
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let r = 0.2; r <= R_MAX; r += 0.4) { const x = X(r), y = Y(this.vObserved(r)); r === 0.2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();

      label(ctx, 'visible matter (predicted)', X(20), Y(this.vVisible(20)) - 8, { color: COLORS.orange, size: 12, align: 'center' });
      label(ctx, this.halo ? 'observed (flat!)' : 'observed = visible only', X(16), Y(this.vObserved(16)) - 10, { color: COLORS.cyan, size: 12.5, align: 'center' });
      sparkle(rc, px1 - 14, py0 + 10, 5, { color: COLORS.pink, seed: 399 });
    }
  }

  A.register('darkMatter', DarkMatterSim);
})();
