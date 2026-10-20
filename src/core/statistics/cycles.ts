/**
 * Módulo de Rastreamento de Ciclos das 25 Dezenas (CycleTracker).
 *
 * FATO MATEMÁTICO & ANÁLISE ESTATÍSTICA:
 * - Um ciclo se inicia no concurso imediatamente posterior ao fechamento do ciclo anterior.
 * - O ciclo é finalizado no concurso exato em que todas as 25 dezenas tiverem ocorrido
 *   pelo menos uma vez no acumulado do ciclo.
 * - Definição rigorosa, reproduzível e livre de subjetividade.
 */
import { UNIVERSE_SIZE } from '../domain/constants';
import type { Contest } from '../domain/types';

export interface CycleRecord {
  cycleIndex: number;
  startContest: number;
  endContest: number;
  duration: number; // quantidade de concursos necessários para fechar as 25 dezenas
  startDate: string | null;
  endDate: string | null;
  /** Sequência de fechamento: quais dezenas foram as últimas a sair para fechar o ciclo */
  lastNumbersToClose: number[];
  /** Contagem de aparições de cada dezena durante o ciclo (índice 0 = dezena 1) */
  numberAppearances: number[];
}

export interface CurrentCycleStatus {
  cycleIndex: number;
  startContest: number;
  currentContest: number;
  consecutiveDraws: number; // concursos decorridos no ciclo atual
  coveredCount: number; // ex: 21
  missingCount: number; // ex: 4
  coveredNumbers: number[];
  missingNumbers: number[];
  /** Aparições de cada dezena no ciclo atual (tamanho 25, índice 0 = dezena 1) */
  appearances: number[];
  /** Atraso de cada dezena dentro do ciclo atual */
  currentDelays: number[];
  /** Último concurso em que a dezena ocorreu */
  lastSeenContest: (number | null)[];
  /** Participação percentual de cada dezena no ciclo atual */
  percentage: number[];
  /** Status empírico da dezena no ciclo */
  status: ('PRESENTE_FREQUENTE' | 'PRESENTE_MODERADA' | 'AUSENTE_NO_CICLO')[];
}

export interface CycleDistributionItem {
  duration: number;
  frequency: number;
  relativeFrequency: number;
}

export interface CycleAnalysis {
  completedCyclesCount: number;
  completedCycles: CycleRecord[];
  currentCycle: CurrentCycleStatus;
  /** Estatísticas de duração dos ciclos completos */
  metrics: {
    meanDuration: number;
    medianDuration: number;
    minDuration: number;
    maxDuration: number;
    stdDuration: number;
  };
  /** Histograma de frequências das durações históricas de ciclos */
  durationDistribution: CycleDistributionItem[];
}

/**
 * Calcula o histórico completo e o estado do ciclo atual a partir de uma lista ordenada de concursos.
 */
