// Neuroscience Sim 1 — The anatomy of learning.
//
// A multi-scale, multi-activity sandbox. The stick figure performs an activity;
// four zoom levels show what physically changes when it learns:
//   brain   — which regions activate, and the signal's path
//   neuron  — an action potential racing down a (progressively myelinated) axon
//   synapse — vesicles releasing neurotransmitter onto receptors (LTP grows them)
//   dna     — gene expression building the proteins that make a memory last
//
// Accuracy notes (all values are real, order-of-magnitude where noted):
//   rest −70 mV, spike peak +40 mV, ~1 ms (Hodgkin–Huxley 1952)
//   conduction 0.5–1 m/s unmyelinated → up to ~120 m/s myelinated (saltatory)
//   synaptic cleft ~20 nm; ~86 billion neurons, ~1e14 synapses (Herculano-Houzel)
//   dopamine burst δ = r − r̂, shrinks to 0 as the reward becomes predicted (Schultz)
//   DNA does NOT store memories: it is the innate blueprint AND, via gene
//   expression (CREB → new proteins), what converts short- to long-term memory
//   (Kandel 2001). The sim states this explicitly rather than overclaiming.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, stickFigure, doodleArrow, sparkle, notToScale,
    slider, buttonRow, actionButton, setReadout,
  } = A;

  // Signal path per activity: ordered region keys with a short "what happens".
  const ACTIVITIES = {
    stove: {
      name: 'touch a hot stove',
      color: COLORS.red,
      reward: false,
      path: ['hand', 'spinal', 'sensory', 'amygdala', 'hippocampus'],
      lesson: 'the hand pulls back via a SPINAL reflex before the brain even feels pain — then the amygdala tags it "danger" and the hippocampus files it so you are wary next time.',
      cite: '1906 Sherrington - The Integrative Action of the Nervous System',
    },
    ball: {
      name: 'learn a jump shot',
      color: COLORS.orange,
      reward: true,
      path: ['prefrontal', 'motor', 'cerebellum', 'hand', 'dopamine'],
      lesson: 'the motor cortex commands the move, the cerebellum fine-tunes the timing, and when it goes in, dopamine says "better than expected — do that again". Practice myelinates the circuit so it gets faster and smoother.',
      cite: '2005 Bengtsson et al. - Extensive Piano Practicing Has Regionally Specific Effects on White Matter Development',
    },
    word: {
      name: 'learn a new word',
      color: COLORS.cyan,
      reward: false,
      path: ['sensory', 'hippocampus', 'prefrontal', 'cortex'],
      lesson: 'the hippocampus rapidly encodes the new fact and, especially during sleep, gradually transfers it into the cortex for long-term storage. This is exactly the ability patient H.M. lost.',
      cite: '1957 Scoville, Milner - Loss of Recent Memory after Bilateral Hippocampal Lesions',
    },
    decide: {
      name: 'decide (hungry, sees food)',
      color: COLORS.green,
      reward: true,
      path: ['hypothalamus', 'hippocampus', 'prefrontal', 'dopamine'],
      lesson: 'the hypothalamus reports hunger, the hippocampus recalls where food is, the prefrontal cortex weighs it against everything you know, and dopamine estimates the expected value. A judgement is a prediction built from priors + body state.',
      cite: '1997 Schultz, Dayan, Montague - A Neural Substrate of Prediction and Reward',
    },
  };

  // Region layout in a side-view brain (front = left). Coords are fractions of
  // the brain bounding box; "deep" regions are drawn dashed to read as interior.
  const REGIONS = {
    prefrontal: { fx: 0.20, fy: 0.42, label: 'prefrontal cortex', color: COLORS.cyan, deep: false },
    motor: { fx: 0.46, fy: 0.24, label: 'motor cortex', color: COLORS.orange, deep: false },
    sensory: { fx: 0.60, fy: 0.26, label: 'somatosensory cortex', color: COLORS.pink, deep: false },
    cortex: { fx: 0.74, fy: 0.40, label: 'cortex (long-term store)', color: COLORS.cyan, deep: false },
    hippocampus: { fx: 0.55, fy: 0.60, label: 'hippocampus', color: COLORS.cyan, deep: true },
    amygdala: { fx: 0.44, fy: 0.63, label: 'amygdala', color: COLORS.red, deep: true },
    hypothalamus: { fx: 0.40, fy: 0.72, label: 'hypothalamus', color: COLORS.green, deep: true },
    cerebellum: { fx: 0.82, fy: 0.70, label: 'cerebellum', color: COLORS.orange, deep: false },
    dopamine: { fx: 0.52, fy: 0.80, label: 'dopamine (VTA)', color: COLORS.orange, deep: true },
    spinal: { fx: 0.44, fy: 0.95, label: 'spinal cord', color: COLORS.muted, deep: false },
    hand: { fx: 0.02, fy: 0.90, label: '(the body)', color: COLORS.ink, deep: false },
  };

  const ZOOMS = ['brain', 'neuron', 'synapse', 'dna'];
  const STEP_TIME = 0.55; // seconds the signal spends lighting each region

  class LearningSim extends Sim {
    init() {
      this.activityKey = 'stove';
      this.zoom = 'brain';
      this.reps = { stove: 0, ball: 0, word: 0, decide: 0 };
      this.t = 0;
      this.run = null;    // active run animation state
      this.pulse = 0;     // neuron/synapse/dna animation phase
      this.buildControls();
      this.updateReadout();
    }

    get act() { return ACTIVITIES[this.activityKey]; }
    get rep() { return this.reps[this.activityKey]; }
    // learning progress 0..1 (saturating) from repetitions
    get learned() { return 1 - Math.exp(-this.rep / 6); }

    buildControls() {
      const c = this.controlsEl;
      this.actBtns = buttonRow(c, Object.entries(ACTIVITIES).map(([v, a]) => ({ label: a.name, value: v })), {
        initial: 'stove',
        onSelect: (v) => {
          this.activityKey = v;
          this.cite(ACTIVITIES[v].cite);
          this.updateReadout();
          this.poke();
        },
      });
      this.zoomBtns = buttonRow(c, [
        { label: '🧠 whole brain', value: 'brain' },
        { label: 'neuron', value: 'neuron' },
        { label: 'synapse', value: 'synapse' },
        { label: 'DNA', value: 'dna' },
      ], {
        initial: 'brain',
        onSelect: (v) => {
          this.zoom = v;
          const ZC = {
            neuron: '1952 Hodgkin, Huxley - A Quantitative Description of Membrane Current and Its Application to Conduction and Excitation in Nerve',
            synapse: '1973 Bliss, Lømo - Long-Lasting Potentiation of Synaptic Transmission in the Dentate Area of the Anaesthetized Rabbit',
            dna: '2001 Kandel - The Molecular Biology of Memory Storage: A Dialogue Between Genes and Synapses',
            brain: '1894 Cajal - The Croonian Lecture: La Fine Structure des Centres Nerveux',
          };
          this.cite(ZC[v]);
          this.updateReadout();
          this.poke();
        },
      });
      actionButton(c, 'do it once', () => this.startRun());
      actionButton(c, 'practise ×10', () => {
        this.reps[this.activityKey] += 10;
        this.cite('1949 Hebb - The Organization of Behavior: A Neuropsychological Theory');
        this.startRun();
      });
      actionButton(c, 'reset learning', () => {
        this.reps[this.activityKey] = 0;
        this.run = null;
        this.updateReadout();
        this.poke();
      });
    }

    startRun() {
      this.run = { t0: this.t, step: 0 };
      if (!this._countedThisRun) this.reps[this.activityKey] += 1;
      this.updateReadout();
      this.poke();
    }

    // conduction speed (m/s) grows with myelination (learning)
    get speed() { return 1 + this.learned * 118; }
    // dopamine reward-prediction error: big when novel, →0 when learned
    get rpe() { return this.act.reward ? Math.max(0, 1 - this.learned) : 0; }

    updateReadout() {
      const pct = Math.round(this.learned * 100);
      const lines = [
        [[`activity: `, null], [this.act.name, 'yellow'],
         [`   ·   practised `, null], [`${this.rep}×`, 'cyan'],
         [`   ·   learned: `, null], [`${pct}%`, 'green']],
        [[this.act.lesson, null]],
      ];
      if (this.zoom === 'neuron') {
        lines.push([
          ['signal speed now: ', null], [`${this.speed.toFixed(0)} m/s`, 'yellow'],
          [' (unmyelinated ~1 m/s → myelinated up to ~120 m/s). Each spike: ', null],
          ['−70 mV → +40 mV in ~1 ms', 'cyan'],
        ]);
      } else if (this.zoom === 'synapse') {
        lines.push([
          ['synaptic strength: ', null], [`${pct}%`, 'pink'],
          ['. Firing together adds receptors, so the same signal lands harder — Long-Term Potentiation. You have ~10¹⁴ of these.', null],
        ]);
        if (this.act.reward) {
          lines.push([['dopamine surprise δ = r − r̂ = ', null], [this.rpe.toFixed(2), 'orange'],
            [this.rpe < 0.15 ? ' — fully expected now, so barely any dopamine. That is what "learned" feels like chemically.' : ' — still better than expected, so dopamine says keep going.', null]]);
        }
      } else if (this.zoom === 'dna') {
        lines.push([
          ['DNA does NOT store this memory. It (1) built your innate wiring before birth, and (2) once a synapse is used hard enough, gene expression makes new proteins that make the change PERMANENT — short-term → long-term. ', null],
          [pct >= 60 ? 'consolidated: genes have been read, proteins built.' : 'practise more to trigger consolidation.', pct >= 60 ? 'green' : 'muted'],
        ]);
      } else {
        lines.push([['how it judges: ', 'yellow'],
          ['a decision = current senses + learned priors (synaptic weights) + innate priors (DNA) + body state. The brain is a prediction machine (well-supported theory).', null]]);
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      this.pulse += dt;
      if (this.run) {
        const elapsed = this.t - this.run.t0;
        // faster stepping as the skill is learned (myelination)
        const stepDur = STEP_TIME * (this.zoom === 'brain' ? (1 - this.learned * 0.55) : 1);
        this.run.step = elapsed / stepDur;
        this._countedThisRun = true;
        if (this.run.step > this.act.path.length + 0.5) {
          this.run = null;
          this._countedThisRun = false;
        }
      }
    }

    render() {
      if (this.zoom === 'brain') this.renderBrain();
      else if (this.zoom === 'neuron') this.renderNeuron();
      else if (this.zoom === 'synapse') this.renderSynapse();
      else this.renderDNA();
      // shared zoom breadcrumb
      const { ctx } = this;
      label(ctx, `zoom: whole brain → neuron → synapse → DNA   (you are at: ${this.zoom})`,
        12, this.h - 12, { color: COLORS.muted, size: 12.5 });
    }

    /* ---------------- brain view ---------------- */
    renderBrain() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      // left: stick figure activity scene
      const sceneW = compact ? w : w * 0.42;
      this.drawActivityScene(0, 0, sceneW, h);
      if (!compact) {
        this.cache.draw(`vdiv-${w}x${h}`, (g) => g.line(sceneW, 20, sceneW, h - 26, opts(60, {
          stroke: COLORS.muted, strokeWidth: 1.1, strokeLineDash: [8, 8],
        })));
      }
      // right: the brain
      const bx = compact ? 0 : sceneW;
      const bw = compact ? w : w - sceneW;
      this.drawBrain(bx + 12, 26, bw - 24, h - 70);
    }

    drawActivityScene(x, y, w, h) {
      const { rc, ctx } = this;
      const cx = x + w * 0.42;
      const groundY = y + h * 0.72;
      // stick figure
      stickFigure(rc, cx, groundY - 70, { scale: 1.15, seed: 12, color: COLORS.ink });
      // activity-specific prop
      const k = this.activityKey;
      const hot = this.run && this.run.step < 1.5;
      if (k === 'stove') {
        rc.rectangle(cx + 44, groundY - 26, 48, 26, opts(70, { stroke: COLORS.muted, strokeWidth: 2 }));
        // heat squiggles
        for (let i = 0; i < 3; i++) {
          rc.path(`M ${cx + 54 + i * 14} ${groundY - 30} q 5 -8 0 -16 q -5 -8 0 -16`, opts(71 + i, { stroke: COLORS.red, strokeWidth: 1.4 }));
        }
        label(ctx, hot ? 'OW! (hand yanks back)' : 'a hot stove', cx + 68, groundY + 18, { color: hot ? COLORS.red : COLORS.muted, size: 13, align: 'center' });
      } else if (k === 'ball') {
        const made = this.run && this.run.step > 3.5;
        rc.circle(cx + 70, groundY - 96, 20, opts(72, { stroke: COLORS.orange, strokeWidth: 2 }));
        rc.line(cx + 60, groundY - 40, cx + 80, groundY - 40, opts(73, { stroke: COLORS.muted, strokeWidth: 1.6 })); // hoop base
        rc.ellipse(cx + 70, groundY - 44, 30, 10, opts(74, { stroke: COLORS.orange, strokeWidth: 1.6 })); // rim
        label(ctx, made ? 'swish! 🏀' : 'a jump shot', cx + 70, groundY + 18, { color: made ? COLORS.green : COLORS.muted, size: 13, align: 'center' });
      } else if (k === 'word') {
        rc.rectangle(cx + 40, groundY - 96, 64, 40, opts(75, { stroke: COLORS.cyan, strokeWidth: 1.8 }));
        label(ctx, '"petrichor"', cx + 72, groundY - 72, { color: COLORS.cyan, size: 14, align: 'center' });
        label(ctx, 'a new word', cx + 72, groundY + 18, { color: COLORS.muted, size: 13, align: 'center' });
      } else {
        rc.path(`M ${cx + 56} ${groundY - 58} q 14 -18 28 0 q -2 20 -14 26 q -12 -6 -14 -26 z`, opts(76, { stroke: COLORS.green, strokeWidth: 1.8 })); // apple
        rc.line(cx + 70, groundY - 60, cx + 72, groundY - 70, opts(77, { stroke: COLORS.green, strokeWidth: 1.4 }));
        label(ctx, 'food (and you\'re hungry)', cx + 70, groundY + 18, { color: COLORS.muted, size: 13, align: 'center' });
      }
      // ground line
      this.cache.draw(`ground-${x | 0}-${w | 0}`, (g) => g.line(x + 12, groundY + 30, x + w - 12, groundY + 30, opts(78, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      label(ctx, this.run ? 'signal travelling…' : 'press "do it once" ▶', cx, y + 24, { color: COLORS.yellow, size: 14, align: 'center' });
    }

    drawBrain(x, y, w, h) {
      const { rc, ctx } = this;
      // brain outline (side view, front-left) — a rough bumpy blob + cerebellum + brainstem
      this.cache.draw(`brain-${x | 0}-${w | 0}-${h | 0}`, (g) => g.path(
        `M ${x + w * 0.12} ${y + h * 0.5}
         q ${w * 0.02} ${-h * 0.42} ${w * 0.30} ${-h * 0.44}
         q ${w * 0.30} ${-h * 0.04} ${w * 0.40} ${h * 0.14}
         q ${w * 0.14} ${h * 0.10} ${w * 0.10} ${h * 0.34}
         q ${-w * 0.04} ${h * 0.20} ${-w * 0.22} ${h * 0.22}
         q ${-w * 0.30} ${h * 0.02} ${-w * 0.46} ${-h * 0.06}
         q ${-w * 0.12} ${-h * 0.08} ${-w * 0.10} ${-h * 0.30} z`,
        opts(80, { stroke: COLORS.ink, strokeWidth: 2 }),
      ));
      // brainstem + spinal cord going down
      const stemX = x + w * 0.44;
      const stemY = y + h * 0.86;
      this.cache.draw(`stem-${x | 0}-${h | 0}`, (g) => g.path(`M ${stemX} ${y + h * 0.74} q ${-4} ${h * 0.12} ${-2} ${h * 0.24}`, opts(81, { stroke: COLORS.muted, strokeWidth: 3 })));

      const pos = (key) => {
        const r = REGIONS[key];
        return [x + r.fx * w, y + r.fy * h];
      };

      // active region from the current run step
      let activeKey = null;
      let arrivedKeys = new Set();
      if (this.run) {
        const s = Math.floor(this.run.step);
        const path = this.act.path;
        for (let i = 0; i < Math.min(s, path.length); i++) arrivedKeys.add(path[i]);
        if (s < path.length) activeKey = path[s];
        // draw the signal path arrows between consecutive brain regions
        for (let i = 0; i < Math.min(s, path.length - 1); i++) {
          const a = REGIONS[path[i]]; const b = REGIONS[path[i + 1]];
          if (!a || !b) continue;
          const [ax, ay] = pos(path[i]);
          const [bx2, by2] = pos(path[i + 1]);
          doodleArrow(rc, ax, ay, bx2, by2, { color: this.act.color, seed: 90 + i, strokeWidth: 1.6 });
        }
      }

      // draw all regions used by this activity (others faint)
      const inPath = new Set(this.act.path);
      for (const key of Object.keys(REGIONS)) {
        if (key === 'hand') continue;
        const r = REGIONS[key];
        const [rx, ry] = pos(key);
        const used = inPath.has(key);
        const active = key === activeKey;
        const arrived = arrivedKeys.has(key);
        if (!used && this.zoom === 'brain') {
          // faint unused region dot
          ctx.globalAlpha = 0.25;
        }
        const col = active ? COLORS.yellow : (used ? r.color : COLORS.muted);
        const rad = active ? 15 : 10;
        rc.circle(rx, ry, rad * 2, opts(100 + key.length, {
          stroke: col, strokeWidth: active ? 2.4 : 1.6,
          strokeLineDash: r.deep ? [4, 4] : undefined,
          fill: active ? col : undefined, fillStyle: active ? 'solid' : undefined,
        }));
        ctx.globalAlpha = 1;
        if (used || this.zoom === 'brain') {
          label(ctx, r.label, rx + (r.fx > 0.6 ? -14 : 14), ry + 3, {
            color: used ? r.color : COLORS.muted,
            size: 11.5, align: r.fx > 0.6 ? 'right' : 'left',
          });
        }
      }

      // reflex highlight for the stove: spinal loop drawn bold and labelled
      if (this.activityKey === 'stove' && this.run && this.run.step < 2) {
        const [sx, sy] = pos('spinal');
        label(ctx, 'spinal reflex — no brain needed, ~1/50 s', sx + 18, sy + 20, { color: COLORS.red, size: 12, align: 'left' });
      }
      label(ctx, 'the brain: ~86 billion neurons', x + w * 0.5, y - 6, { color: COLORS.muted, size: 12.5, align: 'center' });
    }

    /* ---------------- neuron view ---------------- */
    renderNeuron() {
      const { rc, ctx, w, h } = this;
      const cy = h * 0.44;
      const somaX = w * 0.16;
      // dendrites (incoming)
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + i * 0.45;
        rc.line(somaX, cy, somaX - 60 * Math.cos(a), cy - 60 * Math.sin(a), opts(120 + i, { stroke: COLORS.cyan, strokeWidth: 1.6 }));
        rc.line(somaX - 60 * Math.cos(a), cy - 60 * Math.sin(a), somaX - 84 * Math.cos(a + 0.15), cy - 84 * Math.sin(a + 0.15), opts(130 + i, { stroke: COLORS.cyan, strokeWidth: 1.2 }));
      }
      label(ctx, 'dendrites — collect incoming signals', somaX - 70, cy - 74, { color: COLORS.cyan, size: 12.5, align: 'center' });
      // soma
      rc.circle(somaX, cy, 46, opts(121, { stroke: COLORS.ink, strokeWidth: 2.2 }));
      rc.circle(somaX, cy, 18, opts(122, { stroke: COLORS.muted, strokeWidth: 1.4, strokeLineDash: [3, 3] })); // nucleus
      label(ctx, 'cell body (soma)', somaX, cy + 62, { color: COLORS.ink, size: 12.5, align: 'center' });
      // axon to the right, with myelin segments proportional to learning
      const axonX0 = somaX + 46;
      const axonX1 = w - 60;
      this.cache.draw(`axon-${w}`, (g) => g.line(axonX0, cy, axonX1, cy, opts(123, { stroke: COLORS.ink, strokeWidth: 2 })));
      const nMyelin = Math.round(1 + this.learned * 6);
      const segW = (axonX1 - axonX0) / 8;
      for (let i = 0; i < nMyelin; i++) {
        const mx = axonX0 + 14 + i * segW;
        rc.ellipse(mx + segW * 0.4, cy, segW * 0.7, 20, opts(140 + i, { stroke: COLORS.yellow, strokeWidth: 1.6 }));
      }
      label(ctx, `myelin sheath ×${nMyelin} — grows with practice, speeds the spike`, (axonX0 + axonX1) / 2, cy - 34, { color: COLORS.yellow, size: 12.5, align: 'center' });
      label(ctx, 'axon', axonX0 + 30, cy + 30, { color: COLORS.muted, size: 12, align: 'left' });
      // terminals
      for (let i = 0; i < 3; i++) {
        rc.line(axonX1, cy, axonX1 + 20, cy - 16 + i * 16, opts(150 + i, { stroke: COLORS.green, strokeWidth: 1.6 }));
        rc.circle(axonX1 + 24, cy - 16 + i * 16, 8, opts(153 + i, { stroke: COLORS.green, strokeWidth: 1.4 }));
      }
      label(ctx, 'axon terminals → synapses', axonX1 + 4, cy + 40, { color: COLORS.green, size: 12, align: 'center' });

      // travelling action potential
      const period = 2.2 / (0.4 + this.learned); // faster when myelinated
      const ph = (this.pulse % period) / period;
      const px = axonX0 + ph * (axonX1 - axonX0);
      ctx.fillStyle = COLORS.pink;
      ctx.beginPath();
      ctx.arc(px, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      // little voltage flag
      label(ctx, '+40 mV', px, cy - 26, { color: COLORS.pink, size: 12, align: 'center' });

      // mini voltage trace
      const gy = h - 66;
      const gx0 = w * 0.16;
      const gx1 = w * 0.62;
      this.cache.draw(`vaxis-${w}x${h}`, (g) => g.line(gx0, gy, gx1, gy, opts(160, { stroke: COLORS.muted, strokeWidth: 1 })));
      ctx.strokeStyle = COLORS.pink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const local = (t - (ph)) ;
        const spike = Math.exp(-Math.pow(local * 12, 2)) - 0.25 * Math.exp(-Math.pow((local - 0.12) * 8, 2));
        const x = gx0 + t * (gx1 - gx0);
        const yv = gy - spike * 34 + 8;
        if (i === 0) ctx.moveTo(x, yv); else ctx.lineTo(x, yv);
      }
      ctx.stroke();
      label(ctx, 'membrane voltage: −70 mV rest, +40 mV spike, ~1 ms  (Hodgkin–Huxley 1952)', (gx0 + gx1) / 2, gy + 22, { color: COLORS.muted, size: 12, align: 'center' });
    }

    /* ---------------- synapse view ---------------- */
    renderSynapse() {
      const { rc, ctx, w, h } = this;
      const cx = w * 0.5;
      const preY = h * 0.24;
      const postY = h * 0.62;
      // presynaptic terminal
      rc.path(`M ${cx - 130} ${preY - 40} q 130 -30 260 0 q 20 40 -10 70 q -120 26 -240 0 q -30 -30 -10 -70 z`, opts(180, { stroke: COLORS.ink, strokeWidth: 2 }));
      label(ctx, 'sending neuron (axon terminal)', cx, preY - 46, { color: COLORS.ink, size: 13, align: 'center' });
      // postsynaptic membrane
      rc.line(cx - 150, postY, cx + 150, postY, opts(181, { stroke: COLORS.ink, strokeWidth: 2.4 }));
      label(ctx, 'receiving neuron (dendrite)', cx, postY + 54, { color: COLORS.ink, size: 13, align: 'center' });
      label(ctx, 'the gap — a synaptic cleft ~20 nm wide', cx, (preY + postY) / 2 + 4, { color: COLORS.muted, size: 12, align: 'center' });

      // vesicles (top)
      for (let i = 0; i < 4; i++) {
        rc.circle(cx - 80 + i * 46, preY + 6, 12, opts(190 + i, { stroke: COLORS.green, strokeWidth: 1.4 }));
      }
      // neurotransmitter crossing (animated)
      const reward = this.act.reward;
      const ntColor = reward ? COLORS.orange : COLORS.green;
      const flow = (this.pulse * 0.6) % 1;
      const nMol = 6 + Math.round(this.learned * 10);
      for (let i = 0; i < nMol; i++) {
        const ph = (flow + i / nMol) % 1;
        const mx = cx - 90 + (i % 6) * 34 + Math.sin(i) * 6;
        const my = preY + 18 + ph * (postY - preY - 22);
        ctx.fillStyle = ntColor;
        ctx.globalAlpha = 0.5 + 0.5 * (1 - ph);
        ctx.beginPath();
        ctx.arc(mx, my, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      label(ctx, reward ? 'neurotransmitter (dopamine)' : 'neurotransmitter molecules', cx - 150, preY + 30, { color: ntColor, size: 12, align: 'left' });

      // receptors on the postsynaptic side — MORE with learning (LTP)
      const nRec = 4 + Math.round(this.learned * 10);
      for (let i = 0; i < nRec; i++) {
        const rxp = cx - 130 + i * (260 / Math.max(nRec - 1, 1));
        rc.path(`M ${rxp - 5} ${postY} l 0 -8 l 10 0 l 0 8`, opts(200 + i, { stroke: COLORS.pink, strokeWidth: 1.6 }));
      }
      label(ctx, `receptors ×${nRec} — LTP adds more, so the signal lands harder`, cx, postY + 26, { color: COLORS.pink, size: 12.5, align: 'center' });

      // strength meter
      const pct = Math.round(this.learned * 100);
      label(ctx, `synaptic strength: ${pct}%`, cx, 26, { color: COLORS.pink, size: 15, align: 'center' });
      notToScale(rc, ctx, w - 80, 26);
    }

    /* ---------------- DNA view ---------------- */
    renderDNA() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      // nucleus
      rc.circle(w * 0.22, h * 0.5, Math.min(w, h) * 0.38, opts(220, { stroke: COLORS.muted, strokeWidth: 1.6, strokeLineDash: [5, 5] }));
      label(ctx, 'cell nucleus', w * 0.22, h * 0.5 - Math.min(w, h) * 0.2 - 8, { color: COLORS.muted, size: 12.5, align: 'center' });
      // double helix
      const hx = w * 0.22;
      const hy0 = h * 0.28;
      const hy1 = h * 0.72;
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 2;
      for (const off of [0, Math.PI]) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          const y = hy0 + t * (hy1 - hy0);
          const x = hx + Math.sin(t * Math.PI * 4 + off) * 26;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // rungs
      ctx.strokeStyle = COLORS.pink;
      ctx.lineWidth = 1.2;
      for (let i = 1; i < 40; i += 3) {
        const t = i / 40;
        const y = hy0 + t * (hy1 - hy0);
        const x1 = hx + Math.sin(t * Math.PI * 4) * 26;
        const x2 = hx + Math.sin(t * Math.PI * 4 + Math.PI) * 26;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      }
      label(ctx, 'DNA — the double helix', hx, hy1 + 20, { color: COLORS.cyan, size: 13, align: 'center' });

      // two roles, right side
      const rx = w * 0.5;
      // role 1: innate blueprint
      label(ctx, '1. THE BLUEPRINT (innate prior)', rx, h * 0.22, { color: COLORS.green, size: 14, align: 'left' });
      label(ctx, 'builds your baseline brain wiring before', rx, h * 0.22 + 20, { color: COLORS.muted, size: 12.5, align: 'left' });
      label(ctx, 'you learn anything — reflexes, instincts.', rx, h * 0.22 + 38, { color: COLORS.muted, size: 12.5, align: 'left' });

      // role 2: gene expression → protein → lasting memory
      const consolidated = this.learned >= 0.6;
      label(ctx, '2. THE PRINT SHOP (makes memory last)', rx, h * 0.5, { color: COLORS.orange, size: 14, align: 'left' });
      // gene -> mRNA -> ribosome -> protein chain
      const gy = h * 0.5 + 30;
      const steps = [['gene', COLORS.cyan], ['mRNA', COLORS.pink], ['protein', COLORS.orange]];
      let sx = rx + 6;
      steps.forEach(([txt, col], i) => {
        rc.rectangle(sx, gy, 66, 24, opts(230 + i, { stroke: col, strokeWidth: 1.6 }));
        label(ctx, txt, sx + 33, gy + 16, { color: col, size: 12.5, align: 'center' });
        if (i < 2) doodleArrow(rc, sx + 66, gy + 12, sx + 82, gy + 12, { color: COLORS.muted, seed: 240 + i, strokeWidth: 1.4 });
        sx += 84;
      });
      label(ctx, consolidated
        ? '✓ used hard enough → genes read, new proteins built → the synapse change is now PERMANENT.'
        : 'practise more (≥60%) to trigger this — otherwise the memory fades.',
        rx + 6, gy + 44, { color: consolidated ? COLORS.green : COLORS.muted, size: 12.5, align: 'left' });
      label(ctx, 'memories are NOT written into the DNA sequence.', rx + 6, gy + 66, { color: COLORS.yellow, size: 12.5, align: 'left' });

      sparkle(rc, w - 50, 40, 6, { color: COLORS.pink, seed: 250 });
    }
  }

  A.register('learning', LearningSim);
})();
