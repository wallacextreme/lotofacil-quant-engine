# LOTOFÁCIL QUANT ENGINE — MANUAL DE TRANSIÇÃO (HANDOFF TO NEXT AGENT)

**Documento:** Instruções de Continuidade, Operação e Empacotamento (§54)  
**Versão:** `v1.0.0`  
**Status do Projeto:** `COMPLETO & AUDITADO`  

---

## 1. Instruções para o Próximo Engenheiro / Agente

Prezado colega arquiteto ou agente de IA, você está assumindo a base de código do **LOTOFÁCIL QUANT ENGINE**. A aplicação encontra-se em estado **100% implementada, testada e com Quality Gate verde**.

### Mandatos e Invariantes Absolutos (§1, §39):
1. **Zero Promessas de Predição:** Jamais introduza alegações de que o sistema "prevê números que vão sair" ou "aumenta a chance matemática do jogo individual". Mantenha sempre os badges epistemológicos (`FATO MATEMÁTICO`, `ANÁLISE ESTATÍSTICA`, `HEURÍSTICA`, `OTIMIZAÇÃO`, `ASSUNÇÃO`).
2. **Arquitetura Dual Inegociável:** Nunca permita que o gerador de apostas (`optimizer.ts`) certifique seus próprios jogos. Toda aposta gerada deve ser submetida ao validador zero-trust (`validator.ts`).
3. **Métrica Par de Hamming:** Lembre-se de que apostas de 15 dezenas possuem distância de Hamming $d_H(A, B) = 30 - 2|A \cap B|$, que é **sempre um número par**. O requisito padrão é $d_H \ge 4, 6, 8, 10$.
4. **Respeito ao Quality Gate:** Antes de qualquer commit ou entrega, execute `bun run gate` e garanta que todas as 4 etapas passem sem erros.

---

## 2. Comandos Operacionais Essenciais

Todos os comandos utilizam o runtime **Bun**:

```bash
# Executar a esteira de qualidade completa (Tipos, Lint, Testes, Build)
bun run gate

# Executar suíte completa de testes (18 testes, 69.458 asserções)
bun test

# Executar verificador estrito de tipos TypeScript
bun run typecheck

# Executar linter e formatador Biome
bun run lint
bun run lint:fix

# Iniciar servidor de desenvolvimento local
bun run dev

# Gerar bundle otimizado de produção em dist/
bun run build

# Pré-visualizar o build de produção localmente
bun run preview --port 4173

# Regenerar ícones PWA e Tauri a partir do SVG mestre
bun run icons

# Iniciar compilação nativa desktop Tauri 2
bun run tauri build
```

---

## 3. Mapa de Arquivos Chave

| Módulo | Caminho do Arquivo | Função Principal |
|---|---|---|
| **Ponto de Entrada** | [`src/main.ts`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/main.ts) | Bootstrap da UI, roteamento e listeners |
| **Gerenciador de Estado** | [`src/app/state.ts`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/app/state.ts) | Estado global reativo e ponte com Web Worker |
| **Worker Assíncrono** | [`src/workers/analytics.worker.ts`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/workers/analytics.worker.ts) | Execução em background de análises e GRASP |
| **Parser XLSX** | [`src/core/data/xlsx.ts`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/data/xlsx.ts) | Leitura de planilhas Caixa sem DOM |
| **Qui-Quadrado** | [`src/core/statistics/chiSquare.ts`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/statistics/chiSquare.ts) | Teste Pearson + Ajuste de População Finita |
| **Busca em Árvore** | [`src/core/combinatorial/candidateGenerator.ts`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/candidateGenerator.ts) | DFS com poda por limites acumulados |
| **Otimizador** | [`src/core/combinatorial/optimizer.ts`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/optimizer.ts) | GRASP com Hamming estrito |
| **Auditor Zero-Trust** | [`src/core/combinatorial/validator.ts`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/validator.ts) | Validador independente de conformidade |
| **Backup & Rollback** | [`src/services/backupService.ts`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/services/backupService.ts) | Exportação/Restauração atômica com SHA-256 |
| **Configuração Tauri** | [`src-tauri/tauri.conf.json`](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src-tauri/tauri.conf.json) | Configuração de empacotamento Windows e Android |

---

## 4. Como Executar Testes Específicos

```bash
# Executar apenas testes científicos unitários
bun test tests/unit/scientific.test.ts

# Executar apenas testes de otimização combinatória
bun test tests/unit/combinatorial.test.ts

# Executar apenas testes de persistência IndexedDB
bun test tests/integration/persistence.test.ts

# Executar o pipeline E2E completo de regressão
bun test tests/regression/flow.test.ts
```
