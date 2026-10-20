/**
 * Módulo de Análise Avançada de Relacionamento entre Dezenas (PairRelationshipAnalyzer).
 *
 * Princípios Matemáticos Rigorosos (§5, §6, §7, §8):
 * - Na Lotofácil, cada concurso extrai n = 15 dezenas de N = 25 SEM REPOSIÇÃO.
 * - Sob sorteios uniformes independentes (equiprobabilidade):
 *     p_1 = P(A) = 15/25 = 0,60
 *     p_2 = P(A ∩ B) = (15/25) * (14/24) = 7/20 = 0,35
 *     p_1^2 = 0,36 ≠ 0,35  (covariância negativa estrutural de amostragem sem reposição)
 * - Distinção explícita entre:
 *     1. Teste A: Desvio da frequência conjunta em relação ao sorteio uniforme hipergeométrico (Binomial T, 0,35).
 *     2. Teste B: Associação condicional às frequências marginais observadas (N_A, N_B) ajustada pelo fator 35/36.
 *     3. Lift Estrutural: Métrica descritiva normalizada (E[Lift_corr] = 1,000 sob H0).
 * - Controle Rigoroso de Falsos Positivos: Procedimento de Benjamini-Hochberg (FDR) sobre a família de 300 pares.
 * - Estabilidade Temporal: Janelas históricas (Completo, 500, 200, 100 e Ciclo Atual).
 */
import { UNIVERSE_SIZE } from '../domain/constants';
import type { Contest } from '../domain/types';
import { erfc } from '../util/special';

export interface PairTestA {
  /** Expectativa teórica sob sorteio uniforme binomial: 0,35 * T */
  expected: number;
  /** Variância teórica: T * 0,35 * 0,65 = 0,2275 * T */
  variance: number;
  /** Z-score com correção de continuidade de Yates */
  zScore: number;
  /** p-valor bilateral */
  pValue: number;
}

export interface PairTestB {
  /** Expectativa condicional corrigida pelo fator estrutural: (N_A * N_B / T) * (35 / 36) */
  expected: number;
  /** Variância condicional */
  variance: number;
  /** Z-score com correção de continuidade */
  zScore: number;
  /** p-valor bilateral */
  pValue: number;
  /** Estatística qui-quadrado associada (zScore^2) */
  chiSquare: number;
}

export interface PairRelationship {
  numA: number; // 1..25
  numB: number; // 1..25
  countA: number;
  countB: number;
  jointCount: number;
  totalContests: number;
  jointFrequency: number; // P(A, B) = jointCount / T
  expectedCount: number; // Expectativa condicional de 1ª ordem corrigida: (N_A * N_B / T) * (35 / 36)
  expectedCountUniform: number; // 0,35 * T
  difference: number; // jointCount - expectedCount
  lift: number; // Lift corrigido: (jointCount / T) / ((countA / T) * (countB / T) * (35 / 36))
  rawLift: number; // Lift ingênuo: (jointCount / T) / ((countA / T) * (countB / T))
  jaccard: number; // |A ∩ B| / |A ∪ B|
  currentJointDelay: number; // Concursos consecutivos sem saírem juntas
  maxJointDelay: number;

  /** Teste A: Desvio em relação ao sorteio uniforme hipergeométrico (Binomial T, 0,35) */
  testA: PairTestA;
  /** Teste B: Associação condicional às frequências marginais observadas */
  testB: PairTestB;

  // Campos de compatibilidade para relatórios e UI
  chiSquare2x2: number;
  pValueRaw: number; // p-valor do Teste B (condicional)
  pValueAdjustedBH: number; // FDR Benjamini-Hochberg no Teste B
  isSignificant: boolean;
  classification:
    | 'CASADA_FORTE'
    | 'CASADA_MODERADA'
    | 'NEUTRA'
    | 'BRIGADA_MODERADA'
    | 'BRIGADA_FORTE'
    | 'SEM_EVIDENCIA_SUFICIENTE';
  stability: 'HISTORICA' | 'RECENTE' | 'PERSISTENTE' | 'TEMPORARIA' | 'SEM_EVIDENCIA';
}

export interface WindowRelationshipSummary {
  windowName: string;
  contestsCount: number;
  casadasCount: number;
  brigadasCount: number;
}

export interface PairRelationshipAnalysis {
  totalPairs: number; // 300
  totalContests: number;
  alphaFDR: number;
  pairs: PairRelationship[];
  topCasadas: PairRelationship[];
  topBrigadas: PairRelationship[];
  windowSummaries: WindowRelationshipSummary[];
}

