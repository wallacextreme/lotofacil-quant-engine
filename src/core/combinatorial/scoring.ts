/**
 * Sistema de Scoring e Normalização Multicritério (§20 e §21).
 *
 * Princípio da Normalização Auditável (§21):
 * - Jamais somar métricas com unidades ou ordens de grandeza distintas.
 * - Cada métrica bruta é convertida para a escala padronizada [0.0, 1.0] por meio
 *   de cotas mínimas e máximas de referência matematicamente bem definidas.
 * - Lookup O(1) de matriz de relacionamentos para eliminar gargalos lineares (ACHADO-03).
 * - Cadeia de Markov regularizada (Empirical Bayes Shrinkage) sem o viés maxP (ACHADO-05).
 * - Total score estritamente contido em [0.0, 1.0].
 */
import { GRID_SIZE, PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';
import type { GameExplanation, ScoreBreakdown, ScoreWeights } from '../domain/types';
import type { DatasetAnalysis } from '../../services/analysisService';
import { shannonEntropy } from '../domain/features';
import { scoreCombinationLines, type LineConstraintMode } from './lineScorer';
import type { PairRelationship, PairRelationshipAnalysis } from '../statistics/relationships';

export interface ScoredCandidate {
  mask: number;
  numbers: number[];
  sum: number;
  totalScore: number;
  breakdown: ScoreBreakdown;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Cache fraco da matriz 25x25 de relacionamentos para consulta O(1) instantânea */
const relationshipMatrixCache = new WeakMap<PairRelationshipAnalysis, (PairRelationship | undefined)[]>();

export function getRelationshipMatrix(
  relAnalysis: PairRelationshipAnalysis,
): (PairRelationship | undefined)[] {
  let mat = relationshipMatrixCache.get(relAnalysis);
  if (!mat) {
    mat = new Array<PairRelationship | undefined>(UNIVERSE_SIZE * UNIVERSE_SIZE);
    for (const p of relAnalysis.pairs) {
      const idx1 = (p.numA - 1) * UNIVERSE_SIZE + (p.numB - 1);
      const idx2 = (p.numB - 1) * UNIVERSE_SIZE + (p.numA - 1);
      mat[idx1] = p;
      mat[idx2] = p;
    }
    relationshipMatrixCache.set(relAnalysis, mat);
  }
  return mat;
}

/**
 * Avalia e pontua uma combinação individual com base nos pesos configurados
 * e no histórico estatístico fornecido.
 */
export function scoreSingleCombination(
  mask: number,
  analysis: DatasetAnalysis | null,
  weights: ScoreWeights,
  lineMode: LineConstraintMode = 'BALANCED',
): { totalScore: number; breakdown: ScoreBreakdown } {
  // Extrai dezenas da máscara
  const numbers: number[] = [];
  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    if ((mask >>> i) & 1) numbers.push(i + 1);
  }

  // 1. Frequência média das dezenas (referência teórica: p0 = 0.60, intervalo prático 0.50..0.70)
  let rawFreq = 0.6;
  if (analysis) {
    let sumF = 0;
    for (const n of numbers) {
      sumF += analysis.zScores.scores[n - 1]!.globalRelative;
    }
    rawFreq = sumF / PICK_SIZE;
  }
  const normFreq = clamp01((rawFreq - 0.5) / (0.7 - 0.5));

  // 2. Z-Score médio local (intervalo de interesse -2.0 a +2.0)
  let rawZ = 0;
  if (analysis) {
    let sumZ = 0;
    for (const n of numbers) {
      sumZ += analysis.zScores.scores[n - 1]!.localZ;
    }
    rawZ = sumZ / PICK_SIZE;
  }
  const normZ = clamp01((rawZ - -2.0) / (2.0 - -2.0));

  // 3. Atrasos: penaliza dezenas com atraso excessivo (> limite 1.5σ)
  let rawDelayPenalty = 0;
  if (analysis) {
    for (const n of numbers) {
      const d = analysis.delays.delays[n - 1]!;
      if (d.status === 'ABOVE_1_5_SIGMA') rawDelayPenalty += 1.0;
      else if (d.status === 'ATTENTION') rawDelayPenalty += 0.5;
    }
  }
  // Menos atrasos anômalos = score maior (0 penalidades = 1.0; 5+ penalidades = 0.0)
  const normDelay = clamp01(1.0 - rawDelayPenalty / 4.0);

  // 4. Markov: probabilidade de transição média regularizada (Empirical Bayes Shrinkage, ACHADO-05)
  let normMarkov = 0.5;
  if (analysis && analysis.summary.lastDrawNumbers.length > 0) {
    const last = analysis.summary.lastDrawNumbers;
    const transMat = analysis.markov.smoothedPresenceTransition ?? analysis.markov.presenceTransition;
    let sumTrans = 0;
    for (const toNum of numbers) {
      let sumPFromLast = 0;
      for (const fromNum of last) {
        sumPFromLast += transMat[fromNum - 1]![toNum - 1]!;
      }
      sumTrans += sumPFromLast / last.length;
    }
    const avgTrans = sumTrans / PICK_SIZE; // Centrado no baseline teórico 0,60
    normMarkov = clamp01((avgTrans - 0.5) / (0.7 - 0.5));
  }

  // 5. Coocorrência: excesso relativo médio dos 105 pares formados pelas 15 dezenas
  let normCooc = 0.5;
  if (analysis) {
    let sumCooc = 0;
    let pairCount = 0;
    for (let i = 0; i < numbers.length; i++) {
      const nA = numbers[i]!;
      for (let j = i + 1; j < numbers.length; j++) {
        const nB = numbers[j]!;
        const c = analysis.cooccurrence.pairMatrix[nA - 1]![nB - 1]!;
        sumCooc += c / (analysis.cooccurrence.totalContests || 1);
        pairCount++;
      }
    }
    const avgPairFreq = pairCount > 0 ? sumCooc / pairCount : 0.35;
    normCooc = clamp01((avgPairFreq - 0.3) / (0.4 - 0.3));
  }

  // 6. Entropia Espacial: Shannon entropy das linhas e colunas (max ~2.32)
  const rowCounts = new Array<number>(GRID_SIZE).fill(0);
  const colCounts = new Array<number>(GRID_SIZE).fill(0);
  for (const n of numbers) {
    rowCounts[Math.floor((n - 1) / GRID_SIZE)]!++;
    colCounts[(n - 1) % GRID_SIZE]!++;
  }
  const rH = shannonEntropy(rowCounts);
  const cH = shannonEntropy(colCounts);
  const avgH = (rH + cH) / 2;
  const normEntropy = clamp01((avgH - 1.8) / (2.3219 - 1.8));

  // 7. Dispersão: amplitude R = max - min (teórico médio ~22.75 de 24)
  const range = numbers[numbers.length - 1]! - numbers[0]!;
  const normDispersion = clamp01((range - 18) / (24 - 18));

  // 8. Ciclo das 25 Dezenas (§1): cobertura equilibrada das dezenas ausentes
  let normCycle = 0.5;
  if (analysis?.cycles?.currentCycle) {
    const cur = analysis.cycles.currentCycle;
    const missing = cur.missingNumbers;
    if (missing.length > 0) {
      const missingPresent = numbers.filter((n) => missing.includes(n)).length;
      const idealMissing = Math.min(Math.max(1, Math.round(missing.length * 0.5)), 3);
      const diff = Math.abs(missingPresent - idealMissing);
      normCycle = clamp01(1.0 - diff * 0.25);
    } else {
      normCycle = 0.8;
    }
  }

  // 9. Equilíbrio de Linhas (§3): LineBalanceScore
  let normLineBalance = 0.5;
  const lineScoreRes = scoreCombinationLines(numbers, lineMode, analysis?.lines?.mostFrequentPatterns);
  normLineBalance = lineScoreRes.score;

  // 10. Relacionamento de Pares, Casadas e Brigadas (§5, §6, §7) — Lookup O(1)
  let normPairRel = 0.5;
  let normCasadas = 0.5;
  let normBrigadas = 1.0;
  if (analysis?.relationships) {
    const relMatrix = getRelationshipMatrix(analysis.relationships);
    let sumLift = 0;
    let casadasCount = 0;
    let brigadasCount = 0;
    let totalPairsEvaluated = 0;

    for (let i = 0; i < numbers.length; i++) {
      const a = numbers[i]!;
      for (let j = i + 1; j < numbers.length; j++) {
        const b = numbers[j]!;
        const pair = relMatrix[(a - 1) * UNIVERSE_SIZE + (b - 1)];
        if (pair) {
          sumLift += pair.lift;
          totalPairsEvaluated++;
          if (pair.classification === 'CASADA_FORTE' || pair.classification === 'CASADA_MODERADA') {
            casadasCount++;
          } else if (pair.classification === 'BRIGADA_FORTE' || pair.classification === 'BRIGADA_MODERADA') {
            brigadasCount++;
          }
        }
      }
    }

    if (totalPairsEvaluated > 0) {
      const avgLift = sumLift / totalPairsEvaluated;
      normPairRel = clamp01((avgLift - 0.95) / (1.05 - 0.95));
      normCasadas = clamp01(casadasCount / 4.0);
      normBrigadas = clamp01(1.0 - brigadasCount * 0.25);
    }
  }

  const breakdown: ScoreBreakdown = {
    frequency: normFreq,
    zScore: normZ,
    delay: normDelay,
    markov: normMarkov,
    cooccurrence: normCooc,
    entropy: normEntropy,
    dispersion: normDispersion,
    cycle: normCycle,
    lineBalance: normLineBalance,
    pairRelationship: normPairRel,
    casadas: normCasadas,
    brigadas: normBrigadas,
  };

  const activeWeights = [
    weights.frequency ?? 0,
    weights.zScore ?? 0,
    weights.delay ?? 0,
    weights.markov ?? 0,
    weights.cooccurrence ?? 0,
    weights.entropy ?? 0,
    weights.dispersion ?? 0,
    weights.cycle ?? 0,
    weights.lineBalance ?? 0,
    weights.pairRelationship ?? 0,
    weights.casadas ?? 0,
    weights.brigadas ?? 0,
  ];

  const sumWeights = activeWeights.reduce((a, b) => a + b, 0);

  const rawTotalScore =
    (weights.frequency ?? 0) * breakdown.frequency +
    (weights.zScore ?? 0) * breakdown.zScore +
    (weights.delay ?? 0) * breakdown.delay +
    (weights.markov ?? 0) * breakdown.markov +
    (weights.cooccurrence ?? 0) * breakdown.cooccurrence +
    (weights.entropy ?? 0) * breakdown.entropy +
    (weights.dispersion ?? 0) * breakdown.dispersion +
    (weights.cycle ?? 0) * (breakdown.cycle ?? 0) +
    (weights.lineBalance ?? 0) * (breakdown.lineBalance ?? 0) +
    (weights.pairRelationship ?? 0) * (breakdown.pairRelationship ?? 0) +
    (weights.casadas ?? 0) * (breakdown.casadas ?? 0) +
    (weights.brigadas ?? 0) * (breakdown.brigadas ?? 0);

  const totalScore = sumWeights > 0 ? clamp01(rawTotalScore / sumWeights) : 0;

  return { totalScore, breakdown };
}

/**
 * Constrói a explicação auditável e transparente para um jogo específico (§18).
 */
export function buildGameExplanation(
  numbers: readonly number[],
  analysis: DatasetAnalysis | null,
  weights: ScoreWeights,
  lineMode: LineConstraintMode = 'BALANCED',
): GameExplanation {
  const lineScoreRes = scoreCombinationLines(numbers, lineMode, analysis?.lines?.mostFrequentPatterns);
  const lineDistribution = lineScoreRes.pattern;

  // Ciclo atual
  let cycleNumbersCount = 0;
  if (analysis?.cycles?.currentCycle) {
    const covered = analysis.cycles.currentCycle.coveredNumbers;
    cycleNumbersCount = numbers.filter((n) => covered.includes(n)).length;
  }

  // Dezenas atrasadas presentes
  let delayedNumbersCount = 0;
  if (analysis?.behaviors?.delayedNumbers) {
    const delayed = analysis.behaviors.delayedNumbers;
    delayedNumbersCount = numbers.filter((n) => delayed.includes(n)).length;
  } else if (analysis?.delays) {
    delayedNumbersCount = numbers.filter((n) => {
      const d = analysis.delays.delays[n - 1];
      return d && (d.status === 'ATTENTION' || d.status === 'ABOVE_1_5_SIGMA');
    }).length;
  }

  // Casadas e Brigadas presentes via lookup O(1)
  const casadasPresent: string[] = [];
  const brigadasPresent: string[] = [];

  if (analysis?.relationships) {
    const relMatrix = getRelationshipMatrix(analysis.relationships);
    for (let i = 0; i < numbers.length; i++) {
      const a = numbers[i]!;
      for (let j = i + 1; j < numbers.length; j++) {
        const b = numbers[j]!;
        const pair = relMatrix[(a - 1) * UNIVERSE_SIZE + (b - 1)];
        if (pair) {
          const pad = (n: number) => String(n).padStart(2, '0');
          if (pair.classification === 'CASADA_FORTE' || pair.classification === 'CASADA_MODERADA') {
            casadasPresent.push(`${pad(a)}+${pad(b)} (Lift: ${pair.lift.toFixed(2)})`);
          } else if (pair.classification === 'BRIGADA_FORTE' || pair.classification === 'BRIGADA_MODERADA') {
            brigadasPresent.push(`${pad(a)}+${pad(b)} (Lift: ${pair.lift.toFixed(2)})`);
          }
        }
      }
    }
  }

  // Máscara
  let mask = 0;
  for (const n of numbers) mask |= 1 << (n - 1);
  const { totalScore, breakdown } = scoreSingleCombination(mask, analysis, weights, lineMode);

  const scoreContributions: Record<string, number> = {
    Frequência: Number(((weights.frequency ?? 0) * breakdown.frequency).toFixed(2)),
    'Z-Score': Number(((weights.zScore ?? 0) * breakdown.zScore).toFixed(2)),
    Atraso: Number(((weights.delay ?? 0) * breakdown.delay).toFixed(2)),
    Markov: Number(((weights.markov ?? 0) * breakdown.markov).toFixed(2)),
    Coocorrência: Number(((weights.cooccurrence ?? 0) * breakdown.cooccurrence).toFixed(2)),
    Entropia: Number(((weights.entropy ?? 0) * breakdown.entropy).toFixed(2)),
    Dispersão: Number(((weights.dispersion ?? 0) * breakdown.dispersion).toFixed(2)),
    Ciclo: Number(((weights.cycle ?? 0) * (breakdown.cycle ?? 0)).toFixed(2)),
    Linhas: Number(((weights.lineBalance ?? 0) * (breakdown.lineBalance ?? 0)).toFixed(2)),
    Relacionamentos: Number(((weights.pairRelationship ?? 0) * (breakdown.pairRelationship ?? 0)).toFixed(2)),
    Casadas: Number(((weights.casadas ?? 0) * (breakdown.casadas ?? 0)).toFixed(2)),
    Brigadas: Number(((weights.brigadas ?? 0) * (breakdown.brigadas ?? 0)).toFixed(2)),
  };

  const whySelected = `Jogo com Score Total de ${totalScore.toFixed(2)}. Apresenta distribuição de linhas [${lineDistribution}], contempla ${cycleNumbersCount} dezenas do ciclo atual e ${delayedNumbersCount} dezenas com atraso controlado, com ${casadasPresent.length} pares em forte associação e ${brigadasPresent.length} pares em conflito.`;

  return {
    whySelected,
    lineDistribution,
    cycleNumbersCount,
    delayedNumbersCount,
    casadasPresent,
    brigadasPresent,
    scoreContributions,
  };
}
