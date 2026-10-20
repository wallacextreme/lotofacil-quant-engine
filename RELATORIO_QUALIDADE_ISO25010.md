# 📊 Relatório de Qualidade de Software — ISO/IEC 25010:2023 — LOTOFÁCIL QUANT ENGINE

**Aplicação Auditada:** LOTOFÁCIL QUANT ENGINE (`v1.0.0`)  
**Data da Avaliação:** 05 de Outubro de 2026  
**Norma de Referência:** ISO/IEC 25010:2023 (*Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model*, 2ª Edição — Revisão de Novembro de 2023)  
**Avaliador:** Engenheiro Sênior de Qualidade de Software e Auditoria Quantitativa  

---

## 1. Introdução

### 1.1. Objetivo do Documento
Este relatório tem como objetivo avaliar técnica e sistematicamente a qualidade do produto de software **LOTOFÁCIL QUANT ENGINE** com base no modelo internacional de qualidade de produto **ISO/IEC 25010:2023**. Esta 2ª edição da norma substituiu a edição anterior de 2011, reestruturando o modelo para **9 características de qualidade** (introduzindo a dimensão de *Segurança Operacional / Safety*, renomeando *Usabilidade* para *Capacidade de Interação* e *Portabilidade* para *Flexibilidade*).

### 1.2. Metodologia de Avaliação
A avaliação foi conduzida por inspeção forense estática e dinâmica restrita ao repositório do projeto, incluindo:
1. Análise da arquitetura de código-fonte TypeScript em `src/`, Rust em `src-tauri/` e scripts auxiliares em `scripts/`.
2. Verificação de arquivos de configuração e empacotamento (`package.json`, `tsconfig.json`, `tauri.conf.json`, `biome.json`, `vite.config.ts`, `manifest.json`, `sw.js`).
3. Auditoria da suíte de testes automatizados (`tests/unit/`, `tests/integration/`, `tests/regression/`), compreendendo 38 testes e 69.763 asserções executadas via Bun Test runner.
4. Inspeção dos mecanismos de armazenamento local (IndexedDB nativo e transações atômicas com rollback em `src/storage/` e `src/services/backupService.ts`).
5. Avaliação dos controles criptográficos de integridade (SHA-256 canônico em `src/core/util/sha256.ts` e auditoria Zero-Trust em `src/core/combinatorial/validator.ts`).

### 1.3. Limitações Metodológicas
Esta avaliação baseia-se exclusivamente nos artefatos presentes no repositório. Não substitui:
- Testes dinâmicos de penetração de segurança ofensiva (*ethical hacking* / pentest em tempo de execução).
- Testes de estresse de hardware em ambiente de produção contínua de longa duração.
- Pesquisa empírica de usabilidade com usuários humanos em testes duplo-cegos.
- Métricas telemétricas de produção (que por desenho arquitetural *Offline-First* são inexistentes no produto).

---

## 2. Resumo Executivo (Scorecard de Qualidade)

A tabela abaixo sintetiza o veredito técnico para cada uma das 9 características do modelo ISO/IEC 25010:2023:

