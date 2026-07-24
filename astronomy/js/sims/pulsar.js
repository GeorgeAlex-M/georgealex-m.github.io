// Sim 24 — Pulsars.
//
// A neutron star spins with its magnetic (beam) axis tilted from its spin axis;
// two beams sweep space like a lighthouse. When a beam crosses Earth's line of
// sight, a pulse registers on a chart-recorder trace — recreating Jocelyn Bell's
// 1967 discovery. Period slider spans real pulsars (1.4 ms to ~8 s) with presets
// (Crab 33 ms, Bell's PSR B1919+21 1.337 s, fastest 1.4 ms). The visual spin is
// scaled for legibility; the displayed period, rate and pulse cadence are real.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, sparkle,
    slider, buttonRow, setReadout, fmtNum,
  } = A;

  const PRESETS = [
    { label: 'Crab (33 ms)', P: 0.033 },
    { label: 'Bell\'s LGM-1 (1.337 s)', P: 1.337 },
    { label: 'fastest (1.4 ms)', P: 0.0014 },
  ];

  class PulsarSim extends Sim {
    init() {
      this.P = 1.337;      // seconds (Bell's pulsar)
      this.spin = 0;       // visual rotation phase
      this.tilt = 0.5;     // beam axis tilt from spin axis (rad)
      this.trace = [];     // chart-recorder samples
      this.simT = 0;       // real simulated time (s) for pulse timing
      this.lastBeam = -1;  // which beam was last pointing near us
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.pSlider = slider(c, {
        label: 'rotation period',
        min: 0.0014, max: 8, value: this.P, log: true,
        format: (v) => (v < 0.1 ? `${fmtNum(v * 1000, 1)} ms` : `${fmtNum(v, 2)} s`),
        oninput: (v) => { this.P = v; this.updateReadout(); this.poke(); },
      });
      this.presets = buttonRow(c, PRESETS.map((p, i) => ({ label: p.label, value: i })), {
        onSelect: (i) => {
          this.P = PRESETS[i].P;
          this.pSlider.set(this.P);
          this.cite('1968 Hewish, Bell, Pilkington, Scott, Collins - Observation of a Rapidly Pulsating Radio Source');
          this.updateReadout();
          this.poke();
        },
      });
    }

    updateReadout() {
      const rate = 1 / this.P;
      // equatorial surface speed for a 20 km-diameter star (10 km radius)
      const vSurf = 2 * Math.PI * 1e4 * rate; // m/s
      setReadout(this.readoutEl, [
        [
          ['period P = ', null], [this.P < 0.1 ? `${fmtNum(this.P * 1000, 1)} ms` : `${fmtNum(this.P, 3)} s`, 'cyan'],
          ['   ·   spins ', null], [`${rate >= 1 ? fmtNum(rate, rate < 10 ? 1 : 0) : fmtNum(rate, 2)}×/second`, 'yellow'],
          ['   ·   surface moving at ', null], [`${fmtNum((vSurf / 2.998e8) * 100, vSurf / 2.998e8 > 0.01 ? 1 : 3)}% of c`, 'orange'],
        ],
        [['a whole Sun\'s mass, spun up by collapse to ~20 km, beaming radio waves past Earth once per turn — a natural clock accurate to nanoseconds.', null]],
        [['in 1967 Jocelyn Bell found the 1.337 s tick and the team half-jokingly called it ', null], ['"LGM-1" — Little Green Men', 'green'], ['. It was a neutron-star lighthouse, not aliens.', null]],
      ]);
    }

    update(dt) {
      this.t += dt;
      this.simT += dt;
      // visual spin: cap on-screen speed so fast pulsars stay legible
      const visRate = Math.min(1 / this.P, 2.2); // rev/s on screen
      this.spin += dt * visRate * Math.PI * 2;
      // chart trace: advance and stamp a pulse at the real cadence, scaled
      // (fast periods scroll faster; we use a display cadence = real period
      //  clamped so the slowest still ticks visibly)
      const displayP = Math.max(this.P, 0.25);
      const phase = (this.simT % displayP) / displayP;
      const pulse = Math.exp(-Math.pow((phase - 0.5) * 22, 2)) + Math.exp(-Math.pow((phase) * 22, 2));
      this.trace.push(pulse);
      if (this.trace.length > 420) this.trace.shift();
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const nsX = compact ? w * 0.5 : w * 0.28;
      const nsY = h * 0.36;
      const R = Math.min(w, h) * 0.10;

      // spin axis (vertical)
      ctx.strokeStyle = COLORS.muted; ctx.globalAlpha = 0.5; ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(nsX, nsY - R * 2.6); ctx.lineTo(nsX, nsY + R * 2.6); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      label(ctx, 'spin axis', nsX, nsY - R * 2.6 - 6, { color: COLORS.muted, size: 10.5, align: 'center' });

      // neutron star body
      ctx.fillStyle = COLORS.cyan; ctx.beginPath(); ctx.arc(nsX, nsY, R, 0, Math.PI * 2); ctx.fill();
      rc.circle(nsX, nsY, R * 2, opts(500, { stroke: COLORS.ink, strokeWidth: 1.8 }));

      // beam axis (tilted), sweeping with spin. Project a 3D-ish sweep: horizontal
      // component follows cos(spin), so beams point toward/away from us periodically.
      const beamLen = Math.min(w, h) * 0.5;
      const sweep = Math.cos(this.spin); // -1..1: +1 = toward Earth (right)
      const vert = Math.sin(this.tilt);
      for (const sgn of [1, -1]) {
        const dx = sweep * Math.cos(this.tilt) * sgn;
        const dy = -vert * sgn;
        const nrm = Math.hypot(dx, dy) || 1;
        const ux = dx / nrm; const uy = dy / nrm;
        // beam brightness peaks when pointing at Earth (to the right, ux≈1)
        const bright = sgn === 1 ? Math.max(0, sweep) : Math.max(0, -sweep);
        ctx.strokeStyle = COLORS.yellow;
        ctx.globalAlpha = 0.25 + 0.6 * bright;
        ctx.lineWidth = 2;
        // cone edges
        for (const spread of [-0.16, 0, 0.16]) {
          const ca = Math.cos(spread); const sa = Math.sin(spread);
          const rx = ux * ca - uy * sa; const ry = ux * sa + uy * ca;
          ctx.beginPath(); ctx.moveTo(nsX + ux * R, nsY + uy * R);
          ctx.lineTo(nsX + rx * beamLen, nsY + ry * beamLen);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      label(ctx, 'magnetic beam (tilted) sweeps like a lighthouse', nsX, nsY + R * 2 + 20, { color: COLORS.yellow, size: compact ? 10.5 : 12.5, align: 'center' });

      // Earth / detector to the right
      const eX = compact ? w * 0.85 : w * 0.62;
      const eY = nsY;
      rc.circle(eX, eY, 16, opts(510, { stroke: COLORS.green, strokeWidth: 1.8 }));
      rc.path(`M ${eX - 10} ${eY - 4} q 8 -6 20 0`, opts(511, { stroke: COLORS.green, strokeWidth: 1.2 }));
      label(ctx, 'Earth', eX, eY + 30, { color: COLORS.green, size: 12, align: 'center' });
      if (sweep > 0.85) { sparkle(rc, eX, eY, 12, { color: COLORS.yellow, seed: 512 }); label(ctx, 'ping!', eX, eY - 24, { color: COLORS.yellow, size: 12, align: 'center' }); }

      // --- chart-recorder trace (bottom) ---
      const gx0 = w * 0.06;
      const gx1 = w * 0.94;
      const gy = h - (compact ? 40 : 54);
      const amp = compact ? 22 : 30;
      this.cache.draw(`ctaxis-${w}x${h}`, (g) => g.line(gx0, gy, gx1, gy, opts(520, { stroke: COLORS.muted, strokeWidth: 1 })));
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < this.trace.length; i++) {
        const x = gx0 + (i / 420) * (gx1 - gx0);
        const y = gy - this.trace[i] * amp - 4;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      label(ctx, 'the chart-recorder trace — one blip per rotation, exactly what Bell saw in 1967', (gx0 + gx1) / 2, gy + 24, { color: COLORS.muted, size: compact ? 10 : 12, align: 'center' });

      // spin-up note
      if (!compact) {
        label(ctx, 'why so fast? angular momentum: a collapsing core', w * 0.82, h * 0.20, { color: COLORS.muted, size: 11, align: 'center' });
        label(ctx, 'spins up by (R_before/R_after)² — like a skater', w * 0.82, h * 0.20 + 15, { color: COLORS.muted, size: 11, align: 'center' });
        label(ctx, 'pulling their arms in.', w * 0.82, h * 0.20 + 30, { color: COLORS.muted, size: 11, align: 'center' });
      }
    }
  }

  A.register('pulsar', PulsarSim);
})();
