# Catálogo e Governança de Screenshots — Longevidade Hub

Este diretório armazena capturas de tela e baselines visuais canônicos do Longevidade Hub para auditoria contínua, documentação clínica e testes de regressão visual.

---

## 1. Organização dos Diretórios e Governança (U22-P2-23)

Para garantir integridade histórica e isolamento estrito entre baselines ativos de produção e artefatos de versões legadas, a estrutura é organizada hierarquicamente:

```text
docs/screenshots/
├── baselines/                  # Baselines canônicos ativos da versão atual (v2.2.0)
│   ├── metadata.json           # Manifesto legível por máquina com metadados estruturados (U22-P2-22)
│   └── v2.2.0_*.png            # 24 capturas canônicas da versão 2.2.0
├── legacy/                     # Arquivo histórico segregado
│   ├── v2.1.0/                 # Baselines históricos da versão 2.1.0 (24 capturas)
│   └── pre-v2.1.0/             # Capturas preliminares de documentação (v1.x / v2.0.0)
└── README.md                   # Catálogo de governança e inventário
```

---

## 2. Padrão de Nomenclatura Canônica

Seguindo as diretrizes do plano `UX_UI_45` (§99–§104) e atualizado pelo `UX_UI_61`, todo screenshot versionado deve seguir rigorosamente a sintaxe:

```text
v<versão>_<view>_<viewport>_<tema>_<estado>.png
```

- **`<versão>`**: Versão da aplicação (ex: `2.2.0`).
- **`<view>`**: Identificador da tela (`overview`, `labs`, `workouts`, `supplements`, `ai`, `profile`).
- **`<viewport>`**: Resolução de tela padronizada (`375x667` para mobile canônico, `1280x800` para desktop padrão).
- **`<tema>`**: Tema de renderização (`dark` ou `light`).
- **`<estado>`**: Estado dos dados (`normal`, `loading`, `empty`, `error`, `success`).

---

## 3. Metadados de Baselines (U22-P2-22)

Cada baseline possui metadados estruturados serializados em [`baselines/metadata.json`](baselines/metadata.json), contendo:
- **`version`**: Versão da suíte de interface (`2.2.0`).
- **`viewport`**: Dimensões de viewport e identificador de dispositivo (`width`, `height`, `name`).
- **`theme`**: Tema cromático (`dark` ou `light`).
- **`reduced_motion`**: Booleano indicando preferência de acessibilidade (`true`).
- **`state`**: Estado operacional capturado (`normal`).
- **`captured_at`**: Carimbo de data/hora ISO 8601 da execução do teste E2E.

---

## 4. Baselines de Regressão Visual v2.2.0 Ativos (`baselines/`)

Matriz canônica de 24 capturas (6 telas × 2 resoluções × 2 temas), geradas automaticamente via Playwright (`frontend/e2e/visual-regression.spec.ts`) com dados clínicos determinísticos em ambiente controlado.

