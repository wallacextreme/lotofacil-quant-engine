/**
 * Módulo de Análise Comportamental das Dezenas (NumberBehaviorAnalyzer).
 *
 * Mandato §9:
 * - Calcula frequência total, percentual, recente, ciclo atual, atrasos e tendência ponderada por recência.
 * - Classifica dinamicamente em: FREQUENTE, NEUTRA, ATRASADA.
 * - Limiares e scores matematicamente fundamentados e transparentes.
 */
import { UNIVERSE_SIZE } from '../domain/constants';
import type { Contest } from '../domain/types';
import type { CurrentCycleStatus } from './cycles';

export interface NumberBehavior {
  number: number; // 1..25
  totalFrequency: number;
  relativeFrequency: number; // [0, 1]
  theoreticalExpectation: number; // 0.60
  frequencyDeviation: number; // relativeFrequency - 0.60
  recentFrequency: number; // contagem nos últimos N
  recentRate: number; // recentFrequency / recentWindowSize
  currentCycleFrequency: number;
  currentDelay: number;
  maxDelay: number;
  meanDelay: number;
  recencyWeightedFrequency: number; // média móvel exponencial ponderada
  trend: 'ALTA' | 'ESTAVEL' | 'BAIXA';
  frequencyScore: number; // 0..100
  delayScore: number; // 0..100
  combinedScore: number; // 0..100
  classification: 'FREQUENTE' | 'NEUTRA' | 'ATRASADA';
  /** Probabilidade de cauda sob H0: 0,40^currentDelay */
  geometricTailProb: number;
  /** Auto-informação de Shannon sob H0 (bits) */
  surpriseBits: number;
}

export interface BehaviorThresholds {
  recentWindowSize: number; // padrão: 30
  delayAttentionSigma: number; // padrão: 1.0
  delayAlertSigma: number; // padrão: 1.5
  decayFactor: number; // peso exponencial de recência, ex: 0.05
}

export const DEFAULT_BEHAVIOR_THRESHOLDS: BehaviorThresholds = {
  recentWindowSize: 30,
  delayAttentionSigma: 1.0,
  delayAlertSigma: 1.5,
  decayFactor: 0.05,
};

export interface NumberBehaviorAnalysis {
  totalContests: number;
  thresholds: BehaviorThresholds;
  numbers: NumberBehavior[];
  frequentNumbers: number[];
  neutralNumbers: number[];
  delayedNumbers: number[];
}

/**
 * Analisa o comportamento individual das 25 dezenas combinando métricas históricas,
 * atrasos, ciclo atual e decaimento exponencial.
 */
