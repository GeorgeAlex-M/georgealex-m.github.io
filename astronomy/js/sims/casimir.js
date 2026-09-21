// Sim 30 — The Casimir effect: a force out of an empty gap
//
// Two flat mirrors, a vacuum between them, nothing else — and they pull together.
// Casimir worked it out in 1948 while thinking about why colloids behave oddly,
// and the answer is a formula with no free parameters at all:
//
//     F/A = π ħ c / (240 d⁴)
//
// No material constants. No fitting. Just ħ, c and the width of the gap. That is
// what makes it testable: get the separation right and the force is predicted to
// the last digit before you switch anything on.
//
// The numbers the code computes:
//     d =   10 nm  →  41.4 kPa   = 0.41 atmospheres
//     d =  100 nm  →   4.14 Pa
//     d = 1000 nm  →   0.41 mPa
// A d⁻⁴ law is brutal: ten times closer is ten thousand times harder. At 10 nm
// two mirrors are being squeezed together by roughly half the weight of the
// atmosphere, out of a gap containing nothing.
//
// PANEL 2 is the measurement. Sparnaay tried in 1958 and could only say the
// result was "not inconsistent" — his error bars were 100%. Lamoreaux did it
// properly in 1997 with a torsion pendulum and got 5% agreement; Mohideen and Roy
// followed in 1998 with an atomic force microscope and reached about 1% over
// 0.1–0.9 µm. Those are the points on the plot, and the curve through them has
// nothing adjustable in it.
//
// PANEL 3 is where it stops being exotic: this force wrecks microchips. In MEMS
// devices — the accelerometer in a phone, a micromirror in a projector — moving
// parts sit hundreds of nanometres apart, and at that range the Casimir force is
// strong enough to snap them permanently together. It is called stiction, it is a
// real engineering failure mode, and it is the most mundane possible proof that
// the effect exists.
//
// PANEL 4 is the honesty panel, and this section needs one. The Casimir effect is
// constantly sold as "proof that the vacuum is full of energy". It is not proof of
// that, and the reason is not philosophical: Schwinger derived the same force
// without ever mentioning zero-point energy, and Jaffe showed in 2005 that the
// whole result can be obtained as a relativistic van der Waals force between the
// charges in the plates, in a formulation where ħ appears but vacuum energy never
// does. The force is real and measured. The story usually told about WHY is one
// of several, and the section says so.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    sci, fmtNum, HBAR, C,
  } = A;

  const ATM = 101325;

  const CIT_CASIMIR = '1948 Casimir - On the attraction between two perfectly conducting plates';
  const CIT_CASIMIR_POLDER = '1948 Casimir, Polder - The Influence of Retardation on the London-van der Waals Forces';
  const CIT_SPARNAAY = '1958 Sparnaay - Measurements of attractive forces between flat plates';
  const CIT_LAMOREAUX = '1997 Lamoreaux - Demonstration of the Casimir Force in the 0.6 to 6 µm Range';
  const CIT_MOHIDEEN = '1998 Mohideen, Roy - Precision Measurement of the Casimir Force from 0.1 to 0.9 µm';
  const CIT_BRESSI = '2002 Bressi, Carugno, Onofrio, Ruoso - Measurement of the Casimir Force between Parallel Metallic Surfaces';
  const CIT_LIFSHITZ = '1956 Lifshitz - The Theory of Molecular Attractive Forces between Solids';
  const CIT_SCHWINGER = '1975 Schwinger, DeRaad, Milton - Casimir Effect in Dielectrics';
  const CIT_JAFFE = '2005 Jaffe - Casimir effect and the quantum vacuum';
  const CIT_BUKS = '2001 Buks, Roukes - Stiction, adhesion energy, and the Casimir effect in micromechanical systems';

  // The experiments, with the geometry each actually used.
  const MEASURED = [
    { y: 1958, who: 'Sparnaay', rig: 'parallel plates, spring balance', range: '0.5–2 µm', prec: 100, color: '#adb5bd',
      note: 'Error bars of 100%. His own conclusion was that the results were "not inconsistent" with Casimir — which is an honest way of saying he could not tell.' },
    { y: 1997, who: 'Lamoreaux', rig: 'torsion pendulum, sphere and plate', range: '0.6–6 µm', prec: 5, color: '#04d9ff',
      note: 'The first convincing measurement, agreeing with the prediction to about 5%. A torsion pendulum because the force is far too small for anything that has to be held.' },
    { y: 1998, who: 'Mohideen & Roy', rig: 'atomic force microscope', range: '0.1–0.9 µm', prec: 1, color: '#69db7c',
      note: 'An AFM cantilever with a metallised sphere on the tip, reaching about 1% — close enough that surface roughness and finite conductivity had to be corrected for.' },
    { y: 2002, who: 'Bressi et al.', rig: 'genuinely parallel plates, resonance shift', range: '0.5–3 µm', prec: 15, color: '#ffd43b',
      note: 'Back to Casimir\'s original flat-plate geometry, which is far harder to align but needs no proximity-force approximation to interpret.' },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The prediction, with nothing adjustable in it.
  const pressure = (d) => (Math.PI * HBAR * C) / (240 * d ** 4);
  // Sphere-plate, the geometry Lamoreaux and Mohideen actually used
  // (proximity force approximation).
  const spherePlateForce = (R, d) => (Math.PI ** 3 * HBAR * C * R) / (360 * d ** 3);

  class CasimirSim extends Sim {
    init() {
      this.mode = 'plates';
      this.dNM = 100;
      this.expIdx = 2;
      this.simT = 0;
      this.rng = mulberry32(19480501);
      this.buildControls();
      this.updateReadout();
    }

    get d() { return this.dNM * 1e-9; }
    get exp() { return MEASURED[this.expIdx]; }

    numbers() {
      const d = this.d;
      const P = pressure(d);
      // how many modes fit: the qualitative picture, made quantitative
      const longest = 2 * d;                     // longest standing wave that fits
      return {
        d,
        P,
        atm: P / ATM,
        // the force on a 1 cm² plate, which is a thing you can weigh
        F1cm2: P * 1e-4,
        gramsEquivalent: (P * 1e-4) / 9.80665 * 1000,
        longest,
        sphere: spherePlateForce(100e-6, d),
      };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'two mirrors and a gap', value: 'plates' },
        { label: 'the measurements', value: 'measured' },
        { label: 'it breaks microchips', value: 'mems' },
        { label: 'what it does NOT prove', value: 'honest' },
      ], { initial: 'plates', onSelect: (v) => this.setMode(v) });

      this.dSlider = slider(c, {
        label: 'gap between the mirrors',
        min: 5, max: 1000, value: this.dNM, log: true,
        format: (v) => {
          const P = pressure(v * 1e-9);
          return `${fmtNum(v, v < 100 ? 1 : 0)} nm  →  F/A = ${sci(P, 3)} Pa = ${sci(P / ATM, 2)} atmospheres`;
        },
        oninput: (v) => {
          this.dNM = v;
          if (!this._citedC) { this._citedC = true; this.cite(CIT_CASIMIR); }
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.expBtns = buttonRow(c, MEASURED.map((m) => ({ label: `${m.who} ${m.y}`, value: String(m.y) })), {
        initial: '1998',
        onSelect: (v) => {
          this.expIdx = MEASURED.findIndex((m) => String(m.y) === v);
          this.cite(this.expIdx === 1 ? CIT_LAMOREAUX : this.expIdx === 2 ? CIT_MOHIDEEN : CIT_SPARNAAY);
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.setMode('plates');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.dSlider, v === 'plates' || v === 'mems');
      show(this.expBtns, v === 'measured');
      if (v === 'plates') this.cite(CIT_CASIMIR);
      if (v === 'measured') this.cite(CIT_LAMOREAUX);
      if (v === 'mems') this.cite(CIT_BUKS);
      if (v === 'honest') this.cite(CIT_JAFFE);
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    update(dt) { this.simT += dt; }

    /* ---------------- readouts ---------------- */

    updateReadout() {
      const f = {
        plates: () => this.platesReadout(),
        measured: () => this.measuredReadout(),
        mems: () => this.memsReadout(),
        honest: () => this.honestReadout(),
      }[this.mode];
      if (f) f();
    }

    platesReadout() {
      const n = this.numbers();
      setReadout(this.readoutEl, [
        [
          ['gap ', null], [`${fmtNum(this.dNM, this.dNM < 100 ? 1 : 0)} nm`, 'yellow'],
          ['   →   F/A = πħc/240d⁴ = ', null], [`${sci(n.P, 4)} Pa`, 'pink'],
          ['  =  ', null], [`${sci(n.atm, 3)} atmospheres`, 'cyan'],
          ['   ·   on a 1 cm² mirror that is ', null], [`${sci(n.F1cm2, 2)} N`, 'green'],
          [`, the weight of ${sci(n.gramsEquivalent, 2)} grams.`, null],
        ],
        [
          ['Look at what is in that formula, and more importantly what is not. ', 'yellow'],
          ['There is ħ, there is c, there is the gap. There is no property of the metal, no fitting parameter, no adjustable anything. Casimir wrote it down in 1948 and the prediction was complete before anyone tried to measure it — which is the strongest position a theory can be in.', null],
        ],
        [
          ['The picture in the drawing is the usual one, and it is worth stating carefully. ', 'cyan'],
          ['Between the plates only certain wavelengths fit — the gap is a resonant cavity, and it excludes everything that will not close. Outside, all wavelengths are allowed. More field modes press inward than outward, and the mirrors are pushed together. Between two mirrors ', null],
          [`${fmtNum(this.dNM, 0)} nm`, 'yellow'], [' apart, the longest wave that fits is ', null],
          [`${fmtNum(n.longest * 1e9, 0)} nm`, 'cyan'], [' — every colour longer than that is simply not permitted in the gap.', null],
        ],
        [
          ['The d⁻⁴ is the reason this is hard and the reason it matters. ', 'orange'],
          ['Ten times closer is ten thousand times stronger. At a micron the force is a fraction of a millipascal and needs a torsion pendulum to see. At ten nanometres it is ', null],
          [`${sci(pressure(1e-8) / ATM, 2)} atmospheres`, 'red'],
          [' — comparable to squeezing the mirrors in a vice, produced by a gap with nothing in it.', null],
        ],
        [
          ['One thing the picture above gets slightly wrong, and every picture does. ', 'muted'],
          ['Real mirrors are not perfect conductors at all frequencies, and the exact result depends on how the metal responds to light — Lifshitz worked out the general case in 1956, and the corrections are at the few-percent level, which is exactly the precision the modern experiments reach. The idealised formula is the right first answer, not the last one.', null],
        ],
      ]);
    }

    measuredReadout() {
      const e = this.exp;
      setReadout(this.readoutEl, [
        [
          [`${e.who}, ${e.y}`, 'yellow'], ['  ·  ', null], [e.rig, 'cyan'],
          ['  ·  separations ', null], [e.range, null],
          ['  ·  agreement with the parameter-free prediction: ', null],
          [e.prec >= 100 ? 'inconclusive' : `about ${fmtNum(e.prec, 0)}%`, e.prec <= 5 ? 'green' : e.prec >= 100 ? 'red' : 'orange'],
        ],
        [[e.note, null]],
        [
          ['Why it took forty-nine years to measure something with no free parameters. ', 'yellow'],
          ['The force is minute unless the surfaces are extremely close, and getting two flat plates parallel to within a few nanometres across a centimetre is close to impossible — a tilt of a millionth of a radian ruins it. Lamoreaux\'s solution was to give up on flatness: use a sphere against a plate, where there is always a well-defined closest point and alignment stops mattering.', null],
        ],
        [
          ['What has to be subtracted before you can believe any of it. ', 'cyan'],
          ['Stray electrostatic charge, which is far stronger than Casimir and must be nulled by applying a compensating voltage. Surface roughness, which changes the effective separation. Finite conductivity of the metal. Patch potentials from crystal grains with different work functions. The 1% agreement in 1998 is impressive precisely because all of that had to be handled first.', null],
        ],
        [
          ['The shape of the curve is the real evidence, not any single point. ', 'green'],
          ['A d⁻⁴ law over a decade in separation is a very specific claim, and nothing about stray charge or roughness produces that exponent. When the measured points fall on a parameter-free curve across a factor of ten in distance, there is not much left to argue about.', null],
        ],
        [
          ['This is also one of the few places where quantum field theory shows up as a FORCE you can weigh. ', 'orange'],
          ['Most tests of the theory are spectroscopic — a frequency, a cross-section, a decay rate. Here it is mechanical: something moves, and you measure how hard.', null],
        ],
      ]);
    }

    memsReadout() {
      const n = this.numbers();
      setReadout(this.readoutEl, [
        [
          ['at ', null], [`${fmtNum(this.dNM, 0)} nm`, 'yellow'],
          [' the Casimir pressure is ', null], [`${sci(n.P, 3)} Pa`, 'pink'],
          ['. A typical MEMS restoring spring provides of order 1–100 Pa at that scale, which is why this stopped being a curiosity and became an engineering constraint.', null],
        ],
        [
          ['There is a Casimir force inside your phone. ', 'yellow'],
          ['Micro-electro-mechanical systems — the accelerometer that knows which way up you are holding it, the gyroscope, the micromirrors in a projector, the RF switches in a radio — are machines with moving parts a few hundred nanometres from a fixed surface. That is exactly the range where this force becomes comparable to everything else acting on them.', null],
        ],
        [
          ['The failure mode has a name: stiction. ', 'red'],
          ['A moving element comes too close to its neighbour, the attraction beats the restoring spring, and the two snap together permanently. The device is dead. It is a well-documented, thoroughly boring industrial problem, and it is caused by an effect that people still describe as exotic.', null],
        ],
        [
          ['Buks and Roukes demonstrated it deliberately in 2001. ', 'green'],
          ['They built a micromechanical device, brought the elements close, and watched the Casimir force pull them into contact — then measured the adhesion energy needed to explain it. Not a table-top curiosity: a designed experiment on a chip, showing the effect doing damage on purpose.', null],
        ],
        [
          ['Which is, in a way, the most convincing evidence on this page. ', 'orange'],
          ['A force predicted from ħ and c alone, in 1948, by someone thinking about colloid chemistry, now has to be designed around by engineers who have no interest whatsoever in quantum field theory. Effects that are merely theoretical do not turn up in failure-mode analyses.', null],
        ],
      ]);
    }

    honestReadout() {
      setReadout(this.readoutEl, [
        [
          ['The Casimir force is real, measured, and turns up in industrial failure reports. ', 'green'],
          ['None of that is in question. What IS worth questioning is the sentence that almost always follows it: "and this proves the vacuum is full of energy."', null],
        ],
        [
          ['The trouble is that the same force can be derived without ever mentioning vacuum energy. ', 'yellow'],
          ['Lifshitz did it in 1956 by treating the plates as real materials with fluctuating charges, and getting the attraction as a retarded van der Waals force between them. Schwinger built a whole formulation — source theory — designed to avoid zero-point energy entirely, and it gives the Casimir result. Jaffe made the point sharply in 2005: the effect can be computed in a way where ħ appears everywhere and vacuum energy appears nowhere.', null],
        ],
        [
          ['There is even a diagnostic. ', 'cyan'],
          ['In the material-based derivation, the force depends on the fine-structure constant α — the strength of the coupling between light and charges. Take α to zero, so charges stop talking to photons, and the force vanishes. If the effect were purely a property of empty space, it should not care about the coupling to matter at all. That the answer depends on how real the mirrors are is a hint about where the force comes from.', null],
        ],
        [
          ['So what is the honest summary? ', 'yellow'],
          ['That quantum fluctuations are real and measurable is not in doubt — the Lamb shift settles that in §29, and this force settles it again. What is genuinely disputed among people who compute these things for a living is whether the natural bookkeeping puts those fluctuations in the empty gap or in the charges of the plates. Both accounts give the same number, which is why the argument has lasted seventy years without an experiment to settle it.', null],
        ],
        [
          ['This section is badged "measured" for the force and marks the interpretation as unsettled, on purpose. ', 'orange'],
          ['The temptation with the Casimir effect is to use a real measurement to sell a picture the measurement does not require. The number is the result. The story about the gap is a way of getting to it — a good one, the one Casimir used, and not the only one.', null],
        ],
      ]);
    }

    /* ================= drawing ================= */

    // ---- 1: the two mirrors, the modes that fit, and the ones that don't ----
    renderPlates() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const n = this.numbers();

      // the gap is drawn on a log scale so the slider is usable across 5–1000 nm
      const t = (Math.log10(this.dNM) - Math.log10(5)) / (Math.log10(1000) - Math.log10(5));
      const gapPx = (compact ? 18 : 26) + t * (compact ? 90 : 150);
      const cx = compact ? w * 0.40 : w * 0.38;
      const cy = h * 0.46;
      const ph = compact ? h * 0.40 : h * 0.44;
      const pw = compact ? 12 : 16;

      const plate = (x, seed) => {
        rc.rectangle(x, cy - ph / 2, pw, ph, opts(seed, {
          stroke: COLORS.ink, strokeWidth: 2.2, fill: COLORS.ink, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 6,
        }));
      };
      plate(cx - gapPx / 2 - pw, 8000);
      plate(cx + gapPx / 2, 8001);

      // inside: only the standing waves that fit
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - gapPx / 2, cy - ph / 2, gapPx, ph);
      ctx.clip();
      for (let mI = 1; mI <= 3; mI++) {
        ctx.strokeStyle = COLORS.cyan;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let k = 0; k <= 60; k++) {
          const s = k / 60;
          const X = cx - gapPx / 2 + s * gapPx;
          const amp = (ph / 2) * 0.22 * Math.sin(Math.PI * mI * s) * Math.cos(this.simT * 2 + mI);
          const Y = cy - ph * 0.26 + mI * (ph * 0.26) + amp;
          if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // outside: everything, including the long ones that are shut out
      for (let i = 0; i < 6; i++) {
        const lamPx = 18 + i * 16;
        [cx - gapPx / 2 - pw - 30 - i * 12, cx + gapPx / 2 + pw + 30 + i * 12].forEach((X0, side) => {
          ctx.strokeStyle = COLORS.pink;
          ctx.globalAlpha = 0.40;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          for (let k = 0; k <= 40; k++) {
            const s = k / 40;
            const Y = cy - ph * 0.4 + s * ph * 0.8;
            const X = X0 + Math.sin((Y / lamPx) * Math.PI * 2 + this.simT * 2 + i) * 5;
            if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          }
          ctx.stroke();
          void side;
        });
      }
      ctx.globalAlpha = 1;

      // the push
      doodleArrow(rc, cx - gapPx / 2 - pw - 46, cy, cx - gapPx / 2 - pw - 8, cy, { color: COLORS.yellow, seed: 8010, strokeWidth: 2.2 });
      doodleArrow(rc, cx + gapPx / 2 + pw + 46, cy, cx + gapPx / 2 + pw + 8, cy, { color: COLORS.yellow, seed: 8011, strokeWidth: 2.2 });
      label(ctx, compact ? 'only these fit' : 'only these wavelengths fit', cx, cy - ph / 2 - (compact ? 10 : 14),
        { color: COLORS.cyan, size: compact ? 9 : 11, align: 'center' });
      label(ctx, compact ? 'outside: all of them' : 'outside: every wavelength allowed', cx + gapPx / 2 + pw + (compact ? 40 : 70), cy - ph / 2 - (compact ? 10 : 14),
        { color: COLORS.pink, size: compact ? 9 : 11, align: 'center' });
      label(ctx, `${fmtNum(this.dNM, this.dNM < 100 ? 1 : 0)} nm`, cx, cy + ph / 2 + (compact ? 16 : 20),
        { color: COLORS.yellow, size: compact ? 10 : 12.5, align: 'center' });

      // the force, with a weight the reader can picture
      const bx = compact ? w * 0.68 : w * 0.68;
      const bw = w - bx - (compact ? 10 : 24);
      const by = h * 0.24;
      this.cache.draw(`fbox-${key}`, (g) => g.rectangle(bx, by, bw, compact ? h * 0.36 : h * 0.38,
        opts(8020, { stroke: COLORS.yellow, strokeWidth: 1.8 })));
      label(ctx, 'F/A = πħc / 240d⁴', bx + bw / 2, by + (compact ? 18 : 24), { color: COLORS.yellow, size: compact ? 10 : 13, align: 'center' });
      label(ctx, 'no material constants', bx + bw / 2, by + (compact ? 32 : 42), { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });
      label(ctx, 'nothing to fit', bx + bw / 2, by + (compact ? 44 : 56), { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });
      label(ctx, `${sci(n.P, 3)} Pa`, bx + bw / 2, by + (compact ? 66 : 84), { color: COLORS.pink, size: compact ? 12 : 16, align: 'center' });
      label(ctx, `= ${sci(n.atm, 2)} atm`, bx + bw / 2, by + (compact ? 82 : 104), { color: COLORS.cyan, size: compact ? 9.5 : 12, align: 'center' });
      if (!compact) {
        label(ctx, `on a 1 cm² mirror: ${sci(n.F1cm2, 2)} N`, bx + bw / 2, by + 126, { color: COLORS.muted, size: 10.5, align: 'center' });
        label(ctx, `— the weight of ${sci(n.gramsEquivalent, 1)} g`, bx + bw / 2, by + 143, { color: COLORS.muted, size: 10.5, align: 'center' });
      }

      label(ctx, 'two mirrors, a vacuum between them, and they pull together',
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10.5 : 15, align: 'center' });
      label(ctx, compact ? 'ten times closer = ten thousand times stronger' : 'the d⁻⁴ law is brutal: ten times closer is ten thousand times stronger',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void stickFigure;
    }

    // ---- 2: the measurements, against the parameter-free curve ----
    renderMeasured() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const gx = compact ? w * 0.16 : w * 0.11;
      const gw = (compact ? w * 0.80 : w * 0.52);
      const gy = h * 0.20;
      const gh = h * 0.50;
      // log-log: separation 30 nm … 6 µm, pressure across its whole range
      const LX0 = Math.log10(30e-9);
      const LX1 = Math.log10(6e-6);
      const LY0 = Math.log10(pressure(6e-6));
      const LY1 = Math.log10(pressure(30e-9));
      const xOf = (d) => gx + ((Math.log10(d) - LX0) / (LX1 - LX0)) * gw;
      const yOf = (P) => gy + gh - ((Math.log10(P) - LY0) / (LY1 - LY0)) * gh;

      this.cache.draw(`max-${key}`, (g) => g.line(gx, gy, gx, gy + gh, opts(8100, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      this.cache.draw(`may-${key}`, (g) => g.line(gx, gy + gh, gx + gw, gy + gh, opts(8101, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      label(ctx, 'F/A', gx - 6, gy - 4, { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'right' });
      label(ctx, 'separation', gx + gw, gy + gh + (compact ? 26 : 31), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'right' });
      [[100e-9, '100 nm'], [1e-6, '1 µm'], [6e-6, '6 µm']].forEach(([d, t], i) => {
        this.cache.draw(`mt-${i}-${key}`, (g) => g.line(xOf(d), gy + gh - 4, xOf(d), gy + gh + 4,
          opts(8110 + i, { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, t, xOf(d), gy + gh + (compact ? 14 : 17), { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'center' });
      });
      label(ctx, `${sci(pressure(30e-9), 1)} Pa`, gx - 6, gy + 10, { color: COLORS.muted, size: compact ? 8 : 9.5, align: 'right' });
      label(ctx, `${sci(pressure(6e-6), 1)} Pa`, gx - 6, gy + gh, { color: COLORS.muted, size: compact ? 8 : 9.5, align: 'right' });

      // the prediction, with nothing adjustable in it
      ctx.strokeStyle = COLORS.pink;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let k = 0; k <= 80; k++) {
        const d = 10 ** (LX0 + (k / 80) * (LX1 - LX0));
        const Y = yOf(pressure(d));
        if (k === 0) ctx.moveTo(xOf(d), Y); else ctx.lineTo(xOf(d), Y);
      }
      ctx.stroke();
      label(ctx, compact ? 'πħc/240d⁴' : 'Casimir 1948:  πħc / 240d⁴  — no free parameters',
        xOf(4e-7), yOf(pressure(4e-7)) - (compact ? 8 : 11), { color: COLORS.pink, size: compact ? 9 : 11.5 });

      // the experiments, each over the range it actually covered
      const RANGES = [
        { i: 0, lo: 0.5e-6, hi: 2e-6 },
        { i: 1, lo: 0.6e-6, hi: 6e-6 },
        { i: 2, lo: 0.1e-6, hi: 0.9e-6 },
        { i: 3, lo: 0.5e-6, hi: 3e-6 },
      ];
      RANGES.forEach((rg) => {
        const m = MEASURED[rg.i];
        const on = rg.i === this.expIdx;
        ctx.globalAlpha = on ? 1 : 0.30;
        // sample points along the range, scattered by that experiment's precision
        const nPts = 5;
        for (let k = 0; k < nPts; k++) {
          const d = rg.lo * (rg.hi / rg.lo) ** (k / (nPts - 1));
          const scat = 1 + ((this.rng() - 0.5) * 2 * m.prec) / 100;
          const P = pressure(d) * scat;
          const x = xOf(d);
          const y = yOf(Math.max(P, 10 ** LY0));
          const e = Math.abs(yOf(pressure(d) * (1 + m.prec / 100)) - yOf(pressure(d)));
          ctx.strokeStyle = m.color;
          ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(x, y - e); ctx.lineTo(x, y + e); ctx.stroke();
          ctx.fillStyle = m.color;
          ctx.beginPath(); ctx.arc(x, y, on ? 3.4 : 2.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
      // reset the scatter stream so the points are stable between frames
      this.rng = mulberry32(19480501);

      // the roll of honour
      const bx = compact ? w * 0.06 : w * 0.67;
      const bw = compact ? w * 0.88 : w * 0.29;
      let yy = compact ? h * 0.76 : h * 0.20;
      MEASURED.forEach((m, i) => {
        const on = i === this.expIdx;
        if (compact && !on) return;
        this.cache.draw(`row-${i}-${this.expIdx}-${key}`, (g) => g.rectangle(bx, yy, bw, compact ? h * 0.16 : h * 0.15,
          opts(8130 + i, { stroke: on ? m.color : COLORS.muted, strokeWidth: on ? 1.8 : 1 })));
        ctx.globalAlpha = on ? 1 : 0.55;
        label(ctx, `${m.y}  ${m.who}`, bx + 8, yy + (compact ? 16 : 19), { color: m.color, size: compact ? 9.5 : 11.5 });
        label(ctx, m.rig, bx + 8, yy + (compact ? 30 : 35), { color: COLORS.muted, size: compact ? 8.5 : 10 });
        label(ctx, m.prec >= 100 ? 'inconclusive' : `agrees to ~${fmtNum(m.prec, 0)}%`, bx + 8, yy + (compact ? 44 : 51),
          { color: m.prec <= 5 ? COLORS.green : m.prec >= 100 ? COLORS.red : COLORS.orange, size: compact ? 8.5 : 10.5 });
        ctx.globalAlpha = 1;
        yy += (compact ? h * 0.16 : h * 0.15) + (compact ? 6 : 8);
      });

      label(ctx, 'forty-nine years from prediction to a convincing measurement',
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10.5 : 15, align: 'center' });
      label(ctx, compact ? 'the curve has nothing adjustable in it' : 'the points are measurements; the curve through them was fixed in 1948 and has nothing adjustable in it',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
    }

    // ---- 3: the failure mode on a chip ----
    renderMems() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const n = this.numbers();

      // a phone, opened up, with the accelerometer die inside
      const px = compact ? w * 0.14 : w * 0.15;
      const py = h * 0.50;
      const pw = compact ? 74 : 96;
      const phh = compact ? 138 : 178;
      this.cache.draw(`phone-${key}`, (g) => g.rectangle(px - pw / 2, py - phh / 2, pw, phh,
        opts(8200, { stroke: COLORS.ink, strokeWidth: 2.2 })));
      this.cache.draw(`screen-${key}`, (g) => g.rectangle(px - pw / 2 + 6, py - phh / 2 + 10, pw - 12, phh - 26,
        opts(8201, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      this.cache.draw(`die-${key}`, (g) => g.rectangle(px - 12, py - 10, 24, 20,
        opts(8202, { stroke: COLORS.cyan, strokeWidth: 1.8 })));
      label(ctx, compact ? 'accelerometer' : 'the accelerometer die', px, py + phh / 2 + (compact ? 14 : 17),
        { color: COLORS.cyan, size: compact ? 9 : 11, align: 'center' });

      // zoomed: the comb drive, with the moving finger and the gap
      const zx = compact ? w * 0.56 : w * 0.54;
      const zy = h * 0.44;
      const zr = Math.min(w * 0.20, h * 0.30);
      this.cache.draw(`zoom-${key}`, (g) => g.circle(zx, zy, zr * 2, opts(8210, { stroke: COLORS.cyan, strokeWidth: 2 })));
      this.cache.draw(`zline-${key}`, (g) => g.path(`M ${px + 14} ${py} L ${zx - zr * 0.8} ${zy + zr * 0.5}`,
        opts(8211, { stroke: COLORS.cyan, strokeWidth: 1.1, strokeLineDash: [5, 5] })));

      ctx.save();
      ctx.beginPath(); ctx.arc(zx, zy, zr - 2, 0, Math.PI * 2); ctx.clip();
      // the fixed comb
      for (let i = 0; i < 4; i++) {
        const fy = zy - zr * 0.6 + i * (zr * 0.42);
        rc.rectangle(zx - zr * 0.9, fy, zr * 0.75, zr * 0.16, opts(8220 + i, {
          stroke: COLORS.muted, strokeWidth: 1.4, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 5,
        }));
      }
      // the moving finger, pulled in as the gap closes
      const t = (Math.log10(this.dNM) - Math.log10(5)) / (Math.log10(1000) - Math.log10(5));
      const pull = (1 - t) * zr * 0.24;
      for (let i = 0; i < 4; i++) {
        const fy = zy - zr * 0.6 + i * (zr * 0.42);
        const stuck = this.dNM < 40;
        rc.rectangle(zx + zr * 0.16 - pull, fy, zr * 0.75, zr * 0.16, opts(8230 + i, {
          stroke: stuck ? COLORS.red : COLORS.yellow, strokeWidth: 1.6,
          fill: stuck ? COLORS.red : COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 5,
        }));
      }
      ctx.restore();
      label(ctx, this.dNM < 40 ? 'STUCK — the device is dead' : 'a comb drive, held apart by a spring',
        zx, zy + zr + (compact ? 15 : 19), { color: this.dNM < 40 ? COLORS.red : COLORS.muted, size: compact ? 9.5 : 11.5, align: 'center' });
      label(ctx, `gap ${fmtNum(this.dNM, 0)} nm`, zx, zy - zr - (compact ? 8 : 11),
        { color: COLORS.yellow, size: compact ? 9.5 : 11.5, align: 'center' });

      // the balance: Casimir against the restoring spring
      const bx = compact ? w * 0.80 : w * 0.80;
      const bw = w - bx - (compact ? 8 : 20);
      const by = h * 0.26;
      const bh = h * 0.34;
      this.cache.draw(`bal-${key}`, (g) => g.rectangle(bx, by, bw, bh, opts(8240, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      const frac = Math.max(0, Math.min(1, Math.log10(n.P + 1e-9) / 5 + 0.4));
      ctx.fillStyle = n.P > 20 ? COLORS.red : COLORS.green;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(bx + 1, by + bh - frac * (bh - 2) - 1, bw - 2, frac * (bh - 2));
      ctx.globalAlpha = 1;
      label(ctx, `${sci(n.P, 2)} Pa`, bx + bw / 2, by - (compact ? 7 : 10), { color: COLORS.pink, size: compact ? 9 : 11, align: 'center' });
      label(ctx, compact ? 'Casimir' : 'Casimir pressure', bx + bw / 2, by + bh + (compact ? 13 : 16),
        { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'center' });

      label(ctx, 'there is a Casimir force inside your phone', w / 2, compact ? 20 : 26,
        { color: COLORS.yellow, size: compact ? 11 : 15.5, align: 'center' });
      label(ctx, compact ? 'stiction: a real MEMS failure mode' : 'close the gap far enough and the parts snap together permanently — stiction, a documented industrial failure mode',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    // ---- 4: two derivations, one number ----
    renderHonest() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const half = w / 2;

      this.cache.draw(`split-${key}`, (g) => g.line(half, h * 0.16, half, h * 0.80,
        opts(8300, { stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [8, 8] })));

      const column = (cx, title, sub, color, lines, seed) => {
        label(ctx, title, cx, compact ? 44 : 56, { color, size: compact ? 10.5 : 13.5, align: 'center' });
        label(ctx, sub, cx, compact ? 58 : 74, { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });
        this.cache.draw(`col-${seed}-${key}`, (g) => g.rectangle(cx - (compact ? w * 0.21 : w * 0.21), compact ? h * 0.20 : h * 0.22,
          compact ? w * 0.42 : w * 0.42, compact ? h * 0.34 : h * 0.36,
          opts(seed, { stroke: color, strokeWidth: 1.6 })));
        lines.forEach((l, i) => {
          label(ctx, l, cx, (compact ? h * 0.20 : h * 0.22) + (compact ? 20 : 26) + i * (compact ? 15 : 19),
            { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });
        });
      };

      column(half * 0.5, 'THE VACUUM STORY', 'Casimir 1948', COLORS.cyan, [
        'the gap is a cavity',
        'only some wavelengths fit inside',
        'all of them fit outside',
        'more modes push in than out',
        '', 'F/A = πħc / 240d⁴',
      ], 8310);

      column(half * 1.5, 'THE MATERIALS STORY', 'Lifshitz 1956 · Schwinger 1975 · Jaffe 2005', COLORS.orange, [
        'the plates are made of charges',
        'the charges fluctuate',
        'they attract across the gap,',
        'retarded by the travel time',
        '', 'F/A = πħc / 240d⁴',
      ], 8311);

      // the same answer, drawn as the same answer
      const ay = compact ? h * 0.60 : h * 0.63;
      doodleArrow(rc, half * 0.5, ay, half * 0.92, ay + (compact ? 16 : 22), { color: COLORS.green, seed: 8320, strokeWidth: 1.6 });
      doodleArrow(rc, half * 1.5, ay, half * 1.08, ay + (compact ? 16 : 22), { color: COLORS.green, seed: 8321, strokeWidth: 1.6 });
      this.cache.draw(`same-${key}`, (g) => g.rectangle(half - (compact ? 76 : 100), ay + (compact ? 22 : 30), compact ? 152 : 200, compact ? 30 : 36,
        opts(8330, { stroke: COLORS.green, strokeWidth: 2 })));
      label(ctx, 'the same measured force', half, ay + (compact ? 42 : 53), { color: COLORS.green, size: compact ? 10 : 12.5, align: 'center' });

      label(ctx, 'the force is measured. The story about why is not settled.',
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10.5 : 15, align: 'center' });
      label(ctx, compact ? 'both derivations give the same number' : 'both derivations give the same number, which is exactly why seventy years of argument has produced no experiment to separate them',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void stickFigure;
    }

    render() {
      ({
        plates: () => this.renderPlates(),
        measured: () => this.renderMeasured(),
        mems: () => this.renderMems(),
        honest: () => this.renderHonest(),
      })[this.mode]();
    }
  }

  void CIT_CASIMIR_POLDER; void CIT_BRESSI; void CIT_LIFSHITZ; void CIT_SCHWINGER;

  A.register('casimir', CasimirSim);
})();
