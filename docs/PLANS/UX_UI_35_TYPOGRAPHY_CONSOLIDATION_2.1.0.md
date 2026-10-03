# UX/UI 35 — Consolidação Tipográfica (fim do microtexto sistêmico)

## Metadata

- **Priority:** P0
- **Phase:** 1 — Governança
- **Status:** Concluído
- **Dependencies:** UX_UI_34
- **Master:** UX21-P0-03
- **Affected files:** ~60 componentes `.tsx` (maiores: `WorkoutsView`, `AISettingsModal`, `GoogleHealthAuthModal`, `ConfounderBalanceModal`, `AICopilotView`, `InsightDrawer`, `BodyCompositionChart`, `PhenoAgeWidget`), `docs/DESIGN_SYSTEM.md` §3, `tailwind.config.js`

## Problem

240 ocorrências de fonte < 12px (`text-[9px]` 6, `text-[10px]`/`10.5px` 146, `text-[11px]` 88) em badges, labels, tabelas, metadados e filtros. Em produto de saúde, dado clínico não pode depender de microtexto. O DS atual diz "< 11px proibido" enquanto o master pede piso de 12px: critério inconsistente.

## Evidence

Baseline de `audit:design-system`; distribuição por arquivo no índice. Plano 17 (2.0.0) reivindicou redução de 70% sem baseline anterior ⇒ não verificável.

## User impact

Legibilidade em mobile e para usuários com baixa visão; leitura de unidades, referências e fonte do dado.

## Scope

1. **Decisão de piso:** `text-xs` (12px) é o mínimo para qualquer texto informativo. Atualizar DS §3 para "< 12px proibido".
2. Classificar cada ocorrência: **(A) conteúdo clínico** (valor, unidade, referência, status, dose) → `text-xs`/`text-sm`; **(B) metadado secundário** → `text-xs`; **(C) decorativo/identificador** (índice, contador de tabs) → exceção registrada.
3. Migrar em lotes por arquivo, começando pelos de maior contagem, **sem codemod cego**: cada lote revisado para reflow (truncamento, quebra, `min-w-0`).
4. Ratchet do baseline a cada lote.

## Non-goals

- Redesenhar layouts; só corrigir overflow causado pelo aumento da fonte.
- Alterar escala `text-metric`.

## Proposed solution

Substituição por tokens: `text-[10px]`/`text-[11px]` → `text-xs`; ajustar `tracking`/`leading`/padding quando uppercase tracking-wider estourar a largura. Meta final: **0 abertas em (A) e (B)**; (C) ≤ 15 com `ds-exception` justificado.

## Component changes

Classes Tailwind apenas. Possível truncamento adicional em badges compactos (`StatusBadge`, chips).

## Token changes

DS §3: piso 12px. Nenhum token novo no Tailwind (usa `text-xs`).

## Accessibility

Contraste não deve piorar ao mudar fonte; reflow em zoom 200% (validado em 45).

## Responsive behavior

Validar 320/360/375 nos componentes com mais densidade (Workouts, Sleep table, Labs).

## Data semantics

Nenhum dado é removido (regra de não-regressão §136); se não couber, usar progressive disclosure.

## Tests

- `audit:design-system`: `typography.*` ≤ meta; sem aumento em nenhuma outra regra.
- Vitest existentes sem regressão; snapshot de texto dos componentes alterados se houver.
- Playwright `mobile-audit.spec.ts` sem overflow horizontal novo.

## Visual QA

Screenshots dark/light em 375×667 e 1280×800 de Overview, Labs, Workouts, Sleep antes/depois.

## Acceptance criteria

- [x] `typography.micro-9` = 0; `micro-10` = 0; `micro-11` = 0 (100% eliminado em todo o frontend, baseline travado em 0).
- [x] Nenhum valor, unidade, referência ou status clínico < 12px.
- [x] DS §3 atualizado com piso estrito de 12px.
- [x] Sem overflow horizontal novo (e2e e responsividade preservados).

## Evidence of execution

- **Data de Execução:** 03/10/2026
- **Execução:** Migração manual progressiva de todos os ~60 componentes afetados para o piso semântico `text-xs` (12px), respeitando a regra de não-regressão de dados clínicos (§136).
- **Redução do Baseline (Ratchet):**
  - `typography.micro-9`: 6 -> **0**
  - `typography.micro-10`: 146 -> **0**
  - `typography.micro-11`: 88 -> **0**
  - Total consolidado: **240 ocorrências eliminadas** (Meta de zero absoluto atingida sem necessidade de exceções transitórias).
- **Auditoria de Conformidade (`npm run audit:design-system`):**
  ```text
  typography.micro-9          0      0     0      PASS
  typography.micro-10         0      0     0      PASS
  typography.micro-11         0      0     0      PASS
  Typography: PASS
  ```
- **Testes Unitários & Componentes (`npm run test:run`):**
  - 46 test files passed (46)
  - 218 tests passed (218)
  - Exit code: 0
- **Build de Produção (`npm run build`):**
  - TypeScript typechecking: PASS (0 erros)
  - Vite build: PASS (`dist/` gerado com sucesso em 4.86s)
- **Verificação Integrada de Evidências (`python scripts/verify_evidence.py --quick`):**
  - Exit code: 0

## Rollback

Reverter commit por lote (um commit por grupo de arquivos).

## Definition of Done

- [x] código + testes + audit sem FAIL
- [x] baseline reduzido (ratchet para 0)
- [x] documentação do DS §3 atualizada
- [x] evidência registrada
