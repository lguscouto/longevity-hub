# Diretrizes do Projeto Longevidade

## Leitura obrigatória antes de trabalhar no projeto

- Leia integralmente [Análise inicial completa — 08/11/2026](docs/analise-inicial-completa-2026-11-08.md) antes de analisar, planejar, modificar ou validar o projeto.
- Considere a arquitetura, os achados priorizados, as evidências de teste e os limites de validação registrados nesse documento. Ele descreve a árvore de trabalho da data indicada; confirme no código atual qualquer comportamento que possa ter mudado.
- Preserve as alterações locais preexistentes e os dados pessoais. Não interprete recomendações do relatório como autorização para apagar dados, mudar produção, publicar ou alterar credenciais.
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