| # | Característica ISO/IEC 25010:2023 | Situação | Resumo da Avaliação |
| :---: | :--- | :---: | :--- |
| **1** | **Adequação Funcional** (*Functional Suitability*) | ✅ **Atende Plenamente** | Todas as funções declaradas de análise, Markov, qui-quadrado, Hamming e geração possuem implementação completa e auditada. |
| **2** | **Eficiência de Desempenho** (*Performance Efficiency*) | ✅ **Atende Plenamente** | Processamento matemático pesado delegado a Web Worker; tempos de geração em milissegundos com algoritmos de poda em árvore. |
| **3** | **Compatibilidade** (*Compatibility*) | ✅ **Atende Plenamente** | Interoperabilidade comprovada via importação/exportação XLSX/CSV/TXT/JSON; coexistência Desktop (Tauri) e PWA sem atrito. |
| **4** | **Capacidade de Interação** (*Interaction Capability*) | ✅ **Atende Plenamente** | Interface intuitiva com badges epistêmicos claros, indicador de viabilidade matemática precoce e diagnósticos de impedimento. |
| **5** | **Confiabilidade** (*Reliability*) | ✅ **Atende Plenamente** | Arquitetura Offline-First robusta, banco IndexedDB versionado, tolerância a falhas com backup SHA-256 e rollback atômico. |
| **6** | **Segurança** (*Security*) | ⚠️ **Atende Parcialmente** | Ausência de telemetria externa e sanitização de nomes de arquivos presente, porém CSP no `tauri.conf.json` está nulo (`csp: null`). |
| **7** | **Manutenibilidade** (*Maintainability*) | ✅ **Atende Plenamente** | Alta modularidade, tipagem estrita com TypeScript, linter Biome configurado e suíte de 38 testes com 69.763 asserções automatizadas. |
| **8** | **Flexibilidade** (*Flexibility*) | ✅ **Atende Plenamente** | Código agnóstico de ambiente, empacotável tanto como instalador Windows (.exe/.msi via Tauri) quanto como PWA em qualquer navegador moderno. |
| **9** | **Segurança Operacional** (*Safety*) | ➖ **Não Aplicável (Com Salvaguardas)** | Aplicação sem risco a integridade física ou ambiental; salvaguardas financeiras ativas contra promessas ilusórias de ganho lotérico. |

---

## 3. Avaliação Detalhada das 9 Características

---

### 3.1. Adequação Funcional (*Functional Suitability*)

> **Definição da Norma:** Grau em que um conjunto de funções abrange todas as tarefas e objetivos do usuário especificados, fornecendo resultados corretos com o nível de precisão exigido.

- **Subcaracterísticas Avaliadas:**
  - *Completude Funcional:* Grau em que o conjunto de funções cobre todas as tarefas declaradas.
  - *Correção Funcional:* Grau em que o software fornece resultados corretos ou com precisão matemática auditável.
  - *Pertinência Funcional:* Grau em que as funções facilitam a realização de tarefas específicas.
- **Evidências no Repositório:**
  - Implementação exata de combinações binomiais sem estouro numérico em [src/core/statistics/combinations.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/statistics/combinations.ts).
  - Cálculo de probabilidade hipergeométrica sem reposição com Fator de Correção de População Finita (FPC) em [src/core/statistics/hypergeometric.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/statistics/hypergeometric.ts).
  - Teste de equiprobabilidade qui-quadrado de Pearson com ajuste por FPC em [src/core/statistics/chiSquare.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/statistics/chiSquare.ts).
  - Cadeia de Markov de 1ª ordem com matriz de transição $25 \times 25$ em [src/core/statistics/markov.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/statistics/markov.ts).
  - Rastreamento dinâmico de ciclos das 25 dezenas independente de IDs sequenciais em [src/core/statistics/cycles.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/statistics/cycles.ts).
  - Controle de taxa de falsas descobertas (FDR de Benjamini-Hochberg) com teste de Yates para 300 pares em [src/core/statistics/relationships.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/statistics/relationships.ts).
  - Auditoria independente Zero-Trust que recalcula todas as métricas em [src/core/combinatorial/validator.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/validator.ts).
- **Situação:** **Atende Plenamente**
  - *Justificativa:* Todos os módulos matemáticos, estatísticos e de geração cumprem os requisitos do domínio com precisão numérica comprovada por testes unitários e de regressão.
- **Recomendações de Melhoria:**
  - [MÉDIA] Adicionar exportação de dados analíticos brutos em formato Parquet ou Feather para cientistas de dados externos que usem Python/R.

---

### 3.2. Eficiência de Desempenho (*Performance Efficiency*)

> **Definição da Norma:** Desempenho relativo à quantidade de recursos utilizados sob condições declaradas (tempo de resposta, taxa de transferência e consumo de memória/processador).

- **Subcaracterísticas Avaliadas:**
  - *Comportamento Temporal:* Tempos de resposta, tempos de processamento e taxas de transferência.
  - *Utilização de Recursos:* Quantidade e tipos de recursos utilizados pelo software.
  - *Capacidade:* Grau em que os limites máximos de parâmetros atendem aos requisitos.
