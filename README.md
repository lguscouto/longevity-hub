# Sistema Longevidade — Blueprint Protocol & Local Health Hub

Aplicação Web e plataforma local auditável de inteligência para longevidade, combinando métricas de wearables (**Zepp/Amazfit**, **Google Fit / Health Connect**), exames laboratoriais, cálculo de idade biológica epigenética (**PhenoAge Morgan Levine**), experimentos estocásticos **N-of-1**, monitoramento contínuo de glicemia (**CGM**) e gerador de relatórios clínicos (**Doctor Briefing**).

## 🚀 Como Executar (1 Clique)

Para iniciar o servidor Backend (FastAPI na porta **8887**) e a interface Frontend Dashboard:

```cmd
run_app.bat
```

Acesse no seu navegador em: **http://127.0.0.1:8887**

Para a documentação completa de visão geral do projeto, consulte **[docs/overview.md](docs/overview.md)**.

---

## 🌟 Funcionalidades Principais

- **Dashboard de Métricas Diárias & Readiness**: Sincronização automatizada de Passos, Sono (Fases Profundo, Leve, REM), HRV, FC de Repouso (RHR), SpO2, Frequência Respiratória, VO2 Max, Peso e Pressão Arterial.
- **Orientação Diária & Bateria Corporal (Energy Bank)**: Motores determinísticos com travas de segurança *fail-closed* contra falta de dados ou cobertura parcial de recuperação/atividade.
- **Idade Biológica Epigenética (PhenoAge & KDM)**: Calculadoras baseadas em marcadores de sangue (Morgan Levine PhenoAge e Klemera-Doubal KDM Age).
- **Experimentos N-of-1**: Ferramenta estatística (d de Cohen + p-value via SciPy) para testar intervenções com validação rigorosa contra sobreposição de períodos.
- **Copiloto de IA & Vault Local de Segredos**: Integração multi-provedor (OpenRouter, OpenAI, Anthropic) com vault seguro Windows Credential Vault (Keyring), modos de privacidade (`minimal` e `full`) e suporte aos guardrails determinísticos.
- **Exames Laboratoriais & Alvos de Longevidade**: Tabela comparativa com faixas de referência e **Alvos Ótimos de Longevidade** (ApoB < 60, hs-CRP < 0.5, etc.).
- **Glicemia Contínua (CGM)**: Importador de CSVs de sensores contínuos (FreeStyle Libre) com cálculo de Glicemia Média, Variabilidade (CV%) e Time-in-Range (70-140 mg/dL).
- **Doctor Briefing (Markdown & PDF)**: Geração de relatórios médicos sintéticos em Markdown e PDF via ReportLab.

---

## 🏗 Arquitetura do Projeto

```text
longevidade/
├── README.md
├── pyproject.toml
├── run_app.bat
├── data/
│   └── longevity.sqlite3
├── src/
│   └── longevidade/
│       ├── db/               # Esquema SQLite e repositório auditável
│       ├── algorithms/       # Algoritmos PhenoAge, N-of-1 e CGM
│       ├── ingestion/        # Importadores Zepp, Google Fit, Exames e CGM
│       └── reports/          # Geradores de relatórios Markdown (Diário, Médico)
├── backend/                  # FastAPI Backend API
└── frontend/                 # Web App React + Vite + TypeScript + Tailwind CSS + Recharts
```
