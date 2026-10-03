# UX_UI_53 — ResponsiveDataTable Interaction Semantics 2.2.x

## Metadata

- **Priority:** P1 (Fase 2 — Acessibilidade e Dados)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_50
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§13 U22-P1-31..32, §38 UX_UI_53)
- **Affected files:**
  - `frontend/src/components/ui/ResponsiveDataTable.tsx`
  - `frontend/src/components/ui/ResponsiveDataTable.test.tsx`
  - `docs/PLANS/UX_UI_53_RESPONSIVE_DATA_TABLE_INTERACTION_SEMANTICS_2.2.0.md`

---

## 1. Problem

1. **Linhas interativas da tabela desktop sem semântica e sem teclado (U22-P1-31):**
   - Na renderização para desktop (`DesktopTable`), quando `onRowClick` era fornecido, a linha `<tr>` recebia apenas `onClick` e a classe CSS `cursor-pointer`.
   - Faltava semântica acessível (`role="button"`, `tabIndex={0}`, `aria-label`), impedindo que o usuário de teclado focasse na linha via Tab e a acionasse com Enter ou Espaço.
2. **Cabeçalho clicável do card mobile em elemento genérico (`div`) (U22-P1-31):**
   - Na visualização mobile (`RowCards`), quando `onRowClick` estava ativo, o topo do card era renderizado como `<div onClick={...}>` com ícone chevron.
   - Trata-se de uma violação da regra de native controls e acessibilidade: usuários de teclado e leitores de tela em dispositivos móveis ou navegadores com toque/teclado não encontravam um elemento interativo padrão.
3. **Isolamento de ações internas de células:**
   - Células com `col.priority === 'action'` ou botões internos precisavam de garantia contínua de `e.stopPropagation()` para não disparar a ação da linha ao acionar botões filhos.

---

## 2. Evidence

