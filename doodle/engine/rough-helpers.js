// Rough.js helpers with jitter control.
//
// Rough.js re-randomizes strokes on every call, which makes shapes "boil"
// when redrawn each frame. Two rules keep the doodle look stable:
//   1. Static geometry: build a Drawable once (SketchCache) and replay it.
//   2. Moving geometry: draw fresh each frame but with a FIXED seed per shape,
//      so the wobble is stable while the position animates.
//
// `rough` is the UMD global loaded from the CDN in index.html.

(() => {
  const A = (window.Astro = window.Astro || {});
  const { COLORS } = A;

  const ROUGHNESS = 1.2;
  const BOWING = 1.5;

  function roughCanvas(canvasEl) {
    return rough.canvas(canvasEl);
  }

  // Standard options for a hand-drawn stroke. `seed` MUST be a positive integer.
  function opts(seed, extra = {}) {
    return {
      seed,
      roughness: ROUGHNESS,
      bowing: BOWING,
      stroke: COLORS.ink,
      strokeWidth: 2,
      ...extra,
    };
  }

  // Cache of rough Drawables keyed by string. Invalidate on resize/param change.
  class SketchCache {
    constructor(rc) {
      this.rc = rc;
      this.map = new Map();
    }

    // draw('horizon', g => g.circle(x, y, d, opts(1))) — builds once, replays after.
    draw(key, build) {
      let d = this.map.get(key);
      if (!d) {
        d = build(this.rc.generator);
        this.map.set(key, d);
      }
      this.rc.draw(d);
    }

    invalidate() {
      this.map.clear();
    }
  }

  Object.assign(A, { ROUGHNESS, BOWING, roughCanvas, opts, SketchCache });
})();
