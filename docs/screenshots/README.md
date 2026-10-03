# Catálogo e Governança de Screenshots — Longevidade Hub

Este diretório armazena capturas de tela e baselines visuais canônicos do Longevidade Hub para auditoria contínua, documentação clínica e testes de regressão visual.

---

## 1. Padrão de Nomenclatura Canônica

Seguindo as diretrizes do plano `UX_UI_45` (§99–§104), todo screenshot versionado deve seguir rigorosamente a sintaxe:

```text
v<versão>_<view>_<viewport>_<tema>_<estado>.png
```

- **`<versão>`**: Versão da aplicação (ex: `2.1.0`).
- **`<view>`**: Identificador da tela (`overview`, `labs`, `workouts`, `supplements`, `ai`, `profile`).
- **`<viewport>`**: Resolução de tela padronizada (`375x667` para mobile canônico, `1280x800` para desktop padrão).
- **`<tema>`**: Tema de renderização (`dark` ou `light`).
- **`<estado>`**: Estado dos dados (`normal`, `loading`, `empty`, `error`, `success`).

---

## 2. Baselines de Regressão Visual v2.1.0 (`baselines/`)

Matriz canônica de 24 capturas (6 telas × 2 resoluções × 2 temas), geradas automaticamente via Playwright (`frontend/e2e/visual-regression.spec.ts`) com dados clínicos determinísticos em ambiente controlado.

| Versão | View | Viewport | Tema | Estado dos Dados | Data da Captura | Arquivo |
|---|---|---|---|---|---|---|
| 2.1.0 | Hoje (`overview`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_overview_375x667_dark_normal.png`](baselines/v2.1.0_overview_375x667_dark_normal.png) |
| 2.1.0 | Hoje (`overview`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_overview_375x667_light_normal.png`](baselines/v2.1.0_overview_375x667_light_normal.png) |
| 2.1.0 | Hoje (`overview`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_overview_1280x800_dark_normal.png`](baselines/v2.1.0_overview_1280x800_dark_normal.png) |
| 2.1.0 | Hoje (`overview`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_overview_1280x800_light_normal.png`](baselines/v2.1.0_overview_1280x800_light_normal.png) |
| 2.1.0 | Saúde (`labs`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_labs_375x667_dark_normal.png`](baselines/v2.1.0_labs_375x667_dark_normal.png) |
| 2.1.0 | Saúde (`labs`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_labs_375x667_light_normal.png`](baselines/v2.1.0_labs_375x667_light_normal.png) |
| 2.1.0 | Saúde (`labs`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_labs_1280x800_dark_normal.png`](baselines/v2.1.0_labs_1280x800_dark_normal.png) |
| 2.1.0 | Saúde (`labs`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_labs_1280x800_light_normal.png`](baselines/v2.1.0_labs_1280x800_light_normal.png) |
| 2.1.0 | Treinos (`workouts`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_workouts_375x667_dark_normal.png`](baselines/v2.1.0_workouts_375x667_dark_normal.png) |
| 2.1.0 | Treinos (`workouts`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_workouts_375x667_light_normal.png`](baselines/v2.1.0_workouts_375x667_light_normal.png) |
| 2.1.0 | Treinos (`workouts`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_workouts_1280x800_dark_normal.png`](baselines/v2.1.0_workouts_1280x800_dark_normal.png) |
| 2.1.0 | Treinos (`workouts`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_workouts_1280x800_light_normal.png`](baselines/v2.1.0_workouts_1280x800_light_normal.png) |
| 2.1.0 | Intervenções (`supplements`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_supplements_375x667_dark_normal.png`](baselines/v2.1.0_supplements_375x667_dark_normal.png) |
| 2.1.0 | Intervenções (`supplements`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_supplements_375x667_light_normal.png`](baselines/v2.1.0_supplements_375x667_light_normal.png) |
| 2.1.0 | Intervenções (`supplements`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_supplements_1280x800_dark_normal.png`](baselines/v2.1.0_supplements_1280x800_dark_normal.png) |
| 2.1.0 | Intervenções (`supplements`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_supplements_1280x800_light_normal.png`](baselines/v2.1.0_supplements_1280x800_light_normal.png) |
| 2.1.0 | IA (`ai`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_ai_375x667_dark_normal.png`](baselines/v2.1.0_ai_375x667_dark_normal.png) |
| 2.1.0 | IA (`ai`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_ai_375x667_light_normal.png`](baselines/v2.1.0_ai_375x667_light_normal.png) |
| 2.1.0 | IA (`ai`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_ai_1280x800_dark_normal.png`](baselines/v2.1.0_ai_1280x800_dark_normal.png) |
| 2.1.0 | IA (`ai`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_ai_1280x800_light_normal.png`](baselines/v2.1.0_ai_1280x800_light_normal.png) |
| 2.1.0 | Perfil (`profile`) | 375×667 (Mobile) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_profile_375x667_dark_normal.png`](baselines/v2.1.0_profile_375x667_dark_normal.png) |
| 2.1.0 | Perfil (`profile`) | 375×667 (Mobile) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_profile_375x667_light_normal.png`](baselines/v2.1.0_profile_375x667_light_normal.png) |
| 2.1.0 | Perfil (`profile`) | 1280×800 (Desktop) | Dark | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_profile_1280x800_dark_normal.png`](baselines/v2.1.0_profile_1280x800_dark_normal.png) |
| 2.1.0 | Perfil (`profile`) | 1280×800 (Desktop) | Light | Mock clínico determinístico | 03/10/2026 | [`v2.1.0_profile_1280x800_light_normal.png`](baselines/v2.1.0_profile_1280x800_light_normal.png) |

---

## 3. Capturas Legadas Históricas (v1.x / v2.0.0)

As imagens na raiz deste diretório representam estados históricos de documentação pré-v2.1.0:

- `dashboard_overview.png`: Visão Geral do Dashboard inicial.
- `supplements_and_hormones.jpg`: Módulo de Suplementos anterior à reauditoria.
- `ai_copilot_medical.jpg`: Interface inicial do Copiloto IA (anterior à modularização epistemológica).
- `lab_results_cardio.jpg`: Tabela de exames laboratoriais prévia.
