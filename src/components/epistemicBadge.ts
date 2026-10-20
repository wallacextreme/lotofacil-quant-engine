/**
 * Componente de Rótulo Epistemológico Obrigatório (§0).
 *
 * Categorias:
 * - FATO: Identidades e definições matemáticas dedutivas irrefutáveis.
 * - ESTATISTICA: Medições empíricas descritivas sobre o histórico.
 * - HEURISTICA: Estratégias práticas de busca e cobertura sem garantia formal.
 * - OTIMIZACAO: Algoritmos de melhoria de portfólio sob restrições.
 * - ASSUNCAO: Hipóteses metodológicas e parâmetros adotados.
 */
import type { EpistemicKind } from '../core/domain/types';

export function epistemicBadge(kind: EpistemicKind): string {
  switch (kind) {
    case 'FATO':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono-code bg-cyan-950 text-cyan-400 border border-cyan-800/80">FATO MATEMÁTICO</span>`;
    case 'ESTATISTICA':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono-code bg-violet-950 text-violet-300 border border-violet-800/80">ANÁLISE ESTATÍSTICA</span>`;
    case 'HEURISTICA':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono-code bg-amber-950 text-amber-300 border border-amber-800/80">HEURÍSTICA</span>`;
    case 'OTIMIZACAO':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono-code bg-emerald-950 text-emerald-300 border border-emerald-800/80">OTIMIZAÇÃO</span>`;
    case 'ASSUNCAO':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono-code bg-slate-800 text-slate-300 border border-slate-700">ASSUNÇÃO</span>`;
  }
}
