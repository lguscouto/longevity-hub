# Plano UX/UI — UX_UI_03_NAVIGATION_REDESIGN

## Objetivo
Consolidar a navegação principal do Longevidade Hub em 6 macro-áreas conceituais (*Hoje*, *Saúde*, *Treino*, *Intervenções*, *IA*, *Perfil*) com sub-navegação contextual limpa, separando a navegação de conteúdo das operações técnicas (sincronização e configurações) e eliminando a dependência de rolagem horizontal forçada (`overflow-x-auto`) em dispositivos móveis.

## Problema
- `Header.tsx` renderizava simultaneamente 10 abas em um container com `overflow-x-auto` no mobile.
- Operações de infraestrutura técnica ("Sync Zepp", "Sync Google") e configurações de IA competiam visualmente com as abas de conteúdo diário.
- Cores divergentes e gradientes multicoloridos para cada aba criavam inconsistência e alta carga visual.
- Falta de hierarquia entre áreas principais e especialidades clínicas.

## Evidências
- `frontend/src/components/Header.tsx` (linhas 95-198): 10 botões com gradientes concorrentes.
- Auditoria de UX/UI v1.9.8: item `UX-P0-02` e `UX-P1-01`.

## Escopo
- Redesenhar `Header.tsx` com 6 abas primárias e barra contextual de sub-abas.
- Isolar cluster de ações do usuário (`Registrar`, `Doctor Briefing`) do cluster de sincronização/técnico.
- Unificar token de estado ativo da aba (fundo neutro elevado/destaque esmeralda sutil, sem 10 gradientes arbitrários).
- Prover alvos de toque acessíveis ($\ge 44$px) e suporte completo a `focus-visible`.
- Garantir compatibilidade retroativa com deep links por hash (`#overview`, `#labs`, `#sleep`, `#supplements`, `#workouts`, `#n-of-1`, `#physical-assessments`, `#timeline`, `#profile`, `#ai`).

## Fora de escopo
- Alterações em APIs de backend ou formato de respostas de dados.
- Redesenho interno dos módulos de tela (tratados nos planos dedicados P1).

## Arquivos afetados
- `frontend/src/components/Header.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`

## Componentes envolvidos
- `Header`
- `App`
- Rotas e sub-rotas contextuais

## Dependências
- `UX-00 Baseline`

## Estratégia de implementação
1. Definir estrutura de navegação hierárquica (macro-áreas e sub-abas).
2. Criar resolvedor canônico bidirecional no `App.tsx` para sincronização com `window.location.hash` e `localStorage`.
3. Ajustar `Header.tsx` para renderizar a barra primária consolidada e a barra de sub-abas contextuais.
4. Ajustar agrupamento de ações no topo do header.
5. Garantir que seletores de teste continuem acessíveis para evitar regressão na suíte de testes.

## Estados e comportamento
- **Default:** Aba inativa com texto e contraste acessível (`text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100`).
- **Active:** Aba ativa com contraste e realce semântico coerente.
- **Focus:** Anel de foco nítido (`focus-visible:ring-2 focus-visible:ring-emerald-500`).
- **Mobile:** Menu responsivo e chips de sub-abas com espaçamento adequado e sem quebra visual.

## Acessibilidade
- Semântica de `<nav>` e `<header>`.
- `aria-current="page"` para a aba/sub-aba ativa.
- `aria-label` descritivo para ações e botões com ícones.
- Suporte total a navegação por teclado (`Tab`, `Shift+Tab`, `Enter`, `Space`).

## Responsividade
- Breakpoints testados: 375×667, 390×844 e desktop $\ge 1024$px.
- Sem rolagem horizontal acidental no viewport.

## Testes
- Testes unitários com Vitest (`npm run test:run`).
- Testes E2E com Playwright (`smoke.spec.ts` e `mobile-audit.spec.ts`).

## Critérios de aceite
- [x] Máximo de 6 áreas primárias na navegação desktop.
- [x] Sub-abas contextuais para Saúde e Intervenções.
- [x] Ações administrativas e de sincronização separadas da navegação de conteúdo.
- [x] Todos os deep links por hash legados continuam direcionando para as telas corretas.
- [x] Zero overflow horizontal não intencional em mobile.

## Riscos
- Risco de quebra de testes E2E que buscam labels antigos de abas. Mitigação: expor as sub-abas contextuais com os mesmos rótulos acessíveis.

## Rollback
- Reversão simples via controle de versão Git dos arquivos `Header.tsx` e `App.tsx`.

## Checklist de conclusão
- [ ] Implementar novo `Header.tsx`
- [ ] Atualizar roteador canônico no `App.tsx`
- [ ] Executar suíte de testes unitários e de integração
- [ ] Validar compatibilidade dos deep links
