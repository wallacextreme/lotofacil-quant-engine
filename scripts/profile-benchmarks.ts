/**
 * Script de Profiling de Desempenho e Medição de Latência (Mediana e P95).
 * LOTOFÁCIL QUANT ENGINE — FASE 5
 */
import { readFileSync } from 'node:fs';
import { parseHistoryFile } from '../src/core/data/parser';
import { runDatasetAnalysis } from '../src/services/analysisService';
import { generateCandidatePool } from '../src/core/combinatorial/candidateGenerator';
import { optimizePortfolio, type OptimizationResult } from '../src/core/combinatorial/optimizer';
import { validatePortfolio } from '../src/core/combinatorial/validator';
import { evaluateExactPortfolioCoverage } from '../src/core/combinatorial/exactCoverage';
import { runWalkForwardBacktest } from '../src/core/backtest/walkForward';
import { DEFAULT_GENERATOR_CONFIG, cloneGeneratorConfig } from '../src/core/domain/models';

function computeStats(times: number[]): { median: number; p95: number; mean: number } {
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)]!;
  const p95Idx = Math.min(times.length - 1, Math.floor(times.length * 0.95));
  const p95 = times[p95Idx]!;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  return { median, p95, mean };
}

async function runBenchmarks() {
  console.log('=== LOTOFÁCIL QUANT ENGINE — SUÍTE DE PROFILING DE ALTA PRECISÃO ===\n');

  const fileBytes = new Uint8Array(readFileSync('tests/fixtures/lotofacil_3795.xlsx'));

  // 1. Parsing do XLSX de 3.795 concursos
  const parseTimes: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t0 = performance.now();
    parseHistoryFile(fileBytes, 'Lotofácil.xlsx');
    parseTimes.push(performance.now() - t0);
  }
  const parseStats = computeStats(parseTimes);
  console.log(
    `[1] Parsing XLSX (3.795 sorteios): Mediana = ${parseStats.median.toFixed(2)} ms | P95 = ${parseStats.p95.toFixed(2)} ms`,
  );

  const { contests } = parseHistoryFile(fileBytes, 'Lotofácil.xlsx');

  // 2. Análise Estatística Completa (runDatasetAnalysis)
  const analysisTimes: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t0 = performance.now();
    runDatasetAnalysis(contests);
    analysisTimes.push(performance.now() - t0);
  }
  const analysisStats = computeStats(analysisTimes);
  console.log(
    `[2] runDatasetAnalysis (3.795 sorteios): Mediana = ${analysisStats.median.toFixed(2)} ms | P95 = ${analysisStats.p95.toFixed(2)} ms`,
  );

  const analysis = runDatasetAnalysis(contests);
  const config = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);

  // 3. Geração de Candidatos (generateCandidatePool - 5.000 candidatos)
  const poolTimes: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t0 = performance.now();
    generateCandidatePool(config.constraints, null, 5000, 42 + i);
    poolTimes.push(performance.now() - t0);
  }
  const poolStats = computeStats(poolTimes);
  console.log(
    `[3] generateCandidatePool (5.000 candidatos): Mediana = ${poolStats.median.toFixed(2)} ms | P95 = ${poolStats.p95.toFixed(2)} ms`,
  );

  // 4. Otimização Combinatória (optimizePortfolio - 10 jogos, 25 restarts)
  const optConfig = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
  optConfig.count = 10;
  optConfig.poolSize = 1000;
  optConfig.restarts = 25;
  const optTimes: number[] = [];
  let lastOptResult: OptimizationResult | null = null;
  for (let i = 0; i < 5; i++) {
    optConfig.seed = 1000 + i;
    const t0 = performance.now();
    lastOptResult = optimizePortfolio(optConfig, analysis);
    optTimes.push(performance.now() - t0);
  }
  const optStats = computeStats(optTimes);
  console.log(
    `[4] optimizePortfolio (10 jogos, 25 restarts): Mediana = ${optStats.median.toFixed(2)} ms | P95 = ${optStats.p95.toFixed(2)} ms`,
  );

  // 5. Auditoria Independente (validatePortfolio)
  const valTimes: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t0 = performance.now();
    validatePortfolio(lastOptResult!.games, optConfig, analysis);
    valTimes.push(performance.now() - t0);
  }
  const valStats = computeStats(valTimes);
  console.log(
    `[5] validatePortfolio (auditoria zero-trust): Mediana = ${valStats.median.toFixed(2)} ms | P95 = ${valStats.p95.toFixed(2)} ms`,
  );

  // 6. Avaliação Exata do Espaço C(25, 15) = 3.268.760 estados (exactCoverage)
  const masks = lastOptResult!.games.map((g) => g.mask);
  const covTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    evaluateExactPortfolioCoverage(masks);
    covTimes.push(performance.now() - t0);
  }
  const covStats = computeStats(covTimes);
  console.log(
    `[6] exactCoverage (3.268.760 estados enumerados): Mediana = ${covStats.median.toFixed(2)} ms | P95 = ${covStats.p95.toFixed(2)} ms`,
  );

  // 7. Walk-Forward Backtest FAST
  const fastTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    runWalkForwardBacktest(contests, 10, 42, 'FAST');
    fastTimes.push(performance.now() - t0);
  }
  const fastStats = computeStats(fastTimes);
  console.log(
    `[7] Walk-Forward FAST (10 pontos temporais): Mediana = ${fastStats.median.toFixed(2)} ms | P95 = ${fastStats.p95.toFixed(2)} ms`,
  );

  // 8. Walk-Forward Backtest PRODUCTION
  const prodTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    runWalkForwardBacktest(contests, 5, 42, 'PRODUCTION');
    prodTimes.push(performance.now() - t0);
  }
  const prodStats = computeStats(prodTimes);
  console.log(
    `[8] Walk-Forward PRODUCTION (5 pontos temporais): Mediana = ${prodStats.median.toFixed(2)} ms | P95 = ${prodStats.p95.toFixed(2)} ms`,
  );

  console.log('\n=== FIM DOS BENCHMARKS ===');
}

runBenchmarks();
