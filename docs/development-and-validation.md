# Desenvolvimento, execução e validação

## Pré-requisitos

- Windows com Python 3.10+ (a venv atual foi criada com 3.14.6).
- Node.js e npm.
- Dependências Python de `backend/requirements.txt` e `pyproject.toml`.
- Dependências frontend registradas em `frontend/package-lock.json`.
- Opcionalmente, os projetos irmãos `../zepp` e `../google health` para sincronização real.

## Preparação do ambiente

```bash
# raiz do repositório
PYTHONPATH='' .venv/Scripts/python.exe -c "import fastapi, pydantic, numpy, pandas, scipy; print('Python OK')"

# frontend
cd frontend
npm ci
```

> No host atual, não reutilize um `PYTHONPATH` global: ele pode resolver módulos da instalação Hermes em vez da `.venv` do projeto e causar erros de extensões compiladas. Prefixe comandos Python com `PYTHONPATH=''`.

## Executar

### Aplicação integrada

No Explorador ou CMD do Windows, execute:

```cmd
run_app.bat
```

Acesse: **http://127.0.0.1:8887**.

O script abre a URL automaticamente, mas só recompila o frontend quando `frontend/dist` não existe. Após editar código em `frontend/src`, rode manualmente `npm run build` antes de subir a versão integrada.

### Diretriz de Temas & Validação Visual

> [!IMPORTANT]
> **Regra Obrigatória para Novos Componentes**: Todo novo componente visual deve ser validado nos temas escuro e claro. A preferência é persistida em `localStorage` na chave `longevity-hub-theme` com suporte a `dark` e `light`.

### Executar Testes Automatizados

```bash
# Executar suíte completa de testes do Backend (114 testes pytest)
PYTHONPATH='.;src' .venv/Scripts/python.exe -m pytest

# Executar suíte de testes unitários do Frontend (36 testes Vitest)
cd frontend
npm run test:run

# Executar testes End-to-End (4 testes Playwright)
cd frontend
npm run test:e2e
```

```bash
PYTHONPATH='.;src' .venv/Scripts/python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8887 --reload
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

Acesse: **http://127.0.0.1:3000**.

## Validações executadas nesta revisão

| Comando | Resultado |
|---|---|
| `PYTHONPATH='' .venv/Scripts/python.exe -c "import fastapi, pydantic, numpy, pandas, scipy"` | Sucesso. |
| `cd frontend && npm run build` | Sucesso; 2.283 módulos transformados; aviso de bundle JS principal acima de 500 kB. |
| `PYTHONPATH='' .venv/Scripts/python.exe -m pytest -q tests/test_ai_provider.py tests/test_db.py tests/test_n_of_1.py tests/test_phenoage.py` | `6 passed in 4.00s`. |

## Estratégia de testes

### Testes seguros no estado atual

Os quatro arquivos abaixo usam bancos temporários ou algoritmos puros e foram executados nesta revisão:

```bash
PYTHONPATH='' .venv/Scripts/python.exe -m pytest -q \
  tests/test_ai_provider.py \
  tests/test_db.py \
  tests/test_n_of_1.py \
  tests/test_phenoage.py
```

### Não execute a suíte completa contra o banco operacional

`tests/test_kdm_and_supplements.py` importa `backend.app.main`; portanto usa `backend.app.config.DB_PATH` (`data/longevity.sqlite3`). O teste adiciona, atualiza e consulta suplementos/hormônios e grava conformidade. Executá-lo sem isolamento pode alterar dados reais de saúde.

A falha inicial de coleta vista sem limpar `PYTHONPATH` não era uma falha do projeto: Python 3.14 tentava carregar wheels CPython 3.11 do ambiente Hermes. Com `PYTHONPATH=''`, os imports da `.venv` funcionaram.

### Como corrigir a suíte E2E antes de rodá-la

A solução técnica recomendada é uma fixture que:

1. crie um `tmp_path / "longevity.sqlite3"`;
2. inicialize o banco temporário;
3. sobrescreva `DB_PATH` nos routers e, se necessário, no módulo `main` antes do `TestClient`;
4. não importe `main.py` com o banco operacional já configurado;
5. limpe arquivos temporários ao fim da sessão.

Isso deve ser feito antes de incluir a suíte completa no CI. Não execute essa mudança sobre dados reais sem uma autorização explícita para o cutover.

## Checklist antes de um commit

```bash
# 1. estado de trabalho
git status --short

# 2. backend seguro/isolado
PYTHONPATH='' .venv/Scripts/python.exe -m pytest -q \
  tests/test_ai_provider.py tests/test_db.py tests/test_n_of_1.py tests/test_phenoage.py

# 3. frontend
cd frontend && npm run build

# 4. retorne à raiz e valide diff
git diff --check
git diff --stat
```

Além dos testes automáticos, confirme manualmente em http://127.0.0.1:8011:

- leitura do dashboard sem valores fictícios relevantes;
- importação Zepp/Google somente com fontes disponíveis;
- criação e exclusão de lote de exames em banco de teste/cópia;
- persistência de suplemento, auditoria e conformidade;
- IA somente com uma chave de teste autorizada e sem registrar segredos em logs;
- geração do Doctor Briefing.

## Rebuild e tamanho do bundle

O build de produção atual concluiu com:

```text
dist/assets/index-D4HB95vh.js   665.86 kB │ gzip: 179.67 kB
```

O Vite alertou que o chunk excede 500 kB. Não quebra o build, mas é um candidato futuro a code splitting por aba/modais pesados.

## Convenções práticas

- Não versione bancos SQLite, tokens ou arquivos `frontend/dist`.
- Não use dados reais em testes, screenshots ou fixtures.
- Preserve o comportamento offline/local: integrações com LLM só devem ser acionadas por intenção explícita do usuário.
- Atualize `HERMES.md` e os documentos técnicos quando alterar API, esquema, fluxo de dados ou processo de execução.
