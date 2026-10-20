/**
 * Funções especiais para inferência estatística, sem dependências externas.
 *
 * - lnGamma: aproximação de Lanczos (g=7, n=9), erro relativo ~1e-15.
 * - gammaP / gammaQ: gama incompleta regularizada (série para x < a+1, fração contínua
 *   de Lentz caso contrário), conforme Numerical Recipes §6.2.
 * - chiSquareSurvival(x, k) = Q(k/2, x/2) = P(χ²_k ≥ x).
 * - normalCdf via erfc (Numerical Recipes erfcc, precisão ~1.2e-7) — usado apenas para
 *   rótulos aproximados; p-valores do χ² usam a gama incompleta (precisão ~1e-14).
 */

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function lnGamma(z: number): number {
  if (z <= 0) throw new Error(`lnGamma definido apenas para z > 0 (recebido ${z})`);
  if (z < 0.5) {
    // Reflexão: Γ(z)Γ(1−z) = π / sin(πz)
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  const x = z - 1;
  let a = LANCZOS[0]!;
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i]! / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

const EPS = 1e-15;
const FPMIN = 1e-300;
const MAX_ITER = 10000;

function gammaSeries(a: number, x: number): number {
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 0; n < MAX_ITER; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

function gammaContinuedFraction(a: number, x: number): number {
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < MAX_ITER; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** Gama incompleta regularizada inferior P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) throw new Error('gammaP: argumentos inválidos');
  if (x === 0) return 0;
  return x < a + 1 ? gammaSeries(a, x) : 1 - gammaContinuedFraction(a, x);
}

/** Gama incompleta regularizada superior Q(a, x) = 1 − P(a, x). */
export function gammaQ(a: number, x: number): number {
  if (x < 0 || a <= 0) throw new Error('gammaQ: argumentos inválidos');
  if (x === 0) return 1;
  return x < a + 1 ? 1 - gammaSeries(a, x) : gammaContinuedFraction(a, x);
}

/** P(χ²_df ≥ x). */
export function chiSquareSurvival(x: number, df: number): number {
  if (df <= 0) throw new Error('df deve ser positivo');
  if (x <= 0) return 1;
  return gammaQ(df / 2, x / 2);
}

export function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? r : 2 - r;
}

/** Φ(z) da normal padrão. */
export function normalCdf(z: number): number {
  return 0.5 * erfc(-z / Math.SQRT2);
}

export function mean(xs: ArrayLike<number>): number {
  if (xs.length === 0) return Number.NaN;
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i]!;
  return s / xs.length;
}

/** Desvio padrão; `sample=true` usa denominador n−1. */
export function stdDev(xs: ArrayLike<number>, sample = true): number {
  const n = xs.length;
  if (n === 0 || (sample && n < 2)) return Number.NaN;
  const m = mean(xs);
  let s = 0;
  for (let i = 0; i < n; i++) s += (xs[i]! - m) ** 2;
  return Math.sqrt(s / (sample ? n - 1 : n));
}
