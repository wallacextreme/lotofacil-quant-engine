/**
 * Repositório de Configurações e Filtros Salvos (§34).
 */
import type { GeneratorConfig } from '../../core/domain/types';
import { DEFAULT_GENERATOR_CONFIG } from '../../core/domain/models';
import { dbClear, dbDelete, dbGet, dbGetAll, dbPut } from '../database';
import { STORES } from '../schema';

export interface SavedConfigRecord {
  id: string; // 'active' ou nome do preset
  name: string;
  config: GeneratorConfig;
  updatedAt: string;
}

export const configRepository = {
  async save(record: SavedConfigRecord): Promise<void> {
    await dbPut<SavedConfigRecord>(STORES.CONFIGURATIONS, record);
  },

  async get(id: string): Promise<SavedConfigRecord | null> {
    return dbGet<SavedConfigRecord>(STORES.CONFIGURATIONS, id);
  },

  async getActive(): Promise<GeneratorConfig> {
    const active = await dbGet<SavedConfigRecord>(STORES.CONFIGURATIONS, 'active');
    return active ? active.config : DEFAULT_GENERATOR_CONFIG;
  },

  async saveActive(config: GeneratorConfig): Promise<void> {
    await dbPut<SavedConfigRecord>(STORES.CONFIGURATIONS, {
      id: 'active',
      name: 'Configuração Atual',
      config,
      updatedAt: new Date().toISOString(),
    });
  },

  async listPresets(): Promise<SavedConfigRecord[]> {
    const list = await dbGetAll<SavedConfigRecord>(STORES.CONFIGURATIONS);
    return list.filter((c) => c.id !== 'active');
  },

  async delete(id: string): Promise<void> {
    await dbDelete(STORES.CONFIGURATIONS, id);
  },

  async clearAll(): Promise<void> {
    await dbClear(STORES.CONFIGURATIONS);
  },
};
