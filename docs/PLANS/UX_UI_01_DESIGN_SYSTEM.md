# Plano UX/UI — UX_UI_01_DESIGN_SYSTEM

## Objetivo
Consolidar a camada de design system do Longevidade Hub através da padronização de primitives reutilizáveis, centralização de tokens semânticos (cores, superfícies, tipografia, raio e espaçamento), eliminação de microtipografias arbitrárias e substituição de classes CSS ad-hoc repetidas nos componentes.

## Problema
- Múltiplos componentes estilizam seus elementos diretamente com combinações únicas de cores e efeitos, gerando inconsistência visual e manutenção custosa.
- Cerca de 268 ocorrências combinadas de `text-[9px]`, `text-[10px]` e `text-[11px]`, tornando dados clínicos difíceis de ler.
- Uso excessivo de `uppercase` combinado com `tracking-wider` e fontes em negrito em textos funcionais secundários.
- Inexistência de primitives formais para botões, badges, inputs e seções; cada componente reinventa seu próprio botão com variações arbitrárias de `bg-gradient-to-*` e `glow-*`.

## Evidências
- `frontend/src/components/MetricCard.tsx`: classes de cor manuais (`colorMap` e `iconBgMap`) com gradientes e `hover:scale-[1.02]`.
- `frontend/src/components/Header.tsx`: 10 gradientes distintos para estado ativo de abas.
- `frontend/tailwind.config.js`: tokens de cores existem, mas seu uso é disperso.

## Escopo
- Definir escala tipográfica padronizada (mínimo de 12px para texto funcional):
  - `text-xs`: 12px (captions, metadados, unidades auxiliares).
  - `text-sm`: 14px (corpo secundário, labels de campos).
  - `text-base`: 16px (corpo principal, valores de leitura).
  - `text-lg`: 18px (títulos de subseção e cards).
  - `text-xl` / `text-2xl`: 20–24px (títulos de seção e headlines de página).
  - `text-metric`: 28–36px (valores numéricos de KPIs com peso semântico).
- Estabelecer a gramática de superfícies (Surfaces 0 a 4):
  - Surface 0: Background geral do app (`#f4f7fb` / `dark:bg-slate-950`).
  - Surface 1: Navegação e Header fixo (`glass-panel`).
  - Surface 2: Cards de dados comuns (`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800`).
  - Surface 3: Painéis destacados e contexto (`bg-slate-50 dark:bg-slate-850`).
  - Surface 4: Diálogos e modais elevados (`shadow-2xl`).
- Padronizar tokens de raio (`rounded-xl` para controles e cards médios; `rounded-2xl` para seções e modais; descontinuar proliferação de `rounded-3xl` aleatórios).
- Criar catálogo de primitives base em `frontend/src/components/ui/`:
  - `Button` (variantes: primary, secondary, ghost, destructive).
  - `IconButton` (com `aria-label` obrigatório).
  - `StatusBadge` (verde=sucesso, azul/ciano=info, âmbar=alerta, vermelho=erro, neutro=default).
  - `SectionCard` e `DataCard`.

## Fora de escopo
- Refatoração simultânea de todos os 25 componentes de tela (a migração para primitives será incremental por módulo).
- Alteração de regras de formatação médica ou cálculo de biomarcadores.

## Arquivos afetados
- `frontend/src/components/ui/Button.tsx` (Novo)
- `frontend/src/components/ui/IconButton.tsx` (Novo)
- `frontend/src/components/ui/StatusBadge.tsx` (Novo)
- `frontend/src/components/ui/Card.tsx` (Novo)
- `frontend/tailwind.config.js`
- `frontend/src/index.css`
- `docs/PLANS/UX_UI_01_DESIGN_SYSTEM.md`

## Componentes envolvidos
- Novos primitives em `frontend/src/components/ui/`
- `MetricCard.tsx`
- `Header.tsx`
- `OverviewSection.tsx`

## Dependências
- `UX_UI_00_BASELINE_1.9.8`

## Estratégia de implementação
1. **Definição de Tokens no Tailwind:**
   - Adicionar classes utilitárias no `tailwind.config.js` para tipografia de métricas (`metric`) e sombras semânticas.
2. **Construção dos Primitives:**
   - Criar `Button.tsx` suportando variantes, estados (`loading`, `disabled`, `active`) e foco por teclado (`focus-visible`).
   - Criar `IconButton.tsx` exigindo `aria-label` e garantindo área de toque de pelo menos $44\times 44$px.
   - Criar `StatusBadge.tsx` unificando a apresentação de status clínicos e de sistema.
3. **Substituição Gradual:**
   - Começar a substituição pelos componentes de layout de alto nível (`Header`, `OverviewSection`, `MetricCard`).

## Estados e comportamento
- Todos os controles devem implementar explicitamente: `default`, `hover`, `focus-visible`, `active` e `disabled`.
- O estado de carregamento de botões deve exibir spinner sem colapsar a largura do botão.

## Acessibilidade
- Contraste de texto mínimo de 4.5:1 para texto normal e 3:1 para texto grande em ambos os temas (dark e light).
- Não depender de cores como único indicador de status (sempre associar texto legível ou ícone semântico).
- Foco de teclado obrigatório via `:focus-visible`.

## Responsividade
- Tipografia fluida com classes Tailwind responsivas (`text-xs sm:text-sm`, `text-xl sm:text-2xl`).
- Áreas de toque adequadas para toque em mobile em todos os botões (`min-h-[44px]` ou alinhamento com padding compensatório).

## Testes
- Testes unitários para cada primitive criado (`Button.test.tsx`, `IconButton.test.tsx`, `StatusBadge.test.tsx`).
- Validação de renderização em modo claro e escuro.

## Critérios de aceite
- [x] Primitives `Button`, `IconButton`, `StatusBadge` e `Card` implementados e testados.
- [x] Escala tipográfica formalizada sem novos usos de `text-[9px]` ou `text-[10px]` para conteúdo essencial.
- [x] Cores semânticas consolidadas (verde para positivo/sucesso, vermelho para crítico, âmbar para atenção).
- [x] 100% dos testes unitários passando.

## Riscos
- Risco de pequenas quebras visuais de alinhamento em tabelas legadas.
- Mitigação: migração modular e testes visuais em lote.

## Rollback
- Reversão controlada dos commits dos primitives em `frontend/src/components/ui/`.

## Checklist de conclusão
- [x] Atualizar tokens no `tailwind.config.js` e `index.css`
- [x] Criar componentes em `frontend/src/components/ui/`
- [x] Implementar testes unitários dos primitives
- [x] Atualizar documentação de uso do Design System (`docs/DESIGN_SYSTEM.md`)
