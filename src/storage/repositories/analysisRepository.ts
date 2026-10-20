/**
 * Repositório de Análises Estatísticas (§34).
 */
import type { DatasetAnalysis } from '../../services/analysisService';
import { dbClear, dbDelete, dbGet, dbGetAll, dbGetByIndex, dbPut } from '../database';
import { STORES } from '../schema';

export interface SavedAnalysisRecord {
  id: string; // e.g. `${datasetHash}_${timestamp}`
  datasetHash: string;
  timestamp: string;
  data: DatasetAnalysis;
}

export const analysisRepository = {
  async save(record: SavedAnalysisRecord): Promise<void> {
    await dbPut<SavedAnalysisRecord>(STORES.ANALYSES, record);
  },

  async get(id: string): Promise<SavedAnalysisRecord | null> {
    return dbGet<SavedAnalysisRecord>(STORES.ANALYSES, id);
  },

  async getLatestForDataset(datasetHash: string): Promise<SavedAnalysisRecord | null> {
    const list = await dbGetByIndex<SavedAnalysisRecord>(STORES.ANALYSES, 'by_datasetHash', datasetHash);
    if (list.length === 0) return null;
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return list[0]!;
  },

  async list(): Promise<SavedAnalysisRecord[]> {
    const list = await dbGetAll<SavedAnalysisRecord>(STORES.ANALYSES);
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async delete(id: string): Promise<void> {
    await dbDelete(STORES.ANALYSES, id);
  },

  async clearAll(): Promise<void> {
    await dbClear(STORES.ANALYSES);
  },
};
