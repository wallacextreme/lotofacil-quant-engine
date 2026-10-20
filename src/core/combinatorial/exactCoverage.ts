/**
 * Módulo de Avaliação Exata de Cobertura da Carteira no Espaço Amostral C(25, 15) = 3.268.760.
 *
 * Princípios Matemáticos e Algorítmicos Rigorosos (FASE 4):
 * - O universo de resultados da Lotofácil é finito e exatamente enumerável: C(25, 15) = 3.268.760.
 * - Enumeração bitwise ultra-rápida (Truque de Gosper + Tabela de lookup POPCOUNT_16 de 64K).
 * - Zero alocações no heap durante o loop dos 3.268.760 estados.
 * - Neutralização de bilhetes duplicados (jogos idênticos não inflam artificialmente a cobertura).
 * - Termos matemáticos auditáveis: `subsetCoverage` (cobertura de subconjuntos) e `unionBoundEfficiency`
 *   (relação entre a cobertura exata e o limite superior da desigualdade da união de Boole).
 */
import { UNIVERSE_SIZE } from '../domain/constants';
import { popcount32 } from '../util/bits';

export interface ExactSubsetCoverage {
  /** Pares cobertos pelo menos uma vez (universo de 300) */
  pairsCovered: number;
  totalPairs: number; // 300
  pairsCoverageRatio: number; // [0, 1]

  /** Ternos cobertos pelo menos uma vez (universo de 2.300) */
  triplesCovered: number;
  totalTriples: number; // 2300
  triplesCoverageRatio: number; // [0, 1]

  /** Quadras cobertas pelo menos uma vez (universo de 12.650) */
  quadruplesCovered: number;
  totalQuadruples: number; // 12650
  quadruplesCoverageRatio: number; // [0, 1]
}

export interface ExactPortfolioCoverageReport {
  totalOutcomesEvaluated: number; // 3268760
  uniqueGamesCount: number;
  duplicateGamesCount: number;
  /** Distribuição exata dos melhores acertos da carteira (tamanho 16, posições 0..15). A soma é 3.268.760. */
  bestHitDistribution: number[];
  exactProbabilities: {
    atLeast11: number;
    atLeast12: number;
    atLeast13: number;
    atLeast14: number;
    exact15: number;
  };
  unionBoundEfficiency: {
    atLeast11: number;
    atLeast12: number;
    atLeast13: number;
  };
  subsetCoverage: ExactSubsetCoverage;
  executionTimeMs: number;
}

export const TOTAL_LOTOFACIL_OUTCOMES = 3268760;

// Constantes teóricas para 1 único jogo de 15 dezenas (distribuição hipergeométrica exata)
export const SINGLE_GAME_THEORETICAL_COUNTS = Object.freeze([
  0, // 0 acertos
  0, // 1 acerto
  0, // 2 acertos
  0, // 3 acertos
  0, // 4 acertos
  3003, // 5 acertos: C(15, 5)*C(10, 10) = 3.003
  50050, // 6 acertos: C(15, 6)*C(10, 9) = 50.050
  289575, // 7 acertos: C(15, 7)*C(10, 8) = 289.575
  772200, // 8 acertos: C(15, 8)*C(10, 7) = 772.200
  1051050, // 9 acertos: C(15, 9)*C(10, 6) = 1.051.050
  756756, // 10 acertos: C(15, 10)*C(10, 5) = 756.756
  286650, // 11 acertos: C(15, 11)*C(10, 4) = 286.650
  54600, // 12 acertos: C(15, 12)*C(10, 3) = 54.600
  4725, // 13 acertos: C(15, 13)*C(10, 2) = 4.725
  150, // 14 acertos: C(15, 14)*C(10, 1) = 150
  1, // 15 acertos: C(15, 15)*C(10, 0) = 1
]);

// Tabela estática de contagem de bits em 16 bits (lookup O(1))
const POPCOUNT_16 = new Uint8Array(65536);
for (let i = 0; i < 65536; i++) {
  let c = 0;
  for (let b = 0; b < 16; b++) if ((i >> b) & 1) c++;
  POPCOUNT_16[i] = c;
}

// Mapeamento indexado de combinações de pares, ternos e quadras
const PAIR_INDEX: number[][] = Array.from({ length: UNIVERSE_SIZE }, () => new Array(UNIVERSE_SIZE).fill(0));
let pIdx = 0;
for (let i = 0; i < UNIVERSE_SIZE; i++) {
  for (let j = i + 1; j < UNIVERSE_SIZE; j++) {
    PAIR_INDEX[i]![j] = pIdx;
    PAIR_INDEX[j]![i] = pIdx;
    pIdx++;
  }
}

