// Sim 21 — Star birth & fusion.
//
// A gas cloud collapses (squeezing heats it); if its mass exceeds ~0.08 M_sun
// the core reaches ~10⁷ K and hydrogen fusion ignites, otherwise it stalls as a
// brown dwarf. The proton–proton chain (4 ¹H → ⁴He, Δm/m ≈ 0.71%, 26.7 MeV) is
// animated step by step, and a gravity-vs-pressure tug-of-war shows hydrostatic
// equilibrium. Final surface colour comes from blackbodyRGB(T).

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, sparkle, blackbodyRGB,
    slider, actionButton, setReadout, fmtNum, sci,
  } = A;

  const BROWN_DWARF = 0.08;   // M_sun — hydrogen-fusion threshold
  const IGNITE_T = 1e7;       // K

  // rough main-sequence surface temperature for a given mass (K)
  function surfaceT(M) {
    // interpolate a small lookup on log-mass
    const pts = [[0.08, 2300], [0.5, 3800], [1, 5772], [2, 9000], [5, 17000], [10, 22000], [50, 40000]];
    if (M <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (M <= pts[i][0]) {
        const f = (Math.log10(M) - Math.log10(pts[i - 1][0])) / (Math.log10(pts[i][0]) - Math.log10(pts[i - 1][0]));
        return pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1]);
      }
    }
    return pts[pts.length - 1][1];
  }

  class StarBirthSim extends Sim {
    init() {
      this.mass = 1;
      this.stage = 'cloud';   // cloud | collapsing | star | brown
      this.prog = 0;          // 0..1 collapse progress
      this.coreT = 15;        // K, climbs during collapse
      this.t = 0;
      this.protons = this.seedProtons();
      this.chainStep = 0;
      this.chainT = 0;
      this.buildControls();
      this.updateReadout();
    }

    seedProtons() {
      const arr = [];
      for (let i = 0; i < 40; i++) {
        arr.push({ a: Math.random() * Math.PI * 2, r: 0.3 + Math.random() * 0.7, seed: 100 + i });
      }
      return arr;
    }

    buildControls() {
      const c = this.controlsEl;
      this.massSlider = slider(c, {
        label: 'cloud mass',
        min: 0.02, max: 50, value: this.mass, log: true,
        format: (v) => `${fmtNum(v, v < 1 ? 2 : v < 10 ? 1 : 0)} M☉`,
        oninput: (v) => { this.mass = v; this.reset(); this.updateReadout(); this.poke(); },
      });
      actionButton(c, 'collapse the cloud!', () => {
        if (this.stage === 'cloud') {
          this.stage = 'collapsing';
          this.cite('1920 Eddington - The Internal Constitution of the Stars');
        }
      });
      actionButton(c, 'reset', () => { this.reset(); this.poke(); });
    }

    reset() {
      this.stage = 'cloud';
      this.prog = 0;
      this.coreT = 15;
      this.chainStep = 0;
    }

    updateReadout() {
      const T = surfaceT(this.mass);
      const willIgnite = this.mass >= BROWN_DWARF;
      const lines = [
        [
          ['cloud mass: ', null], [`${fmtNum(this.mass, this.mass < 1 ? 2 : 1)} M☉`, 'orange'],
          ['   ·   core reaches ', null], [`${sci(this.coreT, 1)} K`, 'red'],
          this.stage === 'star' ? ['   ·   surface ', null] : ['', null],
          this.stage === 'star' ? [`${fmtNum(T, 0)} K`, 'yellow'] : ['', null],
        ],
        willIgnite
          ? [['above 0.08 M☉ → the core hits 10 million K and ', null], ['hydrogen fusion IGNITES', 'green'], [' → a star is born.', null]]
          : [['below 0.08 M☉ (~80 Jupiters) → never hot enough to fuse. It becomes a ', null], ['brown dwarf — a failed star', 'muted'], ['.', null]],
      ];
      if (this.stage === 'star') {
        lines.push([
          ['fusing 4 H → He: ', null], ['0.71% of the mass', 'pink'],
          [' becomes energy = ', null], ['26.7 MeV per helium', 'yellow'],
          ['. The Sun does this ~10³⁸ times a second — 4 million tonnes of mass into sunlight every second.', null],
        ]);
      } else {
        lines.push([['press "collapse the cloud!" — gravity squeezes the gas until it either ignites or gives up.', 'yellow']]);
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      if (this.stage === 'collapsing') {
        this.prog = Math.min(1, this.prog + dt * 0.35);
        // core temperature climbs toward ignition (log-ish)
        this.coreT = 15 * Math.pow(10, this.prog * 6.3); // up to ~3e7 K
        if (this.prog >= 1) {
          this.stage = this.mass >= BROWN_DWARF ? 'star' : 'brown';
          if (this.stage === 'star') this.cite('1939 Bethe - Energy Production in Stars');
          this.coreT = this.mass >= BROWN_DWARF ? 1.5e7 : 3e5;
          this.updateReadout();
        }
      }
      if (this.stage === 'star') {
        this.chainT += dt;
        if (this.chainT > 1.1) { this.chainT = 0; this.chainStep = (this.chainStep + 1) % 4; }
      }
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const starX = compact ? w * 0.5 : w * 0.26;
      const starY = compact ? h * 0.30 : h * 0.44;

      // --- the cloud / protostar / star ---
      const baseR = Math.min(w, h) * 0.22;
      if (this.stage === 'cloud') {
        // fluffy doodle cloud
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          rc.circle(starX + Math.cos(a) * baseR * 0.6, starY + Math.sin(a) * baseR * 0.6, baseR * 0.7, opts(200 + i, { stroke: COLORS.muted, strokeWidth: 1.3 }));
        }
        label(ctx, 'a cold cloud of hydrogen gas', starX, starY + baseR + 24, { color: COLORS.muted, size: 13, align: 'center' });
      } else if (this.stage === 'collapsing') {
        const r = baseR * (1 - this.prog * 0.7);
        const glow = this.prog;
        ctx.fillStyle = `rgba(255,${Math.round(180 - glow * 100)},80,${0.2 + glow * 0.5})`;
        ctx.beginPath(); ctx.arc(starX, starY, r, 0, Math.PI * 2); ctx.fill();
        rc.circle(starX, starY, r * 2, opts(210, { stroke: COLORS.orange, strokeWidth: 1.8 }));
        // infall arrows
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r1 = r + 40; const r2 = r + 14;
          doodleArrow(rc, starX + Math.cos(a) * r1, starY + Math.sin(a) * r1, starX + Math.cos(a) * r2, starY + Math.sin(a) * r2, { color: COLORS.muted, seed: 220 + i, strokeWidth: 1.3 });
        }
        label(ctx, `collapsing… core now ${sci(this.coreT, 1)} K`, starX, starY + baseR + 24, { color: COLORS.orange, size: 13, align: 'center' });
      } else if (this.stage === 'brown') {
        const col = blackbodyRGB(1200);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(starX, starY, baseR * 0.5, 0, Math.PI * 2); ctx.fill();
        rc.circle(starX, starY, baseR, opts(230, { stroke: COLORS.muted, strokeWidth: 1.6 }));
        label(ctx, 'brown dwarf — a failed star', starX, starY + baseR + 14, { color: COLORS.muted, size: 14, align: 'center' });
        label(ctx, 'glows faintly and slowly cools; fusion never lit', starX, starY + baseR + 32, { color: COLORS.muted, size: 11.5, align: 'center' });
      } else {
        // a real star
        const col = blackbodyRGB(surfaceT(this.mass));
        const r = baseR * (0.5 + Math.min(this.mass, 20) / 60);
        const grad = ctx.createRadialGradient(starX, starY, r * 0.4, starX, starY, r * 1.7);
        grad.addColorStop(0, col); grad.addColorStop(1, 'rgba(30,30,30,0)');
        ctx.globalAlpha = 0.4; ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(starX, starY, r * 1.7, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(starX, starY, r, 0, Math.PI * 2); ctx.fill();
        rc.circle(starX, starY, r * 2, opts(240, { stroke: COLORS.ink, strokeWidth: 1.6 }));
        // gravity vs pressure tug of war
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          doodleArrow(rc, starX + Math.cos(a) * (r + 34), starY + Math.sin(a) * (r + 34), starX + Math.cos(a) * (r + 12), starY + Math.sin(a) * (r + 12), { color: COLORS.cyan, seed: 250 + i, strokeWidth: 1.2 }); // gravity in
          doodleArrow(rc, starX + Math.cos(a) * (r * 0.5), starY + Math.sin(a) * (r * 0.5), starX + Math.cos(a) * (r + 8), starY + Math.sin(a) * (r + 8), { color: COLORS.orange, seed: 260 + i, strokeWidth: 1.2 }); // pressure out
        }
        label(ctx, 'balanced: gravity in ↔ pressure out', starX, starY + r + 34, { color: COLORS.ink, size: 12.5, align: 'center' });
        if (!compact) {
          label(ctx, 'gravity', starX - r - 44, starY, { color: COLORS.cyan, size: 11, align: 'center' });
          label(ctx, 'pressure', starX + r + 44, starY, { color: COLORS.orange, size: 11, align: 'center' });
        }
      }

      // --- proton–proton chain panel (right) ---
      if (!compact) {
        const px = w * 0.68;
        const py = h * 0.5;
        label(ctx, 'the proton–proton chain (the Sun\'s furnace)', px, 28, { color: COLORS.ink, size: 13.5, align: 'center' });
        const steps = [
          'p + p → deuterium + e⁺ + ν',
          'deuterium + p → helium-3 + γ',
          'helium-3 + helium-3 → helium-4 + p + p',
          '4 H → 1 He   (0.71% of mass → energy)',
        ];
        const active = this.stage === 'star' ? this.chainStep : -1;
        for (let i = 0; i < steps.length; i++) {
          const y = py - 50 + i * 34;
          const on = i === active;
          const isNet = i === 3;
          ctx.globalAlpha = active < 0 ? 0.4 : (on || isNet ? 1 : 0.5);
          rc.rectangle(px - 150, y - 13, 300, 26, opts(270 + i, { stroke: isNet ? COLORS.yellow : (on ? COLORS.green : COLORS.muted), strokeWidth: on ? 2 : 1.3 }));
          label(ctx, steps[i], px, y + 4, { color: isNet ? COLORS.yellow : (on ? COLORS.green : COLORS.muted), size: 11.5, align: 'center' });
          ctx.globalAlpha = 1;
        }
        if (this.stage !== 'star') label(ctx, '(ignite a star to run it)', px, py + 76, { color: COLORS.muted, size: 11.5, align: 'center' });
        sparkle(rc, px + 150, 30, 6, { color: COLORS.pink, seed: 290 });
      } else if (this.stage === 'star') {
        label(ctx, '4 H → He  ·  0.71% of mass → light', w / 2, h - 16, { color: COLORS.yellow, size: 12.5, align: 'center' });
      }
    }
  }

  A.register('starBirth', StarBirthSim);
})();