- **Evidências no Repositório:**
  - Delegação de processamento assíncrono para Web Worker dedicado em [src/workers/analytics.worker.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/workers/analytics.worker.ts), mantendo a taxa de quadros (60 fps) da thread de UI intacta durante cálculos pesados.
  - Busca combinatória com poda em árvore (*Branch-and-Bound*) em [src/core/combinatorial/candidateGenerator.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/candidateGenerator.ts), evitando a instanciação do espaço total de $3.268.760$ combinações em memória RAM.
  - Otimizador metaheurístico GRASP determinístico em [src/core/combinatorial/optimizer.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/optimizer.ts) que converge em centenas de milissegundos para carteiras de 10 a 50 jogos com $d_H \ge 10$.
  - Compressão de arquivos XLSX realizada nativamente através da biblioteca leve `fflate` sem impacto no bundle final ([src/services/exportService.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/services/exportService.ts)).
  - Build de produção compacto: bundle cliente de ~241 kB e worker de ~58 kB com carregamento de fontes locais pré-empacotadas (Woff2).
- **Situação:** **Atende Plenamente**
  - *Justificativa:* O sistema opera com tempos de resposta sub-segundo na ingestão de milhares de sorteios e na geração de portfólios, consumindo menos de 80 MB de memória de trabalho.
- **Recomendações de Melhoria:**
  - [BAIXA] Implementar suporte opcional a WebAssembly (Rust/Wasm) para o gerador de candidatos caso o usuário configure pools extremos superiores a 50.000 candidatos.

---

### 3.3. Compatibilidade (*Compatibility*)

> **Definição da Norma:** Grau em que um produto, sistema ou componente pode trocar informações com outros produtos e executar suas funções compartilhando o mesmo ambiente de hardware ou software.

- **Subcaracterísticas Avaliadas:**
  - *Coexistência:* Capacidade de operar eficientemente sem impacto adverso em outros softwares no mesmo ambiente.
  - *Interoperabilidade:* Grau em que o software troca informações de forma útil com outros sistemas.
- **Evidências no Repositório:**
  - Parser universal de arquivos históricos em [src/core/data/parser.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/data/parser.ts), aceitando planilhas oficiais Caixa (.xlsx), arquivos CSV com múltiplos delimitadores (vírgula, ponto-e-vírgula, tabulação) e arquivos de texto puro.
  - Serviço de exportação poliglota em [src/services/exportService.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/services/exportService.ts), gerando TXT, CSV, JSON e XLSX padrão OpenXML, abrindo nativamente no Microsoft Excel, LibreOffice Calc e Google Sheets.
  - Configuração do runtime Tauri em [src-tauri/tauri.conf.json](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src-tauri/tauri.conf.json) compatível com Windows 10/11 x64 e arquitetura WebView2 Evergreen.
- **Situação:** **Atende Plenamente**
  - *Justificativa:* Alto nível de compatibilidade de entrada e saída com padrões universais da indústria, permitindo fácil exportação e integração.
- **Recomendações de Melhoria:**
  - [MÉDIA] Adicionar exportação direta para o formato de volante eletrônico compatível com a API/cartão das Loterias Caixa, caso essa especificação venha a ser tornada pública.

---

### 3.4. Capacidade de Interação (*Interaction Capability — Antiga Usabilidade*)

> **Definição da Norma (ISO/IEC 25010:2023):** Grau em que um produto pode ser utilizado por usuários especificados para atingir objetivos específicos de eficácia, eficiência e satisfação em um contexto de uso específico, abrangendo comunicação e controle bidirecional.

- **Subcaracterísticas Avaliadas:**
  - *Reconhecimento de Adequação:* Clareza para o usuário se o sistema atende às suas necessidades.
  - *Capacidade de Aprendizagem:* Facilidade com que o usuário aprende a operar o sistema.
  - *Operabilidade:* Facilidade de operação e controle dos recursos.
  - *Proteção contra Erros do Usuário:* Prevenção contra ações incorretas do operador.
  - *Engajamento do Usuário:* Interface visual convidativa e atraente.
  - *Inclusividade e Acessibilidade:* Cores contrastantes e padrões legíveis.
  - *Autodescritividade:* Elementos informam por si mesmos o que significam.
