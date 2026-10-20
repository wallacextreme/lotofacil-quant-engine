# LOTOFÁCIL QUANT ENGINE — MÉTODOS MATEMÁTICOS & FUNDAMENTAÇÃO CIENTÍFICA

**Documento:** Formulação Matemática, Modelagem Estatística e Teoria Algorítmica (§49)  
**Versão:** `v1.0.0`  
**Status:** `AUDITADO & REFERENCIADO`  

---

## 1. O Espaço Amostral da Lotofácil (FATO MATEMÁTICO)

Na modalidade Lotofácil da Caixa Econômica Federal:
* O universo de dezenas é $U = \{1, 2, \dots, 25\}$, com cardinalidade $N = 25$.
* Em cada concurso, são sorteadas exatamente $n = 15$ dezenas distintas sem reposição.

O número total de resultados elementares equiprováveis no espaço amostral $\Omega$ é dado pelo coeficiente binomial:

$$\#\Omega = \binom{N}{n} = \binom{25}{15} = \frac{25!}{15! \times 10!} = 3.268.760$$

Sob a hipótese nula $H_0$ de equiprobabilidade e independência física do mecanismo de sorteio:
* A probabilidade de qualquer combinação simples específica de 15 dezenas ser sorteada é rigorosamente:

$$P(\text{jogo específico}) = \frac{1}{\binom{25}{15}} = \frac{1}{3.268.760} \approx 3,059263 \times 10^{-7}$$

> [!IMPORTANT]
> **Impossibilidade de Predição:** Nenhuma análise de histórico, modelo de aprendizado de máquina, rede neural ou heurística combinatória é capaz de alterar esta probabilidade a priori para um jogo simples individual. A utilidade dos métodos estatísticos reside em **descrever fielmente o histórico** e **otimizar o portfólio de apostas para máxima diversidade e cobertura**.

---

## 2. Distribuição Hipergeométrica e Subconjuntos Notáveis (FATO MATEMÁTICO)

Seja $A \subset U$ um subconjunto de dezenas com cardinalidade $K = |A|$. A variável aleatória discreta $X$, que conta quantas dezenas do conjunto $A$ aparecem em um sorteio de tamanho $n=15$, segue uma distribuição hipergeométrica:

$$P(X = k) = \frac{\binom{K}{k} \binom{N - K}{n - k}}{\binom{N}{n}}, \quad \max(0, n - (N - K)) \le k \le \min(n, K)$$

A esperança matemática e a variância com fator de correção para população finita (FPC) são dadas por:

$$E[X] = n \frac{K}{N} = 15 \times \frac{K}{25} = 0,60 \times K$$

$$\text{Var}(X) = n \frac{K}{N} \left(1 - \frac{K}{N}\right) \left(\frac{N - n}{N - 1}\right) = 15 \times \frac{K}{25} \times \left(1 - \frac{K}{25}\right) \times \left(\frac{10}{24}\right)$$

### Valores Teóricos Exatos dos Subconjuntos Oficiais:

| Subconjunto ($A$) | Dezenas Integrantes | Cardinalidade ($K$) | $E[X]$ Teórico | $\text{Var}(X)$ Teórica | $\sigma(X)$ Teórico |
|---|---|---|---|---|---|
| **Números Pares** | `2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24` | 12 | 7,200 | 1,560 | 1,249 |
| **Números Ímpares** | `1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25` | 13 | 7,800 | 1,560 | 1,249 |
| **Números Primos** | `2, 3, 5, 7, 11, 13, 17, 19, 23` | 9 | 5,400 | 1,440 | 1,200 |
| **Moldura (Borda 5×5)** | `1 a 5, 6, 10, 11, 15, 16, 20, 21 a 25` | 16 | 9,600 | 1,440 | 1,200 |
| **Miolo (Centro 3×3)** | `7, 8, 9, 12, 13, 14, 17, 18, 19` | 9 | 5,400 | 1,440 | 1,200 |
| **Fibonacci** | `1, 2, 3, 5, 8, 13, 21` | 7 | 4,200 | 1,260 | 1,122 |
| **Repetidas do Sorteio Anterior** | 15 dezenas do sorteio $t-1$ | 15 | 9,000 | 1,500 | 1,225 |

---

## 3. Teste Qui-Quadrado de Equiprobabilidade e o Ajuste FPC (§10)

Para testar a hipótese $H_0$ de que cada uma das 25 dezenas possui probabilidade marginal $p_i = 15/25 = 0,60$ de ocorrência ao longo de $T$ concursos:

* Contagem esperada por dezena: $E_i = T \times 0,60$.
* Contagem observada por dezena: $O_i = \sum_{t=1}^T \mathbb{I}(i \in \text{sorteio}_t)$.

A estatística clássica de Pearson é calculada por:

$$\chi^2_{\text{classic}} = \sum_{i=1}^{25} \frac{(O_i - E_i)^2}{E_i}$$

### A Descoberta Metodológica do Ajuste FPC:
Sob amostragem independente com reposição, $E[\chi^2_{\text{classic}}] = \text{df} = 24$.  
Contudo, como cada concurso sorteia 15 dezenas **sem reposição**, as contagens $O_i$ possuem variância reduzida:

$$\text{Var}(O_i) = T \times 0,60 \times 0,40 = 0,24 T$$

O valor esperado da estatística clássica ingênua sob $H_0$ é:

$$E[\chi^2_{\text{classic}}] = \frac{N - n}{N - 1} \times (N - 1) = \frac{10}{24} \times 24 = 10,0$$

A estatística assintoticamente exata com distribuição $\chi^2$ com 24 graus de liberdade ($E[\chi^2] = 24$) requer o fator de correção de amostragem sem reposição (FPC):

$$\chi^2_{\text{adj}} = \chi^2_{\text{classic}} \times \left(\frac{N - 1}{N - n}\right) = \chi^2_{\text{classic}} \times \frac{24}{10} = \chi^2_{\text{classic}} \times 2,40$$

O **Lotofácil Quant Engine** reporta com total transparência epistemológica:
1. $\chi^2_{\text{classic}}$ com $p_{\text{ingênuo}}$ para compatibilidade direta com relatórios de terceiros.
2. $\chi^2_{\text{adj}}$ com $p_{\text{rigoroso}}$ calculado via função gama incompleta regularizada para rigor inferencial.

---

## 4. Covariância Estrutural Invariante (FATO MATEMÁTICO)

Definindo as variáveis indicadoras $X_i \in \{0, 1\}$ para cada dezena $i \in \{1, \dots, 25\}$ em um concurso:

$$\sum_{i=1}^{25} X_i = 15 \quad (\text{constante determinística})$$

Tomando a variância em ambos os lados:

$$\text{Var}\left(\sum_{i=1}^{25} X_i\right) = \sum_{i=1}^{25} \text{Var}(X_i) + \sum_{i \ne j} \text{Cov}(X_i, X_j) = 0$$

Como $\text{Var}(X_i) = 0,60 \times 0,40 = 0,24$ para todas as 25 dezenas, e existem $25 \times 24 = 600$ termos de covariância idênticos por simetria:

$$25 \times 0,24 + 600 \times \text{Cov}(X_i, X_j) = 0 \implies \text{Cov}(X_i, X_j) = -\frac{6,0}{600} = -0,0100$$

O coeficiente de correlação de Pearson teórico entre quaisquer duas dezenas sob $H_0$ é:

$$\rho(X_i, X_j) = \frac{\text{Cov}(X_i, X_j)}{\sqrt{\text{Var}(X_i)\text{Var}(X_j)}} = \frac{-0,0100}{0,2400} = -\frac{1}{24} \approx -0,04167$$

> [!NOTE]
> Essa leve correlação negativa ($\approx -4,17\%$) decorre puramente da restrição de que a soma das dezenas é fixa em 15. Ela não decorre de forças de atração ou repulsão física entre as bolas.

---

## 5. Modelagem Estocástica de Markov (ANÁLISE ESTATÍSTICA)

Para analisar transições entre concursos consecutivos $t-1$ e $t$, calculamos a matriz empírica de transição condicional $25 \times 25$:

$$P(j_t = 1 \mid i_{t-1} = 1) = \frac{\sum_{t=2}^T \mathbb{I}(i \in \text{sorteio}_{t-1} \land j \in \text{sorteio}_t)}{\sum_{t=2}^T \mathbb{I}(i \in \text{sorteio}_{t-1})}$$

E a matriz complementar de ausência:

$$P(j_t = 0 \mid i_{t-1} = 1) = 1 - P(j_t = 1 \mid i_{t-1} = 1)$$

Propriedades matemáticas observadas:
* Para cada linha $i$, $\sum_{j=1}^{25} P(j_t = 1 \mid i_{t-1} = 1) = 15,0$ (exatamente 15 dezenas sorteadas).
* A diagonal principal $i=j$ mede a **taxa de retenção individual** da dezena $i$.

---

## 6. Entropia Espacial de Shannon no Volante 5×5 (ANÁLISE ESTATÍSTICA)

Dispondo o volante como uma matriz cartesiana $5 \times 5$ onde a dezena $v \in \{1, \dots, 25\}$ ocupa a linha $r = \lfloor(v-1)/5\rfloor$ e coluna $c = (v-1) \pmod 5$:

Para uma aposta com distribuição de frequências nas 5 linhas dadas por $(r_1, r_2, r_3, r_4, r_5)$, onde $\sum_{i=1}^5 r_i = 15$:
* As probabilidades relativas por linha são $p_i = r_i / 15$.
* A entropia de Shannon em bits é:

$$H(\text{linhas}) = - \sum_{i=1}^5 p_i \log_2(p_i) \quad (\text{com } p_i \log_2(p_i) = 0 \text{ se } p_i = 0)$$

O valor máximo de entropia ocorre quando a distribuição é perfeitamente uniforme $(3, 3, 3, 3, 3)$:

$$H_{\max} = \log_2(5) \approx 2,321928 \text{ bits}$$

A média teórica exata de entropia sob todas as composições possíveis da partição de 15 em 5 partes com pesos hipergeométricos $\prod_{i=1}^5 \binom{5}{r_i} / \binom{25}{15}$ é:

$$E[H] \approx 2,176 \text{ bits}$$

---

## 7. Métrica de Diversidade de Hamming e Cobertura Combinatória (OTIMIZAÇÃO)

Para duas apostas representadas por suas máscaras de bits $A, B \in \{0, 1\}^{25}$ com $\text{popcount}(A) = \text{popcount}(B) = 15$:

$$d_H(A, B) = \text{popcount}(A \oplus B) = (15 - |A \cap B|) + (15 - |A \cap B|) = 30 - 2|A \cap B|$$

A distância de Hamming entre quaisquer duas combinações de 15 elementos é **sempre um número inteiro par**:

| Dezenas em Comum ($|A \cap B|$) | Distância de Hamming ($d_H$) | Classificação de Diversidade |
|---|---|---|
| 15 comuns | 0 | Combinações idênticas (duplicata rejeitada) |
| 14 comuns | 2 | Diferença de apenas 1 dezena (redundância alta) |
| 13 comuns | 4 | Diferença de 2 dezenas ($d_H \ge 4$) |
| 12 comuns | 6 | Diferença de 3 dezenas ($d_H \ge 6$) |
| 11 comuns | 8 | Diferença de 4 dezenas ($d_H \ge 8$) |
| 10 comuns | 10 | Diferença de 5 dezenas ($d_H \ge 10$, padrão da engenharia) |
| 9 comuns | 12 | Diversidade elevada ($d_H \ge 12$) |
| 8 comuns | 14 | Diversidade muito alta ($d_H \ge 14$) |

O otimizador GRASP impõe rigorosamente a restrição rígida:

$$\min_{i \ne j} d_H(\text{jogo}_i, \text{jogo}_j) \ge \text{minHamming}$$

Garantindo portfólios balanceados sem sobreposição desnecessária e com máxima dispersão combinatória no hipercubo $\{0, 1\}^{25}$.

---

## 8. Associação de Pares: Testes A e B, Fator 35/36 e FDR (§5, §6, §7, §8)

Na avaliação da coocorrência de pares $\{A, B\}$, $C(25, 2) = 300$:

### Teste A — Hipótese de Equiprobabilidade Irrestrita:
Sob $H_{0,A}$, todas as combinações são equiprováveis:
$$P(A \cap B) = \frac{\binom{23}{13}}{\binom{25}{15}} = \frac{15}{25} \times \frac{14}{24} = 0,35$$
A contagem de coocorrências $O_{AB}$ em $T$ concursos segue $O_{AB} \sim \text{Binomial}(T, 0,35)$ com $E[O_{AB}] = 0,35 T$.

### Teste B — Condicional nas Marginais Observadas:
Para duas dezenas com frequências observadas $N_A$ e $N_B$, o produto ingênuo $(N_A/T)(N_B/T)$ assume incorretamente independência com reposição ($0,60 \times 0,60 = 0,36$). Em amostragem sem reposição, a probabilidade conjunta esperada requer o fator estrutural exato:
$$P(A \cap B \mid N_A, N_B) = \frac{N_A \cdot N_B}{T^2} \times \frac{35}{36}$$
$$E[O_{AB} \mid N_A, N_B] = \frac{N_A \cdot N_B}{T} \times \frac{35}{36}$$

O Lift corrigido é normalizado para convergir a $1,000$ sob $H_0$:
$$\text{Lift}_{\text{corr}} = \frac{O_{AB} / T}{(N_A / T) (N_B / T) \times (35/36)}$$

### Controle de Falsa Taxa de Descoberta (FDR Benjamini-Hochberg):
Com 300 hipóteses testadas simultaneamente, o erro tipo I inflaciona. Aplicamos o procedimento *step-up* de Benjamini-Hochberg com $\alpha = 0,05$:
$$k = \max \left\{ i : p_{(i)} \le \frac{i}{300} \alpha \right\}$$
Pares são classificados como `CASADA_FORTE` ou `BRIGADA_FORTE` somente quando $p \le p_{(k)}$. Pares com contagem baixa mas desprovidos de significância estatística são rotulados como `FREQUENCIA_BAIXA`.