/**
 * Calcula a cobertura de subconjuntos (pares, ternos, quadras) cobertos pela carteira.
 */
export function computeSubsetCoverage(uniqueMasks: readonly number[]): ExactSubsetCoverage {
  const pairsSeen = new Uint8Array(300);
  const triplesSeen = new Uint8Array(2300);
  const quadsSeen = new Uint8Array(12650);

  // Tabelas de numeração lexicográfica para ternos e quadras
  const numListByMask: number[][] = uniqueMasks.map((m) => {
    const nums: number[] = [];
    for (let b = 0; b < UNIVERSE_SIZE; b++) {
      if ((m >>> b) & 1) nums.push(b);
    }
    return nums;
  });

  // Para ternos: indexação C(25, 3) = 2300
  let tIdx = 0;
  const tripleIndexMap = new Map<number, number>();
  for (let i = 0; i < 25; i++) {
    for (let j = i + 1; j < 25; j++) {
      for (let k = j + 1; k < 25; k++) {
        const key = (i << 10) | (j << 5) | k;
        tripleIndexMap.set(key, tIdx++);
      }
    }
  }

  // Para quadras: indexação C(25, 4) = 12650
  let qIdx = 0;
  const quadIndexMap = new Map<number, number>();
  for (let i = 0; i < 25; i++) {
    for (let j = i + 1; j < 25; j++) {
      for (let k = j + 1; k < 25; k++) {
        for (let l = k + 1; l < 25; l++) {
          const key = (i << 15) | (j << 10) | (k << 5) | l;
          quadIndexMap.set(key, qIdx++);
        }
      }
    }
  }

  for (const nums of numListByMask) {
    const len = nums.length;
    // Pares C(15, 2) = 105
    for (let i = 0; i < len; i++) {
      const nA = nums[i]!;
      for (let j = i + 1; j < len; j++) {
        const nB = nums[j]!;
        pairsSeen[PAIR_INDEX[nA]![nB]!] = 1;
      }
    }

    // Ternos C(15, 3) = 455
    for (let i = 0; i < len; i++) {
      const a = nums[i]!;
      for (let j = i + 1; j < len; j++) {
        const b = nums[j]!;
        for (let k = j + 1; k < len; k++) {
          const c = nums[k]!;
          const key = (a << 10) | (b << 5) | c;
          const idx = tripleIndexMap.get(key);
          if (idx !== undefined) triplesSeen[idx] = 1;
        }
      }
    }

    // Quadras C(15, 4) = 1365
    for (let i = 0; i < len; i++) {
      const a = nums[i]!;
      for (let j = i + 1; j < len; j++) {
        const b = nums[j]!;
        for (let k = j + 1; k < len; k++) {
          const c = nums[k]!;
          for (let l = k + 1; l < len; l++) {
            const d = nums[l]!;
            const key = (a << 15) | (b << 10) | (c << 5) | d;
            const idx = quadIndexMap.get(key);
            if (idx !== undefined) quadsSeen[idx] = 1;
          }
        }
      }
    }
  }

  let pairsCovered = 0;
  for (let i = 0; i < 300; i++) if (pairsSeen[i]) pairsCovered++;

  let triplesCovered = 0;
  for (let i = 0; i < 2300; i++) if (triplesSeen[i]) triplesCovered++;

  let quadruplesCovered = 0;
  for (let i = 0; i < 12650; i++) if (quadsSeen[i]) quadruplesCovered++;

  return {
    pairsCovered,
    totalPairs: 300,
    pairsCoverageRatio: Number((pairsCovered / 300).toFixed(4)),
    triplesCovered,
    totalTriples: 2300,
    triplesCoverageRatio: Number((triplesCovered / 2300).toFixed(4)),
    quadruplesCovered,
    totalQuadruples: 12650,
    quadruplesCoverageRatio: Number((quadruplesCovered / 12650).toFixed(4)),
  };
}

/**
 * Avalia de forma determinística e exata uma carteira contra os 3.268.760 estados de C(25, 15).
 */
