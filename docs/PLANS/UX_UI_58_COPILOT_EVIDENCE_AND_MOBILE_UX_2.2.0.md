# UX_UI_58 — Copilot Evidence & Mobile UX 2.2.x

## Metadata

- **Priority:** P1 (Fase 3 — Features Críticas)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_48, UX_UI_54
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§16 U22-P1-45..50, §38 UX_UI_58)
- **Affected files:**
  - `frontend/src/components/ai/EvidenceBlock.tsx`
  - `frontend/src/components/ai/EvidenceBlock.test.tsx`
  - `frontend/src/components/ai/CopilotHeader.tsx`
  - `frontend/src/components/ai/CopilotChat.tsx`
  - `frontend/src/components/ai/AnalysisPanel.tsx`
  - `frontend/src/components/AICopilotView.tsx`
  - `frontend/src/components/AICopilotView.test.tsx`
  - `docs/PLANS/UX_UI_58_COPILOT_EVIDENCE_AND_MOBILE_UX_2.2.0.md`

---

## 1. Problem

1. **Ausência de Segregação Epistemológica no Bloco de Evidência de IA (U22-P1-45):**
   - Os insights de inteligência artificial misturavam fatos biométricos mensurados, hipóteses correlacionais, recomendações clínicas e limitações metodológicas em blocos de texto únicos ou não diferenciados, criando risco de falsa precisão diagnóstica ou de que o usuário confunda uma inferência estatística com um fato clínico comprovado.
2. **Badge de Provedor e Modelo Visualmente Excessivo no Header (U22-P1-46):**
   - O cabeçalho do Copilot apresentava informações de provedor/modelo com destaque visual excessivo e concorrência com o aviso de privacidade externa e botões de ação rápida.
3. **Falta de Transparência nas Fontes e Janela Amostral dos Insights (U22-P1-47):**
   - O usuário não conseguia identificar com clareza quais fontes de dados (sono, HRV, RHR, CGM, exames laboratoriais) fundamentaram a síntese gerada pela IA, nem a janela temporal específica.
4. **Experiência Mobile Degradada no Chat do Copilot (U22-P1-48):**
   - O contêiner de mensagens do chat apresentava paddings rígidos para desktop, botão de envio desalinhado em telas pequenas e quebra visual dos chips de sugestão rápida.
5. **Perda de Foco do Teclado Pós-Envio de Mensagem (U22-P1-49):**
   - Ao submeter uma mensagem ou selecionar um chip de sugestão, o foco saía do campo de digitação, exigindo toques adicionais do usuário.
6. **Concorrência e Disparos Múltiplos nos Botões de Ação Rápida (U22-P1-50):**
   - Durante o processamento de sínteses (ex.: gerar insights de 30 dias), os botões rápidos permaneciam clicáveis, arriscando requisições paralelas concorrentes.
7. **Desalinhamento com Design System:**
   - Botões nativos `<button>` não padronizados e classes legadas de raio (`rounded-xl`, `rounded-lg`).

---

## 2. Evidence

- `EvidenceBlock.tsx`: Anteriormente unificava o texto do insight sem a taxonomia epistemológica quádrupla e sem rodapé com fontes de telemetria.
- `CopilotHeader.tsx`: Botões de análise rápida não utilizavam o componente `Button` do design system e não bloqueavam cliques redundantes durante chamadas ativas.
- `CopilotChat.tsx`: Chips de sugestão não possuíam rolagem horizontal otimizada em mobile e o foco do input era perdido após submissão.
- `AICopilotView.tsx`: Botões de fluxo primário usavam classes utilitárias brutas em vez de `Button`.

---

## 3. User impact