| Versão | View | Viewport | Tema | Estado dos Dados | Data da Captura | Arquivo |
|---|---|---|---|---|---|---|
| 2.2.0 | Hoje (`overview`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_overview_375x667_dark_normal.png`](baselines/v2.2.0_overview_375x667_dark_normal.png) |
| 2.2.0 | Hoje (`overview`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_overview_375x667_light_normal.png`](baselines/v2.2.0_overview_375x667_light_normal.png) |
| 2.2.0 | Hoje (`overview`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_overview_1280x800_dark_normal.png`](baselines/v2.2.0_overview_1280x800_dark_normal.png) |
| 2.2.0 | Hoje (`overview`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_overview_1280x800_light_normal.png`](baselines/v2.2.0_overview_1280x800_light_normal.png) |
| 2.2.0 | Saúde (`labs`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_labs_375x667_dark_normal.png`](baselines/v2.2.0_labs_375x667_dark_normal.png) |
| 2.2.0 | Saúde (`labs`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_labs_375x667_light_normal.png`](baselines/v2.2.0_labs_375x667_light_normal.png) |
| 2.2.0 | Saúde (`labs`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_labs_1280x800_dark_normal.png`](baselines/v2.2.0_labs_1280x800_dark_normal.png) |
| 2.2.0 | Saúde (`labs`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_labs_1280x800_light_normal.png`](baselines/v2.2.0_labs_1280x800_light_normal.png) |
| 2.2.0 | Treinos (`workouts`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_workouts_375x667_dark_normal.png`](baselines/v2.2.0_workouts_375x667_dark_normal.png) |
| 2.2.0 | Treinos (`workouts`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_workouts_375x667_light_normal.png`](baselines/v2.2.0_workouts_375x667_light_normal.png) |
| 2.2.0 | Treinos (`workouts`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_workouts_1280x800_dark_normal.png`](baselines/v2.2.0_workouts_1280x800_dark_normal.png) |
| 2.2.0 | Treinos (`workouts`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_workouts_1280x800_light_normal.png`](baselines/v2.2.0_workouts_1280x800_light_normal.png) |
| 2.2.0 | Intervenções (`supplements`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_supplements_375x667_dark_normal.png`](baselines/v2.2.0_supplements_375x667_dark_normal.png) |
| 2.2.0 | Intervenções (`supplements`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_supplements_375x667_light_normal.png`](baselines/v2.2.0_supplements_375x667_light_normal.png) |
| 2.2.0 | Intervenções (`supplements`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_supplements_1280x800_dark_normal.png`](baselines/v2.2.0_supplements_1280x800_dark_normal.png) |
| 2.2.0 | Intervenções (`supplements`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_supplements_1280x800_light_normal.png`](baselines/v2.2.0_supplements_1280x800_light_normal.png) |
| 2.2.0 | IA (`ai`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_ai_375x667_dark_normal.png`](baselines/v2.2.0_ai_375x667_dark_normal.png) |
| 2.2.0 | IA (`ai`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_ai_375x667_light_normal.png`](baselines/v2.2.0_ai_375x667_light_normal.png) |
| 2.2.0 | IA (`ai`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_ai_1280x800_dark_normal.png`](baselines/v2.2.0_ai_1280x800_dark_normal.png) |
| 2.2.0 | IA (`ai`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_ai_1280x800_light_normal.png`](baselines/v2.2.0_ai_1280x800_light_normal.png) |
| 2.2.0 | Perfil (`profile`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_profile_375x667_dark_normal.png`](baselines/v2.2.0_profile_375x667_dark_normal.png) |
| 2.2.0 | Perfil (`profile`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_profile_375x667_light_normal.png`](baselines/v2.2.0_profile_375x667_light_normal.png) |
| 2.2.0 | Perfil (`profile`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_profile_1280x800_dark_normal.png`](baselines/v2.2.0_profile_1280x800_dark_normal.png) |
| 2.2.0 | Perfil (`profile`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.2.0_profile_1280x800_light_normal.png`](baselines/v2.2.0_profile_1280x800_light_normal.png) |

---

## 5. Capturas Legadas Históricas (`legacy/`)

Para manter a rastreabilidade e histórico evolutivo da interface do Longevidade Hub, os arquivos anteriores à versão 2.2.0 estão organizados em:

### 5.1. Baselines v2.1.0 (`legacy/v2.1.0/`)
Contém os 24 baselines capturados durante o ciclo de estabilização da versão 2.1.0 (`v2.1.0_*`).

### 5.2. Capturas Preliminares (`legacy/pre-v2.1.0/`)
Contém os registros visuais iniciais do produto (v1.x / v2.0.0):
- `dashboard_overview.png`: Visão Geral do Dashboard inicial.
- `dashboard_overview.jpg`: Snapshot comprimido da tela principal.
- `supplements_and_hormones.jpg`: Módulo de Suplementos anterior à reauditoria.
- `ai_copilot_medical.jpg`: Interface inicial do Copiloto IA (anterior à modularização epistemológica).
- `lab_results_cardio.jpg`: Tabela de exames laboratoriais prévia.
