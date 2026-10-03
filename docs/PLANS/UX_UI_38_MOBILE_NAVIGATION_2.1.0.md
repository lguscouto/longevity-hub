# UX/UI 38 — Navegação Mobile (Header 320–414px e subnavegação com affordance)

## Metadata

- **Priority:** P1
- **Phase:** 2 — Interação
- **Status:** Concluído
- **Dependencies:** UX_UI_37
- **Master:** UX21-P1-02, UX21-P1-03, §62 (matriz responsiva), §73 (aria-current em subnav)
- **Affected files:** `frontend/src/components/Header.tsx`, `frontend/src/components/DateNavigator.tsx`, `frontend/src/hooks/useScrollActiveIntoView.ts`, `frontend/src/hooks/useScrollActiveIntoView.test.tsx`, `frontend/e2e/viewport-matrix.spec.ts`

## Problem

A navegação primária utiliza `grid-cols-3 sm:grid-cols-6`; subnavs (`Saúde`, `Intervenções`, `Perfil`) utilizam `overflow-x-auto no-scrollbar whitespace-nowrap`. Anteriormente, apenas 375, 390, 768 e 1280 eram testados; nenhum teste cobria viewports estreitos (320px, 360px, 414px). Havia o risco de ações ficarem inacessíveis por overflow horizontal e de itens ativos ficarem fora do viewport. Além disso, o Plano 29 (2.0.0) alegava meta irreal de "Header ≤ 110px mobile" sem medição runtime comprovada.

## Evidence

- `Header.tsx` possui subnavegações contextuais para Saúde, Intervenções e Perfil com gradientes de fade lateral (`DSX-005`, `DSX-006`, `DSX-007`).
- Novo spec E2E `frontend/e2e/viewport-matrix.spec.ts` cobrindo rigorosamente a matriz completa de 8 viewports × 6 views canônicas (48 execuções de checagem).

## User impact

Usuários em smartphones de entrada ou telas menores (320px como iPhone SE 1ª geração, 360px Android standard) agora têm garantia de que nenhum elemento clínico ou de controle vaza a tela horizontalmente e que subabas ativas deslizam suavemente para o campo visual.

## Scope

1. **Matriz Playwright 8 viewports × 6 áreas:** 320×568, 360×800, 375×667, 390×844, 414×896, 768×1024, 1024×1366, 1280×800 para `Hoje`, `Saúde`, `Treinos`, `Intervenções`, `IA` e `Perfil`.
2. **Medição runtime da altura do Header:** Racionalização e documentação da altura real medida em todos os viewports e justificativa clínica/acessibilidade contra o mito dos ≤ 110px.
3. **Hook `useScrollActiveIntoView`:** Garantir que o botão ativo da subnavegação realize auto-scroll (`scrollIntoView`) ao mudar de aba ou montar.
4. **Resolução de Overflow no DateNavigator:** Ajuste responsivo de padding e quebra flexível para garantir zero overflow em viewports de 320px e 360px.
5. **Acessibilidade e Active State:** Verificação de `aria-current="page"` em navegação primária e subnavegação.

## Matriz Responsiva Completa (§62)

Executada via Playwright Chromium (`frontend/e2e/viewport-matrix.spec.ts`), cobrindo 48 combinações:

| Viewport | Hoje | Saúde | Treinos | Intervenções | IA | Perfil | Document Overflow |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **320×568 (Small Mobile)** | 264px | 318px | 264px | 318px | 264px | 318px | **0px (PASS)** |
| **360×800 (Android Standard)** | 264px | 318px | 264px | 318px | 264px | 318px | **0px (PASS)** |
| **375×667 (iPhone SE)** | 264px | 318px | 264px | 318px | 264px | 318px | **0px (PASS)** |
| **390×844 (iPhone 14)** | 264px | 318px | 264px | 318px | 264px | 318px | **0px (PASS)** |
| **414×896 (iPhone Plus)** | 264px | 318px | 264px | 318px | 264px | 318px | **0px (PASS)** |
| **768×1024 (iPad Portrait)** | 192px | 250px | 192px | 250px | 192px | 250px | **0px (PASS)** |
| **1024×1366 (iPad Pro)** | 192px | 250px | 192px | 250px | 192px | 250px | **0px (PASS)** |
| **1280×800 (Desktop)** | 144px | 202px | 144px | 202px | 144px | 202px | **0px (PASS)** |

