# UX_UI_52 — Compliance State Semantics 2.2.x

## Metadata

- **Priority:** P0/P1 (Fase 2 — Acessibilidade e Dados)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_50, UX_UI_51
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§4 U22-P0-05, §11 U22-P1-17..18, §14 U22-P1-33, §38 UX_UI_52)
- **Affected files:**
  - `frontend/src/components/DailyComplianceWidget.tsx`
  - `frontend/src/components/DailyComplianceWidget.test.tsx`
  - `docs/DESIGN_SYSTEM_EXCEPTIONS.md`
  - `docs/PLANS/UX_UI_52_COMPLIANCE_STATE_SEMANTICS_2.2.0.md`

---

## 1. Problem

1. **Compliance sem registro virando 0% (U22-P0-05, U22-P1-18):**
   - Ao consultar o histórico de conformidade (`/api/compliance/history`), quando a data selecionada não possuía registro registrado, o widget inicializava todos os quatro pilares com `false`.
   - Em seguida, o score multiplicava os booleanos verdadeiros por 25, resultando em `0%`.
   - Essa conversão silenciosa de ausência de dados em inadimplência (`0%`) induzia o usuário e o profissional de saúde a crer que o protocolo havia falhado totalmente no dia, violando o princípio fundamental de `no_data` vs `zero`.
2. **Interações em elementos não semânticos (U22-P1-17, U22-P1-33):**
   - Os quatro pilares de disciplina eram representados por `<div onClick={...}>`.
   - Não forneciam semântica nativa de botão ou switch, não eram acessíveis via Tab/Enter/Space, não possuíam `role="switch"`, `aria-checked` ou anéis de foco visíveis, sendo invisíveis para tecnologias assistivas.
3. **Ausência de estado de pendência/salvamento concorrente:**
   - Clicar rapidamente em vários pilares causava requisições concorrentes sem desabilitar o botão durante a persistência, podendo causar race conditions no backend.

---

## 2. Evidence

- `DailyComplianceWidget.tsx`:
  - `const [compliance, setCompliance] = useState({ sleep_schedule_ok: false, ... })`
  - Caso `!found`, mantinha todos os pilares como `false` e calculava `scorePct = 0%`.
  - As tags dos pilares eram `<div onClick={() => handleTogglePillar(...)} className="...">`.
  - O score exibia estaticamente `<span className="text-2xl font-black">{scorePct}%</span>`.

---

## 3. User impact

- Eliminação do falso alarme de "0% de Conformidade" para dias em que o usuário simplesmente ainda não fez o registro diário (ex.: manhã do dia corrente ou dias anteriores não preenchidos).
- Total acessibilidade por teclado e leitores de tela: os controles de conformidade agora são identificados como interruptores acessíveis (`role="switch"` com `aria-checked`), permitindo navegação via Tab e alternância com Barra de Espaço ou Enter.
- Proteção contra cliques duplicados com desabilitação temporária durante a persistência assíncrona.

---

## 4. Scope

- Modelar o ciclo de vida de conformidade: `type ComplianceStatus = 'loading' | 'no_record' | 'recorded' | 'error'`.
- Quando `status === 'no_record'`, renderizar rótulo neutro `"Sem registro"` em vez de `"0%"`.
- Migrar os quatro pilares de `div` para `<button type="button" role="switch" aria-checked={...}>`.
- Implementar anéis de foco canônicos `focus-visible:ring-2 focus-visible:ring-indigo-500` e estados de desabilitação durante gravação.
- Registrar exceção `DSX-017` em `docs/DESIGN_SYSTEM_EXCEPTIONS.md`.
- Criar suíte abrangente em `frontend/src/components/DailyComplianceWidget.test.tsx`.

---

## 5. Non-goals

- Alterar o endpoint backend de gravação `/api/compliance` (que já aceita e persiste adequadamente o modelo).
- Criar lógica de preenchimento preditivo por inteligência artificial (escopo reservado à Fase 4).

---

## 6. Architecture & System Design

- **State Machine:**
  - `loading`: Requisição de histórico em andamento. Mostra indicador de carregamento ("Carregando...").
  - `no_record`: Nenhum item na data de referência selecionada. Mostra "Sem registro". Pilares iniciam desmarcados.
  - `recorded`: Registro confirmado para a data. Mostra `{scorePct}%`.
  - `error`: Falha ao buscar ou gravar. Exibe alerta com mensagem amigável e botão acessível.
- **Interação:**
  - O clique em qualquer interruptor altera otimisticamente o pilar, move o status para `recorded`, bloqueia novos cliques (`isSaving = true`), envia o payload JSON para `/api/compliance` e reverte em caso de erro de rede.

