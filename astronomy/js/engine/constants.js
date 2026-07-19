// Physical constants (SI, CODATA / IAU values) and display formatters.
// Every simulation computes in these units; only the *drawing* is scaled.

(() => {
  const A = (window.Astro = window.Astro || {});

  const G = 6.6743e-11;          // m^3 kg^-1 s^-2
  const C = 299792458;           // m/s
  const C2 = C * C;

  const M_SUN = 1.98892e30;      // kg
  const M_EARTH = 5.9722e24;     // kg
  const R_SUN = 6.957e8;         // m
  const R_EARTH = 6.371e6;       // m

  const AU = 1.495978707e11;     // m
  const LY = 9.4607304726e15;    // m
  const PC = 3.0856775815e16;    // m

  const HBAR = 1.054571817e-34;  // J s
  const K_B = 1.380649e-23;      // J/K
  const SIGMA_SB = 5.670374419e-8; // W m^-2 K^-4
  const WIEN_B = 2.897771955e-3; // m K

  const KT_TNT = 4.184e12;       // J per kiloton of TNT
  const YEAR = 3.15576e7;        // s (Julian year)
  const DAY = 86400;             // s

  // Named masses used across sims
  const M_SGRA = 4.15e6 * M_SUN; // Sgr A* (GRAVITY collaboration)
  const M_M87 = 6.5e9 * M_SUN;   // M87* (Event Horizon Telescope)

  function schwarzschildRadius(M) {
    return (2 * G * M) / C2;
  }

  /* ---------------- formatters ---------------- */

  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

  function sup(n) {
    return String(n).split('').map((ch) => SUP[ch] !== undefined ? SUP[ch] : ch).join('');
  }

  // 8.99e13 -> "8.99×10¹³"
  function sci(x, digits = 2) {
    if (x === 0) return '0';
    if (!isFinite(x)) return '∞';
    const exp = Math.floor(Math.log10(Math.abs(x)));
    if (exp >= -2 && exp < 4) return fmtNum(x, digits);
    const mant = x / 10 ** exp;
    return `${mant.toFixed(digits)}×10${sup(exp)}`;
  }

  function fmtNum(x, digits = 2) {
    const r = Number(x.toFixed(digits));
    return r.toLocaleString('en-US', { maximumFractionDigits: digits });
  }

  // Pick a sensible length unit.
  function fmtLen(m, digits = 2) {
    const abs = Math.abs(m);
    if (abs >= 0.1 * LY) return `${fmtNum(m / LY, digits)} light-years`;
    if (abs >= 0.05 * AU) return `${fmtNum(m / AU, digits)} AU`;
    if (abs >= 1e3) return `${sci(m / 1e3, digits)} km`;
    return `${sci(m, digits)} m`;
  }

  // Pick a sensible time unit.
  function fmtTime(s, digits = 2) {
    const abs = Math.abs(s);
    if (!isFinite(s)) return '∞';
    if (abs >= 100 * YEAR) return `${sci(s / YEAR, digits)} years`;
    if (abs >= YEAR) return `${fmtNum(s / YEAR, digits)} years`;
    if (abs >= 2 * DAY) return `${fmtNum(s / DAY, digits)} days`;
    if (abs >= 3600) return `${fmtNum(s / 3600, digits)} hours`;
    if (abs >= 60) return `${fmtNum(s / 60, digits)} min`;
    if (abs >= 1) return `${fmtNum(s, digits)} s`;
    if (abs >= 1e-3) return `${fmtNum(s * 1e3, digits)} ms`;
    return `${sci(s, digits)} s`;
  }

  const ARCSEC_PER_RAD = 206264.806; // arcseconds in one radian

  Object.assign(A, {
    G, C, C2, M_SUN, M_EARTH, R_SUN, R_EARTH, AU, LY, PC,
    HBAR, K_B, SIGMA_SB, WIEN_B, KT_TNT, YEAR, DAY, M_SGRA, M_M87,
    schwarzschildRadius, sci, fmtNum, fmtLen, fmtTime, ARCSEC_PER_RAD,
  });
})();
