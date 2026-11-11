# Reavaliação do plano e análise inicial de UX/UI — 11/11/2026

Referência: [análise de 08/11/2026](analise-inicial-completa-2026-11-08.md). Estado inspecionado: commit `2df34b7`, com alteração preexistente no documento original. Esta avaliação não altera o plano nem o código da aplicação.

## Situação dos 19 itens

Classificações referem-se à evidência examinada, não à totalidade de todos os fluxos possíveis.

| Item | Situação | Evidência e pendência |
|---|---|---|
| A01 — unidades | Parcialmente implementado | `lab_parser.py` chama `normalize_clinical_inputs` e preserva `raw_value` e `raw_unit`. Ainda existe fallback para valor/unidade original quando não há resultado de normalização; a rejeição consistente de unidades desconhecidas e a equivalência em todos os caminhos não foram demonstradas. |
| A02 — idade presumida | Implementado no fluxo examinado | A rota usa `None`; a ingestão tenta nascimento, idade informada e perfil, e retorna incompleto quando ausente. |
| A03 — acesso à rede | Pendente | `run_app.bat` inicia com `ALLOW_LAN=1`, bind `0.0.0.0`; `--local` é opcional. Há controles para o portal do personal, mas não foi demonstrada autenticação geral de todos os endpoints. |
| A04 — segurança da IA | Não implementado conforme o plano | As respostas de chat e insights permanecem com `guardrail_applied: false`. O histórico registra remoção deliberada das travas; requer decisão de produto sobre o contrato desejado. |
| A05 — suplementos de exemplo | Implementado na inicialização normal | Os dados de exemplo foram movidos para `seed_demo_supplements`, função explícita para testes. |
| A06 — versão futura | Implementado no código | `apply_migrations` verifica versão superior ao máximo suportado antes das migrações. |
| A07 — design system | Parcial | Auditoria retorna `WARN`, sem regressão acima do baseline; ainda há 19 ocorrências de texto de 11 px, sete de 10 px e 126 botões nativos. O baseline foi atualizado, portanto passar pelo limite não significa remover a dívida. |
| A08 — E2E e prontidão | Parcial | O servidor tem URL de prontidão e o smoke passou. `task-flows.spec.ts` e `keyboard-navigation.spec.ts` ainda procuram nomes antigos de botões; esses arquivos não foram executados nesta reavaliação. |
| A09 — overflow de 320 px | Implementado na matriz executada | A matriz passou em 320 px nos dois projetos Playwright, com dados simulados. |
| A10 — regressão visual | Pendente | `visual-regression.spec.ts` continua gravando imagens e metadados sem comparação por pixels; pode substituir baselines. Não foi executado para preservá-los. |
| A11 — inicialização | Parcial | Existem `--build`, `--update` e tratamento de falha, mas o modo normal ainda compila apenas quando `dist` não existe; não foi observada detecção automática de fontes antigas. |
| A12 — backup e restauração | Parcial | Existe `src/longevidade/backup.py` com backup SQLite, verificação, ZIP e restauração; testes selecionados passaram. Restauração operacional, retenção e abrangência de todas as configurações não foram validadas. |
| A13 — credenciais | Parcial | Hevy evita fallback em arquivo quando o Keyring funciona; Google e Zepp ainda escrevem JSON. Nenhuma credencial real foi acessada. |
| A14 — falhas parciais | Parcial | Health check evoluiu para consultar o banco, mas `App.tsx` ainda converte algumas falhas em `[]` ou `null`, como N-of-1 e CGM. Não há evidência suficiente de diferenciação em todos os módulos. |
| A15 — concorrência e proveniência | Parcial | Sincronizações HTTP e agendada usam `file_sync_lock`. Não foi demonstrada rastreabilidade por campo em todas as fontes nem teste abrangente entre processos. |
| A16 — WAL e GET | Implementação presente; validação limitada | Inicialização configura WAL e biomarcadores persistem apenas quando solicitado. Não foi reproduzida toda a matriz de criação/reabertura de bancos nesta rodada. |
| A17 — documentação e mensagens | Pendente | Documentos históricos continuam descrevendo estado anterior e o cartão Sistema anuncia Gemini, Groq e Ollama. É necessária conferência do suporte real e revisão das afirmações. |
| A18 — distribuição e dependências | Parcial | Há `LICENSE` e `backend/requirements-lock.txt`; instalação limpa, uso consistente do lock e proveniência das mídias não foram verificados. |
| A19 — modularização | Parcial/contínuo | Houve novos módulos, mas não foi auditada a extração de todos os contratos e responsabilidades; é evolução contínua, sem critério binário demonstrado. |

