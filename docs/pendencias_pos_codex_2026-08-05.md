# Pendências após correções do Codex — Longevidade Hub

**Data da reavaliação:** 05/08/2026
**Branch:** `master`
**Commit avaliado:** `6945fdd` — `fix(audit): resolve all remaining findings from re-evaluation report`
**Documento histórico de referência:** [`reavaliacao_2026-08-05.md`](reavaliacao_2026-08-05.md)

## Objetivo e escopo

Este documento registra somente as pendências confirmadas depois das correções aplicadas ao estado auditado em `5dca849`.

Não substitui a auditoria anterior: aquele documento descreve o estado anterior às correções. Aqui, os itens já resolvidos não são repetidos como pendências. As evidências abaixo foram obtidas com banco SQLite, snapshots Zepp e respostas HTTP sintéticos; nenhum dado pessoal ou banco operacional foi usado.

## Estado validado

As correções eliminaram vários bloqueadores de execução:

- `run_app.bat` agora abre a mesma porta do backend, `http://127.0.0.1:8887`;
- o FastAPI serve o frontend compilado;
- frontend: `36/36` testes Vitest aprovados;
- build de produção: aprovado;
- E2E Playwright: `4/4` cenários aprovados;
- backend com banco temporário: `110` testes aprovados;
- ingestão Zepp sintética persiste os sete itens de qualidade esperados;
- orientação diária deixou de usar histórico futuro;
- ausência de snapshot de treino não é mais convertida em treino zero;
- ReportLab foi declarado como dependência;
- Doctor Briefing passou a consultar o perfil persistido como fallback.

Esses resultados **não** autorizam tratar os escores de orientação e energia como medidas clínicas ou recomendações seguras de treino. As pendências abaixo impedem essa conclusão.

## Pendências críticas

### P1 — Orientação diária ainda recomenda treino intenso sem sinal fisiológico atual

**Arquivos:**

- `src/longevidade/algorithms/daily_guidance.py`
- `backend/app/routers/daily_guidance.py`

A filtragem temporal foi corrigida: somente datas anteriores a `date_ref` entram no histórico. Porém, o algoritmo considera suficiente haver baseline em apenas uma das três séries — HRV, RHR ou sono — mesmo que a mesma série não esteja disponível no dia consultado.

**Probe confirmado:** sete HRVs históricos e, para hoje, apenas `{ "steps": 1000 }` retornaram:

```json
{
  "state": "optimal",
  "confidence": "low",
  "score": 75,
  "primary_action": "Excelente dia para treinos mais intensos de força ou VO2 Max."
}
```

**Impacto:** uma recomendação de intensidade pode ser publicada sem medida atual de recuperação.

**Correção de aceite:**

1. Exigir pelo menos um conjunto mínimo explícito de dados atuais antes de emitir score ou ação de treino.
2. Exigir baseline correspondente para cada fator usado.
3. Se sono, HRV ou RHR atuais estiverem indisponíveis, retornar `state: "insufficient_data"`, `score: null` e uma limitação legível.
4. Adicionar teste de regressão para histórico HRV válido com dia atual contendo apenas passos.

---

### P1 — Energy Bank ainda cria estimativa positiva com RHR e carga desconhecidos

**Arquivo:** `src/longevidade/calculators/energy_and_stress.py`

O cálculo agora retorna `unavailable` quando sono ou HRV não existem. Isso corrige parte do problema anterior. Porém, ainda aplica defaults:

```python
rhr = ... or 60.0
steps = ... or 0
training_load = ... or 0
```

**Probe confirmado:** com somente `sleep_minutes=480` e `hrv_ms=40`, sem RHR, passos ou carga, o resultado foi:

```json
{
  "status": "ok",
  "current_level": 100,
  "recharge": 90,
  "drain": 10,
  "recommendation": "Nível de energia excelente. Bom momento para atividades exigentes."
}
```

**Impacto:** dados ausentes são apresentados como recuperação excelente.

**Correção de aceite:**

