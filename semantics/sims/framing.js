// Semantics Sim 2 — Same numbers, different word.
//
// Two framing studies, both reported in Kahneman's Thinking, Fast and Slow:
//
//   SURGERY (Tversky with colleagues at Harvard Medical School, ch.34)
//     "The one-month survival rate is 90%"  vs  "There is 10% mortality in
//     the first month" — logically identical. Surgery chosen by 84% of
//     physicians in the survival frame, and only 50% in the mortality frame.
//     Kandel-style punchline, in Kahneman's own words: "Medical training is,
//     evidently, no defense against the power of framing."
//     Those two percentages are quoted directly from the book.
//
//   ASIAN DISEASE (Tversky & Kahneman, ch.34)
//     600 people. Programme A saves 200 for certain; B is a 1/3 chance to
//     save all 600. A' lets 400 die for certain; B' is a 1/3 chance nobody
//     dies. A ≡ A' and B ≡ B'. Kahneman reports "a substantial majority"
//     choosing the sure thing in the SAVED frame and "a large majority"
//     choosing the gamble in the DIED frame — he gives no percentages, so
//     neither does this sim.

(() => {
  const A = (window.Astro = window.Astro || {});
  const { Sim, opts, COLORS, label, buttonRow, setReadout } = A;

  class Framing extends Sim {
    init() {
      this.study = 'surgery';
      this.frame = 'positive';
      this.t = 0;
      this.reveal = 0; // 0..1 eased highlight of "they are the same"

      buttonRow(this.controlsEl, [
        { label: 'lung cancer (physicians)', value: 'surgery' },
        { label: 'the 600 lives', value: 'asian' },
      ], { initial: 'surgery', onSelect: (v) => { this.study = v; this.cite(this.citeStr()); this.report(); this.poke(); } });

      buttonRow(this.controlsEl, [
        { label: 'good-news frame', value: 'positive' },
        { label: 'bad-news frame', value: 'negative' },
      ], { initial: 'positive', onSelect: (v) => { this.frame = v; this.reveal = 0; this.report(); this.poke(); } });

      this.report();
    }

    citeStr() {
      return '2011 Kahneman - Thinking, Fast and Slow (ch.34, Frames and Reality)';
    }

    report() {
      const pos = this.frame === 'positive';
      if (this.study === 'surgery') {
        setReadout(this.readoutEl, [
          [[pos ? '“The one-month survival rate is 90%”' : '“There is 10% mortality in the first month”',
            pos ? 'green' : 'red']],
          [['chose surgery: ', ''], [pos ? '84%' : '50%', pos ? 'green' : 'red'],
           [' of physicians   —   identical statistics, opposite decision', '']],
          [['“Medical training is, evidently, no defense against the power of framing.”', 'yellow']],
        ]);
      } else {
        setReadout(this.readoutEl, [
          [[pos ? 'frame: 200 will be SAVED' : 'frame: 400 will DIE', pos ? 'green' : 'red']],
          [['most people pick ', ''],
           [pos ? 'the certain option' : 'the gamble', 'orange'],
           ['   —   yet A ≡ A′ and B ≡ B′', '']],
          [['Kahneman reports “a substantial majority” and “a large majority” — no percentages, so none are shown here.', '']],
        ]);
      }
    }

    update(dt) {
      this.t += dt;
      this.reveal = Math.min(1, this.reveal + dt * 0.7);
    }

    /* ---------------- drawing ---------------- */

    renderSurgery() {
      const { ctx, rc, w, h } = this;
      const pos = this.frame === 'positive';
      const col = pos ? COLORS.green : COLORS.red;
      const compact = w < 640;
      const pct = pos ? 84 : 50;

      label(ctx, 'the same trial data, described two ways', w / 2, compact ? 18 : 26,
        { color: COLORS.muted, size: compact ? 12 : 14, align: 'center' });

      // the sentence
      const sy = compact ? 56 : h * 0.24;
      rc.rectangle(w * 0.05, sy - 22, w * 0.9, compact ? 36 : 46,
        opts(5, { stroke: col, strokeWidth: 2 }));
      label(ctx, pos ? 'The one-month survival rate is 90%' : 'There is 10% mortality in the first month',
        w / 2, sy + 2, { color: col, size: compact ? 13 : 19, align: 'center' });

      // 100 patients as a 10x10 dot grid — identical in both frames
      const step = compact
        ? Math.min(13, (w * 0.62) / 10, (h * 0.30) / 10)
        : Math.min(19, (w * 0.34) / 10, (h * 0.42) / 10);
      const gx = compact ? (w - 9 * step) / 2 : w * 0.1;
      const gy = compact ? sy + 40 : h * 0.38;
      for (let i = 0; i < 100; i++) {
        const r = Math.floor(i / 10); const c = i % 10;
        const dead = i >= 90;
        ctx.fillStyle = dead ? COLORS.red : COLORS.green;
        ctx.globalAlpha = (dead === !pos) ? 1 : 0.28;
        ctx.beginPath();
        ctx.arc(gx + c * step, gy + r * step, step * 0.29, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const gEnd = gy + 10 * step;
      if (compact) {
        label(ctx, pos ? '90 survive (lit up)' : '10 die (lit up)', w / 2, gEnd + 6,
          { color: col, size: 12, align: 'center' });
        label(ctx, 'same 100 patients either way', w / 2, gEnd + 22,
          { color: COLORS.muted, size: 11.5, align: 'center' });
      } else {
        label(ctx, pos ? '90 survive (highlighted)' : '10 die (highlighted)', gx, gEnd + 6,
          { color: col, size: 13 });
        label(ctx, 'same 100 patients either way', gx, gEnd + 26,
          { color: COLORS.muted, size: 12.5 });
      }

      // choice bar — beside the grid when there is room, under it when there isn't
      const bx = compact ? w * 0.08 : w * 0.56;
      const by = compact ? gEnd + 48 : h * 0.42;
      const bw = compact ? w * 0.84 : w * 0.34;
      const bh = compact ? 22 : 30;
      rc.rectangle(bx, by, bw, bh, opts(9, { stroke: COLORS.ink, strokeWidth: 1.6 }));
      ctx.fillStyle = col; ctx.globalAlpha = 0.75;
      ctx.fillRect(bx + 2, by + 2, (bw - 4) * (pct / 100) * (0.35 + 0.65 * this.reveal), bh - 4);
      ctx.globalAlpha = 1;
      // ghost marker for the OTHER frame, so the gap is visible without toggling
      const other = pos ? 50 : 84;
      const ox2 = bx + 2 + (bw - 4) * (other / 100);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = pos ? COLORS.red : COLORS.green; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox2, by - 4); ctx.lineTo(ox2, by + bh + 4); ctx.stroke();
      ctx.restore();
      label(ctx, `${pct}% of physicians chose surgery`, bx, by - 8,
        { color: COLORS.ink, size: compact ? 12.5 : 14.5 });
      label(ctx, `dashed line = the other frame (${other}%)`, bx, by + bh + (compact ? 15 : 20),
        { color: pos ? COLORS.red : COLORS.green, size: compact ? 11.5 : 13 });

      if (compact) {
        label(ctx, '“Medical training is, evidently, no defense', w / 2, h - 26,
          { color: COLORS.yellow, size: 11.5, align: 'center' });
        label(ctx, 'against the power of framing.”', w / 2, h - 12,
          { color: COLORS.yellow, size: 11.5, align: 'center' });
      } else {
        label(ctx, '“Medical training is, evidently, no defense against the power of framing.”',
          w / 2, h - 26, { color: COLORS.yellow, size: 14.5, align: 'center' });
      }
    }

    renderAsian() {
      const { ctx, rc, w, h } = this;
      const pos = this.frame === 'positive';
      const compact = w < 640;
      const cols = 30; const rows = 20;

      label(ctx, '600 people. Two programmes. Pick one.', w / 2, compact ? 18 : 26,
        { color: COLORS.muted, size: compact ? 12 : 14, align: 'center' });

      // 600 people as 20x30 dots — always the same picture, only the paint changes
      const step = compact
        ? Math.min(9, (w * 0.88) / cols, (h * 0.32) / rows)
        : Math.min(13, (w * 0.5) / cols, (h * 0.55) / rows);
      const gx = compact ? (w - (cols - 1) * step) / 2 : w * 0.07;
      const gy = compact ? 36 : h * 0.22;
      for (let i = 0; i < 600; i++) {
        const r = Math.floor(i / cols); const c = i % cols;
        const saved = i < 200;
        ctx.fillStyle = saved ? COLORS.green : COLORS.red;
        ctx.globalAlpha = (saved === pos) ? 1 : 0.16;
        ctx.beginPath();
        ctx.arc(gx + c * step, gy + r * step, step * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const gEnd = gy + rows * step;
      const frameCol = pos ? COLORS.green : COLORS.red;
      if (compact) {
        label(ctx, pos ? 'A: 200 will be SAVED' : 'A′: 400 will DIE', w / 2, gEnd + 18,
          { color: frameCol, size: 13.5, align: 'center' });
        label(ctx, 'the picture never changed — only the paint', w / 2, gEnd + 34,
          { color: COLORS.muted, size: 11.5, align: 'center' });
      } else {
        label(ctx, pos ? 'programme A: 200 people will be SAVED' : 'programme A′: 400 people will DIE',
          gx, gEnd + 24, { color: frameCol, size: 16 });
        label(ctx, 'the picture never changed — only which dots we painted',
          gx, gEnd + 44, { color: COLORS.muted, size: 12.5 });
      }

      // the two options and where the majority goes
      const ox = compact ? w * 0.06 : w * 0.63;
      const oy = compact ? gEnd + 48 : h * 0.26;
      const obw = compact ? w * 0.88 : w * 0.31;
      const obh = compact ? 32 : 88;
      const ogap = compact ? 40 : 104;
      const boxes = [
        { t: pos ? 'A — save 200 for certain' : 'A′ — 400 die for certain', sure: true },
        { t: pos ? 'B — 1/3 chance all 600 saved' : 'B′ — 1/3 chance nobody dies', sure: false },
      ];
      boxes.forEach((b, i) => {
        const y = oy + i * ogap;
        const chosen = (pos && b.sure) || (!pos && !b.sure);
        const col = chosen ? COLORS.orange : COLORS.muted;
        rc.rectangle(ox, y, obw, obh, opts(20 + i, { stroke: col, strokeWidth: chosen ? 2.6 : 1.4 }));
        label(ctx, b.t, ox + 12, y + (compact ? 21 : 26), { color: col, size: compact ? 12.5 : 14 });
        if (!compact) {
          // the shape of the outcome: a solid certainty, or a 1/3–2/3 gamble
          const sx = ox + 12; const sy = y + 34; const sw = obw - 24; const sh = 12;
          ctx.fillStyle = col;
          if (b.sure) {
            ctx.globalAlpha = 0.6; ctx.fillRect(sx, sy, sw, sh); ctx.globalAlpha = 1;
            label(ctx, 'no gamble — this outcome, guaranteed', sx, sy + 26,
              { color: COLORS.muted, size: 11.5 });
          } else {
            ctx.globalAlpha = 0.6; ctx.fillRect(sx, sy, sw / 3 - 2, sh);
            ctx.globalAlpha = 0.16; ctx.fillRect(sx + sw / 3, sy, (sw * 2) / 3, sh);
            ctx.globalAlpha = 1;
            label(ctx, '1/3 chance   ·   2/3 chance of the opposite', sx, sy + 26,
              { color: COLORS.muted, size: 11.5 });
          }
          if (chosen) {
            label(ctx, '← most people choose this', ox + 12, y + 80,
              { color: COLORS.orange, size: 13 });
          }
        }
      });
      if (compact) {
        label(ctx, `most people choose ${pos ? 'the certain one' : 'the gamble'}`,
          w / 2, oy + ogap + obh + 18, { color: COLORS.orange, size: 12, align: 'center' });
        label(ctx, 'A ≡ A′ and B ≡ B′ — identical, yet the choice flips',
          w / 2, h - 12, { color: COLORS.yellow, size: 11.5, align: 'center' });
      } else {
        // Kahneman's reading of the reversal, in his own terms
        const ny = oy + 2 * ogap + 8;
        label(ctx, 'prospect theory:', ox, ny, { color: COLORS.muted, size: 12 });
        label(ctx, 'risk-averse when outcomes are good,', ox, ny + 18,
          { color: COLORS.muted, size: 11.5 });
        label(ctx, 'risk-seeking when they are bad', ox, ny + 34,
          { color: COLORS.muted, size: 11.5 });
        label(ctx, 'A ≡ A′   and   B ≡ B′   — the outcomes are identical,',
          w / 2, h - 32, { color: COLORS.yellow, size: 14, align: 'center' });
        label(ctx, 'and the preference still reverses',
          w / 2, h - 12, { color: COLORS.yellow, size: 14, align: 'center' });
      }
    }

    render() {
      if (this.study === 'surgery') this.renderSurgery();
      else this.renderAsian();
    }
  }

  A.register('framing', Framing);
})();
