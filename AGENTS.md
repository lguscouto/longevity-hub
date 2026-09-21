# Diretrizes do Projeto Longevidade

## Testes e Isolamento de Ambiente (Pytest / FastAPI)

- **Fixture `client` Obrigatório:** Em qualquer arquivo de teste dentro de `tests/`, sempre injete o fixture `client: TestClient` como parâmetro das funções de teste que realizam requisições HTTP.
- **Proibido `TestClient(app)` Global:** Nunca instancie `client = TestClient(app)` no nível de módulo.
- **Motivo Arquitetural:** O `tests/conftest.py` gerencia o ciclo de vida dos módulos de backend (`_drop_backend_app_modules()`) e isola o banco de dados temporário (`LONGEVIDADE_DB_PATH`) e diretório Hermes (`HERMES_HOME`). Instâncias em nível de módulo retêm referências a singletons desatualizados, quebram patches com `unittest.mock.patch` e podem vazar acessos para arquivos reais do usuário.
