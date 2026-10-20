/**
 * Filtros de Restrições Duras e Verificação de Viabilidade.
 *
 * Princípio Fundamental (§12, §19):
 * - Nenhuma Hard Constraint pode ser violada pelo scoring.
 * - Antes de qualquer tentativa de busca, o sistema calcula a viabilidade matemática
 *   estrita dos parâmetros (ex.: cotas Q/N/F vs disponibilidade real).
 * - Se inviável, retorna diagnóstico explícito sem produzir combinações inválidas.
 */
import {
  CORE,
  FIBONACCI,
  FRAME,
  GRID_SIZE,
  PICK_SIZE,
  PRIMES,
  ROW_MASKS,
  COL_MASKS,
  UNIVERSE_SIZE,
} from '../domain/constants';
import type { GenerationContext, HardConstraints, Range } from '../domain/types';
import { popcount32 } from '../util/bits';

export interface FeasibilityIssue {
  parameter: string;
  requested: string;
  available: string;
  explanation: string;
}

export interface FeasibilityDiagnosis {
  isFeasible: boolean;
  issues: FeasibilityIssue[];
  temperaturesAvailable: {
    hot: number;
    neutral: number;
    cold: number;
  };
}

/**
 * Validação prévia de viabilidade matemática das restrições duras.
 * Detecta contradições lógicas e cotas impossíveis (§12 e §40).
 */
