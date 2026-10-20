/**
 * Página Dashboard — Visão Geral Analítica do Sistema (§27).
 */
import { appState, type AppState } from '../app/state';
import { SAMPLE_SPACE } from '../core/statistics/combinations';
import { epistemicBadge } from '../components/epistemicBadge';
import { renderVolanteHtml, attachVolanteEvents } from '../components/volante';
import { formatDateBR } from '../core/data/normalizer';
import { showModal } from '../components/modal';

export function renderDashboardPage(state: AppState): string {
  const ds = state.currentDataset;
  const an = state.currentAnalysis;

  if (!ds || !an) {
    return `
      <div class="space-y-6">
        <div class="glass-panel p-8 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-12 border-dashed border-2 border-slate-700">
          <div class="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 mx-auto flex items-center justify-center">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          </div>
          <h2 class="text-xl font-bold text-white tracking-tight">Nenhum Dataset Ativo</h2>
          <p class="text-xs text-slate-400 leading-relaxed">
            Importe o histórico oficial da Lotofácil (arquivo <code class="text-cyan-400">.xlsx</code> ou <code class="text-cyan-400">.csv</code>) para alimentar os motores de estatística descritiva, cadeias de Markov e otimização combinatória.
          </p>
          <div class="pt-2 flex flex-wrap justify-center gap-3">
            <button id="btn-load-demo" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Carregar Base Demonstrativa (3.795 Concursos)
            </button>
            <button id="btn-dashboard-import" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition border border-slate-700 cursor-pointer">
              Importar Planilha do Computador
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const s = an.summary;
  const gamesCount = state.currentOutcome?.auditedGames.length ?? 0;

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Welcome & Epistemic Banner -->
      <div class="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Painel Quântico da Lotofácil</h2>
            ${epistemicBadge('FATO')}
            ${epistemicBadge('ESTATISTICA')}
          </div>
          <p class="text-xs text-slate-400">
            Base: <strong class="text-slate-200 font-mono-code">${ds.name}</strong> · Hash SHA-256: <code class="text-[10px] text-cyan-400 font-mono-code">${ds.hash.slice(0, 16)}…</code>
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button id="btn-reanalyze" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Reanalisar
          </button>
          <button id="btn-go-generate" class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
            Ir ao Gerador
          </button>
        </div>
      </div>

      <!-- KPI Grid (§27) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <!-- Concursos Analisados -->
        <div class="glass-panel p-4 rounded-2xl flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Concursos</span>
          <div class="my-2">
            <div class="text-2xl font-black text-white font-mono-code">${s.contestsCount}</div>
            <div class="text-[10px] text-slate-400">#${s.firstContest} a #${s.lastContest}</div>
          </div>
          <span class="text-[9px] text-cyan-400">${formatDateBR(s.lastDrawDate)}</span>
        </div>

        <!-- Espaço Amostral -->
        <div class="glass-panel p-4 rounded-2xl flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Espaço C(25,15)</span>
          <div class="my-2">
            <div class="text-xl sm:text-2xl font-black text-white font-mono-code">${SAMPLE_SPACE.toLocaleString('pt-BR')}</div>
            <div class="text-[10px] text-slate-400">Combinações exatas</div>
          </div>
          <span class="text-[9px] text-slate-400">P = 1 / 3.268.760</span>
        </div>

        <!-- Qui-Quadrado / p-valor -->
        <div class="glass-panel p-4 rounded-2xl flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Qui-Quadrado</span>
          <div class="my-2">
            <div class="text-2xl font-black text-white font-mono-code">p = ${an.chiSquare.pValue.toFixed(3)}</div>
            <div class="text-[10px] text-slate-400">χ²_adj = ${an.chiSquare.adjustedStatistic.toFixed(2)}</div>
          </div>
          <span class="text-[9px] text-emerald-400">gl = 24</span>
        </div>

        <!-- Média da Soma -->
        <div class="glass-panel p-4 rounded-2xl flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Média da Soma</span>
          <div class="my-2">
            <div class="text-2xl font-black text-white font-mono-code">${s.meanSum.toFixed(2)}</div>
            <div class="text-[10px] text-slate-400">Teórico: 195,00</div>
          </div>
          <span class="text-[9px] text-slate-400">Δ = ${(s.meanSum - 195).toFixed(2)}</span>
        </div>

        <!-- Repetição Média -->
        <div class="glass-panel p-4 rounded-2xl flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Repetição Média</span>
          <div class="my-2">
            <div class="text-2xl font-black text-white font-mono-code">${s.meanRepeated.toFixed(2)}</div>
            <div class="text-[10px] text-slate-400">Teórico: 9,00</div>
          </div>
          <span class="text-[9px] text-slate-400">Δ = ${(s.meanRepeated - 9).toFixed(2)}</span>
        </div>

        <!-- Jogos Gerados -->
        <div class="glass-panel p-4 rounded-2xl flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Jogos Ativos</span>
          <div class="my-2">
            <div class="text-2xl font-black text-cyan-400 font-mono-code">${gamesCount}</div>
            <div class="text-[10px] text-slate-400">Auditados</div>
          </div>
          <span class="text-[9px] text-emerald-400">100% Conformes</span>
        </div>
      </div>

      <!-- Volante 5x5 Interativo e Último Concurso -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Volante 5x5 -->
        <div class="lg:col-span-7 glass-panel p-5 rounded-3xl space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Volante Termoestatístico (5×5)
                ${epistemicBadge('ESTATISTICA')}
              </h3>
              <p class="text-[11px] text-slate-400">Classificação por Z-Score local (janela W=30). Clique numa dezena para detalhes.</p>
            </div>
            <!-- Legenda Térmica -->
            <div class="flex items-center gap-2 text-[10px] font-mono-code">
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Quente (${an.zScores.counts.hot})</span>
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Neutra (${an.zScores.counts.neutral})</span>
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Fria (${an.zScores.counts.cold})</span>
            </div>
          </div>

          <div id="dashboard-volante-container" class="py-2">
            ${renderVolanteHtml({ analysis: an, showStats: true })}
          </div>
        </div>

        <!-- Card do Último Concurso e Atrasos em Alerta -->
        <div class="lg:col-span-5 space-y-4">
          <!-- Último Sorteio -->
          <div class="glass-panel p-5 rounded-3xl space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Último Sorteio (#${s.lastContest})
                ${epistemicBadge('FATO')}
              </h3>
              <span class="text-[11px] text-slate-400 font-mono-code">${formatDateBR(s.lastDrawDate)}</span>
            </div>

            <div class="flex flex-wrap gap-1.5 py-1">
              ${s.lastDrawNumbers.map((n) => `<span class="ball-mini">${String(n).padStart(2, '0')}</span>`).join('')}
            </div>

            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
              <div>
                <span class="text-slate-500 block">Soma</span>
                <span class="font-bold text-slate-200 font-mono-code">${s.lastDrawNumbers.reduce((a, b) => a + b, 0)}</span>
              </div>
              <div>
                <span class="text-slate-500 block">Pares/Ímpares</span>
                <span class="font-bold text-slate-200 font-mono-code">${s.lastDrawNumbers.filter((n) => n % 2 === 0).length}P / ${s.lastDrawNumbers.filter((n) => n % 2 !== 0).length}I</span>
              </div>
              <div>
                <span class="text-slate-500 block">Primos</span>
                <span class="font-bold text-slate-200 font-mono-code">${s.lastDrawNumbers.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length}</span>
              </div>
            </div>
          </div>

          <!-- Atrasos em Estado de Alerta -->
          <div class="glass-panel p-5 rounded-3xl space-y-3">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Sinalizador de Atrasos Anômalos (> 1.5σ)
              ${epistemicBadge('ESTATISTICA')}
            </h3>

            <div class="space-y-2 max-h-56 overflow-y-auto">
              ${
                an.delays.delays.filter((d) => d.status === 'ABOVE_1_5_SIGMA' || d.status === 'ATTENTION')
                  .length === 0
                  ? `<p class="text-xs text-slate-500 py-3 text-center">Nenhuma dezena com atraso anômalo no momento.</p>`
                  : an.delays.delays
                      .filter((d) => d.status === 'ABOVE_1_5_SIGMA' || d.status === 'ATTENTION')
                      .map(
                        (d) => `
                    <div class="p-2.5 rounded-xl bg-slate-900/60 border ${d.status === 'ABOVE_1_5_SIGMA' ? 'border-rose-800/80 bg-rose-950/20' : 'border-amber-800/80 bg-amber-950/20'} flex items-center justify-between text-xs">
                      <div class="flex items-center gap-2">
                        <span class="ball-mini">${String(d.number).padStart(2, '0')}</span>
                        <div>
                          <div class="font-bold ${d.status === 'ABOVE_1_5_SIGMA' ? 'text-rose-400' : 'text-amber-400'}">${d.statusLabel}</div>
                          <div class="text-[10px] text-slate-400">Média: ${d.meanDelay.toFixed(1)} | Máx: ${d.maxDelay}</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-mono-code font-bold text-white">${d.currentDelay} conc.</div>
                        <div class="text-[10px] text-slate-500">ausente</div>
                      </div>
                    </div>
                  `,
                      )
                      .join('')
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function attachDashboardEvents(state: AppState): void {
  document.getElementById('btn-load-demo')?.addEventListener('click', async () => {
    try {
      const resp = await fetch('/lotofacil_sample.xlsx');
      const buf = await resp.arrayBuffer();
      await appState.importFile(new Uint8Array(buf), 'Lotofácil_3795_Oficial.xlsx');
    } catch (e) {
      alert(`Erro ao carregar base: ${(e as Error).message}`);
    }
  });

  document.getElementById('btn-dashboard-import')?.addEventListener('click', () => {
    document.getElementById('file-importer-input')?.click();
  });

  document.getElementById('btn-reanalyze')?.addEventListener('click', async () => {
    await appState.runAnalysis();
  });

  document.getElementById('btn-go-generate')?.addEventListener('click', () => {
    appState.navigateTo('gerador');
  });

  const volanteContainer = document.getElementById('dashboard-volante-container');
  if (volanteContainer && state.currentAnalysis) {
    attachVolanteEvents(volanteContainer, (num) => {
      const zInfo = state.currentAnalysis?.zScores.scores[num - 1];
      const dInfo = state.currentAnalysis?.delays.delays[num - 1];
      if (!zInfo || !dInfo) return;

      showModal({
        title: `Estatísticas Detalhadas: Dezena ${String(num).padStart(2, '0')}`,
        bodyHtml: `
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-slate-500 block">Classificação Térmica</span>
                <span class="text-base font-bold ${zInfo.temperature === 'HOT' ? 'text-rose-400' : zInfo.temperature === 'COLD' ? 'text-slate-400' : 'text-sky-400'}">${zInfo.temperature}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-slate-500 block">Atraso Atual</span>
                <span class="text-base font-bold text-white font-mono-code">${dInfo.currentDelay} concursos</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-slate-500 block">Frequência Global</span>
                <span class="text-base font-bold text-white font-mono-code">${dInfo.occurrences} (${(zInfo.globalRelative * 100).toFixed(2)}%)</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-slate-500 block">Z-Score Local (W=${state.currentAnalysis?.zScores.windowSize})</span>
                <span class="text-base font-bold text-white font-mono-code">${zInfo.localZ > 0 ? '+' : ''}${zInfo.localZ.toFixed(3)}</span>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div class="flex justify-between text-slate-400">
                <span>Atraso Médio Histórico:</span>
                <span class="font-mono-code text-white">${dInfo.meanDelay.toFixed(3)}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Desvio Padrão do Atraso (σ):</span>
                <span class="font-mono-code text-white">${dInfo.stdDelay.toFixed(3)}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Maior Atraso Histórico (Gap Máx):</span>
                <span class="font-mono-code text-white">${dInfo.maxDelay} concursos</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Limiar Alerta (μ + 1.5σ):</span>
                <span class="font-mono-code text-white">${dInfo.threshold1_5Sigma.toFixed(2)}</span>
              </div>
            </div>
          </div>
        `,
      });
    });
  }
}
