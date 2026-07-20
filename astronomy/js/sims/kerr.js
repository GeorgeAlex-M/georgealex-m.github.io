// Sim 16 — Spinning (Kerr) black holes.
//
// Physics (equatorial, top-down view; lengths in units of GM/c²):
//   horizon    r₊ = 1 + √(1−a*²)      (2 → 1 as spin a* goes 0 → 1)
//   ergosphere r_E(equator) = 2       (always r_s in the equatorial plane)
//   horizon angular velocity Ω_H = a*·c/(2 r₊)
//   frame-dragging rate falls off ∝ 1/r³ far away (exactly Ω_H at the horizon)
//   extractable spin energy: 1 − √((1+√(1−a*²))/2)  → 29.3% at a* = 1
// Test particles you click in are advected by the drag field — inside the
// ergosphere nothing can hover; the Penrose process animation shows energy
// extraction paid for by the hole's spin.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow,
    slider, actionButton, setReadout,
    fmtNum,
  } = A;

  const UNIT = 55;        // px per GM/c²
  const MAX_PARTS = 10;

  class KerrSim extends Sim {
    init() {
      this.a = 0.9;       // spin a* = a/M
      this.parts = [];
      this.penrose = null;
      this.t = 0;
      this.buildControls();
      this.bindPointer();
      this.updateReadout();
    }

    get rPlus() { return 1 + Math.sqrt(1 - this.a * this.a); } // in GM/c²
    get center() { return [this.w / 2, this.h / 2 + 4]; }

    // visual frame-drag angular speed (rad/s) at radius r (in GM/c² units)
    dragOmega(r) {
      const om = 2.4 * this.a * Math.pow(this.rPlus / r, 3);
      return Math.min(om, 2.4 * this.a);
    }

    buildControls() {
      const c = this.controlsEl;
      this.spinSlider = slider(c, {
        label: 'spin a* = a/M',
        min: 0,
        max: 0.998,
        step: 0.001,
        value: this.a,
        format: (v) => fmtNum(v, 3),
        oninput: (v) => {
          this.a = v;
          if (!this._citedSpin) {
            this._citedSpin = true;
            this.cite('1963 Kerr - Gravitational Field of a Spinning Mass as an Example of Algebraically Special Metrics');
          }
          this.updateReadout();
          this.poke();
        },
      });
      actionButton(c, 'run the Penrose process', () => {
        this.penrose = { stage: 'in', x: 1.2, y: 0.35, t: 0 }; // in fractions of w/h-ish
        this.cite('1969 Penrose - Gravitational Collapse: The Role of General Relativity');
        this.poke();
      });
      actionButton(c, 'clear particles', () => { this.parts.length = 0; this.poke(); });
    }

    bindPointer() {
      this.canvasEl.addEventListener('pointerdown', (e) => {
        const rect = this.canvasEl.getBoundingClientRect();
        const [cx, cy] = this.center;
        const x = e.clientX - rect.left - cx;
        const y = e.clientY - rect.top - cy;
        const r = Math.hypot(x, y) / UNIT;
        if (r <= this.rPlus + 0.05) return;
        if (this.parts.length >= MAX_PARTS) this.parts.shift();
        this.parts.push({ r, phi: Math.atan2(y, x), trail: [], state: 'live' });
        this.poke();
      });
    }

    updateReadout() {
      const extractable = (1 - Math.sqrt((1 + Math.sqrt(1 - this.a * this.a)) / 2)) * 100;
      setReadout(this.readoutEl, [
        [
          ['horizon r₊ = ', null], [`${fmtNum(this.rPlus, 3)} GM/c²`, 'green'],
          ['   ergosphere (equator) = 2 GM/c² — the gap between them is the ergoregion', null],
        ],
        [
          ['extractable spin energy (Penrose limit): ', null],
          [`${fmtNum(extractable, 1)}%`, 'yellow'],
          [' of the hole\'s mass — 29.3% when maximal. Click near the hole to drop particles into the drag.', null],
        ],
        [
          ['real spins: Cygnus X-1 measures a* > 0.9; Interstellar\'s hole needed 1−10⁻¹⁴; and Gravity Probe B measured EARTH dragging its own spacetime: ≈ 39 milliarcseconds/year.', 'orange'],
        ],
      ]);
    }

    update(dt) {
      this.t += dt;
      // clicked particles ride the drag field
      for (const p of this.parts) {
        if (p.state !== 'live') continue;
        p.phi += this.dragOmega(p.r) * dt;
        // slow inward creep inside the ergosphere (accretion-flavored)
        if (p.r < 2) p.r -= dt * 0.05;
        if (p.r <= this.rPlus) p.state = 'gone';
        p.trail.push([p.r, p.phi]);
        if (p.trail.length > 120) p.trail.shift();
      }
      // Penrose animation
      const pz = this.penrose;
      if (pz) {
        pz.t += dt;
        if (pz.stage === 'in') {
          pz.x -= dt * 0.55;
          pz.y -= dt * 0.1;
          if (Math.hypot(pz.x, pz.y) < 1.85 / 3.2) pz.stage = 'split'; // entering ergo (scaled coords)
        } else if (pz.stage === 'split') {
          pz.t2 = (pz.t2 || 0) + dt;
          if (pz.t2 > 2.2) pz.stage = 'done';
        }
        if (pz.t > 8) this.penrose = null;
      }
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const [cx, cy] = this.center;
      const rPlusPx = this.rPlus * UNIT;
      const ergoPx = 2 * UNIT;

      // frame-drag arrow field: rings of tangential arrows, length ∝ drag rate
      for (let ring = 0; ring < 4; ring++) {
        const r = (2.5 + ring * 0.85) * UNIT;
        const n = 8 + ring * 2;
        const om = this.dragOmega(r / UNIT);
        const len = 6 + om * 16;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2 + ring * 0.3;
          const x = cx + Math.cos(a0) * r;
          const y = cy + Math.sin(a0) * r;
          const tx = -Math.sin(a0);
          const ty = Math.cos(a0);
          ctx.strokeStyle = COLORS.muted;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x - tx * len * 0.5, y - ty * len * 0.5);
          ctx.lineTo(x + tx * len * 0.5, y + ty * len * 0.5);
          ctx.stroke();
          // arrowhead
          ctx.beginPath();
          ctx.moveTo(x + tx * len * 0.5, y + ty * len * 0.5);
          ctx.lineTo(x + tx * len * 0.5 - tx * 4 - Math.cos(a0) * 3, y + ty * len * 0.5 - ty * 4 - Math.sin(a0) * 3);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // ergosphere + horizon
      this.cache.draw(`ergo-${w}x${h}`, (g) => g.circle(cx, cy, ergoPx * 2, opts(800, {
        stroke: COLORS.pink, strokeWidth: 1.8, strokeLineDash: [7, 6],
      })));
      rc.circle(cx, cy, rPlusPx * 2, opts(801, { stroke: COLORS.ink, strokeWidth: 2.4, fill: '#000000', fillStyle: 'solid' }));
      // spin direction
      rc.arc(cx, cy, rPlusPx * 2 + 26, rPlusPx * 2 + 26, -0.6, 0.9, false, opts(802, { stroke: COLORS.green, strokeWidth: 1.8 }));
      doodleArrow(rc, cx + (rPlusPx + 10) * Math.cos(0.85), cy + (rPlusPx + 10) * Math.sin(0.85), cx + (rPlusPx + 13) * Math.cos(1.05), cy + (rPlusPx + 13) * Math.sin(1.05), { color: COLORS.green, seed: 803 });

      // clicked particles
      for (const p of this.parts) {
        if (p.trail.length > 1) {
          ctx.strokeStyle = COLORS.cyan;
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let i = 0; i < p.trail.length; i++) {
            const [tr, tp] = p.trail[i];
            const x = cx + Math.cos(tp) * tr * UNIT;
            const y = cy + Math.sin(tp) * tr * UNIT;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (p.state === 'live') {
          ctx.fillStyle = COLORS.cyan;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(p.phi) * p.r * UNIT, cy + Math.sin(p.phi) * p.r * UNIT, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Penrose process cartoon
      const pz = this.penrose;
      if (pz) {
        const S = 3.2 * UNIT; // scale for its coords
        if (pz.stage === 'in') {
          const x = cx + pz.x * S;
          const y = cy + pz.y * S;
          ctx.fillStyle = COLORS.yellow;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          label(ctx, 'incoming package', x + 10, y - 8, { color: COLORS.yellow, size: 12.5 });
        } else {
          const k = Math.min(1, (pz.t2 || 0) / 2.2);
          // fragment A: negative energy, into the hole
          const ax = cx + Math.cos(2.6 + k * 2.4) * (1.8 - k * (1.8 - this.rPlus)) * UNIT;
          const ay = cy + Math.sin(2.6 + k * 2.4) * (1.8 - k * (1.8 - this.rPlus)) * UNIT;
          ctx.fillStyle = COLORS.red;
          ctx.globalAlpha = 1 - k * 0.6;
          ctx.beginPath();
          ctx.arc(ax, ay, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          label(ctx, 'E < 0 !', ax + 8, ay - 6, { color: COLORS.red, size: 12.5 });
          // fragment B: exits with MORE energy
          const bx = cx + (0.6 + k * 2.9) * UNIT * Math.cos(-0.5);
          const by = cy + (0.6 + k * 2.9) * UNIT * Math.sin(-0.5);
          ctx.fillStyle = COLORS.green;
          ctx.beginPath();
          ctx.arc(bx, by, 6, 0, Math.PI * 2);
          ctx.fill();
          label(ctx, 'exits with MORE energy — stolen from the spin!', bx + 10, by - 8, { color: COLORS.green, size: compact ? 11.5 : 13 });
        }
      }

      // labels
      label(ctx, 'ergosphere — impossible to stand still in here', cx, cy - ergoPx - 12, { color: COLORS.pink, size: compact ? 12 : 14, align: 'center' });
      label(ctx, `horizon r₊ = ${fmtNum(this.rPlus, 2)} GM/c²`, cx, cy + rPlusPx + 22, { color: COLORS.ink, size: compact ? 11.5 : 13, align: 'center' });
      label(ctx, 'spacetime itself rotates — arrow length = drag strength', compact ? w / 2 : 16, h - 12, { color: COLORS.muted, size: compact ? 11 : 12.5, align: compact ? 'center' : 'left' });
      if (!this.parts.length) {
        label(ctx, 'click anywhere to drop a particle into the whirl', w - 16, 22, { color: COLORS.yellow, size: compact ? 12 : 13.5, align: 'right' });
      }
    }
  }

  A.register('kerr', KerrSim);
})();
