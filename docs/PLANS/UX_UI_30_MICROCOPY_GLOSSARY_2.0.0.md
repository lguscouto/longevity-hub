# Plano UX/UI — UX_UI_30_MICROCOPY_GLOSSARY_2.0.0

> **Título:** Glossário de Microcopy Progressiva para Termos Clínicos e Analíticos  
> **Fase:** Fase 3 (P2 Polish)  
> **Prioridade:** P2  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Criar um glossário canônico de interface para termos técnicos complexos (PhenoAge, KDM, HRV, RMSSD, CGM, ApoB, N-of-1, etc.) com explicações progressivas.

## Contexto da versão 2.0.0
O produto apresenta termos altamente especializados que podem afastar usuários não técnicos se não houver explicações simples e contextuais.

## Problema
Dúvidas recorrentes sobre o significado de siglas médicas e se um valor mais alto é melhor ou pior.

## Evidências
Termos técnicos espalhados sem padronização de definições em tooltips.

## Estado atual
Disclaimers clínicos canônicos adicionados na v2.0.0.

## O que já foi resolvido
Avisos clínicos no rodapé e briefings médicos.

## O que permanece
Camada de tooltips informativos padronizados.

## Escopo
1. Criar docs/GLOSSARY.md com definições em linguagem leiga e técnica.
2. Implementar primitive <TermHelp term='...'> com tooltip acessível nos termos-chave.

## Fora de escopo
Substituir termos médicos universais por nomes inventados.

## Arquivos afetados
- docs/GLOSSARY.md (Novo)
- frontend/src/components/ui/TermHelp.tsx (Novo)
- frontend/src/components/PhenoAgeWidget.tsx
- frontend/src/components/LabResultsTable.tsx

## Componentes envolvidos
TermHelp, MetricCard, LabResultsTable, PhenoAgeWidget

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Criar dicionário estruturado e componente leve de ajuda com aria-describedby.

## Estados e comportamento
Tooltip abre no hover e no foco de teclado; fecha com Escape.

## Acessibilidade
WCAG 2.1 SC 1.4.13 Content on Hover or Focus.

## Responsividade
Tooltip adapta posição para não transbordar a tela no mobile.

## Dark/Light
Contraste correto.

## Microcopy
Definições curtas: 'O que é?', 'Por que importa?', 'Qual a referência?'.

## Testes unitários
TermHelp.test.tsx validando disparo e acessibilidade.

## Testes E2E
visual-qa.spec.ts verificando ausência de transbordamento.

## Visual QA
Inspeção visual dos balões de ajuda.

## Critérios de aceite
- Pelo menos 15 termos médicos/epigenéticos mapeados no glossário e instrumentados com TermHelp.

## Riscos
Tooltips cobrirem dados importantes em telas touch.

## Rollback
Reversão do componente TermHelp via Git.

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
