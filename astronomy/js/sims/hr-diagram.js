// Sim 22 — The Hertzsprung–Russell diagram.
//
// Real stars plotted by temperature (x, REVERSED: hot on the left, log) and
// luminosity (y, log, L_sun). Main sequence, giants and white dwarfs appear as
// the natural clustering. A mass slider places "your star" on the main sequence
// via L ≈ M^3.5 and an interpolated surface temperature; "age it" animates its
// track off the main sequence. Lifetime ≈ 10 Gyr · M^-2.5.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, sparkle, blackbodyRGB,
    slider, actionButton, setReadout, fmtNum, fmtTime, YEAR,
  } = A;

  // real stars: [name, T (K), L (L_sun), kind]
  const STARS = [
    ['Sun', 5772, 1, 'ms'],
    ['Sirius A', 9940, 25, 'ms'],
    ['Vega', 9600, 40, 'ms'],
    ['Proxima Cen', 3040, 0.0017, 'ms'],
    ['Barnard\'s', 3130, 0.0035, 'ms'],
    ['Rigel', 12100, 120000, 'sg'],
    ['Betelgeuse', 3500, 90000, 'sg'],
    ['Aldebaran', 3900, 400, 'giant'],
    ['Arcturus', 4290, 170, 'giant'],
    ['Sirius B', 25000, 0.03, 'wd'],
    ['Spica', 22400, 12000, 'ms'],
  ];

  const T_HI = 42000;  // left edge
  const T_LO = 2500;   // right edge
  const L_LO = 1e-4;
  const L_HI = 1e6;

  function msTemp(M) {
    const pts = [[0.1, 2900], [0.5, 3800], [1, 5772], [2, 9000], [5, 17000], [10, 22000], [20, 35000], [40, 42000]];
    if (M <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (M <= pts[i][0]) {
        const f = (Math.log10(M) - Math.log10(pts[i - 1][0])) / (Math.log10(pts[i][0]) - Math.log10(pts[i - 1][0]));
        return pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1]);
      }
    }
    return pts[pts.length - 1][1];
  }
  function msLum(M) { return Math.pow(M, 3.5); }
  function lifetimeGyr(M) { return 10 * Math.pow(M, -2.5); }

  function specClass(T) {
    if (T >= 30000) return 'O';
    if (T >= 10000) return 'B';
    if (T >= 7500) return 'A';
    if (T >= 6000) return 'F';
    if (T >= 5200) return 'G';
    if (T >= 3700) return 'K';
    return 'M';
  }

  class HRSim extends Sim {
    init() {
      this.mass = 1;
      this.aging = false;
      this.age = 0;     // 0..1 along the life track
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.massSlider = slider(c, {
        label: 'your star\'s mass',
        min: 0.1, max: 40, value: this.mass, log: true,
        format: (v) => `${fmtNum(v, v < 1 ? 2 : v < 10 ? 1 : 0)} M☉`,
        oninput: (v) => { this.mass = v; this.aging = false; this.age = 0; this.updateReadout(); this.poke(); },
      });
      actionButton(c, 'age it (watch the track)', () => {
        this.aging = true; this.age = 0;
        this.cite('1913 Russell - "Giant" and "Dwarf" Stars');
      });
      actionButton(c, 'reset', () => { this.aging = false; this.age = 0; this.poke(); });
    }

    updateReadout() {
      const T = msTemp(this.mass);
      const L = msLum(this.mass);
      const life = lifetimeGyr(this.mass);
      setReadout(this.readoutEl, [
        [
          ['your ', null], [`${fmtNum(this.mass, this.mass < 1 ? 2 : 1)} M☉`, 'yellow'],
          [' star sits on the main sequence at ', null], [`${fmtNum(T, 0)} K`, 'cyan'],
          [` (class ${specClass(T)}), `, null],
          [`${L >= 1 ? fmtNum(L, L < 100 ? 1 : 0) : L.toExponential(1)} L☉`, 'orange'],
        ],
        [
          ['main-sequence lifetime ≈ ', null], [fmtTime(life * 1e9 * YEAR, 1), 'pink'],
          [this.mass > 5 ? ' — massive stars burn out fast.' : this.mass < 0.7 ? ' — longer than the universe has existed yet.' : '', null],
        ],
        [['mass alone fixes the spot. Press "age it": fuel runs out → the star swells into a giant, then collapses to a remnant (next section decides which).', 'green']],
      ]);
    }

    update(dt) {
      this.t += dt;
      if (this.aging) {
        this.age = Math.min(1, this.age + dt * 0.25);
        if (this.age >= 1) this.aging = false;
      }
    }

    axis() { return { x0: this.w * 0.10, x1: this.w * 0.80, y0: 30, y1: this.h - 46 }; }
    X(T) { const { x0, x1 } = this.axis(); return x0 + ((Math.log10(T_HI) - Math.log10(T)) / (Math.log10(T_HI) - Math.log10(T_LO))) * (x1 - x0); }
    Y(L) { const { y0, y1 } = this.axis(); return y1 - ((Math.log10(L) - Math.log10(L_LO)) / (Math.log10(L_HI) - Math.log10(L_LO))) * (y1 - y0); }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const { x0, x1, y0, y1 } = this.axis();
      this.cache.draw(`hraxes-${w}x${h}`, (g) => g.path(`M ${x0} ${y0} L ${x0} ${y1} L ${x1} ${y1}`, opts(300, { stroke: COLORS.muted, strokeWidth: 1.4 })));
      label(ctx, 'luminosity (Suns) →', x0 - 4, y0 - 4, { color: COLORS.muted, size: 11, align: 'left' });
      label(ctx, 'hot ← temperature → cool', (x0 + x1) / 2, y1 + 20, { color: COLORS.muted, size: 11.5, align: 'center' });
      // spectral classes across the top
      for (const cls of ['O', 'B', 'A', 'F', 'G', 'K', 'M']) {
        const Tmid = { O: 38000, B: 20000, A: 8500, F: 6700, G: 5500, K: 4500, M: 3200 }[cls];
        label(ctx, cls, this.X(Tmid), y0 - 6, { color: COLORS.muted, size: 11, align: 'center' });
      }

      // main-sequence band (draw as a soft diagonal guide from real MS relation)
      ctx.strokeStyle = COLORS.cyan;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let M = 0.1; M <= 40; M *= 1.3) {
        const x = this.X(msTemp(M)); const y = this.Y(msLum(M));
        M <= 0.11 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      label(ctx, 'main sequence', this.X(7000), this.Y(3) - 6, { color: COLORS.cyan, size: 11.5, align: 'center' });
      if (!compact) {
        label(ctx, 'supergiants', this.X(6000), this.Y(80000), { color: COLORS.red, size: 11.5, align: 'center' });
        label(ctx, 'giants', this.X(4200), this.Y(200), { color: COLORS.orange, size: 11.5, align: 'center' });
        label(ctx, 'white dwarfs', this.X(15000), this.Y(0.02), { color: COLORS.ink, size: 11.5, align: 'center' });
      }

      // real stars
      for (const [name, T, L, kind] of STARS) {
        const x = this.X(T); const y = this.Y(L);
        ctx.fillStyle = blackbodyRGB(T);
        ctx.beginPath(); ctx.arc(x, y, kind === 'sg' ? 6 : kind === 'giant' ? 5 : 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 0.8; ctx.stroke();
        if (!compact || name === 'Sun') label(ctx, name, x + 7, y + 3, { color: COLORS.muted, size: 9.5, align: 'left' });
      }

      // your star + its life track
      const M = this.mass;
      const T0 = msTemp(M); const L0 = msLum(M);
      // track points: MS → giant → remnant, mass-dependent
      const heavy = M >= 8;
      const giantT = heavy ? 3600 : 3300;
      const giantL = heavy ? L0 * 6 : Math.max(L0 * 40, 300);
      const remT = heavy ? (M >= 20 ? 5000 : 800000) : 30000; // BH has no T; use offscreen marker
      const remL = heavy ? (M >= 20 ? 1e-4 : 0.5) : 0.02;
      const track = [[T0, L0], [giantT, giantL], [remT, remL]];
      const seg = this.age * 2; // 0..2
      // draw the aged track
      ctx.strokeStyle = COLORS.yellow;
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(this.X(track[0][0]), this.Y(track[0][1]));
      const drawTo = (frac) => {
        const s = Math.min(Math.floor(frac), 1);
        const u = frac - s;
        const a = track[s]; const b = track[s + 1] || track[s];
        const T = Math.pow(10, Math.log10(a[0]) + u * (Math.log10(b[0]) - Math.log10(a[0])));
        const L = Math.pow(10, Math.log10(a[1]) + u * (Math.log10(b[1]) - Math.log10(a[1])));
        return [this.X(T), this.Y(L)];
      };
      for (let f = 0; f <= seg; f += 0.05) { const [px, py] = drawTo(f); ctx.lineTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]);
      // current position marker
      const [cx, cy] = drawTo(seg);
      const cT = this.age === 0 ? T0 : (seg < 1 ? giantT : remT);
      rc.circle(cx, cy, 12, opts(310, { stroke: COLORS.yellow, strokeWidth: 2.2 }));
      ctx.fillStyle = blackbodyRGB(Math.min(cT, 40000)); ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
      label(ctx, this.age === 0 ? 'YOUR STAR' : (seg < 1 ? 'aging → giant' : (heavy ? 'exploded → remnant' : 'white dwarf')), cx, cy - 16, { color: COLORS.yellow, size: 11.5, align: 'center' });

      sparkle(rc, w - 30, 26, 6, { color: COLORS.pink, seed: 320 });
    }
  }

  A.register('hrDiagram', HRSim);
})();
