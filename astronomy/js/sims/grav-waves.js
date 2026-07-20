// Sim 15 — Gravitational waves.
//
// Physics: Newtonian-order (Peters-style) inspiral — separation shrinks as
// a(t) = a₀·(1−t/T)^(1/4), orbital frequency follows Kepler ω ∝ a^(−3/2),
// wave frequency f_GW = 2·f_orb, wave amplitude grows ∝ 1/a. The chirp you
// see/hear is exactly this shape; real detection templates add higher-order
// GR corrections. Readout frequencies/separations are mapped to the real
// GW150914 band (f_GW ≈ 35 → 250 Hz, separation ≈ 890 → 240 km).

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label,
    buttonRow, actionButton, setReadout,
    C2, M_SUN, fmtNum, sci,
  } = A;

  const PRESETS = {
    gw150914: {
      name: 'GW150914 — the first detection (14 Sep 2015)',
      m1: 36, m2: 29, mf: 62, radiated: 3.0,
      fStart: 35, fEnd: 250, sepStart: 890, // real numbers, km / Hz
      isNS: false,
    },
    gw170817: {
      name: 'GW170817 — two neutron stars, and a kilonova of gold',
      m1: 1.46, m2: 1.27, mf: null, radiated: 0.05,
      fStart: 35, fEnd: 1500, sepStart: 700,
      isNS: true,
    },
  };

  const T_INSPIRAL = 11;  // wall seconds for the on-screen inspiral
  const RING_SPEED = 150; // ripple expansion px/s

  class GravWavesSim extends Sim {
    init() {
      this.presetKey = 'gw150914';
      this.buildControls();
      this.replay();
    }

    get p() { return PRESETS[this.presetKey]; }

    replay() {
      this.t = 0;
      this.phase = 0;
      this.merged = false;
      this.ringT = 0;
      this.wave = [];
      this.ripples = [];
      this._lastHalfOrbit = 0;
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.presetBtns = buttonRow(c, [
        { label: 'GW150914 (black holes)', value: 'gw150914' },
        { label: 'GW170817 (neutron stars)', value: 'gw170817' },
      ], {
        initial: 'gw150914',
        onSelect: (v) => { this.presetKey = v; this.replay(); this.poke(); },
      });
      actionButton(c, 'replay the merger', () => { this.replay(); this.poke(); });
    }

    // dimensionless separation 1 → ~0 over the inspiral
    sepFrac() {
      return Math.pow(Math.max(1 - this.t / T_INSPIRAL, 0.0001), 0.25);
    }

    updateReadout() {
      const p = this.p;
      const eJ = p.radiated * M_SUN * C2;
      const lines = [
        [[p.name, 'yellow']],
        [
          [`${fmtNum(p.m1, 2)} + ${fmtNum(p.m2, 2)} M☉ spiral in; `, null],
          [`${fmtNum(p.radiated, 2)} M☉ becomes pure gravitational waves = `, null],
          [`${sci(eJ, 2)} J`, 'cyan'],
          [p.isNS ? '' : ' — at peak, more power than the light of every star in the observable universe combined', null],
        ],
      ];
      if (p.isNS) {
        lines.push([[
          '1.7 s after the chirp ended, a gamma-ray burst arrived from the same galaxy (gravity and light travel equally fast) — then weeks of kilonova glow, forging gold and platinum. Your jewelry is neutron-star shrapnel.',
          'orange',
        ]]);
      } else {
        lines.push([
          ['by Earth the strain was h ≈ 10⁻²¹: LIGO\'s 4-km arms stretched by ', null],
          ['1/200 of a proton', 'pink'],
          [' — and both detectors heard the same chirp 7 ms apart.', null],
        ]);
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      const p = this.p;
      if (!this.merged) {
        this.t += dt;
        const s = this.sepFrac();
        const omega = 0.9 / Math.pow(s, 1.5); // Kepler scaling, capped by merger
        this.phase += Math.min(omega, 40) * dt;
        // waveform sample: amplitude ∝ 1/separation
        this.wave.push(Math.min(1 / s, 8) * 0.115 * Math.cos(2 * this.phase));
        // spawn a ripple every half orbit
        if (this.phase - this._lastHalfOrbit > Math.PI) {
          this._lastHalfOrbit = this.phase;
          this.ripples.push({ r: 30, alpha: 0.7 });
        }
        if (this.t >= T_INSPIRAL) this.merged = true;
      } else {
        this.ringT += dt;
        // ringdown: exponentially damped bell
        this.wave.push(0.92 * Math.exp(-this.ringT * 2.6) * Math.cos(34 * this.ringT));
      }
      if (this.wave.length > 560) this.wave.shift();
      for (const r of this.ripples) {
        r.r += RING_SPEED * dt;
        r.alpha -= dt * 0.22;
      }
      this.ripples = this.ripples.filter((r) => r.alpha > 0.02 && r.r < Math.max(this.w, this.h));
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const p = this.p;
      const cx = w / 2;
      const cy = h * 0.38;
      const s = this.sepFrac();
      const sepPx = 150 * s;
      const mTot = p.m1 + p.m2;
      const r1 = sepPx * (p.m2 / mTot);
      const r2 = sepPx * (p.m1 / mTot);
      const rad1 = Math.max(6, Math.cbrt(p.m1) * (p.isNS ? 8 : 5));
      const rad2 = Math.max(6, Math.cbrt(p.m2) * (p.isNS ? 8 : 5));
      const bodyColor = p.isNS ? COLORS.cyan : COLORS.ink;
      const fill = p.isNS ? {} : { fill: '#000000', fillStyle: 'solid' };

      // spacetime ripples
      for (const r of this.ripples) {
        ctx.globalAlpha = Math.max(0, r.alpha);
        rc.circle(cx, cy, r.r * 2, opts(700 + ((r.r | 0) % 13), { stroke: COLORS.muted, strokeWidth: 1.2 }));
      }
      ctx.globalAlpha = 1;

      if (!this.merged) {
        const x1 = cx + Math.cos(this.phase) * r1;
        const y1 = cy + Math.sin(this.phase) * r1;
        const x2 = cx - Math.cos(this.phase) * r2;
        const y2 = cy - Math.sin(this.phase) * r2;
        rc.circle(x1, y1, rad1 * 2, opts(710, { stroke: bodyColor, strokeWidth: 2, ...fill }));
        rc.circle(x2, y2, rad2 * 2, opts(711, { stroke: bodyColor, strokeWidth: 2, ...fill }));
        // live real-number mapping
        const fGW = Math.min(p.fStart / Math.pow(s, 1.5), p.fEnd);
        const sepKm = p.sepStart * s;
        label(ctx, `f_GW ≈ ${fmtNum(fGW, 0)} Hz   separation ≈ ${fmtNum(sepKm, 0)} km`, cx, 24, { color: COLORS.cyan, size: compact ? 12.5 : 14.5, align: 'center' });
      } else {
        // merged remnant, ringing down
        const wob = 1 + 0.16 * Math.exp(-this.ringT * 2.6) * Math.cos(34 * this.ringT);
        const radF = (rad1 + rad2) * 0.85;
        if (p.isNS) {
          // kilonova!
          const k = Math.min(1, this.ringT / 1.4);
          for (const [f, col] of [[1, COLORS.yellow], [0.65, COLORS.orange]]) {
            ctx.globalAlpha = Math.max(0.15, 0.85 - k * 0.6);
            rc.circle(cx, cy, (radF + k * 130) * 2 * f, opts(714 + (f * 10 | 0), { stroke: col, strokeWidth: 1.8 }));
          }
          ctx.globalAlpha = 1;
          label(ctx, 'kilonova! — forging gold, platinum, uranium…', cx, cy - radF - 44, { color: COLORS.yellow, size: 14.5, align: 'center' });
        } else {
          rc.ellipse(cx, cy, radF * 2 * wob, radF * 2 / wob, opts(712, { stroke: COLORS.ink, strokeWidth: 2.2, fill: '#000000', fillStyle: 'solid' }));
          label(ctx, `${fmtNum(p.m1, 0)} + ${fmtNum(p.m2, 0)} → ${fmtNum(p.mf, 0)} M☉  (${fmtNum(p.radiated, 1)} M☉ rang away as waves)`, cx, cy - radF - 30, { color: COLORS.yellow, size: compact ? 12.5 : 14.5, align: 'center' });
        }
      }

      // waveform strip
      const wy = h * 0.8;
      const amp = h * 0.11;
      this.cache.draw(`waxis-${w}x${h}`, (g) => g.line(20, wy, w - 20, wy, opts(720, { stroke: COLORS.muted, strokeWidth: 1 })));
      if (this.wave.length > 1) {
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const x0 = 20;
        const span = w - 40;
        for (let i = 0; i < this.wave.length; i++) {
          const x = x0 + (i / 559) * span;
          const y = wy - this.wave[i] * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      label(ctx, 'the chirp — strain h(t): rising pitch, rising volume, then the ringdown bell', w / 2, h - 10, { color: COLORS.muted, size: compact ? 11 : 12.5, align: 'center' });
    }
  }

  A.register('gravWaves', GravWavesSim);
})();
