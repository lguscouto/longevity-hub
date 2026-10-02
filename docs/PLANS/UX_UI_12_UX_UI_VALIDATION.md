# Plano UX/UI — UX_UI_12_UX_UI_VALIDATION

## Objetivo
Estabelecer o protocolo final de controle de qualidade, validação visual e homologação técnica (Definição de Pronto / Definition of Done) para todas as melhorias de UX/UI introduzidas no Longevidade Hub, combinando testes automatizados ponta-a-ponta, auditoria em múltiplos viewports, verificação de contraste em tema claro e escuro, navegação assistida por teclado e inspeção visual comparativa com screenshots de referência.

## Problema
- Na auditoria inicial, as dependências do ambiente não permitiam validação interativa completa em tempo real, exigindo que as conclusões fossem baseadas em inspeção de código estático e screenshots históricos.
- Risco de que alterações visuais isoladas acumulem pequenos desalinhamentos ou perdas de contraste imperceptíveis em testes unitários, que só se revelam quando a aplicação roda integrada em resoluções reais de tela.
- Necessidade de comprovação empírica de que os objetivos do Master Brief foram atingidos (redução de carga cognitiva, legibilidade em ambos os temas, ausência de quebras no mobile e retenção de 100% dos dados).

## Evidências
- Seções 48, 53, 54 e 64 do Master Brief `CODEX_LONGEVIDADE_HUB_1.9.8_MASTER_UX_UI_PLANNING.md`.
- Suítes de teste de integração em `frontend/e2e/smoke.spec.ts` e `frontend/e2e/mobile-audit.spec.ts`.

## Escopo
- **Execução da Matriz Transversal de Homologação (12 Áreas × 8 Dimensões):**

| Área / Módulo | Desktop ($\ge 1280$) | Mobile (375 & 390) | Teclado / Focus | Dark Mode | Light Mode | Estado Vazio | Tratamento de Erro | Estado de Loading |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Navegação (Header)** | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| **Hoje (Overview)** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Linha do Tempo** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Treinos** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Exames & PhenoAge** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Suplementos & Hormônios** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Sono** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **IA & Copiloto** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **N-of-1 Tests** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Avaliações Físicas** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Perfil & Integrações** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Modais & Diálogos** | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |

- **Verificação de Acessibilidade Automatizada:**
  - Auditar contraste cromático (mínimo 4.5:1 para texto normal, 3:1 para títulos).
  - Validar ausência de traps de teclado em todos os modais.
  - Assegurar que nenhuma tela apresente barra de rolagem horizontal descontrolada no body.
- **Registro de Screenshots de Homologação:**
  - Capturar imagens de alta resolução em navegador automatizado via Playwright para comparação antes e depois em `docs/screenshots/after_redesign/`.

## Fora de escopo
- Homologação de dispositivos físicos reais de laboratório (smartwatches ou fitas de bioimpedância); a validação cobre a interface web React do Longevidade Hub.

## Arquivos afetados
- `frontend/e2e/visual-qa.spec.ts` (Novo teste Playwright de homologação visual)
- `frontend/e2e/mobile-audit.spec.ts`
- `frontend/e2e/smoke.spec.ts`
- `docs/screenshots/`
- `docs/PLANS/UX_UI_12_UX_UI_VALIDATION.md`

## Componentes envolvidos
- Toda a árvore de componentes em `frontend/src/`

## Dependências
- `UX_UI_00` até `UX_UI_11` (plano final de fechamento e verificação).

## Estratégia de implementação
1. **Script de Homologação Visual Playwright:**
   - Criar `visual-qa.spec.ts` iterando por todas as rotas em Dark e Light mode, salvando screenshots de tela cheia.
2. **Checagem de Contraste e Elementos Inválidos:**
   - Executar varredura DOM via `page.evaluate()` para detectar texto com tamanho inferior a 11px em elementos sem atributo decorativo.
   - Verificar ausência de elementos vazando além da largura da janela (`scrollWidth > innerWidth`).
3. **Validação de Redes Falsas:**
   - Garantir que a aplicação roda estritamente offline/local-first, sem chamadas externas não autorizadas vazando para a internet (`evidence.externalRequests === []`).

## Estados e comportamento
- Uma melhoria UX/UI só é dada como aprovada quando todos os itens da matriz transversal forem inspecionados sem inconformidades críticas.

## Acessibilidade
- Aprovação no teste de navegação pura por teclado: usuário deve conseguir operar o app do início ao fim usando apenas `Tab`, `Shift+Tab`, setas, `Enter`, `Space` e `Escape`.

## Responsividade
- Aprovação formal e documentada em 375×667, 390×844, 768×1024 e 1280×800.

## Testes
- Bateria completa de testes automatizados:
  ```powershell
  # 1. Testes unitários e componentes
  npm run test:run

  # 2. Tipagem e compilação de produção
  npm run build

  # 3. Testes ponta a ponta e auditoria móvel
  npm run test:e2e
  ```

## Critérios de aceite
- [ ] 100% dos testes unitários (Vitest) aprovados.
- [ ] 100% dos testes E2E (Playwright) aprovados em desktop e mobile.
- [ ] Compilação de produção (`tsc && vite build`) com zero erros ou avisos graves.
- [ ] Zero overflow horizontal em todas as 10 áreas do produto.
- [ ] Ambas as paletas (Dark e Light Mode) auditadas com legibilidade e contraste adequados.
- [ ] Documentação de screenshots pós-redesign arquivada no repositório.

## Riscos
- Risco de pequenas variações de renderização de fontes entre sistemas operacionais (Windows vs. macOS vs. Linux).
- Mitigação: usar tipografia com fallback robusto no CSS (`font-sans` referenciando `Inter, system-ui, -apple-system, BlinkMacSystemFont`).

## Rollback
- Reversão controlada via Git de qualquer alteração visual que reprove nos critérios de aceite.

## Checklist de conclusão
- [ ] Executar suíte de testes Vitest
- [ ] Executar suíte de testes Playwright E2E
- [ ] Executar auditoria de contraste em Dark e Light mode
- [ ] Capturar e arquivar screenshots comparativos
- [ ] Assinar homologação do plano mestre de UX/UI
