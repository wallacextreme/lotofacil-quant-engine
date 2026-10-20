# 🏛️ Sistema de Gestão da Qualidade — Alinhamento à ISO 9001:2026 — LOTOFÁCIL QUANT ENGINE

**Documento:** Manual e Diretrizes de Alinhamento do SGQ de Desenvolvimento de Software  
**Aplicação/Escopo Técnico:** LOTOFÁCIL QUANT ENGINE (`v1.0.0`)  
**Data de Emissão:** 05 de Outubro de 2026  
**Norma de Referência:** ISO 9001:2026 (*Quality management systems — Requirements*, 6ª Edição — Publicada em 16 de Setembro de 2026)  
**Status do Documento:** Base Documental Técnica Preliminar para Estruturação de SGQ  

---

## 1. Introdução e Escopo

### 1.1. Finalidade do Documento
Este documento organiza e formaliza as práticas de engenharia de software, controle de qualidade, testes automatizados e gestão de versões do projeto **LOTOFÁCIL QUANT ENGINE**, alinhando-as à estrutura e aos requisitos da **ISO 9001:2026** (6ª edição da norma internacional de Sistemas de Gestão da Qualidade, publicada em 16/09/2026 em substituição à edição de 2015).

A finalidade deste instrumento é servir como base documental fidedigna para a equipe técnica e para a liderança da organização, estabelecendo processos auditáveis que garantam a conformidade contínua das entregas com os requisitos matemáticos, legais e de usabilidade estipulados.

### 1.2. Escopo Técnico Coberto
O escopo abrange o ciclo de vida completo de desenvolvimento, validação, empacotamento, distribuição e manutenção da solução híbrida (Desktop Windows nativo via Tauri/Rust e Progressive Web App via navegadores modernos), assegurando o funcionamento offline-first, a integridade determinística e a auditoria Zero-Trust das apostas geradas.

---

## 2. Contexto da Organização

A ISO 9001:2026 exige a determinação dos fatores internos e externos que afetam a capacidade da organização de alcançar os resultados pretendidos do seu SGQ, incluindo explicitamente a consideração dos impactos e vulnerabilidades associados a **mudanças climáticas**, sustentabilidade e continuidade operacional.

---

### 🔧 2.1. Evidências Técnicas Extraídas do Repositório

- **Descrição do Produto:** Plataforma de software para análise estatística, processos estocásticos e otimização combinatória aplicada à modalidade lotérica Lotofácil.
- **Partes Interessadas Técnicas Identificáveis no Código:**
  - *Usuário Final / Apostador / Organizador de Bolões:* Demanda facilidade de instalação, interface clara, rapidez nos cálculos, geração em conformidade estrita com as restrições selecionadas e exportação em formatos comuns (TXT, CSV, XLSX, JSON).
  - *Auditor Estatístico / Revisor Técnico:* Demanda transparência algorítmica, ausência de alegações milagrosas, determinismo reprodutível por semente e comprovação via testes matemáticos.
  - *Equipe de Manutenção e Suporte:* Demanda código tipado, arquitetura desacoplada, ausência de dependências de servidores em nuvem e suíte de testes que previna regressões.
- **Ambiente Operacional Identificado:** Execução 100% no cliente (client-side), sem tráfego de dados para a internet, operando em hardware padrão com Windows 10/11 ou navegadores web padrão W3C.

---

### 📝 2.2. Definições Organizacionais Pendentes (A Serem Definidas pela Liderança)

O checklist a seguir não pode ser preenchido por inspeção de código e deve ser formalizado pela liderança da organização responsável pelo software:

- [ ] **Definição da Razão Social e Estrutura Societária da Organização Mantenedora.**
- [ ] **Escopo Formal do SGQ:**
  ```text
  [Modelo a Preencher]
  "O Sistema de Gestão da Qualidade da [Nome da Empresa] aplica-se às atividades de:
  concepção, desenvolvimento, teste, empacotamento e suporte técnico de softwares
  estatísticos e combinatórios para plataformas Desktop e Web."
  ```