/**
 * Calcula o p-valor bilateral de um Z-score sob a normal padrão via erfc.
 */
function normalTwoTailedP(z: number): number {
  return erfc(Math.abs(z) / Math.SQRT2);
}

/**
 * Teste A: Desvio contra a distribuição nula uniforme Binomial(T, 0,35).
 */
export function computeTestA(jointCount: number, T: number): PairTestA {
  if (T <= 0) return { expected: 0, variance: 0, zScore: 0, pValue: 1.0 };
  const expected = 0.35 * T;
  const variance = 0.2275 * T;
  const diff = jointCount - expected;
  let zScore = 0;
  if (variance > 0 && Math.abs(diff) > 0.5) {
    zScore = (diff - Math.sign(diff) * 0.5) / Math.sqrt(variance);
  }
  const pValue = normalTwoTailedP(zScore);
  return { expected, variance, zScore, pValue };
}

/**
 * Teste B: Associação condicional às frequências marginais individuais N_A e N_B
 * corrigida pelo fator estrutural de amostragem sem reposição (35 / 36).
 */
export function computeTestB(jointCount: number, countA: number, countB: number, T: number): PairTestB {
  if (T <= 0 || countA === 0 || countB === 0) {
    return { expected: 0, variance: 0, zScore: 0, pValue: 1.0, chiSquare: 0 };
  }
  // Expectativa sob amostragem sem reposição com marginais countA e countB:
  // mu = T * (countA/T) * (countB/T) * (14/24) / (15/25) = (countA * countB / T) * (35 / 36)
  const expected = (countA * countB * 35) / (T * 36);
  const diff = jointCount - expected;
  const pCond = expected / T;
  const variance = expected * Math.max(0, 1 - pCond);

  let zScore = 0;
  if (variance > 0 && Math.abs(diff) > 0.5) {
    zScore = (diff - Math.sign(diff) * 0.5) / Math.sqrt(variance);
  }
  const pValue = normalTwoTailedP(zScore);
  const chiSquare = zScore * zScore;
  return { expected, variance, zScore, pValue, chiSquare };
}

/**
 * Aplica o procedimento de Benjamini-Hochberg para controle de False Discovery Rate (FDR).
 */
export function applyBenjaminiHochberg(pValues: readonly number[], _alpha = 0.05): number[] {
  const m = pValues.length;
  if (m === 0) return [];

  // Cria array indexado ordenado por p-valor crescente
  const indexed = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);

  // Calcula q-valores cumulativos reversos
  const adjusted = new Array<number>(m).fill(1.0);
  let minQ = 1.0;

  for (let k = m - 1; k >= 0; k--) {
    const rank = k + 1;
    const rawP = indexed[k]!.p;
    const q = (rawP * m) / rank;
    minQ = Math.min(minQ, Math.min(1.0, q));
    adjusted[indexed[k]!.i] = minQ;
  }

  return adjusted;
}

/**
 * Executa a análise completa de relacionamentos de pares com janelas temporais e FDR.
 */
