/**
 * Repositório de Datasets e Concursos Históricos (§34).
 */
import type { Contest } from '../../core/domain/types';
import { dbClear, dbDelete, dbGet, dbGetAll, dbGetByIndex, dbPut, dbPutBatch } from '../database';
import { STORES } from '../schema';

export interface DatasetRecord {
  hash: string;
  name: string;
  contestsCount: number;
  firstContest: number;
  lastContest: number;
  startDate: string | null;
  endDate: string | null;
  importedAt: string;
  sourceFormat: string;
}

export interface ContestRecord {
  datasetHash: string;
  contest: number;
  date: string | null;
  numbers: number[];
}

export const datasetRepository = {
  async save(record: DatasetRecord, contests: readonly Contest[]): Promise<void> {
    await dbPut<DatasetRecord>(STORES.DATASETS, record);
    const contestRecords: ContestRecord[] = contests.map((c) => ({
      datasetHash: record.hash,
      contest: c.contest,
      date: c.date,
      numbers: c.numbers,
    }));
    await dbPutBatch<ContestRecord>(STORES.CONTESTS, contestRecords);
  },

  async get(hash: string): Promise<DatasetRecord | null> {
    return dbGet<DatasetRecord>(STORES.DATASETS, hash);
  },

  async list(): Promise<DatasetRecord[]> {
    const list = await dbGetAll<DatasetRecord>(STORES.DATASETS);
    return list.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  },

  async getContests(datasetHash: string): Promise<Contest[]> {
    const records = await dbGetByIndex<ContestRecord>(STORES.CONTESTS, 'by_datasetHash', datasetHash);
    return records
      .sort((a, b) => a.contest - b.contest)
      .map((r) => ({ contest: r.contest, date: r.date, numbers: r.numbers }));
  },

  async delete(hash: string): Promise<void> {
    await dbDelete(STORES.DATASETS, hash);
    const contests = await dbGetByIndex<ContestRecord>(STORES.CONTESTS, 'by_datasetHash', hash);
    for (const c of contests) {
      await dbDelete(STORES.CONTESTS, [hash, c.contest]);
    }
  },

  async clearAll(): Promise<void> {
    await dbClear(STORES.DATASETS);
    await dbClear(STORES.CONTESTS);
  },
};
