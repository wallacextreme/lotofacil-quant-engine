/**
 * Página do Gerador Combinatório & Otimização Multiobjetivo (§30).
 */
import { appState, type AppState } from '../app/state';
import type { GeneratorConfig, HardConstraints, PortfolioStrategy } from '../core/domain/types';
import { epistemicBadge } from '../components/epistemicBadge';
import { checkFeasibility } from '../core/combinatorial/filters';

export function renderGeneratorPage(state: AppState): string {
  const cfg = state.currentConfig;
  const c = cfg.constraints;
  const an = state.currentAnalysis;

  const context = an
    ? {
        lastDraw: an.summary.lastDrawNumbers,
        temperature: an.zScores.scores.map((s) => s.temperature),
      }
    : null;

  const feasibility = checkFeasibility(c, context);

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Title & Epistemic Header -->
      <div class="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Gerador de Combinações & Otimização</h2>
            ${epistemicBadge('OTIMIZACAO')}
            ${epistemicBadge('HEURISTICA')}
          </div>
          <p class="text-xs text-slate-400">
            Poda combinatória em árvore (Branch-and-Bound) com respeito irrestrito a restrições duras e distância de Hamming mínima.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button id="btn-reset-config" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition">
            Restaurar Padrões
          </button>
          <button id="btn-run-generator" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition flex items-center gap-2 ${feasibility.isFeasible ? '' : 'opacity-50 cursor-not-allowed'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            GERAR JOGOS
          </button>
        </div>
      </div>

      <!-- Live Feasibility Indicator (§12) -->
      ${
        feasibility.isFeasible
          ? `
        <div class="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between text-xs text-emerald-300">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <strong>Configuração Viável:</strong> Todos os intervalos e cotas solicitadas são matematicamente alcançáveis no espaço amostral.
          </div>
          <span class="text-[10px] font-mono-code text-emerald-400">Pool: ${cfg.poolSize} · Hamming: >= ${cfg.minHamming}</span>
        </div>
      `
          : `
        <div class="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-300">
          <div class="flex items-start gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0"></span>
            <div>
              <strong class="font-bold text-rose-200">CONFIGURAÇÃO INVIÁVEL (§12):</strong>
              <div class="text-[11px] text-rose-300/90 mt-0.5">
                ${feasibility.issues.map((i) => `<div>• ${i.explanation}</div>`).join('')}
              </div>
            </div>
          </div>
          <button id="btn-fix-thermal" class="px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-white font-medium text-[11px] shrink-0 border border-rose-700">
            Ajustar Parâmetros
          </button>
        </div>
      `
      }

      <!-- Progress Card (quando em execução) -->
      ${
        state.isProcessing
          ? `
        <div class="glass-panel p-5 rounded-2xl space-y-2 border border-cyan-800">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-cyan-400 flex items-center gap-2">
              <svg class="animate-spin w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ${state.progressStage}
            </span>
            <span class="font-mono-code font-bold text-white">${state.progressPercent}%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-200" style="width: ${state.progressPercent}%"></div>
          </div>
        </div>
      `
          : ''
      }

      <!-- Form Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Coluna 1: Hard Constraints -->
        <div class="lg:col-span-8 glass-panel p-6 rounded-3xl space-y-5">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Restrições Duras (Hard Constraints)
                ${epistemicBadge('FATO')}
              </h3>
              <p class="text-xs text-slate-400">Nenhuma aposta gerada pode violar qualquer um destes limites.</p>
            </div>
            <span class="text-xs font-mono-code text-cyan-400">100% Auditadas</span>
          </div>

          <!-- Campos de Intervalo -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono-code">
            <!-- Quantidade de Jogos -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Quantidade de Apostas</label>
              <input type="number" id="input-count" min="1" max="100" value="${cfg.count}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold focus:border-cyan-500 focus:outline-none" />
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Jogos no portfólio</span>
            </div>

            <!-- Soma -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Intervalo da Soma</label>
              <div class="flex items-center gap-2">
                <input type="number" id="input-sum-min" value="${c.sum?.min ?? 170}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
                <span class="text-slate-500">a</span>
                <input type="number" id="input-sum-max" value="${c.sum?.max ?? 220}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
              </div>
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Teórico: 195 (±18)</span>
            </div>

            <!-- Paridade (Pares) -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Pares (Paridade)</label>
              <div class="flex items-center gap-2">
                <input type="number" id="input-even-min" min="0" max="12" value="${c.even?.min ?? 7}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
                <span class="text-slate-500">a</span>
                <input type="number" id="input-even-max" min="0" max="12" value="${c.even?.max ?? 8}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
              </div>
              <span class="text-[9px] text-slate-500 font-sans block mt-1">7P/8I ou 8P/7I</span>
            </div>

            <!-- Primos -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Primos (2,3,5..)</label>
              <div class="flex items-center gap-2">
                <input type="number" id="input-prime-min" min="0" max="9" value="${c.prime?.min ?? 5}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
                <span class="text-slate-500">a</span>
                <input type="number" id="input-prime-max" min="0" max="9" value="${c.prime?.max ?? 6}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
              </div>
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Teórico: 5,4 primos</span>
            </div>

            <!-- Moldura -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Moldura (16 dezenas)</label>
              <div class="flex items-center gap-2">
                <input type="number" id="input-frame-min" min="6" max="16" value="${c.frame?.min ?? 9}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
                <span class="text-slate-500">a</span>
                <input type="number" id="input-frame-max" min="6" max="16" value="${c.frame?.max ?? 11}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
              </div>
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Teórico: 9,6 dezenas</span>
            </div>

            <!-- Fibonacci -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Fibonacci (1,2,3,5,8..)</label>
              <div class="flex items-center gap-2">
                <input type="number" id="input-fib-min" min="0" max="7" value="${c.fibonacci?.min ?? 3}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
                <span class="text-slate-500">a</span>
                <input type="number" id="input-fib-max" min="0" max="7" value="${c.fibonacci?.max ?? 5}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
              </div>
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Teórico: 4,2 dezenas</span>
            </div>

            <!-- Repetição do Concurso Anterior -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Repetição do Anterior</label>
              <div class="flex items-center gap-2">
                <input type="number" id="input-repeat-min" min="5" max="15" value="${c.repeat?.min ?? 8}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
                <span class="text-slate-500">a</span>
                <input type="number" id="input-repeat-max" min="5" max="15" value="${c.repeat?.max ?? 10}" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-center" />
              </div>
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Teórico: 9,0 dezenas</span>
            </div>

            <!-- Distância de Hamming Mínima -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-cyan-900/50 bg-cyan-950/10">
              <label class="text-[11px] font-sans font-bold text-cyan-300 block mb-1">Hamming Mínimo (dH)</label>
              <input type="number" id="input-min-hamming" min="2" max="20" step="2" value="${cfg.minHamming}" class="w-full bg-slate-950 border border-cyan-700 rounded-xl px-3 py-1.5 text-cyan-400 font-bold text-center focus:outline-none" />
              <span class="text-[9px] text-slate-400 font-sans block mt-1">dH ≥ 10 (máx 10 comuns)</span>
            </div>

            <!-- Seed Determinística -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Seed PRNG (Determinismo)</label>
              <input type="number" id="input-seed" value="${cfg.seed}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold text-center focus:outline-none" />
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Mesma seed = mesmo jogo</span>
            </div>

            <!-- Restrição de Linhas (§3) -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Restrição de Linhas (§3)</label>
              <select id="select-line-mode" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold text-xs focus:border-cyan-500 focus:outline-none">
                <option value="BALANCED" ${c.lineMode === 'BALANCED' ? 'selected' : ''}>Equilibrado (2 a 4 por linha)</option>
                <option value="STATISTICAL" ${c.lineMode === 'STATISTICAL' ? 'selected' : ''}>Estatístico (Padrões frequentes)</option>
                <option value="HYBRID" ${c.lineMode === 'HYBRID' ? 'selected' : ''}>Híbrido (Equilíbrio + Histórico)</option>
                <option value="FREE" ${c.lineMode === 'FREE' ? 'selected' : ''}>Livre (Sem restrição)</option>
              </select>
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Estrutura cartesiana do volante</span>
            </div>

            <!-- Composição da Carteira (§12, §14) -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Composição Carteira (§12, §14)</label>
              <select id="select-portfolio-strategy" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold text-xs focus:border-cyan-500 focus:outline-none">
                <option value="5_3_2" ${cfg.portfolioStrategy === '5_3_2' ? 'selected' : ''}>Modelo 5-3-2 (5 Est. / 3 Eq. / 2 Alt.)</option>
                <option value="HYBRID" ${cfg.portfolioStrategy === 'HYBRID' ? 'selected' : ''}>Estratégia F — Híbrida Completa</option>
                <option value="STATISTICAL" ${cfg.portfolioStrategy === 'STATISTICAL' ? 'selected' : ''}>Estratégia A — Estatística</option>
                <option value="CYCLE" ${cfg.portfolioStrategy === 'CYCLE' ? 'selected' : ''}>Estratégia B — Foco em Ciclo</option>
                <option value="LINES" ${cfg.portfolioStrategy === 'LINES' ? 'selected' : ''}>Estratégia C — Foco em Linhas</option>
                <option value="RELATIONSHIPS" ${cfg.portfolioStrategy === 'RELATIONSHIPS' ? 'selected' : ''}>Estratégia D — Relacionamentos</option>
                <option value="DIVERSIFICATION" ${cfg.portfolioStrategy === 'DIVERSIFICATION' ? 'selected' : ''}>Estratégia E — Diversificação</option>
              </select>
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Alocação estrutural de perfis</span>
            </div>

            <!-- Limite de Ausentes por Jogo (§10) -->
            <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label class="text-[11px] font-sans font-bold text-slate-300 block mb-1">Máx. Ausentes por Jogo (§10)</label>
              <input type="number" id="input-max-absent" min="1" max="10" value="${c.maxAbsentPerGame ?? 3}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold text-center" />
              <span class="text-[9px] text-slate-500 font-sans block mt-1">Evita concentração de atrasadas</span>
            </div>
          </div>

          <!-- Cotas Térmicas Opcionais Q/N/F -->
          <div class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="chk-enable-thermal" ${c.hot || c.neutral || c.cold ? 'checked' : ''} class="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700" />
                <span class="text-xs font-bold text-white">Ativar Cotas Térmicas Rígidas Q/N/F (§12)</span>
              </label>
              <span class="text-[10px] text-slate-400 font-mono-code">Disponíveis: ${feasibility.temperaturesAvailable.hot}Q / ${feasibility.temperaturesAvailable.neutral}N / ${feasibility.temperaturesAvailable.cold}F</span>
            </div>

            <div id="thermal-quotas-panel" class="grid grid-cols-3 gap-3 text-xs font-mono-code ${c.hot || c.neutral || c.cold ? '' : 'opacity-40 pointer-events-none'}">
              <div>
                <span class="text-rose-400 block mb-1 text-[10px] font-sans font-bold">Quentes (máx ${feasibility.temperaturesAvailable.hot})</span>
                <input type="number" id="input-hot-quota" min="0" max="15" value="${c.hot?.min ?? Math.min(5, feasibility.temperaturesAvailable.hot)}" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-center" />
              </div>
              <div>
                <span class="text-sky-400 block mb-1 text-[10px] font-sans font-bold">Neutras (máx ${feasibility.temperaturesAvailable.neutral})</span>
                <input type="number" id="input-neutral-quota" min="0" max="15" value="${c.neutral?.min ?? 7}" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-center" />
              </div>
              <div>
                <span class="text-slate-400 block mb-1 text-[10px] font-sans font-bold">Frias (máx ${feasibility.temperaturesAvailable.cold})</span>
                <input type="number" id="input-cold-quota" min="0" max="15" value="${c.cold?.min ?? Math.min(3, feasibility.temperaturesAvailable.cold)}" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-center" />
              </div>
            </div>
          </div>
        </div>

        <!-- Coluna 2: Soft Constraints & Pesos (§20) -->
        <div class="lg:col-span-4 glass-panel p-6 rounded-3xl space-y-4">
          <div class="border-b border-slate-800 pb-3">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Pesos de Scoring (Soft)
              ${epistemicBadge('HEURISTICA')}
            </h3>
            <p class="text-xs text-slate-400">Critérios de ranqueamento e cobertura no pool de elite.</p>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Frequência Global:</span>
                <span class="font-mono-code font-bold text-cyan-400" id="val-weight-freq">${cfg.weights.frequency.toFixed(1)}</span>
              </div>
              <input type="range" id="weight-frequency" min="0" max="5" step="0.5" value="${cfg.weights.frequency}" class="w-full accent-cyan-500" />
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Z-Score Local:</span>
                <span class="font-mono-code font-bold text-cyan-400" id="val-weight-zscore">${cfg.weights.zScore.toFixed(1)}</span>
              </div>
              <input type="range" id="weight-zscore" min="0" max="5" step="0.5" value="${cfg.weights.zScore}" class="w-full accent-cyan-500" />
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Atrasos (Gaps):</span>
                <span class="font-mono-code font-bold text-cyan-400" id="val-weight-delay">${cfg.weights.delay.toFixed(1)}</span>
              </div>
              <input type="range" id="weight-delay" min="0" max="5" step="0.5" value="${cfg.weights.delay}" class="w-full accent-cyan-500" />
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Transição Markoviana:</span>
                <span class="font-mono-code font-bold text-cyan-400" id="val-weight-markov">${cfg.weights.markov.toFixed(1)}</span>
              </div>
              <input type="range" id="weight-markov" min="0" max="5" step="0.5" value="${cfg.weights.markov}" class="w-full accent-cyan-500" />
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Coocorrência de Pares:</span>
                <span class="font-mono-code font-bold text-cyan-400" id="val-weight-cooc">${cfg.weights.cooccurrence.toFixed(1)}</span>
              </div>
              <input type="range" id="weight-cooccurrence" min="0" max="5" step="0.5" value="${cfg.weights.cooccurrence}" class="w-full accent-cyan-500" />
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Cobertura Marginal de Dezenas:</span>
                <span class="font-mono-code font-bold text-cyan-400" id="val-weight-cov">${cfg.weights.coverage.toFixed(1)}</span>
              </div>
              <input type="range" id="weight-coverage" min="0" max="5" step="0.5" value="${cfg.weights.coverage}" class="w-full accent-cyan-500" />
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Diversidade (Hamming):</span>
                <span class="font-mono-code font-bold text-cyan-400" id="val-weight-div">${cfg.weights.diversity.toFixed(1)}</span>
              </div>
              <input type="range" id="weight-diversity" min="0" max="5" step="0.5" value="${cfg.weights.diversity}" class="w-full accent-cyan-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function attachGeneratorEvents(state: AppState): void {
  const readConfigFromUi = (): GeneratorConfig => {
    const count = Number((document.getElementById('input-count') as HTMLInputElement)?.value || 10);
    const sumMin = Number((document.getElementById('input-sum-min') as HTMLInputElement)?.value || 170);
    const sumMax = Number((document.getElementById('input-sum-max') as HTMLInputElement)?.value || 220);
    const evenMin = Number((document.getElementById('input-even-min') as HTMLInputElement)?.value || 7);
    const evenMax = Number((document.getElementById('input-even-max') as HTMLInputElement)?.value || 8);
    const primeMin = Number((document.getElementById('input-prime-min') as HTMLInputElement)?.value || 5);
    const primeMax = Number((document.getElementById('input-prime-max') as HTMLInputElement)?.value || 6);
    const frameMin = Number((document.getElementById('input-frame-min') as HTMLInputElement)?.value || 9);
    const frameMax = Number((document.getElementById('input-frame-max') as HTMLInputElement)?.value || 11);
    const fibMin = Number((document.getElementById('input-fib-min') as HTMLInputElement)?.value || 3);
    const fibMax = Number((document.getElementById('input-fib-max') as HTMLInputElement)?.value || 5);
    const repeatMin = Number((document.getElementById('input-repeat-min') as HTMLInputElement)?.value || 8);
    const repeatMax = Number((document.getElementById('input-repeat-max') as HTMLInputElement)?.value || 10);
    const minHamming = Number(
      (document.getElementById('input-min-hamming') as HTMLInputElement)?.value || 10,
    );
    const seed = Number((document.getElementById('input-seed') as HTMLInputElement)?.value || 20261003);

    const enableThermal = (document.getElementById('chk-enable-thermal') as HTMLInputElement)?.checked;
    const hotQuota = Number((document.getElementById('input-hot-quota') as HTMLInputElement)?.value || 5);
    const neutralQuota = Number(
      (document.getElementById('input-neutral-quota') as HTMLInputElement)?.value || 7,
    );
    const coldQuota = Number((document.getElementById('input-cold-quota') as HTMLInputElement)?.value || 3);

    const lineMode = ((document.getElementById('select-line-mode') as HTMLSelectElement)?.value ??
      'BALANCED') as 'FREE' | 'BALANCED' | 'STATISTICAL' | 'HYBRID';

    const portfolioStrategy = ((document.getElementById('select-portfolio-strategy') as HTMLSelectElement)
      ?.value ?? '5_3_2') as PortfolioStrategy;

    const maxAbsentPerGame = Number(
      (document.getElementById('input-max-absent') as HTMLInputElement)?.value || 3,
    );

    const constraints: HardConstraints = {
      sum: { min: sumMin, max: sumMax },
      even: { min: evenMin, max: evenMax },
      prime: { min: primeMin, max: primeMax },
      frame: { min: frameMin, max: frameMax },
      core: { min: 15 - frameMax, max: 15 - frameMin },
      fibonacci: { min: fibMin, max: fibMax },
      repeat: { min: repeatMin, max: repeatMax },
      hot: enableThermal ? { min: hotQuota, max: hotQuota } : null,
      neutral: enableThermal ? { min: neutralQuota, max: neutralQuota } : null,
      cold: enableThermal ? { min: coldQuota, max: coldQuota } : null,
      allowEmptyRow: true,
      allowFullRow: true,
      allowEmptyCol: true,
      allowFullCol: true,
      fixedIncluded: state.currentConfig.constraints.fixedIncluded,
      excluded: state.currentConfig.constraints.excluded,
      lineMode,
      maxAbsentPerGame,
    };

    return {
      count,
      constraints,
      minHamming,
      seed,
      poolSize: state.currentConfig.poolSize,
      restarts: state.currentConfig.restarts,
      portfolioStrategy,
      weights: {
        frequency: Number((document.getElementById('weight-frequency') as HTMLInputElement)?.value || 1),
        zScore: Number((document.getElementById('weight-zscore') as HTMLInputElement)?.value || 1),
        delay: Number((document.getElementById('weight-delay') as HTMLInputElement)?.value || 1),
        markov: Number((document.getElementById('weight-markov') as HTMLInputElement)?.value || 0.5),
        cooccurrence: Number(
          (document.getElementById('weight-cooccurrence') as HTMLInputElement)?.value || 1,
        ),
        entropy: 1.0,
        dispersion: 1.5,
        coverage: Number((document.getElementById('weight-coverage') as HTMLInputElement)?.value || 2),
        diversity: Number((document.getElementById('weight-diversity') as HTMLInputElement)?.value || 2),
        cycle: 1.5,
        lineBalance: 1.5,
        pairRelationship: 1.0,
        casadas: 1.2,
        brigadas: 1.0,
      },
    };
  };

  // Live input handlers
  const inputs = document.querySelectorAll<HTMLInputElement>('#app-view input');
  inputs.forEach((inp) => {
    inp.addEventListener('input', () => {
      // Atualiza labels de slider
      if (inp.id === 'weight-frequency')
        document.getElementById('val-weight-freq')!.textContent = Number(inp.value).toFixed(1);
      if (inp.id === 'weight-zscore')
        document.getElementById('val-weight-zscore')!.textContent = Number(inp.value).toFixed(1);
      if (inp.id === 'weight-delay')
        document.getElementById('val-weight-delay')!.textContent = Number(inp.value).toFixed(1);
      if (inp.id === 'weight-markov')
        document.getElementById('val-weight-markov')!.textContent = Number(inp.value).toFixed(1);
      if (inp.id === 'weight-cooccurrence')
        document.getElementById('val-weight-cooc')!.textContent = Number(inp.value).toFixed(1);
      if (inp.id === 'weight-coverage')
        document.getElementById('val-weight-cov')!.textContent = Number(inp.value).toFixed(1);
      if (inp.id === 'weight-diversity')
        document.getElementById('val-weight-div')!.textContent = Number(inp.value).toFixed(1);
    });
  });

  document.getElementById('chk-enable-thermal')?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    const panel = document.getElementById('thermal-quotas-panel');
    if (panel) {
      if (checked) panel.classList.remove('opacity-40', 'pointer-events-none');
      else panel.classList.add('opacity-40', 'pointer-events-none');
    }
  });

  document.getElementById('btn-fix-thermal')?.addEventListener('click', () => {
    // Desativa cotas térmicas para restaurar viabilidade
    const chk = document.getElementById('chk-enable-thermal') as HTMLInputElement;
    if (chk) {
      chk.checked = false;
      chk.dispatchEvent(new Event('change'));
    }
  });

  document.getElementById('btn-run-generator')?.addEventListener('click', async () => {
    const cfg = readConfigFromUi();
    await appState.generateGames(cfg);
    appState.navigateTo('jogos');
  });
}
