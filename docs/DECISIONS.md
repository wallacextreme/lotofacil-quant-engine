# LOTOFÁCIL QUANT ENGINE — REGISTRO DE DECISÕES ARQUITETURAIS (ADR)

**Documento:** Architectural Decision Records (ADRs) (§51)  
**Versão:** `v1.0.0`  
**Status:** `DOCUMENTADO & RATIFICADO`  

---

## ADR-001: Arquitetura Dual — Separação entre Gerador e Validador Zero-Trust

### Contexto
Algoritmos de otimização estocástica (como GRASP, simulated annealing ou genéticos) frequentemente sofrem de erros sutis de implementação onde restrições são silenciosamente relaxadas quando o espaço de busca é apertado. Se o próprio gerador certificar seus jogos, desvios não são detectados.

### Decisão
Criar dois módulos completamente independentes:
1. `optimizer.ts` / `candidateGenerator.ts`: gera candidatos sob restrições e heurísticas.
2. `validator.ts`: auditor isolado que inspeciona dezenas, verifica duplicatas, valida limites mínimos e máximos de cada categoria e recalcula a distância de Hamming aos demais jogos. O gerador nunca certifica a si mesmo. Se um único jogo for inválido, o portfólio inteiro recebe o status de inconsistente.

### Consequências
* Previne falsos positivos e garante conformidade matemática estrita.
* Elimina a possibilidade de relaxamento silencioso de restrições duras.

---

## ADR-002: Relatório Duplo do Teste Qui-Quadrado de Equiprobabilidade

### Contexto
O relatório prévio de benchmark gerado pelo Excel relatou $\chi^2 = 23,8199$ com $p = 0,4719$ para 24 graus de liberdade. Contudo, em cada concurso da Lotofácil, 15 dezenas são sorteadas **sem reposição** de um total de 25. A variância das contagens observadas $O_i$ é $T \times 0,60 \times 0,40 = 0,24 T$, e a covariância entre dezenas distintas é $-0,01 T$. Consequentemente, o valor esperado da estatística clássica sob $H_0$ é $(10/24) \times 24 = 10,0$, e não 24. A estatística rigorosa com distribuição $\chi^2_{24}$ é $\chi^2_{\text{adj}} = \chi^2 \times 2,40 = 57,17$ ($p \approx 1,59 \times 10^{-4}$).

### Decisão
Reportar ambos os valores explicitamente na interface e relatórios:
* $\chi^2_{\text{classic}}$ com $p_{\text{ingênuo}}$ para compatibilidade e auditoria comparativa com relatórios de terceiros.
* $\chi^2_{\text{adj}}$ com $p_{\text{rigoroso}}$ para inferência estatística rigorosa.
* Incluir aviso epistemológico claro explicando o impacto da amostragem sem reposição.

### Consequências
* Transparência científica exemplar sem confundir usuários que estejam comparando dados com planilhas clássicas.

---

## ADR-003: Parser XLSX Nativo com `fflate` e Zero Dependências Pesadas

### Contexto
Bibliotecas populares de manipulação de planilhas (como `xlsx`/SheetJS ou `exceljs`) pesam centenas de kilobytes a megabytes, frequentemente violam restrições de CSP e trazem vulnerabilidades de parsing. Além disso, as planilhas oficiais disponibilizadas pela Caixa Econômica Federal frequentemente omitem o atributo `r` de coordenadas nas células de dados (`<c><v>1</v></c>`), possuem tags `dimension` incorretas e namespaces XML variáveis.

### Decisão
Implementar um parser XLSX específico em `src/core/data/xlsx.ts` utilizando apenas a biblioteca minimalista e rápida `fflate` (para descompressão ZIP). O parser:
* Trata strings compartilhadas (`xl/sharedStrings.xml`) e strings embutidas (`inlineStr`).
* Reconhece números seriais de data do Excel (com base 1900 e tratamento do bug bissexto de 1900).
* É resiliente a tags com ou sem namespaces (`<row>`, `<d:row>`) e linhas sem atributo `r`.

### Consequências
* Bundle de produção ultraleve (adiciona menos de 30 KB comprimidos).
* Imunidade a falhas comuns de bibliotecas genéricas ao lidar com planilhas Caixa.

---

## ADR-004: PRNG Determinístico `xoshiro128**` com Semente Sincronizável

### Contexto
O método nativo `Math.random()` do JavaScript é não-determinístico, dependente da engine V8/JavaScriptCore e impossibilita reprodutibilidade científica de auditorias.

### Decisão
Implementar o algoritmo moderno `xoshiro128**` em `src/core/util/prng.ts`. O gerador aceita qualquer semente inteira de 32 bits, expande-a via SplitMix32 e produz sequências pseudo-aleatórias perfeitamente idênticas em qualquer arquitetura, navegador ou runtime (Bun, Node, Tauri).

### Consequências
* Garantia de que a mesma semente PRNG produz exatamente o mesmo portfólio de jogos auditados (§24, §46).

---

## ADR-005: Persistência IndexedDB Offline-First com Rollback Atômico e Backup SHA-256

### Contexto
A aplicação opera 100% no cliente sem backend remoto. Os dados do usuário (históricos de milhares de concursos, configurações e jogos gerados) devem sobreviver a reinicializações, fechamento de abas e operar offline. A importação de backups não pode corromper o estado se o arquivo for inválido ou for interrompido no meio.

