# Plano UX/UI — UX_UI_06_SUPPLEMENTS_REDESIGN

## Objetivo
Reestruturar a interface do módulo de Suplementos & Hormônios (`SupplementsView.tsx`), separando a rotina diária de uso das funções administrativas e cadastrais, organizando o log de auditoria e a análise clínica de forma contextual e adaptando a experiência de duas colunas para uso fluido em dispositivos móveis.

## Problema
- A tela atual aglutina no mesmo espaço visual:
  - O que tomar no dia de hoje;
  - Marcação de adesão (compliance);
  - Formulário completo de cadastro e edição de compostos;
  - Histórico de ingestão;
  - Linha do tempo de auditoria técnica de eventos (imutabilidade/log);
  - Sugestões e otimização por IA.
- Em desktop, a divisão em duas colunas rígidas (compostos à esquerda e audit log à direita) funciona razoavelmente, mas no mobile o audit log empurra o restante do conteúdo para baixo ou comprime os dados de dosagem.
- A auditoria técnica ocupa espaço prioritário que deveria pertencer à tomada de decisão imediata do usuário ("o que devo tomar agora?").

## Evidências
- `frontend/src/components/SupplementsView.tsx`.
- Screenshot de referência `docs/screenshots/supplements_and_hormones.jpg`.
- Auditoria de UX/UI v1.9.8: item `UX-P1-19`.

## Escopo
- Reorganizar a visualização em 4 áreas funcionais:
  1. **Hoje (Rotina & Adesão):**
     - O que tomar no dia selecionado (agrupado por janelas: Manhã, Almoço, Tarde, Noite).
     - Botões rápidos de confirmação de dose tomada.
     - Indicador resumido de adesão do dia (% de compliance).
  2. **Stack / Compostos (Cadastro & Gestão):**
     - Lista dos compostos ativos do protocolo (dose, unidade, horário, objetivo clínico).
     - Ações de adicionar novo composto, editar dosagem ou pausar protocolo.
  3. **Histórico & Auditoria:**
     - Histórico longitudinal de tomada de doses.
     - Painel de Auditoria preservado integralmente (registro imutável de quem alterou o quê e quando, com timestamp e hash).
  4. **Análises & Interações:**
     - Interações medicamentosas/compostos, alertas de horários conflitantes e otimização assistida por IA.
- Garantir transição responsiva mobile: em telas pequenas, navegação por abas contextuais ou layout verticalizado em que a rotina diária aparece sempre no topo.

## Fora de escopo
- Alterações no esquema do banco SQLite ou nos endpoints `/api/supplements/*`.
- Exclusão do sistema de logs de auditoria (a rastreabilidade é um requisito clínico e será 100% mantida).

## Arquivos afetados
- `frontend/src/components/SupplementsView.tsx`
- `frontend/src/components/SupplementStackWidget.tsx`
- `docs/PLANS/UX_UI_06_SUPPLEMENTS_REDESIGN.md`

## Componentes envolvidos
- `SupplementsView`
- `SupplementStackWidget`
- `DailyComplianceWidget`

## Dependências
- `UX_UI_01_DESIGN_SYSTEM`
- `UX_UI_02_ACCESSIBILITY_PRIMITIVES`
- `UX_UI_03_NAVIGATION_REDESIGN`

## Estratégia de implementação
1. **Estruturação por Abas Internas:**
   - Implementar sub-navegação contextual interna: `Hoje`, `Meu Protocolo`, `Histórico & Auditoria`, `Interações`.
2. **Refatoração da Rotina Diária:**
   - Criar cards de ingestão diária com visual limpo e checkbox/botão de confirmação de dose com feedback tátil e visual.
3. **Isolamento da Auditoria:**
   - Mover a coluna lateral de audit log para a sub-aba `Histórico & Auditoria`, dando espaço total para filtros por data e tipo de evento.
4. **Mobile Optimization:**
   - Transformar a lista de compostos em cards verticais com tipografia legível em telas de 375px/390px.

## Estados e comportamento
- **Composto tomado:** Card com indicador esmeralda de confirmação e horário registrado.
- **Dose pendente:** Realce sutil com indicação do horário previsto.
- **Protocolo pausado:** Badge neutro indicando inatividade temporária sem apagar histórico.

## Acessibilidade
- Checkboxes e botões de confirmação de dose com labels descritivos (`aria-label="Confirmar dose de Creatina 5g pela manhã"`).
- Feedback auditivo/anunciado via `aria-live` ao marcar uma dose como tomada.

## Responsividade
- Eliminação do split-screen rígido em larguras inferiores a 1024px.
- Botões de confirmação com alvo de toque largo para fácil uso no smartphone com uma só mão.

## Testes
- Testes unitários para confirmação de dose e persistência do log de auditoria.
- Testes de renderização sem overflow em 390px e 375px.

## Critérios de aceite
- [ ] Rotina "Hoje" focada nas doses do dia e compliance, sem concorrência visual do audit log.
- [ ] Cadastro e edição de compostos concentrados na aba dedicada "Meu Protocolo".
- [ ] Auditoria e rastreabilidade 100% preservadas e acessíveis na aba de histórico.
- [ ] Layout mobile testado e sem corte de dados de dosagem.

## Riscos
- Risco de usuários sentirem falta do audit log sempre visível na lateral no desktop.
- Mitigação: permitir um toggle lateral colapsável opcional em monitores widescreen ($\ge 1440$px).

## Rollback
- Reversão do componente `SupplementsView.tsx` via Git.

## Checklist de conclusão
- [ ] Implementar abas contextuais em `SupplementsView.tsx`
- [ ] Reorganizar cartões de dose do dia por período
- [ ] Mapear tela de auditoria preservando todos os campos de log
- [ ] Validar testes automatizados
