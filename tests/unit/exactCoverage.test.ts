import { describe, expect, it } from 'bun:test';
import {
  evaluateExactPortfolioCoverage,
  SINGLE_GAME_THEORETICAL_COUNTS,
  TOTAL_LOTOFACIL_OUTCOMES,
} from '../../src/core/combinatorial/exactCoverage';

describe('Exact Portfolio Coverage in C(25, 15) = 3.268.760 Tests (FASE 4)', () => {
  it('evaluates exactly 3.268.760 outcomes with sum of bestHitDistribution equal to universe', () => {
    // 2 jogos arbitrários de 15 dezenas
    const game1 = 0x7fff; // dezenas 1..15
    const game2 = 0x7fff << 10; // dezenas 11..25
    const report = evaluateExactPortfolioCoverage([game1, game2]);

    expect(report.totalOutcomesEvaluated).toBe(TOTAL_LOTOFACIL_OUTCOMES);
    expect(report.uniqueGamesCount).toBe(2);
    expect(report.duplicateGamesCount).toBe(0);

    const sumDistribution = report.bestHitDistribution.reduce((a, b) => a + b, 0);
    expect(sumDistribution).toBe(TOTAL_LOTOFACIL_OUTCOMES);
  });

  it('matches EXACT theoretical hypergeometric distribution for any single game (K=1)', () => {
    const game = 0x7fff; // 15 dezenas (1..15)
    const report = evaluateExactPortfolioCoverage([game]);

    expect(report.uniqueGamesCount).toBe(1);
    expect(report.totalOutcomesEvaluated).toBe(TOTAL_LOTOFACIL_OUTCOMES);

    // Valida cada faixa de acerto 0..15 contra o referencial teórico hipergeométrico exato
    for (let h = 0; h <= 15; h++) {
      expect(report.bestHitDistribution[h]).toBe(SINGLE_GAME_THEORETICAL_COUNTS[h]!);
    }

    // Acertos específicos de interesse
    expect(report.bestHitDistribution[15]).toBe(1);
    expect(report.bestHitDistribution[14]).toBe(150);
    expect(report.bestHitDistribution[13]).toBe(4725);
    expect(report.bestHitDistribution[12]).toBe(54600);
    expect(report.bestHitDistribution[11]).toBe(286650);
    expect(report.bestHitDistribution[10]).toBe(756756);

    // Probabilidade exata de 15 pontos: 1 / 3.268.760
    expect(report.exactProbabilities.exact15).toBeCloseTo(1 / TOTAL_LOTOFACIL_OUTCOMES, 8);

    // Para 1 único jogo, a eficiência em relação ao Boole's union bound deve ser exatamente 1.0 (100%)
    expect(report.unionBoundEfficiency.atLeast11).toBe(1.0);
    expect(report.unionBoundEfficiency.atLeast12).toBe(1.0);
    expect(report.unionBoundEfficiency.atLeast13).toBe(1.0);

    // Cobertura de subconjuntos para 1 único jogo
    // C(15, 2) = 105 de 300 pares
    expect(report.subsetCoverage.pairsCovered).toBe(105);
    expect(report.subsetCoverage.pairsCoverageRatio).toBeCloseTo(105 / 300, 4);

    // C(15, 3) = 455 de 2.300 ternos
    expect(report.subsetCoverage.triplesCovered).toBe(455);
    expect(report.subsetCoverage.triplesCoverageRatio).toBeCloseTo(455 / 2300, 4);

    // C(15, 4) = 1.365 de 12.650 quadras
    expect(report.subsetCoverage.quadruplesCovered).toBe(1365);
    expect(report.subsetCoverage.quadruplesCoverageRatio).toBeCloseTo(1365 / 12650, 4);
  });

  it('neutralizes duplicate games (identical bets produce identical coverage as 1 single game)', () => {
    const game = 0x7fff;
    // Carteira com 3 jogos idênticos
    const reportSingle = evaluateExactPortfolioCoverage([game]);
    const reportDuplicate = evaluateExactPortfolioCoverage([game, game, game]);

    expect(reportDuplicate.uniqueGamesCount).toBe(1);
    expect(reportDuplicate.duplicateGamesCount).toBe(2);

    expect(reportDuplicate.bestHitDistribution).toEqual(reportSingle.bestHitDistribution);
    expect(reportDuplicate.exactProbabilities).toEqual(reportSingle.exactProbabilities);
    expect(reportDuplicate.subsetCoverage).toEqual(reportSingle.subsetCoverage);
  });

  it('proves high Hamming distance (dH=10) achieves strictly superior coverage than overlapping games (dH=2)', () => {
    // Jogo base: dezenas 1..15
    const baseGame = 0x7fff;

    // Jogo A: Hamming distance = 2 (troca dezena 15 por dezena 16: interseção 14 dezenas)
    // dH = 15 + 15 - 2*14 = 2
    const gameOverlap = (baseGame ^ (1 << 14)) | (1 << 15);

    // Jogo B: Hamming distance = 10 (troca 5 dezenas: 11..15 por 16..20: interseção 10 dezenas)
    // dH = 15 + 15 - 2*10 = 10
    let gameDispersed = baseGame;
    for (let b = 10; b < 15; b++) gameDispersed &= ~(1 << b);
    for (let b = 15; b < 20; b++) gameDispersed |= 1 << b;

    const reportOverlap = evaluateExactPortfolioCoverage([baseGame, gameOverlap]);
    const reportDispersed = evaluateExactPortfolioCoverage([baseGame, gameDispersed]);

    // O portfólio disperso (dH = 10) deve cobrir estritamente mais resultados premiados (>= 11, >= 12, >= 13)
    expect(reportDispersed.exactProbabilities.atLeast11).toBeGreaterThan(
      reportOverlap.exactProbabilities.atLeast11,
    );
    expect(reportDispersed.exactProbabilities.atLeast12).toBeGreaterThan(
      reportOverlap.exactProbabilities.atLeast12,
    );
    expect(reportDispersed.exactProbabilities.atLeast13).toBeGreaterThan(
      reportOverlap.exactProbabilities.atLeast13,
    );

    // Também deve cobrir mais pares e ternos únicos
    expect(reportDispersed.subsetCoverage.pairsCovered).toBeGreaterThan(
      reportOverlap.subsetCoverage.pairsCovered,
    );
    expect(reportDispersed.subsetCoverage.triplesCovered).toBeGreaterThan(
      reportOverlap.subsetCoverage.triplesCovered,
    );
  });
});
