// Sim 1 — Anatomy of a black hole.
//
// Physics: Schwarzschild geometry. r_s = 2GM/c², photon sphere at 1.5 r_s,
// ISCO at 3 r_s. The ring RADII ARE drawn to scale (1 : 1.5 : 3) — a
// Schwarzschild black hole is self-similar, so changing the mass changes only
// the physical scale bar, never the shape. All displayed numbers are computed
// in SI units.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, sparkle,
    slider, buttonRow, actionButton, setReadout,
    M_SUN, M_SGRA, M_M87, R_EARTH, R_SUN, AU, LY,
    schwarzschildRadius, fmtLen, fmtNum, sci,
  } = A;

  const DISK_N = 26;
  const DISK_COLORS = [COLORS.orange, COLORS.yellow, COLORS.red, COLORS.pink];

  // Anchors for the "that's about …" comparison line.
  const ANCHORS = [
    [8848, 'Mount Everest'],
    [R_EARTH, "Earth's radius"],
    [3.844e8, 'the Earth–Moon distance'],
    [R_SUN, "the Sun's radius"],
    [AU, 'the Earth–Sun distance'],
    [4.5e12, "Neptune's orbit"],
    [LY, 'a light-year'],
  ];

  function compare(rs) {
    let best = ANCHORS[0];
    for (const a of ANCHORS) {
      if (rs / a[0] >= 0.15) best = a;
    }
    const ratio = rs / best[0];
    const shown = ratio >= 10 ? fmtNum(ratio, 0) : fmtNum(ratio, 1);
    return `≈ ${shown} × ${best[1]}`;
  }

  class BlackHoleSim extends Sim {
    init() {
      this.M = M_SGRA;
      this.presetName = 'Sgr A* — the black hole at the center of our galaxy';
      this.t = 0;

      // accretion disk doodle particles (r in units of r_s, drawn to that scale)
      this.disk = [];
      for (let i = 0; i < DISK_N; i++) {
        this.disk.push({
          r: 3.15 + ((i * 0.61803) % 1) * 1.15, // 3.15..4.30 r_s, quasi-even
          phase: ((i * 2.399) % (Math.PI * 2)),
          seed: 100 + i,
          color: DISK_COLORS[i % DISK_COLORS.length],
        });
      }

      // the green test particle sitting at the ISCO
      this.resetParticle();

      this.buildControls();
      this.updateReadout();
    }

    resetParticle() {
      this.p = { r: 3, angle: -Math.PI / 2, vr: 0, state: 'orbiting', fade: 1, L: null };
    }

    buildControls() {
      const c = this.controlsEl;
      this.massSlider = slider(c, {
        label: 'mass',
        min: 1,
        max: 1e10,
        value: this.M / M_SUN,
        log: true,
        format: (v) => `${sci(v, 1)} M☉`,
        oninput: (v) => {
          this.M = v * M_SUN;
          this.presetName = 'custom black hole';
          this.updateReadout();
          this.poke();
        },
      });
      this.presets = buttonRow(c, [
        { label: 'the Sun', value: 'sun' },
        { label: 'Sgr A*', value: 'sgra' },
        { label: 'M87*', value: 'm87' },
      ], {
        initial: 'sgra',
        onSelect: (v) => {
          if (v === 'sun') {
            this.M = M_SUN;
            this.presetName = 'the Sun, squeezed into a black hole (hypothetical — the real Sun is too light to collapse)';
          } else if (v === 'sgra') {
            this.M = M_SGRA;
            this.presetName = 'Sgr A* — the black hole at the center of our galaxy';
          } else {
            this.M = M_M87;
            this.presetName = 'M87* — the first black hole ever photographed (2019)';
          }
          this.massSlider.set(this.M / M_SUN);
          this.updateReadout();
          this.poke();
        },
      });
      actionButton(c, 'nudge a particle inside the ISCO', () => {
        if (this.p.state === 'orbiting') {
          this.p.state = 'plunging';
          this.p.L = Math.sqrt(3); // ang. momentum frozen at the nudge (visual units)
          this.p.r = 2.97;
          this.poke();
        }
      });
    }

    updateReadout() {
      const rs = schwarzschildRadius(this.M);
      setReadout(this.readoutEl, [
        [[`${this.presetName}`, 'yellow']],
        [
          ['event horizon r_s = ', null], [fmtLen(rs), 'cyan'],
          ['   photon sphere = ', null], [fmtLen(1.5 * rs), 'cyan'],
          ['   ISCO = ', null], [fmtLen(3 * rs), 'green'],
        ],
        [[`that horizon is ${compare(rs)}`, null]],
        [['change the mass — the shape never changes, only the scale bar. Black holes are self-similar.', 'orange']],
      ]);
    }

    update(dt) {
      this.t += dt;
      // disk particles: Kepler-ish ω ∝ r^(-3/2), ~6 s period at the ISCO
      for (const d of this.disk) {
        d.phase += dt * 1.05 * Math.pow(d.r / 3, -1.5);
      }
      const p = this.p;
      if (p.state === 'orbiting') {
        p.angle += dt * 1.05;
      } else if (p.state === 'plunging') {
        // inside the ISCO there is no stable orbit: radial fall accelerates while
        // angular momentum is conserved (ω = L/r²) → the spiral you see
        p.vr += dt * 1.3 * Math.pow(p.r / 3, -2);
        p.r -= p.vr * dt;
        p.angle += dt * (p.L * 9) / (p.r * p.r);
        if (p.r <= 1.04) {
          p.r = 1.04;
          p.state = 'captured';
          p.capturedAt = this.t;
        }
      } else if (p.state === 'captured') {
        p.fade = Math.max(0, 1 - (this.t - p.capturedAt) / 1.2);
        if (this.t - p.capturedAt > 2.2) this.resetParticle();
      }
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const cx = w / 2;
      const cy = h / 2 + (compact ? 6 : 4);
      const rsPx = Math.min(w, h) * (compact ? 0.09 : 0.105);
      const px = (rUnits) => rUnits * rsPx; // r in units of r_s -> pixels

      // --- accretion disk particles (behind the rings) ---
      for (const d of this.disk) {
        const x = cx + Math.cos(d.phase) * px(d.r);
        const y = cy + Math.sin(d.phase) * px(d.r);
        ctx.fillStyle = d.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // --- static rings (cached rough drawables; invalidated on resize) ---
      this.cache.draw(`diskband-${rsPx | 0}`, (g) => g.circle(cx, cy, px(4.35) * 2, opts(40, {
        stroke: COLORS.muted, strokeWidth: 1, strokeLineDash: [2, 10],
      })));
      this.cache.draw(`isco-${rsPx | 0}`, (g) => g.circle(cx, cy, px(3) * 2, opts(41, {
        stroke: COLORS.green, strokeWidth: 1.8,
      })));
      this.cache.draw(`photon-${rsPx | 0}`, (g) => g.circle(cx, cy, px(1.5) * 2, opts(42, {
        stroke: COLORS.cyan, strokeWidth: 1.8, strokeLineDash: [7, 6],
      })));
      this.cache.draw(`horizon-${rsPx | 0}`, (g) => g.circle(cx, cy, px(1) * 2, opts(43, {
        stroke: COLORS.ink, strokeWidth: 2.4, fill: '#000000', fillStyle: 'solid',
      })));

      // singularity
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // --- green test particle ---
      const p = this.p;
      if (p.fade > 0) {
        const x = cx + Math.cos(p.angle) * px(p.r);
        const y = cy + Math.sin(p.angle) * px(p.r);
        ctx.globalAlpha = p.fade;
        rc.circle(x, y, 9, opts(77, { stroke: COLORS.green, strokeWidth: 2 }));
        ctx.globalAlpha = 1;
        if (p.state === 'plunging') {
          label(ctx, 'no stable orbit in here!', cx, cy + px(2.1), {
            color: COLORS.green, size: compact ? 12 : 14, align: 'center',
          });
        }
      }
      if (p.state === 'captured' && this.t - p.capturedAt < 2.2) {
        label(ctx, 'captured!', cx, cy - px(1.35), { color: COLORS.red, size: 15, align: 'center' });
      }

      // --- labels ---
      if (compact) {
        const lx = 12;
        let ly = 22;
        const legend = [
          ['event horizon (r_s)', COLORS.ink],
          ['photon sphere (1.5 r_s)', COLORS.cyan],
          ['ISCO (3 r_s)', COLORS.green],
          ['accretion disk', COLORS.orange],
        ];
        for (const [text, color] of legend) {
          label(ctx, text, lx, ly, { color, size: 13 });
          ly += 18;
        }
      } else {
        const L = px(1); // shorthand
        // singularity (left top)
        label(ctx, 'singularity — where the equations give up', cx - px(4.4), cy - 116, { color: COLORS.ink, size: 15, align: 'left' });
        doodleArrow(rc, cx - px(3.6), cy - 108, cx - 6, cy - 6, { color: COLORS.muted, seed: 61 });
        // event horizon (right top)
        label(ctx, 'event horizon — the point of no return', cx + px(2.4), cy - 132, { color: COLORS.ink, size: 15 });
        doodleArrow(rc, cx + px(2.9), cy - 124, cx + L * 0.62, cy - L * 0.62, { color: COLORS.muted, seed: 62 });
        // photon sphere (left bottom)
        label(ctx, 'photon sphere — light itself orbits here', cx - px(4.4), cy + 150, { color: COLORS.cyan, size: 15 });
        doodleArrow(rc, cx - px(3.4), cy + 141, cx - px(1.05), cy + px(1.05), { color: COLORS.cyan, seed: 63 });
        // ISCO (right bottom)
        label(ctx, 'ISCO — the last stable orbit', cx + px(3.3), cy + 128, { color: COLORS.green, size: 15 });
        doodleArrow(rc, cx + px(3.5), cy + 119, cx + px(2.6), cy + px(1.5), { color: COLORS.green, seed: 64 });
        // accretion disk (top)
        label(ctx, 'accretion disk (schematic)', cx - px(4.4), 26, { color: COLORS.orange, size: 15 });
        doodleArrow(rc, cx - px(3.6), 32, cx - px(2.7), cy - px(3.3), { color: COLORS.orange, seed: 65 });
        // decorative sparkles
        sparkle(rc, w - 50, 40, 7, { color: COLORS.pink, seed: 71 });
        sparkle(rc, w - 90, 70, 4, { color: COLORS.muted, seed: 72 });
      }

      // --- scale bar (the ONLY thing that changes with mass) ---
      const rs = schwarzschildRadius(this.M);
      const bx = 16;
      const by = h - 24;
      this.cache.draw(`bar-${rsPx | 0}`, (g) => {
        const o = opts(80, { stroke: COLORS.yellow, strokeWidth: 1.8 });
        return g.path(
          `M ${bx} ${by} L ${bx + rsPx} ${by} M ${bx} ${by - 5} L ${bx} ${by + 5} M ${bx + rsPx} ${by - 5} L ${bx + rsPx} ${by + 5}`,
          o,
        );
      });
      label(ctx, `r_s = ${fmtLen(rs)}`, bx + rsPx + 10, by + 4, { color: COLORS.yellow, size: 14 });
      label(ctx, 'ring radii to scale — 1 : 1.5 : 3', bx, by - 14, { color: COLORS.muted, size: 12.5 });
    }
  }

  A.register('blackHole', BlackHoleSim);
})();
