// Sim 5 — Bending time.
//
// Physics: the light clock. Both clocks' photons move at c (Einstein's 1905
// axiom); the moving clock's photon travels a zigzag, so its vertical progress
// (and hence its tick rate) is slower by exactly γ = 1/√(1−v²/c²) — the sim
// literally advances the moving photon's phase at rate √(1−v²), so the
// dilation you watch IS the derivation.
// GPS numbers are computed live from constants:
//   gravitational: Δt/t = GM/c²·(1/R_earth − 1/a) → +45.7 μs/day (clock runs fast)
//   velocity:      Δt/t = GM/(2ac²)              → −7.2 μs/day  (clock runs slow)
// Miller's planet factor 61,362 (1 hr = 7 yr) is gravitational, from the
// near-extremal Kerr geometry worked out for the film (2015 James et al.).

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleClock, stickFigure,
    slider, buttonRow, actionButton, setReadout,
    G, C, C2, M_EARTH, R_EARTH, fmtNum, sci,
  } = A;

  const GPS_A = 2.656e7;          // GPS orbit semi-major axis, m
  const MILLER = 61362;           // 1 hour = 7 years
  const TICK_RATE = 1.1;          // photon round-trips per second (at rest)

  // GPS clock effects, μs per day (computed, not hardcoded)
  const GM = G * M_EARTH;
  const GPS_GRAV = (GM / C2) * (1 / R_EARTH - 1 / GPS_A) * 86400 * 1e6;   // +45.7
  const GPS_VEL = (GM / (2 * GPS_A * C2)) * 86400 * 1e6;                  // −7.2
  const GPS_NET = GPS_GRAV - GPS_VEL;
  const GPS_KM_PER_DAY = (GPS_NET * 1e-6 * C) / 1000;                     // ~11.5

  class TimeDilationSim extends Sim {
    init() {
      this.v = 0.6;            // v/c
      this.scenario = 'play';  // 'play' | 'miller' | 'gps'
      this.resetClocks();
      this.buildControls();
      this.updateReadout();
    }

    resetClocks() {
      this.phaseRest = 0;   // photon phase 0..1 (down-and-back = 1 tick)
      this.phaseMove = 0;
      this.ticksRest = 0;
      this.ticksMove = 0;
      this.moveX = 0;       // traveling clock's horizontal drift (wraps)
      this.zigzag = [];
    }

    get gamma() { return 1 / Math.sqrt(1 - this.v * this.v); }

    buildControls() {
      const c = this.controlsEl;
      this.vSlider = slider(c, {
        label: 'traveler speed',
        min: 0,
        max: 0.99,
        step: 0.001,
        value: this.v,
        format: (v) => `${fmtNum(v * 100, 1)}% of c`,
        oninput: (v) => {
          this.v = v;
          this.updateReadout();
          this.poke();
        },
      });
      this.scenarioBtns = buttonRow(c, [
        { label: 'free play', value: 'play' },
        { label: "Miller's planet", value: 'miller' },
        { label: 'GPS in your pocket', value: 'gps' },
      ], {
        initial: 'play',
        onSelect: (v) => {
          this.scenario = v;
          if (v === 'miller') {
            this.cite('2015 James, von Tunzelmann, Franklin, Thorne - Gravitational Lensing by Spinning Black Holes in Astrophysics, and in the Movie Interstellar');
          } else if (v === 'gps') {
            this.cite('2003 Ashby - Relativity in the Global Positioning System');
          } else {
            this.cite('1905 Einstein - Zur Elektrodynamik bewegter Körper');
          }
          this.updateReadout();
          this.poke();
        },
      });
      actionButton(c, 'reset clocks', () => { this.resetClocks(); this.poke(); });
    }

    updateReadout() {
      const g = this.gamma;
      const lines = [
        [
          ['γ = ', null], [fmtNum(g, g < 10 ? 3 : 1), 'orange'],
          ['   →  1 s for the traveler = ', null], [`${fmtNum(g, 3)} s`, 'cyan'],
          [' for you. A 10-year trip at this speed ages the traveler ', null],
          [`${fmtNum(10 / g, 2)} years`, 'pink'],
          ['.', null],
        ],
      ];
      if (this.scenario === 'miller') {
        lines.push([
          ["Miller's planet (Interstellar): 1 hour there = ", null],
          ['7 years', 'orange'],
          [` outside — a factor of ${fmtNum(MILLER, 0)}. Gravitational, not speed: it needs an orbit skimming a black hole spinning within 1 part in 10¹⁴ of the maximum. Checked by Kip Thorne — the movie is a real solution of Einstein's equations.`, null],
        ]);
      } else if (this.scenario === 'gps') {
        lines.push([
          ['GPS satellite clocks: gravity makes them run fast by ', null],
          [`+${fmtNum(GPS_GRAV, 1)} μs/day`, 'green'],
          [', orbital speed slow by ', null],
          [`−${fmtNum(GPS_VEL, 1)} μs/day`, 'red'],
          ['  →  net ', null],
          [`+${fmtNum(GPS_NET, 1)} μs/day`, 'yellow'],
          [`. Uncorrected, your position would drift ≈ ${fmtNum(GPS_KM_PER_DAY, 1)} km EVERY DAY.`, null],
        ]);
      } else {
        lines.push([[
          'slide the speed and watch the traveler\'s photon zigzag — same light speed for everyone means fewer ticks for the mover. That IS the derivation of γ.',
          null,
        ]]);
      }
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      // photon phases: rest advances at TICK_RATE, mover at TICK_RATE·√(1−v²)
      const prevRest = this.phaseRest;
      const prevMove = this.phaseMove;
      this.phaseRest += dt * TICK_RATE;
      this.phaseMove += dt * TICK_RATE * Math.sqrt(1 - this.v * this.v);
      if (Math.floor(this.phaseRest) > Math.floor(prevRest)) this.ticksRest++;
      if (Math.floor(this.phaseMove) > Math.floor(prevMove)) this.ticksMove++;
      this.moveX += dt * this.v * 130; // drift speed on screen ∝ v
      // zigzag trail of the moving photon
      this.zigzag.push([this.moveX, this.phaseMove]);
      if (this.zigzag.length > 90) this.zigzag.shift();
    }

    // photon phase (0..1) → vertical position between mirrors
    photonY(phase, top, hgt) {
      const p = phase % 1;
      const k = p < 0.5 ? p * 2 : 2 - p * 2; // down then back up
      return top + k * hgt;
    }

    drawLightClock(cxLeft, top, wid, hgt, phase, drift, title, color, ticks) {
      const { rc, ctx } = this;
      const wrap = (x) => cxLeft + ((x % wid) + wid) % wid;
      const x = drift === null ? cxLeft + wid / 2 : wrap(drift);
      // mirrors
      this.cache.draw(`mir-${title}-${cxLeft | 0}-${wid | 0}`, (g) => {
        const o = opts(300 + (cxLeft | 0) % 97, { stroke: COLORS.muted, strokeWidth: 2.4 });
        return g.path(`M ${cxLeft} ${top - 8} L ${cxLeft + wid} ${top - 8} M ${cxLeft} ${top + hgt + 8} L ${cxLeft + wid} ${top + hgt + 8}`, o);
      });
      // zigzag trail (moving clock only)
      if (drift !== null && this.zigzag.length > 1) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let started = false;
        let lastX = null;
        for (const [zx, zphase] of this.zigzag) {
          const px = wrap(zx);
          const py = this.photonY(zphase, top, hgt);
          if (lastX !== null && px < lastX - 5) started = false; // wrapped
          if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
          lastX = px;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // the photon
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, this.photonY(phase, top, hgt), 5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, title, cxLeft + wid / 2, top - 22, { color, size: 15, align: 'center' });
      label(ctx, `ticks: ${ticks}`, cxLeft + wid / 2, top + hgt + 36, { color, size: 15, align: 'center' });
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const panelW = compact ? w * 0.42 : w * 0.30;
      const top = h * 0.18;
      const hgt = h * 0.42;

      this.drawLightClock(w * 0.06, top, panelW, hgt, this.phaseRest, null, 'you, at rest', COLORS.cyan, this.ticksRest);
      this.drawLightClock(w * (compact ? 0.54 : 0.42), top, panelW, hgt, this.phaseMove, this.moveX, `traveler at ${fmtNum(this.v * 100, 0)}% c`, COLORS.pink, this.ticksMove);

      // γ readout drawn big
      label(ctx, `γ = ${fmtNum(this.gamma, 2)}`, w * (compact ? 0.5 : 0.86), compact ? h * 0.86 : h * 0.24, {
        color: COLORS.orange, size: 26, align: 'center',
      });

      // scenario cards (right column on desktop, bottom strip on mobile)
      if (!compact && this.scenario === 'miller') {
        const cx = w * 0.86;
        const cy = h * 0.62;
        this.cache.draw(`miller-${w}x${h}`, (g) => g.circle(cx, cy, 70, opts(310, {
          stroke: COLORS.cyan, strokeWidth: 2, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.7, hachureGap: 8,
        })));
        // giant wave doodle (the film's famous wave)
        this.cache.draw(`wave-${w}x${h}`, (g) => g.path(
          `M ${cx - 34} ${cy - 6} q 8 -18 16 0 q 8 18 16 0 q 8 -18 16 0`,
          opts(311, { stroke: COLORS.ink, strokeWidth: 1.6 }),
        ));
        label(ctx, "Miller's planet", cx, cy + 58, { color: COLORS.cyan, size: 14, align: 'center' });
        label(ctx, '1 hr = 7 yr', cx, cy + 76, { color: COLORS.orange, size: 14, align: 'center' });
      } else if (!compact && this.scenario === 'gps') {
        const cx = w * 0.86;
        const cy = h * 0.62;
        this.cache.draw(`earth-${w}x${h}`, (g) => g.circle(cx, cy, 56, opts(312, {
          stroke: COLORS.green, strokeWidth: 2,
        })));
        this.cache.draw(`orbit-${w}x${h}`, (g) => g.circle(cx, cy, 108, opts(313, {
          stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [5, 6],
        })));
        const a = this.phaseRest * 0.9;
        const sx = cx + Math.cos(a) * 54;
        const sy = cy + Math.sin(a) * 54;
        rc.rectangle(sx - 7, sy - 5, 14, 10, opts(314, { stroke: COLORS.yellow, strokeWidth: 1.6 }));
        label(ctx, `+${fmtNum(GPS_NET, 1)} μs/day`, cx, cy + 78, { color: COLORS.yellow, size: 14, align: 'center' });
        label(ctx, `else: ${fmtNum(GPS_KM_PER_DAY, 1)} km/day of drift`, cx, cy + 96, { color: COLORS.muted, size: 12.5, align: 'center' });
      } else if (!compact) {
        // free play: a little rocket rider
        stickFigure(rc, w * 0.86, h * 0.56, { scale: 0.9, seed: 320, color: COLORS.pink });
        label(ctx, 'the traveler ages less —', w * 0.86, h * 0.78, { color: COLORS.muted, size: 13, align: 'center' });
        label(ctx, 'and both views are correct', w * 0.86, h * 0.795 + 14, { color: COLORS.muted, size: 13, align: 'center' });
      }

      label(ctx, 'same speed of light for everyone → longer photon path → slower ticks', w / 2, h - 12, {
        color: COLORS.muted, size: compact ? 11.5 : 13, align: 'center',
      });
    }
  }

  A.register('timeDilation', TimeDilationSim);
})();
