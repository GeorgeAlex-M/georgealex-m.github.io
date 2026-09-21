// Two Futures — the fork in the road, with both ends actually drawn.
//
// The joke has to survive being screenshotted with no caption, so both futures
// are built as full vignettes rather than labels: PLAN A is a writing desk under
// a tree at night (lamp, typewriter, a tower of manuscripts, too much coffee, a
// cat), PLAN B is a pitch under a lamppost (cardboard sign, tin cup, pigeons, a
// cracked laptop still running). The punchline lives on the cardboard: the
// begging sign is also the job advert.
//
// The third road is the ask, and it is deliberately quiet — a barrier across a
// track up to a small office, with a note saying it opens from the other side.
//
// LAYOUT (fractions of w, h)
//   fork      (0.50, 0.66)      the signpost and the walker
//   plan A    0.03–0.33 x       desk, books, lamp, cat, moon over that side
//   plan B    0.67–0.97 x       lamppost, sign, cup, box, trolley, pigeons
//   third     0.42–0.58 x       hill, office, track, barrier
//
// The `plan` slider walks the figure along a quadratic bezier to whichever end
// it is nearest; the side he is heading for warms up and the other dims. Nothing
// uses Math.random — the litter, stars and crumpled paper come from an integer
// hash, so the drawing is identical on every reload.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, FONT_HAND, label, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
  } = A;

  /* ------------------------------------------------------------------ *
   *  EDIT ME                                                           *
   * ------------------------------------------------------------------ */
  const ME = {
    caption1: "if the job hunt doesn't work out, I've narrowed it down to two options.",
    caption1Short: "if the job hunt fails, it's down to two.",
    caption2: '(there is a third. it opens from your side.)',
    planA: 'PLAN A — FULL-TIME WRITER',
    planB: 'PLAN B — BEGGAR',
    beggarSign: 'WILL TEST YOUR SOFTWARE FOR FOOD',
    royalties: 'royalties so far: $80 / month',   // readout only — not drawn on the canvas
    book: 'Metathoughts',
    third: 'QA Engineer · Bucharest',
    boxLabel: 'ISTQB',
  };

  function h01(n) {
    let x = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0;
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  // Point on a quadratic bezier.
  const qbez = (p0, c, p1, t) => {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
      y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
    };
  };

  class TwoFuturesSim extends Sim {
    init() {
      this.plan = 0.5;      // 0 = writer, 0.5 = still at the fork, 1 = beggar
      this.thirdT = 0;      // progress up the third road
      this.thirdOn = false;
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- geometry ---------------- */

    get fork() { return { x: this.w * 0.50, y: this.h * 0.66 }; }
    get endA() { return { x: this.w * 0.175, y: this.h * 0.845 }; }
    get endB() { return { x: this.w * 0.825, y: this.h * 0.855 }; }
    get endC() { return { x: this.w * 0.50, y: this.h * 0.325 }; }
    get ctrlA() { return { x: this.w * 0.36, y: this.h * 0.79 }; }
    get ctrlB() { return { x: this.w * 0.64, y: this.h * 0.80 }; }
    get ctrlC() { return { x: this.w * 0.474, y: this.h * 0.49 }; }

    // How committed each side is, 0..1.
    get glowA() { return this.thirdOn ? 0 : clamp(1 - this.plan * 2, 0, 1); }
    get glowB() { return this.thirdOn ? 0 : clamp(this.plan * 2 - 1, 0, 1); }

    // Where the walker currently stands.
    walker() {
      if (this.thirdOn || this.thirdT > 0) {
        return qbez(this.fork, this.ctrlC, this.endC, this.thirdT);
      }
      // He stops short of each vignette rather than standing inside the
      // furniture — at the full 0.82 he ends up drawn through the desk on one
      // side and through the trolley on the other.
      const WALK = 0.58;
      if (this.plan < 0.5) {
        return qbez(this.fork, this.ctrlA, this.endA, (0.5 - this.plan) * 2 * WALK);
      }
      return qbez(this.fork, this.ctrlB, this.endB, (this.plan - 0.5) * 2 * WALK);
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const p = this.controlsEl;
      if (!p) return;

      this.planCtl = slider(p, {
        label: 'which way',
        min: 0,
        max: 1,
        step: 0.005,
        value: this.plan,
        format: (v) => (v < 0.44 ? 'towards the desk' : v > 0.56 ? 'towards the cardboard' : 'still at the fork'),
        oninput: (v) => {
          this.plan = v;
          this.planCtl.set(v);
          if (this.thirdOn) { this.thirdOn = false; this.thirdT = 0; this.thirdBtns.select('no'); }
          this.updateReadout();
          this.poke();
        },
      });

      this.thirdBtns = buttonRow(p, [
        { label: 'take the third road', value: 'yes' },
        { label: 'back to the fork', value: 'no' },
      ], {
        initial: 'no',
        onSelect: (v) => {
          this.thirdOn = v === 'yes';
          if (!this.thirdOn) this.thirdT = 0;
          this.updateReadout();
          this.poke();
        },
      });

      actionButton(p, '⤓ save PNG', () => this.savePNG());
    }

    savePNG() {
      this.canvasEl.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'two-futures.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
    }

    updateReadout() {
      if (this.thirdOn) {
        setReadout(this.readoutEl, [
          [['The barrier was never locked.', 'green']],
          [
            ['6 years in software testing · ISTQB Foundation & Agile · CompTIA · Electronic Arts, Amber. ', null],
            ['I build my own tooling and I would rather be paid for it than run playthroughs.', 'yellow'],
          ],
          [[ME.third + ' · on-site, hybrid or remote', 'green']],
        ]);
        return;
      }
      const lines = [];
      if (this.plan < 0.44) {
        lines.push([['Plan A. ', 'pink'], ['The writing is real and so is the ', null],
          [ME.royalties.replace('royalties so far: ', ''), 'yellow'], ['. You can see the problem.', null]]);
      } else if (this.plan > 0.56) {
        lines.push([['Plan B. ', 'orange'], ['On the upside, the sign is technically a CV.', null]]);
      } else {
        lines.push([['Still at the fork, which is where I actually am.', 'cyan']]);
      }
      lines.push([['Drag the slider, or ', null], ['take the third road', 'green'], [' — that one needs someone else to click it.', null]]);
      lines.push([[ME.third + ' · on-site, hybrid or remote', 'green']]);
      setReadout(this.readoutEl, lines);
    }

    /* ---------------- update ---------------- */

    update(dt) {
      this.t += dt;
      const target = this.thirdOn ? 1 : 0;
      const d = target - this.thirdT;
      if (Math.abs(d) > 0.001) this.thirdT += Math.sign(d) * Math.min(Math.abs(d), dt * 0.55);
      else this.thirdT = target;
    }

    onResize() { this.cache.invalidate(); }

    /* ---------------- small helpers ---------------- */

    // A hand-drawn placard sized to its own text. Returns its box.
    placard(text, cx, cy, size, color, seed, { rot = 0, padX = 12, padY = 9, fill = false } = {}) {
      const { rc, ctx } = this;
      ctx.font = `${size}px ${FONT_HAND}`;
      const tw = ctx.measureText(text).width;
      const bw = tw + padX * 2;
      const bh = size + padY * 2;
      // Keep the whole box on the canvas: the Plan A placard is centred on a
      // vignette at 0.155w, which puts its left edge past 0 at phone width.
      const half = bw / 2;
      const x = bw > this.w - 8 ? this.w / 2 : Math.max(half + 4, Math.min(this.w - half - 4, cx));
      ctx.save();
      ctx.translate(x, cy);
      if (rot) ctx.rotate(rot);
      rc.rectangle(-bw / 2, -bh / 2, bw, bh, opts(seed, {
        stroke: color,
        strokeWidth: 1.7,
        ...(fill ? { fill: color, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 7 } : {}),
      }));
      label(ctx, text, 0, 0, { color, size, align: 'center', baseline: 'middle' });
      ctx.restore();
      return { bw, bh };
    }

    clampX(text, x, size) {
      const { ctx, w } = this;
      ctx.font = `${size}px ${FONT_HAND}`;
      const half = ctx.measureText(text).width / 2;
      if (half * 2 > w - 10) return w / 2;
      return Math.max(half + 6, Math.min(w - half - 6, x));
    }

    /* ---------------- render ---------------- */

    render() {
      const compact = this.w < 640;
      this.drawSky(compact);
      this.drawGround(compact);
      this.drawThirdRoad(compact);
      this.drawPaths(compact);
      this.drawPlanA(compact);
      this.drawPlanB(compact);
      this.drawWalker(compact);
      this.drawCaption(compact);
    }

    /* ===== sky ===== */

    drawSky(compact) {
      const { rc, ctx, w, h } = this;
      // night over Plan A, because that is when the writing happens
      const ga = 0.35 + this.glowA * 0.65;
      ctx.save();
      for (let i = 0; i < 38; i++) {
        const sx = h01(i * 3 + 1) * w * 0.46;
        const sy = h01(i * 3 + 2) * h * 0.34 + 6;
        ctx.globalAlpha = ga * (0.25 + h01(i * 7) * 0.6)
          * (0.6 + 0.4 * Math.sin(this.t * 1.5 + h01(i * 11) * 8));
        ctx.fillStyle = COLORS.ink;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8 + h01(i * 13) * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // the moon over the writing side
      const mx = w * 0.10;
      const my = h * 0.14;
      const R = compact ? 15 : 20;
      ctx.save();
      ctx.globalAlpha = 0.45 + this.glowA * 0.55;
      rc.circle(mx, my, R * 1.8, opts(10, { stroke: COLORS.ink, strokeWidth: 1.8 }));
      rc.path(
        `M ${mx + R * 0.30} ${my - R * 0.80} a ${R * 0.92} ${R * 0.92} 0 1 0 0 ${R * 1.60}`,
        opts(11, { stroke: COLORS.muted, strokeWidth: 1.3 }),
      );
      rc.circle(mx - R * 0.35, my - R * 0.18, 5, opts(12, { stroke: COLORS.muted, strokeWidth: 1 }));
      ctx.restore();

      // two clouds drifting over the beggar side
      for (let i = 0; i < 2; i++) {
        const span = w * 0.55 + 200;
        const cx = w * 0.52 + ((h01(i * 5 + 1) * span + this.t * 9) % span) - 60;
        const cy = h * (0.10 + h01(i * 5 + 2) * 0.14);
        const cs = compact ? 0.6 : 0.95;
        ctx.save();
        ctx.globalAlpha = 0.35 + this.glowB * 0.3;
        rc.path(
          `M ${cx} ${cy} q ${24 * cs} ${-15 * cs} ${48 * cs} ${-3 * cs}`
          + ` q ${19 * cs} ${-13 * cs} ${41 * cs} ${1 * cs}`,
          opts(20 + i, { stroke: COLORS.muted, strokeWidth: 1.2 }),
        );
        ctx.restore();
      }
    }

    drawGround(compact) {
      const { w, h } = this;
      const K = `${w}x${h}`;
      const hz = h * 0.60;
      this.cache.draw(`ridge-${K}`, (g) => g.path(
        `M 0 ${hz + 8} Q ${w * 0.22} ${hz - 26} ${w * 0.42} ${hz - 6}`
        + ` T ${w * 0.72} ${hz - 4} T ${w} ${hz + 4} L ${w} ${h} L 0 ${h} Z`,
        opts(30, {
          stroke: COLORS.green, strokeWidth: 2,
          fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.45, hachureGap: 15,
        }),
      ));
      // grass tufts + a few stones
      for (let i = 0; i < 22; i++) {
        const gx = h01(i * 37) * w;
        const gy = h - 6 - h01(i * 41) * 20;
        this.cache.draw(`tuft-${i}-${K}`, (g) => g.path(
          `M ${gx} ${gy} l -4 -8 M ${gx} ${gy} l 0 -11 M ${gx} ${gy} l 4 -8`,
          opts(40 + i, { stroke: COLORS.green, strokeWidth: 1.1 }),
        ));
      }
      for (let i = 0; i < 4; i++) {
        const sx = w * (0.40 + i * 0.055);
        const sy = h - 12 - (i % 2) * 7;
        this.cache.draw(`stone-${i}-${K}`, (g) => g.ellipse(sx, sy, 17 + i * 4, 9, opts(70 + i, {
          stroke: COLORS.muted, strokeWidth: 1.1, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 5,
        })));
      }
    }

    /* ===== the third road ===== */

    drawThirdRoad(compact) {
      const { rc, ctx, w, h } = this;
      const K = `${w}x${h}`;
      const lit = this.thirdT;

      // the track up the hill
      const f = this.fork;
      const c = this.ctrlC;
      const e = this.endC;
      ctx.save();
      ctx.globalAlpha = 0.45 + lit * 0.55;
      rc.path(`M ${f.x - 13} ${f.y} Q ${c.x - 10} ${c.y} ${e.x - 5} ${e.y}`,
        opts(80, { stroke: COLORS.muted, strokeWidth: 1.6, strokeLineDash: [7, 6] }));
      rc.path(`M ${f.x + 13} ${f.y} Q ${c.x + 10} ${c.y} ${e.x + 5} ${e.y}`,
        opts(81, { stroke: COLORS.muted, strokeWidth: 1.6, strokeLineDash: [7, 6] }));
      ctx.restore();

      // the little office on the hill. High enough that the barrier arm, once
      // it swings up, never reaches the building.
      const bx = w * 0.50;
      const by = h * 0.30;
      const bw = compact ? 54 : 72;
      const bh = compact ? 46 : 60;
      this.cache.draw(`office-${K}`, (g) => g.rectangle(bx - bw / 2, by - bh, bw, bh, opts(90, {
        stroke: COLORS.ink, strokeWidth: 1.8,
        fill: COLORS.ink, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 13,
      })));
      this.cache.draw(`officetop-${K}`, (g) => g.line(bx - bw / 2 - 6, by - bh, bx + bw / 2 + 6, by - bh,
        opts(91, { stroke: COLORS.cyan, strokeWidth: 2 })));
      // windows, which come on when the road is taken
      const cols = compact ? 2 : 3;
      const rows = 3;
      for (let r = 0; r < rows; r++) {
        for (let cI = 0; cI < cols; cI++) {
          const wx = bx - bw / 2 + 8 + cI * ((bw - 16) / cols);
          const wy = by - bh + 9 + r * ((bh - 16) / rows);
          const ww = (bw - 16) / cols - 5;
          const wh = (bh - 16) / rows - 5;
          const on = h01(r * 7 + cI * 13) > 0.35;
          if (on && lit > 0.02) {
            ctx.save();
            ctx.globalAlpha = lit;
            ctx.fillStyle = rgba(COLORS.yellow, 0.55);
            ctx.fillRect(wx, wy, ww, wh);
            ctx.restore();
          }
          this.cache.draw(`ow-${r}-${cI}-${K}`, (g) => g.rectangle(wx, wy, ww, wh,
            opts(100 + r * 5 + cI, { stroke: COLORS.yellow, strokeWidth: 1.1 })));
        }
      }

      // the barrier across the track — swings up as the road is taken
      const gx = w * 0.50;
      const gy = h * 0.50;
      const ang = -lit * 0.75;
      const arm = compact ? 30 : 40;
      ctx.save();
      ctx.globalAlpha = 1;
      rc.line(gx - arm - 6, gy + 14, gx - arm - 6, gy - 10, opts(120, { stroke: COLORS.muted, strokeWidth: 1.6 }));
      ctx.translate(gx - arm - 6, gy - 4);
      ctx.rotate(ang);
      rc.line(0, 0, arm * 2, 0, opts(121, { stroke: COLORS.red, strokeWidth: 2.4 }));
      for (let i = 0; i < 3; i++) {
        rc.line(10 + i * 22, -3, 18 + i * 22, 3, opts(125 + i, { stroke: COLORS.ink, strokeWidth: 1.2 }));
      }
      ctx.restore();

      // The sign sits to the LEFT of the barrier's pivot — the arm only ever
      // swings right and up, so that side stays clear at every angle.
      const ps = compact ? 8.5 : 10;
      const signX = gx - (compact ? 84 : 118);
      this.placard(ME.third, signX, gy, ps, lit > 0.5 ? COLORS.green : COLORS.cyan, 130, { rot: -0.04 });

      if (lit > 0.75) {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + this.t * 0.7;
          sparkle(rc, bx + Math.cos(a) * (bw * 0.9), by - bh * 0.6 + Math.sin(a) * (bh * 0.5), 5,
            { color: COLORS.green, seed: 140 + i });
        }
      }
    }

    drawPaths(compact) {
      const { rc, ctx, w, h } = this;
      const K = `${w}x${h}`;
      const f = this.fork;
      const drawPath = (c, e, glow, seed) => {
        ctx.save();
        ctx.globalAlpha = 0.4 + glow * 0.6;
        rc.path(`M ${f.x} ${f.y} Q ${c.x} ${c.y} ${e.x} ${e.y}`,
          opts(seed, { stroke: COLORS.orange, strokeWidth: 2.4 }));
        rc.path(`M ${f.x} ${f.y + 12} Q ${c.x} ${c.y + 12} ${e.x} ${e.y + 12}`,
          opts(seed + 1, { stroke: COLORS.orange, strokeWidth: 2.4 }));
        ctx.restore();
      };
      drawPath(this.ctrlA, this.endA, this.glowA, 150);
      drawPath(this.ctrlB, this.endB, this.glowB, 160);
    }

    /* ===== plan A: the writing desk ===== */

    drawPlanA(compact) {
      const { rc, ctx, w, h } = this;
      const K = `${w}x${h}`;
      const cx = w * 0.155;
      const base = h * 0.855;
      const dw = compact ? w * 0.20 : w * 0.21;
      const glow = this.glowA;

      // the tree it all sits under
      const tx = cx - dw * 0.62;
      const ty = base - 4;
      const th = compact ? h * 0.20 : h * 0.24;
      this.cache.draw(`atrunk-${K}`, (g) => g.path(
        `M ${tx - 4} ${ty} q 2 ${-th * 0.5} 1 ${-th} M ${tx + 4} ${ty} q -1 ${-th * 0.5} 0 ${-th}`,
        opts(200, { stroke: COLORS.orange, strokeWidth: 1.9 }),
      ));
      const sway = Math.sin(this.t * 0.7) * 2.5;
      [[-20, 6, 54], [18, 2, 58], [-2, -16, 50]].forEach(([ox, oy, d], i) => {
        rc.circle(tx + ox * (compact ? 0.75 : 1) + sway, ty - th - 8 + oy, d * (compact ? 0.75 : 1),
          opts(205 + i, {
            stroke: COLORS.green, strokeWidth: 1.6,
            fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 8,
          }));
      });

      // desk lamp glow, spilling over the desk
      if (glow > 0.02) {
        ctx.save();
        ctx.globalAlpha = 0.25 + glow * 0.55;
        const lg = ctx.createRadialGradient(cx + dw * 0.30, base - 62, 2, cx + dw * 0.30, base - 62, 110);
        lg.addColorStop(0, rgba(COLORS.yellow, 0.28));
        lg.addColorStop(1, rgba(COLORS.yellow, 0));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(cx + dw * 0.30, base - 62, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // desk
      const dTop = base - 42;
      this.cache.draw(`desk-${K}`, (g) => g.rectangle(cx - dw / 2, dTop, dw, 8, opts(210, {
        stroke: COLORS.orange, strokeWidth: 1.8, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 5,
      })));
      this.cache.draw(`dl1-${K}`, (g) => g.line(cx - dw / 2 + 8, dTop + 8, cx - dw / 2 + 6, base, opts(211, { stroke: COLORS.orange, strokeWidth: 1.6 })));
      this.cache.draw(`dl2-${K}`, (g) => g.line(cx + dw / 2 - 8, dTop + 8, cx + dw / 2 - 6, base, opts(212, { stroke: COLORS.orange, strokeWidth: 1.6 })));

      // typewriter with a page in it
      const twx = cx - dw * 0.10;
      this.cache.draw(`tw-${K}`, (g) => g.path(
        `M ${twx - 22} ${dTop} l 4 -16 l 36 0 l 4 16 Z`, opts(220, { stroke: COLORS.cyan, strokeWidth: 1.6 }),
      ));
      this.cache.draw(`twk-${K}`, (g) => g.path(
        `M ${twx - 14} ${dTop - 4} l 28 0 M ${twx - 12} ${dTop - 9} l 24 0`,
        opts(221, { stroke: COLORS.cyan, strokeWidth: 1 }),
      ));
      this.cache.draw(`twp-${K}`, (g) => g.rectangle(twx - 11, dTop - 42, 24, 26, opts(222, { stroke: COLORS.ink, strokeWidth: 1.3 })));
      this.cache.draw(`twpl-${K}`, (g) => g.path(
        `M ${twx - 7} ${dTop - 36} l 15 0 M ${twx - 7} ${dTop - 31} l 15 0 M ${twx - 7} ${dTop - 26} l 9 0`,
        opts(223, { stroke: COLORS.muted, strokeWidth: 0.9 }),
      ));

      // the lamp
      const lx = cx + dw * 0.30;
      this.cache.draw(`lampb-${K}`, (g) => g.ellipse(lx, dTop - 1, 20, 6, opts(230, { stroke: COLORS.muted, strokeWidth: 1.3 })));
      this.cache.draw(`lampa-${K}`, (g) => g.path(`M ${lx} ${dTop - 3} q 2 -20 14 -30`, opts(231, { stroke: COLORS.muted, strokeWidth: 1.5 })));
      this.cache.draw(`lamph-${K}`, (g) => g.path(
        `M ${lx + 6} ${dTop - 36} l 20 0 l -5 13 l -12 0 Z`, opts(232, { stroke: COLORS.yellow, strokeWidth: 1.5 }),
      ));

      // a tower of manuscripts leaning against the desk
      const sx = cx + dw * 0.52;
      for (let i = 0; i < 6; i++) {
        const sw = 30 + h01(i * 17) * 10;
        const lean = (i - 2.5) * 1.6;
        this.cache.draw(`ms-${i}-${K}`, (g) => g.rectangle(sx - sw / 2 + lean, base - 9 - i * 9, sw, 8,
          opts(240 + i, { stroke: [COLORS.yellow, COLORS.cyan, COLORS.pink][i % 3], strokeWidth: 1.2 })));
      }
      label(ctx, ME.book, this.clampX(ME.book, sx, compact ? 9 : 10.5), base - 9 - 6 * 9 - 8,
        { color: COLORS.muted, size: compact ? 9 : 10.5, align: 'center' });

      // three books on the desk and a mug with steam
      [COLORS.pink, COLORS.green, COLORS.yellow].forEach((col, i) => {
        this.cache.draw(`bk-${i}-${K}`, (g) => g.rectangle(cx - dw * 0.46 - i, dTop - 6 - i * 6, 26 + i * 2, 6,
          opts(250 + i, { stroke: col, strokeWidth: 1.2 })));
      });
      const mx = cx + dw * 0.10;
      this.cache.draw(`mug-${K}`, (g) => g.path(`M ${mx - 7} ${dTop - 14} l 1 14 l 12 0 l 1 -14 Z`, opts(260, { stroke: COLORS.cyan, strokeWidth: 1.3 })));
      this.cache.draw(`mugh-${K}`, (g) => g.path(`M ${mx + 7} ${dTop - 10} q 7 3 0 8`, opts(261, { stroke: COLORS.cyan, strokeWidth: 1.1 })));
      ctx.save();
      ctx.strokeStyle = rgba(COLORS.muted, 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const p = i / 12;
        const yy = dTop - 16 - p * 22;
        const xx = mx + Math.sin(this.t * 1.6 + p * 4) * (2 + p * 5);
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.restore();

      // two more mugs on the floor, because of course
      this.cache.draw(`mug2-${K}`, (g) => g.path(`M ${cx - dw * 0.30} ${base} l 1 -11 l 10 0 l 1 11 Z`, opts(265, { stroke: COLORS.cyan, strokeWidth: 1.1 })));
      this.cache.draw(`mug3-${K}`, (g) => g.path(`M ${cx + dw * 0.02} ${base + 3} l 1 -10 l 9 0 l 1 10 Z`, opts(266, { stroke: COLORS.cyan, strokeWidth: 1.1 })));

      // crumpled paper, scattered
      for (let i = 0; i < 7; i++) {
        const px = cx + (h01(i * 23) - 0.5) * dw * 1.5;
        const py = base + 4 + h01(i * 29) * 16;
        this.cache.draw(`crump-${i}-${K}`, (g) => g.circle(px, py, 9 + h01(i * 31) * 5,
          opts(270 + i, { stroke: COLORS.muted, strokeWidth: 1.1 })));
      }

      // the cat asleep on the desk corner
      const kx = cx - dw * 0.42;
      const ky = dTop - 5;
      const tail = Math.sin(this.t * 1.5) * 4;
      rc.path(`M ${kx} ${ky} q 8 -10 17 0`, opts(280, { stroke: COLORS.pink, strokeWidth: 1.4 }));
      rc.circle(kx + 19, ky - 5, 9, opts(281, { stroke: COLORS.pink, strokeWidth: 1.4 }));
      rc.line(kx + 16, ky - 9, kx + 14, ky - 14, opts(282, { stroke: COLORS.pink, strokeWidth: 1 }));
      rc.line(kx + 22, ky - 9, kx + 24, ky - 14, opts(283, { stroke: COLORS.pink, strokeWidth: 1 }));
      rc.path(`M ${kx} ${ky} q -9 ${-4 + tail} -13 ${-11 + tail}`, opts(284, { stroke: COLORS.pink, strokeWidth: 1.2 }));

      // the labels
      const ps = compact ? 10 : 12.5;
      this.placard(ME.planA, cx, base + (compact ? 34 : 42), ps, COLORS.pink, 290, { rot: -0.02 });
    }

    /* ===== plan B: the pitch ===== */

    drawPlanB(compact) {
      const { rc, ctx, w, h } = this;
      const K = `${w}x${h}`;
      const cx = w * 0.825;
      const base = h * 0.855;
      const glow = this.glowB;

      // lamppost with a flickering light
      const px = cx + (compact ? 70 : 104);
      const ph = compact ? h * 0.26 : h * 0.30;
      this.cache.draw(`lp-${K}`, (g) => g.line(px, base + 6, px, base - ph, opts(300, { stroke: COLORS.muted, strokeWidth: 2 })));
      this.cache.draw(`lpa-${K}`, (g) => g.path(`M ${px} ${base - ph} q -2 -14 -20 -16`, opts(301, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      this.cache.draw(`lph-${K}`, (g) => g.path(
        `M ${px - 30} ${base - ph - 16} l 20 0 l -4 13 l -12 0 Z`, opts(302, { stroke: COLORS.yellow, strokeWidth: 1.4 }),
      ));
      const flick = Math.sin(this.t * 9) > -0.75 ? 1 : 0.25;
      ctx.save();
      ctx.globalAlpha = (0.25 + glow * 0.6) * flick;
      const lg = ctx.createRadialGradient(px - 20, base - ph - 6, 2, px - 20, base - ph - 6, 130);
      lg.addColorStop(0, rgba(COLORS.yellow, 0.24));
      lg.addColorStop(1, rgba(COLORS.yellow, 0));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(px - 20, base - ph - 6, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // the cardboard box to sit on, labelled with the certification
      const bx = cx + (compact ? 16 : 24);
      this.cache.draw(`box-${K}`, (g) => g.path(
        `M ${bx - 26} ${base} l 0 -26 l 46 0 l 0 26 Z`, opts(310, {
          stroke: COLORS.orange, strokeWidth: 1.6, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 8,
        }),
      ));
      this.cache.draw(`boxf-${K}`, (g) => g.path(
        `M ${bx - 26} ${base - 26} l 10 -6 l 46 0 l -10 6`, opts(311, { stroke: COLORS.orange, strokeWidth: 1.3 }),
      ));
      label(ctx, ME.boxLabel, bx - 3, base - 11, { color: COLORS.ink, size: compact ? 9.5 : 11, align: 'center' });

      // THE SIGN — the whole joke, propped on a stick
      const sx = cx - (compact ? 46 : 64);
      const sy = base - (compact ? 62 : 78);
      this.cache.draw(`stick-${K}`, (g) => g.line(sx, base + 2, sx + 4, sy + 14, opts(320, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      const signSize = compact ? 8.5 : 12;
      this.placard(ME.beggarSign, sx, sy, signSize, COLORS.yellow, 321, { rot: -0.06, padX: 10, padY: 10 });

      // tin cup with two coins, and a pigeon eyeing them
      const ux = cx - (compact ? 6 : 4);
      this.cache.draw(`cup-${K}`, (g) => g.path(
        `M ${ux - 12} ${base} l 2 -18 l 20 0 l 2 18 Z`, opts(330, { stroke: COLORS.cyan, strokeWidth: 1.5 }),
      ));
      this.cache.draw(`coin1-${K}`, (g) => g.circle(ux - 3, base - 15, 8, opts(331, { stroke: COLORS.yellow, strokeWidth: 1.2 })));
      this.cache.draw(`coin2-${K}`, (g) => g.circle(ux + 5, base - 12, 7, opts(332, { stroke: COLORS.yellow, strokeWidth: 1.2 })));

      // pigeons: one pecking on the ground, one on the lamppost arm
      const peck = Math.sin(this.t * 3.2) * 3;
      const gx = cx - (compact ? 30 : 44);
      rc.ellipse(gx, base + 2, 22, 13, opts(340, { stroke: COLORS.muted, strokeWidth: 1.3 }));
      rc.circle(gx - 12, base - 5 + peck, 9, opts(341, { stroke: COLORS.muted, strokeWidth: 1.3 }));
      rc.line(gx - 17, base - 4 + peck, gx - 23, base - 2 + peck, opts(342, { stroke: COLORS.orange, strokeWidth: 1.1 }));
      rc.line(gx + 9, base + 6, gx + 9, base + 12, opts(343, { stroke: COLORS.orange, strokeWidth: 1 }));

      const p2y = base - ph - 20;
      rc.ellipse(px - 26, p2y, 18, 11, opts(345, { stroke: COLORS.muted, strokeWidth: 1.2 }));
      rc.circle(px - 35, p2y - 6, 8, opts(346, { stroke: COLORS.muted, strokeWidth: 1.2 }));

      // a shopping trolley with a monitor in it
      const tx = cx - (compact ? 76 : 96);
      this.cache.draw(`trol-${K}`, (g) => g.path(
        `M ${tx - 20} ${base - 30} l 40 0 l -6 22 l -28 0 Z`, opts(350, { stroke: COLORS.cyan, strokeWidth: 1.4 }),
      ));
      this.cache.draw(`trolg-${K}`, (g) => g.path(
        `M ${tx - 14} ${base - 26} l 0 14 M ${tx - 4} ${base - 26} l 0 14 M ${tx + 6} ${base - 26} l 0 14`,
        opts(351, { stroke: COLORS.cyan, strokeWidth: 0.9 }),
      ));
      this.cache.draw(`trolw1-${K}`, (g) => g.circle(tx - 12, base - 3, 10, opts(352, { stroke: COLORS.cyan, strokeWidth: 1.2 })));
      this.cache.draw(`trolw2-${K}`, (g) => g.circle(tx + 10, base - 3, 10, opts(353, { stroke: COLORS.cyan, strokeWidth: 1.2 })));
      this.cache.draw(`mon-${K}`, (g) => g.rectangle(tx - 14, base - 48, 28, 19, opts(354, { stroke: COLORS.ink, strokeWidth: 1.3 })));

      // the cracked laptop, lid open, still running something
      const lx = cx + (compact ? 44 : 64);
      this.cache.draw(`lap-${K}`, (g) => g.path(
        `M ${lx - 16} ${base} l 32 0 l 5 -3 l -42 0 Z`, opts(360, { stroke: COLORS.muted, strokeWidth: 1.3 }),
      ));
      this.cache.draw(`laps-${K}`, (g) => g.path(
        `M ${lx - 15} ${base - 3} l 4 -22 l 26 0 l 2 22 Z`, opts(361, { stroke: COLORS.green, strokeWidth: 1.4 }),
      ));
      this.cache.draw(`crack-${K}`, (g) => g.path(
        `M ${lx - 6} ${base - 24} l 5 8 l -4 6 l 7 5`, opts(362, { stroke: COLORS.red, strokeWidth: 1 }),
      ));
      // a test run still going: three dots cycling green
      for (let i = 0; i < 3; i++) {
        const on = Math.floor(this.t * 2) % 3 === i;
        ctx.save();
        ctx.globalAlpha = on ? 1 : 0.3;
        ctx.fillStyle = COLORS.green;
        ctx.beginPath();
        ctx.arc(lx - 6 + i * 6, base - 9, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // a blanket over the box corner
      this.cache.draw(`blank-${K}`, (g) => g.path(
        `M ${bx + 20} ${base - 24} q 16 4 20 20 l -20 4 Z`, opts(370, {
          stroke: COLORS.pink, strokeWidth: 1.3, fill: COLORS.pink, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 6,
        }),
      ));

      const ps = compact ? 10 : 12.5;
      this.placard(ME.planB, cx, base + (compact ? 34 : 42), ps, COLORS.orange, 380, { rot: 0.02 });
    }

    /* ===== the walker ===== */

    drawWalker(compact) {
      const { rc, ctx } = this;
      const p = this.walker();
      const s = compact ? 0.66 : 0.86;
      const headY = p.y - 51 * s;
      // a small backpack, so he reads as going somewhere
      rc.rectangle(p.x - 16 * s, headY + 14 * s, 11 * s, 15 * s,
        opts(410, { stroke: COLORS.cyan, strokeWidth: 1.4 }));
      stickFigure(rc, p.x, headY, { scale: s, seed: 411, color: COLORS.ink });
    }

    drawCaption(compact) {
      const { ctx, w, h } = this;
      const s1 = compact ? 12.5 : 17;
      const s2 = compact ? 10 : 12.5;
      label(ctx, compact ? ME.caption1Short : ME.caption1, 18, compact ? 22 : 30,
        { color: COLORS.pink, size: s1 });
      label(ctx, ME.caption2, 18, compact ? 38 : 52, { color: COLORS.muted, size: s2 });
    }
  }

  A.register('twoFutures', TwoFuturesSim);
})();
