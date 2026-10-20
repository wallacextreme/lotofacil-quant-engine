import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parseHistoryFile } from '../../src/core/data/parser';
import { runDatasetAnalysis } from '../../src/services/analysisService';
import { runGeneration } from '../../src/services/generationService';
import { DEFAULT_GENERATOR_CONFIG, cloneGeneratorConfig } from '../../src/core/domain/models';
import type { AppState } from '../../src/app/state';
import { renderDashboardPage } from '../../src/pages/dashboardPage';
import { renderHistoryPage } from '../../src/pages/historyPage';
import { renderStatisticsPage } from '../../src/pages/statisticsPage';
import { renderCyclesPage } from '../../src/pages/cyclesPage';
import { renderMarkovPage } from '../../src/pages/markovPage';
import { renderCooccurrencePage } from '../../src/pages/cooccurrencePage';
import { renderEntropyPage } from '../../src/pages/entropyPage';
import { renderGeneratorPage } from '../../src/pages/generatorPage';
import { renderGamesPage } from '../../src/pages/gamesPage';
import { renderReportsPage } from '../../src/pages/reportsPage';
import { renderConfigPage } from '../../src/pages/configPage';
import { exportAsCsv, exportAsJson, exportAsTxt, exportAsXlsx } from '../../src/services/exportService';
import { generateScientificReportMarkdown } from '../../src/services/reportService';
import { backupService } from '../../src/services/backupService';
import { hammingDistance, analyzeHammingPortfolio } from '../../src/core/combinatorial/hamming';
import { numbersToMask } from '../../src/core/util/bits';
import 'fake-indexeddb/auto';
import { datasetRepository } from '../../src/storage/repositories/datasetRepository';
import { configRepository } from '../../src/storage/repositories/configRepository';

