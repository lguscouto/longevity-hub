# Reavaliação do Longevidade Hub após alterações do Codex

**Data da avaliação:** 05/08/2026  
**Branch avaliada:** `master`  
**Commit-base:** `5dca849` — `feat: evolucao completa do Longevidade Hub (migracoes, qualidade, check-in, carga de treino, energy bank, ritmo circadiano, correlacoes e PDF)`

## 1. Objetivo

Este documento registra os pontos observados após a reavaliação do estado atual do Longevidade Hub. A análise confrontou:

- a implementação presente no repositório;
- o documento [`monitoramento_saude_aplicativos.md`](monitoramento_saude_aplicativos.md);
- o plano de evolução produzido anteriormente;
- os contratos entre banco, ingestão, backend e frontend;
- os resultados reais dos testes automatizados, build e E2E.

O foco foi diferenciar funcionalidades realmente operacionais de estruturas apenas parciais, defeituosas, ausentes ou ainda não verificáveis.

## 2. Resumo executivo

O commit avaliado adicionou uma quantidade significativa de código: 63 arquivos, 5.083 inserções e 116 remoções. Foram criados módulos de migração, qualidade de dados, check-in diário, orientação diária, carga de treino, correlações, Energy Bank, ritmo circadiano e PDF médico.

Apesar desse avanço estrutural, o projeto **ainda não está pronto para uso confiável em decisões pessoais de saúde, recuperação ou treino**. Os principais motivos são:

- o fluxo local de inicialização abre uma URL sem servidor;
- o frontend compila, mas falha em testes unitários e em todos os cenários E2E;
- a orientação diária recomenda treino intenso mesmo sem baseline;
- o Energy Bank calcula um score usando valores clínicos default quando os dados estão ausentes;
- a qualidade de dados não é persistida pela ingestão Zepp real;
- o mecanismo de correlações ainda tem limitações estatísticas importantes;
- várias fases declaradas como concluídas permanecem apenas parciais.

**Classificação geral:** implementação parcial, com bloqueadores antes de uma release funcional.

## 3. Validação executada

### 3.1 Backend

Comando executado com banco SQLite temporário:

```bash
export PYTHONPATH=''
export LONGEVIDADE_DB_PATH='<sqlite-temporario>'
.venv/Scripts/python.exe -m pytest -q
```

Resultado:

```text
109 passed in 31.97s
```

A suíte backend passa, mas vários testes novos verificam somente estrutura básica. Eles não cobrem todos os comportamentos de risco encontrados na revisão.

### 3.2 Frontend unitário

Comando:

```bash
cd frontend
npm run test:run
```

Resultado:

```text
Test Files: 1 failed | 10 passed
Tests:      3 failed | 33 passed
```

Erros observados:

- `DataConfidenceBadge`: tentativa de ler `icon` de um valor indefinido;
- `DailyGuidanceCard`: tentativa de ler `length` de um valor indefinido;
- `DailyCheckinCard`: tentativa de chamar `includes` em um valor indefinido;
- `EnergyCircadianWidget`: tentativa de ler `current_level` de um valor indefinido;
- três testes de `App.test.tsx` falham depois que a árvore cai no `ErrorBoundary`.

### 3.3 Build de produção

Comando:

```bash
cd frontend
npm run build
```

Resultado:

```text
✓ 1497 modules transformed
✓ built in 2.79s
```

O build confirma que TypeScript e bundle compilam, mas não comprova o funcionamento da aplicação em runtime.

### 3.4 Playwright E2E

Comando:

```bash
cd frontend
npm run test:e2e
```

Resultado:

```text
4 failed
0 passed
```

Os novos endpoints não possuem mocks compatíveis com seus contratos. O fallback retorna `{}`, e os componentes novos não tratam respostas incompletas de maneira defensiva.

### 3.5 Integridade do diff

`git diff --check` não encontrou erros de whitespace no código avaliado.

## 4. Achados críticos

### 4.1 O launcher abre uma porta sem servidor

Arquivos envolvidos:

- `run_app.bat`;
- `backend/app/main.py`;
- `frontend/vite.config.ts`.

