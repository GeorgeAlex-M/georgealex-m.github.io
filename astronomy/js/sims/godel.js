// Sim 40 — Gödel's rotating universe.
//
// Physics (visualized top-down around an arbitrary axis — the Gödel universe
// is homogeneous, so EVERY point has this structure): global rotation ω tilts
// light cones tangentially, more strongly with radius. Beyond a critical
// radius R_c ∝ 1/ω the cones tip past "horizontal": a slower-than-light
// circular path becomes a CLOSED TIMELIKE CURVE — it returns to its own past.
// The sim's tilt law (linear in r/R_c, capped) is a faithful qualitative
// rendering of the metric's behaviour; the readout is explicit that our
// universe does not rotate (CMB isotropy) — this is a possible universe,
// not ours.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, sparkle,
    slider, buttonRow, actionButton, setReadout, fmtNum,
  } = A;

  class GodelSim extends Sim {
    init() {
      this.omega = 0.7;        // rotation rate (visual units)
      this.probes = [];        // user-placed light-cone probes
      this.ship = null;        // {phi, laps, state}
      this.t = 0;
      this.buildControls();
      this.bindPointer();
      this.updateReadout();
    }

    get Rc() { // critical time-loop radius in px: ∝ 1/ω
      return Math.min(105 / this.omega, Math.min(this.w, this.h) * 0.46);
    }
    get center() { return [this.w * 0.5, this.h * 0.5 + 6]; }

    buildControls() {
      const c = this.controlsEl;
      this.omegaSlider = slider(c, {
        label: 'universe rotation ω',
        min: 0.35, max: 1.5, step: 0.01, value: this.omega,
        format: (v) => fmtNum(v, 2),
        oninput: (v) => { this.omega = v; this.updateReadout(); this.poke(); },
      });
      actionButton(c, 'send the ship around the loop', () => {
        this.ship = { phi: -Math.PI / 2, laps: 0, state: 'flying', shipClock: 0, cosmosClock: 0 };
        this.cite('1949 Gödel - An Example of a New Type of Cosmological Solutions of Einstein\'s Field Equations of Gravitation');
        this.poke();
      });
      actionButton(c, 'clear probes', () => { this.probes.length = 0; this.poke(); });
    }

    bindPointer() {
      this.canvasEl.addEventListener('pointerdown', (e) => {
        const rect = this.canvasEl.getBoundingClientRect();
        const [cx, cy] = this.center;
        const x = e.clientX - rect.left - cx;
        const y = e.clientY - rect.top - cy;
        const r = Math.hypot(x, y);
        if (r < 14) return;
        if (this.probes.length >= 7) this.probes.shift();
        this.probes.push({ r, ang: Math.atan2(y, x) });
        this.updateReadout();
        this.poke();
      });
    }

    tiltAt(r) { // light-cone tilt in degrees: 0 = upright, 90 = horizontal (null), >90 = past-directed
      return Math.min((r / this.Rc) * 90, 135);
    }

    updateReadout() {
      const lines = [
        [
          ['critical radius R_c ∝ 1/ω — beyond the ', null], ['pink circle', 'pink'],
          [', flying a slower-than-light circle is a CLOSED TIMELIKE CURVE: you arrive before you left.', null],
        ],
      ];
      if (this.probes.length) {
        const p = this.probes[this.probes.length - 1];
        const tilt = this.tiltAt(p.r);
        lines.push([
          ['your probe: light cone tilted ', null],
          [`${fmtNum(tilt, 0)}°`, tilt >= 90 ? 'red' : 'cyan'],
          [tilt >= 90 ? ' — past horizontal: the local future points into the cosmos\'s past.' : ' — still future-pointing; no loop from here.', null],
        ]);
      } else {
        lines.push([['click anywhere to probe the local light cone.', 'yellow']]);
      }
      lines.push([[
        'honesty: OUR universe expands and does not rotate (the CMB is isotropic to ~10⁻⁵). Gödel\'s point was philosophical: Einstein\'s equations permit worlds where time loops — so what is time?',
        'green',
      ]]);
      setReadout(this.readoutEl, lines);
    }

    update(dt) {
      this.t += dt;
      const s = this.ship;
      if (s && s.state === 'flying') {
        const dphi = dt * 0.8;
        s.phi += dphi;
        s.shipClock += dt;                 // proper time: always forward
        s.cosmosClock -= dt * 1.6;         // cosmos date: runs BACKWARD on this loop
        if (s.phi >= -Math.PI / 2 + Math.PI * 2) {
          s.state = 'arrived';
          s.doneAt = this.t;
        }
      } else if (s && s.state === 'arrived' && this.t - s.doneAt > 6) {
        this.ship = null;
      }
    }

    drawCone(rc, ctx, x, y, ang, tiltDeg, size, color, seed) {
      // a light cone doodle: V opening "future-up" = radially outward-tangent frame.
      // We draw it in the tangential frame: upright = future (t̂), tilt rotates
      // toward the tangential direction (the rotation drag).
      const tilt = (tiltDeg * Math.PI) / 180;
      const base = ang - Math.PI / 2; // local "up" = out of the page → draw screen-up per position frame
      const dir = ang + Math.PI / 2;  // tangential (rotation) direction
      // cone axis: mix of "up" (screen radial-out for legibility) and tangential by tilt
      const ux = Math.cos(ang) * Math.cos(tilt) + Math.cos(dir) * Math.sin(tilt);
      const uy = Math.sin(ang) * Math.cos(tilt) + Math.sin(dir) * Math.sin(tilt);
      const axAng = Math.atan2(uy, ux);
      const half = 0.42;
      const o = opts(seed, { stroke: color, strokeWidth: 1.6 });
      rc.line(x, y, x + Math.cos(axAng - half) * size, y + Math.sin(axAng - half) * size, o);
      rc.line(x, y, x + Math.cos(axAng + half) * size, y + Math.sin(axAng + half) * size, o);
      rc.arc(x, y, size * 1.5, size * 1.5, axAng - half, axAng + half, false, opts(seed + 1, { stroke: color, strokeWidth: 1.2 }));
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const [cx, cy] = this.center;
      const Rc = this.Rc;

      // rotation axis + faint guide circles
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'axis (any point works — the universe is homogeneous)', cx, cy + 18, { color: COLORS.muted, size: 10.5, align: 'center' });
      for (const f of [0.35, 0.7, 1.35]) {
        this.cache.draw(`guide-${f}-${Rc | 0}-${w}x${h}`, (g) => g.circle(cx, cy, Rc * f * 2, opts(500 + f * 100, {
          stroke: COLORS.muted, strokeWidth: 0.9, strokeLineDash: [3, 8],
        })));
      }
      // the critical circle
      this.cache.draw(`crit-${Rc | 0}-${w}x${h}`, (g) => g.circle(cx, cy, Rc * 2, opts(505, {
        stroke: COLORS.pink, strokeWidth: 2.2, strokeLineDash: [9, 7],
      })));
      label(ctx, 'beyond here: circles run backward in time', cx, cy - Rc - 10, { color: COLORS.pink, size: compact ? 11.5 : 13, align: 'center' });

      // ring of light cones showing the tilt growing with radius
      for (const rf of [0.35, 0.7, 1.0, 1.35]) {
        const r = Rc * rf;
        const n = compact ? 4 : 6;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + rf;
          const x = cx + Math.cos(ang) * r;
          const y = cy + Math.sin(ang) * r;
          if (x < 8 || x > w - 8 || y < 8 || y > h - 8) continue;
          const tilt = this.tiltAt(r);
          const col = tilt >= 90 ? COLORS.red : tilt > 55 ? COLORS.orange : COLORS.cyan;
          this.drawCone(rc, ctx, x, y, ang, tilt, compact ? 11 : 14, col, 520 + ((rf * 10 + i) | 0));
        }
      }

      // user probes (bigger cones)
      for (const p of this.probes) {
        const x = cx + Math.cos(p.ang) * p.r;
        const y = cy + Math.sin(p.ang) * p.r;
        const tilt = this.tiltAt(p.r);
        const col = tilt >= 90 ? COLORS.red : COLORS.yellow;
        this.drawCone(rc, ctx, x, y, p.ang, tilt, 20, col, 560 + ((p.r) | 0) % 37);
      }

      // the ship on its closed timelike curve
      const s = this.ship;
      if (s) {
        const rShip = Rc * 1.15;
        const x = cx + Math.cos(s.phi) * rShip;
        const y = cy + Math.sin(s.phi) * rShip;
        // ship doodle: little dart
        const tang = s.phi + Math.PI / 2;
        rc.path(`M ${x - Math.cos(tang) * 10} ${y - Math.sin(tang) * 10} L ${x + Math.cos(tang) * 10} ${y + Math.sin(tang) * 10} L ${x + Math.cos(tang - 2.6) * 8} ${y + Math.sin(tang - 2.6) * 8} z`, opts(570, { stroke: COLORS.green, strokeWidth: 1.8 }));
        // ghost of the departure event
        sparkle(rc, cx + Math.cos(-Math.PI / 2) * rShip, cy + Math.sin(-Math.PI / 2) * rShip, 6, { color: COLORS.muted, seed: 571 });
        // clocks
        const bx = compact ? 10 : 16;
        label(ctx, `ship's own clock:  +${fmtNum(s.shipClock, 1)} s  (always forward)`, bx, 24, { color: COLORS.green, size: compact ? 11.5 : 13 });
        label(ctx, `cosmos date:  ${fmtNum(s.cosmosClock, 1)} s  (running backward!)`, bx, 44, { color: COLORS.red, size: compact ? 11.5 : 13 });
        if (s.state === 'arrived') {
          label(ctx, 'arrived BEFORE it left — every second on board felt normal', cx, cy + Rc + 26, { color: COLORS.yellow, size: compact ? 12 : 14, align: 'center' });
        }
      }

      label(ctx, 'cone tips over → red = "future" points into the past', compact ? w / 2 : w - 16, h - 12, { color: COLORS.muted, size: compact ? 10.5 : 12, align: compact ? 'center' : 'right' });
    }
  }

  A.register('godel', GodelSim);
})();
