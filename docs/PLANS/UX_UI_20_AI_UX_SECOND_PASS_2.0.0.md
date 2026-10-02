# Plano UX/UI — UX_UI_20_AI_UX_SECOND_PASS_2.0.0

> **Título:** Segundo Passe de UX do Copiloto de IA: Proveniência, Transparência e Altura Adaptativa  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

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
| Vite Production Build | `npm run build` | 02/10/2026 15:23:17 | Windows 11 | Python 3.14.6 (Commit a4245fc) | PASS | ✓ built in 5.12s (9.93s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 15:23:27 | Windows 11 | Python 3.14.6 (Commit a4245fc) | PASS | 36 test files passed, 175 tests passed (10.43s) |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 15:23:37 | Windows 11 | Python 3.14.6 (Commit a4245fc) | PASS | 8 passed (13.7s) (14.95s) |
| Backend Pytest Suite | `C:\Python314\python.exe -m pytest -q` | 02/10/2026 15:23:52 | Windows 11 | Python 3.14.6 (Commit a4245fc) | PASS | 357 passed, 3 warnings in 224.47s (226.11s) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