- [ ] **Mapeamento de Requisitos Legais e Regulatórios Aplicáveis:**
  - Marco Civil da Internet (Lei nº 12.965/2014) — aplicabilidade no contexto offline;
  - Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018) — salvaguarda assegurada pelo armazenamento local sem coleta de dados pessoais;
  - Legislação e regulamentação das Loterias Federais no Brasil (Lei nº 13.756/2018 e normativas Caixa Econômica Federal) — regras oficiais da Lotofácil (15 a 20 dezenas, universo de 25 números, faixas de premiação de 11 a 15 acertos).
- [ ] **Avaliação de Fatores Climáticos e Sustentabilidade (Requisito Específico ISO 9001:2026):**
  - *Impacto das Mudanças Climáticas no Negócio:* Analisar a resiliência da infraestrutura de desenvolvimento e repositórios remotos frente a eventos climáticos extremos e interrupções elétricas (a arquitetura *offline-first* do software já confere alta resiliência ao usuário final frente a panes elétricas e de telecomunicações locais).
  - *Eficiência Energética do Software:* Medição da pegada de carbono do processamento algorítmico (algoritmos otimizados com poda em árvore e Web Workers reduzem o tempo de CPU e o consumo de energia em computadores pessoais e portáteis).

---

## 3. Liderança e Política da Qualidade

A edição 2026 da ISO 9001 reforça o papel da alta direção na **promoção de uma cultura da qualidade** e no **comportamento ético** em todas as esferas organizacionais.

---

### 📝 3.1. Modelo de Política da Qualidade (A Preencher pela Direção)

> [!NOTE]
> A Política da Qualidade não pode ser presumida a partir do código-fonte. Apresenta-se abaixo a estrutura orientadora para elaboração e aprovação formal pela diretoria:

