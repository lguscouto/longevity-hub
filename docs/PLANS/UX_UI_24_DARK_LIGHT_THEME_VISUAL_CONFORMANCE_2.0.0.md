# Plano UX/UI — UX_UI_24_DARK_LIGHT_THEME_VISUAL_CONFORMANCE_2.0.0

> **Título:** Conformidade Visual e Equivalência Perceptiva Dark/Light Mode  
> **Fase:** Fase 3 (P2 Polish)  
> **Prioridade:** P2  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Auditar e harmonizar as paletas clara e escura em todas as áreas, garantindo contraste mínimo de 4.5:1, bordas suaves e ausência de textos brancos 'fantasmas' no modo claro.

## Contexto da versão 2.0.0
prompt_correcao_tema_claro_longevidade_hub.md estabeleceu as bases do tema claro, mas resíduos de classes rígidas (ex: text-white sem variante dark:) ainda ocorrem em subpainéis.

## Problema
Componentes em modo claro podem apresentar contraste insuficiente ou bordas muito duras/invisíveis.

## Evidências
Ocorrências de classes rígidas text-white e bg-slate-900 sem contrapartida light.

## Estado atual
Alternância dinâmica funcional via ThemeContext.

## O que já foi resolvido
Estrutura de tokens CSS no index.css com color-scheme.

## O que permanece
Varredura fina de contraste módulo a módulo.

## Escopo
1. Auditar contraste WCAG em todos os 6 macroblocos no tema claro.
2. Substituir classes rígidas por pares Tailwind (ex: text-slate-900 dark:text-white).
3. Ajustar transparências de glassmorphism para legibilidade no fundo claro.

## Fora de escopo
Criação de novos temas de cores além de dark e light.

## Arquivos afetados
- frontend/src/components/*.tsx
- frontend/src/index.css

## Componentes envolvidos
Todos os componentes de visualização

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Inspeção sistemática com ferramenta de lint e testes visuais Playwright comparativos.

## Estados e comportamento
Transição suave e contraste rigoroso em ambos os modos.

## Acessibilidade
WCAG 2.1 AA: Contraste mínimo de 4.5:1 para texto normal e 3:1 para texto grande.

## Responsividade
Preservação em todos os tamanhos de tela.

## Dark/Light
Foco central deste plano.

## Microcopy
Preservação de textos.

## Testes unitários
ThemeContext.test.tsx aprovado.

## Testes E2E
visual-qa.spec.ts aprovado com testes de tema.

## Visual QA
Matriz de screenshots comparativos Dark vs Light arquivada.

## Critérios de aceite
- 100% dos textos com contraste verificado >= 4.5:1 em ambos os temas.
- Zero textos brancos invisíveis no tema claro.

## Riscos
Alteração acidental do tema escuro de referência.

## Rollback
Reversão das classes de tema via Git.

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
