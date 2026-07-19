// Sim 1 — Anatomy of a black hole + free-particle sandbox.
//
// Physics: Schwarzschild geometry, worked in geometric units (r in r_s,
// τ in r_s/c, c = 1, GM = 1/2). Ring radii ARE drawn to scale (1 : 1.5 : 3).
//
// Sandbox particles follow the EXACT timelike equatorial geodesic
// (L = r²·dφ/dτ is conserved):
//   dr/dτ  = v_r
//   dv_r/dτ = −1/(2r²) + L²/r³ − (3/2)·L²/r⁴     (the last term is GR's own)
//   dφ/dτ  = L/r²
// Circular orbits need L² = r²/(2r−3) — real solutions only for r > 1.5, and
// stability only for r ≥ 3 (the ISCO). None of that is scripted here: it
// emerges from the integration when you click and fling.
// Conserved energy per unit mass: E² = v_r² + (1−1/r)(1+L²/r²); E ≥ 1 ⇒ unbound.
//
// The Earth/Sun presets draw the REAL body instead: a mass is only a black
// hole if it is compressed inside its own r_s, and neither is (or will be).

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, sparkle, notToScale,
    slider, buttonRow, actionButton, setReadout, rk4,
    M_SUN, M_EARTH, M_SGRA, M_M87, R_EARTH, R_SUN, AU, LY,
    schwarzschildRadius, fmtLen, fmtNum, sci,
  } = A;

  const DISK_N = 22;
  const DISK_COLORS = [COLORS.orange, COLORS.yellow, COLORS.red, COLORS.pink];
  const PART_COLORS = [COLORS.cyan, COLORS.pink, COLORS.yellow, COLORS.green, COLORS.orange, COLORS.red];
  const MAX_PARTS = 12;
  const TAU_RATE = 4.0;       // geodesic proper-time units per wall second
  const VEL_PER_PX = 0.004;   // fling: drag pixels → velocity (units of c)
  const CAPTURE_R = 1.03;     // just above the horizon (coordinates freeze there)

  const OBJECTS = {
    earth: {
      kind: 'body', M: M_EARTH, R: R_EARTH, color: COLORS.green,
      name: 'Earth — NOT a black hole',
      blurb: 'crush the whole planet smaller than a marble and it would become one',
    },
    sun: {
      kind: 'body', M: M_SUN, R: R_SUN, color: COLORS.yellow,
      name: 'the Sun — NOT a black hole',
      blurb: 'too light to ever collapse this far; its true fate is a white dwarf',
    },
    sgra: { kind: 'bh', M: M_SGRA, name: 'Sgr A* — the black hole at the center of our galaxy' },
    m87: { kind: 'bh', M: M_M87, name: 'M87* — the first black hole ever photographed (2019)' },
  };

  // Anchors for the "that's about …" comparison line.
  const ANCHORS = [
    [8848, 'Mount Everest'],
    [R_EARTH, "Earth's radius"],
    [3.844e8, 'the Earth–Moon distance'],
    [R_SUN, "the Sun's radius"],
    [AU, 'the Earth–Sun distance'],
    [4.5e12, "Neptune's orbit"],
    [LY, 'a light-year'],
  ];

  function compare(rs) {
    let best = ANCHORS[0];
    for (const a of ANCHORS) {
      if (rs / a[0] >= 0.15) best = a;
    }
    const ratio = rs / best[0];
    const shown = ratio >= 10 ? fmtNum(ratio, 0) : fmtNum(ratio, 1);
    return `≈ ${shown} × ${best[1]}`;
  }

  // Exact geodesic derivative (state [r, vr, phi]) for a given L.
  function geoDeriv(L) {
    const L2 = L * L;
    return (_t, [r, vr]) => [
      vr,
      -1 / (2 * r * r) + L2 / (r * r * r) - 1.5 * L2 / (r * r * r * r),
      L / (r * r),
    ];
  }

  class BlackHoleSim extends Sim {
    init() {
      this.objKey = 'sgra';
      this.obj = OBJECTS.sgra;
      this.M = this.obj.M;
      this.view = 'diagram'; // 'diagram' | 'telescope'
      this.t = 0;
      this.parts = [];   // sandbox particles
      this.drag = null;  // aim state
      this._colorIdx = 0;

      // ambient accretion-disk doodle particles (r in units of r_s)
      this.disk = [];
      for (let i = 0; i < DISK_N; i++) {
        this.disk.push({
          r: 3.15 + ((i * 0.61803) % 1) * 1.15,
          phase: ((i * 2.399) % (Math.PI * 2)),
          color: DISK_COLORS[i % DISK_COLORS.length],
        });
      }

      this.buildControls();
      this.bindPointer();
      this.updateReadout();
    }

    get kind() { return this.obj.kind === 'body' ? 'body' : 'bh'; }
    get rsPx() {
      const compact = this.w < 700;
      return Math.min(this.w, this.h) * (compact ? 0.09 : 0.105);
    }
    get center() {
      const compact = this.w < 700;
      return [this.w / 2, this.h / 2 + (compact ? 6 : 4)];
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.massSlider = slider(c, {
        label: 'mass',
        min: 1,
        max: 1e10,
        value: this.M / M_SUN,
        log: true,
        format: (v) => `${sci(v, 1)} M☉`,
        oninput: (v) => {
          this.M = v * M_SUN;
          this.obj = { kind: 'bh', M: this.M, name: 'custom black hole' };
          this.objKey = 'custom';
          this.presets.select('custom');
          this.updateReadout();
          this.poke();
        },
      });
      this.presets = buttonRow(c, [
        { label: 'Earth', value: 'earth' },
        { label: 'the Sun', value: 'sun' },
        { label: 'Sgr A*', value: 'sgra' },
        { label: 'M87*', value: 'm87' },
      ], {
        initial: 'sgra',
        onSelect: (v) => {
          this.objKey = v;
          this.obj = OBJECTS[v];
          this.M = this.obj.M;
          this.massSlider.set(this.M / M_SUN);
          if (this.kind === 'body') this.parts.length = 0;
          this.updateReadout();
          this.poke();
        },
      });
      this.viewBtns = buttonRow(c, [
        { label: 'diagram view', value: 'diagram' },
        { label: 'telescope view (X-ray)', value: 'telescope' },
      ], {
        initial: 'diagram',
        onSelect: (v) => { this.view = v; this.poke(); },
      });
      actionButton(c, 'clear particles', () => {
        this.parts.length = 0;
        this.poke();
      });
    }

    /* ---------------- sandbox: pointer → particles ---------------- */

    bindPointer() {
      const cv = this.canvasEl;
      const pos = (e) => {
        const rect = cv.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
      };
      cv.addEventListener('pointerdown', (e) => {
        if (this.kind !== 'bh') return;
        const [x, y] = pos(e);
        this.drag = { x0: x, y0: y, x, y };
        try { cv.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
        this.poke();
      });
      cv.addEventListener('pointermove', (e) => {
        if (!this.drag) return;
        const [x, y] = pos(e);
        this.drag.x = x;
        this.drag.y = y;
        this.poke();
      });
      const finish = (e) => {
        if (!this.drag) return;
        this.spawnFromDrag(this.drag);
        this.drag = null;
        this.poke();
      };
      cv.addEventListener('pointerup', finish);
      cv.addEventListener('pointercancel', () => { this.drag = null; });
    }

    spawnFromDrag(d) {
      const [cx, cy] = this.center;
      const rsPx = this.rsPx;
      const rx = (d.x0 - cx) / rsPx;
      const ry = (d.y0 - cy) / rsPx;
      const r = Math.hypot(rx, ry);
      if (r <= CAPTURE_R) return; // inside the hole — nothing to drop
      const phi = Math.atan2(ry, rx);

      const dx = d.x - d.x0;
      const dy = d.y - d.y0;
      const dragLen = Math.hypot(dx, dy);

      let vr;
      let L;
      let note = null;
      if (dragLen < 7) {
        // plain click: exact circular-orbit angular momentum (prograde)
        if (r > 1.55) {
          L = r / Math.sqrt(2 * r - 3);
          // orbits between the photon sphere and the ISCO are UNSTABLE —
          // a whisper of a perturbation reveals it
          vr = r < 3 ? -0.002 : 0;
          if (r < 3) note = 'inside the ISCO — no stable orbit!';
        } else {
          L = 0; // this deep, we just let go from rest
          vr = 0;
          note = 'released at rest — straight down';
        }
      } else {
        // fling: drag vector → velocity, decomposed into radial + tangential
        let vx = dx * VEL_PER_PX;
        let vy = dy * VEL_PER_PX;
        const speed = Math.hypot(vx, vy);
        if (speed > 1.2) { // cap the fling
          vx *= 1.2 / speed;
          vy *= 1.2 / speed;
        }
        const cosP = Math.cos(phi);
        const sinP = Math.sin(phi);
        vr = vx * cosP + vy * sinP;
        const vt = -vx * sinP + vy * cosP;
        L = r * vt;
      }

      if (this.parts.length >= MAX_PARTS) this.parts.shift();
      this.parts.push({
        r, vr, phi, L,
        color: PART_COLORS[this._colorIdx++ % PART_COLORS.length],
        trail: [],
        state: 'live',
        stateAt: this.t,
        note,
        noteUntil: note ? this.t + 3 : 0,
      });
    }

    /* ---------------- physics ---------------- */

    update(dt) {
      this.t += dt;
      if (this.kind !== 'bh') return;

      // ambient disk: Kepler-ish ω ∝ r^(−3/2)
      for (const d of this.disk) {
        d.phase += dt * 1.05 * Math.pow(d.r / 3, -1.5);
      }

      const escR = (Math.max(this.w, this.h) * 0.75) / this.rsPx + 2;
      const dTau = dt * TAU_RATE;
      for (const p of this.parts) {
        if (p.state !== 'live') continue;
        const deriv = geoDeriv(p.L);
        let remaining = dTau;
        let guard = 0;
        while (remaining > 1e-9 && guard++ < 500) {
          // smaller steps near the horizon, where derivatives blow up
          const h = Math.min(0.03, 0.005 + 0.01 * (p.r - 1), remaining);
          remaining -= h;
          let state = [p.r, p.vr, p.phi];
          state = rk4(state, deriv, 0, h);
          [p.r, p.vr, p.phi] = state;
          if (p.r <= CAPTURE_R) {
            p.state = 'captured';
            p.stateAt = this.t;
            break;
          }
        }
        if (p.state === 'live' && p.r > escR && p.vr > 0) {
          // conserved energy decides: unbound leaves for good, bound comes back
          const E2 = p.vr * p.vr + (1 - 1 / p.r) * (1 + (p.L * p.L) / (p.r * p.r));
          if (E2 >= 1) {
            p.state = 'escaped';
            p.stateAt = this.t;
          }
        }
        p.trail.push([p.r, p.phi]);
        if (p.trail.length > 260) p.trail.shift();
      }
      // remove faded particles
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        if (p.state !== 'live' && this.t - p.stateAt > 2) this.parts.splice(i, 1);
      }
    }

    /* ---------------- readout ---------------- */

    updateReadout() {
      const rs = schwarzschildRadius(this.M);
      if (this.kind === 'body') {
        const ratio = this.obj.R / rs;
        setReadout(this.readoutEl, [
          [[this.obj.name, 'yellow'], [` — ${this.obj.blurb}`, null]],
          [
            ['its Schwarzschild radius r_s = ', null], [fmtLen(rs), 'cyan'],
            ['   its actual radius = ', null], [fmtLen(this.obj.R), 'green'],
            ['   → ', null], [`${sci(ratio, 1)}× too big to be a black hole`, 'orange'],
          ],
          [['a mass becomes a black hole only if ALL of it is squeezed inside its own r_s — no horizon forms otherwise.', null]],
        ]);
      } else {
        setReadout(this.readoutEl, [
          [[`${this.obj.name}`, 'yellow']],
          [
            ['event horizon r_s = ', null], [fmtLen(rs), 'cyan'],
            ['   photon sphere = ', null], [fmtLen(1.5 * rs), 'cyan'],
            ['   ISCO = ', null], [fmtLen(3 * rs), 'green'],
            [`   (that horizon is ${compare(rs)})`, null],
          ],
          [['sandbox: ', 'yellow'], ['click = drop a particle in a circular orbit · drag = fling it · its fate comes from the exact geodesic equation', null]],
        ]);
      }
    }

    /* ---------------- drawing ---------------- */

    render() {
      if (this.kind === 'body') this.renderBody();
      else if (this.view === 'telescope') this.renderTelescope();
      else this.renderBH();
    }

    renderBody() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const [cx, cy] = this.center;
      const R = Math.min(w, h) * 0.31;
      const o = this.obj;
      const rs = schwarzschildRadius(this.M);

      if (this.objKey === 'sun') {
        this.cache.draw(`sunbody-${w}x${h}`, (g) => g.circle(cx, cy, R * 2, opts(140, {
          stroke: COLORS.yellow, strokeWidth: 2.2,
          fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.9, hachureGap: 9,
        })));
        // doodle rays
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + 0.2;
          this.cache.draw(`ray-${i}-${w}x${h}`, (g) => g.line(
            cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12),
            cx + Math.cos(a) * (R + 30), cy + Math.sin(a) * (R + 30),
            opts(150 + i, { stroke: COLORS.yellow, strokeWidth: 1.6 }),
          ));
        }
      } else {
        this.cache.draw(`earthbody-${w}x${h}`, (g) => g.circle(cx, cy, R * 2, opts(141, {
          stroke: COLORS.cyan, strokeWidth: 2.2,
        })));
        // doodle continents
        this.cache.draw(`cont1-${w}x${h}`, (g) => g.path(
          `M ${cx - R * 0.5} ${cy - R * 0.35} q ${R * 0.25} ${-R * 0.3} ${R * 0.55} ${-R * 0.05} q ${R * 0.2} ${R * 0.2} ${-R * 0.05} ${R * 0.35} q ${-R * 0.35} ${R * 0.15} ${-R * 0.5} ${-R * 0.3} z`,
          opts(142, { stroke: COLORS.green, strokeWidth: 1.6, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 7 }),
        ));
        this.cache.draw(`cont2-${w}x${h}`, (g) => g.path(
          `M ${cx + R * 0.1} ${cy + R * 0.25} q ${R * 0.3} ${-R * 0.1} ${R * 0.38} ${R * 0.18} q ${-R * 0.15} ${R * 0.28} ${-R * 0.42} ${R * 0.12} q ${-R * 0.1} ${-R * 0.2} ${0.04} ${-R * 0.3} z`,
          opts(143, { stroke: COLORS.green, strokeWidth: 1.6, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 7 }),
        ));
      }

      // the r_s dot — drawn 3 px so you can see it at all
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      const lx = compact ? 12 : cx + R + 24;
      const ly = compact ? 30 : cy - 40;
      label(ctx, `its r_s = ${fmtLen(rs)} — the dot in the middle`, lx, ly, { color: COLORS.ink, size: compact ? 13 : 15 });
      label(ctx, `(really ${sci(o.R / rs, 1)}× smaller than the body — invisible at true scale)`, lx, ly + 20, { color: COLORS.muted, size: compact ? 12 : 13.5 });
      if (!compact) doodleArrow(rc, cx + R + 18, cy - 32, cx + 8, cy - 4, { color: COLORS.muted, seed: 160 });

      label(ctx, 'NOT a black hole', cx, cy + R + (compact ? 30 : 38), { color: COLORS.red, size: compact ? 16 : 19, align: 'center' });
      label(ctx, 'nothing here is compressed inside its own r_s — so no horizon, no hole', cx, cy + R + (compact ? 48 : 60), { color: COLORS.muted, size: compact ? 12 : 13.5, align: 'center' });
      notToScale(rc, ctx, compact ? w - 70 : w - 90, 26);

      // scale bar shows the BODY radius in this mode
      const bx = 16;
      const by = h - 24;
      const barLen = R;
      this.cache.draw(`bodybar-${w}x${h}`, (g) => g.path(
        `M ${bx} ${by} L ${bx + barLen} ${by} M ${bx} ${by - 5} L ${bx} ${by + 5} M ${bx + barLen} ${by - 5} L ${bx + barLen} ${by + 5}`,
        opts(161, { stroke: COLORS.yellow, strokeWidth: 1.8 }),
      ));
      label(ctx, `R = ${fmtLen(o.R)}`, bx + barLen + 10, by + 4, { color: COLORS.yellow, size: 14 });
    }

    // Sandbox particles + trails + the aim arrow — shared by both BH views.
    drawSandbox(cx, cy, px) {
      const { rc, ctx, w, h } = this;
      for (const p of this.parts) {
        if (p.trail.length > 1) {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let i = 0; i < p.trail.length; i++) {
            const [tr, tphi] = p.trail[i];
            const x = cx + Math.cos(tphi) * px(tr);
            const y = cy + Math.sin(tphi) * px(tr);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const x = cx + Math.cos(p.phi) * px(p.r);
        const y = cy + Math.sin(p.phi) * px(p.r);
        if (p.state === 'live') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          if (p.note && this.t < p.noteUntil) {
            label(ctx, p.note, x + 10, y - 8, { color: p.color, size: 12.5 });
          }
        } else {
          const fade = Math.max(0, 1 - (this.t - p.stateAt) / 1.6);
          ctx.globalAlpha = fade;
          label(
            ctx,
            p.state === 'captured' ? 'captured!' : 'flew off — unbound!',
            p.state === 'captured' ? cx : Math.min(Math.max(x, 60), w - 60),
            p.state === 'captured' ? cy - px(1.3) : Math.min(Math.max(y, 24), h - 10),
            { color: p.state === 'captured' ? COLORS.red : p.color, size: 14, align: 'center' },
          );
          ctx.globalAlpha = 1;
        }
      }

      if (this.drag) {
        const d = this.drag;
        const len = Math.hypot(d.x - d.x0, d.y - d.y0);
        ctx.fillStyle = COLORS.ink;
        ctx.beginPath();
        ctx.arc(d.x0, d.y0, 4, 0, Math.PI * 2);
        ctx.fill();
        if (len >= 7) {
          doodleArrow(rc, d.x0, d.y0, d.x, d.y, { color: COLORS.yellow, seed: 170 });
          const v = Math.min(len * VEL_PER_PX, 1.2);
          label(ctx, `fling at ${fmtNum(v, 2)} c`, d.x + 12, d.y - 8, { color: COLORS.yellow, size: 13 });
        } else {
          label(ctx, 'release: circular orbit here', d.x0 + 12, d.y0 - 10, { color: COLORS.yellow, size: 13 });
        }
      }
    }

    // What a telescope actually catches: nothing from the hole itself — X-rays
    // from the million-degree inner disk, framing the photon ring + shadow
    // (apparent radius √27/2 ≈ 2.6 r_s — the geometry the EHT photographed).
    renderTelescope() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const [cx, cy] = this.center;
      const rsPx = this.rsPx;
      const px = (rUnits) => rUnits * rsPx;
      const shadowR = 2.598; // √27/2, apparent photon-ring radius in r_s

      // deep-space starfield (deterministic, cached per size via seeds)
      for (let i = 0; i < 42; i++) {
        const sx = ((i * 0.7548776662) % 1) * w;
        const sy = ((i * 0.5698402910) % 1) * h;
        const d2 = (sx - cx) ** 2 + (sy - cy) ** 2;
        if (d2 < (px(shadowR) + 8) ** 2) continue; // not inside the shadow
        ctx.fillStyle = COLORS.ink;
        ctx.globalAlpha = 0.25 + ((i * 0.31) % 1) * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, ((i * 0.17) % 1) < 0.2 ? 1.6 : 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // X-ray glow of the disk: inner gas is hotter → brighter and bluer
      for (const d of this.disk) {
        const x = cx + Math.cos(d.phase) * px(d.r);
        const y = cy + Math.sin(d.phase) * px(d.r);
        const heat = 1 - (d.r - 3.15) / 1.15; // 1 at inner edge → 0 outside
        for (const [rr, aa] of [[7, 0.10], [4, 0.25], [2.2, 0.95]]) {
          ctx.fillStyle = heat > 0.55 ? '#dff6ff' : COLORS.cyan;
          ctx.globalAlpha = aa * (0.45 + 0.55 * heat);
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // photon ring + the shadow
      this.cache.draw(`shadow-${rsPx | 0}`, (g) => g.circle(cx, cy, px(shadowR) * 2, opts(45, {
        stroke: '#0a0a0a', strokeWidth: 1, fill: '#000000', fillStyle: 'solid',
      })));
      this.cache.draw(`photonring-${rsPx | 0}`, (g) => g.circle(cx, cy, px(shadowR) * 2, opts(46, {
        stroke: '#eaf9ff', strokeWidth: 2.6,
      })));

      this.drawSandbox(cx, cy, px);

      // annotations
      if (!compact) {
        label(ctx, 'photon ring — bent light piling up (apparent radius ≈ 2.6 r_s)', cx + px(2.6), cy - 140, { color: COLORS.cyan, size: 14.5 });
        doodleArrow(rc, cx + px(3.0), cy - 131, cx + px(shadowR) * 0.72, cy - px(shadowR) * 0.72, { color: COLORS.cyan, seed: 66 });
        label(ctx, 'the shadow — ≈ 5.2 r_s across', cx - px(4.4), cy - 140, { color: COLORS.muted, size: 14.5 });
        doodleArrow(rc, cx - px(3.4), cy - 131, cx - px(1.2), cy - px(1.2), { color: COLORS.muted, seed: 67 });
        label(ctx, 'X-rays from the million-degree disk', cx + px(3.2), cy + 140, { color: COLORS.ink, size: 14.5 });
        doodleArrow(rc, cx + px(3.6), cy + 131, cx + px(3.6), cy + px(1.4), { color: COLORS.muted, seed: 68 });
      } else {
        label(ctx, 'photon ring ≈ 2.6 r_s · shadow ≈ 5.2 r_s', 12, 22, { color: COLORS.cyan, size: 13 });
      }
      label(
        ctx,
        compact
          ? 'the hole emits nothing — we see the disk\'s X-rays'
          : 'the hole itself emits nothing — telescopes catch the disk\'s X-rays. This is how Cygnus X-1 gave black holes away (1972).',
        w / 2, h - 34,
        { color: COLORS.yellow, size: compact ? 12.5 : 14, align: 'center' },
      );

      // scale bar
      const rs = schwarzschildRadius(this.M);
      const bx = 16;
      const by = h - 14;
      this.cache.draw(`tbar-${rsPx | 0}`, (g) => g.path(
        `M ${bx} ${by} L ${bx + rsPx} ${by} M ${bx} ${by - 5} L ${bx} ${by + 5} M ${bx + rsPx} ${by - 5} L ${bx + rsPx} ${by + 5}`,
        opts(81, { stroke: COLORS.yellow, strokeWidth: 1.8 }),
      ));
      label(ctx, `r_s = ${fmtLen(rs)}`, bx + rsPx + 10, by + 4, { color: COLORS.yellow, size: 14 });
    }

    renderBH() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const [cx, cy] = this.center;
      const rsPx = this.rsPx;
      const px = (rUnits) => rUnits * rsPx;

      // ambient disk particles
      for (const d of this.disk) {
        const x = cx + Math.cos(d.phase) * px(d.r);
        const y = cy + Math.sin(d.phase) * px(d.r);
        ctx.fillStyle = d.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // rings (cached)
      this.cache.draw(`diskband-${rsPx | 0}`, (g) => g.circle(cx, cy, px(4.35) * 2, opts(40, {
        stroke: COLORS.muted, strokeWidth: 1, strokeLineDash: [2, 10],
      })));
      this.cache.draw(`isco-${rsPx | 0}`, (g) => g.circle(cx, cy, px(3) * 2, opts(41, {
        stroke: COLORS.green, strokeWidth: 1.8,
      })));
      this.cache.draw(`photon-${rsPx | 0}`, (g) => g.circle(cx, cy, px(1.5) * 2, opts(42, {
        stroke: COLORS.cyan, strokeWidth: 1.8, strokeLineDash: [7, 6],
      })));
      this.cache.draw(`horizon-${rsPx | 0}`, (g) => g.circle(cx, cy, px(1) * 2, opts(43, {
        stroke: COLORS.ink, strokeWidth: 2.4, fill: '#000000', fillStyle: 'solid',
      })));

      // singularity
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
      ctx.fill();

      this.drawSandbox(cx, cy, px);

      // ---- labels / legend ----
      if (compact) {
        const legend = [
          ['event horizon (r_s)', COLORS.ink],
          ['photon sphere (1.5 r_s)', COLORS.cyan],
          ['ISCO (3 r_s)', COLORS.green],
          ['accretion disk', COLORS.orange],
        ];
        let ly = 22;
        for (const [text, color] of legend) {
          label(ctx, text, 12, ly, { color, size: 13 });
          ly += 18;
        }
      } else {
        const L1 = px(1);
        label(ctx, 'singularity — where the equations give up', cx - px(4.4), cy - 116, { color: COLORS.ink, size: 15, align: 'left' });
        doodleArrow(rc, cx - px(3.6), cy - 108, cx - 6, cy - 6, { color: COLORS.muted, seed: 61 });
        label(ctx, 'event horizon — the point of no return', cx + px(2.4), cy - 132, { color: COLORS.ink, size: 15 });
        doodleArrow(rc, cx + px(2.9), cy - 124, cx + L1 * 0.62, cy - L1 * 0.62, { color: COLORS.muted, seed: 62 });
        label(ctx, 'photon sphere — light itself orbits here', cx - px(4.4), cy + 150, { color: COLORS.cyan, size: 15 });
        doodleArrow(rc, cx - px(3.4), cy + 141, cx - px(1.05), cy + px(1.05), { color: COLORS.cyan, seed: 63 });
        label(ctx, 'ISCO — the last stable orbit', cx + px(3.3), cy + 128, { color: COLORS.green, size: 15 });
        doodleArrow(rc, cx + px(3.5), cy + 119, cx + px(2.6), cy + px(1.5), { color: COLORS.green, seed: 64 });
        label(ctx, 'accretion disk (schematic)', cx - px(4.4), 26, { color: COLORS.orange, size: 15 });
        doodleArrow(rc, cx - px(3.6), 32, cx - px(2.7), cy - px(3.3), { color: COLORS.orange, seed: 65 });
        sparkle(rc, w - 50, 40, 7, { color: COLORS.pink, seed: 71 });
        sparkle(rc, w - 90, 70, 4, { color: COLORS.muted, seed: 72 });
      }

      // sandbox hint when empty
      if (!this.parts.length && !this.drag) {
        label(ctx, 'click: drop a particle in orbit · drag: fling it', w - 16, h - 12, {
          color: COLORS.yellow, size: compact ? 12.5 : 14, align: 'right',
        });
      }

      // scale bar (the ONLY thing that changes with mass)
      const rs = schwarzschildRadius(this.M);
      const bx = 16;
      const by = h - 24;
      this.cache.draw(`bar-${rsPx | 0}`, (g) => g.path(
        `M ${bx} ${by} L ${bx + rsPx} ${by} M ${bx} ${by - 5} L ${bx} ${by + 5} M ${bx + rsPx} ${by - 5} L ${bx + rsPx} ${by + 5}`,
        opts(80, { stroke: COLORS.yellow, strokeWidth: 1.8 }),
      ));
      label(ctx, `r_s = ${fmtLen(rs)}`, bx + rsPx + 10, by + 4, { color: COLORS.yellow, size: 14 });
      label(ctx, 'ring radii to scale — 1 : 1.5 : 3', bx, by - 14, { color: COLORS.muted, size: 12.5 });
    }
  }

  A.register('blackHole', BlackHoleSim);
})();