export function checkFeasibility(
  constraints: HardConstraints,
  context?: GenerationContext | null,
): FeasibilityDiagnosis {
  const issues: FeasibilityIssue[] = [];

  const checkRangeContradiction = (name: string, r: Range | null, minBound: number, maxBound: number) => {
    if (!r) return;
    if (r.min > r.max) {
      issues.push({
        parameter: name,
        requested: `min=${r.min} > max=${r.max}`,
        available: `intervalo [${minBound}, ${maxBound}]`,
        explanation: `O valor mínimo solicitado (${r.min}) é estritamente maior que o máximo (${r.max}).`,
      });
    }
    if (r.max < minBound) {
      issues.push({
        parameter: name,
        requested: `max=${r.max}`,
        available: `mínimo possível teórico = ${minBound}`,
        explanation: `O valor máximo solicitado é menor que o menor valor matematicamente possível.`,
      });
    }
    if (r.min > maxBound) {
      issues.push({
        parameter: name,
        requested: `min=${r.min}`,
        available: `máximo possível teórico = ${maxBound}`,
        explanation: `O valor mínimo solicitado é maior que o maior valor matematicamente possível.`,
      });
    }
  };

  // Soma mínima de 15 números em 1..25: sum(1..15) = 120
  // Soma máxima de 15 números em 1..25: sum(11..25) = 270
  checkRangeContradiction('Soma', constraints.sum, 120, 270);
  checkRangeContradiction('Pares', constraints.even, 2, 12); // min 2 (quando 13 ímpares usados: 15-13=2), max 12 (todos os 12 pares)
  checkRangeContradiction('Primos', constraints.prime, 0, PRIMES.length); // 9 primos
  checkRangeContradiction('Moldura', constraints.frame, 6, FRAME.length); // 16 na moldura; miolo tem 9, logo moldura >= 15-9 = 6
  checkRangeContradiction('Miolo', constraints.core, 0, CORE.length); // 9 no miolo
  checkRangeContradiction('Fibonacci', constraints.fibonacci, 0, FIBONACCI.length); // 7 fibonacci
  checkRangeContradiction('Repetição', constraints.repeat, 5, 15); // min repetição: 15 sorteadas de 25 deixa 10 fora; novo jogo de 15 deve conter pelo menos 15-10=5 repetidas!

  // Dezenas fixadas e excluídas
  const fixed = new Set(constraints.fixedIncluded);
  const excl = new Set(constraints.excluded);
  const intersect = [...fixed].filter((x) => excl.has(x));
  if (intersect.length > 0) {
    issues.push({
      parameter: 'Dezenas Fixas e Excluídas',
      requested: `Conflito nas dezenas: ${intersect.join(', ')}`,
      available: 'Conjuntos disjuntos',
      explanation: 'A mesma dezena não pode ser simultaneamente obrigatória e excluída.',
    });
  }

  if (constraints.fixedIncluded.length > PICK_SIZE) {
    issues.push({
      parameter: 'Dezenas Fixas',
      requested: `${constraints.fixedIncluded.length} fixas`,
      available: `máximo de ${PICK_SIZE} dezenas por jogo`,
      explanation: `Não é possível fixar mais que ${PICK_SIZE} dezenas em uma aposta da Lotofácil.`,
    });
  }

  if (UNIVERSE_SIZE - constraints.excluded.length < PICK_SIZE) {
    issues.push({
      parameter: 'Dezenas Excluídas',
      requested: `${constraints.excluded.length} excluídas`,
      available: `máximo de ${UNIVERSE_SIZE - PICK_SIZE} excluídas`,
      explanation: `Excluir mais de ${UNIVERSE_SIZE - PICK_SIZE} dezenas deixa menos de ${PICK_SIZE} dezenas disponíveis no universo.`,
    });
  }

  // Verificação de cotas térmicas Q/N/F (§12)
  let hotAvail = 0;
  let neutralAvail = 0;
  let coldAvail = 0;

  if (context && context.temperature && context.temperature.length === UNIVERSE_SIZE) {
    for (let i = 0; i < UNIVERSE_SIZE; i++) {
      const t = context.temperature[i]!;
      if (t === 'HOT') hotAvail++;
      else if (t === 'COLD') coldAvail++;
      else neutralAvail++;
    }

    const checkThermal = (name: string, r: Range | null, avail: number) => {
      if (!r) return;
      if (r.min > avail) {
        issues.push({
          parameter: `Cota Térmica (${name})`,
          requested: `Mínimo de ${r.min}`,
          available: `Apenas ${avail} disponíveis`,
          explanation: `Categoria ${name} disponível: ${avail}, solicitada: ${r.min}. Nenhuma solução pode satisfazer essa restrição.`,
        });
      }
    };

    checkThermal('Quente', constraints.hot, hotAvail);
    checkThermal('Neutra', constraints.neutral, neutralAvail);
    checkThermal('Fria', constraints.cold, coldAvail);

    // Soma das cotas mínimas não pode exceder 15
    const minH = constraints.hot ? constraints.hot.min : 0;
    const minN = constraints.neutral ? constraints.neutral.min : 0;
    const minC = constraints.cold ? constraints.cold.min : 0;
    if (minH + minN + minC > PICK_SIZE) {
      issues.push({
        parameter: 'Soma das Cotas Térmicas Mínimas',
        requested: `Mín Quente (${minH}) + Mín Neutra (${minN}) + Mín Fria (${minC}) = ${minH + minN + minC}`,
        available: `Exatamente ${PICK_SIZE} dezenas`,
        explanation: `A soma dos mínimos térmicos exigidos excede as ${PICK_SIZE} dezenas de um jogo.`,
      });
    }

    // Soma das cotas máximas não pode ser menor que 15 se todas estiverem ativas
    if (constraints.hot && constraints.neutral && constraints.cold) {
      if (constraints.hot.max + constraints.neutral.max + constraints.cold.max < PICK_SIZE) {
        issues.push({
          parameter: 'Soma das Cotas Térmicas Máximas',
          requested: `Máx Quente (${constraints.hot.max}) + Máx Neutra (${constraints.neutral.max}) + Máx Fria (${constraints.cold.max}) = ${constraints.hot.max + constraints.neutral.max + constraints.cold.max}`,
          available: `Exatamente ${PICK_SIZE} dezenas`,
          explanation: `A soma dos máximos térmicos permitidos é inferior a ${PICK_SIZE}.`,
        });
      }
    }
  }

  return {
    isFeasible: issues.length === 0,
    issues,
    temperaturesAvailable: {
      hot: hotAvail,
      neutral: neutralAvail,
      cold: coldAvail,
    },
  };
}

