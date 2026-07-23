// Sim 12 — Dark energy (the fate of the universe).
//
// Physics: integrate the Friedmann equation for a(τ), τ = H₀·t, for arbitrary
// (Ω_m, Ω_Λ), including curvature Ω_k = 1 − Ω_m − Ω_Λ:
//     (da/dτ)² = Ω_m/a + Ω_Λ·a² + Ω_k
// Expansion turns around (recollapse) if the RHS reaches 0 at finite a — the sim
// detects that and integrates back down to a Big Crunch. Acceleration (ä>0)
// begins once a > a_accel = (Ω_m / 2Ω_Λ)^(1/3); for our measured mix this is
// z ≈ 0.6, ~6 Gyr ago. Four preset universes plus free sliders.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, sparkle,
    slider, buttonRow, setReadout, fmtNum,
  } = A;

  const PRESETS = {
    ours: { om: 0.315, ol: 0.685, name: 'our universe (accelerating)', color: COLORS.pink },
    matter: { om: 1.0, ol: 0, name: 'matter only (decelerates forever)', color: COLORS.cyan },
    crunch: { om: 5.0, ol: 0, name: 'heavy & no dark energy (Big Crunch)', color: COLORS.red },
    coast: { om: 0.3, ol: 0, name: 'low density, no dark energy (coasts)', color: COLORS.green },
  };

  const TAU_MAX = 3.2;   // dimensionless time to plot
  const DTAU = 0.004;

  // Integrate a(τ) forward from a≈0; handle turnaround → recollapse.
  function history(om, ol) {
    const ok = 1 - om - ol;
    let a = 1e-3;
    let tau = 0;
    let dir = 1;
    const pts = [[0, 0]];
    let crunchTau = null;
    let accelA = ol > 0 ? Math.cbrt(om / (2 * ol)) : null;
    while (tau < TAU_MAX && pts.length < 5000) {
      const rhs = om / a + ol * a * a + ok;
      // turnaround: at the exact point rhs = 0 (ȧ = 0), so flip direction AND
      // nudge a onto the collapsing branch, otherwise the integrator deadlocks
      // sitting on ȧ = 0 forever.
      if (rhs <= 0 && dir > 0) { dir = -1; a -= 0.01; }
      const adot = dir * Math.sqrt(Math.max(rhs, 0));
      a += adot * DTAU;
      tau += DTAU;
      if (a <= 1e-3 && dir < 0) { pts.push([tau, 0]); crunchTau = tau; break; }
      pts.push([tau, a]);
    }
    // find τ where a=1 (today) on the expanding branch
    let tauToday = null;
    for (let i = 1; i < pts.length; i++) {
      if (tauToday === null && pts[i][1] >= 1 && pts[i - 1][1] < 1) {
        const f = (1 - pts[i - 1][1]) / (pts[i][1] - pts[i - 1][1]);
        tauToday = pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]);
      }
    }
    return { pts, crunchTau, accelA, tauToday };
  }

  class DarkEnergySim extends Sim {
    init() {
      this.om = 0.315;
      this.ol = 0.685;
      this.presetKey = 'ours';
      this.t = 0;
      this.marker = 0; // animated time marker along τ
      this.recompute();
      this.buildControls();
      this.updateReadout();
    }

    recompute() {
      this.curOurs = history(0.315, 0.685);
      this.curOther = Object.entries(PRESETS).map(([k, p]) => ({ k, p, h: history(p.om, p.ol) }));
      this.curCustom = history(this.om, this.ol);
    }

    buildControls() {
      const c = this.controlsEl;
      this.presetBtns = buttonRow(c, Object.entries(PRESETS).map(([v, p]) => ({ label: p.name.split(' (')[0], value: v })), {
        initial: 'ours',
        onSelect: (v) => {
          this.presetKey = v;
          this.om = PRESETS[v].om; this.ol = PRESETS[v].ol;
          this.omSlider.set(this.om); this.olSlider.set(this.ol);
          this.cite(PRESETS[v].ol > 0
            ? '1998 Riess et al. - Observational Evidence from Supernovae for an Accelerating Universe and a Cosmological Constant'
            : '1922 Friedmann - Über die Krümmung des Raumes (On the Curvature of Space)');
          this.recompute(); this.updateReadout(); this.poke();
        },
      });
      this.omSlider = slider(c, {
        label: 'Ω_m (matter)',
        min: 0, max: 3, step: 0.01, value: this.om,
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
      if (this.curCustom.crunchTau) return ['recollapses → Big Crunch', 'red'];
      if (this.ol > 0) return ['accelerates → Big Freeze', 'pink'];
      if (Math.abs(ok) < 0.02 && this.ol === 0) return ['expands forever, ever slower (critical)', 'cyan'];
      return ['expands forever (coasting)', 'green'];
    }

    updateReadout() {
      const ok = 1 - this.om - this.ol;
      const accelA = this.ol > 0 ? Math.cbrt(this.om / (2 * this.ol)) : null;
      const zAccel = accelA ? 1 / accelA - 1 : null;
      const [fateTxt, fateCol] = this.fate();
      const lines = [
        [
          ['Ω_m = ', null], [fmtNum(this.om, 2), 'cyan'],
          ['   Ω_Λ = ', null], [fmtNum(this.ol, 2), 'pink'],
          ['   curvature Ω_k = ', null], [fmtNum(ok, 2), 'muted'],
          [Math.abs(ok) < 0.03 ? ' (flat)' : ok > 0 ? ' (open)' : ' (closed)', null],
        ],
        [['fate of this universe: ', null], [fateTxt, fateCol]],
      ];
      if (accelA) {
        lines.push([
          ['acceleration switches on at a = ', null], [fmtNum(accelA, 3), 'yellow'],
          [`  (redshift z ≈ ${fmtNum(zAccel, 2)}) — before that, gravity was still winning.`, null],
        ]);
      } else {
        lines.push([['no dark energy here, so the expansion only ever decelerates.', 'muted']]);
      }
      lines.push([['measured: the expansion IS accelerating (Nobel 2011). The cause — dark energy, ~68% of everything — is real but unexplained.', 'green']]);
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      this.marker = (this.marker + dt * 0.35) % TAU_MAX;
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const px0 = 50;
      const px1 = w - 24;
      const py0 = 30;
      const py1 = h - 46;
      const aMax = 2.6;
      const X = (tau) => px0 + (tau / TAU_MAX) * (px1 - px0);
      const Y = (a) => py1 - (a / aMax) * (py1 - py0);

      // axes
      this.cache.draw(`axes-${w}x${h}`, (g) => g.path(`M ${px0} ${py0} L ${px0} ${py1} L ${px1} ${py1}`, opts(410, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      label(ctx, 'size of the universe, a →', px0 - 6, py0 + 4, { color: COLORS.muted, size: 11.5, align: 'left' });
      label(ctx, 'time →', (px0 + px1) / 2, py1 + 22, { color: COLORS.muted, size: 11.5, align: 'center' });
      // a = 1 (today) line
      ctx.strokeStyle = COLORS.muted;
      ctx.globalAlpha = 0.4; ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px0, Y(1)); ctx.lineTo(px1, Y(1)); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      label(ctx, 'today (a=1)', px1 - 4, Y(1) - 5, { color: COLORS.muted, size: 10.5, align: 'right' });

      // draw the four preset curves faintly, plus the custom curve bold
      const drawCurve = (hst, color, boldWidth, alpha) => {
        if (!hst.pts.length) return;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = boldWidth;
        ctx.beginPath();
        let started = false;
        for (const [tau, a] of hst.pts) {
          if (tau > TAU_MAX) break;
          const x = X(tau); const y = Y(Math.min(a, aMax));
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      for (const { p, h: hst } of this.curOther) {
        drawCurve(hst, p.color, 1.3, 0.4);
      }
      // custom (current) curve — bold, colored by fate
      const [, fateCol] = this.fate();
      const cmap = { red: COLORS.red, pink: COLORS.pink, cyan: COLORS.cyan, green: COLORS.green };
      drawCurve(this.curCustom, cmap[fateCol] || COLORS.pink, 2.6, 1);

      // acceleration onset marker on the custom curve
      if (this.curCustom.accelA) {
        // find τ where a = accelA on the expanding branch
        for (let i = 1; i < this.curCustom.pts.length; i++) {
          if (this.curCustom.pts[i][1] >= this.curCustom.accelA && this.curCustom.pts[i - 1][1] < this.curCustom.accelA) {
            const [tau, a] = this.curCustom.pts[i];
            const x = X(tau); const y = Y(a);
            rc.circle(x, y, 12, opts(420, { stroke: COLORS.yellow, strokeWidth: 1.8 }));
            label(ctx, 'acceleration begins', x, y - 14, { color: COLORS.yellow, size: 12, align: 'center' });
            break;
          }
        }
      }
      // crunch marker
      if (this.curCustom.crunchTau) {
        const x = X(this.curCustom.crunchTau);
        label(ctx, 'Big Crunch', x, Y(0) - 6, { color: COLORS.red, size: 12.5, align: 'center' });
        sparkle(rc, x, py1 - 14, 6, { color: COLORS.red, seed: 421 });
      }

      // legend
      if (!compact) {
        let ly = py0 + 8;
        for (const { p } of this.curOther) {
          ctx.strokeStyle = p.color; ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(px1 - 150, ly); ctx.lineTo(px1 - 130, ly); ctx.stroke();
          ctx.globalAlpha = 1;
          label(ctx, p.name.split(' (')[0], px1 - 124, ly + 4, { color: p.color, size: 10.5, align: 'left' });
          ly += 16;
        }
      }
      label(ctx, 'matter pulls curves DOWN · dark energy curves them UP', (px0 + px1) / 2, py0 - 4, { color: COLORS.muted, size: 12, align: 'center' });
    }
  }

  A.register('darkEnergy', DarkEnergySim);
})();
