# UX_UI_55 — Header & Navigation Second Pass 2.2.x

## Metadata

- **Priority:** P1 (Fase 3 — Features Críticas)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_48, UX_UI_50
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§7 U22-P1-05, §38 UX_UI_55)
- **Affected files:**
  - `frontend/src/components/Header.tsx`
  - `frontend/src/components/HeaderUtilityActions.tsx`
  - `frontend/src/components/Header.test.tsx`
  - `docs/PLANS/UX_UI_55_HEADER_AND_NAVIGATION_SECOND_PASS_2.2.0.md`

---

## 1. Problem

1. **Ambiguidade na Navegação Primária vs Subrotas Ativas (U22-P1-05):**
   - Anteriormente, ao clicar na aba primária "Saúde" ou "Intervenções", se uma subrota já estivesse selecionada (ex.: "Sono" ou "N-of-1 Tests"), o manipulador de clique mantinha a subrota ativa em vez de conduzir o usuário à landing canônica da área. Isso causava desorientação quando o usuário clicava em "Saúde" esperando a visão inicial de Exames & PhenoAge.
2. **Tokens de Raio Desalinhados no Header e Utility Actions:**
   - Classes legadas como `rounded-2xl`, `rounded-xl` e `rounded-lg` estavam dispersas na barra de navegação, container do grupo de sincronização e botões de ação utilitária.
3. **Acessibilidade de Ícones e Leitores de Tela:**
   - Ícones decorativos nas abas e botões utilitários careciam de `aria-hidden="true"`, o que poluía a árvore de acessibilidade para tecnologias assistivas.
4. **Resiliência em Dispositivos Móveis:**
   - Gradientes de rolagem e overflow da subnavegação precisavam de conformidade com os tokens de raio do sistema sem gerar overflow indesejado.

---

## 2. Evidence

- `Header.tsx`:
  - `const target = item.id === 'health' ? (primaryTab === 'health' ? activeTab : 'labs') : ...` perpetuava a subview em vez de executar o reset canônico explícito.
- O auditor de design system acusava tokens de raio não padronizados em botões utilitários de `HeaderUtilityActions.tsx`.
- Ausência de testes focados nas regras de landing canônica da barra de navegação.

---

## 3. User impact

- Previsibilidade total de navegação: clicar em uma área de primeiro nível sempre direciona para sua landing canônica (Saúde → Exames, Intervenções → Suplementos, Perfil → Meu Perfil, Hoje → Visão Geral, Treinos → Treinos, IA → Copiloto).
- Acesso contínuo e contextual às subrotas específicas via barra de subnavegação horizontal otimizada para toque móvel.
- Leitura assistiva limpa sem ruído sonoro de SVGs decorativos.

---

## 4. Scope

- Refatorar a lógica de seleção de rotas em `Header.tsx` para direcionar categoricamente para `item.targetTab`.
- Alinhar todos os raios de borda para os tokens do Design System (`rounded-radius-xl`, `rounded-radius-lg`, `rounded-radius-md`, `rounded-radius-full`).
- Adicionar `aria-hidden="true"` a todos os ícones decorativos da navegação primária, subnavegação e ações utilitárias.
- Atualizar a suíte `Header.test.tsx` com 11 testes rigorosos cobrindo landing canônica, renderização condicional de subnavs e acessibilidade.

---

## 5. Non-goals

- Alterar a lista de abas primárias existentes ou a hierarquia conceitual da aplicação.
- Modificar o fluxo de autenticação ou roteador externo (a aplicação usa chaveamento de abas no topo).

---

## 6. Architecture & System Design

- **Regra Canônica de Landing (U22-P1-05):**
  - O clique no item primário da navbar sempre navega para a landing canônica da área (`targetTab`).
  - A troca entre contextos secundários da mesma área (ex.: Exames → Sono → Linha do Tempo) é delegada exclusivamente à barra de subnavegação.
- **Mapeamento de Rotas Canônicas:**
  - `today` → `'overview'`
  - `health` → `'labs'`
  - `workouts` → `'workouts'`
  - `interventions` → `'supplements'`
  - `ai` → `'ai'`
  - `profile` → `'profile'`
