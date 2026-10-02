# Plano UX/UI — UX_UI_30_MICROCOPY_GLOSSARY_2.0.0

> **Título:** Glossário de Microcopy Progressiva para Termos Clínicos e Analíticos  
> **Fase:** Fase 3 (P2 Polish)  
> **Prioridade:** P2  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Criar um glossário canônico de interface para termos técnicos complexos (PhenoAge, KDM, HRV, RMSSD, CGM, ApoB, N-of-1, etc.) com explicações progressivas.

## Contexto da versão 2.0.0
O produto apresenta termos altamente especializados que podem afastar usuários não técnicos se não houver explicações simples e contextuais.

## Problema
Dúvidas recorrentes sobre o significado de siglas médicas e se um valor mais alto é melhor ou pior.

## Evidências
Termos técnicos espalhados sem padronização de definições em tooltips contextuais.

## Estado atual
Glossário canônico estruturado criado em `docs/GLOSSARY.md` e componente acessível `<TermHelp>` implementado com dicionário tipado e integrado aos principais painéis do produto.

## O que já foi resolvido
1. Criação de `docs/GLOSSARY.md` com 18 verbetes canônicos detalhando "O que é?", "Por que importa para a longevidade?" e "Direção Ótima / Alvo".
2. Criação do componente e dicionário `frontend/src/components/ui/TermHelp.tsx` com acessibilidade WCAG 2.1 SC 1.4.13, suporte a teclado (`Tab` e `Escape`), `role="tooltip"`, `aria-describedby` e contenção responsiva contra transbordamento.
3. Instrumentação de `PhenoAgeWidget.tsx`: tooltips integrados para `phenoage` e `kdm`.
4. Instrumentação de `MetricCard.tsx` e `App.tsx`: tooltips integrados para `rhr` (FC Repouso), `hrv` (VFC / RMSSD), `vo2max` (VO₂ Máx), `sleep_efficiency` (Sono Total) e `respiratory_rate` (Taxa Respiratória).
5. Instrumentação de `CGMDashboard.tsx`: tooltips integrados para `cgm`, `mean_glucose` (Glicemia Média 24h) e `tir` (Time-In-Range).
6. Instrumentação de `LabResultsTable.tsx`: tooltips integrados para `apob` (Razão ApoB / ApoA1 e cards individuais de biomarcadores).
7. Testes unitários dedicados em `TermHelp.test.tsx` (5 testes aprovados) e suíte completa Vitest com 45 arquivos e 211 testes aprovados.

## O que permanece
Nada pendente neste plano.

## Escopo
1. Criar docs/GLOSSARY.md com definições em linguagem leiga e técnica.
2. Implementar primitive <TermHelp term='...'> com tooltip acessível nos termos-chave.

## Fora de escopo
Substituir termos médicos universais por nomes inventados.

## Arquivos afetados
- docs/GLOSSARY.md (Novo)
- frontend/src/components/ui/TermHelp.tsx (Novo)
- frontend/src/components/ui/TermHelp.test.tsx (Novo)
- frontend/src/components/ui/index.ts
- frontend/src/components/PhenoAgeWidget.tsx
- frontend/src/components/MetricCard.tsx
- frontend/src/components/LabResultsTable.tsx
- frontend/src/components/CGMDashboard.tsx
- frontend/src/App.tsx

## Componentes envolvidos
TermHelp, MetricCard, LabResultsTable, PhenoAgeWidget, CGMDashboard, App

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
Contraste correto verificado.

## Microcopy
Definições curtas: 'O que é?', 'Por que importa?', 'Qual a referência?'.

## Testes unitários
TermHelp.test.tsx validando disparo e acessibilidade.

## Testes E2E
visual-qa.spec.ts verificando ausência de transbordamento.

## Visual QA
Inspeção visual dos balões de ajuda.

## Critérios de aceite
- Pelo menos 15 termos médicos/epigenéticos mapeados no glossário e instrumentados com TermHelp. (18 termos mapeados)

## Riscos
Tooltips cobrirem dados importantes em telas touch.

## Rollback
Reversão do componente TermHelp via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Vite Production Build | `npm run build` | 02/10/2026 17:23:50 | Windows 11 | Python 3.14.6 (Commit cd2418c) | PASS | ✓ built in 5.33s (10.54s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 17:24:01 | Windows 11 | Python 3.14.6 (Commit cd2418c) | PASS | 45 arquivos de teste aprovados, 211 testes unitários PASS (12.40s) |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 17:24:13 | Windows 11 | Python 3.14.6 (Commit cd2418c) | PASS | 8 passed (Dark & Light em iPhone SE, iPhone 14, iPad, Desktop) (17.75s) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
