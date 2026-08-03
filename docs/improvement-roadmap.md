# Plano de melhorias do Longevidade Hub

> **Para Hermes:** implemente este plano por etapas, sempre em ambiente isolado e com revisão de conformidade e qualidade antes de avançar para a próxima fase.

**Objetivo:** elevar o Longevidade Hub de um protótipo local funcional para uma aplicação local confiável para dados pessoais de saúde, sem apresentar dados fictícios como reais, sem permitir que testes atinjam o banco operacional e sem expor chaves ou contexto clínico além do necessário.

**Arquitetura proposta:** manter React/Vite no frontend, FastAPI no backend e SQLite local. As melhorias priorizam quatro fundamentos: isolamento de ambiente/dados, correção semântica dos indicadores, segurança/privacidade e experiência operacional verificável. Não há necessidade de trocar a stack nesta etapa.

**Tecnologias:** React 18, TypeScript, Vite, FastAPI, Pydantic, SQLite, pytest, Vitest + React Testing Library (a introduzir), e `keyring` para o cofre de credenciais do Windows (a introduzir).

---

## 1. Princípios e restrições

1. **Dados de saúde não podem ser inventados pela interface.** Ausência, falha de importação e medição real precisam ter estados visuais distintos.
2. **Testes nunca usam `data/longevity.sqlite3`.** Toda execução automatizada deve criar um banco SQLite temporário com dados sintéticos.
3. **Cálculos clínicos só são exibidos quando os insumos exigidos estiverem presentes e normalizados.** Não usar defaults silenciosos para publicar PhenoAge/KDM.
4. **Dados mínimos para IA.** Toda chamada externa deve ser explícita, rastreável e sem segredos/pessoas identificáveis além do estritamente necessário.
5. **Migrações devem ser reversíveis ou precedidas de backup.** Nenhuma migração de dados reais ou chaves existentes deve ocorrer sem autorização explícita.
6. **Sem reescrita ampla.** Preservar FastAPI, SQLite e a UI existente; corrigir contratos e isolar responsabilidades de forma incremental.

## 2. Priorização

| Prioridade | Melhoria | Problema que elimina | Risco de não fazer |
|---|---|---|---|
| P0 | Isolar testes e remover escrita no banco real | `test_kdm_and_supplements.py` altera `data/longevity.sqlite3` | Corrupção/contaminação de dados de saúde. |
| P0 | Remover métricas fictícias e corrigir erros HTTP | Dashboard pode exibir 4.100 passos, 68 bpm etc. sem dados; formulário manual chama rota inexistente | Decisões baseadas em dados não medidos e perda silenciosa de registros. |
| P0 | Corrigir KDM, PhenoAge e razões cardiovasculares | KDM é estimado como `PhenoAge + 0.5`; chaves de exames são incompatíveis | Indicadores clínicos enganosos. |
| P0 | Proteger chaves e reduzir contexto enviado ao LLM | Chaves em texto no SQLite; contexto identificável enviado a terceiros | Exposição de credenciais e dados sensíveis. |
| P1 | Observabilidade de importação | Falhas Zepp/Google viram contagem zero ou ficam em logs não exibidos | Usuário acredita que a sincronização ocorreu. |
| P1 | Persistir leituras CGM brutas e rastreabilidade | Só há agregados diários; `cgm_readings` não é usado | Impossível auditar ou recalcular métricas. |
| P1 | Normalizar versionamento, bootstrap e testes frontend | Versões conflitam; primeiro clone exige passo implícito; sem testes UI | Releases pouco reproduzíveis. |
| P2 | Navegação persistente e desempenho | Sem deep links; bundle principal acima de 500 kB | Manutenibilidade e carregamento piores, sem urgência clínica. |

## 3. Fase 0 — Base segura de testes e banco

### Task 0.1: Tornar o caminho do banco configurável em runtime

**Objetivo:** permitir que aplicação e routers usem um SQLite temporário em teste, mantendo `data/longevity.sqlite3` como padrão de produção local.

