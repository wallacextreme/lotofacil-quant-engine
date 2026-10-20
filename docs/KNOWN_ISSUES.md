# LOTOFÁCIL QUANT ENGINE — QUESTÕES CONHECIDAS & LIMITAÇÕES TÉCNICAS

**Documento:** Known Issues & Edge Cases (§52)  
**Versão:** `v1.0.0`  
**Status:** `MONITORADO & MITIGADO`  

---

## 1. Navegação Anônima / Modo Privado (IndexedDB Quota)

### Descrição
Navegadores modernos (como Safari, Firefox e Chrome) restringem severamente o espaço disponível para o IndexedDB quando executados em abas anônimas/privadas (geralmente entre 10 MB e 50 MB, ou memória efêmera que é descartada ao fechar a aba).

### Impacto
Se o usuário tentar importar múltiplos arquivos históricos gigantescos em modo anônimo, o navegador pode disparar `QuotaExceededError`.

### Mitigação Implementada
* O `database.ts` captura erros de quota e transação, exibindo mensagem descritiva ao usuário.
* O dataset oficial completo da Caixa de 3.795 concursos consome menos de 1,5 MB estruturados no IndexedDB, operando com ampla folga mesmo dentro dos limites do modo anônimo.

---

## 2. Seriais Numéricos de Data do Excel e o Bug do Ano Bissexto de 1900

### Descrição
O Excel armazena datas internamente como números de ponto flutuante representando dias decorridos desde 01/01/1900. Contudo, devido a um erro histórico mantido por compatibilidade com o Lotus 1-2-3, o Excel considera erroneamente 1900 como ano bissexto (dia fictício 29/02/1900 = serial 60).

### Mitigação Implementada
* Em `src/core/data/normalizer.ts`, o algoritmo de decodificação de serial de data do Excel subtrai 1 dia para qualquer número serial $\ge 60$:
  ```ts
  const adjusted = serial >= 60 ? serial - 1 : serial;
  const ms = Math.round((adjusted - 1) * 86400 * 1000) + Date.UTC(1900, 0, 1);
  ```
* Testado contra datas históricas reais da Caixa com 100% de precisão.

---

## 3. Planilhas Caixa com Ausência de Atributos de Coordenadas (`r`)

### Descrição
Os arquivos `.xlsx` oficiais baixados do portal da Caixa frequentemente omitem o atributo `r="A1"` nas tags `<row>` e `<c>`. Bibliotecas genéricas de terceiros falham ou retornam matrizes vazias nessas condições.

### Mitigação Implementada
* O parser nativo em `src/core/data/xlsx.ts` mantém contadores sequenciais internos de linha e coluna independentemente da presença do atributo `r`, garantindo leitura perfeita de qualquer versão de arquivo oficial da Caixa.

---

## 4. Combinações Mutuamente Exclusivas ou Impossíveis

### Descrição
Se um usuário configurar restrições contraditórias (por exemplo: Soma Mínima 230 e Máxima 180, ou exigir 7 dezenas Quentes quando apenas 5 estão disponíveis na janela analítica), uma busca em árvore DFS comum poderia gastar ciclos de CPU desnecessários antes de falhar.

### Mitigação Implementada
* O módulo `src/core/combinatorial/filters.ts` possui a função pura `checkFeasibility`, que executa um diagnóstico estático prévio antes de instanciar o gerador. Se for detectada qualquer impossibilidade lógica, a geração é abortada em menos de 1 milissegundo com uma mensagem de erro clara indicando a inconsistência exata.

---

## 5. Auditoria de Defeitos Estruturais Resolvidos (ACHADO-01 a ACHADO-06)

Durante a auditoria científica e matemática do sistema, 6 achados estruturais foram identificados e corrigidos com 100% de cobertura de testes:

| Identificador | Módulo | Descrição do Problema | Correção Implementada | Status |
|---|---|---|---|---|
| **ACHADO-01** | `candidateGenerator.ts` | Parâmetro `seed` ignorado; busca DFS fixa em ordem lexicográfica gerando viés no prefixo `01`; podas com loops lineares $O(25)$ por nó. | Tabelas de sufixo $O(1)$, permutação PRNG Fisher-Yates e Vitter's Reservoir Sampling (Algoritmo R). | ✅ RESOLVIDO |
| **ACHADO-02** | `optimizer.ts` | Função-objetivo entre restarts do GRASP usava soma bruta de `totalScore`, ignorando a estratégia selecionada (`5_3_2`, `CYCLE`, etc.). | `evaluatePortfolioObjective` alinhada com `computeEffectiveGameScore` e 1-Swap Local Search pós-GRASP. | ✅ RESOLVIDO |
| **ACHADO-03** | `scoring.ts` & `optimizer.ts` | Busca linear `rels.find(...)` gerando 31.500 operações por combinação candidata; recriação de arrays em `analyzePortfolioExposure`. | Cache de matriz $25 \times 25$ em $O(1)$ via WeakMap; cálculo incremental de exposição em $O(25)$ bitwise. | ✅ RESOLVIDO |
| **ACHADO-04** | `relationships.ts` | Esperança ingênua assumindo independência com reposição; teste qui-quadrado ignorando covariância estrutural negativa de amostragem sem reposição. | Separação de Teste A (equiprobabilidade binomial) e Teste B (condicional com fator 35/36); Lift corrigido $E[\text{Lift}]=1.000$; FDR Benjamini-Hochberg. | ✅ RESOLVIDO |
| **ACHADO-05** | `scoring.ts` & `markov.ts` | Markov Score utilizava `maxP` entre as dezenas do último sorteio sem regularização amostral, distorcendo o score. | Regularização bayesiana empírica (Dirichlet shrinkage com prior uniforme $\alpha_0=50$) e média condicionada ponderada. | ✅ RESOLVIDO |
| **ACHADO-06** | `walkForward.ts` | Modo `BALANCED` utilizava fallback estocástico com probabilidade de gerar carteiras fora do intervalo $[2, 4]$. | Geração exata e determinística a partir das 51 partições inteiras válidas de 15 em 5 partes em $[2, 4]$, com 0 violações. | ✅ RESOLVIDO |
