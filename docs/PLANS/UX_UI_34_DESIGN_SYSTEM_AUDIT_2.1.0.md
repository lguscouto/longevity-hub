# UX/UI 34 — Auditoria Automatizada do Design System e Pipeline de Validação

## Metadata

- **Priority:** P0
- **Phase:** 1 — Governança
- **Status:** Concluído
- **Dependencies:** nenhuma
- **Master:** UX21-P0-01, UX21-P0-02
- **Affected files:** `frontend/scripts/audit-design-system.mjs` (novo), `frontend/audit-baseline.json` (novo), `frontend/package.json`, `docs/DESIGN_SYSTEM_EXCEPTIONS.md` (novo), `scripts/verify_evidence.py`, `docs/DESIGN_SYSTEM.md`, `frontend/src/test/designSystemAudit.test.ts` (novo)

## Problem

O Design System documenta regras que nada impede de serem violadas. Qualquer PR pode reintroduzir `text-[10px]` ou gradientes sem sinal. Além disso, "Build PASS" aparece em documentos sem comando, timestamp, ambiente ou exit code reproduzíveis.

## Evidence

- 15 categorias de violação medidas: 6 `text-[9px]`, 146 `text-[10px]`, 88 `text-[11px]`, 49 `bg-gradient`, 21 `focus:outline-none`, 219 `<button>` nativos etc. (ver índice §1).
- `scripts/verify_evidence.py` não executava nenhuma verificação de conformidade visual.
- Master §6: ZIP sem `node_modules` → build não validável.

## User impact

Indireto: sem gate, a dívida visual cresce e as correções dos planos 35–46 regridem silenciosamente.

## Scope

1. Script `audit-design-system.mjs` (Node, zero dependências) com regras de tipografia, radius, gradientes, efeitos, foco, motion e controles nativos.
2. Saída `PASS | WARN | FAIL | EXCEPTION` por regra e por categoria; `--verbose` lista `arquivo:linha`; `--json`; relatório em `frontend/test-results/design-system-audit.json`.
3. **Baseline com ratchet:** `audit-baseline.json` guarda a dívida legada; aumento ⇒ `FAIL` (exit 1); redução permitida via `--update-baseline`.
4. Registro de exceções (`DESIGN_SYSTEM_EXCEPTIONS.md`) com ID, arquivo, regra, motivo, data, status; marca `ds-exception: DSX-NNN` no código; marca sem registro ⇒ `FAIL`.
5. `verify_evidence.py` passa a executar `npm ci` (opcional via flag), `audit:design-system` e a incluir o resultado na tabela canônica (comando, timestamp, ambiente, exit code).

## Non-goals

- Corrigir as violações (planos 35–46).
- Análise AST/JSX completa ou regras de contraste (tratado em 40/45).
- Novas dependências npm.

## Proposed solution

Varredura por linha com regex sobre `frontend/src/**/*.{ts,tsx,css}` excluindo testes. Primitives em `components/ui/` são isentos das regras `native.*`. Dívida legada congelada como baseline para o gate nunca bloquear trabalho existente, só regressões.

## Component changes

Nenhum componente de produto. Apenas tooling.

## Token changes

Nenhum.

## Accessibility

Regra `focus.outline-none` detecta supressão de foco sem substituto.

## Responsive behavior

Não aplicável.

## Data semantics

Não aplicável.

## Tests

- Teste de regressão do gate: injetar `text-[9px] bg-gradient-to-r` em arquivo temporário ⇒ exit 1 com `FAIL` em `micro-9` e `gradients.bg`; remover ⇒ exit 0 `WARN`.
- Teste vitest do módulo de auditoria e regras (`frontend/src/test/designSystemAudit.test.ts`).

## Visual QA

Não aplicável.

## Acceptance criteria

- [x] `npm run audit:design-system` existe e imprime PASS/WARN/FAIL/EXCEPTION.
- [x] Baseline congelado e regressão detectada (exit 1) — provado em 03/10/2026.
- [x] Registro de exceções criado e referenciado pelo script.
- [x] `verify_evidence.py` inclui a auditoria e o resultado na tabela de evidências.
- [x] `DESIGN_SYSTEM.md` descreve o gate e o fluxo de exceções.
- [x] Teste automatizado do classificador (`src/test/designSystemAudit.test.ts` — 7 testes aprovados).

## Evidence of execution

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Baseline medido | `npm run audit:design-system` | 03/10/2026 10:00:30 | Windows 11, Node local | WARN (exit 0) | 16 regras; baseline congelado em `audit-baseline.json` |
| Gate de regressão | Injeção de `text-[9px]` + gradiente | 03/10/2026 10:01:00 | Windows 11, Node local | FAIL (exit 1) → removido → WARN (exit 0) | `micro-9` 7>6, `gradients.bg` 50>49 |
| Teste unitário do motor | `npm run test:run -- src/test/designSystemAudit.test.ts` | 03/10/2026 10:11:31 | Windows 11, Vitest 4.1.10 | PASS | 7 testes aprovados (7ms) |
| Telemetria integrada | `python scripts/verify_evidence.py --quick` | 03/10/2026 10:12:38 | Windows 11, Python 3.14.6 | PASS | Audit (0.44s) + Build (6.65s) + Vitest 46 suites 218 passed (13.81s) |

## Rollback

Remover `frontend/scripts/audit-design-system.mjs`, `audit-baseline.json` e as entradas de `package.json`. Nenhum efeito em runtime.

## Definition of Done

- [x] código + testes
- [x] sem falsos positivos em `components/ui/`
- [x] documentação atualizada
- [x] evidência com comando, resultado, timestamp, ambiente
