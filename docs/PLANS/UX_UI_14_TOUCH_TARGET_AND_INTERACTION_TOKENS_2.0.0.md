# Plano UX/UI — UX_UI_14_TOUCH_TARGET_AND_INTERACTION_TOKENS_2.0.0

> **Título:** Ajuste de Hitboxes Móveis e Tokens de Interação (Mínimo 44x44px)  
> **Fase:** Fase 1 (P0 Estrutural)  
> **Prioridade:** P0  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Eliminar divergência entre a documentação oficial (44x44px) e a implementação de botões compactos, garantindo área de toque mínima acessível sem distorcer o design.

## Contexto da versão 2.0.0
docs/DESIGN_SYSTEM.md prescreve área mínima de 44x44px em mobile. Contudo, IconButton e Button implementavam min-h-[32px] e min-h-[40px] sem padding compensatório.

## Problema
Usuários de dispositivos móveis (375px e 390px) enfrentam dificuldade de toque e cliques acidentais em botões de ação de tabelas e ícones de fechar.

## Evidências
IconButton.tsx define sm: 'min-h-[32px] min-w-[32px]', md: 'min-h-[40px] min-w-[40px]'.

## Estado atual
Parcialmente resolvido. Tamanho desktop adequado, mas mobile sem área de clique expandida invisível.

## O que já foi resolvido
Tokens base e classes min-h definidos.

## O que permanece
Área de toque inferior a 44px em variantes sm e md.

## Escopo
1. Ajustar IconButton.tsx e Button.tsx para garantir hitbox efetiva mínima de 44x44px no mobile via padding pseudo-elements (relative after:absolute after:inset-[-6px]) ou min-h-[44px] responsivo.
2. Auditar botões em LabResultsTable, WorkoutsTable e Header.

## Fora de escopo
Alterar o tamanho dos glifos SVG dos ícones Lucide.

## Arquivos afetados
- frontend/src/components/ui/IconButton.tsx
- frontend/src/components/ui/Button.tsx
- frontend/src/components/ui/IconButton.test.tsx

## Componentes envolvidos
IconButton, Button, Table action buttons

## Dependências
UX_UI_13_MODAL_MIGRATION_2.0.0

## Estratégia de implementação
Adicionar classe de touch target expandido em mobile (ex: `before:absolute before:inset-[-6px] before:min-w-[44px] before:min-h-[44px]`) sem alterar visual desktop.

## Estados e comportamento
Área de toque responsiva sem interferir no espaçamento visual entre botões vizinhos.

## Acessibilidade
WCAG 2.1 Target Size (Minimum) 2.5.8 (24x24 CSS px) e nível AAA (44x44 CSS px).

## Responsividade
Em mobile (<768px), todos os elementos clicáveis têm hit target >= 44px.

## Dark/Light
Transparente visualmente.

## Microcopy
Preservação estrita de aria-label em 100% dos IconButtons.

## Testes unitários
IconButton.test.tsx verificando presença da classe de hitbox expandida.

## Testes E2E
Playwright avaliando bounding box interativo em 375x667.

## Visual QA
Verificar ausência de deslocamento de layout.

## Critérios de aceite
- Zero controles interativos funcionais móveis com hitbox menor que 44x44px.
- IconButton e Button compatíveis com WCAG 2.1.
- 100% dos testes aprovados.

## Riscos
Sobreposição acidental de áreas de toque se botões estiverem muito próximos.

## Rollback
Reversão das classes de pseudo-elemento via Git.

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