Comportamento observado:

- `run_app.bat` inicia apenas o Uvicorn em `127.0.0.1:8887`;
- o script abre `http://127.0.0.1:8886`;
- nenhum processo Vite é iniciado em 8886;
- o FastAPI já está preparado para servir `frontend/dist` na própria porta do backend.

**Impacto:** o fluxo documentado como “um clique” abre uma página sem servidor.

**Correção recomendada:** adotar uma única URL integrada para produção local. O launcher deve abrir exatamente a porta em que o FastAPI foi iniciado. Vite e proxy devem permanecer como fluxo separado de desenvolvimento.

### 4.2 Orientação diária prescreve esforço sem baseline

Arquivos envolvidos:

- `src/longevidade/algorithms/daily_guidance.py`;
- `backend/app/routers/daily_guidance.py`;
- `frontend/src/components/DailyGuidanceCard.tsx`.

Execução real com apenas `{steps: 1000}` e nenhum histórico:

```text
state: optimal
label: Prontidão Elevada
confidence: medium
score: 75
factors: []
primary_action: Excelente dia para treinos mais intensos de força ou VO2 Max.
```

Causa principal:

- o score começa em 75 pontos;
- o código aceita baseline com somente cinco observações;
- a confiança pode ser `medium` mesmo sem fator válido;
- o router consulta os 30 registros mais recentes globalmente, em vez de limitar o histórico aos dias anteriores a `date_ref`;
- o próprio dia consultado pode participar do baseline;
- falta um estado bloqueante `insufficient_data`.

Uma prova isolada com uma métrica em `2026-01-01` e cinco registros exclusivamente futuros fez o endpoint usar esses registros como baseline e retornar uma recomendação de recuperação com confiança alta. Portanto, além da cobertura insuficiente, existe **vazamento temporal**.

**Impacto:** recomendação de treino baseada na ausência de dados.

**Correção recomendada:** funcionar em modo *fail-closed*. Sem cobertura, baseline e métricas mínimas, a resposta deve ser `insufficient_data` e não pode recomendar intensidade.

### 4.3 Energy Bank produz score com valores default

Arquivos envolvidos:

- `src/longevidade/calculators/energy_and_stress.py`;
- `backend/app/routers/energy_circadian.py`;
- `frontend/src/components/EnergyCircadianWidget.tsx`.

Execução real usando somente `{steps: 1000}`:

```text
status: ok
current_level: 62
recharge: 35
drain: 13
```

O cálculo substitui dados ausentes por valores fixos, incluindo HRV 35 e RHR 60. Mesmo sem sono, HRV ou RHR medidos, a resposta é publicada como `ok`.

**Impacto:** um score sem base observacional pode ser interpretado como medição pessoal real.

**Correção recomendada:** retirar o widget do dashboard até que dados essenciais ausentes resultem em `status: unavailable` e `current_level: null`. Se o recurso retornar, deve ser nomeado como índice local não validado, com fórmula e limitações explícitas.

### 4.4 Frontend e E2E estão quebrados

- Vitest: 3 de 36 testes falharam na reexecução mais recente;
- Playwright: 4 de 4 cenários falharam;
- componentes novos assumem que toda resposta HTTP possui shape completo;
- não há testes unitários específicos para todos os componentes adicionados;
- um endpoint novo com resposta incompleta pode derrubar a árvore principal.

**Correção recomendada:** adicionar validação de contrato, defaults seguros que representem indisponibilidade e testes dedicados para cada componente novo.

## 5. Achados de alta prioridade

### 5.1 Qualidade de dados não está conectada à ingestão

Foram implementados:

- tabela `daily_metric_quality`;
- métodos do repositório;
- endpoint `/api/quality/daily`;
- `DataConfidenceBadge`;
- `DataQualityPanel`.

Entretanto, `save_daily_metric_quality()` só é chamado pelo teste `tests/test_metric_quality.py`. A ingestão Zepp não persiste qualidade por métrica.

Em banco vazio, a API responde:

