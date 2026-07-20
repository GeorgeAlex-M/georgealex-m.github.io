// Sim base class, registry, and the single global animation loop.
//
// Lifecycle:
//   - bootSims() finds every <canvas data-sim="name">, instantiates the
//     registered class, and wires an IntersectionObserver on its wrapper.
//   - ONE requestAnimationFrame loop drives every sim that is both visible
//     and playing; it fully suspends when no sim is active (zero work while
//     the reader is in prose).
//   - prefers-reduced-motion: sims start paused on a static frame with a
//     hand-drawn ▶ overlay.

(() => {
  const A = (window.Astro = window.Astro || {});
  const { DoodleCanvas, roughCanvas, SketchCache } = A;

  const registry = new Map();
  const sims = [];

  function register(name, cls) {
    registry.set(name, cls);
  }

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class Sim {
    constructor({ canvas, controlsEl, readoutEl, wrap }) {
      this.canvasEl = canvas;
      this.wrap = wrap;
      this.controlsEl = controlsEl;
      this.readoutEl = readoutEl;
      this.canvas = new DoodleCanvas(canvas);
      this.rc = roughCanvas(canvas);
      this.ctx = this.canvas.ctx;
      this.cache = new SketchCache(this.rc);
      this.visible = false;
      this.playing = !REDUCED_MOTION;
      this.canvas.onResize = () => {
        this.cache.invalidate();
        this.onResize();
        this.renderFrame();
      };
    }

    /* override points */
    init() {}
    update(_dt) {}
    render() {}
    onResize() {}

    get w() { return this.canvas.w; }
    get h() { return this.canvas.h; }

    renderFrame() {
      // layout may not have happened at boot (slow first paint) — retry lazily
      if (this.canvas.w === 0) this.canvas._resize();
      if (this.canvas.w === 0) return;
      this.canvas.clear();
      this.render();
      this._drawCite();
      this._hasRendered = true;
    }

    // Contextual citation: shows the paper behind what the sim just did,
    // right on the canvas, at the moment it happens (e.g. run the Penrose
    // process → "1969 Penrose - …"). Same exact YYYY Author - Title strings
    // as the citation boxes, so they stay searchable.
    cite(text, seconds = 7) {
      this._cite = { text, until: performance.now() + seconds * 1000 };
      // don't force a draw mid-init — sims may cite before their state exists;
      // the chip appears on the first (or next) rendered frame either way
      if (this._hasRendered) this.renderFrame();
    }

    _drawCite() {
      const c = this._cite;
      if (!c || performance.now() > c.until) return;
      const { ctx } = this;
      const w = this.canvas.w;
      const h = this.canvas.h;
      ctx.save();
      ctx.font = "12.5px 'Gochi Hand', 'Segoe Print', cursive";
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      let text = `source: ${c.text}`;
      // if the full title doesn't fit, fall back to "YYYY Authors"
      if (ctx.measureText(text).width > w - 24) {
        const short = c.text.split(' - ')[0];
        text = `source: ${short}`;
      }
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(30, 30, 30, 0.88)';
      ctx.fillRect(w - tw - 20, h - 26, tw + 14, 20);
      ctx.fillStyle = '#ffa94d';
      ctx.fillText(text, w - 12, h - 12);
      ctx.restore();
    }

    // Request a redraw + loop wake-up (e.g. after a control changed while paused).
    poke() {
      this.renderFrame();
      wake();
    }
  }

  /* ---------------- global loop ---------------- */

  let rafId = null;
  let lastT = 0;

  function activeSims() {
    return sims.filter((s) => s.visible && s.playing);
  }

  function tick(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05); // clamp survives tab-switch
    lastT = t;
    const active = activeSims();
    window.__activeSims = active.length; // debug/verification hook
    if (active.length === 0) {
      rafId = null; // suspend completely
      return;
    }
    for (const s of active) {
      s.update(dt);
      s.renderFrame();
    }
    rafId = requestAnimationFrame(tick);
  }

  function wake() {
    if (rafId === null && activeSims().length > 0) {
      lastT = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  /* ---------------- boot ---------------- */

  function addPlayOverlay(sim) {
    const overlay = document.createElement('div');
    overlay.className = 'sim-overlay';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '▶ play';
    overlay.appendChild(btn);
    sim.wrap.appendChild(overlay);
    btn.addEventListener('click', () => {
      overlay.hidden = true;
      sim.playing = true;
      wake();
    });
  }

  function bootSims() {
    window.__sims = sims; // verification/debug hook (see plan's verification section)
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const sim = sims.find((s) => s.wrap === entry.target);
        if (sim) sim.visible = entry.isIntersecting;
      }
      wake();
    }, { threshold: 0.05, rootMargin: '100px 0px' });

    document.querySelectorAll('canvas[data-sim]').forEach((cv) => {
      const name = cv.dataset.sim;
      const Cls = registry.get(name);
      if (!Cls) return;
      const wrap = cv.closest('.sim-canvas-wrap');
      const section = cv.closest('.sim-section');
      const sim = new Cls({
        canvas: cv,
        wrap,
        controlsEl: section ? section.querySelector(`[data-controls="${name}"]`) : null,
        readoutEl: section ? section.querySelector(`[data-readout="${name}"]`) : null,
      });
      sim.name = name;
      sim.init();
      sim.renderFrame();
      if (REDUCED_MOTION) addPlayOverlay(sim);
      sims.push(sim);
      io.observe(wrap);
    });
  }

  Object.assign(A, { Sim, register, bootSims, REDUCED_MOTION });
})();
