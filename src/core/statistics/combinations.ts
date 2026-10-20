/**
 * Coeficientes binomiais — FATO MATEMÁTICO.
 *
 * C(n,k) = n! / (k!(n−k)!) calculado pelo produto multiplicativo
 *   C = ∏_{i=1..k} (n−k+i)/i
 * onde cada passo intermediário é inteiro (C(n−k+i, i)), evitando fatoriais e overflow
 * precoce. Lança erro se o resultado exceder 2^53 (use `binomialBig`).
 */
export function binomial(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k))
    throw new Error('binomial: argumentos devem ser inteiros');
  if (k < 0 || n < 0 || k > n) return 0;
  const kk = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= kk; i++) {
    // r * (n−kk+i) é divisível por i; reordena para manter exatidão
    const num = n - kk + i;
    const g = gcd(r, i);
    r = (r / g) * (num / (i / g));
    if (!Number.isSafeInteger(r))
      throw new Error(`binomial(${n},${k}) excede inteiro seguro; use binomialBig`);
  }
  return r;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

export function binomialBig(n: number, k: number): bigint {
  if (k < 0 || n < 0 || k > n) return 0n;
  const kk = BigInt(Math.min(k, n - k));
  const N = BigInt(n);
  let r = 1n;
  for (let i = 1n; i <= kk; i++) r = (r * (N - kk + i)) / i;
  return r;
}

/** ln C(n,k) via soma de logaritmos (estável para n grande). */
export function logBinomial(n: number, k: number): number {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
  const kk = Math.min(k, n - k);
  let s = 0;
  for (let i = 1; i <= kk; i++) s += Math.log(n - kk + i) - Math.log(i);
  return s;
}

/** Tamanho do espaço amostral da Lotofácil: C(25,15) = 3.268.760. */
export const SAMPLE_SPACE = binomial(25, 15);

/** P(uma combinação específica de 15 dezenas) = 1 / C(25,15). */
export const SINGLE_COMBINATION_PROBABILITY = 1 / SAMPLE_SPACE;
