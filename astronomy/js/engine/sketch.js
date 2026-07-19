// Reusable doodle parts: stick figures, arrows, labels, stamps, clocks.
// All coordinates are CSS pixels. Every shape takes a fixed seed so its
// wobble stays stable while it moves.

(() => {
  const A = (window.Astro = window.Astro || {});
  const { COLORS, FONT_HAND, opts } = A;

  // A stick figure. (x, y) is the CENTER of the head. Returns total height.
  // stretch > 1 elongates body and limbs vertically (spaghettification).
  // broken: true draws it coming apart (limbs detached).
  function stickFigure(rc, x, y, {
    scale = 1,
    stretch = 1,
    seed = 7,
    color = COLORS.ink,
    broken = false,
  } = {}) {
    const o = (extra = {}) => opts(seed, { stroke: color, ...extra });
    const headR = 9 * scale;
    const body = 26 * scale * stretch;
    const limb = 16 * scale * stretch;
    const neckY = y + headR;
    const hipY = neckY + body;
    const gap = broken ? 6 * scale : 0;

    // head (slightly squashed when stretched)
    rc.ellipse(x, y, headR * 2 / Math.sqrt(stretch), headR * 2 * Math.sqrt(stretch), o());
    // face
    const ctx = rc.ctx;
    if (ctx) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x - headR * 0.35, y - headR * 0.15, 1.4 * scale, 0, Math.PI * 2);
      ctx.arc(x + headR * 0.35, y - headR * 0.15, 1.4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      if (broken || stretch > 1.8) {
        // worried mouth
        ctx.arc(x, y + headR * 0.55, headR * 0.32, Math.PI * 1.15, Math.PI * 1.85);
      } else {
        ctx.arc(x, y + headR * 0.25, headR * 0.38, Math.PI * 0.15, Math.PI * 0.85);
      }
      ctx.stroke();
    }
    // body
    rc.line(x, neckY + gap, x, hipY, o());
    // arms
    const armY = neckY + body * 0.3;
    rc.line(x - (broken ? gap : 0), armY, x - limb * 0.75, armY + limb * 0.55, o());
    rc.line(x + (broken ? gap : 0), armY, x + limb * 0.75, armY + limb * 0.55, o());
    // legs
    rc.line(x, hipY + gap, x - limb * 0.6, hipY + gap + limb, o());
    rc.line(x, hipY + gap, x + limb * 0.6, hipY + gap + limb, o());

    return headR + body + limb + gap * 2 + headR;
  }

  // Hand-drawn arrow from (x1,y1) to (x2,y2).
  function doodleArrow(rc, x1, y1, x2, y2, { color = COLORS.ink, seed = 11, strokeWidth = 1.8 } = {}) {
    const o = opts(seed, { stroke: color, strokeWidth });
    rc.line(x1, y1, x2, y2, o);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const hl = 9;
    rc.line(x2, y2, x2 - hl * Math.cos(ang - 0.45), y2 - hl * Math.sin(ang - 0.45), o);
    rc.line(x2, y2, x2 - hl * Math.cos(ang + 0.45), y2 - hl * Math.sin(ang + 0.45), o);
  }

  // Handwritten canvas label.
  function label(ctx, text, x, y, {
    color = COLORS.ink,
    size = 15,
    align = 'left',
    baseline = 'alphabetic',
    font = FONT_HAND,
  } = {}) {
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
  }

  // Small yellow "not to scale!" stamp. (x, y) is the box center.
  function notToScale(rc, ctx, x, y, seed = 5) {
    const w = 116;
    const h = 26;
    rc.rectangle(x - w / 2, y - h / 2, w, h, opts(seed, { stroke: COLORS.yellow, strokeWidth: 1.6 }));
    label(ctx, 'not to scale!', x, y + 1, { color: COLORS.yellow, size: 14, align: 'center', baseline: 'middle' });
  }

  // A doodle clock. (x, y) center, r radius, t in seconds — the hand does one
  // revolution per minute, plus a slow hand one revolution per hour.
  function doodleClock(rc, ctx, x, y, r, t, { color = COLORS.ink, seed = 21, caption = '' } = {}) {
    rc.circle(x, y, r * 2, opts(seed, { stroke: color }));
    // 4 ticks
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      rc.line(
        x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82,
        x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95,
        opts(seed + 1 + i, { stroke: color, strokeWidth: 1.5 }),
      );
    }
    const fast = (t / 60) * Math.PI * 2 - Math.PI / 2;
    const slow = (t / 3600) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(fast) * r * 0.72, y + Math.sin(fast) * r * 0.72);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(slow) * r * 0.45, y + Math.sin(slow) * r * 0.45);
    ctx.stroke();
    if (caption) {
      label(ctx, caption, x, y + r + 20, { color, size: 15, align: 'center' });
    }
  }

  // A tiny doodle star (4-point sparkle).
  function sparkle(rc, x, y, s, { color = COLORS.ink, seed = 31 } = {}) {
    const o = opts(seed, { stroke: color, strokeWidth: 1.4 });
    rc.line(x - s, y, x + s, y, o);
    rc.line(x, y - s, x, y + s, o);
  }

  Object.assign(A, { stickFigure, doodleArrow, label, notToScale, doodleClock, sparkle });
})();
