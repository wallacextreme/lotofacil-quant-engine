/**
 * Página de Configurações, Backup & Restauração Segura (§35).
 */
import { appState, type AppState } from '../app/state';
import { epistemicBadge } from '../components/epistemicBadge';
import { backupService } from '../services/backupService';
import { showModal, hideModal } from '../components/modal';
import { DEFAULT_GENERATOR_CONFIG } from '../core/domain/models';

export function renderConfigPage(_state: AppState): string {
  return `
    <div class="space-y-6 max-w-5xl mx-auto">
      <!-- Title -->
      <div class="glass-panel p-5 rounded-2xl flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Configurações & Backup Seguro</h2>
            ${epistemicBadge('FATO')}
          </div>
          <p class="text-xs text-slate-400">
            Exportação integral de banco de dados, verificação de integridade criptográfica SHA-256 e restauração atômica com rollback.
          </p>
        </div>
      </div>

      <!-- Backup & Restore Section (§35) -->
      <div class="glass-panel p-6 rounded-3xl space-y-5">
        <div class="border-b border-slate-800 pb-3">
          <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Backup Integral do Sistema (IndexedDB)
            ${epistemicBadge('FATO')}
          </h3>
          <p class="text-xs text-slate-400">Exporta e restaura todos os datasets, concursos, análises, parametrizações e apostas auditadas.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Exportar Backup -->
          <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div class="space-y-1">
              <h4 class="text-xs font-bold text-white">Criar Arquivo de Backup (.json)</h4>
              <p class="text-[11px] text-slate-400">Gera um arquivo com validação SHA-256 de todas as tabelas persistidas no navegador.</p>
            </div>
            <button id="btn-export-backup" class="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-sm">
              Baixar Backup Completo
            </button>
          </div>

          <!-- Importar Backup -->
          <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div class="space-y-1">
              <h4 class="text-xs font-bold text-white">Restaurar Backup com Rollback</h4>
              <p class="text-[11px] text-slate-400">Valida versão, integridade e apresenta prévia detalhada antes de aplicar as alterações.</p>
            </div>
            <button id="btn-trigger-import-backup" class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition">
              Selecionar Arquivo de Backup
            </button>
            <input type="file" id="backup-file-input" class="hidden" accept=".json" />
          </div>
        </div>
      </div>

      <!-- Presets e Padrões -->
      <div class="glass-panel p-6 rounded-3xl space-y-4">
        <div class="border-b border-slate-800 pb-3">
          <h3 class="text-sm font-bold text-white uppercase tracking-wider">Redefinição dos Padrões de Engenharia</h3>
          <p class="text-xs text-slate-400">Restaura as constantes duras e pesos padrão recomendados pela especificação técnica.</p>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-300">Restaurar intervalos de soma, paridade, moldura e pesos heurísticos iniciais:</span>
          <button id="btn-restore-defaults" class="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition">
            Redefinir Filtros
          </button>
        </div>
      </div>
    </div>
  `;
}

export function attachConfigEvents(_state: AppState): void {
  // Exportar backup
  document.getElementById('btn-export-backup')?.addEventListener('click', async () => {
    try {
      const json = await backupService.exportBackup();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lotofacil_quant_engine_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Falha ao exportar backup: ${(e as Error).message}`);
    }
  });

  // Disparar input de arquivo para restauração
  document.getElementById('btn-trigger-import-backup')?.addEventListener('click', () => {
    document.getElementById('backup-file-input')?.click();
  });

  // Tratar arquivo de backup selecionado
  document.getElementById('backup-file-input')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const preview = backupService.validateBackup(text);

      if (!preview.isValid) {
        showModal({
          title: 'Backup Inválido ou Corrompido',
          bodyHtml: `
            <div class="space-y-2 text-rose-400">
              <p>O arquivo selecionado não atende aos requisitos de integridade do sistema:</p>
              <ul class="list-disc pl-5 space-y-1 text-xs">
                ${preview.errors.map((err) => `<li>${err}</li>`).join('')}
              </ul>
            </div>
          `,
        });
        return;
      }

      // Apresenta Prévia Detalhada (§35 passo 4)
      showModal({
        title: 'Confirmar Restauração de Backup',
        bodyHtml: `
          <div class="space-y-3">
            <p class="text-slate-300">
              O arquivo de backup foi <strong>validado com sucesso</strong> e sua assinatura SHA-256 está íntegra.
            </p>

            <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono-code text-xs">
              <div class="flex justify-between text-slate-400">
                <span>Versão do Schema:</span>
                <span class="text-white">v${preview.schemaVersion}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Data do Backup:</span>
                <span class="text-white">${preview.exportedAt}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Datasets:</span>
                <span class="text-cyan-400 font-bold">${preview.datasetsCount}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Concursos Históricos:</span>
                <span class="text-cyan-400 font-bold">${preview.contestsCount}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Análises Estatísticas:</span>
                <span class="text-cyan-400 font-bold">${preview.analysesCount}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Portfólios de Jogos:</span>
                <span class="text-cyan-400 font-bold">${preview.gamesCount}</span>
              </div>
            </div>

            <p class="text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/50">
              <strong>Garantia de Rollback (§35):</strong> Um snapshot prévio será mantido em memória. Caso ocorra qualquer falha durante a gravação, o estado atual será restaurado imediatamente sem perda de dados.
            </p>
          </div>
        `,
        confirmText: 'Confirmar e Restaurar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          hideModal();
          try {
            await backupService.restoreBackup(preview.payload!);
            alert('Backup restaurado com sucesso! A aplicação será reinicializada.');
            await appState.initialize();
          } catch (err) {
            alert(`Erro na restauração: ${(err as Error).message}`);
          }
        },
      });
    } catch (err) {
      alert(`Erro ao ler arquivo de backup: ${(err as Error).message}`);
    }
  });

  // Restaurar padrões
  document.getElementById('btn-restore-defaults')?.addEventListener('click', async () => {
    if (confirm('Deseja restaurar todas as configurações e pesos para os padrões de engenharia?')) {
      appState.updateConfig(DEFAULT_GENERATOR_CONFIG);
      alert('Configurações redefinidas com sucesso.');
    }
  });
}
