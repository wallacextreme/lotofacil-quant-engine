/**
 * Web Worker para Processamento Assíncrono fora da Thread Principal (§25).
 *
 * Garante que a UI permaneça sempre responsiva e suave (60 FPS) mesmo durante
 * operações intensivas de busca combinatória, matrizes 25x25 e 2300 trincas.
 */
import type { Contest, GeneratorConfig, AnalysisParams } from '../core/domain/types';
import { runDatasetAnalysis, type DatasetAnalysis } from '../services/analysisService';
import { runGeneration, type GenerationOutcome } from '../services/generationService';
import {
  runWalkForwardBacktest,
  type WalkForwardResult,
  type BacktestMode,
} from '../core/backtest/walkForward';
import {
  evaluateExactPortfolioCoverage,
  type ExactPortfolioCoverageReport,
} from '../core/combinatorial/exactCoverage';

export type WorkerInMessage =
  | {
      type: 'ANALYZE_DATASET';
      contests: Contest[];
      params: AnalysisParams;
    }
  | {
      type: 'GENERATE_GAMES';
      config: GeneratorConfig;
      analysis: DatasetAnalysis | null;
      datasetHash: string;
      datasetSize: number;
      contestStart: number;
      contestEnd: number;
    }
  | {
      type: 'RUN_BACKTEST';
      contests: Contest[];
      evalPoints: number;
      seed: number;
      mode?: BacktestMode;
    }
  | {
      type: 'EVALUATE_EXACT_COVERAGE';
      masks: number[];
    };

export type WorkerOutMessage =
  | {
      type: 'PROGRESS';
      stage: string;
      percent: number;
    }
  | {
      type: 'ANALYSIS_COMPLETE';
      analysis: DatasetAnalysis;
    }
  | {
      type: 'GENERATION_COMPLETE';
      outcome: GenerationOutcome;
    }
  | {
      type: 'BACKTEST_COMPLETE';
      result: WalkForwardResult;
    }
  | {
      type: 'EXACT_COVERAGE_COMPLETE';
      report: ExactPortfolioCoverageReport;
    }
  | {
      type: 'ERROR';
      message: string;
    };

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  try {
    if (msg.type === 'ANALYZE_DATASET') {
      postMessage({
        type: 'PROGRESS',
        stage: 'Calculando distribuições e teste qui-quadrado...',
        percent: 20,
      });
      const analysis = runDatasetAnalysis(msg.contests, msg.params);
      postMessage({ type: 'PROGRESS', stage: 'Análise estatística concluída.', percent: 100 });
      postMessage({ type: 'ANALYSIS_COMPLETE', analysis });
    } else if (msg.type === 'GENERATE_GAMES') {
      const outcome = runGeneration(
        msg.config,
        msg.analysis,
        msg.datasetHash,
        msg.datasetSize,
        msg.contestStart,
        msg.contestEnd,
        (progress) => {
          postMessage({ type: 'PROGRESS', stage: progress.stage, percent: progress.percent });
        },
      );
      postMessage({ type: 'GENERATION_COMPLETE', outcome });
    } else if (msg.type === 'RUN_BACKTEST') {
      const result = runWalkForwardBacktest(
        msg.contests,
        msg.evalPoints,
        msg.seed,
        msg.mode ?? 'FAST',
        (step: number, total: number, message: string) => {
          postMessage({
            type: 'PROGRESS',
            stage: message,
            percent: Math.round((step / total) * 100),
          });
        },
      );
      postMessage({ type: 'BACKTEST_COMPLETE', result });
    } else if (msg.type === 'EVALUATE_EXACT_COVERAGE') {
      const report = evaluateExactPortfolioCoverage(msg.masks);
      postMessage({ type: 'EXACT_COVERAGE_COMPLETE', report });
    }
  } catch (err) {
    postMessage({ type: 'ERROR', message: (err as Error).message });
  }
};