**Arquivos:**
- Modificar: `backend/app/config.py`
- Modificar: `backend/app/main.py`
- Modificar: todos os arquivos em `backend/app/routers/` que importam `DB_PATH`
- Criar: `tests/conftest.py`

**Implementação:**

1. Em `backend/app/config.py`, substituir o caminho imutável por `get_db_path()`, que lê `LONGEVIDADE_DB_PATH` e cai no caminho atual apenas se a variável não existir.
2. Em `backend/app/main.py`, mover `initialize_db(...)` do import para um lifespan FastAPI. O import do módulo não pode criar ou alterar banco algum.
3. Nos routers, obter o caminho no instante da requisição com `get_db_path()`, em vez de capturar `DB_PATH` no import.
4. Em `tests/conftest.py`, criar uma fixture `client(tmp_path, monkeypatch)` que defina `LONGEVIDADE_DB_PATH` para `tmp_path / "longevity-test.sqlite3"` **antes** de instanciar `TestClient`.
5. Desfazer o `client = TestClient(app)` global de `tests/test_kdm_and_supplements.py`; receber a fixture `client` em cada teste HTTP.

**Teste de aceitação:**

```python
# tests/test_test_isolation.py
def test_client_uses_temporary_database(client, tmp_path):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert str(tmp_path) in response.json()["database"]
```

**Verificação:**

```bash
PYTHONPATH='' .venv/Scripts/python.exe -m pytest -q
```

Esperado: todos os testes passam; `data/longevity.sqlite3` não é criado, alterado ou aberto pela execução da suíte.

### Task 0.2: Habilitar chaves estrangeiras em toda conexão SQLite

**Objetivo:** fazer com que os `FOREIGN KEY ... ON DELETE CASCADE` do schema sejam efetivos nas operações do repositório.

**Arquivos:**
- Modificar: `src/longevidade/db/repository.py`
- Testar: `tests/test_db.py`

**Implementação:** após criar a conexão em `LongevityRepository._get_connection()`, executar `conn.execute("PRAGMA foreign_keys = ON")` antes de retorná-la.

**Teste de aceitação:** criar suplemento e log em banco temporário, apagar o suplemento pelo repositório e confirmar que o log relacionado não permanece.

**Verificação:**

```bash
PYTHONPATH='' .venv/Scripts/python.exe -m pytest -q tests/test_db.py
```

### Gate da fase 0

- A suíte completa roda em SQLite temporário.
- Não há import de `backend.app.main` que escreva em banco durante coleta de testes.
- O banco operacional não participa do CI nem de testes locais.

## 4. Fase 1 — Integridade da interface e dos contratos HTTP

### Task 1.1: Corrigir o salvamento de métricas manuais

**Objetivo:** eliminar o `404` do botão **Registrar** e garantir confirmação visual somente após persistência real.

**Arquivos:**
- Modificar: `frontend/src/App.tsx`
- Testar: `frontend/src/App.test.tsx` (criar)

**Implementação:** mudar a chamada de `POST /api/metrics/manual` para `POST /api/metrics`, contrato já implementado por `backend/app/routers/metrics.py`. Fechar `ManualEntryModal` apenas quando a resposta for `res.ok`; em erro, manter o modal aberto e mostrar mensagem útil.

**Teste de aceitação:** mockar uma resposta 200 e confirmar atualização/fechamento; mockar 404/500 e confirmar modal aberto com mensagem de erro.

### Task 1.2: Remover valores clínicos de fallback

**Objetivo:** impedir que valores de demonstração sejam lidos como medições pessoais.

**Arquivos:**
- Modificar: `frontend/src/App.tsx`
- Modificar: `frontend/src/components/MetricCard.tsx`
- Testar: `frontend/src/App.test.tsx`

**Implementação:** substituir os valores estáticos `4.100`, `68 bpm`, `30 ms`, `4h 30m` e `41.08 mL/kg/min` por `—` e uma etiqueta consistente como `Sem dados para a data`. Não usar fallback para nenhum indicador clínico.

