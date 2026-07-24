// Sim 41 — The grandfather paradox: the billiard-ball version.
//
// This is the ACTUAL physics formulation (1990 Friedman, Morris, Novikov,
// Echeverria, Klinkhammer, Thorne, Yurtsever): a wormhole time machine whose
// exit mouth sits Δt in the past. Aim a billiard ball at the entrance; its
// older self can emerge FIRST and hit the younger ball — apparently preventing
// the trip. Two resolutions, both animated from the same user aim:
//  - NOVIKOV: only self-consistent histories occur. Echeverria & Klinkhammer
//    showed a consistent solution exists for EVERY initial aim — typically a
//    glancing blow that deflects the young ball INTO the mouth on exactly the
//    trajectory that produces that glancing blow. The sim renders that loop.
//  - MANY WORLDS (Deutsch 1991): the emerging ball belongs to another branch;
//    in branch B it fully blocks the young ball — no contradiction, because
//    branch A (where the ball entered) still exists. Split-screen rendering.
// Evidence: speculative — no time machine exists (Hawking's chronology
// protection conjecture argues none can), but the consistency MATH is real.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, sparkle,
    slider, buttonRow, actionButton, setReadout, fmtNum,
  } = A;

  class GrandfatherSim extends Sim {
    init() {
      this.mode = 'novikov'; // 'novikov' | 'manyworlds'
      this.aim = 0.35;       // aim offset (slider): 0 = dead-on paradox attempt
      this.run = null;       // animation state {t}
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    // scene geometry (fractions of canvas)
    mouthA() { return [this.w * 0.72, this.h * 0.62]; }   // entrance, "NOW"
    mouthB() { return [this.w * 0.28, this.h * 0.30]; }   // exit, "5 min AGO"
    launchPt() { return [this.w * 0.12, this.h * 0.78]; }

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'Novikov: one consistent history', value: 'novikov' },
        { label: 'Deutsch: many worlds', value: 'manyworlds' },
      ], {
        initial: 'novikov',
        onSelect: (v) => {
          this.mode = v;
          this.run = null;
          this.cite(v === 'novikov'
            ? '1990 Friedman, Morris, Novikov, Echeverria, Klinkhammer, Thorne, Yurtsever - Cauchy Problem in Spacetimes with Closed Timelike Curves'
            : '1991 Deutsch - Quantum Mechanics near Closed Timelike Lines');
          this.updateReadout();
          this.poke();
        },
      });
      this.aimSlider = slider(c, {
        label: 'your aim (0 = try hardest to cause the paradox)',
        min: 0, max: 1, step: 0.01, value: this.aim,
        format: (v) => (v < 0.15 ? 'dead-on paradox attempt' : v < 0.6 ? 'partly off-axis' : 'well off-axis'),
        oninput: (v) => { this.aim = v; this.run = null; this.updateReadout(); this.poke(); },
      });
      actionButton(c, 'run the experiment', () => {
        this.run = { t: 0 };
        this.poke();
      });
      actionButton(c, 'will nature even allow it?', () => {
        this.cite('1992 Hawking - Chronology Protection Conjecture');
        setReadout(this.readoutEl, [
          [['Hawking\'s chronology protection conjecture: quantum effects pile up and destroy any region about to form a time loop — "making the world safe for historians." Unproven; the verdict needs quantum gravity.', 'orange']],
        ]);
      });
    }

    updateReadout() {
      const lines = [];
      if (this.mode === 'novikov') {
        lines.push([
          ['Novikov self-consistency: the universe only runs histories that agree with themselves. ', null],
          ['Proven for billiards: EVERY aim you choose has at least one consistent solution.', 'green'],
        ]);
        lines.push([[
          this.aim < 0.15
            ? 'you aimed to cause the paradox — watch: the emerging ball strikes a GLANCING blow that still sends the young ball into the machine, on exactly the path that produces that blow. The "prevention" is what causes the trip.'
            : 'off-axis aims resolve even more gently — the loop closes with a light touch. (Some aims even have several consistent solutions; classical physics doesn\'t say which one occurs.)',
          null,
        ]]);
      } else {
        lines.push([
          ['Deutsch (1991): near a time loop, quantum mechanics sends the traveler into a DIFFERENT Everett branch. ', null],
          ['Both branches are consistent on their own:', 'cyan'],
        ]);
        lines.push([[
          'branch α: the ball flies in untouched (the trip happens). branch β: an emerged ball blocks the young one completely — no trip FROM THIS BRANCH, and no contradiction, because the arriving ball came from branch α. Grandfather-safe.',
          null,
        ]]);
      }
      lines.push([['status: thought experiment — no time machine is known, and Hawking conjectured nature forbids them. The mathematics of consistency, however, is real and published.', 'yellow']]);
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      if (this.run) {
        this.run.t += dt;
        if (this.run.t > 9) this.run = null;
      }
    }

    // path helpers: interpolate along control points
    lerpPath(pts, k) {
      const n = pts.length - 1;
      const f = Math.max(0, Math.min(0.9999, k)) * n;
      const i = Math.floor(f);
      const u = f - i;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u];
    }

    drawMouths(ox, oy, scale = 1, tag = '') {
      const { rc, ctx } = this;
      const [ax, ay] = this.mouthA();
      const [bx, by] = this.mouthB();
      const Ax = ox + ax * scale; const Ay = oy + ay * scale;
      const Bx = ox + bx * scale; const By = oy + by * scale;
      rc.circle(Ax, Ay, 52 * scale, opts(600, { stroke: COLORS.cyan, strokeWidth: 2 }));
      rc.circle(Ax, Ay, 34 * scale, opts(601, { stroke: COLORS.cyan, strokeWidth: 1.2, strokeLineDash: [4, 4] }));
      rc.circle(Bx, By, 52 * scale, opts(602, { stroke: COLORS.orange, strokeWidth: 2 }));
      rc.circle(Bx, By, 34 * scale, opts(603, { stroke: COLORS.orange, strokeWidth: 1.2, strokeLineDash: [4, 4] }));
      label(ctx, 'IN (now)' + tag, Ax, Ay + 40 * scale + 12, { color: COLORS.cyan, size: 12 * Math.max(scale, 0.8), align: 'center' });
      label(ctx, 'OUT (5 min ago)' + tag, Bx, By - 40 * scale - 6, { color: COLORS.orange, size: 12 * Math.max(scale, 0.8), align: 'center' });
      return [Ax, Ay, Bx, By];
    }

    renderNovikov() {
      const { rc, ctx, w, h } = this;
      const [Ax, Ay, Bx, By] = this.drawMouths(0, 0, 1);
      const [Lx, Ly] = this.launchPt();
      const aim = this.aim;
      // meeting point where old ball strikes young ball (between launch and A)
      const Mx = Lx + (Ax - Lx) * 0.45;
      const My = Ly + (Ay - Ly) * 0.45 - 20 * (1 - aim);

      // trajectories (control polylines)
      const youngPath = [[Lx, Ly], [Mx, My], [Ax, Ay]];                    // launch → hit → into mouth A
      const oldPath = [[Bx, By], [Mx + 8, My - 8], [w * 0.55, h * 0.05]];  // out of B → glancing hit → away

      const t = this.run ? this.run.t : 0;
      // draw faint full paths
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = COLORS.muted;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.1;
      for (const p of [youngPath, oldPath]) {
        ctx.beginPath();
        p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      if (this.run) {
        // both balls move SIMULTANEOUSLY — the old one was "already" emerging
        const k = Math.min(t / 6, 1);
        const [yx, yy] = this.lerpPath(youngPath, k);
        const [ox2, oy2] = this.lerpPath(oldPath, k);
        // young ball (solid)
        rc.circle(yx, yy, 16, opts(610, { stroke: COLORS.ink, strokeWidth: 2, fill: COLORS.ink, fillStyle: 'solid' }));
        // old ball (same ball! drawn hollow + tagged)
        rc.circle(ox2, oy2, 16, opts(611, { stroke: COLORS.yellow, strokeWidth: 2 }));
        label(ctx, 'the SAME ball, 5 min older', ox2 + 14, oy2 - 12, { color: COLORS.yellow, size: 11.5 });
        if (Math.abs(k - 0.45) < 0.06) {
          sparkle(rc, Mx + 4, My - 4, 9, { color: COLORS.red, seed: 612 });
          label(ctx, 'glancing blow!', Mx + 16, My - 18, { color: COLORS.red, size: 12.5 });
        }
        if (k >= 1) {
          label(ctx, 'the ball entered the machine BECAUSE its older self nudged it — one history, zero contradictions, cause and effect in a circle', w / 2, h - 30, { color: COLORS.green, size: 13, align: 'center' });
        }
      } else {
        // idle: cue ball + aim arrow
        rc.circle(Lx, Ly, 16, opts(613, { stroke: COLORS.ink, strokeWidth: 2, fill: COLORS.ink, fillStyle: 'solid' }));
        doodleArrow(rc, Lx, Ly, Lx + (Mx - Lx) * 0.5, Ly + (My - Ly) * 0.5, { color: COLORS.yellow, seed: 614 });
        label(ctx, 'press "run the experiment"', w / 2, 24, { color: COLORS.yellow, size: 13.5, align: 'center' });
      }
      // wormhole throat doodle connecting the mouths
      rc.path(`M ${Ax - 30} ${Ay - 30} C ${w * 0.55} ${h * 0.42} ${w * 0.45} ${h * 0.5} ${Bx + 30} ${By + 30}`, opts(615, { stroke: COLORS.muted, strokeWidth: 1, strokeLineDash: [2, 7] }));
      label(ctx, 'wormhole: IN now → OUT five minutes earlier', w * 0.5, h * 0.47, { color: COLORS.muted, size: 11, align: 'center' });
    }

    renderManyWorlds() {
      const { rc, ctx, w, h } = this;
      const t = this.run ? this.run.t : 0;
      // split screen: branch α (top) and branch β (bottom)
      const midY = h * 0.5;
      rc.path(`M 8 ${midY} q ${w * 0.25} 14 ${w * 0.5} 0 q ${w * 0.25} -14 ${w * 0.5 - 16} 0`, opts(620, { stroke: COLORS.pink, strokeWidth: 1.6, strokeLineDash: [7, 6] }));
      label(ctx, 'branch α — the trip happens', 14, 22, { color: COLORS.cyan, size: 13 });
      label(ctx, 'branch β — the trip is "prevented" (no contradiction!)', 14, midY + 22, { color: COLORS.green, size: 13 });

      const drawBranch = (oy, blocked) => {
        const scale = 0.44;
        const [Ax, Ay, Bx, By] = this.drawMouths(w * 0.06, oy, scale, '');
        const Lx = w * 0.10; const Ly = oy + this.h * 0.36 * scale + this.h * 0.28;
        const k = Math.min(t / 6, 1);
        const Mx = Lx + (Ax - Lx) * 0.5;
        const My = Ly + (Ay - Ly) * 0.5;
        if (!blocked) {
          // α: ball sails into A, disappears (emerges in ANOTHER branch)
          const p = [[Lx, Ly], [Ax, Ay]];
          const [x, y] = this.lerpPath(p, k);
          if (k < 0.98) rc.circle(x, y, 13, opts(630, { stroke: COLORS.ink, strokeWidth: 2, fill: COLORS.ink, fillStyle: 'solid' }));
          else label(ctx, '→ emerged in branch β, 5 min earlier', Ax + 8, Ay - 20, { color: COLORS.orange, size: 11 });
        } else {
          // β: a ball emerges from B and fully blocks the young ball
          const pOld = [[Bx, By], [Mx, My], [w * 0.52, oy + 30]];
          const pYoung = [[Lx, Ly], [Mx, My], [w * 0.30, Ly - 10]]; // knocked aside, never enters
          const [ox2, oy2] = this.lerpPath(pOld, k);
          const [yx, yy] = this.lerpPath(pYoung, Math.min(k, 0.9));
          rc.circle(ox2, oy2, 13, opts(631, { stroke: COLORS.yellow, strokeWidth: 2 }));
          rc.circle(yx, yy, 13, opts(632, { stroke: COLORS.ink, strokeWidth: 2, fill: COLORS.ink, fillStyle: 'solid' }));
          if (Math.abs(k - 0.5) < 0.07) sparkle(rc, Mx, My, 8, { color: COLORS.red, seed: 633 });
          if (k >= 1) label(ctx, 'blocked — and that\'s fine: the blocker came from branch α', Mx, My + 26, { color: COLORS.green, size: 11, align: 'center' });
        }
      };
      drawBranch(-h * 0.02, false);
      drawBranch(midY - h * 0.04, true);
      if (!this.run) label(ctx, 'press "run the experiment"', w / 2, h - 14, { color: COLORS.yellow, size: 13, align: 'center' });
    }

    render() {
      if (this.mode === 'novikov') this.renderNovikov();
      else this.renderManyWorlds();
    }
  }

  A.register('grandfather', GrandfatherSim);
})();
