# 📖 Manual do Usuário — LOTOFÁCIL QUANT ENGINE

**Versão do Manual:** 05 de Outubro de 2026  
**Aplicável à Versão do Sistema:** `v1.0.0` (Build Desktop & PWA)  
**Classificação:** Manual Oficial de Operação e Guia do Usuário  

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
   - [1.1. O que é o LOTOFÁCIL QUANT ENGINE?](#11-o-que-é-o-lotofácil-quant-engine)
   - [1.2. Para quem foi feito?](#12-para-quem-foi-feito)
   - [1.3. O Conceito Offline-First: Liberdade Total e Privacidade](#13-o-conceito-offline-first-liberdade-total-e-privacidade)
   - [1.4. Transparência e Taxonomia Epistêmica (FATO, ESTATÍSTICA, HEURÍSTICA)](#14-transparência-e-taxonomia-epistêmica)
2. [Como Instalar e Acessar o Sistema](#2-como-instalar-e-acessar-o-sistema)
   - [2.1. Instalação no Windows (Desktop — .exe ou .msi)](#21-instalação-no-windows-desktop--exe-ou-msi)
   - [2.2. Instalação e Uso via Navegador (PWA — Progressive Web App)](#22-instalação-e-uso-via-navegador-pwa--progressive-web-app)
3. [Guia de Início Rápido (Primeiros Passos em 4 Etapas)](#3-guia-de-início-rápido-primeiros-passos)
4. [O Funcionamento Offline e Seus Dados](#4-o-funcionamento-offline-e-seus-dados)
   - [4.1. Onde ficam guardadas as minhas informações?](#41-onde-ficam-guardadas-as-minhas-informações)
   - [4.2. Rotina de Backup com Rollback Atômico](#42-rotina-de-backup-com-rollback-atômico)
   - [4.3. Cuidados Críticos na Versão PWA (Navegador)](#43-cuidados-críticos-na-versão-pwa-navegador)
5. [Manual Operacional Passo a Passo (Mapeamento Completo das Telas)](#5-manual-operacional-passo-a-passo)
   - [5.1. Barra Superior e Indicador de Estado do Dataset](#51-barra-superior-e-indicador-de-estado-do-dataset)
   - [5.2. Tela 1: Dashboard Geral (`/dashboard`)](#52-tela-1-dashboard-geral-dashboard)
   - [5.3. Tela 2: Histórico e Ingestão de Concursos (`/historico`)](#53-tela-2-histórico-e-ingestão-de-concursos-historico)
   - [5.4. Tela 3: Análise Estatística e Teste Qui-Quadrado (`/estatistica`)](#54-tela-3-análise-estatística-e-teste-qui-quadrado-estatistica)
   - [5.5. Tela 4: Ciclo das 25 Dezenas, Linhas e Relacionamentos (`/ciclos`)](#55-tela-4-ciclo-das-25-dezenas-linhas-e-relacionamentos-ciclos)
   - [5.6. Tela 5: Cadeia de Markov e Matrizes de Transição (`/markov`)](#56-tela-5-cadeia-de-markov-e-matrizes-de-transição-markov)
   - [5.7. Tela 6: Matriz de Coocorrência e Covariância (`/coocorrencia`)](#57-tela-6-matriz-de-coocorrência-e-covariância-coocorrencia)
   - [5.8. Tela 7: Entropia Espacial e Partição Cartesiana (`/entropia`)](#58-tela-7-entropia-espacial-e-partição-cartesiana-entropia)
   - [5.9. Tela 8: Gerador Combinatório e Poda em Árvore (`/gerador`)](#59-tela-8-gerador-combinatório-e-poda-em-árvore-gerador)
   - [5.10. Tela 9: Portfólio de Jogos e Auditoria Zero-Trust (`/jogos`)](#510-tela-9-portfólio-de-jogos-e-auditoria-zero-trust-jogos)
   - [5.11. Tela 10: Relatórios Científicos Consolidados (`/relatorios`)](#511-tela-10-relatórios-científicos-consolidados-relatorios)
   - [5.12. Tela 11: Configurações, Backup e Restauração Segura (`/configuracoes`)](#512-tela-11-configurações-backup-e-restauração-segura-configuracoes)
6. [Perguntas Frequentes (FAQ)](#6-perguntas-frequentes-faq)
7. [Solução de Problemas (Troubleshooting)](#7-solução-de-problemas-troubleshooting)
8. [Boas Práticas e Recomendações Finais](#8-boas-práticas-e-recomendações-finais)

---

## 1. Visão Geral do Sistema

### 1.1. O que é o LOTOFÁCIL QUANT ENGINE?
O **LOTOFÁCIL QUANT ENGINE** é uma estação de trabalho analítica e combinatória de nível profissional projetada para o estudo estocástico e a geração auditável de portfólios de apostas para a Lotofácil.

Diferente de desdobramentos comerciais comuns ou planilhas simplistas baseadas em crenças e promessas irreais, o sistema apoia-se em fundamentos rigorosos da teoria da probabilidade, processos estocásticos (Cadeias de Markov), teste qui-quadrado de Pearson com correção para populações finitas, teoria da informação (Entropia de Shannon), distância de Hamming e algoritmos de otimização combinatória com poda em árvore (*Branch-and-Bound* e GRASP).

### 1.2. Para quem foi feito?
- **Apostadores Estratégicos e Bolões Profissionais:** que necessitam de portfólios diversificados com garantia de distância mínima entre jogos ($d_H \ge 8$ ou $d_H \ge 10$) e controle rigoroso de cobertura de dezenas.
- **Pesquisadores e Estudantes de Estatística/Computação:** interessados em auditar a aleatoriedade de sorteios públicos, verificar desvios de frequência, calcular matrizes de covariância estrutural e rodar testes retrospectivos out-of-sample (*Walk-Forward Backtesting*).
- **Usuários que Exigem Privacidade e Segurança:** que não desejam enviar suas estratégias ou históricos para servidores de terceiros na internet.

### 1.3. O Conceito Offline-First: Liberdade Total e Privacidade
O sistema foi construído sob o paradigma arquitetural **Offline-First**. Isso significa que:
1. **Zero Dependência de Nuvem:** Toda a lógica matemática, o processamento de planilhas e a geração de apostas ocorrem no processador do seu próprio dispositivo, utilizando Web Workers em segundo plano para não congelar a tela.
2. **Dados Salvos Localmente:** Os históricos de sorteios, as análises executadas e os jogos gerados são gravados exclusivamente no banco de dados local do seu navegador ou aplicativo Desktop (IndexedDB nativo).
3. **Privacidade Absoluta:** O aplicativo não possui telemetria de espionagem, não envia dados para servidores externos e pode ser utilizado mesmo que o computador esteja sem conexão com a internet (em modo avião ou desconectado da rede).

### 1.4. Transparência e Taxonomia Epistêmica
Todas as informações apresentadas na tela exibem pequenas insígnias coloridas chamadas **Badges Epistêmicos**, que deixam evidente o fundamento de cada dado:
- `[FATO]`: Fato matemático invariante ou dado histórico comprovado (ex.: concursos oficiais sorteados pela Caixa, contagens exatas).
- `[ESTATÍSTICA]`: Métrica amostral descritiva calculada sobre a base histórica (ex.: média de atrasos, desvio-padrão, frequência relativa).
- `[PROBABILIDADE]`: Probabilidade teórica exata deduzida por combinatória (ex.: espaço amostral de $C(25, 15) = 3.268.760$, distribuição hipergeométrica).
- `[HEURÍSTICA]`: Pontuação ou preferência configurada pelo usuário (ex.: pesos atribuídos a atrasos ou ciclos). Não representa garantia preditiva de ganho futuro.
- `[OTIMIZAÇÃO]`: Resultado algorítmico da busca combinatória (ex.: carteira calculada pelo GRASP satisfazendo distância de Hamming).

---

## 2. Como Instalar e Acessar o Sistema

O sistema é disponibilizado em dois formatos oficiais idênticos em funcionalidade: **Desktop Windows nativo** (via Tauri) e **Aplicativo Web Progressivo (PWA)**.

```
┌─────────────────────────────────────────────────────────────┐
│                 LOTOFÁCIL QUANT ENGINE                      │
├──────────────────────────────┬──────────────────────────────┤
│  Desktop Windows (Tauri)     │  Progressive Web App (PWA)   │
│  - Pacotes .msi ou .exe      │  - Execução via Chrome/Edge  │
│  - WebView2 nativo           │  - Instalável via navegador  │
│  - Janela isolada de 1280x820│  - Service Worker offline    │
│  - Armazenamento em sandbox  │  - Cache local inteligente   │
└──────────────────────────────┴──────────────────────────────┘
```

---

### 2.1. Instalação no Windows (Desktop — .exe ou .msi)

#### Requisitos de Sistema:
- **Sistema Operacional:** Windows 10 (versão 1809 ou superior) ou Windows 11 (64-bit).
- **Componente de Sistema:** Microsoft Edge WebView2 Evergreen Runtime (instalado por padrão em todas as versões modernas do Windows 10 e 11).
- **Memória RAM:** Mínimo de 2 GB livres (recomendado 4 GB para geração rápida de pools grandes).
- **Armazenamento:** Aproximadamente 50 MB de espaço em disco para a aplicação e seus bancos locais.

#### Passo a Passo de Instalação:
1. Obtenha o instalador oficial (`lotofacil-quant-engine_1.0.0_x64-setup.exe` ou pacote corporativo `.msi`).
2. Dê um duplo clique sobre o instalador.
3. **Tratamento do Alerta do Windows SmartScreen:**
   Como a aplicação é distribuída de forma independente sem certificado de assinatura comercial de código da Microsoft, o Windows poderá exibir a tela azul *"O Windows protegeu o seu computador" (SmartScreen)*.
   - Clique no link sublinhado **"Mais informações"**.
   - Em seguida, clique no botão **"Executar assim mesmo"**.
   - *Nota de Segurança:* O executável não possui vírus nem conexão oculta; trata-se de um procedimento padrão do Windows para binários novos de distribuição livre.
4. Conclua o assistente de instalação seguindo os passos na tela.
5. O instalador criará automaticamente o atalho **"LOTOFÁCIL QUANT ENGINE"** no Menu Iniciar e na Área de Trabalho.
6. Ao abrir o aplicativo, uma janela limpa e dedicada de 1280×820 pixels será iniciada.

---

### 2.2. Instalação e Uso via Navegador (PWA — Progressive Web App)

Se preferir não instalar programas executáveis, você pode utilizar a versão PWA completa diretamente pelo navegador com suporte offline.

#### Navegadores Recomendados:
- **Google Chrome** (versão 100 ou superior no Windows, Mac, Linux ou Android).
- **Microsoft Edge** (versão 100 ou superior).
- **Brave Browser** ou navegadores baseados em Chromium.

#### Passo a Passo de Instalação do PWA:
1. Acesse o endereço web onde a aplicação está hospedada (ou inicie o servidor local em `http://localhost:4173`).
2. Observe a barra de endereços do navegador no topo:
   - No **Google Chrome**: surgirá um pequeno ícone de monitor com seta para baixo escrito *"Instalar aplicativo"* ou *"Instalar LOTOFÁCIL QUANT ENGINE"*.
   - No **Microsoft Edge**: surgirá um ícone de três quadrados com um sinal de soma escrito *"Aplicativo disponível. Instalar LOTOFÁCIL QUANT ENGINE"*.
3. Clique nesse ícone e confirme no botão **"Instalar"**.
4. O navegador criará uma janela de aplicativo dedicada (sem barra de abas ou barra de endereços do navegador) e adicionará o atalho à Área de Trabalho e ao Menu Iniciar.
5. A partir deste momento, o Service Worker (`/sw.js`) armazenará em cache local todos os componentes necessários. Você poderá desligar o roteador ou ativar o Modo Avião e o sistema continuará abrindo e funcionando instantaneamente.

---

## 3. Guia de Início Rápido (Primeiros Passos)

Em apenas 4 passos você realiza sua primeira ingestão e gera uma carteira matemática otimizada:

```
[ PASSO 1 ] ➔ Importar Histórico Oficial (.xlsx ou .csv da Caixa)
     ↓
[ PASSO 2 ] ➔ Visualizar os Diagnósticos Automáticos no Dashboard
     ↓
[ PASSO 3 ] ➔ Configurar o Gerador Combinatório (Restrições Duras e Hamming)
     ↓
[ PASSO 4 ] ➔ Gerar, Auditar (Zero-Trust) e Exportar os Jogos (TXT/CSV/XLSX)
```

1. **Passo 1 — Importar Dados:** Clique no botão azul **"Importar"** no canto superior direito do cabeçalho. Selecione a planilha oficial da Lotofácil (formato `.xlsx` fornecido pela Caixa ou amostra incluída). Em menos de 1 segundo, milhares de sorteios serão lidos, validados e catalogados.
2. **Passo 2 — Conferir o Dashboard:** O sistema exibe o resumo completo: total de sorteios, último concurso, estatística do teste qui-quadrado e dezenas em atraso térmico.
3. **Passo 3 — Configurar o Gerador:** No menu lateral esquerdo, clique em **"Gerador Combinatório"**. Escolha quantas apostas deseja (ex.: 10 apostas), verifique o limite de soma (170 a 220), paridade (7 a 8 pares) e certifique-se de que a distância de Hamming mínima esteja em $d_H \ge 8$ ou $d_H \ge 10$.
4. **Passo 4 — Gerar e Exportar:** Clique no botão roxo **"GERAR JOGOS"**. O motor executará a busca com poda em árvore e validação Zero-Trust. Em seguida, na aba **"Jogos & Auditoria"**, confira a validação de cada aposta e clique em **"Exportar TXT"** ou **"Exportar XLSX"** para salvar seu volante pronto para ser jogado na lotérica ou no canal eletrônico.

---

## 4. O Funcionamento Offline e Seus Dados

### 4.1. Onde ficam guardadas as minhas informações?
No **LOTOFÁCIL QUANT ENGINE**, nada fica em servidores remotos. Seus dados residem no banco de dados interno **IndexedDB** do navegador ou do WebView2 desktop, no banco nomeado:
```text
LOTOFACIL_QUANT_ENGINE_DB (Schema v1)
```
Ele é dividido em 7 tabelas organizadas:
- `datasets`: metadados dos arquivos importados com hash SHA-256 canônico;
- `contests`: todos os concursos sorteados com dezenas, data e ordenação;
- `analyses`: relatórios estatísticos processados pelo motor;
- `configurations`: seus perfis de filtros e restrições personalizadas;
- `generatedGames`: histórico de carteiras geradas e auditadas;
- `reports`: relatórios técnicos científicos emitidos;
- `backups`: histórico de snapshots locais para rollback seguro.

### 4.2. Rotina de Backup com Rollback Atômico
Para proteger seus dados contra falhas de hardware ou troca de computador:
1. Vá até o menu lateral e clique em **"Configurações & Backup"**.
2. No painel *Criar Arquivo de Backup (.json)*, clique em **"Baixar Backup Completo"**.
3. O sistema gerará um arquivo `.json` com integridade criptográfica verificada por assinatura SHA-256. Salve-o em um pendrive ou pasta na nuvem pessoal.
4. Para restaurar em outro computador, clique em **"Selecionar Arquivo de Backup"**. O sistema fará a validação estrutural do arquivo, exibirá uma prévia com a quantidade exata de registros e permitirá confirmar a restauração.
5. Se o arquivo estiver corrompido ou for inválido, a operação é rejeitada instantaneamente sem alterar qualquer dado atual (*Rollback Garantido*).

### 4.3. Cuidados Críticos na Versão PWA (Navegador)

> [!CAUTION]
> **Atenção ao Limpar o Histórico do Navegador:**
> Ao utilizar a versão PWA no navegador, caso você utilize a função *"Limpar dados de navegação"* e marque as opções *"Cookies e outros dados do site"* ou *"Armazenamento local/dados em cache"*, o navegador **apagará o banco IndexedDB**.
> 
> **Recomendações:**
> - Crie um arquivo de backup (`.json`) periodicamente através da tela de Configurações.
> - Não utilize a aplicação em janelas anônimas se desejar que seus jogos e históricos permaneçam salvos para a próxima sessão.
> - Se preferir isolamento total imune à limpeza de cache de navegadores, instale a **versão Desktop Windows (.exe/.msi)**.

---

## 5. Manual Operacional Passo a Passo

O sistema é dividido em **11 telas principais**, acessíveis pela barra lateral esquerda de navegação.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Dashboard                 7. Entropia Espacial           │
│ 2. Histórico de Concursos    8. Gerador Combinatório        │
│ 3. Análise Estatística       9. Jogos & Auditoria           │
│ 4. Ciclo + Linhas + Cobertura 10. Relatórios Técnicos       │
│ 5. Cadeia de Markov          11. Configurações & Backup     │
│ 6. Coocorrência & Covariância                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.1. Barra Superior e Indicador de Estado do Dataset

Localizada no topo de todas as páginas:

| Elemento | O que faz | Regras / Comportamento |
| :--- | :--- | :--- |
| **Logo e Versão (`v1.0.0`)** | Identifica a versão do motor em execução. | Fixo. |
| **Pílula de Status do Dataset (`#dataset-status-pill`)** | Exibe o nome do arquivo carregado e total de concursos ativos. | Luz verde quando carregado; luz âmbar com texto *"Nenhum histórico carregado"* quando vazio. |
| **Botão "Importar" (`#btn-quick-import`)** | Abre a caixa de diálogo para escolher arquivo `.xlsx`, `.csv` ou `.txt`. | Aceita planilhas oficiais da Caixa ou arquivos formatados. |

---

### 5.2. Tela 1: Dashboard Geral (`/dashboard`)

A tela inicial consolida uma visão executiva instantânea da base de dados e do estado estatístico do sorteio mais recente.

#### Elementos da Tela:
| Seção / Card | Informação Exibida | O que significa |
| :--- | :--- | :--- |
| **Card "Total de Concursos"** | Número total de sorteios válidos importados (ex.: 3.795). | Amostra histórica ativa em análise. |
| **Card "Último Concurso"** | Número e data do concurso mais recente catalogado. | Ponto de partida temporal para cálculo de atrasos e ciclo. |
| **Card "Qui-Quadrado Global"** | Valor do $\chi^2$ ajustado e p-valor rigoroso. | Indica se a distribuição geral das dezenas é estatisticamente consistente com uma roleta justa. |
| **Card "Classificação Térmica"** | Quantidade de dezenas Quentes ($Z \ge 1.0$), Neutras e Frias ($Z \le -1.0$). | Mede a temperatura recente das dezenas nos últimos 30 concursos. |
| **Quadro do Último Sorteio** | As 15 dezenas sorteadas no concurso mais recente, com destaque de cor. | Referência para contagem de dezenas repetidas no próximo jogo. |
| **Tabela Resumo de Atrasos** | Top dezenas com maior número de sorteios sem aparecer. | Identifica anomalias em relação à média esperada de atraso (~0,67 sorteios). |

[Local para captura de tela: Visão geral do Dashboard com métricas de dataset e último sorteio]

---

### 5.3. Tela 2: Histórico e Ingestão de Concursos (`/historico`)

Permite inspecionar detalhadamente cada sorteio registrado no banco de dados e verificar as propriedades de cada concurso.

#### Elementos da Tela:
| Elemento | Tipo | Ação / Regra |
| :--- | :--- | :--- |
| **Botão "Importar Novo Histórico"** | Botão de ação | Abre seletor de arquivos para recarregar ou atualizar a base com sorteios novos. |
| **Tabela de Concursos** | Tabela interativa | Ordenada por padrão do concurso mais recente ao mais antigo. |
| **Coluna "Concurso"** | Inteiro | Número do concurso oficial (ex.: 3795). |
| **Coluna "Data"** | Data BR | Data da realização do sorteio (`DD/MM/AAAA`). |
| **Coluna "Dezenas Sorteadas"** | 15 números | Dezenas oficiais de 1 a 25 formatadas com dois dígitos. |
| **Coluna "Soma"** | Métrica | Soma aritmética das 15 dezenas (normalmente entre 170 e 220). |
| **Coluna "Par/Ímp"** | Proporção | Contagem de números pares e ímpares (ex.: 7P / 8I). |
| **Coluna "Primos"** | Contagem | Quantidade de dezenas primas presentes no jogo (2, 3, 5, 7, 11, 13, 17, 19, 23). |
| **Coluna "Moldura"** | Contagem | Quantidade de dezenas localizadas na borda do volante de 25 posições (normalmente 9 a 11). |
| **Coluna "Repetidas"** | Contagem | Dezenas que também foram sorteadas no concurso imediatamente anterior (normalmente 8 a 10). |

[Local para captura de tela: Tabela de histórico de concursos com propriedades de cada sorteio]

---

### 5.4. Tela 3: Análise Estatística e Teste Qui-Quadrado (`/estatistica`)

Apresenta a auditoria de equiprobabilidade científica das 25 dezenas da Lotofácil, demonstrando a validade estocástica do sorteio.

#### Seções da Tela:
1. **Painel do Teste de Pearson & FPC:**
   - Estatística Clássica de Pearson $\chi^2$ (graus de liberdade = 24).
   - Ajuste por Fator de Correção de População Finita (FPC = 2,40), exigido pela regra matemática de que a Lotofácil extrai 15 bolas *sem reposição* de 25 bolas.
   - Diagnóstico epistemológico formal: indica se a hipótese nula de equiprobabilidade $H_0$ é aceita ou rejeitada.
2. **Mapa de Frequências das 25 Dezenas:**
   - Frequência absoluta (número de aparições em toda a história).
   - Frequência relativa (porcentagem observada comparada à teórica de $60,0\%$).
   - Desvio Z-Score histórico global e Z-Score local na janela móvel de 30 concursos.
3. **Distribuição de Atrasos e Limiares $\sigma$:**
   - Atraso atual de cada dezena.
   - Status de alerta: `NORMAL`, `ATENÇÃO` (atraso $> \mu + 1.0\sigma$) ou `ALERTA` (atraso $> \mu + 1.5\sigma$).

[Local para captura de tela: Painel de qui-quadrado ajustado e gráfico de frequências 1 a 25]

---

### 5.5. Tela 4: Ciclo das 25 Dezenas, Linhas e Relacionamentos (`/ciclos`)

O coração do estudo estrutural do volante cartesiano 5×5 e dos ciclos de fechamento.

#### Seções da Tela:
1. **Painel de Rastreamento de Ciclo:**
   - **Ciclo Atual:** Exibe em que sorteio o ciclo vigente se encontra, quantas dezenas das 25 já foram sorteadas e a lista exata das **dezenas ausentes** que faltam sair para fechar o ciclo.
   - **Métricas Históricas:** Duração média de fechamento do ciclo (tipicamente 4 a 5 sorteios), mediana, ciclo mais rápido da história e ciclo mais longo.
2. **Distribuição das 5 Linhas do Volante:**
   - Análise das 5 linhas horizontais:
     - Linha 1: 01, 02, 03, 04, 05
     - Linha 2: 06, 07, 08, 09, 10
     - Linha 3: 11, 12, 13, 14, 15
     - Linha 4: 16, 17, 18, 19, 20
     - Linha 5: 21, 22, 23, 24, 25
   - Ranking dos vetores mais frequentes (ex.: vetor `3-3-3-3-3`, `4-3-3-3-2`, etc.).
   - Distância de Manhattan entre sorteios consecutivos.
3. **Pares Relacionados (Casadas e Brigadas com FDR $q < 0.05$):**
   - **Dezenas Casadas:** Pares com correlação positiva estatisticamente comprovada após controle rigoroso de falsos positivos pelo procedimento de Benjamini-Hochberg ($q < 0.05$).
   - **Dezenas Brigadas:** Pares que apresentam coocorrência significativamente menor do que o esperado por suas frequências marginais.
   - *Garantia Científica:* Caso nenhum par satisfaça o limiar de significância estatística, a tela exibe com honestidade: `SEM EVIDÊNCIA SUFICIENTE`.
4. **Walk-Forward Backtesting (Validação Retrospectiva Out-of-Sample):**
   - **Seletor de Modo:**
     - `FAST (Proxy Heurístico)`: simulação rápida para verificação ágil no navegador.
     - `PRODUCTION (Equivalente Produção)`: executa o motor com branch-and-bound real sobre pontos passados congelados.
   - **Seletor de Concursos:** Testar os últimos 20, 30 ou 50 concursos.
   - **Tabela dos 7 Benchmarks (§15):** Compara apostas aleatórias contra estratégias equilibradas, de ciclo e o Modelo Híbrido Completo.
   - **Tabela de Testes de Ablação (§16):** Mede a contribuição marginal de cada módulo (FULL MODEL vs remoção isolada de ciclo, linhas, pares, atrasos ou cobertura).

[Local para captura de tela: Painel de ciclo atual, dezenas ausentes e tabela de backtest]

---

### 5.6. Tela 5: Cadeia de Markov e Matrizes de Transição (`/markov`)

Permite inspecionar a dependência estocástica de 1ª ordem entre concursos consecutivos.

#### Elementos da Tela:
- **Matriz de Presença Condicional $25 \times 25$:** Informa a probabilidade empírica $P(X_j^{(t+1)} = 1 \mid X_i^{(t)} = 1)$, ou seja: se a dezena $i$ foi sorteada no concurso anterior, qual a probabilidade de a dezena $j$ ser sorteada no próximo.
- **Matriz de Ausência Condicional:** Probabilidade de transição a partir da ausência de dezenas.
- **Seletor de Dezena em Foco:** Permite escolher uma dezena (1 a 25) para inspecionar seu vetor específico de transição ordenado pelas maiores probabilidades condicionais.

[Local para captura de tela: Matriz de transição de Markov em grade de calor]

---

### 5.7. Tela 6: Matriz de Coocorrência e Covariância (`/coocorrencia`)

Avalia a relação mútua entre todos os 300 pares possíveis de dezenas $C(25, 2)$.

#### Elementos da Tela:
- **Matriz Triangular de Coocorrência:** Exibe quantas vezes cada par de números apareceu junto em toda a história.
- **Desvio Relativo em Relação ao Baseline Teórico ($35,0\%$):** Realça em verde pares com frequência acima do teórico e em vermelho pares abaixo da média.
- **Matriz de Covariância Estrutural:** Demonstração empírica da covariância negativa inerente a sorteios de soma fixa ($\sum X_i = 15$). A covariância média entre quaisquer dezenas é teoricamente igual a $-0,0100$.

[Local para captura de tela: Mapa de calor de coocorrência dos 300 pares]

---

### 5.8. Tela 7: Entropia Espacial e Partição Cartesiana (`/entropia`)

Aplica a fórmula da **Entropia de Shannon** sobre a distribuição geométrica das dezenas no volante de 5 linhas e 5 colunas.

#### Elementos da Tela:
- **Entropia de Linhas ($H_{\text{linhas}}$):** Mede quão uniformemente as 15 dezenas distribuem-se entre as 5 linhas. A entropia máxima possível é $\log_2(5) \approx 2,3219$ bits.
- **Entropia de Colunas ($H_{\text{colunas}}$):** Mede a uniformidade entre as 5 colunas verticais.
- **Classificação de Dispersão:** Identifica jogos muito agrupados (baixa entropia) ou perfeitamente espalhados pelo volante.

[Local para captura de tela: Gráficos de dispersão e cálculo de entropia espacial]

---

### 5.9. Tela 8: Gerador Combinatório e Poda em Árvore (`/gerador`)

O motor de montagem das apostas. Permite configurar filtros rigorosos e parâmetros de busca.

#### 1. Cabeçalho e Indicador de Viabilidade em Tempo Real (§12):
Antes de você clicar em gerar, o sistema avalia suas restrições instantaneamente:
- **Faixa Verde ("Configuração Viável"):** Os limites escolhidos são matematicamente compatíveis entre si.
- **Faixa Vermelha ("CONFIGURAÇÃO INVIÁVEL"):** Há parâmetros conflitantes que tornam impossível encontrar apostas válidas (ex.: solicitar 7 dezenas quentes quando só existem 4 quentes disponíveis no histórico). O sistema lista o motivo e exibe o botão *"Ajustar Parâmetros"*.

#### 2. Restrições Duras (Hard Constraints):
Campos que nenhuma aposta gerada pode violar:

| Campo | Padrão Recomendado | Descrição e Justificativa |
| :--- | :--- | :--- |
| **Quantidade de Apostas** | `10` | Tamanho do portfólio a ser gerado (1 a 100 jogos). |
| **Intervalo da Soma** | `170 a 220` | Soma das 15 dezenas. A média teórica é 195 (±18). Mais de $80\%$ dos sorteios recaem nesta faixa. |
| **Pares (Paridade)** | `7 a 8` | Quantidade de números pares (7 pares / 8 ímpares ou 8 pares / 7 ímpares representam cerca de $62\%$ dos sorteios). |
| **Primos** | `5 a 6` | Quantidade de primos (2, 3, 5, 7, 11, 13, 17, 19, 23). Média teórica de 5,4. |
| **Moldura** | `9 a 11` | Dezenas localizadas na borda do volante (16 dezenas no total). Média teórica de 9,6. |
| **Fibonacci** | `3 a 5` | Dezenas da sequência (1, 2, 3, 5, 8, 13, 21). Média teórica de 4,2. |
| **Repetição do Anterior** | `8 a 10` | Dezenas repetidas em relação ao último sorteio. Média teórica de 9,0 dezenas. |
| **Hamming Mínimo ($d_H$)** | `10` | Distância mínima entre quaisquer dois jogos da carteira. $d_H \ge 10$ garante que dois jogos nunca compartilham mais que 10 dezenas idênticas. |
| **Seed PRNG (Determinismo)** | `42` | Semente do gerador pseudo-aleatório. A mesma seed garante geração estritamente idêntica. |
| **Restrição de Linhas** | `Equilibrado (BALANCED)` | Modos disponíveis: `Livre (FREE)`, `Equilibrado (2 a 4 por linha)`, `Estatístico` ou `Híbrido`. |
| **Composição da Carteira** | `Modelo 5-3-2` | Arquitetura do portfólio: 5 jogos estatísticos (Grupo A), 3 jogos de equilíbrio/ciclo (Grupo B) e 2 jogos alternativos/cobertura (Grupo C). Também permite estratégias especializadas A até F. |
| **Máx. Ausentes por Jogo** | `2 ou 3` | Evita concentrar todas as dezenas atrasadas em um único jogo, promovendo a dispersão recomendada pelo Absence Optimizer. |

#### 3. Seleção Manual de Dezenas Fixas e Excluídas:
- Clique sobre os números no volante para marcá-los como **FIXOS** (presentes obrigatoriamente em todos os jogos) ou **EXCLUÍDOS** (proibidos em qualquer jogo).

#### 4. Pesos Multicritério de Pontuação (Scoring Heurístico):
- Sliders configuráveis de 0 a 3 para calibrar a relevância de cada sinal estatístico (Frequência, Z-Score, Atraso, Markov, Coocorrência, Entropia, Ciclo, Linhas, Casadas, Brigadas e Equilíbrio de Exposição).
- *Lembrete:* Se um peso for definido como `0`, o componente é totalmente anulado do cálculo de pontuação.

[Local para captura de tela: Painel de restrições duras e sliders de ponderação do gerador]

---

### 5.10. Tela 9: Portfólio de Jogos e Auditoria Zero-Trust (`/jogos`)

Após a execução do gerador, esta página apresenta as apostas prontas e auditadas.

#### Elementos da Tela:
1. **Selo de Validação Global:**
   - Exibe `100% VÁLIDOS` em verde caso todas as apostas tenham passado pelo auditor Zero-Trust independente ([validator.ts](file:///c:/Users/Usu/Documents/LOTOFÁCIL%20QUANT%20ENGINE/src/core/combinatorial/validator.ts)).
   - Se houver qualquer divergência de tamanho, intervalo, unicidade ou distância de Hamming, o sistema exibe alerta e lista as violações.
2. **Barra de Métricas do Portfólio:**
   - **Hamming Mínimo Real:** Confirma se a menor distância encontrada cumpre a meta (ex.: $d_H \ge 10$).
   - **Hamming Médio:** Média de diversidade de toda a carteira.
   - **1-Cobertura (Dezenas):** Quantidade de dezenas distintas cobertas pelo conjunto de jogos (ex.: 25/25 dezenas).
   - **2-Cobertura (Pares):** Total de pares distintos cobertos pelo portfólio dentre os 300 pares possíveis.
3. **Cartões Individuais de Cada Aposta:**
   - Lista das 15 dezenas em ordem crescente, com cores que identificam sua distribuição térmica e posicional.
   - Resumo das propriedades: Soma, Pares, Primos, Moldura, Fibonacci, Repetidas e Padrão de Linhas (ex.: `[3-3-3-3-3]`).
   - Botão **"Ver Explicação Auditável"**: Abre modal detalhando exatamente por que aquela aposta foi selecionada, as contribuições individuais de cada peso e a lista de dezenas casadas/brigadas presentes nela.
4. **Barra de Exportação:**
   - **Exportar TXT:** Gera arquivo de texto simples contendo uma aposta por linha (com ou sem cabeçalho de auditoria).
   - **Exportar CSV:** Gera planilha delimitada por vírgula compatível com Excel e Google Sheets.
   - **Exportar XLSX:** Gera arquivo nativo do Microsoft Excel com formatação visual e células formatadas.
   - **Exportar JSON:** Gera payload completo com metadados de reprodutibilidade científica (seed, hash do dataset, data e breakdowns).

[Local para captura de tela: Lista de jogos gerados com métricas de Hamming e botões de exportação]

---

### 5.11. Tela 10: Relatórios Científicos Consolidados (`/relatorios`)

Gera um laudo completo em formato Markdown técnico com todos os parâmetros do motor, diagnósticos do qui-quadrado, dezenas térmicas, ciclo atual e jogos gerados. Ideal para impressão, arquivo de comprovação ou auditoria de bolões.

#### Ações Disponíveis:
- **Copiar Relatório:** Copia todo o texto formatado para a área de transferência do sistema operacional.
- **Baixar (.md):** Salva o arquivo de documentação técnica em disco.

---

### 5.12. Tela 11: Configurações, Backup e Restauração Segura (`/configuracoes`)

Gerenciamento de persistência e segurança dos dados.

#### Ações Disponíveis:
- **Baixar Backup Completo (`#btn-export-backup`):** Salva todo o banco IndexedDB em arquivo `.json` com checksum SHA-256 embutido.
- **Selecionar Arquivo de Backup (`#btn-trigger-import-backup`):** Permite restaurar um backup prévio. Antes de gravar qualquer informação, o sistema valida a integridade do arquivo, exibe modal com a quantidade de dados a serem restaurados e solicita sua confirmação expressa.
- **Redefinir Filtros (`#btn-restore-defaults`):** Restaura os intervalos de soma, paridade, moldura e pesos heurísticos para os padrões originais de engenharia.

---

## 6. Perguntas Frequentes (FAQ)

### 1. Preciso de internet para usar o sistema?
**Não.** O LOTOFÁCIL QUANT ENGINE é 100% Offline-First. Tanto a versão instalada (.exe/.msi) quanto a versão PWA no navegador operam integralmente sem acesso à internet. Você só precisará de conexão se desejar baixar atualizações do software ou baixar novos arquivos de sorteios da Caixa.

### 2. Se a energia cair ou a internet sumir, eu perco o que fiz?
**Não.** Todas as importações de arquivos, configurações e jogos gerados são salvos automaticamente no banco de dados local IndexedDB do seu computador. Mesmo se a máquina desligar abruptamente, ao reabrir o aplicativo seus dados estarão intactos.

### 3. Qual a diferença entre usar o programa instalado (.exe/.msi) e o PWA pelo navegador?
Ambos compartilham exatamente o mesmo motor matemático e recursos visuais. As principais diferenças práticas são:
- **Desktop (.exe/.msi):** Executa em janela própria do Windows via WebView2; seus dados ficam em sandbox no diretório do aplicativo, ficando imunes caso você limpe o histórico de navegação ou cookies do seu navegador diário.
- **PWA (Navegador):** Não requer permissões de instalação de software de terceiros; abre em qualquer computador moderno via Edge/Chrome, porém requer cuidado para não limpar os dados de navegação do site.

### 4. O Windows bloqueou a instalação dizendo que o arquivo é desconhecido, o que fazer?
Isso ocorre porque o instalador é distribuído diretamente sem um certificado corporativo pago da Microsoft (SmartScreen). Para prosseguir com segurança, clique no link **"Mais informações"** que aparece no alerta azul e, em seguida, clique em **"Executar assim mesmo"**.

### 5. Como faço para levar meus dados para outro computador?
Basta ir na aba **"Configurações & Backup"**, clicar em **"Baixar Backup Completo"** e salvar o arquivo `.json`. No outro computador, abra o LOTOFÁCIL QUANT ENGINE, vá na mesma aba, clique em **"Selecionar Arquivo de Backup"** e confirme a importação.

### 6. Por que o sistema rejeita minha configuração ao clicar em "GERAR JOGOS"?
O sistema possui um verificador de viabilidade matemática precoce (§12). Se você definir filtros que se contradizem (por exemplo: exigir soma entre 170 e 180, mas exigir 10 dezenas na moldura com números altos), ou se pedir cotas de dezenas Quentes/Neutras/Frias que superam as dezenas disponíveis no histórico recente, o sistema bloqueia a geração e informa o erro exato na faixa vermelha no topo da página.

### 7. O que significa "Distância de Hamming"?
A distância de Hamming ($d_H$) mede a diferença dezena por dezena entre duas apostas. Como cada jogo da Lotofácil possui exatamente 15 dezenas, a distância de Hamming entre dois jogos é calculada como:
$$d_H(A, B) = 30 - 2 \times |A \cap B|$$
Ou seja:
- $d_H = 8$: os dois jogos possuem 11 dezenas em comum (e 4 diferentes em cada um).
- $d_H = 10$: os dois jogos possuem no máximo 10 dezenas em comum (e 5 diferentes em cada um).
Quanto maior a distância de Hamming mínima, mais diversificado e disperso é o seu portfólio de apostas, evitando gastar dinheiro com jogos praticamente idênticos.

### 8. Por que algumas dezenas "Casadas" ou "Brigadas" não aparecem e o sistema exibe "SEM EVIDÊNCIA SUFICIENTE"?
Ao contrário de ferramentas comerciais que forçam listas artificiais de dezenas com base em pequenos desvios aleatórios, o LOTOFÁCIL QUANT ENGINE aplica um teste qui-quadrado de contingência $2 \times 2$ com correção de continuidade de Yates e controle de Taxa de Falsas Descobertas (FDR de Benjamini-Hochberg a $q < 0,05$). Se a coocorrência de um par puder ser explicada pelo mero acaso ou pelas frequências individuais de cada número, o sistema não rotula o par como casado ou brigado, protegendo o usuário de falácias estatísticas.

### 9. A semente (Seed) garante que terei sempre o mesmo resultado?
**Sim.** O gerador de números pseudo-aleatórios empregado é o `xoshiro128**`, um algoritmo determinístico de alta performance. Mantendo o mesmo histórico de concursos, as mesmas restrições e a mesma semente (ex.: Seed = 42), o sistema gerará rigorosamente as mesmas apostas na mesma ordem, em qualquer computador.

---

## 7. Solução de Problemas (Troubleshooting)

| Sintoma / Problema | Causa Provável | Como Resolver |
| :--- | :--- | :--- |
| **Alerta azul do Windows SmartScreen ao abrir o instalador** | Executável sem assinatura comercial da Microsoft Store. | Clique em *"Mais informações"* e em seguida no botão *"Executar assim mesmo"*. |
| **Janela em branco ao abrir a versão Desktop** | Componente Microsoft Edge WebView2 desatualizado ou corrompido no Windows. | Acesse o site oficial da Microsoft, baixe e instale o *WebView2 Evergreen Bootstrapper*. |
| **Erro ao importar arquivo: "Formato inválido ou colunas ausentes"** | A planilha selecionada não possui o cabeçalho oficial da Caixa ou tem formato não reconhecido. | Utilize a planilha original baixada no portal Loterias Caixa (`.xlsx`) ou um arquivo `.csv` contendo as 15 colunas das dezenas sorteadas. |
| **Aviso "CONFIGURAÇÃO INVIÁVEL" no Gerador** | Conflito lógico entre restrições duras (soma incompatível com paridade, ou cotas térmicas que superam o disponível). | Clique no botão *"Ajustar Parâmetros"* ou em *"Restaurar Padrões"* para retornar aos valores viáveis de fábrica. |
| **O Gerador demora muito ou não encontra jogos com Hamming alto** | Solicitação de quantidade alta de apostas (ex.: 30 jogos) com $d_H \ge 12$ ou restrições muito estreitas. | O espaço combinatório compatível torna-se muito escasso. Reduza ligeiramente o Hamming para $d_H = 8$ ou $d_H = 10$, ou amplie a margem da soma e dezenas repetidas. |
| **Histórico e jogos sumiram na versão PWA** | Limpeza de cache, cookies ou dados de navegação realizada pelo usuário no navegador. | Restaure seu último arquivo `.json` salvo através da aba *Configurações & Backup*. Evite usar modo anônimo. |
| **Botão "Executar Backtest" não responde ou fica desabilitado** | Nenhum histórico de concursos foi importado previamente. | Importe uma planilha oficial antes de rodar simulações de backtest. |
| **Falha ao restaurar backup: "Checksum divergente"** | O arquivo `.json` de backup foi editado manualmente ou sofreu corrupção durante download/transferência. | O sistema possui trava criptográfica SHA-256 e recusa arquivos adulterados para não corromper o banco. Utilize um backup original íntegro. |

---

## 8. Boas Práticas e Recomendações Finais

1. **Mantenha seu Histórico Atualizado:** Sempre que houver novos concursos da Lotofácil, baixe o arquivo atualizado no portal da Caixa e importe-o no aplicativo. O sistema reconhecerá os novos sorteios e atualizará automaticamente o ciclo e os atrasos.
2. **Exporte Backups com Frequência:** Se você costuma salvar perfis personalizados de pesos e jogos gerados, reserve alguns segundos no final da semana para exportar um backup `.json` na aba de Configurações.
3. **Não Aposte Contra a Distribuição:** A imensa maioria dos sorteios históricos da Lotofácil concentra-se em somas entre 170 e 220, com 7 ou 8 pares e 9 a 11 números na moldura. Apostar em jogos extremos (como 15 números ímpares ou soma abaixo de 140) possui chance teórica quase desprezível.
4. **Use o Hamming a seu Favor:** Em bolões com 10 a 20 apostas, sempre mantenha o Hamming Mínimo em pelo menos $d_H \ge 8$ ou $d_H \ge 10$. Isso impede que você registre apostas redundantes que premiam exatamente as mesmas faixas.
5. **Atalhos e Facilidades:**
   - Use a tecla `Tab` para navegar rapidamente entre os campos de restrições duras.
   - Na tabela de histórico e na tabela de jogos, utilize a roda do mouse (*scroll*) para navegar confortavelmente pelos registros.
   - Utilize o botão *"Copiar"* na aba de Relatórios para colar as análises completas diretamente em e-mails, documentos Word ou mensagens de grupo do bolão.

---
*Manual do Usuário — LOTOFÁCIL QUANT ENGINE v1.0.0. Desenvolvido para operação offline, auditável e determinística.*
