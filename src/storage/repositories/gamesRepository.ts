/**
 * Repositório de Jogos Gerados e Auditorias (§34).
 */
import type { GameAudit, GeneratorConfig, ReproMeta } from '../../core/domain/types';
import type { CoverageReport } from '../../core/combinatorial/coverage';
import type { HammingAnalysis } from '../../core/combinatorial/hamming';
import { dbClear, dbDelete, dbGet, dbGetAll, dbGetByIndex, dbPut } from '../database';
import { STORES } from '../schema';

export interface SavedGamesRecord {
  id: string; // UUID ou timestamp
  datasetHash: string;
  createdAt: string;
  config: GeneratorConfig;
  repro: ReproMeta;
  games: GameAudit[];
  coverage: CoverageReport | null;
  hamming: HammingAnalysis | null;
  notes?: string;
}

export const gamesRepository = {
  async save(record: SavedGamesRecord): Promise<void> {
    await dbPut<SavedGamesRecord>(STORES.GENERATED_GAMES, record);
  },

  async get(id: string): Promise<SavedGamesRecord | null> {
    return dbGet<SavedGamesRecord>(STORES.GENERATED_GAMES, id);
  },

  async list(): Promise<SavedGamesRecord[]> {
    const list = await dbGetAll<SavedGamesRecord>(STORES.GENERATED_GAMES);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listForDataset(datasetHash: string): Promise<SavedGamesRecord[]> {
    const list = await dbGetByIndex<SavedGamesRecord>(STORES.GENERATED_GAMES, 'by_datasetHash', datasetHash);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async delete(id: string): Promise<void> {
    await dbDelete(STORES.GENERATED_GAMES, id);
  },

  async clearAll(): Promise<void> {
    await dbClear(STORES.GENERATED_GAMES);
  },
};
