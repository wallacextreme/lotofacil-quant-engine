/**
 * Gerenciador de Estado Reativo da Aplicação.
 *
 * Conecta a UI aos Repositórios, Serviços e ao Web Worker de forma desacoplada.
 */
import type { Contest, GeneratorConfig } from '../core/domain/types';
import { DEFAULT_GENERATOR_CONFIG } from '../core/domain/models';
import type { DatasetAnalysis } from '../services/analysisService';
import type { GenerationOutcome } from '../services/generationService';
import { type DatasetRecord, datasetRepository } from '../storage/repositories/datasetRepository';
import { analysisRepository } from '../storage/repositories/analysisRepository';
import { configRepository } from '../storage/repositories/configRepository';
import { gamesRepository } from '../storage/repositories/gamesRepository';
import { parseHistoryFile } from '../core/data/parser';
import type { WorkerInMessage, WorkerOutMessage } from '../workers/analytics.worker';
import {
  runWalkForwardBacktest,
  type WalkForwardResult,
  type BacktestMode,
} from '../core/backtest/walkForward';

export type AppRoute =
  | 'dashboard'
  | 'historico'
  | 'estatistica'
  | 'ciclos'
  | 'markov'
  | 'coocorrencia'
  | 'entropia'
  | 'gerador'
  | 'jogos'
  | 'relatorios'
  | 'configuracoes';

export interface AppState {
  currentRoute: AppRoute;
  currentDataset: DatasetRecord | null;
  currentContests: Contest[];
  currentAnalysis: DatasetAnalysis | null;
  currentConfig: GeneratorConfig;
  currentOutcome: GenerationOutcome | null;
  currentBacktestResult: WalkForwardResult | null;
  selectedNumberForDetail: number | null;
  isProcessing: boolean;
  progressStage: string;
  progressPercent: number;
}

type StateListener = (state: AppState) => void;

class StateManager {
  private state: AppState = {
    currentRoute: 'dashboard',
    currentDataset: null,
    currentContests: [],
    currentAnalysis: null,
    currentConfig: DEFAULT_GENERATOR_CONFIG,
    currentOutcome: null,
    currentBacktestResult: null,
    selectedNumberForDetail: null,
    isProcessing: false,
    progressStage: '',
    progressPercent: 0,
  };

