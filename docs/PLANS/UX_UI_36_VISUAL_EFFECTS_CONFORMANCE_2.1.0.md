# UX/UI 36 — Conformidade de Efeitos Visuais e Superfície (gradientes, glow, blur, radius, motion)

## Metadata

- **Priority:** P0
- **Phase:** 1 — Governança
- **Status:** Concluído
- **Dependencies:** UX_UI_34
- **Master:** UX21-P0-04, UX21-P0-05, UX21-P2-01 (motion), UX21-P2-03 (polish)
- **Affected files:** `Header.tsx`, `WorkoutsView.tsx`, `GoogleHealthAuthModal.tsx`, `PhenoAgeWidget.tsx`, `ProfileView.tsx`, `PhysicalAssessmentsView.tsx`, `TimelineView.tsx`, `ui/Button.tsx`, `ui/Modal.tsx`, `ui/Drawer.tsx`, `tailwind.config.js`, `index.css`, `docs/DESIGN_SYSTEM.md`

## Problem

1. **Gradientes/glow/blur:** 49 `bg-gradient-to-*`, 22 `glow*`, 14 `backdrop-blur*` contradizem "Sobriedade Clínica" (DS §1.1).
2. **Radius:** o DS afirma `rounded-lg` = 20px e `rounded-sm` = 8px, mas `tailwind.config.js` só define `radius-sm…xl`; as classes `rounded-*` seguem os valores padrão do Tailwind. Resultado: 0 usos de `radius-*` e 643 de `rounded-xl/2xl/lg/md`.
3. **Motion:** ícone da marca no Header com `animate-pulse` permanente; 5 `animate-ping`/`bounce`.

## Evidence

Auditoria (`gradients.bg`=49, `effects.glow`=22, `effects.backdrop-blur`=14, `radius.non-token`=643, `motion.decorative`=5); `Header.tsx:113` (`animate-pulse` na marca).

## User impact

Ruído visual competindo com dados; inconsistência de cantos entre componentes do mesmo nível; movimento permanente em identidade.

## Scope

**A. Gradientes — classificar (master §8):**
- **A proibido:** botões primários comuns, tabs, títulos, cards de dados, elementos clínicos → cor sólida.
- **B excepcional:** identidade/ilustração/estado especial → `ds-exception`.
- **C permitido:** escala em visualização de dados, elementos de IA, branding.
- Cada gradiente restante tem justificativa no código (`ds-exception`) ou no DS.

**B. Radius — decisão a registrar no plano antes de codar:**
- Opção 1: override em massa.
- Opção 2 (executada): alinhar o DS ao código (escala real 8px/12px/16px) e mapear `surface-xs/sm/md/lg` e `pill` nos tokens `tailwind.config.js` mantendo backward compatibility com os testes.

**C. Blur/Glow:** remover `glow*` decorativos (100% eliminados); `backdrop-blur` só em overlay quando houver função (2 ocorrências: Modal e Drawer com DSX-001 e DSX-002, registradas em DS §4.7).

**D. Motion:** remover `animate-pulse` permanente da marca no Header; `animate-ping` e `animate-bounce` decorativos eliminados.

## Non-goals

- Redesenho de identidade visual; paleta semântica de IA (`semantic-ai`) fica para 43/42.
- Remover sombras tokenizadas.

## Proposed solution

Lotes por arquivo; um commit por lote; ratchet a cada lote. Meta: `gradients.bg` ≤ 8 (todas com exceção), `effects.glow` = 0, `effects.backdrop-blur` ≤ 4, `motion.decorative` = 0, `radius.non-token` conforme opção escolhida.

## Component changes

`Button` variante `primary` sem gradiente; `Header` marca estática; `Modal/Drawer` backdrop com exceções documentadas.

## Token changes

Tokens `surface-xs`, `surface-sm`, `surface-md`, `surface-lg` adicionados em `tailwind.config.js`; tabela de escala semântica em DS §2.1 atualizada.

## Accessibility

Sem perda de contraste ao trocar gradiente por cor sólida; foco inalterado; motion respeita `prefers-reduced-motion`.

## Responsive behavior

Sem impacto negativo; cantos coesos em toda a interface.

## Data semantics

Cores de status não foram removidas nem tornaram status dependente só de cor (ícones e rótulos mantidos).

## Tests

- `audit:design-system` com 0 violações não-justificadas.
- Vitest 46 arquivos, 218 testes PASS.
- Build Vite de produção PASS.
- `python scripts/verify_evidence.py --quick` PASS.

## Acceptance criteria

- [x] Gradientes ≤ 8, todos justificados (`gradients.bg` = 0 open, 8 exceções DSX-003 a DSX-010); glow = 0; blur ≤ 4 justificados (2 exceções DSX-001 e DSX-002).
- [x] Marca sem animação permanente (`motion.decorative` = 0).
- [x] Radius: decisão registrada + DS §2.1 consistente com `tailwind.config.js`.
- [x] Nenhum status dependente só de cor após a mudança.

## Evidence of execution

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Design System Conformance Audit | `npm run audit:design-system` | 03/10/2026 11:00:34 | Windows 11 | Node v20 / Python 3.14.6 | PASS | 0 open violations, 10 exceptions justificadas |
| Baseline Ratchet Down | `npm run audit:design-system:baseline` | 03/10/2026 10:58:52 | Windows 11 | Node v20 | PASS | Baseline travado em: glow=0, blur=0, gradients=0, motion=0 |
| Vite Production Build | `npm run build` | 03/10/2026 11:00:34 | Windows 11 | Node v20 | PASS | ✓ built in 4.75s (dist gerada com sucesso) |
| Vitest Unit & Component Suite | `npm run test:run` | 03/10/2026 11:00:44 | Windows 11 | Vitest v1.6.0 | PASS | 46 test files passed, 218 passed (11.93s) |
| Script de Verificação de Evidências | `python scripts/verify_evidence.py --quick` | 03/10/2026 11:00:58 | Windows 11 | Python 3.14.6 | PASS | Exit code 0, 100% de aprovação |

## Rollback

Reverter commits dos lotes de efeitos visuais ou restaurar `audit-baseline.json`.

## Definition of Done

- [x] código + testes + audit sem FAIL
- [x] DS atualizado (§2.1, §2.3, §4.7) e `DESIGN_SYSTEM_EXCEPTIONS.md` registrado
- [x] tokens de radius alinhados e backward compatible
- [x] evidência registrada e verificada com exit code 0
