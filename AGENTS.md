# Diretrizes do Projeto Longevidade

## Leitura obrigatória antes de trabalhar no projeto

- Leia integralmente o [README](README.md), o [guia de desenvolvimento e validação](docs/development-and-validation.md) e a [validação final da fase 7](docs/validacao-final-fase-7.md) antes de analisar, planejar, modificar ou validar o projeto.
- O relatório de análise inicial de 08/11/2026 foi removido em 12/11/2026. As referências aos seus achados em avaliações antigas são históricas; confirme qualquer comportamento no código atual.
- Preserve as alterações locais preexistentes e os dados pessoais. Não interprete recomendações de documentos como autorização para apagar dados, mudar produção, publicar ou alterar credenciais.
## Testes e Isolamento de Ambiente (Pytest / FastAPI)

- **Fixture `client` Obrigatório:** Em qualquer arquivo de teste dentro de `tests/`, sempre injete o fixture `client: TestClient` como parâmetro das funções de teste que realizam requisições HTTP.
- **Proibido `TestClient(app)` Global:** Nunca instancie `client = TestClient(app)` no nível de módulo.
- **Motivo Arquitetural:** O `tests/conftest.py` gerencia o ciclo de vida dos módulos de backend (`_drop_backend_app_modules()`) e isola o banco de dados temporário (`LONGEVIDADE_DB_PATH`) e diretório Hermes (`HERMES_HOME`). Instâncias em nível de módulo retêm referências a singletons desatualizados, quebram patches com `unittest.mock.patch` e podem vazar acessos para arquivos reais do usuário.

## Salvaguardas Operacionais, Concorrência e Ingestão de Dados

- **Backup Antes de Ingestões em Lote:** Antes de qualquer inserção massiva de exames laboratoriais ou reconciliações de dados históricos em `data/longevity.sqlite3`, sempre execute um backup consistente em repouso:
  ```powershell
  .venv\Scripts\python.exe -m src.longevidade.backup create
  ```
- **Preservação de Dados Brutos (`raw_value` e `raw_unit`):** Em qualquer inserção na tabela `lab_results`, nunca sobrescreva ou descarte a unidade original do laudo. Sempre preencha `raw_value` e `raw_unit` com a medição informada pelo laboratório e `value` e `unit` com o valor normalizado deterministicamente via `longevidade.metrics.unit_conversion`.
- **Concorrência com o Agendador de Tarefas do Windows:** A tarefa `Longevidade_DailySync` está ativa no Agendador de Tarefas do Windows disparando `scripts/run_scheduled_sync.py` diariamente (às 07:00 e 21:00). Qualquer script ou rotina de sincronização concorrente deve coordenar o acesso ao banco através do lock de arquivo compartilhado (`src.longevidade.sync_lock.file_sync_lock`).

## Consistência de KPIs e Filtragem em Dashboards Clínicos (Frontend)

- **Invariante Contador vs. Exibição:** Em qualquer painel ou dashboard com cards de resumo / Hero Bar (ex: Ótimo, Normal, Atenção, Alerta, Pendentes), qualquer ação de filtro (clique no card KPI ou botão de filtro rápido) **DEVE** renderizar exatamente o mesmo conjunto e quantidade de itens somados naquele contador. Se o contador indica `N`, a tela deve exibir exatamente `N` cartões ao filtrar por aquele status.
- **Uniformidade no Tratamento de Categorias:** Nenhuma categoria presente no agrupamento de métricas avaliadas (como `metrics_by_category`) pode ser silenciada ou omitida por condicionais hardcoded de status (ex.: `if (statusFilter !== 'all') return null`). Todas as categorias com métricas calculadas devem seguir o padrão consistente de cartões clínicos (`DerivedMetricCard`) com status, nota interpretativa e mini-gauge.
- **Séries Temporais Enriquecidas:** Séries históricas longitudinais (ex.: `direct_biomarkers_series`) devem enriquecer os cartões clínicos padronizados com indicadores ou histórico expansível de coletas, sem isolar ou rebaixar marcadores clínicos primários para caixas estáticas sem avaliação de risco.
- **Visibilidade Padrão de Marcadores Clínicos:** Categorias que contêm biomarcadores clínicos de alta relevância (como PCR-us, HbA1c ou Testosterona) não devem iniciar artificialmente colapsadas sem motivo técnico explícito.
