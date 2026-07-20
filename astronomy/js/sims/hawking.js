// Sim 14 — Hawking radiation.
//
// Physics (all computed live from constants):
//   temperature  T_H = ħc³/(8πGMk_B)          (inversely ∝ mass)
//   lifetime     t   = 5120·π·G²M³/(ħc⁴)      (∝ M³ — small holes die fast)
//   power        P   = ħc⁶/(15360·π·G²M²)
//   the mass whose lifetime equals 1 s → its final-second energy Mc² ≈ 5 Mt.
// A primordial hole of ≈1.7×10¹¹ kg (computed, not hardcoded) has a lifetime
// equal to the age of the universe — it would be exploding right now.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow,
    slider, buttonRow, actionButton, setReadout,
    G, C, C2, HBAR, K_B, M_SUN, M_SGRA, KT_TNT, YEAR, fmtNum, fmtTime, sci,
  } = A;

  const T_CMB = 2.725;
  const AGE_UNIVERSE = 13.8e9 * YEAR;
  const EVAP_K = (5120 * Math.PI * G * G) / (HBAR * C ** 4); // t = K·M³
  const M_DYING_NOW = Math.cbrt(AGE_UNIVERSE / EVAP_K);      // ≈ 1.7e11 kg
  const M_FINAL_SECOND = Math.cbrt(1 / EVAP_K);              // mass with 1 s left
  const E_FINAL_SECOND = M_FINAL_SECOND * C2;                // ≈ 2e22 J ≈ 5 Mt

  const PRESETS = [
    { label: 'dying today', M: M_DYING_NOW },
    { label: 'a mountain', M: 1e12 },
    { label: 'the Moon', M: 7.342e22 },
    { label: 'the Sun', M: M_SUN },
    { label: 'Sgr A*', M: M_SGRA },
  ];

  function tempOf(M) { return (HBAR * C ** 3) / (8 * Math.PI * G * M * K_B); }
  function powerOf(M) { return (HBAR * C ** 6) / (15360 * Math.PI * G * G * M * M); }

  class HawkingSim extends Sim {
    init() {
      this.M = 1e12;
      this.t = 0;
      this.ff = null; // fast-forward state {t0}
      this.pairs = [];
      this._spawnT = 0;
      this.buildControls();
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.mSlider = slider(c, {
        label: 'mass',
        min: 1e11,
        max: 1e40,
        value: this.M,
        log: true,
        format: (v) => (v >= 0.01 * M_SUN ? `${sci(v / M_SUN, 1)} M☉` : `${sci(v, 1)} kg`),
        oninput: (v) => {
          this.M = v;
          this.presets.select(null);
          this.updateReadout();
          this.poke();
        },
      });
      this.presets = buttonRow(c, PRESETS.map((p, i) => ({ label: p.label, value: i })), {
        onSelect: (i) => {
          this.M = PRESETS[i].M;
          this.mSlider.set(this.M);
          this.updateReadout();
          this.poke();
        },
      });
      actionButton(c, 'fast-forward the evaporation', () => {
        if (!this.ff) { this.ff = { t0: this.t }; this.poke(); }
      });
    }

    updateReadout() {
      const T = tempOf(this.M);
      const life = EVAP_K * this.M ** 3;
      const P = powerOf(this.M);
      const cold = T < T_CMB;
      setReadout(this.readoutEl, [
        [
          ['temperature T = ', null], [`${sci(T, 2)} K`, 'orange'],
          ['   glow power = ', null], [`${sci(P, 2)} W`, 'cyan'],
          ['   lifetime ≈ ', null], [fmtTime(life, 2), 'pink'],
          [life > AGE_UNIVERSE ? ` (${sci(life / AGE_UNIVERSE, 1)}× the age of the universe)` : ' — cosmically brief!', null],
        ],
        [cold
          ? [`colder than the CMB (2.7 K) — today this hole absorbs more than it emits, and GROWS. Evaporation only wins after the universe cools further.`, 'yellow']
          : [`hotter than the CMB — this one is genuinely shrinking right now.`, 'yellow']],
        [
          ['a primordial hole of ', null], [`${sci(M_DYING_NOW, 2)} kg`, 'green'],
          [' (computed) lives exactly one age-of-the-universe — such holes would be EXPLODING today. Final second: ', null],
          [`${sci(E_FINAL_SECOND, 1)} J ≈ ${fmtNum(E_FINAL_SECOND / KT_TNT / 1000, 0)} megatons`, 'red'],
        ],
      ]);
    }

    update(dt) {
      this.t += dt;
      const ffK = this.ff ? Math.min(1, (this.t - this.ff.t0) / 4.5) : 0;
      // spawn particle pairs; frantic as the hole shrinks
      this._spawnT += dt;
      const interval = this.ff ? Math.max(0.05, 0.3 - ffK * 0.26) : 0.3;
      if (this._spawnT > interval) {
        this._spawnT = 0;
        this.pairs.push({ ang: Math.random() * Math.PI * 2, age: 0 });
        if (this.pairs.length > 26) this.pairs.shift();
      }
      for (const p of this.pairs) p.age += dt;
      if (this.ff && ffK >= 1 && this.t - this.ff.t0 > 7) {
        this.ff = null; // reborn for another run
        this.pairs.length = 0;
      }
    }

    holeRadius() {
      const base = Math.min(this.w, this.h) * 0.15;
      if (!this.ff) return base;
      const k = Math.min(1, (this.t - this.ff.t0) / 4.5);
      return Math.max(3, base * Math.pow(1 - k, 0.6));
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const cx = w / 2;
      const cy = h / 2 + 6;
      const R = this.holeRadius();
      const T = tempOf(this.M);
      const hot = T > 1e3;
      const glowColor = T < 1 ? COLORS.red : T < 1e6 ? COLORS.orange : COLORS.cyan;
      const popped = this.ff && (this.t - this.ff.t0) > 4.5;

      if (!popped) {
        rc.circle(cx, cy, R * 2, opts(600, { stroke: COLORS.ink, strokeWidth: 2.2, fill: '#000000', fillStyle: 'solid' }));
      } else {
        // the final flash
        const k = Math.min(1, (this.t - this.ff.t0 - 4.5) / 1.2);
        for (const [f, col] of [[1, COLORS.yellow], [0.7, COLORS.orange], [0.4, COLORS.red]]) {
          ctx.globalAlpha = Math.max(0, 0.9 - k);
          rc.circle(cx, cy, (20 + k * 260) * f, opts(601 + (f * 10 | 0), { stroke: col, strokeWidth: 2.2 }));
        }
        ctx.globalAlpha = 1;
        label(ctx, `POP! (its last second ≈ ${fmtNum(E_FINAL_SECOND / KT_TNT / 1000, 0)} megatons)`, cx, cy - 90, { color: COLORS.yellow, size: 16, align: 'center' });
      }

      // particle pairs at the horizon
      if (!popped) {
        for (const p of this.pairs) {
          const dxu = Math.cos(p.ang);
          const dyu = Math.sin(p.ang);
          const drift = p.age * 34;
          // escaping partner
          ctx.fillStyle = glowColor;
          ctx.globalAlpha = Math.max(0, 1 - p.age / 2.4);
          ctx.beginPath();
          ctx.arc(cx + dxu * (R + 6 + drift), cy + dyu * (R + 6 + drift), 3, 0, Math.PI * 2);
          ctx.fill();
          // infalling partner
          const fall = Math.min(R * 0.8, p.age * 30);
          ctx.fillStyle = COLORS.muted;
          ctx.globalAlpha = Math.max(0, 0.8 - p.age / 1.2);
          ctx.beginPath();
          ctx.arc(cx + dxu * (R - 4 - fall), cy + dyu * (R - 4 - fall), 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      if (!compact && !popped) {
        label(ctx, 'one escapes — Hawking radiation', cx + R + 60, cy - 44, { color: glowColor, size: 14 });
        doodleArrow(rc, cx + R + 54, cy - 38, cx + R + 16, cy - 12, { color: glowColor, seed: 610 });
        label(ctx, 'one falls in, carrying negative energy', cx - R - 60, cy + 56, { color: COLORS.muted, size: 14, align: 'right' });
        doodleArrow(rc, cx - R - 54, cy + 48, cx - R + 4, cy + 16, { color: COLORS.muted, seed: 611 });
        label(ctx, 'the hole pays with its own mass — and slowly evaporates', cx, h - 30, { color: COLORS.yellow, size: 13.5, align: 'center' });
      }
      label(ctx, `T = ${sci(T, 1)} K`, cx, cy + R + 28, { color: glowColor, size: 15, align: 'center' });
      if (hot && !popped) label(ctx, 'small = HOT', cx, cy + R + 48, { color: COLORS.red, size: 13, align: 'center' });
    }
  }

  A.register('hawking', HawkingSim);
})();
