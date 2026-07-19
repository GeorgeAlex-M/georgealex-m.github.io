// Sim 2 — A stick figure falls into a black hole.
//
// Physics (Schwarzschild, radial "raindrop" fall from rest at infinity),
// worked in units of r_s for length and r_s/c for time:
//   Alice's own clock:   dρ/dτ = −1/√ρ            (finite τ to the horizon)
//   Bob's distant clock: dρ/dt = −(1 − 1/ρ)/√ρ    (ρ→1 only asymptotically)
//   clock-rate relation: dt/dτ = 1/(1 − 1/ρ)      (gravity + infall speed)
//   tidal stretch across a body of length L:  Δa = 2GML/r³
//   static gravitational redshift:            1+z = 1/√(1 − r_s/r)
// The FALL GEOMETRY is identical for any mass (self-similarity again) — what
// the mass changes is the physical clock (r_s/c) and the tides. That contrast
// is the whole lesson: 10 M☉ shreds you far outside; Sgr A* lets you cross.

import { Sim } from '../engine/sim.js';
import { opts } from '../engine/rough-helpers.js';
import { COLORS } from '../engine/palette.js';
import { label, stickFigure, doodleClock, doodleArrow, notToScale } from '../engine/sketch.js';
import { buttonRow, actionButton, setReadout } from '../engine/controls.js';
import { G, C, M_SUN, M_SGRA, schwarzschildRadius, fmtTime, fmtLen, sci, fmtNum } from '../engine/constants.js';

const RHO0 = 120;          // starting radius in units of r_s
const BODY_L = 2;          // meters head-to-toe
const G_EARTH = 9.81;
const BREAK_G = 100;       // cartoon "comes apart" threshold (~100 g)
const SPEED = 48;          // sim-time units (r_s/c) per wall-clock second

const MASSES = {
  stellar: { M: 10 * M_SUN, name: '10 M☉ (stellar black hole)' },
  sgra: { M: M_SGRA, name: 'Sgr A* (4.15×10⁶ M☉)' },
};

export class FallingInSim extends Sim {
  init() {
    this.massKey = 'stellar';
    this.mode = 'bob'; // 'bob' | 'alice'
    this.reset();
    this.buildControls();
    this._readoutT = 0;
  }

  reset() {
    this.rho = RHO0;
    this.tauU = 0; // Alice's proper time, units of r_s/c
    this.tU = 0;   // Bob's coordinate time, units of r_s/c
    this.running = false;
    this.crossed = false;
    this.updateReadout(true);
  }

  get M() { return MASSES[this.massKey].M; }
  get rs() { return schwarzschildRadius(this.M); }
  get tScale() { return this.rs / C; } // seconds per sim-time unit

  tidal(rho) { // m/s² across BODY_L at radius ρ·r_s
    const r = rho * this.rs;
    return (2 * G * this.M * BODY_L) / (r * r * r);
  }

  buildControls() {
    const c = this.controlsEl;
    this.massBtns = buttonRow(c, [
      { label: '10 M☉ black hole', value: 'stellar' },
      { label: 'Sgr A* (supermassive)', value: 'sgra' },
    ], {
      initial: 'stellar',
      onSelect: (v) => { this.massKey = v; this.reset(); this.poke(); },
    });
    this.viewBtns = buttonRow(c, [
      { label: "Bob's view (far away)", value: 'bob' },
      { label: "Alice's view (falling)", value: 'alice' },
    ], {
      initial: 'bob',
      onSelect: (v) => { this.mode = v; this.reset(); this.poke(); },
    });
    actionButton(c, 'drop Alice!', () => {
      if (!this.running && !this.crossed) { this.running = true; this.poke(); }
    });
    actionButton(c, 'reset', () => { this.reset(); this.poke(); });
  }

