// Sim 18 — Why stars have colors (blackbody radiation).
//
// Planck's law B_λ(T) = (2hc²/λ⁵) / (e^{hc/λk_BT} − 1) is plotted live; the
// Wien peak λ_max = b/T is marked; the doodle star is filled with the real
// perceived colour via blackbodyRGB(T). Stefan–Boltzmann flux σT⁴ and the
// same-radius luminosity ratio (T/T_sun)⁴ are computed. Verified: Sun 5772 K
// → λ_max 502 nm.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, sparkle, blackbodyRGB, wavelengthRGB,
    slider, buttonRow, setReadout, fmtNum, sci,
  } = A;

  const H = 6.626e-34;
  const C = 2.998e8;
  const KB = 1.381e-23;
  const B_WIEN = 2.898e-3;    // m·K
  const SIGMA = 5.670e-8;     // W m^-2 K^-4
  const T_SUN = 5772;
  const PLOT_NM = 1600;       // wavelength axis max (nm)

  const PRESETS = [
    { label: 'Betelgeuse ~3500K', T: 3500 },
    { label: 'the Sun 5772K', T: 5772 },
    { label: 'Sirius ~9900K', T: 9940 },
    { label: 'blue giant 30000K', T: 30000 },
  ];

  // Planck spectral radiance (SI), λ in metres
  function planck(lam, T) {
    const x = (H * C) / (lam * KB * T);
    return ((2 * H * C * C) / Math.pow(lam, 5)) / (Math.exp(x) - 1);
  }

  function colorName(T) {
    if (T < 3900) return 'red';
    if (T < 5300) return 'orange';
    if (T < 6000) return 'yellow-white';
    if (T < 7500) return 'white';
    if (T < 10000) return 'blue-white';
    return 'blue';
  }

  class BlackbodySim extends Sim {
    init() {
      this.T = 5772;
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.tSlider = slider(c, {
        label: 'temperature',
        min: 2000, max: 40000, step: 100, value: this.T,
        format: (v) => `${fmtNum(v, 0)} K`,
        oninput: (v) => { this.T = v; this.presets.select(null); this.updateReadout(); this.poke(); },
      });
      this.presets = buttonRow(c, PRESETS.map((p, i) => ({ label: p.label, value: i })), {
        initial: 1,
        onSelect: (i) => {
          this.T = PRESETS[i].T;
          this.tSlider.set(this.T);
          this.cite(i === 1
            ? '1900 Planck - Zur Theorie des Gesetzes der Energieverteilung im Normalspektrum'
            : '1893 Wien - Eine neue Beziehung der Strahlung schwarzer Körper zum zweiten Hauptsatz der Wärmetheorie');
          this.updateReadout();
          this.poke();
        },
      });
    }

    updateReadout() {
      const lamMaxNm = (B_WIEN / this.T) * 1e9;
      const flux = SIGMA * Math.pow(this.T, 4);
      const lumRatio = Math.pow(this.T / T_SUN, 4);
      let band = 'infrared';
      if (lamMaxNm >= 380 && lamMaxNm <= 750) band = 'visible';
      else if (lamMaxNm < 380) band = 'ultraviolet';
      setReadout(this.readoutEl, [
        [
          ['T = ', null], [`${fmtNum(this.T, 0)} K`, 'orange'],
          ['   ·   peak wavelength λ_max = b/T = ', null], [`${fmtNum(lamMaxNm, 0)} nm`, 'cyan'],
          [` (${band})`, null],
        ],
        [
          ['perceived colour: ', null], [colorName(this.T), 'yellow'],
          ['   ·   surface glow σT⁴ = ', null], [`${sci(flux, 2)} W/m²`, 'green'],
        ],
        [
          ['at the Sun\'s size it would shine ', null],
          [`${lumRatio >= 1 ? sci(lumRatio, 2) : fmtNum(lumRatio, 2)}×`, 'pink'],
          [' as bright as the Sun — brightness scales as T⁴, so a hotter star is dramatically more luminous.', null],
        ],
        [[
          this.T > 9000 ? 'its peak is in the ultraviolet — it looks blue-white, but pours out most of its power in colours we can\'t see.'
            : this.T < 3900 ? 'a cool star: peak in the infrared, only its red tail is visible.'
              : 'peaks near the visible band — which is exactly the light our eyes evolved to use.',
          'muted',
        ]],
      ]);
    }

    update(dt) { this.t += dt; }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const starColor = blackbodyRGB(this.T);

      // --- the star (left) ---
      const scx = compact ? w * 0.5 : w * 0.22;
      const scy = compact ? h * 0.26 : h * 0.42;
      const R = Math.min(w, h) * (compact ? 0.13 : 0.17);
      // glow halo
      const grad = ctx.createRadialGradient(scx, scy, R * 0.4, scx, scy, R * 1.8);
      grad.addColorStop(0, starColor);
      grad.addColorStop(1, 'rgba(30,30,30,0)');
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(scx, scy, R * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // body
      ctx.fillStyle = starColor;
      ctx.beginPath(); ctx.arc(scx, scy, R, 0, Math.PI * 2); ctx.fill();
      rc.circle(scx, scy, R * 2, opts(950, { stroke: COLORS.ink, strokeWidth: 1.6 }));
      // doodle rays
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.2;
        rc.line(scx + Math.cos(a) * (R + 6), scy + Math.sin(a) * (R + 6), scx + Math.cos(a) * (R + 20), scy + Math.sin(a) * (R + 20), opts(951 + i, { stroke: starColor, strokeWidth: 1.6 }));
      }
      label(ctx, `${fmtNum(this.T, 0)} K → ${colorName(this.T)}`, scx, scy + R + 34, { color: COLORS.ink, size: 13, align: 'center' });

      // --- Planck curve (right / bottom) ---
      const px0 = compact ? 44 : w * 0.46;
      const px1 = w - 26;
      const py0 = compact ? h * 0.5 : 44;
      const py1 = h - 54;
      const X = (nm) => px0 + (nm / PLOT_NM) * (px1 - px0);
      // sample the curve; normalise to its own max so it always fits
      const N = 140;
      let peak = 0;
      const ys = [];
      for (let i = 0; i <= N; i++) {
        const nm = (i / N) * PLOT_NM;
        const lam = Math.max(nm, 1) * 1e-9;
        const v = planck(lam, this.T);
        ys.push(v);
        if (v > peak) peak = v;
      }
      const Y = (v) => py1 - (v / peak) * (py1 - py0);
      this.cache.draw(`bbaxes-${w}x${h}`, (g) => g.path(`M ${px0} ${py0} L ${px0} ${py1} L ${px1} ${py1}`, opts(960, { stroke: COLORS.muted, strokeWidth: 1.3 })));
      label(ctx, 'brightness', px0 + 2, py0 - 6, { color: COLORS.muted, size: 10.5, align: 'left' });
      label(ctx, 'wavelength (nm) →', (px0 + px1) / 2, py1 + 32, { color: COLORS.muted, size: 11, align: 'center' });

      // visible band rainbow strip under the axis
      for (let nm = 380; nm <= 750 && X(nm) < px1; nm += 3) {
        ctx.fillStyle = wavelengthRGB(nm);
        ctx.globalAlpha = 0.85;
        ctx.fillRect(X(nm), py1 + 2, 2.2, 10);
        ctx.globalAlpha = 1;
      }
      label(ctx, 'visible', X(565), py1 + 24, { color: COLORS.muted, size: 10, align: 'center' });

      // the Planck curve, colored by local wavelength
      ctx.lineWidth = 2.4;
      for (let i = 1; i <= N; i++) {
        const nm0 = ((i - 1) / N) * PLOT_NM;
        const nm1 = (i / N) * PLOT_NM;
        ctx.strokeStyle = (nm1 >= 380 && nm1 <= 750) ? wavelengthRGB(nm1) : (nm1 < 380 ? '#b98cff' : '#8a1010');
        ctx.beginPath();
        ctx.moveTo(X(nm0), Y(ys[i - 1]));
        ctx.lineTo(X(nm1), Y(ys[i]));
        ctx.stroke();
      }
      // Wien peak marker
      const lamMaxNm = (B_WIEN / this.T) * 1e9;
      if (lamMaxNm <= PLOT_NM) {
        const mx = X(lamMaxNm);
        ctx.strokeStyle = COLORS.yellow;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(mx, py0); ctx.lineTo(mx, py1); ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, `peak ${fmtNum(lamMaxNm, 0)} nm`, mx, py0 + 12, { color: COLORS.yellow, size: 11.5, align: 'center' });
      } else {
        label(ctx, `peak at ${fmtNum(lamMaxNm, 0)} nm → off-scale in the ultraviolet`, (px0 + px1) / 2, py0 + 12, { color: COLORS.yellow, size: 11.5, align: 'center' });
      }
      sparkle(rc, px1 - 14, py0 + 8, 5, { color: COLORS.pink, seed: 970 });
      label(ctx, 'hotter → peak slides blue (Wien) · whole curve rises as T⁴', (px0 + px1) / 2, py0 - 4, { color: COLORS.muted, size: compact ? 10.5 : 12, align: 'center' });
    }
  }

  A.register('blackbody', BlackbodySim);
})();
