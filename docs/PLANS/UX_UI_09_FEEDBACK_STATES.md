# Plano UX/UI — UX_UI_09_FEEDBACK_STATES

## Objetivo
Unificar os padrões de feedback visual e de estado em todo o Longevidade Hub, implementando primitives consistentes para carregamento (`Loading`), tratamento de erros e confirmações (`ErrorState`, `InlineError`, `ConfirmDialog`) e estados vazios informativos (`EmptyState`), eliminando diálogos nativos bloqueantes (`window.confirm()`, `window.alert()`).

## Problema
- Estados de loading são representados de maneiras heterogêneas: ora textos estáticos ("Carregando...", "Processando...", "Salvando...", "Reconciliando..."), ora spinners `animate-spin` soltos, ora skeletons `animate-pulse`.
- Uso de `window.confirm()` nativo do navegador em fluxos de exclusão ou confirmação de IA (ex: em `AICopilotView.tsx` e `SupplementsView.tsx`), que bloqueia a thread do navegador e quebra a consistência do design system.
- Padrões divergentes para exibição de erros (algumas telas usam banners vermelhos, outras pequenos textos vermelhos sem ação de retry, e outras modais).
- Estados vazios frequentemente são apenas mensagens simplórias ("Sem dados") sem orientar o usuário sobre o motivo da ausência de dados (período sem registros? fonte não sincronizada? falha técnica?) e qual a ação para resolver.

## Evidências
- 37 ocorrências de `animate-spin` e 12 de `animate-pulse` distribuídas de forma ad-hoc.
- Uso explícito de `window.confirm` e `window.alert` em múltiplos componentes.
- Auditoria de UX/UI v1.9.8: itens `UX-P1-15`, `UX-P1-16` e `UX-P2-05`.

## Escopo
- **Primitives de Carregamento (`frontend/src/components/ui/loading/`):**
  - `LoadingInline`: Spinner compacto e texto alinhado para pequenas seções e badges.
  - `LoadingButton`: Estado de carregamento integrado ao primitive `Button` que desabilita cliques mantendo o tamanho original.
  - `LoadingPanel` / `SkeletonCard`: Skeletons estruturados que antecipam a forma dos dados a serem carregados.
- **Primitives de Erro e Confirmação (`frontend/src/components/ui/feedback/`):**
  - `InlineError`: Mensagem contextual com ícone de alerta e botão de ação ("Tentar novamente").
  - `ErrorState`: Bloco de página inteira ou card para falhas estruturais, exibindo causa clara e caminho de recuperação.
  - `ConfirmDialog`: Diálogo modal acessível construído sobre o primitive `Modal` para substituição de `window.confirm()` (ex: exclusão de exames, confirmação de envio para IA externa).
- **Primitive de Estado Vazio (`frontend/src/components/ui/EmptyState.tsx`):**
  - Ícone ilustrativo temático.
  - Título objetivo ("Nenhum exame cadastrado", "Sem registros de sono para o período").
  - Descrição explicativa respondendo o motivo da ausência.
  - Ação opcional sugerida (ex: botão "Adicionar Registro", "Sincronizar Zepp", "Alterar Período").

## Fora de escopo
- Alterações nos códigos de erro HTTP retornados pelo backend FastAPI.
- Notificações push do sistema operacional.

## Arquivos afetados
- `frontend/src/components/ui/EmptyState.tsx` (Novo)
- `frontend/src/components/ui/ConfirmDialog.tsx` (Novo)
- `frontend/src/components/ui/LoadingIndicator.tsx` (Novo)
- `frontend/src/components/AICopilotView.tsx`
- `frontend/src/components/SupplementsView.tsx`
- `frontend/src/components/LabResultsTable.tsx`
- `frontend/src/App.tsx`
- `docs/PLANS/UX_UI_09_FEEDBACK_STATES.md`

## Componentes envolvidos
- `EmptyState`
- `ConfirmDialog`
- `LoadingIndicator`
- Todos os módulos de visualização de dados

## Dependências
- `UX_UI_01_DESIGN_SYSTEM`
- `UX_UI_02_ACCESSIBILITY_PRIMITIVES`

## Estratégia de implementação
1. **Construção do `ConfirmDialog`:**
   - Montado com foco inicial no botão "Cancelar" (prevenção de ação destrutiva acidental).
   - Botão de confirmação destrutivo com estilo semântico vermelho (`bg-rose-600 text-white`).
2. **Substituição de `window.confirm`:**
   - Trocar chamadas nativas em `AICopilotView.tsx` e `SupplementsView.tsx` por estados de abertura do `ConfirmDialog`.
3. **Padronização de Empty States:**
   - Substituir mensagens genéricas em `LabResultsTable`, `WorkoutsTable`, `SleepView` e `NOf1Tracker` pelo novo componente `EmptyState`.
4. **Classificação de Erros:**
   - **Erro Recuperável:** Exibir `InlineError` com botão "Recarregar".
   - **Erro Estrutural:** Exibir `ErrorState` com detalhes de diagnóstico.

## Estados e comportamento
- Transições de loading com fade-in suave, evitando saltos de layout (layout shift) na tela.
- Os estados vazios devem sempre oferecer uma saída clara ou ação para o usuário.

## Acessibilidade
- Mensagens de erro anunciadas via `role="alert"` ou `aria-live="assertive"`.
- `ConfirmDialog` respeita as regras de focus trap e fechamento via `Escape`.

## Responsividade
- Empty states centralizados e adaptados para preencher adequadamente tanto cards compactos quanto seções amplas de página.

## Testes
- Testes unitários para `ConfirmDialog` (confirmar, cancelar, Escape).
- Testes unitários para `EmptyState` verificando renderização de ícone, mensagem e disparo da ação secundária.
- Atualizar testes existentes que zombavam de `window.confirm`.

## Critérios de aceite
- [ ] Eliminação de 100% dos `window.confirm()` e `window.alert()` em fluxos de produção.
- [ ] Componente `EmptyState` padronizado e aplicado nos módulos principais.
- [ ] Primitives de loading e confirmação implementados e testados.
- [ ] Erros comunicam claramente a causa e fornecem ação imediata de recuperação.

## Riscos
- Risco de quebra de testes que interceptavam `window.confirm` via mocks do Vitest.
- Mitigação: atualizar os testes para interagir com o botão do `ConfirmDialog`.

## Rollback
- Reversão controlada dos arquivos de primitive e restauração dos fluxos anteriores via Git.

## Checklist de conclusão
- [ ] Criar `ConfirmDialog.tsx`
- [ ] Criar `EmptyState.tsx`
- [ ] Substituir `window.confirm()` em `AICopilotView.tsx` e `SupplementsView.tsx`
- [ ] Aplicar `EmptyState` em tabelas e listas
- [ ] Validar testes unitários