**Teste de aceitação:** com `metrics=[]`, verificar a presença de `Sem dados para a data` e a ausência dos números de exemplo.

### Task 1.3: Centralizar tratamento de respostas HTTP

**Objetivo:** impedir mutações silenciosas e mensagens de sucesso em respostas não-2xx.

**Arquivos:**
- Criar: `frontend/src/lib/api.ts`
- Modificar: `frontend/src/App.tsx`
- Modificar: `frontend/src/components/CGMDashboard.tsx`
- Modificar: `frontend/src/components/DailyComplianceWidget.tsx`
- Modificar: `frontend/src/components/SupplementsView.tsx`
- Modificar: `frontend/src/components/AICopilotView.tsx`
- Modificar: `frontend/src/components/AISettingsModal.tsx`
- Testar: `frontend/src/lib/api.test.ts`

**Implementação mínima:** criar `requestJson<T>()` que faça `fetch`, tente ler o JSON, lance `ApiError` em `!response.ok` e preserve a mensagem `detail`/`message` quando disponível. As telas devem usar `try/catch` e exibir erro no contexto da ação.

```ts
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, payload.detail ?? payload.message ?? 'Falha na operação.');
  }
  return payload as T;
}
```

### Task 1.4: Corrigir os estados de sincronização e CGM

**Objetivo:** diferenciar carregando, sucesso parcial, sucesso e erro.

**Arquivos:**
- Modificar: `frontend/src/App.tsx`
- Modificar: `frontend/src/components/SyncProgressModal.tsx`
- Modificar: `frontend/src/components/CGMDashboard.tsx`
- Testar: `frontend/src/components/SyncProgressModal.test.tsx`
- Testar: `frontend/src/components/CGMDashboard.test.tsx`

**Implementação:** tipar `syncResult` com `status: 'ok' | 'error'`; definir sucesso somente com `status === 'ok'`. Para CSV, conservar `Response` antes de chamar `.json()`, testar `res.ok` e aplicar estilo vermelho para erro. Incluir mensagem quando uma fonte retorna zero registros, sem declarar “atualizadas com sucesso” sem evidência.

### Gate da fase 1

- Nenhum dado clínico fictício é mostrado na UI de produção.
- Toda mutação verifica `res.ok` e deixa erros visíveis.
- O botão de métrica manual persiste via endpoint existente.

## 5. Fase 2 — Correção semântica de exames e idades biológicas

### Task 2.1: Criar um vocabulário canônico de marcadores

**Objetivo:** usar as mesmas chaves entre catálogo de laboratórios, PhenoAge, KDM, razões cardiovasculares, contexto de IA e frontend.

**Arquivos:**
- Criar: `src/longevidade/ingestion/lab_normalization.py`
- Modificar: `src/longevidade/ingestion/lab_parser.py`
- Modificar: `src/longevidade/ai/context_builder.py`
- Modificar: `src/longevidade/calculators/kdm_age.py`
- Modificar: `src/longevidade/calculators/cardio_ratios.py`
- Modificar: `frontend/src/components/LabResultsTable.tsx`
- Testar: `tests/test_lab_normalization.py` (criar)

**Decisão de contrato:** manter uma chave canônica por marcador e aliases de entrada. Exemplos necessários:

| Entrada atual | Chave canônica proposta |
|---|---|
| `fasting_glucose` | `glucose_mgdl` |
| `creatinine` | `creatinine_mgdl` |
| `albumin` | `albumin_gdl` |
| `hscrp` | `hscrp_mgl` |
| `rdw` | `rdw_pct` |
| `alk_phos` | `alk_phos_ul` |
| `wbc` | `wbc_1000ul` |
| `hdl` | `hdl_cholesterol` |
| `ldl` | `ldl_cholesterol` |

Adicionar `apoa1` e `total_cholesterol` ao catálogo/formulário. Não calcular ApoB/ApoA1, TG/HDL ou colesterol remanescente até todos os insumos existirem.

**Teste de aceitação:** um painel inserido pela UI com aliases atuais produz o mesmo mapa canônico aceito por KDM, PhenoAge e razões cardiovasculares.

