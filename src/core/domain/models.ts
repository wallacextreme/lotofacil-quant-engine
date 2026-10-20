/**
 * Modelos de domínio: valores padrão documentados e utilitários de combinação canônica.
 */
import { DEFAULT_SEED, PICK_SIZE, UNIVERSE_SIZE } from './constants';
import type { AnalysisParams, Combination, GeneratorConfig, HardConstraints, ScoreWeights } from './types';

export const DEFAULT_ANALYSIS_PARAMS: Readonly<AnalysisParams> = Object.freeze({
  windowSize: 30,
  hotThreshold: 1.0,
  coldThreshold: -1.0,
  delayAttentionSigma: 1.0,
  delayAlertSigma: 1.5,
  topK: 20,
});

/** Restrições duras padrão (§19). Q/N/F e filtros de entropia desativados por padrão. */
export const DEFAULT_CONSTRAINTS: Readonly<HardConstraints> = Object.freeze({
  sum: { min: 170, max: 220 },
  even: { min: 7, max: 8 },
  prime: { min: 5, max: 6 },
  frame: { min: 9, max: 11 },
  core: { min: 4, max: 6 },
  fibonacci: { min: 3, max: 5 },
  repeat: { min: 8, max: 10 },
  hot: null,
  neutral: null,
  cold: null,
  allowEmptyRow: true,
  allowFullRow: true,
  allowEmptyCol: true,
  allowFullCol: true,
  fixedIncluded: [],
  excluded: [],
  lineMode: 'BALANCED',
  maxAbsentPerGame: 2,
  enforceFull25Coverage: false,
});

/** Pesos iniciais (§20). São apenas pontos de partida, sem significado preditivo. */
export const DEFAULT_WEIGHTS: Readonly<ScoreWeights> = Object.freeze({
  frequency: 1.0,
  zScore: 1.0,
  delay: 1.0,
  markov: 0.5,
  cooccurrence: 1.0,
  entropy: 1.0,
  dispersion: 1.5,
  coverage: 2.0,
  diversity: 2.0,
  cycle: 1.0,
  lineBalance: 1.0,
  pairRelationship: 1.0,
  casadas: 1.5,
  brigadas: 1.0,
  exposureBalance: 1.5,
});

export const DEFAULT_GENERATOR_CONFIG: Readonly<GeneratorConfig> = Object.freeze({
  count: 10,
  constraints: DEFAULT_CONSTRAINTS,
  minHamming: 10,
  weights: DEFAULT_WEIGHTS,
  seed: DEFAULT_SEED,
  poolSize: 4000,
  restarts: 8,
  portfolioStrategy: 'HYBRID',
});

export function cloneConstraints(c: HardConstraints): HardConstraints {
  return JSON.parse(JSON.stringify(c)) as HardConstraints;
}

export function cloneGeneratorConfig(c: GeneratorConfig): GeneratorConfig {
  return JSON.parse(JSON.stringify(c)) as GeneratorConfig;
}

/** Verifica as garantias da representação canônica (§6). Retorna lista de problemas. */
export function combinationProblems(nums: readonly unknown[]): string[] {
  const problems: string[] = [];
  if (nums.length !== PICK_SIZE) problems.push(`esperadas ${PICK_SIZE} dezenas, recebidas ${nums.length}`);
  const seen = new Set<number>();
  let prev = 0;
  for (const v of nums) {
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      problems.push(`valor não inteiro: ${String(v)}`);
      continue;
    }
    if (v < 1 || v > UNIVERSE_SIZE) problems.push(`fora do intervalo 1..${UNIVERSE_SIZE}: ${v}`);
    if (seen.has(v)) problems.push(`duplicada: ${v}`);
    seen.add(v);
    if (v <= prev) problems.push(`ordem não crescente em ${v}`);
    prev = v;
  }
  return problems;
}

export function isCanonicalCombination(nums: readonly unknown[]): nums is Combination {
  return combinationProblems(nums).length === 0;
}

export function formatCombination(nums: readonly number[]): string {
  return nums.map((n) => String(n).padStart(2, '0')).join(' ');
}
