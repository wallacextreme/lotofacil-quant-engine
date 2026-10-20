/**
 * Análise de Transições de Markov de 1ª ordem entre concursos consecutivos.
 *
 * Representação: indicador binário de cada dezena (1 = sorteada, 0 = ausente).
 *
 * Matriz 25×25 de transição cruzada empírica bruta:
 *   P(X_t(j) = 1 | X_{t-1}(i) = 1) = N(i no concurso t-1 E j no concurso t) / N(i no concurso t-1)
 *
 * Suavização Regularizada por Dirichlet / Empirical Bayes Shrinkage (§14, ACHADO-05):
 *   P̃(j_t = 1 | i_{t-1} = 1) = (N_{i -> j} + κ * p0) / (N_i + κ)
 * com baseline teórico p0 = 0,60 e hiperparâmetro de pseudocontagem κ = 50.
 * Isso elimina flutuações amostrais excessivas e impede o viés de ordem extrema do operador maxP.
 */
import { UNIVERSE_SIZE } from '../domain/constants';
import type { Contest } from '../domain/types';

export interface MarkovTransitionPair {
  fromNumber: number;
  toNumber: number;
  count: number;
  totalFrom: number;
  probability: number;
  smoothedProbability: number;
}

export interface SelfTransition {
  number: number;
  retentionProbability: number;
  alternationProbability: number;
  smoothedRetentionProbability: number;
  retentionCount: number;
  alternationCount: number;
  totalOccurrencesPrior: number;
}

export interface MarkovAnalysis {
  transitionsCount: number; // T - 1 transições observadas
  /** Matriz 25×25 empírica bruta: presenceTransition[i-1][j-1] = P(j_t=1 | i_{t-1}=1) */
  presenceTransition: number[][];
  /** Matriz 25×25 suavizada via Empirical Bayes: smoothedPresenceTransition[i-1][j-1] */
  smoothedPresenceTransition: number[][];
  /** Matriz 25×25 empírica de ausência: absenceTransition[i-1][j-1] = P(j_t=0 | i_{t-1}=1) */
  absenceTransition: number[][];
  /** Matriz 25×25 suavizada de ausência */
  smoothedAbsenceTransition: number[][];
  /** Hiperparâmetro κ de regularização Bayesiana */
  shrinkageKappa: number;
  /** Contagens brutas N(i_{t-1}=1 e j_t=1) */
  transitionCounts: number[][];
  /** Contagem de aparições no tempo t-1 para cada dezena i: totalFrom[i-1] */
  totalFrom: number[];
  /** Transições próprias (diagonal i = j) */
  selfTransitions: SelfTransition[];
  /** Rankings ordenados */
  highestRetentions: SelfTransition[];
  lowestRetentions: SelfTransition[];
  highestAlternations: SelfTransition[];
  lowestAlternations: SelfTransition[];
  topCrossTransitions: MarkovTransitionPair[];
}

export function computeMarkov(contests: readonly Contest[], topK = 10, kappa = 50): MarkovAnalysis {
  const T = contests.length;
  const numTransitions = Math.max(0, T - 1);
  const p0 = 0.6; // Baseline teórico equiprovável

  const transitionCounts: number[][] = Array.from({ length: UNIVERSE_SIZE }, () =>
    new Array<number>(UNIVERSE_SIZE).fill(0),
  );
  const totalFrom = new Array<number>(UNIVERSE_SIZE).fill(0);

  // Máscaras binárias para busca ultra-rápida (bit n-1 ligado ⇔ dezena n sorteada)
  const drawMasks = new Uint32Array(T);
  for (let t = 0; t < T; t++) {
    let mask = 0;
    for (const num of contests[t]!.numbers) {
      if (num >= 1 && num <= UNIVERSE_SIZE) {
        mask |= 1 << (num - 1);
      }
    }
    drawMasks[t] = mask;
  }

  for (let t = 1; t < T; t++) {
    const prevMask = drawMasks[t - 1]!;
    const curMask = drawMasks[t]!;

    for (let i = 0; i < UNIVERSE_SIZE; i++) {
      if ((prevMask >>> i) & 1) {
        totalFrom[i]!++;
        for (let j = 0; j < UNIVERSE_SIZE; j++) {
          if ((curMask >>> j) & 1) {
            transitionCounts[i]![j]!++;
          }
        }
      }
    }
  }

  const presenceTransition: number[][] = Array.from({ length: UNIVERSE_SIZE }, () =>
    new Array<number>(UNIVERSE_SIZE).fill(0),
  );
  const smoothedPresenceTransition: number[][] = Array.from({ length: UNIVERSE_SIZE }, () =>
    new Array<number>(UNIVERSE_SIZE).fill(0),
  );
  const absenceTransition: number[][] = Array.from({ length: UNIVERSE_SIZE }, () =>
    new Array<number>(UNIVERSE_SIZE).fill(0),
  );
  const smoothedAbsenceTransition: number[][] = Array.from({ length: UNIVERSE_SIZE }, () =>
    new Array<number>(UNIVERSE_SIZE).fill(0),
  );

  const selfTransitions: SelfTransition[] = [];
  const allCrossPairs: MarkovTransitionPair[] = [];

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const denom = totalFrom[i]!;
    const fromNum = i + 1;

    for (let j = 0; j < UNIVERSE_SIZE; j++) {
      const toNum = j + 1;
      const count = transitionCounts[i]![j]!;
      const p = denom > 0 ? count / denom : 0;
      // Shrinkage Bayesiano empírico centrado em p0 = 0.60
      const pSmooth = (count + kappa * p0) / (denom + kappa);

      presenceTransition[i]![j] = p;
      smoothedPresenceTransition[i]![j] = pSmooth;
      absenceTransition[i]![j] = 1 - p;
      smoothedAbsenceTransition[i]![j] = 1 - pSmooth;

      if (i !== j) {
        allCrossPairs.push({
          fromNumber: fromNum,
          toNumber: toNum,
          count,
          totalFrom: denom,
          probability: p,
          smoothedProbability: pSmooth,
        });
      }
    }

    const selfCount = transitionCounts[i]![i]!;
    const pRet = denom > 0 ? selfCount / denom : 0;
    const pRetSmooth = (selfCount + kappa * p0) / (denom + kappa);
    const pAlt = 1 - pRet;

    selfTransitions.push({
      number: fromNum,
      retentionProbability: pRet,
      alternationProbability: pAlt,
      smoothedRetentionProbability: pRetSmooth,
      retentionCount: selfCount,
      alternationCount: denom - selfCount,
      totalOccurrencesPrior: denom,
    });
  }

  const highestRetentions = [...selfTransitions].sort(
    (a, b) => b.retentionProbability - a.retentionProbability,
  );
  const lowestRetentions = [...selfTransitions].sort(
    (a, b) => a.retentionProbability - b.retentionProbability,
  );
  const highestAlternations = [...selfTransitions].sort(
    (a, b) => b.alternationProbability - a.alternationProbability,
  );
  const lowestAlternations = [...selfTransitions].sort(
    (a, b) => a.alternationProbability - b.alternationProbability,
  );

  const topCrossTransitions = allCrossPairs.sort((a, b) => b.probability - a.probability).slice(0, topK);

  return {
    transitionsCount: numTransitions,
    presenceTransition,
    smoothedPresenceTransition,
    absenceTransition,
    smoothedAbsenceTransition,
    shrinkageKappa: kappa,
    transitionCounts,
    totalFrom,
    selfTransitions,
    highestRetentions,
    lowestRetentions,
    highestAlternations,
    lowestAlternations,
    topCrossTransitions,
  };
}
