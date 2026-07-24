// Sim 42 — Everett's many worlds.
//
// A quantum spin α|↑⟩ + β|↓⟩ with |α|² set by the slider. Two renderings of
// the SAME mathematics:
//  - Copenhagen: each "measure" collapses randomly with P(↑) = |α|² (the Born
//    rule); the tally chart converges to |α|² — that convergence is measured
//    physics, reproduced honestly here with real weighted randomness.
//  - Everett: no collapse — each measurement splits every branch in two, with
//    line thickness ∝ branch weight (products of |α|²/|β|²). After n
//    measurements there are 2^n branches, each containing an observer whose
//    personal record nevertheless shows Born-rule statistics.
// The readout is explicit: both stories predict identical experiments; no
// experiment to date distinguishes them. Interpretation ≠ measured fact.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout, fmtNum, sci,
  } = A;

  const MAX_DRAW_DEPTH = 6;

  class ManyWorldsSim extends Sim {
    init() {
      this.pUp = 0.7;          // |α|²
      this.mode = 'copenhagen';
      this.nMeasure = 0;
      this.ups = 0;
      this.lastOutcome = null;
      this.flip = 0;           // collapse animation
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'Copenhagen (collapse)', value: 'copenhagen' },
        { label: 'Everett (branch)', value: 'everett' },
      ], {
        initial: 'copenhagen',
        onSelect: (v) => {
          this.mode = v;
          this.cite(v === 'everett'
            ? '1957 Everett - "Relative State" Formulation of Quantum Mechanics'
            : '1935 Schrödinger - Die gegenwärtige Situation in der Quantenmechanik');
          this.updateReadout();
          this.poke();
        },
      });
      this.pSlider = slider(c, {
        label: 'P(↑) = |α|²',
        min: 0.05, max: 0.95, step: 0.01, value: this.pUp,
        format: (v) => fmtNum(v, 2),
        oninput: (v) => { this.pUp = v; this.reset(); this.poke(); },
      });
      actionButton(c, 'measure!', () => this.measure(1));
      actionButton(c, 'measure ×20', () => this.measure(20));
      actionButton(c, 'reset', () => { this.reset(); this.poke(); });
    }

    reset() {
      this.nMeasure = 0;
      this.ups = 0;
      this.lastOutcome = null;
      this.updateReadout();
    }

    measure(n) {
      for (let i = 0; i < n; i++) {
        this.nMeasure++;
        if (Math.random() < this.pUp) { this.ups++; this.lastOutcome = 'up'; }
        else this.lastOutcome = 'down';
      }
      this.flip = 1;
      this.updateReadout();
      this.poke();
    }

    updateReadout() {
      const freq = this.nMeasure ? this.ups / this.nMeasure : null;
      const lines = [
        [
          ['state: ', null],
          [`√${fmtNum(this.pUp, 2)} |↑⟩ + √${fmtNum(1 - this.pUp, 2)} |↓⟩`, 'cyan'],
          ['   ·   measurements: ', null], [`${this.nMeasure}`, 'yellow'],
          freq === null ? ['', null] : ['   ·   observed P(↑) = ', null],
          freq === null ? ['', null] : [fmtNum(freq, 3), 'green'],
          freq === null ? ['', null] : [`  (Born rule says ${fmtNum(this.pUp, 2)} — watch it converge)`, null],
        ],
      ];
      if (this.mode === 'everett' && this.nMeasure > 0) {
        lines.push([
          ['branches now: ', null],
          [this.nMeasure > 40 ? sci(Math.pow(2, this.nMeasure), 1) : fmtNum(Math.pow(2, this.nMeasure), 0), 'pink'],
          [` — one copy of you in each, and every copy's record still shows Born statistics. Randomness = which branch you woke up in.`, null],
        ]);
      }
      lines.push([[
        'both stories predict IDENTICAL statistics — no experiment has ever told them apart. The math is measured; the story is open.',
        'yellow',
      ]]);
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      this.flip = Math.max(0, this.flip - dt * 1.4);
    }

    render() {
      if (this.mode === 'copenhagen') this.renderCopenhagen();
      else this.renderEverett();
    }

    /* ---------- Copenhagen: the collapsing coin + tally ---------- */
    renderCopenhagen() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const cx = w * (compact ? 0.5 : 0.30);
      const cy = h * 0.38;

      // the quantum spin: before measurement, BOTH arrows ghosted ∝ amplitude
      rc.circle(cx, cy, 96, opts(700, { stroke: COLORS.muted, strokeWidth: 1.6, strokeLineDash: [5, 6] }));
      const upAlpha = this.lastOutcome === null ? this.pUp : (this.lastOutcome === 'up' ? 1 : 0.08);
      const dnAlpha = this.lastOutcome === null ? 1 - this.pUp : (this.lastOutcome === 'down' ? 1 : 0.08);
      ctx.globalAlpha = Math.max(upAlpha, 0.08);
      rc.line(cx, cy + 26, cx, cy - 34, opts(701, { stroke: COLORS.cyan, strokeWidth: 3 }));
      rc.line(cx, cy - 34, cx - 8, cy - 22, opts(702, { stroke: COLORS.cyan, strokeWidth: 2 }));
      rc.line(cx, cy - 34, cx + 8, cy - 22, opts(703, { stroke: COLORS.cyan, strokeWidth: 2 }));
      ctx.globalAlpha = Math.max(dnAlpha, 0.08);
      rc.line(cx + 20, cy - 26, cx + 20, cy + 34, opts(704, { stroke: COLORS.pink, strokeWidth: 3 }));
      rc.line(cx + 20, cy + 34, cx + 12, cy + 22, opts(705, { stroke: COLORS.pink, strokeWidth: 2 }));
      rc.line(cx + 20, cy + 34, cx + 28, cy + 22, opts(706, { stroke: COLORS.pink, strokeWidth: 2 }));
      ctx.globalAlpha = 1;
      if (this.flip > 0) {
        sparkle(rc, cx + 40, cy - 50, 8, { color: COLORS.yellow, seed: 707 });
        label(ctx, 'collapse!', cx + 56, cy - 56, { color: COLORS.yellow, size: 13 });
      }
      label(ctx, this.lastOutcome === null ? 'superposition (both, weighted)' : `you saw: ${this.lastOutcome === 'up' ? '↑' : '↓'} — the other term is simply GONE`, cx, cy + 120, {
        color: this.lastOutcome === null ? COLORS.muted : COLORS.ink, size: 12.5, align: 'center',
      });

      // tally chart: observed frequency vs Born rule
      const bx0 = compact ? 40 : w * 0.58;
      const bx1 = w - 30;
      const by0 = compact ? h * 0.72 : h * 0.20;
      const by1 = compact ? h * 0.94 : h * 0.80;
      this.cache.draw(`taxes-${w}x${h}`, (g) => g.path(`M ${bx0} ${by0} L ${bx0} ${by1} L ${bx1} ${by1}`, opts(710, { stroke: COLORS.muted, strokeWidth: 1.3 })));
      const Ybar = (f) => by1 - f * (by1 - by0);
      // Born-rule line
      ctx.strokeStyle = COLORS.yellow;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(bx0, Ybar(this.pUp)); ctx.lineTo(bx1, Ybar(this.pUp)); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, `Born rule |α|² = ${fmtNum(this.pUp, 2)}`, bx1 - 4, Ybar(this.pUp) - 6, { color: COLORS.yellow, size: 11, align: 'right' });
      // observed frequency bar
      if (this.nMeasure) {
        const f = this.ups / this.nMeasure;
        const bw = (bx1 - bx0) * 0.28;
        rc.rectangle(bx0 + (bx1 - bx0) * 0.36, Ybar(f), bw, by1 - Ybar(f), opts(711 + (this.nMeasure % 7), {
          stroke: COLORS.green, strokeWidth: 1.8, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 7,
        }));
        label(ctx, `observed ${fmtNum(f, 3)} after ${this.nMeasure}`, bx0 + (bx1 - bx0) * 0.5, by0 - 8, { color: COLORS.green, size: 12, align: 'center' });
      } else {
        label(ctx, 'measure repeatedly →', bx0 + (bx1 - bx0) * 0.5, (by0 + by1) / 2, { color: COLORS.muted, size: 12, align: 'center' });
      }
      label(ctx, 'this convergence is MEASURED physics — every quantum lab sees it', (bx0 + bx1) / 2, by1 + 18, { color: COLORS.muted, size: compact ? 10 : 11.5, align: 'center' });
    }

    /* ---------- Everett: the world tree ---------- */
    renderEverett() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const depth = Math.min(this.nMeasure, MAX_DRAW_DEPTH);
      const rootX = w * 0.5;
      const rootY = 34;

      if (this.nMeasure === 0) {
        stickFigure(rc, rootX, h * 0.4, { scale: 1, seed: 720 });
        label(ctx, 'one you, one world — press "measure!"', rootX, h * 0.4 + 90, { color: COLORS.muted, size: 13, align: 'center' });
        return;
      }

      // recursive-ish tree: iterate levels; keep only branches wide enough
      const levelH = (h - 110) / Math.max(depth, 1);
      let nodes = [{ x: rootX, wgt: 1, rec: '' }];
      for (let lvl = 0; lvl < depth; lvl++) {
        const y0 = rootY + lvl * levelH;
        const y1 = rootY + (lvl + 1) * levelH;
        const spreadBase = (w * 0.42) / Math.pow(2, lvl);
        const next = [];
        for (const nd of nodes) {
          const kids = [
            { x: nd.x - spreadBase * this.pUp, wgt: nd.wgt * this.pUp, rec: nd.rec + '↑', up: true },
            { x: nd.x + spreadBase * (1 - this.pUp), wgt: nd.wgt * (1 - this.pUp), rec: nd.rec + '↓', up: false },
          ];
          for (const k of kids) {
            const lw = Math.max(0.6, k.wgt * 14);
            ctx.strokeStyle = k.up ? COLORS.cyan : COLORS.pink;
            ctx.globalAlpha = Math.max(0.25, Math.min(1, k.wgt * 3));
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(nd.x, y0);
            ctx.quadraticCurveTo(nd.x, (y0 + y1) / 2, k.x, y1);
            ctx.stroke();
            ctx.globalAlpha = 1;
            next.push(k);
          }
        }
        nodes = next;
        if (nodes.length > 64) break;
      }

      // a few observers at the leaves
      const leafY = rootY + depth * levelH;
      const shown = nodes.filter((n2, i) => i % Math.ceil(nodes.length / (compact ? 3 : 5)) === 0).slice(0, compact ? 3 : 5);
      for (const nd of shown) {
        stickFigure(rc, nd.x, leafY + 4, { scale: 0.4, seed: 730 + ((nd.x | 0) % 23) });
        label(ctx, `saw ${nd.rec.slice(-MAX_DRAW_DEPTH)}`, nd.x, leafY + 52, { color: COLORS.muted, size: 10, align: 'center' });
        label(ctx, `weight ${fmtNum(nd.wgt, 3)}`, nd.x, leafY + 65, { color: COLORS.muted, size: 9.5, align: 'center' });
      }
      if (this.nMeasure > MAX_DRAW_DEPTH) {
        label(ctx, `…drawing stops at ${MAX_DRAW_DEPTH} splits; the ledger says ${this.nMeasure} → ${this.nMeasure > 40 ? sci(Math.pow(2, this.nMeasure), 1) : fmtNum(Math.pow(2, this.nMeasure), 0)} branches`, w / 2, h - 12, { color: COLORS.pink, size: 12, align: 'center' });
      } else {
        label(ctx, 'line thickness = branch weight |amplitude|² — thick branches are "more of the multiverse"', w / 2, h - 12, { color: COLORS.muted, size: compact ? 10.5 : 12, align: 'center' });
      }
      label(ctx, 'nothing ever collapsed — you just rode one line down', w / 2, 18, { color: COLORS.cyan, size: compact ? 11.5 : 13, align: 'center' });
    }
  }

  A.register('manyWorlds', ManyWorldsSim);
})();
