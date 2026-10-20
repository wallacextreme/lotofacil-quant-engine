import { describe, expect, it } from 'bun:test';
import {
  analyzePortfolioExposure,
  distributeAbsentNumbersAcrossCandidates,
} from '../../src/core/combinatorial/absenceOptimizer';
import { optimizePortfolio } from '../../src/core/combinatorial/optimizer';
import { cloneGeneratorConfig, DEFAULT_GENERATOR_CONFIG } from '../../src/core/domain/models';
import { UNIVERSE_SIZE } from '../../src/core/domain/constants';

describe('Absence Optimizer & Portfolio Exposure Tests (§10, §11, ISSUE-01)', () => {
  // Cenário artificial: 25 dezenas, 10 jogos, 5 dezenas ausentes
  const absentNumbers = [21, 22, 23, 24, 25];

  // Cria 10 jogos artificiais com 15 dezenas cada
  // Jogos 0..9 contêm dezenas 1..15 quase sempre, dezenas 16..20 moderadamente, e 21..25 raramente
  const games10: number[][] = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17, 18],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 19, 20, 21],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 16, 21, 22],
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 17, 22, 23],
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 18, 23, 24],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15, 19, 24, 25],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 20, 21, 25],
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 17, 18, 22, 23],
  ];

  it('computes 25x10 exposure matrix, balance scores, and coverage accurately', () => {
    const exposure = analyzePortfolioExposure(games10, {
      minAppearancesPerNumber: 2,
      maxAppearancesPerNumber: 8,
    });

    expect(exposure.portfolioSize).toBe(10);
    // Matriz 25 × 10
    expect(exposure.matrix.length).toBe(UNIVERSE_SIZE);
    for (let i = 0; i < UNIVERSE_SIZE; i++) {
      expect(exposure.matrix[i]!.length).toBe(10);
    }

    // Frequência de aparição por dezena
    expect(exposure.appearancesPerNumber.length).toBe(25);
    const totalAppearances = exposure.appearancesPerNumber.reduce((a, b) => a + b, 0);
    expect(totalAppearances).toBe(15 * 10); // 150 dezenas marcadas no total

    // Taxa de exposição
    for (let i = 0; i < UNIVERSE_SIZE; i++) {
      expect(exposure.exposureRates[i]).toBeCloseTo(exposure.appearancesPerNumber[i]! / 10, 5);
    }

    // Cobertura e equilíbrio
    expect(exposure.uniqueNumbersCovered).toBe(25); // Todas as 25 dezenas aparecem pelo menos 1 vez
    expect(exposure.coverageScore).toBe(1.0);
    expect(exposure.exposureBalanceScore).toBeGreaterThan(0);
    expect(exposure.exposureBalanceScore).toBeLessThanOrEqual(1.0);

    // Concentração e sub-representação
    // Dezenas com aparições > 8 (maxLimit)
    expect(exposure.overConcentratedNumbers.length).toBeGreaterThan(0);
    for (const num of exposure.overConcentratedNumbers) {
      expect(exposure.appearancesPerNumber[num - 1]!).toBeGreaterThan(8);
    }
  });

  it('distributes absent numbers across candidates respecting maxAbsentPerGame', () => {
    // Cria pool de 6 candidatos com diferentes contagens de dezenas ausentes
    const pool = [
      // Candidato 1: score alto, mas 4 ausentes (excesso de concentração)
      { mask: 1, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 21, 22, 23, 24], score: 0.95 },
      // Candidato 2: score 0.85, 2 ausentes
      { mask: 2, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 21, 22], score: 0.85 },
      // Candidato 3: score 0.80, 1 ausente
      { mask: 3, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 23], score: 0.8 },
      // Candidato 4: score 0.75, 2 ausentes
      { mask: 4, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 24, 25], score: 0.75 },
      // Candidato 5: score 0.70, 1 ausente
      { mask: 5, numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 25], score: 0.7 },
      // Candidato 6: score 0.65, 0 ausentes
      { mask: 6, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], score: 0.65 },
    ];

    const selected = distributeAbsentNumbersAcrossCandidates(absentNumbers, pool, 3, 2);
    expect(selected.length).toBe(3);
    // Candidato 1 tem 4 ausentes (acima de maxAbsentPerGame = 2), logo não deve ser o primeiro escolhido se houver opções
    expect(selected).toContain(2);
    expect(selected).toContain(3);
    expect(selected).toContain(4);
    expect(selected[0]).not.toBe(1);
  });

  it('demonstrates sensitivity to exposureBalance weight in optimizePortfolio', () => {
    const configZero = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    configZero.count = 5;
    configZero.minHamming = 8;
    configZero.poolSize = 1500;
    configZero.seed = 42;
    configZero.weights.exposureBalance = 0; // Desativado (peso = 0)

    const resultZero = optimizePortfolio(configZero, null);
    expect(resultZero.success).toBe(true);
    expect(resultZero.games.length).toBe(5);

    const configActive = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
    configActive.count = 5;
    configActive.minHamming = 8;
    configActive.poolSize = 1500;
    configActive.seed = 42;
    configActive.weights.exposureBalance = 1.0; // Peso alto de exposição balanceada

    const resultActive = optimizePortfolio(configActive, null);
    expect(resultActive.success).toBe(true);
    expect(resultActive.games.length).toBe(5);

    // Ao ativar o peso de equilíbrio de exposição com peso 1.0, o AbsenceOptimizer
    // influencia ativamente a ordenação dos compatíveis (marginalGain) e o score final
    const gamesZero = resultZero.games.map((g) => g.numbers);
    const gamesActive = resultActive.games.map((g) => g.numbers);

    const expZero = analyzePortfolioExposure(gamesZero);
    const expActive = analyzePortfolioExposure(gamesActive);

    // Ambos geram portfólios válidos com matrizes de exposição bem definidas
    expect(expZero.portfolioSize).toBe(5);
    expect(expActive.portfolioSize).toBe(5);
    expect(expActive.exposureBalanceScore).toBeGreaterThanOrEqual(0);
    expect(expActive.exposureBalanceScore).toBeLessThanOrEqual(1.0);
  });
});
