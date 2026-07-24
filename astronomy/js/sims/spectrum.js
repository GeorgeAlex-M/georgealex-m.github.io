// Sim 17 — The electromagnetic spectrum.
//
// One log-wavelength axis from km radio to sub-picometre gamma. Every readout
// is computed: f = c/λ, E = hc/λ (shown in eV via E[eV] = 1240/λ[nm] and in
// joules). Bands, typical sources/detectors, and atmospheric transparency are
// real. A visible-light zoom draws the true perceived colours via wavelengthRGB.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, wavelengthRGB,
    slider, setReadout, fmtNum, sci,
  } = A;

  const C = 2.998e8;       // m/s
  const H = 6.626e-34;     // J·s
  const EV = 1.602e-19;    // J

  // bands: [maxλ (m, inclusive upper), name, repColor, source, detector, atmosphere]
  const BANDS = [
    [1e3, 1e-1, 'radio', COLORS.muted, 'pulsars, cosmic hydrogen, TV/radio masts', 'radio telescopes, antennas', 'passes — the radio window'],
    [1e-1, 1e-3, 'microwave', COLORS.cyan, 'the CMB, cold molecular clouds; ovens, WiFi, radar', 'horn antennas, Planck satellite', 'mostly passes'],
    [1e-3, 7.5e-7, 'infrared', COLORS.red, 'warm dust, forming stars, warm bodies', 'JWST (cooled), IR cameras', 'MOSTLY BLOCKED by water vapour'],
    [7.5e-7, 3.8e-7, 'visible', COLORS.yellow, 'the Sun and stars', 'your eyes, optical telescopes', 'passes — the optical window'],
    [3.8e-7, 1e-8, 'ultraviolet', COLORS.pink, 'hot young stars', 'UV space telescopes', 'BLOCKED by ozone (lucky for us)'],
    [1e-8, 1e-11, 'X-ray', COLORS.green, 'accretion disks, black-hole gas, the Sun\'s corona', 'Chandra, XMM — in orbit', 'BLOCKED entirely'],
    [1e-11, 1e-14, 'gamma ray', COLORS.orange, 'supernovae, pulsars, matter–antimatter', 'Fermi space telescope', 'BLOCKED entirely'],
  ];
  const LOG_HI = 3;    // log10(λ) at far left (1 km)
  const LOG_LO = -13;  // far right

  function bandOf(lam) {
    for (const b of BANDS) if (lam <= b[0] && lam > b[1]) return b;
    return BANDS[BANDS.length - 1];
  }

  class SpectrumSim extends Sim {
    init() {
      this.logLam = Math.log10(5.5e-7); // start on green light
      this.t = 0;
      this.buildControls();
      this.bindPointer();
      this.updateReadout();
    }

    get lam() { return Math.pow(10, this.logLam); }

    buildControls() {
      const c = this.controlsEl;
      this.slider = slider(c, {
        label: 'wavelength',
        min: LOG_LO, max: LOG_HI, step: 0.01, value: this.logLam,
        format: () => this.fmtLam(this.lam),
        oninput: (v) => { this.logLam = v; this.updateReadout(); this.poke(); },
      });
    }

    bindPointer() {
      this.canvasEl.addEventListener('pointerdown', (e) => {
        const rect = this.canvasEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const { ax0, ax1 } = this.axis();
        if (x < ax0 || x > ax1) return;
        const f = (x - ax0) / (ax1 - ax0);
        this.logLam = LOG_HI - f * (LOG_HI - LOG_LO);
        this.slider.set(this.logLam);
        this.updateReadout();
        this.poke();
      });
    }

    axis() {
      return { ax0: this.w * 0.06, ax1: this.w * 0.94, ay: this.h * 0.44 };
    }
    X(lam) {
      const { ax0, ax1 } = this.axis();
      const f = (LOG_HI - Math.log10(lam)) / (LOG_HI - LOG_LO);
      return ax0 + f * (ax1 - ax0);
    }

    fmtLam(m) {
      if (m >= 1) return `${fmtNum(m, 1)} m`;
      if (m >= 1e-3) return `${fmtNum(m * 1e3, 1)} mm`;
      if (m >= 1e-6) return `${fmtNum(m * 1e6, 1)} µm`;
      if (m >= 1e-9) return `${fmtNum(m * 1e9, 1)} nm`;
      if (m >= 1e-12) return `${fmtNum(m * 1e12, 1)} pm`;
      return `${sci(m, 1)} m`;
    }

    updateReadout() {
      const lam = this.lam;
      const f = C / lam;
      const eJ = (H * C) / lam;
      const eV = eJ / EV;
      const b = bandOf(lam);
      // BANDS entry = [maxλ, minλ, name, repColor, source, detector, atmosphere]
      const source = b[4];
      const detector = b[5];
      const atmosphere = b[6];
      const blocked = atmosphere.includes('BLOCKED');
      const nm = lam * 1e9;
      const inVisible = nm >= 380 && nm <= 750;
      setReadout(this.readoutEl, [
        [
          ['λ = ', null], [this.fmtLam(lam), 'cyan'],
          ['   ·   f = ', null], [`${sci(f, 2)} Hz`, 'yellow'],
          ['   ·   photon energy = ', null], [`${sci(eV, 2)} eV`, 'orange'],
          [` (${sci(eJ, 1)} J)`, null],
        ],
        [
          ['band: ', null], [b[2].toUpperCase(), 'pink'],
          inVisible ? ['  —  you see this as ', null] : ['', null],
          inVisible ? [this.colorName(nm), 'green'] : ['', null],
        ],
        [['made by: ', null], [source, null], ['   ·   seen with: ', null], [detector, null]],
        [
          ['through Earth\'s atmosphere: ', null],
          [atmosphere, blocked ? 'red' : 'green'],
          [blocked ? '  →  needs a space telescope' : '', null],
        ],
      ]);
    }

    colorName(nm) {
      if (nm < 450) return 'violet';
      if (nm < 495) return 'blue';
      if (nm < 570) return 'green';
      if (nm < 590) return 'yellow';
      if (nm < 620) return 'orange';
      return 'red';
    }

    update(dt) { this.t += dt; }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const { ax0, ax1, ay } = this.axis();
      const barH = 30;

      // --- the band strip ---
      for (const b of BANDS) {
        const xL = this.X(b[0]);
        const xR = this.X(b[1]);
        if (b[2] === 'visible') {
          // real rainbow
          for (let x = xL; x < xR; x += 1.5) {
            const f = (x - xL) / (xR - xL);
            const nm = 750 - f * (750 - 380);
            ctx.fillStyle = wavelengthRGB(nm);
            ctx.fillRect(x, ay - barH, 2, barH);
          }
        } else {
          ctx.fillStyle = b[3];
          ctx.globalAlpha = 0.35;
          ctx.fillRect(xL, ay - barH, xR - xL, barH);
          ctx.globalAlpha = 1;
        }
        const midX = (xL + xR) / 2;
        if (midX > ax0 - 10 && midX < ax1 + 10) {
          label(ctx, b[2], midX, ay + 16, { color: b[3] === COLORS.yellow ? COLORS.ink : b[3], size: compact ? 10.5 : 12.5, align: 'center' });
        }
      }
      // axis outline
      this.cache.draw(`frame-${w}x${h}`, (g) => g.rectangle(ax0, ay - barH, ax1 - ax0, barH, opts(900, { stroke: COLORS.ink, strokeWidth: 1.6 })));

      // wavelength gridline labels
      for (let e = LOG_HI; e >= LOG_LO; e -= 3) {
        const x = this.X(Math.pow(10, e));
        this.cache.draw(`tick-${e}-${w}x${h}`, (g) => g.line(x, ay + 24, x, ay + 30, opts(910 + e, { stroke: COLORS.muted, strokeWidth: 1 })));
        label(ctx, this.fmtLam(Math.pow(10, e)), x, ay + 42, { color: COLORS.muted, size: 10, align: 'center' });
      }

      // --- atmospheric opacity strip (above) ---
      const oy = ay - barH - 30;
      label(ctx, 'from the ground, you can only see through the shaded gaps ↓', (ax0 + ax1) / 2, oy - 12, { color: COLORS.muted, size: compact ? 10.5 : 12, align: 'center' });
      for (const b of BANDS) {
        const passes = !b[6].includes('BLOCKED');
        const xL = this.X(b[0]);
        const xR = this.X(b[1]);
        if (passes) {
          ctx.fillStyle = COLORS.green;
          ctx.globalAlpha = 0.18;
          ctx.fillRect(xL, oy, xR - xL, 16);
          ctx.globalAlpha = 1;
        } else {
          // opaque hatch
          ctx.strokeStyle = COLORS.red;
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 1;
          for (let x = xL; x < xR; x += 6) { ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x - 8, oy + 16); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
      }
      this.cache.draw(`oframe-${w}x${h}`, (g) => g.rectangle(ax0, oy, ax1 - ax0, 16, opts(920, { stroke: COLORS.muted, strokeWidth: 1.2 })));
      label(ctx, 'atmosphere', ax0 - 4, oy + 12, { color: COLORS.muted, size: 10.5, align: 'right' });

      // --- the marker ---
      const mx = this.X(this.lam);
      doodleArrow(rc, mx, ay - barH - 46, mx, ay - barH - 4, { color: COLORS.yellow, seed: 930, strokeWidth: 2 });
      const nm = this.lam * 1e9;
      const mcol = (nm >= 380 && nm <= 750) ? wavelengthRGB(nm) : COLORS.yellow;
      ctx.fillStyle = mcol;
      ctx.beginPath(); ctx.arc(mx, ay - barH / 2, 6, 0, Math.PI * 2); ctx.fill();

      // --- visible-light zoom (bottom) ---
      const vy = h - (compact ? 54 : 70);
      const vL = this.X(7.5e-7);
      const vR = this.X(3.8e-7);
      const zx0 = w * 0.28;
      const zx1 = w * 0.72;
      // connector lines from the tiny visible band to the big zoom
      ctx.strokeStyle = COLORS.muted;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(vL, ay); ctx.lineTo(zx0, vy - 14); ctx.moveTo(vR, ay); ctx.lineTo(zx1, vy - 14); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      for (let x = zx0; x < zx1; x += 1.5) {
        const f = (x - zx0) / (zx1 - zx0);
        const wl = 750 - f * (750 - 380);
        ctx.fillStyle = wavelengthRGB(wl);
        ctx.fillRect(x, vy - 14, 2, 26);
      }
      this.cache.draw(`vframe-${w}x${h}`, (g) => g.rectangle(zx0, vy - 14, zx1 - zx0, 26, opts(940, { stroke: COLORS.ink, strokeWidth: 1.4 })));
      label(ctx, 'the sliver our eyes can see: 380–750 nm — one octave out of ~50', (zx0 + zx1) / 2, vy + 28, { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });
      label(ctx, 'violet', zx0 + 6, vy + 4, { color: '#c86bfa', size: 11, align: 'left' });
      label(ctx, 'red', zx1 - 6, vy + 4, { color: COLORS.red, size: 11, align: 'right' });

      label(ctx, 'drag the marker or click the spectrum', w / 2, 20, { color: COLORS.yellow, size: 13, align: 'center' });
    }
  }

  A.register('spectrum', SpectrumSim);
})();