### Task 2.2: Não gerar PhenoAge com painel incompleto

**Objetivo:** tornar explícita a ausência de qualquer um dos nove marcadores requeridos.

**Arquivos:**
- Modificar: `src/longevidade/ingestion/lab_parser.py`
- Modificar: `backend/app/routers/labs.py`
- Modificar: `backend/app/routers/phenoage.py`
- Modificar: `frontend/src/components/LabResultsTable.tsx`
- Modificar: `frontend/src/components/PhenoAgeWidget.tsx`
- Testar: `tests/test_phenoage.py`
- Testar: `tests/test_labs_router.py` (criar)

**Implementação:** criar `validate_phenoage_inputs()` que retorne a lista dos marcadores ausentes. Para lote incompleto, salvar os exames, mas não criar `phenoage_records`; retornar `phenoage: { "status": "incomplete", "missing": [...] }`. A UI deve mostrar quais exames faltam e não renderizar uma idade calculada.

### Task 2.3: Expor e persistir o KDM real

**Objetivo:** substituir o placeholder `PhenoAge + 0.5` por uma resposta rastreável do algoritmo existente.

**Arquivos:**
- Criar: `backend/app/routers/kdm.py`
- Modificar: `backend/app/main.py`
- Modificar: `src/longevidade/db/repository.py`
- Modificar: `frontend/src/components/PhenoAgeWidget.tsx`
- Modificar: `docs/api-reference.md`
- Testar: `tests/test_kdm_router.py` (criar)

**Contrato sugerido:**

- `POST /api/kdm/calculate`: usa perfil + últimos exames normalizados + RHR, calcula, persiste em `kdm_records` e retorna insumos usados/ausentes.
- `GET /api/kdm/latest`: retorna o último cálculo com data e lista de biomarcadores.

A UI deve renderizar KDM apenas se `status == "complete"`; caso contrário, mostrar `KDM indisponível` com os marcadores faltantes. Remover toda fórmula local simulada.

### Gate da fase 2

- Todo cálculo mostra os insumos e a data de cálculo.
- KDM e índices cardiovasculares não usam nomes de chave incompatíveis.
- PhenoAge não nasce de valores default silenciosos.

## 6. Fase 3 — Segurança, privacidade e dados de IA

### Task 3.1: Mover chaves para o cofre do Windows

**Objetivo:** remover chaves de API em texto simples de `ai_settings`.

**Arquivos:**
- Modificar: `backend/requirements.txt`
- Modificar: `pyproject.toml`
- Criar: `src/longevidade/ai/secrets_store.py`
- Modificar: `src/longevidade/db/schema.py`
- Modificar: `src/longevidade/db/repository.py`
- Modificar: `backend/app/routers/ai.py`
- Testar: `tests/test_ai_secrets.py` (criar, com fake store)

**Implementação proposta:** usar `keyring` com nomes de serviço e conta fixos por provedor. SQLite mantém apenas `has_*_key`, provedor/modelo e metadados não sensíveis. A interface continua recebendo somente booleanos/máscaras.

> **Autorização obrigatória:** a migração de chaves existentes é uma alteração de dado sensível. Implementar primeiro o suporte e testes com fake store; só migrar/apagar chaves já existentes após backup e autorização explícita.

### Task 3.2: Implementar política de minimização e consentimento para LLM

**Objetivo:** não enviar nome, nascimento ou histórico completo por padrão.

**Arquivos:**
- Modificar: `src/longevidade/ai/context_builder.py`
- Modificar: `src/longevidade/ai/prompts.py`
- Modificar: `src/longevidade/db/schema.py`
- Modificar: `backend/app/routers/ai.py`
- Modificar: `frontend/src/components/AISettingsModal.tsx`
- Testar: `tests/test_ai_context_privacy.py` (criar)

**Implementação:** adicionar `privacy_mode` com padrão `minimal`. Nesse modo, remover identificadores diretos e enviar somente dados necessários à pergunta. Antes de uma chamada externa, apresentar na UI o provedor, o modo de privacidade e uma confirmação informada. Salvar no histórico apenas metadados e o mínimo de conteúdo necessário para auditoria.