  private listeners: Set<StateListener> = new Set();
  private worker: Worker | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new Worker(new URL('../workers/analytics.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        const msg = event.data;
        if (msg.type === 'PROGRESS') {
          this.state.progressStage = msg.stage;
          this.state.progressPercent = msg.percent;
          this.notify();
        } else if (msg.type === 'ANALYSIS_COMPLETE') {
          this.state.currentAnalysis = msg.analysis;
          this.state.isProcessing = false;
          this.state.progressPercent = 100;
          this.notify();
        } else if (msg.type === 'GENERATION_COMPLETE') {
          this.state.currentOutcome = msg.outcome;
          this.state.isProcessing = false;
          this.state.progressPercent = 100;
          this.notify();
        } else if (msg.type === 'BACKTEST_COMPLETE') {
          this.state.currentBacktestResult = msg.result;
          this.state.isProcessing = false;
          this.state.progressPercent = 100;
          this.notify();
        } else if (msg.type === 'ERROR') {
          this.state.isProcessing = false;
          alert(`Erro no processamento: ${msg.message}`);
          this.notify();
        }
      };
    } catch {
      // Fallback para ambientes sem suporte a Web Workers module
      this.worker = null;
    }
  }

  public getState(): Readonly<AppState> {
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) l(this.state);
  }

  public navigateTo(route: AppRoute): void {
    this.state.currentRoute = route;
    this.notify();
  }

  public async initialize(): Promise<void> {
    // Carrega configuração ativa
    try {
      this.state.currentConfig = await configRepository.getActive();
    } catch {
      this.state.currentConfig = DEFAULT_GENERATOR_CONFIG;
    }

    // Carrega último dataset se houver
    try {
      const datasets = await datasetRepository.list();
      if (datasets.length > 0) {
        await this.selectDataset(datasets[0]!.hash);
      }
    } catch (e) {
      console.warn('Inicialização de datasets:', e);
    }
    this.notify();
  }

  public async selectDataset(hash: string): Promise<void> {
    const ds = await datasetRepository.get(hash);
    if (!ds) return;
    const contests = await datasetRepository.getContests(hash);

    this.state.currentDataset = ds;
    this.state.currentContests = contests;

    // Busca última análise salva
    const savedAnalysis = await analysisRepository.getLatestForDataset(hash);
    if (savedAnalysis) {
      this.state.currentAnalysis = savedAnalysis.data;
    } else {
      // Executa nova análise
      await this.runAnalysis();
    }

    // Busca últimos jogos salvos
    const savedGames = await gamesRepository.listForDataset(hash);
    if (savedGames.length > 0) {
      const latest = savedGames[0]!;
      this.state.currentOutcome = {
        success: true,
        feasibility: { isFeasible: true, issues: [], temperaturesAvailable: { hot: 0, neutral: 0, cold: 0 } },
        repro: latest.repro,
        config: latest.config,
        optimization: null,
        validation: null,
        coverage: latest.coverage,
        hamming: latest.hamming,
        auditedGames: latest.games,
      };
    }

    this.notify();
  }

  public async importFile(fileBytes: Uint8Array, fileName: string): Promise<void> {
    const outcome = parseHistoryFile(fileBytes, fileName);
    if (outcome.report.errors.length > 0 && outcome.contests.length === 0) {
      throw new Error(`Falha na validação do arquivo:\n${outcome.report.errors.join('\n')}`);
    }

    const firstContest = outcome.contests[0]?.contest ?? 0;
    const lastContest = outcome.contests[outcome.contests.length - 1]?.contest ?? 0;
    const startDate = outcome.contests[0]?.date ?? null;
    const endDate = outcome.contests[outcome.contests.length - 1]?.date ?? null;

    const record: DatasetRecord = {
      hash: outcome.hash,
      name: fileName,
      contestsCount: outcome.contests.length,
      firstContest,
      lastContest,
      startDate,
      endDate,
      importedAt: new Date().toISOString(),
      sourceFormat: outcome.format ?? 'unknown',
    };

    await datasetRepository.save(record, outcome.contests);
    await this.selectDataset(record.hash);
  }

  public async runAnalysis(): Promise<void> {
    if (this.state.currentContests.length === 0) return;

    this.state.isProcessing = true;
    this.state.progressStage = 'Iniciando análise científica...';
    this.state.progressPercent = 10;
    this.notify();

    if (this.worker) {
      const msg: WorkerInMessage = {
        type: 'ANALYZE_DATASET',
        contests: this.state.currentContests,
        params: {
          windowSize: 30,
          hotThreshold: 1.0,
          coldThreshold: -1.0,
          delayAttentionSigma: 1.0,
          delayAlertSigma: 1.5,
          topK: 20,
        },
      };
      this.worker.postMessage(msg);
    } else {
      // Execução direta se sem worker
      const { runDatasetAnalysis } = await import('../services/analysisService');
      const analysis = runDatasetAnalysis(this.state.currentContests);
      this.state.currentAnalysis = analysis;
      this.state.isProcessing = false;
      this.notify();
    }
  }

  public async generateGames(config: GeneratorConfig): Promise<void> {
    this.state.currentConfig = config;
    await configRepository.saveActive(config);

    this.state.isProcessing = true;
    this.state.progressStage = 'Preparando parâmetros e verificando viabilidade...';
    this.state.progressPercent = 5;
    this.notify();

    const dsHash = this.state.currentDataset?.hash ?? 'NO_DATASET';
    const dsSize = this.state.currentContests.length;
    const cStart = this.state.currentContests[0]?.contest ?? 0;
    const cEnd = this.state.currentContests[dsSize - 1]?.contest ?? 0;

    if (this.worker) {
      const msg: WorkerInMessage = {
        type: 'GENERATE_GAMES',
        config,
        analysis: this.state.currentAnalysis,
        datasetHash: dsHash,
        datasetSize: dsSize,
        contestStart: cStart,
        contestEnd: cEnd,
      };
      this.worker.postMessage(msg);
    } else {
      const { runGeneration } = await import('../services/generationService');
      const outcome = runGeneration(
        config,
        this.state.currentAnalysis,
        dsHash,
        dsSize,
        cStart,
        cEnd,
        (progress) => {
          this.state.progressStage = progress.stage;
          this.state.progressPercent = progress.percent;
          this.notify();
        },
      );
      this.state.currentOutcome = outcome;
      this.state.isProcessing = false;

      // Salva no repositório se sucesso
      if (outcome.success) {
        await gamesRepository.save({
          id: `portfolio_${Date.now()}`,
          datasetHash: dsHash,
          createdAt: new Date().toISOString(),
          config,
          repro: outcome.repro,
          games: outcome.auditedGames,
          coverage: outcome.coverage,
          hamming: outcome.hamming,
        });
      }

      this.notify();
    }
  }

  public updateConfig(config: GeneratorConfig): void {
    this.state.currentConfig = config;
    this.notify();
  }

  public setSelectedNumberForDetail(num: number | null): void {
    this.state.selectedNumberForDetail = num;
    this.notify();
  }

  public runBacktest(evalPoints = 30, seed = 42, mode: BacktestMode = 'FAST'): void {
    if (this.state.currentContests.length === 0) {
      alert('Carregue um histórico de concursos primeiro para rodar o backtest.');
      return;
    }
    this.state.isProcessing = true;
    this.state.progressStage = `Iniciando Walk-Forward Backtesting (${mode})...`;
    this.state.progressPercent = 5;
    this.notify();

    if (this.worker) {
      this.worker.postMessage({
        type: 'RUN_BACKTEST',
        contests: this.state.currentContests,
        evalPoints,
        seed,
        mode,
      });
    } else {
      setTimeout(() => {
        try {
          const res = runWalkForwardBacktest(this.state.currentContests, evalPoints, seed, mode);
          this.state.currentBacktestResult = res;
          this.state.isProcessing = false;
          this.notify();
        } catch (err) {
          this.state.isProcessing = false;
          alert(`Erro no backtest: ${(err as Error).message}`);
          this.notify();
        }
      }, 50);
    }
  }
}

export const appState = new StateManager();
