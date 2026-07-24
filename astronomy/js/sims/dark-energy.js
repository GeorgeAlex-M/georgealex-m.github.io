// Sim 12 — Dark energy (remake): the evidence AND the fates.
//
// Two views:
//  1. "the 1998 evidence" — the actual measurement that won the 2011 Nobel.
//     Type Ia supernovae are standard candles; their apparent faintness gives
//     distance. The sim computes the REAL luminosity distance
//         d_L(z) = (1+z)·(c/H₀)·∫₀ᶻ dz'/E(z'),  E(z) = √(Ω_m(1+z)³ + Ω_Λ)
//     for a decelerating universe (Ω_m=1) and ours (0.315, 0.685), plots the
//     distance modulus μ = 5·log₁₀(d_L/10pc), and puts doodle supernova data
//     on the accelerating curve — visibly FAINTER than deceleration allows
//     (≈0.4 mag at z=0.5 vs Einstein–de Sitter, computed, not asserted).
//  2. "fates of the universe" — a(τ) integrated from Friedmann with curvature
//     Ω_k = 1−Ω_m−Ω_Λ and turnaround handling: recollapse → Big Crunch;
//     Λ-domination → accelerating Big Freeze. Free Ω_m/Ω_Λ sliders; the
//     acceleration hand-off a_acc = (Ω_m/2Ω_Λ)^(1/3) is marked (z ≈ 0.63 for
//     our values). Cosmic inventory pie: 4.9% ordinary / 26.8% dark matter /
//     68.3% dark energy (Planck 2018).

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, sparkle,
    slider, buttonRow, setReadout, fmtNum,
  } = A;

  const C_KM = 299792.458;
  const H0 = 67.4;
  const DH_MPC = C_KM / H0;    // Hubble distance, Mpc
  const TAU_MAX = 3.2;
  const DTAU = 0.004;

  const PRESETS = {
    ours: { om: 0.315, ol: 0.685, name: 'our universe', color: COLORS.pink },
    matter: { om: 1.0, ol: 0, name: 'matter only', color: COLORS.cyan },
    crunch: { om: 5.0, ol: 0, name: 'heavy — Big Crunch', color: COLORS.red },
    coast: { om: 0.3, ol: 0, name: 'low density, no Λ', color: COLORS.green },
  };

  // luminosity distance in Mpc (flat-ish; curvature ignored for the plot,
  // which is exact for the two universes actually drawn)
  function dL(z, om, ol) {
    const n = 60;
    let integral = 0;
    for (let i = 0; i < n; i++) {
      const z1 = (i + 0.5) * (z / n);
      integral += 1 / Math.sqrt(om * Math.pow(1 + z1, 3) + ol) * (z / n);
    }
    return (1 + z) * DH_MPC * integral;
  }
  function mu(z, om, ol) { return 5 * Math.log10(dL(z, om, ol) * 1e5); } // d in 10pc units

  function history(om, ol) {
    const ok = 1 - om - ol;
    let a = 1e-3;
    let tau = 0;
    let dir = 1;
    const pts = [[0, 0]];
    let crunchTau = null;
    while (tau < TAU_MAX && pts.length < 5000) {
      const rhs = om / a + ol * a * a + ok;
      if (rhs <= 0 && dir > 0) { dir = -1; a -= 0.01; } // turnaround (nudge off ȧ=0)
      a += dir * Math.sqrt(Math.max(rhs, 0)) * DTAU;
      tau += DTAU;
      if (a <= 1e-3 && dir < 0) { pts.push([tau, 0]); crunchTau = tau; break; }
      pts.push([tau, a]);
    }
    return { pts, crunchTau };
  }

  // supernova "data": deterministic points on OUR universe's curve ± scatter
  const SN_DATA = [];
  for (let i = 0; i < 9; i++) {
    const z = 0.08 + i * 0.105;
    SN_DATA.push({ z, dmu: (((i * 0.7548) % 1) - 0.5) * 0.22 });
  }

  class DarkEnergySim extends Sim {
    init() {
      this.view = 'evidence';   // start with the measurement — evidence first
      this.om = 0.315;
      this.ol = 0.685;
      this.t = 0;
      this.recompute();
      this.buildControls();
      this.updateReadout();
    }

    recompute() {
      this.curves = Object.entries(PRESETS).map(([k, p]) => ({ k, p, h: history(p.om, p.ol) }));
      this.custom = history(this.om, this.ol);
    }

    buildControls() {
      const c = this.controlsEl;
      this.viewBtns = buttonRow(c, [
        { label: 'the 1998 evidence', value: 'evidence' },
        { label: 'fates of the universe', value: 'fates' },
      ], {
        initial: 'evidence',
        onSelect: (v) => {
          this.view = v;
          this.cite(v === 'evidence'
            ? '1998 Riess et al. - Observational Evidence from Supernovae for an Accelerating Universe and a Cosmological Constant'
            : '1922 Friedmann - Über die Krümmung des Raumes (On the Curvature of Space)');
          this.updateReadout();
          this.poke();
        },
      });
      this.presetBtns = buttonRow(c, Object.entries(PRESETS).map(([v, p]) => ({ label: p.name, value: v })), {
        initial: 'ours',
        onSelect: (v) => {
          this.om = PRESETS[v].om; this.ol = PRESETS[v].ol;
          this.omSlider.set(this.om); this.olSlider.set(this.ol);
          this.recompute(); this.updateReadout(); this.poke();
        },
      });
      this.omSlider = slider(c, {
        label: 'Ω_m (matter)',
        min: 0, max: 5, step: 0.01, value: this.om,
        format: (v) => fmtNum(v, 2),
        oninput: (v) => { this.om = v; this.presetBtns.select(null); this.recompute(); this.updateReadout(); this.poke(); },
      });
      this.olSlider = slider(c, {
        label: 'Ω_Λ (dark energy)',
        min: 0, max: 1.4, step: 0.01, value: this.ol,
        format: (v) => fmtNum(v, 2),
        oninput: (v) => { this.ol = v; this.presetBtns.select(null); this.cite('1999 Perlmutter et al. - Measurements of Ω and Λ from 42 High-Redshift Supernovae'); this.recompute(); this.updateReadout(); this.poke(); },
      });
    }

    fate() {
      const ok = 1 - this.om - this.ol;
      if (this.custom.crunchTau) return ['recollapses → Big Crunch', 'red', COLORS.red];
      if (this.ol > 0) return ['accelerates forever → Big Freeze', 'pink', COLORS.pink];
      if (Math.abs(ok) < 0.02) return ['expands forever, ever slower (critical)', 'cyan', COLORS.cyan];
      return ['expands forever (coasting)', 'green', COLORS.green];
    }

    updateReadout() {
      const lines = [];
      if (this.view === 'evidence') {
        const gap = mu(0.5, 0.315, 0.685) - mu(0.5, 1, 0);
        lines.push([
          ['Type Ia supernovae all explode at the same true brightness — cosmic standard candles. Fainter = farther. ', null],
          ['At z = 0.5 they came out ', null],
          [`${fmtNum(gap, 2)} magnitudes fainter`, 'yellow'],
          [' than a decelerating universe allows (computed here from d_L, not asserted).', null],
        ]);
        lines.push([['fainter → farther → the expansion has been SPEEDING UP. Two rival teams, same answer, Nobel 2011.', 'pink']]);
      } else {
        const [fateTxt, fateCls] = this.fate();
        const ok = 1 - this.om - this.ol;
        lines.push([
          ['Ω_m = ', null], [fmtNum(this.om, 2), 'cyan'],
          ['   Ω_Λ = ', null], [fmtNum(this.ol, 2), 'pink'],
          ['   Ω_k = ', null], [fmtNum(ok, 2), null],
          ['   →  fate: ', null], [fateTxt, fateCls],
        ]);
        if (this.ol > 0 && !this.custom.crunchTau) {
          const aAcc = Math.cbrt(this.om / (2 * this.ol));
          lines.push([
            ['gravity brakes first; dark energy takes over once a > ', null],
            [fmtNum(aAcc, 2), 'yellow'],
            [` (for our universe: z ≈ ${fmtNum(1 / aAcc - 1, 2)}, about 6 billion years ago — marked on the curve).`, null],
          ]);
        }
        lines.push([['the cosmic inventory (measured): 4.9% ordinary matter · 26.8% dark matter · 68.3% dark energy — 95% of everything is unidentified.', 'green']]);
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) { this.t += dt; }

    render() {
      if (this.view === 'evidence') this.renderEvidence();
      else this.renderFates();
    }

    /* ---------- view 1: the supernova Hubble diagram ---------- */
    renderEvidence() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const px0 = 56;
      const px1 = w - (compact ? 20 : 200);
      const py0 = 46;
      const py1 = h - 56;
      const zMax = 1.0;
      const muMin = mu(0.05, 1, 0) - 0.3;
      const muMax = mu(zMax, 0.315, 0.685) + 0.4;
      const X = (z) => px0 + (z / zMax) * (px1 - px0);
      const Y = (m) => py1 - ((m - muMin) / (muMax - muMin)) * (py1 - py0);

      this.cache.draw(`eaxes-${w}x${h}`, (g) => g.path(`M ${px0} ${py0} L ${px0} ${py1} L ${px1} ${py1}`, opts(430, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      label(ctx, 'FAINTER (farther) ↑', px0 + 6, py0 - 8, { color: COLORS.muted, size: 11.5, align: 'left' });
      label(ctx, 'redshift z (how long ago it exploded)', (px0 + px1) / 2, py1 + 20, { color: COLORS.muted, size: 11.5, align: 'center' });

      // decelerating prediction (Ω_m = 1)
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      for (let z = 0.05; z <= zMax; z += 0.02) { const x = X(z), y = Y(mu(z, 1, 0)); z <= 0.06 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.setLineDash([]);
      // our accelerating universe
      ctx.strokeStyle = COLORS.pink;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let z = 0.05; z <= zMax; z += 0.02) { const x = X(z), y = Y(mu(z, 0.315, 0.685)); z <= 0.06 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();

      // supernova data (doodle sparkles with error bars) on the measured curve
      for (const d of SN_DATA) {
        const x = X(d.z);
        const m = mu(d.z, 0.315, 0.685) + d.dmu;
        const y = Y(m);
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(x, Y(m - 0.18)); ctx.lineTo(x, Y(m + 0.18)); ctx.stroke();
        sparkle(rc, x, y, 4.5, { color: COLORS.yellow, seed: 440 + ((d.z * 100) | 0) });
      }

      // the gap annotation at z = 0.5
      const gx = X(0.5);
      const yAcc = Y(mu(0.5, 0.315, 0.685));
      const yDec = Y(mu(0.5, 1, 0));
      doodleArrow(rc, gx + 26, yDec, gx + 26, yAcc, { color: COLORS.yellow, seed: 450, strokeWidth: 1.6 });
      label(ctx, `${fmtNum(mu(0.5, 0.315, 0.685) - mu(0.5, 1, 0), 2)} mag fainter`, gx + 34, (yAcc + yDec) / 2, { color: COLORS.yellow, size: 12.5, align: 'left' });

      label(ctx, 'if gravity were braking (Ω_m=1)', X(0.8), Y(mu(0.8, 1, 0)) + 18, { color: COLORS.cyan, size: 11.5, align: 'center' });
      label(ctx, 'what the supernovae actually show', X(0.62), Y(mu(0.62, 0.315, 0.685)) - 12, { color: COLORS.pink, size: 12, align: 'center' });

      // corner: the standard candle itself
      if (!compact) {
        const cx = w - 100;
        const cy = h * 0.30;
        sparkle(rc, cx, cy, 14, { color: COLORS.yellow, seed: 460 });
        rc.circle(cx, cy, 34, opts(461, { stroke: COLORS.orange, strokeWidth: 1.6 }));
        label(ctx, 'a Type Ia supernova:', cx, cy + 40, { color: COLORS.ink, size: 12, align: 'center' });
        label(ctx, 'an exploding white dwarf,', cx, cy + 56, { color: COLORS.muted, size: 11, align: 'center' });
        label(ctx, 'always the same true brightness', cx, cy + 71, { color: COLORS.muted, size: 11, align: 'center' });
        label(ctx, '= a distance gauge', cx, cy + 86, { color: COLORS.yellow, size: 11.5, align: 'center' });
      }
    }

    /* ---------- view 2: fates a(τ) + cosmic inventory ---------- */
    renderFates() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const px0 = 50;
      const px1 = w - (compact ? 20 : 190);
      const py0 = 30;
      const py1 = h - 46;
      const aMax = 2.6;
      const X = (tau) => px0 + (tau / TAU_MAX) * (px1 - px0);
      const Y = (a) => py1 - (a / aMax) * (py1 - py0);

      this.cache.draw(`faxes-${w}x${h}`, (g) => g.path(`M ${px0} ${py0} L ${px0} ${py1} L ${px1} ${py1}`, opts(410, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      label(ctx, 'size of the universe a →', px0 - 4, py0 + 2, { color: COLORS.muted, size: 11.5, align: 'left' });
      label(ctx, 'time →', (px0 + px1) / 2, py1 + 20, { color: COLORS.muted, size: 11.5, align: 'center' });
      ctx.strokeStyle = COLORS.muted;
      ctx.globalAlpha = 0.4; ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px0, Y(1)); ctx.lineTo(px1, Y(1)); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      label(ctx, 'today (a=1)', px1 - 4, Y(1) - 5, { color: COLORS.muted, size: 10.5, align: 'right' });

      const drawCurve = (hst, color, width, alpha) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.beginPath();
        let started = false;
        for (const [tau, a2] of hst.pts) {
          if (tau > TAU_MAX) break;
          const x = X(tau); const y = Y(Math.min(a2, aMax));
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };
      for (const { p, h: hst } of this.curves) drawCurve(hst, p.color, 1.3, 0.38);
      const [, , fateColor] = this.fate();
      drawCurve(this.custom, fateColor, 2.6, 1);

      // moving "now" dot along the custom curve (the expansion happening)
      const pts = this.custom.pts;
      if (pts.length > 2) {
        const idx = Math.floor(((this.t * 0.22) % 1) * (pts.length - 1));
        const [tau, a2] = pts[idx];
        if (tau <= TAU_MAX) {
          ctx.fillStyle = fateColor;
          ctx.beginPath(); ctx.arc(X(tau), Y(Math.min(a2, aMax)), 5, 0, Math.PI * 2); ctx.fill();
        }
      }

      // acceleration onset marker
      if (this.ol > 0 && !this.custom.crunchTau) {
        const aAcc = Math.cbrt(this.om / (2 * this.ol));
        for (let i = 1; i < pts.length; i++) {
          if (pts[i][1] >= aAcc && pts[i - 1][1] < aAcc) {
            const x = X(pts[i][0]); const y = Y(pts[i][1]);
            rc.circle(x, y, 12, opts(420, { stroke: COLORS.yellow, strokeWidth: 1.8 }));
            label(ctx, 'acceleration begins', x, y - 14, { color: COLORS.yellow, size: 12, align: 'center' });
            break;
          }
        }
      }
      if (this.custom.crunchTau) {
        const x = X(this.custom.crunchTau);
        label(ctx, 'BIG CRUNCH', x, Y(0) - 8, { color: COLORS.red, size: 13, align: 'center' });
        sparkle(rc, x, py1 - 16, 7, { color: COLORS.red, seed: 421 });
      } else if (this.ol > 0) {
        label(ctx, 'Big Freeze: cold, dark, empty…', px1 - 6, py0 + 16, { color: COLORS.pink, size: 11.5, align: 'right' });
      }

      // cosmic inventory pie (right column, desktop)
      if (!compact) {
        const cx = w - 95;
        const cy = h * 0.42;
        const R = 62;
        const slices = [
          [0.049, COLORS.yellow, 'ordinary 4.9%'],
          [0.268, COLORS.cyan, 'dark matter 26.8%'],
          [0.683, COLORS.pink, 'dark energy 68.3%'],
        ];
        let ang = -Math.PI / 2;
        slices.forEach(([f, col], i) => {
          const a2 = ang + f * Math.PI * 2;
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.28;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, ang, a2); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          this.cache.draw(`slice-${i}-${w}x${h}`, (g) => g.line(cx, cy, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, opts(470 + i, { stroke: col, strokeWidth: 1.4 })));
          ang = a2;
        });
        this.cache.draw(`piering-${w}x${h}`, (g) => g.circle(cx, cy, R * 2, opts(474, { stroke: COLORS.ink, strokeWidth: 1.8 })));
        label(ctx, 'everything, measured:', cx, cy - R - 14, { color: COLORS.ink, size: 12, align: 'center' });
        let ly = cy + R + 18;
        for (const [, col, txt] of slices) {
          label(ctx, txt, cx, ly, { color: col, size: 11.5, align: 'center' });
          ly += 16;
        }
      }
      label(ctx, 'matter pulls curves DOWN · dark energy bends them UP', (px0 + px1) / 2, py0 - 4, { color: COLORS.muted, size: 12, align: 'center' });
    }
  }

  A.register('darkEnergy', DarkEnergySim);
})();
