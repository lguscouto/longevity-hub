# Registro de Exceções do Design System

> Toda ocorrência que viola uma regra de `docs/DESIGN_SYSTEM.md` e **não** será migrada deve ser registrada aqui e marcada no código com `ds-exception: DSX-NNN` (mesma linha ou linha anterior).
> O `npm run audit:design-system` (em `frontend/`) classifica como `EXCEPTION` apenas ocorrências marcadas **e** registradas. Marca sem registro é `FAIL`.

| ID | Arquivo | Regra quebrada | Motivo | Data | Status |
|---|---|---|---|---|---|
| DSX-001 | `frontend/src/components/ui/Modal.tsx` | `effects.backdrop-blur` | Backdrop translúcido de modal overlay (Surface 4, DS §4.7) | 2026-10-03 | Ativa |
| DSX-002 | `frontend/src/components/ui/Drawer.tsx` | `effects.backdrop-blur` | Backdrop translúcido de drawer overlay (Surface 4, DS §4.7) | 2026-10-03 | Ativa |
| DSX-003 | `frontend/src/components/Header.tsx` | `gradients.bg` | Ícone de marca Longevidade Hub | 2026-10-03 | Ativa |
| DSX-004 | `frontend/src/components/Header.tsx` | `gradients.bg` | Tipografia com gradiente da marca (bg-clip-text) | 2026-10-03 | Ativa |
| DSX-005 | `frontend/src/components/Header.tsx` | `gradients.bg` | Máscara de fade para scroll horizontal de tabs mobile (slot 1) | 2026-10-03 | Ativa |
| DSX-006 | `frontend/src/components/Header.tsx` | `gradients.bg` | Máscara de fade para scroll horizontal de tabs mobile (slot 2) | 2026-10-03 | Ativa |
| DSX-007 | `frontend/src/components/Header.tsx` | `gradients.bg` | Máscara de fade para scroll horizontal de tabs mobile (slot 3) | 2026-10-03 | Ativa |
| DSX-008 | `frontend/src/components/ProfileView.tsx` | `gradients.bg` | Avatar de identidade do usuário | 2026-10-03 | Encerrada (código refatorado para cor sólida/tokens) |
| DSX-009 | `frontend/src/components/AICopilotView.tsx` | `gradients.bg` | Barra de progresso de geração de insights de IA | 2026-10-03 | Encerrada (código refatorado para cor sólida/tokens) |
| DSX-010 | `frontend/src/components/SyncProgressModal.tsx` | `gradients.bg` | Barra de progresso de sincronização | 2026-10-03 | Encerrada (código refatorado para cor sólida/tokens) |
| DSX-011 | `frontend/src/index.css` | `effects.backdrop-blur` | Superfície legada glass-panel global (migração gradual no UX_UI_60) | 2026-10-03 | Ativa |
| DSX-012 | `frontend/src/components/ExerciseCatalogView.tsx` | `native.button` | Card clicável acessível do catálogo de exercícios (navegação para modal de detalhe) | 2026-10-03 | Ativa |
| DSX-013 | `frontend/src/components/SupplementStackWidget.tsx` | `native.button` | Botão semântico de alternância de dose diária de suplemento | 2026-10-03 | Ativa |
| DSX-014 | `frontend/src/components/sleep/SleepStagesChart.tsx` | `native.button` | Botão acessível de inspeção de data no eixo X do gráfico de sono | 2026-10-03 | Ativa |
| DSX-015 | `frontend/src/components/workouts/WorkoutSessionCard.tsx` | `native.button` | Header expansível de acordeão de sessão de treino | 2026-10-03 | Ativa |
| DSX-016 | `frontend/src/components/workouts/WorkoutSessionCard.tsx` | `native.button` | Gatilho de miniatura/mídia de execução do exercício | 2026-10-03 | Ativa |
| DSX-017 | `frontend/src/components/DailyComplianceWidget.tsx` | `native.button` | Botão switch acessível dos quatro pilares de conformidade do protocolo | 2026-10-03 | Ativa |

## Como adicionar

1. Reserve o próximo `DSX-NNN` sequencial.
2. Adicione uma linha na tabela acima (todas as colunas).
3. Marque o código: `// ds-exception: DSX-NNN`.
4. Status válidos: `Ativa`, `Em migração (prazo: AAAA-MM-DD)`, `Encerrada`.

## Política de baseline

`frontend/audit-baseline.json` guarda a dívida legada **aberta** por regra. A auditoria falha se qualquer contagem **subir** (regressão) e nunca deve ser aumentada manualmente. Após cada migração, rode `npm run audit:design-system:baseline` para fazer o *ratchet down*.
