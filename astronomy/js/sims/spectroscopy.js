// Sim 19 — Spectroscopy: reading starlight.
//
// Hydrogen's visible lines are computed from the Rydberg formula (Balmer
// series, n₁ = 2): 656.3, 486.1, 434.0, 410.2 nm. Helium and sodium lines are
// measured laboratory values. Absorption mode draws dark lines on a continuum
// rainbow; emission mode draws bright lines on black — same wavelengths. A Bohr
// energy-level ladder (E_n = −13.6/n² eV) shows the Balmer jumps for hydrogen.

(() => {
  const A = (window.Astro = window.Astro || {});
  const {
    Sim, opts, COLORS, label, doodleArrow, wavelengthRGB,
    buttonRow, setReadout, fmtNum,
  } = A;

  const R_RYD = 1.0967758e7; // m^-1
  // Balmer series λ (nm) computed from Rydberg: 1/λ = R(1/4 − 1/n²)
  function balmer(n) { return 1e9 / (R_RYD * (0.25 - 1 / (n * n))); }
  const H_LINES = [balmer(3), balmer(4), balmer(5), balmer(6)]; // Hα..Hδ
  const H_NAMES = ['Hα', 'Hβ', 'Hγ', 'Hδ'];

  const ELEMENTS = {
    H: { name: 'hydrogen', lines: H_LINES, note: 'the visible "Balmer" lines — jumps landing on level 2' },
    He: { name: 'helium', lines: [447.1, 471.3, 492.2, 501.6, 587.6, 667.8, 706.5], note: 'first found in the SUN (1868) before it was found on Earth — hence "helios"' },
    Na: { name: 'sodium', lines: [589.0, 589.6], note: 'the famous yellow "D" lines — the orange glow of street lamps' },
  };

  const LAM0 = 380;
  const LAM1 = 720;

  class SpectroscopySim extends Sim {
    init() {
      this.el = 'H';
      this.mode = 'absorption';
      this.t = 0;
      this.buildControls();
      this.updateReadout();
    }

    buildControls() {
      const c = this.controlsEl;
      this.elBtns = buttonRow(c, [
        { label: 'hydrogen', value: 'H' },
        { label: 'helium', value: 'He' },
        { label: 'sodium', value: 'Na' },
      ], {
        initial: 'H',
        onSelect: (v) => {
          this.el = v;
          this.cite(v === 'H'
            ? '1913 Bohr - On the Constitution of Atoms and Molecules'
            : '1814 Fraunhofer - Bestimmung des Brechungs- und Farbenzerstreuungs-Vermögens verschiedener Glasarten');
          this.updateReadout();
          this.poke();
        },
      });
      this.modeBtns = buttonRow(c, [
        { label: 'absorption (cool gas)', value: 'absorption' },
        { label: 'emission (hot gas)', value: 'emission' },
      ], {
        initial: 'absorption',
        onSelect: (v) => { this.mode = v; this.updateReadout(); this.poke(); },
      });
    }

    updateReadout() {
      const e = ELEMENTS[this.el];
      const lineList = e.lines.map((l) => `${fmtNum(l, 1)}`).join(', ');
      setReadout(this.readoutEl, [
        [
          ['element: ', null], [e.name, 'green'],
          ['   ·   ', null], [this.mode === 'absorption' ? 'dark lines cut from a rainbow' : 'bright lines glowing on black', 'pink'],
        ],
        [['its barcode (nm): ', null], [lineList, 'cyan']],
        [[e.note, null]],
        [['no two elements share a barcode — so a spectrum tells you exactly what a star is made of, from light alone (Payne, 1925).', 'yellow']],
      ]);
    }

    update(dt) { this.t += dt; }

    Xnm(nm, x0, x1) { return x0 + ((nm - LAM0) / (LAM1 - LAM0)) * (x1 - x0); }

    render() {
      const { rc, ctx, w, h } = this;
      const compact = w < 700;
      const e = ELEMENTS[this.el];

      // --- scene: source → gas → spectrum (top strip) ---
      const sx = w * 0.5;
      const sy = 30;
      label(ctx, this.mode === 'absorption'
        ? 'hot star  →  cool gas cloud  →  spectrum with DARK gaps'
        : 'hot glowing gas  →  spectrum of BRIGHT lines', sx, sy, { color: COLORS.muted, size: compact ? 11 : 13, align: 'center' });

      // spectrum strip
      const stripY = h * (compact ? 0.20 : 0.24);
      const stripH = compact ? 40 : 54;
      const x0 = w * 0.08;
      const x1 = w * 0.92;
      if (this.mode === 'absorption') {
        for (let x = x0; x < x1; x += 1.5) {
          const nm = LAM0 + ((x - x0) / (x1 - x0)) * (LAM1 - LAM0);
          ctx.fillStyle = wavelengthRGB(nm);
          ctx.fillRect(x, stripY, 2, stripH);
        }
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(x0, stripY, x1 - x0, stripH);
      }
      // the element's lines
      for (let i = 0; i < e.lines.length; i++) {
        const nm = e.lines[i];
        if (nm < LAM0 || nm > LAM1) continue;
        const x = this.Xnm(nm, x0, x1);
        if (this.mode === 'absorption') {
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(x - 1.5, stripY, 3, stripH);
        } else {
          ctx.fillStyle = wavelengthRGB(nm);
          ctx.fillRect(x - 1.5, stripY, 3, stripH);
          ctx.globalAlpha = 0.4; ctx.fillRect(x - 3, stripY, 6, stripH); ctx.globalAlpha = 1;
        }
        // label Balmer lines for hydrogen
        if (this.el === 'H' && !compact) {
          label(ctx, H_NAMES[i] || '', x, stripY - 6, { color: wavelengthRGB(nm), size: 11, align: 'center' });
        }
      }
      this.cache.draw(`sframe-${w}x${h}`, (g) => g.rectangle(x0, stripY, x1 - x0, stripH, opts(980, { stroke: COLORS.ink, strokeWidth: 1.6 })));
      label(ctx, `${LAM0} nm`, x0, stripY + stripH + 14, { color: COLORS.muted, size: 10, align: 'left' });
      label(ctx, `${LAM1} nm`, x1, stripY + stripH + 14, { color: COLORS.muted, size: 10, align: 'right' });
      label(ctx, `${e.name}'s fingerprint`, (x0 + x1) / 2, stripY + stripH + 14, { color: COLORS.green, size: 12, align: 'center' });

      // --- Bohr ladder (hydrogen only) ---
      const by0 = h * (compact ? 0.5 : 0.5);
      const by1 = h - 30;
      const bx = compact ? w * 0.5 : w * 0.30;
      if (this.el === 'H') {
        label(ctx, 'why the lines are where they are: Bohr\'s energy ladder (E_n = −13.6/n²)', w / 2, by0 - 14, { color: COLORS.muted, size: compact ? 10.5 : 12.5, align: 'center' });
        // energy levels: y ∝ E_n = -13.6/n² (n=1 lowest/most negative → bottom)
        const levelY = (n) => {
          const E = -13.6 / (n * n);
          return by1 - ((E + 13.6) / 13.6) * (by1 - by0); // -13.6→bottom, 0→top
        };
        const lx0 = bx - 70;
        const lx1 = bx + 70;
        for (let n = 1; n <= 6; n++) {
          const y = levelY(n);
          this.cache.draw(`lvl-${n}-${w}x${h}`, (g) => g.line(lx0, y, lx1, y, opts(985 + n, { stroke: n === 2 ? COLORS.cyan : COLORS.muted, strokeWidth: n === 2 ? 1.8 : 1.2 })));
          label(ctx, `n=${n}`, lx1 + 8, y + 3, { color: n === 2 ? COLORS.cyan : COLORS.muted, size: 10.5, align: 'left' });
        }
        label(ctx, 'level 2', lx0 - 8, levelY(2) + 3, { color: COLORS.cyan, size: 10.5, align: 'right' });
        // Balmer transitions n→2
        for (let i = 0; i < 4; i++) {
          const n = i + 3;
          const nm = H_LINES[i];
          const xJump = lx0 + 20 + i * 22;
          doodleArrow(rc, xJump, levelY(n), xJump, levelY(2), { color: wavelengthRGB(nm), seed: 990 + i, strokeWidth: 1.6 });
          label(ctx, H_NAMES[i], xJump, levelY(2) - 4, { color: wavelengthRGB(nm), size: 9.5, align: 'center' });
        }
        if (!compact) {
          label(ctx, 'each drop to level 2', bx + 110, by0 + 20, { color: COLORS.ink, size: 12, align: 'left' });
          label(ctx, 'emits one photon of', bx + 110, by0 + 36, { color: COLORS.muted, size: 11.5, align: 'left' });
          label(ctx, 'exactly the gap energy', bx + 110, by0 + 52, { color: COLORS.muted, size: 11.5, align: 'left' });
          label(ctx, '→ one sharp coloured line.', bx + 110, by0 + 68, { color: COLORS.muted, size: 11.5, align: 'left' });
          label(ctx, 'Hα (red) = the small', bx + 110, by0 + 92, { color: wavelengthRGB(656), size: 11.5, align: 'left' });
          label(ctx, '3→2 drop; Hβ (blue)', bx + 110, by0 + 108, { color: wavelengthRGB(486), size: 11.5, align: 'left' });
          label(ctx, 'is the bigger 4→2.', bx + 110, by0 + 124, { color: COLORS.muted, size: 11.5, align: 'left' });
        }
      } else {
        label(ctx, `${e.name} has more electrons, so a richer ladder — but the idea is identical:`, w / 2, by0 + 20, { color: COLORS.muted, size: compact ? 11 : 13, align: 'center' });
        label(ctx, 'fixed energy levels → fixed jumps → a unique barcode of colours.', w / 2, by0 + 42, { color: COLORS.muted, size: compact ? 11 : 13, align: 'center' });
        if (this.el === 'He') label(ctx, 'Helium was DISCOVERED in the Sun\'s spectrum in 1868 — 27 years before anyone found it on Earth.', w / 2, by0 + 72, { color: COLORS.yellow, size: compact ? 10.5 : 12, align: 'center' });
        if (this.el === 'Na') label(ctx, 'The sodium D-lines are why a salted flame burns yellow and old street lamps glowed orange.', w / 2, by0 + 72, { color: COLORS.yellow, size: compact ? 10.5 : 12, align: 'center' });
      }
    }
  }

  A.register('spectroscopy', SpectroscopySim);
})();
