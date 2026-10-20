/**
 * Esquema de Banco de Dados IndexedDB Versionado (§34).
 *
 * Nome do banco: 'LOTOFACIL_QUANT_ENGINE_DB'
 * Versão: 1
 *
 * Object Stores:
 * - datasets: metadados dos datasets importados (hash, nome, tamanho, período)
 * - contests: concursos individuais indexados por datasetHash e contest
 * - analyses: relatórios analíticos completos salvos
 * - configurations: perfis de configuração e filtros do gerador
 * - generatedGames: portfólios de apostas geradas e auditadas
 * - reports: relatórios científicos consolidados
 * - backups: histórico de backups e snapshots para rollback
 */
import { SCHEMA_VERSION } from '../core/domain/version';

export const DB_NAME = 'LOTOFACIL_QUANT_ENGINE_DB';
export const DB_VERSION = SCHEMA_VERSION;

export const STORES = {
  DATASETS: 'datasets',
  CONTESTS: 'contests',
  ANALYSES: 'analyses',
  CONFIGURATIONS: 'configurations',
  GENERATED_GAMES: 'generatedGames',
  REPORTS: 'reports',
  BACKUPS: 'backups',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

export function setupDatabaseSchema(db: IDBDatabase): void {
  // Datasets
  if (!db.objectStoreNames.contains(STORES.DATASETS)) {
    const dsStore = db.createObjectStore(STORES.DATASETS, { keyPath: 'hash' });
    dsStore.createIndex('by_importedAt', 'importedAt', { unique: false });
  }

  // Contests
  if (!db.objectStoreNames.contains(STORES.CONTESTS)) {
    // Chave composta [datasetHash, contest]
    const cStore = db.createObjectStore(STORES.CONTESTS, { keyPath: ['datasetHash', 'contest'] });
    cStore.createIndex('by_datasetHash', 'datasetHash', { unique: false });
    cStore.createIndex('by_contest', 'contest', { unique: false });
  }

  // Analyses
  if (!db.objectStoreNames.contains(STORES.ANALYSES)) {
    const anStore = db.createObjectStore(STORES.ANALYSES, { keyPath: 'id' });
    anStore.createIndex('by_datasetHash', 'datasetHash', { unique: false });
    anStore.createIndex('by_timestamp', 'timestamp', { unique: false });
  }

  // Configurations
  if (!db.objectStoreNames.contains(STORES.CONFIGURATIONS)) {
    const cfgStore = db.createObjectStore(STORES.CONFIGURATIONS, { keyPath: 'id' });
    cfgStore.createIndex('by_updatedAt', 'updatedAt', { unique: false });
  }

  // Generated Games
  if (!db.objectStoreNames.contains(STORES.GENERATED_GAMES)) {
    const ggStore = db.createObjectStore(STORES.GENERATED_GAMES, { keyPath: 'id' });
    ggStore.createIndex('by_datasetHash', 'datasetHash', { unique: false });
    ggStore.createIndex('by_createdAt', 'createdAt', { unique: false });
  }

  // Reports
  if (!db.objectStoreNames.contains(STORES.REPORTS)) {
    const repStore = db.createObjectStore(STORES.REPORTS, { keyPath: 'id' });
    repStore.createIndex('by_createdAt', 'createdAt', { unique: false });
  }

  // Backups
  if (!db.objectStoreNames.contains(STORES.BACKUPS)) {
    const bkpStore = db.createObjectStore(STORES.BACKUPS, { keyPath: 'id' });
    bkpStore.createIndex('by_createdAt', 'createdAt', { unique: false });
  }
}
