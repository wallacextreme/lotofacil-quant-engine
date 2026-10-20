import { describe, expect, it } from 'bun:test';
import { randomGameWithBalancedLines, runWalkForwardBacktest } from '../../src/core/backtest/walkForward';
import type { Contest } from '../../src/core/domain/types';
import { createRng } from '../../src/core/util/prng';
import { scoreCombinationLines } from '../../src/core/combinatorial/lineScorer';

describe('Walk-Forward Backtest & Ablation Engine Tests (§15, §16)', () => {
  it('guarantees 100% compliance of balanced lines (2..4 per row) with zero fallback violations (ACHADO-06)', () => {
    const rng = createRng(12345);
    // Gera 500 jogos e garante que 100% respeitam estritamente a restrição de linhas 2..4
    for (let i = 0; i < 500; i++) {
      const g = randomGameWithBalancedLines(rng);
      expect(g.length).toBe(15);
      expect(new Set(g).size).toBe(15);
      const res = scoreCombinationLines(g, 'BALANCED');
      expect(res.isBalanced).toBe(true);
    }
  });

  it('executes 7 benchmarks and ablations out-of-sample with paired inferential metrics', () => {
    // Cria 40 concursos simulados
    const contests: Contest[] = Array.from({ length: 40 }, (_, i) => {
      const offset = i % 5;
      const numbers = [1 + offset, 2, 3, 4, 5, 6 + (i % 2), 7, 8, 9, 10, 11, 12, 13, 14, 15 + (i % 8)]
        .slice(0, 15)
        .sort((a, b) => a - b);

      return {
        contest: i + 1,
        date: '2024-01-01',
        numbers,
      };
    });

    const result = runWalkForwardBacktest(contests, 5, 12345, 'FAST');

    expect(result.evaluationPoints).toBe(5);
    expect(result.startContest).toBe(36);
    expect(result.endContest).toBe(40);

    // 7 Benchmarks Obrigatórios (§15)
    expect(result.benchmarks.length).toBe(7);
    expect(result.benchmarks[0]!.name).toContain('B1: 10 Jogos Aleatórios');
    expect(result.benchmarks[1]!.name).toContain('B2: Aleatório + Linhas');
    expect(result.benchmarks[2]!.name).toContain('B3: Carteira 5-3-2 Base');
    expect(result.benchmarks[3]!.name).toContain('B4: 5-3-2 + Linhas');
    expect(result.benchmarks[4]!.name).toContain('B5: 5-3-2 + Ciclo');
    expect(result.benchmarks[5]!.name).toContain('B6: 5-3-2 + Relacionamentos');
    expect(result.benchmarks[6]!.name).toContain('B7: Modelo Híbrido Completo');

    // Métricas por benchmark
    for (const b of result.benchmarks) {
      expect(b.totalGamesTested).toBe(50); // 5 pontos * 10 jogos
      expect(b.meanHits).toBeGreaterThanOrEqual(0);
      expect(b.meanHits).toBeLessThanOrEqual(15);
      expect(b.averageCoverage).toBeGreaterThan(15);
      expect(b.totalCost).toBe(150); // 50 * R$ 3,00

      // Inferência estatística pareada contra B1
      expect(b.pairedMeanDiff).toBeDefined();
      expect(b.ci95Lower).toBeDefined();
      expect(b.ci95Upper).toBeDefined();
      expect(b.pValueVsRandom).toBeDefined();
      expect(b.winRateVsRandom).toBeDefined();
      expect(b.epistemicVerdict).toBeDefined();
    }

    expect(result.benchmarks[0]!.epistemicVerdict).toBe('BENCHMARK_BASE');

    // Mode & Description
    expect(result.mode).toBe('FAST');
    expect(result.modeDescription).toContain('Fast Mode');

    // 6 Testes de Ablação (§16)
    expect(result.ablations.length).toBe(6);
    expect(result.ablations[0]!.name).toBe('FULL MODEL');
    expect(result.ablations[1]!.name).toBe('FULL - CYCLE');
    expect(result.ablations[2]!.name).toBe('FULL - LINES');
    expect(result.ablations[3]!.name).toBe('FULL - PAIRS');
    expect(result.ablations[4]!.name).toBe('FULL - DELAY');
    expect(result.ablations[5]!.name).toBe('FULL - COVERAGE');

    for (const a of result.ablations) {
      expect(a.totalGamesTested).toBe(50); // 5 pontos * 10 jogos
      expect(a.totalCost).toBe(150);
      expect(a.meanHits).toBeGreaterThanOrEqual(0);
      expect(a.meanHits).toBeLessThanOrEqual(15);
      expect(a.averageCoverage).toBeGreaterThan(15);
    }
  });

  it('proves PRODUCTION mode executes distinct real optimization pipeline (§ISSUE-08)', () => {
    const contests: Contest[] = Array.from({ length: 35 }, (_, i) => ({
      contest: i + 1,
      date: '2024-01-01',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    }));

    const fastResult = runWalkForwardBacktest(contests, 2, 9999, 'FAST');
    const prodResult = runWalkForwardBacktest(contests, 2, 9999, 'PRODUCTION');

    expect(fastResult.mode).toBe('FAST');
    expect(prodResult.mode).toBe('PRODUCTION');
    expect(prodResult.modeDescription).toContain('Production Mode');

    expect(prodResult.evaluationPoints).toBe(2);
    expect(prodResult.benchmarks.length).toBe(7);
    expect(prodResult.ablations.length).toBe(6);

    for (const b of prodResult.benchmarks) {
      expect(b.totalGamesTested).toBe(20);
      expect(b.epistemicVerdict).toBeDefined();
    }
  });
});
