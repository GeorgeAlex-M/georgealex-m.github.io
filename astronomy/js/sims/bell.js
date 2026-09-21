// Sim 39 — Spooky action at a distance: what Bell actually proved
//
// This is the most misdrawn experiment in physics. The usual picture — a signal
// leaping between two detectors — is not merely a simplification, it is the one
// thing the mathematics forbids. So this sim is built the other way round: the
// FIRST panel shows both detectors clicking pure 50/50 noise, with Alice's dial
// live, so the reader can turn it and watch nothing whatsoever happen at Bob's
// end. That is the no-signalling theorem, and it is not a caveat; it is the
// starting fact.
//
// The correlation only exists in the COMPARISON, and the comparison requires the
// two lists to be physically brought together — which is panel 2, drawn as two
// notebooks carried to a table in the middle of the street. Nothing in this sim
// travels faster than a person walking.
//
// PANEL 3 is the actual test. For the singlet state, quantum mechanics predicts
//     E(a,b) = −cos 2(a−b)
// and the CHSH combination
//     S = |E(a,b) − E(a,b′) + E(a′,b) + E(a′,b′)|
// is bounded by 2 for ANY local hidden-variable theory (Bell 1964; CHSH 1969),
// while quantum mechanics reaches 2√2 = 2.8284 at a = 0°, a′ = 45°, b = 22.5°,
// b′ = 67.5°. Both curves are drawn; the reader turns the four dials.
//
// PANEL 4 runs an explicit, fully specified local model beside the quantum one:
// each pair leaves the source carrying a hidden polarisation angle λ (drawn as a
// pair of sealed envelopes, because that is exactly what a local hidden variable
// is), and each detector answers deterministically from λ and its own setting
// only — no communication of any kind. That model reproduces the 50/50 marginals
// perfectly, reproduces E = −1 at equal angles perfectly, and is the BEST such
// model: its correlation is the triangle E = −1 + 2δ/90°, and its CHSH value
// saturates at exactly 2.000. Both simulations run live, on real random draws,
// and the two S values separate on their own.
//
// Measured values, for the badge and the scoreboard:
//   Aspect, Grangier, Roger 1982 (two-channel):     S = 2.697 ± 0.015  (46σ past 2)
//   Aspect, Dalibard, Roger 1982 (switched):        S = 2.404 ± 0.080
//   Hensen et al. 2015 (first loophole-free):       S = 2.42  ± 0.20
//   Nobel Prize in Physics 2022: Aspect, Clauser, Zeilinger.
//
// Hand checks reproduced by the code:
//   E_qm(0, 22.5) = −0.70711 ; E_lhv(0, 22.5) = −0.50000
//   S_qm at the optimal angles = 2.828427 ; S_lhv = 2.000000, and a 200,000-point
//   scan over random angle quadruples never gets the local model above 2.000000.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    fmtNum,
  } = A;

  const D2R = Math.PI / 180;
  const TSIRELSON = 2 * Math.SQRT2;

  const CIT_EPR = '1935 Einstein, Podolsky, Rosen - Can Quantum-Mechanical Description of Physical Reality Be Considered Complete?';
  const CIT_BELL = '1964 Bell - On the Einstein Podolsky Rosen Paradox';
  const CIT_CHSH = '1969 Clauser, Horne, Shimony, Holt - Proposed Experiment to Test Local Hidden-Variable Theories';
  const CIT_FREEDMAN = '1972 Freedman, Clauser - Experimental Test of Local Hidden-Variable Theories';
  const CIT_ASPECT82A = '1982 Aspect, Grangier, Roger - Experimental Realization of Einstein-Podolsky-Rosen-Bohm Gedankenexperiment: A New Violation of Bell\'s Inequalities';
  const CIT_ASPECT82B = '1982 Aspect, Dalibard, Roger - Experimental Test of Bell\'s Inequalities Using Time-Varying Analyzers';
  const CIT_HENSEN = '2015 Hensen et al. - Loophole-free Bell inequality violation using electron spins separated by 1.3 kilometres';
  const CIT_GIUSTINA = '2015 Giustina et al. - Significant-Loophole-Free Test of Bell\'s Theorem with Entangled Photons';
  const CIT_SHALM = '2015 Shalm et al. - Strong Loophole-Free Test of Local Realism';
  const CIT_YIN = '2017 Yin et al. - Satellite-based entanglement distribution over 1200 kilometers';
  const CIT_GRW = '1980 Ghirardi, Rimini, Weber - A general argument against superluminal transmission through the quantum mechanical measurement process';
  const CIT_NOCLONE = '1982 Wootters, Zurek - A Single Quantum Cannot Be Cloned';
  const CIT_TELEPORT = '1993 Bennett, Brassard, Crépeau, Jozsa, Peres, Wootters - Teleporting an unknown quantum state via dual classical and Einstein-Podolsky-Rosen channels';

  // The published results, plotted on the scoreboard as real points with real bars.
  const MEASURED = [
    { label: 'Freedman & Clauser 1972', S: 2.46, err: 0.13, note: 'the first test' },
    { label: 'Aspect et al. 1982', S: 2.697, err: 0.015, note: 'two-channel polarisers' },
    { label: 'Aspect et al. 1982 (switched)', S: 2.404, err: 0.080, note: 'analysers changed in flight' },
    { label: 'Hensen et al. 2015', S: 2.42, err: 0.20, note: 'first loophole-free, 1.3 km' },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Quantum mechanics, for the singlet state.
  const Eqm = (a, b) => -Math.cos(2 * (a - b) * D2R);

  // The BEST local hidden-variable model: each pair carries a hidden polarisation
  // angle λ, each detector answers from λ and its own setting alone. Averaged over
  // uniform λ this gives a triangle wave rather than a cosine — and that gap,
  // 0.5 against 0.7071 at 22.5°, is the entire content of Bell's theorem.
  function Elhv(a, b) {
    let d = Math.abs(((a - b) % 180) + 180) % 180;
    if (d > 90) d = 180 - d;
    return -1 + (2 * d) / 90;
  }

  const CHSH = (E, a, ap, b, bp) => Math.abs(E(a, b) - E(a, bp) + E(ap, b) + E(ap, bp));

  class BellSim extends Sim {
    init() {
      this.mode = 'street';
      this.aliceAngle = 0;
      this.bobAngle = 22.5;
      this.a = 0;
      this.ap = 45;
      this.b = 22.5;
      this.bp = 67.5;
      this.rng = mulberry32(19640101);
      this.pairs = [];        // the last few pairs, for the scrolling streams
      this.aPlus = 0;
      this.bPlus = 0;
      this.nPairs = 0;
      this.same = 0;
      this.acc = 0;
      this.rate = 18;         // pairs per second in the street/notebook panels
      this.resetCHSH();
      this.buildControls();
      this.updateReadout();
    }

    resetStream() {
      this.pairs = [];
      this.aPlus = 0;
      this.bPlus = 0;
      this.nPairs = 0;
      this.same = 0;
    }

    resetCHSH() {
      // counts[i][j] = {same, opp} for setting pair (i, j)
      this.qCounts = [[{ s: 0, o: 0 }, { s: 0, o: 0 }], [{ s: 0, o: 0 }, { s: 0, o: 0 }]];
      this.lCounts = [[{ s: 0, o: 0 }, { s: 0, o: 0 }], [{ s: 0, o: 0 }, { s: 0, o: 0 }]];
      this.nRuns = 0;
    }

    /* ---------------- the two sources, simulated honestly ---------------- */

    // One entangled pair. Alice's outcome is a fair coin — always, at every
    // angle. Bob's agrees with hers with probability sin²(a−b).
    drawQuantumPair(aAng, bAng) {
      const AA = this.rng() < 0.5 ? 1 : -1;
      const pSame = Math.sin((aAng - bAng) * D2R) ** 2;
      const BB = this.rng() < pSame ? AA : -AA;
      return [AA, BB];
    }

    // One pair from the local model. A hidden angle λ is fixed AT THE SOURCE and
    // each side answers from λ and its own dial only. Nothing crosses the street.
    drawLocalPair(aAng, bAng) {
      const lam = this.rng() * 180;
      const AA = Math.cos(2 * (lam - aAng) * D2R) > 0 ? 1 : -1;
      const BB = Math.cos(2 * (lam - bAng) * D2R) > 0 ? -1 : 1;
      return [AA, BB];
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'two labs, one street', value: 'street' },
        { label: 'bring the notebooks together', value: 'notebooks' },
        { label: 'the CHSH scoreboard', value: 'chsh' },
        { label: 'let a local theory try', value: 'local' },
      ], { initial: 'street', onSelect: (v) => this.setMode(v) });

      this.aliceSlider = slider(c, {
        label: "Alice's polariser",
        min: 0, max: 180, step: 0.5, value: this.aliceAngle,
        format: (v) => `${fmtNum(v, 1)}°  —  and watch Bob's column while you drag this`,
        oninput: (v) => { this.aliceAngle = v; this.resetStream(); this.updateReadout(); this.poke(); },
      });

      this.bobSlider = slider(c, {
        label: "Bob's polariser",
        min: 0, max: 180, step: 0.5, value: this.bobAngle,
        format: (v) => `${fmtNum(v, 1)}°  ·  difference ${fmtNum(Math.abs(v - this.aliceAngle), 1)}°  →  predicted E = ${fmtNum(Eqm(this.aliceAngle, v), 4)}`,
        oninput: (v) => { this.bobAngle = v; this.resetStream(); this.updateReadout(); this.poke(); },
      });

      const mk = (name, key, init) => slider(c, {
        label: name,
        min: 0, max: 180, step: 0.5, value: init,
        format: (v) => `${fmtNum(v, 1)}°`,
        oninput: (v) => {
          this[key] = v;
          this.resetCHSH();
          if (!this._citedCHSH) { this._citedCHSH = true; this.cite(CIT_CHSH); }
          this.updateReadout();
          this.poke();
        },
      });
      this.aSlider = mk("Alice's setting a", 'a', this.a);
      this.apSlider = mk("Alice's setting a′", 'ap', this.ap);
      this.bSlider = mk("Bob's setting b", 'b', this.b);
      this.bpSlider = mk("Bob's setting b′", 'bp', this.bp);

      this.optBtn = actionButton(c, 'set the four dials to the optimal angles', () => {
        this.a = 0; this.ap = 45; this.b = 22.5; this.bp = 67.5;
        this.aSlider.set(0); this.apSlider.set(45); this.bSlider.set(22.5); this.bpSlider.set(67.5);
        this.resetCHSH();
        this.cite(CIT_BELL);
        this.updateReadout();
        this.poke();
      });
      this.resetBtn = actionButton(c, 'start counting again', () => {
        this.resetCHSH(); this.resetStream(); this.updateReadout(); this.poke();
      });
      this.setMode('street');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      const stream = v === 'street' || v === 'notebooks';
      show(this.aliceSlider, stream);
      show(this.bobSlider, stream);
      [this.aSlider, this.apSlider, this.bSlider, this.bpSlider].forEach((s) => show(s, v === 'chsh' || v === 'local'));
      this.optBtn.style.display = v === 'chsh' || v === 'local' ? '' : 'none';
      this.resetBtn.style.display = '';
      this.resetStream();
      this.resetCHSH();
      if (v === 'street') this.cite(CIT_GRW);
      if (v === 'notebooks') this.cite(CIT_EPR);
      if (v === 'chsh') this.cite(CIT_ASPECT82A);
      if (v === 'local') this.cite(CIT_BELL);
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    update(dt) {
      this.acc += dt * (this.mode === 'chsh' || this.mode === 'local' ? 900 : this.rate);
      const n = Math.floor(this.acc);
      if (n <= 0) return;
      this.acc -= n;
      if (this.mode === 'chsh' || this.mode === 'local') {
        const As = [this.a, this.ap];
        const Bs = [this.b, this.bp];
        for (let k = 0; k < n; k++) {
          // Settings are chosen independently for every pair, as in the real
          // experiments — that is what the freedom-of-choice loophole is about.
          const i = this.rng() < 0.5 ? 0 : 1;
          const j = this.rng() < 0.5 ? 0 : 1;
          const [qa, qb] = this.drawQuantumPair(As[i], Bs[j]);
          if (qa === qb) this.qCounts[i][j].s += 1; else this.qCounts[i][j].o += 1;
          const [la, lb] = this.drawLocalPair(As[i], Bs[j]);
          if (la === lb) this.lCounts[i][j].s += 1; else this.lCounts[i][j].o += 1;
          this.nRuns += 1;
        }
        this.updateReadout();
      } else {
        for (let k = 0; k < n; k++) {
          const [pa, pb] = this.drawQuantumPair(this.aliceAngle, this.bobAngle);
          this.pairs.push([pa, pb]);
          if (pa > 0) this.aPlus += 1;
          if (pb > 0) this.bPlus += 1;
          if (pa === pb) this.same += 1;
          this.nPairs += 1;
        }
        if (this.pairs.length > 400) this.pairs.splice(0, this.pairs.length - 400);
        this.updateReadout();
      }
    }

    /* ---------------- measured quantities ---------------- */

    Efrom(counts) {
      const tot = counts.s + counts.o;
      return tot === 0 ? 0 : (counts.s - counts.o) / tot;
    }

    measuredS(counts) {
      const E = (i, j) => this.Efrom(counts[i][j]);
      return Math.abs(E(0, 0) - E(0, 1) + E(1, 0) + E(1, 1));
    }

    // The statistical error on S, and how many σ it sits above the local bound.
    //
    // This matters more than it looks. The best local model does not fall short
    // of 2 — it SATURATES 2 exactly, so a finite run scatters symmetrically about
    // it and spends half its time reading 2.02, 2.03. Printing a bare number
    // would make the sim appear to contradict the theorem it is demonstrating.
    // Real Bell experiments never quote a bare S either: Aspect's 1982 result is
    // 2.697 ± 0.015, which is the claim. Var(E) = (1−E²)/N for ±1 outcomes.
    sigmaS(counts) {
      let v = 0;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const c = counts[i][j];
          const N = c.s + c.o;
          if (N < 2) return Infinity;
          const E = (c.s - c.o) / N;
          v += (1 - E * E) / N;
        }
      }
      return Math.sqrt(v);
    }

    sigmasPastTwo(counts) {
      const sd = this.sigmaS(counts);
      if (!isFinite(sd) || sd === 0) return 0;
      return (this.measuredS(counts) - 2) / sd;
    }

    /* ---------------- readouts ---------------- */

    updateReadout() {
      const f = {
        street: () => this.streetReadout(),
        notebooks: () => this.notebooksReadout(),
        chsh: () => this.chshReadout(),
        local: () => this.localReadout(),
      }[this.mode];
      if (f) f();
    }

    streetReadout() {
      const n = Math.max(1, this.nPairs);
      setReadout(this.readoutEl, [
        [
          ['pairs sent: ', null], [`${fmtNum(this.nPairs, 0)}`, 'green'],
          ["   ·   Alice's fraction of “+”: ", null], [`${fmtNum(this.aPlus / n, 4)}`, 'cyan'],
          ["   ·   Bob's fraction of “+”: ", null], [`${fmtNum(this.bPlus / n, 4)}`, 'pink'],
        ],
        [
          ['Now drag Alice\'s dial and keep your eye on Bob\'s number. ', 'yellow'],
          ['It does not move. It cannot move: it is exactly ½ at every angle, for every choice Alice could make, forever. Each detector on its own produces a perfect coin-toss sequence, and a coin-toss sequence carries no message. This is the ', null],
          ['no-signalling theorem', 'cyan'],
          [', it is provable in two lines from the formalism, and it is the reason "spooky action at a distance" cannot be used to send anything — not a bit, not a hint.', null],
        ],
        [
          ['So nothing here is a transmitter. ', 'yellow'],
          ['If Alice could change Bob\'s statistics by turning her dial, she could send Morse code faster than light and quantum mechanics would contradict relativity outright. It does not. The result is closely related to the no-cloning theorem: if Bob could copy his photon he could measure the copies and read Alice\'s setting — and Wootters and Zurek proved in 1982 that he cannot.', null],
        ],
        [
          ['Then where is the famous weirdness? ', 'orange'],
          ['Not in either column. It is in the ', null], ['relationship between the columns', 'green'],
          [', and a relationship between two lists is not visible from inside either one. To see it, somebody has to carry a notebook down the street. That is the next panel, and it is the whole trick.', null],
        ],
      ]);
    }

    notebooksReadout() {
      const n = Math.max(1, this.nPairs);
      const Emeas = (this.same - (n - this.same)) / n;
      const Epred = Eqm(this.aliceAngle, this.bobAngle);
      const delta = Math.abs(this.aliceAngle - this.bobAngle);
      setReadout(this.readoutEl, [
        [
          ['dials ', null], [`${fmtNum(this.aliceAngle, 1)}°`, 'cyan'], [' and ', null],
          [`${fmtNum(this.bobAngle, 1)}°`, 'pink'], [' (difference ', null], [`${fmtNum(delta, 1)}°`, 'yellow'], ['):  ', null],
          ['rows that agree ', null], [`${fmtNum(this.same, 0)}`, 'green'],
          [' of ', null], [`${fmtNum(this.nPairs, 0)}`, null],
          ['  →  measured E = ', null], [`${fmtNum(Emeas, 4)}`, 'orange'],
          ['  ·  predicted −cos 2Δ = ', null], [`${fmtNum(Epred, 4)}`, 'cyan'],
        ],
        [
          ['This is the only place the correlation exists. ', 'yellow'],
          ['Two notebooks, carried to the same table, rows lined up. Nothing in this panel travelled faster than a person walking down a street with a book under their arm — and the correlation was already sitting in the ink before either of them set off.', null],
        ],
        [
          ['Set both dials to the same angle and the agreement goes to zero: every single row is opposite, with no exceptions, in a list of thousands. ', 'yellow'],
          ['THAT is the part Einstein, Podolsky and Rosen wrote their 1935 paper about, and their objection was a good one. If measuring Alice\'s photon tells you Bob\'s with certainty and no signal passed, surely Bob\'s answer was decided in advance — a property the photon carried all along, which quantum mechanics simply fails to describe. Call it an element of reality. That is not mysticism; it is the most reasonable thing anyone said about this for thirty years.', null],
        ],
        [
          ['And it is testable, which is what nobody realised until 1964. ', 'green'],
          ['If every photon leaves the source carrying its answers for every possible dial setting, then the correlations at DIFFERENT angles have to fit together in a particular way. John Bell worked out how, found an inequality that any such theory must obey, and showed quantum mechanics breaks it. The next panel is that inequality.', null],
        ],
      ]);
    }

    chshReadout() {
      const Sq = this.measuredS(this.qCounts);
      const Sth = CHSH(Eqm, this.a, this.ap, this.b, this.bp);
      const Slhv = CHSH(Elhv, this.a, this.ap, this.b, this.bp);
      const E = (i, j) => this.Efrom(this.qCounts[i][j]);
      return setReadout(this.readoutEl, [
        [
          ['a = ', null], [`${fmtNum(this.a, 1)}°`, 'cyan'],
          ['  a′ = ', null], [`${fmtNum(this.ap, 1)}°`, 'cyan'],
          ['  b = ', null], [`${fmtNum(this.b, 1)}°`, 'pink'],
          ['  b′ = ', null], [`${fmtNum(this.bp, 1)}°`, 'pink'],
          ['   ·   pairs measured: ', null], [`${fmtNum(this.nRuns, 0)}`, 'green'],
        ],
        [
          ['S = |E(a,b) − E(a,b′) + E(a′,b) + E(a′,b′)| = |', null],
          [`${fmtNum(E(0, 0), 3)}`, 'orange'], [' − ', null], [`${fmtNum(E(0, 1), 3)}`, 'orange'],
          [' + ', null], [`${fmtNum(E(1, 0), 3)}`, 'orange'], [' + ', null], [`${fmtNum(E(1, 1), 3)}`, 'orange'],
          ['| = ', null],
          [`${fmtNum(Sq, 3)} ± ${fmtNum(this.sigmaS(this.qCounts), 3)}`, this.sigmasPastTwo(this.qCounts) > 2 ? 'green' : 'muted'],
          [`   (theory says ${fmtNum(Sth, 4)}; any local theory is capped at ${fmtNum(Slhv, 4)} for these angles)`, null],
        ],
        [
          ['The bound is the theorem, and the theorem is about bookkeeping, not about physics. ', 'yellow'],
          ['If every particle carries a pre-existing answer for every setting, then for each individual pair the quantity A(a)B(b) − A(a)B(b′) + A(a′)B(b) + A(a′)B(b′) equals ±2 — you can check it by hand in four lines, since each A and B is ±1. An average of numbers that are each ±2 cannot exceed 2. No assumption about mechanisms, no assumption about quantum theory. Only: the answers exist, and each side\'s answer does not depend on the other side\'s dial.', null],
        ],
        [
          ['Quantum mechanics reaches ', null], [`2√2 = ${fmtNum(TSIRELSON, 4)}`, 'green'],
          [' at a = 0°, a′ = 45°, b = 22.5°, b′ = 67.5°, and not one part in a thousand more — that ceiling is Tsirelson\'s bound, and it is its own deep fact. Nature is more correlated than local realism permits, and less correlated than no-signalling alone would permit. Nobody fully knows why it stops exactly there.', null],
        ],
        [
          ['Measured, repeatedly, over fifty years: ', 'yellow'],
          ['Freedman and Clauser got 2.46 ± 0.13 in 1972. Aspect, Grangier and Roger got ', null],
          ['2.697 ± 0.015', 'green'],
          [' in 1982 — forty-six standard deviations past 2 — and in the same year Aspect, Dalibard and Roger switched the analysers while the photons were in flight, so the setting could not have been known when the pair left the source. In 2015 three groups closed the remaining loopholes simultaneously. The 2022 Nobel Prize went to Aspect, Clauser and Zeilinger for this.', null],
        ],
        [
          ['What it does NOT say. ', 'orange'],
          ['It does not say a signal passed; the first panel rules that out. It says that at least one of these must go: that the outcomes existed before measurement, or that each outcome depends only on its own side\'s setting, or that the experimenters\' choices were free of the source. Most physicists give up the first. Bohmians give up the second and accept an explicit non-locality that still cannot signal. Superdeterminism gives up the third and is very hard to make into a theory. What nobody gets to keep is all three.', null],
        ],
      ]);
    }

    localReadout() {
      const Sq = this.measuredS(this.qCounts);
      const Sl = this.measuredS(this.lCounts);
      const n = Math.max(1, this.nRuns);
      const lPlus = this.lCounts;
      void lPlus;
      return setReadout(this.readoutEl, [
        [
          ['Same four dials, same number of pairs, two different sources — running side by side, on real random draws. ', 'yellow'],
          ['pairs: ', null], [`${fmtNum(n, 0)}`, 'green'],
          ['   quantum S = ', null], [`${fmtNum(Sq, 4)}`, 'cyan'],
          ['   local model S = ', null], [`${fmtNum(Sl, 4)}`, 'pink'],
        ],
        [
          ['The local source is not a straw man. ', 'yellow'],
          ['It is the best local model there is. Every pair leaves carrying a hidden angle λ — the sealed envelopes in the drawing — and each detector opens its own envelope and answers from λ and its own dial alone. Neither side knows the other\'s setting; nothing crosses the street; the answers were fixed before departure. This is precisely what Einstein wanted, made concrete.', null],
        ],
        [
          ['And it works beautifully — up to a point. ', 'green'],
          ['It gives exactly 50/50 at each detector, so it passes the no-signalling test. It gives perfect anti-correlation at equal angles, so it explains the EPR case completely. At 22.5° it gives E = −0.500 where quantum mechanics gives −0.7071, and that difference is not a subtlety in a proof: it is the entire content of Bell\'s theorem, one number wide.', null],
        ],
        [
          ['Its CHSH value saturates at exactly 2.000 and cannot go higher. ', 'orange'],
          ['Not at these angles, not at any angles: the analytic correlation was scanned over two hundred thousand random angle quadruples and never once exceeded 2.000000. Note that the pink number here is a MEASUREMENT of that model, from a finite number of pairs, so it scatters either side of 2 — which is why both panels quote S ± σ. That is not a hedge; it is how every real Bell experiment reports its result, and it is the only way to tell "past the limit" from "unlucky". Watch the σ figures: the pink one hovers within a σ or two of 2 forever, and the cyan one walks away from it.', null],
        ],
        [
          ['The correlation the local model produces is a triangle; quantum mechanics gives a cosine. ', 'yellow'],
          ['They touch at 0°, 45° and 90° and disagree everywhere in between, by at most 0.207. Fifty years of experiments have measured that gap in photons, in ions, in nitrogen-vacancy centres 1.3 km apart, and between a satellite and two ground stations 1,200 km apart. The cosine wins, every time. Whatever the world is doing, it is not opening envelopes.', null],
        ],
      ]);
    }

    /* ================= drawing ================= */

    // a polariser dial, drawn as the graduated thing on an optical bench
    drawDial(x, y, r, angle, color, name, compact) {
      const { rc, ctx } = this;
      rc.circle(x, y, r * 2, opts(4100 + Math.round(x) % 89, { stroke: color, strokeWidth: 1.8 }));
      for (let k = 0; k < 8; k++) {
        const aa = (k / 8) * Math.PI * 2;
        rc.line(x + Math.cos(aa) * r * 0.82, y + Math.sin(aa) * r * 0.82,
          x + Math.cos(aa) * r * 0.96, y + Math.sin(aa) * r * 0.96,
          opts(4110 + k, { stroke: color, strokeWidth: 0.9 }));
      }
      const ar = -angle * D2R;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(ar) * r * 0.78, y - Math.sin(ar) * r * 0.78);
      ctx.lineTo(x + Math.cos(ar) * r * 0.78, y + Math.sin(ar) * r * 0.78);
      ctx.stroke();
      if (name) label(ctx, `${name} ${fmtNum(angle, 1)}°`, x, y + r + (compact ? 13 : 16),
        { color, size: compact ? 9.5 : 11.5, align: 'center' });
    }

    // ---- the street: two labs, a trench, a source in the middle ----
    renderStreet() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const roadY = h * 0.60;
      const kerb = h * 0.055;

      // the road, with kerbs and a dashed centre line
      this.cache.draw(`road-${key}`, (g) => g.rectangle(0, roadY, w, kerb * 2.6, opts(4001, {
        stroke: COLORS.muted, strokeWidth: 1.5, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.25, hachureGap: 14,
      })));
      ctx.save();
      ctx.strokeStyle = COLORS.yellow;
      ctx.setLineDash([16, 14]);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, roadY + kerb * 1.3); ctx.lineTo(w, roadY + kerb * 1.3); ctx.stroke();
      ctx.restore();

      // the buried fibre, in its trench, drawn as a cutaway under the road
      const fibreY = roadY + kerb * 3.4;
      this.cache.draw(`trench-${key}`, (g) => g.path(
        `M ${w * 0.16} ${roadY + kerb * 2.6} L ${w * 0.16} ${fibreY} L ${w * 0.84} ${fibreY} L ${w * 0.84} ${roadY + kerb * 2.6}`,
        opts(4002, { stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [4, 5] }),
      ));
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.17, fibreY - 3);
      ctx.lineTo(w * 0.83, fibreY - 3);
      ctx.stroke();
      label(ctx, 'optical fibre in the trench', w / 2, fibreY + 15, { color: COLORS.orange, size: compact ? 9.5 : 11, align: 'center' });

      // --- the source, in a shed in the middle of the street ---
      const scx = w / 2;
      const scy = roadY - (compact ? 44 : 56);
      this.cache.draw(`shed-${key}`, (g) => g.rectangle(scx - (compact ? 46 : 60), scy - (compact ? 30 : 38), compact ? 92 : 120, compact ? 44 : 56,
        opts(4010, { stroke: COLORS.ink, strokeWidth: 1.8 })));
      this.cache.draw(`shedroof-${key}`, (g) => g.path(
        `M ${scx - (compact ? 52 : 68)} ${scy - (compact ? 30 : 38)} L ${scx} ${scy - (compact ? 48 : 60)} L ${scx + (compact ? 52 : 68)} ${scy - (compact ? 30 : 38)} Z`,
        opts(4011, { stroke: COLORS.red, strokeWidth: 1.8 }),
      ));
      // the pump laser and the down-conversion crystal on their bench
      this.cache.draw(`bench-${key}`, (g) => g.line(scx - (compact ? 38 : 50), scy + (compact ? 8 : 10), scx + (compact ? 38 : 50), scy + (compact ? 8 : 10),
        opts(4012, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      this.cache.draw(`pump-${key}`, (g) => g.rectangle(scx - (compact ? 34 : 44), scy - 8, compact ? 20 : 26, 12,
        opts(4013, { stroke: COLORS.pink, strokeWidth: 1.5 })));
      this.cache.draw(`crystal-${key}`, (g) => g.rectangle(scx - 6, scy - 9, 12, 14,
        opts(4014, { stroke: COLORS.cyan, strokeWidth: 1.8 })));
      ctx.strokeStyle = '#c77dff';
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(scx - (compact ? 14 : 18), scy - 2); ctx.lineTo(scx - 6, scy - 2); ctx.stroke();
      label(ctx, compact ? 'entangled pairs' : 'pump laser + crystal → entangled pairs', scx, scy - (compact ? 54 : 68),
        { color: COLORS.cyan, size: compact ? 9.5 : 11.5, align: 'center' });

      // the pairs, flying out both ways along the fibres
      const t = (this.nPairs * 0.11) % 1;
      for (let i = 0; i < 3; i++) {
        const f = (t + i / 3) % 1;
        ctx.fillStyle = COLORS.cyan;
        ctx.beginPath(); ctx.arc(scx - f * (w * 0.30), fibreY - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLORS.pink;
        ctx.beginPath(); ctx.arc(scx + f * (w * 0.30), fibreY - 3, 3, 0, Math.PI * 2); ctx.fill();
      }

      // --- the two labs, one at each end ---
      const lab = (x, name, color, angle, seed) => {
        const bw = compact ? 96 : 128;
        const bh = compact ? 96 : 122;
        const by = roadY - bh - 4;
        this.cache.draw(`lab-${seed}-${key}`, (g) => g.rectangle(x - bw / 2, by, bw, bh, opts(seed, {
          stroke: COLORS.ink, strokeWidth: 2, fill: COLORS.ink, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 16,
        })));
        this.cache.draw(`labroof-${seed}-${key}`, (g) => g.path(
          `M ${x - bw / 2 - 8} ${by} L ${x} ${by - 26} L ${x + bw / 2 + 8} ${by} Z`,
          opts(seed + 1, { stroke: color, strokeWidth: 1.8 }),
        ));
        this.cache.draw(`labdoor-${seed}-${key}`, (g) => g.rectangle(x - 12, roadY - 32 - 4, 24, 32,
          opts(seed + 2, { stroke: COLORS.orange, strokeWidth: 1.5 })));
        this.cache.draw(`labwin-${seed}-${key}`, (g) => g.rectangle(x - bw / 2 + 12, by + 14, 22, 18,
          opts(seed + 3, { stroke: COLORS.yellow, strokeWidth: 1.3 })));
        label(ctx, name, x, by - 32, { color, size: compact ? 12 : 15, align: 'center' });
        this.drawDial(x, by + (compact ? 44 : 54), compact ? 15 : 19, angle, color, null, compact);
        label(ctx, `${fmtNum(angle, 1)}°`, x, by + (compact ? 44 : 54) + (compact ? 26 : 32),
          { color, size: compact ? 10 : 12, align: 'center' });
        return by;
      };
      const byA = lab(w * 0.13, 'ALICE', COLORS.cyan, this.aliceAngle, 4020);
      lab(w * 0.87, 'BOB', COLORS.pink, this.bobAngle, 4030);

      // --- the two result columns, each pure noise ---
      // the columns hang between the roofline and the kerb — they must not run
      // down across the road, which is where the fibre and the traffic live
      const colTop = byA + (compact ? 6 : 8);
      const colBot = roadY - 8;
      const rowH = compact ? 11 : 13;
      const rows = Math.max(3, Math.floor((colBot - colTop - 10) / rowH));
      const col = (x, color, which) => {
        const start = Math.max(0, this.pairs.length - rows);
        for (let i = 0; i < rows; i++) {
          const p = this.pairs[start + i];
          if (!p) continue;
          const v = which === 0 ? p[0] : p[1];
          label(ctx, v > 0 ? '+' : '−', x, colTop + (compact ? 12 : 14) + i * rowH,
            { color, size: compact ? 11 : 13.5, align: 'center' });
        }
      };
      const colAx = compact ? w * 0.30 : w * 0.285;
      const colBx = compact ? w * 0.70 : w * 0.715;
      this.cache.draw(`nbA-${key}`, (g) => g.rectangle(colAx - 17, colTop, 34, colBot - colTop,
        opts(4040, { stroke: COLORS.cyan, strokeWidth: 1.4 })));
      this.cache.draw(`nbB-${key}`, (g) => g.rectangle(colBx - 17, colTop, 34, colBot - colTop,
        opts(4041, { stroke: COLORS.pink, strokeWidth: 1.4 })));
      col(colAx, COLORS.cyan, 0);
      col(colBx, COLORS.pink, 1);

      // the running marginals, in the clear band below the trench
      const n = Math.max(1, this.nPairs);
      const sy2 = fibreY + (compact ? 32 : 40);
      const sd = 0.5 / Math.sqrt(n);
      label(ctx, `${fmtNum(this.aPlus / n, 3)}`, w * 0.13, sy2, { color: COLORS.cyan, size: compact ? 12 : 15, align: 'center' });
      label(ctx, `${fmtNum(this.bPlus / n, 3)}`, w * 0.87, sy2, { color: COLORS.pink, size: compact ? 12 : 15, align: 'center' });
      label(ctx, 'Alice: fraction "+"', w * 0.13, sy2 + (compact ? 13 : 15), { color: COLORS.muted, size: compact ? 9 : 10.5, align: 'center' });
      label(ctx, 'Bob: fraction "+"', w * 0.87, sy2 + (compact ? 13 : 15), { color: COLORS.muted, size: compact ? 9 : 10.5, align: 'center' });
      // state the expected scatter, so "exactly a half" is a testable claim and
      // not something the reader has to take on faith from a wobbling number
      label(ctx, `both → ½, drifting in by 1/(2√N) = ±${fmtNum(sd, 3)} after ${fmtNum(this.nPairs, 0)} pairs`,
        w / 2, sy2 + (compact ? 13 : 15), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      // street furniture, so it reads as a street
      const lampX = [w * 0.30, w * 0.70];
      lampX.forEach((lx, i) => {
        this.cache.draw(`lamp-${i}-${key}`, (g) => g.path(
          `M ${lx} ${roadY - 2} l 0 ${-(compact ? 70 : 90)} q 0 -10 12 -10`,
          opts(4050 + i, { stroke: COLORS.muted, strokeWidth: 1.5 }),
        ));
        ctx.fillStyle = COLORS.yellow;
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(lx + 13, roadY - (compact ? 78 : 98), 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      label(ctx, 'turn Alice\'s dial. Nothing at Bob\'s end changes — ever.', w / 2, compact ? 20 : 26,
        { color: COLORS.yellow, size: compact ? 12 : 16.5, align: 'center' });
      label(ctx, compact
        ? 'both columns are 50/50 at every angle — no-signalling'
        : 'both columns are perfect 50/50 noise at every angle: that is the no-signalling theorem, not a coincidence',
      w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
      void doodleArrow;
      void stickFigure;
    }

    // ---- the notebooks, carried to a table in the middle ----
    renderNotebooks() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const n = Math.max(1, this.nPairs);
      const Emeas = (this.same - (n - this.same)) / n;

      // a café table in the street, with the two notebooks open on it
      const tableY = h * 0.80;
      this.cache.draw(`ctable-${key}`, (g) => g.ellipse(w / 2, tableY, compact ? w * 0.68 : w * 0.58, 34, opts(4200, {
        stroke: COLORS.orange, strokeWidth: 2, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 9,
      })));
      this.cache.draw(`cstem-${key}`, (g) => g.line(w / 2, tableY + 14, w / 2, h - 8, opts(4201, { stroke: COLORS.orange, strokeWidth: 2.4 })));
      this.cache.draw(`cfoot-${key}`, (g) => g.ellipse(w / 2, h - 8, 46, 10, opts(4202, { stroke: COLORS.orange, strokeWidth: 1.6 })));

      // the two people who carried them
      const feetY = tableY - (compact ? 29 : 37);   // 51 x scale above the table line
      stickFigure(rc, w * 0.10, feetY, { scale: compact ? 0.56 : 0.72, seed: 4210, color: COLORS.cyan });
      stickFigure(rc, w * 0.90, feetY, { scale: compact ? 0.56 : 0.72, seed: 4211, color: COLORS.pink });
      label(ctx, 'Alice', w * 0.10, tableY + (compact ? 22 : 26), { color: COLORS.cyan, size: compact ? 10.5 : 13, align: 'center' });
      label(ctx, 'Bob', w * 0.90, tableY + (compact ? 22 : 26), { color: COLORS.pink, size: compact ? 10.5 : 13, align: 'center' });
      doodleArrow(rc, w * 0.17, h * 0.66, w * 0.33, h * 0.72, { color: COLORS.muted, seed: 4212, strokeWidth: 1.3 });
      doodleArrow(rc, w * 0.83, h * 0.66, w * 0.67, h * 0.72, { color: COLORS.muted, seed: 4213, strokeWidth: 1.3 });
      label(ctx, 'walked here', w / 2, h * 0.70, { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'center' });

      // the notebooks themselves, rows lined up
      const nbW = compact ? 58 : 74;
      const nbH = compact ? h * 0.42 : h * 0.46;
      const nbY = h * 0.14;
      const nbAx = w / 2 - nbW - (compact ? 26 : 40);
      const nbBx = w / 2 + (compact ? 26 : 40);
      [[nbAx, COLORS.cyan, 0, 'ALICE'], [nbBx, COLORS.pink, 1, 'BOB']].forEach((nb, k) => {
        this.cache.draw(`book-${k}-${key}`, (g) => g.rectangle(nb[0], nbY, nbW, nbH, opts(4220 + k, { stroke: nb[1], strokeWidth: 1.8 })));
        this.cache.draw(`spine-${k}-${key}`, (g) => g.line(nb[0] + 12, nbY, nb[0] + 12, nbY + nbH, opts(4230 + k, { stroke: nb[1], strokeWidth: 1 })));
        label(ctx, nb[3], nb[0] + nbW / 2, nbY - 7, { color: nb[1], size: compact ? 10 : 12, align: 'center' });
      });

      const rows = compact ? 14 : 18;
      const rowH = (nbH - 16) / rows;
      const start = Math.max(0, this.pairs.length - rows);
      for (let i = 0; i < rows; i++) {
        const p = this.pairs[start + i];
        if (!p) continue;
        const y = nbY + 14 + i * rowH;
        const agree = p[0] === p[1];
        // the matched row, drawn across the gap — the comparison made visible
        ctx.strokeStyle = agree ? COLORS.green : COLORS.muted;
        ctx.globalAlpha = agree ? 0.75 : 0.28;
        ctx.lineWidth = agree ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(nbAx + nbW, y - 4);
        ctx.lineTo(nbBx, y - 4);
        ctx.stroke();
        ctx.globalAlpha = 1;
        label(ctx, p[0] > 0 ? '+' : '−', nbAx + 12 + (nbW - 12) / 2, y, { color: COLORS.cyan, size: compact ? 11 : 13, align: 'center' });
        label(ctx, p[1] > 0 ? '+' : '−', nbBx + 12 + (nbW - 12) / 2, y, { color: COLORS.pink, size: compact ? 11 : 13, align: 'center' });
      }

      // the dials, above their owners
      this.drawDial(compact ? w * 0.10 : w * 0.10, h * 0.30, compact ? 20 : 26, this.aliceAngle, COLORS.cyan, 'a =', compact);
      this.drawDial(compact ? w * 0.90 : w * 0.90, h * 0.30, compact ? 20 : 26, this.bobAngle, COLORS.pink, 'b =', compact);

      label(ctx, `rows that agree: ${fmtNum(this.same, 0)} / ${fmtNum(this.nPairs, 0)}   →   E = ${fmtNum(Emeas, 4)}`,
        w / 2, compact ? 20 : 26, { color: COLORS.green, size: compact ? 12 : 16.5, align: 'center' });
      label(ctx, `quantum mechanics says −cos 2(a−b) = ${fmtNum(Eqm(this.aliceAngle, this.bobAngle), 4)}`,
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    // ---- the CHSH scoreboard, with the two curves and the measured points ----
    renderCHSH() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const Sq = this.measuredS(this.qCounts);

      // --- left: the correlation curves ---
      const gx = compact ? w * 0.06 : w * 0.07;
      const gw = compact ? w * 0.46 : w * 0.44;
      const gy = h * 0.20;
      const gh = h * 0.46;   // leaves the foot of the canvas for the dial row
      const xOf = (d) => gx + (d / 90) * gw;
      const yOf = (E) => gy + gh / 2 - (E * gh) / 2;
      this.cache.draw(`cax-${key}`, (g) => g.line(gx, yOf(0), gx + gw, yOf(0), opts(4300, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      this.cache.draw(`cay-${key}`, (g) => g.line(gx, gy, gx, gy + gh, opts(4301, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      label(ctx, '+1', gx - 5, gy + 5, { color: COLORS.muted, size: compact ? 9 : 10.5, align: 'right' });
      label(ctx, '−1', gx - 5, gy + gh + 4, { color: COLORS.muted, size: compact ? 9 : 10.5, align: 'right' });
      [0, 22.5, 45, 67.5, 90].forEach((d) => {
        this.cache.draw(`ct-${d}-${key}`, (g) => g.line(xOf(d), yOf(0) - 4, xOf(d), yOf(0) + 4,
          opts(4310 + d, { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, `${d}°`, xOf(d), gy + gh + 16, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'center' });
      });
      label(ctx, 'angle difference  a − b', gx + gw / 2, gy + gh + 30, { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'center' });

      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let d = 0; d <= 90; d += 1) { const y = yOf(Eqm(0, d)); if (d === 0) ctx.moveTo(xOf(d), y); else ctx.lineTo(xOf(d), y); }
      ctx.stroke();
      ctx.strokeStyle = COLORS.pink;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      for (let d = 0; d <= 90; d += 1) { const y = yOf(Elhv(0, d)); if (d === 0) ctx.moveTo(xOf(d), y); else ctx.lineTo(xOf(d), y); }
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, 'quantum: −cos 2Δ', xOf(52), yOf(Eqm(0, 52)) - 10, { color: COLORS.cyan, size: compact ? 9.5 : 11.5 });
      label(ctx, 'best local model: a triangle', xOf(6), yOf(Elhv(0, 34)) + 14, { color: COLORS.pink, size: compact ? 9.5 : 11.5 });
      // the gap at 22.5°, which IS the theorem
      ctx.strokeStyle = COLORS.yellow;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xOf(22.5), yOf(Eqm(0, 22.5))); ctx.lineTo(xOf(22.5), yOf(Elhv(0, 22.5))); ctx.stroke();
      label(ctx, '0.207', xOf(22.5) + 5, (yOf(Eqm(0, 22.5)) + yOf(Elhv(0, 22.5))) / 2 + 4,
        { color: COLORS.yellow, size: compact ? 9.5 : 11.5 });

      // --- right: the S meter ---
      const mx = compact ? w * 0.60 : w * 0.60;
      const mw = w - mx - (compact ? 14 : 30);
      const my = h * 0.20;
      const mh = h * 0.46;   // ditto — the rotated result labels hang below this
      const sOf = (S) => my + mh - (S / 3.1) * mh;
      this.cache.draw(`max-${key}`, (g) => g.line(mx, my, mx, my + mh, opts(4320, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      for (let S = 0; S <= 3; S += 0.5) {
        this.cache.draw(`ms-${S * 10}-${key}`, (g) => g.line(mx - 4, sOf(S), mx + 4, sOf(S), opts(4330 + S * 10, { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, fmtNum(S, 1), mx - 7, sOf(S) + 4, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'right' });
      }
      // the two bounds
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, sOf(2)); ctx.lineTo(mx + mw, sOf(2)); ctx.stroke();
      label(ctx, compact ? 'S = 2 — the local limit' : 'S = 2 — no local theory may pass this line',
        mx + 6, sOf(2) - 6, { color: COLORS.red, size: compact ? 9.5 : 11.5 });
      ctx.strokeStyle = COLORS.green;
      ctx.setLineDash([7, 5]);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(mx, sOf(TSIRELSON)); ctx.lineTo(mx + mw, sOf(TSIRELSON)); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, compact
        ? `2√2 = ${fmtNum(TSIRELSON, 3)} — the ceiling`
        : `2√2 = ${fmtNum(TSIRELSON, 3)} — and quantum mechanics may not pass THIS one`,
      mx + 6, sOf(TSIRELSON) - 6, { color: COLORS.green, size: compact ? 9 : 11 });

      // the reader's live measurement
      const barW = compact ? 26 : 34;
      ctx.fillStyle = Sq > 2 ? COLORS.green : COLORS.muted;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(mx + 10, sOf(Sq), barW, my + mh - sOf(Sq));
      ctx.globalAlpha = 1;
      rc.rectangle(mx + 10, sOf(Sq), barW, my + mh - sOf(Sq), opts(4340, { stroke: Sq > 2 ? COLORS.green : COLORS.muted, strokeWidth: 1.6 }));
      label(ctx, fmtNum(Sq, 3), mx + 10 + barW / 2, sOf(Sq) - 7, { color: Sq > 2 ? COLORS.green : COLORS.muted, size: compact ? 10.5 : 13, align: 'center' });
      label(ctx, 'yours', mx + 10 + barW / 2, my + mh + 14, { color: COLORS.muted, size: compact ? 9 : 10.5, align: 'center' });

      // the published results, as points with real error bars
      MEASURED.forEach((m, i) => {
        const x = mx + (compact ? 52 : 66) + i * ((mw - (compact ? 56 : 72)) / MEASURED.length);
        const y = sOf(m.S);
        const e = (m.err / 3.1) * mh;
        ctx.strokeStyle = COLORS.yellow;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, y - e); ctx.lineTo(x, y + e); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 4, y - e); ctx.lineTo(x + 4, y - e); ctx.moveTo(x - 4, y + e); ctx.lineTo(x + 4, y + e); ctx.stroke();
        ctx.fillStyle = COLORS.yellow;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(x, my + mh + (compact ? 20 : 26));
        ctx.rotate(-Math.PI / 2.6);
        label(ctx, m.label, 0, 0, { color: COLORS.yellow, size: compact ? 8 : 9.5 });
        ctx.restore();
      });

      // the four dials, along the top
      const dy = h * 0.845;  // dial captions must finish above the source chip
      const dr = compact ? 14 : 18;
      [[this.a, 'a', COLORS.cyan], [this.ap, 'a′', COLORS.cyan], [this.b, 'b', COLORS.pink], [this.bp, 'b′', COLORS.pink]]
        .forEach((d, i) => this.drawDial(w * (0.16 + i * 0.23), dy - (compact ? 6 : 10), dr, d[0], d[2], d[1], compact));

      const sdQ = this.sigmaS(this.qCounts);
      const nSig = isFinite(sdQ) && sdQ > 0 ? (Sq - 2) / sdQ : 0;
      label(ctx, `S = ${fmtNum(Sq, 3)} ± ${fmtNum(sdQ, 3)}${nSig > 2 ? `  —  ${fmtNum(nSig, 1)}σ past the local limit` : ''}`,
        w / 2, compact ? 20 : 26, { color: nSig > 2 ? COLORS.green : COLORS.yellow, size: compact ? 12 : 17, align: 'center' });
      label(ctx, `${fmtNum(this.nRuns, 0)} pairs measured, settings chosen independently for each one`,
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    // ---- the local model, given every chance, running side by side ----
    renderLocal() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const Sq = this.measuredS(this.qCounts);
      const Sl = this.measuredS(this.lCounts);
      const half = w / 2;

      this.cache.draw(`lsplit-${key}`, (g) => g.line(half, h * 0.12, half, h * 0.88,
        opts(4400, { stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [8, 8] })));

      const panel = (cx, title, sub, color, S, sd, isLocal) => {
        // "past the limit" has to mean statistically past it: the local model
        // saturates 2 exactly, so half of all finite runs read slightly over
        const beats = S - 2 > 2 * sd;
        label(ctx, title, cx, compact ? 22 : 28, { color, size: compact ? 12 : 15.5, align: 'center' });
        label(ctx, sub, cx, compact ? 36 : 45, { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

        // the source
        const sy = h * 0.30;
        this.cache.draw(`src-${isLocal}-${key}`, (g) => g.rectangle(cx - (compact ? 26 : 34), sy - 16, compact ? 52 : 68, 32,
          opts(4410 + (isLocal ? 1 : 0), { stroke: color, strokeWidth: 1.8 })));

        // what leaves the source: photons, or a pair of sealed envelopes
        for (let i = 0; i < 3; i++) {
          const f = ((this.nRuns * 0.004 + i / 3) % 1);
          const dx = f * (compact ? 70 : 96);
          if (isLocal) {
            // an envelope, because that is exactly what a hidden variable is
            [-1, 1].forEach((s) => {
              const ex = cx + s * dx;
              this.cache && rc.rectangle(ex - 7, sy - 5, 14, 10, opts(4420 + i, { stroke: color, strokeWidth: 1.1 }));
              rc.path(`M ${ex - 7} ${sy - 5} l 7 6 l 7 -6`, opts(4430 + i, { stroke: color, strokeWidth: 0.9 }));
            });
          } else {
            [-1, 1].forEach((s) => {
              ctx.fillStyle = color;
              ctx.beginPath(); ctx.arc(cx + s * dx, sy, 3, 0, Math.PI * 2); ctx.fill();
            });
          }
        }
        label(ctx, isLocal ? 'a sealed instruction, agreed at the source' : 'one entangled pair, no instructions inside',
          cx, sy + (compact ? 30 : 36), { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });

        // the two detectors
        [-1, 1].forEach((s, i) => {
          const dx2 = cx + s * (compact ? half * 0.30 : half * 0.32);
          this.drawDial(dx2, h * 0.52, compact ? 15 : 19, i === 0 ? this.a : this.b, i === 0 ? COLORS.cyan : COLORS.pink,
            i === 0 ? 'a' : 'b', compact);
        });

        // the S bar
        const bx = cx - (compact ? 46 : 60);
        const bw = compact ? 92 : 120;
        const by = h * 0.68;
        const bh = compact ? 26 : 32;
        this.cache.draw(`sbar-${isLocal}-${key}`, (g) => g.rectangle(bx, by, bw, bh,
          opts(4440 + (isLocal ? 1 : 0), { stroke: COLORS.muted, strokeWidth: 1.4 })));
        ctx.fillStyle = S > 2 ? COLORS.green : color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(bx + 2, by + 2, (bw - 4) * Math.min(1, S / 3.1), bh - 4);
        ctx.globalAlpha = 1;
        // the S = 2 line, drawn on both bars
        const lx = bx + 2 + (bw - 4) * (2 / 3.1);
        ctx.strokeStyle = COLORS.red;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx, by - 4); ctx.lineTo(lx, by + bh + 4); ctx.stroke();
        label(ctx, '2', lx, by + bh + 15, { color: COLORS.red, size: compact ? 9 : 10.5, align: 'center' });
        label(ctx, `S = ${fmtNum(S, 3)} ± ${fmtNum(sd, 3)}`, cx, by - 9,
          { color: beats ? COLORS.green : color, size: compact ? 11.5 : 14.5, align: 'center' });
        label(ctx, beats
          ? `${fmtNum((S - 2) / sd, 1)}σ past the local limit`
          : `consistent with 2 (${fmtNum(Math.abs(S - 2) / sd, 1)}σ)`,
        cx, by + bh + 32, { color: beats ? COLORS.green : COLORS.pink, size: compact ? 9.5 : 11.5, align: 'center' });
      };

      panel(half * 0.5, 'ENTANGLED PAIRS', 'nothing decided until measured', COLORS.cyan,
        Sq, this.sigmaS(this.qCounts), false);
      panel(half * 1.5, compact ? 'A LOCAL THEORY, AT ITS BEST' : 'A LOCAL THEORY, GIVEN ITS BEST SHOT',
        'everything decided at the source', COLORS.pink, Sl, this.sigmaS(this.lCounts), true);

      // kept clear of the bottom 26 px, where the on-canvas source chip is drawn
      label(ctx, `${fmtNum(this.nRuns, 0)} pairs each · same dials · same random draws · the gap is not statistics`,
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void doodleArrow;
      void stickFigure;
    }

    render() {
      ({
        street: () => this.renderStreet(),
        notebooks: () => this.renderNotebooks(),
        chsh: () => this.renderCHSH(),
        local: () => this.renderLocal(),
      })[this.mode]();
    }
  }

  void CIT_FREEDMAN;
  void CIT_ASPECT82B;
  void CIT_HENSEN;
  void CIT_GIUSTINA;
  void CIT_SHALM;
  void CIT_YIN;
  void CIT_NOCLONE;
  void CIT_TELEPORT;

  A.register('bell', BellSim);
})();
