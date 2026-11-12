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

Os fluxos de revisão local de laudos, OCR, histórico conectado e pacote portátil estão em [Laudos, histórico e portabilidade](docs/importacao-laudos-e-exportacao.md). A prévia do copiloto identifica provedor e contexto antes da chamada externa. Nenhuma dessas funcionalidades substitui revisão clínica.

## Arquitetura em uma página

```text
React + Vite + TypeScript + Tailwind + Recharts
                    │ REST /api/*
                    ▼
             FastAPI (porta 8887)
                    │
     ┌──────────────┼────────────────┐
     ▼              ▼                ▼
SQLite local   algoritmos Python   integrações locais/LLM
longevity.sqlite3 PhenoAge, CGM,   Zepp, Google Health, Hevy,
                N-of-1, KDM        OpenAI/Anthropic/OpenRouter
```

- **Frontend:** `frontend/`; em desenvolvimento usa Vite na porta `8886` com proxy para o backend. Em produção, o FastAPI serve `frontend/dist` pela raiz `/` quando esse diretório existe.
- **Backend:** `backend/app/`; `main.py` registra routers FastAPI e inicializa o banco.
- **Domínio:** `src/longevidade/`; contém esquema/repositório SQLite, algoritmos determinísticos (Daily Guidance, Energy Bank, PhenoAge, KDM, N-of-1, CGM), importadores, relatórios e cliente de IA.
- **Banco:** `data/longevity.sqlite3` (ignorado pelo Git).

Para o detalhamento completo, comece por [docs/overview.md](docs/overview.md), [docs/architecture.md](docs/architecture.md) e [docs/api-reference.md](docs/api-reference.md).

Para procedimentos atuais de backup, retenção, inicialização e limitações de proveniência, consulte [Operação, backup e fontes](docs/operacao-backup-e-fontes.md). A análise inicial de 08/11/2026 descreve um estado histórico e continua sendo leitura obrigatória; confirme os comportamentos no código vigente.

## Como executar

### Aplicação local integrada

Configure primeiro a senha do proprietário com `.venv\Scripts\python.exe -m backend.app.access`. O painel exige autenticação, e o portal do personal tem sessão separada. Consulte [Acesso e credenciais](docs/acesso-e-credenciais.md) para HTTPS, proxy e cofre.

No Windows, execute `run_app.bat` a partir da raiz. O script ativa/cria `.venv`, usa os arquivos de lock na instalação, instala dependências Node via `npm ci` quando necessário e recompila o frontend quando a identificação das fontes difere da versão gerada. `--update` reinstala explicitamente as dependências dos locks e recompila. O bind padrão aceita conexões de rede; `--local` restringe a loopback. O acesso remoto depende de HTTPS conforme [acesso e credenciais](docs/acesso-e-credenciais.md).

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
| PhenoAge | Cálculo e persistência de Morgan Levine PhenoAge (2018) usando 9 marcadores de exames sanguíneos. |
| KDM | Cálculo e persistência de Idade Biológica Klemera-Doubal (KDM Age). |
| CGM | Inclusão por lote, importação CSV (`,` ou `;`), resumo diário (Time-in-Range 70-140 mg/dL, CV%) e exportação CSV. |
| N-of-1 | Comparação de períodos controle/intervenção, teste t de Welch, Cohen's d e valor-p com validação de sobreposição. |
| Suplementos/hormônios | Cadastro, edição, remoção, registro diário de tomada e logs de auditoria. |
| Conformidade | Quatro pilares diários e score de 0 a 100%. |
| IA | Copiloto multi-provedor (OpenRouter, OpenAI, Anthropic) alimentado com contexto fisiológico enriquecido (Daily Guidance e Energy Bank); vault Windows Keyring; modos `minimal` e `full`. |
| Relatórios | Resumo para consulta em Markdown e PDF, gerado localmente a partir do perfil e dos dados disponíveis. Inclui cobertura/origem, tendências de 7/30/90 dias, insumos registrados das estimativas de idade, sintomas, intervenções, experimentos e perguntas do usuário. Somente leitura; não substitui avaliação médica. |

## Dados, privacidade e isolamento

- O repositório não versiona o banco, tokens ou artefatos de runtime.
- **Isolamento 100% Interno**: A sincronização é autônoma dentro deste repositório através de `integrations/zepp` e `integrations/google`, eliminando qualquer dependência de caminhos externos no sistema.
- As chaves de IA e os dados clínicos são dados sensíveis. Chaves são salvas preferencialmente no Windows Credential Vault.
- O sistema é de apoio à organização e discussão com profissionais; não substitui avaliação médica.

A modelagem de dados e os pontos de segurança estão em [docs/data-model-and-security.md](docs/data-model-and-security.md).

## Estado de qualidade e isolamento de testes

- `npm run build` e `npm test -- --run`: build de produção em chunks (`vendor-react`, `vendor-charts`, `vendor-icons`) e suíte Vitest automatizada.
- Suíte backend (`pytest`): `tests/conftest.py` isola integralmente `LONGEVIDADE_DB_PATH`, `HERMES_HOME` e `keyring` em memória/diretório temporário a cada teste, garantindo que o banco operacional (`data/longevity.sqlite3`) e o cofre de credenciais do usuário nunca sejam tocados durante os testes.

Leia [docs/known-limitations.md](docs/known-limitations.md) antes de considerar a aplicação pronta para uso médico ou para uma mudança de arquitetura.

## Documentação disponível

- [Arquitetura e fluxos](docs/architecture.md)
- [Referência de API](docs/api-reference.md)
- [Modelo de dados, segurança e privacidade](docs/data-model-and-security.md)
- [Desenvolvimento, execução e validação](docs/development-and-validation.md)
- [Plano atual por fases](docs/plano-implementacao-fases.md)
- [Validação atual e limitações A01–A19](docs/validacao-final-fase-7.md)
- [Limitações e divergências verificadas](docs/known-limitations.md)
- [Baselines e comparação visual](docs/screenshots/README.md)
- [SDD do módulo de IA existente](docs/sdd.md)
- [Auditoria médica/mercado existente](docs/medical_e2e_audit.md)
