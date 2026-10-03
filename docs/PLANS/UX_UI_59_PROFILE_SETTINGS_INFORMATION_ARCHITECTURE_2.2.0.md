# UX_UI_59 — Profile / Settings Information Architecture 2.2.x

## Metadata

- **Priority:** P1 (Fase 4 — Polimento Visual & Arquitetural)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_55
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§21 U22-P1-67..70, §38 UX_UI_59)
- **Affected files:**
  - `frontend/src/components/profile/ProfileTypes.ts`
  - `frontend/src/components/profile/ProfilePersonalSection.tsx`
  - `frontend/src/components/profile/ProfileIntegrationsSection.tsx`
  - `frontend/src/components/profile/ProfileSystemSection.tsx`
  - `frontend/src/components/ProfileView.tsx`
  - `frontend/src/components/ProfileView.test.tsx`
  - `docs/PLANS/UX_UI_59_PROFILE_SETTINGS_INFORMATION_ARCHITECTURE_2.2.0.md`

---

## 1. Problem

1. **Crescimento Monolítico e Sobrecarga de `ProfileView.tsx` (U22-P1-67):**
   - O arquivo `ProfileView.tsx` havia atingido mais de 629 linhas, aglutinando dados pessoais biométricos, edição cadastral, cartões de sincronização com wearables (Zepp, Google Health, Hevy), configurações de modelos LLM e infraestrutura SQLite em um único componente, dificultando a manutenção e a legibilidade.
2. **Mistura de Intenções e Configurações Técnicas no Fluxo Pessoal (U22-P1-68 / U22-P1-69):**
   - Configurações de provedores de IA externa (chaves BYOK de OpenAI, Anthropic, Gemini, Groq, Ollama) estavam renderizadas na mesma sub-área de sensores corporais e wearables, gerando confusão de categorias.
   - Diagnósticos de banco de dados, logs e pipelines de sincronização necessitam de segregação clara de intenção fora do perfil individual.
3. **Ausência de Persistência Confiável da Sub-Área Ativa (U22-P1-70):**
   - Ao navegar para uma sub-área específica do perfil (ex: Integrações ou Diagnóstico) e recarregar ou navegar pelo app, o estado era redefinido sem persistência versionada em `localStorage`.
4. **Desalinhamento com Design System e Tokens Semânticos:**
   - Uso residual de classes legadas (`glass-panel`, `glass-card`, `rounded-2xl`, `rounded-xl`) e seletores de sub-área sem semântica semântica completa de abas (`role="tablist"` / `role="tab"` / `aria-selected`).

---

## 2. Evidence

- `ProfileView.tsx` continha 629 linhas e 3 responsabilidades arquiteturais completamente divergentes.
- `glass-panel` e `glass-card` com estilos não tokenizados geravam dívida visual.
- Falta de suíte dedicada de testes unitários para a visualização de perfil.

---

## 3. User impact

- **Clareza e Densidade Reduzida:** O usuário encontra dados pessoais e biométricos imediatamente em "Meu Perfil", sem poluição de configurações avançadas de infraestrutura.
- **Segregação por Intenção:**
  - *Meu Perfil*: Dados antropométricos, idade, peso, metas e edição cadastral.
  - *Integrações*: Wearables, anéis, relógios e conectores externos (Zepp OS, Google Health v4, Hevy).
  - *Diagnóstico & Sistema*: Infraestrutura SQLite local-first, qualidade e cobertura de dados, histórico de pipelines e configurações avançadas de provedores LLM / privacidade.
- **Acessibilidade Plena:** Navegação por abas com conformidade ARIA (`role="tablist"`, `role="tab"`, `aria-selected="true"`, `aria-controls`, `role="tabpanel"`).
- **Continuidade de Sessão:** A sub-área selecionada é lembrada automaticamente entre recarregamentos via chave versionada `longevidade:profile_subtab:v1`.

---

## 4. Scope

- Extrair sub-componentes especializados no diretório `frontend/src/components/profile/`:
  - `ProfileTypes.ts`: Interfaces de dados, contratos de propriedades e tipo `ProfileSubTab`.
  - `ProfilePersonalSection.tsx`: Banner com avatar e badge de protocolo, grid de métricas biométricas e formulário modal de edição com validação.
  - `ProfileIntegrationsSection.tsx`: Cards de conectores Zepp OS, Google Health API v4 e Hevy, com gatilhos de sincronização via `Button`.
  - `ProfileSystemSection.tsx`: Base de dados local SQLite, soberania de dados, cartão de Provedores LLM / Privacidade (BYOK), `DataQualityPanel` e `PipelineStatusPanel`.
