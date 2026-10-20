/**
 * Análise de Atrasos (Gaps de Ausência) para as 25 dezenas da Lotofácil.
 *
 * Prevenção Epistemológica Inegociável contra a Falácia do Apostador:
 * - Sob a hipótese nula de sorteios independentes equiprováveis (H0), cada dezena possui
 *   probabilidade constante p = 15/25 = 0,60 de ser sorteada em cada concurso, independentemente
 *   de quantas vezes esteve ausente no passado.
 * - O atraso consecutivo segue distribuição geométrica com q = 1 - p = 0,40:
 *     P(Atraso >= k) = 0,40^k
 * - Um atraso elevado mede unicamente RARIDADE DESCRITIVA HISTÓRICA sob H0, e NÃO acúmulo de
 *   probabilidade ou "obrigação física" de ser sorteada no próximo concurso.
 */
import { UNIVERSE_SIZE } from '../domain/constants';
import type { Contest } from '../domain/types';

export type DelayStatus = 'NORMAL' | 'ATTENTION' | 'ABOVE_1_5_SIGMA';

export interface NumberDelay {
  number: number;
  occurrences: number;
  currentDelay: number;
  meanDelay: number;
  stdDelay: number;
  maxDelay: number;
  longestGap: number;
  threshold1_5Sigma: number;
  threshold1Sigma: number;
  status: DelayStatus;
  statusLabel: 'NORMAL' | 'ATENÇÃO' | 'ACIMA DE 1.5σ';
  /** Histórico completo dos gaps para gráficos ou distribuições. */
  gapsCount: number;
  /** Probabilidade de cauda geométrica sob H0: P(Atraso >= currentDelay) = 0,40^currentDelay */
  geometricTailProb: number;
  /** Auto-informação de Shannon do atraso em bits: I(k) = -log2(0,40^k) = k * log2(2,5) */
  surpriseBits: number;
}

export interface DelayAnalysis {
  delays: NumberDelay[];
  attentionSigma: number;
  alertSigma: number;
  longestDelayOverall: { number: number; maxDelay: number };
  currentHighestDelay: { number: number; currentDelay: number };
}

export function computeDelays(
  contests: readonly Contest[],
  attentionSigma = 1.0,
  alertSigma = 1.5,
): DelayAnalysis {
  const T = contests.length;
  const delays: NumberDelay[] = [];

  let overallLongestNum = 1;
  let overallLongestVal = -1;
  let currentHighestNum = 1;
  let currentHighestVal = -1;

  for (let num = 1; num <= UNIVERSE_SIZE; num++) {
    // Índices de concursos (0-based) onde a dezena esteve presente
    const appearances: number[] = [];
    for (let t = 0; t < T; t++) {
      if (contests[t]!.numbers.includes(num)) {
        appearances.push(t);
      }
    }

    const occurrences = appearances.length;
    let currentDelay = 0;
    const gaps: number[] = [];

    if (occurrences === 0) {
      currentDelay = T;
      gaps.push(T);
    } else {
      // Gap antes da primeira aparição (se houver)
      if (appearances[0]! > 0) {
        gaps.push(appearances[0]!);
      }
      // Gaps entre aparições consecutivas: (t_{i} - t_{i-1} - 1)
      for (let i = 1; i < occurrences; i++) {
        const gap = appearances[i]! - appearances[i - 1]! - 1;
        gaps.push(gap);
      }
      // Atraso atual (após a última aparição)
      const lastApp = appearances[occurrences - 1]!;
      currentDelay = T - 1 - lastApp;
    }

    // Gaps para cálculo de média e desvio padrão das ausências
    const effectiveGaps = gaps.length > 0 ? gaps : [0];
    let sumGaps = 0;
    for (const g of effectiveGaps) sumGaps += g;
    const meanDelay = sumGaps / effectiveGaps.length;

    let varSum = 0;
    for (const g of effectiveGaps) varSum += (g - meanDelay) ** 2;
    const stdDelay = effectiveGaps.length > 1 ? Math.sqrt(varSum / (effectiveGaps.length - 1)) : 0;

    const maxDelay = Math.max(...effectiveGaps, currentDelay);
    const longestGap = maxDelay;

    const threshold1Sigma = meanDelay + attentionSigma * stdDelay;
    const threshold1_5Sigma = meanDelay + alertSigma * stdDelay;

    let status: DelayStatus = 'NORMAL';
    let statusLabel: 'NORMAL' | 'ATENÇÃO' | 'ACIMA DE 1.5σ' = 'NORMAL';

    if (currentDelay > threshold1_5Sigma) {
      status = 'ABOVE_1_5_SIGMA';
      statusLabel = 'ACIMA DE 1.5σ';
    } else if (currentDelay > threshold1Sigma) {
      status = 'ATTENTION';
      statusLabel = 'ATENÇÃO';
    }

    if (maxDelay > overallLongestVal) {
      overallLongestVal = maxDelay;
      overallLongestNum = num;
    }
    if (currentDelay > currentHighestVal) {
      currentHighestVal = currentDelay;
      currentHighestNum = num;
    }

    const geometricTailProb = 0.4 ** currentDelay;
    const surpriseBits = currentDelay * Math.log2(2.5);

    delays.push({
      number: num,
      occurrences,
      currentDelay,
      meanDelay,
      stdDelay,
      maxDelay,
      longestGap,
      threshold1_5Sigma,
      threshold1Sigma,
      status,
      statusLabel,
      gapsCount: effectiveGaps.length,
      geometricTailProb,
      surpriseBits,
    });
  }

  return {
    delays,
    attentionSigma,
    alertSigma,
    longestDelayOverall: { number: overallLongestNum, maxDelay: overallLongestVal },
    currentHighestDelay: { number: currentHighestNum, currentDelay: currentHighestVal },
  };
}
