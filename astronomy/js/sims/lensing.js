// Sim 6 — Gravitational lensing.
//
// Physics: the point-mass ("Schwarzschild") lens. For each background star at
// true angular offset β from the lens, the lens equation β = θ − θ_E²/θ has
// two solutions:
//   θ± = (u ± √(u²+4))/2 · θ_E,   u = β/θ_E
// (one image outside the Einstein radius, one inside on the opposite side),
// with magnifications A± = (u²+2)/(2u√(u²+4)) ± 1/2. The sim solves this
// exactly for every star, every frame — drag the lens and the sky responds.
// Real-number readouts are computed from constants: the Sun-limb deflection
// α = 4GM/(c²R_sun) = 1.75″ (the 1919 eclipse measurement), and a typical
// stellar microlensing Einstein radius (~1 milliarcsecond).

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, sparkle,
    slider, setReadout,
    G, C2, M_SUN, R_SUN, PC, ARCSEC_PER_RAD, fmtNum,
  } = A;

  const N_STARS = 15;

  // real numbers for the readout
  const SUN_DEFLECT = ((4 * G * M_SUN) / (C2 * R_SUN)) * ARCSEC_PER_RAD; // 1.75″
  const D_L = 4000 * PC;
  const D_S = 8000 * PC;
  const THETA_E_MICRO = Math.sqrt(((4 * G * M_SUN) / C2) * ((D_S - D_L) / (D_L * D_S)))
    * ARCSEC_PER_RAD * 1000; // milliarcseconds

  class LensingSim extends Sim {
    init() {
      this.lens = { fx: 0.5, fy: 0.5 }; // as fractions of canvas size
      this.thetaE = 64;                 // Einstein radius in px
      this.dragging = false;
      this.t = 0;

      // fixed doodle starfield (deterministic, fractions of canvas)
      this.stars = [];
      for (let i = 0; i < N_STARS; i++) {
        this.stars.push({
          fx: 0.08 + ((i * 0.7548776662) % 1) * 0.84,
          fy: 0.08 + ((i * 0.5698402910) % 1) * 0.80,
          tw: (i * 2.399) % (Math.PI * 2), // twinkle phase
        });
      }

      this.buildControls();
      this.bindPointer();
      this.updateReadout();
    }

    buildControls() {
      this.slider = slider(this.controlsEl, {
        label: 'lens strength (θ_E on screen)',
        min: 28,
        max: 120,
        step: 1,
        value: this.thetaE,
        format: (v) => `${fmtNum(v, 0)} px`,
        oninput: (v) => { this.thetaE = v; this.poke(); },
      });
    }

    bindPointer() {
      const cv = this.canvasEl;
      const pos = (e) => {
        const rect = cv.getBoundingClientRect();
        return [(e.clientX - rect.left) / this.w, (e.clientY - rect.top) / this.h];
      };
      cv.addEventListener('pointerdown', (e) => {
        this.dragging = true;
        [this.lens.fx, this.lens.fy] = pos(e);
        try { cv.setPointerCapture(e.pointerId); } catch (_) { /* synthetic */ }
        if (!this._citedDrag) {
          this._citedDrag = true;
          this.cite('1920 Dyson, Eddington, Davidson - A Determination of the Deflection of Light by the Sun\'s Gravitational Field');
        }
        this.poke();
      });
      cv.addEventListener('pointermove', (e) => {
        if (!this.dragging) return;
        [this.lens.fx, this.lens.fy] = pos(e);
        this.poke();
      });
      const stop = () => { this.dragging = false; };
      cv.addEventListener('pointerup', stop);
      cv.addEventListener('pointercancel', stop);
    }

    updateReadout() {
      setReadout(this.readoutEl, [
        [
          ['drag the invisible mass around — the × marks are where stars REALLY are; the bright dots are where you see them', 'yellow'],
        ],
        [
          ['real numbers: light grazing the Sun bends by ', null],
          [`${fmtNum(SUN_DEFLECT, 2)}″`, 'cyan'],
          [' — the 1919 eclipse measurement. A Sun-mass lens halfway across the galaxy has θ_E ≈ ', null],
          [`${fmtNum(THETA_E_MICRO, 1)} milliarcseconds`, 'pink'],
          [' — too small to resolve, but the brightening is how microlensing surveys work.', null],
        ],
      ]);
    }

    update(dt) {
      this.t += dt;
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const lx = this.lens.fx * w;
      const ly = this.lens.fy * h;
      const tE = this.thetaE;

      // Einstein ring
      this.cache.draw(`ring-${tE}-${lx | 0}-${ly | 0}`, (g) => g.circle(lx, ly, tE * 2, opts(400, {
        stroke: COLORS.cyan, strokeWidth: 1.4, strokeLineDash: [6, 7],
      })));
      label(ctx, 'Einstein ring θ_E', lx, ly - tE - 8, { color: COLORS.cyan, size: 12.5, align: 'center' });

      // the invisible lens itself
      this.cache.draw(`lens-${lx | 0}-${ly | 0}`, (g) => g.circle(lx, ly, 34, opts(401, {
        stroke: COLORS.muted, strokeWidth: 1.4, strokeLineDash: [3, 5],
        fill: COLORS.pink, fillStyle: 'hachure', fillWeight: 0.6, hachureGap: 9,
      })));
      label(ctx, '?', lx, ly + 6, { color: COLORS.pink, size: 18, align: 'center' });
      label(ctx, 'invisible mass (drag me)', lx, ly + 34, { color: COLORS.muted, size: 12, align: 'center' });

      // ---- every star, exactly lensed ----
      for (const s of this.stars) {
        const sx = s.fx * w;
        const sy = s.fy * h;
        const bx = sx - lx;
        const by = sy - ly;
        const b = Math.hypot(bx, by);
        const u = b / tE;
        const twinkle = 0.75 + 0.25 * Math.sin(this.t * 2 + s.tw);

        // true position: a faint ×
        ctx.strokeStyle = COLORS.muted;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy - 4); ctx.lineTo(sx + 4, sy + 4);
        ctx.moveTo(sx + 4, sy - 4); ctx.lineTo(sx - 4, sy + 4);
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (u < 0.32) {
          // near-perfect alignment → the image smears into ring arcs
          const base = Math.atan2(by, bx);
          ctx.strokeStyle = COLORS.yellow;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.9 * twinkle;
          for (const off of [0, Math.PI]) {
            ctx.beginPath();
            ctx.arc(lx, ly, tE, base + off - 1.1, base + off + 1.1);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          label(ctx, 'Einstein ring!', lx + tE * 0.72, ly - tE * 0.72, { color: COLORS.yellow, size: 13 });
          if (!this._citedRing) {
            this._citedRing = true;
            this.cite('1936 Einstein - Lens-Like Action of a Star by the Deviation of Light in the Gravitational Field');
          }
          continue;
        }

        // the two images of the point-lens equation
        const root = Math.sqrt(u * u + 4);
        const thetaPlus = ((u + root) / 2) * tE;
        const thetaMinus = ((u - root) / 2) * tE; // negative → opposite side
        const Aplus = (u * u + 2) / (2 * u * root) + 0.5;
        const Aminus = Math.max((u * u + 2) / (2 * u * root) - 0.5, 0.05);
        const ux = bx / b;
        const uy = by / b;

        // outer (bright) image
        const px1 = lx + ux * thetaPlus;
        const py1 = ly + uy * thetaPlus;
        ctx.fillStyle = COLORS.ink;
        ctx.globalAlpha = Math.min(1, 0.55 + 0.3 * Aplus) * twinkle;
        ctx.beginPath();
        ctx.arc(px1, py1, Math.min(2 + Aplus * 1.1, 5.5), 0, Math.PI * 2);
        ctx.fill();
        // inner (demagnified, opposite side) image
        const px2 = lx + ux * thetaMinus;
        const py2 = ly + uy * thetaMinus;
        ctx.fillStyle = COLORS.pink;
        ctx.globalAlpha = Math.min(0.85, 0.25 + Aminus) * twinkle;
        ctx.beginPath();
        ctx.arc(px2, py2, Math.min(1.5 + Aminus * 1.2, 4), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // connect image pair to the truth for one "explained" star
        if (s === this.stars[3] && u < 3 && !compact) {
          ctx.strokeStyle = COLORS.muted;
          ctx.globalAlpha = 0.35;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(px1, py1); ctx.lineTo(sx, sy); ctx.lineTo(px2, py2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          label(ctx, 'two images, one star', sx + 10, sy - 10, { color: COLORS.muted, size: 12 });
        }
      }

      // corner decorations
      sparkle(rc, w - 40, 34, 6, { color: COLORS.green, seed: 410 });
      label(ctx, 'mass bends light — the sky behind it is a funhouse mirror', w / 2, h - 12, {
        color: COLORS.muted, size: compact ? 11.5 : 13, align: 'center',
      });
    }
  }

  A.register('lensing', LensingSim);
})();
