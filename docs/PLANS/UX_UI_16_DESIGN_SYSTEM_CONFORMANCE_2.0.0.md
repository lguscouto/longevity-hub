# Plano UX/UI — UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

> **Título:** Conformidade Transversal com Tokens do Design System  
> **Fase:** Fase 1 (P0 Estrutural)  
> **Prioridade:** P0  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Eliminar resíduos de estilos arbitrários (rounded-3xl, shadow-2xl, cores hexadecimais avulsas) alinhando o código ao docs/DESIGN_SYSTEM.md.

## Contexto da versão 2.0.0
Apesar dos tokens semânticos (radius-sm a xl, shadow-card/dialog) existirem, o código ainda contém cerca de 49 usos de rounded-3xl e 15 de shadow-2xl.

## Problema
Inconsistência visual em raios de curvatura e sombras entre telas recém-refatoradas e telas legadas.

## Evidências
49 usos de rounded-3xl e 15 usos de shadow-2xl encontrados na inspeção estática.

## Estado atual
Tokens configurados em tailwind.config.js, mas com adesão parcial.

## O que já foi resolvido
Tokens criados e testados em DesignTokens.test.tsx.

## O que permanece
Substituição nos componentes de negócio.

## Escopo
1. Mapear e substituir rounded-3xl por rounded-2xl (radius-lg) ou rounded-xl (radius-md) conforme a hierarquia de superfícies.
2. Substituir shadow-2xl por shadow-dialog nos modais e shadow-card nos cartões.
3. Remover cores hex inline em favor de tokens Tailwind.

## Fora de escopo
Alterar a paleta de cores corporativa.

## Arquivos afetados
- frontend/src/components/*.tsx
- frontend/src/components/ui/Modal.tsx
- frontend/tailwind.config.js

## Componentes envolvidos
Modal, Card, OverviewSection, MetricCard, PhenoAgeWidget

## Dependências
UX_UI_13_MODAL_MIGRATION_2.0.0

## Estratégia de implementação
Substituição cirúrgica orientada por busca estática, mantendo teste de tokens ativo.

## Estados e comportamento
Aparência mais sóbria e harmoniosa entre todos os módulos.

## Acessibilidade
Contraste preservado e sombras funcionais que não ofuscam o foco visual.

## Responsividade
Tokens proporcionais em todos os breakpoints.

## Dark/Light
Contraste correto garantido para superfícies 0 a 4.

## Microcopy
N/A.

## Testes unitários
Executar suíte DesignTokens.test.tsx e Card.test.tsx.

## Testes E2E
Executar visual-qa.spec.ts.

## Visual QA
Conferência visual de cards e modais.

## Critérios de aceite
- Zero usos não justificados de rounded-3xl e shadow-2xl.
- 100% dos cartões e modais usando tokens de elevação semânticos.
- Zero regressão visual.

## Riscos
Pequenas alterações visuais em layouts sensíveis.

## Rollback
Reversão das classes Tailwind via Git.

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