- Refatorar `ProfileView.tsx` como orquestrador limpo de ~120 linhas, eliminando classes legadas (`glass-*`) e migrando para tokens do Design System (`rounded-radius-xl`, `rounded-radius-lg`, `rounded-radius-md`).
- Implementar persistência versionada de estado (`longevidade:profile_subtab:v1`) com fallback seguro.
- Implementar semântica ARIA para navegação (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`).
- Criar suíte de testes unitários dedicada `ProfileView.test.tsx` com 6 cenários de teste cobrindo arquitetura de informação, edição, sincronização, diagnóstico e persistência.

---

## 5. Non-goals

- Alterar o esquema relacional de usuários no SQLite (`backend/app/db.py`).
- Mudar a API de sincronização com Zepp ou Google Health.

---

## 6. Architecture & System Design

- **Padrão Orquestrador + Seções de Alta Coesão (Single Responsibility Principle):**
  - `ProfileView` gerencia unicamente a navegação segmentada, persistência e roteamento interno.
  - Cada subseção (`ProfilePersonalSection`, `ProfileIntegrationsSection`, `ProfileSystemSection`) encapsula seu próprio estado de apresentação, formulários e integração visual.
- **Taxonomia de Intenção (U22-P1-68):**
  - `Meu Perfil` -> Foco no indivíduo e metas de longevidade.
  - `Integrações` -> Foco na captura e sincronização de telemetria de sensores corporais.
  - `Diagnóstico & Sistema` -> Foco na integridade da infraestrutura técnica, pipelines de dados e IA soberana.
- **Persistência Defensiva (U22-P1-70):**
  - Chave `longevidade:profile_subtab:v1` com tratamento de exceções em `try/catch` para ambientes isolados ou privados.

---

## 7. Migration & Compatibility

- Totalmente compatível com `App.tsx` e links diretos `#integrations` e `#system`.
- Todos os tipos continuam exportados a partir de `ProfileView.tsx`.
- Redução de complexidade ciclomática e linhas de código do orquestrador principal em 75%.

---

## 8. Rollback plan

- Restaurar `ProfileView.tsx` a partir do histórico Git e remover o diretório `frontend/src/components/profile/`.

---

## 9. Assumptions & Constraints

- A sincronização manual de wearables requer que o backend local esteja rodando e as credenciais válidas.

---

## 10. Security considerations

- Chaves de IA e configurações avançadas são mantidas no banco de dados local com isolamento e nunca expostas no fluxo de dados de perfil do usuário.

---

## 11. Performance & Scalability

- Componentes menores e focados resultam em reconciliações mais rápidas do Virtual DOM do React e menor tempo de renderização.

---

## 12. Testing strategy

- Testes no Vitest:
  1. `frontend/src/components/ProfileView.test.tsx`:
     - Renderização da aba "Meu Perfil" com estatísticas biométricas e Protocolo Ativo.
     - Abertura e cancelamento do modo de edição de perfil.
     - Submissão com sucesso do formulário atualizando `onUpdateProfile`.
     - Alternância para "Integrações" e execução de sincronização (Zepp / Google Health).
     - Alternância para "Diagnóstico & Sistema" e acionamento de configurações de IA.
     - Persistência e restauração da sub-aba a partir de `localStorage`.
  2. `frontend/src/App.test.tsx`:
     - Validação dos fluxos integrados de navegação e deep linking `#integrations` e `#system`.

---

## 13. Documentation impact

- Registro deste plano mestre em `docs/PLANS/UX_UI_59_PROFILE_SETTINGS_INFORMATION_ARCHITECTURE_2.2.0.md`.

---

## 14. Implementation checklist

- [x] Criar `frontend/src/components/profile/ProfileTypes.ts`.
- [x] Extrair `frontend/src/components/profile/ProfilePersonalSection.tsx`.
- [x] Extrair `frontend/src/components/profile/ProfileIntegrationsSection.tsx`.
- [x] Extrair `frontend/src/components/profile/ProfileSystemSection.tsx`.
- [x] Refatorar `frontend/src/components/ProfileView.tsx` com semântica de abas ARIA e persistência `longevidade:profile_subtab:v1`.
- [x] Eliminar classes legadas `glass-panel` e `glass-card` em favor dos tokens do Design System.
- [x] Criar suíte de testes unitários `frontend/src/components/ProfileView.test.tsx` (6 testes).
- [x] Validar suite de testes completa (`ProfileView.test.tsx`, `App.test.tsx`).

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| Modularização de `ProfileView` em subcomponentes por intenção | Aprovado | `ProfileTypes.ts`, `ProfilePersonalSection.tsx`, `ProfileIntegrationsSection.tsx`, `ProfileSystemSection.tsx` |
| Segregação clara entre Meu Perfil, Integrações e Sistema/IA | Aprovado | `ProfileView.test.tsx` (6 testes passando) |
| Persistência versionada da sub-aba ativa | Aprovado | `ProfileView.test.tsx` ("persists selected subtab in localStorage across sessions") |
| Semântica ARIA completa no seletor (`role="tablist"`, `role="tab"`) | Aprovado | `ProfileView.test.tsx` ("renders Meu Perfil tab by default...") |
| Zero regressões de Design System (`Delta <= 0`) | Aprovado | Verificado via `npm run audit:design-system` |

---

## 16. Technical debt & Code smells resolved

- Resolvidas as pendências `U22-P1-67`, `U22-P1-68`, `U22-P1-69` e `U22-P1-70`.
- Arquivo `ProfileView.tsx` reduzido de 629 para menos de 150 linhas.
- Remoção de classes decorativas legadas `glass-panel` e `glass-card` no domínio de perfil.

---

## 17. Operational runbook

- Nenhuma alteração operacional ou migração necessária no backend.

---

## 18. Audit log & Decision history

- **Decisão:** Mover o cartão de configuração avançada de IA/LLMs da aba de Integrações (wearables) para a aba de Diagnóstico & Sistema, garantindo que o usuário visualize apenas sensores e dados corporais reais na aba de Integrações.

---

## 19. Open questions & Future work

- Na próxima etapa de polimento (`UX_UI_60`), consolidar a migração das superfícies restantes (`surface-*`).

---

## 20. Approvals & Sign-off

- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §21 U22-P1-67..70, §38 UX_UI_59)
- **Architecture Lead:** Aprovado (Modularização limpa e redução de acoplamento)
- **Status:** CONCLUÍDO
