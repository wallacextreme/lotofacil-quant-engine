# FASE 0 — Auditoria do Projeto

Data: 2026-10-05 · Autor: agente (Claude Opus, alta capacidade de raciocínio)

## 1. Arquitetura atual

O workspace `LOTOFÁCIL QUANT ENGINE/` continha **apenas** o arquivo de especificação
`# LOTOFÁCIL QUANT ENGINE.txt`. Não havia código, build, persistência ou testes.
Portanto não existe código funcional a preservar: o projeto é *greenfield*.

Artefatos externos relevantes encontrados na máquina (fora do workspace):

| Arquivo | Conteúdo | Uso |
|---|---|---|
| `Downloads/Lotofácil.xlsx` | Export oficial da Caixa, 3795 concursos (1 → 3795, último 02/10/2026), 33 colunas | Fixture de regressão (copiado para `tests/fixtures/`) |
| `Downloads/Relatorio_Auditoria_Lotofacil_3795.xlsx` | Relatório gerado por ferramenta anterior (9 abas) | Referência cruzada externa de frequências/Z/atrasos |

### Particularidades do XLSX oficial (impactam o parser)

* Elementos com prefixo de namespace (`<x:row>`, `<x:c>`), não o padrão `<row>`.
* Linhas e células de dados **sem atributo `r`** (posição implícita/sequencial).
* `<x:dimension ref="A1:AG1">` **incorreto** (declara só a 1ª linha) — não confiável.
* Dezenas como `t="n"` com zeros à esquerda (`01`), datas como `t="str"` em `DD/MM/AAAA`.
* `sharedStrings.xml` declara UTF-8 mas contém bytes não-UTF-8 (cabeçalhos acentuados).
* Colunas financeiras com texto `R$...` (ignoradas pela análise).

Conclusão: um leitor XLSX ingênuo (que dependa de `r`/`dimension`) falharia. O parser
próprio precisa tratar posição implícita, namespaces e fallback de encoding.

## 2. Problemas encontrados no relatório anterior (ferramenta externa)

1. **Qui-quadrado mal calibrado (erro metodológico).** O relatório anterior usou
   χ² = Σ(O−E)²/E = 23,82 com gl=24 → p = 0,472. Porém as 25 contagens não são
   células multinomiais independentes: cada concurso sorteia 15 dezenas **sem reposição**.
   Sob H0, Var(Oᵢ) = T·0,24 e Cov(Oᵢ,Oⱼ) = −0,01·T, logo
   E[Σ(O−E)²/E] = 25·0,4 = **10**, não 24. A estatística de Pearson clássica é
   distribuída como (10/24)·χ²₂₄. A estatística corrigida é
   χ²_adj = Σ(O−E)²/E · (N−1)/(N−n) = 23,82 · 2,4 = **57,17** (gl=24), p ≈ 1,6·10⁻⁴.
   O motor novo reporta **ambas** e usa a corrigida para inferência
   (ver `MATHEMATICAL_METHODS.md §4`). Há teste Monte Carlo que comprova a calibração.
2. **Violação de cotas Q/N/F.** O relatório anterior "relaxou" 7Q/5N/3F para 5Q/7N/3F sem
   bloqueio. A especificação proíbe isso: o novo motor detecta e reporta inviabilidade.
3. Definição de "atraso médio" não documentada (0,648 vs. 0,667 teórico). O novo motor
   documenta explicitamente a definição usada.

## 3. Ambiente detectado

| Ferramenta | Versão | Observação |
|---|---|---|
| Bun | 1.3.14 | runtime de dev/testes |
| Node | 24.18 | presente, não é requisito |
| Rust/Cargo | 1.96 | permite build Tauri Windows |
| Git | 2.55 | |
| Android SDK/NDK | **ausente** | APK/AAB não podem ser gerados neste ambiente |
| Java/JDK | não configurado (`JAVA_HOME` vazio) | idem |

## 4. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Caminho do projeto com acento e espaços (`LOTOFÁCIL QUANT ENGINE`) | Ferramentas nativas (WiX/NSIS/Gradle) podem falhar | Testar build; documentar alternativa (copiar para caminho ASCII) |
| `DOMParser` indisponível em Web Workers/Bun | Parser XLSX quebraria no worker | Parser XML próprio, baseado em tokens |
| `crypto.subtle` exige contexto seguro | Hash falharia em `file://` | SHA-256 próprio em TS puro (testado com vetores oficiais) |
| Espaço C(25,15)=3.268.760 | Custo de CPU | Enumeração DFS com poda por limites; máscaras de 25 bits; Worker |
| Downloads via `<a download>` em Android WebView | Exportação pode não funcionar no APK | Documentado em KNOWN_ISSUES; adaptador de exportação isolado |
| Confusão entre heurística e fato | Credibilidade | Rotulagem explícita FATO/ESTATÍSTICA/HEURÍSTICA/OTIMIZAÇÃO/ASSUNÇÃO |

## 5. Dependências escolhidas (mínimas)

* **Runtime:** `fflate` (~8 kB, ZIP/deflate puro) — leitura e escrita de XLSX.
* **Dev:** `vite`, `typescript`, `tailwindcss` + `@tailwindcss/vite` (v4), `@biomejs/biome`
  (lint+format em binário único), `fake-indexeddb` (testes de integração de persistência),
  `@tauri-apps/cli`, `@types/bun`, fontes auto-hospedadas (`@fontsource-variable/*`)
  para funcionar offline.
* **Não utilizados:** React/Vue/etc., SheetJS (pesado), Chart.js (gráficos em SVG próprio),
  workbox (service worker próprio com manifesto de precache gerado no build).

## 6. Plano técnico

| Fase | Entrega |
|---|---|
| 1 Fundação | Vite+TS+Tailwind+Biome+bun test, constantes únicas, tipos, PRNG, SHA-256 |
| 2 Dados | Leitor XLSX/CSV próprio, `ValidationReport`, normalização, hash do dataset |
| 3 Scientific Engine | Combinações, hipergeométrica, esperanças/variâncias, χ² (clássico + corrigido), Z, atrasos, Markov, coocorrência, trincas, covariância, entropia |
| 4 Combinatorial Engine | Filtros, DFS com poda, viabilidade (diagnóstico + contagem exata), Validator independente |
| 5 Optimization | Scores normalizados, Hamming, GRASP + busca local, cobertura exata do portfólio |
| 6 UI | 10 páginas, volante 5×5, gráficos SVG, Worker com progresso |
| 7 Persistence | IndexedDB versionado, repositórios, backup com prévia/rollback |
| 8 PWA | manifest, SW com precache gerado, ícones |
| 9 Tauri | `src-tauri` (Windows + Android), ícones, build Windows |
| 10 Testes finais | regressão no dataset real, E2E no navegador, relatório final |
