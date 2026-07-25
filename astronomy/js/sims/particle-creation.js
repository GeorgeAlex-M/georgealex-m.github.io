// Sim 49 — Particle creation in an expanding universe (and why the sky has lumps).
//
// Sim 48 showed that "how many particles are here" depends on the observer.
// Parker's 1968-69 result is the same statement applied to time: in an expanding
// universe the vacuum of the early epoch is NOT the vacuum of the late epoch, so
// a field that starts empty ends up populated. Expansion creates particles.
//
// THE HONEST CRITERION. For a massless field mode of comoving wavenumber k the
// physical frequency is omega = k/a, so
//     omega_dot / omega^2  =  -H/omega  =  -aH/k
// Particle creation happens when that is of order 1 or larger — i.e. when the
// expansion is FAST compared with the mode's own oscillation. And |aH/k| >= 1 is
// exactly the statement that the mode's physical wavelength has grown past the
// Hubble radius c/H. Adiabatic (deep inside the horizon) -> nothing happens.
// Non-adiabatic (crossing out) -> the mode freezes and gets populated.
// So "horizon crossing" and "particle creation" are the same event, and the
// classic log(aH) vs log(a) diagram in panel 1 IS the adiabaticity plot.
//
// CAVEAT THE SIM STATES OUT LOUD: a massless, conformally coupled field in a
// radiation universe feels NO creation at all — the theory is conformally
// invariant and the expansion can be transformed away. Creation needs that
// invariance broken: a mass, a non-conformal coupling, or an equation of state
// that is not radiation. Inflation supplies exactly that for the inflaton and
// for gravitons, which is why it works.
//
// THE MEASUREMENT (panel 2). This is not decoration: the fluctuations frozen in
// at horizon exit re-enter later as density perturbations, and we have
// photographed them.
//     COBE 1992 : Delta T / T ~ 1.1e-5, the first detection of the lumps
//     Planck 2018: n_s = 0.9649 +/- 0.0042 — the spectrum is nearly, but
//                  measurably NOT, scale-invariant. Inflation predicted a slight
//                  tilt below 1 before it was measured.
//     BICEP/Keck : r < 0.036, no primordial gravitational waves yet
//
// Hand checks reproduced by the code:
//   aH/k = 1 at horizon crossing, by construction
//   de Sitter: aH grows as a  ->  modes exit;  radiation: aH falls as 1/a -> they re-enter
//   60 e-folds is what it takes to solve the horizon problem

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    fmtNum, sci,
  } = A;

  const CIT_P68 = '1968 Parker - Particle Creation in Expanding Universes';
  const CIT_P69 = '1969 Parker - Quantized Fields and Particle Creation in Expanding Universes. I';
  const CIT_GUTH = '1981 Guth - Inflationary Universe: A Possible Solution to the Horizon and Flatness Problems';
  const CIT_MC = '1981 Mukhanov, Chibisov - Quantum Fluctuation and "Nonsingular" Universe';
  const CIT_COBE = '1992 Smoot et al. - Structure in the COBE Differential Microwave Radiometer First-Year Maps';

  // Measured, with sources named in the section.
  const DT_OVER_T = 1.1e-5;      // COBE, rms at 10°
  const N_S = 0.9649;            // Planck 2018 VI
  const N_S_ERR = 0.0042;
  const R_LIMIT = 0.036;         // BICEP/Keck 2021 upper limit on r

  const N_EFOLDS = 60;

  class ParticleCreationSim extends Sim {
    init() {
      this.mode = 'stretch';
      this.logA = -4;          // where we are, in e-folds relative to the end of inflation
      this.logK = 0;           // the mode we are watching, in log10 units
      this.phase = 0;
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- the model ----------------
       One clean, standard two-phase history, in units where a = 1 and H = 1 at
       the END of inflation:
         inflation (a < 1):   H = 1            -> aH = a        (grows)
         radiation (a > 1):   H = a^-2         -> aH = 1/a      (shrinks)
       A comoving mode k exits when aH = k and re-enters when aH = k again. This
       is the actual reason inflation explains the CMB: everything we see was
       once inside one causally connected patch.                                */

    aH(a) { return a <= 1 ? a : 1 / a; }
    H(a) { return a <= 1 ? 1 : 1 / (a * a); }

    numbers() {
      const a = 10 ** this.logA;
      const k = 10 ** this.logK;
      const aH = this.aH(a);
      const adiab = aH / k;                    // |omega_dot/omega^2| for a massless mode
      const inside = adiab < 1;
      // exit and re-entry happen where aH = k
      const aExit = k <= 1 ? k : null;         // during inflation aH = a
      const aReentry = k <= 1 ? 1 / k : null;  // during radiation aH = 1/a
      return {
        a, k, aH, adiab, inside,
        aExit, aReentry,
        efoldsSinceExit: aExit ? Math.log(a / aExit) : null,
        lambdaOverHubble: 1 / adiab,           // physical wavelength / Hubble radius
      };
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'a wave gets stretched', value: 'stretch' },
        { label: 'why the sky has lumps', value: 'lumps' },
      ], { initial: 'stretch', onSelect: (v) => this.setMode(v) });

      this.timeSlider = slider(c, {
        label: 'the universe expands',
        min: -6, max: 6, step: 0.01, value: this.logA,
        format: (v) => (v < 0
          ? `still inflating — ${fmtNum(-v * Math.LN10, 1)} e-folds to go`
          : `after inflation — the universe is ${sci(10 ** v, 2)}× bigger`),
        oninput: (v) => {
          this.logA = v;
          if (!this._citedP) { this._citedP = true; this.cite(CIT_P68); }
          this.updateReadout(); this.poke();
        },
      });

      this.kSlider = slider(c, {
        label: 'which ripple are we watching',
        min: -4, max: 2, step: 0.01, value: this.logK,
        format: (v) => `k = ${sci(10 ** v, 2)}  ${10 ** v < 1 ? '(big enough to leave the horizon)' : '(too small — it never exits)'}`,
        oninput: (v) => { this.logK = v; this.updateReadout(); this.poke(); },
      });

      actionButton(c, 'jump to horizon exit', () => {
        const k = 10 ** this.logK;
        if (k <= 1) {
          this.logA = Math.log10(k);
          this.timeSlider.set(this.logA);
          this.cite(CIT_MC);
        }
        this.updateReadout(); this.poke();
      });
      this.setMode('stretch');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.timeSlider, v === 'stretch');
      show(this.kSlider, v === 'stretch');
      if (v === 'lumps' && !this._citedC) { this._citedC = true; this.cite(CIT_COBE); }
      this.cache.invalidate(); this.updateReadout(); this.poke();
    }

    update(dt) { this.phase += dt; }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'lumps') return this.lumpsReadout();
      const n = this.numbers();
      setReadout(this.readoutEl, [
        [
          ['adiabaticity |ω̇/ω²| = aH/k = ', null],
          [sci(n.adiab, 3), n.inside ? 'green' : 'pink'],
          ['  ·  physical wavelength ÷ Hubble radius = ', null],
          [sci(n.lambdaOverHubble, 3), n.inside ? 'green' : 'pink'],
        ],
        n.inside ? [
          ['INSIDE the horizon. ', 'green'],
          ['The mode oscillates far faster than the universe expands, so the expansion is adiabatic: the field simply follows along and ', null],
          ['no particles are created', 'green'],
          ['. This is why a slowly expanding universe does nothing interesting to quantum fields.', null],
        ] : [
          ['OUTSIDE the horizon. ', 'pink'],
          ['The universe now doubles in size faster than this ripple can complete an oscillation. The mode can no longer track the change, it ', null],
          ['freezes at whatever amplitude it had', 'pink'],
          [', and the vacuum it started in is no longer the vacuum — it is a populated state. Expansion has created particles.', null],
        ],
        n.aExit ? [
          ['This mode left the horizon at a = ', null], [sci(n.aExit, 2), 'yellow'],
          [' and comes back in at a = ', null], [sci(n.aReentry, 2), 'cyan'],
          [n.efoldsSinceExit > 0 ? `  ·  ${fmtNum(n.efoldsSinceExit, 1)} e-folds since it exited` : '  ·  it has not exited yet', null],
        ] : [
          ['This ripple is too short to ever leave the horizon: it stays adiabatic forever and is never populated. Only modes with k < 1 here get frozen.', null],
        ],
        [
          ['One honest caveat: a massless, conformally coupled field in a radiation universe feels nothing at all — the expansion can be transformed away. Creation needs that conformal symmetry broken, by a mass or a non-conformal coupling. Inflation breaks it for exactly the fields that matter.', null],
        ],
      ]);
    }

    lumpsReadout() {
      setReadout(this.readoutEl, [
        [
          ['The ripples frozen at horizon exit do not stay abstract: they re-enter later as real density differences, and we have photographed them.', null],
        ],
        [
          ['COBE, 1992 — the first detection: ', null], [`ΔT/T ≈ ${sci(DT_OVER_T, 2)}`, 'cyan'],
          ['. One part in a hundred thousand, hot spots against cold, across the whole sky. Those are the frozen quantum fluctuations, stretched to the size of the visible universe.', null],
        ],
        [
          ['Planck, 2018 — the spectral tilt: ', null], [`n_s = ${fmtNum(N_S, 4)} ± ${fmtNum(N_S_ERR, 4)}`, 'green'],
          ['. Perfectly scale-invariant would be exactly 1. It is not 1, and it is ', null],
          [`${fmtNum((1 - N_S) / N_S_ERR, 1)}σ`, 'yellow'],
          [' away from 1 — a real, measured tilt. Inflation predicted a slight tilt BELOW one before anyone measured it. That is the strongest quantitative success this whole story has.', null],
        ],
        [
          ['Not yet seen: primordial gravitational waves. The same mechanism should also freeze in ripples of spacetime itself, and the limit is currently ', null],
          [`r < ${fmtNum(R_LIMIT, 3)}`, 'orange'],
          [' (BICEP/Keck). Finding them would be direct evidence that gravity is quantised — which is exactly the question the rest of this chapter is about.', null],
        ],
      ]);
    }

    /* ---------------- drawing ---------------- */

    renderStretch() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const n = this.numbers();

      /* --- top: the mode, drawn at its real relative wavelength --- */
      const topY = compact ? 76 : 92;
      const boxH = compact ? 96 : 118;
      const x0 = compact ? 16 : 30;
      const x1 = w - (compact ? 16 : 30);

      // the Hubble radius, drawn as a fixed reference bar
      const hubblePx = (x1 - x0) * 0.34;
      this.cache.draw(`hub-${w}x${h}`, (g) => g.line(x0, topY + boxH + 16, x0 + hubblePx, topY + boxH + 16,
        opts(1300, { stroke: COLORS.yellow, strokeWidth: 2.4 })));
      label(ctx, 'Hubble radius c/H', x0, topY + boxH + 34, { color: COLORS.yellow, size: compact ? 10.5 : 12.5 });

      // the wave: its drawn wavelength IS lambda/Hubble, clamped so it stays visible
      const rel = Math.max(0.06, Math.min(6, n.lambdaOverHubble));
      const lamPx = hubblePx * rel;
      ctx.strokeStyle = n.inside ? COLORS.green : COLORS.pink;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const amp = boxH * 0.34;
      // frozen modes stop oscillating in time; inside-horizon modes keep phase running
      const ph = n.inside ? this.phase * 2.4 : 0;
      for (let px = x0; px <= x1; px += 2) {
        const y = topY + boxH / 2 - amp * Math.sin(((px - x0) / lamPx) * Math.PI * 2 + ph);
        if (px === x0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();
      label(ctx, n.inside ? 'oscillating — it keeps up with the expansion' : 'FROZEN — the expansion has outrun it',
        (x0 + x1) / 2, topY - 12, { color: n.inside ? COLORS.green : COLORS.pink, size: compact ? 11.5 : 14, align: 'center' });

      // the wavelength bar, for direct comparison with the Hubble bar
      this.cache.draw(`lamlbl-${w}x${h}`, (g) => g.line(0, 0, 0, 0, opts(1301, { stroke: COLORS.bg })));
      rc.line(x0, topY + boxH + 4, x0 + Math.min(lamPx, x1 - x0), topY + boxH + 4,
        opts(1302, { stroke: n.inside ? COLORS.green : COLORS.pink, strokeWidth: 2 }));
      label(ctx, `wavelength (${sci(n.lambdaOverHubble, 2)}× the Hubble radius)`,
        x0 + Math.min(lamPx, x1 - x0) + 8, topY + boxH + 8,
        { color: n.inside ? COLORS.green : COLORS.pink, size: compact ? 10 : 12 });

      /* --- bottom: the log(aH) vs log(a) diagram — the real one --- */
      const py0 = topY + boxH + (compact ? 52 : 62);
      const py1 = h - (compact ? 40 : 50);
      const X = (la) => x0 + ((la + 6) / 12) * (x1 - x0);
      const Y = (laH) => py1 - ((laH + 6) / 7) * (py1 - py0);

      this.cache.draw(`ax-${w}x${h}`, (g) => g.line(x0, py1, x1, py1, opts(1310, { stroke: COLORS.ink, strokeWidth: 1.5 })));

      // aH: rises during inflation, falls after
      ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let la = -6; la <= 6; la += 0.05) {
        const px = X(la);
        const py = Y(Math.log10(this.aH(10 ** la)));
        if (la === -6) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      label(ctx, 'aH  (the horizon)', X(-5.6), Y(Math.log10(this.aH(10 ** -5.6))) - 10,
        { color: COLORS.cyan, size: compact ? 10 : 12 });

      // the mode: a horizontal line at k
      ctx.strokeStyle = n.inside ? COLORS.green : COLORS.pink;
      ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]); ctx.beginPath();
      ctx.moveTo(x0, Y(this.logK)); ctx.lineTo(x1, Y(this.logK)); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, 'your ripple, k', x1 - 4, Y(this.logK) - 8,
        { color: n.inside ? COLORS.green : COLORS.pink, size: compact ? 10 : 12, align: 'right' });

      // crossings
      if (n.aExit) {
        // When k -> 1 the two crossings converge on a = 1 and their captions
        // collide, so stagger them vertically and drop the second if they are
        // closer together than the text is wide.
        const pxE = X(Math.log10(n.aExit));
        const pxR = X(Math.log10(n.aReentry));
        const tooClose = Math.abs(pxR - pxE) < 62;
        const marks = [[n.aExit, COLORS.yellow, 'exits', 22]];
        if (!tooClose) marks.push([n.aReentry, COLORS.cyan, 're-enters', 38]);
        for (const [av, col, txt, dy] of marks) {
          const px = X(Math.log10(av));
          if (px > x0 && px < x1) {
            rc.circle(px, Y(this.logK), 10, opts(1320, { stroke: col, strokeWidth: 1.8 }));
            label(ctx, txt, px, Y(this.logK) + dy, { color: col, size: compact ? 9.5 : 11.5, align: 'center' });
          }
        }
        if (tooClose) {
          rc.circle(pxR, Y(this.logK), 10, opts(1321, { stroke: COLORS.cyan, strokeWidth: 1.8 }));
          label(ctx, 'exits & re-enters almost together', pxR, Y(this.logK) + 38,
            { color: COLORS.cyan, size: compact ? 9 : 11, align: 'center' });
        }
      }

      // where we are now
      const nowX = X(this.logA);
      ctx.strokeStyle = COLORS.orange; ctx.lineWidth = 1.4; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(nowX, py0); ctx.lineTo(nowX, py1); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, 'now', nowX, py0 - 4, { color: COLORS.orange, size: compact ? 10 : 12, align: 'center' });

      const endX = X(0);
      label(ctx, 'end of inflation', endX, py1 + (compact ? 14 : 18), { color: COLORS.muted, size: compact ? 9.5 : 11.5, align: 'center' });
      label(ctx, 'size of the universe  a  →', (x0 + x1) / 2, h - (compact ? 8 : 10),
        { color: COLORS.ink, size: compact ? 10 : 12, align: 'center' });
      label(ctx, compact ? 'above the cyan line = frozen' : 'a ripple is frozen whenever it sits ABOVE the cyan curve — outside the horizon',
        (x0 + x1) / 2, py0 - (compact ? 18 : 22), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    renderLumps() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;

      label(ctx, 'the same ripples, 13.8 billion years later', w / 2, compact ? 24 : 30,
        { color: COLORS.yellow, size: compact ? 12.5 : 16, align: 'center' });

      // a doodle all-sky map: an oval with hot and cold patches
      const cx = w * (compact ? 0.5 : 0.36);
      const cy = h * 0.50;
      const rx = Math.min(w * (compact ? 0.42 : 0.30), h * 0.36);
      const ry = rx * 0.56;
      this.cache.draw(`oval-${w}x${h}`, (g) => g.ellipse(cx, cy, rx * 2, ry * 2, opts(1330, {
        stroke: COLORS.ink, strokeWidth: 2.2,
      })));
      // patches, deterministic so the "map" never boils
      for (let i = 0; i < 34; i++) {
        const t = (i * 0.6180339887) % 1;
        const u = (i * 0.7548776662) % 1;
        const ang = t * Math.PI * 2;
        const rad = Math.sqrt(u) * 0.88;
        const px = cx + Math.cos(ang) * rad * rx;
        const py = cy + Math.sin(ang) * rad * ry;
        const hot = (i % 2) === 0;
        const sz = 8 + ((i * 5) % 4) * 4;
        this.cache.draw(`patch-${i}-${w}x${h}`, (g) => g.circle(px, py, sz, opts(1340 + i, {
          stroke: hot ? COLORS.red : COLORS.cyan, strokeWidth: 1.2,
          fill: hot ? COLORS.red : COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 5,
        })));
      }
      label(ctx, 'the microwave sky', cx, cy + ry + 24, { color: COLORS.ink, size: compact ? 11.5 : 13.5, align: 'center' });
      label(ctx, `hot vs cold: ΔT/T ≈ ${sci(DT_OVER_T, 2)}`, cx, cy + ry + 42,
        { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });

      if (!compact) {
        // the tilt, as a measured number against the scale-invariant prediction
        const bx = w * 0.70;
        let by = h * 0.30;
        label(ctx, 'is the spectrum flat?', bx, by, { color: COLORS.yellow, size: 15, align: 'center' });
        by += 30;
        label(ctx, 'perfectly scale-invariant: n_s = 1', bx, by, { color: COLORS.muted, size: 12.5, align: 'center' });
        by += 24;
        label(ctx, `measured: n_s = ${fmtNum(N_S, 4)} ± ${fmtNum(N_S_ERR, 4)}`, bx, by, { color: COLORS.green, size: 14.5, align: 'center' });
        by += 24;
        label(ctx, `that is ${fmtNum((1 - N_S) / N_S_ERR, 1)}σ below 1`, bx, by, { color: COLORS.pink, size: 13, align: 'center' });
        by += 30;
        label(ctx, 'inflation predicted a tilt', bx, by, { color: COLORS.cyan, size: 12.5, align: 'center' });
        label(ctx, 'slightly below 1 — before it was measured', bx, by + 18, { color: COLORS.cyan, size: 12.5, align: 'center' });
        by += 52;
        label(ctx, `primordial gravitational waves: r < ${fmtNum(R_LIMIT, 3)}`, bx, by, { color: COLORS.orange, size: 12.5, align: 'center' });
        label(ctx, 'not found yet — the next big test', bx, by + 18, { color: COLORS.muted, size: 11.5, align: 'center' });
      }

      notToScale(rc, ctx, compact ? w - 66 : w - 84, h - 26);
      label(ctx, compact ? 'quantum ripples, stretched to the size of the sky' : 'every structure in the universe began as a quantum fluctuation that the expansion froze and enlarged',
        w / 2, h - 10, { color: COLORS.muted, size: compact ? 10 : 12.5, align: 'center' });
    }

    render() {
      if (this.mode === 'lumps') return this.renderLumps();
      this.renderStretch();
    }
  }

  A.register('creation', ParticleCreationSim);
})();
