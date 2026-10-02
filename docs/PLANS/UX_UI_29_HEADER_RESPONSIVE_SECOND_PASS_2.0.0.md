# Plano UX/UI — UX_UI_29_HEADER_RESPONSIVE_SECOND_PASS_2.0.0

> **Título:** Segundo Passe Responsivo do Header e Subnavegação Contextual  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Otimizar a altura útil do Header em smartphones (<768px), prevenindo sensação de 'dupla barra de navegação' e garantindo affordance de rolagem lateral.

## Contexto da versão 2.0.0
O Header organiza 6 macroáreas e uma barra secundária para Saúde/Intervenções/Perfil. Em telas pequenas verticais (667px), o cabeçalho consome cerca de 25% da tela.

## Problema
Altura vertical inicial reduzida para o conteúdo principal no mobile.

## Evidências
Uso de overflow-x-auto no-scrollbar na barra contextual sem indicadores laterais de rolagem.

## Estado atual
Navegação por 6 abas com subnavegação funcional.

## O que já foi resolvido
Eliminação de gradientes concorrentes e foco acessível.

## O que permanece
Compactação vertical em telas móveis e dicas visuais de scroll.

## Escopo
1. Reduzir padding e tamanho da marca no breakpoint mobile.
2. Adicionar máscara de gradiente de fade nas bordas da subnavegação para indicar scroll lateral.
3. Avaliar header colapsável ao rolar para baixo e reaparecendo ao rolar para cima.

## Fora de escopo
Alterar a taxonomia das 6 macroáreas.

## Arquivos afetados
- frontend/src/components/Header.tsx

## Componentes envolvidos
Header

## Dependências
UX_UI_14_TOUCH_TARGET_AND_INTERACTION_TOKENS_2.0.0

## Estratégia de implementação
Ajustar classes Tailwind responsivas no Header (`py-2 sm:py-3`).

## Estados e comportamento
Cabeçalho compacto ao rolar a página em mobile.

## Acessibilidade
Nenhum link ou botão escondido sem navegação por foco.

## Responsividade
Altura do cabeçalho reduzida em pelo menos 20% em viewports <768px.

## Dark/Light
Efeito de fade com cores semânticas do tema.

## Microcopy
Preservação de nomes das abas.

## Testes unitários
App.test.tsx e Header.test.tsx aprovados.

## Testes E2E
mobile-audit.spec.ts cobrindo viewports 375x667 e 390x844.

## Visual QA
Medição de pixels de altura útil recuperados no mobile.

## Critérios de aceite
- Altura do Header em mobile não superior a 110px incluindo subnavegação.
- Indicação visual clara de scroll lateral na subnavegação.

## Riscos
Barra de navegação sumir e desorientar o usuário se a rolagem não for bem calibrada.

## Rollback
Reversão das classes no Header via Git.

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
