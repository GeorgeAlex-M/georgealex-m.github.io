// Semantics Sim 4a — Walking through the Russian blues experiment, one step
// at a time, before you get to play with it.
//
// Everything drawn here comes from Sedivy, Language in Mind (ch.13), on
// Winawer et al. (2007):
//   · Russian has two basic colour terms where English has one: goluboy
//     (light blue) and siniy (dark blue).
//   · 20 blue stimuli; the goluboy/siniy boundary falls "typically ...
//     between stimuli 8 and 9".
//   · The task: three squares, one on top and two below; press a button on
//     the LEFT if the lower-left square matches the top one, on the RIGHT if
//     the lower-right one does. Speeded — reaction time is the measure.
//   · Result: "if a trial contained two colors that were very similar but sat
//     on opposite sides of the siniy/goluboy fence, the subjects' responses
//     were faster than if the two colors would both be classified as either
//     siniy or goluboy." English speakers showed no such advantage.
//   · The advantage vanished under an eight-digit verbal memory load and
//     returned under a spatial grid-pattern load of comparable difficulty.
//
// The red/pink opening is my own analogy, not part of the study — it is
// labelled as an analogy on the canvas. All response-time bars are
// illustrative: Sedivy reports direction and dissociation, not milliseconds.

(() => {
  const A = (window.Astro = window.Astro || {});
  const { Sim, opts, COLORS, label, doodleArrow, buttonRow, actionButton, setReadout } = A;

  const N_STIM = 20;
  const BOUNDARY = 8.5 / N_STIM;

  const ramp = (c0, c1) => (t) => {
    const u = Math.max(0, Math.min(1, t));
    return `rgb(${Math.round(c0[0] + (c1[0] - c0[0]) * u)},`
      + `${Math.round(c0[1] + (c1[1] - c0[1]) * u)},`
      + `${Math.round(c0[2] + (c1[2] - c0[2]) * u)})`;
  };
  const blue = ramp([168, 214, 250], [12, 36, 128]);
  const pink = ramp([250, 190, 215], [150, 15, 40]);

  const STEPS = [
    {
      key: '1',
      title: 'you already have one of these lines',
      say: [
        ['English splits one colour band in two: ', ''], ['pink', 'pink'], [' and ', ''],
        ['red', 'red'], ['. Not “light red” and “dark red” — two separate words.', ''],
      ],
    },
    {
      key: '2',
      title: 'Russian has that line inside blue',
      say: [
        ['Lighter blues are ', ''], ['голубой (goluboy)', 'cyan'], [', darker ones are ', ''],
        ['синий (siniy)', 'cyan'], ['. A Russian speaker has to pick one; an English speaker never does.', ''],
      ],
    },
    {
      key: '3',
      title: 'the task itself',
      say: [
        ['Three squares. One of the bottom two is ', ''], ['identical', 'green'],
        [' to the top one. Press left or right, as fast as you can — what is measured is ', ''],
        ['milliseconds', 'orange'], [', not whether you got it right.', ''],
      ],
    },
    {
      key: '4',
      title: 'the two kinds of trial',
      say: [
        ['Same physical gap in both rows — two steps along the ramp. ', ''],
        ['Only the naming differs.', 'yellow'],
        [' Russian speakers answer faster in the second one; English speakers show no difference.', ''],
      ],
    },
    {
      key: '5',
      title: 'why it counts as evidence about language',
      say: [
        ['Add a second task. A ', ''], ['verbal', 'red'], [' load kills the advantage; an equally hard ', ''],
        ['spatial', 'green'], [' load leaves it alone. So the language system was in the loop, live.', ''],
      ],
    },
    {
      key: '6',
      title: 'what it does NOT show',
      say: [
        ['Russians do not see colours English speakers cannot. Everyone sees every shade. ', ''],
        ['The effect is tens of milliseconds — not a different visual world.', 'yellow'],
      ],
    },
  ];

  class BlueExplain extends Sim {
    init() {
      this.step = 0;
      this.t = 0;

      this.row = buttonRow(this.controlsEl,
        STEPS.map((s, i) => ({ label: `${i + 1}`, value: i })),
        { initial: 0, onSelect: (i) => this.go(i) });

      actionButton(this.controlsEl, 'next step →', () => this.go((this.step + 1) % STEPS.length));
      actionButton(this.controlsEl, 'start over', () => this.go(0));

      this.report();
    }

    go(i) {
      this.step = i;
      this.row.select(i);
      if (i === STEPS.length - 1 || i === 4) {
        this.cite('2007 Winawer et al. - Russian Blues Reveal Effects of Language on Color Discrimination');
      }
      this.report();
      this.poke();
    }

    report() {
      const s = STEPS[this.step];
      setReadout(this.readoutEl, [
        [[`step ${this.step + 1} of ${STEPS.length} — `, ''], [s.title, 'yellow']],
        s.say,
      ]);
    }

    update(dt) { this.t += dt; }

    /* ---------------- drawing helpers ---------------- */

    get compact() { return this.w < 640; }

    // A named colour band with a dashed category line through it.
    band(y, hgt, colFn, leftName, rightName, boundary, underNote) {
      const { ctx, rc, w } = this;
      const c = this.compact;
      const x0 = w * 0.07; const x1 = w * 0.93;
      const step = (x1 - x0) / N_STIM;
      for (let i = 0; i < N_STIM; i++) {
        ctx.fillStyle = colFn(i / (N_STIM - 1));
        ctx.fillRect(x0 + i * step, y, step + 0.6, hgt);
      }
      rc.rectangle(x0, y, x1 - x0, hgt, opts(3, { stroke: COLORS.ink, strokeWidth: 1.6 }));

      const bx = x0 + (x1 - x0) * boundary;
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, y - 12); ctx.lineTo(bx, y + hgt + 12); ctx.stroke();
      ctx.restore();

      label(ctx, leftName, x0 + (bx - x0) / 2, y - 9,
        { color: COLORS.ink, size: c ? 12 : 15, align: 'center' });
      label(ctx, rightName, bx + (x1 - bx) / 2, y - 9,
        { color: COLORS.ink, size: c ? 12 : 15, align: 'center' });
      if (underNote) {
        label(ctx, underNote, (x0 + x1) / 2, y + hgt + 22,
          { color: COLORS.muted, size: c ? 11 : 13, align: 'center' });
      }
      return { x0, x1, step, bx };
    }

    swatch(x, y, s, colour, seed) {
      const { ctx, rc } = this;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, s, s);
      rc.rectangle(x, y, s, s, opts(seed, { stroke: COLORS.ink, strokeWidth: 1.5 }));
    }

    rtBar(x, y, wdt, len, colour, name, seed) {
      const { ctx, rc } = this;
      const c = this.compact;
      const bh = c ? 13 : 16;
      label(ctx, name, x, y + bh - 2, { color: colour, size: c ? 10.5 : 12 });
      const bx = x + (c ? 88 : 110);
      rc.rectangle(bx, y, wdt, bh, opts(seed, { stroke: COLORS.muted, strokeWidth: 1.2 }));
      ctx.fillStyle = colour; ctx.globalAlpha = 0.75;
      ctx.fillRect(bx + 2, y + 2, Math.max(4, (wdt - 4) * len), bh - 4);
      ctx.globalAlpha = 1;
    }

    /* ---------------- the six steps ---------------- */

    step1() {
      const { ctx, w, h } = this;
      const c = this.compact;
      label(ctx, 'an analogy first — this is not part of the study', w / 2, c ? 16 : 22,
        { color: COLORS.muted, size: c ? 11 : 13, align: 'center' });

      const y = c ? 74 : 96;
      const g = this.band(y, c ? 30 : 42, pink, 'pink', 'red', 0.5,
        'one continuous band of light — English cuts it in two');

      label(ctx, '“pink” is not “light red”. It is its own word,', w / 2, y + (c ? 78 : 108),
        { color: COLORS.ink, size: c ? 12.5 : 16, align: 'center' });
      label(ctx, 'and it makes a line across the band.', w / 2, y + (c ? 96 : 132),
        { color: COLORS.ink, size: c ? 12.5 : 16, align: 'center' });

      label(ctx, 'The question of the whole experiment:', w / 2, h - (c ? 54 : 72),
        { color: COLORS.yellow, size: c ? 12 : 15, align: 'center' });
      label(ctx, 'does a line like this change how FAST you see a difference?',
        w / 2, h - (c ? 34 : 48), { color: COLORS.yellow, size: c ? 12 : 15, align: 'center' });
      label(ctx, 'not what you can see — how fast', w / 2, h - (c ? 14 : 24),
        { color: COLORS.muted, size: c ? 10.5 : 12.5, align: 'center' });
    }

    step2() {
      const { ctx, w, h } = this;
      const c = this.compact;
      label(ctx, 'now the real one', w / 2, c ? 16 : 22,
        { color: COLORS.muted, size: c ? 11 : 13, align: 'center' });

      const y = c ? 70 : 92;
      const g = this.band(y, c ? 30 : 42, blue, 'голубой  goluboy', 'синий  siniy', BOUNDARY,
        'the study used 20 of these; the line falls between stimulus 8 and 9');

      // English's single word, drawn as one long brace under the whole band
      const by = y + (c ? 56 : 74);
      const { rc } = this;
      rc.line(g.x0, by, g.x1, by, opts(12, { stroke: COLORS.pink, strokeWidth: 1.6 }));
      rc.line(g.x0, by, g.x0, by - 7, opts(13, { stroke: COLORS.pink, strokeWidth: 1.6 }));
      rc.line(g.x1, by, g.x1, by - 7, opts(14, { stroke: COLORS.pink, strokeWidth: 1.6 }));
      label(ctx, 'English: all of this is “blue”', (g.x0 + g.x1) / 2, by + (c ? 17 : 20),
        { color: COLORS.pink, size: c ? 12 : 14.5, align: 'center' });

      label(ctx, 'A Russian speaker has to choose one of the two words.',
        w / 2, h - (c ? 50 : 66), { color: COLORS.ink, size: c ? 12 : 15, align: 'center' });
      label(ctx, 'An English speaker never has to.', w / 2, h - (c ? 30 : 42),
        { color: COLORS.ink, size: c ? 12 : 15, align: 'center' });
      label(ctx, 'same eyes, same light — different obligation',
        w / 2, h - (c ? 12 : 20), { color: COLORS.muted, size: c ? 10.5 : 12.5, align: 'center' });
    }

    step3() {
      const { ctx, rc, w, h } = this;
      const c = this.compact;
      label(ctx, 'one trial, start to finish', w / 2, c ? 16 : 22,
        { color: COLORS.muted, size: c ? 11 : 13, align: 'center' });

      const Q = c ? 46 : 68;
      const cx = w * 0.34;
      const ty = c ? 44 : 62;
      this.swatch(cx - Q / 2, ty, Q, blue(0.40), 21);
      label(ctx, 'this one', cx + Q / 2 + 10, ty + Q / 2,
        { color: COLORS.muted, size: c ? 11 : 13 });

      const cy = ty + Q + (c ? 34 : 48);
      const lx = cx - Q * 1.3; const rx = cx + Q * 0.3;
      this.swatch(lx, cy, Q, blue(0.52), 22);
      this.swatch(rx, cy, Q, blue(0.40), 23);
      label(ctx, 'press ←', lx + Q / 2, cy + Q + (c ? 16 : 20),
        { color: COLORS.muted, size: c ? 11 : 13, align: 'center' });
      label(ctx, 'press →', rx + Q / 2, cy + Q + (c ? 16 : 20),
        { color: COLORS.muted, size: c ? 11 : 13, align: 'center' });

      doodleArrow(rc, cx, ty + Q + 6, rx + Q / 2, cy - 6,
        { color: COLORS.green, seed: 24, strokeWidth: 1.6 });
      label(ctx, 'identical', rx + Q / 2 + (c ? 2 : 8), cy - (c ? 12 : 16),
        { color: COLORS.green, size: c ? 11 : 13 });

      const nx = c ? w * 0.06 : w * 0.58;
      const ny = c ? cy + Q + (c ? 40 : 0) : 96;
      const ns = c ? 11.5 : 14;
      const gap = c ? 18 : 26;
      [
        'One of the bottom two is exactly',
        'the same colour as the top one.',
        '',
        'Press the left or the right button.',
        'As fast as you can.',
        '',
        'What gets measured is the delay,',
        'not the answer — people get it',
        'right almost every time.',
      ].forEach((line, i) => {
        if (!line) return;
        label(ctx, line, nx, ny + i * gap, { color: COLORS.ink, size: ns });
      });
    }

    step4() {
      const { ctx, w, h } = this;
      const c = this.compact;
      label(ctx, 'same physical gap. different naming.', w / 2, c ? 16 : 22,
        { color: COLORS.muted, size: c ? 11.5 : 14, align: 'center' });

      // stimuli 3 & 5 (both goluboy) vs 8 & 10 (one of each) — two steps apart
      // on the ramp either way
      const trials = [
        { t: 'trial A', i: [3, 5], names: 'both голубой', col: COLORS.orange, ru: 0.95 },
        { t: 'trial B', i: [8, 10], names: 'голубой  +  синий', col: COLORS.green, ru: 0.62 },
      ];
      const Q = c ? 34 : 52;
      const barW = c ? w * 0.44 : w * 0.26;

      trials.forEach((tr, k) => {
        if (c) {
          const y0 = 38 + k * 108;
          label(ctx, `${tr.t} — stimuli ${tr.i[0]} and ${tr.i[1]}`, w * 0.06, y0,
            { color: tr.col, size: 12.5 });
          this.swatch(w * 0.06, y0 + 8, Q, blue((tr.i[0] - 1) / (N_STIM - 1)), 30 + k);
          this.swatch(w * 0.06 + Q + 12, y0 + 8, Q, blue((tr.i[1] - 1) / (N_STIM - 1)), 40 + k);
          label(ctx, tr.names, w * 0.06 + 2 * Q + 26, y0 + 8 + Q / 2 + 4,
            { color: tr.col, size: 11.5 });
          this.rtBar(w * 0.06, y0 + Q + 20, barW, tr.ru, COLORS.cyan, 'Russian', 50 + k);
          this.rtBar(w * 0.06, y0 + Q + 40, barW, 0.95, COLORS.pink, 'English', 60 + k);
        } else {
          const x0 = k === 0 ? w * 0.06 : w * 0.55;
          label(ctx, `${tr.t} — stimuli ${tr.i[0]} and ${tr.i[1]}`, x0, 62,
            { color: tr.col, size: 15 });
          this.swatch(x0, 76, Q, blue((tr.i[0] - 1) / (N_STIM - 1)), 30 + k);
          this.swatch(x0 + Q + 16, 76, Q, blue((tr.i[1] - 1) / (N_STIM - 1)), 40 + k);
          label(ctx, tr.names, x0, 76 + Q + 22, { color: tr.col, size: 14 });
          label(ctx, 'two steps apart on the ramp', x0, 76 + Q + 42,
            { color: COLORS.muted, size: 12 });
          this.rtBar(x0, 76 + Q + 60, barW, tr.ru, COLORS.cyan, 'Russian', 50 + k);
          this.rtBar(x0, 76 + Q + 86, barW, 0.95, COLORS.pink, 'English', 60 + k);
        }
      });

      if (!c) {
        label(ctx, 'identical', w * 0.485, 90, { color: COLORS.yellow, size: 13, align: 'center' });
        label(ctx, 'physical', w * 0.485, 108, { color: COLORS.yellow, size: 13, align: 'center' });
        label(ctx, 'gap', w * 0.485, 126, { color: COLORS.yellow, size: 13, align: 'center' });
      }

      const fy = h - (c ? 56 : 74);
      label(ctx, c ? 'same gap in both rows — only the names changed'
        : 'nothing physical changed between the two trials — only whether the two colours share a name',
      w / 2, fy, { color: COLORS.yellow, size: c ? 11 : 14, align: 'center' });
      label(ctx, 'Russian speakers answer faster in trial B.', w / 2, fy + (c ? 18 : 24),
        { color: COLORS.cyan, size: c ? 11.5 : 14, align: 'center' });
      label(ctx, 'English speakers: no difference at all.', w / 2, fy + (c ? 36 : 48),
        { color: COLORS.pink, size: c ? 11.5 : 14, align: 'center' });
    }

    step5() {
      const { ctx, rc, w, h } = this;
      const c = this.compact;
      label(ctx, '“maybe Russians are just better practised with blue?”', w / 2, c ? 16 : 24,
        { color: COLORS.muted, size: c ? 11 : 14, align: 'center' });
      label(ctx, 'here is how they ruled that out', w / 2, c ? 32 : 46,
        { color: COLORS.muted, size: c ? 11 : 14, align: 'center' });

      const rows = [
        { load: 'nothing extra', busy: '', out: 'advantage is there', ok: true, seed: 71 },
        { load: 'hold 8 digits', busy: 'language busy', out: 'advantage GONE', ok: false, seed: 72 },
        { load: 'hold a grid pattern', busy: 'vision busy', out: 'advantage BACK', ok: true, seed: 73 },
      ];
      const y0 = c ? 56 : 82;
      const rh = c ? 62 : 84;
      rows.forEach((r, i) => {
        const y = y0 + i * rh;
        const col = r.ok ? COLORS.green : COLORS.red;
        rc.rectangle(w * 0.05, y, w * 0.9, c ? 50 : 66,
          opts(r.seed, { stroke: col, strokeWidth: r.ok ? 1.5 : 2.4 }));
        label(ctx, r.load, w * 0.07, y + (c ? 22 : 28), { color: COLORS.ink, size: c ? 12.5 : 15.5 });
        if (r.busy) {
          label(ctx, r.busy, w * 0.07, y + (c ? 38 : 48), { color: COLORS.muted, size: c ? 10.5 : 12.5 });
        }
        label(ctx, r.out, w * 0.5, y + (c ? 28 : 38), { color: col, size: c ? 13 : 17 });
        label(ctx, r.ok ? '✓' : '✗', w * 0.9, y + (c ? 30 : 40),
          { color: col, size: c ? 18 : 24, align: 'center' });
      });

      label(ctx, c ? 'both loads are equally hard — only the verbal one kills it'
        : 'both extra tasks are equally demanding. Only the one made of words kills the effect.',
      w / 2, h - (c ? 26 : 34), { color: COLORS.yellow, size: c ? 11 : 14.5, align: 'center' });
      label(ctx, 'so the language system was in the loop, live', w / 2, h - (c ? 10 : 14),
        { color: COLORS.muted, size: c ? 10.5 : 12.5, align: 'center' });
    }

    step6() {
      const { ctx, rc, w, h } = this;
      const c = this.compact;
      label(ctx, 'the honest boundary of the claim', w / 2, c ? 16 : 24,
        { color: COLORS.muted, size: c ? 11 : 14, align: 'center' });

      const lines = c ? [
        ['✗', 'Russians do NOT see extra colours.', COLORS.red],
        ['✗', 'Not “language decides what you think”.', COLORS.red],
        ['✓', 'An English speaker learns the line fast.', COLORS.green],
        ['✓', 'The effect is tens of milliseconds.', COLORS.green],
        ['✓', 'A distinction your language forces on', COLORS.green],
        ['', 'you gets reused as a shortcut.', COLORS.green],
      ] : [
        ['✗', 'Russians do NOT see colours English speakers cannot see.', COLORS.red],
        ['✗', 'It is not “your language decides what you can think”.', COLORS.red],
        ['✓', 'An English speaker can learn the line in an afternoon.', COLORS.green],
        ['✓', 'What was measured is tens of milliseconds, in one task.', COLORS.green],
        ['✓', 'A distinction your language forces on you gets reused', COLORS.green],
        ['', 'as a shortcut — even when nobody asked you to name anything.', COLORS.green],
      ];
      const y0 = c ? 54 : 84;
      const gap = c ? 32 : 44;
      lines.forEach((ln, i) => {
        const y = y0 + i * gap;
        if (ln[0]) {
          label(ctx, ln[0], w * 0.07, y, { color: ln[2], size: c ? 15 : 19 });
        }
        label(ctx, ln[1], w * 0.13, y, { color: COLORS.ink, size: c ? 11.5 : 15 });
      });

      label(ctx, 'the strong version of Whorf failed. This is the version that survived.',
        w / 2, h - (c ? 14 : 20), { color: COLORS.yellow, size: c ? 10.5 : 13.5, align: 'center' });
    }

    render() {
      [this.step1, this.step2, this.step3, this.step4, this.step5, this.step6][this.step].call(this);
    }
  }

  A.register('blueexplain', BlueExplain);
})();