### Task 3.3: Endurecer o serviço local

**Arquivos:**
- Modificar: `backend/app/main.py`
- Modificar: `run_app.bat`
- Modificar: `docs/data-model-and-security.md`
- Testar: `tests/test_security_config.py` (criar)

**Implementação:** quando em modo local, aceitar somente origens explícitas `http://127.0.0.1:3000` e `http://127.0.0.1:8011`; configurar por ambiente para desenvolvimento. Não publicar o servidor em interface de rede. Para exposição remota futura, criar projeto separado de autenticação antes de alterar o host.

### Gate da fase 3

- O SQLite novo não armazena segredo de API em texto claro.
- A IA recebe contexto mínimo e declarado ao usuário.
- CORS é explícito e o launcher continua limitado a loopback.

## 7. Fase 4 — Ingestão, CGM e observabilidade

### Task 4.1: Expor histórico de sincronizações

**Objetivo:** informar a fonte, contagem, status e motivo de falhas sem vazar conteúdo sensível de logs.

**Arquivos:**
- Modificar: `src/longevidade/db/repository.py`
- Criar: `backend/app/routers/pipeline.py`
- Modificar: `backend/app/main.py`
- Modificar: `frontend/src/components/SyncProgressModal.tsx`
- Criar: `frontend/src/components/PipelineStatusPanel.tsx`
- Testar: `tests/test_pipeline_router.py` (criar)

**Contrato sugerido:** `GET /api/pipeline-runs?limit=20`, retornando `source`, `run_at`, `records_inserted`, `status` e um resumo sanitizado do log. A UI deve mostrar claramente “sem fonte encontrada”, “0 registros válidos” e “falha de importação” como estados diferentes.

### Task 4.2: Persistir leituras CGM e derivar sumários

**Objetivo:** preservar a série temporal que sustentou os agregados diários.

**Arquivos:**
- Modificar: `src/longevidade/db/repository.py`
- Modificar: `backend/app/routers/cgm.py`
- Modificar: `src/longevidade/algorithms/cgm_metrics.py`
- Testar: `tests/test_cgm_ingestion.py` (criar)

**Implementação:** inserir leituras válidas em `cgm_readings` com timestamp, usando upsert/índice único para evitar duplicação em reimportações. Gerar `cgm_daily_summary` a partir dessas leituras; manter exportação com data, média, dispersão e contagem. O banco não deve remover dados antigos como efeito de uma importação parcial.

### Task 4.3: Tornar importadores determinísticos e diagnosticáveis

**Arquivos:**
- Modificar: `src/longevidade/ingestion/zepp_importer.py`
- Modificar: `src/longevidade/ingestion/google_importer.py`
- Modificar: `backend/app/routers/metrics.py`
- Testar: `tests/test_zepp_importer.py` e `tests/test_google_importer.py` (criar)

**Implementação:** substituir `except` silenciosos por resultado estruturado: registros lidos, rejeitados, caminho de origem, motivo resumido e exceção classificada. Usar fixtures sintéticas de arquivos Zepp/Google, nunca os diretórios reais do usuário.

## 8. Fase 5 — Bootstrap, qualidade de release e manutenção

### Task 5.1: Tornar o primeiro bootstrap reproduzível

**Arquivos:**
- Modificar: `run_app.bat`
- Modificar: `README.md`
- Modificar: `docs/development-and-validation.md`

**Implementação:** quando `frontend/node_modules` não existir, executar `npm ci` antes de `npm run build`; quando `frontend/src` for mais novo que `frontend/dist`, reconstruir ou informar claramente o comando obrigatório. Manter `package-lock.json` como fonte de versão Node.

### Task 5.2: Unificar a versão do produto

**Arquivos:**
- Criar: `src/longevidade/version.py`
- Modificar: `pyproject.toml`
- Modificar: `src/longevidade/__init__.py`
- Modificar: `backend/app/main.py`
- Modificar: `frontend/package.json`
- Modificar: `docs/architecture.md`

