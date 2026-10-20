import { describe, expect, it, beforeEach } from 'bun:test';
import 'fake-indexeddb/auto';
import { datasetRepository } from '../../src/storage/repositories/datasetRepository';
import { analysisRepository } from '../../src/storage/repositories/analysisRepository';
import { gamesRepository } from '../../src/storage/repositories/gamesRepository';
import { configRepository } from '../../src/storage/repositories/configRepository';
import { backupService } from '../../src/services/backupService';
import { DEFAULT_GENERATOR_CONFIG } from '../../src/core/domain/models';

describe('Persistence (IndexedDB) & Backup Service Integration Tests', () => {
  beforeEach(async () => {
    await datasetRepository.clearAll();
    await analysisRepository.clearAll();
    await gamesRepository.clearAll();
    await configRepository.clearAll();
  });

  it('persists and retrieves datasets and contests', async () => {
    const ds = {
      hash: 'test_hash_123',
      name: 'Dataset Teste',
      contestsCount: 2,
      firstContest: 1,
      lastContest: 2,
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      importedAt: new Date().toISOString(),
      sourceFormat: 'xlsx',
    };

    const contests = [
      { contest: 1, date: '2026-01-01', numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      { contest: 2, date: '2026-01-02', numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
    ];

    await datasetRepository.save(ds, contests);

    const loadedDs = await datasetRepository.get('test_hash_123');
    expect(loadedDs).not.toBeNull();
    expect(loadedDs?.name).toBe('Dataset Teste');

    const loadedContests = await datasetRepository.getContests('test_hash_123');
    expect(loadedContests.length).toBe(2);
    expect(loadedContests[0]?.contest).toBe(1);
    expect(loadedContests[1]?.numbers[14]).toBe(16);
  });

  it('exports complete backup, validates preview and restores safely (§35)', async () => {
    // 1. Preenche dados
    const ds = {
      hash: 'backup_hash_abc',
      name: 'Base Backup',
      contestsCount: 1,
      firstContest: 10,
      lastContest: 10,
      startDate: null,
      endDate: null,
      importedAt: new Date().toISOString(),
      sourceFormat: 'csv',
    };
    await datasetRepository.save(ds, [
      { contest: 10, date: null, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
    ]);
    await configRepository.saveActive(DEFAULT_GENERATOR_CONFIG);

    // 2. Exporta backup
    const backupJson = await backupService.exportBackup();
    expect(backupJson).toContain('LOTOFÁCIL QUANT ENGINE');

    // 3. Valida prévia
    const preview = backupService.validateBackup(backupJson);
    expect(preview.isValid).toBe(true);
    expect(preview.datasetsCount).toBe(1);
    expect(preview.contestsCount).toBe(1);
    expect(preview.configurationsCount).toBe(1);
    expect(preview.errors.length).toBe(0);

    // 4. Limpa tudo para simular restauração
    await datasetRepository.clearAll();
    await configRepository.clearAll();
    expect(await datasetRepository.get('backup_hash_abc')).toBeNull();

    // 5. Restaura backup
    const result = await backupService.restoreBackup(preview.payload!);
    expect(result.success).toBe(true);

    // 6. Confirma restauração
    const restoredDs = await datasetRepository.get('backup_hash_abc');
    expect(restoredDs).not.toBeNull();
    expect(restoredDs?.name).toBe('Base Backup');
    const restoredContests = await datasetRepository.getContests('backup_hash_abc');
    expect(restoredContests.length).toBe(1);
  });

  it('rejects tampered or corrupt backup payloads', () => {
    const corruptJson = '{"app": "INVALID", "schemaVersion": 999}';
    const preview = backupService.validateBackup(corruptJson);
    expect(preview.isValid).toBe(false);
    expect(preview.errors.length).toBeGreaterThan(0);
  });
});
