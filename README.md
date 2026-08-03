# Sistema Longevidade — Blueprint Protocol & Local Health Hub

Aplicação Web e plataforma local auditável de inteligência para longevidade, combinando métricas de wearables (**Zepp/Amazfit**, **Google Fit / Health Connect**), exames laboratoriais, cálculo de idade biológica epigenética (**PhenoAge Morgan Levine**), experimentos estocásticos **N-of-1**, monitoramento contínuo de glicemia (**CGM**) e gerador de relatórios clínicos (**Doctor Briefing**).

## 🚀 Como Executar (1 Clique)

Para iniciar o servidor Backend (FastAPI na porta **8011**) e a interface Frontend Dashboard:

```cmd
run_app.bat
```

Acesse no seu navegador em: **http://127.0.0.1:8011**

Para a documentação completa de visão geral do projeto, consulte **[docs/overview.md](docs/overview.md)**.

---

## 🌟 Funcionalidades Principais

- **Dashboard de Métricas Diárias**: Sincronização automatizada de Passos, Sono (Fases Profundo, Leve, REM), HRV, Frequência Cardíaca de Repouso (RHR), Readiness, VO2 Max, Peso vs Alvo e Pressão Arterial.
- **Idade Biológica PhenoAge (Morgan Levine)**: Calculadora automatizada baseada em 9 marcadores de exames de sangue (Glicose, Creatinina, Albumina, hs-CRP, RDW, MCV, Linfócitos, Fosfatase Alcalina e WBC).
- **Experimentos N-of-1**: Ferramenta estatística (d de Cohen + p-value) para testar intervenções de estilo de vida (suplementos, hábitos de sono, jejum) comparando 14 dias pré vs 14 dias pós.
- **Exames Laboratoriais & Alvos de Longevidade**: Tabela de resultados de sangue comparados com a faixa de referência clássica e com os **Alvos Ótimos de Longevidade** (ApoB < 60, hs-CRP < 0.5, HbA1c < 5.3, etc.).
- **Glicemia Contínua (CGM)**: Importador de CSVs de sensores contínuos (FreeStyle Libre) com cálculo de Glicemia Média, Variabilidade (CV%) e Tempo no Alvo (Time-in-Range 70-140 mg/dL).
- **Doctor Briefing Generator**: Geração de relatório sintético formatado em Markdown para consultas médicas.

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
