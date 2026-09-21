// Sim 31 — The photoelectric effect: measuring Planck's constant with a lamp
//
// This is the experiment that got Einstein the Nobel Prize, and — more to the
// point — it is one you can carry out on a bench with a photocell, a set of
// filters, a variable voltage and a galvanometer. The whole of it is one line:
//
//     e·V_stop = h·f − φ
//
// which is a straight line if you plot stopping voltage against frequency. Its
// slope is h/e = 4.135667×10⁻¹⁵ V·s and its intercept is the work function of
// whatever metal you put in the tube. Panel 2 lets you collect the points and
// read Planck's constant off the slope, which is exactly what Millikan did.
//
// And Millikan is the reason this section belongs in a chapter about evidence.
// He did not believe Einstein. He called the light-quantum hypothesis "reckless",
// spent ten years building apparatus to destroy it — including a vacuum chamber
// with a knife inside to shave the photocathode clean, because surface oxide was
// ruining everyone's data — and in 1916 published the most careful confirmation
// anyone had produced, still saying in the same paper that he did not accept the
// theory it supported. That is what a hostile witness looks like, and it is why
// the result stuck.
//
// THE THREE FACTS THAT KILLED THE WAVE PICTURE, all in the sim:
//   1. A THRESHOLD. Below f₀ = φ/h, nothing comes out however bright the light.
//      For sodium (φ = 2.36 eV) that is 525 nm — green. Red light will not do it
//      at any intensity you can produce.
//   2. INTENSITY CHANGES THE COUNT, NOT THE ENERGY. Brighter light ejects more
//      electrons at exactly the same maximum energy. The stopping voltage does
//      not move.
//   3. NO DELAY. The classical calculation is in the code: a 1 W lamp at 1 m
//      delivers 2.5×10⁻²¹ W to one atom's cross-section, so accumulating 2.3 eV
//      takes 147 seconds — two and a half minutes of waiting in the dark. The
//      measured delay is under a nanosecond. The wave picture is wrong here by a
//      factor of about 10¹¹, which is not the sort of gap a correction closes.
//
// Numbers reproduced by the code:
//   h/e = 4.135667×10⁻¹⁵ V·s ; hc = 1239.84 eV·nm
//   thresholds: caesium 590 nm, sodium 525 nm, zinc 288 nm, platinum 219 nm
//   sodium at 400 nm → V_stop = 0.740 V ; at 600 nm → no emission at all

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    sci, fmtNum, wavelengthRGB,
  } = A;

  const H_PL = 6.62607015e-34;
  const C_L = 299792458;
  const E_CH = 1.602176634e-19;
  const HC_EVNM = (H_PL * C_L) / E_CH * 1e9;    // 1239.84 eV·nm

  const CIT_HERTZ = '1887 Hertz - Ueber einen Einfluss des ultravioletten Lichtes auf die electrische Entladung (On an Effect of Ultraviolet Light upon the Electric Discharge)';
  const CIT_HALLWACHS = '1888 Hallwachs - Ueber den Einfluss des Lichtes auf electrostatisch geladene Körper (On the Influence of Light on Electrostatically Charged Bodies)';
  const CIT_LENARD = '1902 Lenard - Ueber die lichtelektrische Wirkung (On the Photoelectric Effect)';
  const CIT_EINSTEIN = '1905 Einstein - Über einen die Erzeugung und Verwandlung des Lichtes betreffenden heuristischen Gesichtspunkt (On a Heuristic Point of View Concerning the Production and Transformation of Light)';
  const CIT_MILLIKAN = '1916 Millikan - A Direct Photoelectric Determination of Planck\'s "h"';
  const CIT_COMPTON = '1923 Compton - A Quantum Theory of the Scattering of X-rays by Light Elements';

  // Real photocathode metals with their measured work functions (eV).
  const METALS = [
    { key: 'cs', name: 'caesium', phi: 2.1, color: '#ffd43b' },
    { key: 'na', name: 'sodium', phi: 2.36, color: '#ffa94d' },
    { key: 'k', name: 'potassium', phi: 2.3, color: '#f783ac' },
    { key: 'zn', name: 'zinc', phi: 4.3, color: '#04d9ff' },
    { key: 'cu', name: 'copper', phi: 4.7, color: '#69db7c' },
    { key: 'pt', name: 'platinum', phi: 5.65, color: '#adb5bd' },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const photonEV = (lamNm) => HC_EVNM / lamNm;
  const stopVolts = (lamNm, phi) => photonEV(lamNm) - phi;      // volts, since E is in eV
  const thresholdNm = (phi) => HC_EVNM / phi;

  class PhotoelectricSim extends Sim {
    init() {
      this.mode = 'bench';
      this.metalIdx = 1;              // sodium
      this.lamNm = 450;
      this.retardV = 0;
      this.intensity = 1;             // relative
      this.points = [];               // the reader's own V_stop vs f data
      this.simT = 0;
      this.electrons = [];
      this.rng = mulberry32(19160401);
      this.buildControls();
      this.updateReadout();
    }

    get metal() { return METALS[this.metalIdx]; }
    get Vstop() { return stopVolts(this.lamNm, this.metal.phi); }
    get emits() { return this.Vstop > 0; }
    get freqHz() { return C_L / (this.lamNm * 1e-9); }

    // The classical accumulation time — the number that kills the wave picture.
    classicalWait() {
      const P = 1;                       // a 1 W lamp
      const r = 1;                       // one metre away
      const aAtom = 1e-10;               // atomic radius
      const I = P / (4 * Math.PI * r * r);
      const area = Math.PI * aAtom * aAtom;
      return (this.metal.phi * E_CH) / (I * area);
    }

    // Least-squares fit through the reader's points: slope gives h/e.
    fit() {
      const p = this.points;
      if (p.length < 2) return null;
      let sx = 0;
      let sy = 0;
      let sxx = 0;
      let sxy = 0;
      for (const q of p) { sx += q.f; sy += q.V; sxx += q.f * q.f; sxy += q.f * q.V; }
      const n = p.length;
      const den = n * sxx - sx * sx;
      if (Math.abs(den) < 1e-9) return null;
      const slope = (n * sxy - sx * sy) / den;      // V·s  =  h/e
      const inter = (sy - slope * sx) / n;          // volts =  −φ/e
      return { slope, inter, h: slope * E_CH, phi: -inter, f0: -inter / slope };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'the bench', value: 'bench' },
        { label: "measure Planck's constant", value: 'millikan' },
        { label: 'brighter does not help', value: 'bright' },
        { label: 'and there is no waiting', value: 'delay' },
      ], { initial: 'bench', onSelect: (v) => this.setMode(v) });

      this.metalBtns = buttonRow(c, METALS.map((m) => ({ label: m.name, value: m.key })), {
        initial: 'na',
        onSelect: (v) => {
          this.metalIdx = METALS.findIndex((m) => m.key === v);
          this.points = [];
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.lamSlider = slider(c, {
        label: 'light through the filter',
        min: 200, max: 700, step: 1, value: this.lamNm,
        format: (v) => {
          const E = photonEV(v);
          const Vs = stopVolts(v, this.metal.phi);
          return `${fmtNum(v, 0)} nm  ·  each photon carries ${fmtNum(E, 3)} eV  ·  ${Vs > 0 ? `stopping voltage ${fmtNum(Vs, 3)} V` : 'below threshold — nothing comes out'}`;
        },
        oninput: (v) => {
          this.lamNm = v;
          if (!this._citedE) { this._citedE = true; this.cite(CIT_EINSTEIN); }
          this.updateReadout();
          this.poke();
        },
      });

      this.voltSlider = slider(c, {
        label: 'retarding voltage on the collector',
        min: 0, max: 4, step: 0.005, value: this.retardV,
        format: (v) => {
          const Vs = this.Vstop;
          return `${fmtNum(v, 3)} V  ·  ${!this.emits ? 'no current — the light is below threshold' : v >= Vs ? 'current has stopped' : 'current still flowing'}`;
        },
        oninput: (v) => { this.retardV = v; this.updateReadout(); this.poke(); },
      });

      this.intSlider = slider(c, {
        label: 'lamp brightness',
        min: 0.1, max: 5, step: 0.05, value: this.intensity,
        format: (v) => `${fmtNum(v, 2)}×  —  changes how MANY electrons, never how fast`,
        oninput: (v) => { this.intensity = v; this.updateReadout(); this.poke(); },
      });

      this.recordBtn = actionButton(c, 'record this point', () => {
        if (!this.emits) return;
        const f = this.freqHz;
        if (!this.points.some((p) => Math.abs(p.f - f) < 1e11)) {
          this.points.push({ f, V: this.Vstop, lam: this.lamNm });
          this.points.sort((a, b) => a.f - b.f);
          if (!this._citedM) { this._citedM = true; this.cite(CIT_MILLIKAN); }
        }
        this.updateReadout();
        this.poke();
      });
      this.clearBtn = actionButton(c, 'clear the data', () => {
        this.points = []; this.updateReadout(); this.poke();
      });
      this.setMode('bench');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      const showB = (b, on) => { b.style.display = on ? '' : 'none'; };
      show(this.metalBtns, true);
      show(this.lamSlider, true);
      show(this.voltSlider, v === 'bench');
      show(this.intSlider, v === 'bright' || v === 'bench');
      showB(this.recordBtn, v === 'millikan');
      showB(this.clearBtn, v === 'millikan');
      if (v === 'bench') this.cite(CIT_LENARD);
      if (v === 'millikan') this.cite(CIT_MILLIKAN);
      if (v === 'bright') this.cite(CIT_EINSTEIN);
      if (v === 'delay') this.cite(CIT_HERTZ);
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    update(dt) {
      this.simT += dt;
      // electrons crossing the tube, at a rate set by intensity and stopped by
      // the retarding voltage — the current the galvanometer would show
      const flowing = this.emits && (this.mode !== 'bench' || this.retardV < this.Vstop);
      const rate = flowing ? 14 * this.intensity : 0;
      this._acc = (this._acc || 0) + dt * rate;
      while (this._acc > 1) {
        this._acc -= 1;
        this.electrons.push({ t: 0, fy: this.rng(), v: 0.75 + this.rng() * 0.5 });
      }
      for (const e of this.electrons) e.t += dt;
      this.electrons = this.electrons.filter((e) => e.t < 1.3);
      if (this.electrons.length > 90) this.electrons.splice(0, this.electrons.length - 90);
    }

    /* ---------------- readouts ---------------- */

    updateReadout() {
      const f = {
        bench: () => this.benchReadout(),
        millikan: () => this.millikanReadout(),
        bright: () => this.brightReadout(),
        delay: () => this.delayReadout(),
      }[this.mode];
      if (f) f();
    }

    benchReadout() {
      const m = this.metal;
      const E = photonEV(this.lamNm);
      const th = thresholdNm(m.phi);
      setReadout(this.readoutEl, [
        [
          [m.name, 'yellow'], [`, work function φ = ${fmtNum(m.phi, 2)} eV`, null],
          ['  ·  threshold λ₀ = hc/φ = ', null], [`${fmtNum(th, 1)} nm`, 'cyan'],
          ['  ·  your filter: ', null], [`${fmtNum(this.lamNm, 0)} nm`, 'green'],
          [', each photon carrying ', null], [`${fmtNum(E, 3)} eV`, 'pink'],
        ],
        this.emits ? [
          ['Electrons are coming off with up to ', null], [`${fmtNum(this.Vstop, 3)} eV`, 'green'],
          [' of kinetic energy, so it takes ', null], [`${fmtNum(this.Vstop, 3)} volts`, 'yellow'],
          [' of retarding potential to turn the current off. That voltage IS the measurement — the rest of the apparatus exists to read it.', null],
        ] : [
          ['Nothing is coming out. ', 'red'],
          [`Each photon carries ${fmtNum(E, 3)} eV and it costs ${fmtNum(m.phi, 2)} eV to get an electron out of ${m.name}. Turn the lamp up as far as you like — a hundred times brighter, a thousand — and the answer stays nothing. That single fact is what no wave theory has ever explained.`, null],
        ],
        [
          ['The apparatus is genuinely simple, which is why the result was so hard to dismiss. ', 'yellow'],
          ['An evacuated tube with a metal plate in it, a lamp, a set of coloured filters, a variable voltage and a sensitive current meter. Hertz stumbled on the effect in 1887 while doing something else entirely — he noticed his spark gaps fired more readily under ultraviolet — and Hallwachs pinned it down the following year.', null],
        ],
        [
          ['Lenard found the fact that made no sense in 1902. ', 'orange'],
          ['He showed that the ENERGY of the ejected electrons does not depend on how bright the light is. On any wave picture that is absurd: a stronger wave shakes the electron harder and it should come off faster. Lenard measured it carefully, found no such dependence, and left the puzzle sitting there for three years.', null],
        ],
        [
          ['Then Einstein, in the same year as special relativity and Brownian motion. ', 'yellow'],
          ['Suppose light arrives in lumps of energy hf. Then one lump ejects one electron, and the arithmetic is just bookkeeping: the electron gets hf, pays φ to escape the metal, and keeps the change. E = hf − φ. Everything Lenard found falls out immediately, including the parts nobody could explain.', null],
        ],
      ]);
    }

    millikanReadout() {
      const f = this.fit();
      const m = this.metal;
      setReadout(this.readoutEl, [
        [
          ['points recorded: ', null], [`${fmtNum(this.points.length, 0)}`, 'cyan'],
          f ? ['   →   slope = ', null] : ['   — record at least two, at different colours, to fit a line.', null],
          f ? [`${sci(f.slope, 4)} V·s`, 'green'] : ['', null],
          f ? ['   →   h = slope × e = ', null] : ['', null],
          f ? [`${sci(f.h, 5)} J·s`, 'yellow'] : ['', null],
        ],
        f ? [
          ['The true value is 6.62607015×10⁻³⁴ J·s — exact by definition since 2019. ', 'cyan'],
          ['Your fit is off by ', null],
          [`${fmtNum(Math.abs((f.h - H_PL) / H_PL) * 100, 3)}%`, Math.abs((f.h - H_PL) / H_PL) < 0.01 ? 'green' : 'orange'],
          ['. The intercept gives the work function back: ', null],
          [`${fmtNum(f.phi, 3)} eV`, 'pink'],
          [` against the tabulated ${fmtNum(m.phi, 2)} eV for ${m.name}, and a threshold frequency of ${sci(f.f0, 3)} Hz.`, null],
        ] : [
          ['Set a wavelength, note that the stopping voltage appears, and press "record this point". Then change the filter and do it again. Two points define a line; five make it convincing.', null],
        ],
        [
          ['THIS IS MILLIKAN\'S EXPERIMENT, and the reason it matters is who did it. ', 'yellow'],
          ['Robert Millikan did not believe Einstein. He described the light-quantum hypothesis as "reckless" and said it flew "in the face of the thoroughly established facts of interference". He set out to disprove it, and he spent ten years on the attempt.', null],
        ],
        [
          ['The ten years went on surfaces. ', 'cyan'],
          ['Everyone\'s photocathodes were contaminated by oxide, which shifts the work function and scatters the data. Millikan\'s answer was to build what he called "a machine shop in vacuo": a sealed chamber containing the alkali metal, a magnetically operated knife, and a saw — so he could shave a fresh, clean surface without ever letting air in. That is the apparatus in the drawing, and it is why his line is straight.', null],
        ],
        [
          ['In 1916 he published, and the line was straight. ', 'green'],
          ['He got h to better than a percent, in agreement with Planck\'s value from a completely unrelated experiment on blackbody radiation — and wrote in the same paper that Einstein\'s theory "cannot be regarded as resting upon any sort of satisfactory theoretical foundation". He confirmed it and still refused it. Both men later took Nobel Prizes largely for this work, and Einstein\'s 1921 citation names the photoelectric effect, not relativity.', null],
        ],
        [
          ['Which is the point of putting this in a chapter about evidence. ', 'orange'],
          ['A hostile, meticulous experimenter trying for a decade to kill an idea, and producing its best confirmation instead. That is worth more than a hundred friendly replications.', null],
        ],
      ]);
    }

    brightReadout() {
      const m = this.metal;
      const th = thresholdNm(m.phi);
      const below = !this.emits;
      setReadout(this.readoutEl, [
        [
          ['brightness ', null], [`${fmtNum(this.intensity, 2)}×`, 'yellow'],
          ['  ·  wavelength ', null], [`${fmtNum(this.lamNm, 0)} nm`, 'cyan'],
          ['  ·  maximum electron energy ', null],
          [below ? 'none — nothing is emitted' : `${fmtNum(this.Vstop, 3)} eV`, below ? 'red' : 'green'],
          [below ? '' : ', and the brightness slider does not change that number by one part in a million.', null],
        ],
        [
          ['Turn the lamp up and watch what moves. ', 'yellow'],
          ['The CURRENT rises — more electrons per second, because more photons per second arrive and each one can free one electron. The stopping voltage does not move at all. Brighter light does not produce faster electrons; it produces more of them at the same speed.', null],
        ],
        [
          ['On a wave picture this is backwards. ', 'orange'],
          ['A wave carries energy in its amplitude. Double the amplitude and you quadruple the energy delivered, so the electrons should come off harder. They do not. Lenard measured this in 1902 and it stayed unexplained for three years, because it is not a small anomaly — it is the opposite of what the theory says.', null],
        ],
        below ? [
          ['And here is the sharper version, which you are looking at right now. ', 'red'],
          [`At ${fmtNum(this.lamNm, 0)} nm each photon has ${fmtNum(photonEV(this.lamNm), 3)} eV and ${m.name} demands ${fmtNum(m.phi, 2)} eV. The photon is short of the price. Turn the lamp to a hundred times brighter and every photon is still short of the price — you have sent more coins, not bigger ones, and the electron cannot pay with two.`, null],
        ] : [
          ['Now go the other way and cross the threshold. ', 'yellow'],
          [`Below ${fmtNum(th, 1)} nm this metal emits; above it, nothing, at any intensity. Slide past ${fmtNum(th, 0)} nm and watch the current not merely fade but stop.`, null],
        ],
        [
          ['The reason the threshold is fatal to waves is that it is sharp. ', 'green'],
          ['A wave theory could perhaps explain a weak response to red light. What it cannot explain is a hard cut-off at a particular colour, independent of intensity, whose position depends only on the metal. In the quantum picture the cut-off is arithmetic: hf < φ, no transaction. There is nothing to tune.', null],
        ],
      ]);
    }

    delayReadout() {
      const wait = this.classicalWait();
      const m = this.metal;
      const measured = 1e-9;
      setReadout(this.readoutEl, [
        [
          ['CLASSICAL PREDICTION: ', 'orange'],
          [`a 1 W lamp one metre away spreads its light over 4π m², giving 0.0796 W/m². An atom presents about 3.1×10⁻²⁰ m², so it collects 2.5×10⁻²¹ W. To accumulate the ${fmtNum(m.phi, 2)} eV needed to free an electron from ${m.name} takes `, null],
          [`${fmtNum(wait, 0)} seconds`, 'red'],
          [` — ${fmtNum(wait / 60, 1)} minutes of standing in the dark waiting for the first click.`, null],
        ],
        [
          ['MEASURED: ', 'green'],
          ['under a nanosecond. Modern attosecond experiments have pushed the limit down to a few tens of attoseconds. The wave prediction is wrong by a factor of about ', null],
          [`${sci(wait / measured, 2)}`, 'red'],
          ['. That is not a discrepancy anyone patches with a correction term.', null],
        ],
        [
          ['This is the cleanest of the three arguments, because it needs no fine measurement at all. ', 'yellow'],
          ['You do not have to measure the delay accurately. You only have to notice that there is not one. Point a dim lamp at a photocell and the current appears the moment the light does — no warm-up, no build-up, no pause while the metal charges itself with energy. Everyone who ever did the experiment saw this, and nobody could explain it.', null],
        ],
        [
          ['The quantum account is almost boring, which is a point in its favour. ', 'cyan'],
          ['Energy does not arrive spread over the whole wavefront and slowly accumulate at each atom. It arrives in lumps. Most atoms get nothing; the occasional one gets a whole photon and emits immediately. Dim the light and you do not lengthen the wait — you reduce the number of clicks per second. That is exactly what a photomultiplier does today, and it is the operating principle of every photon-counting instrument ever built.', null],
        ],
        [
          ['Compton finished the argument in 1923. ', 'yellow'],
          ['If light really comes in lumps, those lumps should carry MOMENTUM as well as energy, and bouncing one off an electron should shift its wavelength by a calculable amount. Compton measured the shift, it matched, and the last resistance collapsed — including Millikan\'s. A quantum of light got its name, the photon, in 1926.', null],
        ],
      ]);
    }

    /* ================= drawing ================= */

    // the photocell, the lamp, the filter and the meter — the actual bench
    drawApparatus(compact, showMeter) {
      const { rc, ctx, w, h } = this;
      const key = `${w}x${h}`;
      const benchY = h * 0.76;
      const rgb = wavelengthRGB(this.lamNm);

      this.cache.draw(`bench-${key}`, (g) => g.line(w * 0.03, benchY, w * 0.97, benchY,
        opts(9000, { stroke: COLORS.orange, strokeWidth: 2.2 })));

      // the lamp
      const lx = w * 0.10;
      const ly = benchY - (compact ? 52 : 66);
      this.cache.draw(`lamp-${key}`, (g) => g.circle(lx, ly, compact ? 30 : 38,
        opts(9001, { stroke: COLORS.yellow, strokeWidth: 2 })));
      this.cache.draw(`lampstem-${key}`, (g) => g.line(lx, ly + (compact ? 15 : 19), lx, benchY,
        opts(9002, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        this.cache.draw(`ray-${i}-${key}`, (g) => g.line(
          lx + Math.cos(a) * (compact ? 20 : 26), ly + Math.sin(a) * (compact ? 20 : 26),
          lx + Math.cos(a) * (compact ? 28 : 35), ly + Math.sin(a) * (compact ? 28 : 35),
          opts(9010 + i, { stroke: COLORS.yellow, strokeWidth: 1.2 })));
      }
      label(ctx, 'lamp', lx, benchY + (compact ? 15 : 18), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      // the filter
      const fx = w * 0.25;
      this.cache.draw(`filtstand-${key}`, (g) => g.line(fx, ly + (compact ? 26 : 34), fx, benchY,
        opts(9020, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      ctx.fillStyle = rgb;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(fx - 5, ly - (compact ? 24 : 30), 10, compact ? 50 : 64);
      ctx.globalAlpha = 1;
      rc.rectangle(fx - 5, ly - (compact ? 24 : 30), 10, compact ? 50 : 64,
        opts(9021, { stroke: COLORS.ink, strokeWidth: 1.4 }));
      label(ctx, `${fmtNum(this.lamNm, 0)} nm`, fx, benchY + (compact ? 15 : 18), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      // the beam
      ctx.save();
      ctx.strokeStyle = rgb;
      ctx.globalAlpha = Math.min(1, 0.30 + this.intensity * 0.16);
      ctx.lineWidth = compact ? 6 : 9;
      ctx.beginPath();
      ctx.moveTo(lx + (compact ? 26 : 34), ly);
      ctx.lineTo(w * 0.47, ly);
      ctx.stroke();
      ctx.restore();

      // the evacuated tube with the cathode and the collector ring
      const tx = w * 0.55;
      const tr = compact ? 44 : 58;
      this.cache.draw(`tube-${key}`, (g) => g.circle(tx, ly, tr * 2,
        opts(9030, { stroke: COLORS.ink, strokeWidth: 2.2 })));
      this.cache.draw(`tubestem-${key}`, (g) => g.line(tx, ly + tr, tx, benchY, opts(9031, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      // the photocathode: a curved plate on the left inside
      this.cache.draw(`cath-${key}`, (g) => g.path(
        `M ${tx - tr * 0.62} ${ly - tr * 0.55} q ${-tr * 0.25} ${tr * 0.55} 0 ${tr * 1.1}`,
        opts(9032, { stroke: this.metal.color, strokeWidth: 3 }),
      ));
      label(ctx, this.metal.name, tx - tr * 0.62, ly + tr * 0.78, { color: this.metal.color, size: compact ? 8.5 : 10.5, align: 'center' });
      // the collector ring
      this.cache.draw(`anode-${key}`, (g) => g.circle(tx + tr * 0.45, ly, compact ? 14 : 18,
        opts(9033, { stroke: COLORS.cyan, strokeWidth: 1.8 })));
      label(ctx, 'collector', tx + tr * 0.45, ly - (compact ? 22 : 28), { color: COLORS.cyan, size: compact ? 8.5 : 10.5, align: 'center' });
      label(ctx, 'evacuated', tx, ly - tr - (compact ? 8 : 11), { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });

      // the electrons in flight, or conspicuously absent
      for (const el of this.electrons) {
        const p = Math.min(1, el.t / 1.3);
        const x0 = tx - tr * 0.58;
        const x1 = tx + tr * 0.42;
        ctx.fillStyle = COLORS.green;
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.beginPath();
        ctx.arc(x0 + (x1 - x0) * p * el.v, ly + (el.fy - 0.5) * tr * 0.9, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!this.emits) {
        label(ctx, 'nothing comes out', tx, ly + tr + (compact ? 20 : 25),
          { color: COLORS.red, size: compact ? 9.5 : 12, align: 'center' });
      }

      // the retarding supply and the meter
      if (showMeter) {
        const mx = w * 0.84;
        this.cache.draw(`meter-${key}`, (g) => g.circle(mx, ly, compact ? 30 : 38, opts(9040, { stroke: COLORS.green, strokeWidth: 2 })));
        this.cache.draw(`mstem-${key}`, (g) => g.line(mx, ly + (compact ? 15 : 19), mx, benchY, opts(9041, { stroke: COLORS.muted, strokeWidth: 1.6 })));
        const flowing = this.emits && this.retardV < this.Vstop;
        const frac = flowing ? Math.max(0, 1 - this.retardV / Math.max(this.Vstop, 1e-6)) * this.intensity : 0;
        const ang = -Math.PI * 0.75 + Math.min(1, frac / 3) * Math.PI * 1.5;
        ctx.strokeStyle = flowing ? COLORS.green : COLORS.red;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(mx, ly);
        ctx.lineTo(mx + Math.cos(ang) * (compact ? 20 : 26), ly + Math.sin(ang) * (compact ? 20 : 26));
        ctx.stroke();
        label(ctx, flowing ? 'current' : 'zero', mx, benchY + (compact ? 15 : 18),
          { color: flowing ? COLORS.green : COLORS.red, size: compact ? 9 : 11, align: 'center' });
        // the wire and the retarding battery
        ctx.strokeStyle = COLORS.muted;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tx + tr, ly); ctx.lineTo(mx - (compact ? 30 : 38), ly);
        ctx.stroke();
        this.cache.draw(`batt-${key}`, (g) => g.path(
          `M ${(tx + tr + mx) / 2 - 6} ${ly - 12} l 0 24 M ${(tx + tr + mx) / 2 + 4} ${ly - 7} l 0 14`,
          opts(9042, { stroke: COLORS.yellow, strokeWidth: 2 }),
        ));
        label(ctx, `${fmtNum(this.retardV, 2)} V`, (tx + tr + mx) / 2, ly - (compact ? 18 : 22),
          { color: COLORS.yellow, size: compact ? 9 : 11, align: 'center' });
      }
      return { benchY, ly, tx, tr };
    }

    renderBench() {
      const { ctx, w, h } = this;
      const compact = w < 640;
      this.drawApparatus(compact, true);
      const m = this.metal;
      label(ctx, this.emits
        ? `stopping voltage = ${fmtNum(this.Vstop, 3)} V   ·   e·V = hf − φ`
        : `below threshold — ${m.name} needs ${fmtNum(thresholdNm(m.phi), 0)} nm or shorter`,
      w / 2, compact ? 20 : 26, { color: this.emits ? COLORS.yellow : COLORS.red, size: compact ? 10.5 : 15, align: 'center' });
      label(ctx, compact ? 'turn the voltage up until the current dies' : 'turn the retarding voltage up until the current dies — that voltage is the whole measurement',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    // ---- 2: the Millikan plot — V_stop against f, and h out of the slope ----
    renderMillikan() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const gx = compact ? w * 0.16 : w * 0.11;
      const gw = (compact ? w * 0.78 : w * 0.54);
      const gy = h * 0.20;
      const gh = h * 0.50;
      const F0 = 3.5e14;
      const F1 = 1.6e15;
      const V1 = 4.2;
      const xOf = (f) => gx + ((f - F0) / (F1 - F0)) * gw;
      const yOf = (V) => gy + gh - ((V + 1) / (V1 + 1)) * gh;

      this.cache.draw(`ax-${key}`, (g) => g.line(gx, gy, gx, gy + gh, opts(9100, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      this.cache.draw(`ay-${key}`, (g) => g.line(gx, yOf(0), gx + gw, yOf(0), opts(9101, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      label(ctx, 'V_stop', gx - 6, gy - 4, { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'right' });
      label(ctx, 'frequency', gx + gw, yOf(0) + (compact ? 28 : 34), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'right' });
      for (let v = 0; v <= 4; v += 1) {
        this.cache.draw(`vt-${v}-${key}`, (g) => g.line(gx - 4, yOf(v), gx + 4, yOf(v), opts(9110 + v, { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, `${v} V`, gx - 7, yOf(v) + 4, { color: COLORS.muted, size: compact ? 8.5 : 10, align: 'right' });
      }
      [[4e14, '400'], [8e14, '800'], [1.2e15, '1200']].forEach(([f, t], i) => {
        this.cache.draw(`ft-${i}-${key}`, (g) => g.line(xOf(f), yOf(0) - 4, xOf(f), yOf(0) + 4, opts(9120 + i, { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, `${t} THz`, xOf(f), yOf(0) + (compact ? 15 : 18), { color: COLORS.muted, size: compact ? 8 : 9.5, align: 'center' });
      });

      // the true line for this metal, as the prediction
      const m = this.metal;
      const fTh = (m.phi * E_CH) / H_PL;
      ctx.strokeStyle = m.color;
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xOf(fTh), yOf(0));
      ctx.lineTo(xOf(F1), yOf(stopVolts((C_L / F1) * 1e9, m.phi)));
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, compact ? 'eV = hf − φ' : `Einstein:  e·V = hf − φ   (${m.name})`,
        xOf(F1 * 0.72), yOf(stopVolts((C_L / (F1 * 0.72)) * 1e9, m.phi)) - (compact ? 9 : 12),
        { color: m.color, size: compact ? 9 : 11.5 });
      // the threshold, where the line crosses zero
      ctx.fillStyle = COLORS.red;
      ctx.beginPath(); ctx.arc(xOf(fTh), yOf(0), 3.4, 0, Math.PI * 2); ctx.fill();
      label(ctx, compact ? 'f₀' : `f₀ = φ/h = ${sci(fTh, 3)} Hz`, xOf(fTh) + 6, yOf(0) - (compact ? 7 : 9),
        { color: COLORS.red, size: compact ? 8.5 : 10.5 });

      // the reader's points, and their fit
      ctx.fillStyle = COLORS.green;
      this.points.forEach((p) => {
        const x = xOf(p.f);
        const y = yOf(p.V);
        if (x < gx || x > gx + gw) return;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      });
      const f = this.fit();
      if (f) {
        ctx.strokeStyle = COLORS.green;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xOf(F0), yOf(f.slope * F0 + f.inter));
        ctx.lineTo(xOf(F1), yOf(f.slope * F1 + f.inter));
        ctx.stroke();
      }

      // the answer box
      const bx = compact ? w * 0.06 : w * 0.69;
      const bw = compact ? w * 0.88 : w * 0.27;
      const by = compact ? h * 0.76 : h * 0.22;
      this.cache.draw(`hbox-${key}`, (g) => g.rectangle(bx, by, bw, compact ? h * 0.17 : h * 0.34,
        opts(9130, { stroke: COLORS.yellow, strokeWidth: 1.8 })));
      label(ctx, 'PLANCK\'S CONSTANT', bx + bw / 2, by + (compact ? 15 : 21), { color: COLORS.yellow, size: compact ? 9.5 : 12, align: 'center' });
      label(ctx, 'h = slope × e', bx + bw / 2, by + (compact ? 29 : 40), { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });
      label(ctx, f ? sci(f.h, 5) : '— record points —', bx + bw / 2, by + (compact ? 48 : 68),
        { color: COLORS.green, size: compact ? 11.5 : 15, align: 'center' });
      if (!compact) {
        label(ctx, 'J·s', bx + bw / 2, by + 86, { color: COLORS.muted, size: 10.5, align: 'center' });
        label(ctx, 'true value', bx + bw / 2, by + 110, { color: COLORS.muted, size: 10, align: 'center' });
        label(ctx, '6.62607015×10⁻³⁴', bx + bw / 2, by + 128, { color: COLORS.cyan, size: 12, align: 'center' });
        if (f) label(ctx, `φ from intercept: ${fmtNum(f.phi, 2)} eV`, bx + bw / 2, by + 150, { color: COLORS.pink, size: 10.5, align: 'center' });
      }

      label(ctx, `${fmtNum(this.points.length, 0)} points recorded — set a colour, then press "record this point"`,
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10 : 14.5, align: 'center' });
      label(ctx, compact ? 'the slope is h/e' : 'a straight line whose slope is h/e and whose intercept is the work function — Millikan, 1916',
        w / 2, compact ? 34 : 43, { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
      void rc;
    }

    // ---- 3: intensity changes the count, not the energy ----
    renderBright() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      this.drawApparatus(compact, false);

      // two bars: how many, and how fast
      const bx = compact ? w * 0.06 : w * 0.08;
      const bw = compact ? w * 0.36 : w * 0.30;
      const by = h * 0.10;
      const bh = compact ? 16 : 20;
      const drawBar = (y, frac, color, title, val) => {
        this.cache.draw(`b-${Math.round(y)}-${key}`, (g) => g.rectangle(bx, y, bw, bh,
          opts(9200 + Math.round(y) % 89, { stroke: COLORS.muted, strokeWidth: 1.3 })));
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(bx + 1, y + 1, (bw - 2) * Math.max(0, Math.min(1, frac)), bh - 2);
        ctx.globalAlpha = 1;
        label(ctx, title, bx, y - 5, { color: COLORS.muted, size: compact ? 8.5 : 10.5 });
        label(ctx, val, bx + bw + 6, y + bh - 4, { color, size: compact ? 9 : 11 });
      };
      const emits = this.emits;
      drawBar(by, emits ? this.intensity / 5 : 0, COLORS.green, 'HOW MANY electrons per second',
        emits ? `${fmtNum(this.intensity, 2)}× the current` : 'zero');
      drawBar(by + (compact ? 44 : 54), emits ? this.Vstop / 4 : 0, COLORS.pink, 'HOW FAST each one comes off',
        emits ? `${fmtNum(this.Vstop, 3)} eV` : '—');
      label(ctx, compact ? 'brightness moves the top bar only' : 'the brightness slider moves the top bar and does not touch the bottom one',
        bx, by + (compact ? 80 : 96), { color: COLORS.yellow, size: compact ? 9 : 11 });

      // the threshold, drawn on a strip of real colours
      const sx = compact ? w * 0.06 : w * 0.55;
      const sw = compact ? w * 0.88 : w * 0.40;
      const sy = compact ? h * 0.30 : h * 0.13;
      const shh = compact ? 20 : 26;
      for (let i = 0; i < sw; i++) {
        const lam = 200 + (i / sw) * 500;
        ctx.fillStyle = lam < 380 ? '#6a3d9a' : wavelengthRGB(lam);
        ctx.globalAlpha = lam < 380 ? 0.45 : 0.9;
        ctx.fillRect(sx + i, sy, 1.4, shh);
      }
      ctx.globalAlpha = 1;
      const th = thresholdNm(this.metal.phi);
      const thX = sx + ((th - 200) / 500) * sw;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(thX, sy - 6); ctx.lineTo(thX, sy + shh + 6); ctx.stroke();
      label(ctx, `λ₀ = ${fmtNum(th, 0)} nm`, thX, sy - 10, { color: COLORS.ink, size: compact ? 9 : 11, align: 'center' });
      label(ctx, compact ? 'emits' : 'emits ←', sx + 6, sy + shh + (compact ? 14 : 17), { color: COLORS.green, size: compact ? 8.5 : 10.5 });
      label(ctx, compact ? 'nothing, ever' : '→ nothing, at any brightness', sx + sw - 6, sy + shh + (compact ? 14 : 17),
        { color: COLORS.red, size: compact ? 8.5 : 10.5, align: 'right' });
      // where the reader's filter sits
      const myX = sx + ((this.lamNm - 200) / 500) * sw;
      doodleArrow(rc, myX, sy + shh + (compact ? 30 : 36), myX, sy + shh + 6, { color: COLORS.yellow, seed: 9210, strokeWidth: 1.5 });

      label(ctx, emits ? 'brighter light: more electrons, at exactly the same energy'
        : 'below threshold — and no amount of brightness will change that',
      w / 2, compact ? 20 : 26, { color: emits ? COLORS.yellow : COLORS.red, size: compact ? 10.5 : 15, align: 'center' });
      void stickFigure;
    }

    // ---- 4: the delay that classical physics demands, and nature does not ----
    renderDelay() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const key = `${w}x${h}`;
      const wait = this.classicalWait();

      // top: the wave picture, an atom slowly filling like a bucket
      const ty = h * 0.30;
      const cx1 = compact ? w * 0.26 : w * 0.24;
      label(ctx, compact ? 'WAVE PICTURE' : 'IF LIGHT WERE A WAVE', cx1, h * 0.14, { color: COLORS.orange, size: compact ? 10 : 12.5, align: 'center' });
      // the bucket
      const bw2 = compact ? 46 : 60;
      const bh2 = compact ? 54 : 70;
      this.cache.draw(`bucket-${key}`, (g) => g.path(
        `M ${cx1 - bw2 / 2} ${ty - bh2 / 2} l ${bw2 * 0.12} ${bh2} l ${bw2 * 0.76} 0 l ${bw2 * 0.12} ${-bh2} Z`,
        opts(9300, { stroke: COLORS.orange, strokeWidth: 1.8 }),
      ));
      const fill = (this.simT * 0.12) % 1;
      ctx.fillStyle = COLORS.orange;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(cx1 - bw2 * 0.36, ty + bh2 / 2 - fill * bh2 * 0.9, bw2 * 0.72, fill * bh2 * 0.9);
      ctx.globalAlpha = 1;
      label(ctx, compact ? 'energy trickles in' : 'energy trickles in over the whole wavefront',
        cx1, ty + bh2 / 2 + (compact ? 16 : 20), { color: COLORS.muted, size: compact ? 8.5 : 10.5, align: 'center' });
      label(ctx, `wait ${fmtNum(wait, 0)} s`, cx1, ty + bh2 / 2 + (compact ? 30 : 38), { color: COLORS.red, size: compact ? 11 : 14, align: 'center' });
      label(ctx, `= ${fmtNum(wait / 60, 1)} minutes`, cx1, ty + bh2 / 2 + (compact ? 44 : 55), { color: COLORS.muted, size: compact ? 9 : 11, align: 'center' });

      // bottom: the quantum picture, occasional whole photons
      const qy = h * 0.72;
      label(ctx, compact ? 'QUANTUM PICTURE' : 'IF LIGHT ARRIVES IN LUMPS', cx1, qy - (compact ? 46 : 58),
        { color: COLORS.cyan, size: compact ? 10 : 12.5, align: 'center' });
      for (let i = 0; i < 5; i++) {
        const p = ((this.simT * 0.6 + i * 0.2) % 1);
        ctx.fillStyle = COLORS.yellow;
        ctx.globalAlpha = 1 - p;
        ctx.beginPath();
        ctx.arc(cx1 - (compact ? 70 : 92) + p * (compact ? 66 : 88), qy - 6 + Math.sin(i * 2) * 8, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      this.cache.draw(`atom-${key}`, (g) => g.circle(cx1 + (compact ? 4 : 6), qy, compact ? 26 : 34,
        opts(9310, { stroke: COLORS.cyan, strokeWidth: 1.8 })));
      doodleArrow(rc, cx1 + (compact ? 20 : 26), qy, cx1 + (compact ? 54 : 70), qy - (compact ? 14 : 18),
        { color: COLORS.green, seed: 9311, strokeWidth: 1.6 });
      label(ctx, compact ? 'out at once' : 'out immediately, or not at all', cx1 + (compact ? 58 : 76), qy - (compact ? 20 : 26),
        { color: COLORS.green, size: compact ? 8.5 : 10.5 });
      label(ctx, 'measured: < 1 ns', cx1, qy + (compact ? 38 : 48), { color: COLORS.green, size: compact ? 11 : 14, align: 'center' });

      // the scale bar between them
      const bx = compact ? w * 0.52 : w * 0.52;
      const bw3 = w - bx - (compact ? 12 : 30);
      const by3 = h * 0.22;
      const bh3 = h * 0.50;
      this.cache.draw(`sax-${key}`, (g) => g.line(bx + bw3 * 0.2, by3, bx + bw3 * 0.2, by3 + bh3,
        opts(9320, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      const LO = -10;
      const HI = 3;
      const yOf = (lg) => by3 + ((HI - lg) / (HI - LO)) * bh3;
      [[Math.log10(wait), `classical prediction: ${fmtNum(wait, 0)} s`, COLORS.red],
        [0, 'one second', COLORS.muted],
        [-3, 'one millisecond', COLORS.muted],
        [-9, 'measured: under a nanosecond', COLORS.green]].forEach((mk, i) => {
        const y = yOf(mk[0]);
        ctx.fillStyle = mk[2];
        ctx.beginPath(); ctx.arc(bx + bw3 * 0.2, y, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = mk[2];
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx + bw3 * 0.2, y); ctx.lineTo(bx + bw3 * 0.28, y); ctx.stroke();
        ctx.globalAlpha = 1;
        label(ctx, mk[1], bx + bw3 * 0.31, y + 4, { color: mk[2], size: compact ? 8.5 : 10.5 });
        void i;
      });
      // the gap, drawn as a gap
      ctx.strokeStyle = COLORS.red;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bx + bw3 * 0.13, yOf(Math.log10(wait)));
      ctx.lineTo(bx + bw3 * 0.13, yOf(-9));
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, `${sci(wait / 1e-9, 1)}×`, bx + bw3 * 0.11, (yOf(Math.log10(wait)) + yOf(-9)) / 2,
        { color: COLORS.red, size: compact ? 9 : 11.5, align: 'right' });

      label(ctx, `classical physics says wait ${fmtNum(wait / 60, 1)} minutes. Nature answers instantly.`,
        w / 2, compact ? 20 : 26, { color: COLORS.yellow, size: compact ? 10 : 14.5, align: 'center' });
      label(ctx, compact ? 'wrong by 11 orders of magnitude' : 'a discrepancy of eleven orders of magnitude — and you do not need to measure the delay, only to notice there is not one',
        w / 2, h - (compact ? 30 : 34), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    render() {
      ({
        bench: () => this.renderBench(),
        millikan: () => this.renderMillikan(),
        bright: () => this.renderBright(),
        delay: () => this.renderDelay(),
      })[this.mode]();
    }
  }

  void CIT_HALLWACHS; void CIT_COMPTON;

  A.register('photoelectric', PhotoelectricSim);
})();
