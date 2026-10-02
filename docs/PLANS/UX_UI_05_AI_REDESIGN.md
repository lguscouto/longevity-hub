# Plano UX/UI — UX_UI_05_AI_REDESIGN

## Objetivo
Reestruturar a experiência do módulo de IA & Copiloto (`AICopilotView.tsx`), separando com clareza as três tarefas fundamentais do usuário (Analisar Tendências, Conversar com o Copiloto e Consultar Histórico), eliminando a rigidez de alturas fixas (`h-[650px]`) e comunicando a confiança, origem dos dados utilizados e limitações das inferências de forma transparente e sóbria.

## Problema
- A tela atual tenta comportar simultaneamente um grande CTA de geração de relatório clínico, a visualização do laudo completo, um chat estreito em coluna lateral e o histórico dentro do mesmo container visual.
- Quando ainda não há relatório gerado, a área central exibe um grande vazio desproporcional.
- A altura fixa de `h-[650px]` causa cortes verticais e scroll duplo em telas de notebooks menores e dispositivos móveis.
- A terminologia utilizada ("Inteligência Médica de Precisão") passa impressão de autoridade clínica autônoma em vez de ferramenta de apoio e síntese para o usuário e seu médico.
- O resultado da IA não indica explicitamente a quantidade de dados reais utilizados versus dados ausentes ou extrapolados.

## Evidências
- `frontend/src/components/AICopilotView.tsx`: layout de grade rígida com coluna estreita de chat e altura travada.
- Screenshot de referência `docs/screenshots/ai_copilot_medical.jpg`.
- Auditoria de UX/UI v1.9.8: itens `UX-P1-14` e `UX-P1-18`.

## Escopo
- Reorganizar a área em 3 sub-visões ou modos claros através de controle segmentado (`Tabs`/`SegmentedControl`):
  1. **Analisar:**
     - Seletor de período (7d, 30d, 90d).
     - Botão primário para gerar síntese.
     - Painel de transparência de dados:
       - Número de dias com métricas reais coletadas.
       - Registros de sono, treinos e exames computados.
       - Nível de confiança da síntese (Alto / Moderado / Baixo) baseado na densidade amostral.
       - Indicação explícita de dados ausentes ("Sem exames recentes de perfil lipídico").
     - Laudo/resumo estruturado com botões de copiar e exportar.
  2. **Conversar:**
     - Chat em largura confortável e flexível, permitindo leitura natural de parágrafos.
     - Pílulas com sugestões de perguntas contextuais baseadas nos dados do usuário ("O que explica a queda do meu HRV esta semana?").
     - Notificação clara de privacidade e confirmação de envio para provedor externo configurado.
  3. **Histórico:**
     - Linha do tempo das análises geradas anteriormente com data, período avaliado e sumário rápido.
- Tornar o layout flexível (`min-h-[500px]`, adaptável ao tamanho da viewport e responsivo para mobile).
- Ajustar microcopy: substituir "Inteligência Médica" por "Copiloto de Saúde & Longevidade" e rotular claramente dados observados vs. estimativas.

## Fora de escopo
- Alterações no backend de IA (`backend/app/api/ai.py` ou provedores LLM).
- Implementação de novos provedores de IA além dos já suportados (OpenRouter, OpenAI, Anthropic).

## Arquivos afetados
- `frontend/src/components/AICopilotView.tsx`
- `frontend/src/components/AICopilotView.test.tsx`
- `docs/PLANS/UX_UI_05_AI_REDESIGN.md`

## Componentes envolvidos
- `AICopilotView`
- `AISettingsModal`
- `DataConfidenceBadge`

## Dependências
- `UX_UI_01_DESIGN_SYSTEM`
- `UX_UI_02_ACCESSIBILITY_PRIMITIVES`

## Estratégia de implementação
1. **Segmentação da Interface:**
   - Adicionar estado `viewMode: 'analyze' | 'chat' | 'history'`.
   - Renderizar barra de abas secundária simples e intuitiva no topo da view.
2. **Quadro de Transparência de Dados:**
   - Montar card de contexto antes do relatório que resume as fontes consumidas na análise.
3. **Chat Responsivo:**
   - No modo 'Conversar', expandir o chat para a largura total do container, mantendo o histórico de mensagens rolável com indicador de mensagem da IA pensando (`animate-pulse`).
4. **Mobile Adaptability:**
   - Em telas pequenas (< 768px), cada modo ocupa 100% da largura útil sem divisão em duas colunas colapsadas.

## Estados e comportamento
- **Estado sem análise:** Exibe introdução amigável e botão para gerar a primeira síntese do período.
- **Estado gerando análise:** Barra de progresso ou indicador com texto informativo ("Sintetizando biomarcadores dos últimos 30 dias...").
- **Estado de erro de API:** Mensagem clara informando se a chave de API é inválida ou se houve falha de conexão, com link direto para abrir o `AISettingsModal`.

## Acessibilidade
- Anúncio de carregamento de mensagens via `aria-live="polite"`.
- Caixa de texto de envio de mensagem com label acessível (`aria-label="Mensagem para o Copiloto"`).
- Suporte a envio de mensagem com `Enter` (e quebra de linha com `Shift+Enter`).

## Responsividade
- Chat perfeitamente funcional em telas verticais de smartphones sem rolagem horizontal.
- Altura dinâmica baseada na viewport (`calc(100vh - 220px)` com mínimo de 480px).

## Testes
- Atualizar `AICopilotView.test.tsx` para cobrir a alternância entre os modos Analisar, Conversar e Histórico.
- Validar envio de mensagens, confirmação de privacidade e cancelamento.

## Critérios de aceite
- [ ] Divisão em 3 tarefas (Analisar, Conversar, Histórico) implementada.
- [ ] Eliminação da altura rígida `h-[650px]`.
- [ ] Painel de transparência de dados (fontes usadas, confiança, dados ausentes) exibido com o relatório.
- [ ] Chat funcional e legível em desktop e mobile.
- [ ] Testes automatizados passando sem regressões.

## Riscos
- Risco de usuários habituados ao chat e relatório lado a lado sentirem falta da visão simultânea em monitores ultralargos.
- Mitigação: em telas muito largas ($\ge 1280$px), permitir modo de tela dividida opcional ou atalho rápido entre os dois modos.

## Rollback
- Reversão do arquivo `AICopilotView.tsx` via Git.

## Checklist de conclusão
- [ ] Refatorar layout e modos de exibição em `AICopilotView.tsx`
- [ ] Implementar painel de transparência de dados da análise
- [ ] Adequar microcopy de IA e confiança
- [ ] Atualizar testes em `AICopilotView.test.tsx`
