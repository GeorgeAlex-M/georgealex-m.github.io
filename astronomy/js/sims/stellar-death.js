// Sim 23 — How a black hole forms (stellar death).
//
// One number decides everything: the star's birth mass. The sim animates the
// full life (main sequence → giant/supergiant → death event → remnant) and
// branches by mass:
//   < 8 M_sun   → planetary nebula + white dwarf (electron degeneracy;
//                 Chandrasekhar limit 1.4 M_sun; Earth-sized)
//   8–20 M_sun  → supernova + neutron star (neutron degeneracy; ~20 km;
//                 TOV limit ~2.2 M_sun; teaspoon ≈ a mountain)
//   > 20 M_sun  → core collapse → black hole (r_s = 2GM/c², computed live)
// Remnant masses use rough but standard relations; r_s is exact.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, sparkle, blackbodyRGB,
    slider, actionButton, setReadout, fmtNum, fmtLen,
    G, C2, M_SUN, R_EARTH, schwarzschildRadius,
  } = A;

  const CHANDRA = 1.4;   // M_sun
  const TOV = 2.2;       // M_sun (approx)

  // rough remnant given birth mass
  function fate(M) {
    if (M < 8) {
      const wd = Math.min(CHANDRA, 0.4 + 0.1 * M); // white-dwarf mass grows slowly
      return { type: 'wd', remnant: wd };
    }
    if (M < 20) {
      const ns = Math.min(TOV, 1.2 + 0.03 * M);
      return { type: 'ns', remnant: ns };
    }
    const bh = Math.max(3, M * 0.35); // rough collapsed-core mass
    return { type: 'bh', remnant: bh };
  }

  class StellarDeathSim extends Sim {
    init() {
      this.mass = 25;   // default: a black-hole progenitor
      this.stage = 0;   // 0 idle; life runs 0→1 across phases
      this.running = false;
      this.phase = 0;   // 0 MS, 1 giant, 2 death, 3 remnant
      this.pt = 0;
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.massSlider = slider(c, {
        label: 'the star\'s birth mass',
        min: 0.5, max: 100, value: this.mass, log: true,
        format: (v) => `${fmtNum(v, v < 10 ? 1 : 0)} M☉`,
        oninput: (v) => { this.mass = v; this.reset(); this.updateReadout(); this.poke(); },
      });
      actionButton(c, 'run its life', () => {
        this.running = true; this.phase = 0; this.pt = 0;
        const f = fate(this.mass);
        this.cite(f.type === 'bh' ? '1939 Oppenheimer, Snyder - On Continued Gravitational Contraction'
          : f.type === 'ns' ? '1934 Baade, Zwicky - On Super-Novae'
            : '1931 Chandrasekhar - The Maximum Mass of Ideal White Dwarfs');
      });
      actionButton(c, 'reset', () => { this.reset(); this.poke(); });
    }

    reset() { this.running = false; this.phase = 0; this.pt = 0; }

    updateReadout() {
      const f = fate(this.mass);
      const lines = [[['birth mass: ', null], [`${fmtNum(this.mass, this.mass < 10 ? 1 : 0)} M☉`, 'yellow'], ['   →   ', null]]];
      if (f.type === 'wd') {
        lines[0].push(['ends as a WHITE DWARF', 'green']);
        lines.push([
          ['a red giant puffs off a planetary nebula, leaving an Earth-sized ember of ', null],
          [`${fmtNum(f.remnant, 2)} M☉`, 'green'],
          [' held up by electron degeneracy. Nothing above ', null], ['1.4 M☉', 'pink'],
          [' (Chandrasekhar) can survive as one.', null],
        ]);
      } else if (f.type === 'ns') {
        lines[0].push(['ends as a NEUTRON STAR', 'cyan']);
        lines.push([
          ['a supernova blows the star apart, leaving a city-sized (~20 km) core of ', null],
          [`${fmtNum(f.remnant, 2)} M☉`, 'cyan'],
          [' — a teaspoon would weigh ~a billion tonnes. Above ~', null], ['2.2 M☉', 'pink'],
          [' (the TOV limit) even neutrons give way.', null],
        ]);
      } else {
        const rs = schwarzschildRadius(f.remnant * M_SUN);
        lines[0].push(['ends as a BLACK HOLE', 'red']);
        lines.push([
          ['no pressure can stop the core. It collapses past its Schwarzschild radius r_s = ', null],
          [fmtLen(rs), 'red'],
          [` (for a ~${fmtNum(f.remnant, 0)} M☉ hole) and an event horizon forms — Oppenheimer & Snyder, 1939.`, null],
        ]);
      }
      lines.push([['along the way, fusion + the supernova forged the heavy elements in your body. We are star stuff.', 'orange']]);
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      if (this.running) {
        this.pt += dt;
        const durations = [1.4, 1.4, 1.6, 3]; // MS, giant, death, remnant
        if (this.pt > durations[this.phase]) {
          this.pt = 0;
          if (this.phase < 3) this.phase++;
          else this.running = false;
          if (this.phase === 3) this.updateReadout();
        }
      }
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const cx = w * 0.5;
      const cy = h * 0.42;
      const f = fate(this.mass);
      const baseR = Math.min(w, h) * 0.16;
      const phase = this.running || this.phase > 0 ? this.phase : 0;

      // timeline strip of the 4 phases
      const labels = ['main sequence', f.type === 'wd' ? 'red giant' : 'supergiant', f.type === 'wd' ? 'planetary nebula' : 'SUPERNOVA', f.type === 'wd' ? 'white dwarf' : (f.type === 'ns' ? 'neutron star' : 'black hole')];
      for (let i = 0; i < 4; i++) {
        const tx = w * (0.14 + i * 0.24);
        const on = i === phase && (this.running || this.phase > 0);
        const done = i < phase;
        label(ctx, labels[i], tx, h - 18, { color: on ? COLORS.yellow : done ? COLORS.muted : '#555', size: compact ? 10 : 12, align: 'center' });
        if (i < 3) label(ctx, '→', w * (0.14 + i * 0.24) + w * 0.12, h - 18, { color: '#555', size: 12, align: 'center' });
      }

      // --- render the current phase ---
      if (phase === 0) {
        // main-sequence star, colour/size by mass
        const col = blackbodyRGB(Math.min(4000 + this.mass * 900, 42000));
        const r = baseR * (0.6 + Math.min(this.mass, 40) / 80);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        rc.circle(cx, cy, r * 2, opts(400, { stroke: COLORS.ink, strokeWidth: 1.6 }));
        label(ctx, `fusing hydrogen — ${fmtNum(this.mass, this.mass < 10 ? 1 : 0)} M☉`, cx, cy + r + 22, { color: COLORS.ink, size: 13, align: 'center' });
        if (!this.running && this.phase === 0) label(ctx, 'press "run its life"', cx, 26, { color: COLORS.yellow, size: 13.5, align: 'center' });
      } else if (phase === 1) {
        // giant / supergiant: big and cool
        const r = baseR * (f.type === 'wd' ? 2 : 2.4);
        ctx.fillStyle = blackbodyRGB(3400);
        ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        rc.circle(cx, cy, r * 2, opts(410, { stroke: COLORS.red, strokeWidth: 1.6 }));
        // tiny original size for scale
        rc.circle(cx, cy, baseR * 0.6, opts(411, { stroke: COLORS.muted, strokeWidth: 1, strokeLineDash: [3, 3] }));
        label(ctx, f.type === 'wd' ? 'swollen into a red giant — core hydrogen spent' : 'a red SUPERGIANT — fusing heavier elements toward iron', cx, cy + r + 16, { color: COLORS.red, size: compact ? 11 : 13, align: 'center' });
      } else if (phase === 2) {
        // death event
        const k = this.pt / 1.6;
        if (f.type === 'wd') {
          // planetary nebula: expanding gentle shells
          for (const rr of [1, 0.7, 0.45]) {
            ctx.globalAlpha = (1 - k) * 0.5;
            rc.circle(cx, cy, (baseR + k * 150) * rr * 2, opts(420 + (rr * 10 | 0), { stroke: COLORS.cyan, strokeWidth: 1.4 }));
          }
          ctx.globalAlpha = 1;
          label(ctx, 'a planetary nebula — the outer layers gently drift away', cx, cy + baseR + 40, { color: COLORS.cyan, size: compact ? 11 : 13, align: 'center' });
        } else {
          // supernova: violent flash
          for (const [rr, col] of [[1, COLORS.yellow], [0.7, COLORS.orange], [0.4, COLORS.red]]) {
            ctx.globalAlpha = Math.max(0, 0.9 - k);
            rc.circle(cx, cy, (baseR + k * 240) * rr * 2, opts(425 + (rr * 10 | 0), { stroke: col, strokeWidth: 2.2 }));
          }
          ctx.globalAlpha = 1;
          label(ctx, 'SUPERNOVA — briefly outshining the whole galaxy, forging gold & uranium', cx, cy + baseR + 40, { color: COLORS.yellow, size: compact ? 10.5 : 13, align: 'center' });
        }
      } else {
        // the remnant
        if (f.type === 'wd') {
          ctx.fillStyle = blackbodyRGB(15000);
          ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
          rc.circle(cx, cy, 22, opts(430, { stroke: COLORS.green, strokeWidth: 1.8 }));
          label(ctx, `WHITE DWARF · ${fmtNum(f.remnant, 2)} M☉ · Earth-sized`, cx, cy + 40, { color: COLORS.green, size: 13, align: 'center' });
          label(ctx, 'held up by electron degeneracy (max 1.4 M☉)', cx, cy + 58, { color: COLORS.muted, size: 11.5, align: 'center' });
        } else if (f.type === 'ns') {
          ctx.fillStyle = COLORS.cyan;
          ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
          rc.circle(cx, cy, 16, opts(431, { stroke: COLORS.cyan, strokeWidth: 2 }));
          label(ctx, `NEUTRON STAR · ${fmtNum(f.remnant, 2)} M☉ · ~20 km across`, cx, cy + 34, { color: COLORS.cyan, size: 13, align: 'center' });
          label(ctx, 'a teaspoon would weigh a billion tonnes', cx, cy + 52, { color: COLORS.muted, size: 11.5, align: 'center' });
        } else {
          const rs = schwarzschildRadius(f.remnant * M_SUN);
          // black disk with photon ring
          rc.circle(cx, cy, 44, opts(432, { stroke: '#eaf9ff', strokeWidth: 2 }));
          ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
          rc.circle(cx, cy, 52, opts(433, { stroke: COLORS.ink, strokeWidth: 1.4, strokeLineDash: [4, 4] }));
          label(ctx, `BLACK HOLE · ~${fmtNum(f.remnant, 0)} M☉ · horizon r_s = ${fmtLen(rs)}`, cx, cy + 68, { color: COLORS.red, size: compact ? 11.5 : 13, align: 'center' });
          label(ctx, 'no pressure can hold it up — gravity won completely', cx, cy + 86, { color: COLORS.muted, size: 11.5, align: 'center' });
        }
      }

      // mass-threshold guide (top)
      if (!compact) {
        label(ctx, '< 8 M☉ → white dwarf    ·    8–20 → neutron star    ·    > 20 → black hole', cx, 12, { color: COLORS.muted, size: 11.5, align: 'center' });
      }
      sparkle(rc, 30, 30, 6, { color: COLORS.pink, seed: 440 });
    }
  }

  A.register('stellarDeath', StellarDeathSim);
})();
