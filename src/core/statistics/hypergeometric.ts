/**
 * Distribuição hipergeométrica — FATO MATEMÁTICO.
 *
 * X = número de elementos de um subconjunto "marcado" de tamanho K presentes numa amostra
 * de tamanho n retirada sem reposição de uma população de tamanho N:
 *
 *   P(X = k) = C(K,k)·C(N−K, n−k) / C(N,n)
 *
 * ATENÇÃO CONCEITUAL: isto é a distribuição de uma CONTAGEM (ex.: quantos primos saem),
 * não a probabilidade de uma combinação específica (que é sempre 1/C(25,15)).
 */
import { binomial } from './combinations';

export interface HypergeometricParams {
  N: number;
  K: number;
  n: number;
}

export function hypergeometricPmf(k: number, { N, K, n }: HypergeometricParams): number {
  if (k < Math.max(0, n - (N - K)) || k > Math.min(n, K)) return 0;
  return (binomial(K, k) * binomial(N - K, n - k)) / binomial(N, n);
}

/** P(a ≤ X ≤ b). */
export function hypergeometricRange(a: number, b: number, p: HypergeometricParams): number {
  let s = 0;
  for (let k = Math.max(a, 0); k <= b; k++) s += hypergeometricPmf(k, p);
  return s;
}

export function hypergeometricMean({ N, K, n }: HypergeometricParams): number {
  return (n * K) / N;
}

/** Var(X) = n·(K/N)·(1−K/N)·(N−n)/(N−1) — inclui o fator de correção de população finita. */
export function hypergeometricVariance({ N, K, n }: HypergeometricParams): number {
  const p = K / N;
  return n * p * (1 - p) * ((N - n) / (N - 1));
}

export function hypergeometricDistribution(p: HypergeometricParams): { k: number; probability: number }[] {
  const out: { k: number; probability: number }[] = [];
  for (let k = Math.max(0, p.n - (p.N - p.K)); k <= Math.min(p.n, p.K); k++) {
    out.push({ k, probability: hypergeometricPmf(k, p) });
  }
  return out;
}