/** Estrutura de filtro pré-compilada em máscaras de bits para execução ultra-rápida. */
export interface CompiledFilters {
  minSum: number;
  maxSum: number;
  minEven: number;
  maxEven: number;
  minPrime: number;
  maxPrime: number;
  minFrame: number;
  maxFrame: number;
  minCore: number;
  maxCore: number;
  minFib: number;
  maxFib: number;
  minRepeat: number;
  maxRepeat: number;
  lastDrawMask: number;
  minHot: number;
  maxHot: number;
  hotMask: number;
  minNeutral: number;
  maxNeutral: number;
  neutralMask: number;
  minCold: number;
  maxCold: number;
  coldMask: number;
  allowEmptyRow: boolean;
  allowFullRow: boolean;
  allowEmptyCol: boolean;
  allowFullCol: boolean;
  requiredMask: number;
  forbiddenMask: number;
  lineMode?: 'FREE' | 'BALANCED' | 'STATISTICAL' | 'HYBRID';
  maxAbsentPerGame?: number;
  absentMask: number;
}

export function compileFilters(
  constraints: HardConstraints,
  context?: GenerationContext | null,
): CompiledFilters {
  let hotMask = 0;
  let neutralMask = 0;
  let coldMask = 0;

  if (context && context.temperature) {
    for (let i = 0; i < UNIVERSE_SIZE; i++) {
      const t = context.temperature[i];
      if (t === 'HOT') hotMask |= 1 << i;
      else if (t === 'COLD') coldMask |= 1 << i;
      else neutralMask |= 1 << i;
    }
  }

  let lastDrawMask = 0;
  if (context && context.lastDraw) {
    for (const n of context.lastDraw) {
      if (n >= 1 && n <= UNIVERSE_SIZE) {
        lastDrawMask |= 1 << (n - 1);
      }
    }
  }

  let absentMask = 0;
  if (context && context.missingInCycle) {
    for (const n of context.missingInCycle) {
      if (n >= 1 && n <= UNIVERSE_SIZE) absentMask |= 1 << (n - 1);
    }
  } else if (context && context.delayedNumbers) {
    for (const n of context.delayedNumbers) {
      if (n >= 1 && n <= UNIVERSE_SIZE) absentMask |= 1 << (n - 1);
    }
  }

  let requiredMask = 0;
  for (const n of constraints.fixedIncluded) requiredMask |= 1 << (n - 1);

  let forbiddenMask = 0;
  for (const n of constraints.excluded) forbiddenMask |= 1 << (n - 1);

  return {
    minSum: constraints.sum ? constraints.sum.min : 0,
    maxSum: constraints.sum ? constraints.sum.max : 9999,
    minEven: constraints.even ? constraints.even.min : 0,
    maxEven: constraints.even ? constraints.even.max : PICK_SIZE,
    minPrime: constraints.prime ? constraints.prime.min : 0,
    maxPrime: constraints.prime ? constraints.prime.max : PICK_SIZE,
    minFrame: constraints.frame ? constraints.frame.min : 0,
    maxFrame: constraints.frame ? constraints.frame.max : PICK_SIZE,
    minCore: constraints.core ? constraints.core.min : 0,
    maxCore: constraints.core ? constraints.core.max : PICK_SIZE,
    minFib: constraints.fibonacci ? constraints.fibonacci.min : 0,
    maxFib: constraints.fibonacci ? constraints.fibonacci.max : PICK_SIZE,
    minRepeat: constraints.repeat && lastDrawMask !== 0 ? constraints.repeat.min : 0,
    maxRepeat: constraints.repeat && lastDrawMask !== 0 ? constraints.repeat.max : PICK_SIZE,
    lastDrawMask,
    minHot: constraints.hot ? constraints.hot.min : 0,
    maxHot: constraints.hot ? constraints.hot.max : PICK_SIZE,
    hotMask,
    minNeutral: constraints.neutral ? constraints.neutral.min : 0,
    maxNeutral: constraints.neutral ? constraints.neutral.max : PICK_SIZE,
    neutralMask,
    minCold: constraints.cold ? constraints.cold.min : 0,
    maxCold: constraints.cold ? constraints.cold.max : PICK_SIZE,
    coldMask,
    allowEmptyRow: constraints.allowEmptyRow,
    allowFullRow: constraints.allowFullRow,
    allowEmptyCol: constraints.allowEmptyCol,
    allowFullCol: constraints.allowFullCol,
    requiredMask,
    forbiddenMask,
    lineMode: constraints.lineMode,
    maxAbsentPerGame: constraints.maxAbsentPerGame,
    absentMask,
  };
}