export function analyzePairRelationships(
  contests: readonly Contest[],
  currentCycleContestsCount = 0,
  alphaFDR = 0.05,
): PairRelationshipAnalysis {
  const T = contests.length;
  const pairs: PairRelationship[] = [];

  if (T === 0) {
    return {
      totalPairs: 300,
      totalContests: 0,
      alphaFDR,
      pairs: [],
      topCasadas: [],
      topBrigadas: [],
      windowSummaries: [],
    };
  }

  // Pré-computa máscaras binárias por concurso
  const masks = new Uint32Array(T);
  const individualCounts = new Uint32Array(UNIVERSE_SIZE);

  for (let t = 0; t < T; t++) {
    let m = 0;
    for (const n of contests[t]!.numbers) {
      if (n >= 1 && n <= UNIVERSE_SIZE) {
        m |= 1 << (n - 1);
        individualCounts[n - 1]!++;
      }
    }
    masks[t] = m;
  }

  // Janelas temporais para teste de estabilidade
  const windowSizes = [
    { name: 'Histórico Completo', count: T },
    { name: 'Últimos 500', count: Math.min(500, T) },
    { name: 'Últimos 200', count: Math.min(200, T) },
    { name: 'Últimos 100', count: Math.min(100, T) },
  ];
  if (currentCycleContestsCount > 0 && currentCycleContestsCount < T) {
    windowSizes.push({ name: 'Ciclo Atual', count: currentCycleContestsCount });
  }

  // Primeira passada: calcula contagens conjuntas e atrasos para todos os 300 pares
  const rawPValues: number[] = [];
  interface TempPair {
    numA: number;
    numB: number;
    countA: number;
    countB: number;
    jointCount: number;
    testA: PairTestA;
    testB: PairTestB;
    diff: number;
    lift: number;
    rawLift: number;
    jaccard: number;
    currentDelay: number;
    maxDelay: number;
  }
  const tempPairs: TempPair[] = [];

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const bitA = 1 << i;
    const countA = individualCounts[i]!;

    for (let j = i + 1; j < UNIVERSE_SIZE; j++) {
      const bitB = 1 << j;
      const countB = individualCounts[j]!;

      let jointCount = 0;
      let curDelay = 0;
      let maxDelay = 0;
      let jointRunningDelay = 0;

      for (let t = 0; t < T; t++) {
        const hasA = (masks[t]! & bitA) !== 0;
        const hasB = (masks[t]! & bitB) !== 0;

        if (hasA && hasB) {
          jointCount++;
          if (jointRunningDelay > maxDelay) maxDelay = jointRunningDelay;
          jointRunningDelay = 0;
        } else {
          jointRunningDelay++;
        }
      }
      curDelay = jointRunningDelay;
      if (curDelay > maxDelay) maxDelay = curDelay;

      // Teste A: Desvio Uniforme Hipergeométrico Binomial(T, 0,35)
      const testA = computeTestA(jointCount, T);

      // Teste B: Associação Condicional Corrigida (35 / 36)
      const testB = computeTestB(jointCount, countA, countB, T);

      const diff = jointCount - testB.expected;

      // Lift descritivo de primeira ordem com correção estrutural
      const pA = countA / T;
      const pB = countB / T;
      const pAB = jointCount / T;
      const rawLift = pA > 0 && pB > 0 ? pAB / (pA * pB) : 0;
      const lift = pA > 0 && pB > 0 ? pAB / (pA * pB * (35 / 36)) : 0;

      const unionCount = countA + countB - jointCount;
      const jaccard = unionCount > 0 ? jointCount / unionCount : 0;

      rawPValues.push(testB.pValue);
      tempPairs.push({
        numA: i + 1,
        numB: j + 1,
        countA,
        countB,
        jointCount,
        testA,
        testB,
        diff,
        lift,
        rawLift,
        jaccard,
        currentDelay: curDelay,
        maxDelay,
      });
    }
  }

  // Aplica correção Benjamini-Hochberg (FDR) sobre a família dos 300 pares
  const adjustedPValues = applyBenjaminiHochberg(rawPValues, alphaFDR);

  // Segunda passada: classifica cada par e avalia estabilidade recente (últimos 200)
  const recentWindowSize = Math.min(200, T);
  const recentStartIdx = T - recentWindowSize;

  for (let idx = 0; idx < tempPairs.length; idx++) {
    const tp = tempPairs[idx]!;
    const adjP = adjustedPValues[idx]!;
    const isSig = T >= 10 && adjP < alphaFDR;

    // Avalia janela recente para determinar estabilidade
    const bitA = 1 << (tp.numA - 1);
    const bitB = 1 << (tp.numB - 1);
    let recentJoint = 0;
    let recentA = 0;
    let recentB = 0;

    for (let t = recentStartIdx; t < T; t++) {
      const hasA = (masks[t]! & bitA) !== 0;
      const hasB = (masks[t]! & bitB) !== 0;
      if (hasA) recentA++;
      if (hasB) recentB++;
      if (hasA && hasB) recentJoint++;
    }

    const recentExp = recentWindowSize > 0 ? (recentA * recentB * 35) / (recentWindowSize * 36) : 0;
    const recentDiff = recentJoint - recentExp;

    let classification: PairRelationship['classification'];
    if (!isSig) {
      classification = 'SEM_EVIDENCIA_SUFICIENTE';
    } else if (tp.diff > 0) {
      classification = tp.lift >= 1.08 ? 'CASADA_FORTE' : 'CASADA_MODERADA';
    } else if (tp.diff < 0) {
      classification = tp.lift <= 0.92 ? 'BRIGADA_FORTE' : 'BRIGADA_MODERADA';
    } else {
      classification = 'NEUTRA';
    }

    // Estabilidade: compara o sinal histórico com o sinal recente
    let stability: PairRelationship['stability'] = 'SEM_EVIDENCIA';
    if (isSig) {
      if ((tp.diff > 0 && recentDiff > 0) || (tp.diff < 0 && recentDiff < 0)) {
        stability = 'PERSISTENTE';
      } else if (Math.abs(recentDiff) >= 1.5 && Math.abs(tp.diff) < 2.0) {
        stability = 'RECENTE';
      } else {
        stability = 'HISTORICA';
      }
    }

    pairs.push({
      numA: tp.numA,
      numB: tp.numB,
      countA: tp.countA,
      countB: tp.countB,
      jointCount: tp.jointCount,
      totalContests: T,
      jointFrequency: tp.jointCount / T,
      expectedCount: tp.testB.expected,
      expectedCountUniform: tp.testA.expected,
      difference: tp.diff,
      lift: tp.lift,
      rawLift: tp.rawLift,
      jaccard: tp.jaccard,
      currentJointDelay: tp.currentDelay,
      maxJointDelay: tp.maxDelay,
      testA: tp.testA,
      testB: tp.testB,
      chiSquare2x2: tp.testB.chiSquare,
      pValueRaw: tp.testB.pValue,
      pValueAdjustedBH: adjP,
      isSignificant: isSig,
      classification,
      stability,
    });
  }

  // Rankings estritos (§6, §7): apenas pares com significância comprovada após FDR de Benjamini-Hochberg
  const topCasadas = pairs
    .filter((p) => p.isSignificant && p.classification.startsWith('CASADA'))
    .sort((a, b) => b.difference - a.difference)
    .slice(0, 15);

  const topBrigadas = pairs
    .filter((p) => p.isSignificant && p.classification.startsWith('BRIGADA'))
    .sort((a, b) => a.difference - b.difference)
    .slice(0, 15);

  // Janelas temporais com reavaliação independente (§8, ISSUE-06)
  const windowSummaries: WindowRelationshipSummary[] = windowSizes.map((w) => {
    const W = Math.min(w.count, T);
    if (W < 10) {
      return {
        windowName: w.name,
        contestsCount: W,
        casadasCount: 0,
        brigadasCount: 0,
      };
    }
    if (W === T) {
      return {
        windowName: w.name,
        contestsCount: T,
        casadasCount: topCasadas.length,
        brigadasCount: topBrigadas.length,
      };
    }

    // Recalcula contagens e testes de hipótese isolados para a janela W
    const startW = T - W;
    const wIndiv = new Uint32Array(UNIVERSE_SIZE);
    for (let t = startW; t < T; t++) {
      const m = masks[t]!;
      for (let i = 0; i < UNIVERSE_SIZE; i++) {
        if ((m & (1 << i)) !== 0) wIndiv[i]!++;
      }
    }

    const wPValues: number[] = [];
    interface WTemp {
      diff: number;
    }
    const wTempPairs: WTemp[] = [];

    for (let i = 0; i < UNIVERSE_SIZE; i++) {
      const bitA = 1 << i;
      const cA = wIndiv[i]!;
      for (let j = i + 1; j < UNIVERSE_SIZE; j++) {
        const bitB = 1 << j;
        const cB = wIndiv[j]!;
        let wJoint = 0;
        for (let t = startW; t < T; t++) {
          if ((masks[t]! & bitA) !== 0 && (masks[t]! & bitB) !== 0) wJoint++;
        }
        const testBW = computeTestB(wJoint, cA, cB, W);
        const diff = wJoint - testBW.expected;
        wPValues.push(testBW.pValue);
        wTempPairs.push({ diff });
      }
    }

    const wAdjP = applyBenjaminiHochberg(wPValues, alphaFDR);
    let casadasCount = 0;
    let brigadasCount = 0;

    for (let k = 0; k < wTempPairs.length; k++) {
      const isSigW = wAdjP[k]! < alphaFDR;
      if (isSigW) {
        if (wTempPairs[k]!.diff > 0) casadasCount++;
        else if (wTempPairs[k]!.diff < 0) brigadasCount++;
      }
    }

    return {
      windowName: w.name,
      contestsCount: W,
      casadasCount,
      brigadasCount,
    };
  });

  return {
    totalPairs: 300,
    totalContests: T,
    alphaFDR,
    pairs,
    topCasadas,
    topBrigadas,
    windowSummaries,
  };
}