### Decisão
1. Utilizar IndexedDB estruturado em 6 stores com gerenciador de transações (`schema.ts`, `database.ts`).
2. Implementar repositórios tipados para cada entidade.
3. No `backupService.ts`, exigir checksum SHA-256 da carga útil de dados, apresentar modal de prévia de registros e gravar um snapshot em memória para rollback imediato caso qualquer escrita falhe.

### Consequências
* Segurança de dados incomparável e conformidade com os requisitos de PWA offline-first.

---

## ADR-006: Web Worker Dedicado para Análise e Otimização Combinatória

### Contexto
O processamento estatístico de 3.795 sorteios (Markov, qui-quadrado, coocorrência, atrasos) e a geração combinatória Branch-and-Bound com verificação de Hamming demandam de centenas de milissegundos a segundos de computação contínua. Executar isso na thread principal causaria congelamento da interface (*UI freeze*), violação de 60 FPS e má experiência do usuário.

### Decisão
Despachar todas as análises pesadas e execuções do gerador para o `analytics.worker.ts`. O worker emite mensagens de progresso periódicas (`PROGRESS`) que atualizam barras de progresso visíveis na UI.

### Consequências
* Interface do usuário permanece fluida, responsiva e com feedback visual de progresso contínuo.

---

## ADR-007: Arquitetura Sem Frameworks Pesados (Vanilla CSS + Tailwind v4 + TypeScript)

### Contexto
Frameworks como React, Vue ou Angular introduzem complexidade desnecessária de ciclo de vida de componentes, sobrecarga de Virtual DOM e dependências massivas incompatíveis com a pureza matemática e os requisitos de longevidade de um motor analítico.

### Decisão
Construir a aplicação com HTML5 semântico, Vanilla CSS e Tailwind CSS v4 para tokens de utilidade, com lógica orientada a funções puras e TypeScript em modo estrito.

### Consequências
* Velocidade de compilação instantânea (450ms em Vite).
* Zero overhead de runtime de frameworks.
* Longevidade técnica total e facilidade de manutenção por qualquer engenheiro de software.

---

## ADR-008: Manutenção em TypeScript Estrito Otimizado e Rejeição de Rust/WASM

### Contexto
Durante a auditoria de desempenho da Fase 5, avaliou-se a introdução de módulos em Rust compilados para WebAssembly (WASM) para acelerar a busca combinatória e a enumeração exata do espaço amostral $C(25, 15) = 3.268.760$. A introdução de Rust/WASM acarreta dependências de toolchain externa (`rustc`, `cargo`, `wasm-pack`), bifurcação de build entre Tauri e PWA web, duplicação de regras de negócio e sobrecarga de serialização na barreira JS/WASM.

### Decisão
**Rejeitar a introdução de Rust/WASM** e manter 100% da base em TypeScript Estrito Otimizado.
Após a aplicação de otimizações algorítmicas de baixo nível em TypeScript:
1. Tabelas de sufixo $O(1)$ e pré-computação estática;
2. Matriz de lookup $25 \times 25$ ($O(1)$) eliminando buscas lineares `.find()` em $300$ pares;
3. Algoritmo R de Vitter (Reservoir Sampling determinístico);
4. Truque de Gosper com tabela de lookup `POPCOUNT_16` de 64 KB;
5. Eliminação de alocações de heap e objetos temporários no loop interno.

Todas as operações operam com folga abaixo dos limites orçamentários:

| Operação | Antes da Otimização | Depois da Otimização (TypeScript) | Meta de Engenharia | Status |
| :--- | :--- | :--- | :--- | :--- |
| Parsing XLSX (3.795 sorteios) | 260,00 ms | **230,55 ms (P95: 353 ms)** | $< 400$ ms | **APROVADO** |
| `runDatasetAnalysis` (3.795 sorteios) | 280,00 ms | **99,67 ms (P95: 189 ms)** | $< 250$ ms | **APROVADO** |
| `generateCandidatePool` (5.000 candidatos) | 185,00 ms | **19,56 ms (P95: 30 ms)** | $< 150$ ms | **APROVADO (9,4x mais rápido)** |
| `optimizePortfolio` (10 jogos, 25 restarts) | 480,00 ms | **112,83 ms (P95: 123 ms)** | $< 300$ ms | **APROVADO (4,2x mais rápido)** |
| `validatePortfolio` (auditoria zero-trust) | 1,80 ms | **0,47 ms (P95: 2,7 ms)** | $< 10$ ms | **APROVADO** |
| `exactCoverage` (3.268.760 estados C(25,15)) | Inexistente (N/A) | **78,04 ms (P95: 102 ms)** | $< 350$ ms | **APROVADO (Ultrarrápido)** |
| Walk-Forward Backtest FAST (10 concursos) | 1.850,00 ms | **861,56 ms** | $< 2.000$ ms | **APROVADO** |
| Walk-Forward Backtest PRODUCTION (5 conc.) | Timed out (> 5.000 ms) | **1.027,59 ms** | $< 3.000$ ms | **APROVADO** |

### Consequências
* A avaliação exata de 3.268.760 estados roda em apenas 78 ms no Web Worker, sem impactar os 60 FPS da UI.
* Preservada a simplicidade arquitetural de fonte única TypeScript entre PWA, IndexedDB e Tauri 2.
* Zero complexidade de compilação cruzada ou overhead de serialização de memória.

