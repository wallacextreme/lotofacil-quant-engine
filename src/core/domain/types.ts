/**
 * Tipos centrais do domínio. Sem dependências de DOM ou de armazenamento.
 */

/** Rótulo epistemológico obrigatório para qualquer saída exibida ao usuário. */
export type EpistemicKind = 'FATO' | 'ESTATISTICA' | 'HEURISTICA' | 'OTIMIZACAO' | 'ASSUNCAO';

/** Combinação canônica: 15 dezenas distintas em 1..25, ordem crescente. */
export type Combination = readonly number[];

export interface Contest {
  contest: number;
  /** Data ISO `AAAA-MM-DD` ou `null` quando ausente/inválida (registrado no ValidationReport). */
  date: string | null;
  /** Dezenas ordenadas crescentemente. */
  numbers: number[];
}

export interface ValidationIssue {
  /** Linha no arquivo de origem (1-based, incluindo cabeçalho). */
  row: number;
  contest: number | null;
  message: string;
}

export interface ValidationReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  emptyRowsSkipped: number;
  duplicates: ValidationIssue[];
  invalidNumbers: ValidationIssue[];
  missingValues: ValidationIssue[];
  orderingIssues: ValidationIssue[];
  dateIssues: ValidationIssue[];
  contestIssues: ValidationIssue[];
  warnings: string[];
  errors: string[];
  detectedColumns: { contest: string | null; date: string | null; balls: string[] };
}

export interface ParsedDataset {
  contests: Contest[];
  report: ValidationReport;
  /** SHA-256 da forma canônica dos concursos válidos. */
  hash: string;
}

export interface Range {
  min: number;
  max: number;
}

export type Temperature = 'HOT' | 'NEUTRAL' | 'COLD';

export interface AnalysisParams {
  /** Janela local (concursos mais recentes) para Z-score local. */
  windowSize: number;
  /** Z > hotThreshold ⇒ QUENTE. */
  hotThreshold: number;
  /** Z < coldThreshold ⇒ FRIA. */
  coldThreshold: number;
  /** currentDelay > média + k·σ ⇒ ATENÇÃO. */
  delayAttentionSigma: number;
  /** currentDelay > média + k·σ ⇒ ACIMA DE kσ. */
  delayAlertSigma: number;
  /** Quantidade de itens em rankings (pares, trincas, transições). */
  topK: number;
}

export interface HardConstraints {
  sum: Range | null;
  even: Range | null;
  prime: Range | null;
  frame: Range | null;
  core: Range | null;
  fibonacci: Range | null;
  repeat: Range | null;
  hot: Range | null;
  neutral: Range | null;
  cold: Range | null;
  allowEmptyRow: boolean;
  allowFullRow: boolean;
  allowEmptyCol: boolean;
  allowFullCol: boolean;
  /** Dezenas obrigatórias (podem ser vazias). */
  fixedIncluded: number[];
  /** Dezenas proibidas (podem ser vazias). */
  excluded: number[];
  /** Modo de restrição de linhas (§3). */
  lineMode?: 'FREE' | 'BALANCED' | 'STATISTICAL' | 'HYBRID';
  /** Limite máximo de dezenas ausentes/atrasadas por jogo (§10). */
  maxAbsentPerGame?: number;
  /** Cobertura obrigatória das 25 dezenas no portfólio (§11). */
  enforceFull25Coverage?: boolean;
}

export interface ScoreWeights {
  frequency: number;
  zScore: number;
  delay: number;
  markov: number;
  cooccurrence: number;
  entropy: number;
  dispersion: number;
  coverage: number;
  diversity: number;
  // Novos pesos do Módulo Avançado (§13)
  cycle?: number;
  lineBalance?: number;
  pairRelationship?: number;
  casadas?: number;
  brigadas?: number;
  exposureBalance?: number;
}

export type PortfolioStrategy =
  | 'STATISTICAL'
  | 'CYCLE'
  | 'LINES'
  | 'RELATIONSHIPS'
  | 'DIVERSIFICATION'
  | 'HYBRID'
  | '5_3_2';

export interface GeneratorConfig {
  count: number;
  constraints: HardConstraints;
  /** Distância de Hamming mínima entre quaisquer dois jogos (restrição dura do portfólio). */
  minHamming: number;
  weights: ScoreWeights;
  seed: number;
  /** Tamanho do pool de elite usado pelo otimizador. */
  poolSize: number;
  /** Reinícios GRASP. */
  restarts: number;
  /** Estratégia de Composição da Carteira (§12 e §14). */
  portfolioStrategy?: PortfolioStrategy;
}

/** Contexto estatístico necessário para filtrar/pontuar (derivado da análise). */
export interface GenerationContext {
  /** Último concurso (referência para repetição). */
  lastDraw: number[];
  /** Classificação Q/N/F por dezena (índice 0 → dezena 1). */
  temperature: Temperature[];
  /** Dezenas ausentes no ciclo atual (§1). */
  missingInCycle?: number[];
  /** Dezenas atrasadas estatisticamente (§9). */
  delayedNumbers?: number[];
  /** Pares casados com evidência estatística (§6). */
  casadasPairs?: [number, number][];
  /** Pares brigados com evidência estatística (§7). */
  brigadasPairs?: [number, number][];
}

export interface ScoreBreakdown {
  frequency: number;
  zScore: number;
  delay: number;
  markov: number;
  cooccurrence: number;
  entropy: number;
  dispersion: number;
  cycle?: number;
  lineBalance?: number;
  pairRelationship?: number;
  casadas?: number;
  brigadas?: number;
  exposureBalance?: number;
}

export interface GameExplanation {
  whySelected: string;
  lineDistribution: string;
  cycleNumbersCount: number;
  delayedNumbersCount: number;
  casadasPresent: string[];
  brigadasPresent: string[];
  scoreContributions: Record<string, number>;
}

export interface GameAudit {
  id: number;
  numbers: number[];
  sum: number;
  evenCount: number;
  oddCount: number;
  primeCount: number;
  frameCount: number;
  coreCount: number;
  fibonacciCount: number;
  repeatedCount: number;
  hotCount: number;
  neutralCount: number;
  coldCount: number;
  emptyRows: number;
  fullRows: number;
  emptyCols: number;
  fullCols: number;
  rowEntropy: number;
  colEntropy: number;
  linePattern?: string; // ex: "3-3-3-3-3"
  score: number;
  scoreBreakdown: ScoreBreakdown | null;
  minHamming: number | null;
  status: 'VALID' | 'INVALID';
  violations: string[];
  explanation?: GameExplanation;
}

/** Metadados de reprodutibilidade científica (§46). */
export interface ReproMeta {
  datasetHash: string;
  datasetSize: number;
  contestStart: number;
  contestEnd: number;
  lastContest: number;
  timestamp: string;
  engineVersion: string;
  schemaVersion: number;
  windowSize: number;
  hotThreshold: number;
  coldThreshold: number;
  weights: ScoreWeights | null;
  seed: number | null;
}
