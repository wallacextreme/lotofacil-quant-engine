/**
 * Serviço de Backup Completo, Validação Estrutural e Restauração com Rollback (§35).
 *
 * Mandatos:
 * 1. Exporta JSON completo com integridade verificada via SHA-256.
 * 2. Valida estrutura, versão e integridade do arquivo antes de tocar no banco.
 * 3. Apresenta prévia completa ao usuário (quantidade de registros por tabela).
 * 4. Mantém snapshot do estado anterior antes de qualquer escrita para permitir ROLLBACK total.
 * 5. Nunca apaga dados antes da confirmação e validação do backup.
 */
import { SCHEMA_VERSION, APP_NAME, ENGINE_VERSION } from '../core/domain/version';
import { dbGetAll, dbClear, dbPutBatch } from '../storage/database';
import { STORES } from '../storage/schema';
import { sha256Hex } from '../core/util/sha256';

export interface BackupPayload {
  app: string;
  schemaVersion: number;
  engineVersion: string;
  exportedAt: string;
  checksum: string;
  data: {
    datasets: unknown[];
    contests: unknown[];
    analyses: unknown[];
    configurations: unknown[];
    generatedGames: unknown[];
    reports: unknown[];
  };
}

export interface BackupPreview {
  isValid: boolean;
  schemaVersion: number;
  engineVersion: string;
  exportedAt: string;
  datasetsCount: number;
  contestsCount: number;
  analysesCount: number;
  configurationsCount: number;
  gamesCount: number;
  reportsCount: number;
  errors: string[];
  warnings: string[];
  payload: BackupPayload | null;
}

