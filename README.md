# Longevidade Hub — Open-Source Personal Longevity OS & Healthspan Platform

Aplicação Web e plataforma local auditável de inteligência para longevidade, combinando métricas de wearables (**Zepp/Amazfit**, **Google Health API v4**, **Health Connect**, **Hevy**), exames laboratoriais, cálculo de idade biológica epigenética (**PhenoAge Morgan Levine** e **KDM Age**), experimentos estocásticos **N-of-1**, catálogo completo de treinos, monitoramento contínuo de glicemia (**CGM**) e gerador de relatórios clínicos (**Doctor Briefing**).

---

## 🚀 Como Executar (1 Clique)

Para iniciar o servidor Backend (FastAPI na porta **8887**) e a interface Frontend Dashboard com compilação automática:

```cmd
run_app.bat
```

Acesse no seu navegador em: **http://127.0.0.1:8887**

Para a documentação completa de visão geral do projeto, consulte **[docs/overview.md](docs/overview.md)**.

---

## 🌟 Funcionalidades Principais

- **Google Health API v4 & Google OAuth 2.0:**
  - Migração completa para a Google Health API oficial (`health.googleapis.com/v4`).
  - Suporte nativo a **Consentimento Parcial (*Partial Consent*)**: a aplicação opera normalmente mesmo que o usuário autorize apenas subconjuntos de permissões (ex.: Atividade e Sono, sem Métricas Vitais).
  - Registry centralizado de Data Types com operações (`list`, `rollup`, `dailyRollup`, `reconcile`) e isolamento de recursos de *roadmap*.
  - Renovação resiliente de credenciais com *exponential backoff* e *jitter* contra erros transitórios (HTTP 429 e 5xx).
  - Persistência auditável de estado incremental (`google_health_sync_state`) e camada de dados brutos (`health_data_points`).
- **Dashboard de Métricas Diárias & Readiness:** Sincronização automatizada de Passos, Sono (Fases Profundo, Leve, REM), HRV, FC de Repouso (RHR), SpO2, Frequência Respiratória, VO2 Max, Peso e Pressão Arterial.
- **Orientação Diária & Bateria Corporal (Energy Bank):** Motores determinísticos com travas de segurança *fail-closed* contra falta de dados ou cobertura parcial de recuperação/atividade.
- **Idade Biológica Epigenética (PhenoAge & KDM):** Calculadoras auditáveis baseadas em marcadores de sangue (Morgan Levine PhenoAge e Klemera-Doubal KDM Age) com histórico evolutivo.
- **Treinos & Catálogo de Exercícios:** Integração com Hevy e Zepp Workouts, mapeamento automático de exercícios e catálogo integrado com 1.300+ exercícios, grupos musculares, instruções e demonstrações visuais.
- **Experimentos N-of-1:** Ferramenta estatística (d de Cohen + p-value via SciPy) para testar intervenções com validação rigorosa contra sobreposição de períodos.
- **Copiloto de IA & Vault Local de Segredos:** Integração multi-provedor (OpenRouter, OpenAI, Anthropic) com vault seguro Windows Credential Vault (Keyring), modos de privacidade (`minimal` e `full`) e suporte aos guardrails determinísticos.
- **Exames Laboratoriais & Alvos de Longevidade:** Tabela comparativa com faixas de referência e **Alvos Ótimos de Longevidade** (ApoB < 60, hs-CRP < 0.5, etc.).
- **Glicemia Contínua (CGM):** Importador de CSVs de sensores contínuos (FreeStyle Libre) com cálculo de Glicemia Média, Variabilidade (CV%) e Time-in-Range (70-140 mg/dL).
- **Doctor Briefing (Markdown & PDF):** Geração de relatórios médicos sintéticos em Markdown e PDF via ReportLab.
- **Sincronização Agendada em Segundo Plano:** Script autônomo (`scripts/run_scheduled_sync.py`) configurável para o Agendador de Tarefas do Windows ou Cron, garantindo atualização contínua e silenciosa dos dados.

---

## 🏗 Arquitetura do Projeto

```text
longevidade/
├── README.md
├── pyproject.toml
├── run_app.bat
├── data/
│   └── longevity.sqlite3
├── scripts/
│   ├── run_scheduled_sync.py        # Sincronização autônoma em segundo plano
│   ├── run_sync_silent.vbs          # Execução oculta para Agendador de Tarefas
│   └── setup_scheduled_tasks.ps1    # Instalação das tarefas agendadas no Windows
├── src/
│   └── longevidade/
│       ├── db/                      # Esquema SQLite, migrações auditáveis e repositório
│       ├── algorithms/              # Algoritmos PhenoAge, N-of-1 e CGM
│       ├── exercises/               # Pareamento semântico e catálogo de exercícios
│       ├── ingestion/               # Google Health API v4, Health Registry, Zepp, Hevy, Exames e CGM
│       └── reports/                 # Geradores de relatórios Markdown e PDF (Doctor Briefing)
├── backend/                         # FastAPI Backend API (Porta 8887)
│   └── app/
│       ├── main.py                  # Ponto de entrada e montagem estática do frontend
│       ├── config.py                # Configurações de diretórios, CORS e banco
│       └── routers/                 # Rotas da API (Google Health, Métricas, Workouts, IA, Labs, etc.)
└── frontend/                        # Web App React + Vite + TypeScript + Tailwind CSS + Recharts
```

---

## 🧪 Testes Automatizados

O projeto conta com ampla cobertura de testes unitários e de integração:

- **Backend (Pytest):**
  ```powershell
  .venv\Scripts\python -m pytest -o pythonpath=". src"
  ```
  *(192 testes automatizados cobrindo OAuth 2.0, consentimento parcial, algoritmos clínicos e integridade do banco)*

- **Frontend (Vitest):**
  ```powershell
  cd frontend
  npm test -- --run
  ```
  *(61 testes automatizados cobrindo componentes, modais e fluxos de estado)*