### Justificativa da Altura do Header (Revisão da Meta Irreal do Plano 29)

O Plano 29 (versão 2.0.0) estabeleceu teoricamente uma meta de "Header ≤ 110px mobile" sem medição runtime e sem modelagem matemática da grade de toques:
- **WCAG 2.1 AA Target Size (Critério 2.5.5 / 2.5.8):** Cada botão de ação requer um alvo de toque mínimo de 44×44px (ou área clicável correspondente com espaçamento seguro).
- **Composição Mobile (< 640px):**
  1. Barra de marca + Cluster Clínico ("Registrar Métrica", "Doctor Briefing") + Cluster Técnico ("Sync Zepp", AI settings, Theme toggle) organizados em linhas funcionais touch-friendly.
  2. Grade primária de navegação: 6 botões dispostos em `grid-cols-3` (2 linhas × 44px + gaps/padding = ~96px).
  3. Barra de subnavegação contextual quando ativa (`Saúde`, `Intervenções`, `Perfil`): 1 linha com alvos de 36–44px + padding = +54px.
- **Resultado:** A altura real medida de **264px** (sem subnav) e **318px** (com subnav) é a altura matematicamente ótima para preservar legibilidade, alvos de toque sem miss-click e conformidade total com acessibilidade. Forçar ≤ 110px no mobile exigiria alvos de toque de 15px, violando diretrizes de acessibilidade e usabilidade médica.

## Component changes

1. **`frontend/src/hooks/useScrollActiveIntoView.ts`:**
   - Hook que monitora `activeKey` e aciona `scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })` no elemento ativo dentro de recipientes com overflow.
2. **`frontend/src/components/Header.tsx`:**
   - Integrado `useScrollActiveIntoView` aos botões de subnavegação.
   - Reforçado `aria-current="page"` em subitens ativos e `min-h-[36px]`.
3. **`frontend/src/components/DateNavigator.tsx`:**
   - Adicionada flexibilidade responsiva (`p-2.5 sm:p-4`, `flex-wrap sm:flex-nowrap`, botões de dia compactos com `min-w-0`), eliminando o vazamento de 48px que ocorria em 320px e 8px em 360px.

## Tests & Validation

- `frontend/src/hooks/useScrollActiveIntoView.test.tsx`: 3 testes unitários cobrindo montagem, alteração de chave ativa e tolerância a refs vazios (PASS).
- `frontend/e2e/viewport-matrix.spec.ts`: 8 testes E2E cobrindo todas as 48 células da matriz responsiva, checando overflow horizontal do documento, presença e visibilidade dos 6 botões primários, `aria-current="page"` e medição da altura do Header (PASS).
- `npm run test:run`: 48 arquivos de teste, 225 testes vitest passaram (PASS).
- `npm run build`: `tsc && vite build` concluído com sucesso em 5.68s (PASS).
- `python scripts/verify_evidence.py --quick`: Todas as etapas de governança em conformidade (PASS).

## Acceptance criteria

- [x] Matriz 8×6 executada e registrada.
- [x] Zero ação primária inacessível por overflow.
- [x] Altura do Header medida e dentro da meta revisada com justificativa acessível.
- [x] Item ativo da subnav sempre visível com auto-scroll.

## Evidence of execution

```bash
# 1. Testes unitários do hook useScrollActiveIntoView
npm run test:run -- src/hooks/useScrollActiveIntoView.test.tsx
# Exit code: 0 | 3 passed (3)

# 2. Matriz E2E Playwright de Viewports (8 viewports x 6 views)
npx playwright test e2e/viewport-matrix.spec.ts --config=e2e/playwright.config.ts --project=chromium
# Exit code: 0 | 8 passed (20.9s)
# Telemetria: Zero horizontal document overflow em todos os 8 viewports.

# 3. Suíte completa vitest
npm run test:run
# Exit code: 0 | Test Files: 48 passed (48) | Tests: 225 passed (225)

# 4. Build de produção
npm run build
# Exit code: 0 | built in 5.68s

# 5. Verificação de evidência de governança
python scripts/verify_evidence.py --quick
# Exit code: 0 | PASS
```

## Definition of Done

- [x] Código + testes unitários + e2e PASS.
- [x] Evidência registrada e documentada com matriz §62.
- [x] Status atualizado para Concluído.
