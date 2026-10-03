# UX/UI 42 — IA/Copilot: Terceira Passada (separação, epistemologia e mobile)

## Metadata

- **Priority:** P1
- **Phase:** 4 — Feature UX
- **Status:** Concluído
- **Dependencies:** UX_UI_43 (vocabulário e semântica visual), UX_UI_41
- **Master:** UX21-P1-07, P1-08, P1-09, §105–§106, §138, §90
- **Affected files:** `AICopilotView.tsx` (reduzido de 1185 para 394 linhas), `ai/AnalysisPanel.tsx`, `ai/CopilotChat.tsx`, `ai/EvidenceBlock.tsx`, `ai/CopilotHeader.tsx`, `ai/ReportHistoryList.tsx`, `ai/AIPrivacyDialog.tsx`, `ai/types.ts`

## Problem

Uma única tela misturava execução de análise, resultado, chat, modelo, configuração e contexto (1185 linhas). Insights de IA não distinguiam observação, associação, hipótese e recomendação. Em mobile o chat ao lado do resultado ficava comprimido. 3 ocorrências com emoji em `AICopilotView`.

## Evidence

- Linhas de `AICopilotView.tsx` reduzidas de **1185** para **394** linhas (< 400 linhas).
- Zero emojis residuais no código (substituídos por prefixos canônicos `[Aviso]`, `[Erro]` e ícone `<Check />`).
- Subcomponentes modulares puros criados sob `frontend/src/components/ai/`:
  - `EvidenceBlock.tsx`: Estrutura epistemológica rigorosa (Observação Fisiológica · Conduta Recomendada · Limitação da Inferência · Dados Considerados) com selo "Gerado por IA".
  - `FormattedChatMessage.tsx`: Renderização Markdown com tabelas clínicas acessíveis (`caption sr-only`).
  - `CopilotChat.tsx`: Chat conversacional com `role="log"` e `aria-live="polite"`, scroll suave resiliente, retorno de foco após envio.
  - `AnalysisPanel.tsx`: Síntese de tendências, progresso dinâmico de 4 etapas, card de transparência e origem de dados fisiológicos (Observados · Modelos · Correlações).
  - `CopilotHeader.tsx`: Banner de IA com status de envio externo e seleção rápida de janela temporal.
  - `ReportHistoryList.tsx`: Histórico acessível de relatórios arquivados com ativação no painel.
  - `AIPrivacyDialog.tsx`: Modal acessível com foco gerenciado para consentimento de envio externo de IA.
  - `types.ts`: Tipos compartilhados, rótulos de modo de privacidade e janelas de análise.

## User impact

- Eliminação de risco epistemológico: o usuário tem clareza imediata do que é dado medido vs. recomendação vs. limitação de inferência.
- Experiência mobile de primeira classe: alternância em abas dedicadas (Analisar Tendências, Conversar com Copiloto, Histórico de Relatórios) sem compressão horizontal.
- Acessibilidade para leitores de tela: histórico de mensagens como `role="log"` com updates dinâmicos em `aria-live="polite"`.

## Acceptance criteria

- [x] `AICopilotView` < 400 linhas (394 linhas); zero emojis.
- [x] Todo insight com Observação/Limitação e selo IA (`EvidenceBlock`).
- [x] Mobile em coluna única validado (16/16 viewports PASS no Playwright).
- [x] Config de IA fora da tela de análise (modal dedicado + banner de aviso externo).

## Evidence of execution

1. **Vitest `AICopilotView.test.tsx` (11 testes 100% PASS):**
   ```text
   ✓ src/components/AICopilotView.test.tsx (11 tests) 1371ms
   Test Files 1 passed (1) | Tests 11 passed (11)
   ```
2. **Suíte completa Vitest (53 arquivos, 280 testes 100% PASS):**
   ```text
   Test Files 53 passed (53) | Tests 280 passed (280)
   Duration 14.76s
   ```
3. **Auditoria de Design System (zero FAIL, ratchet down executado):**
   ```text
   radius.non-token: reduzido de 476 para 447 (-29 violações)
   native.button: reduzido de 96 para 94 (-2 violações)
   Status global: PASS / EXCEPTION / WARN (zero FAIL)
   ```
4. **Vite Production Build (TypeScript + Bundler):**
   ```text
   ✓ 2378 modules transformed.
   ✓ built in 5.81s
   ```
5. **Pytest Backend Suite (357 testes 100% PASS):**
   ```text
   ================= 357 passed, 3 warnings in 230.26s =================
   ```
6. **Playwright Viewport Matrix (16 testes 100% PASS):**
   ```text
   16 passed (41.9s) cobrindo 8 viewports (320px até 1280px) em Chromium e Mobile
   ```

## Definition of Done

- [x] código + testes + e2e PASS
- [x] evidência registrada
