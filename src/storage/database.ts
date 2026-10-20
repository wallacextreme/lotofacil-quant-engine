/**
 * Conexão e Gerenciador de Transações do IndexedDB.
 *
 * Arquitetura em Camadas (§34):
 * - A UI JAMAIS acessa este arquivo nem o IndexedDB diretamente.
 * - Somente os Repositórios consomem este módulo.
 */
import { DB_NAME, DB_VERSION, type StoreName, setupDatabaseSchema } from './schema';

let dbInstance: IDBDatabase | null = null;

export function getIndexedDB(): IDBFactory {
  if (typeof indexedDB !== 'undefined') return indexedDB;
  if (typeof window !== 'undefined' && window.indexedDB) return window.indexedDB;
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB) {
    return (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB;
  }
  throw new Error('IndexedDB não está disponível neste ambiente de execução.');
}

export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  const factory = getIndexedDB();
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      setupDatabaseSchema(db);
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error(`Falha ao abrir IndexedDB: ${(event.target as IDBOpenDBRequest).error?.message}`));
    };
  });
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function getStore(
  storeName: StoreName,
  mode: IDBTransactionMode = 'readonly',
): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  return { store, tx };
}

export async function dbGet<T>(storeName: StoreName, key: IDBValidKey): Promise<T | null> {
  const { store } = await getStore(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const { store } = await getStore(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as T[]) ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function dbPut<T>(storeName: StoreName, item: T): Promise<void> {
  const { store, tx } = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error(`Transação abortada em ${storeName}`));
  });
}

export async function dbPutBatch<T>(storeName: StoreName, items: readonly T[]): Promise<void> {
  if (items.length === 0) return;
  const { store, tx } = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error(`Transação em lote abortada em ${storeName}`));
  });
}

export async function dbDelete(storeName: StoreName, key: IDBValidKey): Promise<void> {
  const { store, tx } = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbClear(storeName: StoreName): Promise<void> {
  const { store, tx } = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbGetByIndex<T>(
  storeName: StoreName,
  indexName: string,
  key: IDBValidKey,
): Promise<T[]> {
  const { store } = await getStore(storeName, 'readonly');
  const index = store.index(indexName);
  return new Promise((resolve, reject) => {
    const request = index.getAll(key);
    request.onsuccess = () => resolve((request.result as T[]) ?? []);
    request.onerror = () => reject(request.error);
  });
}