- **Semântica ARIA:**
  - `aria-current="page"` aplicado estritamente à aba primária ativa.
  - `aria-label="Navegação Principal"`, `aria-label="Sub-navegação de Saúde"`, `aria-label="Sub-navegação de Intervenções"`, `aria-label="Sub-navegação de Perfil"`.

---

## 7. Migration & Compatibility

- Total compatibilidade com o estado persistente do usuário e callbacks legados (`onSelectTab` ou `setActiveTab`).
- Redução direta de classes de raio legadas no auditor.

---

## 8. Rollback plan

- Reverter commits direcionados a `frontend/src/components/Header.tsx` e `frontend/src/components/HeaderUtilityActions.tsx`.

---

## 9. Assumptions & Constraints

- A navegação primária permanece composta por 6 áreas para garantir alinhamento no grid de 2 a 6 colunas.
- A barra de subnavegação utiliza `useScrollActiveIntoView` para manter o item selecionado visível em viewports estreitas.

---

## 10. Security considerations

- Nenhuma superfície de ataque exposta. Apenas manipulação de estado local de visualização da UI.

---

## 11. Performance & Scalability

- Renderização memoizada com transições CSS nativas sem recálculos pesados de layout.

---

## 12. Testing strategy

- Testes no Vitest (`Header.test.tsx`):
  1. Renderização de branding e 6 abas primárias.
  2. Validação da regra canônica: clique em cada aba primária despacha sua respectiva rota canônica.
  3. Suporte a callbacks `setActiveTab` e `onSelectTab`.
  4. Renderização e cliques na subnavegação de Saúde (`labs`, `sleep`, `timeline`, `physical-assessments`).
  5. Renderização e cliques na subnavegação de Intervenções (`supplements`, `n-of-1`).
  6. Renderização e cliques na subnavegação de Perfil (`profile`, `integrations`, `system`).
  7. Conformidade do atributo `aria-current="page"` na aba selecionada.
  8. Ações utilitárias (Sync Zepp, alternador de tema, labels acessíveis).

---

## 13. Documentation impact

- Atualização deste plano mestre em `docs/PLANS/UX_UI_55_HEADER_AND_NAVIGATION_SECOND_PASS_2.2.0.md`.

---

## 14. Implementation checklist

- [x] Atualizar mapeamento de clique em `Header.tsx` para `item.targetTab` canônico (U22-P1-05).
- [x] Padronizar tokens de raio (`rounded-radius-*`) no `Header.tsx` e `HeaderUtilityActions.tsx`.
- [x] Adicionar `aria-hidden="true"` aos ícones decorativos.
- [x] Atualizar e expandir `frontend/src/components/Header.test.tsx` para 11 testes unitários.
- [x] Validar suite Vitest, TypeScript check e auditoria de Design System.

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| Clique na aba primária sempre conduz à rota canônica da área | Aprovado | `Header.test.tsx` ("navigates to canonical landing routes...") |
| Subnavegações de Saúde, Intervenções e Perfil funcionam perfeitamente | Aprovado | `Header.test.tsx` (testes específicos de subnav) |
| Acessibilidade: `aria-current="page"` e `aria-hidden` em SVGs | Aprovado | `Header.test.tsx` e código inspecionado |
| Design System: raios tokenizados e zero novos avisos | Aprovado | `npm run audit:design-system` (-30 non-token radius) |

---

## 16. Technical debt & Code smells resolved

- Resolvido `U22-P1-05` (Canonical landing route) e reduções de dívida técnica de radius não padronizado em navegação.

---

## 17. Operational runbook

- Não requer migrações de backend ou banco de dados.

---

## 18. Audit log & Decision history

- **Decisão:** Optou-se pela recomendação canônica explícita: o clique no tab principal sempre restaura a landing da área (ex: Saúde → Exames), reservando a transição entre subviews à barra de subnavegação, evitando estados residuais confusos para o usuário.

---

## 19. Open questions & Future work

- Integração posterior com histórico de navegação por teclado e atalhos globais (Fase 4).

---

## 20. Approvals & Sign-off

- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §7 U22-P1-05, §38 UX_UI_55)
- **Accessibility Lead:** Aprovado (Rotulagem ARIA semântica e sem ruído de SVGs)
- **Status:** CONCLUÍDO
