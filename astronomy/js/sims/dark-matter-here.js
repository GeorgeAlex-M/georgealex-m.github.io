// Sim 45 — Is dark matter HERE? (dark matter in your garden, and why it won't stay)
//
// Sim 11 shows dark matter from the outside: a rotation curve that will not fall
// off. This one answers the question that actually follows — "is any of it in my
// garden?" — with arithmetic instead of hand-waving.
//
// The local halo density is a MEASURED quantity: rho_local ~ 0.4 GeV/cm^3, from
// the vertical motions of stars near the Sun (the method Oort invented in 1932)
// and from the Galactic rotation curve. In SI that is
//     rho = 0.4 * 1.78266192e-27 kg / 1e-6 m^3 = 7.13e-22 kg/m^3
// so the dark-matter mass inside ANY volume is just rho * V. Every number in
// panel 1 is that one multiplication, and the results are the point:
//     a coffee cup   -> 2.1e-25 kg  (about eleven carbon atoms)
//     a person       -> 4.7e-23 kg
//     the whole Earth-> 0.77 kg     (LESS THAN A LITRE OF WATER)
// Earth's ordinary mass is 5.97e24 kg. So dark matter is here, it is passing
// through the room right now, and it is utterly irrelevant to anything local.
//
// Panel 2 turns the same density into a flux. n = rho/m_chi and v ~ 230 km/s
// give n*v particles per cm^2 per second; the particle MASS is unknown, so it is
// a slider rather than a constant, and the count moves by orders of magnitude as
// you drag it. That honesty matters: the flux is only as certain as the mass.
//
// Panel 3 answers the deeper question — why is there so little of it here, when
// there is five times more dark matter than ordinary matter in the universe?
// Because ordinary matter can RADIATE. A gas cloud collides with itself, emits
// photons, loses energy, sinks, and flattens into a disk that makes stars and
// planets and gardens. Dark matter has no way to shed energy, so it cannot fall
// in and stay: it keeps whatever orbital energy it had and remains a puffy
// spherical halo. The two panels run the same initial cloud with and without
// that one ability, and the shapes diverge on their own.
//
// Hand checks reproduced by the code:
//   rho = 0.4 GeV/cm^3 -> 7.131e-22 kg/m^3
//   Earth V = 1.0832e21 m^3 -> 0.772 kg of dark matter
//   100 GeV WIMP -> n = 0.004 /cm^3, flux = 9.2e4 /cm^2/s, ~6.4e8 through a body per second

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, notToScale, stickFigure, sparkle,
    slider, buttonRow, actionButton, setReadout,
    R_EARTH, M_EARTH, M_SUN, AU, YEAR, fmtNum, sci, fmtLen,
  } = A;

  const CIT_OORT = '1932 Oort - The force exerted by the stellar system in the direction perpendicular to the galactic plane and some related problems';
  const CIT_ZWICKY = '1933 Zwicky - Die Rotverschiebung von extragalaktischen Nebeln (The Redshift of Extragalactic Nebulae)';
  const CIT_RUBIN = '1970 Rubin, Ford - Rotation of the Andromeda Nebula from a Spectroscopic Survey of Emission Regions';
  const CIT_WR = '1978 White, Rees - Core condensation in heavy halos: a two-stage theory for galaxy formation and clustering';
  const CIT_LZ = '2023 LZ Collaboration - First Dark Matter Search Results from the LUX-ZEPLIN (LZ) Experiment';

  const GEV_KG = 1.78266192e-27;   // kg per GeV/c²
  const V_HALO = 2.3e5;            // m/s — typical halo speed through the solar neighbourhood
  const BODY_AREA = 0.7;           // m² — a person's rough cross-section
  const BODY_VOLUME = 0.066;       // m³ — a 70 kg person at roughly water density
  const C_ATOM = 12 * 1.66053907e-27; // kg — one carbon atom, for scale comparisons

  // Volumes in m³, with the ordinary mass of the same thing for contrast.
  const TARGETS = [
    { key: 'cup', name: 'a cup of coffee', V: 3.0e-4, ord: 0.30, ordNote: 'of coffee', scene: 'garden' },
    { key: 'person', name: 'you', V: 0.066, ord: 70, ordNote: 'of person', scene: 'garden' },
    { key: 'room', name: 'a room', V: 30, ord: 36, ordNote: 'of air', scene: 'garden' },
    { key: 'garden', name: 'this garden', V: 1.2e4, ord: 1.4e4, ordNote: 'of air above it', scene: 'garden' },
    { key: 'earth', name: 'the whole Earth', V: (4 / 3) * Math.PI * R_EARTH ** 3, ord: M_EARTH, ordNote: 'of rock and iron', scene: 'earth' },
    { key: 'solar', name: 'the solar system', V: (4 / 3) * Math.PI * (30.07 * AU) ** 3, ord: M_SUN, ordNote: 'of Sun', scene: 'solar' },
  ];

  const MAX_MOTES = 90;

  class DarkMatterHereSim extends Sim {
    init() {
      this.mode = 'here';          // 'here' | 'flux' | 'why'
      this.targetIdx = 4;          // the whole Earth — the punchline first
      this.rhoGeV = 0.4;           // GeV/cm³, local halo density
      this.mChi = 100;             // GeV/c², assumed particle mass
      this.motes = [];
      this.simT = 0;
      this.cloudA = null;          // baryons (can cool)
      this.cloudB = null;          // dark matter (cannot)
      this.seedMotes();
      this.buildControls();
      this.resetClouds();
      this.updateReadout();
    }

    /* ---------------- state ---------------- */

    get target() { return TARGETS[this.targetIdx]; }
    get rho() { return this.rhoGeV * GEV_KG * 1e6; }   // kg/m³

    seedMotes() {
      // Deterministic drift pattern — no Math.random, so the fog is identical
      // on every reload and the doodle never boils.
      this.motes = [];
      for (let i = 0; i < MAX_MOTES; i++) {
        const a = (i * 2.399963) % (Math.PI * 2);       // golden-angle spread
        this.motes.push({
          fx: ((i * 0.6180339887) % 1),                  // fractional x
          fy: ((i * 0.7548776662) % 1),                  // fractional y
          vx: Math.cos(a) * 0.35 + 0.55,
          vy: Math.sin(a) * 0.22,
          s: 1.6 + ((i * 7) % 5) * 0.35,
        });
      }
    }

    resetClouds() {
      // Same starting cloud for both panels: identical positions and speeds.
      const mk = () => {
        const ps = [];
        for (let i = 0; i < 56; i++) {
          const a = (i * 2.399963) % (Math.PI * 2);
          const r = 0.32 + ((i * 0.6180339887) % 1) * 0.62;
          const inc = -0.9 + ((i * 0.7548776662) % 1) * 1.8;   // orbital inclination
          ps.push({ a, r, inc, r0: r, phase: (i * 0.381966) % 1 });
        }
        return ps;
      };
      this.cloudA = mk();
      this.cloudB = mk();
      this.simT = 0;
    }

    /* ---------------- controls ---------------- */

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'is it here?', value: 'here' },
        { label: 'through you, right now', value: 'flux' },
        { label: "why it won't settle", value: 'why' },
      ], { initial: 'here', onSelect: (v) => this.setMode(v) });

      this.targetBtns = buttonRow(c, TARGETS.map((t) => ({ label: t.name, value: t.key })), {
        initial: 'earth',
        onSelect: (v) => {
          this.targetIdx = TARGETS.findIndex((t) => t.key === v);
          this.cache.invalidate();
          this.updateReadout();
          this.poke();
        },
      });

      this.rhoSlider = slider(c, {
        label: 'local dark-matter density',
        min: 0.2, max: 0.7, step: 0.005, value: this.rhoGeV,
        format: (v) => `${fmtNum(v, 3)} GeV/cm³ = ${sci(v * GEV_KG * 1e6, 2)} kg/m³`,
        oninput: (v) => {
          this.rhoGeV = v;
          if (!this._citedOort) { this._citedOort = true; this.cite(CIT_OORT); }
          this.updateReadout();
          this.poke();
        },
      });

      this.massSlider = slider(c, {
        label: 'assumed particle mass',
        min: 1, max: 1000, value: this.mChi, log: true,
        format: (v) => `${fmtNum(v, v < 10 ? 2 : 0)} GeV/c²  (unknown — that is the point)`,
        oninput: (v) => {
          this.mChi = v;
          if (!this._citedLZ) { this._citedLZ = true; this.cite(CIT_LZ); }
          this.updateReadout();
          this.poke();
        },
      });

      this.replayBtn = actionButton(c, 'run both clouds again', () => { this.resetClouds(); this.poke(); });
      this.setMode('here');
    }

    setMode(v) {
      this.mode = v;
      const show = (ctl, on) => { ctl.el.style.display = on ? '' : 'none'; };
      show(this.targetBtns, v === 'here');
      show(this.rhoSlider, v === 'here' || v === 'flux');
      show(this.massSlider, v === 'flux');
      this.replayBtn.style.display = v === 'why' ? '' : 'none';
      if (v === 'why') { this.resetClouds(); this.cite(CIT_WR); }
      if (v === 'here' && !this._citedZ) { this._citedZ = true; this.cite(CIT_ZWICKY); }
      this.cache.invalidate();
      this.updateReadout();
      this.poke();
    }

    /* ---------------- physics ---------------- */

    hereNumbers() {
      const t = this.target;
      const dm = this.rho * t.V;                 // kg of dark matter in that volume
      // How many PARTICLES that is. This matters more than it looks: the mass is
      // tiny but the particle count is not, and readers reasonably assume the
      // pink fog drawn on the canvas is a particle count. It is not — at
      // 100 GeV there is about ONE particle in a coffee cup, 264 in a person.
      // Saying so out loud is the difference between the sim teaching the point
      // and the sim contradicting it.
      const mChiKg = this.mChi * GEV_KG;
      return {
        t, dm, ord: t.ord,
        ratio: dm / t.ord,
        atoms: dm / C_ATOM,                      // in carbon atoms, for small volumes
        litres: dm / 1.0,                        // 1 litre of water = 1 kg
        count: dm / mChiKg,                      // particles resident right now
        perM3: this.rho / mChiKg,
      };
    }

    fluxNumbers() {
      const n = this.rhoGeV / this.mChi;         // particles per cm³
      const flux = n * (V_HALO * 100);           // per cm² per second
      const throughYou = flux * (BODY_AREA * 1e4);
      // The number people actually need in order to believe the flux: how many
      // are INSIDE you at any instant. It is small (a few hundred), and the huge
      // per-second figure comes from speed, not from crowding — each one crosses
      // in well under a microsecond and is replaced.
      const resident = n * 1e6 * BODY_VOLUME;    // n is per cm³ → per m³ × m³
      const transit = (BODY_VOLUME / BODY_AREA) / V_HALO;   // s to cross a body
      return { n, flux, throughYou, resident, transit, perYear: throughYou * 3.15576e7 };
    }

    update(dt) {
      this.simT += dt;
      if (this.mode === 'why') {
        // Baryons radiate: their orbits shrink AND flatten toward the plane.
        // Dark matter cannot, so r0 and inclination are untouched. The two
        // panels differ by exactly this one loop.
        for (const p of this.cloudA) {
          p.r = Math.max(0.1, p.r - dt * 0.055 * p.r);
          p.inc *= (1 - dt * 0.55);
        }
      }
      if (this.mode !== 'why') {
        for (const m of this.motes) {
          m.fx += m.vx * dt * 0.055;
          m.fy += m.vy * dt * 0.055;
          if (m.fx > 1.05) m.fx -= 1.1;
          if (m.fy > 1.05) m.fy -= 1.1;
          if (m.fy < -0.05) m.fy += 1.1;
        }
      }
    }

    /* ---------------- readout ---------------- */

    updateReadout() {
      if (this.mode === 'flux') return this.fluxReadout();
      if (this.mode === 'why') return this.whyReadout();
      const n = this.hereNumbers();
      const t = n.t;
      const small = n.dm < 1e-18;
      setReadout(this.readoutEl, [
        [
          ['measured local density ', null], [`${fmtNum(this.rhoGeV, 3)} GeV/cm³`, 'cyan'],
          [' = ', null], [`${sci(this.rho, 3)} kg/m³`, 'cyan'],
          ['  ·  volume of ', null], [t.name, 'yellow'], [' = ', null], [`${sci(t.V, 3)} m³`, null],
        ],
        [
          ['dark matter inside ', null], [t.name, 'yellow'], [' = ρ × V = ', null],
          [`${sci(n.dm, 3)} kg`, 'pink'],
          [small ? `  — about ${fmtNum(n.atoms, n.atoms < 100 ? 1 : 0)} carbon atoms' worth` : '', null],
        ],
        [
          ['ordinary matter in the same place: ', null], [`${sci(n.ord, 3)} kg`, 'green'],
          [` ${t.ordNote}.  Dark matter is `, null],
          [`${sci(1 / n.ratio, 2)}×`, 'orange'], [' rarer here.', null],
        ],
        [
          ['HOW MANY PARTICLES IS THAT? ', 'yellow'],
          [`If each weighs ${fmtNum(this.mChi, 0)} GeV/c², one particle is ${sci(this.mChi * GEV_KG, 2)} kg, so inside `, null],
          [t.name, 'yellow'], [' there are about ', null],
          [n.count < 10 ? fmtNum(n.count, 1) : sci(n.count, 3), 'pink'],
          [n.count < 10 ? ' particles' : ' particles', null],
          [' — right now, at this instant. ', null],
          [n.count < 5
            ? 'Yes: about one particle. The pink dots on the canvas mark that a halo is present; they are NOT a particle count, and at this scale a truthful count would be almost nothing.'
            : 'The pink dots mark the halo\'s presence — they are not a particle count.', null],
        ],
        t.key === 'earth' ? [
          ['Read that again: every gram of dark matter inside the entire planet adds up to ', null],
          [`${fmtNum(n.dm, 2)} kg`, 'pink'],
          [' — less than a litre of water. It is here, it is streaming through your chair right now, and locally it is nothing. Out at the scale of a galaxy it outweighs everything else five to one.', null],
        ] : [
          ['Dark matter is not concentrated where we are. It is spread almost perfectly smoothly, so small volumes contain almost none of it — and a galaxy-sized volume contains most of the mass.', null],
        ],
      ]);
    }

    fluxReadout() {
      const f = this.fluxNumbers();
      setReadout(this.readoutEl, [
        [
          ['IF each particle weighs ', null], [`${fmtNum(this.mChi, this.mChi < 10 ? 2 : 0)} GeV/c²`, 'yellow'],
          [', then number density n = ρ/m = ', null], [`${sci(f.n, 3)} per cm³`, 'cyan'],
          [`, and at the halo speed of ${fmtNum(V_HALO / 1000, 0)} km/s the flux is `, null],
          [`${sci(f.flux, 3)} per cm² per second`, 'green'],
        ],
        [
          ['Through a person (≈0.7 m² of cross-section): ', null],
          [`${sci(f.throughYou, 3)} particles every second`, 'pink'],
          [`  ·  ${sci(f.perYear, 2)} in a year.`, null],
        ],
        [
          ['THAT IS NOT HOW MANY ARE IN YOU. ', 'yellow'],
          ['At any single instant only about ', null],
          [`${fmtNum(f.resident, 0)} particles`, 'cyan'],
          [' are actually inside your body. The enormous per-second figure comes from SPEED, not from crowding: at 230 km/s each one crosses you in ', null],
          [`${sci(f.transit, 2)} s`, 'orange'],
          [' and is immediately replaced. A few hundred residents, swapped out a million times a second, is ', null],
          [`${sci(f.throughYou, 2)} crossings per second`, 'pink'],
          ['. Both numbers are right; they measure different things — like cars ON a motorway versus cars PASSING a bridge.', null],
        ],
        [
          ['How many actually hit an atom in you? Essentially none. LZ, a 7-tonne xenon detector 1.5 km underground, has been running for years and has seen no confirmed dark-matter event; its 2023 result rules out cross-sections above ', null],
          ['9.2×10⁻⁴⁸ cm²', 'orange'], [' at 36 GeV/c². Billions pass through you every second and, on those odds, not one of them touches you in a lifetime.', null],
        ],
        [
          ['Notice what the mass slider does: nothing about the DENSITY changes — that is measured. Only how many particles that density is divided into, which is not. Halve the mass and you double the traffic.', null],
        ],
      ]);
    }

    whyReadout() {
      setReadout(this.readoutEl, [
        [
          ['Same cloud, same mass, same starting orbits. One difference: ', null],
          ['the left one can radiate', 'green'], [', the right one cannot.', 'pink'],
        ],
        [
          ['Ordinary gas collides with itself, and hot gas GLOWS — it converts orbital energy into photons and throws them away. Losing energy means it cannot stay out wide, so it sinks, and because the collisions cancel sideways motion it flattens: a disk. Disks make stars, planets, and vegetable gardens.', null],
        ],
        [
          ['Dark matter has no way to radiate — no charge, no light, essentially no collisions. It cannot shed a joule, so it keeps the energy it was born with and stays exactly as puffy as it started: a spherical halo, three-dimensional and diffuse, reaching far beyond the visible galaxy.', null],
        ],
        [
          ['That is the honest answer to "is dark matter on Earth?": yes, a fog of it, and it can never be more than a fog. Planets are made of the stuff that could cool down. This is why the halo is round and the galaxy is flat.', null],
        ],
      ]);
    }

    /* ---------------- drawing: the fog that goes through everything -------- */

    drawMotes(x0, y0, w, h, alpha) {
      const { ctx } = this;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.pink;
      for (const m of this.motes) {
        const x = x0 + ((m.fx % 1) + 1) % 1 * w;
        const y = y0 + ((m.fy % 1) + 1) % 1 * h;
        ctx.beginPath();
        ctx.arc(x, y, m.s * 0.62, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ---------------- drawing: the garden ---------------- */

    // Drawn properly, because the whole point is that this is an ordinary place
    // with dark matter streaming through it. Everything static is cached.
    drawGarden(compact) {
      const { rc, ctx, w, h } = this;
      const horizon = h * 0.60;
      const key = `${w}x${h}`;

      // --- sky: sun and two cirrus wisps ---
      this.cache.draw(`sun-${key}`, (g) => g.circle(w * 0.86, h * 0.15, 44, opts(500, {
        stroke: COLORS.yellow, strokeWidth: 2,
      })));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        this.cache.draw(`ray-${i}-${key}`, (g) => g.line(
          w * 0.86 + Math.cos(a) * 30, h * 0.15 + Math.sin(a) * 30,
          w * 0.86 + Math.cos(a) * 42, h * 0.15 + Math.sin(a) * 42,
          opts(501 + i, { stroke: COLORS.yellow, strokeWidth: 1.4 }),
        ));
      }
      this.cache.draw(`cirrus1-${key}`, (g) => g.path(
        `M ${w * 0.12} ${h * 0.12} q ${w * 0.06} ${-10} ${w * 0.13} ${-2} q ${w * 0.05} ${6} ${w * 0.10} ${-3}`,
        opts(510, { stroke: COLORS.muted, strokeWidth: 1.2 }),
      ));
      this.cache.draw(`cirrus2-${key}`, (g) => g.path(
        `M ${w * 0.30} ${h * 0.22} q ${w * 0.07} ${-9} ${w * 0.15} ${-1}`,
        opts(511, { stroke: COLORS.muted, strokeWidth: 1.1 }),
      ));

      // --- the hill the garden sits on ---
      this.cache.draw(`hill-${key}`, (g) => g.path(
        `M 0 ${horizon + 26} Q ${w * 0.28} ${horizon - 34} ${w * 0.56} ${horizon - 6} T ${w} ${horizon - 18} L ${w} ${h} L 0 ${h} Z`,
        opts(512, { stroke: COLORS.green, strokeWidth: 2, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.55, hachureGap: 13 }),
      ));

      // --- orchard: four fruit trees along the ridge ---
      const treeXs = [w * 0.60, w * 0.70, w * 0.79, w * 0.90];
      treeXs.forEach((tx, i) => {
        const ty = horizon - 18 - (i % 2) * 8;
        this.cache.draw(`trunk-${i}-${key}`, (g) => g.line(tx, ty, tx, ty - 34, opts(520 + i, { stroke: COLORS.orange, strokeWidth: 2.2 })));
        this.cache.draw(`canopy-${i}-${key}`, (g) => g.circle(tx, ty - 50, 40 + (i % 3) * 7, opts(530 + i, {
          stroke: COLORS.green, strokeWidth: 1.8, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 7,
        })));
        // a couple of fruits
        this.cache.draw(`fruit-${i}-${key}`, (g) => g.circle(tx + 9, ty - 44, 6, opts(540 + i, { stroke: COLORS.red, strokeWidth: 1.4 })));
      });

      // --- the vegetable rows: staked bean poles with climbers ---
      const rowY = horizon + 30;
      for (let i = 0; i < 9; i++) {
        const px = w * 0.06 + i * (w * 0.042);
        const py = rowY + (i % 2) * 6;
        this.cache.draw(`pole-${i}-${key}`, (g) => g.line(px, py, px + 5, py - 62, opts(550 + i, { stroke: COLORS.muted, strokeWidth: 1.6 })));
        // the climbing plant: three leaf ticks up the pole
        for (let k = 0; k < 3; k++) {
          const t = 0.25 + k * 0.25;
          this.cache.draw(`leaf-${i}-${k}-${key}`, (g) => g.line(
            px + 5 * t, py - 62 * t, px + 5 * t + (k % 2 ? -8 : 8), py - 62 * t - 5,
            opts(560 + i * 3 + k, { stroke: COLORS.green, strokeWidth: 1.3 }),
          ));
        }
      }
      // a couple of buckets by the rows
      this.cache.draw(`bucket1-${key}`, (g) => g.path(
        `M ${w * 0.44} ${rowY + 6} l 4 20 l 16 0 l 4 -20 Z`, opts(570, { stroke: COLORS.cyan, strokeWidth: 1.5 }),
      ));
      this.cache.draw(`bucket2-${key}`, (g) => g.path(
        `M ${w * 0.49} ${rowY + 14} l 3 16 l 13 0 l 3 -16 Z`, opts(571, { stroke: COLORS.ink, strokeWidth: 1.4 }),
      ));

      // --- the fence along the right ---
      const fy = horizon + 4;
      this.cache.draw(`rail1-${key}`, (g) => g.line(w * 0.62, fy - 10, w * 0.99, fy - 20, opts(575, { stroke: COLORS.orange, strokeWidth: 1.6 })));
      this.cache.draw(`rail2-${key}`, (g) => g.line(w * 0.62, fy + 2, w * 0.99, fy - 8, opts(576, { stroke: COLORS.orange, strokeWidth: 1.6 })));
      for (let i = 0; i < 5; i++) {
        const px = w * (0.63 + i * 0.09);
        this.cache.draw(`post-${i}-${key}`, (g) => g.line(px, fy - 24, px, fy + 12, opts(580 + i, { stroke: COLORS.orange, strokeWidth: 1.8 })));
      }

      // --- the house ---
      const hx = w * 0.20;
      const hy = horizon - 4;
      const bw = compact ? 74 : 96;
      const bh = compact ? 54 : 66;
      this.cache.draw(`house-${key}`, (g) => g.rectangle(hx, hy - bh, bw, bh, opts(590, {
        stroke: COLORS.ink, strokeWidth: 2, fill: COLORS.ink, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 14,
      })));
      this.cache.draw(`roof-${key}`, (g) => g.path(
        `M ${hx - 10} ${hy - bh} L ${hx + bw / 2} ${hy - bh - 34} L ${hx + bw + 10} ${hy - bh} Z`,
        opts(591, { stroke: COLORS.red, strokeWidth: 2, fill: COLORS.red, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 8 }),
      ));
      this.cache.draw(`chimney-${key}`, (g) => g.rectangle(hx + bw * 0.72, hy - bh - 30, 12, 22, opts(592, { stroke: COLORS.ink, strokeWidth: 1.6 })));
      this.cache.draw(`smoke-${key}`, (g) => g.path(
        `M ${hx + bw * 0.78} ${hy - bh - 34} q 10 -12 0 -22 q -10 -10 2 -20`,
        opts(593, { stroke: COLORS.muted, strokeWidth: 1.3 }),
      ));
      this.cache.draw(`door-${key}`, (g) => g.rectangle(hx + bw * 0.14, hy - 30, 20, 30, opts(594, { stroke: COLORS.orange, strokeWidth: 1.6 })));
      const win = (n, wx, wy) => {
        this.cache.draw(`win-${n}-${key}`, (g) => g.rectangle(wx, wy, 20, 18, opts(600 + n, { stroke: COLORS.yellow, strokeWidth: 1.5 })));
        this.cache.draw(`winb-${n}-${key}`, (g) => g.line(wx + 10, wy, wx + 10, wy + 18, opts(610 + n, { stroke: COLORS.yellow, strokeWidth: 1 })));
        this.cache.draw(`winc-${n}-${key}`, (g) => g.line(wx, wy + 9, wx + 20, wy + 9, opts(620 + n, { stroke: COLORS.yellow, strokeWidth: 1 })));
      };
      win(0, hx + bw * 0.52, hy - bh * 0.82);
      win(1, hx + bw * 0.14, hy - bh * 0.82);

      // --- grass tufts across the foreground ---
      for (let i = 0; i < 16; i++) {
        const gx = (i * 61.8) % w;
        const gy = h - 12 - (i % 3) * 5;
        this.cache.draw(`tuft-${i}-${key}`, (g) => g.path(
          `M ${gx} ${gy} l -4 -9 M ${gx} ${gy} l 0 -11 M ${gx} ${gy} l 4 -9`,
          opts(640 + i, { stroke: COLORS.green, strokeWidth: 1.2 }),
        ));
      }

      // --- the gardener ---
      stickFigure(rc, w * 0.40, horizon + 8, { scale: compact ? 0.7 : 0.9, seed: 660, color: COLORS.ink });
      label(ctx, 'you', w * 0.40, horizon + 78, { color: COLORS.muted, size: 12, align: 'center' });
    }

    drawEarthScene(compact) {
      const { rc, ctx, w, h } = this;
      const cx = w * 0.34;
      const cy = h * 0.54;
      const R = Math.min(w, h) * (compact ? 0.26 : 0.30);
      this.cache.draw(`globe-${w}x${h}`, (g) => g.circle(cx, cy, R * 2, opts(700, {
        stroke: COLORS.cyan, strokeWidth: 2.4, fill: COLORS.cyan, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 12,
      })));
      // two doodle continents
      this.cache.draw(`cont1-${w}x${h}`, (g) => g.path(
        `M ${cx - R * 0.5} ${cy - R * 0.35} q ${R * 0.25} ${-R * 0.3} ${R * 0.5} ${-R * 0.05} q ${R * 0.2} ${R * 0.25} ${-R * 0.05} ${R * 0.4} q ${-R * 0.35} ${R * 0.15} ${-R * 0.45} ${-R * 0.35} Z`,
        opts(701, { stroke: COLORS.green, strokeWidth: 1.8, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 8 }),
      ));
      this.cache.draw(`cont2-${w}x${h}`, (g) => g.path(
        `M ${cx - R * 0.15} ${cy + R * 0.30} q ${R * 0.3} ${-R * 0.12} ${R * 0.45} ${R * 0.12} q ${-R * 0.1} ${R * 0.3} ${-R * 0.4} ${R * 0.22} Z`,
        opts(702, { stroke: COLORS.green, strokeWidth: 1.8, fill: COLORS.green, fillStyle: 'hachure', fillWeight: 0.5, hachureGap: 8 }),
      ));
      label(ctx, 'Earth — 5.97×10²⁴ kg of rock and iron', cx, cy + R + 30, { color: COLORS.cyan, size: compact ? 12 : 14, align: 'center' });

      // the dark matter inside it, drawn honestly: a bottle of water
      const bx = w * 0.76;
      const by = h * 0.52;
      this.cache.draw(`bottle-${w}x${h}`, (g) => g.path(
        `M ${bx - 22} ${by - 40} l 0 66 q 0 14 22 14 q 22 0 22 -14 l 0 -66 q -8 -6 -22 -6 q -14 0 -22 6 Z`,
        opts(710, { stroke: COLORS.pink, strokeWidth: 2 }),
      ));
      this.cache.draw(`bottlefill-${w}x${h}`, (g) => g.rectangle(bx - 20, by - 6, 40, 44, opts(711, {
        stroke: COLORS.pink, strokeWidth: 1.2, fill: COLORS.pink, fillStyle: 'hachure', fillWeight: 0.7, hachureGap: 6,
      })));
      label(ctx, 'ALL the dark matter', bx, by - 60, { color: COLORS.pink, size: compact ? 12 : 14.5, align: 'center' });
      label(ctx, 'inside the whole planet', bx, by - 44, { color: COLORS.pink, size: compact ? 12 : 14.5, align: 'center' });
      label(ctx, `${fmtNum(this.hereNumbers().dm, 2)} kg`, bx, by + 58, { color: COLORS.yellow, size: compact ? 15 : 19, align: 'center' });
      label(ctx, 'less than a litre of water', bx, by + 78, { color: COLORS.muted, size: compact ? 11 : 12.5, align: 'center' });
      notToScale(rc, ctx, compact ? w - 66 : w - 84, h - 30);
    }

    drawSolarScene(compact) {
      const { rc, ctx, w, h } = this;
      const cx = w * 0.5;
      const cy = h * 0.5;
      this.cache.draw(`sun2-${w}x${h}`, (g) => g.circle(cx, cy, 34, opts(720, {
        stroke: COLORS.yellow, strokeWidth: 2.2, fill: COLORS.yellow, fillStyle: 'hachure', fillWeight: 0.8, hachureGap: 6,
      })));
      const rings = [0.14, 0.22, 0.31, 0.40, 0.52, 0.64, 0.78, 0.92];
      const maxR = Math.min(w, h) * 0.44;
      rings.forEach((f, i) => {
        this.cache.draw(`orb-${i}-${w}x${h}`, (g) => g.circle(cx, cy, maxR * 2 * f, opts(730 + i, {
          stroke: COLORS.muted, strokeWidth: 1, strokeLineDash: [5, 8],
        })));
        const a = i * 0.9;
        rc.circle(cx + Math.cos(a) * maxR * f, cy + Math.sin(a) * maxR * f, i > 3 ? 9 : 6,
          opts(740 + i, { stroke: i > 3 ? COLORS.cyan : COLORS.ink, strokeWidth: 1.5 }));
      });
      label(ctx, 'out to Neptune', cx, cy - maxR - 14, { color: COLORS.muted, size: compact ? 11 : 13, align: 'center' });
      const n = this.hereNumbers();
      label(ctx, `dark matter inside this whole sphere: ${sci(n.dm, 2)} kg`, cx, h - 52,
        { color: COLORS.pink, size: compact ? 12 : 14.5, align: 'center' });
      label(ctx, `the Sun alone is ${sci(M_SUN, 2)} kg — ${sci(1 / n.ratio, 1)}× more`, cx, h - 34,
        { color: COLORS.muted, size: compact ? 11 : 12.5, align: 'center' });
      notToScale(rc, ctx, compact ? w - 66 : w - 84, 26);
    }

    /* ---------------- drawing: panels ---------------- */

    render() {
      if (this.mode === 'flux') return this.renderFlux();
      if (this.mode === 'why') return this.renderWhy();
      this.renderHere();
    }

    renderHere() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const t = this.target;

      if (t.scene === 'earth') this.drawEarthScene(compact);
      else if (t.scene === 'solar') this.drawSolarScene(compact);
      else this.drawGarden(compact);

      // the fog, drawn over everything — that IS the physics: it goes through
      // the roof, the soil, the gardener, without noticing any of it
      this.drawMotes(0, 0, w, h, 0.85);

      // the selected volume, outlined on the scene where that makes sense
      if (t.scene === 'garden') {
        const boxes = {
          cup: [w * 0.395, h * 0.63, 26, 22],
          person: [w * 0.365, h * 0.52, 54, 96],
          room: [w * 0.175, h * 0.36, 110, 82],
          garden: [w * 0.03, h * 0.55, w * 0.55, h * 0.40],
        };
        const b = boxes[t.key];
        if (b) {
          rc.rectangle(b[0], b[1], b[2], b[3], opts(760, { stroke: COLORS.yellow, strokeWidth: 2 }));
          // Inside the box at its foot, not above it: the big volumes start high
          // enough that an outside label lands on the roof of the house.
          label(ctx, t.name, b[0] + 8, b[1] + b[3] - 8, { color: COLORS.yellow, size: compact ? 12 : 14 });
        }
      }

      const n = this.hereNumbers();
      label(ctx, `dark matter in ${t.name}:  ${sci(n.dm, 3)} kg`, w / 2, compact ? 22 : 28,
        { color: COLORS.pink, size: compact ? 13 : 17, align: 'center' });
      label(ctx, `ρ = ${fmtNum(this.rhoGeV, 3)} GeV/cm³ = ${sci(this.rho, 3)} kg/m³   ·   mass = ρ × V`,
        w / 2, compact ? 40 : 48, { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });
      // clear of both the grass tufts along the foot and the citation chip band
      label(ctx, compact ? 'pink dots: the halo, streaming through' : 'the pink dots are the halo streaming through the scene — through the roof, the soil and you, without touching a thing',
        w / 2, compact ? 58 : 68, { color: COLORS.pink, size: compact ? 10.5 : 12.5, align: 'center' });
    }

    renderFlux() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const f = this.fluxNumbers();

      // a person, side on, with the halo wind blowing through
      const px = w * 0.5;
      const py = h * 0.36;
      stickFigure(rc, px, py, { scale: compact ? 1.5 : 2.1, seed: 770, color: COLORS.ink });

      this.drawMotes(0, h * 0.12, w, h * 0.68, 0.9);

      // arrows showing the halo wind direction
      for (let i = 0; i < 4; i++) {
        const ay = h * 0.22 + i * (h * 0.13);
        doodleArrow(rc, 20, ay, 96, ay - 4, { color: COLORS.pink, seed: 780 + i, strokeWidth: 1.4 });
      }
      label(ctx, compact ? 'halo wind' : `the halo wind — ${fmtNum(V_HALO / 1000, 0)} km/s`, 20, h * 0.17,
        { color: COLORS.pink, size: compact ? 11 : 13 });

      label(ctx, `${sci(f.throughYou, 3)} particles through you every second`, w / 2, compact ? 24 : 30,
        { color: COLORS.yellow, size: compact ? 13 : 18, align: 'center' });
      label(ctx, `n = ρ/m = ${sci(f.n, 3)} per cm³   ·   flux = n·v = ${sci(f.flux, 3)} per cm² per second`,
        w / 2, compact ? 42 : 50, { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });

      // the detector, deep underground, seeing nothing
      const gy = h * 0.74;
      this.cache.draw(`ground-${w}x${h}`, (g) => g.line(0, gy, w, gy, opts(790, { stroke: COLORS.orange, strokeWidth: 2 })));
      this.cache.draw(`rock-${w}x${h}`, (g) => g.rectangle(0, gy, w, h - gy, opts(791, {
        stroke: COLORS.orange, strokeWidth: 1, fill: COLORS.orange, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 11,
      })));
      const dx = w * 0.72;
      const dy = gy + (h - gy) * 0.5;
      rc.rectangle(dx - 34, dy - 18, 68, 36, opts(792, { stroke: COLORS.cyan, strokeWidth: 2 }));
      label(ctx, 'LZ · 1.5 km down', dx, dy + 32, { color: COLORS.cyan, size: compact ? 10.5 : 12.5, align: 'center' });
      label(ctx, 'still nothing', dx, dy + 4, { color: COLORS.red, size: compact ? 11 : 13, align: 'center' });
      label(ctx, compact ? 'billions pass · none touch you' : 'billions cross you each second; at the measured limits, not one interacts in a lifetime',
        w * 0.30, dy + 4, { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });
    }

    renderWhy() {
      const { rc, ctx, w, h } = this;
      const compact = w < 640;
      const halfW = w / 2;
      const cyc = h * 0.50;
      const R = Math.min(halfW, h) * (compact ? 0.30 : 0.34);

      const panel = (cx, cloud, title, color, canCool) => {
        label(ctx, title, cx, compact ? 24 : 30, { color, size: compact ? 13 : 16.5, align: 'center' });
        // the particles
        for (let i = 0; i < cloud.length; i++) {
          const p = cloud[i];
          const ang = p.a + this.simT * (0.55 / Math.max(0.22, p.r));
          const x = cx + Math.cos(ang) * p.r * R;
          const y = cyc + Math.sin(ang) * p.r * R * (canCool ? Math.max(0.10, Math.abs(p.inc)) : Math.abs(p.inc));
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          // radiated photons stream off the cooling cloud
          if (canCool && i % 7 === 0) {
            const ph = (this.simT * 60 + i * 13) % 40;
            ctx.globalAlpha = Math.max(0, 1 - ph / 40);
            ctx.strokeStyle = COLORS.yellow;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + ph * 0.9, y - ph * 0.5);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      };

      panel(halfW * 0.5, this.cloudA, compact ? 'ordinary matter' : 'ORDINARY MATTER — it can radiate', COLORS.green, true);
      panel(halfW * 1.5, this.cloudB, compact ? 'dark matter' : 'DARK MATTER — it cannot', COLORS.pink, false);

      this.cache.draw(`split-${w}x${h}`, (g) => g.line(halfW, 40, halfW, h - 44, opts(800, {
        stroke: COLORS.muted, strokeWidth: 1.2, strokeLineDash: [8, 8],
      })));

      label(ctx, compact ? 'photons carry energy away → it sinks & flattens' : 'photons carry energy away → it sinks, and flattens into a disk → stars, planets, gardens',
        halfW * 0.5, h - 30, { color: COLORS.green, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, compact ? 'no way to lose energy → stays a puffy halo' : 'no way to lose energy → it stays exactly as puffy as it began: a round halo',
        halfW * 1.5, h - 30, { color: COLORS.pink, size: compact ? 10 : 12.5, align: 'center' });
      label(ctx, 'same cloud, same mass, same starting orbits — the only difference is the ability to glow',
        w / 2, h - 12, { color: COLORS.muted, size: compact ? 10 : 12, align: 'center' });
    }
  }

  A.register('dmHere', DarkMatterHereSim);
})();