- **Segurança e Rigor Clínico:** O usuário e o profissional de saúde distinguem imediatamente o que é medição objetiva (ex: HRV reduziu 18ms), o que é correlação/inferência (estresse simpático residual tardio), a conduta sugerida e a limitação prudencial.
- **Rastreabilidade e Confiança:** O rodapé de evidência discrimina claramente as fontes de dados biométricos utilizadas (Oura, Zepp, exames clínicos, glicemia) e a janela amostral.
- **Fluidez em Dispositivos Móveis:** Layout responsivo completo, sugestões com rolagem suave por toque, campo de texto sempre focado após envio e ausência de travamentos por requisições concorrentes.

---

## 4. Scope

- Refatorar `EvidenceBlock.tsx`:
  - Implementar a grade de 4 camadas epistemológicas:
    1. `Dado Fisiológico Observado (Medido)` com ícone `Activity`.
    2. `Interpretação & Inferência Clínica` com ícone `Sparkles`.
    3. `Ação Sugerida (Conduta Prática)` com ícone `CheckCircle2`.
    4. `Limitação da Inferência` com ícone `ShieldAlert` e texto prudencial padrão.
  - Implementar rodapé de transparência com `Database`, listando fontes de telemetria e janela amostral (`U22-P1-47`).
- Atualizar `CopilotHeader.tsx`:
  - Conter visualmente o badge de modelo/provedor para dar prioridade à informação clínica (`U22-P1-46`).
  - Bloquear concorrência em botões de análise rápida enquanto `loading` estiver ativo (`U22-P1-50`).
  - Migrar os 3 botões de ação rápida para `Button` com variantes semânticas.
- Atualizar `CopilotChat.tsx`:
  - Otimizar layout mobile com paddings responsivos e sugestões em barra de rolagem horizontal com scrollbar oculta (`U22-P1-48`).
  - Preservar o foco no textarea/input após submissão de mensagens (`U22-P1-49`).
  - Alinhar todos os raios para `rounded-radius-*`.
- Atualizar `AICopilotView.tsx` e `AnalysisPanel.tsx`:
  - Migrar botões nativos para `Button` e padronizar raios de borda.
- Criar suíte de testes unitários `frontend/src/components/ai/EvidenceBlock.test.tsx` (2 testes cobrindo todas as camadas e fallbacks).
- Validar `frontend/src/components/AICopilotView.test.tsx` (11 testes mantidos 100% verdes).

---

## 5. Non-goals

- Alterar o backend de orquestração do LLM em `backend/app/services/ai_service.py` ou a criptografia das chaves de API.
- Modificar o fluxo de autorização modal de IA externa já validado na Fase 1.

---

## 6. Architecture & System Design

- **Taxonomia Epistemológica em 4 Níveis (U22-P1-45):**
  - Todo bloco de recomendação de IA deve segregar rigorosamente:
    1. *Fato Fisiológico*: Valor numérico ou série temporal extraída do banco de dados (ex: sono REM < 60 min).
    2. *Interpretação*: Hipótese correlacional clínica inferida pelo modelo.
    3. *Conduta*: Passo prático preventivo ou de higiene do sono/treino.
    4. *Limitação*: Ressalva sobre causalidade, artefatos de sensor e variáveis de confusão.
- **Gestão de Concorrência de Estado no Cabeçalho (U22-P1-50):**
  - Desativação explícita (`disabled={loading}`) com feedback visual translúcido em todos os gatilhos rápidos durante processamento de inferência.
- **Acessibilidade Móvel (WCAG 2.5.5 / 2.1.2):**
  - Alvos de toque adequados nos chips de recomendação e preservação de foco no input para digitação contínua.

---

## 7. Migration & Compatibility

- 100% retrocompatível com a API de insights existente (`Observation`, `Association`, `Recommendation`, `Limitation`, `insight_text`).
- Redução contínua de dívida técnica no Design System (`native.button`, `radius.non-token`).

---

## 8. Rollback plan

- Reverter os arquivos modificados em `frontend/src/components/ai/` e `AICopilotView.tsx`.

---

## 9. Assumptions & Constraints

- Quando a resposta do modelo não preencher campos estruturados isolados, o componente utiliza fallbacks heurísticos e aviso prudencial padrão de limitação observacional.

