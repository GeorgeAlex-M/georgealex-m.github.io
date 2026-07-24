// Sim 43 — Laplace's demon & the Devs question.
//
// Physics: two REAL double pendulums (equal masses/lengths, RK4-integrated
// standard equations) started with an angle difference δ₀ you choose (down to
// one part in a trillion). Their separation grows exponentially,
// δ(t) ≈ δ₀·e^(λt); the sim MEASURES λ live from the log-separation slope and
// computes the prediction horizon t ≈ ln(δ_max/δ₀)/λ. The "×1000 better
// knowledge" button demonstrates the demon-killing arithmetic: a thousandfold
// better measurement buys only ln(1000)/λ ≈ a few extra seconds.
// Plus: the quantum coin the demon cannot beat (tally sticks at ~50%), and the
// no-cloning theorem forbidding it from even reading its input.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, sparkle,
    slider, buttonRow, actionButton, setReadout, fmtNum, sci,
  } = A;

  const G_ACC = 9.81;
  const DELTA_MAX = 0.1;  // rad — "prediction has failed" threshold

  // standard equal-mass, equal-length double pendulum derivatives
  function derivs(_t, [t1, w1, t2, w2]) {
    const d = t1 - t2;
    const den = 3 - Math.cos(2 * d);
    const num1 = -3 * G_ACC * Math.sin(t1) - G_ACC * Math.sin(t1 - 2 * t2)
      - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d));
    const num2 = 2 * Math.sin(d) * (2 * w1 * w1 + 2 * G_ACC * Math.cos(t1) + w2 * w2 * Math.cos(d));
    return [w1, num1 / den, w2, num2 / den];
  }

  class LaplaceSim extends Sim {
    init() {
      this.delta0 = 1e-9;
      this.quantumTries = 0;
      this.quantumHits = 0;
      this.restart();
      this.buildControls();
      this.updateReadout();
    }

    restart() {
      this.A1 = [2.0, 0, 2.4, 0];                       // [θ1, ω1, θ2, ω2]
      this.B1 = [2.0 + this.delta0, 0, 2.4, 0];
      this.time = 0;
      this.sepLog = [];        // [t, log10(δ)]
      this.horizon = null;     // time when δ crossed DELTA_MAX
      this.lambda = null;      // measured Lyapunov exponent
      this.trailA = [];
      this.trailB = [];
    }

    buildControls() {
      const c = this.controlsEl;
      this.dSlider = slider(c, {
        label: 'initial difference δ₀',
        min: 1e-12, max: 1e-3, value: this.delta0,
        log: true,
        format: (v) => `10^${fmtNum(Math.log10(v), 0)} rad`,
        oninput: (v) => { this.delta0 = v; this.restart(); this.updateReadout(); this.poke(); },
      });
      actionButton(c, 'restart the pair', () => {
        this.restart();
        this.cite('1963 Lorenz - Deterministic Nonperiodic Flow');
        this.updateReadout();
        this.poke();
      });
      actionButton(c, '×1000 better knowledge', () => {
        this.delta0 = Math.max(this.delta0 / 1000, 1e-12);
        this.dSlider.set(this.delta0);
        this.restart();
        this.updateReadout();
        this.poke();
      });
      actionButton(c, 'demon, predict this quantum coin', () => {
        this.quantumTries++;
        if (Math.random() < 0.5) this.quantumHits++; // the demon guesses; physics shrugs
        this.cite('1982 Wootters, Zurek - A Single Quantum Cannot Be Cloned');
        this.updateReadout();
        this.poke();
      });
    }

    sep() {
      return Math.abs(this.A1[0] - this.B1[0]) + Math.abs(this.A1[2] - this.B1[2]);
    }

    // measure λ by fitting the log-separation slope while growth is clean
    measureLambda() {
      const pts = this.sepLog.filter(([, l]) => l > Math.log10(this.delta0) + 1 && l < -1.3);
      if (pts.length < 8) return null;
      const n = pts.length;
      let st = 0; let sl = 0; let stt = 0; let stl = 0;
      for (const [t2, l] of pts) { st += t2; sl += l; stt += t2 * t2; stl += t2 * l; }
      const slope = (n * stl - st * sl) / (n * stt - st * st); // log10 δ per s
      return slope * Math.LN10; // λ in 1/s
    }

    updateReadout() {
      const lam = this.lambda;
      const horizonPred = lam ? Math.log(DELTA_MAX / this.delta0) / lam : null;
      const lines = [
        [
          ['two pendulums, identical to ', null],
          [`1 part in 10^${fmtNum(-Math.log10(this.delta0), 0)}`, 'cyan'],
          [' — far beyond any real measurement.', null],
        ],
      ];
      if (this.horizon) {
        lines.push([
          ['prediction FAILED at t = ', null], [`${fmtNum(this.horizon, 1)} s`, 'red'],
          lam ? ['   ·   measured λ ≈ ', null] : ['', null],
          lam ? [`${fmtNum(lam, 2)} s⁻¹`, 'orange'] : ['', null],
          lam ? [`   ·   horizon formula gives ${fmtNum(horizonPred, 1)} s ✓`, null] : ['', null],
        ]);
        lines.push([
          ['the demon-killing arithmetic: ×1000 better knowledge buys only ln(1000)/λ ≈ ', null],
          [lam ? `${fmtNum(Math.log(1000) / lam, 1)} s` : 'a few s', 'yellow'],
          [' more. Exponential beats diligence, always. (Weather: ~2 weeks. Solar system: ~5 Myr.)', null],
        ]);
      } else {
        lines.push([['watch the log-plot slope — straight line = exponential divergence. Determinism without predictability.', null]]);
      }
      if (this.quantumTries) {
        lines.push([
          ['demon vs quantum coin: ', null],
          [`${this.quantumHits}/${this.quantumTries} correct (${fmtNum((this.quantumHits / this.quantumTries) * 100, 0)}%)`, 'pink'],
          [' — stuck at chance forever; outcomes are undetermined, and no-cloning forbids even copying the state to try.', null],
        ]);
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      // integrate both pendulums with RK4 substeps
      const h2 = 0.004;
      let steps = Math.min(Math.ceil(dt / h2), 12);
      const rk4v = (s) => {
        const k1 = derivs(0, s);
        const s2 = s.map((v, i) => v + (h2 / 2) * k1[i]);
        const k2 = derivs(0, s2);
        const s3 = s.map((v, i) => v + (h2 / 2) * k2[i]);
        const k3 = derivs(0, s3);
        const s4 = s.map((v, i) => v + h2 * k3[i]);
        const k4 = derivs(0, s4);
        return s.map((v, i) => v + (h2 / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
      };
      while (steps-- > 0) {
        this.A1 = rk4v(this.A1);
        this.B1 = rk4v(this.B1);
        this.time += h2;
      }
      const s = this.sep();
      if (this.sepLog.length === 0 || this.time - this.sepLog[this.sepLog.length - 1][0] > 0.08) {
        this.sepLog.push([this.time, Math.log10(Math.max(s, 1e-16))]);
        if (this.sepLog.length > 400) this.sepLog.shift();
      }
      if (!this.horizon && s > DELTA_MAX) {
        this.horizon = this.time;
        this.lambda = this.measureLambda();
        this.updateReadout();
      }
      // trails of the second bobs
      const [xa, ya] = this.bobPos(this.A1, 2);
      const [xb, yb] = this.bobPos(this.B1, 2);
      this.trailA.push([xa, ya]);
      this.trailB.push([xb, yb]);
      if (this.trailA.length > 160) { this.trailA.shift(); this.trailB.shift(); }
    }

    pivot() {
      const compact = this.w < 700;
      return [this.w * (compact ? 0.5 : 0.30), this.h * 0.30];
    }

    bobPos(s, which) {
      const [px, py] = this.pivot();
      const L = Math.min(this.w, this.h) * 0.16;
      const x1 = px + Math.sin(s[0]) * L;
      const y1 = py + Math.cos(s[0]) * L;
      if (which === 1) return [x1, y1];
      return [x1 + Math.sin(s[2]) * L, y1 + Math.cos(s[2]) * L];
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const [px, py] = this.pivot();

      // trails
      for (const [trail, col] of [[this.trailA, COLORS.cyan], [this.trailB, COLORS.pink]]) {
        if (trail.length > 1) {
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // the two pendulums (B drawn over A; early on they overlap exactly)
      this.cache.draw(`mount-${w}x${h}`, (g) => g.line(px - 26, py, px + 26, py, opts(800, { stroke: COLORS.muted, strokeWidth: 2 })));
      for (const [s, col, seedO] of [[this.A1, COLORS.cyan, 801], [this.B1, COLORS.pink, 805]]) {
        const [x1, y1] = this.bobPos(s, 1);
        const [x2, y2] = this.bobPos(s, 2);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x1, y1, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x2, y2, 7, 0, Math.PI * 2); ctx.fill();
      }
      label(ctx, this.sep() < 1e-3 ? 'two pendulums (still perfectly overlapping…)' : 'now living different lives', px, py - 14, { color: COLORS.muted, size: 12, align: 'center' });
      label(ctx, `t = ${fmtNum(this.time, 1)} s`, px, h * 0.62, { color: COLORS.ink, size: 13, align: 'center' });

      // ---- log-separation plot ----
      const gx0 = compact ? 36 : w * 0.56;
      const gx1 = w - 26;
      const gy0 = compact ? h * 0.68 : h * 0.16;
      const gy1 = compact ? h * 0.94 : h * 0.62;
      const tMax = Math.max(this.time, 12);
      const lMin = Math.log10(this.delta0) - 1;
      const lMax = 0.5;
      const X = (t2) => gx0 + (t2 / tMax) * (gx1 - gx0);
      const Y = (l) => gy1 - ((l - lMin) / (lMax - lMin)) * (gy1 - gy0);
      this.cache.draw(`laxes-${w}x${h}-${this.delta0}`, (g) => g.path(`M ${gx0} ${gy0} L ${gx0} ${gy1} L ${gx1} ${gy1}`, opts(810, { stroke: COLORS.muted, strokeWidth: 1.3 })));
      label(ctx, 'log₁₀ separation', gx0 + 4, gy0 - 6, { color: COLORS.muted, size: 10.5, align: 'left' });
      // failure threshold
      ctx.strokeStyle = COLORS.red;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(gx0, Y(Math.log10(DELTA_MAX))); ctx.lineTo(gx1, Y(Math.log10(DELTA_MAX))); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, 'prediction dead', gx1 - 4, Y(Math.log10(DELTA_MAX)) - 5, { color: COLORS.red, size: 10.5, align: 'right' });
      // the separation curve — a straight climb = exponential growth
      if (this.sepLog.length > 1) {
        ctx.strokeStyle = COLORS.yellow;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        this.sepLog.forEach(([t2, l], i) => {
          const x = X(t2); const y = Y(Math.max(l, lMin));
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      if (this.horizon) {
        const x = X(this.horizon);
        sparkle(rc, x, Y(Math.log10(DELTA_MAX)), 7, { color: COLORS.red, seed: 812 });
        label(ctx, `horizon: ${fmtNum(this.horizon, 1)} s`, x, gy0 + 12, { color: COLORS.red, size: 11.5, align: 'center' });
      }
      label(ctx, 'straight line = exponential — the demon\'s death certificate', (gx0 + gx1) / 2, gy1 + 18, { color: COLORS.muted, size: compact ? 10 : 11.5, align: 'center' });

      // ---- the demon itself (desktop corner) ----
      if (!compact) {
        const dx = w * 0.35;
        const dy = h * 0.80;
        rc.circle(dx, dy, 40, opts(820, { stroke: COLORS.orange, strokeWidth: 1.8 }));
        rc.line(dx - 12, dy - 22, dx - 4, dy - 12, opts(821, { stroke: COLORS.orange, strokeWidth: 1.6 })); // horn
        rc.line(dx + 12, dy - 22, dx + 4, dy - 12, opts(822, { stroke: COLORS.orange, strokeWidth: 1.6 }));
        ctx.fillStyle = COLORS.orange;
        ctx.beginPath(); ctx.arc(dx - 7, dy - 3, 1.6, 0, Math.PI * 2); ctx.arc(dx + 7, dy - 3, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = COLORS.orange;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(dx, dy + 9, 8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); // frown
        label(ctx, "Laplace's demon (1814):", dx, dy + 36, { color: COLORS.orange, size: 11.5, align: 'center' });
        label(ctx, 'killed by chaos, quantum dice,', dx, dy + 51, { color: COLORS.muted, size: 10.5, align: 'center' });
        label(ctx, 'and the no-cloning theorem', dx, dy + 65, { color: COLORS.muted, size: 10.5, align: 'center' });
      }
    }
  }

  A.register('laplace', LaplaceSim);
})();