1. Não converter RHR, passos ou carga ausentes em valores observados.
2. Exigir RHR para o componente que o utiliza ou retirar esse componente do cálculo quando ausente e declarar a limitação.
3. Diferenciar explicitamente `0` observado de `null`/indisponível.
4. Retornar `unavailable` quando o conjunto mínimo do cálculo não for atendido.
5. Cobrir em teste sono+HRV sem RHR, sem passos e sem treino.

---

### P1 — Rotas GET ainda criam ou modificam banco

**Arquivos com chamadas a `initialize_db()` em rotas GET:**

- `backend/app/routers/reports.py`
- `backend/app/routers/metrics.py`
- `backend/app/routers/profile.py`
- `backend/app/routers/pipeline.py`
- `backend/app/routers/ai.py`

As novas rotas de check-in, qualidade, orientação, energia e correlações não chamam mais `initialize_db()` diretamente. A correção é válida, mas não cobre o restante da API.

**Probe confirmado:** uma chamada a `GET /api/reports/doctor-briefing` com banco inexistente criou o SQLite, aplicou migrações até `user_version=3` e semeou cinco suplementos padrão.

Além disso, mesmo GETs corrigidos tentam abrir uma conexão SQLite quando o arquivo não existe; isso cria um arquivo vazio antes de falhar em tabela inexistente.

**Impacto:** uma operação de leitura pode alterar estado, criar dados de demonstração ou falhar de modo não determinístico.

**Correção de aceite:**

1. Centralizar migração e seeding em um startup explícito e controlado.
2. Remover inicialização de todos os handlers GET.
3. Impedir que conexões de leitura criem o arquivo SQLite quando o banco ainda não foi preparado.
4. Separar suplementos de exemplo de dados reais do usuário ou eliminá-los do bootstrap.
5. Criar teste que compare hash e contagem de registros antes/depois de cada GET relevante; banco inexistente deve ter comportamento explicitamente definido.

## Pendências de alta prioridade

### P2 — Qualidade Zepp é persistida, mas os metadados ainda são sintéticos

**Arquivos:**

- `src/longevidade/ingestion/zepp_importer.py`
- `backend/app/routers/quality.py`
- `src/longevidade/metrics/catalog.py`

A conexão importação → `daily_metric_quality` foi implementada e o endpoint usa apenas as sete chaves esperadas. Porém, o importador ainda atribui qualidade por presença de valor:

- `coverage_pct=100`;
- `quality_status="high"`;
- `sample_count=1440` para passos;
- `sample_count=1` para várias métricas agregadas.

Esses valores não representam necessariamente a densidade real de coleta. O importador e o router também duplicam a lista de chaves, em vez de consumir o catálogo canônico e suas regras de plausibilidade.

**Impacto:** um valor impossível ou esparso pode aparecer como dado de alta qualidade.

**Correção de aceite:**

1. Usar `METRICS_CATALOG` como fonte única de métricas, unidades, limites plausíveis e requisitos de observação.
2. Persistir contagem e cobertura a partir de amostras/snapshot reais, sem valores inventados.
3. Marcar métricas agregadas sem metadado observável como `unknown` ou `not_verifiable`, não `high`.
4. Validar faixa plausível antes de elevar `quality_status`.
5. Criar teste de integração importação Zepp → API de qualidade, incluindo valores ausentes, fora de faixa e baixa densidade.

---

### P2 — Check-in mantém autosave otimista e não atualiza orientação na mesma data

**Arquivos:**

- `frontend/src/components/DailyCheckinCard.tsx`
- `frontend/src/components/DailyGuidanceCard.tsx`
- `frontend/src/App.tsx`

O check-in agora mostra erro visual e tolera `tags` ausentes. Permanecem:

- atualização otimista sem rollback;
- um `PUT` completo para cada clique;
- ausência de debounce, serialização ou cancelamento de requisições concorrentes;
- risco de resposta fora de ordem sobrescrever valor mais recente;
- `DailyGuidanceCard` consulta dados somente quando `selectedDate` muda.

Assim, salvar um check-in na data já selecionada pode recarregar dados gerais sem atualizar a orientação diária exibida.

**Correção de aceite:**

