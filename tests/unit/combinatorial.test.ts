import { describe, expect, it } from 'bun:test';
import { runGeneration } from '../../src/services/generationService';
import { generateCandidatePool } from '../../src/core/combinatorial/candidateGenerator';
import { runDatasetAnalysis } from '../../src/services/analysisService';
import { parseHistoryFile } from '../../src/core/data/parser';
import { DEFAULT_GENERATOR_CONFIG, cloneGeneratorConfig } from '../../src/core/domain/models';
import { readFileSync } from 'node:fs';

describe('Combinatorial Engine & Optimization Tests', () => {
  const bytes = new Uint8Array(readFileSync('tests/fixtures/lotofacil_3795.xlsx'));
  const { contests, hash } = parseHistoryFile(bytes, 'Lotofácil.xlsx');
  const analysis = runDatasetAnalysis(contests);

  it('detects impossible thermal quotas and aborts before generation (§12, §40)', () => {
    const config = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    // On contest 3795, hot count is 5. Requesting 7 hot numbers is impossible!
    config.constraints.hot = { min: 7, max: 7 };
    config.constraints.neutral = { min: 5, max: 5 };
    config.constraints.cold = { min: 3, max: 3 };

    const outcome = runGeneration(
      config,
      analysis,
      hash,
      contests.length,
      contests[0]!.contest,
      contests[contests.length - 1]!.contest,
    );

    expect(outcome.success).toBe(false);
    expect(outcome.feasibility.isFeasible).toBe(false);
    expect(outcome.auditedGames.length).toBe(0);
    expect(outcome.errorMessage).toContain('Categoria Quente disponível: 5, solicitada: 7');
  });

  it('detects impossible min > max constraints', () => {
    const config = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    config.constraints.sum = { min: 230, max: 180 }; // min > max

    const outcome = runGeneration(config, analysis);
    expect(outcome.success).toBe(false);
    expect(outcome.feasibility.isFeasible).toBe(false);
    expect(outcome.errorMessage).toContain('estritamente maior que o máximo');
  });

  it('generates fully compliant, valid games adhering to all hard constraints (§19, §31, §39)', () => {
    const config = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    config.count = 5;
    config.minHamming = 10;
    config.seed = 20261003;

    const outcome = runGeneration(
      config,
      analysis,
      hash,
      contests.length,
      contests[0]!.contest,
      contests[contests.length - 1]!.contest,
    );

    expect(outcome.success).toBe(true);
    expect(outcome.auditedGames.length).toBe(5);
    expect(outcome.validation?.allValid).toBe(true);

    for (const game of outcome.auditedGames) {
      expect(game.status).toBe('VALID');
      expect(game.numbers.length).toBe(15);
      expect(new Set(game.numbers).size).toBe(15);
      expect(game.numbers.every((n) => n >= 1 && n <= 25)).toBe(true);
      // Hard constraints defaults:
      // sum: 170..220
      expect(game.sum).toBeGreaterThanOrEqual(170);
      expect(game.sum).toBeLessThanOrEqual(220);
      // even: 7..8
      expect(game.evenCount).toBeGreaterThanOrEqual(7);
      expect(game.evenCount).toBeLessThanOrEqual(8);
      // prime: 5..6
      expect(game.primeCount).toBeGreaterThanOrEqual(5);
      expect(game.primeCount).toBeLessThanOrEqual(6);
      // frame: 9..11
      expect(game.frameCount).toBeGreaterThanOrEqual(9);
      expect(game.frameCount).toBeLessThanOrEqual(11);
      // fibonacci: 3..5
      expect(game.fibonacciCount).toBeGreaterThanOrEqual(3);
      expect(game.fibonacciCount).toBeLessThanOrEqual(5);
      // repeat from last draw: 8..10
      expect(game.repeatedCount).toBeGreaterThanOrEqual(8);
      expect(game.repeatedCount).toBeLessThanOrEqual(10);
      // Hamming with portfolio: >= 10
      expect(game.minHamming).toBeGreaterThanOrEqual(10);
    }
  });

  it('guarantees scientific determinism: same seed produces identical results (§24, §46)', () => {
    const config1 = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    config1.count = 4;
    config1.seed = 424242;

    const config2 = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    config2.count = 4;
    config2.seed = 424242;

    const outcome1 = runGeneration(config1, analysis);
    const outcome2 = runGeneration(config2, analysis);

    expect(outcome1.success).toBe(true);
    expect(outcome2.success).toBe(true);

    for (let i = 0; i < 4; i++) {
      expect(outcome1.auditedGames[i]!.numbers).toEqual(outcome2.auditedGames[i]!.numbers);
      expect(outcome1.auditedGames[i]!.score).toBe(outcome2.auditedGames[i]!.score);
    }
  });

  it('calculates exact portfolio coverage and Hamming statistics (§22, §23)', () => {
    const config = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    config.count = 6;
    config.minHamming = 10;
    config.seed = 20261003;

    const outcome = runGeneration(config, analysis);
    expect(outcome.success).toBe(true);
    expect(outcome.coverage).not.toBeNull();
    expect(outcome.hamming).not.toBeNull();

    expect(outcome.coverage!.numbersCoveredCount).toBeGreaterThan(15);
    expect(outcome.coverage!.numbersCoverageRatio).toBeGreaterThan(0.6);
    expect(outcome.hamming!.minDistance).toBeGreaterThanOrEqual(10);
    expect(outcome.hamming!.isPortfolioValid).toBe(true);
  });

  it('proves generateCandidatePool is seed-sensitive and free from prefix-01 bias (ACHADO-01)', () => {
    const config = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    const pool1 = generateCandidatePool(config.constraints, null, 200, 101);
    const pool2 = generateCandidatePool(config.constraints, null, 200, 202);

    expect(pool1.masks.length).toBe(200);
    expect(pool2.masks.length).toBe(200);

    // Pools de sementes diferentes não podem ser idênticos
    expect(pool1.masks).not.toEqual(pool2.masks);

    // Ambas as sementes não devem conter duplicatas
    expect(new Set(pool1.masks).size).toBe(200);
    expect(new Set(pool2.masks).size).toBe(200);

    // Ausência de viés prefixo: dezena 1 não deve aparecer em 100% dos jogos
    const countOneInPool1 = pool1.masks.filter((m) => (m & 1) !== 0).length;
    const ratioOne = countOneInPool1 / 200;
    // O baseline teórico de aparição de qualquer dezena é 15/25 = 0.60
    expect(ratioOne).toBeLessThan(0.85);
    expect(ratioOne).toBeGreaterThan(0.35);
  });

  it('finds 100% of exact viable space in reduced combinatorial subspace (< 500 combinations)', () => {
    const config = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    // Fixa 13 dezenas (1..13). O espaço total restante para escolher 2 dezenas entre as 12 restantes (14..25) é C(12, 2) = 66
    config.constraints.fixedIncluded = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    config.constraints.excluded = [];
    config.constraints.lineMode = 'FREE'; // Permite linhas livres para testar C(12, 2) puro
    // Abre os filtros para permitir todas as 66 combinações
    config.constraints.sum = { min: 50, max: 350 };
    config.constraints.even = { min: 2, max: 14 };
    config.constraints.prime = { min: 1, max: 12 };
    config.constraints.frame = { min: 4, max: 15 };
    config.constraints.core = { min: 1, max: 10 };
    config.constraints.fibonacci = { min: 1, max: 8 };
    config.constraints.repeat = { min: 0, max: 15 };

    const pool = generateCandidatePool(config.constraints, null, 1000, 42);
    // C(12, 2) = 66 combinações exatas
    expect(pool.masks.length).toBe(66);
    expect(new Set(pool.masks).size).toBe(66);
  });

  it('proves portfolioStrategy sensitivity alters selected portfolio and passes validation', () => {
    const configCycle = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    configCycle.count = 5;
    configCycle.seed = 999;
    configCycle.portfolioStrategy = 'CYCLE';

    const configLines = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    configLines.count = 5;
    configLines.seed = 999;
    configLines.portfolioStrategy = 'LINES';

    const outcomeCycle = runGeneration(configCycle, analysis);
    const outcomeLines = runGeneration(configLines, analysis);

    expect(outcomeCycle.success).toBe(true);
    expect(outcomeLines.success).toBe(true);

    expect(outcomeCycle.validation?.allValid).toBe(true);
    expect(outcomeLines.validation?.allValid).toBe(true);

    const numbersCycle = outcomeCycle.auditedGames.map((g) => g.numbers);
    const numbersLines = outcomeLines.auditedGames.map((g) => g.numbers);
    expect(numbersCycle).not.toEqual(numbersLines);
  });
});