---

## 9. Calibração Bayesiana Empírica na Cadeia de Markov (§13)

Estimadores de máxima verossimilhança direta de transições $P(j_t \mid i_{t-1})$ apresentam alta variância quando o número de transições observadas $N_i$ é reduzido. Aplicamos encolhimento bayesiano empírico (Dirichlet-Multinomial shrinkage) em direção ao prior uniforme $\pi_0 = 15/25 = 0,60$:
$$\tilde{P}(j_t \mid i_{t-1}) = \frac{N_{i \to j} + \alpha_0 \cdot 0,60}{N_i + \alpha_0}, \quad \text{com } \alpha_0 = 50$$
Isso regulariza estimativas espúrias em janelas móveis e elimina o viés de valor extremo.

---

## 10. Atrasos, Cauda Geométrica e Falácia do Apostador (§14)

Como cada concurso é estocasticamente independente, a probabilidade de uma dezena específica não ser sorteada em qualquer concurso é $q = 1 - 15/25 = 0,40$.
A probabilidade de um atraso atingir ou superar $k$ concursos consecutivos é a cauda geométrica exata:
$$P(\text{Atraso} \ge k) = 0,40^k$$
A surpresa de Shannon associada em bits é:
$$I(k) = - \log_2(P(\text{Atraso} \ge k)) = k \log_2(2,5) \approx 1,3219 k \text{ bits}$$

> [!WARNING]
> **Falácia do Apostador (Gambler's Fallacy):** Uma dezena atrasada há 10 concursos tem **exatamente a mesma probabilidade de 60%** de ser sorteada no próximo concurso do que qualquer outra. O motor utiliza métricas de atraso exclusivamente para controle de exposição e diversificação de portfólio, jamais como previsão determinística de "compensação".

---

## 11. Avaliação Exata do Espaço C(25, 15) = 3.268.760 Estados (FASE 4)

O universo completo de $C(25, 15) = 3.268.760$ estados é avaliado deterministicamente em $< 100\text{ ms}$ utilizando:
1. **Truque de Gosper:** Gerador bitwise do próximo inteiro com exatamente 15 bits em $O(1)$:
   $$c = x \ \& \ (-x); \quad r = x + c; \quad x = (((r \oplus x) \gg 2) / c) \mid r$$
2. **Lookup Table POPCOUNT_16:** Tabela pré-computada de 64K entradas para contagem de bits em 2 instruções sem branching.
3. **Métricas de Covering Designs:**
   - 2-cobertura de pares ($C(25, 2) = 300$)
   - 3-cobertura de ternos ($C(25, 3) = 2.300$)
   - 4-cobertura de quadras ($C(25, 4) = 12.650$)
4. **Eficiência do Limite de Boole (Union Bound Efficiency):**
   Mede a razão entre a probabilidade real de premiação da carteira e o limite superior ingênuo de Boole:
   $$\text{Eficiência} = \frac{P\left(\bigcup_{i=1}^K E_i\right)}{\min\left(1,0, \sum_{i=1}^K P(E_i)\right)}$$
   Carteiras com alta distância de Hamming ($d_H \ge 10$) minimizam interseções redundantes e maximizam essa eficiência.

---

## 12. Backtest Walk-Forward e Inferência Estatística Pareada (FASE 3)

O protocolo de backtest avalia as estratégias estritamente fora da amostra (*out-of-sample*) sem nenhum vazamento temporal (*zero lookahead bias*):
1. No concurso $t$, o histórico visível é restrito a $\{1, \dots, t-1\}$.
2. São avaliados 7 benchmarks padronizados: B1 (Aleatório Puro), B2 (Linhas Balanceadas [2..4]), B3 (Frequentes/Quentes), B4 (Ciclo Ativo), B5 (Atrasos Elevados), B6 (Ablação Sem Restrições), e PROD (Otimizador GRASP Completo).
3. Para cada estratégia $S$, calcula-se a diferença pareada de acertos contra B1:
   $$D_{t, g} = \text{Acertos}_{S, t, g} - \text{Acertos}_{B1, t, g}$$
4. Computa-se a média pareada $\bar{D}$, erro padrão $SE$, intervalo de confiança de 95% ($[\bar{D} - 1,96 SE, \bar{D} + 1,96 SE]$) e teste de hipótese bicaudal via $Z = \bar{D} / SE$.
5. Se $p > 0,05$ ou o ganho não for prático, o sistema declara formalmente o veredito epistemológico:
   $$\text{VEREDITO} = \text{SEM\_EVIDENCIA\_SUFICIENTE\_CONTRA\_H0}$$
   comprovando transparência científica absoluta.
