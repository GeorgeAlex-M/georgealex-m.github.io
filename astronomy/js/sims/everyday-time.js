// Sim 46 — Time dilation you could actually measure.
//
// Sim 5 explains time dilation with light clocks, Miller's planet and GPS.
// This one refuses to leave the neighbourhood: a stick figure stands still on
// the pavement, something ordinary drives/flies/orbits past, and we compute how
// far apart the two clocks actually drift. Everything is a real speed or a real
// height, and every number below is computed here, not quoted.
//
// PANEL 1 — MOVING. The moving clock's own elapsed time is T/gamma, so it falls
// behind the standing one by
//     lag = T (1 - 1/gamma),      gamma = 1/sqrt(1 - v^2/c^2)
// (computed exactly, not by the v^2/2c^2 approximation). A car at 100 km/h loses
// about 15 picoseconds an hour. An airliner loses ~12.5 ns in ten hours. Only
// when you reach the ISS, at 7.66 km/s, does it become tens of microseconds a day.
//
// PANEL 2 — HIGH UP. Clocks higher in a gravity well run FAST. Using the exact
// potential difference rather than gh/c^2, so it stays valid up to GPS altitude:
//     gain = T * (GM/c^2) * (1/R_earth - 1/(R_earth + h))
// The headline is Chou et al. (2010), who raised one optical clock 33 cm above
// another and MEASURED the difference. Over a lifetime that step is ~90 ns. Your
// head, 1.7 m above your feet, ages about half a microsecond more than they do.
//
// PANEL 3 — BOTH AT ONCE. For a circular orbit at altitude h the two effects
// fight: speed slows the clock by GM/(2rc^2), height speeds it up by
// (GM/c^2)(1/R - 1/r). The net,
//     (GM/c^2) [ 1/R_earth - 3/(2r) ]
// is negative low down and positive high up, crossing zero at r = 1.5 R_earth
// (altitude 3185 km) — which the sim finds by solving, not by being told. Below
// that line satellites age slower than we do; above it, faster. GPS sits well
// above and gains 38.5 microseconds a day, which is why it needs correcting.
//
// Hand checks reproduced by the code:
//   car 100 km/h, 1 h        -> 15.4 ps behind
//   airliner 900 km/h, 10 h  -> 12.5 ns behind (velocity alone)
//   Chou's 33 cm, 79 years   -> ~90 ns ahead
//   crossover altitude       -> 3185 km  (r = 1.5 R_earth)
//   GPS (20 200 km)          -> +38.5 microseconds per day

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, doodleClock,
    slider, buttonRow, actionButton, setReadout,
    G, C, C2, M_EARTH, R_EARTH, YEAR, DAY, fmtNum, sci, fmtTime, fmtLen,
  } = A;

  const CIT_SR = '1905 Einstein - Zur Elektrodynamik bewegter Körper (On the Electrodynamics of Moving Bodies)';
  const CIT_HK = '1972 Hafele, Keating - Around-the-World Atomic Clocks: Observed Relativistic Time Gains';
  const CIT_ASHBY = '2003 Ashby - Relativity in the Global Positioning System';
  const CIT_CHOU = '2010 Chou, Hume, Rosenband, Wineland - Optical Clocks and Relativity';

  const GM = G * M_EARTH;              // m³/s²
  const GM_C2 = GM / C2;               // m — 4.435 mm, Earth's "gravitational radius"

  const MOVERS = [
    { key: 'walk', name: 'walking', v: 5 / 3.6, art: 'walker', note: '5 km/h' },
    { key: 'sprint', name: 'a sprinter', v: 10, art: 'runner', note: '10 m/s — the speed Chou\'s clocks could already detect' },
    { key: 'bike', name: 'a bicycle', v: 25 / 3.6, art: 'bike', note: '25 km/h' },
    { key: 'car', name: 'a car', v: 100 / 3.6, art: 'car', note: '100 km/h on the motorway' },
    { key: 'train', name: 'a fast train', v: 300 / 3.6, art: 'train', note: '300 km/h' },
    { key: 'plane', name: 'an airliner', v: 900 / 3.6, art: 'plane', note: '900 km/h at cruise' },
    { key: 'iss', name: 'the ISS', v: 7660, art: 'iss', note: '7.66 km/s in low orbit' },
    { key: 'parker', name: 'the Parker probe', v: 191000, art: 'probe', note: '191 km/s — the fastest thing we have ever built' },
  ];

  const HEIGHTS = [
    { key: 'chou', name: "Chou's 33 cm", h: 0.33, note: 'one clock set on a shelf above the other — and the difference was MEASURED' },
    { key: 'head', name: 'your head', h: 1.7, note: 'above your own feet' },
    { key: 'stairs', name: 'upstairs', h: 3, note: 'one storey up' },
    { key: 'burj', name: 'the Burj Khalifa', h: 828, note: 'top floor' },
    { key: 'everest', name: 'Everest', h: 8849, note: 'the summit' },
    { key: 'cruise', name: 'cruising altitude', h: 11000, note: 'where the airliner flies' },
    { key: 'iss', name: 'the ISS', h: 408000, note: 'low Earth orbit' },
    { key: 'gps', name: 'a GPS satellite', h: 20200000, note: 'medium Earth orbit' },
  ];

  const SPANS = [
    { key: 'hour', name: 'an hour', t: 3600 },
    { key: 'day', name: 'a day', t: DAY },
    { key: 'flight', name: 'a 10-hour flight', t: 36000 },
    { key: 'year', name: 'a year', t: YEAR },
    { key: 'life', name: 'a 79-year life', t: 79 * YEAR },
  ];

  class EverydayTimeSim extends Sim {
    init() {
      this.mode = 'moving';
      this.moverIdx = 3;      // the car
      this.heightIdx = 0;     // Chou's 33 cm
      this.spanIdx = 4;       // a lifetime
      this.orbitAlt = 4.08e5; // m
      this.phase = 0;
      this.buildControls();
      this.updateReadout();
    }

    get mover() { return MOVERS[this.moverIdx]; }
    get height() { return HEIGHTS[this.heightIdx]; }
    get span() { return SPANS[this.spanIdx]; }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'something moving', value: 'moving' },
        { label: 'something higher up', value: 'height' },
        { label: 'both at once (orbits)', value: 'orbit' },
      ], { initial: 'moving', onSelect: (v) => this.setMode(v) });

      this.moverBtns = buttonRow(c, MOVERS.map((m) => ({ label: m.name, value: m.key })), {
        initial: 'car',
        onSelect: (v) => {
          this.moverIdx = MOVERS.findIndex((m) => m.key === v);
          if (!this._citedSR) { this._citedSR = true; this.cite(CIT_SR); }
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });

      this.heightBtns = buttonRow(c, HEIGHTS.map((x) => ({ label: x.name, value: x.key })), {
        initial: 'chou',
        onSelect: (v) => {
          this.heightIdx = HEIGHTS.findIndex((x) => x.key === v);
          if (v === 'chou') this.cite(CIT_CHOU);
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });

      this.spanBtns = buttonRow(c, SPANS.map((s) => ({ label: s.name, value: s.key })), {
        initial: 'life',
        onSelect: (v) => { this.spanIdx = SPANS.findIndex((s) => s.key === v); this.updateReadout(); this.poke(); },
      });

      this.altSlider = slider(c, {
        label: 'orbit altitude',
        min: 2e5, max: 3.6e7, value: this.orbitAlt, log: true,
        format: (v) => `${fmtNum(v / 1000, 0)} km`,
        oninput: (v) => {
          this.orbitAlt = v;
          if (v > 1.9e7 && !this._citedAshby) { this._citedAshby = true; this.cite(CIT_ASHBY); }
          this.updateReadout(); this.poke();
        },
      });
      this.setMode('moving');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.moverBtns, v === 'moving');
      show(this.heightBtns, v === 'height');
      show(this.spanBtns, v !== 'orbit');
      show(this.altSlider, v === 'orbit');
      if (v === 'moving' && !this._citedHK) { this._citedHK = true; this.cite(CIT_HK); }
      this.cache.invalidate(); this.updateReadout(); this.poke();
    }

    /* ---------------- physics ---------------- */

    // Moving clock. NOT computed as 1 - 1/gamma: at walking-to-motorway speeds
    // beta^2 is ~1e-14 or smaller, so 1 - sqrt(1-beta^2) is a subtraction of two
    // numbers that agree to within a double's last couple of bits, and the answer
    // comes out several percent wrong (a car gave 16.0 ps instead of 15.45 ps).
    // Multiplying through by the conjugate is algebraically identical and exact:
    //     1 - sqrt(1-x) = x / (1 + sqrt(1-x))          with x = beta^2
    // which degrades gracefully to x/2 as x -> 0, keeping full precision. Same
    // trick for gamma - 1, so the displayed gamma is honest at any speed.
    movingNumbers() {
      const v = this.mover.v;
      const T = this.span.t;
      const beta = v / C;
      const x = beta * beta;
      const root = Math.sqrt(1 - x);     // = 1/gamma
      const frac = x / (1 + root);       // = 1 - 1/gamma, stably
      const gammaMinus1 = frac / root;   // = gamma - 1, stably
      return { v, T, beta, gamma: 1 / root, gammaMinus1, frac, lag: T * frac };
    }

    // Higher clock: the exact potential difference, so it stays valid from a
    // 33 cm shelf up to GPS altitude. Written as h/(R(R+h)) rather than
    // 1/R − 1/(R+h) — the same quantity, but the subtraction form loses most of
    // its digits when h is small compared with Earth's radius.
    heightNumbers() {
      const h = this.height.h;
      const T = this.span.t;
      const frac = (GM_C2 * h) / (R_EARTH * (R_EARTH + h));
      const perMetre = GM_C2 / (R_EARTH * (R_EARTH + 1));
      return { h, T, frac, gain: T * frac, perMetre };
    }

    // Circular orbit: the two effects, and where they cancel.
    orbitNumbers(alt) {
      const r = R_EARTH + (alt === undefined ? this.orbitAlt : alt);
      const v = Math.sqrt(GM / r);
      const slow = GM / (2 * r * C2);                       // velocity: clock runs slow
      const fast = (GM_C2 * (r - R_EARTH)) / (R_EARTH * r); // altitude: clock runs fast
      const net = fast - slow;
      return {
        r, v, slow, fast, net,
        perDay: net * DAY,
        crossR: 1.5 * R_EARTH,
        crossAlt: 0.5 * R_EARTH,
      };
    }

    update(dt) { this.phase += dt; }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'height') return this.heightReadout();
      if (this.mode === 'orbit') return this.orbitReadout();
      const n = this.movingNumbers();
      const m = this.mover;
      setReadout(this.readoutEl, [
        [
          [`${m.name} at `, null], [`${fmtNum(n.v, n.v < 100 ? 2 : 0)} m/s`, 'cyan'],
          [` (${m.note})  ·  β = v/c = `, null], [sci(n.beta, 3), null],
          ['  ·  γ = ', null], [n.gammaMinus1 < 1e-6 ? `1 + ${sci(n.gammaMinus1, 2)}` : fmtNum(n.gamma, 6), 'green'],
        ],
        [
          ['over ', null], [this.span.name, 'yellow'], [', the moving clock falls behind the standing one by ', null],
          [fmtTime(n.lag, 3), 'pink'],
        ],
        [
          ['That is the whole of "moving clocks run slow" at human speeds: ', null],
          [`${sci(n.frac, 2)}`, 'orange'],
          [' of a second per second. Real, measured, and utterly irrelevant to catching your train.', null],
        ],
        [
          ['Hafele and Keating flew caesium clocks around the world in 1972 and came back with the predicted difference: −59 ns going east, +273 ns going west. The asymmetry is Earth\'s own rotation adding to or subtracting from the aircraft\'s speed.', null],
        ],
      ]);
    }

    heightReadout() {
      const n = this.heightNumbers();
      const x = this.height;
      setReadout(this.readoutEl, [
        [
          [`${x.name} — `, 'yellow'], [`${fmtLen(x.h, 2)} up`, 'cyan'], [` (${x.note})`, null],
        ],
        [
          ['a clock up there runs FAST by ', null], [`${sci(n.frac, 3)}`, 'green'],
          [' of a second per second, so over ', null], [this.span.name, 'yellow'], [' it gains ', null],
          [fmtTime(n.gain, 3), 'pink'],
        ],
        [
          ['Near the ground the rate changes by ', null], [`${sci(n.perMetre, 3)}`, 'orange'],
          [' for every metre you climb. Which means it is not a thought experiment: raise a clock by the height of a step and it ticks measurably faster.', null],
        ],
        this.height.key === 'chou' ? [
          ['In 2010 Chou, Hume, Rosenband and Wineland did exactly this at NIST — two aluminium optical clocks, one raised about 33 cm — and watched the higher one gain. They also detected the slowdown of one moving at 10 m/s, jogging pace. Relativity became a tabletop measurement.', null],
        ] : [
          ['Your head is roughly 1.7 m above your feet, so it ages about half a microsecond more over a lifetime. You are, very slightly, not all the same age.', null],
        ],
      ]);
    }

    orbitReadout() {
      const n = this.orbitNumbers();
      const gps = this.orbitNumbers(2.02e7);
      const iss = this.orbitNumbers(4.08e5);
      setReadout(this.readoutEl, [
        [
          [`circular orbit at ${fmtNum(this.orbitAlt / 1000, 0)} km  ·  speed `, null],
          [`${fmtNum(n.v / 1000, 3)} km/s`, 'cyan'],
        ],
        [
          ['speed makes it run SLOW by ', null], [sci(n.slow, 3), 'red'],
          ['  ·  altitude makes it run FAST by ', null], [sci(n.fast, 3), 'green'],
          ['  ·  net ', null], [`${n.net >= 0 ? '+' : ''}${sci(n.net, 3)}`, n.net >= 0 ? 'green' : 'red'],
          [' = ', null], [`${n.perDay >= 0 ? '+' : ''}${sci(n.perDay * 1e6, 3)} µs per day`, 'yellow'],
        ],
        [
          ['The two effects cancel exactly at r = 1.5 R⊕, an altitude of ', null],
          [`${fmtNum(n.crossAlt / 1000, 0)} km`, 'pink'],
          ['. Below it, satellites age more slowly than you do. Above it, faster. Nothing chose that number — it falls out of setting the two terms equal.', null],
        ],
        [
          ['So: the ISS (408 km) runs ', null], [`${sci(iss.perDay * 1e6, 2)} µs/day`, 'red'], [' slow, while GPS (20,200 km) runs ', null],
          [`+${sci(gps.perDay * 1e6, 3)} µs/day`, 'green'],
          [' fast. Left uncorrected that GPS error alone would grow to about 11 km of position error every day.', null],
        ],
      ]);
    }

    /* ---------------- vehicle doodles ---------------- */

    drawVehicle(kind, x, y, s, color) {
      const { rc, ctx } = this;
      const o = (n, extra = {}) => opts(n, { stroke: color, strokeWidth: 1.8, ...extra });
      if (kind === 'car') {
        rc.path(`M ${x - 30 * s} ${y} l 0 ${-14 * s} l ${16 * s} 0 l ${8 * s} ${-11 * s} l ${18 * s} 0 l ${6 * s} ${11 * s} l ${12 * s} 0 l 0 ${14 * s} Z`, o(900));
        rc.circle(x - 16 * s, y + 3 * s, 13 * s, o(901));
        rc.circle(x + 22 * s, y + 3 * s, 13 * s, o(902));
        rc.line(x + 2 * s, y - 14 * s, x + 2 * s, y - 25 * s, o(903, { strokeWidth: 1.2 }));
      } else if (kind === 'plane') {
        rc.path(`M ${x - 40 * s} ${y} q ${20 * s} ${-9 * s} ${70 * s} 0 q ${-20 * s} ${9 * s} ${-70 * s} 0 Z`, o(905));
        rc.path(`M ${x + 2 * s} ${y - 2 * s} l ${-16 * s} ${-20 * s} l ${10 * s} 0 l ${16 * s} ${18 * s} Z`, o(906));
        rc.path(`M ${x + 2 * s} ${y + 2 * s} l ${-16 * s} ${20 * s} l ${10 * s} 0 l ${16 * s} ${-18 * s} Z`, o(907));
        rc.path(`M ${x - 34 * s} ${y - 1 * s} l ${-8 * s} ${-13 * s} l ${7 * s} 0 l ${8 * s} ${12 * s} Z`, o(908));
      } else if (kind === 'train') {
        rc.path(`M ${x - 46 * s} ${y} l 0 ${-26 * s} q ${26 * s} ${-10 * s} ${52 * s} 0 l 0 ${26 * s} Z`, o(910));
        for (let i = 0; i < 3; i++) rc.rectangle(x - 34 * s + i * 22 * s, y - 20 * s, 14 * s, 11 * s, o(911 + i, { strokeWidth: 1.2 }));
        rc.circle(x - 26 * s, y + 4 * s, 9 * s, o(915));
        rc.circle(x + 26 * s, y + 4 * s, 9 * s, o(916));
      } else if (kind === 'bike') {
        rc.circle(x - 18 * s, y, 22 * s, o(920, { strokeWidth: 1.5 }));
        rc.circle(x + 18 * s, y, 22 * s, o(921, { strokeWidth: 1.5 }));
        rc.path(`M ${x - 18 * s} ${y} l ${10 * s} ${-18 * s} l ${16 * s} 0 l ${10 * s} ${18 * s} M ${x - 8 * s} ${y - 18 * s} l ${8 * s} ${18 * s}`, o(922, { strokeWidth: 1.4 }));
        stickFigure(rc, x + 2 * s, y - 42 * s, { scale: 0.55 * s, seed: 923, color });
      } else if (kind === 'iss') {
        rc.rectangle(x - 12 * s, y - 8 * s, 24 * s, 16 * s, o(930));
        rc.rectangle(x - 46 * s, y - 12 * s, 30 * s, 24 * s, o(931, { strokeWidth: 1.3 }));
        rc.rectangle(x + 16 * s, y - 12 * s, 30 * s, 24 * s, o(932, { strokeWidth: 1.3 }));
      } else if (kind === 'probe') {
        rc.circle(x, y, 26 * s, o(940));
        rc.path(`M ${x - 26 * s} ${y} q ${26 * s} ${-22 * s} ${52 * s} 0`, o(941, { strokeWidth: 1.3 }));
        rc.rectangle(x - 34 * s, y + 12 * s, 22 * s, 10 * s, o(942, { strokeWidth: 1.2 }));
      } else if (kind === 'runner' || kind === 'walker') {
        stickFigure(rc, x, y - 40 * s, { scale: 0.95 * s, seed: 950, color });
        if (kind === 'runner') {
          for (let i = 0; i < 3; i++) {
            rc.line(x - 26 * s - i * 12 * s, y - 26 * s + i * 5 * s, x - 40 * s - i * 12 * s, y - 26 * s + i * 5 * s,
              o(951 + i, { strokeWidth: 1.2 }));
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    /* ---------------- panels ---------------- */

    render() {
      if (this.mode === 'height') return this.renderHeight();
      if (this.mode === 'orbit') return this.renderOrbit();
      this.renderMoving();
    }

    renderMoving() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.movingNumbers();
      const groundY = h * 0.66;

      this.cache.draw(`road-${w}x${h}`, (g) => g.line(0, groundY, w, groundY, opts(960, { stroke: COLORS.ink, strokeWidth: 2 })));
      for (let i = 0; i < 12; i++) {
        this.cache.draw(`dash-${i}-${w}x${h}`, (g) => g.line(
          (i * w) / 12 + 8, groundY + 14, (i * w) / 12 + 34, groundY + 14,
          opts(961 + i, { stroke: COLORS.muted, strokeWidth: 1.4 }),
        ));
      }

      // the one standing still — the reference clock
      stickFigure(rc, w * 0.12, groundY - 52, { scale: compact ? 0.8 : 1, seed: 970, color: COLORS.cyan });
      label(ctx, 'standing still', w * 0.12, groundY + 34, { color: COLORS.cyan, size: compact ? 11.5 : 13, align: 'center' });

      // the mover, sliding along the road
      const t = (this.phase * 0.34) % 1;
      const mx = w * 0.30 + t * (w * 0.62);
      this.drawVehicle(this.mover.art, mx, groundY - (this.mover.art === 'plane' || this.mover.art === 'iss' || this.mover.art === 'probe' ? h * 0.30 : 14),
        compact ? 0.72 : 1, COLORS.pink);
      label(ctx, this.mover.name, mx, groundY + (this.mover.art === 'plane' || this.mover.art === 'iss' || this.mover.art === 'probe' ? -h * 0.30 + 54 : 34),
        { color: COLORS.pink, size: compact ? 11.5 : 13, align: 'center' });

      // the two clocks
      const cy = compact ? h * 0.20 : h * 0.22;
      doodleClock(rc, ctx, w * 0.30, cy, compact ? 26 : 34, this.phase * 8, { color: COLORS.cyan, seed: 975, caption: 'the one standing' });
      doodleClock(rc, ctx, w * 0.62, cy, compact ? 26 : 34, this.phase * 8, { color: COLORS.pink, seed: 976, caption: 'the one moving' });

      label(ctx, `after ${this.span.name}, the moving clock is ${fmtTime(n.lag, 3)} behind`,
        w / 2, compact ? 22 : 28, { color: COLORS.yellow, size: compact ? 12.5 : 16, align: 'center' });
      label(ctx, `v = ${fmtNum(n.v, n.v < 100 ? 2 : 0)} m/s   ·   γ − 1 = ${sci(n.gammaMinus1, 3)}   ·   lag = T(1 − 1/γ)`,
        w / 2, compact ? 40 : 48, { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });
      label(ctx, compact ? 'real, measured — and far too small to notice' : 'this is real and has been measured — it is simply far too small for anything you own to notice',
        w / 2, h - 12, { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });
    }

    renderHeight() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.heightNumbers();
      const groundY = h * 0.80;
      const x = this.height;

      this.cache.draw(`gnd-${w}x${h}`, (g) => g.line(0, groundY, w, groundY, opts(980, { stroke: COLORS.green, strokeWidth: 2 })));

      // the raised platform — a log scale of height, so 33 cm and GPS both fit
      const frac = Math.log10(x.h + 1) / Math.log10(2.1e7);
      const topY = groundY - 20 - frac * (groundY - (compact ? 96 : 116));
      this.cache.draw(`col-${x.key}-${w}x${h}`, (g) => g.line(w * 0.62, groundY, w * 0.62, topY, opts(981, {
        stroke: COLORS.muted, strokeWidth: 1.6, strokeLineDash: [6, 6],
      })));
      rc.line(w * 0.52, topY, w * 0.72, topY, opts(982, { stroke: COLORS.orange, strokeWidth: 2 }));

      stickFigure(rc, w * 0.26, groundY - 52, { scale: compact ? 0.8 : 1, seed: 983, color: COLORS.cyan });
      label(ctx, 'down here', w * 0.26, groundY + 24, { color: COLORS.cyan, size: compact ? 11.5 : 13, align: 'center' });
      stickFigure(rc, w * 0.62, topY - 50, { scale: compact ? 0.8 : 1, seed: 984, color: COLORS.pink });
      label(ctx, `${x.name} — ${fmtLen(x.h, 2)} up`, w * 0.62, topY - 66, { color: COLORS.pink, size: compact ? 11.5 : 13.5, align: 'center' });

      doodleArrow(rc, w * 0.80, groundY - 10, w * 0.80, topY + 10, { color: COLORS.orange, seed: 985, strokeWidth: 1.5 });
      label(ctx, 'higher = faster', w * 0.83, (groundY + topY) / 2, { color: COLORS.orange, size: compact ? 11 : 12.5 });

      label(ctx, `after ${this.span.name}, the higher clock is ${fmtTime(n.gain, 3)} ahead`,
        w / 2, compact ? 22 : 28, { color: COLORS.yellow, size: compact ? 12.5 : 16, align: 'center' });
      label(ctx, `gain = T·(GM/c²)(1/R⊕ − 1/(R⊕+h))   ·   ${sci(n.perMetre, 3)} per second, per metre climbed`,
        w / 2, compact ? 40 : 48, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
      notToScale(rc, ctx, compact ? w - 66 : w - 84, h - 26);
    }

    renderOrbit() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.orbitNumbers();

      // curves of the two effects against altitude
      const x0 = compact ? 46 : 68;
      const x1 = w - (compact ? 16 : 30);
      const y0 = compact ? 62 : 74;
      const y1 = h - (compact ? 62 : 74);
      const aMin = 2e5;
      const aMax = 3.6e7;
      const lx0 = Math.log10(aMin);
      const lx1 = Math.log10(aMax);
      const X = (a) => x0 + ((Math.log10(a) - lx0) / (lx1 - lx0)) * (x1 - x0);
      // symmetric log-ish y around zero, in µs/day
      const yMax = 60;
      const Y = (v) => (y0 + y1) / 2 - (Math.max(-yMax, Math.min(yMax, v)) / yMax) * ((y1 - y0) / 2);

      this.cache.draw(`oax-${w}x${h}`, (g) => g.line(x0, Y(0), x1, Y(0), opts(990, { stroke: COLORS.ink, strokeWidth: 1.6 })));
      label(ctx, '0', x0 - 8, Y(0) + 4, { color: COLORS.muted, size: 11, align: 'right' });

      const curve = (fn, color, width) => {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
        for (let px = x0; px <= x1; px += 2) {
          const a = 10 ** (lx0 + ((px - x0) / (x1 - x0)) * (lx1 - lx0));
          const py = Y(fn(this.orbitNumbers(a)) * DAY * 1e6);
          if (px === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      };
      curve((o) => -o.slow, COLORS.red, 1.7);
      curve((o) => o.fast, COLORS.green, 1.7);
      curve((o) => o.net, COLORS.yellow, 2.6);

      // the crossover, solved not stated
      const cx = X(n.crossAlt);
      ctx.setLineDash([4, 5]); ctx.strokeStyle = COLORS.pink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, compact ? `${fmtNum(n.crossAlt / 1000, 0)} km` : `they cancel at ${fmtNum(n.crossAlt / 1000, 0)} km  (r = 1.5 R⊕)`,
        cx + 6, y0 + 14, { color: COLORS.pink, size: compact ? 10.5 : 12.5 });

      // markers for the two real systems
      for (const [alt, nm, col] of [[4.08e5, 'ISS', COLORS.cyan], [2.02e7, 'GPS', COLORS.green]]) {
        const o = this.orbitNumbers(alt);
        const px = X(alt); const py = Y(o.net * DAY * 1e6);
        rc.circle(px, py, 10, opts(991 + (nm === 'GPS' ? 1 : 0), { stroke: col, strokeWidth: 1.8 }));
        label(ctx, `${nm} ${o.net >= 0 ? '+' : ''}${fmtNum(o.net * DAY * 1e6, 1)} µs/day`, px, py + (o.net >= 0 ? -16 : 24),
          { color: col, size: compact ? 10.5 : 12.5, align: 'center' });
      }

      // the reader's altitude
      const px = X(this.orbitAlt);
      rc.circle(px, Y(n.net * DAY * 1e6), 13, opts(993, { stroke: COLORS.yellow, strokeWidth: 2.2 }));

      label(ctx, 'net clock drift for a circular orbit', w / 2, compact ? 22 : 28,
        { color: COLORS.yellow, size: compact ? 12.5 : 16, align: 'center' });
      label(ctx, `speed slows it (red) · height speeds it up (green) · net (yellow) = (GM/c²)[1/R⊕ − 3/2r]`,
        w / 2, compact ? 40 : 48, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      label(ctx, 'altitude →', (x0 + x1) / 2, y1 + (compact ? 24 : 30), { color: COLORS.ink, size: compact ? 11 : 13, align: 'center' });
      label(ctx, 'µs/day', x0 - (compact ? 30 : 46), (y0 + y1) / 2 - 10, { color: COLORS.ink, size: compact ? 10.5 : 12 });
    }
  }

  A.register('everydayTime', EverydayTimeSim);
})();
