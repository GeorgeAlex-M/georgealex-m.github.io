// Sim 29 — Absolute zero, and the motion that will not stop
//
// Two claims here, and both are measurements rather than arguments.
//
// FIRST: you can get extraordinarily close to absolute zero and never reach it.
// The ladder in panel 1 is real hardware with real numbers — liquid nitrogen at
// 77 K, liquid helium at 4.2 K, a pumped helium bath at 1 K, a dilution
// refrigerator at 2 mK, laser cooling at microkelvin, evaporative cooling to the
// 170 nK where the first Bose–Einstein condensate appeared in 1995, and the
// current record of about 38 pK in a drop tower. Each stage removes a FRACTION
// of what is left, which is why the ladder has no last rung.
//
// SECOND, and this is the one worth the section: at the bottom the motion does
// not stop. That is not an interpretation, and the decisive evidence is not
// subtle — it is that HELIUM WILL NOT FREEZE. Cool any other substance and it
// solidifies. Cool helium at ordinary pressure to any temperature you like,
// including zero, and it stays liquid; you have to squeeze it to about 25
// atmospheres to force it solid. The reason is that its zero-point motion is
// comparable to the strength of the bond holding it, and the code computes
// exactly that comparison with the de Boer quantum parameter
//     Λ = h / (σ √(m ε))
// which comes out 2.68 for helium-4 and 0.19 for argon — a factor of fourteen,
// and the reason helium alone is a quantum liquid. Those values reproduce the
// published ones (He 2.67, Ne 0.59, Ar 0.19, Kr 0.10, Xe 0.06).
//
// PANEL 3 is the other measurement, and it is a beauty: the Lamb shift. In 1947
// Lamb and Retherford found that two hydrogen levels which Dirac's equation says
// must have identical energy are in fact split by 1057.8 MHz. Nothing in the
// atom does that. What does it is the atom's coupling to a vacuum that is not
// empty. It is a microwave measurement of restless nothing, and it is the
// experiment that started modern quantum electrodynamics.
//
// The honest boundary, which panel 4 states: none of this shows that empty space
// contains a vast reservoir of usable energy. The measured quantities are
// DIFFERENCES — a shift, a pressure, a phase boundary. Nothing here licenses the
// "zero-point energy device", and the section says so with the number attached:
// the cosmological constant problem is the gap between the naive vacuum-energy
// estimate and the measured value, and it is the worst prediction in physics.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    sci, fmtNum, K_B, HBAR,
  } = A;

  const H_PL = 6.62607015e-34;
  const AMU = 1.66053906660e-27;
  const E_CH = 1.602176634e-19;

  const CIT_NERNST = '1906 Nernst - Über die Berechnung chemischer Gleichgewichte aus thermischen Messungen (On the Calculation of Chemical Equilibria from Thermal Measurements)';
  const CIT_EINSTEIN_STERN = '1913 Einstein, Stern - Einige Argumente für die Annahme einer molekularen Agitation beim absoluten Nullpunkt (Some Arguments for the Assumption of Molecular Agitation at Absolute Zero)';
  const CIT_KAMERLINGH = '1911 Kamerlingh Onnes - The Superconductivity of Mercury';
  const CIT_LAMB = '1947 Lamb, Retherford - Fine Structure of the Hydrogen Atom by a Microwave Method';
  const CIT_BETHE = '1947 Bethe - The Electromagnetic Shift of Energy Levels';
  const CIT_KEESOM = '1926 Keesom - Solid Helium';
  const CIT_LONDON = '1938 London - The λ-Phenomenon of Liquid Helium and the Bose-Einstein Degeneracy';
  const CIT_ANDERSON = '1995 Anderson, Ensher, Matthews, Wieman, Cornell - Observation of Bose-Einstein Condensation in a Dilute Atomic Vapor';
  const CIT_DAVIS = '1995 Davis, Mewes, Andrews, van Druten, Durfee, Kurn, Ketterle - Bose-Einstein Condensation in a Gas of Sodium Atoms';
  const CIT_LEANHARDT = '2003 Leanhardt, Pasquini, Saba, Schirotzek, Shin, Kielpinski, Pritchard, Ketterle - Cooling Bose-Einstein Condensates Below 500 Picokelvin';
  const CIT_DEPPNER = '2021 Deppner et al. - Collective-Mode Enhanced Matter-Wave Optics';

  // The cooling ladder. Every rung is a real technique with a real temperature.
  const LADDER = [
    { T: 293, name: 'this room', how: 'nothing at all', color: '#ffa94d' },
    { T: 195, name: 'dry ice', how: 'solid CO₂ subliming', color: '#ffa94d' },
    { T: 77, name: 'liquid nitrogen', how: 'boils in an open dewar — cheaper than milk', color: '#ffd43b' },
    { T: 4.2, name: 'liquid helium', how: 'Kamerlingh Onnes, 1908 — the last gas to give in', color: '#04d9ff' },
    { T: 1.0, name: 'pumped helium', how: 'suck the vapour off and the bath cools itself', color: '#04d9ff' },
    { T: 2e-3, name: 'dilution fridge', how: '³He dissolving into ⁴He — the workhorse of quantum computing', color: '#69db7c' },
    { T: 1e-6, name: 'laser cooling', how: 'photons hitting an atom only when it moves toward the beam', color: '#f783ac' },
    { T: 1.7e-7, name: 'the first BEC, 1995', how: 'evaporative cooling — let the hottest atoms escape', color: '#f783ac' },
    { T: 4.5e-10, name: 'MIT, 2003', how: '450 picokelvin', color: '#ff8787' },
    { T: 3.8e-11, name: 'drop tower, 2021', how: '38 picokelvin, in free fall so gravity does not spoil it', color: '#ff8787' },
  ];

  // Lennard-Jones parameters for the noble gases. These are the standard
  // tabulated values; the de Boer parameter computed from them reproduces the
  // published Λ to two decimals, which is a good check on both.
  const NOBLE = [
    { name: 'helium-4', A: 4.0026, sigma: 2.556, epsK: 10.22, color: '#04d9ff', liquidAt0: true },
    { name: 'neon', A: 20.180, sigma: 2.749, epsK: 35.6, color: '#69db7c', liquidAt0: false },
    { name: 'argon', A: 39.948, sigma: 3.405, epsK: 119.8, color: '#ffd43b', liquidAt0: false },
    { name: 'krypton', A: 83.798, sigma: 3.60, epsK: 171.0, color: '#ffa94d', liquidAt0: false },
    { name: 'xenon', A: 131.293, sigma: 4.10, epsK: 221.0, color: '#f783ac', liquidAt0: false },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // de Boer's quantum parameter: the ratio of the zero-point wavelength to the
  // size of the potential well. Λ ≳ 1 means the substance cannot be treated as
  // classical balls, whatever you do to it.
  function deBoer(Aamu, sigmaAng, epsK) {
    const m = Aamu * AMU;
    const sig = sigmaAng * 1e-10;
    const eps = epsK * K_B;
    return H_PL / (sig * Math.sqrt(m * eps));
  }

  class AbsoluteZeroSim extends Sim {
    init() {
      this.mode = 'ladder';
      this.logT = Math.log10(293);
      this.gasIdx = 0;
      this.simT = 0;
      this.rng = mulberry32(19471201);
      this.buildControls();
      this.updateReadout();
    }

    get tempK() { return 10 ** this.logT; }
    get gas() { return NOBLE[this.gasIdx]; }

    // Thermal energy against the zero-point energy of the same oscillator.
    // Below the crossover the mode is in its ground state and cooling further
    // takes nothing more out of it — which is what "the motion does not stop" means.
    modeNumbers(freqTHz) {
      const omega = 2 * Math.PI * freqTHz * 1e12;
      const E0 = 0.5 * HBAR * omega;                 // zero-point energy
      const kT = K_B * this.tempK;
      // Planck occupation
      const x = (HBAR * omega) / kT;
      const nBar = x > 700 ? 0 : 1 / (Math.exp(x) - 1);
      const Etot = E0 + nBar * HBAR * omega;
      return { omega, E0, kT, nBar, Etot, E0K: E0 / K_B, frozen: nBar < 0.01 };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'how cold can you get?', value: 'ladder' },
        { label: 'the helium that will not freeze', value: 'helium' },
        { label: 'the Lamb shift', value: 'lamb' },
        { label: 'what zero-point energy is NOT', value: 'limits' },
      ], { initial: 'ladder', onSelect: (v) => this.setMode(v) });

      this.tempSlider = slider(c, {
        label: 'temperature',
        min: -11, max: 2.6, step: 0.01, value: this.logT,
        format: (v) => {
          const T = 10 ** v;
          const rung = LADDER.slice().sort((a, b) => Math.abs(Math.log10(a.T) - v) - Math.abs(Math.log10(b.T) - v))[0];
          return `${T >= 1 ? `${fmtNum(T, T > 10 ? 0 : 2)} K` : sci(T, 2) + ' K'}  —  around ${rung.name}`;
        },
        oninput: (v) => {
          this.logT = v;
          if (v < -6 && !this._citedBEC) { this._citedBEC = true; this.cite(CIT_ANDERSON); }
          this.updateReadout();
          this.poke();
        },
      });

      this.gasBtns = buttonRow(c, NOBLE.map((g) => ({ label: g.name, value: g.name })), {
        initial: 'helium-4',
        onSelect: (v) => {
          this.gasIdx = NOBLE.findIndex((g) => g.name === v);
          if (!this._citedK) { this._citedK = true; this.cite(CIT_KEESOM); }
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.setMode('ladder');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.tempSlider, v === 'ladder' || v === 'limits');
      show(this.gasBtns, v === 'helium');
      if (v === 'ladder') this.cite(CIT_KAMERLINGH);
      if (v === 'helium') this.cite(CIT_KEESOM);
      if (v === 'lamb') this.cite(CIT_LAMB);
      if (v === 'limits') this.cite(CIT_EINSTEIN_STERN);
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    update(dt) { this.simT += dt; }

    /* ---------------- readouts ---------------- */

    updateReadout() {
      const f = {
        ladder: () => this.ladderReadout(),
        helium: () => this.heliumReadout(),
        lamb: () => this.lambReadout(),
        limits: () => this.limitsReadout(),
      }[this.mode];
      if (f) f();
    }

    ladderReadout() {
      const T = this.tempK;
      const m = this.modeNumbers(1);
      setReadout(this.readoutEl, [
        [
          ['T = ', null], [T >= 1 ? `${fmtNum(T, T > 10 ? 1 : 3)} K` : `${sci(T, 3)} K`, 'cyan'],
          ['   ·   thermal energy kT = ', null], [`${sci(K_B * T, 3)} J`, 'muted'],
          ['   ·   for a 1 THz vibration the average occupation is ', null],
          [m.nBar < 1e-3 ? sci(m.nBar, 2) : fmtNum(m.nBar, 3), m.frozen ? 'pink' : 'green'],
          [m.frozen ? ' — that mode is in its ground state and cooling further takes nothing more out of it.' : ' quanta.', null],
        ],
        [
          ['Every rung on this ladder is real hardware. ', 'yellow'],
          ['Liquid nitrogen at 77 K boils away in an open dewar and costs less than milk. Liquid helium at 4.2 K was the last gas anyone managed to condense — Kamerlingh Onnes did it in 1908, and three years later, poking at what else happens down there, discovered superconductivity by accident. A dilution refrigerator reaches a few millikelvin and is the reason quantum computers exist as objects rather than papers.', null],
        ],
        [
          ['Then the trick changes completely. ', 'yellow'],
          ['Below about a millikelvin you stop using cold things and start using light: laser cooling hits an atom with photons only when it happens to be moving toward the beam, so every absorption slows it down. Evaporative cooling then does what a cup of tea does — lets the fastest atoms escape and leaves the average lower. That is how Cornell, Wieman and Ketterle reached 170 nanokelvin in 1995 and made the first Bose–Einstein condensate.', null],
        ],
        [
          ['The record stands at about 38 picokelvin, set in a drop tower in 2021. ', 'cyan'],
          ['They had to do it in free fall, because at that temperature the atoms are so slow that simply falling under gravity ruins the measurement. Thirty-eight trillionths of a degree above absolute zero — and still not zero.', null],
        ],
        [
          ['That is not a technology problem. ', 'orange'],
          ['Every method removes a FRACTION of the heat that is left, so the ladder has no last rung: halving something forever never reaches nothing. Nernst turned that into the third law of thermodynamics in 1906 — absolute zero is unattainable in a finite number of steps — and no one has found a way round it in a century of trying.', null],
        ],
      ]);
    }

    heliumReadout() {
      const g = this.gas;
      const lam = deBoer(g.A, g.sigma, g.epsK);
      const rows = NOBLE.map((n) => `${n.name} ${fmtNum(deBoer(n.A, n.sigma, n.epsK), 2)}`).join('   ·   ');
      setReadout(this.readoutEl, [
        [
          [g.name, 'yellow'], [': mass ', null], [`${fmtNum(g.A, 3)} amu`, null],
          [', well depth ε/k = ', null], [`${fmtNum(g.epsK, 1)} K`, null],
          [', spacing σ = ', null], [`${fmtNum(g.sigma, 3)} Å`, null],
          ['   →   de Boer parameter Λ = h/σ√(mε) = ', null],
          [`${fmtNum(lam, 3)}`, lam > 1 ? 'pink' : 'green'],
        ],
        [
          ['Here is the experiment, and it needs no interpretation at all. ', 'yellow'],
          ['Take any substance and cool it: it freezes. Take helium and cool it at ordinary pressure to 4 K, to 1 K, to a millikelvin, to as close to absolute zero as anyone has ever reached — and it is ', null],
          ['still a liquid', 'cyan'],
          ['. It has never been observed to solidify at atmospheric pressure, and it never will. To make solid helium you must squeeze it to about 25 atmospheres, which Keesom first managed in 1926.', null],
        ],
        [
          ['Classical physics has nothing to say about this. ', 'orange'],
          ['At zero temperature a classical atom has zero kinetic energy, so any attraction at all — however feeble — must eventually pull the atoms into a lattice. A liquid at absolute zero is not a curiosity in the classical picture; it is a contradiction.', null],
        ],
        [
          ['What resolves it is that the atoms are still moving, and the code puts a number on how much. ', 'green'],
          ['Confine an atom to the spacing between its neighbours and quantum mechanics forces a minimum kinetic energy on it — zero-point motion. The de Boer parameter is precisely the ratio of that motion to the depth of the well trying to hold the atom still. Above about 1, the atom shakes itself out of the well no matter how cold you make it.', null],
        ],
        [
          ['And the numbers are not close. ', 'yellow'], [rows, 'cyan'],
          ['. Helium is 2.68; argon is 0.19. A factor of fourteen, and it lands exactly where the experiment does — helium is the one that stays liquid, and every other noble gas freezes. The parameter was not tuned to say that. It is computed from mass, spacing and bond strength, all measured independently.', null],
        ],
        [
          ['The same zero-point motion has a second observable consequence, in case one is not enough. ', 'orange'],
          ['Shine X-rays at a crystal at the lowest temperature you can reach and the diffraction spots are still blurred by atomic vibration — the Debye–Waller factor does not go to zero as T does. The atoms in a cold crystal are not at rest either. They are merely as still as it is possible to be, which is not the same thing.', null],
        ],
      ]);
    }

    lambReadout() {
      const dE = H_PL * 1057.8e6;
      setReadout(this.readoutEl, [
        [
          ['the measurement: ', null], ['1057.8 MHz', 'yellow'],
          [' between two levels that ought to be identical  =  ', null], [`${sci(dE, 3)} J`, 'muted'],
          ['  =  ', null], [`${sci(dE / E_CH, 3)} eV`, 'cyan'],
          ['  —  about four millionths of an electronvolt.', null],
        ],
        [
          ['Dirac\'s equation is very precise about this, which is what makes the result so sharp. ', 'yellow'],
          ['In hydrogen, the 2S₁/₂ and 2P₁/₂ states have different shapes and different angular momenta, and the theory says they must nonetheless have ', null],
          ['exactly the same energy', 'cyan'],
          ['. Not approximately. Exactly. In 1947 Willis Lamb and Robert Retherford built a microwave apparatus to check, and found the levels split by about a thousand megahertz.', null],
        ],
        [
          ['Nothing inside the atom accounts for it. ', 'orange'],
          ['What accounts for it is that the atom is not alone. It is coupled to the electromagnetic field, and that field is never quiet: even with no photons present it has irreducible fluctuations. The electron is jittered by them, smears out over a slightly larger region, and therefore feels the nucleus slightly differently depending on the shape of its orbital. The S state, which overlaps the nucleus, shifts; the P state, which does not, barely moves.', null],
        ],
        [
          ['Bethe calculated it on a train. ', 'yellow'],
          ['Days after hearing Lamb\'s result at the Shelter Island conference in June 1947, Hans Bethe did a non-relativistic estimate on the journey home and got about 1040 MHz against the measured 1057. That agreement is where modern quantum electrodynamics starts — the theory that now predicts the electron\'s magnetic moment to twelve significant figures and matches.', null],
        ],
        [
          ['So this is a microwave measurement of empty space. ', 'green'],
          ['Not an inference from a philosophical position: a frequency, read off an instrument, of a splitting that has no cause inside the atom. The vacuum has structure, and 1057.8 MHz is what it does to a hydrogen atom that happens to be sitting in it.', null],
        ],
      ]);
    }

    limitsReadout() {
      const T = this.tempK;
      const m = this.modeNumbers(1);
      setReadout(this.readoutEl, [
        [
          ['at T = ', null], [T >= 1 ? `${fmtNum(T, 2)} K` : `${sci(T, 2)} K`, 'cyan'],
          [' a 1 THz mode holds thermal energy ', null], [`${sci(m.nBar * HBAR * m.omega, 2)} J`, 'green'],
          [' on top of an unremovable zero-point ', null], [`${sci(m.E0, 3)} J`, 'pink'],
          [` (= ${fmtNum(m.E0K, 2)} K worth). Cool as far as you like: the pink number does not move.`, null],
        ],
        [
          ['Now the part this section exists to get right. ', 'yellow'],
          ['Everything on the previous three panels is measured, and none of it says that empty space is a reservoir of usable energy. Every quantity that has ever been measured is a ', null],
          ['DIFFERENCE', 'orange'],
          [': a shift between two levels, a change in force when you move two plates, a phase boundary that moves when you change the pressure. Differences are all the experiments give, and differences are all the theory predicts.', null],
        ],
        [
          ['The reason that matters is thermodynamics, not fashion. ', 'yellow'],
          ['Zero-point energy is by definition the energy of the GROUND state — the lowest state there is. Extracting energy from a system means moving it to a lower state, and there is no lower state. A "zero-point energy device" is a perpetual motion machine wearing a lab coat, and the argument against it is one line long.', null],
        ],
        [
          ['There is also an unresolved problem here, and it is worth stating because it is embarrassing. ', 'red'],
          ['If you take the vacuum\'s zero-point energy literally and add up the contributions, you get a vacuum energy density that disagrees with the measured cosmological constant by something like 120 orders of magnitude — the worst quantitative prediction in the history of physics. Whatever the vacuum energy really is, the naive sum is not it, which is a strong hint against reading "space is full of energy" too literally.', null],
        ],
        [
          ['Even Einstein went off the idea. ', 'orange'],
          ['He and Otto Stern wrote one of the first papers proposing zero-point energy in 1913, and he abandoned the argument within about a year when the evidence he had built it on did not hold up. The concept survived anyway, because other evidence arrived — helium, the Lamb shift, the Casimir force in the next section — and that is the difference between a measured effect and a good story.', null],
        ],
      ]);
    }

    /* ================= drawing ================= */

    // ---- 1: the cooling ladder, as apparatus, on a log scale ----
    renderLadder() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const x0 = compact ? w * 0.30 : w * 0.26;
      const y0 = h * 0.14;
      const y1 = h * 0.86;
      const LO = -11;
      const HI = 2.6;
      const yOf = (T) => y0 + ((HI - Math.log10(T)) / (HI - LO)) * (y1 - y0);

      // the axis
      this.cache.draw(`ax-${key}`, (g) => g.line(x0, y0, x0, y1, opts(7000, { stroke: COLORS.muted, strokeWidth: 1.8 })));
      for (let e = 2; e >= -11; e -= 1) {
        const yy = yOf(10 ** e);
        this.cache.draw(`t-${e}-${key}`, (g) => g.line(x0 - 4, yy, x0 + 4, yy, opts(7010 + e + 12, { stroke: COLORS.muted, strokeWidth: 0.9 })));
      }
      label(ctx, 'hot', x0 - 8, y0 + 4, { color: COLORS.muted, size: compact ? 9 : 11, align: 'right' });
      label(ctx, 'cold', x0 - 8, y1, { color: COLORS.muted, size: compact ? 9 : 11, align: 'right' });

      // the rungs
      LADDER.forEach((L, i) => {
        const yy = yOf(L.T);
        ctx.fillStyle = L.color;
        ctx.beginPath(); ctx.arc(x0, yy, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = L.color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + (compact ? 10 : 16), yy); ctx.stroke();
        ctx.globalAlpha = 1;
        const tx = x0 + (compact ? 14 : 22);
        label(ctx, `${L.T >= 1 ? fmtNum(L.T, L.T > 10 ? 0 : 1) + ' K' : sci(L.T, 1) + ' K'}  ${L.name}`,
          tx, yy + 3.5, { color: L.color, size: compact ? 8.5 : 10.5 });
        if (!compact) label(ctx, L.how, tx + 190, yy + 3.5, { color: COLORS.muted, size: 9.5 });
        void i;
      });

      // where the reader's slider is
      const yy = yOf(this.tempK);
      ctx.strokeStyle = COLORS.yellow;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x0 - 22, yy); ctx.lineTo(w - (compact ? 8 : 18), yy); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, this.tempK >= 1 ? `${fmtNum(this.tempK, 2)} K` : `${sci(this.tempK, 2)} K`,
        x0 - 26, yy + 4, { color: COLORS.yellow, size: compact ? 9.5 : 12, align: 'right' });

      // the floor that cannot be reached, drawn as a floor
      const zeroY = y1 + (compact ? 8 : 12);
      this.cache.draw(`zero-${key}`, (g) => g.line(x0 - 30, zeroY, w - 10, zeroY, opts(7040, { stroke: COLORS.red, strokeWidth: 2.4 })));
      label(ctx, '0 K — never reached, and provably unreachable in finite steps', x0 - 30, zeroY + (compact ? 13 : 16),
        { color: COLORS.red, size: compact ? 9 : 11 });

      // the dewar, for the close-proximity anchor
      const dx = compact ? w * 0.12 : w * 0.11;
      const dy = h * 0.44;
      this.cache.draw(`dewar-${key}`, (g) => g.path(
        `M ${dx - 22} ${dy - 46} l 0 74 q 0 16 22 16 q 22 0 22 -16 l 0 -74 Z`,
        opts(7050, { stroke: COLORS.cyan, strokeWidth: 2 }),
      ));
      this.cache.draw(`dfill-${key}`, (g) => g.rectangle(dx - 19, dy + 2, 38, 40, opts(7051, {
        stroke: COLORS.cyan, strokeWidth: 1, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 6,
      })));
      for (let i = 0; i < 4; i++) {
        const p = ((this.simT * 0.5 + i * 0.25) % 1);
        ctx.strokeStyle = COLORS.muted;
        ctx.globalAlpha = 0.7 * (1 - p);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(dx - 10 + i * 7, dy - 46 - p * 26);
        ctx.lineTo(dx - 8 + i * 7, dy - 52 - p * 26);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      label(ctx, 'a dewar', dx, dy + 62, { color: COLORS.cyan, size: compact ? 9.5 : 11.5, align: 'center' });
      label(ctx, compact ? 'boiling at 77 K' : 'liquid nitrogen, boiling at 77 K', dx, dy + (compact ? 76 : 78),
        { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'center' });

      label(ctx, '38 picokelvin is the record — and it is still not zero',
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 11 : 15.5, align: 'center' });
      void rc;
      void doodleArrow;
      void stickFigure;
    }

    // ---- 2: the helium that will not freeze ----
    renderHelium() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;

      // two identical cryostats: everything else freezes, helium does not
      const cw = compact ? w * 0.19 : w * 0.17;
      const drawCell = (cx, name, solid, color) => {
        const cy = h * 0.42;
        const ch = compact ? h * 0.26 : h * 0.30;
        this.cache.draw(`cell-${name}-${key}`, (g) => g.rectangle(cx - cw / 2, cy - ch / 2, cw, ch,
          opts(7100 + name.length, { stroke: COLORS.ink, strokeWidth: 2 })));
        if (solid) {
          // a lattice: atoms locked in place
          for (let r = 0; r < 4; r++) {
            for (let c2 = 0; c2 < 4; c2++) {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(cx - cw / 2 + cw * (0.2 + c2 * 0.2), cy - ch / 2 + ch * (0.2 + r * 0.2), compact ? 3 : 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else {
          // a liquid: atoms still wandering, at absolute zero
          for (let i = 0; i < 16; i++) {
            const a = (i * 2.399963 + this.simT * 0.6) % (Math.PI * 2);
            const rr = 0.18 + ((i * 0.6180339887) % 1) * 0.62;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * rr * cw * 0.40, cy + Math.sin(a) * rr * ch * 0.40, compact ? 3 : 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        label(ctx, name, cx, cy - ch / 2 - (compact ? 10 : 13), { color, size: compact ? 10 : 12.5, align: 'center' });
        label(ctx, solid ? 'SOLID' : 'STILL LIQUID', cx, cy + ch / 2 + (compact ? 15 : 19),
          { color: solid ? COLORS.muted : COLORS.pink, size: compact ? 10 : 12.5, align: 'center' });
        return cy + ch / 2;
      };
      const yb = drawCell(compact ? w * 0.20 : w * 0.19, 'argon', true, COLORS.yellow);
      drawCell(compact ? w * 0.50 : w * 0.46, 'helium-4', false, COLORS.cyan);
      label(ctx, compact ? 'both at ~0 K, 1 atm' : 'both cooled to within a whisker of absolute zero, both at one atmosphere',
        compact ? w * 0.35 : w * 0.32, yb + (compact ? 34 : 42), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      // the pressure it takes to force helium solid
      const px = compact ? w * 0.50 : w * 0.46;
      doodleArrow(rc, px, h * 0.18, px, h * 0.26, { color: COLORS.orange, seed: 7110, strokeWidth: 1.6 });
      label(ctx, compact ? '25 atm to freeze it' : 'squeeze to 25 atmospheres and it finally freezes (Keesom, 1926)',
        px, h * 0.155, { color: COLORS.orange, size: compact ? 9 : 11, align: 'center' });

      // the de Boer bar chart — the quantitative reason
      const bx = compact ? w * 0.66 : w * 0.62;
      const bw = w - bx - (compact ? 10 : 24);
      const by = h * 0.20;
      const rowH = compact ? h * 0.10 : h * 0.11;
      const maxL = 3.0;
      NOBLE.forEach((n, i) => {
        const lam = deBoer(n.A, n.sigma, n.epsK);
        const ry = by + i * rowH;
        label(ctx, n.name, bx, ry + (compact ? 9 : 11), { color: n.color, size: compact ? 8.5 : 10.5 });
        const barY = ry + (compact ? 13 : 16);
        this.cache.draw(`bar-${i}-${key}`, (g) => g.rectangle(bx, barY, bw, compact ? 9 : 11,
          opts(7120 + i, { stroke: COLORS.muted, strokeWidth: 1 })));
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(bx + 1, barY + 1, (bw - 2) * Math.min(1, lam / maxL), (compact ? 9 : 11) - 2);
        ctx.globalAlpha = 1;
        label(ctx, fmtNum(lam, 2), bx + bw + 4, barY + (compact ? 8 : 10), { color: n.color, size: compact ? 8.5 : 10.5, align: 'right' });
      });
      // the Λ = 1 line: above it, quantum wins
      const lx = bx + (bw - 2) * (1 / maxL);
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(lx, by + (compact ? 10 : 13)); ctx.lineTo(lx, by + rowH * NOBLE.length); ctx.stroke();
      label(ctx, 'Λ = 1', lx, by + rowH * NOBLE.length + (compact ? 12 : 15), { color: COLORS.red, size: compact ? 8.5 : 10.5, align: 'center' });
      label(ctx, 'de Boer parameter  Λ = h / σ√(mε)', bx, by - (compact ? 8 : 11), { color: COLORS.muted, size: compact ? 9 : 11 });

      label(ctx, 'cool anything else and it freezes. Helium does not.',
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10.5 : 15, align: 'center' });
      label(ctx, compact ? 'zero-point motion shakes it out of the well' : 'because its zero-point motion is comparable to the bond holding it — Λ = 2.68 against argon\'s 0.19',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    // ---- 3: the Lamb shift, as a microwave measurement ----
    renderLamb() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;

      // the two levels: Dirac says identical, the instrument says otherwise
      const lx = compact ? w * 0.26 : w * 0.28;
      const y2s = h * 0.36;
      const y2p = h * 0.46;
      const lw = compact ? w * 0.28 : w * 0.26;
      this.cache.draw(`lvl2s-${key}`, (g) => g.line(lx, y2s, lx + lw, y2s, opts(7200, { stroke: COLORS.cyan, strokeWidth: 2.4 })));
      this.cache.draw(`lvl2p-${key}`, (g) => g.line(lx, y2p, lx + lw, y2p, opts(7201, { stroke: COLORS.pink, strokeWidth: 2.4 })));
      label(ctx, '2S₁/₂', lx - 6, y2s + 4, { color: COLORS.cyan, size: compact ? 10 : 12.5, align: 'right' });
      label(ctx, '2P₁/₂', lx - 6, y2p + 4, { color: COLORS.pink, size: compact ? 10 : 12.5, align: 'right' });
      doodleArrow(rc, lx + lw + 14, y2s, lx + lw + 14, y2p, { color: COLORS.yellow, seed: 7210, strokeWidth: 1.6 });
      doodleArrow(rc, lx + lw + 14, y2p, lx + lw + 14, y2s, { color: COLORS.yellow, seed: 7211, strokeWidth: 1.6 });
      label(ctx, '1057.8 MHz', lx + lw + 22, (y2s + y2p) / 2 + 4, { color: COLORS.yellow, size: compact ? 10 : 13 });

      // what Dirac predicted, drawn as the single line it should have been
      const dy = h * 0.20;
      this.cache.draw(`dirac-${key}`, (g) => g.line(lx, dy, lx + lw, dy, opts(7220, { stroke: COLORS.muted, strokeWidth: 2, strokeLineDash: [6, 5] })));
      label(ctx, compact ? 'Dirac: one level' : 'Dirac 1928: these two must have EXACTLY the same energy',
        lx + lw / 2, dy - (compact ? 9 : 12), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      // the apparatus: an oven, a microwave cavity, a detector
      const ay = h * 0.72;
      this.cache.draw(`oven-${key}`, (g) => g.rectangle(w * 0.06, ay - 16, compact ? 40 : 52, 32,
        opts(7230, { stroke: COLORS.orange, strokeWidth: 1.8 })));
      label(ctx, compact ? 'H beam' : 'hydrogen beam', w * 0.06 + (compact ? 20 : 26), ay + (compact ? 28 : 32),
        { color: COLORS.orange, size: compact ? 8.5 : 10.5, align: 'center' });
      this.cache.draw(`cav-${key}`, (g) => g.rectangle(w * 0.30, ay - 22, compact ? 90 : 130, 44,
        opts(7231, { stroke: COLORS.cyan, strokeWidth: 2 })));
      label(ctx, compact ? 'microwave cavity' : 'tunable microwave cavity', w * 0.30 + (compact ? 45 : 65), ay + (compact ? 34 : 38),
        { color: COLORS.cyan, size: compact ? 8.5 : 10.5, align: 'center' });
      this.cache.draw(`det-${key}`, (g) => g.rectangle(w * 0.62, ay - 16, compact ? 38 : 48, 32,
        opts(7232, { stroke: COLORS.green, strokeWidth: 1.8 })));
      label(ctx, 'detector', w * 0.62 + (compact ? 19 : 24), ay + (compact ? 28 : 32),
        { color: COLORS.green, size: compact ? 8.5 : 10.5, align: 'center' });
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(w * 0.06 + (compact ? 40 : 52), ay); ctx.lineTo(w * 0.30, ay);
      ctx.moveTo(w * 0.30 + (compact ? 90 : 130), ay); ctx.lineTo(w * 0.62, ay);
      ctx.stroke();
      // the microwaves in the cavity
      ctx.strokeStyle = COLORS.yellow;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        const X = w * 0.30 + 8 + t * ((compact ? 90 : 130) - 16);
        const Y = ay + Math.sin(t * Math.PI * 6 + this.simT * 4) * 12;
        if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.stroke();

      // the resonance the instrument actually shows
      const rx = compact ? w * 0.72 : w * 0.70;
      const rw = w - rx - (compact ? 10 : 24);
      const ry = h * 0.24;
      const rh = h * 0.30;
      this.cache.draw(`rax-${key}`, (g) => g.line(rx, ry + rh, rx + rw, ry + rh, opts(7240, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      ctx.strokeStyle = COLORS.green;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const t = k / 60;
        const d = (t - 0.5) / 0.13;
        const Y = ry + rh - (1 / (1 + d * d)) * rh * 0.9;
        if (k === 0) ctx.moveTo(rx + t * rw, Y); else ctx.lineTo(rx + t * rw, Y);
      }
      ctx.stroke();
      label(ctx, '1057.8', rx + rw / 2, ry + rh + (compact ? 13 : 16), { color: COLORS.green, size: compact ? 8.5 : 10.5, align: 'center' });
      label(ctx, 'MHz', rx + rw / 2, ry + rh + (compact ? 24 : 29), { color: COLORS.muted, size: compact ? 8 : 10, align: 'center' });
      label(ctx, compact ? 'the resonance' : 'the resonance, where nothing should be', rx + rw / 2, ry - (compact ? 7 : 10),
        { color: COLORS.green, size: compact ? 8.5 : 10.5, align: 'center' });

      label(ctx, 'a microwave measurement of empty space', w / 2, compact ? 20 : 26,
        { color: COLORS.yellow, size: compact ? 11 : 15.5, align: 'center' });
      label(ctx, compact ? 'two levels that ought to be identical, are not' : 'two levels the theory says must be exactly equal, split by a thousand megahertz — Lamb & Retherford, 1947',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    // ---- 4: what this does and does not license ----
    renderLimits() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const m = this.modeNumbers(1);

      // an energy ladder for one oscillator, with the floor drawn as a floor
      const lx = compact ? w * 0.22 : w * 0.24;
      const lw = compact ? w * 0.34 : w * 0.30;
      const base = h * 0.74;
      const step = compact ? 26 : 32;
      for (let n = 0; n <= 4; n++) {
        const yy = base - n * step;
        const occupied = n <= m.nBar;
        this.cache.draw(`lev-${n}-${key}`, (g) => g.line(lx, yy, lx + lw, yy, opts(7300 + n, {
          stroke: n === 0 ? COLORS.pink : COLORS.muted, strokeWidth: n === 0 ? 2.6 : 1.4,
        })));
        label(ctx, `n = ${n}`, lx - 6, yy + 4, { color: n === 0 ? COLORS.pink : COLORS.muted, size: compact ? 9 : 11, align: 'right' });
        void occupied;
      }
      label(ctx, compact ? 'ground state — E₀ = ½ħω' : 'the ground state — E₀ = ½ħω, and there is nothing below it',
        lx + lw + 10, base + 4, { color: COLORS.pink, size: compact ? 9 : 11.5 });
      // the floor
      this.cache.draw(`floor-${key}`, (g) => g.rectangle(lx - 30, base + (compact ? 10 : 14), lw + 90, compact ? 16 : 20,
        opts(7320, { stroke: COLORS.red, strokeWidth: 1.6, fill: COLORS.red, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 6 })));
      label(ctx, 'no lower state exists — so there is nothing to extract',
        lx - 26, base + (compact ? 22 : 28), { color: COLORS.red, size: compact ? 8.5 : 10.5 });

      // the thermal quanta sitting on top, which DO come out as you cool
      if (m.nBar > 0.02) {
        ctx.fillStyle = COLORS.green;
        for (let i = 0; i < Math.min(4, Math.round(m.nBar) + 1); i++) {
          ctx.beginPath();
          ctx.arc(lx + lw * 0.5, base - (i + 1) * step, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        label(ctx, compact ? 'thermal — removable' : 'thermal quanta — these you CAN remove', lx + lw + 10, base - step * 1.2,
          { color: COLORS.green, size: compact ? 9 : 11 });
      }
      ctx.fillStyle = COLORS.pink;
      ctx.beginPath(); ctx.arc(lx + lw * 0.5, base, 4.4, 0, Math.PI * 2); ctx.fill();

      // the three claims, sorted
      const bx = compact ? w * 0.58 : w * 0.60;
      const bw = w - bx - (compact ? 10 : 24);
      const rows = [
        { t: 'MEASURED', c: COLORS.green, s: ['helium liquid at 0 K (Keesom 1926)', 'Lamb shift 1057.8 MHz (1947)', 'Casimir force (§30)'] },
        { t: 'NOT MEASURED, NOT PREDICTED', c: COLORS.red, s: ['usable energy drawn from the vacuum', 'any "zero-point energy device"'] },
        { t: 'OPEN AND EMBARRASSING', c: COLORS.orange, s: ['the naive vacuum energy misses the', 'measured cosmological constant by', 'some 120 orders of magnitude'] },
      ];
      let yy = h * 0.16;
      rows.forEach((r, i) => {
        const bh = (r.s.length + 1) * (compact ? 14 : 17) + 10;
        this.cache.draw(`bx-${i}-${key}`, (g) => g.rectangle(bx, yy, bw, bh, opts(7330 + i, { stroke: r.c, strokeWidth: 1.6 })));
        label(ctx, r.t, bx + 8, yy + (compact ? 15 : 18), { color: r.c, size: compact ? 9 : 11.5 });
        r.s.forEach((line, k) => {
          label(ctx, `· ${line}`, bx + 12, yy + (compact ? 29 : 36) + k * (compact ? 13 : 16), { color: COLORS.muted, size: compact ? 8 : 10 });
        });
        yy += bh + (compact ? 8 : 12);
      });

      label(ctx, `every measured quantity is a DIFFERENCE, never a total`,
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10.5 : 15, align: 'center' });
      label(ctx, compact ? 'the ground state has nothing below it' : 'extracting energy means moving to a lower state, and the ground state has none — the argument is one line long',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
      void doodleArrow;
    }

    render() {
      ({
        ladder: () => this.renderLadder(),
        helium: () => this.renderHelium(),
        lamb: () => this.renderLamb(),
        limits: () => this.renderLimits(),
      })[this.mode]();
    }
  }

  void CIT_NERNST; void CIT_BETHE; void CIT_LONDON; void CIT_DAVIS;
  void CIT_LEANHARDT; void CIT_DEPPNER;

  A.register('absoluteZero', AbsoluteZeroSim);
})();
