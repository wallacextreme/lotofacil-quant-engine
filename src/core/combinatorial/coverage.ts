/**
 * Análise de Cobertura de Portfólio e Covering Design Heurístico (§23).
 *
 * ESCLARECIMENTO EPISTEMOLÓGICO OBRIGATÓRIO:
 *
 * 1. FATO MATEMÁTICO:
 *    - O universo possui 25 dezenas e C(25, 2) = 300 pares de dezenas possíveis.
 *    - Cada aposta de 15 dezenas cobre exatamente 15 dezenas e C(15, 2) = 105 pares.
 *    - As métricas de cobertura de dezenas (1-cobertura) e cobertura de pares (2-cobertura)
 *      apresentadas aqui são CÁLCULOS EXATOS E AUDITÁVEIS sobre o conjunto gerado.
 *
 * 2. HEURÍSTICA:
 *    - O algoritmo de otimização seleciona jogos que equilibram alta cobertura global,
 *      espaçamento por distância de Hamming e score estatístico.
 *    - Isso NÃO CONSTITUI garantia matemática de fechamento completo (Covering Code t-(v,k,λ))
 *      para acertos de 14 ou 15 pontos, salvo se o número de combinações atingir o limite
 *      combinatório teórico formal.
 */
import { UNIVERSE_SIZE } from '../domain/constants';
import { popcount32 } from '../util/bits';

export interface CoverageReport {
  totalGames: number;
  /** Dezenas únicas cobertas pelo portfólio (1..25) */
  uniqueNumbersCovered: number[];
  /** Contagem de dezenas cobertas (ex: 25 de 25) */
  numbersCoveredCount: number;
  /** Percentual de dezenas cobertas (0.0 a 1.0) */
  numbersCoverageRatio: number;
  /** Frequência de repetição de cada dezena no portfólio (1..25) */
  numberDistribution: { number: number; appearances: number; percentage: number }[];
  /** Contagem de pares distintos cobertos pelo portfólio (de 300 possíveis) */
  uniquePairsCoveredCount: number;
  /** Percentual de pares cobertos (0.0 a 1.0) */
  pairsCoverageRatio: number;
  /** Dezenas que NÃO foram incluídas em nenhum jogo */
  uncoveredNumbers: number[];
  /** Média de dezenas repetidas entre pares de jogos */
  meanIntersection: number;
}

export function evaluatePortfolioCoverage(masks: readonly number[]): CoverageReport {
  const K = masks.length;
  if (K === 0) {
    return {
      totalGames: 0,
      uniqueNumbersCovered: [],
      numbersCoveredCount: 0,
      numbersCoverageRatio: 0,
      numberDistribution: [],
      uniquePairsCoveredCount: 0,
      pairsCoverageRatio: 0,
      uncoveredNumbers: Array.from({ length: UNIVERSE_SIZE }, (_, i) => i + 1),
      meanIntersection: 0,
    };
  }

  // 1-cobertura (dezenas)
  const numAppearances = new Array<number>(UNIVERSE_SIZE).fill(0);

  for (const m of masks) {
    for (let i = 0; i < UNIVERSE_SIZE; i++) {
      if ((m >>> i) & 1) numAppearances[i]!++;
    }
  }

  const uniqueNumbersCovered: number[] = [];
  const uncoveredNumbers: number[] = [];
  const numberDistribution: { number: number; appearances: number; percentage: number }[] = [];

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const num = i + 1;
    const count = numAppearances[i]!;
    if (count > 0) uniqueNumbersCovered.push(num);
    else uncoveredNumbers.push(num);

    numberDistribution.push({
      number: num,
      appearances: count,
      percentage: K > 0 ? (count / K) * 100 : 0,
    });
  }

  // 2-cobertura (pares de 300 possíveis)
  const coveredPairs = new Uint8Array(300);
  let pairIdx = 0;
  let uniquePairsCount = 0;

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    for (let j = i + 1; j < UNIVERSE_SIZE; j++) {
      const pairMask = (1 << i) | (1 << j);
      for (const m of masks) {
        if ((m & pairMask) === pairMask) {
          coveredPairs[pairIdx] = 1;
          uniquePairsCount++;
          break;
        }
      }
      pairIdx++;
    }
  }

  // Interseção média entre jogos
  let sumInter = 0;
  let pairCount = 0;
  for (let i = 0; i < K; i++) {
    for (let j = i + 1; j < K; j++) {
      sumInter += popcount32(masks[i]! & masks[j]!);
      pairCount++;
    }
  }

  return {
    totalGames: K,
    uniqueNumbersCovered,
    numbersCoveredCount: uniqueNumbersCovered.length,
    numbersCoverageRatio: uniqueNumbersCovered.length / UNIVERSE_SIZE,
    numberDistribution,
    uniquePairsCoveredCount: uniquePairsCount,
    pairsCoverageRatio: uniquePairsCount / 300,
    uncoveredNumbers,
    meanIntersection: pairCount > 0 ? sumInter / pairCount : 0,
  };
}