export function trackCycles(contests: readonly Contest[]): CycleAnalysis {
  if (contests.length === 0) {
    return {
      completedCyclesCount: 0,
      completedCycles: [],
      currentCycle: {
        cycleIndex: 1,
        startContest: 0,
        currentContest: 0,
        consecutiveDraws: 0,
        coveredCount: 0,
        missingCount: UNIVERSE_SIZE,
        coveredNumbers: [],
        missingNumbers: Array.from({ length: UNIVERSE_SIZE }, (_, i) => i + 1),
        appearances: new Array(UNIVERSE_SIZE).fill(0),
        currentDelays: new Array(UNIVERSE_SIZE).fill(0),
        lastSeenContest: new Array(UNIVERSE_SIZE).fill(null),
        percentage: new Array(UNIVERSE_SIZE).fill(0),
        status: new Array(UNIVERSE_SIZE).fill('AUSENTE_NO_CICLO'),
      },
      metrics: {
        meanDuration: 0,
        medianDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        stdDuration: 0,
      },
      durationDistribution: [],
    };
  }

  const completedCycles: CycleRecord[] = [];
  let currentCycleIndex = 1;
  let cycleStartContest = contests[0]!.contest;
  let cycleStartDate = contests[0]!.date;
  let currentMask = 0;
  const FULL_MASK = (1 << UNIVERSE_SIZE) - 1; // 25 bits ligados

  let cycleAppearances = new Array<number>(UNIVERSE_SIZE).fill(0);
  let cycleLastSeen = new Array<number | null>(UNIVERSE_SIZE).fill(null);
  let cycleLastSeenDraw = new Array<number | null>(UNIVERSE_SIZE).fill(null);
  let cycleDrawsCount = 0;

  for (let idx = 0; idx < contests.length; idx++) {
    const c = contests[idx]!;
    cycleDrawsCount++;

    for (const n of c.numbers) {
      if (n >= 1 && n <= UNIVERSE_SIZE) {
        currentMask |= 1 << (n - 1);
        cycleAppearances[n - 1]!++;
        cycleLastSeen[n - 1] = c.contest;
        cycleLastSeenDraw[n - 1] = cycleDrawsCount;
      }
    }

    // Se todas as 25 dezenas já ocorreram neste ciclo, fechamos o ciclo
    if (currentMask === FULL_MASK) {
      const duration = cycleDrawsCount;

      // Identifica quais dezenas foram as últimas a sair neste concurso de fechamento
      const lastNumbersToClose: number[] = [];
      for (const n of c.numbers) {
        if (cycleAppearances[n - 1] === 1) {
          lastNumbersToClose.push(n);
        }
      }

      completedCycles.push({
        cycleIndex: currentCycleIndex,
        startContest: cycleStartContest,
        endContest: c.contest,
        duration,
        startDate: cycleStartDate,
        endDate: c.date,
        lastNumbersToClose,
        numberAppearances: [...cycleAppearances],
      });

      // Reinicia para o próximo ciclo
      currentCycleIndex++;
      currentMask = 0;
      cycleAppearances = new Array<number>(UNIVERSE_SIZE).fill(0);
      cycleLastSeen = new Array<number | null>(UNIVERSE_SIZE).fill(null);
      cycleLastSeenDraw = new Array<number | null>(UNIVERSE_SIZE).fill(null);
      cycleDrawsCount = 0;

      if (idx + 1 < contests.length) {
        cycleStartContest = contests[idx + 1]!.contest;
        cycleStartDate = contests[idx + 1]!.date;
      } else {
        cycleStartContest = c.contest + 1;
        cycleStartDate = null;
      }
    }
  }

  // Monta estado do ciclo atual (que pode estar em andamento ou recém-iniciado)
  const lastContest = contests[contests.length - 1]!;
  const coveredNumbers: number[] = [];
  const missingNumbers: number[] = [];
  const currentDelays = new Array<number>(UNIVERSE_SIZE).fill(0);
  const percentage = new Array<number>(UNIVERSE_SIZE).fill(0);
  const status: ('PRESENTE_FREQUENTE' | 'PRESENTE_MODERADA' | 'AUSENTE_NO_CICLO')[] = [];

  const consecutiveDraws = currentMask === 0 ? 0 : cycleDrawsCount;

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const num = i + 1;
    const isCovered = (currentMask >>> i) & 1;
    const apps = cycleAppearances[i]!;

    if (isCovered) {
      coveredNumbers.push(num);
      percentage[i] = consecutiveDraws > 0 ? (apps / consecutiveDraws) * 100 : 0;
      currentDelays[i] =
        cycleLastSeenDraw[i] !== null ? consecutiveDraws - cycleLastSeenDraw[i]! : consecutiveDraws;

      // Status derivado de dados: se apareceu mais de 60% dos sorteios do ciclo é frequente
      status.push(percentage[i]! >= 60 ? 'PRESENTE_FREQUENTE' : 'PRESENTE_MODERADA');
    } else {
      missingNumbers.push(num);
      currentDelays[i] = consecutiveDraws;
      percentage[i] = 0;
      status.push('AUSENTE_NO_CICLO');
    }
  }

  const currentCycle: CurrentCycleStatus = {
    cycleIndex: currentCycleIndex,
    startContest: cycleStartContest,
    currentContest: lastContest.contest,
    consecutiveDraws,
    coveredCount: coveredNumbers.length,
    missingCount: missingNumbers.length,
    coveredNumbers,
    missingNumbers,
    appearances: cycleAppearances,
    currentDelays,
    lastSeenContest: cycleLastSeen,
    percentage,
    status,
  };

  // Estatísticas de duração dos ciclos completos
  const durations = completedCycles.map((c) => c.duration).sort((a, b) => a - b);
  let meanDuration = 0;
  let medianDuration = 0;
  let minDuration = 0;
  let maxDuration = 0;
  let stdDuration = 0;

  if (durations.length > 0) {
    minDuration = durations[0]!;
    maxDuration = durations[durations.length - 1]!;
    const sum = durations.reduce((acc, v) => acc + v, 0);
    meanDuration = sum / durations.length;

    const mid = Math.floor(durations.length / 2);
    medianDuration =
      durations.length % 2 === 0 ? (durations[mid - 1]! + durations[mid]!) / 2 : durations[mid]!;

    const variance = durations.reduce((acc, v) => acc + (v - meanDuration) ** 2, 0) / durations.length;
    stdDuration = Math.sqrt(variance);
  }

  // Distribuição de frequência das durações
  const freqMap = new Map<number, number>();
  for (const d of durations) {
    freqMap.set(d, (freqMap.get(d) ?? 0) + 1);
  }

  const durationDistribution: CycleDistributionItem[] = Array.from(freqMap.entries())
    .map(([duration, frequency]) => ({
      duration,
      frequency,
      relativeFrequency: durations.length > 0 ? frequency / durations.length : 0,
    }))
    .sort((a, b) => a.duration - b.duration);

  return {
    completedCyclesCount: completedCycles.length,
    completedCycles,
    currentCycle,
    metrics: {
      meanDuration,
      medianDuration,
      minDuration,
      maxDuration,
      stdDuration,
    },
    durationDistribution,
  };
}
