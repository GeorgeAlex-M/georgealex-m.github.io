// DoodleCanvas — devicePixelRatio-aware canvas wrapper.
// Sims draw in CSS pixel coordinates; the faint grid is pre-rendered offscreen
// once per size and blitted on every clear() (never re-stroked per frame).

(() => {
  const A = (window.Astro = window.Astro || {});
  const { COLORS, GRID_STEP } = A;

  class DoodleCanvas {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.w = 0;
      this.h = 0;
      this.dpr = 1;
      this._grid = null;
      this.onResize = null; // assigned by Sim

      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(canvas);
      this._resize();
    }

    _resize() {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      const dpr = window.devicePixelRatio || 1;
      if (w === 0 || h === 0) return;
      if (w === this.w && h === this.h && dpr === this.dpr) return;
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._grid = null;
      if (this.onResize) this.onResize();
    }

    _buildGrid() {
      const g = document.createElement('canvas');
      g.width = this.canvas.width;
      g.height = this.canvas.height;
      const gc = g.getContext('2d');
      gc.scale(this.dpr, this.dpr);
      gc.strokeStyle = COLORS.grid;
      gc.lineWidth = 1;
      gc.beginPath();
      for (let x = GRID_STEP; x < this.w; x += GRID_STEP) {
        gc.moveTo(x + 0.5, 0);
        gc.lineTo(x + 0.5, this.h);
      }
      for (let y = GRID_STEP; y < this.h; y += GRID_STEP) {
        gc.moveTo(0, y + 0.5);
        gc.lineTo(this.w, y + 0.5);
      }
      gc.stroke();
      this._grid = g;
    }

    clear() {
      const { ctx, w, h } = this;
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, w, h);
      if (!this._grid) this._buildGrid();
      ctx.drawImage(this._grid, 0, 0, w, h);
    }
  }

  A.DoodleCanvas = DoodleCanvas;
})();
