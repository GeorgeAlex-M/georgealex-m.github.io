// Semantics Sim 4 — The boundary your language drew (Winawer et al., 2007).
//
// Russian has no single basic word for "blue". Lighter blues are goluboy
// (голубой), darker blues are siniy (синий) — two separate basic colour
// terms, the way English treats "red" and "pink".
//
// Task: three blue squares. One on top, two below. Press as fast as you can
// to say which of the bottom two is the same colour as the top one.
//
// Result (Sedivy, Language in Mind, ch.13): "if a trial contained two colors
// that were very similar but sat on opposite sides of the siniy/goluboy fence,
// the subjects' responses were faster than if the two colors would both be
// classified as either siniy or goluboy." English speakers showed no such
// advantage. The Russian advantage disappeared when subjects had to hold an
// EIGHT-DIGIT number in mind during the trial, and came back when the extra
// load was a SPATIAL grid pattern instead — evidence that the language system
// itself was doing work online, in a task where nobody was asked to name
// anything.
//
// Stimulus detail from Sedivy: the study used 20 blue stimuli, with the
// goluboy/siniy boundary "typically occurring between stimuli 8 and 9" —
// hence the 20-swatch ramp and the boundary at 8.5/20 below.
//
// Accuracy note: the response-time bars here are ILLUSTRATIVE. Sedivy reports
// the direction and the interference dissociation, not per-condition
// millisecond values, so no millisecond numbers are shown. Labelled on canvas.