---

## 7. Migration & Compatibility

- 100% retrocompatível com a API existente.
- Nenhum esquema de banco de dados ou router alterado.
- Os tokens de raio foram alinhados para `rounded-radius-xl` e `rounded-radius-lg`.

---

## 8. Rollback plan

- Reverter o commit específico de `DailyComplianceWidget.tsx`, `DailyComplianceWidget.test.tsx` e `docs/DESIGN_SYSTEM_EXCEPTIONS.md`.

---

## 9. Assumptions & Constraints

- O endpoint `/api/compliance/history` retorna lista ordenada dos últimos 14 dias. A presença de um item com `date_ref === selectedDate` define a existência de registro.
- A ausência de item não significa falha, mas ausência de entrada do usuário.

---

## 10. Security considerations

- Sanitização e validação de `selectedDate` e dos quatro booleanos garantem integridade dos dados enviados ao backend.
- Erros de API capturados com mensagens tratadas sem vazamento de stacktraces.

---

## 11. Performance & Scalability

- Zero re-renderizações desnecessárias. O estado de salvamento `isSaving` evita race conditions de rede e degradação de I/O no banco SQLite.

---

## 12. Testing strategy

- Testes de renderização com Mock de API no Vitest:
  1. Data sem registro retorna "Sem registro" e NÃO exibe "0%".
  2. Data com registro retorna pontuação calculada (ex.: "75%").
  3. Data com registro explicitamente zerado exibe "0%".
  4. Toggle via clique atualiza score e chama POST `/api/compliance`.
  5. Acionamento por teclado (Space/Enter) no botão com `role="switch"`.
  6. Exibição de alerta em caso de falha de requisição.

---

## 13. Documentation impact

- Atualização do registro de exceções do design system `docs/DESIGN_SYSTEM_EXCEPTIONS.md` com a entrada `DSX-017`.
- Registro deste plano em `docs/PLANS/UX_UI_52_COMPLIANCE_STATE_SEMANTICS_2.2.0.md`.

---

## 14. Implementation checklist

- [x] Inspecionar `DailyComplianceWidget.tsx` e mapear divergências de estado e acessibilidade.
- [x] Modelar status `'loading' | 'no_record' | 'recorded' | 'error'`.
- [x] Substituir exibição incondicional de porcentagem por `"Sem registro"` quando não houver registro.
- [x] Migrar 4 `div` para botões nativos acessíveis com `role="switch"`, `aria-checked` e foco visível.
- [x] Adicionar bloqueio de concorrência com `isSaving`.
- [x] Registrar exceção `DSX-017` em `docs/DESIGN_SYSTEM_EXCEPTIONS.md`.
- [x] Criar `frontend/src/components/DailyComplianceWidget.test.tsx` com 6 testes aprovados.
- [x] Validar suite Vitest e scanner de Design System.

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| Ausência de registro na data exibe "Sem registro" | Aprovado | `DailyComplianceWidget.test.tsx` (teste 1) |
| Ausência de registro NÃO exibe "0%" | Aprovado | `DailyComplianceWidget.test.tsx` (teste 1) |
| Registro existente calcula score corretamente | Aprovado | `DailyComplianceWidget.test.tsx` (teste 2 e 3) |
| Pilares operam como `<button type="button" role="switch">` | Aprovado | Testes 1, 2, 4 e 5 |
| Foco acessível e acionamento por teclado (Space) | Aprovado | `DailyComplianceWidget.test.tsx` (teste 5) |
| Scanner do Design System sem violações (Zero FAIL) | Aprovado | `npm run audit:design-system` |

---

## 16. Technical debt & Code smells resolved

- Eliminada a violação de acessibilidade `U22-P1-17` (`div onClick`).
- Eliminado o bug semântico de dados `U22-P0-05` (ausência de registro mascarada como 0%).
- Eliminados raios não canônicos (`rounded-2xl` substituído por `rounded-radius-xl` e `rounded-radius-lg`).

---

## 17. Operational runbook

- Não requer migração de schema nem intervenção manual no servidor.

---

## 18. Audit log & Decision history

- **Decisão:** Optou-se por `role="switch"` sobre `<input type="checkbox">` para manter os cards táteis ricos com ícones Lucide estilizados e semântica padrão WAI-ARIA para toggles imediatos.

---

## 19. Open questions & Future work

- Na Fase 4, explorar histórico visual semanal integrado ao widget de compliance.

---

## 20. Approvals & Sign-off

- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §4, §11, §38)
- **Acessibilidade:** Aprovado (Em conformidade com WCAG 2.1 AA)
- **Status:** CONCLUÍDO