```json
{
  "coverage_pct": 0.0,
  "confidence": "unavailable",
  "metrics_available": 0,
  "metrics_expected": 7,
  "warnings": [],
  "sources": ["Zepp"],
  "items": []
}
```

A origem `Zepp` é declarada mesmo sem evidência de coleta.

Também foi comprovado que a agregação aceita chaves arbitrárias. Cinco métricas sintéticas `unknown_*`, todas com cobertura 100%, produziram `confidence: high`, `coverage_pct: 100` e `metrics_available: 5`, embora nenhuma das sete métricas esperadas estivesse presente.

**Correção recomendada:** gerar e persistir qualidade na mesma transação lógica da importação diária. Sem dados, `sources` deve ser uma lista vazia. O endpoint deve aceitar somente chaves do catálogo esperado e calcular cobertura usando o denominador completo das métricas previstas.

### 5.2 Correlações ainda não são estatisticamente confiáveis

Arquivo principal:

- `src/longevidade/analytics/correlations.py`.

Pontos observados:

- mínimo de apenas sete pares;
- aproximação normal sobre a estatística t;
- múltiplas causas e lags testados sem correção de múltiplas comparações;
- `is_significant` definido diretamente por `p <= 0.05`;
- `lag_days` representa deslocamento de linha, não diferença cronológica real entre datas;
- ausência de qualidade e cobertura no resultado;
- ausência de interface frontend;
- `backend/app/routers/correlations.py` silencia erros com `except Exception: pass`.

**Impacto:** risco elevado de associação espúria ser apresentada como descoberta relevante. Em prova isolada, oito registros semanais produziram correlação perfeita tanto em `lag_days=0` quanto em `lag_days=1`, embora o segundo resultado não representasse um dia real de defasagem.

**Correção recomendada:** exigir pelo menos 20 pares, validar contra `scipy.stats.spearmanr`, aplicar correção de múltiplas comparações, incluir cobertura e não publicar linguagem causal.

### 5.3 Check-in tem autosave frágil e não atualiza a orientação

Arquivos envolvidos:

- `frontend/src/components/DailyCheckinCard.tsx`;
- `backend/app/routers/checkins.py`;
- `frontend/src/App.tsx`.

Pontos observados:

- salvamento otimista sem rollback;
- falha aparece apenas no console;
- cada clique dispara PUT completo;
- requisições concorrentes podem terminar fora de ordem;
- `onCheckinUpdated={fetchDashboardData}` não força o `DailyGuidanceCard` a buscar novamente, porque ele depende somente de `selectedDate`;
- a UI não expõe todos os campos já aceitos pelo backend, como dor, sintomas, doença, álcool, cafeína estruturada e notas.

**Correção recomendada:** usar debounce ou botão Salvar, exibir erro, restaurar estado em falha e criar um sinal explícito de refresh da orientação.

### 5.4 ReportLab não está declarado como dependência

`src/longevidade/reports/doctor_briefing_pdf.py` importa ReportLab. O pacote está instalado no `.venv` atual, mas não está declarado em:

- `backend/requirements.txt`;
- `pyproject.toml`.

**Impacto:** uma instalação nova pode iniciar normalmente e falhar apenas ao solicitar o PDF.

### 5.5 Doctor Briefing usa identidade e parâmetros default

Pontos observados:

- a rota Markdown usa `Paciente`, 40 anos;
- a rota PDF usa `Paciente`, 32 anos;
- o perfil real não é usado por padrão;
- todo exame começa classificado como “Ótimo”, inclusive quando não possui alvo conhecido, e apenas algumas chaves podem alterar o status;
- o PDF exibe “Alvo Clínico Longevidade” fixo;
- faltam qualidade, cobertura, tendências, intervenções, sintomas, N-of-1 e KDM.

**Correção recomendada:** construir o relatório a partir do perfil e dados persistidos, eliminar idade fixa e diferenciar alvos configuráveis de referências clínicas validadas.

### 5.6 Novas métricas Zepp não possuem cobertura direta suficiente

Os testes de `zepp_importer` simulam `build_zepp_daily_record`. Não existem testes diretos adequados para:

