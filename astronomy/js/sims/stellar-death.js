// Sim 23 — How a black hole forms (stellar death).
//
// One number decides everything: the star's birth mass. The sim animates the
// full life (main sequence → giant/supergiant → death event → remnant) and
// branches by mass:
//   < 8 M_sun   → planetary nebula + white dwarf (electron degeneracy;
//                 Chandrasekhar limit 1.4 M_sun; Earth-sized)
//   8–20 M_sun  → supernova + neutron star (neutron degeneracy; ~20 km;
//                 TOV limit ~2.2 M_sun)
//   > 20 M_sun  → core collapse → black hole (r_s = 2GM/c², computed live)
// Remnant masses use rough but standard relations; r_s is exact.
//
// SECOND PANEL — "how big are they really?" — added because the first panel was
// TELLING rather than SHOWING: it printed "Earth-sized" and "~20 km across" and
// drew a small circle. Those words mean nothing without something beside them.
// So the compare panel draws the remnants TO SCALE against things you know:
//   · a white dwarf against the Earth        (both ~10⁴ km — one shared scale)
//   · a neutron star and a stellar black hole against a CITY (~tens of km)
// Two separate scale bars, because 12 km and 12,000 km cannot honestly share
// one. Each bar states its own scale, and the "not to scale!" stamp is used only
// where something really is exaggerated.
//
// The density comparison is computed, not folklore. At rho = M/V for 1.4 M_sun
// in a 12 km radius:
//   a 5 ml teaspoon  ≈ 1.9×10¹² kg — about 326 Great Pyramids, NOT "a mountain"
//   2.08 litres      ≈ Mount Everest (8×10¹⁴ kg)
// The popular "one teaspoon weighs as much as a mountain" is off by a couple of
// orders of magnitude, so the sim says the honest version and shows the working.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, sparkle, blackbodyRGB, notToScale,
    slider, buttonRow, actionButton, setReadout, fmtNum, fmtLen, sci,
    G, C2, M_SUN, R_EARTH, R_SUN, schwarzschildRadius,
  } = A;

  const CHANDRA = 1.4;   // M_sun
  const TOV = 2.2;       // M_sun (approx)

  // NICER's X-ray timing of PSR J0030+0451 and J0740+6620 puts neutron-star
  // radii near 12 km; that is the value used for every size and density here.
  const NS_RADIUS = 1.2e4;            // m
  const CITY_RADIUS = 2.5e4;          // m — a 50 km metropolitan area
  const PYRAMID = 5.9e9;              // kg, the Great Pyramid of Giza
  const EVEREST = 8.0e14;             // kg, a standard order-of-magnitude estimate
  const TEASPOON = 5e-6;              // m³
  const BOTTLE = 2e-3;                // m³

  // White dwarfs get SMALLER as they get heavier — the degenerate mass-radius
  // relation R ∝ M^(−1/3). This approximation gives ~8,300 km at 0.6 M_sun,
  // i.e. a shade larger than Earth, which is the comparison the panel draws.
  const wdRadius = (mSun) => 0.01 * R_SUN * Math.pow(mSun, -1 / 3);

  // fmtLen switches to scientific notation above 10^4 km, which turns 16,497 and
  // 12,742 into "2×10⁴" and "1×10⁴" — making a 1.3× difference look like 2×.
  // These comparisons only work if the digits survive, so format them plainly.
  const km = (m) => `${fmtNum(m / 1000, 0)} km`;

  // rough remnant given birth mass
  function fate(M) {
    if (M < 8) {
      const wd = Math.min(CHANDRA, 0.4 + 0.1 * M); // white-dwarf mass grows slowly
      return { type: 'wd', remnant: wd };
    }
    if (M < 20) {
      const ns = Math.min(TOV, 1.2 + 0.03 * M);
      return { type: 'ns', remnant: ns };
    }
    const bh = Math.max(3, M * 0.35); // rough collapsed-core mass
    return { type: 'bh', remnant: bh };
  }

  class StellarDeathSim extends Sim {
    init() {
      this.mass = 25;   // default: a black-hole progenitor
      this.view = 'life';
      this.stage = 0;   // 0 idle; life runs 0→1 across phases
      this.running = false;
      this.phase = 0;   // 0 MS, 1 giant, 2 death, 3 remnant
      this.pt = 0;
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.viewBtns = buttonRow(c, [
        { label: 'run the life', value: 'life' },
        { label: 'how big are they really?', value: 'compare' },
      ], {
        initial: 'life',
        onSelect: (v) => {
          this.view = v;
          if (v === 'compare') this.cite('1939 Oppenheimer, Volkoff - On Massive Neutron Cores');
          this.cache.invalidate(); this.updateReadout(); this.poke();
        },
      });
      this.massSlider = slider(c, {
        label: 'the star\'s birth mass',
        min: 0.5, max: 100, value: this.mass, log: true,
        format: (v) => `${fmtNum(v, v < 10 ? 1 : 0)} M☉`,
        oninput: (v) => { this.mass = v; this.reset(); this.updateReadout(); this.poke(); },
      });
      actionButton(c, 'run its life', () => {
        this.running = true; this.phase = 0; this.pt = 0;
        const f = fate(this.mass);
        this.cite(f.type === 'bh' ? '1939 Oppenheimer, Snyder - On Continued Gravitational Contraction'
          : f.type === 'ns' ? '1934 Baade, Zwicky - On Super-Novae'
            : '1931 Chandrasekhar - The Maximum Mass of Ideal White Dwarfs');
      });
      actionButton(c, 'reset', () => { this.reset(); this.poke(); });
    }

    reset() { this.running = false; this.phase = 0; this.pt = 0; }

    updateReadout() {
      if (this.view === 'compare') return this.compareReadout();
      const f = fate(this.mass);
      const lines = [[['birth mass: ', null], [`${fmtNum(this.mass, this.mass < 10 ? 1 : 0)} M☉`, 'yellow'], ['   →   ', null]]];
      if (f.type === 'wd') {
        lines[0].push(['ends as a WHITE DWARF', 'green']);
        lines.push([
          ['a red giant puffs off a planetary nebula, leaving an Earth-sized ember of ', null],
          [`${fmtNum(f.remnant, 2)} M☉`, 'green'],
          [' held up by electron degeneracy. Nothing above ', null], ['1.4 M☉', 'pink'],
          [' (Chandrasekhar) can survive as one.', null],
        ]);
      } else if (f.type === 'ns') {
        lines[0].push(['ends as a NEUTRON STAR', 'cyan']);
        lines.push([
          ['a supernova blows the star apart, leaving a city-sized (~20 km) core of ', null],
          [`${fmtNum(f.remnant, 2)} M☉`, 'cyan'],
          [' — a teaspoon would weigh ~a billion tonnes. Above ~', null], ['2.2 M☉', 'pink'],
          [' (the TOV limit) even neutrons give way.', null],
        ]);
      } else {
        const rs = schwarzschildRadius(f.remnant * M_SUN);
        lines[0].push(['ends as a BLACK HOLE', 'red']);
        lines.push([
          ['no pressure can stop the core. It collapses past its Schwarzschild radius r_s = ', null],
          [fmtLen(rs), 'red'],
          [` (for a ~${fmtNum(f.remnant, 0)} M☉ hole) and an event horizon forms — Oppenheimer & Snyder, 1939.`, null],
        ]);
      }
      lines.push([['along the way, fusion + the supernova forged the heavy elements in your body. We are star stuff.', 'orange']]);
      setReadout(this.readoutEl, lines);
    }

    compareReadout() {
      const d = this.densities();
      const wd = wdRadius(0.6);
      setReadout(this.readoutEl, [
        [
          ['A white dwarf of 0.6 M☉ is ', null], [km(wd * 2), 'green'],
          [' across; the Earth is ', null], [km(R_EARTH * 2), 'cyan'],
          ['. So "Earth-sized" is literally true — and it gets SMALLER the heavier it is, because degenerate matter obeys R ∝ M^(−1/3). A 1.4 M☉ one would be only ', null],
          [km(wdRadius(1.4) * 2), 'green'], [' across.', null],
        ],
        [
          ['A neutron star is ', null], [km(NS_RADIUS * 2), 'cyan'],
          [' across — about the length of Manhattan. It does not sit comfortably inside a small town: against a 50 km metropolitan area it is roughly half the width, which is why the drawing uses a large city rather than the usual vague one. Its density is ', null],
          [`${sci(d.rho, 3)} kg/m³`, 'pink'],
          [', computed from 1.4 M☉ inside that radius.', null],
        ],
        [
          ['Now the famous claim, done honestly. One 5 ml teaspoon of that material weighs ', null],
          [`${sci(d.teaspoon, 3)} kg`, 'yellow'],
          [' — about ', null], [`${fmtNum(d.pyramids, 0)} Great Pyramids`, 'yellow'],
          ['. That is enormous, but it is NOT "as much as a mountain": Mount Everest is ~8×10¹⁴ kg, so you would need ', null],
          [`${fmtNum(d.everestVolume * 1000, 1)} litres`, 'orange'],
          [' — a large bottle, not a spoon. The usual line is off by a couple of hundred times, so this page says the number instead.', null],
        ],
        [
          ['And a stellar black hole is not the smallest thing here: at 2.95 km of horizon radius per solar mass, a 9 M☉ hole spans ', null],
          [km(schwarzschildRadius(9 * M_SUN) * 2), 'red'],
          [' — bigger than the neutron star it failed to become.', null],
        ],
      ]);
    }

    update(dt) {
      this.t += dt;
      if (this.running) {
        this.pt += dt;
        const durations = [1.4, 1.4, 1.6, 3]; // MS, giant, death, remnant
        if (this.pt > durations[this.phase]) {
          this.pt = 0;
          if (this.phase < 3) this.phase++;
          else this.running = false;
          if (this.phase === 3) this.updateReadout();
        }
      }
    }

    /* ---------------- panel 2: true-scale size comparisons ---------------- */

    densities() {
      const M = CHANDRA * M_SUN;
      const V = (4 / 3) * Math.PI * Math.pow(NS_RADIUS, 3);
      const rho = M / V;                       // kg/m³
      return {
        rho,
        teaspoon: rho * TEASPOON,
        bottle: rho * BOTTLE,
        pyramids: (rho * TEASPOON) / PYRAMID,
        everestVolume: EVEREST / rho,          // m³ of neutron star matter = Everest
      };
    }

    // A row of objects drawn at ONE shared scale, with its own scale bar. Every
    // radius passed in is in metres; nothing here is fudged.
    drawScaleRow(y, mPerPx, items, caption, compact) {
      const { rc, ctx, w } = this;
      let x = compact ? 56 : 92;
      for (const it of items) {
        const rpx = it.r / mPerPx;
        if (it.kind === 'city') {
          // a skyline, drawn at the same scale as the remnants beside it
          const width = (it.r * 2) / mPerPx;
          const base = y + 26;
          const n = 9;
          for (let i = 0; i < n; i++) {
            const bw = width / n;
            const bh = 10 + ((i * 7) % 5) * 5;
            const bx = x - width / 2 + i * bw;
            this.cache.draw(`bld-${i}-${y | 0}-${w}`, (g) => g.rectangle(bx, base - bh, bw * 0.78, bh,
              opts(500 + i, { stroke: COLORS.muted, strokeWidth: 1.1 })));
          }
          this.cache.draw(`ground-${y | 0}-${w}`, (g) => g.line(x - width / 2, base, x + width / 2, base,
            opts(520, { stroke: COLORS.muted, strokeWidth: 1.3 })));
        } else if (it.kind === 'hole') {
          rc.circle(x, y, Math.max(3, rpx * 2), opts(521, { stroke: COLORS.ink, strokeWidth: 1.8, fill: '#000000', fillStyle: 'solid' }));
          rc.circle(x, y, Math.max(5, rpx * 2.6), opts(522, { stroke: COLORS.red, strokeWidth: 1, strokeLineDash: [3, 4] }));
        } else if (it.kind === 'earth') {
          this.cache.draw(`cmp-earth-${y | 0}-${w}`, (g) => g.circle(x, y, Math.max(4, rpx * 2), opts(523, {
            stroke: COLORS.cyan, strokeWidth: 1.8, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 8,
          })));
        } else {
          rc.circle(x, y, Math.max(3, rpx * 2), opts(524, {
            stroke: it.color, strokeWidth: 1.8, fill: it.color, fillStyle: 'hachure', fillWeight: 0.6, hachureGap: 6,
          }));
        }
        label(ctx, it.name, x, y + Math.max(rpx, 14) + (it.kind === 'city' ? 42 : 20),
          { color: it.color, size: compact ? 10 : 12, align: 'center' });
        // On a phone the second line would fall into the citation chip's band —
        // and the readout underneath already states every one of these numbers.
        if (it.sub && !compact) {
          label(ctx, it.sub, x, y + Math.max(rpx, 14) + (it.kind === 'city' ? 56 : 34),
            { color: COLORS.muted, size: 10.5, align: 'center' });
        }
        x += Math.max(rpx * 2, 40) + (compact ? 54 : 96);
      }
      label(ctx, caption, compact ? 10 : 16, y - (compact ? 40 : 54),
        { color: COLORS.yellow, size: compact ? 10.5 : 12.5 });
    }

    renderCompare() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const d = this.densities();
      const f = fate(this.mass);
      const wdR = wdRadius(f.type === 'wd' ? f.remnant : 0.6);
      const bhR = schwarzschildRadius(Math.max(3, f.type === 'bh' ? f.remnant : 9) * M_SUN);

      label(ctx, 'drawn to scale — two scales, because 12 km and 12,000 km cannot share one',
        w / 2, compact ? 18 : 22, { color: COLORS.ink, size: compact ? 11 : 14, align: 'center' });

      // Each row picks its own scale from its LARGEST member, so the row always
      // fits whatever the mass slider is set to — a black hole at 100 M☉ is
      // 200 km across and at a fixed scale would swamp the canvas and bury the
      // captions. The scale is printed, so nothing is hidden by doing this.
      const budget = Math.min(w, h) * 0.15;    // px, radius of the biggest item

      // ---- row 1: planet-sized things ----
      const mPerPx1 = Math.max(R_EARTH, wdR) / budget;
      this.drawScaleRow(h * 0.26, mPerPx1, [
        { name: 'the Earth', r: R_EARTH, kind: 'earth', color: COLORS.cyan, sub: `${km(R_EARTH * 2)} across` },
        { name: 'a white dwarf', r: wdR, color: COLORS.green, sub: `${km(wdR * 2)} across` },
      ], `scale 1 — one pixel is ${km(mPerPx1)}`, compact);

      // ---- row 2: city-sized things ----
      // The city is a LARGE metropolitan area (50 km), not a 20 km one: a
      // neutron star is 24 km across, so against a small city it would be the
      // bigger object and the drawing would contradict the caption.
      // h*0.66, not 0.70: the city's sub-label hangs ~56 px below the row centre
      // and at 0.70 it landed inside the citation chip's band (h-26 … h-6).
      const mPerPx2 = Math.max(CITY_RADIUS, NS_RADIUS, bhR) / budget;
      this.drawScaleRow(h * 0.66, mPerPx2, [
        { name: 'a large city', r: CITY_RADIUS, kind: 'city', color: COLORS.muted, sub: `${km(CITY_RADIUS * 2)} across` },
        { name: 'a neutron star', r: NS_RADIUS, color: COLORS.cyan, sub: `${km(NS_RADIUS * 2)} across` },
        { name: 'a black hole', r: bhR, kind: 'hole', color: COLORS.red, sub: `horizon ${km(bhR * 2)} across` },
      ], `scale 2 — one pixel is ${fmtNum(mPerPx2, 0)} m`, compact);

      label(ctx, compact
        ? 'the white dwarf really is Earth-sized; the neutron star spans half a city'
        : 'a white dwarf really is a little bigger than the Earth — and a neutron star spans about half a large city, with the black hole it failed to become larger still',
        w / 2, h - (compact ? 34 : 40), { color: COLORS.muted, size: compact ? 9.5 : 12, align: 'center' });
    }

    render() {
      if (this.view === 'compare') return this.renderCompare();
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const cx = w * 0.5;
      const cy = h * 0.42;
      const f = fate(this.mass);
      const baseR = Math.min(w, h) * 0.16;
      const phase = this.running || this.phase > 0 ? this.phase : 0;

      // timeline strip of the 4 phases
      const labels = ['main sequence', f.type === 'wd' ? 'red giant' : 'supergiant', f.type === 'wd' ? 'planetary nebula' : 'SUPERNOVA', f.type === 'wd' ? 'white dwarf' : (f.type === 'ns' ? 'neutron star' : 'black hole')];
      for (let i = 0; i < 4; i++) {
        const tx = w * (0.14 + i * 0.24);
        const on = i === phase && (this.running || this.phase > 0);
        const done = i < phase;
        label(ctx, labels[i], tx, h - 18, { color: on ? COLORS.yellow : done ? COLORS.muted : '#555', size: compact ? 10 : 12, align: 'center' });
        if (i < 3) label(ctx, '→', w * (0.14 + i * 0.24) + w * 0.12, h - 18, { color: '#555', size: 12, align: 'center' });
      }

      // --- render the current phase ---
      if (phase === 0) {
        // main-sequence star, colour/size by mass
        const col = blackbodyRGB(Math.min(4000 + this.mass * 900, 42000));
        const r = baseR * (0.6 + Math.min(this.mass, 40) / 80);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        rc.circle(cx, cy, r * 2, opts(400, { stroke: COLORS.ink, strokeWidth: 1.6 }));
        label(ctx, `fusing hydrogen — ${fmtNum(this.mass, this.mass < 10 ? 1 : 0)} M☉`, cx, cy + r + 22, { color: COLORS.ink, size: 13, align: 'center' });
        if (!this.running && this.phase === 0) label(ctx, 'press "run its life"', cx, 26, { color: COLORS.yellow, size: 13.5, align: 'center' });
      } else if (phase === 1) {
        // giant / supergiant: big and cool
        const r = baseR * (f.type === 'wd' ? 2 : 2.4);
        ctx.fillStyle = blackbodyRGB(3400);
        ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        rc.circle(cx, cy, r * 2, opts(410, { stroke: COLORS.red, strokeWidth: 1.6 }));
        // tiny original size for scale
        rc.circle(cx, cy, baseR * 0.6, opts(411, { stroke: COLORS.muted, strokeWidth: 1, strokeLineDash: [3, 3] }));
        label(ctx, f.type === 'wd' ? 'swollen into a red giant — core hydrogen spent' : 'a red SUPERGIANT — fusing heavier elements toward iron', cx, cy + r + 16, { color: COLORS.red, size: compact ? 11 : 13, align: 'center' });
      } else if (phase === 2) {
        // death event
        const k = this.pt / 1.6;
        if (f.type === 'wd') {
          // planetary nebula: expanding gentle shells
          for (const rr of [1, 0.7, 0.45]) {
            ctx.globalAlpha = (1 - k) * 0.5;
            rc.circle(cx, cy, (baseR + k * 150) * rr * 2, opts(420 + (rr * 10 | 0), { stroke: COLORS.cyan, strokeWidth: 1.4 }));
          }
          ctx.globalAlpha = 1;
          label(ctx, 'a planetary nebula — the outer layers gently drift away', cx, cy + baseR + 40, { color: COLORS.cyan, size: compact ? 11 : 13, align: 'center' });
        } else {
          // supernova: violent flash
          for (const [rr, col] of [[1, COLORS.yellow], [0.7, COLORS.orange], [0.4, COLORS.red]]) {
            ctx.globalAlpha = Math.max(0, 0.9 - k);
            rc.circle(cx, cy, (baseR + k * 240) * rr * 2, opts(425 + (rr * 10 | 0), { stroke: col, strokeWidth: 2.2 }));
          }
          ctx.globalAlpha = 1;
          label(ctx, 'SUPERNOVA — briefly outshining the whole galaxy, forging gold & uranium', cx, cy + baseR + 40, { color: COLORS.yellow, size: compact ? 10.5 : 13, align: 'center' });
        }
      } else {
        // the remnant
        if (f.type === 'wd') {
          ctx.fillStyle = blackbodyRGB(15000);
          ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
          rc.circle(cx, cy, 22, opts(430, { stroke: COLORS.green, strokeWidth: 1.8 }));
          label(ctx, `WHITE DWARF · ${fmtNum(f.remnant, 2)} M☉ · Earth-sized`, cx, cy + 40, { color: COLORS.green, size: 13, align: 'center' });
          label(ctx, 'held up by electron degeneracy (max 1.4 M☉)', cx, cy + 58, { color: COLORS.muted, size: 11.5, align: 'center' });
        } else if (f.type === 'ns') {
          ctx.fillStyle = COLORS.cyan;
          ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
          rc.circle(cx, cy, 16, opts(431, { stroke: COLORS.cyan, strokeWidth: 2 }));
          label(ctx, `NEUTRON STAR · ${fmtNum(f.remnant, 2)} M☉ · ~20 km across`, cx, cy + 34, { color: COLORS.cyan, size: 13, align: 'center' });
          label(ctx, 'a teaspoon would weigh a billion tonnes', cx, cy + 52, { color: COLORS.muted, size: 11.5, align: 'center' });
        } else {
          const rs = schwarzschildRadius(f.remnant * M_SUN);
          // black disk with photon ring
          rc.circle(cx, cy, 44, opts(432, { stroke: '#eaf9ff', strokeWidth: 2 }));
          ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
          rc.circle(cx, cy, 52, opts(433, { stroke: COLORS.ink, strokeWidth: 1.4, strokeLineDash: [4, 4] }));
          label(ctx, `BLACK HOLE · ~${fmtNum(f.remnant, 0)} M☉ · horizon r_s = ${fmtLen(rs)}`, cx, cy + 68, { color: COLORS.red, size: compact ? 11.5 : 13, align: 'center' });
          label(ctx, 'no pressure can hold it up — gravity won completely', cx, cy + 86, { color: COLORS.muted, size: 11.5, align: 'center' });
        }
      }

      // mass-threshold guide (top)
      if (!compact) {
        label(ctx, '< 8 M☉ → white dwarf    ·    8–20 → neutron star    ·    > 20 → black hole', cx, 12, { color: COLORS.muted, size: 11.5, align: 'center' });
      }
      sparkle(rc, 30, 30, 6, { color: COLORS.pink, seed: 440 });
    }
  }

  A.register('stellarDeath', StellarDeathSim);
})();
