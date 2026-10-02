# Plano UX/UI — UX_UI_20_AI_UX_SECOND_PASS_2.0.0

> **Título:** Segundo Passe de UX do Copiloto de IA: Proveniência, Transparência e Altura Adaptativa  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Aprimorar o módulo de IA com chat responsivo adaptativo, contadores quantitativos de proveniência (dias/registros utilizados), eliminação de autoridade médica indevida e política sóbria de emojis.

## Contexto da versão 2.0.0
A versão 2.0.0 dividiu a IA em Analisar, Conversar e Histórico. Contudo, o chat ainda usa altura semi-rígida e o painel de confiança é qualitativo demais.

## Problema
O usuário não sabe exatamente quantos registros de exame ou dias de sono a IA usou para formular a resposta, e botões exibem emojis festivos inconsistentes com a sobriedade clínica.

## Evidências
Uso de 'min-h-[520px] max-h-[75vh]' e botões com emojis '⚡', '🌙', '🎯', '🏋️'.

## Estado atual
3 abas funcionais implementadas com confirmação de consentimento externo.

## O que já foi resolvido
Divisão em 3 tarefas e modal de configurações com Windows Vault.

## O que permanece
Métricas quantitativas de insumos e adaptação dinâmica de viewport.

## Escopo
1. Substituir altura rígida do chat por flex-1 adaptativo à tela disponível.
2. Incluir contadores reais de proveniência ('14 exames de sangue, 30 noites de sono, 12 treinos analisados').
3. Substituir emojis por ícones Lucide consistentes.
4. Revisar microcopy para linguagem estritamente assistiva e integrativa.

## Fora de escopo
Alteração de prompts de backend ou integração com novos provedores LLM.

## Arquivos afetados
- frontend/src/components/AICopilotView.tsx
- frontend/src/components/AICopilotView.test.tsx

## Componentes envolvidos
AICopilotView, ConfirmDialog, StatusBadge

## Dependências
UX_UI_13_MODAL_MIGRATION_2.0.0, UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Refatorar contêiner flexível do chat e substituir strings de emoji por `<Sparkles>`, `<Activity>`, `<Moon>` do Lucide.

## Estados e comportamento
Transição suave entre modos Analisar, Conversar e Histórico com viewport ajustável.

## Acessibilidade
Área de rolagem do chat acessível por teclado com auto-scroll gerenciado.

## Responsividade
Chat utilizável sem rolagem dupla em telas de 667px a 1024px.

## Dark/Light
Balões de mensagem contrastados e sem sombras excessivas.

## Microcopy
'Síntese assistiva' em substituição a 'Inteligência Médica de Precisão'.

## Testes unitários
AICopilotView.test.tsx cobrindo envio de prompts sem emojis e renderização de proveniência.

## Testes E2E
visual-qa.spec.ts verificando ausência de quebras no chat.

## Visual QA
Comparativo visual do painel de transparência.

## Critérios de aceite
- Zero emojis como ícones de botões primários no Copiloto.
- Painel de transparência exibindo contagem quantitativa de dados utilizados.
- Chat dinâmico ocupando a altura útil sem cortes em laptops baixos.

## Riscos
Ajuste de scroll automático do chat ao receber mensagens longas.

## Rollback
Reversão das alterações em AICopilotView.tsx via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Planejamento Inicial | N/A | 02/10/2026 | Local | PENDING | Aguardando início da execução |

## Checklist de conclusão
- [ ] Implementação de código finalizada
- [ ] Testes unitários aprovados
- [ ] Testes E2E aprovados
- [ ] Validação visual realizada
- [ ] Evidências de execução registradas
- [ ] Homologação concluída
