# Plano UX/UI — UX_UI_21_PHYSICAL_ASSESSMENTS_SECOND_PASS_2.0.0

> **Título:** Segundo Passe e Decomposição Modular de Avaliações Físicas  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Desacoplar o componente monolítico PhysicalAssessmentsView (~1931 linhas) em subcomponentes orientados a tarefas e unificar o Lightbox ao Design System.

## Contexto da versão 2.0.0
A versão 2.0.0 introduziu o Stepper Wizard de 5 etapas e rascunho persistido, mas concentrou toda a lógica em um único arquivo massivo.

## Problema
Dificuldade de manutenção, duplicação de portais de visualização de foto e risco de regressão ao modificar cálculos antropométricos ou upload de fotos.

## Evidências
PhysicalAssessmentsView.tsx possui ~1931 linhas e múltiplos estados internos acoplados.

## Estado atual
Wizard funcional com persistência no localStorage.

## O que já foi resolvido
Fluxo guiado de 5 etapas, persistência de draft e confirmação de deleção.

## O que permanece
Decomposição em subcomponentes e isolamento do Lightbox.

## Escopo
1. Extrair subcomponentes: AssessmentHistory, AssessmentComparison, AssessmentWizard (Steps 1 a 5), PhotoLightbox.
2. Migrar o portal de fotos para componente acessível com navegação por teclado (Escape, setas).
3. Manter 100% dos testes passando.

## Fora de escopo
Adição de novas medidas corporais ou alteração de fórmulas de Jackson-Pollock.

## Arquivos afetados
- frontend/src/components/PhysicalAssessmentsView.tsx
- frontend/src/components/physicalAssessments/*.tsx (Novos subcomponentes)
- frontend/src/components/PhysicalAssessmentsView.test.tsx

## Componentes envolvidos
PhysicalAssessmentsView e submódulos

## Dependências
UX_UI_13_MODAL_MIGRATION_2.0.0

## Estratégia de implementação
Extração modular incremental preservando contratos de props e estado de rascunho.

## Estados e comportamento
Comportamento idêntico para o usuário final, com isolamento de renderização e reatividade.

## Acessibilidade
Lightbox com anúncio de imagem anterior/próxima e foco preso enquanto aberto.

## Responsividade
Wizard com botões de navegação fixos no rodapé móvel.

## Dark/Light
Contraste correto em formulários e fundo escurecido no lightbox.

## Microcopy
Avisos claros de rascunho salvo e botões 'Próximo', 'Voltar' e 'Concluir'.

## Testes unitários
Testar individualmente cada etapa do wizard e a galeria de fotos.

## Testes E2E
mobile-audit.spec.ts cobrindo a aba physical-assessments.

## Visual QA
Revisão visual das 5 etapas no iPhone SE.

## Critérios de aceite
- PhysicalAssessmentsView.tsx reduzido para menos de 400 linhas (atuando como orquestrador).
- Lightbox acessível e desacoplado.
- 100% dos testes unitários mantidos e aprovados.

## Riscos
Possível desencontro de sincronização do rascunho durante a refatoração.

## Rollback
Reversão para a versão consolidada anterior via Git.

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