- HRV RMSSD por amostras;
- SpO₂;
- frequência respiratória;
- pressão arterial;
- PAI;
- carga e duração do treino;
- manifestos, validação e comparação de snapshots.

Riscos específicos observados:

- o alias genérico `rate` pode capturar valor que não representa frequência respiratória;
- duração desconhecida maior ou igual a 60 é dividida por 60, podendo tratar minutos como segundos;
- qualidade de snapshot não é convertida em qualidade persistida por métrica.

**Correção recomendada:** criar fixtures sintéticas para cada formato Zepp e testar diretamente `build_zepp_daily_record`, sem mocks do agregador principal.

### 5.7 Endpoints GET executam migrações e semeiam dados

Os novos GETs de qualidade, orientação, correlações, Energy/Circadian e check-ins chamam `initialize_db()` dentro do handler. Essa inicialização não é somente estrutural: ela pode criar diretórios, migrar tabelas, alterar `ai_settings`, criar perfil e semear cinco suplementos Blueprint.

Uma chamada isolada ao GET de qualidade, usando um caminho SQLite inexistente, criou o banco, elevou `user_version` para 3 e inseriu os cinco suplementos.

**Impacto:** endpoints aparentemente somente leitura produzem efeitos colaterais e inserem dados de demonstração.

**Correção recomendada:** executar inicialização/migração no ciclo de startup controlado. GETs não devem criar banco, migrar schema ou semear registros.

### 5.8 Ausência de snapshot de treino é persistida como zero treino

`_workout_values()` retorna `(0, None)` tanto quando o snapshot não existe quanto quando houve realmente zero treinos. O importador persiste esse zero, eliminando a distinção entre “sem coleta” e “nenhum treino”. O frontend também substitui campos ausentes por `0 treinos` e `0m`.

**Correção recomendada:** preservar `null` quando a fonte estiver indisponível e usar zero somente quando um snapshot válido comprovar ausência de treino.

### 5.9 Componentes escondem estados de baixa confiança

- `DailyGuidanceCard` retorna `null` em `insufficient_data`, ocultando as limitações que deveriam ser mostradas;
- o campo `limitations` existe no contrato, mas não é renderizado;
- loading e erro de orientação viram silêncio;
- `EnergyCircadianWidget` ignora `energy_bank.status` e sempre tenta renderizar percentual e recomendação;
- o painel de qualidade pode conservar resumo antigo após erro.

**Correção recomendada:** representar explicitamente `loading`, `error`, `unavailable`, `insufficient_data` e `stale`, sem substituir esses estados por ausência silenciosa.

### 5.10 Acessibilidade dos componentes novos está incompleta

- escalas do check-in não usam `fieldset`/`legend` nem `aria-pressed`;
- os botões 1–5 têm nomes acessíveis ambíguos;
- o seletor de data do painel de qualidade não possui label;
- modais N-of-1 e Doctor Briefing não possuem contrato completo de diálogo, trap de foco, Escape e restauração de foco;
- o toggle principal de suplementos usa uma `div` clicável e não é operável por teclado.

**Correção recomendada:** incluir esses fluxos na cobertura de Testing Library e Playwright, incluindo teclado, foco e leitor de tela.

## 6. Achados de média prioridade

### 6.1 Migrações versionadas ainda não têm estratégia completa de recuperação

Implementado:

- `PRAGMA user_version`;
- execução por versão;
- transação por migração;
- idempotência básica;
- três versões de schema.

Ainda necessário:

- teste de upgrade a partir de um banco legado populado sintético;
- teste de falha no meio de uma migração;
- backup antes do cutover do banco operacional;
- procedimento documentado de restore;
- política para versões inesperadas ou fora da sequência.

Também existem duas fontes de esquema: `SCHEMA_SQL` permanece sem as tabelas/colunas novas, enquanto `migrations.py` é a fonte efetiva. Mesmo aparentemente inativo, o schema legado pode produzir bancos incompatíveis se voltar a ser usado por fixtures ou ferramentas.

### 6.2 Endpoint de saúde expõe caminho absoluto do banco