---

## 10. Security considerations

- Mantido o consentimento explícito prévio do usuário antes de enviar qualquer payload clínico para provedores externos de IA.

---

## 11. Performance & Scalability

- Renderização estritamente reativa sem recomputação de LLM no frontend.
- Scrollbar horizontal em CSS puro para os chips sem bibliotecas externas adicionais.

---

## 12. Testing strategy

- Testes no Vitest:
  1. `frontend/src/components/ai/EvidenceBlock.test.tsx`:
     - Renderização isolada das 4 camadas epistemológicas (Dado, Interpretação, Recomendação, Limitação).
     - Renderização de fontes de dados e período amostral.
     - Fallbacks de limitação e contexto quando o insight for minimalista.
  2. `frontend/src/components/AICopilotView.test.tsx`:
     - 11 testes cobrindo fluxo de consentimento externo, cancelamento, geração de relatórios e mensagens de chat.

---

## 13. Documentation impact

- Registro deste plano mestre em `docs/PLANS/UX_UI_58_COPILOT_EVIDENCE_AND_MOBILE_UX_2.2.0.md`.

---

## 14. Implementation checklist

- [x] Refatorar `EvidenceBlock.tsx` com segregação epistemológica quádrupla (U22-P1-45).
- [x] Adicionar rodapé de transparência com fontes e janela temporal (U22-P1-47).
- [x] Otimizar `CopilotHeader.tsx` contendo o badge de modelo e bloqueando concorrência (U22-P1-46, U22-P1-50).
- [x] Ajustar responsividade mobile e preservação de foco em `CopilotChat.tsx` (U22-P1-48, U22-P1-49).
- [x] Migrar botões nativos para `Button` e padronizar raios em `AICopilotView.tsx` e `AnalysisPanel.tsx`.
- [x] Criar suíte de testes unitários `EvidenceBlock.test.tsx`.
- [x] Validar suite de testes completa, TypeScript typecheck e auditoria de Design System.

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| Segregação quádrupla de evidência (Dado, Interpretação, Recomendação, Limitação) | Aprovado | `EvidenceBlock.test.tsx` ("renders all four epistemological tiers distinctly") |
| Exibição transparente de fontes e janela temporal | Aprovado | `EvidenceBlock.test.tsx` ("renders all four epistemological tiers distinctly") |
| Badge contido e bloqueio de concorrência no header | Aprovado | `CopilotHeader.tsx` (badge contido, `disabled={loading}`) |
| Responsividade e foco preservado no chat mobile | Aprovado | `CopilotChat.tsx` (`textareaRef.current?.focus()`, chips com overflow) |
| Zero regressões de Design System (`Delta <= 0`) | Aprovado | `npm run audit:design-system` (PASS / WARN baseline, native.button -1) |

---

## 16. Technical debt & Code smells resolved

- Resolvidas as pendências `U22-P1-45`, `U22-P1-46`, `U22-P1-47`, `U22-P1-48`, `U22-P1-49` e `U22-P1-50`.
- Redução de ocorrências de botões nativos e tokens não-padronizados de borda.

---

## 17. Operational runbook

- Nenhuma alteração operacional ou migração necessária no backend.

---

## 18. Audit log & Decision history

- **Decisão:** A adoção dos 4 blocos semânticos explícitos no `EvidenceBlock` foi projetada para cumprir as diretrizes éticas e de governança clínica, evitando a falsa impressão de que inferências probabilísticas de LLM sejam diagnósticos médicos determinísticos.

---

## 19. Open questions & Future work

- Na Fase 4, avaliar a inclusão de botão para exportação em PDF estruturado dos relatórios com as 4 camadas preservadas.

---

## 20. Approvals & Sign-off

- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §16 U22-P1-45..50, §38 UX_UI_58)
- **Medical / Governance Lead:** Aprovado (Conformidade com os padrões de transparência epistemológica de IA)
- **Status:** CONCLUÍDO
