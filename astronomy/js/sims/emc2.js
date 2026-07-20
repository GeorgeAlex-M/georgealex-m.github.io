// Sim 4 — E = mc².
//
// Physics: E = mc² with c² = 8.98755×10¹⁶ m²/s². Every displayed number is
// computed from the actual constant; benchmark energies are real published
// values (Hiroshima ≈ 15 kt, Tsar Bomba ≈ 50 Mt, world primary energy
// ≈ 6.2×10²⁰ J/yr). The fusion marker shows the Sun's exchange rate: only
// ~0.7% of fused mass converts, versus 100% for annihilation.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, stickFigure, doodleArrow,
    slider, buttonRow, actionButton, setReadout,
    C2, KT_TNT, YEAR, fmtNum, sci,
  } = A;

  const OBJECTS = {
    paperclip: { m: 1e-3, name: 'a paperclip (1 g)' },
    coin: { m: 7.5e-3, name: 'a coin (7.5 g)' },
    phone: { m: 0.2, name: 'a phone (200 g)' },
    human: { m: 70, name: 'a human (70 kg)' },
    car: { m: 1500, name: 'a car (1,500 kg)' },
  };

  const WORLD_YEAR_J = 6.2e20; // world annual primary energy (~620 EJ)
  const HIROSHIMA_J = 15 * KT_TNT;

  const BENCHMARKS = [
    [5e4, 'phone battery', COLORS.muted],
    [4.184e6, '1 kg of TNT', COLORS.muted],
    [5e9, 'lightning bolt', COLORS.cyan],
    [HIROSHIMA_J, 'Hiroshima bomb', COLORS.red],
    [2.09e17, 'Tsar Bomba', COLORS.orange],
    [WORLD_YEAR_J, 'world energy use, 1 year', COLORS.green],
  ];

  const AX_LO = 4;   // log10 J at the left end of the axis
  const AX_HI = 21;  // log10 J at the right end

  class Emc2Sim extends Sim {
    init() {
      this.objKey = 'paperclip';
      this.m = OBJECTS.paperclip.m;
      this.t = 0;
      this.boomT = -10;
      this.buildControls();
      this.updateReadout();

      // click the object itself to annihilate it
      this.canvasEl.addEventListener('pointerdown', (e) => {
        const rect = this.canvasEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const [ox, oy] = this.objPos();
        if (Math.hypot(x - ox, y - oy) < 70) this.annihilate();
      });
    }

    annihilate() {
      this.boomT = this.t;
      this.cite('1905 Einstein - Ist die Trägheit eines Körpers von seinem Energieinhalt abhängig?');
      this.poke();
    }

    buildControls() {
      const c = this.controlsEl;
      this.massSlider = slider(c, {
        label: 'mass',
        min: 1e-4,
        max: 1e4,
        value: this.m,
        log: true,
        format: (v) => (v >= 1 ? `${fmtNum(v, v < 10 ? 1 : 0)} kg` : `${fmtNum(v * 1000, 1)} g`),
        oninput: (v) => {
          this.m = v;
          this.objKey = 'custom';
          this.presets.select('custom');
          this.updateReadout();
          this.poke();
        },
      });
      this.presets = buttonRow(c, Object.entries(OBJECTS).map(([value, o]) => ({
        label: o.name.split(' (')[0], value,
      })), {
        initial: 'paperclip',
        onSelect: (v) => {
          this.objKey = v;
          this.m = OBJECTS[v].m;
          this.massSlider.set(this.m);
          this.updateReadout();
          this.poke();
        },
      });
      actionButton(c, 'annihilate!', () => this.annihilate());
    }

    get E() { return this.m * C2; }

    updateReadout() {
      const E = this.E;
      const kt = E / KT_TNT;
      const hiroshimas = E / HIROSHIMA_J;
      const worldTime = (E / WORLD_YEAR_J) * YEAR; // seconds of world supply
      const name = this.objKey === 'custom' ? `${this.massSlider ? '' : ''}this mass` : OBJECTS[this.objKey].name;
      setReadout(this.readoutEl, [
        [
          ['if ', null], [name, 'yellow'],
          [' met its antimatter twin: E = mc² = ', null], [`${sci(E, 2)} J`, 'yellow'],
        ],
        [
          ['that is ', null],
          [kt >= 1000 ? `${sci(kt / 1000, 2)} megatons` : `${sci(kt, 2)} kilotons`, 'red'],
          [' of TNT ≈ ', null],
          [`${sci(hiroshimas, 1)} Hiroshima bombs`, 'red'],
        ],
        [
          ['it could power the entire world for ', null],
          [A.fmtTime(worldTime, 1), 'green'],
        ],
        [
          ['the Sun\'s way (fusion converts only ~0.7% of mass): ', null],
          [`${sci(E * 0.007, 2)} J`, 'orange'],
          [' — annihilation is the 100% exchange rate', null],
        ],
      ]);
    }

    objPos() {
      const compact = this.w < 700;
      return [compact ? this.w * 0.5 : this.w * 0.18, this.h * 0.38];
    }

    update(dt) {
      this.t += dt;
    }

    drawObject(x, y) {
      const { rc, ctx } = this;
      const k = this.objKey;
      const o = (seed, extra) => opts(seed, { stroke: COLORS.ink, ...extra });
      if (k === 'human') {
        stickFigure(rc, x, y - 40, { scale: 1.1, seed: 200 });
      } else if (k === 'coin') {
        rc.circle(x, y, 60, o(201, { stroke: COLORS.yellow }));
        rc.circle(x, y, 44, o(202, { stroke: COLORS.yellow, strokeWidth: 1.2 }));
        label(ctx, '1', x, y + 8, { color: COLORS.yellow, size: 26, align: 'center' });
      } else if (k === 'phone') {
        rc.rectangle(x - 22, y - 40, 44, 80, o(203));
        rc.line(x - 10, y + 28, x + 10, y + 28, o(204, { strokeWidth: 1.4 }));
      } else if (k === 'car') {
        rc.path(`M ${x - 55} ${y + 15} l 0 -18 l 22 -3 l 14 -14 l 32 0 l 12 15 l 28 4 l 0 16 z`, o(205, { stroke: COLORS.pink }));
        rc.circle(x - 28, y + 18, 22, o(206, { stroke: COLORS.pink }));
        rc.circle(x + 30, y + 18, 22, o(207, { stroke: COLORS.pink }));
      } else { // paperclip (also the 'custom' stand-in)
        rc.path(
          `M ${x - 14} ${y + 28} l 0 -48 a 14 14 0 0 1 28 0 l 0 40 a 10 10 0 0 1 -20 0 l 0 -34 a 6 6 0 0 1 12 0 l 0 30`,
          o(208, { stroke: COLORS.cyan, strokeWidth: 2 }),
        );
      }
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const [ox, oy] = this.objPos();

      // ---- the object (or its explosion) ----
      const since = this.t - this.boomT;
      if (since < 1.4) {
        // annihilation flash: expanding rough rings + gamma squiggles
        const k = since / 1.4;
        for (const [f, color] of [[1, COLORS.yellow], [0.72, COLORS.orange], [0.45, COLORS.red]]) {
          const rad = 12 + k * 150 * f;
          ctx.globalAlpha = (1 - k) * 0.9;
          rc.circle(ox, oy, rad * 2, opts(210 + Math.floor(f * 10), { stroke: color, strokeWidth: 2.2 }));
        }
        ctx.globalAlpha = 1;
        label(ctx, 'pure energy!', ox, oy - 90, { color: COLORS.yellow, size: 17, align: 'center' });
      } else {
        this.drawObject(ox, oy);
        label(ctx, 'click me!', ox, oy + (compact ? 74 : 84), { color: COLORS.muted, size: 13, align: 'center' });
      }

      // ---- log energy axis ----
      const ax0 = compact ? 24 : w * 0.36;
      const ax1 = w - 30;
      const ay = compact ? h * 0.78 : h * 0.62;
      this.cache.draw(`axis-${w}x${h}`, (g) => g.line(ax0, ay, ax1, ay, opts(220, { strokeWidth: 2 })));
      label(ctx, 'energy (each step = ×10)', (ax0 + ax1) / 2, ay + 38, { color: COLORS.muted, size: 13, align: 'center' });
      const X = (E) => ax0 + ((Math.log10(E) - AX_LO) / (AX_HI - AX_LO)) * (ax1 - ax0);

      // benchmarks
      BENCHMARKS.forEach(([E, name, color], i) => {
        const x = X(E);
        this.cache.draw(`bm-${i}-${w}x${h}`, (g) => g.line(x, ay - 7, x, ay + 7, opts(230 + i, { stroke: color, strokeWidth: 1.6 })));
        const up = i % 2 === 0;
        label(ctx, name, x, ay + (up ? -14 : 24), { color, size: compact ? 10.5 : 12.5, align: 'center' });
      });

      // your object's E (annihilation) and its fusion version
      const xE = X(this.E);
      doodleArrow(rc, xE, ay - (compact ? 66 : 78), xE, ay - 12, { color: COLORS.yellow, seed: 240, strokeWidth: 2.2 });
      label(ctx, 'your mass, annihilated', xE, ay - (compact ? 74 : 86), { color: COLORS.yellow, size: compact ? 12 : 14, align: 'center' });
      const xF = X(this.E * 0.007);
      doodleArrow(rc, xF, ay + (compact ? 52 : 64), xF, ay + 12, { color: COLORS.orange, seed: 241, strokeWidth: 1.8 });
      label(ctx, 'fused (0.7%)', xF, ay + (compact ? 64 : 78), { color: COLORS.orange, size: compact ? 11 : 12.5, align: 'center' });

      // the equation, big and proud
      label(ctx, 'E = mc²', compact ? w - 70 : w - 90, 40, { color: COLORS.ink, size: 26, align: 'center' });
    }
  }

  A.register('emc2', Emc2Sim);
})();
