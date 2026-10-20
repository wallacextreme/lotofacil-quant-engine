import { describe, expect, it } from 'bun:test';
import { trackCycles } from '../../src/core/statistics/cycles';
import type { Contest } from '../../src/core/domain/types';

describe('CycleTracker Unit Tests (§1)', () => {
  it('tracks empty contests cleanly', () => {
    const res = trackCycles([]);
    expect(res.completedCyclesCount).toBe(0);
    expect(res.currentCycle.coveredCount).toBe(0);
    expect(res.currentCycle.missingCount).toBe(25);
    expect(res.metrics.meanDuration).toBe(0);
  });

  it('accurately identifies cycle closure when all 25 numbers are covered', () => {
    // Concurso 1: 01..15 (15 dezenas)
    // Concurso 2: 11..25 (15 dezenas, fecha as dezenas 16..25 => todas as 25 saíram em 2 concursos!)
    const c1: Contest = {
      contest: 1,
      date: '2024-01-01',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    };
    const c2: Contest = {
      contest: 2,
      date: '2024-01-02',
      numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    };
    // Concurso 3: inicia Ciclo 2 com 15 dezenas
    const c3: Contest = {
      contest: 3,
      date: '2024-01-03',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    };

    const res = trackCycles([c1, c2, c3]);

    expect(res.completedCyclesCount).toBe(1);
    expect(res.completedCycles[0]!.cycleIndex).toBe(1);
    expect(res.completedCycles[0]!.startContest).toBe(1);
    expect(res.completedCycles[0]!.endContest).toBe(2);
    expect(res.completedCycles[0]!.duration).toBe(2);

    // Ciclo 2 em andamento
    expect(res.currentCycle.cycleIndex).toBe(2);
    expect(res.currentCycle.startContest).toBe(3);
    expect(res.currentCycle.currentContest).toBe(3);
    expect(res.currentCycle.consecutiveDraws).toBe(1);
    expect(res.currentCycle.coveredCount).toBe(15);
    expect(res.currentCycle.missingCount).toBe(10);
    expect(res.currentCycle.missingNumbers).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
  });

  it('correctly calculates metrics: mean, median, min, max duration', () => {
    // 3 ciclos simulados: durações 3, 4, 5
    // Ciclo 1 (3 conc): 1..15, 6..20, 11..25
    // Ciclo 2 (4 conc): 1..15, 2..16, 3..17, 11..25
    const dummyContests: Contest[] = [];
    let contestNum = 1;

    // Helper para gerar um ciclo fechado com d concursos
    const addCycle = (d: number) => {
      for (let i = 0; i < d - 1; i++) {
        dummyContests.push({
          contest: contestNum++,
          date: '2024-01-01',
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        });
      }
      // Último concurso do ciclo introduz 16..25
      dummyContests.push({
        contest: contestNum++,
        date: '2024-01-01',
        numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
      });
    };

    addCycle(3);
    addCycle(4);
    addCycle(5);

    const res = trackCycles(dummyContests);
    expect(res.completedCyclesCount).toBe(3);
    expect(res.metrics.minDuration).toBe(3);
    expect(res.metrics.maxDuration).toBe(5);
    expect(res.metrics.meanDuration).toBe(4);
    expect(res.metrics.medianDuration).toBe(4);
    expect(res.durationDistribution.length).toBe(3);
  });

  it('calculates duration based on actual draw counts even with non-consecutive contest numbers (ISSUE-05)', () => {
    // 3 concursos com IDs não consecutivos: 10, 20, 30
    const c1: Contest = {
      contest: 10,
      date: '2024-01-01',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    };
    const c2: Contest = {
      contest: 20,
      date: '2024-01-02',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    };
    const c3: Contest = {
      contest: 30,
      date: '2024-01-03',
      numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    };

    const res = trackCycles([c1, c2, c3]);
    expect(res.completedCyclesCount).toBe(1);
    // Duração real em quantidade de concursos do ciclo deve ser 3, não 21 (30 - 10 + 1)
    expect(res.completedCycles[0]!.duration).toBe(3);
    expect(res.completedCycles[0]!.startContest).toBe(10);
    expect(res.completedCycles[0]!.endContest).toBe(30);
  });
});