**Implementação:** definir uma versão canônica em `src/longevidade/version.py` e alimentar API/health a partir dela. Para o frontend, manter um único valor sincronizado por script de release ou declarar a versão de UI como derivada. Não continuar expondo `1.0.0`, `2.0.0`, `2.5.0` e `2.1.0` simultaneamente.

### Task 5.3: Criar a base de testes frontend

**Arquivos:**
- Modificar: `frontend/package.json`
- Modificar: `frontend/vite.config.ts`
- Criar: `frontend/src/test/setup.ts`
- Criar: testes de componentes citados nas fases 1–4

**Implementação:** adicionar `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` e scripts `test`/`test:run`. Priorizar testes para ausência de dados, erro de API, métrica manual, sync, CGM, KDM indisponível e consentimento de IA.

### Task 5.4: Preparar release local

**Arquivos:**
- Modificar: `README.md`
- Modificar: `HERMES.md`
- Modificar: `docs/api-reference.md`
- Modificar: `docs/known-limitations.md`

**Checklist de release:**

```bash
# Backend e integrações, sempre em banco temporário
PYTHONPATH='' .venv/Scripts/python.exe -m pytest -q

# Frontend
cd frontend && npm run test:run && npm run build

# Raiz
git diff --check
git status --short
```

O release só é aceito se o dashboard não mostrar placeholders clínicos como valores reais, os fluxos E2E usarem fixtures sintéticas, e nenhuma chave/token aparecer no diff, banco de teste ou logs.

## 9. Fase 6 — Melhorias posteriores (P2)

1. **Deep links por aba:** introduzir React Router somente quando houver casos reais de URL compartilhável/navegação persistente.
2. **Code splitting:** carregar IA, laboratório e módulos pesados com `React.lazy`, após medir o bundle em build. O aviso atual do Vite é de tamanho, não uma falha funcional.
3. **Entrada de perfil completa:** permitir edição de sexo e campos que o backend já aceita, desde que haja necessidade de produto e revisão de privacidade.
4. **Sistema de intervenções:** só expor `interventions` após definir claramente como se relaciona a suplementos/hormônios e N-of-1; não criar tela apenas porque a tabela existe.
5. **E2E com browser:** introduzir Playwright com backend isolado e dados sintéticos depois que a suíte HTTP e Vitest estiverem estáveis.

## 10. Sequência recomendada de execução

1. Fase 0 inteira.
2. Fase 1 inteira, começando pela métrica manual e dados fictícios.
3. Fase 2, com validação de laboratório antes de alterar a UI KDM.
4. Fase 3, com aprovação explícita antes de migrar chaves reais.
5. Fase 4, usando somente fixtures de importação.
6. Fase 5; só então considerar P2.

Essa ordem evita corrigir apresentação sobre uma base de testes insegura e impede que uma melhoria visual mascare cálculos, dados ou segredos mal tratados.

## 11. Critérios de conclusão

O plano estará concluído quando:

- a suíte completa for reproduzível e não alterar `data/longevity.sqlite3`;
- não houver números clínicos de fallback na UI;
- métricas manuais, sync e CSV tiverem feedback HTTP correto;
- PhenoAge/KDM/razões cardiovasculares declararem insumos e indisponibilidade;
- chaves não forem persistidas em texto claro em instalações novas;
- o envio de dados ao LLM for mínimo, informado e rastreável;
- importações tiverem diagnóstico acessível;
- build e testes frontend/backend fizerem parte do gate de release;
- `HERMES.md`, API, arquitetura e limitações refletirem o estado implementado.

## 12. Escopo explicitamente excluído desta melhoria

- Alterar diagnósticos, metas de saúde, doses, protocolos ou recomendações clínicas.
- Expor a aplicação na internet ou em LAN.
- Migrar automaticamente dados pessoais ou segredos existentes sem backup/autorização.
- Trocar SQLite/FastAPI/React por outra stack sem uma necessidade demonstrada.