(() => {
  const A = (window.Astro = window.Astro || {});
  const { Sim, opts, COLORS, label, slider, buttonRow, actionButton, setReadout } = A;

  const N_STIM = 20;                    // the study's 20 blue stimuli
  const BOUNDARY = 8.5 / N_STIM;        // goluboy | siniy, "between stimuli 8 and 9"
  const LIGHT = [168, 214, 250];        // goluboy end
  const DARK = [12, 36, 128];           // siniy end

  function blue(t) {
    const c = t <= 0 ? LIGHT : t >= 1 ? DARK : [
      Math.round(LIGHT[0] + (DARK[0] - LIGHT[0]) * t),
      Math.round(LIGHT[1] + (DARK[1] - LIGHT[1]) * t),
      Math.round(LIGHT[2] + (DARK[2] - LIGHT[2]) * t),
    ];
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  const DIGITS = '3 8 1 4 7 2 9 5';     // the study's eight-digit memory load

  class BlueBound extends Sim {
    init() {
      this.pos = BOUNDARY;     // centre of the pair on the ramp — start on the line
      this.sep = 0.09;         // perceptual distance between the two squares
      this.interf = 'none';
      this.leftIsTarget = true;
      this.t = 0;
      this.shown = [0, 0];     // eased bar lengths: russian, english

      // The label describes where the PAIR sits, not just its centre, so it has to
      // account for the separation slider too — hence the cross-refresh below.
      const where = (v, sep) => {
        const a = v - sep / 2; const b = v + sep / 2;
        if ((a < BOUNDARY) !== (b < BOUNDARY)) return 'straddling the line';
        return b < BOUNDARY ? 'both in the light blues' : 'both in the dark blues';
      };
      this.posSlider = slider(this.controlsEl, {
        label: 'where on the blue ramp',
        min: 0.12, max: 0.88, step: 0.005, value: BOUNDARY,
        format: (v) => where(v, this.sep),
        oninput: (v) => { this.pos = v; this.report(); this.poke(); },
      });
      this.sepSlider = slider(this.controlsEl, {
        label: 'how different the two squares are',
        min: 0.05, max: 0.22, step: 0.005, value: 0.09,
        format: (v) => (v < 0.10 ? 'barely' : v < 0.17 ? 'a little' : 'clearly'),
        oninput: (v) => {
          this.sep = v;
          this.posSlider.set(this.pos); // the pair may have just crossed the line
          this.report();
          this.poke();
        },
      });

      buttonRow(this.controlsEl, [
        { label: 'no second task', value: 'none' },
        { label: 'verbal load (hold 8 digits)', value: 'verbal' },
        { label: 'spatial load (hold a pattern)', value: 'spatial' },
      ], {
        initial: 'none',
        onSelect: (v) => {
          this.interf = v;
          this.cite('2007 Winawer et al. - Russian Blues Reveal Effects of Language on Color Discrimination');
          this.report();
          this.poke();
        },
      });

      actionButton(this.controlsEl, 'new trial', () => {
        this.leftIsTarget = !this.leftIsTarget;
        this.poke();
      });
      actionButton(this.controlsEl, 'put the pair across the line', () => {
        this.pos = BOUNDARY; this.posSlider.set(BOUNDARY);
        this.report(); this.poke();
      });

      this.report();
    }

    /* ---------------- the model ---------------- */

    get a() { return Math.max(0.02, this.pos - this.sep / 2); }
    get b() { return Math.min(0.98, this.pos + this.sep / 2); }
    get crosses() { return (this.a < BOUNDARY) !== (this.b < BOUNDARY); }

    // Illustrative relative response times, 0..1 (longer bar = slower).
    times() {
      // both groups are slower when the two squares are more similar
      let base = 0.42 + 0.55 * (0.22 - this.sep) / 0.17;
      if (this.interf !== 'none') base += 0.10;   // any dual task costs time
      // Sedivy: the boundary helped most when the two colours were "very
      // similar" — so the advantage grows as the separation shrinks.
      const helped = this.crosses && this.interf !== 'verbal';
      const adv = 0.06 + 0.14 * (0.22 - this.sep) / 0.17;
      const ru = base - (helped ? adv : 0);
      return [Math.max(0.08, ru), Math.max(0.08, base)];
    }

    report() {
      const cross = this.crosses;
      const cat = this.b < BOUNDARY ? 'both are голубой (goluboy)'
        : this.a >= BOUNDARY ? 'both are синий (siniy)'
          : 'one голубой, one синий — the pair straddles the line';
      const lines = [
        [['the pair: ', ''], [cat, cross ? 'green' : 'cyan']],
        [['English speaker: ', ''], ['no boundary here — “blue” either way', 'pink']],
      ];
      if (this.interf === 'verbal') {
        lines.push([['Russian speaker + verbal load: ', ''],
          ['the category advantage disappears', 'red'],
          [' — the words are busy holding digits', '']]);
      } else if (this.interf === 'spatial') {
        lines.push([['Russian speaker + spatial load: ', ''],
          ['the category advantage survives', 'green'],
          [' — a non-verbal task does not block it', '']]);
      } else if (cross) {
        lines.push([['Russian speaker: ', ''], ['faster', 'green'],
          [' — the two squares have different names', '']]);
      } else {
        lines.push([['Russian speaker: ', ''], ['no advantage', 'orange'],
          [' — one name covers both squares', '']]);
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      const [ru, en] = this.times();
      this.shown[0] += (ru - this.shown[0]) * Math.min(1, dt * 5);
      this.shown[1] += (en - this.shown[1]) * Math.min(1, dt * 5);
    }

    /* ---------------- drawing ---------------- */

    swatch(x, y, s, t, seed) {
      const { ctx, rc } = this;
      ctx.fillStyle = blue(t);
      ctx.fillRect(x, y, s, s);
      rc.rectangle(x, y, s, s, opts(seed, { stroke: COLORS.ink, strokeWidth: 1.6 }));
    }

    // Which of the study's 20 numbered stimuli a ramp position corresponds to.
    static stimulus(t) { return Math.round(t * (N_STIM - 1)) + 1; }

    ramp(ST, SH, compact) {
      const { ctx, rc, w } = this;
      const x0 = w * 0.07; const x1 = w * 0.93; const n = N_STIM;
      const cw = (x1 - x0) / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = blue(i / (n - 1));
        ctx.fillRect(x0 + i * cw, ST, cw + 0.6, SH);
      }
      rc.rectangle(x0, ST, x1 - x0, SH, opts(3, { stroke: COLORS.ink, strokeWidth: 1.6 }));

      // the boundary Russian draws and English does not
      const bx = x0 + (x1 - x0) * BOUNDARY;
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, ST - 14); ctx.lineTo(bx, ST + SH + 8); ctx.stroke();
      ctx.restore();

      label(ctx, 'голубой  goluboy', x0 + (bx - x0) / 2, ST - 9,
        { color: COLORS.ink, size: compact ? 11.5 : 15, align: 'center' });
      label(ctx, 'синий  siniy', bx + (x1 - bx) / 2, ST - 9,
        { color: COLORS.ink, size: compact ? 11.5 : 15, align: 'center' });

      // Where the two test squares sit — a labelled pin each, so the ramp and
      // the squares below read as one picture instead of two.
      // The pins run left-to-right in the same order as the two squares below,
      // so they need no "left"/"right" wording — just which stimulus and which
      // name it falls under.
      const cross = this.crosses;
      const pinY = ST + SH;
      const tagSize = compact ? 10.5 : 12.5;
      const tags = [this.a, this.b].map((t) => ({
        t,
        mx: x0 + (x1 - x0) * t,
        light: t < BOUNDARY,
        text: compact
          ? `#${BlueBound.stimulus(t)}`
          : `#${BlueBound.stimulus(t)} ${t < BOUNDARY ? 'голубой' : 'синий'}`,
      }));
      ctx.font = `${tagSize}px ${A.FONT_HAND}`;
      tags.forEach((g) => { g.tw = ctx.measureText(g.text).width; });
      // Stagger the second tag downwards only when the two would overprint.
      const overlap = (tags[1].mx - tags[0].mx) < (tags[0].tw + tags[1].tw) / 2 + 8;

      tags.forEach((g, i) => {
        const col = cross ? (g.light ? COLORS.cyan : COLORS.pink) : COLORS.orange;
        const drop = overlap && i === 1 ? (compact ? 15 : 17) : 0;
        rc.line(g.mx, pinY + 1, g.mx, pinY + 12 + drop,
          opts(60 + i, { stroke: col, strokeWidth: 2.2 }));
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(g.mx, pinY + 14 + drop, 3.4, 0, Math.PI * 2);
        ctx.fill();
        // keep the tag inside the canvas even when its pin sits at an edge
        const tx = Math.max(g.tw / 2 + 4, Math.min(w - g.tw / 2 - 4, g.mx));
        label(ctx, g.text, tx, pinY + drop + (compact ? 28 : 30),
          { color: col, size: tagSize, align: 'center' });
      });

      label(ctx, compact ? 'English: all of this is “blue”'
        : 'English draws no line here — all twenty of these are “blue”',
      (x0 + x1) / 2, ST + SH + (compact ? 58 : 64),
      { color: COLORS.muted, size: compact ? 10.5 : 13, align: 'center' });

      return { x0, x1 };
    }

    interference(x, y, bw = 132) {
      const { ctx, rc } = this;
      if (this.interf === 'none') return;
      const verbal = this.interf === 'verbal';
      const bh = 46;
      rc.rectangle(x, y, bw, bh, opts(71, { stroke: verbal ? COLORS.red : COLORS.green, strokeWidth: 1.7 }));
      label(ctx, verbal ? 'hold in mind:' : 'hold in mind:', x + 8, y + 15,
        { color: COLORS.muted, size: 12 });
      if (verbal) {
        label(ctx, DIGITS, x + 8, y + 36,
          { color: COLORS.red, size: Math.min(16, (bw - 18) / 8.2) });
      } else {
        // a 3x3 spatial pattern
        const s = 9; const gx = x + 10; const gy = y + 21;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const on = (r * 3 + c) % 4 === 1;
            ctx.strokeStyle = COLORS.green; ctx.lineWidth = 1.2;
            ctx.strokeRect(gx + c * (s + 3), gy + r * (s + 3), s, s);
            if (on) { ctx.fillStyle = COLORS.green; ctx.fillRect(gx + c * (s + 3), gy + r * (s + 3), s, s); }
          }
        }
        label(ctx, 'a pattern,', x + 56, y + 27, { color: COLORS.green, size: 12.5 });
        label(ctx, 'not words', x + 56, y + 41, { color: COLORS.green, size: 12.5 });
      }
    }

    bar(x, y, len, maxW, name, colour, seed, note, compact) {
      const { ctx, rc } = this;
      const bh = compact ? 18 : 24;
      label(ctx, name, x, y - 6, { color: colour, size: compact ? 12 : 15 });
      rc.rectangle(x, y, maxW, bh, opts(seed, { stroke: COLORS.muted, strokeWidth: 1.3 }));
      ctx.fillStyle = colour; ctx.globalAlpha = 0.75;
      ctx.fillRect(x + 2, y + 2, Math.max(4, (maxW - 4) * len), bh - 4);
      ctx.globalAlpha = 1;
      if (note) label(ctx, note, x, y + bh + 16, { color: colour, size: 13 });
    }

    render() {
      const { ctx, rc, w, h } = this;
      const compact = w < 640;

      // No heading here: the section's own <h2> already says what this is, and
      // a centred line at the top collided with the two category names.
      const ST = compact ? 26 : 34;
      const SH = compact ? 22 : 32;
      this.ramp(ST, SH, compact);

      // --- the trial: reference square above, two candidates below ---
      const TY = ST + SH + (compact ? 66 : 84);
      const Q = compact ? 36 : 56;
      const cx = compact ? w * 0.30 : w * 0.25;
      const target = this.leftIsTarget ? this.a : this.b;
      this.swatch(cx - Q / 2, TY, Q, target, 81);

      const capQ = TY + Q + (compact ? 16 : 20);
      label(ctx, compact ? 'which one below is the same?'
        : 'which of the two below is the same colour?',
      cx, capQ, { color: COLORS.ink, size: compact ? 11.5 : 14, align: 'center' });

      const cy = capQ + (compact ? 10 : 12);
      const lx = cx - Q - (compact ? 10 : 14);
      const rx = cx + (compact ? 10 : 14);
      this.swatch(lx, cy, Q, this.a, 82);
      this.swatch(rx, cy, Q, this.b, 83);
      // Sedivy: subjects pressed a button on the left or the right
      label(ctx, 'press ←', lx + Q / 2, cy + Q + (compact ? 14 : 17),
        { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });
      label(ctx, 'press →', rx + Q / 2, cy + Q + (compact ? 14 : 17),
        { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });

      const capY = cy + Q + (compact ? 26 : 40);
      label(ctx, this.crosses
        ? (compact ? 'two names → two categories' : 'two different names → two categories')
        : 'one name covers both squares',
      cx, capY, { color: this.crosses ? COLORS.green : COLORS.orange,
        size: compact ? 11 : 13.5, align: 'center' });

      // the dual-task card: beside the trial on a phone, under it on a wide canvas
      this.interference(compact ? w * 0.60 : cx - 66,
        compact ? TY - 4 : capY + 16, compact ? w * 0.36 : 132);

      // --- relative response times ---
      const bx = compact ? w * 0.08 : w * 0.53;
      const maxW = compact ? w * 0.84 : w * 0.40;
      // starts below the ramp's "all twenty of these are blue" caption, which
      // runs across the full width
      const b1 = compact ? capY + 22 : TY + 10;
      const b2 = compact ? b1 + 36 : b1 + 74;
      this.bar(bx, b1, this.shown[0], maxW, 'Russian speaker', COLORS.cyan, 91,
        !compact && this.crosses && this.interf !== 'verbal' ? 'faster — the boundary helps' : null,
        compact);
      this.bar(bx, b2, this.shown[1], maxW, 'English speaker', COLORS.pink, 92,
        compact ? null : 'no boundary to help', compact);

      // The bottom strip is left clear for the engine's source chip, so these
      // notes sit one line higher than the canvas floor.
      if (compact) {
        label(ctx, 'longer bar = slower  ·  times illustrative, not measured ms',
          w / 2, h - 30, { color: COLORS.muted, size: 10.5, align: 'center' });
      } else {
        label(ctx, 'longer bar = slower answer', bx, b2 + 56,
          { color: COLORS.muted, size: 12.5 });

        // The whole result in three rows — this dissociation is the reason the
        // study counts as evidence about language rather than about practice.
        const py = b2 + 88;
        label(ctx, 'the Russian advantage, condition by condition:', bx, py,
          { color: COLORS.muted, size: 12 });
        [['no extra task', 'boundary helps', 'none', COLORS.green],
          ['+ eight digits', 'advantage gone', 'verbal', COLORS.red],
          ['+ a grid pattern', 'advantage back', 'spatial', COLORS.green],
        ].forEach((row, i) => {
          const y = py + 20 + i * 18;
          const on = this.interf === row[2];
          ctx.globalAlpha = on ? 1 : 0.42;
          label(ctx, row[0], bx, y, { color: COLORS.ink, size: 12 });
          label(ctx, `→  ${row[1]}`, bx + maxW * 0.46, y, { color: row[3], size: 12 });
          ctx.globalAlpha = 1;
        });
        label(ctx, 'response times illustrative — Sedivy reports the direction and the '
          + 'verbal/spatial dissociation, not milliseconds',
        w * 0.06, h - 30, { color: COLORS.muted, size: 11.5 });
      }
    }
  }

  A.register('bluebound', BlueBound);
})();
