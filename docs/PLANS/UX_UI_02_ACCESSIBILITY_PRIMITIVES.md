# Plano UX/UI — UX_UI_02_ACCESSIBILITY_PRIMITIVES

## Objetivo
Garantir acessibilidade por construção (Accessible by Construction) no Longevidade Hub, implementando um primitive único e acessível para diálogos/modais, uma regra transversal de foco visível por teclado (`:focus-visible`) e a exigência de nomes acessíveis em todos os botões que utilizam apenas ícones.

## Problema
- Múltiplos componentes implementam overlays e modais próprios com `div` simples, sem os atributos ARIA adequados (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`).
- Ausência de focus trap: o usuário navegando via tecla `Tab` consegue vazar o foco para elementos atrás do modal aberto.
- Inexistência de retorno de foco ao elemento disparador ao fechar o diálogo.
- 38 ocorrências de `focus:outline-none` sem definição de indicador alternativo de foco.
- Botões de fechar e ações secundárias com ícones isolados carecendo de `aria-label` descritivo.

## Evidências
- Inspeção estática: apenas 4 ocorrências de `role="dialog"` e `aria-modal="true"` entre cerca de 16 componentes com caixas de diálogo e drawers.
- Componentes identificados com modais ad-hoc: `AISettingsModal`, `DoctorBriefingModal`, `ManualEntryModal`, `SyncProgressModal`, `GoogleHealthAuthModal`, `ExerciseDetailModal`, `ConfounderBalanceModal`, `InsightDrawer`, `AddHealthEventModal`.

## Escopo
- Criar o primitive `Modal.tsx` (ou `Dialog.tsx`) com os seguintes comportamentos obrigatórios:
  - `role="dialog"` e `aria-modal="true"`.
  - Título conectado via `aria-labelledby`.
  - Descrição opcional via `aria-describedby`.
  - Captura e contenção de foco (Focus Trap via hook `useFocusTrap` ou similar local).
  - Foco inicial no primeiro elemento interativo ou título.
  - Retorno automático de foco ao elemento disparador ao fechar.
  - Fechamento pela tecla `Escape`.
  - Bloqueio de rolagem do body (`overflow: hidden` no `document.body` enquanto aberto).
  - Botão de fechar com `aria-label="Fechar diálogo"` obrigatório.
- Criar primitive `Drawer.tsx` compartilhando as mesmas garantias de acessibilidade do `Modal`.
- Criar regra global no CSS (`index.css`):
  ```css
  :focus-visible {
    outline: 2px solid var(--focus-ring, #10b981);
    outline-offset: 2px;
  }
  ```
- Auditar e adicionar `aria-label` a todos os botões icon-only (ações de fechar, alternadores, botões de data e navegação).

## Fora de escopo
- Alteração do conteúdo clínico interno de cada formulário de modal.
- Introdução de bibliotecas externas pesadas que aumentem o bundle; a solução deve ser local-first e enxuta.

## Arquivos afetados
- `frontend/src/components/ui/Modal.tsx` (Novo)
- `frontend/src/components/ui/Drawer.tsx` (Novo)
- `frontend/src/hooks/useFocusTrap.ts` (Novo)
- `frontend/src/index.css`
- `frontend/src/components/ManualEntryModal.tsx`
- `frontend/src/components/DoctorBriefingModal.tsx`
- `frontend/src/components/AISettingsModal.tsx`
- `frontend/src/components/GoogleHealthAuthModal.tsx`
- `frontend/src/components/SyncProgressModal.tsx`
- `docs/PLANS/UX_UI_02_ACCESSIBILITY_PRIMITIVES.md`

## Componentes envolvidos
- `Modal`
- `Drawer`
- Todos os modais existentes em `frontend/src/components/`

## Dependências
- `UX_UI_00_BASELINE_1.9.8`
- `UX_UI_01_DESIGN_SYSTEM`

## Estratégia de implementação
1. **Hook `useFocusTrap`:**
   - Detecta os elementos focáveis dentro da ref do diálogo (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`).
   - Intercepta eventos de `Tab` e `Shift+Tab` para ciclar dentro dos limites do modal.
   - Escuta `keydown` para tecla `Escape` e aciona o callback `onClose`.
2. **Componente `Modal`:**
   - Monta um portal React (`createPortal` para `#modal-root` ou direto em `document.body`).
   - Implementa backdrop escurecido com transição suave.
3. **Migração dos Modais Existentes:**
   - Refatorar modais existentes para utilizar a casca `<Modal>` padronizada.

## Estados e comportamento
- Transição de abertura suave (`opacity-0` para `opacity-100` e leve escala).
- Nenhum elemento externo ao modal pode receber cliques ou foco enquanto o diálogo estiver ativo.

## Acessibilidade
- Conformidade estrita com WCAG 2.1 AA para Diálogos Modais (Critério 2.1.1 Teclado, 2.1.2 Sem Armadilha de Teclado, 2.4.3 Ordem do Foco, 2.4.7 Foco Visível).
- Anúncio imediato do título do diálogo por leitores de tela (NVDA/JAWS/TalkBack).

## Responsividade
- Em mobile (< 640px), modais devem se ajustar à altura da tela com `max-h-[90vh]` e rolagem interna (`overflow-y-auto`), evitando corte do botão de fechamento ou dos botões de ação na base.
- Margens laterais seguras (`p-4 sm:p-6`).

## Testes
- Teste unitário do `Modal` validando:
  - Foco inicial;
  - Focus trap ao pressionar `Tab`;
  - Fechamento com `Escape`;
  - Retorno de foco;
  - Presença dos atributos `role="dialog"` e `aria-modal="true"`.
- Teste E2E Playwright navegando exclusivamente via teclado em diálogos críticos.

## Critérios de aceite
- [ ] Primitives `Modal` e `Drawer` implementados e testados.
- [ ] Regra transversal de `:focus-visible` ativa globalmente sem remoção de outline sem substituto.
- [ ] 100% dos modais migrados para o primitive com `role="dialog"` e `aria-modal="true"`.
- [ ] Todos os botões icon-only contêm `aria-label` descritivo.

## Riscos
- Risco de conflito de z-index entre overlays de gráficos (Recharts) e o backdrop do modal.
- Mitigação: padronizar o z-index do modal em `z-50` montado no topo do DOM via Portal.

## Rollback
- Reversão controlada dos arquivos de primitive e restauração dos modais anteriores via Git.

## Checklist de conclusão
- [ ] Criar `useFocusTrap.ts`
- [ ] Criar `Modal.tsx` e `Drawer.tsx`
- [ ] Adicionar regras de `:focus-visible` no `index.css`
- [ ] Migrar modais principais
- [ ] Validar testes unitários e E2E