## UX, interface e textos

A inspeção visual direta foi da tela Hoje em tema escuro, a 1440 × 900 e 320 × 700, com API simulada e estado vazio. Não representa uma auditoria completa de todas as telas, temas, dados reais, leitores de tela ou jornadas.

1. **Boa hierarquia no desktop:** cabeçalho, período, orientação e indicadores são distinguíveis; cartões diferenciam medição e modelo. A interface evita preencher os indicadores vazios com números fictícios.
2. **Área útil móvel:** a matriz registrou cabeçalho de 264 px em Hoje e 318 px em outras áreas na largura de 320 px. A navegação ocupa parcela relevante da primeira dobra; avaliar compactação e prioridade das ações.
3. **Navegação truncada:** em 320 px aparecem rótulos como `Interve...` e `IA e Co...`. Preservar nomes completos acessíveis e considerar navegação que permita identificar destinos visualmente.
4. **Idioma e estado:** a tela exibe `UNAVAILABLE` em Orientação Diária. Substituir por “Dados insuficientes” ou equivalente legível. O estado simulado também mostrou `Dados insuficientes (%)`; investigar o contrato de qualidade e ocultar o percentual quando indisponível. A observação depende do mock parcial e precisa ser repetida com respostas válidas de ausência de dados.
5. **Linguagem clínica:** textos como “Aterogenicidade de partículas, função de filtração glomerular e risco cardiometabólico” são precisos em intenção, mas densos. Sugestão: “Indicadores de colesterol, função dos rins e risco cardiovascular”, com explicação técnica acessível por ajuda contextual. Não reduzir precisão clínica nem apresentar metas genéricas como prescrição.
6. **Afirmações de privacidade:** “Seus dados ficam salvos com segurança” é ampla demais diante da configuração de rede e dos arquivos de credenciais. Explicar armazenamento local e condições de compartilhamento com redação correspondente às proteções efetivas.
7. **Legibilidade:** a auditoria registra microtextos de 10 e 11 px. Revisar tamanho e contraste em telas reais, sobretudo legendas, rótulos e estados; a avaliação visual não mede conformidade WCAG.
8. **Coerência de filtros clínicos:** respeitar as invariantes atuais do `AGENTS.md` para contadores, categorias e séries temporais; não foi validada nesta rodada a correspondência completa entre cada KPI e os cartões filtrados.

## Testes e limites

- Vitest: **450 passaram em 73 arquivos**, com aviso conhecido de canvas no jsdom.
- Playwright: **24 passaram**, smoke e matriz de viewport, Chromium e projeto mobile, com respostas de API sintéticas.
- Pytest selecionado: **7 passaram**, abrangendo normalização laboratorial, migrações e backup/restauração; uma depreciação de `TestClient` foi reportada. Uma primeira tentativa apontou nomes de teste inexistentes e não executou casos; foi substituída pela execução com os caminhos existentes.
- Auditoria de design: **WARN**, sem regra acima do baseline atual; não equivale a ausência de problemas.
- Não foram executados suíte Python completa, build completo, testes de todos os fluxos, comparação visual automatizada ou verificação da instalação operacional e de integrações autenticadas.

Prioridade sugerida: definir a fronteira de acesso e o contrato de IA; completar as garantias de unidade e idade nos diversos caminhos; corrigir os testes de teclado/fluxos e implantar comparação visual; depois revisar textos, legibilidade e ocupação do cabeçalho móvel.
