/**
 * Página de Entropia Espacial e Ocupação do Volante 5×5 (§17).
 */
import type { AppState } from '../app/state';
import { epistemicBadge } from '../components/epistemicBadge';

export function renderEntropyPage(state: AppState): string {
  const an = state.currentAnalysis;
  if (!an) {
    return `<div class="p-8 text-center text-slate-500">Nenhuma análise disponível. Carregue um dataset no Dashboard.</div>`;
  }

  const { entropy } = an;
  const th = entropy.theory;

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Entropia Espacial (Linhas & Colunas 5×5)</h2>
            ${epistemicBadge('FATO')}
            ${epistemicBadge('ESTATISTICA')}
          </div>
          <p class="text-xs text-slate-400">
            Fórmula de Shannon: H = -∑ p_i * log2(p_i) bits. Mede o grau de dispersão das 15 dezenas pelas 5 linhas e 5 colunas do volante.
          </p>
        </div>

        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 max-w-sm">
          <strong>Filtros Configuráveis (§17):</strong> Eventos extremos como linha com 0 ou linha com 5 ocorrem com probabilidade calculável e são tratados como filtros configuráveis, nunca como impossíveis.
        </div>
      </div>

      <!-- Métricas de Entropia: Linhas vs Colunas -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Entropia das Linhas -->
        <div class="glass-panel p-5 rounded-3xl space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider">Entropia das Linhas (Horizontal)</h3>
            <span class="text-xs font-mono-code text-cyan-400">Máx = 2.3219 bits</span>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs font-mono-code">
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span class="text-slate-500 block text-[10px] font-sans">Média Observada</span>
              <span class="text-xl font-bold text-white">${entropy.meanRowEntropy.toFixed(4)} bits</span>
              <span class="text-[10px] text-slate-400 font-sans block mt-1">σ = ${entropy.stdRowEntropy.toFixed(4)}</span>
            </div>

            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span class="text-slate-500 block text-[10px] font-sans">Expectativa Teórica</span>
              <span class="text-xl font-bold text-cyan-400">${th.entropyMean.toFixed(4)} bits</span>
              <span class="text-[10px] text-slate-400 font-sans block mt-1">Δ = ${(entropy.meanRowEntropy - th.entropyMean).toFixed(4)}</span>
            </div>
          </div>
        </div>

        <!-- Entropia das Colunas -->
        <div class="glass-panel p-5 rounded-3xl space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider">Entropia das Colunas (Vertical)</h3>
            <span class="text-xs font-mono-code text-cyan-400">Máx = 2.3219 bits</span>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs font-mono-code">
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span class="text-slate-500 block text-[10px] font-sans">Média Observada</span>
              <span class="text-xl font-bold text-white">${entropy.meanColEntropy.toFixed(4)} bits</span>
              <span class="text-[10px] text-slate-400 font-sans block mt-1">σ = ${entropy.stdColEntropy.toFixed(4)}</span>
            </div>

            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span class="text-slate-500 block text-[10px] font-sans">Expectativa Teórica</span>
              <span class="text-xl font-bold text-cyan-400">${th.entropyMean.toFixed(4)} bits</span>
              <span class="text-[10px] text-slate-400 font-sans block mt-1">Δ = ${(entropy.meanColEntropy - th.entropyMean).toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Frequência de Ocupação Extrema (0 ou 5 dezenas) -->
      <div class="glass-panel rounded-3xl overflow-hidden p-6 space-y-4">
        <div class="border-b border-slate-800 pb-3">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Taxas de Ocorrência de Configurações Extremas de Volante
            ${epistemicBadge('ESTATISTICA')}
          </h3>
          <p class="text-xs text-slate-400">Concursos em que ao menos uma linha ou coluna ficou completamente vazia (0 dezenas) ou preenchida (5 dezenas).</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono-code">
          <!-- Linha com 0 -->
          <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span class="text-[10px] font-sans text-slate-400 font-bold uppercase">Pelo menos 1 linha vazia</span>
            <div class="text-xl font-bold text-white">${(entropy.emptyRowFrequency * 100).toFixed(2)}%</div>
            <div class="text-[10px] text-slate-400 font-sans">Observado: ${entropy.emptyRowContestsCount} concursos</div>
            <div class="text-[10px] text-cyan-400 font-sans">Teórico: ${(th.pAnyEmpty * 100).toFixed(2)}%</div>
          </div>

          <!-- Linha com 5 -->
          <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span class="text-[10px] font-sans text-slate-400 font-bold uppercase">Pelo menos 1 linha cheia (5)</span>
            <div class="text-xl font-bold text-white">${(entropy.fullRowFrequency * 100).toFixed(2)}%</div>
            <div class="text-[10px] text-slate-400 font-sans">Observado: ${entropy.fullRowContestsCount} concursos</div>
            <div class="text-[10px] text-cyan-400 font-sans">Teórico: ${(th.pAnyFull * 100).toFixed(2)}%</div>
          </div>

          <!-- Coluna com 0 -->
          <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span class="text-[10px] font-sans text-slate-400 font-bold uppercase">Pelo menos 1 coluna vazia</span>
            <div class="text-xl font-bold text-white">${(entropy.emptyColFrequency * 100).toFixed(2)}%</div>
            <div class="text-[10px] text-slate-400 font-sans">Observado: ${entropy.emptyColContestsCount} concursos</div>
            <div class="text-[10px] text-cyan-400 font-sans">Teórico: ${(th.pAnyEmpty * 100).toFixed(2)}%</div>
          </div>

          <!-- Coluna com 5 -->
          <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span class="text-[10px] font-sans text-slate-400 font-bold uppercase">Pelo menos 1 coluna cheia (5)</span>
            <div class="text-xl font-bold text-white">${(entropy.fullColFrequency * 100).toFixed(2)}%</div>
            <div class="text-[10px] text-slate-400 font-sans">Observado: ${entropy.fullColContestsCount} concursos</div>
            <div class="text-[10px] text-cyan-400 font-sans">Teórico: ${(th.pAnyFull * 100).toFixed(2)}%</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
