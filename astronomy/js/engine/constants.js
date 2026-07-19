// Physical constants (SI, CODATA / IAU values) and display formatters.
// Every simulation computes in these units; only the *drawing* is scaled.

export const G = 6.6743e-11;          // m^3 kg^-1 s^-2
export const C = 299792458;           // m/s
export const C2 = C * C;

export const M_SUN = 1.98892e30;      // kg
export const M_EARTH = 5.9722e24;     // kg
export const R_SUN = 6.957e8;         // m
export const R_EARTH = 6.371e6;       // m

export const AU = 1.495978707e11;     // m
export const LY = 9.4607304726e15;    // m
export const PC = 3.0856775815e16;    // m

export const HBAR = 1.054571817e-34;  // J s
export const K_B = 1.380649e-23;      // J/K
export const SIGMA_SB = 5.670374419e-8; // W m^-2 K^-4
export const WIEN_B = 2.897771955e-3; // m K

export const KT_TNT = 4.184e12;       // J per kiloton of TNT
export const YEAR = 3.15576e7;        // s (Julian year)
export const DAY = 86400;             // s

// Named masses used across sims
export const M_SGRA = 4.15e6 * M_SUN; // Sgr A* (GRAVITY collaboration)
export const M_M87 = 6.5e9 * M_SUN;   // M87* (Event Horizon Telescope)

export function schwarzschildRadius(M) {
  return (2 * G * M) / C2;
}

/* ---------------- formatters ---------------- */

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

function sup(n) {
  return String(n).split('').map((ch) => SUP[ch] ?? ch).join('');
}

// 8.99e13 -> "8.99×10¹³"
export function sci(x, digits = 2) {
  if (x === 0) return '0';
  if (!isFinite(x)) return '∞';
  const exp = Math.floor(Math.log10(Math.abs(x)));
  if (exp >= -2 && exp < 4) return fmtNum(x, digits);
  const mant = x / 10 ** exp;
  return `${mant.toFixed(digits)}×10${sup(exp)}`;
}

export function fmtNum(x, digits = 2) {
  const r = Number(x.toFixed(digits));
  return r.toLocaleString('en-US', { maximumFractionDigits: digits });
}

// Pick a sensible length unit.
export function fmtLen(m, digits = 2) {
  const abs = Math.abs(m);
  if (abs >= 0.1 * LY) return `${fmtNum(m / LY, digits)} light-years`;
  if (abs >= 0.05 * AU) return `${fmtNum(m / AU, digits)} AU`;
  if (abs >= 1e3) return `${sci(m / 1e3, digits)} km`;
  return `${sci(m, digits)} m`;
}

// Pick a sensible time unit.
export function fmtTime(s, digits = 2) {
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

export const ARCSEC_PER_RAD = 206264.806; // arcseconds in one radian