  update(dt) {
    if (this.running) {
      const steps = 6;
      const du = (dt * SPEED) / steps;
      for (let i = 0; i < steps; i++) {
        if (this.mode === 'alice') {
          // advance Alice's clock; track Bob's via dt/dτ
          const drho = -du / Math.sqrt(this.rho);
          this.tauU += du;
          const f = 1 - 1 / this.rho;
          this.tU += f > 1e-9 ? du / f : 0;
          this.rho += drho;
          if (this.rho <= 1) {
            this.rho = 1;
            this.crossed = true;
            this.running = false;
            break;
          }
        } else {
          // advance Bob's clock; ρ→1 asymptotically, Alice's τ via dτ = (1−1/ρ)dt
          const f = 1 - 1 / this.rho;
          const drho = -du * f / Math.sqrt(this.rho);
          this.tU += du;
          this.tauU += du * f;
          this.rho = Math.max(1 + 1e-9, this.rho + drho);
        }
      }
    }
    this._readoutT += dt;
    if (this._readoutT > 0.15) {
      this._readoutT = 0;
      this.updateReadout();
    }
  }

  updateReadout(initial = false) {
    const aG = this.tidal(this.rho) / G_EARTH;
    const f = 1 - 1 / this.rho;
    const rate = f > 1e-9 ? 1 / f : Infinity;
    let status;
    if (aG < 0.5) status = ['tides: unnoticeable', 'green'];
    else if (aG < 10) status = ['tides: uncomfortable stretching', 'yellow'];
    else if (aG < BREAK_G) status = ['tides: lethal', 'orange'];
    else status = ['tides: SPAGHETTIFIED — torn apart', 'red'];

    const lines = [
      [
        ['r = ', null], [`${fmtNum(this.rho, this.rho < 3 ? 3 : 1)} r_s`, 'cyan'],
        [` (${fmtLen(this.rho * this.rs)} from the center)`, null],
      ],
      [
        ['tidal stretch head-to-toe: Δa = ', null],
        [`${sci(this.tidal(this.rho), 2)} m/s²`, 'pink'],
        [` ≈ ${sci(aG, 2)} g   → `, null],
        status,
      ],
      [
        ["Alice's clock τ = ", null], [fmtTime(this.tauU * this.tScale), 'pink'],
        ["   Bob's clock t = ", null], [fmtTime(this.tU * this.tScale), 'cyan'],
        ['   clock-rate dt/dτ = ', null],
        [rate === Infinity ? '∞' : fmtNum(rate, rate > 100 ? 0 : 2), 'yellow'],
      ],
    ];
    if (this.crossed) {
      lines.push([[
        `Alice crossed the horizon after τ = ${fmtTime(this.tauU * this.tScale)} on her own clock — locally, nothing special happened. She reaches the singularity ${fmtTime((2 / 3) * this.tScale)} later. Bob never sees any of it.`,
        'green',
      ]]);
    } else if (this.mode === 'bob' && this.rho < 1.02) {
      lines.push([[
        "From outside, Alice appears frozen and redshifted at the horizon — Bob's clock will tick forever without ever seeing her cross.",
        'orange',
      ]]);
    } else if (initial) {
      lines.push([[
        'press "drop Alice!" — then switch mass and view and drop her again',
        null,
      ]]);
    }
    setReadout(this.readoutEl, lines);
  }

  // map ρ → vertical position (power scale so the horizon approach reads well)
  yOfRho(rho, ys, ye) {
    const t = Math.pow((rho - 1) / (RHO0 - 1), 0.55);
    return ye - (ye - ys) * t;
  }

