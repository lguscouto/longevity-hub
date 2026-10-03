# UX/UI 37 — Arquitetura de Informação do Header (separar navegação, ações, infraestrutura e preferências)

## Metadata

- **Priority:** P1
- **Phase:** 2 — Interação
- **Status:** Concluído
- **Dependencies:** UX_UI_36
- **Master:** UX21-P1-01 (+ §32 Perfil, §33 Settings)
- **Affected files:** `Header.tsx` (reduzido para 245 linhas), `HeaderUtilityActions.tsx` (novo, 137 linhas), `HeaderUtilityActions.test.tsx` (novo, 82 linhas), `App.tsx`, `ProfileView.tsx`, `docs/DESIGN_SYSTEM.md` (§4.10)

## Problem

O Header acumulava navegação primária (6 áreas), subnavegação, Registrar Métrica, Doctor Briefing, Sync Zepp/Google, Configuração de IA e Tema em um componente monolítico de 422 linhas. Misturava navegação, centro de comando, controle de infraestrutura, ações clínicas e preferências.

## Evidence

`Header.tsx` (422 linhas reduzido para 245 linhas); master §10.

## User impact

Ações de infraestrutura competiam com `Hoje/Saúde/Treinos`; agora há clara separação por papéis com agrupamentos semânticos com `role="group"` e foco acessível.

## Scope

1. Estrutura semântica: `Brand` · `Primary Navigation` · `Sub-navigation` · `Utility Actions` (Registrar, Briefing, Sync status, Configurações).
2. Preferências visuais (tema) e configurações de IA organizadas em grupos semânticos no toolbar (`role="toolbar"`).
3. Acesso à configuração avançada de IA/integrações adicionado em `Perfil → Integrações` (Card de Provedores LLM & Privacidade).
4. `HeaderUtilityActions` extraído e `Header.tsx` reduzido para 245 linhas (< 300 linhas).

## Non-goals

- Mudar as 6 áreas primárias; implementar estados de Sync (→ 44); layout mobile detalhado (→ 38).

## Proposed solution

Header modular composto por regiões semânticas (`<header>`, `<nav>`, toolbar de ações com `role="group"` e `aria-label`). Ações utilitárias extraídas para componente isolado e testado.

## Component changes

- `Header.tsx` refatorado para 245 linhas, consumindo `HeaderUtilityActions` e renderizando `PRIMARY_NAV_ITEMS` e subtabs de forma declarativa.
- `HeaderUtilityActions.tsx` criado com 3 grupos semânticos (`Ações clínicas do dia`, `Controle de sincronização e configurações`, `Preferências e configurações`).
- `ProfileView.tsx` atualizado com card de gerenciamento de IA (Provedores LLM, chaves BYOK e modo de privacidade).
- `App.tsx` repassando `onOpenAISettings` para o `ProfileView`.

## Token changes

Nenhum.

## Accessibility

Landmarks `header`/`nav`; `aria-current="page"` mantido em tabs primárias e subtabs; ordem de foco previsível; alvos de toque com $44\times 44$px mantidos.

## Responsive behavior

Nenhum overflow horizontal desgovernado; máscaras de scroll suave mantidas com exceções tokenizadas.

## Data semantics

Ação "Registrar Métrica" e "Doctor Briefing" permanecem com prioridade visual à esquerda no toolbar de ações.

## Tests

- `HeaderUtilityActions.test.tsx` cobrindo 100% dos fluxos e grupos de botões.
- `Header.test.tsx` com 5/5 testes aprovados.
- Vitest suite completa: 47 arquivos, 222 testes PASS.
- Production build PASS.
- `verify_evidence.py --quick` PASS.

## Acceptance criteria

- [x] Quatro grupos semânticos documentados no DS (§4.10).
- [x] `Header.tsx` < 300 linhas (alcançado: 245 linhas).
- [x] Todas as ações anteriores continuam acessíveis (inventário: Registrar Métrica, Doctor Briefing, Sync Zepp, Sync Google, Configurações IA, Tema).
- [x] Config avançada em `Perfil → Configurações` (Card de IA em `ProfileView.tsx`).

## Evidence of execution

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Design System Conformance Audit | `npm run audit:design-system` | 03/10/2026 11:09:52 | Windows 11 | Node v20 / Python 3.14.6 | PASS | 0 open violations, 10 exceptions justificadas |
| Baseline Ratchet Down | `npm run audit:design-system:baseline` | 03/10/2026 11:08:40 | Windows 11 | Node v20 | PASS | Baseline travado com novas reduções: native.button=207, radius.non-token=628 |
| Vite Production Build | `npm run build` | 03/10/2026 11:09:52 | Windows 11 | Node v20 | PASS | ✓ built in 5.21s (dist gerada com sucesso) |
| Vitest Unit & Component Suite | `npm run test:run` | 03/10/2026 11:10:02 | Windows 11 | Vitest v1.6.0 | PASS | 47 test files passed, 222 passed (12.70s) |
| Script de Verificação de Evidências | `python scripts/verify_evidence.py --quick` | 03/10/2026 11:10:16 | Windows 11 | Python 3.14.6 | PASS | Exit code 0, 100% de aprovação |

## Rollback

Reverter commits dos arquivos `Header.tsx`, `HeaderUtilityActions.tsx` e `ProfileView.tsx`.

## Definition of Done

- [x] código + testes + audit sem FAIL
- [x] DS atualizado (§4.10)
- [x] inventário de ações 100% preservado
- [x] evidência registrada e verificada com exit code 0
