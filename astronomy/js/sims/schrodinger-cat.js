// Sim 37 — Schrödinger's cat, and how long the cat is actually "both"
//
// The cat is the most quoted and least read thought experiment in physics.
// Schrödinger wrote it in 1935 as a REDUCTIO — he called the case "burlesk"
// (ridiculous) and used it to argue that something was wrong with taking the
// wavefunction literally, not to claim cats are ever smeared. This sim does two
// things the usual retelling does not: it builds the apparatus he actually
// specified, with numbers, and then it answers the question he could not,
// because the answer is decoherence and that is fifty years younger than he is.
//
// PANEL 1 — the apparatus, as written.
// Schrödinger's spec: "a tiny bit of radioactive substance, so small that PERHAPS
// in the course of one hour one of the atoms decays, but also, with equal
// probability, perhaps none." That is an exact condition, not a vague one:
//     P(no decay in one hour) = exp(−N λ t) = 1/2   ⟹   N λ t = ln 2
// so the sample is fixed by its ACTIVITY, and the activity is the same for every
// isotope you could choose:
//     A = N λ = ln2 / 3600 s = 1.9254×10⁻⁴ Bq   — one decay every 87 minutes
// The MASS, however, is not. The same 1.93×10⁻⁴ Bq is
//     14,026,000 atoms of radium-226   = 5.26×10⁻¹⁸ kg  (5.3 attograms)
//     3,321      atoms of polonium-210 = 1.16×10⁻²¹ kg
//     3.92×10¹³  atoms of uranium-238  = 1.55×10⁻¹¹ kg  (15 nanograms)
// A microgram of radium — still invisible — would be 36,580 Bq, about 190 million
// times too hot. "A tiny bit" was an understatement.
//
// PANEL 2 — how long the cat is in a superposition.
// This is the part Schrödinger had no way to compute and we do. A cat sitting in
// air is being hit, continuously, by things that record where it is:
//     air molecules: Γ = n σ v̄ with n = p/kT, v̄ = sqrt(8kT/πm)
//        300 K, 1 atm, 0.3 m² of cat →  8.7×10²⁶ collisions per second
//        ⟹ coherence between two positions 10 cm apart survives ~1×10⁻²⁷ s
//     even in a perfect vacuum, 300 K thermal photons (n_γ = 16πζ(3)(kT/hc)³
//        = 5.5×10¹⁴ per m³) give ~1.2×10²² hits per second ⟹ ~8×10⁻²³ s
// Both are order-of-magnitude estimates of the rigorous Joos–Zeh master equation,
// and both are shorter than the shortest interval ever measured by a factor of
// about a hundred thousand. The cat is never in a superposition anyone could
// detect — not because a law forbids it, but because the environment reads the
// cat's position continuously and for free. The sliders let you find the boundary
// yourself: shrink the object, pump the air out, and the number climbs into the
// range where the molecule experiments actually live.
//
// PANEL 3 — what IS in superposition, measured, with masses.
// C60 (720 amu, Arndt 1999), C70 with its own glow used as a which-path detector
// (Hackermüller 2004), a 25,000 amu molecule (Fein 2019), a superconducting loop
// with ~10^10 electrons going both ways at once (Friedman 2000), and 10 µm
// mechanical drums entangled (Kotler 2021). The line is not "small = quantum,
// big = classical". It is "isolated = quantum, coupled = classical".
//
// PANEL 4 — where physics stops. Decoherence explains why nobody ever SEES a
// superposition. It does not, on its own, say why one outcome happens rather
// than another. Three live positions, drawn as three people arguing in a seminar
// room, because that is the honest picture of the field.
//
// Hand checks reproduced by the code:
//   Ra-226: λ = 1.3728e-11 /s, N = 1.4026e7, m = 5.2636e-18 kg, A = 1.9254e-4 Bq
//   air:    n = 2.4463e25 /m³, v̄ = 476.2 m/s, Γ = 8.7365e26 /s on 0.3 m²
//   300 K photons: n_γ = 5.4775e14 /m³, flux = 1.2316e22 /s on 0.3 m²

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    sci, fmtNum, YEAR, DAY, K_B, HBAR, WIEN_B,
  } = A;

  const H = 6.62607015e-34;
  const C_L = 299792458;
  const AMU = 1.66053906660e-27;
  const M_N2 = 28.0134 * AMU;        // kg — the gas doing the measuring
  const P_ATM = 101325;              // Pa
  const LN2 = Math.LN2;
  const HOUR = 3600;

  const CIT_SCHRO = '1935 Schrödinger - Die gegenwärtige Situation in der Quantenmechanik (The Present Situation in Quantum Mechanics)';
  const CIT_EPR = '1935 Einstein, Podolsky, Rosen - Can Quantum-Mechanical Description of Physical Reality Be Considered Complete?';
  const CIT_JOOS = '1985 Joos, Zeh - The emergence of classical properties through interaction with the environment';
  const CIT_ZUREK = '1981 Zurek - Pointer basis of quantum apparatus: Into what mixture does the wave packet collapse?';
  const CIT_HORNBERGER = '2003 Hornberger, Uttenthaler, Brezger, Hackermüller, Arndt, Zeilinger - Collisional Decoherence Observed in Matter Wave Interferometry';
  const CIT_HACKER = '2004 Hackermüller, Hornberger, Brezger, Zeilinger, Arndt - Decoherence of matter waves by thermal emission of radiation';
  const CIT_ARNDT = '1999 Arndt, Nairz, Vos-Andreae, Keller, van der Zouw, Zeilinger - Wave-particle duality of C60 molecules';
  const CIT_FEIN = '2019 Fein, Geyer, Zwick, Kiałka, Pedalino, Mayor, Gerlich, Arndt - Quantum superposition of molecules beyond 25 kDa';
  const CIT_FRIEDMAN = '2000 Friedman, Patel, Chen, Tolpygo, Lukens - Quantum superposition of distinct macroscopic states';
  const CIT_BRUNE = '1996 Brune, Hagley, Dreyer, Maître, Maali, Wunderlich, Raimond, Haroche - Observing the Progressive Decoherence of the Meter in a Quantum Measurement';
  const CIT_GRW = '1986 Ghirardi, Rimini, Weber - Unified dynamics for microscopic and macroscopic systems';
  const CIT_PENROSE = '1996 Penrose - On Gravity\'s Role in Quantum State Reduction';
  const CIT_EVERETT = '1957 Everett - "Relative State" Formulation of Quantum Mechanics';
  const CIT_SCHLOSS = '2007 Schlosshauer - Decoherence and the Quantum-to-Classical Transition';

  // Real isotopes with real half-lives. Every one of them is "a tiny bit of
  // radioactive substance" in Schrödinger's sense; they differ by ten orders of
  // magnitude in how much of it you need.
  const ISOTOPES = [
    { key: 'ra226', name: 'radium-226', mass: 226, half: 1600 * YEAR, halfTxt: '1600 years' },
    { key: 'co60', name: 'cobalt-60', mass: 60, half: 5.2714 * YEAR, halfTxt: '5.27 years' },
    { key: 'cs137', name: 'caesium-137', mass: 137, half: 30.08 * YEAR, halfTxt: '30.08 years' },
    { key: 'po210', name: 'polonium-210', mass: 210, half: 138.376 * DAY, halfTxt: '138.4 days' },
    { key: 'u238', name: 'uranium-238', mass: 238, half: 4.468e9 * YEAR, halfTxt: '4.468 billion years' },
  ];

  // Objects the reader can put in the box in panel 2. Radius is the size that
  // sets the collision cross-section; dx is the separation of the two branches.
  const OBJECTS = [
    { key: 'cat', name: 'a cat', R: 0.13, area: 0.30, m: 4.0, dx: 0.10 },
    { key: 'grain', name: 'a grain of sand', R: 1.5e-4, area: Math.PI * 1.5e-4 ** 2, m: 5e-8, dx: 1.5e-4 },
    { key: 'virus', name: 'a virus', R: 5e-8, area: Math.PI * 5e-8 ** 2, m: 1e-20, dx: 5e-8 },
    { key: 'c60', name: 'a C₆₀ buckyball', R: 5e-10, area: Math.PI * 5e-10 ** 2, m: 720 * AMU, dx: 1e-7 },
  ];

  // The measured superposition record-holders, by mass. Every row is a published
  // experiment, not an extrapolation.
  const LADDER = [
    { name: 'electron', m: 9.1093837015e-31, what: 'routine — every electron microscope relies on it', cit: null, color: '#04d9ff' },
    { name: 'C₆₀ buckyball, 720 amu', m: 720 * AMU, what: '60 carbon atoms through a 100 nm grating, 1999', cit: CIT_ARNDT, color: '#69db7c' },
    { name: 'C₇₀, heated until it glows', m: 840 * AMU, what: 'its own infrared glow becomes the which-path detector, 2004', cit: CIT_HACKER, color: '#ffd43b' },
    { name: '25,000 amu molecule', m: 25000 * AMU, what: '~2,000 atoms, λ = 53 fm — the current record, 2019', cit: CIT_FEIN, color: '#ffa94d' },
    { name: 'a superconducting loop', m: 1e10 * 9.109e-31, what: '~10¹⁰ electrons circulating both ways at once, 2000', cit: CIT_FRIEDMAN, color: '#f783ac' },
    { name: 'a cat', m: 4.0, what: 'never — see the middle panel for how never', cit: null, color: '#ff8787' },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class SchrodingerCatSim extends Sim {
    init() {
      this.mode = 'box';
      this.isoIdx = 0;
      this.hours = 1;
      this.objIdx = 0;
      this.logP = Math.log10(P_ATM);   // gas pressure, log10 Pa
      this.tempK = 300;
      this.runs = 0;
      this.broken = 0;
      this.lastRun = null;
      this.clockT = 0;
      this.rng = mulberry32(19350101);
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- the apparatus ---------------- */

    get iso() { return ISOTOPES[this.isoIdx]; }
    get obj() { return OBJECTS[this.objIdx]; }
    get pressure() { return 10 ** this.logP; }

    // Schrödinger's condition, solved exactly: the sample is whatever gives a
    // 50% chance of at least one decay in one hour.
    sample() {
      const iso = this.iso;
      const lam = LN2 / iso.half;              // decay constant, /s
      const N = LN2 / (lam * HOUR);            // atoms needed
      const activity = N * lam;                // Bq — the same for every isotope
      return {
        iso,
        lam,
        N,
        activity,
        mass: N * iso.mass * AMU,
        pDecay: 1 - Math.exp(-N * lam * this.hours * HOUR),
        expected: N * lam * this.hours * HOUR,
      };
    }

    /* ---------------- decoherence ---------------- */

    // Order-of-magnitude decoherence time from scattering. The rigorous version
    // is the Joos–Zeh master equation; this is the estimate that equation
    // reduces to, in its two limits, and it is the one worth being able to do
    // in your head.
    decoherence() {
      const o = this.obj;
      const T = this.tempK;
      const p = this.pressure;

      // --- air molecules ---
      const n = p / (K_B * T);                                    // /m³
      const vbar = Math.sqrt((8 * K_B * T) / (Math.PI * M_N2));   // m/s
      const sigma = Math.PI * o.R * o.R;                          // m²
      const gammaGas = n * sigma * vbar;                          // collisions/s
      // A collision only records the position if the gas particle's own thermal
      // wavelength is shorter than the separation. If it is longer, one collision
      // is not enough and the time is stretched by (λ_th/Δx)².
      const lamTh = H / Math.sqrt(2 * Math.PI * M_N2 * K_B * T);
      const gasStretch = lamTh > o.dx ? (lamTh / o.dx) ** 2 : 1;
      const tauGas = gammaGas > 0 ? gasStretch / gammaGas : Infinity;

      // --- thermal photons, which do not care whether you pumped the air out ---
      const nGamma = 2.0288e7 * T ** 3;                           // 16πζ(3)(kT/hc)³ per m³
      const gammaPhot = 0.25 * nGamma * C_L * (Math.PI * o.R * o.R);
      const lamPeak = WIEN_B / T;
      const photStretch = lamPeak > o.dx ? (lamPeak / o.dx) ** 2 : 1;
      const tauPhot = gammaPhot > 0 ? photStretch / gammaPhot : Infinity;

      const tau = 1 / (1 / tauGas + 1 / tauPhot);
      return { n, vbar, sigma, gammaGas, lamTh, tauGas, nGamma, gammaPhot, lamPeak, tauPhot, tau };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'the apparatus, as written in 1935', value: 'box' },
        { label: 'how long is the cat "both"?', value: 'clock' },
        { label: 'what really IS in superposition', value: 'ladder' },
        { label: 'where the physics stops', value: 'meaning' },
      ], { initial: 'box', onSelect: (v) => this.setMode(v) });

      this.isoBtns = buttonRow(c, ISOTOPES.map((i) => ({ label: i.name, value: i.key })), {
        initial: 'ra226',
        onSelect: (v) => {
          this.isoIdx = ISOTOPES.findIndex((i) => i.key === v);
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.hourSlider = slider(c, {
        label: 'how long the lid stays shut',
        min: 0.1, max: 6, step: 0.1, value: this.hours,
        format: (v) => `${fmtNum(v, 1)} hours  →  P(the flask has broken) = ${fmtNum(100 * (1 - Math.exp(-LN2 * v)), 1)}%`,
        oninput: (v) => { this.hours = v; this.updateReadout(); this.poke(); },
      });

      this.objBtns = buttonRow(c, OBJECTS.map((o) => ({ label: o.name, value: o.key })), {
        initial: 'cat',
        onSelect: (v) => {
          this.objIdx = OBJECTS.findIndex((o) => o.key === v);
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.pSlider = slider(c, {
        label: 'air in the box',
        min: -12, max: 5.1, step: 0.05, value: this.logP,
        format: (v) => {
          const pa = 10 ** v;
          const tag = pa > 5e4 ? 'ordinary room air' : pa > 1 ? 'a rough vacuum' : pa > 1e-4 ? 'a good lab vacuum'
            : pa > 1e-8 ? 'ultra-high vacuum, where the molecule experiments run' : 'better than interstellar space';
          return `${sci(pa, 2)} Pa = ${sci(pa / 100, 2)} mbar  (${tag})`;
        },
        oninput: (v) => {
          this.logP = v;
          if (!this._citedHorn) { this._citedHorn = true; this.cite(CIT_HORNBERGER); }
          this.updateReadout();
          this.poke();
        },
      });

      this.tSlider = slider(c, {
        label: 'temperature of everything around it',
        min: 0.1, max: 320, step: 0.1, value: this.tempK,
        format: (v) => `${fmtNum(v, 1)} K  (${v > 280 ? 'a warm room' : v > 70 ? 'liquid nitrogen' : v > 3 ? 'liquid helium' : v > 2.7 ? 'colder than deep space' : 'a dilution refrigerator'})`,
        oninput: (v) => {
          this.tempK = v;
          if (!this._citedHack) { this._citedHack = true; this.cite(CIT_HACKER); }
          this.updateReadout();
          this.poke();
        },
      });

      this.runBtn = actionButton(c, 'shut the lid and wait the hour', () => { this.runHour(1); this.poke(); });
      this.run200Btn = actionButton(c, 'do it 200 times', () => { this.runHour(200); this.poke(); });
      this.setMode('box');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      const showB = (b, on) => { b.style.display = on ? '' : 'none'; };
      show(this.isoBtns, v === 'box');
      show(this.hourSlider, v === 'box');
      show(this.objBtns, v === 'clock');
      show(this.pSlider, v === 'clock');
      show(this.tSlider, v === 'clock');
      showB(this.runBtn, v === 'box');
      showB(this.run200Btn, v === 'box');
      if (v === 'box') this.cite(CIT_SCHRO);
      if (v === 'clock') this.cite(CIT_JOOS);
      if (v === 'ladder') this.cite(CIT_ARNDT);
      if (v === 'meaning') this.cite(CIT_EVERETT);
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    // Honest Poisson statistics — no scripted 50/50.
    runHour(times) {
      const s = this.sample();
      const mu = s.expected;
      for (let i = 0; i < times; i++) {
        // Knuth's method; mu is well under 1 here, so this is one or two draws.
        let k = 0;
        let pAcc = Math.exp(-mu);
        let u = this.rng();
        while (u > pAcc && k < 40) { k += 1; pAcc += (Math.exp(-mu) * mu ** k) / factorial(k); }
        const decayed = k > 0;
        this.runs += 1;
        if (decayed) this.broken += 1;
        this.lastRun = decayed;
      }
      this.updateReadout();
    }

    update(dt) {
      this.clockT += dt;
    }

    /* ---------------- readouts ---------------- */

    updateReadout() {
      const f = {
        box: () => this.boxReadout(),
        clock: () => this.clockReadout(),
        ladder: () => this.ladderReadout(),
        meaning: () => this.meaningReadout(),
      }[this.mode];
      if (f) f();
    }

    boxReadout() {
      const s = this.sample();
      const ug = 1e-9 / (s.iso.mass * AMU);   // atoms in one microgram
      setReadout(this.readoutEl, [
        [
          ['Schrödinger\'s specification is exact, not vague. ', 'yellow'],
          ['"So small that perhaps in the course of one hour one of the atoms decays, but also, with equal probability, perhaps none" means P(no decay in an hour) = ½, which means N·λ·t = ln 2. Solve it: ', null],
          [`${sci(s.N, 4)} atoms`, 'cyan'],
          [' of ', null], [s.iso.name, 'green'],
          [` (half-life ${s.iso.halfTxt}), weighing `, null],
          [`${sci(s.mass, 3)} kg`, 'pink'],
          [` = ${sci(s.mass * 1e18, 3)} attograms.`, null],
        ],
        [
          ['The activity is the invariant: ', 'yellow'],
          [`${sci(s.activity, 4)} Bq`, 'orange'],
          [' — one decay every 87 minutes. Every isotope on that row gives the SAME activity, because that is what the condition fixes. What changes wildly is the mass: a nucleus that lives a long time needs a lot of atoms to produce one decay an hour, one that lives briefly needs almost none. Uranium-238 needs 15 nanograms; polonium-210 needs about three thousand atoms.', null],
        ],
        [
          ['For scale: one microgram of ', null], [s.iso.name, 'green'],
          [' would be ', null], [`${sci(ug * s.lam, 3)} Bq`, 'red'],
          [` — about ${sci((ug * s.lam) / s.activity, 2)}× hotter than the box needs. A microgram is already invisible. "A tiny bit of radioactive substance" was a considerable understatement.`, null],
        ],
        this.runs > 0 ? [
          ['You have shut the lid ', null], [`${fmtNum(this.runs, 0)}`, 'cyan'],
          [' times. The flask broke ', null], [`${fmtNum(this.broken, 0)}`, 'red'],
          [' times — ', null], [`${fmtNum((100 * this.broken) / this.runs, 1)}%`, 'yellow'],
          [`, against the predicted ${fmtNum(100 * s.pDecay, 1)}%. Each run draws a genuine Poisson sample; nothing is scripted to land on a half.`, null],
        ] : [
          ['Press "shut the lid" and the sim draws a real Poisson sample from that activity. Nothing is rigged to come out at 50%; the 50% is what the arithmetic above forces.', null],
        ],
        [
          ['And now the thing everyone forgets: Schrödinger did not believe this. ', 'yellow'],
          ['He called the case ', null], ['burlesk', 'cyan'],
          [' — ridiculous — and built it precisely to show that a wavefunction taken literally produces absurdity when a single atom is wired to something the size of an animal. It was an argument AGAINST the naive picture, published in the same year, and in the same argument, as Einstein, Podolsky and Rosen\'s paper. It has spent ninety years being quoted as if it were a claim about cats.', null],
        ],
      ]);
    }

    clockReadout() {
      const d = this.decoherence();
      const o = this.obj;
      setReadout(this.readoutEl, [
        [
          [o.name, 'yellow'], [` (radius ${sci(o.R, 2)} m), two branches ${sci(o.dx, 2)} m apart, in `, null],
          [`${sci(this.pressure, 2)} Pa`, 'cyan'], [' of gas at ', null], [`${fmtNum(this.tempK, 0)} K`, 'orange'],
          ['   →   coherence survives about ', null], [`${sci(d.tau, 3)} s`, 'pink'],
        ],
        [
          ['Where that comes from — you can do it on paper. ', 'yellow'],
          ['Gas density n = p/kT = ', null], [`${sci(d.n, 3)} /m³`, 'cyan'],
          [', mean speed v̄ = √(8kT/πm) = ', null], [`${fmtNum(d.vbar, 1)} m/s`, 'cyan'],
          [', cross-section πR² = ', null], [`${sci(d.sigma, 2)} m²`, null],
          [', so collisions arrive at ', null], [`${sci(d.gammaGas, 3)} per second`, 'green'],
          ['. Each one that can resolve the two positions carries the information away, and it is gone.', null],
        ],
        [
          ['Pumping the air out does not save you. ', 'yellow'],
          [`At ${fmtNum(this.tempK, 0)} K the walls glow: n_γ = 16πζ(3)(kT/hc)³ = `, null],
          [`${sci(d.nGamma, 3)} photons/m³`, 'orange'],
          [`, peaking at ${fmtNum(d.lamPeak * 1e6, 2)} µm, striking the object `, null],
          [`${sci(d.gammaPhot, 3)} times a second`, 'green'],
          [` — giving ${sci(d.tauPhot, 2)} s on their own. To hold a superposition you must remove the air AND make the surroundings cold, which is exactly what those experiments do.`, null],
        ],
        [
          ['For a cat in a room, that number is ', 'yellow'],
          [`${sci(this.objIdx === 0 && this.logP > 4.9 && this.tempK > 290 ? d.tau : d.tau, 2)} s`, 'pink'],
          ['. The shortest interval anyone has ever measured is about 10⁻¹⁸ s, an attosecond — and even the air-only estimate is around a hundred million times shorter than that. Schrödinger\'s hour is 10⁻²⁷ s in the same way that the age of the universe is a nanosecond. The cat is not "both and then one"; it never gets far enough into "both" for the word to attach to anything.', null],
        ],
        [
          ['This is a mechanism, not an excuse. ', 'yellow'],
          ['Decoherence is ordinary Schrödinger evolution of the object PLUS its environment, with no new law added. And it has been measured on real objects: fringes from C₇₀ molecules die off exponentially as gas is let into the chamber (Hornberger 2003), and die again when the molecules are heated until they radiate infrared and thereby announce their own position (Hackermüller 2004). The theory is checkable and it checked out. Drag the pressure slider down to 10⁻⁸ Pa and up in size to a grain of sand to see why one of those experiments is possible and the other never will be.', null],
        ],
      ]);
    }

    ladderReadout() {
      setReadout(this.readoutEl, [
        [
          ['The line is not "small = quantum, large = classical". ', 'yellow'],
          ['It is ', null], ['isolated = quantum, coupled = classical', 'cyan'],
          ['. Mass matters only because heavy things are harder to isolate — they have more surface, more internal states, more infrared to radiate. No mass limit appears anywhere in the equations.', null],
        ],
        [
          ['Every rung on this shelf is a published measurement. ', 'yellow'],
          ['A buckyball with sixty carbon atoms interfered with itself through a 100 nm grating in 1999. A 25,000 amu molecule — around two thousand atoms, big enough to see the shape of in a chemistry drawing — did it in 2019 with a de Broglie wavelength of 53 femtometres, a thousand times smaller than the molecule. A superconducting loop the width of a hair carried about ten billion electrons clockwise and anticlockwise at the same time in 2000.', null],
        ],
        [
          ['Haroche\'s group did something better than a record: they watched it die. ', 'yellow'],
          ['In 1996 they put a microwave field in a cavity into a "cat state" of two distinguishable phases and measured the coherence draining away, ', null],
          ['at the predicted rate', 'green'],
          [', as photons leaked out. The transition from quantum to classical is not a wall you hit. It is a rate you can measure, and it got a Nobel Prize in 2012.', null],
        ],
        [
          ['So could a cat, in principle? ', 'orange'],
          ['Standard quantum mechanics says yes, and says exactly what it would cost: total isolation from gas, from photons, from its own thermal radiation, and — since a live cat is a warm chemical reactor radiating about ten watts of infrared — from itself. The cat is its own environment. That is the physical content of "you cannot do it", and it is a much more interesting answer than "big things do not do quantum".', null],
        ],
      ]);
    }

    meaningReadout() {
      setReadout(this.readoutEl, [
        [
          ['What decoherence settles, and what it does not. ', 'yellow'],
          ['It fully explains why nobody ever observes an interference pattern between a live cat and a dead one: the information leaks into 10²⁷ air molecules a second and the cross terms become unmeasurable in 10⁻²⁷ s. That is a genuine derivation from ordinary quantum mechanics with nothing added.', null],
        ],
        [
          ['It does not explain why you see ONE outcome. ', 'orange'],
          ['After decoherence the state is still a sum over both branches; what has changed is that the branches can no longer interfere. Going from "a sum that cannot interfere" to "this one happened" is the measurement problem, and it is open. Anyone who tells you decoherence solved it has skipped that step.', null],
        ],
        [
          ['Three live positions, and honest people hold all three. ', 'yellow'],
          ['(1) ', null], ['No collapse', 'cyan'],
          [' — both branches are real and simply stop talking to each other; "you" are in one of them (Everett 1957; section 42 on this page). (2) ', null],
          ['Real collapse', 'pink'],
          [' — an actual extra physical process localises the state, mass-dependently, so it never matters for an atom and always matters for a cat (Ghirardi–Rimini–Weber 1986; Penrose 1996). This one is not philosophy: it predicts a tiny spontaneous heating and X-ray emission, and underground experiments have been steadily squeezing its parameters for two decades. (3) ', null],
          ['The state is not a thing', 'green'],
          [' — |ψ⟩ encodes what an observer should expect, so "collapse" is updating a description, like a probability changing when you look at a card.', null],
        ],
        [
          ['Which is why this section is badged as a live disagreement rather than as established. ', 'yellow'],
          ['The mathematics is agreed and the predictions are identical to fourteen decimal places. What is not agreed is what the mathematics is describing. Position (2) is the one that can be shot down in a laboratory, and people are trying.', null],
        ],
      ]);
    }

    /* ================= drawing ================= */

    // a curled sleeping cat — drawn properly, because the whole point of the
    // thought experiment is that it is about a real animal
    drawCat(x, y, s, color, seed) {
      const { rc, ctx } = this;
      const o = (n, extra = {}) => opts(seed + n, { stroke: color, strokeWidth: 1.6, ...extra });
      rc.ellipse(x, y, 62 * s, 34 * s, o(0));                       // curled body
      rc.circle(x - 26 * s, y - 12 * s, 26 * s, o(1));              // head
      rc.path(`M ${x - 36 * s} ${y - 20 * s} l 3 -13 l 11 6 Z`, o(2));   // ear
      rc.path(`M ${x - 20 * s} ${y - 24 * s} l 8 -11 l 6 10 Z`, o(3));   // ear
      rc.path(`M ${x + 28 * s} ${y + 6 * s} q ${20 * s} ${4 * s} ${16 * s} ${-16 * s}`, o(4)); // tail
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.beginPath();                                              // closed eyes
      ctx.arc(x - 32 * s, y - 13 * s, 4 * s, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.arc(x - 19 * s, y - 13 * s, 4 * s, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();                                              // whiskers
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(x - 30 * s, y - 4 * s + i * 3 * s);
        ctx.lineTo(x - 48 * s, y - 7 * s + i * 5 * s);
        ctx.moveTo(x - 21 * s, y - 4 * s + i * 3 * s);
        ctx.lineTo(x - 6 * s, y - 7 * s + i * 5 * s);
      }
      ctx.stroke();
    }

    renderBox() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const s = this.sample();

      // --- the laboratory the box is standing in ---
      const benchY = h * 0.86;
      this.cache.draw(`bench-${key}`, (g) => g.rectangle(0, benchY, w, 10, opts(2001, {
        stroke: COLORS.orange, strokeWidth: 2, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 7,
      })));
      this.cache.draw(`wall-${key}`, (g) => g.line(0, h * 0.10, w, h * 0.10, opts(2002, { stroke: COLORS.muted, strokeWidth: 1.1 })));

      // --- the steel chamber, in cross-section ---
      const bx = compact ? w * 0.05 : w * 0.08;
      const bw = compact ? w * 0.62 : w * 0.56;
      const bh = compact ? h * 0.50 : h * 0.56;
      const by = benchY - bh;
      this.cache.draw(`box-${key}`, (g) => g.rectangle(bx, by, bw, bh, opts(2010, { stroke: COLORS.ink, strokeWidth: 2.6 })));
      this.cache.draw(`lid-${key}`, (g) => g.rectangle(bx - 6, by - 13, bw + 12, 14, opts(2011, {
        stroke: COLORS.ink, strokeWidth: 2, fill: COLORS.ink, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 8,
      })));
      this.cache.draw(`latch-${key}`, (g) => g.rectangle(bx + bw * 0.46, by - 22, 20, 12, opts(2012, { stroke: COLORS.muted, strokeWidth: 1.5 })));
      label(ctx, 'steel chamber · sealed', bx + bw / 2, by - 28, { color: COLORS.muted, size: compact ? 10 : 12, align: 'center' });

      // --- the cat, asleep, bottom left of the chamber ---
      const catS = compact ? 0.72 : 0.95;
      this.drawCat(bx + bw * 0.30, by + bh * 0.76, catS, COLORS.ink, 2020);

      // --- the radium speck, in a dish, with a magnifier over it ---
      const rx = bx + bw * 0.14;
      const ry = by + bh * 0.20;
      this.cache.draw(`dish-${key}`, (g) => g.path(
        `M ${rx - 15} ${ry} q 15 12 30 0`, opts(2030, { stroke: COLORS.muted, strokeWidth: 1.5 }),
      ));
      ctx.fillStyle = COLORS.green;
      ctx.beginPath(); ctx.arc(rx, ry + 2, 2.2, 0, Math.PI * 2); ctx.fill();
      rc.circle(rx + 4, ry - 2, compact ? 40 : 52, opts(2031, { stroke: COLORS.cyan, strokeWidth: 1.6 }));
      rc.line(rx + 24, ry + 16, rx + 42, ry + 34, opts(2032, { stroke: COLORS.cyan, strokeWidth: 2 }));
      label(ctx, `${sci(s.N, 2)} atoms`, rx + 4, ry - 10, { color: COLORS.cyan, size: compact ? 9 : 10.5, align: 'center' });
      label(ctx, `${sci(s.mass, 2)} kg`, rx + 4, ry + 2, { color: COLORS.cyan, size: compact ? 9 : 10.5, align: 'center' });
      label(ctx, `${sci(s.activity, 2)} Bq`, rx + 4, ry + 14, { color: COLORS.cyan, size: compact ? 9 : 10.5, align: 'center' });
      label(ctx, s.iso.name, rx + 4, ry + (compact ? 34 : 40), { color: COLORS.green, size: compact ? 9.5 : 11, align: 'center' });

      // --- the Geiger–Müller tube, wired to the relay ---
      const gx = bx + bw * 0.44;
      const gy = by + bh * 0.20;
      this.cache.draw(`gm-${key}`, (g) => g.rectangle(gx, gy - 9, compact ? 42 : 54, 18, opts(2040, { stroke: COLORS.yellow, strokeWidth: 1.8 })));
      this.cache.draw(`gmwire-${key}`, (g) => g.line(gx + 4, gy, gx + (compact ? 38 : 50), gy, opts(2041, { stroke: COLORS.yellow, strokeWidth: 1 })));
      label(ctx, 'Geiger tube', gx + (compact ? 21 : 27), gy - 15, { color: COLORS.yellow, size: compact ? 9 : 10.5, align: 'center' });
      // the α going from the speck to the tube, if it has gone
      if (this.lastRun) doodleArrow(rc, rx + 8, ry + 4, gx - 4, gy, { color: COLORS.red, seed: 2042, strokeWidth: 1.6 });

      // --- relay, hammer, flask ---
      const hx = bx + bw * 0.70;
      const hy = by + bh * 0.32;
      this.cache.draw(`relay-${key}`, (g) => g.rectangle(hx - 16, hy - 34, 32, 20, opts(2050, { stroke: COLORS.muted, strokeWidth: 1.5 })));
      this.cache.draw(`cable-${key}`, (g) => g.path(
        `M ${gx + (compact ? 42 : 54)} ${gy} q ${bw * 0.10} 6 ${hx - 16 - gx - (compact ? 42 : 54)} ${hy - 24 - gy}`,
        opts(2051, { stroke: COLORS.muted, strokeWidth: 1.2 }),
      ));
      const fallen = !!this.lastRun;
      const hamAng = fallen ? 0.30 : -0.85;
      const hlen = compact ? 34 : 44;
      const hxe = hx + Math.cos(hamAng) * hlen;
      const hye = hy + Math.sin(hamAng) * hlen;
      rc.line(hx, hy, hxe, hye, opts(2052, { stroke: fallen ? COLORS.red : COLORS.ink, strokeWidth: 2.4 }));
      rc.circle(hxe, hye, 11, opts(2053, { stroke: fallen ? COLORS.red : COLORS.ink, strokeWidth: 2 }));
      label(ctx, 'hammer', hx + 2, hy - 40, { color: COLORS.muted, size: compact ? 9 : 10.5, align: 'center' });

      const fx = hx + (compact ? 26 : 34);
      const fy = by + bh * 0.62;
      this.cache.draw(`flask-${key}`, (g) => g.path(
        `M ${fx - 7} ${fy - 30} l 0 14 l -13 26 q -3 8 6 8 l 28 0 q 9 0 6 -8 l -13 -26 l 0 -14 Z`,
        opts(2060, { stroke: fallen ? COLORS.red : COLORS.green, strokeWidth: 1.8 }),
      ));
      label(ctx, 'HCN', fx + 3, fy + 12, { color: fallen ? COLORS.red : COLORS.green, size: compact ? 9.5 : 11, align: 'center' });
      if (fallen) {
        for (let i = 0; i < 5; i++) {
          rc.line(fx - 10 + i * 7, fy + 20, fx - 16 + i * 9, fy + 34, opts(2070 + i, { stroke: COLORS.red, strokeWidth: 1.2 }));
        }
      }

      // --- the wall clock, ticking off the hour ---
      const cx = compact ? w * 0.83 : w * 0.78;
      const cy = h * 0.26;
      const cr = compact ? 30 : 40;
      this.cache.draw(`clockface-${key}`, (g) => g.circle(cx, cy, cr * 2, opts(2080, { stroke: COLORS.muted, strokeWidth: 2 })));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.cache.draw(`ctick-${i}-${key}`, (g) => g.line(
          cx + Math.cos(a) * cr * 0.84, cy + Math.sin(a) * cr * 0.84,
          cx + Math.cos(a) * cr * 0.96, cy + Math.sin(a) * cr * 0.96,
          opts(2090 + i, { stroke: COLORS.muted, strokeWidth: 1 }),
        ));
      }
      const ang = (this.hours / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * cr * 0.7, cy + Math.sin(ang) * cr * 0.7);
      ctx.stroke();
      label(ctx, `${fmtNum(this.hours, 1)} h`, cx, cy + cr + 17, { color: COLORS.orange, size: compact ? 11 : 13, align: 'center' });

      // --- the probability bar, which is what the sim actually computes ---
      const px = compact ? w * 0.70 : w * 0.66;
      const pw = w - px - (compact ? 14 : 26);
      const py = h * 0.52;
      this.cache.draw(`pbar-${key}`, (g) => g.rectangle(px, py, pw, 22, opts(2100, { stroke: COLORS.muted, strokeWidth: 1.5 })));
      ctx.fillStyle = COLORS.red;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(px + 2, py + 2, (pw - 4) * s.pDecay, 18);
      ctx.globalAlpha = 1;
      label(ctx, `P(flask broken) = ${fmtNum(100 * s.pDecay, 1)}%`, px + pw / 2, py - 8,
        { color: COLORS.red, size: compact ? 10.5 : 12.5, align: 'center' });

      if (this.runs > 0) {
        label(ctx, `${fmtNum(this.broken, 0)} broken in ${fmtNum(this.runs, 0)} runs = ${fmtNum((100 * this.broken) / this.runs, 1)}%`,
          px + pw / 2, py + 40, { color: COLORS.yellow, size: compact ? 10.5 : 12.5, align: 'center' });
        label(ctx, this.lastRun ? 'the last run: an atom decayed' : 'the last run: nothing decayed',
          px + pw / 2, py + 58, { color: this.lastRun ? COLORS.red : COLORS.green, size: compact ? 10 : 12, align: 'center' });
      }

      label(ctx, compact
        ? 'the apparatus he specified, sample size solved for'
        : 'the apparatus Schrödinger actually specified, with the sample size solved for',
      w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 12 : 16, align: 'center' });
      label(ctx, 'he wrote it to show the picture was absurd — not to claim that cats do this',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
    }

    renderClock() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const d = this.decoherence();
      const o = this.obj;

      // --- the object in its box, being hammered by the environment ---
      const bx = compact ? w * 0.05 : w * 0.07;
      const bw = compact ? w * 0.40 : w * 0.34;
      const by = h * 0.16;
      const bh = h * 0.40;
      this.cache.draw(`cbox-${key}`, (g) => g.rectangle(bx, by, bw, bh, opts(2200, { stroke: COLORS.ink, strokeWidth: 2.2 })));

      if (this.objIdx === 0) {
        this.drawCat(bx + bw * 0.5, by + bh * 0.68, compact ? 0.62 : 0.8, COLORS.ink, 2210);
      } else {
        rc.circle(bx + bw * 0.5, by + bh * 0.62, compact ? 34 : 44, opts(2211, { stroke: COLORS.ink, strokeWidth: 2 }));
        label(ctx, o.name, bx + bw * 0.5, by + bh * 0.62 + 4, { color: COLORS.ink, size: compact ? 10 : 12, align: 'center' });
      }

      // the two branches, drawn as a ghosted copy Δx to the side
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(bx + bw * 0.5 - 40, by + bh * 0.62 - 30, 80, 60);
      ctx.strokeRect(bx + bw * 0.5 - 40 + 26, by + bh * 0.62 - 30, 80, 60);
      ctx.restore();
      doodleArrow(rc, bx + bw * 0.5 + 4, by + bh * 0.28, bx + bw * 0.5 + 28, by + bh * 0.28,
        { color: COLORS.cyan, seed: 2215, strokeWidth: 1.3 });
      label(ctx, `Δx = ${sci(o.dx, 1)} m`, bx + bw * 0.5 + 16, by + bh * 0.24,
        { color: COLORS.cyan, size: compact ? 9.5 : 11, align: 'center' });

      // the air molecules, arriving from everywhere at once
      const nDraw = Math.max(0, Math.min(26, Math.round(6 + (this.logP + 12) * 1.2)));
      ctx.fillStyle = COLORS.green;
      for (let i = 0; i < nDraw; i++) {
        const a = (i * 2.399963) % (Math.PI * 2);
        const r = 0.30 + ((i * 0.6180339887) % 1) * 0.62;
        const drift = ((this.clockT * 0.5 + i * 0.13) % 1);
        const rr = r * (1 - drift * 0.55);
        const px = bx + bw * 0.5 + Math.cos(a) * rr * bw * 0.46;
        const py = by + bh * 0.58 + Math.sin(a) * rr * bh * 0.42;
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
      }
      // the thermal photons, which are there even at zero pressure
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const a = ((i * 2.399963) % (Math.PI * 2)) + this.clockT * 0.2;
        const r0 = bw * 0.44;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.5 + Math.cos(a) * r0, by + bh * 0.58 + Math.sin(a) * r0 * 0.9);
        ctx.lineTo(bx + bw * 0.5 + Math.cos(a) * r0 * 0.55, by + bh * 0.58 + Math.sin(a) * r0 * 0.5);
        ctx.stroke();
      }
      label(ctx, `${sci(d.gammaGas, 2)} collisions/s`, bx + bw * 0.5, by + bh + 18,
        { color: COLORS.green, size: compact ? 10 : 12, align: 'center' });
      label(ctx, `+ ${sci(d.gammaPhot, 2)} thermal photons/s`, bx + bw * 0.5, by + bh + 34,
        { color: COLORS.orange, size: compact ? 10 : 12, align: 'center' });

      // --- the log timeline: the answer, put next to things a reader knows ---
      const tx = compact ? w * 0.50 : w * 0.46;
      const tw = w - tx - (compact ? 14 : 30);
      const ty = h * 0.62;
      const LO = -44;
      const HI = 18;
      const xOf = (lg) => tx + ((Math.max(LO, Math.min(HI, lg)) - LO) / (HI - LO)) * tw;
      this.cache.draw(`tl-${key}`, (g) => g.line(tx, ty, tx + tw, ty, opts(2220, { stroke: COLORS.muted, strokeWidth: 1.8 })));
      for (let lg = LO; lg <= HI; lg += 4) {
        this.cache.draw(`tlt-${lg}-${key}`, (g) => g.line(xOf(lg), ty - 5, xOf(lg), ty + 5,
          opts(2230 + lg + 50, { stroke: COLORS.muted, strokeWidth: 0.9 })));
      }
      label(ctx, '10⁻⁴⁴ s', tx, ty + 18, { color: COLORS.muted, size: compact ? 8.5 : 10 });
      label(ctx, '10¹⁸ s', tx + tw, ty + 18, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'right' });
      label(ctx, 'one decade per tick', tx + tw / 2, ty + 18, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'center' });

      const marks = [
        [Math.log10(5.391e-44), 'Planck time', COLORS.muted, 1],
        [-18, compact ? '1 attosecond' : 'shortest interval ever measured (1 attosecond)', COLORS.yellow, -1],
        [Math.log10(d.tau), `THE CAT: ${sci(d.tau, 1)} s`, COLORS.pink, 1],
        [Math.log10(3600), "Schrödinger's hour", COLORS.cyan, -1],
        [Math.log10(2.4e9), 'a human lifetime', COLORS.green, 1],
        [Math.log10(4.35e17), 'age of the universe', COLORS.orange, -1],
      ];
      marks.forEach((m, i) => {
        const x = xOf(m[0]);
        const dir = m[3];
        const lift = 20 + (i % 3) * (compact ? 15 : 19);
        ctx.strokeStyle = m[2];
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x, ty);
        ctx.lineTo(x, ty - dir * lift);
        ctx.stroke();
        ctx.fillStyle = m[2];
        ctx.beginPath(); ctx.arc(x, ty, 3.2, 0, Math.PI * 2); ctx.fill();
        const near = x > tx + tw * 0.72;
        label(ctx, m[1], near ? x - 4 : x + 4, ty - dir * lift - (dir > 0 ? 3 : -11),
          { color: m[2], size: compact ? 9 : 11, align: near ? 'right' : 'left' });
      });

      label(ctx, `coherence survives ≈ ${sci(d.tau, 2)} s`, w / 2, compact ? 20 : 26,
        { color: COLORS.pink, size: compact ? 13 : 18, align: 'center' });
      label(ctx, compact
        ? 'computed from the collision rate, not asserted'
        : 'computed from the collision rate, not asserted — pump the air out and watch it climb',
      w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
      // kept clear of the bottom 26 px, where the on-canvas source chip is drawn
      label(ctx, compact
        ? 'an order-of-magnitude Joos–Zeh estimate'
        : 'order-of-magnitude estimate of the Joos–Zeh master equation, which is what the molecule experiments measured',
      w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });
    }

    renderLadder() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;

      // a shelf, with the real record-holders standing on it by mass
      const lo = Math.log10(LADDER[0].m);
      const hi = Math.log10(LADDER[LADDER.length - 1].m);
      const x0 = compact ? w * 0.10 : w * 0.13;
      const x1 = w - (compact ? 16 : 34);
      const shelfY = h * 0.62;
      this.cache.draw(`shelf-${key}`, (g) => g.rectangle(x0 - 10, shelfY, x1 - x0 + 20, 9, opts(2300, {
        stroke: COLORS.orange, strokeWidth: 2, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 7,
      })));
      this.cache.draw(`bracket1-${key}`, (g) => g.line(x0 + 6, shelfY + 9, x0 + 6, shelfY + 26, opts(2301, { stroke: COLORS.orange, strokeWidth: 1.6 })));
      this.cache.draw(`bracket2-${key}`, (g) => g.line(x1 - 6, shelfY + 9, x1 - 6, shelfY + 26, opts(2302, { stroke: COLORS.orange, strokeWidth: 1.6 })));

      LADDER.forEach((it, i) => {
        const f = (Math.log10(it.m) - lo) / (hi - lo);
        const x = x0 + f * (x1 - x0);
        const r = compact ? 8 + i * 1.6 : 10 + i * 2.4;
        if (i === LADDER.length - 1) {
          this.drawCat(x, shelfY - 18, compact ? 0.34 : 0.44, it.color, 2320);
        } else {
          rc.circle(x, shelfY - r - 3, r * 2, opts(2310 + i, { stroke: it.color, strokeWidth: 1.8 }));
        }
        // the mass, and what was actually done
        label(ctx, `${sci(it.m, 1)} kg`, x, shelfY + 24, { color: it.color, size: compact ? 8.5 : 10.5, align: 'center' });
        const ly = h * 0.72 + (i % 3) * (compact ? 16 : 21);
        ctx.strokeStyle = it.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, shelfY + 30); ctx.lineTo(x, ly - 9); ctx.stroke();
        ctx.globalAlpha = 1;
        const near = x > x0 + (x1 - x0) * 0.62;
        label(ctx, it.name, near ? x - 3 : x + 3, ly, { color: it.color, size: compact ? 9 : 11.5, align: near ? 'right' : 'left' });
      });

      // the axis label, and the honest statement of what the axis is NOT
      doodleArrow(rc, x0 - 10, shelfY + 42, x1, shelfY + 42, { color: COLORS.muted, seed: 2330, strokeWidth: 1.3 });
      label(ctx, 'mass  →  (each step is roughly a thousand times heavier)', (x0 + x1) / 2, shelfY + 58,
        { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'center' });

      // the real dividing line, drawn as the thing it is
      label(ctx, 'everything to the left has been put into a superposition and measured',
        w / 2, compact ? 22 : 28, { color: COLORS.green, size: compact ? 11.5 : 15, align: 'center' });
      label(ctx, 'the axis that matters is not this one — it is how well the thing is isolated',
        w / 2, compact ? 38 : 47, { color: COLORS.yellow, size: compact ? 10.5 : 13, align: 'center' });

      // the isolation axis, drawn crossing the mass axis
      const iy0 = h * 0.14;
      const ix = compact ? w * 0.06 : w * 0.075;
      doodleArrow(rc, ix, shelfY - 20, ix, iy0, { color: COLORS.cyan, seed: 2340, strokeWidth: 1.4 });
      label(ctx, 'better', ix + 5, iy0 + 6, { color: COLORS.cyan, size: compact ? 9 : 11 });
      label(ctx, 'isolation', ix + 5, iy0 + (compact ? 17 : 20), { color: COLORS.cyan, size: compact ? 9 : 11 });
      label(ctx, 'ultra-high vacuum', ix + 5, h * 0.30, { color: COLORS.muted, size: compact ? 8.5 : 10 });
      label(ctx, '+ millikelvin', ix + 5, h * 0.30 + (compact ? 12 : 14), { color: COLORS.muted, size: compact ? 8.5 : 10 });
      label(ctx, 'a warm room', ix + 5, shelfY - 34, { color: COLORS.muted, size: compact ? 8.5 : 10 });

      label(ctx, compact
        ? 'a live cat is its own environment: ~10 W of infrared'
        : 'a live cat is its own environment — about ten watts of infrared, announcing where it is, continuously',
      w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    renderMeaning() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;

      // A seminar room, because that is the honest picture of where this stands.
      // The floor sits high: three captions hang below each figure, and they have
      // to finish above the source chip at the foot of the canvas.
      const floorY = h * 0.62;
      this.cache.draw(`sfloor-${key}`, (g) => g.line(0, floorY, w, floorY, opts(2400, { stroke: COLORS.muted, strokeWidth: 1.6 })));

      // the whiteboard, with the one line everybody agrees on
      const bx = compact ? w * 0.06 : w * 0.10;
      const bw = w - 2 * bx;
      const by = h * 0.12;
      const bh = compact ? h * 0.20 : h * 0.19;
      this.cache.draw(`board-${key}`, (g) => g.rectangle(bx, by, bw, bh, opts(2401, { stroke: COLORS.ink, strokeWidth: 2 })));
      this.cache.draw(`tray-${key}`, (g) => g.line(bx + 10, by + bh + 5, bx + bw - 10, by + bh + 5, opts(2402, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      label(ctx, '|ψ⟩ = α|alive⟩ + β|dead⟩', w / 2, by + bh * 0.42, { color: COLORS.cyan, size: compact ? 15 : 21, align: 'center' });
      label(ctx, 'everyone agrees on this line, and on every number it predicts', w / 2, by + bh * 0.78,
        { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });

      // three people, disagreeing about what it means
      const positions = [
        { x: w * 0.20, color: COLORS.cyan, title: 'no collapse', body: ['both branches are real', 'and stop interacting', '(Everett 1957 — §42)'] },
        { x: w * 0.50, color: COLORS.pink, title: 'real collapse', body: ['an extra physical process', 'localises it, mass-dependently', '(GRW 1986, Penrose 1996)'] },
        { x: w * 0.80, color: COLORS.green, title: 'not a thing', body: ['|ψ⟩ is what an observer', 'should expect, so "collapse"', 'is updating a description'] },
      ];
      positions.forEach((p, i) => {
        // head-centre offset = (headR + body + limb) × scale, so the feet land on the floor
        stickFigure(rc, p.x, floorY - (compact ? 32 : 43), { scale: compact ? 0.62 : 0.82, seed: 2410 + i, color: p.color });
        label(ctx, p.title, p.x, floorY + 20, { color: p.color, size: compact ? 11 : 14, align: 'center' });
        p.body.forEach((line, k) => {
          label(ctx, line, p.x, floorY + 36 + k * (compact ? 12 : 15),
            { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });
        });
      });

      // the one that can be shot down in a lab gets marked as such
      ctx.strokeStyle = COLORS.yellow;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.4;
      ctx.strokeRect(w * 0.50 - (compact ? 68 : 92), floorY + 6, compact ? 136 : 184, compact ? 60 : 72);
      ctx.setLineDash([]);
      label(ctx, 'testable — and being tested', w * 0.50, floorY + (compact ? 74 : 88),
        { color: COLORS.yellow, size: compact ? 9.5 : 11.5, align: 'center' });

      label(ctx, 'decoherence explains why you never SEE a superposition', w / 2, compact ? 20 : 26,
        { color: COLORS.green, size: compact ? 12 : 16, align: 'center' });
      label(ctx, 'it does not, on its own, explain why one outcome happens. That part is open.',
        w / 2, compact ? 34 : 43, { color: COLORS.orange, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, compact
        ? 'here the physics stops and the argument begins'
        : 'here is where the physics stops and the argument begins — and it is an argument, not a consensus with dissenters',
      w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9 : 11.5, align: 'center' });
    }

    render() {
      ({
        box: () => this.renderBox(),
        clock: () => this.renderClock(),
        ladder: () => this.renderLadder(),
        meaning: () => this.renderMeaning(),
      })[this.mode]();
    }
  }

  function factorial(n) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  // keep the linter honest about the constants this file imports but uses only
  // inside the physics helpers above
  void HBAR;
  void CIT_EPR;
  void CIT_ZUREK;
  void CIT_FEIN;
  void CIT_FRIEDMAN;
  void CIT_BRUNE;
  void CIT_GRW;
  void CIT_PENROSE;
  void CIT_SCHLOSS;

  A.register('schrodingerCat', SchrodingerCatSim);
})();
