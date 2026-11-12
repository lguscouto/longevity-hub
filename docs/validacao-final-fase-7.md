# Validação final do Longevidade Hub — fase 7

O relatório confronta os achados A01–A19 registrados na análise inicial histórica de 08/11/2026 (documento removido) e na [reavaliação](reavaliacao-plano-ux-2026-11-11.md) com o plano aprovado. Os ensaios usaram bancos temporários, provedores simulados e fixtures de navegador. A instalação limpa com locks e a resposta HTTP do backend isolado foram verificadas na fase 6.

As situações e contagens abaixo registram a validação original da fase 7. O aditivo ao final registra a conclusão posterior da fase 5 e da fase 8 e atualiza o item A10.

| Item | Situação | Evidência e limite |
|---|---|---|
| A01 — unidades | Implementado nos caminhos cobertos | Normalização compartilhada, rejeição de unidades incompatíveis, valores brutos preservados e testes de equivalência. A cobertura não é exaustiva para todas as fórmulas e unidades. |
| A02 — idade | Implementado nos caminhos cobertos | Resolução na data da coleta, cenários com datas distintas e resultado incompleto quando falta idade válida. |
| A03 — acesso | Implementado e testado localmente | Matriz de proprietário/personal, sessão e logout, fotos, aliases, HTTPS, proxy e callbacks. Operação remota com proxy real não foi exercitada. |
| A04 — IA | Implementado conforme contrato aprovado | Chamada direta ao modelo, `guardrail_applied: false`, avisos de caráter informativo e limites do contexto. Respostas clínicas não foram avaliadas. |
| A05 — suplementos de exemplo | Implementado | A inicialização normal de banco vazio não insere suplementos fictícios. |
| A06 — versão futura | Implementado | Migrações recusam esquema futuro em banco temporário e preservam sua versão. |
| A07 — design system | Parcial | Auditoria encerra em WARN, sem aumento do baseline. Permanecem ocorrências registradas, incluindo controles nativos e texto pequeno. |
| A08 — E2E e prontidão | Validado nos cenários funcionais | Playwright inicia seu próprio Vite, espera a URL de prontidão e recusa porta ocupada. Seletores de teclado e fluxo usam nomes acessíveis atuais. Simulações de avaliações físicas incluem o campo de fotos. |
| A09 — responsividade | Validado nas matrizes | Largura de 320 px, desktop, teclado e ambos os temas exercitados com dados sintéticos. O rodapé da avaliação física empilha os botões em telas estreitas. Sem auditoria abrangente de acessibilidade. |
| A10 — regressão visual | Parcial na validação original | Comparação ativa e atualização explícita separada. Foram 2 aprovações e 22 diferenças nas 24 referências, que permaneceram intactas naquele momento. O aditivo abaixo registra a revisão e a conclusão subsequentes. |
| A11 — inicialização | Implementado | Build desatualizado detectado por fingerprint. Atualização usa os locks, com CI frontend em `npm ci`. O lock Python da execução Windows foi exercitado separadamente do CI Linux. |
| A12 — recuperação | Validado em ambiente isolado | Backup, verificação, restauração de banco e fotos, recusa de sobrescrita e retenção em simulação. Escopo e exclusões de configuração documentados. |
| A13 — credenciais | Implementado e testado por simulação | Google, Zepp e Hevy usam cofre para novas credenciais. Migração dos arquivos legados é opcional e preserva os originais. Cofre e credenciais do ambiente real não foram exercitados. |
| A14 — falhas parciais | Parcial | Estados de erro e sincronização parcial em rotas e telas revisadas. Registros sanitizados e reconciliação com diagnóstico. A cobertura de todos os módulos e provedores não foi demonstrada. |
| A15 — concorrência e proveniência | Parcial | Lock compartilhado testado entre processos. Repetição agendada do webhook após contenção, sem persistir conteúdo do evento. Sobrescritas invalidam a qualidade anterior por campo. Proveniência histórica permanece incompleta. |
| A16 — WAL e GET | Implementado nos caminhos testados | Configuração de WAL coberta pela suíte. Comparação de conteúdo SQLite antes/depois confirma ausência de escrita no GET derivado exercitado. |
| A17 — documentação e mensagens | Implementado no escopo | README, HERMES, acesso e operação descrevem os contratos revisados. As análises anteriores registram um estado histórico. |
| A18 — dependências e mídia | Parcial | Instalação limpa reproduzida com locks. Licença MIT do projeto e procedência externa verificadas. As imagens e GIFs de exercícios são carregados por URL externa. O titular aplica termos próprios à mídia externa. |
| A19 — modularização | Implementado no escopo | Alterações localizadas em conversão, autorização, reconciliação e sincronização. A modularização geral permanece trabalho contínuo. |

