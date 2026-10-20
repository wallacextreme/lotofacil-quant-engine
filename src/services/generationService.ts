/**
 * Serviço de Geração e Auditoria de Jogos da Lotofácil.
 *
 * Fluxo de Execução com Dupla Validação:
 * 1. Pré-validação de Viabilidade (§12)
 *    Se inviável, interrompe e retorna diagnóstico sem produzir combinações inválidas.
 * 2. Otimização Combinatória (GRASP Determinístico + Poda em Árvore)
 * 3. Dupla Validação Independente (Camada de Auditoria Zero-Trust)
 * 4. Avaliação Exata de Cobertura e Hamming
 * 5. Metadados de Reprodutibilidade Científica (§46)
 */
import type { GameAudit, GeneratorConfig, ReproMeta } from '../core/domain/types';
import { ENGINE_VERSION, SCHEMA_VERSION } from '../core/domain/version';
import type { DatasetAnalysis } from './analysisService';
import { checkFeasibility, type FeasibilityDiagnosis } from '../core/combinatorial/filters';
import { optimizePortfolio, type OptimizationResult } from '../core/combinatorial/optimizer';
import { validatePortfolio, type PortfolioAuditResult } from '../core/combinatorial/validator';
import { evaluatePortfolioCoverage, type CoverageReport } from '../core/combinatorial/coverage';
import {
  evaluateExactPortfolioCoverage,
  type ExactPortfolioCoverageReport,
} from '../core/combinatorial/exactCoverage';
import { analyzeHammingPortfolio, type HammingAnalysis } from '../core/combinatorial/hamming';

export interface GenerationOutcome {
  success: boolean;
  feasibility: FeasibilityDiagnosis;
  repro: ReproMeta;
  config: GeneratorConfig;
  optimization: OptimizationResult | null;
  validation: PortfolioAuditResult | null;
  coverage: CoverageReport | null;
  hamming: HammingAnalysis | null;
  exactCoverage?: ExactPortfolioCoverageReport | null;
  auditedGames: GameAudit[];
  errorMessage?: string;
}

export function runGeneration(
  config: GeneratorConfig,
  analysis: DatasetAnalysis | null,
  datasetHash = 'NO_DATASET',
  datasetSize = 0,
  contestStart = 0,
  contestEnd = 0,
  onProgress?: (progress: { stage: string; percent: number }) => void,
): GenerationOutcome {
  const context = analysis
    ? {
        lastDraw: analysis.summary.lastDrawNumbers,
        temperature: analysis.zScores.scores.map((s) => s.temperature),
      }
    : null;

  const repro: ReproMeta = {
    datasetHash,
    datasetSize,
    contestStart,
    contestEnd,
    lastContest: analysis ? (analysis.summary.lastContest ?? 0) : 0,
    timestamp: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    windowSize: analysis ? analysis.params.windowSize : 30,
    hotThreshold: analysis ? analysis.params.hotThreshold : 1.0,
    coldThreshold: analysis ? analysis.params.coldThreshold : -1.0,
    weights: config.weights,
    seed: config.seed,
  };

  // 1. Pré-validação estrita de viabilidade
  const feasibility = checkFeasibility(config.constraints, context);
  if (!feasibility.isFeasible) {
    const errorDetails = feasibility.issues.map((i) => `• [${i.parameter}]: ${i.explanation}`).join('\n');
    return {
      success: false,
      feasibility,
      repro,
      config,
      optimization: null,
      validation: null,
      coverage: null,
      hamming: null,
      auditedGames: [],
      errorMessage: `Configuração Inviável:\n${errorDetails}`,
    };
  }

  // 2. Executa otimizador combinatório
  const optResult = optimizePortfolio(config, analysis, onProgress);
  if (!optResult.success) {
    return {
      success: false,
      feasibility,
      repro,
      config,
      optimization: optResult,
      validation: null,
      coverage: null,
      hamming: null,
      auditedGames: [],
      errorMessage: optResult.failureReason ?? 'Falha na otimização combinatória.',
    };
  }

  // 3. Validação independente zero-trust
  if (onProgress) onProgress({ stage: 'Executando dupla validação independente...', percent: 90 });
  const validation = validatePortfolio(optResult.games, config, analysis);

  // 4. Cobertura, Hamming e Cobertura Exata dos 3.268.760 estados (FASE 4)
  const masks = optResult.games.map((g) => g.mask);
  const coverage = evaluatePortfolioCoverage(masks);
  const hamming = analyzeHammingPortfolio(masks, config.minHamming);
  const exactCoverage = evaluateExactPortfolioCoverage(masks);

  if (onProgress) onProgress({ stage: 'Auditoria concluída.', percent: 100 });

  return {
    success: validation.allValid,
    feasibility,
    repro,
    config,
    optimization: optResult,
    validation,
    coverage,
    hamming,
    exactCoverage,
    auditedGames: validation.audits,
    errorMessage: validation.allValid ? undefined : 'Um ou mais jogos falharam na auditoria de conformidade.',
  };
}
