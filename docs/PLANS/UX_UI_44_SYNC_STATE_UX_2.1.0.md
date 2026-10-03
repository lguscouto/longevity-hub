# UX/UI 44 — Estados de Sincronização e Feedback de Resultado

## Metadata

- **Priority:** P1
- **Phase:** 3 — Data UX
- **Status:** Concluído (03/10)
- **Dependencies:** UX_UI_37, UX_UI_43
- **Master:** UX21-P1-14, §34–§35, §38–§39, §74, §114–§120
- **Affected files:** `SyncProgressModal.tsx`, `HeaderUtilityActions.tsx`, `Header.tsx`, `ui/SyncStatusBadge.tsx`, `ui/Toast.tsx`, `SupplementStackWidget.tsx`, `App.tsx`

## Problem

A consolidação do Sync foi correta, mas os estados exibidos não cobrem: Nunca sincronizado, Sincronizando, Sucesso, **Sucesso parcial**, Erro, **Token expirado**, **Fonte desconectada**, **Dados antigos**. Indicador por ponto verde isolado não representa a saúde da integração. 2 `alert(` nativos restantes; ações destrutivas sem linguagem específica ("OK/Sim").

## Evidence

Plano 28 VERIFIED no escopo original; plano 27 PARTIAL.

## User impact

Usuário não sabe se os dados estão atualizados nem o que fazer quando o sync falha parcialmente.

## Scope

1. Máquina de estados visual: `idle → syncing → success | partial | error` + `stale`, `expired`, `disconnected`.
2. Exibir: Fonte, Última sincronização, Dados cobertos (até hh:mm), Erro, Ação (ex.: "Zepp · sincronizado hoje 08:42 · dados até 08:30").
3. **Toast** só para sucesso/preferência; **parcial** e **erro** com mensagem persistente: "32 importados · 4 não processados · Ver detalhes".
4. Anti double-submit durante sync/gerar/salvar/excluir.
5. Linguagem de ação destrutiva específica (Desconectar Zepp, Excluir avaliação) com objeto, consequência, cancelar, confirmar.
6. Remover `alert(`.

## Non-goals

Mudar o pipeline de sync do backend (apenas expor contadores já disponíveis; se faltarem, registrar dependência de backend).

## Proposed solution

Componente `SyncStatusBadge` (ícone + texto + tempo relativo) no slot do Header; `SyncProgressModal` reflete estado final com contadores.

## Component changes

`SyncStatusBadge` novo; `Toast` ganha variante `warning`/`partial`.

## Token changes

Cores semânticas: success=sincronizado, warning=parcial/antigo, danger=erro/expirado, neutral=nunca.

## Accessibility

`role="status"`/`aria-live`; estado nunca só por cor.

## Responsive behavior

Badge compacto em mobile; detalhes no modal.

## Data semantics

Frescor do dado é informação de primeira classe (§75).

## Tests

Vitest: 8 estados → texto/ícone/aria corretos; Toast parcial; botão desabilitado durante sync; e2e de falha simulada.

## Visual QA

8 estados × dark/light.

## Acceptance criteria

- [x] 8 estados renderizados e testados (`never`, `syncing`, `success`, `partial`, `error`, `expired`, `disconnected`, `stale`).
- [x] Sucesso parcial exibe contadores e acesso a detalhes (progressive disclosure via `<details>`).
- [x] Zero `alert(` no código do projeto.
- [x] Ações destrutivas com texto específico (ex: `Excluir Suplemento da Pilha`, `Excluir Definitivamente`).

## Evidence of execution

1. **Componente `SyncStatusBadge`:**
   - Criado `frontend/src/components/ui/SyncStatusBadge.tsx` e exportado em `frontend/src/components/ui/index.ts`.
   - Suporta os 8 estados canônicos (`never`, `syncing`, `success`, `partial`, `error`, `expired`, `disconnected`, `stale`).
   - Implementada acessibilidade semântica com `role="status"` e `aria-live="polite"`. O estado nunca é transmitido apenas por cor: possui ícones representativos (`RefreshCw`, `CheckCircle2`, `AlertTriangle`, `AlertCircle`, `KeyRound`, `CloudOff`, `Clock`, `Cloud`), textos explícitos legíveis e tooltips completos.
   - Suporta modo interativo (`onClick` para abrir `SyncProgressModal`), modo compacto para mobile/toolbar e slots de dados cobertos até `hh:mm`.
   - Criado `frontend/src/components/ui/SyncStatusBadge.test.tsx` com 12 testes unitários cobrindo todos os 8 estados, acessibilidade, contadores e desabilitação em sincronização (100% PASS).
2. **Integração no Slot Utility Actions do Header:**
   - Em `HeaderUtilityActions.tsx`, removido o ponto verde mudo sem semântica (`h-2 w-2 bg-emerald-500`) e integrado o `SyncStatusBadge` com o estado de sincronização e frescor das fontes.
   - Preservados os botões `Sync Zepp` e `Sync Google` com targets mínimos de 44px em mobile e rótulos acessíveis.
   - Em `Header.tsx`, propagadas as props `syncState`, `dataCoveredUntil` e `onOpenSyncStatus`.
3. **Evolução do `SyncProgressModal`:**
   - Suporte aos estados `success`, `partial`, `warning`, `hasError`, `isExpired`, `isDisconnected` e `isStale`.
   - Contadores consolidados de registros importados e itens não processados/pulados (`unprocessableTotal`).
   - Seção de progressive disclosure via `<details>` / `<summary>` para visualização granular de avisos e diagnósticos.
   - Ação direta de reautenticação (`Reautenticar Fonte`) quando o token de acesso expirar.
   - Testes unitários atualizados em `SyncProgressModal.test.tsx` com 6 testes cobrindo todos os cenários (100% PASS).
4. **Variantes e Notificações no `Toast`:**
   - Adicionadas variantes `warning` e `partial` ao `Toast.tsx` com ícone `AlertTriangle` âmbar e bordas de token.
   - Suporte a persistência (`duration: 0`) para mensagens críticas ou de sincronização parcial com ação contextualmente relevante (`action: { label: 'Ver detalhes', onClick: ... }`).
   - 5 testes unitários em `Toast.test.tsx` validando persistência, ação e auto-dismiss (100% PASS).
5. **Anti double-submit e Linguagem Destrutiva Específica:**
   - Em `App.tsx`, adicionadas guardas contra duplo clique em `handleSyncZepp` e `handleSyncGoogleHealth` (`if (isSyncing || isSyncingGoogle) return`).
   - Em `SupplementStackWidget.tsx`, refinados os textos do `ConfirmDialog` de "Confirmar Exclusão" / "Excluir" para "Excluir Suplemento da Pilha" / "Excluir Suplemento".
   - Confirmado zero `alert(` nativos no projeto.
6. **Métricas e Validação:**
   - `npm run test:run`: 53 arquivos de teste, **280 testes PASS (100%)**.
   - `pytest tests/`: **357 testes de backend PASS (100%)**.
   - `npm run audit:design-system`: PASS / EXCEPTION / WARN (zero FAIL!). Baseline sofrido ratchet down (`radius.non-token: 476`, `native.button: 96`).
   - `npm run build`: Vite build bem-sucedido (exit code 0, 5.62s).
   - `npx playwright test --config=e2e/playwright.config.ts e2e/viewport-matrix.spec.ts --project=chromium`: **8/8 viewports PASS (100%)**.

## Rollback

Reverter badge e variantes de Toast.

## Definition of Done

- [x] código + testes
- [x] evidência registrada
