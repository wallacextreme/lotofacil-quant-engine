# LOTOFÁCIL QUANT ENGINE — PROJECT STATE

**Documento:** Estado do Projeto e Visão Executiva (§47)  
**Versão da Aplicação:** `v1.0.0`  
**Status do Projeto:** `PRODUCTION READY` / `100% IMPLEMENTADO`  
**Data:** 05/10/2026  

---

## 1. Resumo Executivo

O **LOTOFÁCIL QUANT ENGINE** é um sistema computacional profissional, determinístico, offline-first e matematicamente auditável projetado para análise estatística avançada, modelagem estocástica e otimização combinatória da Lotofácil (Caixa Econômica Federal).

A aplicação foi integralmente desenvolvida conforme os 55 mandatos estritos do *Master Engineering Prompt*, eliminando qualquer promessa de "previsão milagrosa" e estabelecendo uma taxonomia epistemológica rigorosa:
* **FATO MATEMÁTICO:** Propriedades combinatórias exatas (espaço amostral $C(25, 15) = 3.268.760$, distribuição hipergeométrica, invariantes estruturais).
* **ANÁLISE ESTATÍSTICA:** Descrição empírica do histórico oficial de 3.795 concursos (frequências, Z-scores, atrasos, Markov, coocorrência).
* **HEURÍSTICA:** Estratégias práticas de seleção de candidatos com limites razoáveis.
* **OTIMIZAÇÃO:** Busca algorítmica por máxima diversidade (distância de Hamming) e cobertura balanceada.
* **ASSUNÇÃO:** Premissas de modelagem e hipóteses nulas explicitadas ao usuário.

---

## 2. Qualidade e Métricas de Engenharia

O projeto opera sob uma esteira de qualidade inegociável (*Quality Gate*), executada com `bun run gate`:

| Dimensão | Ferramenta / Suíte | Resultado | Status |
|---|---|---|---|
| **Verificação de Tipos** | TypeScript 7.0 (`tsc --noEmit`) | 0 erros, modo estrito ativado | ✅ Aprovado |
| **Linting & Formatação** | Biome 2.5 (`biome check`) | 0 erros, estilo unificado | ✅ Aprovado |
| **Suíte de Testes** | Bun Test runner | 49 testes, 71.405 asserções | ✅ 100% Pass |
| **Build de Produção** | Vite 8.3 (`vite build`) | ~500ms, bundle limpo, sem warnings | ✅ Aprovado |
| **Fixtures Reais** | Concursos #1 até #3795 da Caixa | 3.795 sorteios validados | ✅ Integridade 100% |

---

## 3. Estrutura de Diretórios e Módulos Principais

```
LOTOFÁCIL QUANT ENGINE/
├── src/
│   ├── app/
│   │   └── state.ts                   # Gerenciador de estado reativo & desacoplador
│   ├── components/
│   │   ├── epistemicBadge.ts          # Badges epistemológicos padronizados
│   │   ├── modal.ts                   # Diálogos modais acessíveis e reativos
│   │   └── volante.ts                 # Volante interativo 5×5 com mapa de calor
│   ├── core/
│   │   ├── combinatorial/
│   │   │   ├── candidateGenerator.ts  # Branch-and-Bound DFS com poda combinatória
│   │   │   ├── coverage.ts            # Métricas de 1-cobertura e 2-cobertura
│   │   │   ├── filters.ts             # Compilação e diagnóstico de viabilidade
│   │   │   ├── hamming.ts             # Distância de Hamming e matriz de portfólio
│   │   │   ├── optimizer.ts           # Otimizador GRASP com semente PRNG
│   │   │   ├── scoring.ts             # Normalização [0, 1] e scoring multiobjetivo
│   │   │   └── validator.ts           # Auditor independente zero-trust
│   │   ├── data/
│   │   │   ├── csv.ts                 # Parser defensivo de CSV RFC 4180
│   │   │   ├── normalizer.ts          # Normalizador canônico de concursos e datas
│   │   │   ├── parser.ts              # Orquestrador de importação com SHA-256
│   │   │   ├── validator.ts           # Validador de dados com 7 categorias de falha
│   │   │   └── xlsx.ts                # Parser nativo de XLSX sem dependências pesadas
│   │   ├── domain/
│   │   │   ├── constants.ts           # Fonte única de verdade matemática
│   │   │   ├── features.ts            # Extratores puros de características
│   │   │   ├── models.ts              # Defaults e clonagem profunda
│   │   │   ├── types.ts               # Tipos e interfaces estritas do domínio
│   │   │   └── version.ts             # Versões de motor, persistência e app
│   │   ├── statistics/
│   │   │   ├── chiSquare.ts           # Pearson clássico e Qui-Quadrado ajustado por FPC
│   │   │   ├── combinations.ts        # Binomial puro e cálculo de espaço amostral
│   │   │   ├── cooccurrence.ts        # Coocorrência de pares/trincas e baseline teórico
│   │   │   ├── covariance.ts          # Matriz de covariância e correlação estrutural
│   │   │   ├── delays.ts              # Atrasos atuais, médios, máximos e sigmas
│   │   │   ├── entropy.ts             # Entropia espacial de Shannon (linhas e colunas)
│   │   │   ├── hypergeometric.ts      # PMF, CDF e momentos hipergeométricos
│   │   │   ├── markov.ts              # Matrizes 25×25 de transição condicional
│   │   │   ├── theoretical.ts         # Momentos teóricos exatos e enumeração de grid
│   │   │   └── zscore.ts              # Z-scores globais, locais e classificação térmica
│   │   └── util/
│   │       ├── bits.ts                # Manipulação de máscaras de 25 bits e popcount
│   │       ├── prng.ts                # PRNG determinístico xoshiro128**
│   │       ├── sha256.ts              # Implementação pura e síncrona de SHA-256
│   │       └── special.ts             # Funções especiais: Lanczos lnGamma e chiSquareSurvival
│   ├── pages/                         # 10 visões analíticas completas
│   ├── services/                      # Serviços de análise, geração, exportação e backup
│   ├── storage/                       # Camada de persistência IndexedDB com Repositórios
│   └── workers/                       # Web Worker dedicado para processamento pesado
├── tests/
│   ├── fixtures/                      # Arquivo oficial Caixa com 3.795 sorteios
│   ├── integration/                   # Testes de persistência, transações e backup
│   ├── regression/                    # Pipeline E2E completo (69.297 asserções)
│   └── unit/                          # Testes unitários científicos e combinatórios
├── src-tauri/                         # Configuração e empacotamento desktop/móvel
└── docs/                              # Documentação formal e auditável
```

---

## 4. Próximos Passos Recomendados

1. **Deploy Web / PWA:** Publicação dos arquivos estáticos de `dist/` em qualquer CDN/hosting estático (Cloudflare Pages, Vercel, Netlify ou servidor próprio).
2. **Build Desktop (Tauri Windows):** Execução de `bun run tauri build` em ambiente Windows com Visual Studio C++ Build Tools instalado para gerar o instalador `.msi` ou `.exe`.
3. **Build Mobile (Tauri Android):** Inicialização do target Android via `bun run tauri android init` para compilação do APK nativo.
