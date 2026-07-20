// Sim 3 — Orbits, the ISCO, and Mercury's perihelion precession.
//
// Both panels integrate the Binet orbit equation with RK4:
//     d²u/dφ² + u = GM/L²  +  (3GM/c²)·u²      (u = 1/r)
// The right panel keeps the relativistic u² term (the exact Schwarzschild
// geodesic equation), the left panel drops it (Newton). Same initial
// conditions, same angular momentum — every difference you see IS that term.
// Perihelion precession is MEASURED from the integration (angle between
// successive perihelia − 2π, with the du/dφ zero-crossing interpolated) and
// shown next to Einstein's first-order formula
//     Δφ = 6πGM / (c² a (1−e²))  per orbit.
// The exaggeration slider multiplies the u² term by N so Mercury's microscopic
// rosette becomes visible — the true N=1 numbers are always displayed.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label,
    slider, buttonRow, actionButton, setReadout,
    rk4, binetDeriv,
    G, C2, M_SUN, M_SGRA, YEAR, ARCSEC_PER_RAD, schwarzschildRadius, fmtNum,
  } = A;

  const PRESETS = {
    mercury: {
      name: 'Mercury around the Sun',
      M: M_SUN,
      a: 5.7909e10,
      e: 0.20563,
      N: 30000,
      blurb: 'the real effect is 0.1″ per orbit — exaggerated ×N so you can see the rosette',
    },
    bh: {
      name: 'a star skimming a supermassive black hole',
      M: M_SGRA,
      rpRs: 8, // periapsis in units of r_s
      e: 0.5,
      N: 1,
      blurb: 'this close, no exaggeration is needed — the ellipse swings around by ~70° every single orbit',
    },
    plunge: {
      name: 'dipping below the ISCO',
      M: M_SGRA,
      rpRs: 2.6,
      e: 0.6,
      N: 1,
      blurb: "periapsis below 3 r_s: for this orbit GR has NO centrifugal barrier left — watch the right panel",
    },
  };

  const MAX_TRAIL = 2600;
  const PHI_STEP = 0.02;   // rad, RK4 substep
  const PHI_RATE = 2.0;    // rad of orbit angle per wall second

  class OrbitsSim extends Sim {
    init() {
      this.buildControls();
      this.applyPreset('mercury');
    }

    buildControls() {
      const c = this.controlsEl;
      this.presetBtns = buttonRow(c, [
        { label: 'Mercury', value: 'mercury' },
        { label: 'star near a black hole', value: 'bh' },
        { label: 'below the ISCO', value: 'plunge' },
      ], {
        initial: 'mercury',
        onSelect: (v) => { this.applyPreset(v); this.poke(); },
      });
      this.exagSlider = slider(c, {
        label: 'GR term ×',
        min: 1,
        max: 300000,
        value: 30000,
        log: true,
        format: (v) => fmtNum(Math.round(v), 0),
        oninput: (v) => {
          this.N = Math.round(v);
          this.restart();
          this.poke();
        },
      });
      actionButton(c, 'clear trails', () => {
        this.newton.trail.length = 0;
        this.gr.trail.length = 0;
        this.poke();
      });
    }

    applyPreset(key) {
      this.presetKey = key;
      if (key === 'mercury') {
        this.cite('1915 Einstein - Erklärung der Perihelbewegung des Merkur aus der allgemeinen Relativitätstheorie');
      } else {
        this.cite('1916 Schwarzschild - Über das Gravitationsfeld eines Massenpunktes nach der Einsteinschen Theorie');
      }
      const p = PRESETS[key];
      this.M = p.M;
      this.rs = schwarzschildRadius(p.M);
      this.e = p.e;
      this.a = p.a !== undefined ? p.a : (p.rpRs * this.rs) / (1 - p.e);
      this.N = p.N;
      this.exagSlider.set(p.N);
      this.restart();
    }

    restart() {
      // Newtonian ellipse relations give the shared initial conditions:
      // L² = GM·a(1−e²);  start at perihelion, u0 = (1+e)/(a(1−e²)), du = 0.
      const p = this.a * (1 - this.e * this.e); // semi-latus rectum
      this.gmOverL2 = 1 / p;
      this.relTermTrue = (3 * G * this.M) / C2;
      const u0 = (1 + this.e) / p;
      const mk = () => ({ u: u0, du: 0, phi: 0, trail: [], periPhis: [0], captured: false, measured: null });
      this.newton = mk();
      this.gr = mk();
      this.updateReadout();
    }

    stepPanel(panel, relTerm, dphi) {
      if (panel.captured) return;
      const deriv = binetDeriv(this.gmOverL2, relTerm);
      let remaining = dphi;
      while (remaining > 1e-9) {
        const step = Math.min(PHI_STEP, remaining);
        remaining -= step;
        const prevDu = panel.du;
        [panel.u, panel.du] = rk4([panel.u, panel.du], deriv, panel.phi, step);
        panel.phi += step;
        // capture: fell inside the horizon
        if (panel.u > 1 / this.rs) {
          panel.captured = true;
          break;
        }
        // unbound safety
        if (panel.u <= 0) { panel.captured = true; break; }
        // perihelion: u passes a maximum (du: + → −). Interpolate the exact
        // zero-crossing of du — detecting at step granularity would quantize
        // the measured precession by up to the φ step itself.
        if (prevDu > 0 && panel.du <= 0) {
          const frac = prevDu / (prevDu - panel.du); // 0..1 within this step
          const periPhi = panel.phi - step * (1 - frac);
          const last = panel.periPhis[panel.periPhis.length - 1];
          panel.measured = periPhi - last - Math.PI * 2;
          panel.periPhis.push(periPhi);
        }
      }
      // record trail point
      const r = 1 / panel.u;
      panel.trail.push([r * Math.cos(panel.phi), r * Math.sin(panel.phi)]);
      if (panel.trail.length > MAX_TRAIL) panel.trail.splice(0, panel.trail.length - MAX_TRAIL);
    }

    update(dt) {
      const dphi = dt * PHI_RATE;
      this.stepPanel(this.newton, 0, dphi);
      this.stepPanel(this.gr, this.relTermTrue * this.N, dphi);
      if (this._lastMeasured !== this.gr.measured || this.gr.captured !== this._lastCaptured) {
        this._lastMeasured = this.gr.measured;
        this._lastCaptured = this.gr.captured;
        this.updateReadout();
      }
    }

    formulaPerOrbit() { // radians, first-order GR (N = 1)
      return (6 * Math.PI * G * this.M) / (C2 * this.a * (1 - this.e * this.e));
    }

    fmtAngle(rad) {
      const deg = (rad * 180) / Math.PI;
      if (Math.abs(deg) >= 0.5) return `${fmtNum(deg, 1)}°`;
      return `${fmtNum(rad * ARCSEC_PER_RAD, 3)}″`;
    }

    updateReadout() {
      const p = PRESETS[this.presetKey];
      const truePerOrbit = this.formulaPerOrbit();
      const lines = [
        [[p.name, 'yellow'], [` — ${p.blurb}`, null]],
      ];

      if (this.presetKey === 'plunge') {
        lines.push([[
          this.gr.captured
            ? 'GR orbit: CAPTURED — below the ISCO the centrifugal barrier is gone, so it spirals in. Newton, missing the u² term, orbits forever.'
            : 'watch the right panel…',
          this.gr.captured ? 'red' : null,
        ]]);
      } else {
        const measured = this.gr.measured;
        lines.push([
          ['perihelion advance — measured from the integration: ', null],
          [measured === null ? '(completing first orbit…)' : `${this.fmtAngle(measured)}/orbit`, 'green'],
          [this.N > 1 ? ` (with GR term ×${fmtNum(this.N, 0)})` : ' (exact equation, no exaggeration)', null],
        ]);
        lines.push(this.N > 1 ? [
          ['true value (×1), Einstein\'s formula: ', null],
          [`${this.fmtAngle(truePerOrbit)}/orbit`, 'cyan'],
        ] : [
          ['Einstein\'s first-order formula predicts ', null],
          [`${this.fmtAngle(truePerOrbit)}/orbit`, 'cyan'],
          [' — this deep in the gravity well, the exact orbit precesses even more', null],
        ]);
        if (this.presetKey === 'mercury') {
          const T = 2 * Math.PI * Math.sqrt(this.a ** 3 / (G * this.M)); // Kepler
          const perCentury = truePerOrbit * ARCSEC_PER_RAD * ((100 * YEAR) / T);
          lines.push([
            [`for Mercury that is `, null],
            [`${fmtNum(perCentury, 2)}″ per century`, 'pink'],
            [` — the number Einstein recovered in November 1915`, null],
          ]);
        }
      }
      setReadout(this.readoutEl, lines);
    }

    drawPanel(panel, cx, cy, half, title, accent) {
      const { rc, ctx } = this;
      // fit the apoapsis comfortably in the panel
      const ra = this.a * (1 + this.e);
      const pxPerM = (half - 26) / (ra * 1.12);
      const rsPx = this.rs * pxPerM;

      label(ctx, title, cx, cy - half + 4, { color: accent, size: 16, align: 'center' });

      // central body
      if (rsPx > 3) {
        this.cache.draw(`hole-${title}-${rsPx | 0}-${cx | 0}`, (g) => g.circle(cx, cy, rsPx * 2, opts(90, {
          stroke: COLORS.ink, fill: '#000000', fillStyle: 'solid', strokeWidth: 2,
        })));
        const iscoPx = 3 * rsPx;
        this.cache.draw(`isco-${title}-${rsPx | 0}-${cx | 0}`, (g) => g.circle(cx, cy, iscoPx * 2, opts(91, {
          stroke: COLORS.green, strokeWidth: 1.2, strokeLineDash: [6, 6],
        })));
        label(ctx, 'ISCO', cx + iscoPx * 0.72, cy - iscoPx * 0.72, { color: COLORS.green, size: 11 });
      } else {
        this.cache.draw(`sun-${title}-${cx | 0}`, (g) => g.circle(cx, cy, 18, opts(92, {
          stroke: COLORS.yellow, strokeWidth: 2, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 1,
        })));
      }

      // trail (plain thin stroke — rough would boil; thin ink fits the doodle)
      if (panel.trail.length > 1) {
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < panel.trail.length; i++) {
          const [px, py] = panel.trail[i];
          const x = cx + px * pxPerM;
          const y = cy - py * pxPerM;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // perihelion markers — the advancing dots ARE the precession
      const peris = panel.periPhis.slice(-8);
      const rp = this.a * (1 - this.e);
      for (const phi of peris) {
        ctx.fillStyle = COLORS.orange;
        ctx.beginPath();
        ctx.arc(cx + rp * pxPerM * Math.cos(phi), cy - rp * pxPerM * Math.sin(phi), 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // the planet/star itself
      if (!panel.captured || panel.trail.length) {
        const last = panel.trail[panel.trail.length - 1];
        if (last) {
          const x = cx + last[0] * pxPerM;
          const y = cy - last[1] * pxPerM;
          if (!panel.captured) {
            rc.circle(x, y, 9, opts(93, { stroke: accent, strokeWidth: 2 }));
          } else {
            label(ctx, 'captured!', cx, cy + half * 0.55, { color: COLORS.red, size: 15, align: 'center' });
          }
        }
      }
    }

    render() {
      const { rc, ctx, w, h } = this;
      const half = Math.min(w / 4, h / 2 - 10);
      const cy = h / 2 + 8;
      this.drawPanel(this.newton, w * 0.25, cy, half, 'NEWTON', COLORS.cyan);
      this.drawPanel(this.gr, w * 0.75, cy, half, 'EINSTEIN (GR)', COLORS.pink);
      this.cache.draw(`divider-${w}x${h}`, (g) => g.line(w / 2, 16, w / 2, h - 16, opts(94, {
        stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [8, 8],
      })));
      label(ctx, 'same start, same angular momentum — the only difference is the u² term', w / 2, h - 8, {
        color: COLORS.muted, size: 13, align: 'center',
      });
      // orange perihelion legend
      ctx.fillStyle = COLORS.orange;
      ctx.beginPath();
      ctx.arc(14, 18, 2.6, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, 'perihelion (closest point) markers', 24, 22, { color: COLORS.orange, size: 12.5 });
    }
  }

  A.register('orbits', OrbitsSim);
})();
