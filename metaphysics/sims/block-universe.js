// Metaphysics 1 — Is the future already there? (relativity of simultaneity)
//
// This is the one metaphysical question where MEASURED PHYSICS does the arguing,
// which is why it opens the page. Everything below follows from one experimental
// fact: the speed of light is the same for every observer. Nothing here is
// interpretation until the very last step, and the sim marks exactly where that
// step happens.
//
// PANEL 1 — THE DIAGRAM. Minkowski's picture, in units where c = 1 so light
// travels at 45 degrees. For an observer moving at beta = v/c:
//     their worldline (their "here", all times)   x = beta * t     slope 1/beta
//     their NOW (all space, one time)             t = beta * x     slope beta
// The two axes scissor toward the light cone as beta grows. The consequence:
// two events you call simultaneous are NOT simultaneous for them, and for
// SPACELIKE-separated events the two observers can even disagree about which
// happened first. Drag beta and watch a pair of events swap order.
//
// THE GUARDRAIL, drawn and enforced: this NEVER happens for timelike-separated
// events. If a signal could pass from A to B, every observer agrees A came first.
// Relativity permits disagreement about simultaneity; it forbids disagreement
// about causation. The sim tests each event pair and says which kind it is.
//
// PANEL 2 — THE ANDROMEDA PARADOX (Penrose's version), drawn as a street scene
// because the numbers are otherwise unbelievable. Two people pass each other on
// a pavement. One walks at 1 m/s. Their planes of simultaneity, extended to the
// Andromeda galaxy 2.537 million light-years away, differ by
//     delta_t = gamma * beta * x / c  ~  beta * x / c
//             = (1/299792458) * 2.4002e22 / 299792458
//             = 2.671e5 s = 3.09 DAYS
// Walking pace. Three days of Andromeda's history, decided by whether you are
// strolling or standing still. In a car at 100 km/h it is nearly three months.
//
// THE PHILOSOPHY, kept separate and labelled as such: Rietdijk (1966) and Putnam
// (1967) argued from this that all events must be equally real — a "block
// universe" in which the future exists already. Stein (1968) replied that the
// argument smuggles in an assumption: it treats "real for me" as a property of a
// whole simultaneity PLANE, when relativity only ever licenses statements about
// a POINT and its past light cone. The sim shows the physics, states both, and
// does not pretend the matter is settled.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    C, LY, DAY, fmtNum, sci, fmtTime,
  } = A;

  const CIT_EINSTEIN = '1905 Einstein - Zur Elektrodynamik bewegter Körper (On the Electrodynamics of Moving Bodies)';
  const CIT_MINK = '1909 Minkowski - Raum und Zeit (Space and Time)';
  const CIT_MCT = '1908 McTaggart - The Unreality of Time';
  const CIT_RIET = '1966 Rietdijk - A Rigorous Proof of Determinism Derived from the Special Theory of Relativity';
  const CIT_PUT = '1967 Putnam - Time and Physical Geometry';
  const CIT_STEIN = '1968 Stein - On Einstein-Minkowski Space-Time';

  const D_ANDROMEDA = 2.537e6 * LY;      // m

  // Events plotted on the diagram, in units where c = 1 (x and t both in
  // "light-seconds" and "seconds"). Chosen so the set contains one timelike pair
  // (which can never swap) and one spacelike pair (which can).
  const EVENTS = [
    { key: 'A', name: 'you drop a cup', x: 0.0, t: 0.35, col: 'cyan' },
    { key: 'B', name: 'the cup hits the floor', x: 0.0, t: 0.75, col: 'cyan' },
    { key: 'C', name: 'a flare on a distant star', x: 1.75, t: 0.55, col: 'pink' },
    { key: 'D', name: 'a rock cracks, further out', x: -1.55, t: 0.60, col: 'orange' },
  ];

  const WALKERS = [
    { key: 'walk', name: 'walking', v: 1.0 },
    { key: 'jog', name: 'jogging', v: 3.0 },
    { key: 'bike', name: 'on a bicycle', v: 25 / 3.6 },
    { key: 'car', name: 'in a car', v: 100 / 3.6 },
    { key: 'plane', name: 'in an airliner', v: 250 },
  ];

  class BlockUniverseSim extends Sim {
    init() {
      this.mode = 'diagram';
      this.beta = 0.45;
      this.walkerIdx = 0;
      this.showPast = true;
      this.phase = 0;
      this.buildControls();
      this.updateReadout();
    }

    get walker() { return WALKERS[this.walkerIdx]; }

    /* ---------------- physics (c = 1) ---------------- */

    gamma(b) { return 1 / Math.sqrt(1 - b * b); }

    // Time of an event in the moving frame: t' = gamma (t - beta x)
    tPrime(e, b) { return this.gamma(b) * (e.t - b * e.x); }

    // Separation type between two events. Timelike => causally connectable and
    // their order is absolute; spacelike => order is frame-dependent.
    separation(e1, e2) {
      const dt = e2.t - e1.t;
      const dx = e2.x - e1.x;
      const s2 = dt * dt - dx * dx;          // c=1
      if (s2 > 1e-9) return 'timelike';
      if (s2 < -1e-9) return 'spacelike';
      return 'lightlike';
    }

    andromeda() {
      const v = this.walker.v;
      const b = v / C;
      const g = this.gamma(b);
      const shift = (g * b * D_ANDROMEDA) / C;   // seconds of Andromeda time
      return { v, b, g, shift, days: shift / DAY };
    }

    diagramNumbers() {
      const b = this.beta;
      const yours = EVENTS.map((e) => ({ e, t: e.t }));
      const theirs = EVENTS.map((e) => ({ e, t: this.tPrime(e, b) }));
      // does any pair swap order?
      const swaps = [];
      for (let i = 0; i < EVENTS.length; i++) {
        for (let j = i + 1; j < EVENTS.length; j++) {
          const a = EVENTS[i]; const c = EVENTS[j];
          const mine = Math.sign(c.t - a.t);
          const other = Math.sign(this.tPrime(c, b) - this.tPrime(a, b));
          if (mine !== 0 && other !== 0 && mine !== other) {
            swaps.push({ a, c, sep: this.separation(a, c) });
          }
        }
      }
      return { b, g: this.gamma(b), yours, theirs, swaps };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'whose "now"?', value: 'diagram' },
        { label: 'the Andromeda paradox', value: 'andromeda' },
      ], { initial: 'diagram', onSelect: (v) => this.setMode(v) });

      this.betaSlider = slider(c, {
        label: 'how fast the other observer moves',
        min: -0.92, max: 0.92, step: 0.005, value: this.beta,
        format: (v) => `v = ${fmtNum(v, 3)} c   (γ = ${fmtNum(this.gamma(v), 3)})`,
        oninput: (v) => {
          this.beta = v;
          if (Math.abs(v) > 0.3 && !this._citedM) { this._citedM = true; this.cite(CIT_MINK); }
          this.updateReadout(); this.poke();
        },
      });

      this.walkerBtns = buttonRow(c, WALKERS.map((x) => ({ label: x.name, value: x.key })), {
        initial: 'walk',
        onSelect: (v) => {
          this.walkerIdx = WALKERS.findIndex((x) => x.key === v);
          if (!this._citedP) { this._citedP = true; this.cite(CIT_PUT); }
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });

      this.pastBtn = actionButton(c, 'show the light cone', () => {
        this.showPast = !this.showPast;
        this.cache.invalidate(); this.poke();
      });
      this.setMode('diagram');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.betaSlider, v === 'diagram');
      show(this.walkerBtns, v === 'andromeda');
      this.pastBtn.style.display = v === 'diagram' ? '' : 'none';
      if (v === 'diagram' && !this._citedE) { this._citedE = true; this.cite(CIT_EINSTEIN); }
      if (v === 'andromeda' && !this._citedR) { this._citedR = true; this.cite(CIT_RIET); }
      this.cache.invalidate(); this.updateReadout(); this.poke();
    }

    update(dt) { this.phase += dt; }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'andromeda') return this.andromedaReadout();
      const n = this.diagramNumbers();
      const order = (list) => list.slice().sort((p, q) => p.t - q.t).map((p) => p.e.key).join(' → ');
      const swapLines = n.swaps.length
        ? [
          [`${n.swaps.length} pair${n.swaps.length > 1 ? 's' : ''} of events have SWAPPED ORDER: `, 'pink'],
          [n.swaps.map((s) => `${s.a.key}/${s.c.key} (${s.sep})`).join(', '), 'pink'],
          ['. Every one of them is spacelike separated — no signal could ever have passed between them, so no cause could either. Nobody is wrong; "which happened first" simply has no frame-independent answer for such a pair.', null],
        ]
        : [
          ['No pair has swapped order yet — push the speed further.', null],
        ];
      setReadout(this.readoutEl, [
        [
          ['their speed ', null], [`${fmtNum(n.b, 3)} c`, 'yellow'],
          ['  ·  γ = ', null], [fmtNum(n.g, 4), 'cyan'],
          ['  ·  their line of "now" has slope ', null], [fmtNum(n.b, 3), 'green'],
          [' on the diagram, yours is flat.', null],
        ],
        [
          ['the order YOU see: ', null], [order(n.yours), 'cyan'],
          ['     the order THEY see: ', null], [order(n.theirs), 'pink'],
        ],
        swapLines,
        [
          ['THE GUARDRAIL: ', 'yellow'],
          ['A and B (the cup leaving your hand, and hitting the floor) are TIMELIKE separated — light could travel from one to the other. Their order never changes, at any speed, for any observer. Relativity allows disagreement about simultaneity; it forbids disagreement about cause and effect. Turn on the light cone to see the boundary.', null],
        ],
      ]);
    }

    andromedaReadout() {
      const a = this.andromeda();
      setReadout(this.readoutEl, [
        [
          [`${this.walker.name}`, 'yellow'],
          [` at ${fmtNum(a.v, 2)} m/s — that is `, null], [sci(a.b, 3), 'cyan'], [' of the speed of light. A ridiculous, negligible fraction.', null],
        ],
        [
          ['And yet your plane of "now", carried out to the Andromeda galaxy 2.537 million light-years away, has shifted by ', null],
          [`${fmtNum(a.days, 2)} days`, 'pink'],
          [' relative to the person standing still beside you.', null],
        ],
        [
          ['Δt = γβx/c. Andromeda is ', null], [`${sci(D_ANDROMEDA, 3)} m`, null],
          [' away, so a tiny β multiplied by an enormous x gives a large time. Events that are in your "now" over there are, for the person next to you, ', null],
          [`${fmtNum(a.days, 1)} days`, 'pink'],
          [' in the past or the future. Neither of you is mistaken.', null],
        ],
        [
          ['NOW THE PHILOSOPHY, and it is philosophy, not physics: ', 'yellow'],
          ['Rietdijk and Putnam argued that if everything on my plane of now is real, and everything on yours is real, and we disagree, then ALL of it must be real — the future included, sitting there already. That is the block universe. Stein replied in 1968 that the argument assumes what it needs: relativity licenses statements about a point and its past light cone, never about a whole plane. The physics above is measured. This paragraph is not.', null],
        ],
      ]);
    }

    /* ---------------- drawing ---------------- */

    renderDiagram() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.diagramNumbers();
      const cx = w * 0.5;
      const cy = h * 0.62;
      const unit = Math.min(w * 0.20, h * 0.34);   // px per light-second

      const P = (x, t) => [cx + x * unit, cy - t * unit];

      // the light cone through the origin
      if (this.showPast) {
        this.cache.draw(`cone-${w}x${h}`, (g) => g.path(
          `M ${cx} ${cy} L ${cx + unit * 2.6} ${cy - unit * 2.6} M ${cx} ${cy} L ${cx - unit * 2.6} ${cy - unit * 2.6}`,
          opts(2000, { stroke: COLORS.yellow, strokeWidth: 1.6 }),
        ));
        this.cache.draw(`conep-${w}x${h}`, (g) => g.path(
          `M ${cx} ${cy} L ${cx + unit * 2.6} ${cy + unit * 2.6} M ${cx} ${cy} L ${cx - unit * 2.6} ${cy + unit * 2.6}`,
          opts(2001, { stroke: COLORS.yellow, strokeWidth: 1.2, strokeLineDash: [5, 6] }),
        ));
        label(ctx, 'light', cx + unit * 1.05, cy - unit * 1.12, { color: COLORS.yellow, size: compact ? 10 : 12 });
        label(ctx, compact ? 'elsewhere' : 'ELSEWHERE — no signal can reach here', cx + unit * 1.6, cy + 6,
          { color: COLORS.muted, size: compact ? 9.5 : 11.5 });
      }

      // your axes
      this.cache.draw(`axes-${w}x${h}`, (g) => g.line(cx, cy - unit * 2.4, cx, cy + unit * 1.1,
        opts(2002, { stroke: COLORS.cyan, strokeWidth: 2 })));
      this.cache.draw(`axesx-${w}x${h}`, (g) => g.line(cx - unit * 2.5, cy, cx + unit * 2.5, cy,
        opts(2003, { stroke: COLORS.cyan, strokeWidth: 1.4 })));
      label(ctx, 'your time', cx + 6, cy - unit * 2.4, { color: COLORS.cyan, size: compact ? 10.5 : 12.5 });
      label(ctx, 'space →', cx + unit * 2.5, cy - 8, { color: COLORS.cyan, size: compact ? 10.5 : 12.5, align: 'right' });

      // your NOW: horizontal through each event height? no — through the origin
      ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(cx - unit * 2.5, cy); ctx.lineTo(cx + unit * 2.5, cy); ctx.stroke();
      label(ctx, 'YOUR now', cx - unit * 2.45, cy - 8, { color: COLORS.cyan, size: compact ? 11 : 13.5 });

      // their axes: worldline slope 1/beta, now-line slope beta
      const b = n.b;
      const tx = (t) => P(b * t, t);
      const w1 = tx(2.3); const w2 = tx(-1.0);
      ctx.strokeStyle = COLORS.pink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w2[0], w2[1]); ctx.lineTo(w1[0], w1[1]); ctx.stroke();
      label(ctx, 'their time', w1[0] + 6, w1[1] + 4, { color: COLORS.pink, size: compact ? 10.5 : 12.5 });

      const s1 = P(2.5, b * 2.5); const s2 = P(-2.5, -b * 2.5);
      ctx.strokeStyle = COLORS.pink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s2[0], s2[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke();
      label(ctx, 'THEIR now', s1[0] - 4, s1[1] - 8, { color: COLORS.pink, size: compact ? 11 : 13.5, align: 'right' });

      // the events
      for (const e of EVENTS) {
        const [px, py] = P(e.x, e.t);
        rc.circle(px, py, 11, opts(2010 + e.key.charCodeAt(0), { stroke: COLORS[e.col], strokeWidth: 2 }));
        label(ctx, e.key, px, py + 4, { color: COLORS[e.col], size: compact ? 11 : 13, align: 'center' });
        if (!compact) label(ctx, e.name, px + 14, py - 8, { color: COLORS[e.col], size: 11 });
        // a faint tie-line to each observer's now, so "when they think it happened" is visible
        const tp = this.tPrime(e, b);
        const foot = P(b * tp, tp);
        ctx.strokeStyle = COLORS.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(foot[0], foot[1]); ctx.stroke(); ctx.setLineDash([]);
      }

      label(ctx, compact ? 'tilt the pink line — that is their "now"' : 'the pink line is the other observer\'s "now". Tilt it and the order of the pink and orange events flips — but never A before B.',
        w / 2, compact ? 20 : 26, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
      notToScale(rc, ctx, compact ? w - 68 : w - 86, h - 34);
    }

    renderAndromeda() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const a = this.andromeda();
      const groundY = h * 0.70;

      // --- the street ---
      this.cache.draw(`ground-${w}x${h}`, (g) => g.line(0, groundY, w * 0.62, groundY,
        opts(2100, { stroke: COLORS.ink, strokeWidth: 2 })));
      for (let i = 0; i < 7; i++) {
        this.cache.draw(`paving-${i}-${w}x${h}`, (g) => g.line(
          (i + 1) * (w * 0.62 / 8), groundY, (i + 1) * (w * 0.62 / 8), groundY + 14,
          opts(2101 + i, { stroke: COLORS.muted, strokeWidth: 1 }),
        ));
      }
      // a lamp post and a bench, so it reads as a street rather than a line
      this.cache.draw(`lamp-${w}x${h}`, (g) => g.line(w * 0.06, groundY, w * 0.06, groundY - 84,
        opts(2110, { stroke: COLORS.muted, strokeWidth: 1.8 })));
      this.cache.draw(`lamph-${w}x${h}`, (g) => g.path(
        `M ${w * 0.06} ${groundY - 84} q 16 -6 26 6`, opts(2111, { stroke: COLORS.muted, strokeWidth: 1.5 })));
      this.cache.draw(`lampg-${w}x${h}`, (g) => g.circle(w * 0.06 + 28, groundY - 74, 13,
        opts(2112, { stroke: COLORS.yellow, strokeWidth: 1.5 })));
      this.cache.draw(`bench-${w}x${h}`, (g) => g.rectangle(w * 0.40, groundY - 22, 62, 6,
        opts(2113, { stroke: COLORS.orange, strokeWidth: 1.5 })));
      this.cache.draw(`benchl1-${w}x${h}`, (g) => g.line(w * 0.40 + 6, groundY - 16, w * 0.40 + 6, groundY,
        opts(2114, { stroke: COLORS.orange, strokeWidth: 1.4 })));
      this.cache.draw(`benchl2-${w}x${h}`, (g) => g.line(w * 0.40 + 54, groundY - 16, w * 0.40 + 54, groundY,
        opts(2115, { stroke: COLORS.orange, strokeWidth: 1.4 })));

      // the two people
      const standX = w * 0.20;
      const walkX = w * 0.20 + 66 + Math.sin(this.phase * 0.8) * 10;
      stickFigure(rc, standX, groundY - 62, { scale: compact ? 0.72 : 0.9, seed: 2120, color: COLORS.cyan });
      label(ctx, 'standing still', standX, groundY + 30, { color: COLORS.cyan, size: compact ? 10.5 : 12.5, align: 'center' });
      stickFigure(rc, walkX, groundY - 62, { scale: compact ? 0.72 : 0.9, seed: 2121, color: COLORS.pink });
      label(ctx, this.walker.name, walkX, groundY + 46, { color: COLORS.pink, size: compact ? 10.5 : 12.5, align: 'center' });
      doodleArrow(rc, walkX + 22, groundY - 46, walkX + 52, groundY - 46, { color: COLORS.pink, seed: 2122, strokeWidth: 1.4 });

      // --- Andromeda, far to the right ---
      const ax = w * 0.84;
      const ay = h * 0.30;
      this.cache.draw(`gal-${w}x${h}`, (g) => g.ellipse(ax, ay, 128, 50, opts(2130, { stroke: COLORS.ink, strokeWidth: 1.8 })));
      this.cache.draw(`galc-${w}x${h}`, (g) => g.ellipse(ax, ay, 46, 20, opts(2131, {
        stroke: COLORS.yellow, strokeWidth: 1.5, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.6, hachureGap: 5,
      })));
      for (let i = 0; i < 10; i++) {
        const t = (i * 0.6180339887) % 1;
        sparkle(rc, ax - 60 + t * 120, ay - 26 + ((i * 0.7548776662) % 1) * 52, 3,
          { color: COLORS.muted, seed: 2140 + i });
      }
      label(ctx, 'the Andromeda galaxy', ax, ay + 44, { color: COLORS.ink, size: compact ? 10.5 : 12.5, align: 'center' });
      label(ctx, '2.537 million light-years away', ax, ay + 60, { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'center' });

      // the two "now" slices arriving at Andromeda, separated by the computed days
      // The two sight-lines land at different moments of Andromeda's history.
      // Labels sit at each line's MIDPOINT, not at its far end: the far end is
      // beside the galaxy and under the two header lines, which collide there.
      const sliceY1 = ay - 54;
      const sliceY2 = ay - 54 + Math.min(44, 12 + Math.log10(Math.max(a.days, 0.01) + 1) * 24);
      const y0 = groundY - 96;
      ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1.8; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(standX, y0); ctx.lineTo(ax - 70, sliceY1); ctx.stroke();
      ctx.strokeStyle = COLORS.pink;
      ctx.beginPath(); ctx.moveTo(walkX, y0); ctx.lineTo(ax - 70, sliceY2); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, 'the stander\'s "now" there', (standX + ax - 70) / 2, (y0 + sliceY1) / 2 - 8,
        { color: COLORS.cyan, size: compact ? 9.5 : 11.5, align: 'center' });
      label(ctx, `the walker's — ${fmtNum(a.days, 1)} days apart`, (walkX + ax - 70) / 2, (y0 + sliceY2) / 2 + 16,
        { color: COLORS.pink, size: compact ? 9.5 : 11.5, align: 'center' });

      label(ctx, `${fmtNum(a.days, 2)} days of Andromeda's history`, w / 2, compact ? 22 : 28,
        { color: COLORS.yellow, size: compact ? 12.5 : 17, align: 'center' });
      label(ctx, `decided by whether you are ${this.walker.name} or standing still  ·  Δt = γβx/c`,
        w / 2, compact ? 40 : 48, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
      notToScale(rc, ctx, compact ? w - 68 : w - 86, h - 34);
    }

    render() {
      if (this.mode === 'andromeda') return this.renderAndromeda();
      this.renderDiagram();
    }
  }

  A.register('blockUniverse', BlockUniverseSim);
})();