```text
╔══════════════════════════════════════════════════════════════════════════════════╗
║               POLÍTICA DA QUALIDADE — [NOME DA ORGANIZAÇÃO]                     ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║ A [Nome da Organização], no desenvolvimento do LOTOFÁCIL QUANT ENGINE,          ║
║ compromete-se a:                                                                 ║
║                                                                                  ║
║ 1. RIGOR CIENTÍFICO E ÉTICA: Fornecer algoritmos matemáticos auditáveis e        ║
║    honestos, recusando promessas ilusórias de previsões determinísticas e        ║
║    adotando taxonomia epistêmica clara em todas as telas;                        ║
║ 2. SATISFAÇÃO DO USUÁRIO: Assegurar que os jogos gerados cumpram 100% das       ║
║    restrições duras e critérios de distância configurados pelo usuário;          ║
║ 3. PRIVACIDADE E SEGURANÇA: Manter o paradigma Offline-First, garantindo que     ║
║    dados, estratégias e portfólios residam exclusivamente sob o controle         ║
║    do próprio usuário;                                                           ║
║ 4. CONFORMIDADE E MELHORIA CONTÍNUA: Satisfazer os requisitos aplicáveis e       ║
║    aprimorar continuamente os processos de engenharia por meio de testes         ║
║    automatizados e validações controladas.                                       ║
║                                                                                  ║
║ Data de Aprovação: ___/___/______   Assinatura da Direção: _____________________ ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

- **Perguntas Orientadoras para a Alta Direção:**
  1. Como a liderança assegura que a integridade matemática e a transparência prevaleçam sobre apelos comerciais facilitistas?
  2. Quais são os canais pelos quais os colaboradores e desenvolvedores podem manifestar dúvidas éticas ou técnicas sem receio de retaliação?
  3. De que maneira a liderança disponibiliza os recursos necessários para a manutenção contínua das suítes de testes automatizados e segurança de dependências?

---

## 4. Planejamento — Riscos, Oportunidades e Objetivos da Qualidade

---

### 🔧 4.1. Riscos Técnicos Observáveis e Mitigações no Código

A tabela abaixo documenta os riscos técnicos identificados na arquitetura atual do código-fonte e as respectivas barreiras de contenção implementadas:

| Risco Técnico Identificado | Impacto Potencial | Severidade | Barreira / Mitigação Implementada no Código |
| :--- | :--- | :---: | :--- |
| **Limpeza acidental de cache no PWA** | Perda de todo o histórico importado e carteiras salvas no navegador. | Alta | Protocolo de exportação e restauração de backup com checksum SHA-256 em [src/services/backupService.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/services/backupService.ts). Alerta explícito no Manual do Usuário. |
| **Parâmetros de restrição contraditórios configurados pelo usuário** | Laço infinito de busca ou colapso do gerador de candidatos. | Alta | Verificador de viabilidade matemática precoce em [src/core/combinatorial/filters.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/filters.ts#L106-L198) (`checkFeasibility`), abortando antes da busca. |
| **Geração de jogos que violem Hamming silenciosamente** | Apostas redundantes e prejuízo financeiro ao apostador. | Crítica | Auditoria Zero-Trust em [src/core/combinatorial/validator.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/validator.ts), que revalida cada jogo em isolamento completo. |
| **Falsos positivos em relacionamentos de dezenas** | Indução do usuário a apostar em pares sem relevância estocástica. | Média | Controle de Taxa de Falsas Descobertas (FDR de Benjamini-Hochberg a $q < 0,05$) com teste de Yates em [src/core/statistics/relationships.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/statistics/relationships.ts). |
| **Inconsistência de escala no otimizador** | Anulação dos pesos de cobertura e diversidade por termos desbalanceados. | Alta | Normalização linear estrita em $[0.0, 1.0]$ em todos os módulos de pontuação ([src/core/combinatorial/scoring.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/scoring.ts)). |
| **CSP nula na configuração do Tauri** | Vulnerabilidade teórica a injeção de scripts na janela Desktop. | Média | **Plano de ação aberto:** Definir CSP estrita em `src-tauri/tauri.conf.json` (recomendação ACT-01). |

---

### 📝 4.2. Objetivos da Qualidade Organizacionais (A Serem Formalizados)

A organização deve definir e acompanhar formalmente os objetivos da qualidade e suas metas mensuráveis. Exemplos recomendados:

| Objetivo da Qualidade | Indicador Mensurável | Meta Proposta | Frequência de Avaliação |
| :--- | :--- | :---: | :---: |
| **Taxa de aprovação nos testes de regressão** | Percentual de testes com sucesso no `bun test`. | $100\%$ | A cada alteração de código. |
| **Confiabilidade da auditoria Zero-Trust** | Taxa de falsas aprovações de jogos com violação de regra. | $0\%$ | Contínua (a cada execução). |
| **Tempo de resposta da interface em cálculos pesados** | Queda de quadros da UI durante processamento. | Zero travamento da UI | Semestral (auditoria de desempenho). |
| **Satisfação do usuário com a clareza das explicações** | Índice de satisfação em pesquisas de usabilidade. | $\ge 85\%$ | Anual (a implementar). |

---

## 5. Apoio — Recursos, Competência, Comunicação e Informação Documentada

---

### 🔧 5.1. Procedimento de Controle de Informação Documentada (Rascunho Técnico)

- **Identificação e Numeração:** Documentos técnicos devem residir na pasta `docs/` e na raiz do repositório, com nomenclatura em caixa alta e extensão `.md` (Markdown legível por humanos e versionável).
- **Controle de Versão de Código e Esquema:**
  - Código-fonte versão `1.0.0` sincronizada em: [package.json](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/package.json), [src-tauri/tauri.conf.json](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src-tauri/tauri.conf.json) e [src/core/domain/version.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/domain/version.ts).
  - Esquema de banco de dados: constante `SCHEMA_VERSION = 1` gerenciada em [src/core/domain/version.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/domain/version.ts#L8) e associada a migrações em [src/storage/schema.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/storage/schema.ts).
- **Armazenamento e Preservação:** Documentação versionada juntamente com o código-fonte, garantindo rastreabilidade histórica.

---

### 📝 5.2. Gestão de Competências e Treinamento (A Preencher pela Equipe)

A organização deve preencher e manter a matriz de competências da equipe técnica:

| Papel na Equipe | Competências Mínimas Exigidas | Treinamentos Necessários | Registro de Comprovação |
| :--- | :--- | :--- | :--- |
| **Engenheiro de Software Frontend** | TypeScript avançado, arquitetura PWA, Web Workers e IndexedDB. | Atualizações ECMAScript e padrões W3C. | [Link para certificado ou portfólio] |
| **Engenheiro de Sistemas Desktop** | Rust (edição 2024), ecossistema Tauri v2 e segurança IPC. | Segurança de aplicações nativas e IPC isolation. | [Link para certificado ou portfólio] |
| **Auditor Estatístico / Quantitativo** | Probabilidade discreta, inferência estatística, FDR e processos estocásticos. | Metodologias de validação out-of-sample e ablação. | [Comprovação acadêmica/técnica] |

---

## 6. Operação — Desenvolvimento, Testes e Entrega

A Seção 8 da ISO 9001 disciplina o planejamento operacional e controle dos processos de concepção, desenvolvimento, verificação, validação e liberação de produtos.

---

### 🔧 6.1. Procedimento Operacional: Ciclo de Desenvolvimento e Validação

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FLUXO OPERACIONAL DE ENGENHARIA                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Especificação Matemática & Requisitos de Domínio                    │
│    └── Definição de fórmulas, restrições e baselines teóricos          │
│                                                                        │
│ 2. Implementação em Funções Puras (TypeScript / Rust)                  │
│    └── Escrita de código sem efeitos colaterais em src/core/           │
│                                                                        │
│ 3. Execução de Testes Automatizados (Quality Gate)                     │
│    └── bun run typecheck ➔ bun run lint ➔ bun test ➔ bun run build     │
│                                                                        │
│ 4. Auditoria Dual Zero-Trust                                           │
│    └── Revalidação independente por validator.ts antes da entrega      │
│                                                                        │
│ 5. Empacotamento e Distribuição (Release)                              │
│    └── Build Desktop (.msi/.exe via Tauri) e PWA (dist/ via Vite)      │
└────────────────────────────────────────────────────────────────────────┘
```

