# Plano UX/UI — UX_UI_00_BASELINE_1.9.8

## Objetivo
Estabelecer um inventário exaustivo e documentado da interface do Longevidade Hub na versão 1.9.8 antes e durante as etapas de evolução de UX/UI, mapeando telas, rotas por hash, modais, componentes de dados, tokens visuais em uso, suítes de testes automatizados e critérios de preservação funcional.

## Problema
- Ausência de um inventário centralizado que correlacione todas as telas, modais, padrões de loading e seletores críticos com a cobertura de testes atual.
- Risco de regressão silenciosa durante refatorações de design system ou layout caso fluxos críticos não estejam catalogados com seu comportamento esperado em modo escuro, modo claro, desktop e mobile.

## Evidências
- Versão 1.9.8 analisada com 10 abas primárias, ~16 modais e drawers customizados.
- Pelo menos 268 ocorrências de microtipografia (`text-[9px]`, `text-[10px]`, `text-[11px]`), 60 classes de gradiente, 32 usos de `backdrop-blur` e 27 usos de `glow-*`.
- Suíte existente de 21 arquivos de teste unitário/componente (96 testes Vitest) e 2 especificações Playwright E2E (`smoke.spec.ts` e `mobile-audit.spec.ts`).

## Escopo
- Catalogar todas as 10 áreas funcionais e seus respectivos hashes de deep link (`#overview`, `#timeline`, `#workouts`, `#labs`, `#supplements`, `#sleep`, `#ai`, `#n-of-1`, `#physical-assessments`, `#profile`).
- Catalogar todos os modais, drawers e diálogos interativos.
- Documentar os padrões de loading, empty states e tratamento de erro vigentes.
- Estabelecer a matriz de comandos de validação (`npm run test:run`, `npm run build`, `npm run test:e2e`).
- Registrar o baseline métrico estático de classes CSS e tokens.

## Fora de escopo
- Modificação de código de componentes ou alteração de estilização (o baseline é documental e normativo).
- Alteração de rotas ou regras de negócio no backend FastAPI.

## Arquivos afetados
- `docs/PLANS/UX_UI_00_BASELINE_1.9.8.md`
- `docs/development-and-validation.md`
- `frontend/package.json`

## Componentes envolvidos
- Todos os componentes em `frontend/src/components/`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/tailwind.config.js`

## Dependências
- Nenhuma (plano raiz de referência para todos os demais).

## Estratégia de implementação
1. **Mapeamento de Rotas e Hashes:**
   - `#overview` -> Visão Geral diária (`App.tsx`).
   - `#timeline` -> Linha do Tempo clínica (`timeline/TimelineView.tsx`).
   - `#workouts` -> Sessões de treino Hevy/Zepp (`WorkoutsView.tsx`).
   - `#labs` -> Exames laboratoriais e PhenoAge (`LabResultsTable.tsx`).
   - `#supplements` -> Protocolos de suplementação e hormônios (`SupplementsView.tsx`).
   - `#sleep` -> Análise de sono e arquitetura circadiana (`SleepView.tsx`).
   - `#ai` -> Copiloto médico e chat local (`AICopilotView.tsx`).
   - `#n-of-1` -> Rastreador de experimentos científicos pessoais (`NOf1Tracker.tsx`).
   - `#physical-assessments` -> Avaliações físicas e composição corporal (`PhysicalAssessmentsView.tsx`).
   - `#profile` -> Perfil do usuário, integrações e pipeline de dados (`ProfileView.tsx`).

2. **Inventário de Diálogos e Modais:**
   - `ManualEntryModal`: Registro de métricas manuais (peso, pressão, glicemia).
   - `DoctorBriefingModal`: Relatório exportável em Markdown para consulta médica.
   - `AISettingsModal`: Configuração de provedores LLM (OpenRouter, OpenAI, Anthropic) e chaves no cofre Windows.
   - `GoogleHealthAuthModal`: Fluxo de autenticação OAuth2 / Client Credentials para Health Connect / Google Health v4.
   - `SyncProgressModal`: Progresso e reconciliação da coleta Zepp e Google Health.
   - `ExerciseDetailModal`: Visualização detalhada de séries e cargas de exercícios.
   - `InsightDrawer`: Drawer contextual de insights epigenéticos.
   - `ConfounderBalanceModal`: Modal de balanceamento de variáveis em insights.
   - `AddHealthEventModal`: Registro de eventos pontuais na Timeline.

3. **Matriz de Comandos de Verificação:**
   - Testes unitários/componente: `npm run test:run` (Vitest).
   - Verificação estrita de tipagem TypeScript e bundle Vite: `npm run build`.
   - Testes End-to-End: `npx playwright test --config=e2e/playwright.config.ts`.

## Estados e comportamento
- O baseline define que nenhum plano subsequente pode ser considerado concluído caso quebre o contrato de qualquer um dos 10 módulos mapeados ou cause regressão nos testes automatizados catalogados.

## Acessibilidade
- Registrar como baseline o levantamento de conformidade WCAG 2.1 AA: ausência histórica de `focus-visible`, uso de diálogos sem `role="dialog"` e botões icon-only sem `aria-label`.

## Responsividade
- Breakpoints de referência formalizados:
  - Mobile compact: 375×667 (iPhone SE)
  - Mobile standard: 390×844 (iPhone 14)
  - Tablet portrait: 768×1024 (iPad)
  - Tablet landscape: 1024×768
  - Desktop standard: $\ge 1280\times 800$

## Testes
- Manter o registro de execução de 96 testes Vitest aprovados e 10 testes Playwright aprovados como pré-requisito de aceitação.

## Critérios de aceite
- [x] Todas as 10 áreas catalogadas com arquivos-fonte e rotas associadas.
- [x] Todos os modais listados com triggers e comportamentos esperados.
- [x] Matriz de testes automatizados e comandos de validação documentada.
- [x] Checklist de preservação de recursos estabelecido.

## Riscos
- Risco de refatoração visual apagar fluxos pouco visíveis (ex: histórico de pipeline ou recalculo de KDM).
- Mitigação: validação contínua contra a suíte de testes de baseline catalogada.

## Rollback
- Documento normativo; alterações sob controle de versão Git.

## Checklist de conclusão
- [x] Inventário de telas e rotas estruturado
- [x] Inventário de modais e overlays estruturado
- [x] Inventário de testes automatizados estruturado
- [x] Diretrizes de baseline incorporadas ao repositório