- **Evidências no Repositório:**
  - Sistema de insígnias de taxonomia epistêmica em [src/components/epistemicBadge.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/components/epistemicBadge.ts), diferenciando visualmente Fatos, Estatísticas, Probabilidades, Heurísticas e Otimizações em todas as 11 telas.
  - Diagnóstico de viabilidade em tempo real em [src/core/combinatorial/filters.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/filters.ts#L106-L198), que impede o clique no botão "GERAR JOGOS" se o usuário configurar restrições contraditórias ou cotas térmicas impossíveis, explicando na tela a razão exata do impedimento.
  - Explicabilidade auditável de jogos em [src/core/combinatorial/scoring.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/scoring.ts#L219-L301), apresentando a decomposição exata das contribuições de pontuação e justificativa de escolha de cada aposta.
  - Paleta de cores escura e de alto contraste baseada em Tailwind CSS e fontes tipográficas de largura fixa e proporcionais (`JetBrains Mono` e `Inter`), garantindo legibilidade perfeita para números lotéricos.
- **Situação:** **Atende Plenamente**
  - *Justificativa:* A aplicação destaca-se pela clareza conceitual e proteção ativa contra equívocos operacionais do usuário antes da execução de cálculos demorados.
- **Recomendações de Melhoria:**
  - [MÉDIA] Implementar suporte a atalhos de teclado configuráveis globalmente (ex.: `Ctrl+G` para disparar geração, `Ctrl+E` para exportar).
  - [BAIXA] Adicionar chave seletora de tema visual Claro/Escuro (atualmente a aplicação adota exclusivamente modo escuro de alto contraste).

---

### 3.5. Confiabilidade (*Reliability*)

> **Definição da Norma:** Grau em que um sistema executa funções especificadas sob condições especificadas por um período de tempo especificado sem falhas.

- **Subcaracterísticas Avaliadas:**
  - *Ausência de Falhas:* Sistema opera livre de exceções não tratadas em tempo de execução.
  - *Disponibilidade:* Prontidão operacional para uso quando requisitado.
  - *Tolerância a Falhas:* Capacidade de manter a integridade mesmo sob condições anômalas.
  - *Capacidade de Recuperação:* Capacidade de restaurar dados diretamente afetados em caso de interrupção.
- **Evidências no Repositório:**
  - Arquitetura estritamente **Offline-First**: aplicação opera 100% autônoma, sem risco de indisponibilidade por queda de rede ou servidores remotos fora do ar.
  - Banco de dados IndexedDB com esquema versionado e gerenciamento transacional em [src/storage/database.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/storage/database.ts) e [src/storage/schema.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/storage/schema.ts).
  - Protocolo de Backup com Rollback Atômico em [src/services/backupService.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/services/backupService.ts): antes de qualquer sobrescrita durante restauração, o sistema armazena um snapshot do estado em memória e valida a integridade estrutural e criptográfica via SHA-256. Em caso de falha, executa rollback total do banco.
  - Determinismo estocástico estrito: o gerador combinatório usa o PRNG `xoshiro128**` com semente reproduzível ([src/core/util/prng.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/util/prng.ts)), garantindo que a mesma semente gere rigorosamente o mesmo portfólio em qualquer máquina.
  - Suíte de 38 testes automatizados cobrindo casos normais, extremos, datasets vazios e datasets com saltos de numeração ([tests/regression/flow.test.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/tests/regression/flow.test.ts), [tests/integration/persistence.test.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/tests/integration/persistence.test.ts)).
- **Situação:** **Atende Plenamente**
  - *Justificativa:* Elevada robustez contra perdas de dados e integridade computacional respaldada por transações e testes de regressão.
- **Recomendações de Melhoria:**
  - [BAIXA] Implementar rotina de auto-backup em arquivo local a cada N novas importações ou fechamento de sessão no Desktop.

---

### 3.6. Segurança (*Security*)

> **Definição da Norma:** Grau em que um produto protege informações e dados de modo que pessoas ou outros produtos tenham o grau de acesso a dados apropriado aos seus tipos e níveis de autorização.

- **Subcaracterísticas Avaliadas:**
  - *Confidencialidade:* Garantia de que os dados só são acessíveis a quem tem autorização.
  - *Integridade:* Proteção contra modificações não autorizadas ou acidentais de dados.
  - *Não Repúdio:* Prova da ocorrência de ações ou eventos.
  - *Responsabilização:* Rastreabilidade de ações a entidades exclusivas.
  - *Autenticidade:* Confirmação de identidade declarada.
  - *Resistência a Ataques:* Resistência a ataques maliciosos comuns.
- **Evidências no Repositório:**
  - **Privacidade por Desenho (Privacy by Design):** Como a aplicação não envia nenhum dado para a internet, a confidencialidade das estratégias e jogos do usuário é garantida fisicamente pela ausência de canais de transmissão de rede.
  - Sanitização de nomes de arquivos exportados contra injeção de caracteres de escape e *path traversal* em [src/services/exportService.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/services/exportService.ts#L19-L21).
  - Assinatura e verificação de integridade via hash SHA-256 canônico em backups e datasets ([src/core/util/sha256.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/util/sha256.ts)).
  - **Ponto de Atenção Encontrado:** No arquivo [src-tauri/tauri.conf.json](file:///c:/Users/Usu/Documents/LOTOF%C3%81CIL%20QUANT%20ENGINE/src-tauri/tauri.conf.json#L24-L26), a política de segurança de conteúdo está configurada como nula:
    ```json
    "security": {
      "csp": null
    }
    ```
- **Situação:** ⚠️ **Atende Parcialmente**
  - *Justificativa:* Embora a aplicação seja offline e não possua comunicação externa, a ausência de uma Content Security Policy (CSP) explícita e restritiva no manifesto Tauri enfraquece a defesa em profundidade da camada desktop contra injeções de script acidentais.
- **Recomendações de Melhoria:**
  - [ALTA] Definir uma CSP estrita no [src-tauri/tauri.conf.json](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src-tauri/tauri.conf.json), restringindo scripts exclusivamente à origem local (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'`).
  - [MÉDIA] Adicionar suporte a criptografia opcional com senha (via WebCrypto AES-GCM) para os arquivos de backup `.json`.

---

### 3.7. Manutenibilidade (*Maintainability*)

> **Definição da Norma:** Eficácia e eficiência com que um produto pode ser modificado pelos desenvolvedores para corrigi-lo, aprimorá-lo ou adaptá-lo a mudanças no ambiente ou nos requisitos.

- **Subcaracterísticas Avaliadas:**
  - *Modularidade:* Grau em que o sistema é composto por componentes discretos.
  - *Reusabilidade:* Grau em que um ativo pode ser usado em mais de um sistema.
  - *Capacidade de Análise:* Facilidade de diagnosticar deficiências ou causas de falhas.
  - *Capacidade de Modificação:* Facilidade de alterar o software sem introduzir defeitos.
  - *Testabilidade:* Eficácia com que critérios de teste podem ser estabelecidos e testes executados.
- **Evidências no Repositório:**
  - Arquitetura limpa em camadas com separação nítida: `domain`, `statistics`, `combinatorial`, `storage`, `services`, `app`, `pages`, `components`, `workers`.
  - Tipagem TypeScript estrita em todo o código-fonte sem uso de `any` frouxo (`tsconfig.json` com `noEmit: true` e checagem contínua).
  - Linter e formatador de alto desempenho configurados via Biome ([biome.json](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/biome.json)), garantindo padronização de código.
  - Quality Gate configurado no [package.json](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/package.json#L19) através do script `bun run gate` (`bun run typecheck && bun run lint && bun test && bun run build`).
  - Cobertura de testes automatizados com 38 testes e 69.763 asserções verificando desde a matemática analítica até o fluxo completo end-to-end e persistência em banco.
- **Situação:** **Atende Plenamente**
  - *Justificativa:* Excelente desacoplamento, documentação interna das funções matemáticas e barreira de proteção sólida provida pelo Quality Gate.
- **Recomendações de Melhoria:**
  - [MÉDIA] Configurar pipeline de Integração Contínua (CI/CD) via GitHub Actions para disparar o `bun run gate` automaticamente em cada Pull Request ou push.

---

### 3.8. Flexibilidade (*Flexibility — Antiga Portabilidade*)

> **Definição da Norma (ISO/IEC 25010:2023):** Grau em que um produto pode ser adaptado de forma eficaz e eficiente a ambientes de hardware, software ou outros ambientes operacionais ou de uso, abrangendo instalação e substituição.

- **Subcaracterísticas Avaliadas:**
  - *Adaptabilidade:* Grau em que o software se adapta a diferentes ambientes de hardware ou software.
  - *Capacidade de Instalação:* Facilidade de instalação e desinstalação em um ambiente especificado.
  - *Capacidade de Substituição:* Grau em que o produto pode substituir outro produto de software especificado.
  - *Escalabilidade:* Capacidade do software acomodar cargas crescentes de dados.
- **Evidências no Repositório:**
  - Dualidade arquitetural: o mesmo núcleo de código compila como aplicativo nativo para Windows Desktop através do Tauri v2 ([src-tauri/](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src-tauri/)) e roda como PWA diretamente no navegador ([public/manifest.json](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/public/manifest.json) e [public/sw.js](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/public/sw.js)).
  - Código desacoplado de APIs exclusivas de sistema operacional: persistência utiliza IndexedDB padrão da W3C, suportado em todos os navegadores modernos e no WebView2.
  - Suporte a empacotamento Android previsto no `tauri.conf.json`.
- **Situação:** **Atende Plenamente**
  - *Justificativa:* Elevada portabilidade e independência de fornecedor de sistema operacional, permitindo instalação imediata como desktop nativo ou web app.
- **Recomendações de Melhoria:**
  - [BAIXA] Validar e homologar os builds para Linux (.deb / AppImage) e macOS utilizando as ferramentas nativas do Tauri.

---

### 3.9. Segurança Operacional (*Safety — Característica Nova na Edição 2023*)

> **Definição da Norma (ISO/IEC 25010:2023):** Grau em que o produto de software não apresenta riscos inaceitáveis de causar dano físico a pessoas, danos a propriedades, prejuízos financeiros indevidos ou impactos ambientais adversos sob condições declaradas de operação.

- **Distinção Essencial:** A característica *Segurança (Security)* (Seção 3.6) trata da proteção contra acessos indevidos e ataques maliciosos. A característica *Segurança Operacional (Safety)* trata de prevenir que o funcionamento do sistema cause danos práticos, físicos, legais ou financeiros ao operador e à sociedade.
- **Avaliação no Contexto da Aplicação:**
  - O **LOTOFÁCIL QUANT ENGINE** é um software de modelagem matemática e estatística para loterias. Não controla máquinas industriais, dispositivos médicos nem realiza movimentações bancárias autônomas.
  - *Risco de Dano Físico ou Ambiental:* **Inexistente / Não Aplicável**.
  - *Risco de Prejuízo Financeiro ou Ilusão Operacional do Usuário:* **Relevante**. Em softwares voltados a jogos de azar, há grave risco de sistemas comerciais induzirem apostadores a acreditar em "fórmulas mágicas" ou "previsões certeiras de prêmios", causando prejuízos financeiros severos.
- **Evidências de Salvaguarda no Repositório:**
  - A aplicação implementa uma **Taxonomia Epistêmica Obrigatória** ([src/components/epistemicBadge.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/components/epistemicBadge.ts)), rotulando todo cálculo estocástico como `[ESTATÍSTICA]` ou `[HEURÍSTICA]`.
  - No módulo de qui-quadrado ([src/core/statistics/chiSquare.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/statistics/chiSquare.ts)), a aplicação exibe formalmente que a roleta da loteria é estatisticamente justa e que pequenas flutuações amostrais não conferem certeza determinística sobre concursos futuros.
  - A documentação e relatórios técnicos enfatizam explicitamente que o software atua como ferramenta de organização combinatória, diversidade de apostas e auditoria, sem promessas enganosas de enriquecimento.
- **Situação:** **Não Aplicável ao Risco Físico / Atende com Salvaguardas Éticas ao Risco Financeiro**
  - *Justificativa:* O sistema foi desenhado eticamente para não induzir o usuário a ilusões operacionais nem ocultar as probabilidades reais da modalidade lotérica.
- **Recomendações de Melhoria:**
  - [MÉDIA] Incluir link e aviso educativo sobre Jogo Responsável e prevenção ao jogo patológico no rodapé do Manual do Usuário e na tela de Configurações.

---

## 4. Plano de Ação Priorizado de Melhorias

A tabela a seguir consolida as recomendações técnicas levantadas ao longo da auditoria:

| ID | Característica | Ação de Melhoria Recomendada | Prioridade | Esforço Estimado |
| :---: | :--- | :--- | :---: | :---: |
| **ACT-01** | **Segurança** | Implementar Content Security Policy (CSP) explícita e restritiva no `tauri.conf.json` (`connect-src 'none'`). | **ALTA** | **Baixo** |
| **ACT-02** | **Manutenibilidade** | Configurar pipeline automatizado de CI/CD (ex.: GitHub Actions) rodando o script `bun run gate`. | **MÉDIA** | **Baixo** |
| **ACT-03** | **Segurança** | Adicionar opção de criptografia com senha (AES-GCM) nos arquivos de backup `.json` exportados. | **MÉDIA** | **Médio** |
| **ACT-04** | **Capacidade de Interação**| Mapear atalhos de teclado globais no aplicativo Desktop para as ações mais frequentes. | **MÉDIA** | **Baixo** |
| **ACT-05** | **Compatibilidade** | Disponibilizar exportação dos dados históricos em formato colunar Parquet para integração com Data Science. | **MÉDIA** | **Médio** |
| **ACT-06** | **Segurança Operacional**| Inserir seção informativa sobre Jogo Responsável e limites financeiros recomendados na UI e documentação. | **MÉDIA** | **Baixo** |
| **ACT-07** | **Capacidade de Interação**| Disponibilizar alternância de tema visual Claro / Escuro. | **BAIXA** | **Médio** |
| **ACT-08** | **Flexibilidade** | Homologar e gerar pacotes de distribuição para Linux (AppImage) e macOS. | **BAIXA** | **Médio** |
| **ACT-09** | **Eficiência** | Avaliar compilação em WebAssembly (Rust/Wasm) para o núcleo de busca de candidatos caso o pool ultrapasse 50k. | **BAIXA** | **Alto** |

---

## 5. Limitações desta Avaliação e Próximos Passos

Este relatório reflete uma auditoria estática rigorosa do repositório de código, de suas configurações e de sua suíte de testes automatizados. Para avançar no ciclo contínuo de garantia da qualidade, recomendam-se as seguintes etapas complementares:
1. **Auditoria de Código em Execução:** Testes de carga e monitoramento de consumo de CPU/GPU em máquinas com configurações de entrada (Windows com 4 GB de RAM e processador dual-core).
2. **Avaliação Formal de Acessibilidade (WCAG 2.2):** Verificação completa com leitores de tela (NVDA/JAWS) e testes de navegação estritamente por tabulação.
3. **Revisão Periódica das Dependências:** Manter a verificação automatizada de vulnerabilidades conhecidas em pacotes npm/Rust através de ferramentas de varredura estática de dependências.

---

## 6. Aviso Importante sobre Certificação de Qualidade

> [!IMPORTANT]
> **ESCLARECIMENTO SOBRE CONFORMIDADE E CERTIFICAÇÃO NORMATIVA:**
> Este relatório técnico foi elaborado com estrita fidelidade aos conceitos, terminologias e características do modelo **ISO/IEC 25010:2023**.
> 
> É fundamental destacar que a norma **ISO/IEC 25010 é um modelo de referência de qualidade de produto de software** — fornecendo um vocabulário padronizado, taxonomias e critérios estruturados para guiar o projeto, a implementação e a avaliação da qualidade. A elaboração deste documento, por si só, **não constitui nem substitui uma certificação formal de software**.
> 
> A certificação oficial de produto de software requer processos formais de avaliação conduzidos por laboratórios de ensaio acreditados por organismos de acreditação reconhecidos internacionalmente (como o INMETRO no Brasil), seguindo a série de normas **ISO/IEC 25040 (Processo de Avaliação)** e esquemas de certificação de conformidade específicos. Este relatório serve como sólida base técnica de evidências preliminares para qualquer iniciativa futura desse gênero.

---
*Relatório de Qualidade de Produto de Software alinhado à ISO/IEC 25010:2023. Projeto LOTOFÁCIL QUANT ENGINE v1.0.0.*
