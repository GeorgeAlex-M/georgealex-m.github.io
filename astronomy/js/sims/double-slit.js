// Sim 36 — The double slit (and why your body doesn't do it)
//
// Chapter XI opens where quantum mechanics actually starts for a reader: on a
// bedroom wall, with a laser pointer and two razor scratches in kitchen foil.
// That experiment is REAL, it costs nothing, and the fringe spacing it produces
// is exactly the number this sim computes:
//
//     Δy = λ L / d        (650 nm pointer, d = 0.10 mm, L = 3.0 m  ->  19.5 mm)
//
// and the full pattern, including the single-slit envelope and a finite fringe
// visibility, is
//
//     I(y) = sinc²(π a y / λL) · [ 1 + V·cos(2π d y / λL) ] / 2
//
// with a = slit WIDTH and d = slit SEPARATION. Everything painted on the wall
// comes out of that one line. The ruler drawn on the wall is a real 30 cm ruler
// and does NOT rescale — move the sliders and the fringes really do slide along
// it, which is the whole point of drawing a ruler instead of an axis.
//
// Panel 2 is Tonomura's 1989 machine, which sent ONE electron at a time through
// an electron biprism. At 50 kV an electron is relativistic enough to matter:
//     λ = hc / sqrt(Ek² + 2·Ek·mc²) = 5.3553 pm   (non-relativistic: 5.4847 pm)
// and it crosses the ~1.5 m column in 1.2e-8 s while electrons leave the gun
// about 1e-3 s apart — so the previous electron has been a dot on the screen for
// roughly 80,000 transit times before the next one starts. There is never a
// second electron to interfere with. The dots still pile into fringes.
//
// Panel 3 is the honest version of "observation collapses it". It is not
// consciousness, and it is not a nudge from the measuring beam: it is the
// duality relation, an inequality that has been MEASURED —
//     V² + D² ≤ 1      (Greenberger–Yasin 1988, Englert 1996; Dürr–Nonn–Rempe 1998)
// where D is how well the apparatus COULD distinguish the paths, whether or not
// anybody reads it. Slide D and the fringes fade along V = sqrt(1 − D²).
//
// Panel 4 is the eraser, drawn the way it actually behaves: the screen NEVER
// shows fringes once which-path information exists anywhere. The fringes live in
// the two SORTED SUBSETS, and sorting needs the partner detector's classical
// record. The past is not rewritten; a list is used. (Same lesson as sim 39.)
//
// Panel 5 answers the question all of this raises — why doesn't a person diffract
// through a doorway? λ = h/mv = 6.76e-36 m for a walking adult, which is 8e-21 of
// a proton radius. To get a metre-scale wavelength you would have to walk at
// 1.2e-35 m/s: about one proton width every three million years.
//
// Hand checks reproduced by the code:
//   650 nm, d = 0.10 mm, L = 3.00 m   ->  Δy = 19.500 mm
//   50 keV electron -> λ = 5.3553 pm  ·   C60 at 220 m/s -> λ = 2.5191 pm
//   70 kg at 1.4 m/s -> λ = 6.7613e-36 m

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    sci, fmtNum, wavelengthRGB,
  } = A;

  const H = 6.62607015e-34;          // J s  (exact, SI 2019)
  const C_L = 299792458;             // m/s  (exact)
  const E_CH = 1.602176634e-19;      // C    (exact)
  const M_E = 9.1093837015e-31;      // kg
  const AMU = 1.66053906660e-27;     // kg
  const R_PROTON = 8.414e-16;        // m — CODATA charge radius, used for scale only

  const CIT_YOUNG = '1804 Young - Experiments and Calculations Relative to Physical Optics';
  const CIT_DEBROGLIE = '1924 de Broglie - Recherches sur la théorie des quanta (Researches on the Theory of Quanta)';
  const CIT_TONOMURA = '1989 Tonomura, Endo, Matsuda, Kawasaki, Ezawa - Demonstration of single-electron buildup of an interference pattern';
  const CIT_ARNDT = '1999 Arndt, Nairz, Vos-Andreae, Keller, van der Zouw, Zeilinger - Wave-particle duality of C60 molecules';
  const CIT_ENGLERT = '1996 Englert - Fringe Visibility and Which-Way Information: An Inequality';
  const CIT_DURR = '1998 Dürr, Nonn, Rempe - Origin of quantum-mechanical complementarity probed by a which-way experiment in an atom interferometer';
  const CIT_SCULLY = '1982 Scully, Drühl - Quantum eraser: A proposed photon correlation experiment concerning observation and delayed choice in quantum mechanics';

  // Relativistic de Broglie wavelength of an electron of kinetic energy Ek (eV).
  // At 50 keV the non-relativistic formula is 2.4% wrong — small, but this page
  // computes rather than approximates.
  function relElectronLambda(EkEV) {
    const mc2 = (M_E * C_L * C_L) / E_CH;                    // eV
    const pc = Math.sqrt(EkEV * EkEV + 2 * EkEV * mc2);      // eV
    return (H * C_L) / (pc * E_CH);
  }
  function relElectronSpeed(EkEV) {
    const mc2 = (M_E * C_L * C_L) / E_CH;
    const gamma = 1 + EkEV / mc2;
    return C_L * Math.sqrt(1 - 1 / (gamma * gamma));
  }

  // The three sources panel 2 can fire, each with the geometry its real
  // experiment used.
  const PARTICLES = [
    {
      key: 'electron',
      name: 'electrons, 50 kV',
      color: '#04d9ff',
      lambda: () => relElectronLambda(50e3),
      speed: () => relElectronSpeed(50e3),
      d: 1.0e-6,
      L: 1.5,
      unit: 'electrons',
      source: 'gun, 50 kV',
      note: 'Tonomura 1989 — an electron biprism rather than literal slits: a charged wire splits the beam and folds the two halves back together. Same mathematics, far better contrast.',
      cit: CIT_TONOMURA,
    },
    {
      key: 'c60',
      name: 'C₆₀ buckyballs',
      color: '#69db7c',
      lambda: () => H / (720 * AMU * 220),
      speed: () => 220,
      d: 1.0e-7,
      L: 1.25,
      unit: 'molecules',
      source: 'oven, 900 K',
      note: 'Arndt 1999 — a 900 K oven, a 100 nm silicon-nitride grating, and a scanning laser that ionises the molecules one by one. Sixty carbon atoms, 720 amu, and it still interferes with itself.',
      cit: CIT_ARNDT,
    },
    {
      key: 'photon',
      name: 'photons, 650 nm',
      color: '#ff8787',
      lambda: () => 650e-9,
      speed: () => C_L,
      d: 1.0e-4,
      L: 3.0,
      unit: 'photons',
      source: 'lamp, dimmed',
      note: 'The bench from panel 1, dimmed until photons cross the room one at a time. Taylor did this in 1909 with a gas flame, smoked glass and a three-month exposure.',
      cit: CIT_YOUNG,
    },
  ];

  // Deterministic PRNG. The dot pattern must be identical on every reload, or
  // the doodle boils and "the same experiment twice" becomes a lie.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const sinc2 = (x) => (Math.abs(x) < 1e-9 ? 1 : (Math.sin(x) / x) ** 2);

  // The entire panel, in one line of physics.
  //   y : distance from the pattern centre, in metres
  //   a : slit width · d : slit separation · L : slits-to-screen distance
  //   V : fringe visibility (1 when no which-path information exists)
  function intensity(y, lambda, a, d, L, V) {
    const beta = (Math.PI * a * y) / (lambda * L);
    const alpha = (Math.PI * d * y) / (lambda * L);
    return (sinc2(beta) * (1 + V * Math.cos(2 * alpha))) / 2;
  }

  class DoubleSlitSim extends Sim {
    init() {
      this.mode = 'home';
      this.lambdaNm = 650;   // a cheap red laser pointer
      this.dMM = 0.10;       // slit separation, mm
      this.aUM = 25;         // slit width, µm — a realistic razor scratch
      this.LM = 3.0;         // bench to wall, m
      this.D = 0;            // which-path distinguishability, 0..1
      this.partIdx = 0;
      this.dots = [];        // accumulated single-particle hits
      this.eraserDots = [];  // {y, tag, r} — tag is the partner detector's answer
      this.rate = 30;        // arrivals per second while a panel is running
      this.acc = 0;
      this.flightT = 0;
      this.rng = mulberry32(20250901);
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- geometry & numbers ---------------- */

    get lambda() { return this.lambdaNm * 1e-9; }
    get dSep() { return this.dMM * 1e-3; }
    get aWidth() { return this.aUM * 1e-6; }
    get visibility() { return Math.sqrt(Math.max(0, 1 - this.D * this.D)); }
    get particle() { return PARTICLES[this.partIdx]; }

    homeNumbers() {
      const dy = (this.lambda * this.LM) / this.dSep;    // fringe spacing, m
      const env = (this.lambda * this.LM) / this.aWidth; // first envelope zero, m
      return {
        dy,
        env,
        perRuler: 0.30 / dy,               // bright bars across a 30 cm ruler
        missing: this.dSep / this.aWidth,  // the order that falls on the envelope zero
      };
    }

    partNumbers() {
      const p = this.particle;
      const lam = p.lambda();
      return { p, lam, dy: (lam * p.L) / p.d, v: p.speed() };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'on your bedroom wall', value: 'home' },
        { label: 'one particle at a time', value: 'one' },
        { label: 'look at which slit', value: 'which' },
        { label: 'the eraser', value: 'eraser' },
        { label: "why you don't diffract", value: 'you' },
      ], { initial: 'home', onSelect: (v) => this.setMode(v) });

      this.partBtns = buttonRow(c, PARTICLES.map((p) => ({ label: p.name, value: p.key })), {
        initial: 'electron',
        onSelect: (v) => {
          this.partIdx = PARTICLES.findIndex((p) => p.key === v);
          this.dots = [];
          this.cite(this.particle.cit);
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.lamSlider = slider(c, {
        label: 'laser wavelength λ',
        min: 400, max: 700, step: 1, value: this.lambdaNm,
        format: (v) => `${fmtNum(v, 0)} nm  (${v > 620 ? 'red pointer' : v > 560 ? 'green pointer' : v > 480 ? 'blue-green' : 'violet'})`,
        oninput: (v) => { this.lambdaNm = v; this.changed(); },
      });

      this.dSlider = slider(c, {
        label: 'slit separation d',
        min: 0.05, max: 0.40, step: 0.005, value: this.dMM,
        format: (v) => `${fmtNum(v, 3)} mm between the two razor cuts`,
        oninput: (v) => {
          this.dMM = v;
          if (!this._citedYoung) { this._citedYoung = true; this.cite(CIT_YOUNG); }
          this.changed();
        },
      });

      this.aSlider = slider(c, {
        label: 'slit width a',
        min: 10, max: 120, step: 1, value: this.aUM,
        format: (v) => `${fmtNum(v, 0)} µm  (how wide each cut is)`,
        oninput: (v) => { this.aUM = v; this.changed(); },
      });

      this.LSlider = slider(c, {
        label: 'bench to wall L',
        min: 0.5, max: 6, step: 0.05, value: this.LM,
        format: (v) => `${fmtNum(v, 2)} m across the room`,
        oninput: (v) => { this.LM = v; this.changed(); },
      });

      this.DSlider = slider(c, {
        label: 'how well the detector could tell the two paths apart (D)',
        min: 0, max: 1, step: 0.01, value: this.D,
        format: (v) => `D = ${fmtNum(v, 2)}  →  visibility V = √(1−D²) = ${fmtNum(Math.sqrt(Math.max(0, 1 - v * v)), 3)}`,
        oninput: (v) => {
          this.D = v;
          if (!this._citedEnglert) { this._citedEnglert = true; this.cite(CIT_ENGLERT); }
          this.dots = [];
          this.eraserDots = [];
          this.changed();
        },
      });

      this.fireBtn = actionButton(c, 'send 200 more', () => { this.fire(200); this.poke(); });
      this.jumpBtn = actionButton(c, "jump to 70,000 (Tonomura's last frame)", () => {
        this.fire(70000 - this.dots.length);
        this.poke();
      });
      this.clearBtn = actionButton(c, 'start the screen empty', () => {
        this.dots = []; this.eraserDots = []; this.updateReadout(); this.poke();
      });

      this.setMode('home');
    }

    changed() {
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      const showB = (b, on) => { b.style.display = on ? '' : 'none'; };
      const bench = v === 'home' || v === 'which';
      show(this.partBtns, v === 'one');
      show(this.lamSlider, bench);
      show(this.dSlider, bench);
      show(this.aSlider, bench);
      show(this.LSlider, bench);
      show(this.DSlider, v === 'which');
      showB(this.fireBtn, v === 'one' || v === 'eraser');
      showB(this.jumpBtn, v === 'one');
      showB(this.clearBtn, v === 'one' || v === 'eraser');
      if (v === 'one') { this.dots = []; this.cite(this.particle.cit); }
      if (v === 'eraser') { this.eraserDots = []; this.cite(CIT_SCULLY); }
      if (v === 'which') this.cite(CIT_DURR);
      if (v === 'you') this.cite(CIT_DEBROGLIE);
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    /* ---------------- accumulating single hits ---------------- */

    // Rejection-sample the true intensity profile. No fringes are ever drawn as
    // fringes: the fringes are what a pile of independent random dots becomes.
    sampleY(halfSpan, lambda, a, d, L, V) {
      for (let i = 0; i < 200; i++) {
        const y = (this.rng() * 2 - 1) * halfSpan;
        if (this.rng() < intensity(y, lambda, a, d, L, V)) return y;
      }
      return (this.rng() * 2 - 1) * halfSpan;
    }

    fire(n) {
      if (n <= 0) return;
      const eraser = this.mode === 'eraser';
      const lam = eraser ? this.lambda : this.partNumbers().lam;
      const a = eraser ? this.aWidth : this.particle.d * 0.35;
      const d = eraser ? this.dSep : this.particle.d;
      const L = eraser ? this.LM : this.particle.L;
      const dy = (lam * L) / d;
      const span = eraser ? 5.5 * dy : 4.5 * dy;
      const cap = eraser ? 5000 : 90000;
      const list = eraser ? this.eraserDots : this.dots;
      for (let i = 0; i < n && list.length < cap; i++) {
        if (eraser) {
          // The screen alone can never show fringes while which-path information
          // exists. But every hit also carries the partner's answer, and WITHIN
          // each answer the visibility is full — the two sets sitting half a
          // fringe apart, so that adding them back gives exactly the blob.
          const tag = this.rng() < 0.5 ? 0 : 1;
          const shift = tag === 0 ? 0 : dy / 2;
          list.push({ y: this.sampleY(span, lam, a, d, L, 1) + shift, tag, r: this.rng() });
        } else {
          list.push({ y: this.sampleY(span, lam, a, d, L, 1), tag: 0, r: this.rng() });
        }
      }
      this.updateReadout();
    }

    update(dt) {
      this.flightT += dt;
      if (this.mode !== 'one' && this.mode !== 'eraser') return;
      this.acc += dt * this.rate;
      const n = Math.floor(this.acc);
      if (n > 0) { this.acc -= n; this.fire(n); }
    }

    /* ---------------- readouts ---------------- */

    updateReadout() {
      const f = {
        home: () => this.homeReadout(),
        one: () => this.oneReadout(),
        which: () => this.whichReadout(),
        eraser: () => this.eraserReadout(),
        you: () => this.youReadout(),
      }[this.mode];
      if (f) f();
    }

    homeReadout() {
      const n = this.homeNumbers();
      setReadout(this.readoutEl, [
        [
          ['λ = ', null], [`${fmtNum(this.lambdaNm, 0)} nm`, 'cyan'],
          ['  ·  d = ', null], [`${fmtNum(this.dMM, 3)} mm`, 'yellow'],
          ['  ·  L = ', null], [`${fmtNum(this.LM, 2)} m`, 'green'],
          ['   →   fringe spacing Δy = λL/d = ', null],
          [`${fmtNum(n.dy * 1000, 2)} mm`, 'pink'],
          [`  (${fmtNum(n.perRuler, 1)} bright bars across a 30 cm ruler)`, null],
        ],
        [
          ['This is a real experiment you can do tonight for the price of a laser pointer. ', 'yellow'],
          ['Two razor scratches in kitchen foil, a dark room, a wall three metres away. Measure the bar spacing with a ruler, put it into Δy = λL/d, and you have measured the wavelength of light to two significant figures — which is what Thomas Young did in 1804 with a candle and a card, and why light was taken to be a wave for the next hundred years.', null],
        ],
        [
          ['The envelope. ', 'yellow'],
          ['A single cut of width a spreads light into a broad blob whose first dark ring sits at y = λL/a = ', null],
          [`${fmtNum(n.env * 1000, 1)} mm`, 'orange'],
          ['. The two-cut fringes live INSIDE that blob, which is why the bars fade towards the edges instead of marching on forever. Order number ', null],
          [`${fmtNum(n.missing, 2)}`, 'cyan'],
          [' (= d/a) lands exactly on the envelope zero and goes missing — widen the cuts and watch which bar disappears.', null],
        ],
        [
          ['Nothing here is quantum yet. ', 'yellow'],
          ['This pattern is what ANY wave does; water in a harbour with two gaps in the sea wall makes the same picture. The quantum part starts in the next panel, when the source is turned down until only one particle is in the room at a time — and the pattern refuses to go away.', null],
        ],
      ]);
    }

    oneReadout() {
      const { p, lam, dy, v } = this.partNumbers();
      const transit = p.L / v;
      const gap = 1e-3; // Tonomura's gun ran at roughly a thousand electrons a second
      setReadout(this.readoutEl, [
        [
          [`${p.name}: `, 'yellow'],
          ['de Broglie wavelength λ = h/p = ', null],
          [`${sci(lam, 4)} m`, 'cyan'],
          [lam < 1e-10 ? ` = ${fmtNum(lam * 1e12, 4)} pm` : '', 'cyan'],
          ['  ·  path separation ', null], [`${sci(p.d, 2)} m`, null],
          ['  ·  drift ', null], [`${fmtNum(p.L, 2)} m`, null],
          ['   →   real fringe spacing ', null], [`${sci(dy, 3)} m`, 'pink'],
          [dy < 1e-3 ? ` = ${fmtNum(dy * 1e6, 1)} µm` : '', 'pink'],
        ],
        [
          ['dots on the screen so far: ', null], [`${fmtNum(this.dots.length, 0)}`, 'green'],
          ['. Every one is a single, localised, particle-like hit — a scintillation you could point at with a finger. Nothing is drawn between the source and the screen, because nothing between the source and the screen is observed. The fringes are not in any individual dot; they are in the ', null],
          ['statistics of where the dots land', 'yellow'], ['.', null],
        ],
        [
          ['There is never a second particle to interfere with. ', 'yellow'],
          [`At ${sci(v, 3)} m/s each one crosses the ${fmtNum(p.L, 2)} m apparatus in `, null],
          [`${sci(transit, 2)} s`, 'orange'],
          [p.key === 'electron'
            ? `, while the gun releases them roughly ${sci(gap, 0)} s apart — so the previous electron has already been a dot on the screen for about ${sci(gap / transit, 2)} transit times before the next one leaves. That was Tonomura's point: whatever is interfering, it is not one particle with another. It is each one with itself.`
            : '. Turn the source down as far as you like and the pattern is unchanged. Whatever is interfering, it is not one particle with another.', null],
        ],
        [[p.note, null]],
        [
          ['The heaviest thing ever put through an interferometer: ', 'yellow'],
          ['a tailored organic molecule of about 25,000 atomic mass units — some 2,000 atoms — with a de Broglie wavelength of 53 femtometres, a thousand times smaller than the molecule itself (Fein et al. 2019). No upper mass limit appears anywhere in the theory. The limit is practical: keeping something that big cold, isolated and in vacuum for long enough. That is section 37.', null],
        ],
      ]);
    }

    whichReadout() {
      const V = this.visibility;
      const n = this.homeNumbers();
      setReadout(this.readoutEl, [
        [
          ['D = ', null], [`${fmtNum(this.D, 2)}`, 'orange'],
          ['   V = √(1−D²) = ', null], [`${fmtNum(V, 3)}`, 'cyan'],
          ['   check: V² + D² = ', null], [`${fmtNum(V * V + this.D * this.D, 3)}`, 'green'],
          [' ≤ 1', null],
        ],
        [
          ['This is not "the observer collapses the wavefunction". ', 'yellow'],
          ['It is an inequality — V² + D² ≤ 1 — in which D measures how well the apparatus ', null],
          ['could in principle', 'cyan'],
          [' distinguish the two paths and V measures the contrast of the fringes. Nobody has to look. Nobody has to be conscious. The information only has to exist somewhere in the world.', null],
        ],
        [
          ['It is also not a nudge. ', 'yellow'],
          ['The old story was that measuring disturbs: a photon bounces off the electron and kicks it sideways. Dürr, Nonn and Rempe killed that in 1998. They marked which path an atom took by flipping an internal state with microwaves — a momentum transfer about ten thousand times too small to smear the fringes. The fringes vanished anyway, by exactly the amount D predicts. What destroys interference is the ', null],
          ['availability of the information', 'pink'], [', not the recoil.', null],
        ],
        [
          ['At D = 0 the bars sit ', null], [`${fmtNum(n.dy * 1000, 2)} mm`, 'pink'],
          [' apart with true darkness between them. At D = 1 the wall shows one smooth blob — the plain sum of two independent slits, exactly what marbles through two gaps would give. Everything in between is a real, continuous, measured trade-off, not a switch.', null],
        ],
      ]);
    }

    eraserReadout() {
      const nA = this.eraserDots.filter((d) => d.tag === 0).length;
      const nB = this.eraserDots.length - nA;
      setReadout(this.readoutEl, [
        [
          ['total hits on the screen: ', null], [`${fmtNum(this.eraserDots.length, 0)}`, 'green'],
          ['  ·  partner said "A": ', null], [`${fmtNum(nA, 0)}`, 'cyan'],
          ['  ·  partner said "B": ', null], [`${fmtNum(nB, 0)}`, 'pink'],
        ],
        [
          ['LOOK AT THE TOP STRIP FIRST. ', 'yellow'],
          ['It has no fringes. It never has fringes, at any moment, no matter what is done to the partner particle, however far away and however late. That is not an accident of this drawing — it is forced. If the screen alone ever showed fringes appearing or vanishing because of a distant choice, you could signal faster than light, and quantum mechanics does not permit that.', null],
        ],
        [
          ['Now sort the SAME hits by what the partner detector said. ', 'yellow'],
          ['Each pile has full fringes, and the two piles are shifted by half a period — bright in one is dark in the other. Add them back together and you recover the blob you started with. Nothing on the screen changed. A list was used.', null],
        ],
        [
          ['This is "delayed choice", defused. ', 'orange'],
          ['You may decide how to measure the partner AFTER the screen hit is already recorded — Jacques and colleagues did exactly that in 2007, with a quantum random number generator and a 48 m delay line. It still works, because the choice does not reach back and alter the dot. It decides which pile you are entitled to sort the dot into. The past is not edited; a correlation that was always there is revealed, and revealing it requires the partner\'s classical record to physically arrive.', null],
        ],
      ]);
    }

    youReadout() {
      const you = H / (70 * 1.4);
      const vNeeded = H / (70 * 0.8);
      const rows = [
        ['electron, 50 kV', relElectronLambda(50e3)],
        ['C₆₀ buckyball at 220 m/s', H / (720 * AMU * 220)],
        ['grain of sand drifting at 1 cm/s', H / (5e-8 * 0.01)],
        ['housefly', H / (1.2e-4 * 1.0)],
        ['you, walking at 1.4 m/s', you],
      ];
      setReadout(this.readoutEl, [
        [
          ['Everything has a wavelength. λ = h/mv, with no exceptions and no "quantum objects only" clause. ', 'yellow'],
          ['For you, walking through a doorway at 1.4 m/s: ', null],
          [`λ = ${sci(you, 3)} m`, 'pink'], ['.', null],
        ],
        [[rows.map(([nm, l]) => `${nm} → ${sci(l, 2)} m`).join('     ·     '), 'cyan']],
        [
          ['That is ', null], [`${sci(you / R_PROTON, 2)}`, 'orange'],
          [' times the radius of a proton. Diffraction only becomes visible when the wavelength is comparable to the opening, so to spread out noticeably in a 0.8 m doorway you would have to walk at ', null],
          [`${sci(vNeeded, 2)} m/s`, 'red'],
          [' — roughly one proton width every three million years.', null],
        ],
        [
          ['So the classical world is not a different set of laws. ', 'yellow'],
          ['It is the same law with h = 6.62607015×10⁻³⁴ J·s inside it, and h is small compared with a kilogram-metre-per-second by thirty-four orders of magnitude. Quantum mechanics does not switch off at some size; it stops being visible. There is a second reason it stops being visible, and it is not about size at all — it is decoherence, and it is the next section.', null],
        ],
      ]);
    }

    /* ================= drawing ================= */

    // ---- the bedroom the reader is probably sitting in ----
    drawRoom(compact) {
      const { ctx, w, h } = this;
      const key = `${w}x${h}`;
      const floorY = h * 0.80;

      this.cache.draw(`floor-${key}`, (g) => g.line(0, floorY, w, floorY, opts(1001, { stroke: COLORS.muted, strokeWidth: 1.8 })));
      this.cache.draw(`skirt-${key}`, (g) => g.line(0, floorY - 9, w, floorY - 9, opts(1002, { stroke: COLORS.muted, strokeWidth: 1.1 })));
      this.cache.draw(`corner-${key}`, (g) => g.line(w * 0.045, 0, w * 0.045, floorY, opts(1003, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      this.cache.draw(`persp-${key}`, (g) => g.line(0, floorY + 26, w * 0.045, floorY, opts(1004, { stroke: COLORS.muted, strokeWidth: 1 })));

      // a window with the curtains drawn — the room has to be dark
      const wx = w * 0.075;
      const wy = h * 0.10;
      const ww = compact ? 62 : 88;
      const wh = compact ? 58 : 78;
      this.cache.draw(`window-${key}`, (g) => g.rectangle(wx, wy, ww, wh, opts(1010, { stroke: COLORS.muted, strokeWidth: 1.8 })));
      this.cache.draw(`curtainL-${key}`, (g) => g.path(
        `M ${wx - 8} ${wy - 6} l 0 ${wh + 14} q 12 -6 20 0 l 0 ${-wh - 14} Z`,
        opts(1011, { stroke: COLORS.pink, strokeWidth: 1.4, fill: COLORS.pink, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 7 }),
      ));
      this.cache.draw(`curtainR-${key}`, (g) => g.path(
        `M ${wx + ww - 12} ${wy - 6} l 0 ${wh + 14} q 12 -6 20 0 l 0 ${-wh - 14} Z`,
        opts(1012, { stroke: COLORS.pink, strokeWidth: 1.4, fill: COLORS.pink, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 7 }),
      ));
      this.cache.draw(`rail-${key}`, (g) => g.line(wx - 12, wy - 8, wx + ww + 12, wy - 8, opts(1013, { stroke: COLORS.muted, strokeWidth: 1.4 })));

      // the light switch, flicked off
      this.cache.draw(`switch-${key}`, (g) => g.rectangle(w * 0.052, h * 0.46, 14, 20, opts(1020, { stroke: COLORS.muted, strokeWidth: 1.3 })));
      label(ctx, 'lights off', w * 0.052 + 7, h * 0.46 + 33, { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'center' });
      return floorY;
    }

    // ---- the desk, the book stack, the taped-down pointer, the foil card ----
    drawBench(floorY, compact) {
      const { ctx, w, h } = this;
      const key = `${w}x${h}`;
      const dx = w * 0.11;
      const dw = compact ? w * 0.30 : w * 0.26;
      const dy = floorY - (compact ? 84 : 104);

      this.cache.draw(`desktop-${key}`, (g) => g.rectangle(dx, dy, dw, 9, opts(1030, {
        stroke: COLORS.orange, strokeWidth: 2, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 6,
      })));
      this.cache.draw(`leg1-${key}`, (g) => g.line(dx + 8, dy + 9, dx + 8, floorY, opts(1031, { stroke: COLORS.orange, strokeWidth: 1.8 })));
      this.cache.draw(`leg2-${key}`, (g) => g.line(dx + dw - 8, dy + 9, dx + dw - 8, floorY, opts(1032, { stroke: COLORS.orange, strokeWidth: 1.8 })));

      // three books, to get the pointer to the right height
      const bx = dx + 10;
      const bookH = 11;
      for (let i = 0; i < 3; i++) {
        const bookColor = [COLORS.cyan, COLORS.green, COLORS.yellow][i];
        this.cache.draw(`book-${i}-${key}`, (g) => g.rectangle(bx + i * 2, dy - bookH * (i + 1) - i, 62 - i * 5, bookH,
          opts(1040 + i, { stroke: bookColor, strokeWidth: 1.5 })));
      }
      const laserY = dy - bookH * 3 - 4;

      // the pointer itself, held down by a clothes peg
      this.cache.draw(`pointer-${key}`, (g) => g.rectangle(bx + 6, laserY - 12, 46, 11, opts(1050, {
        stroke: COLORS.ink, strokeWidth: 1.8, fill: COLORS.ink, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 5,
      })));
      this.cache.draw(`peg-${key}`, (g) => g.path(
        `M ${bx + 14} ${laserY - 17} l 22 0 l 0 20 l -22 0 M ${bx + 14} ${laserY - 7} l 22 0`,
        opts(1051, { stroke: COLORS.yellow, strokeWidth: 1.3 }),
      ));
      label(ctx, `laser pointer, ${fmtNum(this.lambdaNm, 0)} nm`, bx + 28, laserY - 22,
        { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'center' });

      // the foil card in a bulldog clip, further along the desk
      const fx = dx + dw - 30;
      const beamY = laserY - 6;
      this.cache.draw(`clip-${key}`, (g) => g.path(
        `M ${fx - 7} ${dy} l 0 -14 l 14 0 l 0 14`, opts(1060, { stroke: COLORS.muted, strokeWidth: 1.5 }),
      ));
      this.cache.draw(`foil-${key}`, (g) => g.rectangle(fx - 9, beamY - 24, 18, 46, opts(1061, {
        stroke: COLORS.cyan, strokeWidth: 1.8, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 5,
      })));
      // the two razor cuts, drawn as gaps punched back through the foil
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(fx - 9, beamY - 4.2, 18, 2.6);
      ctx.fillRect(fx - 9, beamY + 1.6, 18, 2.6);
      label(ctx, 'foil · two razor cuts', fx, beamY + 36, { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'center' });

      return { beamX: bx + 52, beamY, foilX: fx };
    }

    // ---- the wall the pattern lands on, with a real 30 cm ruler under it ----
    drawWallPattern(bench, compact, V) {
      const { rc, ctx, w, h } = this;
      const key = `${w}x${h}`;
      const wallX = w * 0.52;
      const wallW = w - wallX - (compact ? 16 : 26);
      const cy = bench.beamY;
      const RULER_M = 0.30;                 // a real 30 cm ruler — it never rescales
      const pxPerM = wallW / RULER_M;
      const n = this.homeNumbers();
      const rgb = wavelengthRGB(this.lambdaNm);

      // the beam: a solid line to the foil, then a faint fan beyond it
      ctx.save();
      ctx.strokeStyle = rgb;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bench.beamX, cy);
      ctx.lineTo(bench.foilX - 10, cy);
      ctx.stroke();
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1;
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(bench.foilX + 10, cy);
        ctx.lineTo(wallX, cy + (i / 6) * (wallW * 0.17));
        ctx.stroke();
      }
      ctx.restore();

      // the pattern itself, painted column by column straight from I(y)
      const bandH = compact ? 30 : 40;
      ctx.save();
      for (let px = 0; px < wallW; px++) {
        const y = (px / wallW - 0.5) * RULER_M;   // metres from the pattern centre
        const I = intensity(y, this.lambda, this.aWidth, this.dSep, this.LM, V);
        if (I < 0.004) continue;
        ctx.globalAlpha = Math.min(1, I);
        ctx.fillStyle = rgb;
        ctx.fillRect(wallX + px, cy - bandH / 2, 1.4, bandH);
      }
      ctx.restore();

      // the ruler, held flat against the wall under the pattern
      const ry = cy + bandH / 2 + 10;
      this.cache.draw(`ruler-${key}`, (g) => g.rectangle(wallX, ry, wallW, 17, opts(1070, { stroke: COLORS.yellow, strokeWidth: 1.6 })));
      for (let cm = 0; cm <= 30; cm++) {
        const x = wallX + (cm / 30) * wallW;
        const big = cm % 5 === 0;
        this.cache.draw(`tick-${cm}-${key}`, (g) => g.line(x, ry, x, ry + (big ? 9 : 5),
          opts(1080 + cm, { stroke: COLORS.yellow, strokeWidth: big ? 1.3 : 0.9 })));
        if (big && !compact) label(ctx, String(cm), x, ry + 16, { color: COLORS.yellow, size: 9, align: 'center' });
      }
      label(ctx, '30 cm ruler', wallX + wallW / 2, ry + (compact ? 15 : 29), { color: COLORS.yellow, size: compact ? 10 : 12, align: 'center' });

      // measure one fringe spacing on the wall, in real millimetres
      if (n.dy * pxPerM > 14) {
        const ax = wallX + wallW / 2;
        const ay = cy - bandH / 2 - 12;
        doodleArrow(rc, ax, ay, ax + n.dy * pxPerM, ay, { color: COLORS.pink, seed: 1090, strokeWidth: 1.4 });
        doodleArrow(rc, ax + n.dy * pxPerM, ay, ax, ay, { color: COLORS.pink, seed: 1091, strokeWidth: 1.4 });
        label(ctx, `Δy = ${fmtNum(n.dy * 1000, 1)} mm`, ax + (n.dy * pxPerM) / 2, ay - 7,
          { color: COLORS.pink, size: compact ? 11 : 13, align: 'center' });
      }

      // a picture frame and a pot plant, so the wall reads as a wall
      const fxw = compact ? 46 : 62;
      const fxh = compact ? 36 : 46;
      const fx0 = w - (compact ? 68 : 94);
      const fy0 = h * 0.12;
      this.cache.draw(`frame-${key}`, (g) => g.rectangle(fx0, fy0, fxw, fxh, opts(1100, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      this.cache.draw(`frameArt-${key}`, (g) => g.path(
        `M ${fx0 + 6} ${fy0 + fxh - 8} l ${fxw * 0.28} ${-fxh * 0.46} l ${fxw * 0.24} ${fxh * 0.30} l ${fxw * 0.2} ${-fxh * 0.24}`,
        opts(1101, { stroke: COLORS.green, strokeWidth: 1.2 }),
      ));
      const plantX = w - (compact ? 32 : 44);
      this.cache.draw(`pot-${key}`, (g) => g.path(
        `M ${plantX - 13} ${h * 0.80 - 26} l 4 26 l 18 0 l 4 -26 Z`, opts(1110, { stroke: COLORS.orange, strokeWidth: 1.5 }),
      ));
      for (let i = 0; i < 4; i++) {
        this.cache.draw(`frond-${i}-${key}`, (g) => g.path(
          `M ${plantX} ${h * 0.80 - 26} q ${(i - 1.5) * 13} ${-20} ${(i - 1.5) * 19} ${-34}`,
          opts(1120 + i, { stroke: COLORS.green, strokeWidth: 1.3 }),
        ));
      }
      return { wallX, wallW, cy, bandH, pxPerM };
    }

    renderHome() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const floorY = this.drawRoom(compact);
      const bench = this.drawBench(floorY, compact);
      this.drawWallPattern(bench, compact, 1);

      // feet on the floor: stickFigure hangs 51 x scale px below the head centre
      stickFigure(rc, w * 0.455, floorY - (compact ? 31 : 39), { scale: compact ? 0.6 : 0.76, seed: 1130, color: COLORS.ink });

      const n = this.homeNumbers();
      label(ctx, `Δy = λL/d = ${fmtNum(n.dy * 1000, 2)} mm between bright bars`, w / 2, compact ? 20 : 26,
        { color: COLORS.pink, size: compact ? 13 : 17, align: 'center' });
      label(ctx, compact
        ? 'a pointer, foil with two cuts, and the far wall'
        : 'a laser pointer, kitchen foil with two razor cuts, and the far wall — that is the whole apparatus',
      w / 2, compact ? 36 : 45, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
    }

    renderWhich() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const V = this.visibility;
      const floorY = this.drawRoom(compact);
      const bench = this.drawBench(floorY, compact);
      this.drawWallPattern(bench, compact, V);

      // a which-cut detector clamped over the upper razor cut
      const dx = bench.foilX;
      const dy = bench.beamY - 4;
      rc.rectangle(dx - 30, dy - 44, 24, 16, opts(1140, { stroke: COLORS.orange, strokeWidth: 1.6 }));
      rc.line(dx - 18, dy - 28, dx - 9, dy - 6, opts(1141, { stroke: COLORS.orange, strokeWidth: 1.3 }));
      label(ctx, compact ? 'which-cut' : 'which-cut detector', dx - 18, dy - 50,
        { color: COLORS.orange, size: compact ? 9.5 : 11, align: 'center' });

      // the V/D trade-off, drawn as the quarter circle it literally is
      const gx = compact ? w * 0.30 : w * 0.335;
      const gy = h * 0.285;
      const R = compact ? 44 : 60;
      this.cache.draw(`quad-${w}x${h}`, (g) => g.path(
        `M ${gx} ${gy - R} A ${R} ${R} 0 0 1 ${gx + R} ${gy}`, opts(1150, { stroke: COLORS.muted, strokeWidth: 1.3 }),
      ));
      this.cache.draw(`qax-${w}x${h}`, (g) => g.line(gx, gy, gx + R + 8, gy, opts(1151, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      this.cache.draw(`qay-${w}x${h}`, (g) => g.line(gx, gy, gx, gy - R - 8, opts(1152, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      ctx.fillStyle = COLORS.pink;
      ctx.beginPath();
      ctx.arc(gx + this.D * R, gy - V * R, 4.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, 'V', gx - 10, gy - R - 3, { color: COLORS.cyan, size: 12 });
      label(ctx, 'D', gx + R + 4, gy + 14, { color: COLORS.orange, size: 12 });
      label(ctx, 'V² + D² = 1', gx + R * 0.62, gy - R * 0.78, { color: COLORS.muted, size: compact ? 10 : 11.5, align: 'center' });

      label(ctx, V > 0.98
        ? 'nobody could tell which cut it went through → full fringes'
        : V < 0.06
          ? 'the path is fully knowable → no fringes at all, just two overlapping blobs'
          : `V = ${fmtNum(V, 2)} — partial knowledge buys partial fringes`,
      w / 2, compact ? 20 : 26, { color: V > 0.5 ? COLORS.cyan : COLORS.orange, size: compact ? 12 : 16, align: 'center' });
      label(ctx, 'the detector does not have to be read. The information only has to exist.',
        w / 2, compact ? 36 : 44, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
    }

    renderOne() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const { p, lam, dy } = this.partNumbers();
      const colW = compact ? w * 0.30 : w * 0.26;

      // ---- the machine, as a real column standing on the left ----
      const cx = colW * 0.5;
      const halfCol = compact ? 26 : 34;
      this.cache.draw(`col-${key}`, (g) => g.rectangle(cx - halfCol, h * 0.13, halfCol * 2, h * 0.72,
        opts(1200, { stroke: COLORS.muted, strokeWidth: 1.8 })));
      this.cache.draw(`fil-${key}`, (g) => g.path(
        `M ${cx - 9} ${h * 0.185} l 4 8 l 5 -8 l 5 8 l 4 -8`, opts(1201, { stroke: COLORS.orange, strokeWidth: 1.6 }),
      ));
      this.cache.draw(`anode-${key}`, (g) => g.line(cx - 20, h * 0.245, cx + 20, h * 0.245, opts(1202, { stroke: COLORS.cyan, strokeWidth: 1.8 })));
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(cx - 4, h * 0.245 - 3, 8, 6);
      label(ctx, p.source, cx, h * 0.135, { color: COLORS.orange, size: compact ? 9.5 : 11, align: 'center' });

      // the beam splitter: a grating for molecules, a biprism wire otherwise
      const gy = h * 0.47;
      if (p.key === 'c60') {
        for (let i = 0; i < 9; i++) {
          this.cache.draw(`grat-${i}-${key}`, (g) => g.line(cx - 18 + i * 4.5, gy - 6, cx - 18 + i * 4.5, gy + 6,
            opts(1210 + i, { stroke: COLORS.green, strokeWidth: 1.2 })));
        }
        label(ctx, '100 nm grating', cx, gy + 22, { color: COLORS.green, size: compact ? 9 : 10.5, align: 'center' });
      } else {
        this.cache.draw(`plateL-${key}`, (g) => g.line(cx - 22, gy, cx - 6, gy, opts(1215, { stroke: COLORS.muted, strokeWidth: 1.6 })));
        this.cache.draw(`plateR-${key}`, (g) => g.line(cx + 6, gy, cx + 22, gy, opts(1216, { stroke: COLORS.muted, strokeWidth: 1.6 })));
        ctx.fillStyle = COLORS.yellow;
        ctx.beginPath(); ctx.arc(cx, gy, 2.6, 0, Math.PI * 2); ctx.fill();
        label(ctx, p.key === 'photon' ? 'two slits' : 'biprism wire', cx, gy + 21,
          { color: COLORS.yellow, size: compact ? 9 : 10.5, align: 'center' });
      }

      // exactly one particle in flight, always
      const ph = (this.flightT / 0.9) % 1;
      const py = h * 0.245 + ph * (h * 0.60);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx + (py > gy ? (ph - 0.56) * 24 : 0), py, 3.4, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, 'one at a time', cx, h * 0.885, { color: p.color, size: compact ? 10 : 12, align: 'center' });

      // ---- the detector screen, face on, taking the rest of the canvas ----
      const sx = colW + (compact ? 12 : 24);
      const sw = w - sx - (compact ? 12 : 24);
      const sy = h * 0.15;
      const sh = h * 0.62;
      this.cache.draw(`screen-${key}`, (g) => g.rectangle(sx, sy, sw, sh, opts(1220, { stroke: COLORS.ink, strokeWidth: 2 })));

      const span = 4.5 * dy;
      const pxPerM = sw / (2 * span);
      ctx.fillStyle = p.color;
      for (const d of this.dots) {
        const x = sx + sw / 2 + d.y * pxPerM;
        if (x < sx + 1 || x > sx + sw - 2) continue;
        ctx.fillRect(x, sy + 5 + d.r * (sh - 11), 1.7, 1.7);
      }

      label(ctx, `${fmtNum(this.dots.length, 0)} ${p.unit} have landed`, sx + sw / 2, compact ? 20 : 26,
        { color: COLORS.yellow, size: compact ? 13 : 17, align: 'center' });
      const stage = this.dots.length < 60 ? 0 : this.dots.length < 1200 ? 1 : 2;
      label(ctx, compact
        ? ['random noise, so far', 'bands are starting to show', 'the same dots, now fringes'][stage]
        : ['so far it looks like random noise — which is exactly what Tonomura\'s first frames looked like',
          'bands are starting to show. No dot moved; only more of them arrived.',
          'the same random dots, now unmistakably fringes'][stage],
      sx + sw / 2, compact ? 36 : 44, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, compact
        ? `λ = ${sci(lam, 2)} m · spacing ${sci(dy, 1)} m`
        : `λ = ${sci(lam, 3)} m  ·  real fringe spacing ${sci(dy, 2)} m — drawn wide enough to see`,
      sx + sw / 2, h * 0.83, { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'center' });
      notToScale(rc, ctx, sx + sw - (compact ? 64 : 72), sy + 22);
    }

    renderEraser() {
      const { ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const lam = this.lambda;
      const dyF = (lam * this.LM) / this.dSep;
      const span = 5.5 * dyF;
      const pad = compact ? 12 : 26;
      const sw = w - 2 * pad;
      const pxPerM = sw / (2 * span);
      const top0 = compact ? 44 : 58;
      const rowH = (h - top0 - (compact ? 22 : 30)) / 3;

      const strip = (idx, top, dots, title, color, sub) => {
        this.cache.draw(`strip-${idx}-${key}`, (g) => g.rectangle(pad, top, sw, rowH - 18,
          opts(1300 + idx, { stroke: COLORS.muted, strokeWidth: 1.4 })));
        ctx.fillStyle = color;
        for (const d of dots) {
          const x = pad + sw / 2 + d.y * pxPerM;
          if (x < pad + 1 || x > pad + sw - 2) continue;
          ctx.fillRect(x, top + 20 + d.r * (rowH - 42), 1.7, 1.7);
        }
        label(ctx, title, pad + 8, top + (compact ? 13 : 15), { color, size: compact ? 11 : 13.5 });
        label(ctx, sub, pad + sw - 8, top + (compact ? 13 : 15), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'right' });
      };

      const setA = this.eraserDots.filter((d) => d.tag === 0);
      const setB = this.eraserDots.filter((d) => d.tag === 1);
      strip(0, top0, this.eraserDots, 'THE SCREEN — every hit', COLORS.ink,
        `${fmtNum(this.eraserDots.length, 0)} hits · no fringes, ever`);
      strip(1, top0 + rowH, setA, 'sorted: partner said "A"', COLORS.cyan,
        `${fmtNum(setA.length, 0)} hits · fringes`);
      strip(2, top0 + rowH * 2, setB, 'sorted: partner said "B"', COLORS.pink,
        `${fmtNum(setB.length, 0)} hits · fringes, shifted half a period`);

      label(ctx, 'the same dots, sorted three ways', w / 2, compact ? 18 : 24,
        { color: COLORS.yellow, size: compact ? 13 : 17, align: 'center' });
      label(ctx, compact
        ? 'the lower strips ARE the top one, in two piles'
        : 'nothing was erased and nothing travelled backwards — the lower two strips ARE the top strip, put into two piles',
      w / 2, compact ? 32 : 41, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
      // kept clear of the bottom 26 px, where the on-canvas source chip is drawn
      label(ctx, compact
        ? 'sorting needs the partner\'s list — light speed or slower'
        : 'and sorting needs the partner detector\'s list, which can only reach you at light speed or slower',
      w / 2, h - (compact ? 30 : 34), { color: COLORS.orange, size: compact ? 10 : 12.5, align: 'center' });
    }

    renderYou() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const floorY = this.drawRoom(compact);

      // a doorway in the same bedroom, with the reader walking through it
      const doorX = w * 0.40;
      const doorW = compact ? 88 : 124;
      const doorH = compact ? 186 : 246;
      this.cache.draw(`door-${key}`, (g) => g.rectangle(doorX, floorY - doorH, doorW, doorH,
        opts(1400, { stroke: COLORS.orange, strokeWidth: 2.2 })));
      this.cache.draw(`doorIn-${key}`, (g) => g.rectangle(doorX + 7, floorY - doorH + 7, doorW - 14, doorH - 7,
        opts(1401, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      this.cache.draw(`swing-${key}`, (g) => g.path(
        `M ${doorX + doorW} ${floorY - doorH} l ${compact ? 26 : 36} ${compact ? 14 : 18} l 0 ${doorH - (compact ? 14 : 18)} l ${-(compact ? 26 : 36)} 0`,
        opts(1402, { stroke: COLORS.orange, strokeWidth: 1.6 }),
      ));
      ctx.fillStyle = COLORS.yellow;
      ctx.beginPath();
      ctx.arc(doorX + doorW + (compact ? 20 : 28), floorY - doorH * 0.48, 3.2, 0, Math.PI * 2);
      ctx.fill();

      stickFigure(rc, doorX + doorW * 0.5, floorY - doorH * 0.84, { scale: compact ? 0.84 : 1.12, seed: 1410, color: COLORS.ink });
      label(ctx, '0.8 m opening', doorX + doorW / 2, floorY + 17, { color: COLORS.orange, size: compact ? 10 : 12, align: 'center' });

      // one clean shadow, no spreading — drawn as two hard edges on the floor
      ctx.save();
      ctx.strokeStyle = COLORS.muted;
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(doorX, floorY + 6); ctx.lineTo(doorX - 30, floorY + 26);
      ctx.moveTo(doorX + doorW, floorY + 6); ctx.lineTo(doorX + doorW + 30, floorY + 26);
      ctx.stroke();
      ctx.restore();

      const you = H / (70 * 1.4);
      const vNeeded = H / (70 * 0.8);
      label(ctx, `your de Broglie wavelength: ${sci(you, 3)} m`, w / 2, compact ? 20 : 26,
        { color: COLORS.pink, size: compact ? 13 : 18, align: 'center' });
      label(ctx, 'λ = h/mv — the same formula, no exceptions. It is simply very, very small.',
        w / 2, compact ? 36 : 45, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });

      // the ladder, on the right
      const lx = compact ? w * 0.80 : w * 0.78;
      const items = [
        ['electron, 50 kV', relElectronLambda(50e3), COLORS.cyan],
        ['C₆₀ buckyball', H / (720 * AMU * 220), COLORS.green],
        ['grain of sand', H / (5e-8 * 0.01), COLORS.yellow],
        ['housefly', H / (1.2e-4 * 1.0), COLORS.orange],
        ['you, walking', you, COLORS.pink],
      ];
      items.forEach((it, i) => {
        const y = h * 0.26 + i * (compact ? 22 : 28);
        label(ctx, it[0], lx - 6, y, { color: it[2], size: compact ? 10 : 12, align: 'right' });
        label(ctx, `${sci(it[1], 1)} m`, lx + 6, y, { color: COLORS.muted, size: compact ? 10 : 12 });
      });
      label(ctx, `to spread out in that doorway you would have to walk at ${sci(vNeeded, 1)} m/s`,
        w / 2, h - (compact ? 30 : 34), { color: COLORS.red, size: compact ? 10.5 : 13, align: 'center' });
    }

    render() {
      ({
        home: () => this.renderHome(),
        one: () => this.renderOne(),
        which: () => this.renderWhich(),
        eraser: () => this.renderEraser(),
        you: () => this.renderYou(),
      })[this.mode]();
    }
  }

  A.register('doubleSlit', DoubleSlitSim);
})();
