# Plano UX/UI — UX_UI_08_MOBILE_RESPONSIVE

## Objetivo
Garantir uma experiência mobile de primeira classe (Mobile is not a Shrunk Desktop) no Longevidade Hub, implementando tratamento inteligente de dados tabulares em telas pequenas, ampliando a cobertura de testes em múltiplos viewports de dispositivos móveis e tablets e eliminando qualquer overflow horizontal não intencional.

## Problema
- Tabelas de alta densidade como `LabResultsTable.tsx` e `WorkoutsTable.tsx` dependem unicamente de `overflow-x-auto`, exigindo rolagem horizontal cega pelo usuário de smartphone sem visualização imediata da métrica ou status correspondente.
- Gráficos densos (Recharts) sofrem compressão de eixos ou sobreposição de legendas em telas estreitas.
- A suíte de auditoria móvel (`frontend/e2e/mobile-audit.spec.ts`) documentava a intenção de cobrir iPhone SE (375×667) e iPhone 14 (390×844), mas configurava fixamente apenas 390×844 no `test.use()`.
- Modais em telas móveis ocasionalmente cortam o botão de submissão inferior ou o botão de fechar quando o teclado virtual se expande.

## Evidências
- `frontend/src/components/LabResultsTable.tsx`: tabela com múltiplas colunas (Biomarcador, Valor, Unidade, Alvo de Longevidade, Categoria, Ações) contida em `overflow-x-auto`.
- `frontend/e2e/mobile-audit.spec.ts`: viewport travado em 390×844.
- Auditoria de UX/UI v1.9.8: itens `UX-P1-17` e `UX-P2-01`.

## Escopo
- **Estratégia de Tabelas Mobile para `LabResultsTable.tsx` e `WorkoutsTable.tsx`:**
  - Em telas $\ge 768$px: exibição tabular tradicional com cabeçalhos ordenáveis e espaçamento confortável.
  - Em telas móveis (< 768px): modo **Row Card** (cartão de linha):
    - Cada exame vira um card com o nome do biomarcador, valor em destaque com badge de status (Ideal / Atenção / Fora do Alvo) e botão discreto de expandir detalhes (unidade, alvo numérico exato, histórico e ações).
- **Adequação de Gráficos (Recharts):**
  - Ajuste de `tickCount` e formatação compacta de datas nos eixos X em larguras menores.
  - Tooltips utilizáveis por toque com `touchAction: manipulation` e posicionamento inteligente que não transborde o viewport.
- **Ampliação da Suíte Playwright E2E:**
  - Cobrir explicitamente na matriz de testes os viewports:
    - iPhone SE: 375×667
    - iPhone 14: 390×844
    - iPad Portrait: 768×1024
    - Desktop Standard: 1280×800
  - Garantir `scrollWidth <= innerWidth` e `badElements: []` em todas as rotas e nos 4 viewports.

## Fora de escopo
- Omissão de dados ou colunas clínicas essenciais (toda informação secundária continua disponível via expansor).
- Reformulação de regras de cálculo de saúde.

## Arquivos afetados
- `frontend/src/components/LabResultsTable.tsx`
- `frontend/src/components/WorkoutsTable.tsx`
- `frontend/e2e/mobile-audit.spec.ts`
- `docs/PLANS/UX_UI_08_MOBILE_RESPONSIVE.md`

## Componentes envolvidos
- `LabResultsTable`
- `WorkoutsTable`
- `BodyCompositionChart`
- Modais em `frontend/src/components/`

## Dependências
- `UX_UI_01_DESIGN_SYSTEM`
- `UX_UI_02_ACCESSIBILITY_PRIMITIVES`
- `UX_UI_03_NAVIGATION_REDESIGN`

## Estratégia de implementação
1. **Padrão Row Card para Exames:**
   - Detectar breakpoint (ou utilizar classes utilitárias `hidden md:table` e `block md:hidden`).
   - Para `< 768px`, renderizar lista de cards com espaçamento de toque ergonômico.
2. **Atualização do Playwright `mobile-audit.spec.ts`:**
   - Parametrizar os testes de auditoria de overflow em um array de viewports:
     ```ts
     const VIEWPORTS = [
       { name: 'iPhone SE', width: 375, height: 667 },
       { name: 'iPhone 14', width: 390, height: 844 },
       { name: 'iPad Portrait', width: 768, height: 1024 },
       { name: 'Desktop', width: 1280, height: 800 },
     ]
     ```
3. **Auditoria de Modais:**
   - Assegurar que todo modal utilize `max-h-[85vh]` e `overflow-y-auto` na área de conteúdo com botões de rodapé sticky ou posicionados acima da dobra inferior.

## Estados e comportamento
- Transição responsiva fluida sem flickers ou redimensionamentos bruscos ao girar o aparelho (orientação portrait/landscape).

## Acessibilidade
- No modo Row Card, assegurar que cada card funcione como uma unidade lógica acessível para leitores de tela com `aria-expanded` no botão de detalhes.
- Alvos de toque com área mínima de $44\times 44$px.

## Responsividade
- Eliminação definitiva de qualquer barra de rolagem horizontal não intencional em toda a aplicação nas resoluções 375px e 390px.

## Testes
- Execução de `npx playwright test e2e/mobile-audit.spec.ts` contra os 4 viewports alvo.
- Verificação de snapshots e logs de auditoria de elementos com transbordamento (`badElements`).

## Critérios de aceite
- [ ] `LabResultsTable` e `WorkoutsTable` utilizam visualização otimizada em cards no mobile (< 768px).
- [ ] Cobertura E2E executando e aprovada em 375×667, 390×844, 768×1024 e 1280×800.
- [ ] Zero overflow horizontal (`scrollWidth <= innerWidth`) em todas as telas e abas.
- [ ] Modais totalmente acessíveis em telas verticais pequenas sem corte de conteúdo.

## Riscos
- Risco de usuários que preferem visão em grade tabular tradicional em tablets.
- Mitigação: manter a visualização em tabela a partir de 768px (tablets e desktops).

## Rollback
- Reversão das alterações em `LabResultsTable.tsx` e `mobile-audit.spec.ts` via Git.

## Checklist de conclusão
- [ ] Implementar visualização Row Card em `LabResultsTable.tsx`
- [ ] Adequar `WorkoutsTable.tsx` para mobile
- [ ] Parametrizar viewports em `mobile-audit.spec.ts`
- [ ] Validar execução completa dos testes E2E
