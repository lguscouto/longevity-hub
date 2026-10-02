# Plano UX/UI — UX_UI_15_VALIDATION_EVIDENCE_2.0.0

> **Título:** Protocolo de Evidências Verificáveis e Telemetria de Testes  
> **Fase:** Fase 1 (P0 Estrutural)  
> **Prioridade:** P0  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Substituir marcações estáticas [x] por relatórios de telemetria rastreáveis com status PASS/FAIL, timestamps, ambiente, comandos executados e logs de saída.

## Contexto da versão 2.0.0
A reauditoria apontou que checklists preenchidos como concluídos devem ser sustentados por registros executáveis no repositório.

## Problema
Dificuldade de auditar se um critério foi aprovado por execução recente ou apenas planejado.

## Evidências
Apontamento na Seção 6 da reauditoria sobre necessidade de comprovantes formais.

## Estado atual
Documentação usa listas de markdown com checkboxes simples.

## O que já foi resolvido
Comandos de testes integrados existem no package.json.

## O que permanece
Estrutura padronizada de relatório de execução em cada plano.

## Escopo
1. Definir template de bloco de evidência de execução em docs/PLANS/.
2. Criar script de automação para registrar saídas dos testes de Vitest, Build, Playwright e Pytest com hash do commit.

## Fora de escopo
Criação de dashboards externos de CI/CD em nuvem.

## Arquivos afetados
- docs/PLANS/*.md
- docs/DESIGN_SYSTEM.md

## Componentes envolvidos
Documentação e tooling de teste

## Dependências
Nenhuma.

## Estratégia de implementação
Adicionar seção padronizada 'Evidências de Execução' com saída tabular de status, comando, data e código de saída.

## Estados e comportamento
Estático.

## Acessibilidade
Markdown legível com tabelas acessíveis.

## Responsividade
N/A.

## Dark/Light
N/A.

## Microcopy
Rótulos precisos: PASS, FAIL, NOT RUN, BLOCKED.

## Testes unitários
N/A.

## Testes E2E
N/A.

## Visual QA
N/A.

## Critérios de aceite
- Todos os planos gerados contêm a seção 'Evidências de execução'.
- Nenhuma conclusão é registrada sem comando e status correspondente.

## Riscos
Nenhum.

## Rollback
Reversão via Git.

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
