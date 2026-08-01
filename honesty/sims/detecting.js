// Honesty 1 — Can you tell if someone is lying?
//
// The short answer from the evidence is no, and the page is built around that
// rather than around tricks, because the tricks do not work.
//
// PANEL 1 — THE DEMEANOUR MYTH. Bond & DePaulo's 2006 meta-analysis pooled 206
// studies and 24,483 judges: average accuracy 54% against a 50% coin. Broken
// down, people correctly flag only 47% of lies and correctly clear 61% of
// truths — i.e. we are biased toward believing people, and we miss most lies.
// DePaulo et al. (2003) went looking for the behavioural cues everyone "knows"
// and found them faint to non-existent. Gaze aversion, the single most widely
// believed cue on Earth (Global Deception Research Team, 2006), has effectively
// no diagnostic value.
//
// PANEL 2 — THE BASE-RATE TRAP, which is the panel that actually matters and is
// pure arithmetic. If you accuse people on the strength of an imperfect
// detector, in a population where most people are honest, almost everyone you
// accuse is innocent:
//     precision = (base * sens) / (base * sens + (1-base) * (1-spec))
// With the measured human numbers (sens 0.47, spec 0.61) and 5% liars, only
// 6% of your accusations are correct. Even a fictional 90%-accurate detector
// gets it right only 32% of the time at that base rate. This is the same
// mathematics as medical screening, and it is why "I could tell he was lying"
// is not evidence of anything.
//
// PANEL 3 — WHAT ACTUALLY HELPS. Not demeanour. Checkable facts, consistency
// across time and independent sources, strategic use of evidence (Hartwig et
// al. 2006), and questions that are hard to answer if you are inventing. The
// panel ranks them honestly, including the ones that do not work.
//
// Every number here is from a cited meta-analysis or computed live from the
// sliders. Nothing is asserted from folk wisdom, which is rather the point.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    fmtNum, sci,
  } = A;

  const CIT_CUES = '2003 DePaulo, Lindsay, Malone, Muhlenbruck, Charlton, Cooper - Cues to Deception';
  const CIT_POLY = '2003 National Research Council - The Polygraph and Lie Detection';
  const CIT_ACC = '2006 Bond, DePaulo - Accuracy of Deception Judgments';
  const CIT_WORLD = '2006 Global Deception Research Team - A World of Lies';
  const CIT_SUE = '2006 Hartwig, Granhag, Strömwall, Kronkvist - Strategic Use of Evidence During Police Interviews';
  const CIT_TDT = '2014 Levine - Truth-Default Theory (TDT): A Theory of Human Deception and Deception Detection';

  // Bond & DePaulo 2006, the headline figures.
  const HUMAN_ACC = 0.54;
  const HUMAN_SENS = 0.47;   // lies correctly called lies
  const HUMAN_SPEC = 0.61;   // truths correctly called truths

  // Things people believe they can read, with what the evidence says.
  const CUES = [
    { name: 'avoiding eye contact', belief: 'the most believed cue on Earth', verdict: 'no diagnostic value', good: false },
    { name: 'fidgeting, touching the face', belief: 'classic "tell"', verdict: 'essentially zero', good: false },
    { name: 'nervousness', belief: 'looks guilty', verdict: 'honest people are nervous too', good: false },
    { name: 'a story that never changes', belief: 'sounds rehearsed... or truthful?', verdict: 'ambiguous both ways', good: false },
    { name: 'checkable details you can verify', belief: '', verdict: 'this one actually works', good: true },
    { name: 'consistency with independent records', belief: '', verdict: 'this one actually works', good: true },
  ];

  const METHODS = [
    { name: 'reading their face and body', score: 0.04, col: 'red', note: 'DePaulo 2003: cues are faint to non-existent' },
    { name: 'gut feeling / "I could tell"', score: 0.08, col: 'red', note: 'Bond & DePaulo 2006: 54% vs a 50% coin' },
    { name: 'the polygraph', score: 0.30, col: 'orange', note: 'NRC 2003: too unreliable for screening' },
    { name: 'asking unexpected questions', score: 0.62, col: 'yellow', note: 'harder to invent than to recall' },
    { name: 'strategic use of evidence', score: 0.75, col: 'green', note: 'Hartwig 2006: hold back what you know, then compare' },
    { name: 'checking verifiable claims', score: 0.92, col: 'cyan', note: 'not deception detection — just verification' },
  ];

  const N_GRID = 100;

  class DetectingSim extends Sim {
    init() {
      this.mode = 'myth';
      this.baseRate = 0.05;       // fraction who are actually lying
      this.sens = HUMAN_SENS;
      this.spec = HUMAN_SPEC;
      this.phase = 0;
      // A fixed, deterministic population: who lies and who the detector flags.
      this.people = [];
      for (let i = 0; i < N_GRID; i++) {
        this.people.push({ r1: (i * 0.6180339887) % 1, r2: (i * 0.7548776662) % 1 });
      }
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- the arithmetic ---------------- */

    bayes() {
      const b = this.baseRate;
      const tp = b * this.sens;
      const fn = b * (1 - this.sens);
      const fp = (1 - b) * (1 - this.spec);
      const tn = (1 - b) * this.spec;
      const flagged = tp + fp;
      return {
        b, tp, fn, fp, tn, flagged,
        precision: flagged > 0 ? tp / flagged : 0,
        missed: fn,
        accuracy: tp + tn,
        // per 100 people, rounded for the grid
        n: {
          tp: Math.round(tp * N_GRID), fp: Math.round(fp * N_GRID),
          fn: Math.round(fn * N_GRID), tn: Math.round(tn * N_GRID),
        },
      };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'what people think works', value: 'myth' },
        { label: 'the base-rate trap', value: 'bayes' },
        { label: 'what actually helps', value: 'methods' },
      ], { initial: 'myth', onSelect: (v) => this.setMode(v) });

      this.baseSlider = slider(c, {
        label: 'how many are actually lying',
        min: 0.005, max: 0.5, step: 0.005, value: this.baseRate,
        format: (v) => `${fmtNum(v * 100, 1)}% of the group`,
        oninput: (v) => { this.baseRate = v; this.cache.invalidate(); this.updateReadout(); this.poke(); },
      });

      this.accBtns = buttonRow(c, [
        { label: 'a real human (measured)', value: 'human' },
        { label: 'a very good detector (70%)', value: 'good' },
        { label: 'a fictional one (90%)', value: 'great' },
      ], {
        initial: 'human',
        onSelect: (v) => {
          if (v === 'human') { this.sens = HUMAN_SENS; this.spec = HUMAN_SPEC; this.cite(CIT_ACC); }
          if (v === 'good') { this.sens = 0.70; this.spec = 0.70; }
          if (v === 'great') { this.sens = 0.90; this.spec = 0.90; }
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });
      this.setMode('myth');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.baseSlider, v === 'bayes');
      show(this.accBtns, v === 'bayes');
      if (v === 'myth' && !this._c1) { this._c1 = true; this.cite(CIT_CUES); }
      if (v === 'bayes' && !this._c2) { this._c2 = true; this.cite(CIT_ACC); }
      if (v === 'methods' && !this._c3) { this._c3 = true; this.cite(CIT_SUE); }
      this.cache.invalidate(); this.updateReadout(); this.poke();
    }

    update(dt) { this.phase += dt; }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'bayes') return this.bayesReadout();
      if (this.mode === 'methods') return this.methodsReadout();
      setReadout(this.readoutEl, [
        [
          ['Pooling 206 studies and 24,483 judges, people identify lies correctly ', null],
          [`${fmtNum(HUMAN_ACC * 100, 0)}% of the time`, 'red'],
          ['. A coin gets 50%. That is the whole of humanity\'s natural lie-detecting ability.', null],
        ],
        [
          ['It is worse than the average suggests: we catch only ', null],
          [`${fmtNum(HUMAN_SENS * 100, 0)}% of lies`, 'red'],
          [' but correctly clear ', null], [`${fmtNum(HUMAN_SPEC * 100, 0)}% of truths`, 'green'],
          ['. We are biased toward believing people — which, as Levine argues, is probably adaptive: most statements really are true, and defaulting to trust is cheaper than checking everything.', null],
        ],
        [
          ['The cues everybody "knows" do not survive measurement. DePaulo and colleagues meta-analysed the lot and found them faint to non-existent. Avoiding eye contact is believed to signal lying in almost every country surveyed — and it does not. Nervousness signals nervousness. Honest people being accused are also nervous, and often more so.', null],
        ],
        [
          ['So the useful conclusion is not "look harder". It is: ', null],
          ['demeanour is not evidence', 'yellow'],
          ['. If your reasoning about someone rests on how they seemed, you have not got a reason yet.', null],
        ],
      ]);
    }

    bayesReadout() {
      const r = this.bayes();
      setReadout(this.readoutEl, [
        [
          [`in a group of 100 where `, null], [`${fmtNum(this.baseRate * 100, 1)}%`, 'yellow'],
          [' are lying, and your detector catches ', null], [`${fmtNum(this.sens * 100, 0)}%`, 'cyan'],
          [' of lies and clears ', null], [`${fmtNum(this.spec * 100, 0)}%`, 'cyan'], [' of truths:', null],
        ],
        [
          ['you accuse ', null], [`${r.n.tp + r.n.fp} people`, 'orange'],
          ['  ·  of those, ', null], [`${r.n.tp} really lied`, 'green'],
          [' and ', null], [`${r.n.fp} were innocent`, 'red'],
          ['  ·  and ', null], [`${r.n.fn} liars walked free`, 'pink'],
        ],
        [
          ['So when you accuse someone, the chance you are right is ', null],
          [`${fmtNum(r.precision * 100, 1)}%`, r.precision > 0.5 ? 'green' : 'red'],
          [r.precision < 0.5
            ? ` — you are wrong more often than you are right, and ${fmtNum((1 - r.precision) * 100, 0)}% of the people you accuse did nothing.`
            : '.', null],
        ],
        [
          ['This is the same arithmetic as screening for a rare disease, and it does not care how confident you feel. When most people are honest, even a good detector produces mostly false accusations — because there are so many more honest people to misjudge. Try the fictional 90% detector: it still gets it wrong most of the time at a low base rate.', null],
        ],
      ]);
    }

    methodsReadout() {
      setReadout(this.readoutEl, [
        [
          ['Nothing on this list reads minds. What separates the useful methods from the useless ones is that they compare a claim against something OUTSIDE the person.', null],
        ],
        [
          ['Verify what can be verified.', 'cyan'],
          [' Dates, records, who else was in the room, what was written down at the time. This is not lie detection at all; it is just checking. It is also the only method that reliably works.', null],
        ],
        [
          ['Ask about things that are hard to invent.', 'green'],
          [' Unexpected questions, details from an unusual angle, the same event approached twice from different directions. Recalling is easy; constructing consistently is expensive. Strategic use of evidence — holding back what you already know, then seeing whether their account collides with it — is the best-supported interview technique there is.', null],
        ],
        [
          ['And be honest about the rest.', 'red'],
          [' The polygraph measures arousal, not truth; the National Research Council reviewed it and concluded it is far too unreliable for screening people. Demeanour is noise. "I could tell" is a feeling, not a finding.', null],
        ],
      ]);
    }

    /* ---------------- drawing ---------------- */

    renderMyth() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const cy = h * 0.34;

      // two people, deliberately identical — that is the point
      const x1 = w * 0.26;
      const x2 = w * 0.56;
      stickFigure(rc, x1, cy, { scale: compact ? 0.9 : 1.15, seed: 3000, color: COLORS.ink });
      stickFigure(rc, x2, cy, { scale: compact ? 0.9 : 1.15, seed: 3000, color: COLORS.ink });
      label(ctx, 'telling the truth', x1, cy + (compact ? 84 : 104), { color: COLORS.green, size: compact ? 11.5 : 13.5, align: 'center' });
      label(ctx, 'lying', x2, cy + (compact ? 84 : 104), { color: COLORS.red, size: compact ? 11.5 : 13.5, align: 'center' });
      label(ctx, compact ? 'drawn identically — on purpose' : 'drawn with the same seed, on purpose: the research finds no reliable outward difference',
        (x1 + x2) / 2, cy + (compact ? 102 : 126), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });

      // the accuracy bar
      const bx = compact ? 16 : w * 0.68;
      let by = compact ? h - 128 : h * 0.24;
      const bw = compact ? w - 32 : w * 0.28;
      label(ctx, 'human accuracy', bx, by - 8, { color: COLORS.ink, size: compact ? 11.5 : 13.5 });
      rc.rectangle(bx, by, bw, 20, opts(3010, { stroke: COLORS.muted, strokeWidth: 1.4 }));
      rc.rectangle(bx, by, bw * HUMAN_ACC, 20, opts(3011, {
        stroke: COLORS.red, strokeWidth: 1.4, fill: COLORS.red, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 5,
      }));
      // the coin-flip line
      rc.line(bx + bw * 0.5, by - 6, bx + bw * 0.5, by + 26, opts(3012, { stroke: COLORS.yellow, strokeWidth: 1.8 }));
      label(ctx, 'a coin', bx + bw * 0.5 + 5, by + 38, { color: COLORS.yellow, size: compact ? 10 : 12 });
      label(ctx, `${fmtNum(HUMAN_ACC * 100, 0)}%`, bx + bw * HUMAN_ACC + 6, by + 15, { color: COLORS.red, size: compact ? 12 : 15 });

      // the myth list
      by += compact ? 58 : 74;
      label(ctx, 'what people believe they can read:', bx, by, { color: COLORS.ink, size: compact ? 11 : 13 });
      by += compact ? 17 : 21;
      for (const c of CUES) {
        if (compact && c.good === false && CUES.indexOf(c) > 2) continue;
        const col = c.good ? COLORS.green : COLORS.red;
        label(ctx, `${c.good ? '✓' : '✗'} ${c.name}`, bx, by, { color: col, size: compact ? 10 : 12.5 });
        if (!compact) label(ctx, c.verdict, bx + bw + 16, by, { color: COLORS.muted, size: 11.5 });
        by += compact ? 15 : 19;
      }
    }

    renderBayes() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const r = this.bayes();

      label(ctx, `if you accuse someone, you are right ${fmtNum(r.precision * 100, 1)}% of the time`,
        w / 2, compact ? 22 : 30, { color: r.precision > 0.5 ? COLORS.green : COLORS.red, size: compact ? 12.5 : 17, align: 'center' });
      label(ctx, `${fmtNum(this.baseRate * 100, 1)}% actually lying  ·  detector: catches ${fmtNum(this.sens * 100, 0)}% of lies, clears ${fmtNum(this.spec * 100, 0)}% of truths`,
        w / 2, compact ? 40 : 50, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });

      // 10x10 grid of people, coloured by truth and by verdict
      const cols = 10;
      const top = compact ? 58 : 74;
      const avail = h - top - (compact ? 56 : 70);
      const cell = Math.min((w - 40) / cols, avail / 10);
      const gx = (w - cell * cols) / 2;

      // assign the 100 people deterministically: first n liars, then honest;
      // within each, first the correctly-judged then the mistakes.
      const nLiar = Math.round(this.baseRate * N_GRID);
      const nTP = Math.round(nLiar * this.sens);
      const nHonest = N_GRID - nLiar;
      const nFP = Math.round(nHonest * (1 - this.spec));

      for (let i = 0; i < N_GRID; i++) {
        const cxp = gx + (i % cols) * cell + cell / 2;
        const cyp = top + Math.floor(i / cols) * cell + cell / 2;
        let col; let accused;
        if (i < nLiar) { accused = i < nTP; col = accused ? COLORS.green : COLORS.pink; }
        else { const j = i - nLiar; accused = j < nFP; col = accused ? COLORS.red : COLORS.muted; }
        const rad = Math.max(3, cell * 0.20);
        if (accused) {
          rc.circle(cxp, cyp, rad * 2, opts(3020 + (i % 17), { stroke: col, strokeWidth: 1.6 }));
        } else {
          ctx.fillStyle = col; ctx.globalAlpha = i < nLiar ? 0.9 : 0.35;
          ctx.beginPath(); ctx.arc(cxp, cyp, rad * 0.7, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      const ly = h - (compact ? 40 : 50);
      const key = [
        [`${r.n.tp} caught, guilty`, COLORS.green],
        [`${r.n.fp} accused, innocent`, COLORS.red],
        [`${r.n.fn} liars missed`, COLORS.pink],
        [`${r.n.tn} correctly left alone`, COLORS.muted],
      ];
      let kx = compact ? 12 : 24;
      for (const [t, c] of key) {
        label(ctx, t, kx, ly, { color: c, size: compact ? 9 : 11.5 });
        kx += compact ? (w - 24) / 2 : (w - 48) / 4;
        if (compact && kx > w - 40) { kx = 12; }
      }
      label(ctx, compact ? 'circled = accused' : 'circled = you accused them  ·  this is the same arithmetic as screening for a rare disease',
        w / 2, h - (compact ? 12 : 16), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    renderMethods() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      label(ctx, 'what separates the methods that work from the ones that do not',
        w / 2, compact ? 22 : 28, { color: COLORS.yellow, size: compact ? 11.5 : 15, align: 'center' });
      label(ctx, 'the useful ones all compare the claim against something OUTSIDE the person',
        w / 2, compact ? 38 : 46, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });

      const top = compact ? 56 : 70;
      const rowH = (h - top - 30) / METHODS.length;
      const bx = compact ? 14 : 30;
      const bw = w - bx * 2 - (compact ? 0 : 200);

      METHODS.forEach((m, i) => {
        const y = top + i * rowH;
        const col = COLORS[m.col];
        label(ctx, m.name, bx, y + (compact ? 11 : 14), { color: col, size: compact ? 10.5 : 13 });
        const barY = y + (compact ? 16 : 20);
        rc.rectangle(bx, barY, bw, compact ? 9 : 12, opts(3040 + i, { stroke: COLORS.muted, strokeWidth: 1 }));
        rc.rectangle(bx, barY, Math.max(3, bw * m.score), compact ? 9 : 12, opts(3050 + i, {
          stroke: col, strokeWidth: 1.3, fill: col, fillStyle: 'hachure', fillWeight: 0.7, hachureGap: 4,
        }));
        if (!compact) label(ctx, m.note, bx + bw + 12, barY + 11, { color: COLORS.muted, size: 11 });
      });
      label(ctx, compact ? 'none of these read minds' : 'none of these read minds — the good ones just check the story against the world',
        w / 2, h - (compact ? 10 : 14), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    render() {
      if (this.mode === 'bayes') return this.renderBayes();
      if (this.mode === 'methods') return this.renderMethods();
      this.renderMyth();
    }
  }

  A.register('detecting', DetectingSim);
})();
