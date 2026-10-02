# Plano UX/UI — UX_UI_28_SYNC_STATUS_UX_2.0.0

> **Título:** UX de Status de Sincronização e Conectividade no Header  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Transformar os botões técnicos de sincronização no Header em indicadores de estado ricos e discretos (conectado, sincronizando, erro, pendente).

## Contexto da versão 2.0.0
Os botões de sincronização (Zepp e Google) ocupam espaço significativo no Header móvel como botões de ação pesados.

## Problema
Poluição visual no Header e pouca clareza sobre quando a última sincronização ocorreu com sucesso.

## Evidências
Botões 'Sync Zepp' e 'Sync Google' concorrendo com navegação primária.

## Estado atual
Cluster técnico separado no Header, com SyncProgressModal.

## O que já foi resolvido
Separação entre ações clínicas e de infraestrutura.

## O que permanece
Exibição condensada com estado de recência ('Sincronizado há 2h').

## Escopo
1. Condensar ações de sincronização em um widget de status integrado no Header ou menu de conexões.
2. Exibir badge sutil de status e abrir SyncProgressModal apenas sob demanda.

## Fora de escopo
Alteração nos workers de sincronização em segundo plano.

## Arquivos afetados
- frontend/src/components/Header.tsx
- frontend/src/components/SyncProgressModal.tsx

## Componentes envolvidos
Header, SyncProgressModal, StatusBadge

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Criar componente compacto SyncStatusControl para o Header.

## Estados e comportamento
Ícone com pulso suave durante sync; check verde para sucesso recente; triângulo âmbar se houver aviso.

## Acessibilidade
aria-label completo com timestamp da última sincronização.

## Responsividade
Em mobile, ícone compacto com badge de status.

## Dark/Light
Contraste correto.

## Microcopy
'Sincronizado há 10 min', 'Sincronizando dados Zepp...'.

## Testes unitários
Header.test.tsx verificando renderização do status.

## Testes E2E
mobile-audit.spec.ts verificando ausência de quebras no Header.

## Visual QA
Revisão visual do Header no iPhone SE.

## Critérios de aceite
- Header com menos botões brutos e mais semântica de estado de conexão.
- Acesso imediato ao log de sincronização em 1 clique.

## Riscos
Usuário não encontrar o botão de forçar sincronização imediata se ficar excessivamente discreto.

## Rollback
Reversão do componente no Header via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Vitest Header & SyncStatusControl Unit Tests (5 testes) | `npm run test:run -- src/components/Header.test.tsx` | 02/10/2026 16:31:31 | Windows 11 | PASS | 5 passed (SyncStatusControl, lastSyncTime timestamp, syncing state, theme toggle) |
| Vite Production Build | `npm run build` | 02/10/2026 16:32:00 | Windows 11 | PASS | ✓ built in 4.67s (9.29s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 16:32:09 | Windows 11 | PASS | 190 passed across 40 test files (11.70s) |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 16:32:21 | Windows 11 | PASS | 8 passed across 4 viewports (17.19s) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
