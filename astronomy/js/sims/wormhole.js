// Sim 13 — Wormholes & exotic matter.
//
// Physics: side-view embedding diagram (Flamm funnel pair). Two modes:
//  - Einstein–Rosen (1935): the throat is DYNAMIC and pinches off in a time
//    ~ b₀/c (Fuller & Wheeler 1962) — the traveler cannot cross.
//  - Morris–Thorne (1988): throat radius b₀ held open by exotic matter whose
//    negative mass-equivalent is ~ c²·b₀/(4G)  (≈ 3.4×10²⁶ kg ≈ 0.18 Jupiter
//    for a 1 m throat — the readout computes it live from the slider).

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    G, C, C2, fmtNum, fmtTime, sci,
  } = A;

  const M_JUPITER = 1.898e27; // kg

  class WormholeSim extends Sim {
    init() {
      this.mode = 'er'; // 'er' | 'mt'
      this.b0 = 1;      // throat radius, meters (slider)
      this.resetTraveler();
      this.buildControls();
      this.bindPointer();
      this.updateReadout();
    }

    resetTraveler() {
      this.trav = { state: 'idle', y: 0, dir: 1, doneAt: 0 };
      this.pinch = 1; // throat openness 0..1 (ER mode collapses it)
    }

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'Einstein–Rosen bridge (1935)', value: 'er' },
        { label: 'Morris–Thorne + exotic matter (1988)', value: 'mt' },
      ], {
        initial: 'er',
        onSelect: (v) => {
          this.mode = v;
          this.cite(v === 'mt'
            ? '1988 Morris, Thorne - Wormholes in Spacetime and Their Use for Interstellar Travel: A Tool for Teaching General Relativity'
            : '1935 Einstein, Rosen - The Particle Problem in the General Theory of Relativity');
          this.resetTraveler();
          this.updateReadout();
          this.poke();
        },
      });
      this.b0Slider = slider(c, {
        label: 'throat radius b₀',
        min: 1,
        max: 1e6,
        value: this.b0,
        log: true,
        format: (v) => (v >= 1000 ? `${fmtNum(v / 1000, 1)} km` : `${fmtNum(v, 1)} m`),
        oninput: (v) => { this.b0 = v; this.updateReadout(); this.poke(); },
      });
      actionButton(c, 'send a traveler', () => this.send(1));
      actionButton(c, 'reset', () => { this.resetTraveler(); this.poke(); });
    }

    bindPointer() {
      this.canvasEl.addEventListener('pointerdown', (e) => {
        const rect = this.canvasEl.getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (y < this.h * 0.38) this.send(1);        // top mouth → downward
        else if (y > this.h * 0.62) this.send(-1);  // bottom mouth → upward
      });
    }

    send(dir) {
      if (this.trav.state === 'travel') return;
      this.pinch = 1;
      this.trav = { state: 'travel', y: -dir, dir, doneAt: 0 }; // y in units of H
    }

    updateReadout() {
      const exoticKg = (C2 * this.b0) / (4 * G);
      const b0txt = this.b0 >= 1000 ? `${fmtNum(this.b0 / 1000, 1)} km` : `${fmtNum(this.b0, 1)} m`;
      if (this.mode === 'er') {
        setReadout(this.readoutEl, [
          [['Einstein–Rosen bridge — the wormhole nature gives you for free… and immediately takes away.', 'yellow']],
          [
            ['a throat of b₀ = ', null], [b0txt, 'cyan'],
            [' pinches shut in roughly b₀/c ≈ ', null],
            [fmtTime(this.b0 / C, 2), 'red'],
            [' — not even light, entering at the last possible moment, gets across (1962 Fuller, Wheeler).', null],
          ],
        ]);
      } else {
        setReadout(this.readoutEl, [
          [['Morris–Thorne — traversable, IF you can thread the throat with exotic matter.', 'yellow']],
          [
            ['holding a b₀ = ', null], [b0txt, 'cyan'],
            [' throat open needs ≈ ', null],
            [`${sci(exoticKg, 2)} kg`, 'pink'],
            [' of NEGATIVE mass-energy — about ', null],
            [`${fmtNum(exoticKg / M_JUPITER, exoticKg / M_JUPITER < 10 ? 2 : 0)} Jupiters`, 'pink'],
            [' of something that falls up. Quantum physics allows whispers of it (Casimir effect) — nobody knows about Jupiters.', null],
          ],
        ]);
      }
    }

    update(dt) {
      const t = this.trav;
      if (t.state === 'travel') {
        t.y += dt * t.dir * 0.5; // crossing takes ~4 s
        if (this.mode === 'er' && Math.abs(t.y) < 0.45) {
          // the bridge pinches off around the traveler
          this.pinch = Math.max(0.06, this.pinch - dt * 0.9);
          if (this.pinch <= 0.07 && Math.abs(t.y) < 0.3) {
            t.state = 'stuck';
            t.doneAt = 0;
            this.cite('1962 Fuller, Wheeler - Causality and Multiply Connected Space-Time');
          }
        }
        if (Math.abs(t.y) >= 1) {
          t.state = 'arrived';
          t.doneAt = 0;
        }
      } else if (t.state === 'stuck' || t.state === 'arrived') {
        t.doneAt += dt;
        if (t.doneAt > 3) this.resetTraveler();
      } else if (this.mode === 'er' && this.pinch < 1) {
        this.pinch = Math.min(1, this.pinch + dt * 0.6); // reopen for the next try
      }
    }

    // funnel half-width at vertical offset yPx from the throat
    halfWidth(yPx, bPx) {
      return Math.sqrt(bPx * bPx + (yPx * 1.15) * (yPx * 1.15));
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const cx = w / 2;
      const cy = h / 2;
      const H = h * 0.33; // throat → mouth distance
      // screen throat size: log-mapped from b0 (pure visualization)
      const bBase = 20 + ((Math.log10(this.b0)) / 6) * 42;
      const bPx = bBase * (this.mode === 'er' ? this.pinch : 1);
      const seedBase = 500;

      // funnel profile: left and right curves through sampled points
      const steps = 9;
      let left = '';
      let right = '';
      for (let i = 0; i <= steps * 2; i++) {
        const yy = -H + (i / (steps * 2)) * 2 * H;
        const hw = this.halfWidth(yy, bPx);
        left += `${i === 0 ? 'M' : 'L'} ${cx - hw} ${cy + yy} `;
        right += `${i === 0 ? 'M' : 'L'} ${cx + hw} ${cy + yy} `;
      }
      rc.path(left, opts(seedBase, { strokeWidth: 2.2 }));
      rc.path(right, opts(seedBase + 1, { strokeWidth: 2.2 }));

      // mouth + throat cross-section ellipses
      const mouthW = this.halfWidth(H, bPx);
      rc.ellipse(cx, cy - H, mouthW * 2, mouthW * 0.42, opts(seedBase + 2, { strokeWidth: 2 }));
      rc.ellipse(cx, cy + H, mouthW * 2, mouthW * 0.42, opts(seedBase + 3, { strokeWidth: 2 }));
      rc.ellipse(cx, cy, Math.max(bPx, 3) * 2, Math.max(bPx, 3) * 0.5, opts(seedBase + 4, {
        stroke: this.pinch < 0.5 ? COLORS.red : COLORS.cyan, strokeWidth: 1.6, strokeLineDash: [5, 5],
      }));

      // exotic matter band (Morris–Thorne)
      if (this.mode === 'mt') {
        rc.ellipse(cx, cy, bPx * 2 + 26, bPx * 0.5 + 26, opts(seedBase + 5, {
          stroke: COLORS.pink, strokeWidth: 1.4,
          fill: COLORS.pink, fillStyle: 'hachure', fillWeight: 0.7, hachureGap: 7,
        }));
        label(ctx, 'exotic matter: ρc² + p < 0', cx + bPx + (compact ? 30 : 48), cy + 4, { color: COLORS.pink, size: compact ? 12 : 14 });
      }
      if (this.mode === 'er' && this.pinch < 0.5) {
        label(ctx, 'pinching off!', cx + bPx + 30, cy + 4, { color: COLORS.red, size: 14 });
      }

      // the traveler
      const t = this.trav;
      if (t.state !== 'idle') {
        const y = cy + t.y * H;
        const col = t.state === 'stuck' ? COLORS.red : COLORS.yellow;
        stickFigure(rc, cx, y - 18, { scale: 0.55, seed: 510, color: col, broken: t.state === 'stuck' });
        if (t.state === 'stuck') {
          label(ctx, 'pinched! the bridge closed faster than light', cx, cy - H - 34, { color: COLORS.red, size: 14.5, align: 'center' });
        } else if (t.state === 'arrived') {
          const ay = cy + t.dir * H;
          label(ctx, 'arrived! …somewhere', cx + 60, ay + t.dir * 26, { color: COLORS.green, size: 14.5 });
          sparkle(rc, cx + 130, ay, 6, { color: COLORS.green, seed: 511 });
        }
      }

      // scene labels
      label(ctx, 'HERE', cx - mouthW - (compact ? 8 : 20), cy - H - 12, { color: COLORS.cyan, size: 15, align: 'right' });
      label(ctx, '…somewhere else entirely', cx - mouthW - (compact ? 8 : 20), cy + H + 24, { color: COLORS.orange, size: compact ? 12.5 : 14, align: 'right' });
      sparkle(rc, cx - mouthW - 40, cy + H - 10, 5, { color: COLORS.muted, seed: 512 });
      sparkle(rc, w - 60, h - 50, 6, { color: COLORS.pink, seed: 513 });
      label(ctx, 'click either mouth to send a traveler', w / 2, 20, { color: COLORS.muted, size: compact ? 11.5 : 13, align: 'center' });
      label(ctx, 'the funnel is not IN space — it IS space (embedding diagram)', w / 2, h - 12, { color: COLORS.muted, size: compact ? 11 : 12.5, align: 'center' });
    }
  }

  A.register('wormhole', WormholeSim);
})();