export function evaluateExactPortfolioCoverage(
  portfolioMasks: readonly number[],
): ExactPortfolioCoverageReport {
  const startTime = Date.now();

  // 1. Desduplicação estrita de máscaras (jogos idênticos não contam duas vezes)
  const uniqueMasksSet = new Set<number>();
  for (const m of portfolioMasks) {
    if (m > 0 && popcount32(m) === 15) {
      uniqueMasksSet.add(m >>> 0);
    }
  }

  const uniqueMasks = Array.from(uniqueMasksSet);
  const uniqueGamesCount = uniqueMasks.length;
  const duplicateGamesCount = portfolioMasks.length - uniqueGamesCount;

  if (uniqueGamesCount === 0) {
    return {
      totalOutcomesEvaluated: TOTAL_LOTOFACIL_OUTCOMES,
      uniqueGamesCount: 0,
      duplicateGamesCount: portfolioMasks.length,
      bestHitDistribution: new Array(16).fill(0),
      exactProbabilities: {
        atLeast11: 0,
        atLeast12: 0,
        atLeast13: 0,
        atLeast14: 0,
        exact15: 0,
      },
      unionBoundEfficiency: {
        atLeast11: 0,
        atLeast12: 0,
        atLeast13: 0,
      },
      subsetCoverage: {
        pairsCovered: 0,
        totalPairs: 300,
        pairsCoverageRatio: 0,
        triplesCovered: 0,
        totalTriples: 2300,
        triplesCoverageRatio: 0,
        quadruplesCovered: 0,
        totalQuadruples: 12650,
        quadruplesCoverageRatio: 0,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 2. Loop de Enumeração Bitwise Exata sobre C(25, 15) = 3.268.760 (Truque de Gosper)
  const bestHitDistribution = new Uint32Array(16);
  const K = uniqueMasks.length;
  const uMasks = new Uint32Array(uniqueMasks);

  let x = (1 << 15) - 1; // 0x7FFF
  const limit = 1 << 25; // 33554432
  let evaluatedCount = 0;

  while (x < limit) {
    evaluatedCount++;
    let maxHit = 0;

    for (let k = 0; k < K; k++) {
      const inter = x & uMasks[k]!;
      const h = POPCOUNT_16[inter & 0xffff]! + POPCOUNT_16[inter >>> 16]!;
      if (h > maxHit) {
        maxHit = h;
        if (maxHit === 15) break; // Se algum jogo já fez 15 pontos, não pode ser superado
      }
    }

    bestHitDistribution[maxHit] = (bestHitDistribution[maxHit] ?? 0) + 1;

    // Truque de Gosper para próximo número com 15 bits setados
    const c = (x & -x) >>> 0;
    const r = (x + c) >>> 0;
    x = ((((r ^ x) >>> 2) / c) | r) >>> 0;
  }

  // 3. Métricas Probabilísticas Exatas
  const bestHitsArray = Array.from(bestHitDistribution);

  const count15 = bestHitsArray[15]!;
  const count14 = count15 + bestHitsArray[14]!;
  const count13 = count14 + bestHitsArray[13]!;
  const count12 = count13 + bestHitsArray[12]!;
  const count11 = count12 + bestHitsArray[11]!;

  const exactProbabilities = {
    atLeast11: Number((count11 / TOTAL_LOTOFACIL_OUTCOMES).toFixed(6)),
    atLeast12: Number((count12 / TOTAL_LOTOFACIL_OUTCOMES).toFixed(6)),
    atLeast13: Number((count13 / TOTAL_LOTOFACIL_OUTCOMES).toFixed(6)),
    atLeast14: Number((count14 / TOTAL_LOTOFACIL_OUTCOMES).toFixed(6)),
    exact15: Number((count15 / TOTAL_LOTOFACIL_OUTCOMES).toFixed(8)),
  };

  // 4. Eficiência em Relação ao Limite da União de Boole (Boole's Union Bound)
  // Limite superior teórico de K jogos disjuntos: min(3.268.760, K * contagem_teorica_1_jogo)
  const single11 = 286650 + 54600 + 4725 + 150 + 1; // 346.126
  const single12 = 54600 + 4725 + 150 + 1; // 59.476
  const single13 = 4725 + 150 + 1; // 4.876

  const unionBound11 = Math.min(TOTAL_LOTOFACIL_OUTCOMES, K * single11);
  const unionBound12 = Math.min(TOTAL_LOTOFACIL_OUTCOMES, K * single12);
  const unionBound13 = Math.min(TOTAL_LOTOFACIL_OUTCOMES, K * single13);

  const unionBoundEfficiency = {
    atLeast11: unionBound11 > 0 ? Number((count11 / unionBound11).toFixed(4)) : 1.0,
    atLeast12: unionBound12 > 0 ? Number((count12 / unionBound12).toFixed(4)) : 1.0,
    atLeast13: unionBound13 > 0 ? Number((count13 / unionBound13).toFixed(4)) : 1.0,
  };

  // 5. Cobertura de Subconjuntos
  const subsetCoverage = computeSubsetCoverage(uniqueMasks);

  const executionTimeMs = Date.now() - startTime;

  return {
    totalOutcomesEvaluated: evaluatedCount,
    uniqueGamesCount,
    duplicateGamesCount,
    bestHitDistribution: bestHitsArray,
    exactProbabilities,
    unionBoundEfficiency,
    subsetCoverage,
    executionTimeMs,
  };
}