describe('Regression & Full E2E Pipeline Verification', () => {
  const bytes = new Uint8Array(readFileSync('tests/fixtures/lotofacil_3795.xlsx'));
  const { contests, hash, format } = parseHistoryFile(bytes, 'Lotofácil.xlsx');

  it('verifies dataset parsing integrity on 3,795 real Caixa draws', () => {
    expect(contests.length).toBe(3795);
    expect(contests[0]!.contest).toBe(1);
    expect(contests[contests.length - 1]!.contest).toBe(3795);
    expect(hash.length).toBe(64); // SHA-256 hex string
    expect(format).toBe('xlsx');

    // Every contest must strictly have 15 sorted unique numbers in 1..25
    for (const c of contests) {
      expect(c.numbers.length).toBe(15);
      const set = new Set(c.numbers);
      expect(set.size).toBe(15);
      for (let i = 0; i < 14; i++) {
        expect(c.numbers[i]!).toBeLessThan(c.numbers[i + 1]!);
      }
      expect(c.numbers[0]!).toBeGreaterThanOrEqual(1);
      expect(c.numbers[14]!).toBeLessThanOrEqual(25);
    }
  });

  const analysis = runDatasetAnalysis(contests);

  it('verifies statistical & stochastic outputs match mathematical baseline', () => {
    expect(analysis.summary.contestsCount).toBe(3795);
    expect(analysis.summary.firstContest).toBe(1);
    expect(analysis.summary.lastContest).toBe(3795);

    // Chi-Square: verify both classic and FPC-adjusted values
    expect(analysis.chiSquare.df).toBe(24);
    expect(analysis.chiSquare.statistic).toBeCloseTo(23.82, 1);
    expect(analysis.chiSquare.adjustedStatistic).toBeCloseTo(57.17, 1);
    expect(analysis.chiSquare.conclusion).toBeDefined();

    // Markov: 25x25 presence and absence transitions
    expect(analysis.markov.presenceTransition.length).toBe(25);
    for (let i = 0; i < 25; i++) {
      expect(analysis.markov.presenceTransition[i]!.length).toBe(25);
      const rowSum = analysis.markov.presenceTransition[i]!.reduce((a, b) => a + b, 0);
      expect(rowSum).toBeCloseTo(15.0, 5); // 15 balls per draw
      for (let j = 0; j < 25; j++) {
        expect(
          analysis.markov.presenceTransition[i]![j]! + analysis.markov.absenceTransition[i]![j]!,
        ).toBeCloseTo(1.0, 5);
      }
    }

    // Delays
    expect(analysis.delays.delays.length).toBe(25);
    expect(analysis.delays.longestDelayOverall.maxDelay).toBeGreaterThan(0);

    // Cooccurrence
    expect(analysis.cooccurrence.topPairs.length).toBeGreaterThan(0);
    expect(analysis.cooccurrence.pairMatrix.length).toBe(25);

    // Spatial Entropy
    expect(analysis.entropy.meanRowEntropy).toBeGreaterThan(1.5);
    expect(analysis.entropy.meanColEntropy).toBeGreaterThan(1.5);
    expect(analysis.entropy.theory.entropyMean).toBeGreaterThan(2.0);
  });

  const testConfig = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
  testConfig.count = 8;
  testConfig.minHamming = 4;
  testConfig.seed = 42;

  const generationOutcome = runGeneration(
    testConfig,
    analysis,
    hash,
    contests.length,
    contests[0]!.contest,
    contests[contests.length - 1]!.contest,
  );

  it('generates fully audited games adhering to all constraints and Hamming requirements', () => {
    expect(generationOutcome.success).toBe(true);
    expect(generationOutcome.auditedGames.length).toBe(8);

    // Zero-trust audit: every single game must be strictly VALID
    for (const game of generationOutcome.auditedGames) {
      expect(game.status).toBe('VALID');
      expect(game.numbers.length).toBe(15);

      // Check sum constraint
      expect(game.sum).toBeGreaterThanOrEqual(testConfig.constraints.sum!.min);
      expect(game.sum).toBeLessThanOrEqual(testConfig.constraints.sum!.max);

      // Check evens constraint
      expect(game.evenCount).toBeGreaterThanOrEqual(testConfig.constraints.even!.min);
      expect(game.evenCount).toBeLessThanOrEqual(testConfig.constraints.even!.max);

      // Check primes constraint
      expect(game.primeCount).toBeGreaterThanOrEqual(testConfig.constraints.prime!.min);
      expect(game.primeCount).toBeLessThanOrEqual(testConfig.constraints.prime!.max);

      // Check frame constraint
      expect(game.frameCount).toBeGreaterThanOrEqual(testConfig.constraints.frame!.min);
      expect(game.frameCount).toBeLessThanOrEqual(testConfig.constraints.frame!.max);

      // Check core constraint
      expect(game.coreCount).toBeGreaterThanOrEqual(testConfig.constraints.core!.min);
      expect(game.coreCount).toBeLessThanOrEqual(testConfig.constraints.core!.max);

      // Check fibonacci constraint
      expect(game.fibonacciCount).toBeGreaterThanOrEqual(testConfig.constraints.fibonacci!.min);
      expect(game.fibonacciCount).toBeLessThanOrEqual(testConfig.constraints.fibonacci!.max);

      // Check repeated constraint
      expect(game.repeatedCount).toBeGreaterThanOrEqual(testConfig.constraints.repeat!.min);
      expect(game.repeatedCount).toBeLessThanOrEqual(testConfig.constraints.repeat!.max);

      // Check thermal constraints if enabled
      if (testConfig.constraints.hot) {
        expect(game.hotCount).toBeGreaterThanOrEqual(testConfig.constraints.hot.min);
        expect(game.hotCount).toBeLessThanOrEqual(testConfig.constraints.hot.max);
      }
      if (testConfig.constraints.neutral) {
        expect(game.neutralCount).toBeGreaterThanOrEqual(testConfig.constraints.neutral.min);
        expect(game.neutralCount).toBeLessThanOrEqual(testConfig.constraints.neutral.max);
      }
      if (testConfig.constraints.cold) {
        expect(game.coldCount).toBeGreaterThanOrEqual(testConfig.constraints.cold.min);
        expect(game.coldCount).toBeLessThanOrEqual(testConfig.constraints.cold.max);
      }

      // Check score and normalized breakdown components in [0, 1]
      expect(game.score).toBeGreaterThan(0);
      expect(game.scoreBreakdown!.frequency).toBeGreaterThanOrEqual(0);
      expect(game.scoreBreakdown!.frequency).toBeLessThanOrEqual(1.0);
    }

    // Pairwise Hamming distances: every pair i != j must have d_H >= minHamming
    const masks = generationOutcome.auditedGames.map((g) => numbersToMask(g.numbers));
    const hammingRes = analyzeHammingPortfolio(masks, testConfig.minHamming);
    for (let i = 0; i < masks.length; i++) {
      for (let j = i + 1; j < masks.length; j++) {
        const d = hammingDistance(masks[i]!, masks[j]!);
        expect(d).toBeGreaterThanOrEqual(testConfig.minHamming);
        expect(d % 2).toBe(0); // Hamming distance between combinations of size 15 is always even
        expect(hammingRes.matrix[i]![j]!).toBe(d);
      }
    }

    // Coverage & Hamming metrics
    expect(generationOutcome.coverage).toBeDefined();
    expect(generationOutcome.coverage!.numbersCoveredCount).toBeGreaterThanOrEqual(15);
    expect(generationOutcome.hamming).toBeDefined();
    expect(generationOutcome.hamming!.minDistance).toBeGreaterThanOrEqual(testConfig.minHamming);
  });

  it('renders all 10 application views cleanly without errors and with epistemic badges', () => {
    const mockState: AppState = {
      currentRoute: 'dashboard',
      currentDataset: {
        hash,
        name: 'Lotofácil.xlsx',
        contestsCount: contests.length,
        firstContest: 1,
        lastContest: 3795,
        startDate: null,
        endDate: null,
        importedAt: new Date().toISOString(),
        sourceFormat: 'xlsx',
      },
      currentContests: contests,
      currentAnalysis: analysis,
      currentConfig: testConfig,
      currentOutcome: generationOutcome,
      currentBacktestResult: null,
      selectedNumberForDetail: null,
      isProcessing: false,
      progressStage: '',
      progressPercent: 0,
    };

    const dashboardHtml = renderDashboardPage(mockState);
    expect(dashboardHtml).toContain('FATO MATEMÁTICO');
    expect(dashboardHtml).toContain('ANÁLISE ESTATÍSTICA');
    expect(dashboardHtml).toContain('volante-ball');
    expect(dashboardHtml).toContain('3795');

    const historyHtml = renderHistoryPage(mockState);
    expect(historyHtml).toContain('Histórico de Concursos');
    expect(historyHtml).toContain('3795');

    const statsHtml = renderStatisticsPage(mockState);
    expect(statsHtml).toContain('Análise Estatística & Inferência');
    expect(statsHtml).toContain('Teste de Aderência Qui-Quadrado');

    const cyclesHtml = renderCyclesPage(mockState);
    expect(cyclesHtml).toContain('Ciclo + Linhas + Relacionamentos + Cobertura');
    expect(cyclesHtml).toContain('Ciclo Atual');
    expect(cyclesHtml).toContain('Mapa Cartesiano 5×5 do Volante');
    expect(cyclesHtml).toContain('Dezenas Casadas e Brigadas');

    const markovHtml = renderMarkovPage(mockState);
    expect(markovHtml).toContain('Cadeias de Markov de 1ª Ordem');
    expect(markovHtml).toContain('Maiores Retenções');

    const coocHtml = renderCooccurrencePage(mockState);
    expect(coocHtml).toContain('Coocorrência, Trincas');
    expect(coocHtml).toContain('Pares com Maior Frequência');

    const entropyHtml = renderEntropyPage(mockState);
    expect(entropyHtml).toContain('Entropia Espacial');
    expect(entropyHtml).toContain('Shannon');

    const genHtml = renderGeneratorPage(mockState);
    expect(genHtml).toContain('Gerador de Combinações');
    expect(genHtml).toContain('btn-run-generator');

    const gamesHtml = renderGamesPage(mockState);
    expect(gamesHtml).toContain('Portfólio de Jogos');
    expect(gamesHtml).toContain('100% VÁLIDOS');
    expect(gamesHtml).toContain('Hamming');

    const repHtml = renderReportsPage(mockState);
    expect(repHtml).toContain('Relatório Científico & Reprodutibilidade');
    expect(repHtml).toContain('LOTOFÁCIL QUANT ENGINE');

    const cfgHtml = renderConfigPage(mockState);
    expect(cfgHtml).toContain('Configurações & Backup');
    expect(cfgHtml).toContain('btn-export-backup');
  });

  it('exports valid TXT, CSV, JSON, XLSX, and Markdown reports', () => {
    const games = generationOutcome.auditedGames;
    const repro = generationOutcome.repro;

    // TXT
    const txtDetailed = exportAsTxt(games, true, repro);
    expect(txtDetailed).toContain('LOTOFÁCIL QUANT ENGINE');
    expect(txtDetailed).toContain(repro.datasetHash);
    const txtClean = exportAsTxt(games, false);
    const cleanLines = txtClean.trim().split('\n');
    expect(cleanLines.length).toBe(8);
    for (const line of cleanLines) {
      const nums = line.trim().split(' ');
      expect(nums.length).toBe(15);
    }

    // CSV
    const csv = exportAsCsv(games);
    expect(csv).toContain('Jogo;Bola1;Bola2');

    // JSON
    const jsonStr = exportAsJson(
      games,
      testConfig,
      repro,
      generationOutcome.coverage,
      generationOutcome.hamming,
    );
    const parsed = JSON.parse(jsonStr);
    expect(parsed.lotofacilQuantEngine.reproducibility.engineVersion).toBe(repro.engineVersion);
    expect(parsed.lotofacilQuantEngine.games.length).toBe(8);

    // XLSX native ZIP
    const xlsxBytes = exportAsXlsx(games, repro);
    expect(xlsxBytes.length).toBeGreaterThan(500);
    expect(xlsxBytes[0]).toBe(0x50); // 'P'
    expect(xlsxBytes[1]).toBe(0x4b); // 'K'
    expect(xlsxBytes[2]).toBe(0x03);
    expect(xlsxBytes[3]).toBe(0x04);

    // Markdown Report
    const md = generateScientificReportMarkdown({
      repro,
      config: testConfig,
      analysis,
      games,
      coverage: generationOutcome.coverage,
      hamming: generationOutcome.hamming,
    });
    expect(md).toContain('# LOTOFÁCIL QUANT ENGINE — RELATÓRIO TÉCNICO E CIENTÍFICO');
    expect(md).toContain('QUI-QUADRADO DE PEARSON');
    expect(md).toContain('PORTFÓLIO DE JOGOS GERADOS');
  });

  it('executes full database round-trip, backup export, and rollback safety', async () => {
    // Save to IndexedDB
    await datasetRepository.save(
      {
        hash,
        name: 'Lotofácil.xlsx',
        contestsCount: contests.length,
        firstContest: 1,
        lastContest: 3795,
        startDate: null,
        endDate: null,
        importedAt: new Date().toISOString(),
        sourceFormat: 'xlsx',
      },
      contests,
    );
    await configRepository.saveActive(testConfig);

    // Export backup
    const backupJson = await backupService.exportBackup();
    expect(backupJson).toContain('LOTOFÁCIL QUANT ENGINE');

    // Validate preview
    const preview = backupService.validateBackup(backupJson);
    expect(preview.isValid).toBe(true);
    expect(preview.datasetsCount).toBeGreaterThanOrEqual(1);

    // Restore backup
    await backupService.restoreBackup(preview.payload!);

    // Tampered payload rejection
    const tampered = JSON.parse(backupJson);
    tampered.data.configurations[0].count = 999; // mutate without updating hash
    const tamperedPreview = backupService.validateBackup(JSON.stringify(tampered));
    expect(tamperedPreview.isValid).toBe(false);
    expect(tamperedPreview.errors[0]).toContain('checksum SHA-256');
  });
});
