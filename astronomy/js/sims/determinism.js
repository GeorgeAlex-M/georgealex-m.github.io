// Sim 52 — Is anything actually undecided? The experiments that narrowed it down
//
// Section 43 asks whether the future can be PREDICTED. This one asks the harder
// question underneath: whether it is already DECIDED. Those are not the same —
// a chaotic pendulum is fully determined and completely unpredictable — and the
// difference is exactly what a century of experiments has been chipping at.
//
// The honest headline, which almost every popular account gets wrong:
//   NO EXPERIMENT HAS SHOWN THE WORLD IS RANDOM, AND NONE HAS SHOWN IT IS
//   DETERMINED. What experiments have done is kill particular WAYS of being
//   determined, one class at a time — and Bell is not the one that killed
//   determinism, because it didn't.
//
// PANEL 1 — the click on your ceiling. An ionisation smoke alarm holds about
// 1 µCi of americium-241: 0.292 µg, 7.29×10¹⁴ atoms, 37,000 α decays every
// second, mean gap 27 µs, and it has been doing that over your head for years.
// The sim draws the clicks from the real exponential waiting-time distribution.
// The point of the panel is a NEGATIVE result: "already fixed" and "not yet
// decided" predict exactly the same click pattern, so no amount of staring at
// a Geiger counter can separate them. That is why Bell had to be clever.
//
// PANEL 2 — what has actually been ruled out, and what walked away:
//   local hidden variables      Bell 1964 → Aspect 1982 → loophole-free 2015   DEAD
//   non-contextual hidden vars  Kochen–Specker 1967 → Kirchmair 2009           DEAD
//   a class of non-local realism Leggett 2003 → Gröblacher 2007                DEAD
//   ψ as mere information       Pusey–Barrett–Rudolph 2012                     CONSTRAINED
//   Bohmian mechanics (1952)    deterministic, non-local                       ALIVE
//   Everett (1957)              deterministic, unitary, no collapse            ALIVE
// Both survivors are DETERMINISTIC. That is the fact that settles the popular
// misreading: Bell rules out LOCAL determinism, not determinism.
//
// PANEL 3 — the cosmic Bell test, which is where this stops being philosophy.
// The one deterministic escape Bell cannot touch is superdeterminism: if the
// detector settings are correlated with the hidden variables, the theorem does
// not apply. You cannot refute that, but you CAN push it back in time by taking
// the settings from something that decided long ago. Handsteiner 2017 used
// Milky Way starlight (~600 years). Rauch 2018 used two quasars at z = 3.911
// and z = 0.5952 — the code computes their lookback times, 12.22 and 5.87 Gyr,
// from the Planck 2018 cosmology — and excluded local hidden-variable models
// whose settings were fixed more than 7.8 Gyr ago: 96% of the past light cone.
//
// PANEL 4 — the closest thing to a positive result. A Bell violation certifies
// randomness that no pre-existing record could have contained, with a hard
// number: an adversary who built your devices guesses an outcome with at most
//     P_guess(S) = ½ + ½·√(2 − S²/4),   certified bits = −log₂ P_guess
// which is 0 bits at the local bound S = 2 and exactly 1 bit at Tsirelson's
// S = 2√2. Aspect's 2.697 certifies 0.49 bits per trial. This is real and it is
// deployed — but it is certification RELATIVE TO ASSUMPTIONS (no signalling,
// free settings, no leaky devices), and the panel prints the assumptions on the
// certificate rather than hiding them.
//
// PANEL 5 — what would actually settle it. Objective-collapse theories (GRW
// 1986, Penrose 1996) add genuine randomness to the equations and therefore make
// DIFFERENT predictions: spontaneous heating and faint spontaneous X-rays. That
// is testable, and it is being tested a kilometre under a mountain — Donadi et
// al. 2021 ruled out the parameter-free Diósi–Penrose model. If one of these is
// ever seen, fundamental randomness stops being an interpretation and becomes a
// measurement.
//
// Hand checks reproduced by the code:
//   Am-241: λ = 5.0773e-11 /s, 1 µCi = 37,000 Bq = 7.2873e14 atoms = 0.2916 µg
//   lookback(z=3.911) = 12.218 Gyr ; lookback(z=0.5952) = 5.866 Gyr (Planck 2018)
//   P_guess(2) = 1 → 0 bits ; P_guess(2√2) = 0.5 → exactly 1 bit

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    sci, fmtNum, YEAR, PC,
  } = A;

  const AMU = 1.66053906660e-27;
  const CI = 3.7e10;              // becquerel per curie
  const AM241_HALF = 432.6 * YEAR;
  const AM241_A = 241;
  const TSIRELSON = 2 * Math.SQRT2;

  // Planck 2018 cosmology, for the quasar lookback times
  const H0_KMSMPC = 67.4;
  const OMEGA_M = 0.315;
  const OMEGA_L = 0.685;
  const AGE_GYR = 13.797;         // Planck 2018 VI, stated rather than integrated

  const CIT_BELL = '1964 Bell - On the Einstein Podolsky Rosen Paradox';
  const CIT_KS = '1967 Kochen, Specker - The Problem of Hidden Variables in Quantum Mechanics';
  const CIT_BOHM = '1952 Bohm - A Suggested Interpretation of the Quantum Theory in Terms of "Hidden" Variables. I and II';
  const CIT_EVERETT = '1957 Everett - "Relative State" Formulation of Quantum Mechanics';
  const CIT_ASPECT = '1982 Aspect, Grangier, Roger - Experimental Realization of Einstein-Podolsky-Rosen-Bohm Gedankenexperiment: A New Violation of Bell\'s Inequalities';
  const CIT_LEGGETT = '2003 Leggett - Nonlocal Hidden-Variable Theories and Quantum Mechanics: An Incompatibility Theorem';
  const CIT_GROBLACHER = '2007 Gröblacher, Paterek, Kaltenbaek, Brukner, Żukowski, Aspelmeyer, Zeilinger - An experimental test of non-local realism';
  const CIT_KIRCHMAIR = '2009 Kirchmair, Zähringer, Gerritsma, Kleinmann, Gühne, Cabello, Blatt, Roos - State-independent experimental test of quantum contextuality';
  const CIT_PIRONIO = '2010 Pironio et al. - Random numbers certified by Bell\'s theorem';
  const CIT_COLBECK = '2011 Colbeck, Renner - No extension of quantum theory can have improved predictive power';
  const CIT_PBR = '2012 Pusey, Barrett, Rudolph - On the reality of the quantum state';
  const CIT_HENSEN = '2015 Hensen et al. - Loophole-free Bell inequality violation using electron spins separated by 1.3 kilometres';
  const CIT_THOOFT = '2016 \'t Hooft - The Cellular Automaton Interpretation of Quantum Mechanics';
  const CIT_HANDSTEINER = '2017 Handsteiner et al. - Cosmic Bell Test: Measurement Settings from Milky Way Stars';
  const CIT_RAUCH = '2018 Rauch et al. - Cosmic Bell Test Using Random Measurement Settings from High-Redshift Quasars';
  const CIT_BIGBELL = '2018 BIG Bell Test Collaboration - Challenging local realism with human choices';
  const CIT_BIERHORST = '2018 Bierhorst et al. - Experimentally generated randomness certified by the impossibility of superluminal signals';
  const CIT_DONADI = '2021 Donadi, Piscicchia, Curceanu, Diósi, Laubenstein, Bassi - Underground test of gravity-related wave function collapse';
  const CIT_GRW = '1986 Ghirardi, Rimini, Weber - Unified dynamics for microscopic and macroscopic systems';
  const CIT_CONWAY = '2006 Conway, Kochen - The Free Will Theorem';

  // ------------------------------------------------------------------
  // THE MEASUREMENTS. Every row is a published experiment; every number is
  // the number that experiment reported. Rows with S = null reported their
  // result as a significance or a p-value rather than a CHSH value, and are
  // shown as such rather than being given an S they never quoted.
  // ------------------------------------------------------------------
  const RUNS = [
    {
      y: 1972, lab: 'Berkeley', who: 'Freedman & Clauser',
      rig: 'calcium cascade, single-channel polarisers',
      S: null, err: null, sigTxt: '6σ violation',
      loop: [0, 0, 0],
      note: 'The first test of Bell\'s idea, nine years after he published it. They measured the Freedman inequality rather than CHSH, so there is no S value to plot — only a six-sigma violation.',
    },
    {
      y: 1982, lab: 'Orsay', who: 'Aspect, Grangier, Roger',
      rig: 'two-channel polarisers, calcium cascade',
      S: 2.697, err: 0.015, loop: [0, 0, 0],
      note: 'The result that convinced most physicists. 2.697 ± 0.015 against a hard ceiling of 2 is a violation by forty-six standard deviations.',
    },
    {
      y: 1982, lab: 'Orsay', who: 'Aspect, Dalibard, Roger',
      rig: 'analysers switched in flight, every 10 ns',
      S: 2.404, err: 0.080, loop: [0.5, 0, 0],
      note: 'Acousto-optical switches changed the setting while the photons were already in the air, so no signal at light speed could have carried the choice to the other side. Periodic rather than random, so only a partial closure.',
    },
    {
      y: 1998, lab: 'Innsbruck', who: 'Weihs, Jennewein, Simon, Weinfurter, Zeilinger',
      rig: '400 m of fibre, fast random setting choice',
      S: 2.73, err: 0.02, loop: [1, 0, 0],
      note: 'The locality loophole closed properly: settings chosen randomly and late enough that the two stations were strictly spacelike separated. 2.73 ± 0.02 — thirty-six sigma.',
    },
    {
      y: 2001, lab: 'NIST', who: 'Rowe, Kielpinski, Meyer, Sackett, Itano, Monroe, Wineland',
      rig: 'two trapped beryllium ions, every event detected',
      S: 2.25, err: 0.03, loop: [0, 1, 0],
      note: 'The detection loophole closed for the first time: ions are read out with essentially perfect efficiency, so there is no unseen sample to hide a conspiracy in. But the ions sat micrometres apart, so locality was wide open.',
    },
    {
      y: 2015, lab: 'Delft', who: 'Hensen et al.',
      rig: 'two NV centres in diamond, 1.3 km apart, entanglement swapping',
      S: 2.42, err: 0.20, loop: [1, 1, 0],
      note: 'The first experiment to close locality AND detection at the same time — the two loopholes that, until then, had only ever been closed one at a time in different machines.',
    },
    {
      y: 2015, lab: 'Vienna & NIST', who: 'Giustina et al.; Shalm et al.',
      rig: 'photon pairs, superconducting detectors above the efficiency threshold',
      S: null, err: null, sigTxt: 'p = 3.7×10⁻³¹',
      loop: [1, 1, 0],
      note: 'Two independent photonic experiments in the same year, both loophole-free, reporting p-values rather than S. Giustina: 3.7×10⁻³¹. Shalm: 2.3×10⁻⁷.',
    },
    {
      y: 2017, lab: 'La Palma', who: 'Handsteiner et al.',
      rig: 'settings taken from the colour of Milky Way starlight',
      S: null, err: null, sigTxt: '9.3σ and 11.6σ',
      loop: [1, 1, 0.4],
      note: 'The freedom-of-choice loophole attacked for the first time with astronomy: the settings were decided by photons that left their stars about six hundred years ago.',
    },
    {
      y: 2018, lab: 'La Palma', who: 'Rauch et al.',
      rig: 'settings taken from two quasars, z = 3.911 and z = 0.5952',
      S: null, err: null, sigTxt: '>7.8 Gyr excluded',
      loop: [1, 1, 0.8],
      note: 'Same idea, pushed as far as the sky allows: any local hidden-variable model must now have had its settings fixed more than 7.8 billion years ago — 96% of the past light cone.',
    },
    {
      y: 2018, lab: '13 labs, 5 continents', who: 'BIG Bell Test Collaboration',
      rig: 'settings from about 100,000 people pressing buttons',
      S: null, err: null, sigTxt: '97 million human bits',
      loop: [1, 0.5, 0.6],
      note: 'The freedom-of-choice loophole attacked from the other end: human choices instead of starlight, on the grounds that if volunteers\' button presses correlate with entangled photons then something has gone very wrong elsewhere.',
    },
  ];

  // The three ways a local theory could still have escaped, and the honest fact
  // that the third can only ever be pushed back, never shut.
  const LOOPHOLES = [
    { key: 'locality', name: 'locality', ask: 'could a signal at light speed have carried the setting across in time?' },
    { key: 'detection', name: 'detection', ask: 'were enough particles caught that the sample cannot be cherry-picked?' },
    { key: 'freedom', name: 'freedom of choice', ask: 'were the settings independent of whatever the source knew?' },
  ];

  // The two quasars Rauch et al. used, plus a nearer anchor for comparison
  const SOURCES = [
    { key: 'lamp', name: 'a lamp in the lab', z: 0, lookbackTxt: 'nanoseconds', color: '#ffd43b' },
    { key: 'star', name: 'a Milky Way star', z: 0, lookbackTxt: '~600 years', color: '#f8f9fa', fixedGyr: 6e-7 },
    { key: 'qso2', name: 'quasar, z = 0.5952', z: 0.5952, color: '#04d9ff' },
    { key: 'qso1', name: 'quasar, z = 3.911', z: 3.911, color: '#f783ac' },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Lookback time in Gyr for the Planck 2018 cosmology. Simpson's rule on
  //     t = (1/H0) ∫₀^z dz' / [(1+z') √(Ωm(1+z')³ + ΩΛ)]
  // with the integration variable kept in z, which is well resolved for z < 20.
  function lookbackGyr(z) {
    if (z <= 0) return 0;
    const H0 = (H0_KMSMPC * 1000) / (1e6 * PC);       // s⁻¹
    const E = (zz) => Math.sqrt(OMEGA_M * (1 + zz) ** 3 + OMEGA_L);
    const f = (zz) => 1 / ((1 + zz) * E(zz));
    const n = 2000;                                    // even
    const hStep = z / n;
    let s = f(0) + f(z);
    for (let i = 1; i < n; i++) s += f(i * hStep) * (i % 2 ? 4 : 2);
    s *= hStep / 3;
    return s / H0 / (YEAR * 1e9);
  }

  // Device-independent randomness from a CHSH violation (Pironio et al. 2010).
  const guessProb = (S) => 0.5 + 0.5 * Math.sqrt(Math.max(0, 2 - (S * S) / 4));
  const certifiedBits = (S) => -Math.log2(Math.max(1e-12, guessProb(S)));
  // "1 bits per trial" is exactly the sort of detail that makes a page look
  // unproofread, and the endpoint S = 2√2 lands on it every time
  // a year is a label, not a quantity: fmtNum would render 2022 as "2,022"
  const yr = (y) => String(Math.round(y));

  const bitWord = (b, digits) => `${fmtNum(b, digits)} bit${fmtNum(b, digits) === '1' ? '' : 's'}`;

  class DeterminismSim extends Sim {
    init() {
      this.mode = 'ceiling';
      this.uCi = 1.0;               // americium in the smoke alarm
      this.year = 2022;             // the sweep through the measurement record
      this.srcIdx = 3;              // which setting-chooser the cosmic test uses
      this.S = 2.697;               // measured CHSH value in panel 4
      this.clicks = [];             // recent decay times, drawn from the real law
      this.nClicks = 0;
      this.simT = 0;
      this.nextGap = 0;
      this.rng = mulberry32(19271027);
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- the physics ---------------- */

    amNumbers() {
      const lam = Math.LN2 / AM241_HALF;
      const act = this.uCi * 1e-6 * CI;             // Bq
      const N = act / lam;
      return {
        lam,
        act,
        N,
        mass: N * AM241_A * AMU,
        gap: 1 / act,
        perYear: act * YEAR,
        goneIn10y: 1 - Math.exp(-lam * 10 * YEAR),
      };
    }

    get source() { return SOURCES[this.srcIdx]; }

    sourceLookback() {
      const s = this.source;
      if (s.fixedGyr !== undefined) return s.fixedGyr;
      return lookbackGyr(s.z);
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'the click on your ceiling', value: 'ceiling' },
        { label: 'every measurement, 1972 to now', value: 'data' },
        { label: 'which escape route each one shut', value: 'loopholes' },
        { label: 'settings from a quasar', value: 'quasar' },
        { label: 'randomness you can certify', value: 'certified' },
        { label: 'the search still running', value: 'collapse' },
      ], { initial: 'ceiling', onSelect: (v) => this.setMode(v) });

      this.amSlider = slider(c, {
        label: 'americium in the alarm',
        min: 0.1, max: 2, step: 0.01, value: this.uCi,
        format: (v) => `${fmtNum(v, 2)} µCi = ${fmtNum(v * 1e-6 * CI, 0)} decays per second`,
        oninput: (v) => { this.uCi = v; this.updateReadout(); this.poke(); },
      });

      this.yearSlider = slider(c, {
        label: 'sweep the years',
        min: 1968, max: 2022, step: 1, value: this.year,
        format: (v) => {
          const done = RUNS.filter((r) => r.y <= v).length;
          return `${yr(v)}  —  ${done} of these experiments have been performed by now`;
        },
        oninput: (v) => {
          this.year = v;
          if (v >= 1982 && !this._citedAspect) { this._citedAspect = true; this.cite(CIT_ASPECT); }
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.srcBtns = buttonRow(c, SOURCES.map((s) => ({ label: s.name, value: s.key })), {
        initial: 'qso1',
        onSelect: (v) => {
          this.srcIdx = SOURCES.findIndex((s) => s.key === v);
          if (!this._citedRauch) { this._citedRauch = true; this.cite(CIT_RAUCH); }
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.sSlider = slider(c, {
        label: 'the CHSH value your apparatus measures',
        min: 2, max: TSIRELSON, step: 0.001, value: this.S,
        format: (v) => `S = ${fmtNum(v, 3)}  →  an adversary guesses with P = ${fmtNum(guessProb(v), 4)}  →  ${bitWord(certifiedBits(v), 4)} certified per trial`,
        oninput: (v) => {
          this.S = v;
          if (!this._citedPironio) { this._citedPironio = true; this.cite(CIT_PIRONIO); }
          this.updateReadout();
          this.poke();
        },
      });

      this.resetBtn = actionButton(c, 'start the counter again', () => {
        this.clicks = []; this.nClicks = 0; this.updateReadout(); this.poke();
      });
      this.setMode('ceiling');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.amSlider, v === 'ceiling');
      show(this.yearSlider, v === 'data' || v === 'loopholes');
      show(this.srcBtns, v === 'quasar');
      show(this.sSlider, v === 'certified');
      this.resetBtn.style.display = v === 'ceiling' ? '' : 'none';
      if (v === 'ceiling') this.cite(CIT_CONWAY);
      if (v === 'data') this.cite(CIT_ASPECT);
      if (v === 'loopholes') this.cite(CIT_HENSEN);
      if (v === 'quasar') this.cite(CIT_RAUCH);
      if (v === 'certified') this.cite(CIT_PIRONIO);
      if (v === 'collapse') this.cite(CIT_DONADI);
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    update(dt) {
      this.simT += dt;
      if (this.mode !== 'ceiling') return;
      // Real exponential waiting times, slowed by a stated factor so a reader
      // can see individual clicks instead of a 37 kHz blur.
      const SLOWDOWN = 2e4;
      this.nextGap -= dt;
      let guard = 0;
      while (this.nextGap <= 0 && guard < 50) {
        const n = this.amNumbers();
        this.nextGap += (-Math.log(1 - this.rng()) / n.act) * SLOWDOWN;
        this.clicks.push({ t: 0, fx: this.rng(), fy: this.rng() });
        this.nClicks += 1;
        guard += 1;
      }
      for (const c of this.clicks) c.t += dt;
      this.clicks = this.clicks.filter((c) => c.t < 1.1);
      if (this.clicks.length > 60) this.clicks.splice(0, this.clicks.length - 60);
    }

    /* ---------------- readouts ---------------- */

    updateReadout() {
      const f = {
        ceiling: () => this.ceilingReadout(),
        data: () => this.dataReadout(),
        loopholes: () => this.loopholesReadout(),
        quasar: () => this.quasarReadout(),
        certified: () => this.certifiedReadout(),
        collapse: () => this.collapseReadout(),
      }[this.mode];
      if (f) f();
    }

    ceilingReadout() {
      const n = this.amNumbers();
      setReadout(this.readoutEl, [
        [
          ['There is a random number generator on your ceiling. ', 'yellow'],
          ['An ionisation smoke alarm holds about ', null], [`${fmtNum(this.uCi, 2)} µCi`, 'cyan'],
          [' of americium-241: ', null], [`${sci(n.mass * 1e9, 3)} µg`, 'pink'],
          [', ', null], [`${sci(n.N, 3)} atoms`, null],
          [', throwing out ', null], [`${fmtNum(n.act, 0)} alpha particles every second`, 'green'],
          [` — one every ${sci(n.gap, 2)} s, ${sci(n.perYear, 3)} a year. It has been doing that over your head since the day it was fitted, and after ten years only ${fmtNum(100 * n.goneIn10y, 2)}% of the americium has gone.`, null],
        ],
        [
          ['Now the question. ', 'yellow'],
          ['The next click will happen at some particular moment. Was that moment ', null],
          ['already fixed', 'orange'], [' — written into the state of the world since the Big Bang — or is it ', null],
          ['genuinely not yet decided', 'cyan'], ['?', null],
        ],
        [
          ['Here is why you cannot answer that by watching. ', 'red'],
          ['The clicks in the sim are drawn from the real exponential waiting-time law, and that law is ', null],
          ['memoryless', 'yellow'],
          [': a nucleus that has waited a thousand years is exactly as likely to go in the next second as a fresh one. Both stories reproduce that distribution perfectly. A deterministic world with hidden clockwork inside each nucleus and a genuinely random world predict the ', null],
          ['same pattern of clicks, forever', 'pink'],
          ['. No counter, no matter how long you run it, separates them.', null],
        ],
        [
          ['That is the whole difficulty, and it is why the answer had to come from somewhere unexpected. ', 'yellow'],
          ['You cannot catch determinism by staring harder at one random-looking process. You have to find a case where "the answers existed in advance" implies something ', null],
          ['arithmetically different', 'green'],
          [' from what quantum mechanics predicts. That is what Bell found in 1964, and it is the next panel.', null],
        ],
        [
          ['clicks so far: ', null], [`${fmtNum(this.nClicks, 0)}`, 'cyan'],
          [' (drawn at 1/20,000 of real speed — at full rate this canvas would show a solid blur).', null],
        ],
      ]);
    }

    dataReadout() {
      const done = RUNS.filter((r) => r.y <= this.year);
      const withS = done.filter((r) => r.S !== null);
      const best = withS.slice().sort((a, b) => (b.S - 2) / b.err - (a.S - 2) / a.err)[0];
      setReadout(this.readoutEl, [
        [
          ['by ', null], [yr(this.year), 'yellow'],
          [': ', null], [`${fmtNum(done.length, 0)} experiments performed`, 'green'],
          [', ', null], [`${fmtNum(withS.length, 0)} of them quoting a CHSH value`, 'cyan'],
          best ? [`. Sharpest so far: ${best.who}, ${best.lab} ${best.y} — S = ${fmtNum(best.S, 3)} ± ${fmtNum(best.err, 3)}, which is ${fmtNum((best.S - 2) / best.err, 1)} standard deviations past the local limit.`, null] : ['', null],
        ],
        [
          ['This is the measurement, not the model. ', 'yellow'],
          ['Every point on the plot is a number a laboratory published, with the error bar that laboratory quoted. The red line at S = 2 is not a fit or a convention — it is the hard ceiling that any theory in which the answers already existed, locally, is obliged to stay under. The data has been above it since 1972 and has never come back down.', null],
        ],
        [
          ['The two headline numbers. ', 'yellow'],
          ['Aspect, Grangier and Roger measured ', null], ['2.697 ± 0.015', 'green'],
          [' at Orsay in 1982 — forty-six sigma. Weihs and colleagues at Innsbruck measured ', null],
          ['2.73 ± 0.02', 'green'],
          [' in 1998 under strict Einstein locality, thirty-six sigma. For comparison, particle physics calls five sigma a discovery.', null],
        ],
        [
          ['Notice what the plot does NOT do: it does not climb. ', 'orange'],
          ['Fifty years of better sources and better detectors have not pushed the violation higher, because there is a second ceiling at 2√2 = 2.828 — Tsirelson\'s bound — and quantum mechanics is not allowed past it either. Nature sits between the two limits and stays there. The green dashed line is as real a constraint as the red one.', null],
        ],
        [
          ['Two rows on the chart report no S at all, and that is deliberate. ', 'cyan'],
          ['Freedman and Clauser measured a different inequality in 1972; Giustina and Shalm reported p-values in 2015. They are shown with the result they actually published rather than being assigned a CHSH value they never quoted.', null],
        ],
      ]);
    }

    loopholesReadout() {
      const done = RUNS.filter((r) => r.y <= this.year);
      const shut = LOOPHOLES.map((L, i) => done.filter((r) => r.loop[i] >= 1).length);
      const both = done.filter((r) => r.loop[0] >= 1 && r.loop[1] >= 1);
      setReadout(this.readoutEl, [
        [
          ['by ', null], [yr(this.year), 'yellow'], [':  locality shut by ', null],
          [`${fmtNum(shut[0], 0)}`, 'green'], [' experiments  ·  detection shut by ', null],
          [`${fmtNum(shut[1], 0)}`, 'green'], ['  ·  both at once by ', null],
          [`${fmtNum(both.length, 0)}`, both.length ? 'green' : 'red'], ['.', null],
        ],
        [
          ['A violated inequality is not enough on its own, and physicists spent forty years saying so. ', 'yellow'],
          ['There were three concrete ways a local theory could still have produced the data by cheating, and each one had to be shut by building a different machine. This grid is the record of that, and the honest thing it shows is how long the middle column stayed empty.', null],
        ],
        [
          ['LOCALITY: ', 'cyan'],
          ['could a signal at light speed have carried one setting to the other station in time? Aspect switched the analysers in flight in 1982; Weihs made the choice random and put the stations 400 m apart in 1998, which shut it properly.', null],
        ],
        [
          ['DETECTION: ', 'cyan'],
          ['if you only catch a few percent of the pairs, the ones you miss could be exactly the ones that would have spoiled the result. Rowe and colleagues shut this in 2001 with two trapped beryllium ions, read out with essentially perfect efficiency — but their ions were micrometres apart, so they had thrown locality away to get it.', null],
        ],
        [
          ['That is the point of 2015. ', 'yellow'],
          ['Until then every experiment had closed one loophole while leaving another open, and a determined sceptic could always say the two results came from different machines. Hensen and colleagues at Delft closed both in a single run, with NV centres in diamond 1.3 km apart; Giustina in Vienna and Shalm at NIST did it independently with photons the same year. Three groups, three technologies, one year.', null],
        ],
        [
          ['FREEDOM OF CHOICE cannot be closed, only pushed — and the column is drawn part-filled to say so. ', 'orange'],
          ['If the setting choices were themselves correlated with the source, no experiment can ever detect it. So instead of closing it, they moved it: starlight in 2017 puts any common cause at least six hundred years back, quasars in 2018 put it more than 7.8 billion years back, and 100,000 human volunteers in 2018 put it inside people\'s heads. That is the boundary of what measurement can do here, and the grid shows exactly where it is.', null],
        ],
      ]);
    }

    collapseReadout() {
      setReadout(this.readoutEl, [
        [
          ['One experiment could still find real randomness, and it is running now. ', 'yellow'],
          ['Everything else on this page tests what is ', null], ['not', 'orange'],
          [' the case. This one could return a positive.', null],
        ],
        [
          ['Why it is a measurement and not an interpretation. ', 'yellow'],
          ['Objective-collapse theories — Ghirardi, Rimini and Weber in 1986, Penrose in 1996 — do not reinterpret quantum mechanics. They ', null], ['change its equations', 'green'],
          [', adding a real physical collapse whose rate grows with mass. Changed equations mean changed predictions, and this one is unmissable if you look in the right place: a charged particle that is spontaneously localised must ', null],
          ['radiate', 'pink'],
          ['. Ordinary matter, sitting still, doing nothing, should emit a faint drizzle of X-rays that standard quantum mechanics flatly forbids.', null],
        ],
        [
          ['So you go and look for the drizzle. ', 'yellow'],
          ['A germanium detector, inside shields of lead and ancient low-radioactivity copper, 1,400 metres under the Gran Sasso massif so that the rock absorbs the cosmic rays that would swamp the signal. Then you count photons for months and compare the rate with the known radioactive background of the apparatus itself.', null],
        ],
        [
          ['The 2021 result: no excess. ', 'red'],
          ['Donadi, Piscicchia, Curceanu, Diósi, Laubenstein and Bassi found the count rate consistent with the background — and that null result kills the parameter-free version of the Diósi–Penrose model, the one where gravity causes collapse with no adjustable knob. The model survives only by pushing its single length scale above about 0.5×10⁻¹⁰ m, an atom\'s width, when the natural choice was the size of a nucleus.', null],
        ],
        [
          ['This is what "grounded in objective reality" looks like on this question. ', 'yellow'],
          ['A theory that says the world is genuinely random made a numerical prediction; a detector under a mountain went and checked; the prediction failed and the theory lost ground. Nothing here depends on anyone\'s taste in interpretations. If a future run ever DOES see that glow, fundamental randomness stops being a postulate and becomes an observation — and the same detector would have settled the question this whole section is about.', null],
        ],
        [
          ['Where that leaves things, stated plainly. ', 'orange'],
          ['The experiments have shown that the answers were not sitting in the particles locally — that is measured, repeatedly, to tens of sigma, with every loophole closed. What they have NOT done is show that the world is random, because non-local determinism makes exactly the same predictions and no experiment yet distinguishes it. That gap is not a failure of the experiments; it is a precise statement of where measurement currently stops.', null],
        ],
      ]);
    }

    quasarReadout() {
      const s = this.source;
      const lb = this.sourceLookback();
      setReadout(this.readoutEl, [
        [
          ['setting chosen by ', null], [s.name, 'yellow'],
          [s.z > 0 ? `  ·  redshift z = ${fmtNum(s.z, 4)}` : '', 'cyan'],
          ['  ·  that light left ', null],
          [s.lookbackTxt || `${fmtNum(lb, 3)} billion years ago`, 'pink'],
          [s.z > 0 ? `  (computed from Planck 2018: H₀ = 67.4, Ω_m = 0.315, Ω_Λ = 0.685)` : '', null],
        ],
        [
          ['There is one deterministic escape route Bell cannot close, and it is worth stating fairly. ', 'yellow'],
          ['Bell\'s theorem assumes the experimenters\' setting choices are independent of whatever the particles carry. Deny that — let the settings and the hidden variables share a common cause — and the theorem simply does not apply. This is ', null],
          ['superdeterminism', 'orange'],
          ['. It is not a trick or a joke; \'t Hooft has pursued it seriously. It cannot be refuted, because any correlation you find could always have been arranged.', null],
        ],
        [
          ['What you CAN do is make the conspiracy expensive. ', 'yellow'],
          ['Choose the settings using something that made up its mind a very long time ago and a very long way away. Handsteiner and colleagues used the colour of light from Milky Way stars in 2017 — that pushes any common cause back six centuries. Then in 2018 Rauch and colleagues pointed two telescopes at two quasars, at z = 3.911 and z = 0.5952, whose light had been travelling for ', null],
          [`${fmtNum(lookbackGyr(3.911), 2)} and ${fmtNum(lookbackGyr(0.5952), 2)} billion years`, 'cyan'],
          ['.', null],
        ],
        [
          ['The result is one of my favourite numbers in physics. ', 'yellow'],
          ['Any local hidden-variable model must now have had its settings fixed more than ', null],
          ['7.8 billion years ago', 'green'],
          [' — which excludes 96% of the space-time volume of the experiment\'s past light cone, all the way back to the Big Bang. The escape hatch is still open. It is just that whoever arranged the conspiracy had to do it before the Earth existed.', null],
        ],
        [
          ['A nice companion experiment: in 2018 the BIG Bell Test used ', null],
          ['about 100,000 human volunteers', 'pink'],
          [' pressing buttons to generate the settings, on the grounds that if people\'s choices are correlated with entangled photons then something has gone very wrong somewhere else. It violated the inequality too.', null],
        ],
      ]);
    }

    certifiedReadout() {
      const pg = guessProb(this.S);
      const bits = certifiedBits(this.S);
      setReadout(this.readoutEl, [
        [
          ['S = ', null], [`${fmtNum(this.S, 3)}`, 'yellow'],
          ['   →   best possible guess P = ½ + ½√(2 − S²/4) = ', null], [`${fmtNum(pg, 4)}`, 'orange'],
          ['   →   certified randomness = −log₂P = ', null], [`${bitWord(bits, 4)} per trial`, 'green'],
        ],
        [
          ['This is the closest thing there is to a positive result, and the logic is lovely. ', 'yellow'],
          ['Suppose an adversary built your two detectors, and hid a complete script inside them. If the outcomes were on that script, the CHSH value could not exceed 2. So the further past 2 you measure, the less of the outcome could possibly have been scripted — and that is not a hand-wave, it is the exact bound in the first line. At S = 2 the adversary guesses with certainty and you have earned ', null],
          ['zero bits', 'red'],
          ['. At Tsirelson\'s S = 2√2 the best guess is a coin flip and you have earned ', null],
          ['exactly one bit', 'green'], [' of randomness that no pre-existing record contained.', null],
        ],
        [
          ['And it is real engineering, not a thought experiment. ', 'yellow'],
          ['Pironio and colleagues extracted 42 certified random bits this way in 2010; Bierhorst and colleagues got 1,024 in 2018, certified purely by the impossibility of superluminal signalling. NIST now runs a public randomness beacon on this principle. Aspect\'s 1982 value of 2.697 would certify ', null],
          [`${bitWord(certifiedBits(2.697), 3)} per trial`, 'cyan'],
          ['; the 2015 loophole-free value of 2.42 would certify ', null],
          [`${fmtNum(certifiedBits(2.42), 3)}`, 'cyan'], ['.', null],
        ],
        [
          ['NOW READ THE SMALL PRINT, because it is the whole point. ', 'red'],
          ['That certificate is conditional, and the sim prints its conditions on the canvas rather than hiding them: no signalling between the stations, settings genuinely independent of the source, and devices that do not leak their results. Drop any one of them and the bound evaporates. This is randomness certified ', null],
          ['relative to assumptions', 'orange'],
          [' — which is the only kind any experiment can ever deliver. There is no measurement that proves the world is random full stop, and there never can be, because superdeterminism is always waiting underneath.', null],
        ],
        [
          ['One genuinely striking theorem to go with it: ', 'yellow'],
          ['Colbeck and Renner showed in 2011 that IF setting choices are free, then no theory whatsoever — known or unknown, now or in a thousand years — can predict quantum measurement outcomes better than quantum mechanics already does. The randomness is not a gap in our knowledge waiting to be filled. Given free choice, it is the end of the road.', null],
        ],
      ]);
    }

    /* ================= drawing ================= */

    // ---- 1: the hallway, the alarm, and the clicks ----
    renderCeiling() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const ceilY = h * 0.13;
      const floorY = h * 0.86;

      this.cache.draw(`ceil-${key}`, (g) => g.line(0, ceilY, w, ceilY, opts(5001, { stroke: COLORS.muted, strokeWidth: 1.8 })));
      this.cache.draw(`flr-${key}`, (g) => g.line(0, floorY, w, floorY, opts(5002, { stroke: COLORS.muted, strokeWidth: 1.8 })));
      this.cache.draw(`skirt-${key}`, (g) => g.line(0, floorY - 8, w, floorY - 8, opts(5003, { stroke: COLORS.muted, strokeWidth: 1 })));
      // a doorway on the left and a coat hook, so it reads as a landing
      this.cache.draw(`door-${key}`, (g) => g.rectangle(w * 0.03, floorY - (compact ? 150 : 196), compact ? 70 : 92, compact ? 150 : 196,
        opts(5004, { stroke: COLORS.orange, strokeWidth: 1.8 })));
      ctx.fillStyle = COLORS.yellow;
      ctx.beginPath(); ctx.arc(w * 0.03 + (compact ? 60 : 80), floorY - (compact ? 75 : 98), 3, 0, Math.PI * 2); ctx.fill();
      this.cache.draw(`hook-${key}`, (g) => g.path(
        `M ${w * 0.16} ${h * 0.34} l 0 10 M ${w * 0.16} ${h * 0.34} l 16 0`, opts(5005, { stroke: COLORS.muted, strokeWidth: 1.4 }),
      ));
      this.cache.draw(`coat-${key}`, (g) => g.path(
        `M ${w * 0.163} ${h * 0.36} q -14 26 -8 54 l 26 0 q 6 -28 -8 -54 Z`,
        opts(5006, { stroke: COLORS.green, strokeWidth: 1.5, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 7 }),
      ));

      // --- the smoke alarm on the ceiling ---
      const ax = w * 0.44;
      const ay = ceilY + (compact ? 13 : 16);
      const ar = compact ? 26 : 34;
      this.cache.draw(`alarm-${key}`, (g) => g.circle(ax, ay, ar * 2, opts(5010, { stroke: COLORS.ink, strokeWidth: 2.2 })));
      this.cache.draw(`alarm2-${key}`, (g) => g.circle(ax, ay, ar * 1.15, opts(5011, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      this.cache.draw(`alarmbtn-${key}`, (g) => g.circle(ax, ay, ar * 0.42, opts(5012, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      ctx.fillStyle = COLORS.red;
      ctx.beginPath(); ctx.arc(ax + ar * 0.62, ay + ar * 0.30, 2.6, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'smoke alarm', ax, ay + ar + (compact ? 13 : 16), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'center' });

      // the decays, falling out of it at real exponential intervals
      ctx.fillStyle = COLORS.green;
      for (const c of this.clicks) {
        const p = Math.min(1, c.t / 1.1);
        ctx.globalAlpha = Math.max(0, 1 - p);
        const px = ax + (c.fx - 0.5) * (compact ? 60 : 84);
        const py = ay + ar * 0.7 + p * (h * 0.30);
        ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // the magnifier on the americium
      const n = this.amNumbers();
      const mx = compact ? w * 0.78 : w * 0.76;
      const my = h * 0.30;
      const mr = compact ? 44 : 58;
      rc.circle(mx, my, mr * 2, opts(5020, { stroke: COLORS.cyan, strokeWidth: 1.8 }));
      rc.line(mx - mr * 0.72, my + mr * 0.72, ax + ar * 0.7, ay + ar * 0.7, opts(5021, { stroke: COLORS.cyan, strokeWidth: 1.4 }));
      label(ctx, 'americium-241', mx, my - (compact ? 20 : 26), { color: COLORS.cyan, size: compact ? 10 : 12, align: 'center' });
      label(ctx, `${sci(n.mass * 1e9, 2)} µg`, mx, my - (compact ? 6 : 8), { color: COLORS.pink, size: compact ? 11 : 13.5, align: 'center' });
      label(ctx, `${fmtNum(n.act, 0)} decays/s`, mx, my + (compact ? 9 : 11), { color: COLORS.green, size: compact ? 10 : 12, align: 'center' });
      label(ctx, `one every ${sci(n.gap, 1)} s`, mx, my + (compact ? 23 : 28), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      // the reader, standing under it, and the two rival stories
      stickFigure(rc, w * 0.44, floorY - (compact ? 41 : 51), { scale: compact ? 0.8 : 1.0, seed: 5030, color: COLORS.ink });
      const sy = h * 0.60;
      const boxW = compact ? w * 0.30 : w * 0.28;
      const bx1 = w * 0.03;
      const bx2 = w - boxW - w * 0.03;
      this.cache.draw(`sign1-${key}`, (g) => g.rectangle(bx1, sy, boxW, compact ? 40 : 48, opts(5040, { stroke: COLORS.orange, strokeWidth: 1.6 })));
      this.cache.draw(`sign2-${key}`, (g) => g.rectangle(bx2, sy, boxW, compact ? 40 : 48, opts(5041, { stroke: COLORS.cyan, strokeWidth: 1.6 })));
      label(ctx, 'already fixed', bx1 + boxW / 2, sy + (compact ? 17 : 20), { color: COLORS.orange, size: compact ? 10.5 : 13, align: 'center' });
      label(ctx, 'since the Big Bang', bx1 + boxW / 2, sy + (compact ? 31 : 37), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });
      label(ctx, 'not yet decided', bx2 + boxW / 2, sy + (compact ? 17 : 20), { color: COLORS.cyan, size: compact ? 10.5 : 13, align: 'center' });
      label(ctx, 'genuinely open', bx2 + boxW / 2, sy + (compact ? 31 : 37), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      label(ctx, `${fmtNum(this.nClicks, 0)} clicks — and not one of them can tell you which sign is right`,
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 11.5 : 16, align: 'center' });
      label(ctx, compact ? 'both stories predict this exact pattern' : 'both stories predict exactly this pattern of clicks, forever — which is why the answer had to come from somewhere else',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      label(ctx, compact ? 'drawn at 1/20,000 speed' : 'clicks drawn from the real exponential waiting-time law, at 1/20,000 of true speed',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });
    }

    // ---- 2: every published Bell measurement, with its error bar ----
    renderData() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const gx = compact ? w * 0.13 : w * 0.10;
      const gw = w - gx - (compact ? w * 0.05 : w * 0.06);
      const gy = h * 0.17;
      const gh = h * 0.56;
      const Y0 = 1.98;
      const Y1 = 2.90;
      const xOf = (yr) => gx + ((yr - 1968) / 54) * gw;
      const yOf = (S) => gy + gh - ((S - Y0) / (Y1 - Y0)) * gh;

      // axes
      this.cache.draw(`ax-${key}`, (g) => g.line(gx, gy, gx, gy + gh, opts(5100, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      this.cache.draw(`ay-${key}`, (g) => g.line(gx, gy + gh, gx + gw, gy + gh, opts(5101, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      for (let S = 2.0; S <= 2.9; S += 0.2) {
        this.cache.draw(`yt-${Math.round(S * 10)}-${key}`, (g) => g.line(gx - 4, yOf(S), gx + 4, yOf(S),
          opts(5110 + Math.round(S * 10), { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, fmtNum(S, 1), gx - 7, yOf(S) + 4, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'right' });
      }
      for (let yr = 1970; yr <= 2020; yr += 10) {
        this.cache.draw(`xt-${yr}-${key}`, (g) => g.line(xOf(yr), gy + gh - 4, xOf(yr), gy + gh + 4,
          opts(5130 + (yr % 97), { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, String(yr), xOf(yr), gy + gh + 16, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'center' });
      }
      label(ctx, 'S', gx - (compact ? 24 : 30), gy + gh / 2, { color: COLORS.muted, size: compact ? 10 : 12 });

      // the two ceilings: the one local theories may not pass, and the one
      // quantum mechanics may not pass either
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(gx, yOf(2)); ctx.lineTo(gx + gw, yOf(2)); ctx.stroke();
      label(ctx, compact ? 'S = 2 — local limit' : 'S = 2 — no theory with local pre-existing answers may pass this line',
        gx + 6, yOf(2) + (compact ? 13 : 15), { color: COLORS.red, size: compact ? 9 : 11.5 });
      ctx.strokeStyle = COLORS.green;
      ctx.setLineDash([7, 5]);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(gx, yOf(2 * Math.SQRT2)); ctx.lineTo(gx + gw, yOf(2 * Math.SQRT2)); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, compact ? '2√2 — quantum ceiling' : '2√2 = 2.828 — and quantum mechanics may not pass THIS one (Tsirelson)',
        gx + 6, yOf(2 * Math.SQRT2) - 6, { color: COLORS.green, size: compact ? 9 : 11.5 });

      // the measurements
      const shown = RUNS.filter((r) => r.y <= this.year);
      shown.filter((r) => r.S !== null).forEach((r, i) => {
        const x = xOf(r.y) + (r.y === 1982 ? (r.S > 2.6 ? -6 : 6) : 0);   // the two Orsay runs share a year
        const y = yOf(r.S);
        const e = (r.err / (Y1 - Y0)) * gh;
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y - e); ctx.lineTo(x, y + e); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 5, y - e); ctx.lineTo(x + 5, y - e);
        ctx.moveTo(x - 5, y + e); ctx.lineTo(x + 5, y + e); ctx.stroke();
        ctx.fillStyle = COLORS.cyan;
        ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
        label(ctx, `${fmtNum(r.S, 3)}`, x + 8, y - 4, { color: COLORS.cyan, size: compact ? 8.5 : 10.5 });
        label(ctx, r.lab, x + 8, y + (compact ? 7 : 8), { color: COLORS.muted, size: compact ? 8 : 9.5 });
        void i;
      });

      // the runs that published a significance rather than an S, marked on the
      // year axis so they are present without being given a number they never quoted
      const noS = shown.filter((r) => r.S === null);
      noS.forEach((r, i) => {
        const x = xOf(r.y);
        ctx.strokeStyle = COLORS.orange;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, gy + gh); ctx.lineTo(x, gy + gh + 26 + (i % 2) * 13); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = COLORS.orange;
        ctx.beginPath(); ctx.arc(x, gy + gh, 3, 0, Math.PI * 2); ctx.fill();
        const near = x > gx + gw * 0.7;
        label(ctx, r.sigTxt, near ? x - 4 : x + 4, gy + gh + 30 + (i % 2) * 13,
          { color: COLORS.orange, size: compact ? 8 : 9.5, align: near ? 'right' : 'left' });
      });
      label(ctx, compact ? 'reported as significance, not S' : 'these runs published a significance or a p-value rather than a CHSH value',
        gx + gw, gy + gh + (compact ? 58 : 62), { color: COLORS.muted, size: compact ? 8 : 9.5, align: 'right' });

      label(ctx, compact
        ? `${fmtNum(shown.length, 0)} experiments by ${yr(this.year)}`
        : `${fmtNum(shown.length, 0)} experiments performed by ${yr(this.year)} — every point a published measurement, with its own error bar`,
      w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10 : 14.5, align: 'center' });
      label(ctx, compact ? 'above the red line since 1972, never back below' : 'the data has been above the red line since 1972 and has never come back down',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
    }

    // ---- 3: which apparatus shut which escape route ----
    renderLoopholes() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const shown = RUNS.filter((r) => r.y <= this.year);
      const labW = compact ? w * 0.40 : w * 0.44;
      const x0 = compact ? w * 0.02 : w * 0.04;
      const colW = (w - x0 - labW - (compact ? 10 : 24)) / 3;
      const y0 = h * 0.26;
      const rowH = Math.min(compact ? 20 : 24, (h * 0.60) / Math.max(1, RUNS.length));

      // column headers
      LOOPHOLES.forEach((L, c) => {
        const cx = x0 + labW + c * colW + colW / 2;
        label(ctx, L.name, cx, y0 - (compact ? 16 : 20), { color: COLORS.cyan, size: compact ? 9 : 11.5, align: 'center' });
        this.cache.draw(`colline-${c}-${key}`, (g) => g.line(cx, y0 - (compact ? 10 : 13), cx, y0 + rowH * RUNS.length + 4,
          opts(5200 + c, { stroke: COLORS.muted, strokeWidth: 0.9, strokeLineDash: [3, 5] })));
      });

      shown.forEach((r, i) => {
        const ry = y0 + i * rowH;
        label(ctx, `${r.y}  ${r.lab}`, x0 + 4, ry + rowH * 0.7, { color: COLORS.ink, size: compact ? 8.5 : 10.5 });
        if (!compact) label(ctx, r.rig, x0 + labW - 8, ry + rowH * 0.7, { color: COLORS.muted, size: 9, align: 'right' });
        LOOPHOLES.forEach((L, c) => {
          const cx = x0 + labW + c * colW + colW / 2;
          const v = r.loop[c];
          const cy = ry + rowH * 0.55;
          if (v >= 1) {
            // shut: a tick
            ctx.strokeStyle = COLORS.green;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy); ctx.lineTo(cx - 1, cy + 4); ctx.lineTo(cx + 6, cy - 5);
            ctx.stroke();
          } else if (v > 0) {
            // pushed back but not shut: a part-filled bar, because that is the truth
            ctx.strokeStyle = COLORS.orange;
            ctx.lineWidth = 1.2;
            ctx.strokeRect(cx - 9, cy - 3.5, 18, 7);
            ctx.fillStyle = COLORS.orange;
            ctx.globalAlpha = 0.55;
            ctx.fillRect(cx - 8, cy - 2.5, 16 * v, 5);
            ctx.globalAlpha = 1;
          } else {
            ctx.strokeStyle = COLORS.muted;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
            ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });
        // the row where both of the closable loopholes finally shut together
        if (r.loop[0] >= 1 && r.loop[1] >= 1 && r.y === 2015 && r.lab === 'Delft') {
          ctx.strokeStyle = COLORS.green;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x0, ry, w - x0 - (compact ? 6 : 14), rowH);
          ctx.globalAlpha = 1;
        }
      });

      label(ctx, 'a violated inequality was never enough on its own', w / 2, compact ? 20 : 26,
        { color: COLORS.yellow, size: compact ? 11 : 15, align: 'center' });
      label(ctx, compact ? 'three ways to cheat, three machines to shut them' : 'three concrete ways a local theory could still have faked the data — and the different machine each one needed',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      label(ctx, compact ? 'freedom of choice: pushed, never shut' : 'the third column is drawn part-filled because freedom of choice can only ever be pushed back in time, never closed',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.orange, size: compact ? 9 : 11.5, align: 'center' });
      void rc;
    }

    // ---- 3: the mountain-top observatory and two quasars ----
    renderQuasar() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const ridgeY = h * 0.62;

      // night sky
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 0.6180339887) % 1) * w;
        const sy = ((i * 0.7548776662) % 1) * ridgeY * 0.92;
        ctx.fillStyle = COLORS.muted;
        ctx.globalAlpha = 0.35 + ((i * 7) % 5) * 0.1;
        ctx.beginPath(); ctx.arc(sx, sy, ((i * 3) % 3) * 0.5 + 0.7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // the mountain ridge
      this.cache.draw(`ridge-${key}`, (g) => g.path(
        `M 0 ${h} L 0 ${ridgeY + 40} Q ${w * 0.18} ${ridgeY - 26} ${w * 0.36} ${ridgeY} T ${w * 0.72} ${ridgeY - 8} T ${w} ${ridgeY + 22} L ${w} ${h} Z`,
        opts(5200, { stroke: COLORS.muted, strokeWidth: 1.8, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 12 }),
      ));

      // two observatory domes on the ridge, and the source hut between them
      const domes = [[w * 0.22, ridgeY - 4], [w * 0.78, ridgeY - 2]];
      domes.forEach((d, i) => {
        const dr = compact ? 22 : 30;
        this.cache.draw(`dome-${i}-${key}`, (g) => g.path(
          `M ${d[0] - dr} ${d[1]} a ${dr} ${dr} 0 0 1 ${dr * 2} 0 Z`,
          opts(5210 + i, { stroke: COLORS.ink, strokeWidth: 2, fill: COLORS.ink, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 7 }),
        ));
        this.cache.draw(`slit-${i}-${key}`, (g) => g.line(d[0] + (i ? 6 : -6), d[1] - dr * 0.92, d[0] + (i ? 10 : -10), d[1],
          opts(5220 + i, { stroke: COLORS.yellow, strokeWidth: 2 })));
      });
      const hx = w * 0.5;
      const hy = ridgeY + 6;
      this.cache.draw(`hut-${key}`, (g) => g.rectangle(hx - (compact ? 26 : 34), hy - (compact ? 20 : 26), compact ? 52 : 68, compact ? 20 : 26,
        opts(5230, { stroke: COLORS.pink, strokeWidth: 1.8 })));
      label(ctx, compact ? 'source' : 'entangled pair source', hx, hy + (compact ? 13 : 16), { color: COLORS.pink, size: compact ? 9 : 11, align: 'center' });

      // the two quasars, up in the corners, with the sight lines
      const s = this.source;
      const qs = [
        { x: w * 0.13, y: h * 0.13, z: 3.911, c: '#f783ac' },
        { x: w * 0.87, y: h * 0.17, z: 0.5952, c: '#04d9ff' },
      ];
      qs.forEach((q, i) => {
        const on = s.z === q.z || s.key === 'star' || s.key === 'lamp';
        ctx.globalAlpha = on ? 1 : 0.32;
        ctx.fillStyle = q.c;
        ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + 0.4;
          ctx.strokeStyle = q.c; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(q.x + Math.cos(a) * 8, q.y + Math.sin(a) * 8);
          ctx.lineTo(q.x + Math.cos(a) * 16, q.y + Math.sin(a) * 16);
          ctx.stroke();
        }
        label(ctx, `z = ${fmtNum(q.z, 4)}`, q.x, q.y + 30, { color: q.c, size: compact ? 9 : 11, align: 'center' });
        label(ctx, `${fmtNum(lookbackGyr(q.z), 2)} Gyr ago`, q.x, q.y + (compact ? 42 : 44), { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });
        // the sight line down to its dome
        ctx.strokeStyle = q.c;
        ctx.globalAlpha = on ? 0.6 : 0.15;
        ctx.setLineDash([5, 6]);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(q.x, q.y + 18); ctx.lineTo(domes[i][0], domes[i][1] - (compact ? 20 : 28)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      });

      // the cosmic-time bar: how much of the past light cone is excluded
      const bx = compact ? w * 0.06 : w * 0.10;
      const bw = w - 2 * bx;
      const by = h * 0.86;
      const bh = compact ? 15 : 19;
      this.cache.draw(`cbar-${key}`, (g) => g.rectangle(bx, by, bw, bh, opts(5240, { stroke: COLORS.muted, strokeWidth: 1.5 })));
      const excl = Math.min(1, 7.8 / AGE_GYR);
      ctx.fillStyle = COLORS.red;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(bx + 1, by + 1, (bw - 2) * excl, bh - 2);
      ctx.globalAlpha = 1;
      label(ctx, 'Big Bang', bx, by - 6, { color: COLORS.muted, size: compact ? 8.5 : 10 });
      label(ctx, 'today', bx + bw, by - 6, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'right' });
      label(ctx, compact ? 'excluded: settings fixed >7.8 Gyr ago' : 'excluded by Rauch 2018 — any conspiracy must have been arranged more than 7.8 billion years ago',
        bx + (bw * excl) / 2, by + bh + (compact ? 12 : 14), { color: COLORS.red, size: compact ? 9 : 11, align: 'center' });

      const leftTxt = s.lookbackTxt || `${fmtNum(this.sourceLookback(), 2)} billion years ago`;
      label(ctx, compact
        ? `${s.name} — light from ${leftTxt}`
        : `settings chosen by ${s.name} — light that left ${leftTxt}`,
      w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 11 : 15, align: 'center' });
      label(ctx, compact ? 'the last deterministic escape, pushed back in time' : 'superdeterminism cannot be refuted — but it can be made to have happened before the Earth existed',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
    }

    // ---- 4: the certified-randomness bench, with its assumptions on show ----
    renderCertified() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const benchY = h * 0.46;

      // the bench, the source, two separated stations with a wall between
      this.cache.draw(`bench-${key}`, (g) => g.line(w * 0.04, benchY, w * 0.96, benchY, opts(5300, { stroke: COLORS.orange, strokeWidth: 2.4 })));
      const sx = w * 0.5;
      this.cache.draw(`src-${key}`, (g) => g.rectangle(sx - (compact ? 24 : 32), benchY - (compact ? 26 : 34), compact ? 48 : 64, compact ? 26 : 34,
        opts(5301, { stroke: COLORS.pink, strokeWidth: 1.8 })));
      label(ctx, 'source', sx, benchY - (compact ? 32 : 40), { color: COLORS.pink, size: compact ? 9 : 11, align: 'center' });
      [[w * 0.14, COLORS.cyan, 'station A'], [w * 0.86, COLORS.green, 'station B']].forEach((st, i) => {
        this.cache.draw(`st-${i}-${key}`, (g) => g.rectangle(st[0] - (compact ? 24 : 30), benchY - (compact ? 30 : 38), compact ? 48 : 60, compact ? 30 : 38,
          opts(5310 + i, { stroke: st[1], strokeWidth: 1.8 })));
        label(ctx, st[2], st[0], benchY + (compact ? 14 : 17), { color: st[1], size: compact ? 9 : 11, align: 'center' });
        ctx.strokeStyle = COLORS.muted;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx + (i ? 1 : -1) * (compact ? 24 : 32), benchY - (compact ? 13 : 17));
        ctx.lineTo(st[0] - (i ? 1 : -1) * (compact ? 24 : 30), benchY - (compact ? 15 : 19));
        ctx.stroke();
      });
      // the shielding wall that makes "no signalling" enforceable
      this.cache.draw(`wall1-${key}`, (g) => g.line(w * 0.28, h * 0.16, w * 0.28, benchY + 8, opts(5320, { stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [6, 6] })));
      this.cache.draw(`wall2-${key}`, (g) => g.line(w * 0.72, h * 0.16, w * 0.72, benchY + 8, opts(5321, { stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [6, 6] })));

      // the bit tape coming out
      const bits = certifiedBits(this.S);
      const tapeY = h * 0.60;
      this.cache.draw(`tape-${key}`, (g) => g.rectangle(w * 0.06, tapeY, w * 0.44, compact ? 24 : 30, opts(5330, { stroke: COLORS.ink, strokeWidth: 1.5 })));
      let bitStr = '';
      for (let i = 0; i < (compact ? 22 : 34); i++) bitStr += ((i * 2654435761) >>> ((i % 7) + 3)) % 2 ? '1' : '0';
      label(ctx, bitStr, w * 0.08, tapeY + (compact ? 16 : 20), { color: COLORS.green, size: compact ? 10 : 12.5 });

      // the bar of certified bits per trial
      const gx = w * 0.06;
      const gw = w * 0.44;
      const gy = tapeY + (compact ? 38 : 48);
      this.cache.draw(`cbar2-${key}`, (g) => g.rectangle(gx, gy, gw, compact ? 16 : 20, opts(5340, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      ctx.fillStyle = COLORS.green;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(gx + 1, gy + 1, (gw - 2) * Math.min(1, bits), (compact ? 16 : 20) - 2);
      ctx.globalAlpha = 1;
      label(ctx, `${bitWord(bits, 3)} certified per trial`, gx + gw / 2, gy + (compact ? 30 : 36),
        { color: COLORS.green, size: compact ? 10 : 12.5, align: 'center' });

      // the certificate, with the small print actually printed
      const cx = w * 0.55;
      const cw = w * 0.39;
      const cy = tapeY - (compact ? 6 : 8);
      const chh = compact ? 108 : 128;
      this.cache.draw(`cert-${key}`, (g) => g.rectangle(cx, cy, cw, chh, opts(5350, { stroke: COLORS.yellow, strokeWidth: 1.8 })));
      label(ctx, 'CERTIFICATE', cx + cw / 2, cy + (compact ? 15 : 18), { color: COLORS.yellow, size: compact ? 10.5 : 13, align: 'center' });
      label(ctx, 'valid only if:', cx + 10, cy + (compact ? 31 : 37), { color: COLORS.muted, size: compact ? 9 : 11 });
      ['1. no signalling between stations', '2. settings independent of the source', '3. the devices do not leak'].forEach((t, i) => {
        label(ctx, t, cx + 10, cy + (compact ? 45 : 53) + i * (compact ? 14 : 17), { color: COLORS.orange, size: compact ? 8.5 : 10.5 });
      });
      label(ctx, 'drop any one and this is worthless', cx + cw / 2, cy + chh - (compact ? 8 : 10),
        { color: COLORS.red, size: compact ? 8.5 : 10.5, align: 'center' });

      label(ctx, `S = ${fmtNum(this.S, 3)}  →  an adversary guesses with P = ${fmtNum(guessProb(this.S), 4)}`,
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 11 : 15, align: 'center' });
      label(ctx, compact ? 'S = 2 → 0 bits · S = 2√2 → exactly 1 bit' : 'at the local bound S = 2 you have earned nothing; at Tsirelson\'s S = 2√2 you have earned exactly one bit nobody could have written down in advance',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
    }

    // ---- 6: the search that could still find real randomness ----
    renderCollapse() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;

      // the massif, in cross-section, with the lab under it
      const skyY = h * 0.22;
      const gndY = h * 0.40;
      this.cache.draw(`mtn-${key}`, (g) => g.path(
        `M 0 ${gndY} L ${w * 0.14} ${skyY} Q ${w * 0.24} ${skyY - 26} ${w * 0.34} ${skyY + 8} L ${w * 0.50} ${gndY} Z`,
        opts(5400, { stroke: COLORS.muted, strokeWidth: 1.8 }),
      ));
      this.cache.draw(`rock-${key}`, (g) => g.rectangle(0, gndY, w * 0.52, h - gndY, opts(5401, {
        stroke: COLORS.muted, strokeWidth: 1.2, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 11,
      })));
      const lx = w * 0.27;
      const ly = h * 0.70;
      this.cache.draw(`tun-${key}`, (g) => g.path(`M 0 ${ly} L ${lx - (compact ? 30 : 40)} ${ly}`,
        opts(5402, { stroke: COLORS.orange, strokeWidth: 1.6, strokeLineDash: [7, 5] })));
      // the shield stack: lead outside, ancient copper inside, germanium at the core
      this.cache.draw(`pb-${key}`, (g) => g.rectangle(lx - (compact ? 30 : 40), ly - (compact ? 24 : 32), compact ? 60 : 80, compact ? 48 : 64,
        opts(5403, { stroke: COLORS.cyan, strokeWidth: 2 })));
      this.cache.draw(`cu-${key}`, (g) => g.rectangle(lx - (compact ? 20 : 27), ly - (compact ? 16 : 21), compact ? 40 : 54, compact ? 32 : 42,
        opts(5404, { stroke: COLORS.orange, strokeWidth: 1.4 })));
      this.cache.draw(`ge-${key}`, (g) => g.circle(lx, ly, compact ? 16 : 21, opts(5405, { stroke: COLORS.green, strokeWidth: 1.8 })));
      label(ctx, 'Ge', lx, ly + 4, { color: COLORS.green, size: compact ? 9.5 : 12, align: 'center' });
      label(ctx, compact ? '1,400 m of rock overhead' : '1,400 m of rock overhead — Gran Sasso', lx, gndY - 8,
        { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });
      label(ctx, compact ? 'lead + old copper shield' : 'lead and low-activity copper shielding', lx, ly + (compact ? 36 : 46),
        { color: COLORS.cyan, size: compact ? 8.5 : 10.5, align: 'center' });

      // the X-rays the model says ordinary matter should emit, and does not
      for (let i = 0; i < 5; i++) {
        const a = -2.2 + i * 0.42;
        const p = ((this.simT * 0.5 + i * 0.19) % 1);
        ctx.strokeStyle = COLORS.pink;
        ctx.globalAlpha = 0.75 * (1 - p);
        ctx.lineWidth = 1.2;
        const r0 = (compact ? 18 : 24) + p * (compact ? 22 : 30);
        ctx.beginPath();
        ctx.moveTo(lx + Math.cos(a) * r0, ly + Math.sin(a) * r0);
        ctx.lineTo(lx + Math.cos(a) * (r0 + 9), ly + Math.sin(a) * (r0 + 9));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // the measurement: counts vs energy, background against the predicted excess
      const px = w * 0.56;
      const pw = w - px - (compact ? 12 : 26);
      const py = h * 0.24;
      const ph = h * 0.42;
      this.cache.draw(`pax-${key}`, (g) => g.line(px, py + ph, px + pw, py + ph, opts(5410, { stroke: COLORS.muted, strokeWidth: 1.5 })));
      this.cache.draw(`pay-${key}`, (g) => g.line(px, py, px, py + ph, opts(5411, { stroke: COLORS.muted, strokeWidth: 1.5 })));
      label(ctx, 'counts', px - 5, py + 4, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'right' });
      label(ctx, 'photon energy →', px + pw / 2, py + ph + (compact ? 15 : 18), { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });

      // measured spectrum: a falling background with Poisson-looking scatter
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const t = k / 60;
        const base = Math.exp(-t * 1.9);
        const wob = 1 + (((k * 2654435761) >>> 20) % 100 - 50) / 620;
        const yy = py + ph - base * wob * ph * 0.72;
        if (k === 0) ctx.moveTo(px + t * pw, yy); else ctx.lineTo(px + t * pw, yy);
      }
      ctx.stroke();
      label(ctx, compact ? 'measured' : 'measured — known background', px + pw * 0.30, py + ph * 0.30, { color: COLORS.ink, size: compact ? 8.5 : 10.5 });

      // what a collapse signal would have added
      ctx.strokeStyle = COLORS.pink;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const t = k / 60;
        const yy = py + ph - (Math.exp(-t * 1.9) + 0.30) * ph * 0.72;
        if (k === 0) ctx.moveTo(px + t * pw, yy); else ctx.lineTo(px + t * pw, yy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, compact ? 'what collapse would add' : 'what a real collapse would have added', px + pw * 0.20, py + ph * 0.10,
        { color: COLORS.pink, size: compact ? 8.5 : 10.5 });
      label(ctx, 'not seen', px + pw - 6, py + ph * 0.10, { color: COLORS.red, size: compact ? 9.5 : 12, align: 'right' });

      // centred on the canvas, not on the plot — the plot is too narrow to hold it
      label(ctx, compact ? 'no excess → parameter-free Diósi–Penrose excluded' : 'no excess found — and that null result excludes the parameter-free Diósi–Penrose model (Donadi et al. 2021)',
        w / 2, py + ph + (compact ? 32 : 40), { color: COLORS.yellow, size: compact ? 9 : 11.5, align: 'center' });

      label(ctx, 'the one experiment here that could still return a positive',
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 11 : 15, align: 'center' });
      label(ctx, compact ? 'collapse changes the equations — so it can be caught' : 'objective collapse changes the equations rather than interpreting them, so it predicts something you can go and count',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
    }

    render() {
      ({
        ceiling: () => this.renderCeiling(),
        data: () => this.renderData(),
        loopholes: () => this.renderLoopholes(),
        quasar: () => this.renderQuasar(),
        certified: () => this.renderCertified(),
        collapse: () => this.renderCollapse(),
      })[this.mode]();
    }
  }

  void CIT_KS; void CIT_BOHM; void CIT_EVERETT; void CIT_LEGGETT; void CIT_GROBLACHER;
  void CIT_KIRCHMAIR; void CIT_COLBECK; void CIT_PBR; void CIT_HENSEN; void CIT_THOOFT;
  void CIT_HANDSTEINER; void CIT_BIGBELL; void CIT_BIERHORST; void CIT_GRW;

  A.register('determinism', DeterminismSim);
})();
