// Sim 10 — The Big Bang & the expanding universe (remake).
//
// Physics: flat ΛCDM, a(t) integrated from the Friedmann equation
//     da/dτ = √(Ω_m/a + Ω_Λ·a²),  τ = H₀t   (Ω_m = 0.315, Ω_Λ = 0.685)
// → age today 13.80 Gyr (verified). The radiation era (a ≲ 3×10⁻⁴) is omitted,
// so the earliest ages are approximate — the readout says so honestly.
//
// EPOCH-ACCURATE: galaxies did not exist at recombination and the sim does not
// draw them there. Timeline: opaque plasma (< a=1/1100, T > 3000 K) →
// recombination flash (the CMB is released) → the Dark Ages (transparent but
// nothing shines) → first stars (~a 0.025, ~10⁸ yr) → galaxies assemble
// (~a 0.09, ~5×10⁸ yr) → today (a=1) → the accelerating future.
//
// Honest visuals: the photon-stretch strip shows one CMB photon's wavelength
// growing ∝ a (drawn on a log scale, labelled); the ruler shows a real comoving
// separation with its live recession speed v = H₀·d; "play" runs the actual
// integrated dynamics, so expansion visibly decelerates in the matter era and
// accelerates once Λ wins.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, sparkle,
    slider, buttonRow, actionButton, setReadout, fmtNum, sci,
  } = A;

  const OMEGA_M = 0.315;
  const OMEGA_L = 0.685;
  const H0 = 67.4;                    // km/s/Mpc (Planck 2018)
  const HUBBLE_TIME_GYR = 977.8 / H0; // 1/H₀ in Gyr
  const T_CMB = 2.725;                // K today
  const A_RECOMB = 1 / 1100;
  const A_FIRST_STARS = 0.032;        // boundary lands at ~100 Myr in this model (canonical 100–200 Myr)
  const A_GALAXIES = 0.09;            // ~5×10⁸ yr
  const BOX_MPC = 150;                // comoving width of the galaxy field today
  const A_MIN = 4e-4;
  const A_MAX = 2.0;

  function dadtau(a) {
    return Math.sqrt(OMEGA_M / Math.max(a, 1e-6) + OMEGA_L * a * a);
  }

  // a(τ) history by integrating dτ = da/(da/dτ) with RK4-in-a
  function buildHistory() {
    let a = 1e-4;
    let tau = 0;
    const da = 1e-4;
    const pts = [[a, tau]];
    while (a < 3) {
      const k1 = 1 / dadtau(a);
      const k2 = 1 / dadtau(a + da / 2);
      const k3 = 1 / dadtau(a + da / 2);
      const k4 = 1 / dadtau(a + da);
      tau += (da / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      a += da;
      pts.push([a, tau]);
    }
    return pts;
  }
  const HISTORY = buildHistory();

  function ageGyrAt(aTarget) {
    const p = HISTORY;
    if (aTarget <= p[0][0]) return p[0][1] * HUBBLE_TIME_GYR;
    for (let i = 1; i < p.length; i++) {
      if (p[i][0] >= aTarget) {
        const f = (aTarget - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
        return (p[i - 1][1] + f * (p[i][1] - p[i - 1][1])) * HUBBLE_TIME_GYR;
      }
    }
    return p[p.length - 1][1] * HUBBLE_TIME_GYR;
  }
  const AGE_TODAY = ageGyrAt(1);

  function fmtAge(gyr) {
    if (gyr < 1e-3) return `${fmtNum(gyr * 1e6, 0)} thousand yr`;
    if (gyr < 1) return `${fmtNum(gyr * 1e3, 0)} million yr`;
    return `${fmtNum(gyr, 2)} billion yr`;
  }

  function epochOf(a) {
    if (a < A_RECOMB) return { key: 'plasma', name: 'OPAQUE PLASMA — the whole universe glows like the inside of a star', color: COLORS.orange };
    if (a < A_FIRST_STARS) return { key: 'dark', name: 'the Dark Ages — transparent at last, but nothing shines yet', color: COLORS.muted };
    if (a < A_GALAXIES) return { key: 'stars', name: 'the first stars ignite (~100–200 million yr)', color: COLORS.yellow };
    if (a <= 1.004) return { key: 'galaxies', name: 'galaxies assemble, expansion carries them apart', color: COLORS.cyan };
    return { key: 'future', name: 'the far future — dark energy accelerates the stretch', color: COLORS.pink };
  }

  const GRID = 5;

  class BigBangSim extends Sim {
    init() {
      this.a = 1;
      this.home = Math.floor((GRID * GRID) / 2);
      this.partner = 3; // ruler target galaxy
      this.playing2 = false; // timeline auto-play (not the engine's .playing)
      this.t = 0;
      this.flash = 0;    // recombination flash animation
      this.gal = [];
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          const idx = i * GRID + j;
          this.gal.push({
            cx: (j - (GRID - 1) / 2) / ((GRID - 1) / 2) + (((idx * 0.37) % 1) - 0.5) * 0.14,
            cy: (i - (GRID - 1) / 2) / ((GRID - 1) / 2) + (((idx * 0.61) % 1) - 0.5) * 0.14,
            seed: 300 + idx,
            spin: (idx % 2 ? 1 : -1),
            starEarly: idx % 3 === 0, // hosts one of the first stars
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
        min: A_MIN,
        max: A_MAX,
        value: 1,
        log: true,
        format: (v) => fmtAge(ageGyrAt(v)) + (v >= 0.995 && v <= 1.01 ? ' (today)' : ''),
        oninput: (v) => { this.setA(v); },
      });
      buttonRow(c, [
        { label: '▶ play the universe', value: 'play' },
        { label: 'recombination', value: 'cmb' },
        { label: 'today', value: 'now' },
      ], {
        onSelect: (v) => {
          if (v === 'play') {
            if (this.a >= A_MAX - 0.02) this.a = A_MIN;
            this.playing2 = true;
            this.cite('1927 Lemaître - Un Univers homogène de masse constante et de rayon croissant');
          } else if (v === 'cmb') {
            this.playing2 = false;
            this.setA(A_RECOMB * 1.001);
            this.flash = 1;
            this.cite('1965 Penzias, Wilson - A Measurement of Excess Antenna Temperature at 4080 Mc/s');
          } else {
            this.playing2 = false;
            this.setA(1);
          }
          this.poke();
        },
      });
    }

    setA(v) {
      const prev = this.a;
      this.a = Math.max(A_MIN, Math.min(A_MAX, v));
      if (prev < A_RECOMB && this.a >= A_RECOMB) this.flash = 1; // crossing → flash
      this.aSlider.set(this.a);
      this.updateReadout();
      this.poke();
    }

    bindPointer() {
      this.canvasEl.addEventListener('pointerdown', (e) => {
        if (this.a < A_GALAXIES) return; // no galaxies to click yet
        const rect = this.canvasEl.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const { cx0, cy0, sc } = this.layout();
        let best = -1; let bestD = 1e9;
        this.gal.forEach((g, i) => {
          const x = cx0 + (g.cx - this.gal[this.home].cx) * sc;
          const y = cy0 + (g.cy - this.gal[this.home].cy) * sc;
          const d = Math.hypot(px - x, py - y);
          if (d < bestD) { bestD = d; best = i; }
        });
        if (best >= 0 && bestD < 60 && best !== this.home) {
          this.home = best;
          this.partner = best === this.partner ? (best + 7) % (GRID * GRID) : this.partner;
          this.cite('1929 Hubble - A Relation between Distance and Radial Velocity among Extra-Galactic Nebulae');
          this.updateReadout();
          this.poke();
        }
      });
    }

    layout() {
      const compact = this.w < 700;
      return {
        cx0: this.w * (compact ? 0.5 : 0.40),
        cy0: this.h * 0.46,
        sc: Math.min(this.w, this.h) * 0.30 * this.a,
        compact,
      };
    }

    updateReadout() {
      const z = 1 / this.a - 1;
      const T = T_CMB / this.a;
      const age = ageGyrAt(this.a);
      const ep = epochOf(this.a);
      const lines = [
        [
          ['a = ', null], [fmtNum(this.a, this.a < 0.01 ? 4 : 3), 'cyan'],
          ['   ·   age ≈ ', null], [fmtAge(age), 'orange'],
          this.a < 0.005 ? [' (radiation era omitted — real value at recombination: ≈380,000 yr)', null] : ['', null],
          ['   ·   z = ', null], [z < 0 ? `${fmtNum(z, 2)} (future)` : fmtNum(z, z > 20 ? 0 : 2), 'pink'],
          ['   ·   T = ', null], [`${sci(T, 2)} K`, 'yellow'],
        ],
        [[ep.name, ep.key === 'plasma' ? 'orange' : ep.key === 'stars' ? 'yellow' : ep.key === 'future' ? 'pink' : null]],
      ];
      if (this.a >= A_GALAXIES) {
        lines.push([['click any galaxy to make it HOME — the recession law v = H₀d looks identical from every one. No center.', 'green']]);
      } else if (this.a >= A_RECOMB) {
        lines.push([['no galaxies exist yet — matter is still collapsing under gravity. (That is why this sim shows none.)', null]]);
      } else {
        lines.push([['light cannot fly straight: free electrons scatter it constantly. The universe is a glowing fog.', null]]);
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt * 0.5);
      if (this.playing2) {
        // real dynamics: advance τ at a fixed rate; a follows the Friedmann eq,
        // so the growth visibly decelerates (matter) then accelerates (Λ)
        const dTau = dt * 0.14;
        this.a += dadtau(this.a) * dTau;
        if (this.a >= A_MAX) { this.a = A_MAX; this.playing2 = false; }
        this.aSlider.set(this.a);
        if ((this.t - (this._lastRO || 0)) > 0.2) { this._lastRO = this.t; this.updateReadout(); }
      }
    }

    render() {
      const { rc, ctx, w, h } = this;
      const { cx0, cy0, sc, compact } = this.layout();
      const ep = epochOf(this.a);
      const home = this.gal[this.home];

      // ---------- epoch backdrop ----------
      if (ep.key === 'plasma') {
        // glowing fog + photons scattering off free electrons
        ctx.fillStyle = COLORS.orange;
        ctx.globalAlpha = 0.16;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
        for (let i = 0; i < 26; i++) {
          const x = ((i * 0.754877) % 1) * w;
          const y = ((i * 0.569840) % 1) * (h - 60);
          // electron
          ctx.fillStyle = COLORS.cyan;
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
          // photon zigzag bouncing near it (animated jitter)
          const ph = this.t * 2 + i;
          ctx.strokeStyle = COLORS.yellow;
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          let zx = x + 6; let zy = y + 4;
          ctx.moveTo(zx, zy);
          for (let s2 = 0; s2 < 3; s2++) {
            zx += Math.cos(ph + s2 * 2.4) * 9;
            zy += Math.sin(ph * 1.3 + s2 * 1.9) * 9;
            ctx.lineTo(zx, zy);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        label(ctx, `everything glows at ${sci(T_CMB / this.a, 2)} K — hotter than the Sun's surface`, cx0, 26, { color: COLORS.orange, size: 13.5, align: 'center' });
      }
      if (this.flash > 0) {
        // recombination: the fog clears and the CMB flies free
        ctx.globalAlpha = this.flash * 0.8;
        rc.circle(cx0, cy0, (1.2 - this.flash) * Math.min(w, h) * 0.9, opts(310, { stroke: COLORS.yellow, strokeWidth: 2.5 }));
        ctx.globalAlpha = 1;
        label(ctx, 'FIRST LIGHT — atoms form, the fog clears, the CMB is released', cx0, 44, { color: COLORS.yellow, size: 14, align: 'center' });
      }
      if (ep.key === 'dark') {
        label(ctx, 'nothing to see — literally. Gravity is quietly gathering the gas.', cx0, cy0, { color: COLORS.muted, size: 14, align: 'center' });
      }

      // ---------- matter: first stars, then galaxies ----------
      if (ep.key === 'stars' || ep.key === 'galaxies' || ep.key === 'future') {
        const galAlpha = Math.max(0, Math.min(1, (this.a - A_GALAXIES) / 0.1));
        this.gal.forEach((g, i) => {
          const dx = g.cx - home.cx;
          const dy = g.cy - home.cy;
          const x = cx0 + dx * sc;
          const y = cy0 + dy * sc;
          if (x < -30 || x > w + 30 || y < -30 || y > h + 30) return;
          if (galAlpha < 1 && g.starEarly) {
            // a first star: tiny sparkle
            sparkle(rc, x, y, 5, { color: COLORS.yellow, seed: g.seed + 5 });
          }
          if (galAlpha > 0) {
            ctx.globalAlpha = galAlpha;
            const isHome = i === this.home;
            if (!isHome) {
              const d = Math.hypot(dx, dy);
              if (d > 0.01) {
                const arrowLen = Math.min(d * sc * 0.22, 40);
                if (arrowLen > 6) {
                  const ux = dx / d; const uy = dy / d;
                  doodleArrow(rc, x, y, x + ux * arrowLen, y + uy * arrowLen, { color: COLORS.pink, seed: g.seed, strokeWidth: 1.4 });
                }
              }
            }
            const r = isHome ? 12 : 8;
            rc.circle(x, y, r * 2, opts(g.seed + 1, { stroke: isHome ? COLORS.yellow : COLORS.ink, strokeWidth: isHome ? 2.2 : 1.5 }));
            rc.path(`M ${x} ${y} q ${g.spin * r} ${-r} ${g.spin * r * 1.6} ${r * 0.2}`, opts(g.seed + 2, { stroke: isHome ? COLORS.yellow : COLORS.muted, strokeWidth: 1.1 }));
            if (isHome) label(ctx, 'HOME', x, y - r - 8, { color: COLORS.yellow, size: 12.5, align: 'center' });
            ctx.globalAlpha = 1;
          }
        });

        // ---------- live Hubble ruler: home → partner ----------
        if (galAlpha >= 1 && this.partner !== this.home) {
          const p = this.gal[this.partner];
          const dx = p.cx - home.cx;
          const dy = p.cy - home.cy;
          const x = cx0 + dx * sc;
          const y = cy0 + dy * sc;
          const dComoving = Math.hypot(dx, dy) * (BOX_MPC / 2); // Mpc today-units
          const dNow = dComoving * this.a;                       // proper distance
          const v = H0 * dNow;                                   // km/s
          ctx.setLineDash([4, 6]);
          ctx.strokeStyle = COLORS.green;
          ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(x, y); ctx.stroke();
          ctx.setLineDash([]);
          const mx = (cx0 + x) / 2;
          const my = (cy0 + y) / 2;
          label(ctx, `d = ${fmtNum(dNow, 0)} Mpc → receding at v = H₀d = ${fmtNum(v, 0)} km/s`, mx, my - 10, { color: COLORS.green, size: 12.5, align: 'center' });
        }
      }

      // ---------- photon-stretch strip (redshift made visible) ----------
      if (this.a >= A_RECOMB && !compact) {
        const bx0 = w * 0.72;
        const bx1 = w - 24;
        const by = h * 0.82;
        const stretch = this.a / A_RECOMB; // ×1 at emission → ×1100 today
        const frac = Math.log(stretch) / Math.log(1 / A_RECOMB); // 0..1 (log scale)
        const lam = 5 + frac * 60; // drawn wavelength, px
        const T = T_CMB / this.a;
        const col = T > 1000 ? '#fff3bf' : T > 50 ? COLORS.orange : T > 5 ? COLORS.red : COLORS.muted;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let x = bx0; x <= bx1; x += 2) {
          const yv = by + Math.sin(((x - bx0) / lam) * Math.PI * 2) * 10;
          x === bx0 ? ctx.moveTo(x, yv) : ctx.lineTo(x, yv);
        }
        ctx.stroke();
        label(ctx, `one CMB photon, stretched ×${fmtNum(stretch, 0)}`, (bx0 + bx1) / 2, by - 22, { color: col, size: 12, align: 'center' });
        label(ctx, T < 10 ? 'now invisible microwaves (2.7 K)' : 'visible glow', (bx0 + bx1) / 2, by + 26, { color: COLORS.muted, size: 11, align: 'center' });
        label(ctx, '(wavelength drawn on a log scale)', (bx0 + bx1) / 2, by + 42, { color: COLORS.muted, size: 10, align: 'center' });
      }

      label(ctx, `age today: ${fmtNum(AGE_TODAY, 1)} Gyr · H₀ = ${H0} km/s/Mpc · fun fact: ~1% of old-TV static was the CMB`, 12, h - 12, { color: COLORS.muted, size: 11.5 });
    }
  }

  A.register('bigBang', BigBangSim);
})();
