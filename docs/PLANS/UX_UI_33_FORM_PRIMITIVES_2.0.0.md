# Plano UX/UI — UX_UI_33_FORM_PRIMITIVES_2.0.0

> **Título:** Primitives Canônicos de Formulários e Validação em Linha  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Criar catálogo de primitives de formulário (Field, Input, Select, Textarea, Checkbox) com labels vinculados, mensagens de erro em linha e suporte a inputMode='decimal'.

## Contexto da versão 2.0.0
Enquanto botões e modais foram padronizados, cada formulário do sistema (exames, check-in, suplementos, IA, perfil) estilizava seus próprios campos de input.

## Problema
Campos de texto com alturas, bordas e anéis de foco heterogêneos; teclados virtuais inadequados no mobile para campos numéricos.

## Evidências
Falta de primitive Field centralizado; dezenas de classes de input repetidas.

## Estado atual
Inputs manuais com Tailwind ad-hoc em cada componente.

## O que já foi resolvido
Botões padronizados com Button e IconButton.

## O que permanece
Padronização de inputs de formulário.

## Escopo
1. Criar frontend/src/components/ui/Input.tsx, Select.tsx, Textarea.tsx e FormField.tsx.
2. Adicionar suporte nativo a label, helperText, error e aria-describedby.
3. Aplicar em ManualEntryModal, AISettingsModal e PhysicalAssessmentsView.

## Fora de escopo
Migração para bibliotecas complexas como React Hook Form.

## Arquivos afetados
- frontend/src/components/ui/Input.tsx (Novo)
- frontend/src/components/ui/Select.tsx (Novo)
- frontend/src/components/ui/FormField.tsx (Novo)
- frontend/src/components/ui/index.ts
- frontend/src/components/ManualEntryModal.tsx

## Componentes envolvidos
FormField, Input, Select, ManualEntryModal

## Dependências
UX_UI_14_TOUCH_TARGET_AND_INTERACTION_TOKENS_2.0.0, UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Construir primitives reutilizáveis com forwardRef e exportar no index do UI.

## Estados e comportamento
Estados default, focus, hover, disabled e error com borda semântica vermelha.

## Acessibilidade
Label com htmlFor correspondente ao id do input; erro com id associado via aria-describedby.

## Responsividade
Altura mínima de 44px para toque móvel.

## Dark/Light
Superfície branca no light e slate-900 no dark.

## Microcopy
Mensagens de erro específicas em linha.

## Testes unitários
Input.test.tsx e FormField.test.tsx aprovados.

## Testes E2E
Playwright submetendo formulário manual.

## Visual QA
Revisão visual dos formulários em ambos os temas.

## Critérios de aceite
- Primitives de formulário criados e integrados nos modais principais.
- 100% dos inputs com labels acessíveis vinculados.

## Riscos
Incompatibilidade com handlers onChange existentes se tipagens divergirem.

## Rollback
Reversão dos primitives via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Vite Production Build | `npm run build` | 02/10/2026 16:45:40 | Windows 11 | Python 3.14.6 | PASS | ✓ built in 4.69s |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 16:45:49 | Windows 11 | Python 3.14.6 | PASS | 44 suites, 205 passed |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 16:46:02 | Windows 11 | Python 3.14.6 | PASS | 8 passed (iPhone SE, iPhone 14, iPad, Desktop) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