1. Debounce ou botão Salvar com estado de envio.
2. Rollback confiável em falha.
3. Serialização, abortamento ou versionamento de mutações concorrentes.
4. Um `refreshToken` ou callback de invalidação para Guidance após salvar o check-in.
5. Testes de falha de rede, dois cliques rápidos e refresh da orientação na mesma data.

---

### P2 — Contratos de payload do frontend continuam frágeis

**Arquivos:**

- `frontend/src/lib/api.ts`
- `frontend/src/components/DailyCheckinCard.tsx`
- `frontend/src/components/DailyGuidanceCard.tsx`

`requestJson()` trata JSON inválido como `ApiError`, e respostas `{}` não derrubam o E2E atual. Ainda não existe validação estrutural do payload por endpoint ou componente.

Exemplos de risco:

- `DailyCheckinCard` chama `checkin.tags.includes(...)` quando `tags` é truthy, sem confirmar que é array;
- `DailyGuidanceCard` trata valores truthy como coleções e chama `.map(...)`.

**Correção de aceite:**

1. Normalizar arrays explicitamente com `Array.isArray` ou validar contratos com schema.
2. Representar payload inválido como erro visível, não como estado parcial silencioso.
3. Adicionar testes com `tags: {}`, `factors: {}`, valores escalares e campos ausentes.

---

### P2 — Correlações ainda ficam abaixo do requisito estatístico definido

**Arquivos:**

- `src/longevidade/analytics/correlations.py`
- `backend/app/routers/correlations.py`

A implementação agora usa datas reais para lag, `scipy.stats.spearmanr` e correção de Bonferroni. Ainda aceita 15 pares, enquanto a auditoria anterior definiu 20 como mínimo para publicação.

Também permanecem pendentes:

- qualidade/cobertura das métricas no resultado;
- tratamento explícito dos erros hoje silenciados por `except Exception: pass` no router;
- comunicação que deixe claro o caráter observacional, não causal.

**Correção de aceite:**

1. Elevar o mínimo a 20 pares ou alterar formalmente a política documentada com justificativa.
2. Expor `n`, cobertura e p-valor ajustado junto ao resultado.
3. Não ocultar exceções de cálculo: registrar e retornar estado de indisponibilidade adequado.
4. Adicionar teste de datas irregulares, 15 pares, 20 pares e múltiplos lags.

## Pendências de média prioridade

### P3 — Doctor Briefing ainda tem classificação e contrato de idade frágeis

**Arquivos:**

- `src/longevidade/reports/doctor_briefing.py`
- `src/longevidade/reports/doctor_briefing_pdf.py`

O perfil passou a ser usado, mas:

- exames sem alvo conhecido continuam iniciando como `Ótimo`;
- alvos de longevidade continuam fixos no PDF;
- faltam cobertura/qualidade, tendências, intervenções, sintomas, N-of-1 e contexto de completude;
- as idades `40` no Markdown e `32`/`40` no PDF funcionam como sentinelas implícitas para substituir pela idade do perfil.

**Correção de aceite:** usar `None` como único sinal de fallback de idade; classificar exames sem referência como “sem alvo configurado”; incluir fonte, qualidade e limitações no briefing.

---

### P3 — Conversão de duração de treino ainda é ambígua

**Arquivo:** `integrations/zepp/scripts/health_metrics.py`

Valores `duration`, `durationTime` e `totalTime` maiores ou iguais a 60 são divididos por 60 sem que a unidade seja conhecida. Um valor já fornecido em minutos pode ser convertido indevidamente como se estivesse em segundos.

**Correção de aceite:** mapear a unidade por formato Zepp documentado, preservar unidade na normalização e criar fixtures para minutos, segundos, milissegundos e ausência de unidade.

---

### P3 — Migrações não possuem prova de recuperação de banco legado

**Arquivos:**

- `src/longevidade/db/migrations.py`
- `src/longevidade/db/schema.py`
- `tests/test_db_migrations.py`

Os testes confirmam banco vazio, `user_version=0` e idempotência. Ainda faltam:

- upgrade de banco legado populado;
- falha no meio de uma migração;
- backup antes do cutover;
- restore validado;
- política para versão inesperada;
- eliminação ou sincronização da duplicidade entre `SCHEMA_SQL` e as migrações versionadas.

