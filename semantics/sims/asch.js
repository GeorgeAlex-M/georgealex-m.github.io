// Semantics Sim 3 — Same six words, different person (Asch, 1946).
//
// Alan and Ben are described by the SAME six adjectives. Only the order
// differs. Most readers judge Alan far more favourably.
//
// Kahneman, Thinking, Fast and Slow, ch.7 ("A Machine for Jumping to
// Conclusions"): "The initial traits in the list change the very meaning of
// the traits that appear later. The stubbornness of an intelligent person is
// seen as likely to be justified and may actually evoke respect, but
// intelligence in an envious and stubborn person makes him more dangerous."
//
// The impression curve here is illustrative, not measured — Asch's paper
// reports the direction and the reinterpretation, not a per-word score.
// Labelled as such on the canvas.

(() => {
  const A = (window.Astro = window.Astro || {});
  const { Sim, opts, COLORS, label, stickFigure, doodleArrow, slider, actionButton, setReadout } = A;

  const TRAITS = [
    { w: 'intelligent', v: +1.0 },
    { w: 'industrious', v: +0.8 },
    { w: 'impulsive',   v: -0.1 },
    { w: 'critical',    v: -0.3 },
    { w: 'stubborn',    v: -0.6 },
    { w: 'envious',     v: -0.9 },
  ];

  // How a later trait is read depends on what came first: the running
  // impression bends the value of everything that follows.
  const BEND = 0.55;

  class Asch extends Sim {
    init() {
      this.n = 0;          // adjectives revealed, 0..6
      this.auto = false;
      this.t = 0;
      this.shown = [0, 0]; // eased meters for Alan / Ben

      this.slider = slider(this.controlsEl, {
        label: 'words revealed',
        min: 0, max: 6, step: 1, value: 0,
        format: (v) => `${Math.round(v)} / 6`,
        oninput: (v) => { this.n = Math.round(v); this.auto = false; this.report(); this.poke(); },
      });
      actionButton(this.controlsEl, '▶ reveal one by one', () => {
        this.auto = true; this.n = 0; this.slider.set(0);
        this.cite('1946 Asch - Forming Impressions of Personality');
        this.poke();
      });
      actionButton(this.controlsEl, 'reset', () => {
        this.auto = false; this.n = 0; this.slider.set(0); this.report(); this.poke();
      });
      this.report();
    }

    // running impression after k traits, for a given order
    impression(order, k) {
      let acc = 0;
      for (let i = 0; i < k; i++) {
        const tr = order[i];
        // a trait read in the light of the impression so far
        const bent = tr.v + BEND * acc * (tr.v < 0 ? 1 : 0.25);
        acc += bent / (i + 1.4);
      }
      return Math.max(-1, Math.min(1, acc));
    }

    report() {
      const fwd = TRAITS;
      const rev = [...TRAITS].reverse();
      const a = this.impression(fwd, this.n);
      const b = this.impression(rev, this.n);
      const words = TRAITS.slice(0, this.n).map((t) => t.w).join(' — ') || '(nothing yet)';
      const verdict = (v) => (this.n === 0 ? ['nothing yet', 'orange']
        : v > 0 ? ['favourable', 'green'] : ['unfavourable', 'red']);
      setReadout(this.readoutEl, [
        [['Alan hears: ', ''], [words, 'cyan']],
        [['Ben hears the same six words, in reverse order', 'pink']],
        [['impression — Alan ', ''], verdict(a), ['   ·   Ben ', ''], verdict(b)],
      ]);
    }

    update(dt) {
      this.t += dt;
      if (this.auto && this.n < 6) {
        this._acc = (this._acc || 0) + dt;
        if (this._acc > 0.85) { this._acc = 0; this.n += 1; this.slider.set(this.n); this.report(); }
      }
      const a = this.impression(TRAITS, this.n);
      const b = this.impression([...TRAITS].reverse(), this.n);
      this.shown[0] += (a - this.shown[0]) * Math.min(1, dt * 5);
      this.shown[1] += (b - this.shown[1]) * Math.min(1, dt * 5);
    }

    /* ---------------- drawing ---------------- */

    // Layout scales with the canvas: 480px tall on desktop, 360 on phones.
    layout() {
      const h = this.h;
      const compact = h < 440;
      const listY = compact ? 110 : 150;
      const rowH = compact ? 19 : 26;
      return {
        compact,
        nameY: compact ? 34 : 52,
        headY: compact ? 60 : 84,
        figScale: compact ? 0.66 : 0.9,
        wordSize: compact ? 13.5 : 16,
        listY,
        rowH,
        meterY: listY + 6 * rowH + (compact ? 14 : 18),
      };
    }

    person(x, name, order, meter, seed, accent) {
      const { ctx, rc } = this;
      const L = this.layout();
      const colW = Math.min(210, this.w * 0.32);

      label(ctx, name, x, L.nameY, { color: accent, size: L.compact ? 17 : 20, align: 'center' });
      stickFigure(rc, x, L.headY, { scale: L.figScale, seed, color: accent });

      // the six words, revealed in this person's order
      order.forEach((tr, i) => {
        const on = i < this.n;
        const y = L.listY + i * L.rowH;
        ctx.globalAlpha = on ? 1 : 0.16;
        label(ctx, tr.w, x, y, {
          color: on ? (tr.v >= 0 ? COLORS.green : COLORS.red) : COLORS.muted,
          size: L.wordSize, align: 'center',
        });
        ctx.globalAlpha = 1;
      });

      // impression meter
      const my = L.meterY;
      const mw = colW;
      rc.rectangle(x - mw / 2, my, mw, 22, opts(seed + 5, { stroke: COLORS.ink, strokeWidth: 1.5 }));
      const mid = x;
      const val = meter; // -1..1
      const blank = this.n === 0;
      const col = blank ? COLORS.muted : val >= 0 ? COLORS.green : COLORS.red;
      ctx.fillStyle = col; ctx.globalAlpha = 0.75;
      const half = (mw / 2 - 3) * Math.abs(val);
      if (val >= 0) ctx.fillRect(mid, my + 3, half, 16);
      else ctx.fillRect(mid - half, my + 3, half, 16);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = COLORS.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mid, my); ctx.lineTo(mid, my + 22); ctx.stroke();
      label(ctx, blank ? 'no impression yet' : val >= 0 ? 'favourable' : 'unfavourable',
        x, my + (L.compact ? 34 : 42), { color: col, size: L.compact ? 12.5 : 14, align: 'center' });
    }

    render() {
      const { ctx, w, h } = this;
      const L = this.layout();
      const narrow = w < 620;

      label(ctx, 'the same six adjectives — only the order differs', w / 2, L.compact ? 16 : 24,
        { color: COLORS.muted, size: L.compact ? 12.5 : 14, align: 'center' });

      this.person(w * 0.27, 'Alan', TRAITS, this.shown[0], 9, COLORS.cyan);
      this.person(w * 0.73, 'Ben', [...TRAITS].reverse(), this.shown[1], 19, COLORS.pink);

      // The pivot: one word, two readings. Drawn in the gap between the columns
      // once "stubborn" is out on both sides, where there is room for it.
      if (this.n >= 5 && !narrow && !L.compact) {
        const { rc } = this;
        const px = w / 2; const py = L.listY + 2 * L.rowH;
        const bw = Math.min(150, w * 0.17);
        rc.rectangle(px - bw / 2, py - 22, bw, 34,
          opts(41, { stroke: COLORS.yellow, strokeWidth: 2 }));
        label(ctx, 'stubborn', px, py, { color: COLORS.yellow, size: 17, align: 'center' });
        label(ctx, 'the same word', px, py + 30, { color: COLORS.muted, size: 12, align: 'center' });
        doodleArrow(rc, px - bw / 2 - 6, py + 2, px - bw / 2 - 42, py - 24,
          { color: COLORS.cyan, seed: 42, strokeWidth: 1.6 });
        doodleArrow(rc, px + bw / 2 + 6, py + 2, px + bw / 2 + 42, py - 24,
          { color: COLORS.pink, seed: 43, strokeWidth: 1.6 });
      }

      // the pivot word explained, once "stubborn" is out on both sides
      if (this.n >= 5) {
        const y = h - (L.compact ? 58 : 74);
        label(ctx, 'the word “stubborn” did not change — its meaning did:', w / 2, y,
          { color: COLORS.yellow, size: narrow ? 12.5 : 14.5, align: 'center' });
        label(ctx, narrow ? 'here: “evokes respect”' : 'in an intelligent person it “may actually evoke respect”',
          w * 0.27, y + (L.compact ? 18 : 22),
          { color: COLORS.cyan, size: narrow ? 11.5 : 13, align: 'center' });
        label(ctx, narrow ? 'here: “more dangerous”' : 'in an envious person it makes him “more dangerous”',
          w * 0.73, y + (L.compact ? 18 : 22),
          { color: COLORS.pink, size: narrow ? 11.5 : 13, align: 'center' });
      }

      label(ctx, narrow ? 'meter illustrative — Asch reports direction, not scores'
        : 'meter is illustrative — Asch reports the direction, not a per-word score',
      w / 2, h - 10, { color: COLORS.muted, size: 11.5, align: 'center' });
    }
  }

  A.register('asch', Asch);
})();
