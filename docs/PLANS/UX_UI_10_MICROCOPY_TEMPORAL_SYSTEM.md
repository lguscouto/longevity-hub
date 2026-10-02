# Plano UX/UI — UX_UI_10_MICROCOPY_TEMPORAL_SYSTEM

## Objetivo
Estabelecer um vocabulário textual claro, consistente e orientado à tarefa (Task-Oriented Microcopy) em todo o produto, eliminando jargões de autoelogio tecnológico ou autoridade médica desmedida, e unificar o sistema de navegação e filtros temporais através de um componente transversal padronizado (`TimeRangeControl`).

## Problema
- Múltiplos módulos utilizam formatos temporais divergentes: "7d", "30d", "90d", "60d", "Últimos 20 registros", "Mês atual", sem uma gramática temporal comum.
- Algumas ações rápidas são vagas: o botão "Registrar" no topo da página não explicita se registrará um exame, um treino, um suplemento ou uma métrica manual de peso/pressão.
- Frases de interface enfatizam arquitetura interna ou promessas técnicas em vez do benefício para o usuário:
  - *"Hub de Inteligência de Saúde & Epigenética Local"*
  - *"Contextualize dados não capturados por wearables"*
  - *"Registro de histórico auditável imutável"*
  - *"Insight de Otimização Biológica"*
- Dificuldade para usuários não técnicos compreenderem o que cada número ou recomendação significa na prática.

## Evidências
- `frontend/src/components/Header.tsx`: botão "Registrar" genérico e subtítulo com jargão técnico.
- `frontend/src/components/DateNavigator.tsx` vs `BodyCompositionChart.tsx` vs `SleepView.tsx`: controles de filtro de tempo com sintaxes visuais e rótulos diferentes.
- Auditoria de UX/UI v1.9.8: itens `UX-P1-02`, `UX-P1-12`, `UX-P1-13` e `UX-P2-08`.

## Escopo
- **Sistema Temporal Unificado (`TimeRangeControl.tsx`):**
  - Padronizar as janelas temporais de análise em toda a aplicação:
    - `Hoje`
    - `7 dias`
    - `30 dias`
    - `90 dias`
    - `Tudo` (ou `Personalizado`)
  - Criar o primitive `TimeRangeControl` com suporte completo a navegação por teclado (`ArrowLeft`, `ArrowRight`), acessibilidade via leitor de tela (`aria-pressed` ou role `radiogroup`) e estilo visual consistente.
  - Quando um módulo científico exigir uma janela específica (ex: 60 dias para média de CGM ou ciclos de hemoglobina glicada), explicitar o motivo técnico/clínico em tooltip ou nota auxiliar.
- **Revisão Sistemática de Microcopy:**
  - Reformular ações e rótulos ambíguos:
    - "Registrar" -> "Adicionar Métrica" / "Novo Registro".
    - "Contextualize dados não capturados..." -> "Como você está se sentindo hoje?".
    - "Registro de histórico auditável imutável" -> "Histórico de alterações auditado".
    - "Insight de Otimização Biológica" -> "Padrão identificado nos seus dados".
    - "Inteligência Médica de Precisão" -> "Copiloto de Longevidade".
  - Diretriz obrigatória para textos de interface: cada frase deve responder a:
    1. O que é isso?
    2. Por que isso importa para mim?
    3. O que devo fazer agora?
    4. De onde veio esse dado?

## Fora de escopo
- Alterações em termos médicos científicos padronizados internacionalmente (ex: `HRV`, `RMSSD`, `VO2 Max`, `KDM Biological Age`, `PhenoAge`).
- Alteração nos nomes de colunas no banco de dados SQLite.

## Arquivos afetados
- `frontend/src/components/ui/TimeRangeControl.tsx` (Novo)
- `frontend/src/components/DateNavigator.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/BodyCompositionChart.tsx`
- `frontend/src/components/SleepView.tsx`
- `docs/PLANS/UX_UI_10_MICROCOPY_TEMPORAL_SYSTEM.md`

## Componentes envolvidos
- `TimeRangeControl`
- `DateNavigator`
- `Header`
- Modais e formulários de entrada

## Dependências
- `UX_UI_01_DESIGN_SYSTEM`
- `UX_UI_02_ACCESSIBILITY_PRIMITIVES`

## Estratégia de implementação
1. **Componente `TimeRangeControl`:**
   - Construir como um controle segmentado (`role="radiogroup"` ou grupo de botões de alternância com `aria-current`).
   - Integrar suporte a atalhos de teclado.
2. **Atualização do `DateNavigator`:**
   - Substituir os botões isolados de "7d", "30d", "90d" pelo novo primitive.
3. **Revisão Textual Guiada:**
   - Executar busca global por termos inflados e substituir conforme o catálogo semântico aprovado.
4. **Tooltips de Transparência:**
   - Incluir pequenos textos explicativos em métricas complexas (ex: "HRV: variabilidade da frequência cardíaca, indicador da recuperação do sistema nervoso autônomo").

## Estados e comportamento
- O período ativo deve ser claramente evidente por contraste e anunciado para tecnologias assistivas.
- Transições de data e período devem atualizar o dashboard sem recarregar a tela inteira.

## Acessibilidade
- Navegação entre opções de período via teclas de seta (`ArrowLeft` / `ArrowRight`).
- Rótulos textuais claros sem depender de siglas obscuras sem expansão.

## Responsividade
- Em mobile, o `TimeRangeControl` deve se ajustar harmoniosamente sem quebrar em múltiplas linhas desordenadas.

## Testes
- Testes unitários para `TimeRangeControl` validando seleção, disparo do callback `onChange` e acessibilidade via teclado.
- Testes de componentes verificando se os novos textos são renderizados corretamente.

## Critérios de aceite
- [x] Primitive `TimeRangeControl` implementado e adotado no `DateNavigator` e gráficos.
- [x] Rótulos temporais normalizados para "Hoje", "7 dias", "30 dias", "90 dias", "Tudo".
- [x] Ação rápida "Registrar" substituída por nomenclatura clara baseada no formulário de entrada.
- [x] Microcopy revisada eliminando termos de autoelogio técnico em favor de clareza de tarefas.

## Riscos
- Risco de usuários habituados a siglas curtas ("7d", "30d") acharem rótulos mais longos excessivos em mobile.
- Mitigação: em mobile compacto, utilizar "7d", "30d", "90d" com `aria-label="7 dias"`, "30 dias", etc.

## Rollback
- Reversão dos commits de texto e do componente `TimeRangeControl.tsx` via Git.

## Checklist de conclusão
- [x] Criar `TimeRangeControl.tsx`
- [x] Integrar no `DateNavigator.tsx`
- [x] Atualizar microcopy nos componentes principais
- [x] Validar testes unitários e E2E
