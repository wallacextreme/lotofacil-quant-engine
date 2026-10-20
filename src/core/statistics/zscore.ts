/**
 * Cálculo de Z-Score Global e Local para as 25 dezenas da Lotofácil.
 *
 * Fórmula:
 *   p_obs = contagem / T
 *   p_teorico = 15 / 25 = 0,60
 *   SE = sqrt(0,60 * 0,40 / T)
 *   Z = (p_obs - p_teorico) / SE
 *
 * Classificação configurável (padrão §11):
 *   QUENTE:  Z > hotThreshold (+1.0)
 *   NEUTRA:  coldThreshold <= Z <= hotThreshold
 *   FRIA:    Z < coldThreshold (-1.0)
 */
import { PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';
import type { Contest, Temperature } from '../domain/types';

export interface NumberZScore {
  number: number;
  /** Frequência absoluta global. */
  globalFrequency: number;
  /** Frequência relativa global (0..1). */
  globalRelative: number;
  /** Z-score global. */
  globalZ: number;
  /** Frequência absoluta na janela local dos últimos W concursos. */
  localFrequency: number;
  /** Frequência relativa na janela local. */
  localRelative: number;
  /** Z-score local. */
  localZ: number;
  /** Classificação térmica baseada no Z local e limiares fornecidos. */
  temperature: Temperature;
}

export interface ZScoreAnalysis {
  windowSize: number;
  hotThreshold: number;
  coldThreshold: number;
  totalContests: number;
  scores: NumberZScore[];
  /** Contagem de dezenas por categoria térmica (baseada no Z local). */
  counts: {
    hot: number;
    neutral: number;
    cold: number;
  };
  /** Lista das dezenas quentes (1..25). */
  hotNumbers: number[];
  /** Lista das dezenas neutras (1..25). */
  neutralNumbers: number[];
  /** Lista das dezenas frias (1..25). */
  coldNumbers: number[];
}

export function classifyTemperature(z: number, hotThreshold: number, coldThreshold: number): Temperature {
  if (z > hotThreshold) return 'HOT';
  if (z < coldThreshold) return 'COLD';
  return 'NEUTRAL';
}

export function computeZScores(
  contests: readonly Contest[],
  windowSize = 30,
  hotThreshold = 1.0,
  coldThreshold = -1.0,
): ZScoreAnalysis {
  const T = contests.length;
  const p0 = PICK_SIZE / UNIVERSE_SIZE; // 0.60
  const varP = p0 * (1 - p0); // 0.24

  const seGlobal = T > 0 ? Math.sqrt(varP / T) : 0;
  const effectiveWindow = Math.min(windowSize, T);
  const seLocal = effectiveWindow > 0 ? Math.sqrt(varP / effectiveWindow) : 0;

  const globalFreq = new Array<number>(UNIVERSE_SIZE).fill(0);
  for (const c of contests) {
    for (const num of c.numbers) {
      if (num >= 1 && num <= UNIVERSE_SIZE) {
        globalFreq[num - 1]!++;
      }
    }
  }

  const localFreq = new Array<number>(UNIVERSE_SIZE).fill(0);
  const localContests = effectiveWindow > 0 ? contests.slice(T - effectiveWindow) : [];
  for (const c of localContests) {
    for (const num of c.numbers) {
      if (num >= 1 && num <= UNIVERSE_SIZE) {
        localFreq[num - 1]!++;
      }
    }
  }

  const scores: NumberZScore[] = [];
  const hotNumbers: number[] = [];
  const neutralNumbers: number[] = [];
  const coldNumbers: number[] = [];

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const num = i + 1;
    const gCount = globalFreq[i]!;
    const gRel = T > 0 ? gCount / T : 0;
    const gZ = seGlobal > 0 ? (gRel - p0) / seGlobal : 0;

    const lCount = localFreq[i]!;
    const lRel = effectiveWindow > 0 ? lCount / effectiveWindow : 0;
    const lZ = seLocal > 0 ? (lRel - p0) / seLocal : 0;

    const temp = classifyTemperature(lZ, hotThreshold, coldThreshold);

    if (temp === 'HOT') hotNumbers.push(num);
    else if (temp === 'COLD') coldNumbers.push(num);
    else neutralNumbers.push(num);

    scores.push({
      number: num,
      globalFrequency: gCount,
      globalRelative: gRel,
      globalZ: gZ,
      localFrequency: lCount,
      localRelative: lRel,
      localZ: lZ,
      temperature: temp,
    });
  }

  return {
    windowSize: effectiveWindow,
    hotThreshold,
    coldThreshold,
    totalContests: T,
    scores,
    counts: {
      hot: hotNumbers.length,
      neutral: neutralNumbers.length,
      cold: coldNumbers.length,
    },
    hotNumbers,
    neutralNumbers,
    coldNumbers,
  };
}
