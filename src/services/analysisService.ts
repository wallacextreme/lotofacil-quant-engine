/**
 * Serviço de Análise Científica Completa do Dataset Histórico.
 *
 * Agrega todos os módulos estatísticos puros em um resultado coeso, auditável
 * e pronto para alimentar o Combinatorial Engine e a Interface.
 */
import type { AnalysisParams, Contest } from '../core/domain/types';
import { DEFAULT_ANALYSIS_PARAMS } from '../core/domain/models';
import { type ChiSquareResult, computeChiSquare } from '../core/statistics/chiSquare';
import { type ZScoreAnalysis, computeZScores } from '../core/statistics/zscore';
import { type DelayAnalysis, computeDelays } from '../core/statistics/delays';
import { type MarkovAnalysis, computeMarkov } from '../core/statistics/markov';
import { type CooccurrenceAnalysis, computeCooccurrence } from '../core/statistics/cooccurrence';
import { type CovarianceAnalysis, computeCovariance } from '../core/statistics/covariance';
import { type EntropyAnalysis, computeSpatialEntropy } from '../core/statistics/entropy';
import { type TheoreticalMoment, theoreticalMoments } from '../core/statistics/theoretical';
import { type CycleAnalysis, trackCycles } from '../core/statistics/cycles';
import { type LineDistributionAnalysis, analyzeLineDistribution } from '../core/statistics/lines';
import { type PairRelationshipAnalysis, analyzePairRelationships } from '../core/statistics/relationships';
import { type NumberBehaviorAnalysis, analyzeNumberBehaviors } from '../core/statistics/behavior';
import { computeFeatures } from '../core/domain/features';

export interface DatasetSummaryStats {
  contestsCount: number;
  firstContest: number | null;
  lastContest: number | null;
  lastDrawDate: string | null;
  lastDrawNumbers: number[];
  meanSum: number;
  meanEvens: number;
  meanPrimes: number;
  meanFrame: number;
  meanCore: number;
  meanFibonacci: number;
  meanRepeated: number;
}

export interface DatasetAnalysis {
  params: AnalysisParams;
  timestamp: string;
  summary: DatasetSummaryStats;
  theoreticalMoments: TheoreticalMoment[];
  chiSquare: ChiSquareResult;
  zScores: ZScoreAnalysis;
  delays: DelayAnalysis;
  markov: MarkovAnalysis;
  cooccurrence: CooccurrenceAnalysis;
  covariance: CovarianceAnalysis;
  entropy: EntropyAnalysis;
  cycles: CycleAnalysis;
  lines: LineDistributionAnalysis;
  relationships: PairRelationshipAnalysis;
  behaviors: NumberBehaviorAnalysis;
}

export function runDatasetAnalysis(
  contests: readonly Contest[],
  params: AnalysisParams = DEFAULT_ANALYSIS_PARAMS,
): DatasetAnalysis {
  const T = contests.length;
  const firstContest = T > 0 ? contests[0]!.contest : null;
  const lastContestObj = T > 0 ? contests[T - 1]! : null;
  const lastContest = lastContestObj ? lastContestObj.contest : null;
  const lastDrawDate = lastContestObj ? lastContestObj.date : null;
  const lastDrawNumbers = lastContestObj ? [...lastContestObj.numbers] : [];

  // Médias empíricas dos sorteios
  let totalSum = 0;
  let totalEvens = 0;
  let totalPrimes = 0;
  let totalFrame = 0;
  let totalCore = 0;
  let totalFib = 0;
  let totalRepeated = 0;
  let repeatedCountSamples = 0;

  for (let t = 0; t < T; t++) {
    const prev = t > 0 ? contests[t - 1]!.numbers : null;
    const feats = computeFeatures(contests[t]!.numbers, prev);
    totalSum += feats.sum;
    totalEvens += feats.evenCount;
    totalPrimes += feats.primeCount;
    totalFrame += feats.frameCount;
    totalCore += feats.coreCount;
    totalFib += feats.fibonacciCount;
    if (feats.repeatedCount !== null) {
      totalRepeated += feats.repeatedCount;
      repeatedCountSamples++;
    }
  }

  const summary: DatasetSummaryStats = {
    contestsCount: T,
    firstContest,
    lastContest,
    lastDrawDate,
    lastDrawNumbers,
    meanSum: T > 0 ? totalSum / T : 0,
    meanEvens: T > 0 ? totalEvens / T : 0,
    meanPrimes: T > 0 ? totalPrimes / T : 0,
    meanFrame: T > 0 ? totalFrame / T : 0,
    meanCore: T > 0 ? totalCore / T : 0,
    meanFibonacci: T > 0 ? totalFib / T : 0,
    meanRepeated: repeatedCountSamples > 0 ? totalRepeated / repeatedCountSamples : 0,
  };

  const theoretical = theoreticalMoments();
  const chiSquare = computeChiSquare(contests);
  const zScores = computeZScores(contests, params.windowSize, params.hotThreshold, params.coldThreshold);
  const delays = computeDelays(contests, params.delayAttentionSigma, params.delayAlertSigma);
  const markov = computeMarkov(contests, params.topK);
  const cooccurrence = computeCooccurrence(contests, params.topK);
  const covariance = computeCovariance(contests, params.topK);
  const entropy = computeSpatialEntropy(contests, 50);
  const cycles = trackCycles(contests);
  const lines = analyzeLineDistribution(contests);
  const relationships = analyzePairRelationships(contests, cycles.currentCycle.consecutiveDraws);
  const behaviors = analyzeNumberBehaviors(contests, cycles.currentCycle);

  return {
    params,
    timestamp: new Date().toISOString(),
    summary,
    theoreticalMoments: theoretical,
    chiSquare,
    zScores,
    delays,
    markov,
    cooccurrence,
    covariance,
    entropy,
    cycles,
    lines,
    relationships,
    behaviors,
  };
}
