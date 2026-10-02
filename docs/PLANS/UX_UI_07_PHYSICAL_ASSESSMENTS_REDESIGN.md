# Plano UX/UI — UX_UI_07_PHYSICAL_ASSESSMENTS_REDESIGN

## Objetivo
Transformar o módulo de Avaliações Físicas (`PhysicalAssessmentsView.tsx`) de um formulário monolítico denso em um fluxo progressivo em etapas (Step-by-Step / Wizard) claro e resiliente, separando a captura de novos dados da visualização comparativa e da evolução histórica das medidas corporais.

## Problema
- `PhysicalAssessmentsView.tsx` concentra dezenas de campos de entrada (peso, gordura, massa muscular, circunferências, dobras cutâneas, upload de fotos, notas clínicas) em uma única tela extensa.
- O usuário enfrenta fadiga de preenchimento ("formulário gigante") e risco de perda de dados caso feche ou atualize a página acidentalmente.
- A comparação entre avaliações passadas e a criação de uma nova avaliação competem visualmente, gerando confusão sobre se o usuário está visualizando ou editando dados históricos.

## Evidências
- `frontend/src/components/PhysicalAssessmentsView.tsx`: grande quantidade de inputs dispersos em mais de 500 linhas de template.
- Auditoria de UX/UI v1.9.8: item `UX-P1-20`.

## Escopo
- Dividir a experiência em dois modos principais:
  1. **Evolução & Comparação (Visualização):**
     - Linha do tempo de avaliações físicas realizadas.
     - Gráfico comparativo de composição corporal (`BodyCompositionChart.tsx`).
     - Comparação lado a lado de fotos corporais (antes vs. depois).
  2. **Nova Avaliação (Fluxo em Etapas Guiado):**
     - **Etapa 1 — Dados Básicos:** Data da avaliação, peso corporal (kg), estatura e método de medição (bioimpedância, adipômetro, DXA).
     - **Etapa 2 — Medidas & Circunferências:** Cintura, quadril, tórax, braços, pernas (com indicações visuais anatômicas).
     - **Etapa 3 — Composição Corporal & Dobras:** % de gordura, massa magra, dobras cutâneas (se aplicável).
     - **Etapa 4 — Registro Fotográfico:** Upload de fotos (frente, costas, laterais) com pré-visualização segura local.
     - **Etapa 5 — Notas & Revisão:** Observações clínicas, resumo dos dados preenchidos e botão de confirmação para salvar.
- Implementar persistência automática de rascunho em `localStorage` durante o preenchimento da nova avaliação.
- Permitir navegação livre entre etapas anteriores e posteriores sem perda de dados digitados.

## Fora de escopo
- Alteração nos endpoints de backend de avaliações físicas (`/api/physical-assessments`).
- Mudança no formato de armazenamento de fotos criptografadas locais.

## Arquivos afetados
- `frontend/src/components/PhysicalAssessmentsView.tsx`
- `frontend/src/components/BodyCompositionChart.tsx`
- `frontend/src/components/PhysicalAssessmentsView.test.tsx`
- `docs/PLANS/UX_UI_07_PHYSICAL_ASSESSMENTS_REDESIGN.md`

## Componentes envolvidos
- `PhysicalAssessmentsView`
- `BodyCompositionChart`
- Primitives de formulário (`Button`, `Input`, `Card`)

## Dependências
- `UX_UI_01_DESIGN_SYSTEM`
- `UX_UI_02_ACCESSIBILITY_PRIMITIVES`

## Estratégia de implementação
1. **Componente de Indicador de Passos (Stepper):**
   - Barra de progresso visual com passos numerados e status (Concluído, Em andamento, Futuro).
2. **Hook de Rascunho Local (`useAssessmentDraft`):**
   - Salva automaticamente as alterações no `localStorage` a cada input preenchido.
   - Oferece opção "Deseja continuar a avaliação não finalizada?" caso haja rascunho salvo.
3. **Validação por Etapa:**
   - Feedback inline amigável caso campos obrigatórios essenciais (data, peso) não sejam informados.
4. **Resumo de Revisão Pré-Envio:**
   - Apresenta card sintético de conferência antes da gravação definitiva no backend.

## Estados e comportamento
- **Etapa ativa:** Campo atual com foco automático no primeiro input da etapa.
- **Rascunho salvo:** Indicador discreto "Rascunho salvo localmente às HH:MM".
- **Salvamento concluído:** Limpeza do rascunho e redirecionamento para a visão de evolução com feedback de sucesso.

## Acessibilidade
- Indicador de etapas com semântica adequada (`aria-current="step"`).
- Todos os inputs com tags `<label>` associadas explicitamente via `htmlFor`.
- Possibilidade de navegar entre as etapas via teclado.

## Responsividade
- Formulário 100% em coluna única em smartphones com inputs de largura total (`w-full`).
- Teclado virtual mobile com tipo de entrada numérico adequado (`inputMode="decimal"` para medidas e peso).

## Testes
- Atualizar `PhysicalAssessmentsView.test.tsx` para cobrir o fluxo de avanço entre etapas, edição de etapas anteriores e persistência do rascunho.
- Validar salvamento da avaliação completa via mock da API.

## Critérios de aceite
- [ ] Fluxo de nova avaliação estruturado em etapas sequenciais com barra de progresso.
- [ ] Rascunho persistido localmente sem perda de dados na navegação entre etapas.
- [ ] Separação clara entre o histórico comparativo e o fluxo de cadastro.
- [ ] Inputs com labels acessíveis e `inputMode="decimal"` nos campos numéricos.
- [ ] 100% dos testes automatizados passando.

## Riscos
- Risco de usuários que fazem inserção rápida de apenas 1 dado (ex: peso avulso) acharem o fluxo de 5 etapas muito longo.
- Mitigação: manter na Etapa 5 a possibilidade de salvar a qualquer momento após o preenchimento dos dados básicos da Etapa 1.

## Rollback
- Reversão do arquivo `PhysicalAssessmentsView.tsx` via Git.

## Checklist de conclusão
- [ ] Criar fluxo Stepper em `PhysicalAssessmentsView.tsx`
- [ ] Implementar persistência de rascunho
- [ ] Separar aba de histórico e comparação da aba de cadastro
- [ ] Atualizar testes em `PhysicalAssessmentsView.test.tsx`