## Execuções

- Python: **484 aprovados**, com aviso de depreciação do TestClient.
- Vitest: **464 aprovados** em 77 arquivos. Build TypeScript/Vite aprovado.
- Auditoria de design: **WARN**, sem ocorrências acima do baseline.
- Playwright funcional: **94 aprovados**, nos projetos Chromium e mobile. Após o ajuste do rodapé, os quatro cenários específicos do formulário passaram novamente.
- Comparação visual original: **2 passaram, 22 divergiram**. Arquivos de referência foram preservados naquele ensaio. Na amostra móvel da tela Hoje, a inspeção confirmou mudanças no cabeçalho, na navegação e nos textos de ausência de dados. O resultado atualizado está no aditivo abaixo.

Comandos de reprodução no Windows. Execute os comandos npm a partir de `frontend`.

```powershell
.venv\Scripts\python.exe -m pytest -q --tb=short
npm run test:run
npm run build
npm run audit:design-system
npm run test:e2e -- --grep-invert "Comparação visual"
npm run test:visual
```

A verificação de recuperação e as simulações não cobrem o banco operacional, a execução real do agendador do usuário ou a precisão clínica das respostas e fórmulas. Veja [operação, backup e fontes](operacao-backup-e-fontes.md), [acesso e credenciais](acesso-e-credenciais.md) e os [termos das mídias na origem](https://github.com/hasaneyldrm/exercises-dataset#license).

## Aditivo — conclusão das fases 5 e 8 (11/11/2026)

Este aditivo atualiza somente os itens afetados e preserva acima o registro histórico da validação inicial da fase 7.

| Item | Situação atual | Evidência e limite |
|---|---|---|
| A10 — regressão visual | Concluído nas plataformas validadas | Baselines revisados, aprovados e separados por sistema operacional: 24 imagens para Windows e 24 para Linux. Comparação normal: 24/24 em cada plataforma. Hashes de 75 PNGs/manifestos permaneceram idênticos após as execuções sem atualização. |
| Fase 8 — Doctor Briefing | Concluída localmente no escopo do plano | Markdown e PDF incluem cobertura/origem, janelas de 7/30/90 dias, insumos de idade disponíveis, check-ins, intervenções, N-of-1 e perguntas. Perguntas foram exercitadas na cópia e no download; o backend valida formato e limites, envia PDF em memória e usa `no-store`. Os ensaios usam banco temporário e APIs simuladas; não são validação clínica. |

Validação atual após essas alterações: **487 testes Python aprovados**, **465 testes Vitest aprovados**, typecheck e build aprovados, **94 testes E2E funcionais aprovados** em Chromium e mobile, além das 48 comparações visuais aprovadas (24 por plataforma). A auditoria do design system permanece em **WARN**; reduziu duas ocorrências de raio não-token e uma ocorrência de tipografia de 10 px e de 11 px, sem elevar o baseline. O pytest reportou um aviso de depreciação do `TestClient`, sem falhas.

O CI remoto não foi executado nesta conclusão, e nenhuma alteração foi publicada. A execução Linux local usou `mcr.microsoft.com/playwright:v1.64.1-noble`, a mesma imagem definida no workflow.