#### Ficha de Procedimentos Operacionais:

1. **Procedimento de Design e Desenvolvimento:**
   - *Objetivo:* Garantir que todo módulo estatístico ou combinatório respeite teoremas matemáticos comprovados.
   - *Entradas:* Regras oficiais da Caixa, fórmulas probabilísticas (hipergeométrica, Pearson, Shannon, Hamming, Benjamini-Hochberg).
   - *Etapas:* Modelação pura em `src/core/domain/`, implementação analítica em `src/core/statistics/` e integração via serviços desacoplados em `src/services/`.
   - *Saídas:* Módulos compiláveis sem dependências cíclicas.
   - *Responsável Técnico:* Engenheiro de Software Sênior.

2. **Procedimento de Verificação e Testes (Quality Gate Obrigatório):**
   - *Objetivo:* Impedir que defeitos lógicos, erros de tipagem ou falhas de formatação alcancem o ambiente de homologação ou release.
   - *Comando Unificado de Execução:*
     ```bash
     bun run gate
     ```
   - *Etapas Sucessivas:*
     1. `bun run typecheck`: validação estática de tipos sem emissão de código (`tsc --noEmit`).
     2. `bun run lint`: verificação de estilo, boas práticas e vulnerabilidades comuns (`biome check`).
     3. `bun test`: execução dos 38 testes automatizados em `tests/` com 69.763 asserções.
     4. `bun run build`: compilação de produção com empacotamento do bundle cliente e Web Worker.
   - *Critério de Aceite:* Zero erros em todas as 4 etapas. Qualquer saída diferente de zero aborta a liberação.

3. **Procedimento de Empacotamento e Entrega (Desktop e PWA):**
   - *Desktop Windows:* Execução do comando `bun tauri build`, gerando instalador Windows (`.exe` e `.msi`) com binários compilados em Rust e assets embutidos em `src-tauri/target/release/bundle/`.
   - *PWA:* Execução de `bun run build`, gerando a pasta `dist/` com `index.html`, manifesto, service worker e assets cacheados.

