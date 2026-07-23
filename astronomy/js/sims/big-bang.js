// Sim 10 — The Big Bang & the expanding universe.
//
// Physics: flat ΛCDM. The scale factor a(t) is obtained by integrating the
// Friedmann equation with RK4 in dimensionless time τ = H₀·t:
//     da/dτ = √(Ω_m/a + Ω_Λ·a²)        (Ω_m = 0.315, Ω_Λ = 0.685; flat)
// giving the real age of the universe ≈ 13.8 Gyr (1/H₀ ≈ 14.5 Gyr for
// H₀ = 67.4 km/s/Mpc, × the dimensionless integral ≈ 0.95).
// Comoving galaxies sit on a fixed grid; on-screen separations scale with a.
// Every galaxy obeys the SAME Hubble law v = H₀·d from its own frame — click
// one to become "home" and the recession arrows redraw identically (no center).
// CMB thermometer: T = 2.725 K / a  → ~3000 K at a = 1/1100 (recombination).

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, sparkle,
    slider, buttonRow, setReadout, rk4, fmtNum, sci,
  } = A;

  const OMEGA_M = 0.315;
  const OMEGA_L = 0.685;
  const H0 = 67.4;                 // km/s/Mpc (Planck 2018)
  const HUBBLE_TIME_GYR = 977.8 / H0; // 1/H0 in Gyr  (977.8 Gyr·km/s/Mpc conversion)
  const T_CMB = 2.725;             // K today
  const A_RECOMB = 1 / 1100;       // recombination

  // Friedmann RHS in dimensionless time: da/dτ = √(Ω_m/a + Ω_Λ a²)
  function dadtau(a) {
    return Math.sqrt(OMEGA_M / Math.max(a, 1e-6) + OMEGA_L * a * a);
  }

  // Precompute a(τ) once: integrate from tiny a until a = 1 (today), recording τ.
  // Returns { tauAtToday, sample(aTarget)->tau, ageGyr }.
  function buildHistory() {
    let a = 1e-4;
    let tau = 0;
    const da = 1e-4;
    const pts = [[a, tau]];
    while (a < 3 && pts.length < 200000) {
      // integrate da/dτ; step in a, dτ = da / (da/dτ)
      const k1 = 1 / dadtau(a);
      const k2 = 1 / dadtau(a + da / 2);
      const k3 = 1 / dadtau(a + da / 2);
      const k4 = 1 / dadtau(a + da);
      tau += (da / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      a += da;
      if (pts.length % 20 === 0 || a >= 1) pts.push([a, tau]);
    }
    // τ at a=1
    let tauToday = 0;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][0] >= 1) { tauToday = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (1 - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]); break; }
    }
    return { pts, tauToday };
  }

  const HISTORY = buildHistory();
  const AGE_GYR = HISTORY.tauToday * HUBBLE_TIME_GYR;

  // age of universe at scale factor a (Gyr), by interpolating the history
  function ageAt(aTarget) {
    const p = HISTORY.pts;
    for (let i = 1; i < p.length; i++) {
      if (p[i][0] >= aTarget) {
        const f = (aTarget - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
        return (p[i - 1][1] + f * (p[i][1] - p[i - 1][1])) * HUBBLE_TIME_GYR;
      }
    }
    return AGE_GYR;
  }

  const GRID = 5; // galaxies per side

  class BigBangSim extends Sim {
    init() {
      this.a = 1;          // scale factor (slider)
      this.home = Math.floor((GRID * GRID) / 2); // index of "home" galaxy
      this.t = 0;
      // comoving positions on [-1,1] with a fixed jitter so it reads organic
      this.gal = [];
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          const idx = i * GRID + j;
          this.gal.push({
            cx: (j - (GRID - 1) / 2) / ((GRID - 1) / 2) + (((idx * 0.37) % 1) - 0.5) * 0.12,
            cy: (i - (GRID - 1) / 2) / ((GRID - 1) / 2) + (((idx * 0.61) % 1) - 0.5) * 0.12,
            seed: 300 + idx,
            spin: (idx % 2 ? 1 : -1),
          });
        }
      }
      this.buildControls();
      this.bindPointer();
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.aSlider = slider(c, {
        label: 'cosmic time',
        min: A_RECOMB,
        max: 1.6,
        value: 1,
        log: true,
        format: (v) => {
          if (v <= A_RECOMB * 1.05) return 'recombination';
          if (v >= 0.995 && v <= 1.005) return 'today';
          return v < 1 ? `${fmtNum(ageAt(v), 2)} Gyr old` : `+${fmtNum(ageAt(v) - AGE_GYR, 1)} Gyr (future)`;
        },
        oninput: (v) => { this.a = v; this.updateReadout(); this.poke(); },
      });
      buttonRow(c, [
        { label: 'recombination (CMB)', value: 'cmb' },
        { label: 'today', value: 'now' },
      ], {
        onSelect: (v) => {
          this.a = v === 'cmb' ? A_RECOMB : 1;
          this.aSlider.set(this.a);
          this.cite(v === 'cmb'
            ? '1965 Penzias, Wilson - A Measurement of Excess Antenna Temperature at 4080 Mc/s'
            : '1929 Hubble - A Relation between Distance and Radial Velocity among Extra-Galactic Nebulae');
          this.updateReadout();
          this.poke();
        },
      });
    }

    bindPointer() {
      this.canvasEl.addEventListener('pointerdown', (e) => {
        const rect = this.canvasEl.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        // find nearest galaxy on screen
        let best = -1; let bestD = 1e9;
        const { cx0, cy0, sc } = this.layout();
        this.gal.forEach((g, i) => {
          const x = cx0 + (g.cx - this.gal[this.home].cx) * sc;
          const y = cy0 + (g.cy - this.gal[this.home].cy) * sc;
          const d = Math.hypot(px - x, py - y);
          if (d < bestD) { bestD = d; best = i; }
        });
        if (best >= 0 && bestD < 60) {
          this.home = best;
          this.cite('1929 Hubble - A Relation between Distance and Radial Velocity among Extra-Galactic Nebulae');
          this.poke();
        }
      });
    }

    layout() {
      const compact = this.w < 700;
      return { cx0: this.w * (compact ? 0.5 : 0.42), cy0: this.h * 0.5, sc: Math.min(this.w, this.h) * 0.34 * this.a };
    }

    updateReadout() {
      const z = 1 / this.a - 1;
      const T = T_CMB / this.a;
      const age = ageAt(this.a);
      const lines = [
        [
          ['scale factor a = ', null], [fmtNum(this.a, 3), 'cyan'],
          ['   ·   universe age = ', null], [`${fmtNum(age, 2)} Gyr`, 'orange'],
          ['   ·   redshift z = ', null], [z < 0 ? `${fmtNum(z, 3)} (blueshift, future)` : fmtNum(z, z > 10 ? 0 : 2), 'pink'],
        ],
        [
          ['everything glows at T = 2.725 K / a = ', null], [`${sci(T, 3)} K`, 'yellow'],
          this.a <= A_RECOMB * 1.2
            ? [' — ~3000 K: hot enough that atoms just formed and the universe turned transparent, releasing the CMB.', null]
            : [' — the CMB, cooled by the expansion since.', null],
        ],
        [['every galaxy sees the SAME Hubble law v = H₀d — click any one to make it home. There is no center.', 'green']],
      ];
      setReadout(this.readoutEl, lines);
    }

    update(dt) { this.t += dt; }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const { cx0, cy0, sc } = this.layout();
      const home = this.gal[this.home];

      // faint comoving grid lines (stretch with a)
      const step = 2 / (GRID - 1);
      ctx.strokeStyle = COLORS.grid;
      // draw galaxies + recession arrows relative to home
      this.gal.forEach((g, i) => {
        const dx = g.cx - home.cx;
        const dy = g.cy - home.cy;
        const x = cx0 + dx * sc;
        const y = cy0 + dy * sc;
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return;
        const isHome = i === this.home;
        // recession arrow: length ∝ distance (Hubble law) — draw for non-home
        if (!isHome) {
          const d = Math.hypot(dx, dy);
          const arrowLen = Math.min(d * sc * 0.18, 34);
          if (arrowLen > 5) {
            const ux = dx / d; const uy = dy / d;
            doodleArrow(rc, x, y, x + ux * arrowLen, y + uy * arrowLen, {
              color: COLORS.pink, seed: g.seed, strokeWidth: 1.4,
            });
          }
        }
        // little doodle spiral galaxy
        const r = isHome ? 12 : 8;
        rc.circle(x, y, r * 2, opts(g.seed + 1, {
          stroke: isHome ? COLORS.yellow : COLORS.ink, strokeWidth: isHome ? 2.2 : 1.5,
        }));
        rc.path(`M ${x} ${y} q ${g.spin * r} ${-r} ${g.spin * r * 1.6} ${r * 0.2}`, opts(g.seed + 2, {
          stroke: isHome ? COLORS.yellow : COLORS.muted, strokeWidth: 1.1,
        }));
        if (isHome) label(ctx, 'HOME', x, y - r - 8, { color: COLORS.yellow, size: 12.5, align: 'center' });
      });

      label(ctx, this.a < A_RECOMB * 1.2 ? 'hot, dense, opaque — the CMB is being emitted' : 'space itself is expanding (drag the clock)', cx0, 22, { color: COLORS.muted, size: 13, align: 'center' });

      // CMB thermometer panel (right on desktop)
      if (!compact) {
        const tx = w * 0.88;
        const ty0 = h * 0.2;
        const ty1 = h * 0.8;
        rc.rectangle(tx - 10, ty0, 20, ty1 - ty0, opts(320, { stroke: COLORS.muted, strokeWidth: 1.6 }));
        // fill height ∝ log temperature between 2.725 K and 3000 K
        const T = T_CMB / this.a;
        const frac = Math.max(0, Math.min(1, (Math.log10(T) - Math.log10(T_CMB)) / (Math.log10(3000) - Math.log10(T_CMB))));
        const fillY = ty1 - frac * (ty1 - ty0);
        const col = T > 1000 ? COLORS.red : T > 100 ? COLORS.orange : COLORS.cyan;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(tx - 8, fillY, 16, ty1 - fillY);
        ctx.globalAlpha = 1;
        rc.circle(tx, ty1 + 12, 22, opts(321, { stroke: COLORS.muted, strokeWidth: 1.6, fill: col, fillStyle: 'solid' }));
        label(ctx, 'CMB', tx, ty0 - 10, { color: COLORS.muted, size: 12, align: 'center' });
        label(ctx, `${sci(T, 2)} K`, tx, ty1 + 44, { color: col, size: 13, align: 'center' });
        label(ctx, '3000 K', tx + 16, ty0 + 6, { color: COLORS.muted, size: 10.5, align: 'left' });
        label(ctx, '2.7 K', tx + 16, ty1 - 2, { color: COLORS.muted, size: 10.5, align: 'left' });
      }

      sparkle(rc, 40, h - 40, 6, { color: COLORS.pink, seed: 340 });
      label(ctx, `age today: ${fmtNum(AGE_GYR, 1)} Gyr   ·   H₀ = ${H0} km/s/Mpc`, 12, h - 30, { color: COLORS.muted, size: 12 });
    }
  }

  A.register('bigBang', BigBangSim);
})();