  render() {
    const { rc, ctx, w, h } = this;
    const compact = w < 700;
    const sceneW = compact ? w : w * 0.62;
    const xA = sceneW * 0.5;
    const ys = 46;
    const ye = h - 64;

    // --- black hole: huge arc bulging up from the bottom ---
    const R = Math.max(w, h) * 0.8;
    this.cache.draw(`bh-${w}x${h}`, (g) => g.circle(xA, ye + R, R * 2, opts(50, {
      stroke: COLORS.ink, strokeWidth: 2.4, fill: '#000000', fillStyle: 'solid',
    })));
    label(ctx, 'event horizon', xA + (compact ? 60 : 90), ye + 26, { color: COLORS.muted, size: 14, align: 'left' });

    // distance ticks (the scale is compressed — show where ρ lives)
    for (const tick of [2, 5, 15, 40, 120]) {
      const y = this.yOfRho(tick, ys, ye);
      this.cache.draw(`tick-${tick}-${w}x${h}`, (g) => g.line(xA - 90, y, xA - 78, y, opts(51 + tick, {
        stroke: COLORS.muted, strokeWidth: 1.2,
      })));
      label(ctx, `${tick} r_s`, xA - 96, y + 4, { color: COLORS.muted, size: 12, align: 'right' });
    }

    // --- Alice ---
    const aG = this.tidal(this.rho) / G_EARTH;
    const stretch = Math.min(3, 1 + Math.max(0, Math.log10(Math.max(aG, 0.1)) + 1) * 0.55);
    const broken = aG > BREAK_G;
    const y = this.yOfRho(this.rho, ys, ye);
    let color = COLORS.ink;
    let alpha = 1;
    if (this.mode === 'bob') {
      // gravitational redshift: fade toward red, dim near the horizon
      const fz = Math.sqrt(Math.max(0, 1 - 1 / this.rho));
      const k = 1 - fz; // 0 far away → 1 at horizon
      color = k > 0.45 ? COLORS.red : COLORS.ink;
      alpha = Math.max(0.25, fz);
    }
    ctx.globalAlpha = alpha;
    stickFigure(rc, xA, y - 34 * stretch, { scale: 1, stretch, seed: 9, color, broken });
    ctx.globalAlpha = 1;
    if (this.crossed) {
      label(ctx, 'crossed! (and locally fine — for now)', xA + 26, y - 10, { color: COLORS.green, size: 14 });
    } else if (broken) {
      label(ctx, 'spaghettified!', xA + 30, y - 16, { color: COLORS.red, size: 15 });
    } else if (this.mode === 'bob' && this.rho < 1.05 && this.running) {
      label(ctx, 'frozen at the edge, forever…', xA + 26, y - 10, { color: COLORS.orange, size: 14 });
    }

    // falling direction arrow
    doodleArrow(rc, xA - 60, ys + 16, xA - 60, ys + 60, { color: COLORS.muted, seed: 58 });
    label(ctx, 'falling', xA - 70, ys + 40, { color: COLORS.muted, size: 13, align: 'right' });

    notToScale(rc, ctx, compact ? 70 : sceneW - 80, 26);

    // time-warp note
    label(
      ctx,
      `1 s of animation ≈ ${fmtTime(SPEED * this.tScale)} of ${this.mode === 'alice' ? "Alice's" : "Bob's"} time`,
      12, h - 12,
      { color: COLORS.yellow, size: 13 },
    );

    // --- clocks panel ---
    const clockR = compact ? 26 : 40;
    const cxA = compact ? w - 150 : sceneW + (w - sceneW) * 0.30;
    const cxB = compact ? w - 60 : sceneW + (w - sceneW) * 0.72;
    const cyC = compact ? 66 : h * 0.32;
    if (!compact) {
      this.cache.draw(`divider-${w}x${h}`, (g) => g.line(sceneW, 20, sceneW, h - 20, opts(59, {
        stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [8, 8],
      })));
      label(ctx, 'the two clocks', (cxA + cxB) / 2, cyC - clockR - 26, { color: COLORS.ink, size: 17, align: 'center' });
      // Bob himself, watching through a doodle telescope
      stickFigure(rc, cxB + 26, h * 0.62, { scale: 0.8, seed: 12, color: COLORS.cyan });
      label(ctx, 'Bob (very far away)', cxB + 26, h * 0.62 + 74, { color: COLORS.cyan, size: 13, align: 'center' });
    }
    // hands spin at each observer's own rate (visual: sim-units → clock seconds)
    doodleClock(rc, ctx, cxA, cyC, clockR, this.tauU * 4, { color: COLORS.pink, seed: 23, caption: 'Alice τ' });
    doodleClock(rc, ctx, cxB, cyC, clockR, this.tU * 4, { color: COLORS.cyan, seed: 24, caption: 'Bob t' });
  }
}
