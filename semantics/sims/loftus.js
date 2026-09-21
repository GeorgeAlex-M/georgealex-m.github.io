// Semantics Sim 1 — One verb, two memories (Loftus & Palmer, 1974).
//
// 45 students watched the SAME crash films. The only thing that differed was
// one verb inside the question they were asked. Their speed estimates moved
// with the verb — and a week later, the "smashed" group remembered broken
// glass that was never in the film.
//
// Accuracy notes:
//   Mean speed estimates (Experiment 1, mph): smashed 40.8, collided 39.3,
//   bumped 38.1, hit 34.0, contacted 31.8.  n = 45, 9 per verb.
//   Broken-glass "yes" one week later (Experiment 2): smashed 32%, hit 14%,
//   control (no verb question) 12%.  n = 150, 50 per group.
//   These figures are from the 1974 paper itself. The textbook in the library
//   (Spielman, Psychology 2e, p.279) reports only the qualitative result —
//   "much higher speed", "more than twice as likely" — so the sim shows the
//   paper's numbers and says where they come from.

(() => {
  const A = (window.Astro = window.Astro || {});
  const { Sim, opts, COLORS, label, stickFigure, buttonRow, actionButton, setReadout } = A;

  const VERBS = [
    { key: 'smashed',   mph: 40.8, glass: 32, shake: 1.0,  color: () => COLORS.red },
    { key: 'collided',  mph: 39.3, glass: null, shake: 0.8, color: () => COLORS.orange },
    { key: 'bumped',    mph: 38.1, glass: null, shake: 0.55, color: () => COLORS.yellow },
    { key: 'hit',       mph: 34.0, glass: 14, shake: 0.35, color: () => COLORS.cyan },
    { key: 'contacted', mph: 31.8, glass: null, shake: 0.12, color: () => COLORS.green },
  ];
  const CONTROL_GLASS = 12; // group never asked the speed question

  class Loftus extends Sim {
    init() {
      this.verbIdx = 0;
      this.week = false;      // showing the one-week-later question
      this.t = 0;
      this.shownMph = VERBS[0].mph;

      buttonRow(this.controlsEl, VERBS.map((v) => ({ label: v.key, value: v.key })), {
        initial: 'smashed',
        onSelect: (k) => {
          this.verbIdx = VERBS.findIndex((v) => v.key === k);
          this.cite('1974 Loftus, Palmer - Reconstruction of Automobile Destruction');
          this.report();
          this.poke();
        },
      });
      actionButton(this.controlsEl, 'one week later →', () => {
        this.week = !this.week;
        this.report();
        this.poke();
      });
      this.report();
    }

    get verb() { return VERBS[this.verbIdx]; }

    report() {
      const v = this.verb;
      const lines = [
        [['“About how fast were the cars going when they ', ''], [v.key, 'yellow'], [' each other?”', '']],
        [['mean estimate: ', ''], [`${v.mph.toFixed(1)} mph`, 'orange'],
         ['   —   same film, every group', '']],
      ];
      if (this.week) {
        lines.push([['one week later — “did you see any broken glass?” ', ''],
                    ['there was none in the film', 'red']]);
        if (v.glass !== null) {
          lines.push([[`said YES: `, ''], [`${v.glass}%`, v.key === 'smashed' ? 'red' : 'cyan'],
                      ['   (control group, never asked about speed: 12%)', '']]);
        } else {
          lines.push([['the glass follow-up was run for ', ''], ['smashed', 'red'], [' and ', ''],
                      ['hit', 'cyan'], [' only', '']]);
        }
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      // ease the dial towards the selected verb's mean
      this.shownMph += (this.verb.mph - this.shownMph) * Math.min(1, dt * 6);
    }

    /* ---------------- drawing ---------------- */

    car(x, y, w, h, color, seed, flip) {
      const { rc } = this;
      const o = opts(seed, { stroke: color, strokeWidth: 2 });
      rc.rectangle(x, y, w, h * 0.55, o);
      // cabin
      rc.rectangle(x + w * (flip ? 0.12 : 0.3), y - h * 0.3, w * 0.58, h * 0.34, opts(seed + 1, { stroke: color }));
      rc.circle(x + w * 0.24, y + h * 0.55, h * 0.42, opts(seed + 2, { stroke: color }));
      rc.circle(x + w * 0.78, y + h * 0.55, h * 0.42, opts(seed + 3, { stroke: color }));
    }

    render() {
      const { ctx, rc, w, h } = this;
      const v = this.verb;
      const col = v.color();
      const cx = w * 0.5;
      const roadY = h * 0.46;

      label(ctx, 'the film everyone saw — identical for every group', cx, 26,
        { color: COLORS.muted, size: 14, align: 'center' });

      // road
      this.cache.draw('road', (g) => g.line(w * 0.06, roadY + 34, w * 0.94, roadY + 34,
        opts(3, { stroke: COLORS.muted, strokeWidth: 1.6 })));

      // two cars meeting, shaken by the verb's intensity
      const jitter = Math.sin(this.t * 22) * v.shake * 3;
      const carW = Math.min(120, w * 0.17);
      const carH = 34;
      this.car(cx - carW - 16 + jitter, roadY, carW, carH, COLORS.cyan, 11, false);
      this.car(cx + 18 - jitter, roadY, carW, carH, COLORS.pink, 21, true);

      // impact marks scale with the verb
      const marks = Math.round(v.shake * 7);
      for (let i = 0; i < marks; i++) {
        const a = -Math.PI * 0.85 + (i / Math.max(1, marks - 1)) * Math.PI * 0.7;
        const r0 = 22; const r1 = 22 + 14 + v.shake * 22;
        rc.line(cx + Math.cos(a) * r0, roadY + 12 + Math.sin(a) * r0,
                cx + Math.cos(a) * r1, roadY + 12 + Math.sin(a) * r1,
                opts(40 + i, { stroke: col, strokeWidth: 1.7 }));
      }

      // the question, with the verb slot highlighted
      const qy = h * 0.76;
      const compact = w < 640;
      const qs = compact ? 12.5 : w < 800 ? 14 : 16;
      const qx = w * 0.06;
      // On a narrow canvas the question wraps, so the verb slot stays on screen.
      const head = compact ? 'when they' : '“About how fast were the cars going when they';
      if (compact) {
        label(ctx, '“About how fast were the cars going', qx, qy - qs - 7,
          { color: COLORS.ink, size: qs });
      }
      label(ctx, head, qx, qy, { color: COLORS.ink, size: qs });
      const pre = ctx.measureText(head).width;
      const vw = ctx.measureText(` ${v.key} `).width;
      rc.rectangle(qx + pre + 2, qy - qs - 1, vw + 8, qs + 8,
        opts(7, { stroke: col, strokeWidth: 1.8 }));
      label(ctx, v.key, qx + pre + 10, qy, { color: col, size: qs });
      label(ctx, 'each other?”', qx + pre + vw + 18, qy, { color: COLORS.ink, size: qs });

      // witness + speed dial
      const wx = w * 0.86;
      stickFigure(rc, wx, h * 0.58, { scale: 0.85, seed: 9, color: COLORS.muted });
      const dx = w * 0.86; const dy = h * 0.30; const dr = Math.min(44, w * 0.07);
      rc.circle(dx, dy, dr * 2, opts(31, { stroke: COLORS.ink, strokeWidth: 1.8 }));
      // needle: map 28..44 mph across 210°
      const A0 = Math.PI * 0.85; const SPAN = Math.PI * 1.3;
      const tmap = (this.shownMph - 28) / 16;
      const ang = A0 + tmap * SPAN;
      ctx.strokeStyle = COLORS.muted; ctx.lineWidth = 1.2;
      for (let m = 28; m <= 44; m += 4) {          // dial ticks, one every 4 mph
        const a = A0 + ((m - 28) / 16) * SPAN;
        ctx.beginPath();
        ctx.moveTo(dx + Math.cos(a) * dr * 0.82, dy + Math.sin(a) * dr * 0.82);
        ctx.lineTo(dx + Math.cos(a) * dr * 0.97, dy + Math.sin(a) * dr * 0.97);
        ctx.stroke();
      }
      label(ctx, '28', dx + Math.cos(A0) * dr * 0.66, dy + Math.sin(A0) * dr * 0.66 + 4,
        { color: COLORS.muted, size: 10.5, align: 'center' });
      label(ctx, '44', dx + Math.cos(A0 + SPAN) * dr * 0.66, dy + Math.sin(A0 + SPAN) * dr * 0.66 + 4,
        { color: COLORS.muted, size: 10.5, align: 'center' });
      ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(dx, dy);
      ctx.lineTo(dx + Math.cos(ang) * dr * 0.72, dy + Math.sin(ang) * dr * 0.72); ctx.stroke();
      label(ctx, `${this.shownMph.toFixed(1)}`, dx, dy + dr + 20,
        { color: col, size: 18, align: 'center' });
      label(ctx, 'mph estimated', dx, dy + dr + 38,
        { color: COLORS.muted, size: 12.5, align: 'center' });

      // All five means at once, so the whole result is visible without clicking
      // through every verb. Only where there is room for it.
      if (!compact) {
        const lx = w * 0.06; const ly = h * 0.12; const lw = w * 0.24; const rowH = 22;
        label(ctx, 'all five groups, same film', lx, ly - 10,
          { color: COLORS.muted, size: 12.5 });
        VERBS.forEach((vb, i) => {
          const y = ly + i * rowH;
          const on = i === this.verbIdx;
          const frac = (vb.mph - 28) / 16;
          ctx.fillStyle = vb.color();
          ctx.globalAlpha = on ? 0.85 : 0.3;
          ctx.fillRect(lx + 66, y, Math.max(3, (lw - 66) * frac), 12);
          ctx.globalAlpha = 1;
          label(ctx, vb.key, lx, y + 11,
            { color: on ? vb.color() : COLORS.muted, size: on ? 13 : 12 });
          label(ctx, vb.mph.toFixed(1), lx + lw + 6, y + 11,
            { color: on ? vb.color() : COLORS.muted, size: on ? 13 : 12 });
        });
        label(ctx, '45 students · 9 per verb', lx, ly + 5 * rowH + 14,
          { color: COLORS.muted, size: 11.5 });
      }

      // one-week-later panel
      if (this.week) {
        const py = h * 0.86;
        rc.rectangle(qx, py - 16, compact ? w * 0.88 : w * 0.62, 44,
          opts(51, { stroke: COLORS.red, strokeWidth: 1.6 }));
        label(ctx, compact ? 'a week later: “any broken glass?”'
          : 'one week later:  “did you see any broken glass?”', qx + 8, py + 2,
        { color: COLORS.red, size: compact ? 12.5 : 14.5 });
        const g = v.glass;
        const txt = g === null
          ? (compact ? 'follow-up: smashed 32% · hit 14% · control 12%'
            : 'glass follow-up: smashed 32%  ·  hit 14%  ·  control 12%')
          : (compact ? `said YES: ${g}%   (control: ${CONTROL_GLASS}%)`
            : `said YES: ${g}%   (control, never asked about speed: ${CONTROL_GLASS}%)`);
        label(ctx, txt, qx + 8, py + 22, { color: COLORS.muted, size: compact ? 11.5 : 13 });
      } else {
        label(ctx, 'means from Loftus & Palmer 1974', qx, h - 12,
          { color: COLORS.muted, size: 11.5 });
      }
    }
  }

  A.register('loftus', Loftus);
})();