`GET /api/health` retorna o caminho absoluto produzido por `get_db_path()`. Isso revela a estrutura local do filesystem e não é necessário para um health check público, mesmo em uma aplicação limitada a loopback.

**Correção recomendada:** retornar somente estado, versão e um identificador não sensível do backend; manter o caminho completo apenas em logs locais de diagnóstico.

### 6.3 Documentação e portas estão divergentes

- `README.md` e `docs/overview.md` indicam porta 8011;
- `run_app.bat` inicia 8887 e abre 8886;
- Vite usa 8886 e proxy para 8887;
- `docs/known-limitations.md` contém itens desatualizados;
- endpoints novos ainda não foram incorporados integralmente à documentação de API.

## 7. Status das funcionalidades avaliadas

| Funcionalidade | Status | Observação |
|---|---|---|
| Migrações SQLite | Parcial | Estrutura existe; faltam backup, restore e upgrade legado real. |
| Catálogo de métricas | Parcial | Existe, mas ainda não é o contrato central de todos os cálculos. |
| Qualidade e cobertura | Defeituosa | API e UI existem; ingestão não persiste os dados reais. |
| Baseline pessoal | Parcial | Mediana/MAD existem; zeros não são excluídos e o mínimo real diverge do planejado. |
| Orientação diária | Crítica | Recomenda esforço sem baseline suficiente. |
| Check-in diário | Parcial | Persistência existe; UX e atualização reativa estão incompletas. |
| Carga de treino | Parcial | Campos e widget existem; faltam algoritmo, contrato dedicado e testes diretos. |
| Intervenções na UI | Ausente | Backend existente não possui timeline frontend operacional. |
| N-of-1 2.0 | Defeituoso/parcial | Formulário foi alterado, mas faltam validação de períodos, adesão, cobertura, intervalo de confiança, confundidores e conclusão robusta. |
| Correlações | Defeituosa/parcial | Motor e endpoint existem, mas a inferência estatística precisa ser corrigida. |
| Suplementos por dose/horário | Ausente | Registro continua essencialmente binário por dia. |
| Doctor Briefing 2.0 | Parcial | PDF existe, mas não representa integralmente o perfil e o histórico. |
| Ritmo circadiano | Parcial | Usa horários fixos e não considera rotina pessoal suficiente. |
| Energy Bank | Crítica | Produz score com valores default. |
| Nutrição importável | Ausente | Não implementada. |

## 8. Ordem recomendada para correção

1. Corrigir `run_app.bat` e definir uma URL canônica.
2. Fazer orientação diária e Energy Bank falharem de forma segura quando faltarem dados.
3. Corrigir crashes React e restaurar Vitest e Playwright.
4. Conectar qualidade de dados à ingestão Zepp real.
5. Criar testes diretos para todas as novas métricas Zepp.
6. Robustecer autosave e atualização reativa do check-in.
7. Corrigir o motor estatístico de correlações.
8. Declarar ReportLab e reconstruir o Doctor Briefing com o perfil real.
9. Somente depois retomar N-of-1 2.0, intervenções, suplementos por dose e nutrição.

## 9. Gate recomendado antes de uma release

Executar com banco temporário e fixtures sintéticas:

```bash
export PYTHONPATH=''
export LONGEVIDADE_DB_PATH='<sqlite-temporario>'
.venv/Scripts/python.exe -m pytest -q

cd frontend
npm run test:run
npm run build
npm run test:e2e
```

Critérios mínimos:

- backend com 100% dos testes aprovados;
- frontend com 100% dos testes aprovados;
- build de produção concluído;
- E2E com 100% dos cenários aprovados;
- nenhum dado real acessado durante testes;
- launcher abrindo a URL documentada;
- ausência de recomendações quando os dados forem insuficientes;
- qualidade persistida a partir de uma importação Zepp sintética;
- `git diff --check` sem erros.

## 10. Decisão de release

O commit `5dca849` deve ser tratado como integração de trabalho, não como release funcional pronta para orientar decisões pessoais de saúde ou treinamento.

O próximo ciclo deve ser uma **release de estabilização**. A condição central é simples: ausência de dados não pode produzir score, confiança ou recomendação positiva.