---

### P3 — Acessibilidade dos novos fluxos continua incompleta

**Arquivos principais:**

- `frontend/src/components/DailyCheckinCard.tsx`
- `frontend/src/components/DataQualityPanel.tsx`
- `frontend/src/components/NOf1Tracker.tsx`
- `frontend/src/components/DoctorBriefingModal.tsx`
- `frontend/src/components/SupplementsView.tsx`

Pendências confirmadas:

- escalas do check-in sem `fieldset`, `legend` ou `aria-pressed`;
- controles 1–5 sem rótulo contextual adequado;
- seletor de data sem `<label>` associado;
- modais sem contrato completo de diálogo, Escape, trap e restauração de foco;
- card de suplemento implementado como `div onClick`, sem suporte de teclado.

**Correção de aceite:** substituir controles semânticos inadequados, adicionar nomes acessíveis e cobrir navegação por teclado/foco com Testing Library e Playwright.

---

### P3 — Documentação e endpoint de saúde permanecem divergentes

**Arquivos:**

- `README.md`
- `docs/overview.md`
- `docs/api-reference.md`
- `backend/app/main.py`

Pendências:

- README e overview ainda indicam a porta `8011`, enquanto o launcher usa `8887`;
- os endpoints `/daily-guidance`, `/energy-circadian`, `/quality/daily` e `/checkins` não estão documentados integralmente;
- `GET /api/health` retorna o caminho local do banco, informação desnecessária para um health check.

**Correção de aceite:** documentar a URL canônica `http://127.0.0.1:8887`, completar a referência da API e remover o caminho absoluto do banco da resposta de saúde.

---

### P3 — Higiene do commit não atende ao gate declarado

`git diff --check 5dca849..6945fdd` aponta whitespace em:

- `backend/requirements.txt` — linha vazia final;
- `docs/reavaliacao_2026-08-05.md` — line-breaks com whitespace final nas linhas 3 e 4.

Não é falha funcional, mas contradiz o gate de integridade documentado e deve ser resolvido antes do próximo commit de release.

## Itens fora deste ciclo de correção

Continuam sem evolução funcional suficiente e devem permanecer explicitamente fora de qualquer promessa de release clínica:

- intervenções e timeline na UI;
- suplementos por dose e horário;
- nutrição importável;
- N-of-1 com adesão, cobertura, intervalos de confiança, confundidores e conclusão robusta;
- personalização mais completa do ritmo circadiano.

## Ordem recomendada

1. Fechar os três P1: orientação, Energy Bank e GETs com efeitos colaterais.
2. Corrigir qualidade observacional real e contratos de payload do frontend.
3. Robustecer autosave, refresh reativo e correlações.
4. Resolver Doctor Briefing, duração de treino e estratégia de migração.
5. Corrigir acessibilidade, documentação, health check e higiene do diff.
6. Só então expandir N-of-1, intervenções, suplementos e nutrição.

## Gate para uma próxima release

Antes de classificar o produto como pronto para uso local confiável, executar com banco temporário e fixtures sintéticas:

```bash
export PYTHONPATH=''
export LONGEVIDADE_DB_PATH='<sqlite-temporario>'
.venv/Scripts/python.exe -m pytest -q

cd frontend
npm run test:run
npm run build
npm run test:e2e
```

Além de todos os testes passarem, exigir:

- nenhuma recomendação de treino ou score energético diante de dados essenciais ausentes;
- nenhum GET criando banco, migrando schema ou semeando dados;
- metadados de qualidade derivados de observações reais ou declarados indisponíveis;
- documentação com URL e endpoints atuais;
- `git diff --check` sem erros;
- teste de produção local abrindo `http://127.0.0.1:8887` com backend e frontend integrados.

## Decisão atual

O estado `6945fdd` é uma evolução importante sobre `5dca849`: está executável, testado e bem mais resiliente. Ainda assim, deve continuar classificado como **dashboard experimental de acompanhamento**. Não deve apresentar orientação de treino, recuperação ou energia como recomendação pessoal confiável enquanto os itens P1 permanecerem abertos.
