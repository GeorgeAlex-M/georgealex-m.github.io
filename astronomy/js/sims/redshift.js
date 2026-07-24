// Sim 20 — Redshift & blueshift.
//
// The rest-frame hydrogen Balmer lines (656.3, 486.1, 434.0, 410.2 nm) are
// shifted by λ_obs = (1+z)·λ_rest, where z is produced three ways, each
// computed exactly from its slider:
//   Doppler:        1+z = √((1+β)/(1−β))           (β = v/c)
//   cosmological:   1+z = 1/a                        (a = scale factor)
//   gravitational:  1+z = 1/√(1−r_s/r)               (r in units of r_s)
// Lines that shift out of the visible band are drawn greyed in the UV/IR margins.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, wavelengthRGB,
    slider, buttonRow, setReadout, fmtNum,
  } = A;

  const R_RYD = 1.0967758e7;
  function balmer(n) { return 1e9 / (R_RYD * (0.25 - 1 / (n * n))); }
  const REST = [balmer(3), balmer(4), balmer(5), balmer(6)];
  const NAMES = ['Hα', 'Hβ', 'Hγ', 'Hδ'];

  const LAM0 = 350;   // draw range (nm), incl. UV margin
  const LAM1 = 1000;  // incl. near-IR margin

  class RedshiftSim extends Sim {
    init() {
      this.mode = 'doppler';
      this.beta = 0.3;      // Doppler v/c
      this.a = 0.5;         // cosmological scale factor
      this.rOverRs = 2;     // gravitational r/r_s
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    z() {
      if (this.mode === 'doppler') return Math.sqrt((1 + this.beta) / (1 - this.beta)) - 1;
      if (this.mode === 'cosmological') return 1 / this.a - 1;
      return 1 / Math.sqrt(1 - 1 / this.rOverRs) - 1;
    }

    buildControls() {
      const c = this.controlsEl;
      this.modeBtns = buttonRow(c, [
        { label: 'Doppler (motion)', value: 'doppler' },
        { label: 'cosmological (expanding space)', value: 'cosmological' },
        { label: 'gravitational', value: 'gravitational' },
      ], {
        initial: 'doppler',
        onSelect: (v) => {
          this.mode = v;
          this.buildModeSlider();
          this.cite(v === 'cosmological'
            ? '1929 Hubble - A Relation between Distance and Radial Velocity among Extra-Galactic Nebulae'
            : '1842 Doppler - Über das farbige Licht der Doppelsterne und einiger anderer Gestirne des Himmels');
          this.updateReadout();
          this.poke();
        },
      });
      this.sliderHolder = document.createElement('div');
      this.sliderHolder.style.flex = '1 1 220px';
      c.appendChild(this.sliderHolder);
      this.buildModeSlider();
    }

    buildModeSlider() {
      this.sliderHolder.innerHTML = '';
      if (this.mode === 'doppler') {
        slider(this.sliderHolder, {
          label: 'source velocity',
          min: -0.6, max: 0.9, step: 0.01, value: this.beta,
          format: (v) => `${fmtNum(v * 100, 0)}% c ${v < 0 ? '(toward)' : '(away)'}`,
          oninput: (v) => { this.beta = v; this.updateReadout(); this.poke(); },
        });
      } else if (this.mode === 'cosmological') {
        slider(this.sliderHolder, {
          label: 'scale factor a when light was emitted',
          min: 0.11, max: 1, step: 0.01, value: this.a,
          format: (v) => `a = ${fmtNum(v, 2)}`,
          oninput: (v) => { this.a = v; this.updateReadout(); this.poke(); },
        });
      } else {
        slider(this.sliderHolder, {
          label: 'emitted from r / r_s',
          min: 1.05, max: 60, step: 0.05, value: this.rOverRs,
          log: true,
          format: (v) => `${fmtNum(v, 2)} r_s`,
          oninput: (v) => { this.rOverRs = v; this.updateReadout(); this.poke(); },
        });
      }
    }

    updateReadout() {
      const z = this.z();
      const dir = z < 0 ? ['BLUEshifted (approaching / falling in)', 'cyan'] : ['REDshifted (receding / climbing out)', 'red'];
      const lines = [
        [
          ['redshift z = ', null], [fmtNum(z, 3), z < 0 ? 'cyan' : 'red'],
          ['   ·   every line moves to ', null], [`${fmtNum(1 + z, 3)}×`, 'yellow'],
          [' its rest wavelength  →  ', null], dir,
        ],
      ];
      if (this.mode === 'doppler') {
        lines.push([['a moving source stretches or squeezes its own waves. This tiny wobble is how most exoplanets are found — the star tugs toward and away as the planet orbits.', null]]);
      } else if (this.mode === 'cosmological') {
        lines.push([['space itself stretched by 1/a while the light travelled. A galaxy at ', null], [`z = ${fmtNum(z, 1)}`, 'orange'], [` emitted this light when the universe was ${fmtNum(this.a * 100, 0)}% of today\'s size.`, null]]);
      } else {
        lines.push([['light climbing out of a gravity well loses energy and reddens. Emitted from ', null], [`${fmtNum(this.rOverRs, 2)} r_s`, 'green'], [' of a black hole; at the horizon (1 r_s) z → ∞ and the light fades away entirely.', null]]);
      }
      lines.push([['same visible effect — the barcode slides — but three different physics. Reading z is how we measure the motion, distance and age of nearly everything.', 'yellow']]);
      setReadout(this.readoutEl, lines);
    }

    update(dt) { this.t += dt; }

    Xnm(nm, x0, x1) { return x0 + ((nm - LAM0) / (LAM1 - LAM0)) * (x1 - x0); }

    drawStrip(y0, sh, lines, tagColor, tag) {
      const { rc, ctx, w } = this;
      const x0 = w * 0.08;
      const x1 = w * 0.92;
      // rainbow only in the visible sub-range; UV/IR margins greyed
      for (let x = x0; x < x1; x += 1.5) {
        const nm = LAM0 + ((x - x0) / (x1 - x0)) * (LAM1 - LAM0);
        if (nm >= 380 && nm <= 750) ctx.fillStyle = wavelengthRGB(nm);
        else { ctx.fillStyle = nm < 380 ? '#2a2036' : '#361f1f'; }
        ctx.fillRect(x, y0, 2, sh);
      }
      for (let i = 0; i < lines.length; i++) {
        const nm = lines[i];
        const x = this.Xnm(nm, x0, x1);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(x - 1.5, y0, 3, sh);
      }
      this.cache.draw(`strip-${tag}-${this.w}x${this.h}`, (g) => g.rectangle(x0, y0, x1 - x0, sh, opts(1000 + tag.length, { stroke: COLORS.ink, strokeWidth: 1.4 })));
      label(ctx, tag, x0 - 4, y0 + sh / 2 + 4, { color: tagColor, size: 11.5, align: 'right' });
      // UV / IR margin labels
      const visX0 = this.Xnm(380, x0, x1);
      const visX1 = this.Xnm(750, x0, x1);
      label(ctx, 'UV', (x0 + visX0) / 2, y0 + sh + 12, { color: COLORS.muted, size: 9.5, align: 'center' });
      label(ctx, 'infrared', (visX1 + x1) / 2, y0 + sh + 12, { color: COLORS.muted, size: 9.5, align: 'center' });
      return { x0, x1 };
    }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const z = this.z();
      const shifted = REST.map((l) => l * (1 + z));

      const sh = compact ? 34 : 44;
      const restY = h * 0.22;
      const obsY = h * 0.56;

      // rest-frame reference
      this.drawStrip(restY, sh, REST, COLORS.muted, 'at rest (lab)');
      label(ctx, 'rest wavelengths of hydrogen', w / 2, restY - 10, { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });
      // observed (shifted)
      const { x0, x1 } = this.drawStrip(obsY, sh, shifted, z < 0 ? COLORS.cyan : COLORS.red, z < 0 ? 'blueshifted' : 'redshifted');
      label(ctx, `what we observe (z = ${fmtNum(z, 2)})`, w / 2, obsY - 10, { color: z < 0 ? COLORS.cyan : COLORS.red, size: compact ? 10.5 : 12.5, align: 'center' });

      // shift arrows connecting each rest line to its observed position
      for (let i = 0; i < REST.length; i++) {
        const xr = this.Xnm(REST[i], x0, x1);
        const xo = this.Xnm(Math.min(Math.max(shifted[i], LAM0), LAM1), x0, x1);
        const col = z < 0 ? COLORS.cyan : COLORS.red;
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xr, restY + sh); ctx.lineTo(xo, obsY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        if (!compact) label(ctx, NAMES[i], xr, restY - 2, { color: wavelengthRGB(REST[i]), size: 10, align: 'center' });
      }
      // big shift direction arrow
      const dirCol = z < 0 ? COLORS.cyan : COLORS.red;
      const ay = h - (compact ? 26 : 34);
      if (Math.abs(z) > 0.01) {
        const cx = w * 0.5;
        const dir = z < 0 ? -1 : 1;
        doodleArrow(rc, cx - dir * 70, ay, cx + dir * 70, ay, { color: dirCol, seed: 1010, strokeWidth: 2 });
        label(ctx, z < 0 ? 'toward blue (shorter λ)' : 'toward red (longer λ)', cx, ay - 12, { color: dirCol, size: compact ? 11 : 13, align: 'center' });
      } else {
        label(ctx, 'no shift — drag the slider', w * 0.5, ay, { color: COLORS.yellow, size: 13, align: 'center' });
      }
    }
  }

  A.register('redshift', RedshiftSim);
})();