4. **Procedimento de Tratamento de Saídas Não Conformes (Bugs e Inconsistências):**
   - *Em Tempo de Geração:* O auditor Zero-Trust ([validator.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/validator.ts)) inspeciona todas as apostas geradas. Se uma única aposta apresentar tamanho diferente de 15, números repetidos, soma fora do intervalo ou distância de Hamming violada, o portfólio inteiro recebe o status `INVALID` e a exportação é bloqueada.
   - *Em Tempo de Importação:* Arquivos com colunas faltantes, formato ilegível ou datas corrompidas são barrados na camada do parser ([src/core/data/parser.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/data/parser.ts)), exibindo modal detalhado com os erros encontrados e rejeitando a gravação no banco.

---

## 7. Avaliação de Desempenho

---

### 🔧 7.1. Métricas Técnicas e Indicadores de Monitoramento Disponíveis

- **Status da Suíte de Testes:** 38 testes ativos com 100% de sucesso e 69.763 asserções de integridade matemática e sistêmica.
- **Auditoria de Falsos Positivos:** Monitoramento comprovado via procedimentos de FDR ($q < 0,05$) com exibição de "SEM EVIDÊNCIA SUFICIENTE" quando não há dados estocasticamente válidos.
- **Rastreabilidade de Execução:** Toda geração de apostas grava nos metadados da aplicação a semente (seed), o hash canônico SHA-256 da base de dados e a data/hora exata da geração ([src/core/domain/types.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/domain/types.ts#L213-L227)).

---

### 📝 7.2. Processos Organizacionais a Serem Implementados pela Gestão

Os processos a seguir dependem de estrutura administrativa da organização e devem ser instituídos formally:

- [ ] **Pesquisa Periódica de Satisfação do Usuário:** Mecanismo formal (formulário online ou entrevista estruturada) para coletar feedback de clareza, facilidade de uso e confiabilidade.
- [ ] **Programa de Auditoria Interna da Qualidade:** Cronograma semestral de auditoria interna dos processos de desenvolvimento, verificando o cumprimento dos procedimentos operacionais e o fechamento de recomendações de melhoria.
- [ ] **Reunião de Análise Crítica pela Direção:** Encontro anual da liderança para analisar o desempenho do SGQ, o status das ações corretivas, a adequação de recursos e as oportunidades de evolução da aplicação.

---

## 8. Melhoria

A Seção 10 da ISO 9001 orienta a organização a identificar oportunidades de melhoria e implementar as ações necessárias para atender aos requisitos dos clientes e aumentar sua satisfação.

---

### 🔧 8.1. Evidências de Melhoria Contínua Registradas no Código

- **Histórico de Correções da Auditoria Forense:** O projeto passou por auditoria técnica independente que identificou 8 não-conformidades (P1 e P2). Todas foram resolvidas, documentadas no changelog forense [docs/PATCH_MODULE_CYCLE_LINES_RELATIONSHIPS.md](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/docs/PATCH_MODULE_CYCLE_LINES_RELATIONSHIPS.md) e integradas ao Quality Gate:
  - Integração plena do módulo `absenceOptimizer.ts` ao laço de seleção do gerador.
  - Correção da escala multiobjetivo em `optimizer.ts` para $[0.0, 1.0]$.
  - Eliminação de fallbacks que geravam falsos positivos de dezenas casadas/brigadas em `relationships.ts`.
  - Simetrização dos testes de ablação do Walk-Forward Backtesting para a partição padrão 5-3-2.
  - Cálculo de duração de ciclos baseado em contadores reais de concursos em `cycles.ts`.
  - Recálculo independente das subjanelas temporais de relacionamento.
  - Propagação do modo de linha configurado pelo usuário ao motor de pontuação.
  - Introdução formal dos modos `FAST` e `PRODUCTION` de backtest na interface.

---

### 📝 8.2. Procedimento de Ação Corretiva Formal (A Ser Instituído pela Organização)

```text
[Modelo para Registro de Ação Corretiva — RAC]
1. Identificação da Não Conformidade (Origem: Teste, Bug Report, Auditoria Interna).
2. Descrição Objetiva da Falha e Evidências.
3. Análise de Causa Raiz (ex.: Metodologia dos 5 Porquês ou Diagrama de Ishikawa).
4. Ação de Contenção Imediata.
5. Plano de Ação Corretiva (O que, Quem, Quando, Como).
6. Verificação da Eficácia da Ação (reteste automatizado após N semanas).
7. Aprovação e Encerramento pela Liderança da Qualidade.
```

---

## 9. Matriz de Aderência (Gap Analysis — ISO 9001:2026)

A matriz a seguir resume o nível atual de conformidade do projeto frente aos principais tópicos normativos da ISO 9001:2026:

| Cláusula ISO 9001:2026 | Requisito Normativo (Resumo) | Situação | Evidência / Providência Necessária |
| :--- | :--- | :---: | :--- |
| **4. Contexto da Organização** | Compreensão da organização, partes interessadas e fatores climáticos. | 🟡 **Parcial** | Arquitetura técnica documentada (🔧); escopo formal e análise de clima corporativa a definir pela direção (📝). |
| **5. Liderança** | Comprometimento da liderança, cultura da qualidade e política formal. | 🔴 **Pendente** | Modelo de Política da Qualidade disponibilizado; requer aprovação formal pela alta direção (📝). |
| **6. Planejamento** | Gestão de riscos e oportunidades, objetivos da qualidade mensuráveis. | 🟡 **Parcial** | Riscos técnicos mitigados no código (🔧); metas de negócio a formalizar pela direção (📝). |
| **7. Apoio** | Recursos, competência, conscientização e informação documentada. | 🟡 **Parcial** | Procedimento de controle de documentação técnica estruturado (🔧); matriz de competências a preencher (📝). |
| **8. Operação** | Planejamento operacional, requisitos do produto, design e controle de saídas. | 🟢 **Coberto** | Procedimento operacional, testes automatizados (`bun run gate`) e validação Zero-Trust plenamente implementados (🔧). |
| **9. Avaliação de Desempenho** | Monitoramento, medição, auditoria interna e análise crítica da direção. | 🟡 **Parcial** | Métricas técnicas e testes operando (🔧); pesquisas de satisfação e reuniões de análise crítica a instituir (📝). |
| **10. Melhoria** | Tratamento de não conformidades, ações corretivas e melhoria contínua. | 🟢 **Coberto** | Histórico de patches forenses com causas raízes sanadas e suíte de regressão ativa (🔧). |

**Legenda:**
- 🟢 **Coberto:** Evidenciado e implementado com base técnica concreta no repositório.
- 🟡 **Parcial:** Parcialmente atendido tecnicamente, dependendo de formalização administrativa pela equipe.
- 🔴 **Pendente:** Requisito exclusivamente organizacional/estratégico, a ser instituído formalmente pela liderança.

---

## 10. Aviso Importante sobre Certificação de Gestão

> [!IMPORTANT]
> **ESCLARECIMENTO ESSENCIAL SOBRE CERTIFICAÇÃO ISO 9001:2026:**
> Este documento organiza a documentação técnica dos processos de desenvolvimento, engenharia de software e controle de qualidade do projeto **LOTOFÁCIL QUANT ENGINE**, servindo como preparação técnica de alinhamento com a norma **ISO 9001:2026**.
> 
> **A emissão deste documento NÃO constitui nem equivale a uma certificação ISO 9001.**
> 
> A norma ISO 9001 é uma norma sobre **Sistemas de Gestão de Processos de uma Organização**, e não sobre código de computador isolado. Uma certificação ISO 9001 válida perante o mercado só pode ser concedida após um processo formal de auditoria externa de 2 fases (auditoria documental e auditoria prática das operações da empresa ao longo do tempo), conduzida por um **Organismo de Certificação de Sistemas de Gestão (OCS) devidamente acreditado por entidade oficial** (como a Cgcre/INMETRO no Brasil ou equivalentes IAF/ANAB no exterior).
> 
> A organização e o time técnico devem utilizar este documento como um sólido ponto de partida operacional, evitando expressamente qualquer divulgação enganosa de que o produto ou empresa "possui certificação ISO 9001" antes de ter concluído o processo de certificação formal por entidade acreditada.

---
*Manual do Sistema de Gestão da Qualidade — Alinhamento à ISO 9001:2026. Projeto LOTOFÁCIL QUANT ENGINE v1.0.0.*