export function analyzeNumberBehaviors(
  contests: readonly Contest[],
  currentCycle?: CurrentCycleStatus,
  thresholds: BehaviorThresholds = DEFAULT_BEHAVIOR_THRESHOLDS,
): NumberBehaviorAnalysis {
  const T = contests.length;
  if (T === 0) {
    return {
      totalContests: 0,
      thresholds,
      numbers: [],
      frequentNumbers: [],
      neutralNumbers: [],
      delayedNumbers: [],
    };
  }

  const recentN = Math.min(thresholds.recentWindowSize, T);
  const recentStartIdx = T - recentN;

  const totalCounts = new Uint32Array(UNIVERSE_SIZE);
  const recentCounts = new Uint32Array(UNIVERSE_SIZE);
  const curDelays = new Uint32Array(UNIVERSE_SIZE);
  const maxDelays = new Uint32Array(UNIVERSE_SIZE);
  const gapLists: number[][] = Array.from({ length: UNIVERSE_SIZE }, () => []);
  const runningGaps = new Uint32Array(UNIVERSE_SIZE);

  // Média móvel ponderada por recência com decaimento exponencial: S_t = α * x_t + (1 - α) * S_{t-1}
  const alpha = thresholds.decayFactor;
  const ema = new Float64Array(UNIVERSE_SIZE).fill(0.6);

  for (let t = 0; t < T; t++) {
    const c = contests[t]!;
    const isPresent = new Uint8Array(UNIVERSE_SIZE);

    for (const num of c.numbers) {
      if (num >= 1 && num <= UNIVERSE_SIZE) {
        isPresent[num - 1] = 1;
        totalCounts[num - 1]!++;
        if (t >= recentStartIdx) {
          recentCounts[num - 1]!++;
        }
      }
    }

    for (let i = 0; i < UNIVERSE_SIZE; i++) {
      if (isPresent[i]) {
        gapLists[i]!.push(runningGaps[i]!);
        if (runningGaps[i]! > maxDelays[i]!) {
          maxDelays[i] = runningGaps[i]!;
        }
        runningGaps[i] = 0;
        ema[i] = alpha * 1.0 + (1 - alpha) * ema[i]!;
      } else {
        runningGaps[i]!++;
        ema[i] = alpha * 0.0 + (1 - alpha) * ema[i]!;
      }
    }
  }

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    curDelays[i] = runningGaps[i]!;
    if (curDelays[i]! > maxDelays[i]!) {
      maxDelays[i] = curDelays[i]!;
    }
  }

  const numbers: NumberBehavior[] = [];
  const frequentNumbers: number[] = [];
  const neutralNumbers: number[] = [];
  const delayedNumbers: number[] = [];

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const num = i + 1;
    const totalFreq = totalCounts[i]!;
    const relFreq = totalFreq / T;
    const diffExp = relFreq - 0.6;
    const recentFreq = recentCounts[i]!;
    const recentRate = recentN > 0 ? recentFreq / recentN : 0;

    const gaps = gapLists[i]!;
    const meanGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0.667;
    const gapVariance =
      gaps.length > 1 ? gaps.reduce((acc, g) => acc + (g - meanGap) ** 2, 0) / (gaps.length - 1) : 1.0;
    const gapSigma = Math.sqrt(gapVariance);

    const curDelay = curDelays[i]!;
    const cycleFreq = currentCycle ? (currentCycle.appearances[i] ?? 0) : 0;

    // Tendência: compara taxa recente com a frequência total
    let trend: 'ALTA' | 'ESTAVEL' | 'BAIXA' = 'ESTAVEL';
    const rateDiff = recentRate - relFreq;
    if (rateDiff >= 0.07) trend = 'ALTA';
    else if (rateDiff <= -0.07) trend = 'BAIXA';

    // Normalização dos scores para escala [0, 100]
    // Frequência: 0.50 -> 0, 0.60 -> 50, 0.70 -> 100
    const freqScore = Math.max(0, Math.min(100, Math.round(((relFreq - 0.5) / 0.2) * 100)));
    // Atraso: atraso 0 -> 100 (super presente), atraso >= 4 -> 0
    const delayScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(curDelay, 5) / 5) * 100)));
    const combinedScore = Math.round(freqScore * 0.5 + delayScore * 0.3 + (recentRate / 0.8) * 20);

    // Classificação dinâmica objetiva:
    // ATRASADA se atraso atual ultrapassa a média de gaps + 1.0 sigma
    // FREQUENTE se taxa recente >= 0.67 E atraso <= 1
    // Caso contrário: NEUTRA
    let classification: 'FREQUENTE' | 'NEUTRA' | 'ATRASADA' = 'NEUTRA';
    if (curDelay >= meanGap + thresholds.delayAttentionSigma * gapSigma && curDelay >= 2) {
      classification = 'ATRASADA';
      delayedNumbers.push(num);
    } else if (recentRate >= 0.67 && curDelay <= 1) {
      classification = 'FREQUENTE';
      frequentNumbers.push(num);
    } else {
      classification = 'NEUTRA';
      neutralNumbers.push(num);
    }

    numbers.push({
      number: num,
      totalFrequency: totalFreq,
      relativeFrequency: relFreq,
      theoreticalExpectation: 0.6,
      frequencyDeviation: diffExp,
      recentFrequency: recentFreq,
      recentRate,
      currentCycleFrequency: cycleFreq,
      currentDelay: curDelay,
      maxDelay: maxDelays[i]!,
      meanDelay: meanGap,
      recencyWeightedFrequency: ema[i]!,
      trend,
      frequencyScore: freqScore,
      delayScore,
      combinedScore,
      classification,
      geometricTailProb: 0.4 ** curDelay,
      surpriseBits: curDelay * Math.log2(2.5),
    });
  }

  return {
    totalContests: T,
    thresholds,
    numbers,
    frequentNumbers,
    neutralNumbers,
    delayedNumbers,
  };
}
