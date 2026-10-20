/**
 * Distância de Hamming entre apostas representadas como vetores binários de 25 posições.
 *
 * Propriedades Matemáticas:
 *   d_H(A, B) = popcount(maskA ⊕ maskB)
 *
 * Como cada aposta da Lotofácil tem exatamente 15 dezenas (popcount = 15):
 *   Se compartilharem k dezenas em comum:
 *   d_H(A, B) = (15 - k) + (15 - k) = 30 - 2k
 *
 * A distância é sempre par:
 *   10 comuns ⇔ d_H = 10 (mínimo padrão §22)
 *    9 comuns ⇔ d_H = 12
 *    8 comuns ⇔ d_H = 14
 *    7 comuns ⇔ d_H = 16
 *
 * A matriz completa é simétrica com diagonal zero.
 */
import { popcount32 } from '../util/bits';

export interface HammingAnalysis {
  matrix: number[][];
  minDistance: number;
  maxDistance: number;
  meanDistance: number;
  pairCount: number;
  violatingPairs: { gameA: number; gameB: number; distance: number }[];
  isPortfolioValid: boolean;
}

export function hammingDistance(maskA: number, maskB: number): number {
  return popcount32((maskA ^ maskB) >>> 0);
}

/**
 * Calcula a matriz de Hamming completa e métricas do portfólio de jogos.
 */
export function analyzeHammingPortfolio(masks: readonly number[], requiredMinHamming = 10): HammingAnalysis {
  const K = masks.length;
  const matrix: number[][] = Array.from({ length: K }, () => new Array<number>(K).fill(0));

  if (K <= 1) {
    return {
      matrix,
      minDistance: 0,
      maxDistance: 0,
      meanDistance: 0,
      pairCount: 0,
      violatingPairs: [],
      isPortfolioValid: true,
    };
  }

  let min = 999;
  let max = -1;
  let sum = 0;
  let pairCount = 0;
  const violatingPairs: { gameA: number; gameB: number; distance: number }[] = [];

  for (let i = 0; i < K; i++) {
    const mA = masks[i]!;
    for (let j = i + 1; j < K; j++) {
      const mB = masks[j]!;
      const d = hammingDistance(mA, mB);
      matrix[i]![j] = d;
      matrix[j]![i] = d;

      if (d < min) min = d;
      if (d > max) max = d;
      sum += d;
      pairCount++;

      if (d < requiredMinHamming) {
        violatingPairs.push({ gameA: i + 1, gameB: j + 1, distance: d });
      }
    }
  }

  return {
    matrix,
    minDistance: min,
    maxDistance: max,
    meanDistance: pairCount > 0 ? sum / pairCount : 0,
    pairCount,
    violatingPairs,
    isPortfolioValid: violatingPairs.length === 0,
  };
}