- `ResponsiveDataTable.tsx`:
  - `DesktopTable`: `<tr onClick={onRowClick ? () => onRowClick(row) : undefined} className="...">`
  - `RowCards`: `<div className={`flex items-start justify-between gap-2 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={onRowClick ? () => onRowClick(row) : undefined}>`
  - Linhas e cards eram inalcançáveis pelo teclado através da tecla Tab.

---

## 3. User impact

- Pessoas que navegam por teclado (mobilidade reduzida, usuários avançados) agora conseguem percorrer as linhas de tabelas auditáveis (como histórico de treinos, exames laboratoriais e telemetria de sono) com a tecla Tab e acioná-las com Enter ou Espaço com feedback visual de foco nítido (`focus-visible:ring-emerald-500`).
- Usuários de leitores de tela recebem o papel explícito de botão (`role="button"`) com o nome acessível correspondente à linha (`aria-label={getRowLabel(row)}`).
- No mobile, o cabeçalho do card é um botão real acessível nativo, facilitando navegação por gestos de acessibilidade (TalkBack / VoiceOver).

---

## 4. Scope

- Atualizar `DesktopTable` em `frontend/src/components/ui/ResponsiveDataTable.tsx`:
  - Receber `getRowLabel`.
  - Injetar `role="button"`, `tabIndex={0}`, `aria-label` e `onKeyDown` (tratando Enter e Space) quando `onRowClick` estiver presente.
  - Adicionar anel de foco visível interno (`focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500`).
  - Preservar semântica padrão de `<tr>` puro quando `onRowClick` for omitido.
- Atualizar `RowCards`:
  - Substituir o container de cabeçalho por `<button type="button">` acessível quando `onRowClick` estiver presente.
  - Renderizar `div` estático simples quando `onRowClick` estiver ausente.
- Expandir testes em `frontend/src/components/ui/ResponsiveDataTable.test.tsx` cobrindo ativação por teclado, acessibilidade móvel e omissão de propriedades interativas.

---

## 5. Non-goals

- Alterar a estratégia de layout responsivo (que já alterna inteligentemente entre `<table>` desktop e `RowCards` mobile sem duplicação de DOM).
- Eliminar o overflow horizontal intencional em desktops com telas reduzidas (conforme aprovado em U22-P1-32, o overflow é legítimo e possui affordance e foco via tabIndex no container).

---

## 6. Architecture & System Design

- **Desktop (`DesktopTable`):**
  - Quando a linha é clicável, a `<tr>` opera como um controle semântico acessível (`role="button"`, `tabIndex={0}`). O listener `onKeyDown` captura Enter e Espaço (com `e.preventDefault()` para evitar scroll acidental na página).
- **Mobile (`RowCards`):**
  - O cabeçalho identificador é encapsulado em `<button type="button">` com margem compensada (`p-1 -m-1`), raio `rounded-radius-sm` e anel de foco verde esmeralda canônico.
- **Interferência de Ações:**
  - Células marcadas com `col.priority === 'action'` interceptam eventos com `e.stopPropagation()`, garantindo que botões de ação na linha (ex.: deletar, editar, abrir laudo) não acionem o clique da linha.

---

## 7. Migration & Compatibility

- 100% retrocompatível. Componentes que usam `ResponsiveDataTable` (ex.: tabelas de exames, histórico de sessões) continuam consumindo a mesma interface sem breaking changes.

---

## 8. Rollback plan

- Reverter o commit específico de `frontend/src/components/ui/ResponsiveDataTable.tsx` e `frontend/src/components/ui/ResponsiveDataTable.test.tsx`.

---

## 9. Assumptions & Constraints

- `ResponsiveDataTable.tsx` localiza-se dentro do diretório `components/ui/`, sendo isento da restrição de controles nativos pelo scanner do Design System (`skipUi: true`).
- Apenas linhas com `onRowClick` recebem propriedades interativas. Linhas normais permanecem semânticas como linhas de tabela padrão.

---

## 10. Security considerations

- Sem impactos de segurança ou injeção. Eventos de teclado sanitizados e interceptados de maneira controlada.

---

## 11. Performance & Scalability

- Zero overhead adicional de renderização. Manipuladores de teclado inline leves sem dependências externas.

---

## 12. Testing strategy

- Testes no Vitest com `@testing-library/react` e `@testing-library/user-event`:
  1. Suporte à navegação por teclado na linha desktop: `user.keyboard('{Enter}')` e `user.keyboard(' ')` disparam `onRowClick` com o registro correto.
  2. Ausência de `role="button"` e `tabIndex` quando `onRowClick` é omitido.
  3. Renderização de botão nativo (`<button>`) no cabeçalho do card mobile quando `onRowClick` é fornecido.
  4. Isolamento de clique ao acionar botões de células de ação.

---

## 13. Documentation impact

- Registro deste plano em `docs/PLANS/UX_UI_53_RESPONSIVE_DATA_TABLE_INTERACTION_SEMANTICS_2.2.0.md`.

---

## 14. Implementation checklist

- [x] Inspecionar `ResponsiveDataTable.tsx` e mapear interações de linha desktop e card mobile.
- [x] Adicionar `role="button"`, `tabIndex={0}`, `aria-label`, foco visível e handler de teclado (Enter/Space) na `<tr>` de `DesktopTable`.
- [x] Migrar o cabeçalho interativo de `RowCards` para `<button type="button">`.
- [x] Manter estrutura não interativa limpa quando `onRowClick` for nulo/indefinido.
- [x] Adicionar testes unitários em `ResponsiveDataTable.test.tsx` (7 testes aprovados).
- [x] Validar conformidade de build, typecheck e design system.

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| Linha com `onRowClick` possui `role="button"` e `tabIndex="0"` | Aprovado | `ResponsiveDataTable.test.tsx` (teste 5) |
| Linha é acionada por Enter e Space via teclado | Aprovado | `ResponsiveDataTable.test.tsx` (teste 5) |
| Linha sem `onRowClick` não recebe atributos de botão | Aprovado | `ResponsiveDataTable.test.tsx` (teste 6) |
| Card mobile com `onRowClick` possui `<button>` acessível no topo | Aprovado | `ResponsiveDataTable.test.tsx` (teste 7) |
| Ações internas isolam clique com `stopPropagation` | Aprovado | `ResponsiveDataTable.test.tsx` (teste 3) |

---

## 16. Technical debt & Code smells resolved

- Eliminada a violação `U22-P1-31` (falta de semântica interativa e teclado em linhas clicáveis e cards móveis).

---

## 17. Operational runbook

- Nenhuma intervenção de infraestrutura necessária.

---

## 18. Audit log & Decision history

- **Decisão:** Manteve-se o `overflow-x-auto` no container desktop por ser justificado em tabelas de auditoria densas (U22-P1-32), reforçando a semântica acessível em cada elemento filho.

---

## 19. Open questions & Future work

- Na Fase 3, verificar integração de `ResponsiveDataTable` na listagem de painéis laboratoriais.

---

## 20. Approvals & Sign-off

- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §13, §38)
- **Acessibilidade:** Aprovado (WCAG 2.1 AA — 2.1.1 Keyboard, 4.1.2 Name, Role, Value)
- **Status:** CONCLUÍDO
