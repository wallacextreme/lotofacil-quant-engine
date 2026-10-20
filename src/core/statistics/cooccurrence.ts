/**
 * Análise de Coocorrência de Pares e Trincas.
 *
 * Baselines teóricos sob amostragem uniforme sem reposição:
 * - Par (i, j) com i ≠ j:
 *     P(i, j) = (15 / 25) * (14 / 24) = 7 / 20 = 0,35
 *     E_pair = T * 0,35
 *     Var_pair = T * 0,35 * (1 - 0,35) = T * 0,2275 (aproximação binomial)
 *     standardizedDifference = (observed - E_pair) / sqrt(Var_pair)
 *
 * - Trinca (i, j, k) com i < j < k:
 *     P(i, j, k) = (15 / 25) * (14 / 24) * (13 / 23) = 91 / 460 ≈ 0,197826087
 *     E_triplet = T * (91 / 460)
 *
 * Classificação: ESTATÍSTICA (descrição de dados históricos) vs FATO MATEMÁTICO (baselines).
 */
import { PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';
import type { Contest } from '../domain/types';

export const THEORETICAL_PAIR_BASELINE =
  (PICK_SIZE / UNIVERSE_SIZE) * ((PICK_SIZE - 1) / (UNIVERSE_SIZE - 1)); // 0.35
export const THEORETICAL_TRIPLET_BASELINE =
  (PICK_SIZE / UNIVERSE_SIZE) *
  ((PICK_SIZE - 1) / (UNIVERSE_SIZE - 1)) *
  ((PICK_SIZE - 2) / (UNIVERSE_SIZE - 2)); // 91 / 460 ≈ 0.197826

export interface PairCell {
  numA: number;
  numB: number;
  occurrenceCount: number;
  relativeFrequency: number;
  theoreticalBaseline: number;
  expectedCount: number;
  difference: number;
  excessRelative: number; // relativeFrequency - theoreticalBaseline
  standardizedDifference: number; // z-score do par
}

export interface TripletCooccurrence {
  numA: number;
  numB: number;
  numC: number;
  occurrenceCount: number;
  relativeFrequency: number;
  theoreticalBaseline: number;
  expectedCount: number;
  difference: number;
  standardizedDifference: number;
}

export interface CooccurrenceAnalysis {
  totalContests: number;
  pairBaseline: number;
  tripletBaseline: number;
  /** Matriz 25×25 de contagem absoluta de coocorrência */
  pairMatrix: number[][];
  /** Detalhes de todos os C(25,2) = 300 pares */
  pairs: PairCell[];
  /** Pares mais frequentes */
  topPairs: PairCell[];
  /** Pares menos frequentes */
  bottomPairs: PairCell[];
  /** Maiores desvios positivos do baseline */
  highestPairExcess: PairCell[];
  /** Maiores desvios negativos do baseline */
  lowestPairExcess: PairCell[];
  /** Trincas mais frequentes */
  topTriplets: TripletCooccurrence[];
  /** Trincas menos frequentes */
  bottomTriplets: TripletCooccurrence[];
}

export function computeCooccurrence(contests: readonly Contest[], topK = 15): CooccurrenceAnalysis {
  const T = contests.length;
  const pPair = THEORETICAL_PAIR_BASELINE;
  const expPair = T * pPair;
  const sePair = T > 0 ? Math.sqrt(T * pPair * (1 - pPair)) : 1;

  const pTri = THEORETICAL_TRIPLET_BASELINE;
  const expTri = T * pTri;
  const seTri = T > 0 ? Math.sqrt(T * pTri * (1 - pTri)) : 1;

  const pairMatrix: number[][] = Array.from({ length: UNIVERSE_SIZE }, () =>
    new Array<number>(UNIVERSE_SIZE).fill(0),
  );

  // Pré-computa bitmasks para aceleração
  const masks = new Uint32Array(T);
  for (let t = 0; t < T; t++) {
    let m = 0;
    for (const num of contests[t]!.numbers) {
      if (num >= 1 && num <= UNIVERSE_SIZE) {
        m |= 1 << (num - 1);
      }
    }
    masks[t] = m;
  }

  // Contagem de pares
  const pairs: PairCell[] = [];
  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const bitI = 1 << i;
    for (let j = i + 1; j < UNIVERSE_SIZE; j++) {
      const bitJ = 1 << j;
      const pairMask = bitI | bitJ;
      let count = 0;
      for (let t = 0; t < T; t++) {
        if ((masks[t]! & pairMask) === pairMask) {
          count++;
        }
      }
      pairMatrix[i]![j] = count;
      pairMatrix[j]![i] = count;

      const relFreq = T > 0 ? count / T : 0;
      const diff = count - expPair;
      const stdDiff = sePair > 0 ? diff / sePair : 0;

      pairs.push({
        numA: i + 1,
        numB: j + 1,
        occurrenceCount: count,
        relativeFrequency: relFreq,
        theoreticalBaseline: pPair,
        expectedCount: expPair,
        difference: diff,
        excessRelative: relFreq - pPair,
        standardizedDifference: stdDiff,
      });
    }
  }

  // Diagonal da matriz (frequência individual)
  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const bitI = 1 << i;
    let singleCount = 0;
    for (let t = 0; t < T; t++) {
      if ((masks[t]! & bitI) !== 0) singleCount++;
    }
    pairMatrix[i]![i] = singleCount;
  }

  // Contagem de trincas C(25, 3) = 2300
  const triplets: TripletCooccurrence[] = [];
  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const bitI = 1 << i;
    for (let j = i + 1; j < UNIVERSE_SIZE; j++) {
      const bitJ = 1 << j;
      const pairMask = bitI | bitJ;
      for (let k = j + 1; k < UNIVERSE_SIZE; k++) {
        const triMask = pairMask | (1 << k);
        let count = 0;
        for (let t = 0; t < T; t++) {
          if ((masks[t]! & triMask) === triMask) {
            count++;
          }
        }

        const relFreq = T > 0 ? count / T : 0;
        const diff = count - expTri;
        const stdDiff = seTri > 0 ? diff / seTri : 0;

        triplets.push({
          numA: i + 1,
          numB: j + 1,
          numC: k + 1,
          occurrenceCount: count,
          relativeFrequency: relFreq,
          theoreticalBaseline: pTri,
          expectedCount: expTri,
          difference: diff,
          standardizedDifference: stdDiff,
        });
      }
    }
  }

  const topPairs = [...pairs].sort((a, b) => b.occurrenceCount - a.occurrenceCount).slice(0, topK);
  const bottomPairs = [...pairs].sort((a, b) => a.occurrenceCount - b.occurrenceCount).slice(0, topK);
  const highestPairExcess = [...pairs].sort((a, b) => b.excessRelative - a.excessRelative).slice(0, topK);
  const lowestPairExcess = [...pairs].sort((a, b) => a.excessRelative - b.excessRelative).slice(0, topK);

  const topTriplets = [...triplets].sort((a, b) => b.occurrenceCount - a.occurrenceCount).slice(0, topK);
  const bottomTriplets = [...triplets].sort((a, b) => a.occurrenceCount - b.occurrenceCount).slice(0, topK);

  return {
    totalContests: T,
    pairBaseline: pPair,
    tripletBaseline: pTri,
    pairMatrix,
    pairs,
    topPairs,
    bottomPairs,
    highestPairExcess,
    lowestPairExcess,
    topTriplets,
    bottomTriplets,
  };
}
