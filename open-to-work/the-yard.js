// The Yard — a landscape that runs through a whole day.
//
// Not a diagram and not an argument: a place. A house with the lights coming on,
// a shed that stays lit long after the house doesn't, a dog, a fire, a bench with
// everything that got built on it, a gate standing open, and a road out.
//
// Everything is drawn in CSS pixels against a horizon at 0.46h, and laid out in
// fixed horizontal bands so nothing collides as the canvas resizes:
//
//   0.03–0.16  the old tree and its swing        0.52–0.70  the vegetable rows
//   0.16–0.27  the laundry line                  0.53–0.59  the well
//   0.20–0.37  the house                         0.62–0.69  the wheelbarrow
//   0.38–0.51  the shed (the light that stays)   0.72–1.00  the fence and the gate
//   0.26–0.44  the workbench (foreground)        0.80       the road out
//   0.07–0.24  him, the dog, the fire            0.86–1.00  the far city
//
// TIME
// The hour drives everything: sun and moon ride the same arc, the sky glows warm
// at the two ends of it, stars fade in, windows light up, the fire and the lantern
// take over, birds become fireflies. Sunrise and sunset are Bucharest's for late
// July — 06:12 and 20:36 — because if the sim is going to have a clock in it, the
// clock may as well be true.
//
// DETERMINISM
// No Math.random anywhere. Every scattered thing (stars, grass, leaves, fireflies,
// bricks) comes from an integer hash or a golden-ratio sequence, so the yard is
// identical on every reload and the doodle never boils. Static geometry is built
// once through SketchCache and replayed; only what moves is re-stroked per frame.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, FONT_HAND, FONT_BODY, label, stickFigure,
    slider, buttonRow, actionButton, setReadout,
  } = A;

  /* ------------------------------------------------------------------ *
   *  EDIT ME — the only personal strings in the file.                  *
   * ------------------------------------------------------------------ */
  const ME = {
    caption1: 'almost everything in this yard',
    caption2: 'was built between 2am and sunrise.',
    role: 'QA Engineer',
    city: 'Bucharest',
    modes: 'on-site · hybrid · remote',
    gateSign: 'open',
  };

  const SUNRISE = 6.2;   // Bucharest, late July
  const SUNSET = 20.6;

  // Deterministic hash → [0,1). Used everywhere Math.random would have been.
  function h01(n) {
    let x = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0;
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;

  // 'rgb(r,g,b)' at alpha
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  class TheYardSim extends Sim {
    init() {
      this.hour = 21.4;        // dusk: the windows are on and the fire is lit
      this.wind = 0.35;
      this.running = true;     // let the day advance on its own
      this.speed = 0.55;       // hours per second
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    /* ---------------- light model ---------------- */

    // How much of the sun is up, 0..1.
    get daylight() {
      const { hour } = this;
      if (hour < SUNRISE || hour > SUNSET) return 0;
      const u = (hour - SUNRISE) / (SUNSET - SUNRISE);
      return clamp(Math.sin(u * Math.PI) * 1.25, 0, 1);
    }

    get night() { return 1 - this.daylight; }

    // Warm band on the horizon, peaking at the two ends of the arc.
    get glow() {
      const { hour } = this;
      const dawn = 1 - smooth(0, 2.4, Math.abs(hour - SUNRISE));
      const dusk = 1 - smooth(0, 2.4, Math.abs(hour - SUNSET));
      return clamp(Math.max(dawn, dusk), 0, 1);
    }

    // The house keeps human hours: lit through the evening, dark from about
    // 23:40 until seven, lit again for breakfast, out by mid-morning.
    get lampHouse() {
      const h = this.hour;
      if (h >= 23.7 || h < 7) return 0;
      return smooth(0.35, 0.8, this.night);
    }

    // The shed does not. It comes on earlier and never goes off — which is the
    // one thing in this drawing that is actually an argument.
    get lampShed() { return Math.max(0.15, smooth(0.15, 0.55, this.night)); }

    get starAlpha() { return smooth(0.55, 0.95, this.night); }

    // Sun (day) or moon (night) on the same arc.
    body() {
      const { w } = this;
      const sky = this.horizon;
      // By the clock, not by `daylight` — at exactly sunrise sin(0) is 0, which
      // would put a moon in the sky at 06:12.
      const day = this.hour >= SUNRISE && this.hour <= SUNSET;
      let u;
      if (day) u = (this.hour - SUNRISE) / (SUNSET - SUNRISE);
      else {
        const nh = this.hour > SUNSET ? this.hour - SUNSET : this.hour + (24 - SUNSET);
        u = nh / (24 - SUNSET + SUNRISE);
      }
      return {
        day,
        x: mix(w * 0.10, w * 0.90, u),
        y: sky - Math.sin(clamp(u, 0, 1) * Math.PI) * sky * 0.74 + 8,
      };
    }

    get horizon() { return this.h * 0.46; }

    /* ---------------- controls ---------------- */

    buildControls() {
      const p = this.controlsEl;
      if (!p) return;

      this.timeCtl = slider(p, {
        label: 'time of day',
        min: 0,
        max: 24,
        step: 0.01,
        value: this.hour,
        format: (v) => {
          const hh = Math.floor(v) % 24;
          const mm = Math.floor((v - Math.floor(v)) * 60);
          return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        },
        oninput: (v) => {
          this.hour = v;
          this.running = false;
          this.runBtns.select('hold');
          this.updateReadout();
          this.poke();
        },
      });

      this.windCtl = slider(p, {
        label: 'wind',
        min: 0,
        max: 1,
        step: 0.01,
        value: this.wind,
        format: (v) => (v < 0.15 ? 'still' : v < 0.45 ? 'a breeze' : v < 0.75 ? 'gusty' : 'a proper wind'),
        oninput: (v) => { this.wind = v; this.poke(); },
      });

      this.runBtns = buttonRow(p, [
        { label: '▶ let the day run', value: 'run' },
        { label: '❚❚ hold', value: 'hold' },
      ], {
        initial: 'run',
        onSelect: (v) => { this.running = v === 'run'; this.poke(); },
      });

      actionButton(p, '☾ 3am', () => this.jump(3));
      actionButton(p, '☀ noon', () => this.jump(12));
      actionButton(p, '⤓ save PNG', () => this.savePNG());
    }

    jump(hour) {
      this.hour = hour;
      this.running = false;
      this.runBtns.select('hold');
      this.timeCtl.set(hour);
      this.updateReadout();
      this.poke();
    }

    savePNG() {
      this.canvasEl.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `the-yard-${String(Math.floor(this.hour)).padStart(2, '0')}h.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
    }

    updateReadout() {
      const hh = Math.floor(this.hour) % 24;
      const mm = Math.floor((this.hour - Math.floor(this.hour)) * 60);
      const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      const b = this.body();
      setReadout(this.readoutEl, [
        [
          [`${time}`, 'yellow'],
          ['  ·  ', null],
          [b.day ? 'the sun is up' : 'the sun is down', b.day ? 'yellow' : 'cyan'],
          ['  ·  sunrise ', null], ['06:12', 'orange'],
          [', sunset ', null], ['20:36', 'orange'],
          [' — Bucharest, late July', null],
        ],
        [
          ['The house goes dark before the shed does. ', null],
          ['That is the whole picture, really', 'pink'],
          [': the day job ends, and the light in the workshop stays on.', null],
        ],
        [
          [`${ME.role} · ${ME.city} · ${ME.modes}`, 'green'],
        ],
      ]);
    }

    /* ---------------- update ---------------- */

    update(dt) {
      this.t += dt;
      if (this.running) {
        this.hour = (this.hour + dt * this.speed) % 24;
        this.timeCtl.set(this.hour);
        if (Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) this.updateReadout();
      }
    }

    onResize() { this.cache.invalidate(); }

    /* ---------------- render ---------------- */

    render() {
      const compact = this.w < 640;
      this.drawSky(compact);
      this.drawHills(compact);
      this.drawFarCity(compact);
      this.drawRoad(compact);
      this.drawFence(compact);
      this.drawTree(compact);
      this.drawHouse(compact);
      this.drawShed(compact);
      this.drawLaundry(compact);
      this.drawGarden(compact);
      this.drawWell(compact);
      this.drawWorkbench(compact);
      this.drawFireAndFriends(compact);
      this.drawForeground(compact);
      this.drawCritters(compact);
      this.drawLabels(compact);
    }

    /* ===== sky ===== */

    drawSky(compact) {
      const { rc, ctx, w, h } = this;
      const hz = this.horizon;
      const K = `${w}x${h}`;

      // warm band along the horizon at the two ends of the day
      const g = this.glow;
      if (g > 0.01) {
        const grad = ctx.createLinearGradient(0, hz - h * 0.30, 0, hz + 4);
        grad.addColorStop(0, rgba(COLORS.orange, 0));
        grad.addColorStop(0.72, rgba(COLORS.orange, 0.10 * g));
        grad.addColorStop(1, rgba(COLORS.yellow, 0.20 * g));
        ctx.fillStyle = grad;
        ctx.fillRect(0, hz - h * 0.30, w, h * 0.30 + 4);
      }

      // stars — golden-angle scatter, twinkling on a fixed per-star phase
      const sa = this.starAlpha;
      if (sa > 0.01) {
        ctx.save();
        for (let i = 0; i < 84; i++) {
          const sx = h01(i * 3 + 1) * w;
          const sy = h01(i * 3 + 2) * (hz - 14) + 4;
          const tw = 0.55 + 0.45 * Math.sin(this.t * 1.4 + h01(i * 3 + 3) * 9);
          const r = 0.7 + h01(i * 7) * 1.15;
          ctx.globalAlpha = sa * tw * (0.35 + h01(i * 11) * 0.65);
          ctx.fillStyle = i % 9 === 0 ? COLORS.cyan : COLORS.ink;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        // one bright one, with a sparkle
        const bx = w * 0.72;
        const by = hz * 0.24;
        A.sparkle(rc, bx, by, 5 + Math.sin(this.t * 2) * 1.2,
          { color: COLORS.yellow, seed: 3 });
      }

      // sun or moon
      const b = this.body();
      const R = compact ? 17 : 23;
      if (b.day) {
        rc.circle(b.x, b.y, R * 2, opts(11, { stroke: COLORS.yellow, strokeWidth: 2.2 }));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + this.t * 0.09;
          rc.line(
            b.x + Math.cos(a) * (R + 6), b.y + Math.sin(a) * (R + 6),
            b.x + Math.cos(a) * (R + 15), b.y + Math.sin(a) * (R + 15),
            opts(12 + i, { stroke: COLORS.yellow, strokeWidth: 1.4 }),
          );
        }
      } else {
        // crescent: a disc with a bite taken out, drawn as two arcs
        rc.circle(b.x, b.y, R * 1.75, opts(20, { stroke: COLORS.ink, strokeWidth: 2 }));
        rc.path(
          `M ${b.x + R * 0.30} ${b.y - R * 0.80} a ${R * 0.92} ${R * 0.92} 0 1 0 0 ${R * 1.60}`,
          opts(21, { stroke: COLORS.muted, strokeWidth: 1.4 }),
        );
        rc.circle(b.x - R * 0.35, b.y - R * 0.20, 6, opts(22, { stroke: COLORS.muted, strokeWidth: 1 }));
        rc.circle(b.x + R * 0.10, b.y + R * 0.45, 4, opts(23, { stroke: COLORS.muted, strokeWidth: 1 }));
      }

      // clouds — drift with the wind, wrap around
      const drift = this.t * (6 + this.wind * 34);
      for (let i = 0; i < 4; i++) {
        const span = w + 260;
        const cx = ((h01(i * 5 + 1) * span + drift) % span) - 130;
        const cy = hz * (0.16 + h01(i * 5 + 2) * 0.46);
        const cs = (compact ? 0.62 : 1) * (0.7 + h01(i * 5 + 3) * 0.6);
        const al = 0.30 + 0.45 * this.daylight;
        const col = rgba(this.glow > 0.4 ? COLORS.orange : COLORS.muted, al);
        rc.path(
          `M ${cx} ${cy} q ${26 * cs} ${-16 * cs} ${52 * cs} ${-3 * cs}`
          + ` q ${20 * cs} ${-14 * cs} ${44 * cs} ${1 * cs}`
          + ` q ${22 * cs} ${4 * cs} ${34 * cs} ${-2 * cs}`,
          opts(30 + i, { stroke: col, strokeWidth: 1.3 }),
        );
      }
    }

    /* ===== land ===== */

    drawHills(compact) {
      const { w, h } = this;
      const hz = this.horizon;
      const K = `${w}x${h}`;

      // far ridge
      this.cache.draw(`ridge-${K}`, (g) => g.path(
        `M 0 ${hz - 4} Q ${w * 0.16} ${hz - 40} ${w * 0.34} ${hz - 16}`
        + ` T ${w * 0.66} ${hz - 22} T ${w} ${hz - 34} L ${w} ${hz + 6} L 0 ${hz + 6} Z`,
        opts(40, {
          stroke: COLORS.muted, strokeWidth: 1.5,
          fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 16, hachureAngle: 32,
        }),
      ));

      // the yard itself
      this.cache.draw(`ground-${K}`, (g) => g.path(
        `M 0 ${hz + 16} Q ${w * 0.30} ${hz - 8} ${w * 0.58} ${hz + 10}`
        + ` T ${w} ${hz + 2} L ${w} ${h} L 0 ${h} Z`,
        opts(41, {
          stroke: COLORS.green, strokeWidth: 2,
          fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 14,
        }),
      ));
    }

    drawFarCity(compact) {
      const { ctx, w, h } = this;
      const hz = this.horizon;
      const K = `${w}x${h}`;
      const base = hz - 12;
      const x0 = w * 0.855;
      // a skyline of 9 blocks, deterministic heights
      for (let i = 0; i < 9; i++) {
        const bw = 9 + h01(i * 13 + 1) * 11;
        const bh = 12 + h01(i * 13 + 2) * 34;
        const bx = x0 + i * (w * 0.016) + h01(i * 13 + 3) * 4;
        if (bx > w - 4) break;
        this.cache.draw(`city-${i}-${K}`, (g) => g.rectangle(bx, base - bh, bw, bh,
          opts(50 + i, { stroke: COLORS.muted, strokeWidth: 1.2 })));
        // lit windows, only after dark
        const la = this.lampHouse;
        if (la > 0.02) {
          ctx.save();
          ctx.globalAlpha = la * 0.85;
          ctx.fillStyle = COLORS.yellow;
          for (let k = 0; k < 4; k++) {
            if (h01(i * 31 + k) < 0.45) continue;
            ctx.fillRect(bx + 2 + (k % 2) * 5, base - bh + 4 + Math.floor(k / 2) * 7, 2.6, 3.4);
          }
          ctx.restore();
        }
      }
      label(ctx, 'the city', x0 + w * 0.055, base - 52,
        { color: COLORS.muted, size: compact ? 9.5 : 11, align: 'center' });
    }

    drawRoad(compact) {
      const { ctx, w, h } = this;
      const hz = this.horizon;
      const K = `${w}x${h}`;
      // from the gate, out to the right and up to the city
      this.cache.draw(`road-${K}`, (g) => g.path(
        `M ${w * 0.80} ${h * 0.74} Q ${w * 0.90} ${h * 0.62} ${w * 0.905} ${hz + 4}`,
        opts(60, { stroke: COLORS.orange, strokeWidth: 2.2 }),
      ));
      this.cache.draw(`road2-${K}`, (g) => g.path(
        `M ${w * 0.845} ${h * 0.755} Q ${w * 0.94} ${h * 0.63} ${w * 0.935} ${hz + 4}`,
        opts(61, { stroke: COLORS.orange, strokeWidth: 2.2 }),
      ));
      // dashes down the middle
      for (let i = 0; i < 5; i++) {
        const t = 0.12 + i * 0.19;
        const rx = mix(w * 0.822, w * 0.92, t) + Math.sin(t * 2.2) * w * 0.012;
        const ry = mix(h * 0.748, hz + 6, t);
        this.cache.draw(`dash-${i}-${K}`, (g) => g.line(rx, ry, rx + 2, ry - 7,
          opts(65 + i, { stroke: COLORS.yellow, strokeWidth: 1.2 })));
      }
    }

    drawFence(compact) {
      const { rc, ctx, w, h } = this;
      const K = `${w}x${h}`;
      const fy = h * 0.70;
      const x0 = w * 0.72;
      const gateX = w * 0.795;

      // rails, broken by the gate opening
      const rail = (dy, seed) => {
        this.cache.draw(`rail-${seed}-${K}`, (g) => g.line(x0, fy + dy, gateX - 6, fy + dy - 4,
          opts(seed, { stroke: COLORS.orange, strokeWidth: 1.7 })));
        this.cache.draw(`railb-${seed}-${K}`, (g) => g.line(gateX + w * 0.075, fy + dy - 8, w * 0.995, fy + dy - 16,
          opts(seed + 40, { stroke: COLORS.orange, strokeWidth: 1.7 })));
      };
      rail(-16, 70);
      rail(-2, 71);

      // posts
      for (let i = 0; i < 8; i++) {
        const px = x0 + i * (w * 0.038);
        if (px > gateX - 10 && px < gateX + w * 0.072) continue;
        if (px > w * 0.99) break;
        this.cache.draw(`post-${i}-${K}`, (g) => g.line(px, fy - 30, px, fy + 10,
          opts(80 + i, { stroke: COLORS.orange, strokeWidth: 1.8 })));
      }

      // the gate itself, swung open — drawn as a rotated panel
      const gy = fy - 4;
      const gw = w * 0.062;
      const ang = -0.62; // standing open
      const gx2 = gateX + Math.cos(ang) * gw;
      const gy2 = gy + Math.sin(ang) * gw;
      const gopts = (s) => opts(s, { stroke: COLORS.yellow, strokeWidth: 1.9 });
      rc.line(gateX, gy, gx2, gy2, gopts(90));
      rc.line(gateX, gy - 26, gx2, gy2 - 26, gopts(91));
      rc.line(gateX, gy - 30, gateX, gy + 10, gopts(92));
      rc.line(gx2, gy2 - 30, gx2, gy2 + 8, gopts(93));
      rc.line(gateX, gy + 8, gx2, gy2 - 26, gopts(94)); // the diagonal brace

      // a little sign hanging on it
      const sx = gateX + Math.cos(ang) * gw * 0.52;
      const sy = gy + Math.sin(ang) * gw * 0.52 - 14;
      const sw = compact ? 34 : 44;
      rc.rectangle(sx - sw / 2, sy - 9, sw, 18, opts(95, { stroke: COLORS.yellow, strokeWidth: 1.4 }));
      label(ctx, ME.gateSign, sx, sy + 1,
        { color: COLORS.yellow, size: compact ? 10.5 : 12.5, align: 'center', baseline: 'middle' });

      // mailbox by the gate, flag up
      const mx = w * 0.757;
      const my = fy + 6;
      this.cache.draw(`mbpost-${K}`, (g) => g.line(mx, my, mx, my - 26, opts(100, { stroke: COLORS.muted, strokeWidth: 1.8 })));
      this.cache.draw(`mbox-${K}`, (g) => g.path(
        `M ${mx - 11} ${my - 26} l 0 -11 q 11 -8 22 0 l 0 11 Z`,
        opts(101, { stroke: COLORS.cyan, strokeWidth: 1.5 }),
      ));
      this.cache.draw(`mbflag-${K}`, (g) => g.line(mx + 11, my - 37, mx + 11, my - 49, opts(102, { stroke: COLORS.red, strokeWidth: 1.5 })));
      this.cache.draw(`mbflag2-${K}`, (g) => g.rectangle(mx + 11, my - 49, 8, 6, opts(103, { stroke: COLORS.red, strokeWidth: 1.3 })));

      // bicycle leaning on the fence
      const bx = w * 0.735;
      const by = fy + 14;
      const r = compact ? 8 : 10;
      this.cache.draw(`bw1-${K}`, (g) => g.circle(bx, by, r * 2, opts(110, { stroke: COLORS.cyan, strokeWidth: 1.4 })));
      this.cache.draw(`bw2-${K}`, (g) => g.circle(bx + r * 2.6, by, r * 2, opts(111, { stroke: COLORS.cyan, strokeWidth: 1.4 })));
      this.cache.draw(`bframe-${K}`, (g) => g.path(
        `M ${bx} ${by} L ${bx + r * 1.1} ${by - r * 1.5} L ${bx + r * 2.6} ${by}`
        + ` M ${bx + r * 1.1} ${by - r * 1.5} L ${bx + r * 2.1} ${by - r * 1.6}`,
        opts(112, { stroke: COLORS.cyan, strokeWidth: 1.3 }),
      ));

      // a signpost at the roadside
      const px = w * 0.862;
      const py = h * 0.665;
      this.cache.draw(`sp-${K}`, (g) => g.line(px, py, px, py - 34, opts(120, { stroke: COLORS.orange, strokeWidth: 1.8 })));
      this.cache.draw(`spa-${K}`, (g) => g.path(
        `M ${px} ${py - 30} l 26 0 l 6 5 l -6 5 l -26 0 Z`, opts(121, { stroke: COLORS.orange, strokeWidth: 1.3 }),
      ));
      label(ctx, ME.city.toLowerCase(), px + 4, py - 22,
        { color: COLORS.orange, size: compact ? 8.5 : 9.5 });
    }

    /* ===== the buildings ===== */

    drawHouse(compact) {
      const { rc, ctx, w, h } = this;
      const K = `${w}x${h}`;
      const hx = w * 0.205;
      const base = h * 0.635;
      const bw = compact ? w * 0.135 : w * 0.145;
      const bh = compact ? h * 0.145 : h * 0.155;

      this.cache.draw(`hbody-${K}`, (g) => g.rectangle(hx, base - bh, bw, bh, opts(130, {
        stroke: COLORS.ink, strokeWidth: 2,
        fill: COLORS.ink, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 15,
      })));
      this.cache.draw(`hroof-${K}`, (g) => g.path(
        `M ${hx - 12} ${base - bh} L ${hx + bw / 2} ${base - bh - bh * 0.62} L ${hx + bw + 12} ${base - bh} Z`,
        opts(131, {
          stroke: COLORS.red, strokeWidth: 2,
          fill: COLORS.red, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 9,
        }),
      ));
      // chimney
      const cx = hx + bw * 0.74;
      const cyTop = base - bh - bh * 0.40;
      this.cache.draw(`chim-${K}`, (g) => g.rectangle(cx, cyTop, 13, 26, opts(132, { stroke: COLORS.ink, strokeWidth: 1.7 })));

      // smoke — rises and leans with the wind
      ctx.save();
      ctx.strokeStyle = rgba(COLORS.muted, 0.55);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 26; i++) {
        const p = i / 26;
        const sy = cyTop - 4 - p * (compact ? 42 : 58);
        const sx = cx + 6 + Math.sin(this.t * 1.1 + p * 4.4) * (5 + p * 12) * (0.4 + this.wind)
          + p * p * this.wind * 44;
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();

      // door
      this.cache.draw(`hdoor-${K}`, (g) => g.rectangle(hx + bw * 0.13, base - bh * 0.44, bw * 0.17, bh * 0.44,
        opts(133, { stroke: COLORS.orange, strokeWidth: 1.6 })));

      // two windows — filled with warm light after dark
      const la = this.lampHouse;
      const win = (n, wx, wy, ww, wh) => {
        if (la > 0.02) {
          ctx.save();
          ctx.globalAlpha = la;
          ctx.fillStyle = rgba(COLORS.yellow, 0.5);
          ctx.fillRect(wx, wy, ww, wh);
          // light spilling onto the grass
          const gr = ctx.createLinearGradient(wx, wy + wh, wx, wy + wh + 46);
          gr.addColorStop(0, rgba(COLORS.yellow, 0.22));
          gr.addColorStop(1, rgba(COLORS.yellow, 0));
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.moveTo(wx, wy + wh);
          ctx.lineTo(wx + ww, wy + wh);
          ctx.lineTo(wx + ww + 16, wy + wh + 46);
          ctx.lineTo(wx - 16, wy + wh + 46);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        this.cache.draw(`win-${n}-${K}`, (g) => g.rectangle(wx, wy, ww, wh, opts(140 + n, { stroke: COLORS.yellow, strokeWidth: 1.5 })));
        this.cache.draw(`winx-${n}-${K}`, (g) => g.line(wx + ww / 2, wy, wx + ww / 2, wy + wh, opts(150 + n, { stroke: COLORS.yellow, strokeWidth: 1 })));
        this.cache.draw(`winy-${n}-${K}`, (g) => g.line(wx, wy + wh / 2, wx + ww, wy + wh / 2, opts(160 + n, { stroke: COLORS.yellow, strokeWidth: 1 })));
      };
      const ww = bw * 0.20;
      const wh = bh * 0.26;
      win(0, hx + bw * 0.44, base - bh * 0.82, ww, wh);
      win(1, hx + bw * 0.72, base - bh * 0.82, ww, wh);

      // the cat on the roof
      const kx = hx + bw * 0.24;
      const ky = base - bh - bh * 0.28;
      const tail = Math.sin(this.t * 1.7) * 5;
      rc.path(`M ${kx} ${ky} q 7 -9 15 0`, opts(170, { stroke: COLORS.pink, strokeWidth: 1.4 }));
      rc.circle(kx + 17, ky - 5, 8, opts(171, { stroke: COLORS.pink, strokeWidth: 1.4 }));
      rc.line(kx + 14, ky - 9, kx + 12, ky - 14, opts(172, { stroke: COLORS.pink, strokeWidth: 1.1 }));
      rc.line(kx + 20, ky - 9, kx + 22, ky - 14, opts(173, { stroke: COLORS.pink, strokeWidth: 1.1 }));
      rc.path(`M ${kx} ${ky} q -8 ${-6 + tail} -12 ${-13 + tail}`, opts(174, { stroke: COLORS.pink, strokeWidth: 1.3 }));

      // Named, so the picture still says it without the paragraph underneath.
      const hn = 'the day job';
      const hs = compact ? 9 : 11.5;
      label(ctx, hn, this.clampX(hn, hx + bw / 2, hs), base + 20,
        { color: COLORS.muted, size: hs, align: 'center' });
    }

    drawShed(compact) {
      const { rc, ctx, w, h } = this;
      const K = `${w}x${h}`;
      const sx = w * 0.395;
      const base = h * 0.655;
      const bw = compact ? w * 0.10 : w * 0.105;
      const bh = compact ? h * 0.10 : h * 0.11;

      this.cache.draw(`sbody-${K}`, (g) => g.rectangle(sx, base - bh, bw, bh, opts(180, {
        stroke: COLORS.ink, strokeWidth: 1.8,
        fill: COLORS.ink, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 13,
      })));
      this.cache.draw(`sroof-${K}`, (g) => g.path(
        `M ${sx - 9} ${base - bh} L ${sx + bw * 0.5} ${base - bh - bh * 0.42} L ${sx + bw + 9} ${base - bh} Z`,
        opts(181, { stroke: COLORS.cyan, strokeWidth: 1.8, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 9 }),
      ));

      // the open door, and the light coming out of it — this is the one that stays on
      const la = this.lampShed;
      const dw = bw * 0.42;
      const dx = sx + bw * 0.30;
      const dyT = base - bh * 0.78;
      const dh = bh * 0.78;
      ctx.save();
      ctx.globalAlpha = la;
      ctx.fillStyle = rgba(COLORS.yellow, 0.42);
      ctx.fillRect(dx, dyT, dw, dh);
      const gr = ctx.createLinearGradient(dx, base, dx, base + 70);
      gr.addColorStop(0, rgba(COLORS.yellow, 0.20));
      gr.addColorStop(1, rgba(COLORS.yellow, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(dx, base);
      ctx.lineTo(dx + dw, base);
      ctx.lineTo(dx + dw + 30, base + 70);
      ctx.lineTo(dx - 30, base + 70);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      this.cache.draw(`sdoor-${K}`, (g) => g.rectangle(dx, dyT, dw, dh, opts(182, { stroke: COLORS.yellow, strokeWidth: 1.5 })));
      // the swung-open door panel
      this.cache.draw(`sdoorp-${K}`, (g) => g.path(
        `M ${dx} ${dyT} l ${-dw * 0.75} ${6} l 0 ${dh} l ${dw * 0.75} ${-6} Z`,
        opts(183, { stroke: COLORS.muted, strokeWidth: 1.3 }),
      ));

      const sn = compact ? 'stays on' : 'the light that stays on';
      const ss = compact ? 9 : 11.5;
      label(ctx, sn, this.clampX(sn, sx + bw / 2, ss), base + 20,
        { color: COLORS.yellow, size: ss, align: 'center' });
    }

    drawLaundry(compact) {
      const { rc, w, h } = this;
      const K = `${w}x${h}`;
      const x1 = w * 0.165;
      const x2 = w * 0.198;
      const y1 = h * 0.545;
      const poleY = h * 0.655;
      this.cache.draw(`lpole-${K}`, (g) => g.line(x1, poleY, x1, y1, opts(190, { stroke: COLORS.muted, strokeWidth: 1.6 })));
      // the line sags, and swings a little with the wind
      const sag = 14 + Math.sin(this.t * 0.9) * 2 * this.wind;
      rc.path(`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${y1 + sag} ${x2} ${y1 - 4}`,
        opts(191, { stroke: COLORS.muted, strokeWidth: 1.1 }));
      const cols = [COLORS.cyan, COLORS.pink, COLORS.green];
      for (let i = 0; i < 3; i++) {
        const p = 0.22 + i * 0.28;
        const lx = mix(x1, x2, p);
        const ly = y1 + Math.sin(p * Math.PI) * sag - 2;
        const sw = Math.sin(this.t * 2.1 + i) * this.wind * 7;
        rc.path(
          `M ${lx - 6} ${ly} l ${sw * 0.4} 15 l ${12} ${1} l ${sw * 0.4} ${-15} Z`,
          opts(195 + i, { stroke: cols[i], strokeWidth: 1.2 }),
        );
      }
    }

    drawTree(compact) {
      const { rc, ctx, w, h } = this;
      const K = `${w}x${h}`;
      const tx = w * 0.078;
      const ty = h * 0.66;
      const th = compact ? h * 0.20 : h * 0.235;
      const sway = Math.sin(this.t * 0.8) * this.wind * 4;

      this.cache.draw(`trunk-${K}`, (g) => g.path(
        `M ${tx - 5} ${ty} q 2 ${-th * 0.5} 1 ${-th} M ${tx + 5} ${ty} q -1 ${-th * 0.5} 0 ${-th}`,
        opts(200, { stroke: COLORS.orange, strokeWidth: 2 }),
      ));
      this.cache.draw(`branch-${K}`, (g) => g.path(
        `M ${tx} ${ty - th * 0.62} l -22 -14 M ${tx} ${ty - th * 0.76} l 24 -12`,
        opts(201, { stroke: COLORS.orange, strokeWidth: 1.5 }),
      ));
      // canopy: three overlapping hachured blobs, swaying together
      const cy = ty - th - 12;
      const blob = (dx, dy, d, seed) => rc.circle(tx + dx + sway, cy + dy, d, opts(seed, {
        stroke: COLORS.green, strokeWidth: 1.7,
        fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.45, hachureGap: 8,
      }));
      const s = compact ? 0.74 : 1;
      blob(-26 * s, 8 * s, 62 * s, 205);
      blob(24 * s, 4 * s, 66 * s, 206);
      blob(-2 * s, -20 * s, 60 * s, 207);

      // the swing
      const bx = tx + 24;
      const by = ty - th * 0.76 - 12;
      const ang = Math.sin(this.t * 1.15) * (0.10 + this.wind * 0.16);
      const L = th * 0.52;
      const ex = bx + Math.sin(ang) * L;
      const ey = by + Math.cos(ang) * L;
      rc.line(bx - 7, by, ex - 7, ey, opts(210, { stroke: COLORS.muted, strokeWidth: 1.1 }));
      rc.line(bx + 7, by, ex + 7, ey, opts(211, { stroke: COLORS.muted, strokeWidth: 1.1 }));
      rc.line(ex - 11, ey, ex + 11, ey, opts(212, { stroke: COLORS.orange, strokeWidth: 2 }));

      // a few leaves let go and drift down
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const ph = (this.t * (0.10 + this.wind * 0.22) + h01(i * 17) ) % 1;
        const lx = tx + (h01(i * 19) - 0.5) * 90 + ph * this.wind * 120;
        const ly = cy + 20 + ph * (ty - cy + 10);
        ctx.globalAlpha = 0.55 * (1 - ph * 0.7);
        ctx.fillStyle = i % 2 ? COLORS.green : COLORS.orange;
        ctx.beginPath();
        ctx.ellipse(lx, ly, 3.2, 1.7, Math.sin(this.t * 2 + i) * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ===== the yard ===== */

    drawGarden(compact) {
      const { w, h } = this;
      const K = `${w}x${h}`;
      const y0 = h * 0.80;
      // bean poles with climbers
      for (let i = 0; i < 8; i++) {
        const px = w * (0.525 + i * 0.021);
        const py = y0 + (i % 2) * 7;
        this.cache.draw(`pole-${i}-${K}`, (g) => g.line(px, py, px + 4, py - 46, opts(220 + i, { stroke: COLORS.muted, strokeWidth: 1.4 })));
        for (let k = 0; k < 3; k++) {
          const t = 0.28 + k * 0.24;
          this.cache.draw(`leaf-${i}-${k}-${K}`, (g) => g.line(
            px + 4 * t, py - 46 * t, px + 4 * t + (k % 2 ? -7 : 7), py - 46 * t - 4,
            opts(240 + i * 3 + k, { stroke: COLORS.green, strokeWidth: 1.1 }),
          ));
        }
      }
      // cabbages in a row
      for (let i = 0; i < 5; i++) {
        const cx = w * (0.60 + i * 0.019);
        const cy = h * 0.845 + (i % 2) * 5;
        this.cache.draw(`cab-${i}-${K}`, (g) => g.circle(cx, cy, 15, opts(270 + i, {
          stroke: COLORS.green, strokeWidth: 1.3, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 5,
        })));
      }
      // sunflowers along the fence
      for (let i = 0; i < 3; i++) {
        const fx = w * (0.685 + i * 0.024);
        const fy = h * 0.775;
        this.cache.draw(`sfs-${i}-${K}`, (g) => g.line(fx, fy, fx - 2, fy - 40, opts(280 + i, { stroke: COLORS.green, strokeWidth: 1.5 })));
        this.cache.draw(`sfh-${i}-${K}`, (g) => g.circle(fx - 2, fy - 46, 15, opts(285 + i, {
          stroke: COLORS.yellow, strokeWidth: 1.5, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 5,
        })));
      }
      // the wheelbarrow
      const bx = w * 0.635;
      const by = h * 0.925;
      this.cache.draw(`wb-${K}`, (g) => g.path(
        `M ${bx} ${by - 18} l 34 0 l -6 15 l -22 0 Z`, opts(290, { stroke: COLORS.cyan, strokeWidth: 1.5 }),
      ));
      this.cache.draw(`wbw-${K}`, (g) => g.circle(bx + 8, by + 2, 13, opts(291, { stroke: COLORS.cyan, strokeWidth: 1.4 })));
      this.cache.draw(`wbh-${K}`, (g) => g.line(bx + 32, by - 16, bx + 48, by - 8, opts(292, { stroke: COLORS.cyan, strokeWidth: 1.3 })));
    }

    drawWell(compact) {
      const { w, h } = this;
      const K = `${w}x${h}`;
      const x = w * 0.487;
      const y = h * 0.795;
      const r = compact ? 17 : 21;
      this.cache.draw(`well-${K}`, (g) => g.path(
        `M ${x - r} ${y} l 3 22 l ${r * 2 - 6} 0 l 3 -22 Z`,
        opts(300, { stroke: COLORS.muted, strokeWidth: 1.7, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.35, hachureGap: 6 }),
      ));
      this.cache.draw(`wellr-${K}`, (g) => g.ellipse(x, y, r * 2, 9, opts(301, { stroke: COLORS.cyan, strokeWidth: 1.4 })));
      this.cache.draw(`wellp-${K}`, (g) => g.path(
        `M ${x - r + 4} ${y - 2} l 0 -26 M ${x + r - 4} ${y - 2} l 0 -26`,
        opts(302, { stroke: COLORS.orange, strokeWidth: 1.5 }),
      ));
      this.cache.draw(`wellroof-${K}`, (g) => g.path(
        `M ${x - r - 4} ${y - 28} L ${x} ${y - 42} L ${x + r + 4} ${y - 28} Z`,
        opts(303, { stroke: COLORS.red, strokeWidth: 1.5, fill: COLORS.red, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 6 }),
      ));
      // the bucket, swinging very slightly
      const sw = Math.sin(this.t * 0.7) * 2 * (0.3 + this.wind);
      this.rc.line(x, y - 28, x + sw, y - 14, opts(304, { stroke: COLORS.muted, strokeWidth: 1 }));
      this.rc.path(`M ${x + sw - 6} ${y - 14} l 2 9 l 8 0 l 2 -9 Z`, opts(305, { stroke: COLORS.cyan, strokeWidth: 1.2 }));
    }

    // The bench where the work happens: a telescope, a guitar, a board, books.
    drawWorkbench(compact) {
      const { rc, ctx, w, h } = this;
      const K = `${w}x${h}`;
      const bx = w * 0.285;
      const by = h * 0.845;
      const bw = compact ? w * 0.135 : w * 0.145;

      this.cache.draw(`bench-${K}`, (g) => g.rectangle(bx, by, bw, 7, opts(310, {
        stroke: COLORS.orange, strokeWidth: 1.8, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 5,
      })));
      this.cache.draw(`bl1-${K}`, (g) => g.line(bx + 7, by + 7, bx + 5, by + 30, opts(311, { stroke: COLORS.orange, strokeWidth: 1.5 })));
      this.cache.draw(`bl2-${K}`, (g) => g.line(bx + bw - 7, by + 7, bx + bw - 5, by + 30, opts(312, { stroke: COLORS.orange, strokeWidth: 1.5 })));

      // telescope on a tripod, pointed up at the sky
      const tx = bx + bw * 0.17;
      const ty = by - 6;
      this.cache.draw(`tri-${K}`, (g) => g.path(
        `M ${tx - 8} ${ty} l 7 -16 M ${tx + 8} ${ty} l -6 -16 M ${tx} ${ty} l 0 -15`,
        opts(320, { stroke: COLORS.muted, strokeWidth: 1.3 }),
      ));
      this.cache.draw(`tube-${K}`, (g) => g.path(
        `M ${tx - 12} ${ty - 14} l 30 -20 l 7 10 l -30 20 Z`,
        opts(321, { stroke: COLORS.cyan, strokeWidth: 1.6 }),
      ));
      this.cache.draw(`tube2-${K}`, (g) => g.line(tx + 18, ty - 34, tx + 26, ty - 39, opts(322, { stroke: COLORS.cyan, strokeWidth: 1.3 })));

      // guitar leaning against the bench
      const gx = bx + bw * 0.52;
      const gy = by - 4;
      this.cache.draw(`gbody-${K}`, (g) => g.path(
        `M ${gx} ${gy} q -11 -6 -10 -16 q 1 -9 10 -9 q 9 0 10 9 q 1 10 -10 16 Z`,
        opts(330, { stroke: COLORS.pink, strokeWidth: 1.5 }),
      ));
      this.cache.draw(`gneck-${K}`, (g) => g.line(gx, gy - 25, gx + 3, gy - 52, opts(331, { stroke: COLORS.pink, strokeWidth: 1.5 })));
      this.cache.draw(`ghead-${K}`, (g) => g.rectangle(gx + 1, gy - 58, 7, 8, opts(332, { stroke: COLORS.pink, strokeWidth: 1.2 })));
      this.cache.draw(`ghole-${K}`, (g) => g.circle(gx, gy - 12, 7, opts(333, { stroke: COLORS.pink, strokeWidth: 1.1 })));

      // a circuit board with a blinking LED, and a small stack of books
      const cx = bx + bw * 0.80;
      const cy = by - 12;
      this.cache.draw(`pcb-${K}`, (g) => g.rectangle(cx - 13, cy, 26, 12, opts(340, { stroke: COLORS.green, strokeWidth: 1.3 })));
      this.cache.draw(`pcbt-${K}`, (g) => g.path(
        `M ${cx - 9} ${cy + 4} l 7 0 l 0 5 l 8 0 M ${cx - 9} ${cy + 9} l 4 0`,
        opts(341, { stroke: COLORS.green, strokeWidth: 0.9 }),
      ));
      const blink = 0.35 + 0.65 * (Math.sin(this.t * 3.4) > 0.2 ? 1 : 0.15);
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.fillStyle = COLORS.red;
      ctx.beginPath();
      ctx.arc(cx + 9, cy + 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const kx = bx + bw * 0.97;
      [COLORS.yellow, COLORS.cyan, COLORS.pink].forEach((col, i) => {
        this.cache.draw(`book-${i}-${K}`, (g) => g.rectangle(kx - 2 - i, by - 7 - i * 6, 22 + i * 2, 6,
          opts(350 + i, { stroke: col, strokeWidth: 1.2 })));
      });

    }

    // Him, the dog, the fire, the lantern.
    drawFireAndFriends(compact) {
      const { rc, ctx, w, h } = this;
      const s = compact ? 0.72 : 0.95;
      const groundY = h * 0.92;
      const px = w * 0.115;
      const headY = groundY - 51 * s;

      // the fire, and the light it throws
      const fx = w * 0.195;
      const fy = groundY - 4;
      const flick = 0.78 + 0.22 * Math.sin(this.t * 7.3) * Math.sin(this.t * 3.1);
      const fireA = 0.35 + 0.65 * this.night;
      ctx.save();
      ctx.globalAlpha = fireA;
      const fg = ctx.createRadialGradient(fx, fy - 10, 2, fx, fy - 10, 88 * flick);
      fg.addColorStop(0, rgba(COLORS.orange, 0.30));
      fg.addColorStop(1, rgba(COLORS.orange, 0));
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy - 10, 88 * flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // logs
      rc.line(fx - 15, fy, fx + 15, fy - 5, opts(360, { stroke: COLORS.orange, strokeWidth: 2 }));
      rc.line(fx - 15, fy - 5, fx + 15, fy, opts(361, { stroke: COLORS.orange, strokeWidth: 2 }));
      // flames
      for (let i = 0; i < 3; i++) {
        const fh = (16 + i * 5) * flick;
        const off = (i - 1) * 6;
        rc.path(
          `M ${fx + off - 5} ${fy - 4} q ${4 + Math.sin(this.t * 6 + i) * 3} ${-fh * 0.6} 5 ${-fh} q ${3} ${fh * 0.55} 5 ${fh}`,
          opts(365 + i, { stroke: i === 1 ? COLORS.yellow : COLORS.red, strokeWidth: 1.5 }),
        );
      }
      // sparks going up
      ctx.save();
      for (let i = 0; i < 9; i++) {
        const ph = (this.t * 0.65 + h01(i * 23)) % 1;
        ctx.globalAlpha = (1 - ph) * 0.85 * fireA;
        ctx.fillStyle = COLORS.yellow;
        ctx.beginPath();
        ctx.arc(fx + (h01(i * 29) - 0.5) * 26 * ph + this.wind * ph * 26, fy - 12 - ph * 70, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // him, sitting-ish next to it
      stickFigure(rc, px, headY, { scale: s, seed: 370, color: COLORS.ink });

      // the dog, trotting back and forth between him and the bench
      const tr = (Math.sin(this.t * 0.55) + 1) / 2;
      const dx = mix(w * 0.155, w * 0.245, tr);
      const dir = Math.cos(this.t * 0.55) >= 0 ? 1 : -1;
      const dy = groundY - 4;
      const bob = Math.sin(this.t * 6) * 1.6;
      const dcol = COLORS.orange;
      const dopt = (n) => opts(n, { stroke: dcol, strokeWidth: 1.6 });
      // body
      rc.ellipse(dx, dy - 10 + bob, 30, 15, dopt(380));
      // head
      rc.circle(dx + dir * 20, dy - 18 + bob, 15, dopt(381));
      // snout + ear
      rc.line(dx + dir * 26, dy - 16 + bob, dx + dir * 33, dy - 15 + bob, dopt(382));
      rc.line(dx + dir * 16, dy - 24 + bob, dx + dir * 13, dy - 31 + bob, dopt(383));
      // legs
      const gait = Math.sin(this.t * 6) * 4;
      rc.line(dx - 8, dy - 5 + bob, dx - 8 + gait, dy + 4, dopt(384));
      rc.line(dx + 8, dy - 5 + bob, dx + 8 - gait, dy + 4, dopt(385));
      // tail, wagging
      const wag = Math.sin(this.t * 9) * 7;
      rc.path(`M ${dx - dir * 15} ${dy - 14 + bob} q ${-dir * 8} ${-8 + wag} ${-dir * 12} ${-15 + wag}`, dopt(386));

      // a lantern hung on a hook by the bench, on after dark
      const lx = w * 0.253;
      const ly = groundY - 62;
      const la = this.lampHouse;
      if (la > 0.02) {
        ctx.save();
        ctx.globalAlpha = la;
        const lg = ctx.createRadialGradient(lx, ly + 8, 1, lx, ly + 8, 46);
        lg.addColorStop(0, rgba(COLORS.yellow, 0.26));
        lg.addColorStop(1, rgba(COLORS.yellow, 0));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, ly + 8, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      rc.line(lx, ly - 16, lx, ly - 2, opts(390, { stroke: COLORS.muted, strokeWidth: 1.2 }));
      rc.path(`M ${lx - 8} ${ly - 2} l 16 0 l -2 18 l -12 0 Z`, opts(391, { stroke: COLORS.yellow, strokeWidth: 1.4 }));
    }

    drawForeground(compact) {
      const { w, h } = this;
      const K = `${w}x${h}`;
      // grass tufts along the bottom
      for (let i = 0; i < 26; i++) {
        const gx = h01(i * 37) * w;
        const gy = h - 6 - h01(i * 41) * 16;
        const sw = Math.sin(this.t * 1.6 + i) * this.wind * 3;
        this.cache.draw(`tuft-${i}-${K}`, (g) => g.path(
          `M ${gx} ${gy} l -4 -9 M ${gx} ${gy} l 0 -12 M ${gx} ${gy} l 4 -9`,
          opts(400 + i, { stroke: COLORS.green, strokeWidth: 1.1 }),
        ));
        // a swaying blade on top, drawn fresh so it moves
        this.rc.line(gx, gy, gx + sw, gy - 15, opts(430 + i, { stroke: COLORS.green, strokeWidth: 1 }));
      }
      // a few flowers
      for (let i = 0; i < 7; i++) {
        const fx = h01(i * 53) * w * 0.95 + w * 0.02;
        const fy = h - 18 - h01(i * 59) * 22;
        const col = [COLORS.pink, COLORS.yellow, COLORS.cyan][i % 3];
        this.cache.draw(`fl-${i}-${K}`, (g) => g.line(fx, fy, fx, fy - 13, opts(460 + i, { stroke: COLORS.green, strokeWidth: 1 })));
        this.cache.draw(`flh-${i}-${K}`, (g) => g.circle(fx, fy - 16, 7, opts(470 + i, { stroke: col, strokeWidth: 1.2 })));
      }
      // three stones
      for (let i = 0; i < 3; i++) {
        const sx = w * (0.44 + i * 0.05);
        const sy = h - 14 - (i % 2) * 6;
        this.cache.draw(`st-${i}-${K}`, (g) => g.ellipse(sx, sy, 20 + i * 5, 11, opts(480 + i, {
          stroke: COLORS.muted, strokeWidth: 1.2, fill: COLORS.muted, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 5,
        })));
      }
    }

    // Birds by day, fireflies by night.
    drawCritters(compact) {
      const { rc, ctx, w, h } = this;
      const d = this.daylight;
      const hz = this.horizon;

      if (d > 0.25) {
        ctx.save();
        ctx.globalAlpha = smooth(0.25, 0.5, d);
        const span = w + 200;
        const bx = ((this.t * 22) % span) - 100;
        for (let i = 0; i < 5; i++) {
          const ox = bx - i * 20 - (i % 2) * 8;
          const oy = hz * 0.30 + (i % 2) * 12 + Math.sin(this.t * 1.4 + i) * 3;
          const flap = Math.sin(this.t * 5.5 + i * 0.7) * 4;
          rc.path(`M ${ox - 8} ${oy} q 8 ${-6 - flap} 16 0 M ${ox + 8} ${oy} q 8 ${-6 + flap} 16 0`,
            opts(490 + i, { stroke: COLORS.ink, strokeWidth: 1.2 }));
        }
        ctx.restore();
      }

      const fa = smooth(0.6, 0.95, this.night);
      if (fa > 0.02) {
        ctx.save();
        for (let i = 0; i < 16; i++) {
          const ph = this.t * (0.28 + h01(i * 61) * 0.3) + h01(i * 67) * 7;
          const fx = w * (0.05 + h01(i * 71) * 0.90) + Math.sin(ph) * 26;
          const fy = h * (0.62 + h01(i * 73) * 0.30) + Math.cos(ph * 1.3) * 16;
          const pulse = Math.max(0, Math.sin(this.t * 2.4 + h01(i * 79) * 6));
          ctx.globalAlpha = fa * pulse * 0.9;
          ctx.fillStyle = COLORS.yellow;
          ctx.beginPath();
          ctx.arc(fx, fy, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    /* ===== the words ===== */

    // Keep a centred label inside the canvas.
    clampX(text, x, size, font = FONT_HAND) {
      const { ctx, w } = this;
      ctx.font = `${size}px ${font}`;
      const half = ctx.measureText(text).width / 2;
      if (half * 2 > w - 10) return w / 2;
      return Math.max(half + 6, Math.min(w - half - 6, x));
    }

    drawLabels(compact) {
      const { ctx, w, h } = this;
      const s1 = compact ? 14 : 19;
      const s2 = compact ? 11 : 13;

      label(ctx, ME.caption1, 18, compact ? 24 : 30, { color: COLORS.pink, size: s1 });
      label(ctx, ME.caption2, 18, compact ? 40 : 52, { color: COLORS.pink, size: s1 });

      const line = compact
        ? `${ME.role} · ${ME.city}`
        : `${ME.role} · ${ME.city} · ${ME.modes}`;
      label(ctx, line, w - 16, h - (compact ? 12 : 16),
        { color: COLORS.green, size: s2, align: 'right' });
    }
  }

  A.register('theYard', TheYardSim);
})();