/** Testa uma máscara de 15 bits completos contra os filtros compilados. */
export function testMaskAgainstFilters(mask: number, sum: number, f: CompiledFilters): boolean {
  // Fixas e proibidas
  if ((mask & f.requiredMask) !== f.requiredMask) return false;
  if ((mask & f.forbiddenMask) !== 0) return false;

  // Soma
  if (sum < f.minSum || sum > f.maxSum) return false;

  // Paridade
  const evenCount = popcount32(mask & 0xaaaaaa); // evens bitmask: 2,4,6,8,10,12,14,16,18,20,22,24
  if (evenCount < f.minEven || evenCount > f.maxEven) return false;

  // Primos: 2, 3, 5, 7, 11, 13, 17, 19, 23 => bits 1, 2, 4, 6, 10, 12, 16, 18, 22
  const primeCount = popcount32(mask & 0x451456);
  if (primeCount < f.minPrime || primeCount > f.maxPrime) return false;

  // Moldura: 16 dezenas
  // 1..5 (bits 0..4 = 0x1f), 6,10 (bits 5,9 = 0x220), 11,15 (bits 10,14 = 0x4400),
  // 16,20 (bits 15,19 = 0x88000), 21..25 (bits 20..24 = 0x1f00000)
  // maskFrame = 0x1f8c63f
  const frameCount = popcount32(mask & 0x1f8c63f);
  if (frameCount < f.minFrame || frameCount > f.maxFrame) return false;

  // Miolo: 9 dezenas (complementar da moldura)
  const coreCount = PICK_SIZE - frameCount;
  if (coreCount < f.minCore || coreCount > f.maxCore) return false;

  // Fibonacci: 1, 2, 3, 5, 8, 13, 21 => bits 0, 1, 2, 4, 7, 12, 20 => mask = 0x101097
  const fibCount = popcount32(mask & 0x101097);
  if (fibCount < f.minFib || fibCount > f.maxFib) return false;

  // Repetição
  if (f.lastDrawMask !== 0) {
    const repeatCount = popcount32(mask & f.lastDrawMask);
    if (repeatCount < f.minRepeat || repeatCount > f.maxRepeat) return false;
  }

  // Térmicas (se ativas)
  if (f.hotMask !== 0) {
    const hotCount = popcount32(mask & f.hotMask);
    if (hotCount < f.minHot || hotCount > f.maxHot) return false;
  }
  if (f.neutralMask !== 0) {
    const neutralCount = popcount32(mask & f.neutralMask);
    if (neutralCount < f.minNeutral || neutralCount > f.maxNeutral) return false;
  }
  if (f.coldMask !== 0) {
    const coldCount = popcount32(mask & f.coldMask);
    if (coldCount < f.minCold || coldCount > f.maxCold) return false;
  }

  // Entropia espacial: linhas e colunas vazias ou completas
  if (!f.allowEmptyRow || !f.allowFullRow) {
    for (let r = 0; r < GRID_SIZE; r++) {
      const c = popcount32(mask & ROW_MASKS[r]!);
      if (!f.allowEmptyRow && c === 0) return false;
      if (!f.allowFullRow && c === GRID_SIZE) return false;
    }
  }

  if (!f.allowEmptyCol || !f.allowFullCol) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cnt = popcount32(mask & COL_MASKS[c]!);
      if (!f.allowEmptyCol && cnt === 0) return false;
      if (!f.allowFullCol && cnt === GRID_SIZE) return false;
    }
  }

  // Restrição de Linhas Balanceadas (§3): cada linha deve conter entre 2 e 4 dezenas
  if (f.lineMode === 'BALANCED') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const cnt = popcount32(mask & ROW_MASKS[r]!);
      if (cnt < 2 || cnt > 4) return false;
    }
  }

  // Limite de dezenas ausentes/atrasadas por jogo (§10)
  if (f.absentMask !== 0 && f.maxAbsentPerGame !== undefined) {
    const absentCount = popcount32(mask & f.absentMask);
    if (absentCount > f.maxAbsentPerGame) return false;
  }

  return true;
}
