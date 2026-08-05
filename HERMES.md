# Longevidade Hub — visão geral para manutenção

> Documento de entrada para pessoas e agentes que precisam entender ou evoluir este repositório. Ele descreve **o que o código implementa hoje**; não é orientação médica.

## Propósito

O Longevidade Hub é uma aplicação web local para centralizar métricas de saúde, exames, CGM, suplementação/hormônios, conformidade diária e análises assistidas por IA. A interface é em português brasileiro e o armazenamento operacional é um SQLite local.

O produto combina:

- métricas diárias de wearable (Zepp/Amazfit como fonte primária) e Google Fit/Health Connect;
- exames laboratoriais e cálculo de PhenoAge;
- resumos diários de CGM;
- experimentos pessoais N-of-1;
- pilha de suplementos/hormônios, adesão diária e trilha de auditoria;
- relatório Markdown para consulta médica;
- copiloto com provedores OpenAI, Anthropic ou OpenRouter.

## Arquitetura em uma página

```text
React + Vite + TypeScript + Tailwind + Recharts
                    │ REST /api/*
                    ▼
             FastAPI (porta 8011)
                    │
     ┌──────────────┼────────────────┐
     ▼              ▼                ▼
SQLite local   algoritmos Python   integrações locais/LLM
longevity.sqlite3 PhenoAge, CGM,   Zepp, Google Health,
                N-of-1, KDM        OpenAI/Anthropic/OpenRouter
```

- **Frontend:** `frontend/`; em desenvolvimento usa Vite na porta `8886` com proxy para o backend. Em produção, o FastAPI serve `frontend/dist` pela raiz `/` quando esse diretório existe.
- **Backend:** `backend/app/`; `main.py` registra routers FastAPI e inicializa o banco.
- **Domínio:** `src/longevidade/`; contém esquema/repositório SQLite, algoritmos determinísticos (Daily Guidance, Energy Bank, PhenoAge, KDM, N-of-1, CGM), importadores, relatórios e cliente de IA.
- **Banco:** `data/longevity.sqlite3` (ignorado pelo Git).

Para o detalhamento completo, comece por [docs/overview.md](docs/overview.md), [docs/architecture.md](docs/architecture.md) e [docs/api-reference.md](docs/api-reference.md).

## Como executar

### Aplicação local integrada

No Windows, execute `run_app.bat` a partir da raiz. O script ativa/cria `.venv`, instala dependências Node automaticamente via `npm ci` se `node_modules` não existir, compila o frontend somente se `frontend/dist` ainda não existir e sobe o Uvicorn em `127.0.0.1:8887`.

**URL:** http://127.0.0.1:8887

### Desenvolvimento do frontend

```bash
cd frontend
npm run dev
```

**URL:** http://127.0.0.1:8886

O proxy do Vite encaminha `/api` a `http://127.0.0.1:8887`.

### Ambiente Python

O ambiente atual foi criado com Python 3.14.6. Neste computador, é importante limpar `PYTHONPATH` ao chamar a venv, pois um `PYTHONPATH` global pode carregar bibliotecas incompatíveis do ambiente Hermes:

```bash
PYTHONPATH='' .venv/Scripts/python.exe -c "import fastapi, numpy, scipy; print('OK')"
```

Veja comandos e regras de teste em [docs/development-and-validation.md](docs/development-and-validation.md).

## Recursos implementados

| Área | Implementação atual |
|---|---|
| Visão geral | Cartões de passos, RHR, HRV, sono, VO2 máximo e pressão; gráficos de HRV e fases do sono; filtro de 7/30/90 dias; indicação de confiança dos dados. |
| Orientação & Bateria | Motores determinísticos Daily Guidance e Energy Bank com travas de segurança fail-closed e controle de cobertura. |
| Perfil | Perfil, data de nascimento, altura, meta de peso, IMC, conexão Google e histórico completo de pipelines na parte inferior. |
| Métricas | Consulta e upsert de métricas diárias; sincronização Zepp + arquivos Google Health. |
| Exames | Inclusão em lote de biomarcadores, catálogo de alvos ótimos de longevidade, histórico por data e exclusão por painel. |
| PhenoAge | Cálculo e persistência de Morgan Levine PhenoAge usando 9 marcadores laboratoriais. |
| KDM | Cálculo e persistência de Idade Biológica Klemera-Doubal (KDM Age). |
| CGM | Inclusão por lote, importação CSV (`,` ou `;`), resumo diário (Time-in-Range 70-140 mg/dL, CV%) e exportação CSV. |
| N-of-1 | Comparação de períodos controle/intervenção, teste t de Welch, Cohen's d e valor-p com validação de sobreposição. |
| Suplementos/hormônios | Cadastro, edição, remoção, registro diário de tomada e logs de auditoria. |
| Conformidade | Quatro pilares diários e score de 0 a 100%. |
| IA | Copiloto multi-provedor (OpenRouter, OpenAI, Anthropic) alimentado com contexto clínico enriquecido com algoritmos determinísticos e guardrails; vault Windows Keyring; modos `minimal` e `full`. |
| Relatórios | Doctor Briefing Markdown e PDF calculados com métricas, exames e idades biológicas recentes. |

## Dados, privacidade e isolamento

- O repositório não versiona o banco, tokens ou artefatos de runtime.
- **Isolamento 100% Interno**: A sincronização é autônoma dentro deste repositório através de `integrations/zepp` e `integrations/google`, eliminando qualquer dependência de caminhos externos no sistema.
- As chaves de IA e os dados clínicos são dados sensíveis. Chaves são salvas preferencialmente no Windows Credential Vault.
- O sistema é de apoio à organização e discussão com profissionais; não substitui avaliação médica.

A modelagem de dados e os pontos de segurança estão em [docs/data-model-and-security.md](docs/data-model-and-security.md).nt.py`;
- `../google health/config/google_token.json` para a indicação visual de conexão Google.

Se esses caminhos não existirem, os importadores retornam zero registros e registram o resultado em `pipeline_run`.

## Estado de qualidade observado em 29/07/2026

- `npm run build`: concluído com sucesso; bundle principal JavaScript de 665,86 kB (aviso do Vite acima de 500 kB).
- Testes isolados que não usam o banco real: `6 passed` (`test_ai_provider.py`, `test_db.py`, `test_n_of_1.py`, `test_phenoage.py`).
- A suíte completa não deve ser executada diretamente contra o banco operacional: `tests/test_kdm_and_supplements.py` importa a aplicação real e grava suplementos/compliance no banco configurado.

Leia [docs/known-limitations.md](docs/known-limitations.md) antes de considerar a aplicação pronta para uso médico ou para uma mudança de arquitetura.

## Documentação disponível

- [Arquitetura e fluxos](docs/architecture.md)
- [Referência de API](docs/api-reference.md)
- [Modelo de dados, segurança e privacidade](docs/data-model-and-security.md)
- [Desenvolvimento, execução e validação](docs/development-and-validation.md)
- [Plano priorizado de melhorias](docs/improvement-roadmap.md)
- [Limitações e divergências verificadas](docs/known-limitations.md)
- [SDD do módulo de IA existente](docs/sdd.md)
- [Auditoria médica/mercado existente](docs/medical_e2e_audit.md)