export const backupService = {
  /**
   * Exporta todo o estado persistido do IndexedDB em um único JSON estruturado com checksum.
   */
  async exportBackup(): Promise<string> {
    const datasets = await dbGetAll(STORES.DATASETS);
    const contests = await dbGetAll(STORES.CONTESTS);
    const analyses = await dbGetAll(STORES.ANALYSES);
    const configurations = await dbGetAll(STORES.CONFIGURATIONS);
    const generatedGames = await dbGetAll(STORES.GENERATED_GAMES);
    const reports = await dbGetAll(STORES.REPORTS);

    const rawData = {
      datasets,
      contests,
      analyses,
      configurations,
      generatedGames,
      reports,
    };

    const dataJson = JSON.stringify(rawData);
    const checksum = sha256Hex(dataJson);

    const backup: BackupPayload = {
      app: APP_NAME,
      schemaVersion: SCHEMA_VERSION,
      engineVersion: ENGINE_VERSION,
      exportedAt: new Date().toISOString(),
      checksum,
      data: rawData,
    };

    return JSON.stringify(backup, null, 2);
  },

  /**
   * Valida minuciosamente um arquivo de backup sem alterar qualquer dado (§35 passos 1, 2, 3 e 4).
   */
  validateBackup(jsonString: string): BackupPreview {
    const errors: string[] = [];
    const warnings: string[] = [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      return {
        isValid: false,
        schemaVersion: 0,
        engineVersion: '',
        exportedAt: '',
        datasetsCount: 0,
        contestsCount: 0,
        analysesCount: 0,
        configurationsCount: 0,
        gamesCount: 0,
        reportsCount: 0,
        errors: [`Arquivo de backup corrompido: JSON inválido (${(e as Error).message})`],
        warnings: [],
        payload: null,
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      errors.push('O conteúdo do backup não é um objeto JSON válido.');
      return {
        isValid: false,
        schemaVersion: 0,
        engineVersion: '',
        exportedAt: '',
        datasetsCount: 0,
        contestsCount: 0,
        analysesCount: 0,
        configurationsCount: 0,
        gamesCount: 0,
        reportsCount: 0,
        errors,
        warnings,
        payload: null,
      };
    }

    const b = parsed as Partial<BackupPayload>;

    // Validação de assinatura
    if (b.app !== APP_NAME) {
      warnings.push(`Assinatura do app divergente: '${b.app}' (esperado: '${APP_NAME}').`);
    }

    // Validação de versão
    if (typeof b.schemaVersion !== 'number') {
      errors.push('Campo schemaVersion ausente ou inválido no backup.');
    } else if (b.schemaVersion > SCHEMA_VERSION) {
      errors.push(
        `Versão do schema do backup (v${b.schemaVersion}) é superior à versão suportada por este software (v${SCHEMA_VERSION}). Atualize a aplicação.`,
      );
    }

    // Validação da seção de dados
    if (!b.data || typeof b.data !== 'object') {
      errors.push('Seção "data" ausente ou corrompida.');
    }

    const d = b.data ?? ({} as Partial<BackupPayload['data']>);
    const datasets = Array.isArray(d.datasets) ? d.datasets : [];
    const contests = Array.isArray(d.contests) ? d.contests : [];
    const analyses = Array.isArray(d.analyses) ? d.analyses : [];
    const configurations = Array.isArray(d.configurations) ? d.configurations : [];
    const generatedGames = Array.isArray(d.generatedGames) ? d.generatedGames : [];
    const reports = Array.isArray(d.reports) ? d.reports : [];

    // Validação de integridade via checksum
    if (b.checksum) {
      const computedChecksum = sha256Hex(JSON.stringify(d));
      if (computedChecksum !== b.checksum) {
        errors.push('Falha na verificação de integridade: checksum SHA-256 do arquivo diverge do esperado.');
      }
    } else {
      warnings.push('Arquivo de backup não contém checksum SHA-256 de integridade.');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      schemaVersion: b.schemaVersion ?? 0,
      engineVersion: b.engineVersion ?? 'desconhecida',
      exportedAt: b.exportedAt ?? 'desconhecida',
      datasetsCount: datasets.length,
      contestsCount: contests.length,
      analysesCount: analyses.length,
      configurationsCount: configurations.length,
      gamesCount: generatedGames.length,
      reportsCount: reports.length,
      errors,
      warnings,
      payload: isValid ? (b as BackupPayload) : null,
    };
  },

  /**
   * Restaura o backup de forma segura, com snapshot prévio e capacidade de ROLLBACK total.
   */
  async restoreBackup(payload: BackupPayload): Promise<{ success: boolean; message: string }> {
    // 1. Cria snapshot de segurança do estado atual para permitir rollback se houver falha
    let rollbackSnapshot: {
      datasets: unknown[];
      contests: unknown[];
      analyses: unknown[];
      configurations: unknown[];
      generatedGames: unknown[];
      reports: unknown[];
    } | null = null;

    try {
      rollbackSnapshot = {
        datasets: await dbGetAll(STORES.DATASETS),
        contests: await dbGetAll(STORES.CONTESTS),
        analyses: await dbGetAll(STORES.ANALYSES),
        configurations: await dbGetAll(STORES.CONFIGURATIONS),
        generatedGames: await dbGetAll(STORES.GENERATED_GAMES),
        reports: await dbGetAll(STORES.REPORTS),
      };
    } catch (e) {
      throw new Error(
        `Não foi possível criar snapshot de segurança antes da restauração: ${(e as Error).message}`,
      );
    }

    // 2. Executa a restauração
    try {
      await dbClear(STORES.DATASETS);
      await dbClear(STORES.CONTESTS);
      await dbClear(STORES.ANALYSES);
      await dbClear(STORES.CONFIGURATIONS);
      await dbClear(STORES.GENERATED_GAMES);
      await dbClear(STORES.REPORTS);

      if (payload.data.datasets.length > 0) {
        await dbPutBatch(STORES.DATASETS, payload.data.datasets);
      }
      if (payload.data.contests.length > 0) {
        await dbPutBatch(STORES.CONTESTS, payload.data.contests);
      }
      if (payload.data.analyses.length > 0) {
        await dbPutBatch(STORES.ANALYSES, payload.data.analyses);
      }
      if (payload.data.configurations.length > 0) {
        await dbPutBatch(STORES.CONFIGURATIONS, payload.data.configurations);
      }
      if (payload.data.generatedGames.length > 0) {
        await dbPutBatch(STORES.GENERATED_GAMES, payload.data.generatedGames);
      }
      if (payload.data.reports.length > 0) {
        await dbPutBatch(STORES.REPORTS, payload.data.reports);
      }

      return {
        success: true,
        message: 'Backup restaurado com sucesso.',
      };
    } catch (restoreErr) {
      // 3. FALHA DETECTADA: EXECUTA ROLLBACK IMEDIATO
      try {
        if (rollbackSnapshot) {
          await dbClear(STORES.DATASETS);
          await dbClear(STORES.CONTESTS);
          await dbClear(STORES.ANALYSES);
          await dbClear(STORES.CONFIGURATIONS);
          await dbClear(STORES.GENERATED_GAMES);
          await dbClear(STORES.REPORTS);

          await dbPutBatch(STORES.DATASETS, rollbackSnapshot.datasets);
          await dbPutBatch(STORES.CONTESTS, rollbackSnapshot.contests);
          await dbPutBatch(STORES.ANALYSES, rollbackSnapshot.analyses);
          await dbPutBatch(STORES.CONFIGURATIONS, rollbackSnapshot.configurations);
          await dbPutBatch(STORES.GENERATED_GAMES, rollbackSnapshot.generatedGames);
          await dbPutBatch(STORES.REPORTS, rollbackSnapshot.reports);
        }
      } catch (rollbackErr) {
        throw new Error(
          `Falha crítica na restauração E falha no rollback: ${(restoreErr as Error).message}. Rollback error: ${(rollbackErr as Error).message}`,
        );
      }

      throw new Error(`Restauração falhou; rollback executado com sucesso: ${(restoreErr as Error).message}`);
    }
  },
};
