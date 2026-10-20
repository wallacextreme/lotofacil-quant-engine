/**
 * Cálculo de características estruturais de uma combinação a partir do array de dezenas.
 *
 * IMPORTANTE (dupla validação, §45): este módulo é usado pelo Validator e pela
 * estatística descritiva. Ele NÃO reutiliza a lógica incremental/bitmask do gerador —
 * usa conjuntos e contagem direta, formando uma segunda implementação independente.
 */
import { CORE, EVENS, FIBONACCI, FRAME, GRID_SIZE, PRIMES, colOf, rowOf } from './constants';
import type { Temperature } from './types';

const PRIME_SET = new Set(PRIMES);
const FIB_SET = new Set(FIBONACCI);
const FRAME_SET = new Set(FRAME);
const CORE_SET = new Set(CORE);
const EVEN_SET = new Set(EVENS);

export interface CombinationFeatures {
  sum: number;
  evenCount: number;
  oddCount: number;
  primeCount: number;
  frameCount: number;
  coreCount: number;
  fibonacciCount: number;
  repeatedCount: number | null;
  hotCount: number | null;
  neutralCount: number | null;
  coldCount: number | null;
  rowCounts: number[];
  colCounts: number[];
  emptyRows: number;
  fullRows: number;
  emptyCols: number;
  fullCols: number;
  rowEntropy: number;
  colEntropy: number;
  range: number;
}

/** Entropia de Shannon (bits) da distribuição de contagens c_i / Σc. */
export function shannonEntropy(counts: readonly number[]): number {
  let total = 0;
  for (const c of counts) total += c;
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / total;
      h -= p * Math.log2(p);
    }
  }
  return h;
}

export function computeFeatures(
  numbers: readonly number[],
  lastDraw?: readonly number[] | null,
  temperature?: readonly Temperature[] | null,
): CombinationFeatures {
  let sum = 0;
  let evenCount = 0;
  let primeCount = 0;
  let frameCount = 0;
  let coreCount = 0;
  let fibonacciCount = 0;
  const rowCounts = new Array<number>(GRID_SIZE).fill(0);
  const colCounts = new Array<number>(GRID_SIZE).fill(0);
  for (const n of numbers) {
    sum += n;
    if (EVEN_SET.has(n)) evenCount++;
    if (PRIME_SET.has(n)) primeCount++;
    if (FRAME_SET.has(n)) frameCount++;
    if (CORE_SET.has(n)) coreCount++;
    if (FIB_SET.has(n)) fibonacciCount++;
    rowCounts[rowOf(n)]!++;
    colCounts[colOf(n)]!++;
  }
  let repeatedCount: number | null = null;
  if (lastDraw) {
    const last = new Set(lastDraw);
    repeatedCount = numbers.filter((n) => last.has(n)).length;
  }
  let hotCount: number | null = null;
  let neutralCount: number | null = null;
  let coldCount: number | null = null;
  if (temperature) {
    hotCount = numbers.filter((n) => temperature[n - 1] === 'HOT').length;
    neutralCount = numbers.filter((n) => temperature[n - 1] === 'NEUTRAL').length;
    coldCount = numbers.filter((n) => temperature[n - 1] === 'COLD').length;
  }
  return {
    sum,
    evenCount,
    oddCount: numbers.length - evenCount,
    primeCount,
    frameCount,
    coreCount,
    fibonacciCount,
    repeatedCount,
    hotCount,
    neutralCount,
    coldCount,
    rowCounts,
    colCounts,
    emptyRows: rowCounts.filter((c) => c === 0).length,
    fullRows: rowCounts.filter((c) => c === GRID_SIZE).length,
    emptyCols: colCounts.filter((c) => c === 0).length,
    fullCols: colCounts.filter((c) => c === GRID_SIZE).length,
    rowEntropy: shannonEntropy(rowCounts),
    colEntropy: shannonEntropy(colCounts),
    range: numbers.length ? Math.max(...numbers) - Math.min(...numbers) : 0,
  };
}
