# Pesquisa de mercado e oportunidades — Longevidade Hub

**Data:** 11/11/2026. **Objetivo:** identificar o que adicionar, aprimorar e retirar da experiência a partir de comunidades, produtos e repositórios, confrontando as ideias com o projeto atual.

## Método e limites

Pesquisa exploratória por buscas públicas e leitura de discussões no Reddit, páginas de produtos, READMEs do GitHub e fontes de saúde. Foram consultados r/longevity, r/Biohackers e r/Peptides, além de comunidades próximas. Não houve extração sistemática de todos os tópicos, contagem de frequência, entrevistas, testes dos aplicativos concorrentes ou análise completa de seus códigos. Os exemplos ilustram necessidades relatadas, não representam estatisticamente o mercado. Alguns posts divulgam produtos dos próprios autores. Recursos e preços podem mudar.

O confronto com o Hub usou HERMES, a validação A01–A19 e trechos dos fluxos de exames, resumo médico, check-in, experimentos e energia/circadiano. Não foram lidos dados pessoais nem o banco operacional. As recomendações são propostas; não foi feita validação clínica.

## Oportunidade principal

O Hub já reúne exames, wearables, intervenções, check-ins, N-of-1, CGM, treinamento e um resumo para consulta. O diferencial recomendado é facilitar a leitura conjunta do histórico, mantendo origem, privacidade e incerteza visíveis. Em [uma discussão do r/Biohackers](https://www.reddit.com/r/Biohackers/comments/1s2dxrv/how_are_you_all_actually_tracking_what_works/), o autor relata que seus dados estão separados entre planilha, wearable, CGM e PDF e que várias mudanças simultâneas dificultam interpretar o resultado. Outra [discussão sobre suplementos](https://www.reddit.com/r/Biohackers/comments/1sfx9ot/how_do_you_track_whether_your_supplements_are/) pergunta como combinar sintomas, exames e desempenho. São relatos de necessidade, não evidência de eficácia de intervenções.

O [r/longevity](https://www.reddit.com/r/longevity/) consultado é sobretudo um espaço de divulgação e debate de pesquisas; uma [discussão sobre modelos de descoberta de intervenções](https://www.reddit.com/r/longevity/comments/1x7c519/new_control_theory_framework_proposes_a_safer/) sugere interesse em distinguir mecanismos, evidência e intervenção. Isso inspira uma biblioteca de fontes com nível de estudo e limites, não um feed que transforme notícias em recomendações.

No [r/Peptides](https://www.reddit.com/r/Peptides/), a amostra inclui relatos de [reações após uso](https://www.reddit.com/r/Peptides/comments/1x608r2/weird_reaction_after_injecting/) e dúvidas sobre segurança. Em comunidade próxima, uma [discussão sobre planilhas](https://www.reddit.com/r/PeptideDiscussion/comments/1ptddoy/anyone_else_tracking_peptides_in_spreadsheets_and/) descreve dificuldade em relacionar datas, sintomas e mudanças. São autorrelatos sem confirmação; o valor para o produto é oferecer registro e comunicação ao profissional, não validar tratamentos.

## Comparação com produtos e projetos

| Referência | Recurso anunciado | Oportunidade no Hub e ressalva |
|---|---|---|
| [Soma — GitHub](https://github.com/mdportnov/soma) | Histórico de exames e medicamentos, faixas temporais de intervenções nos gráficos e revisão de importações. | Adicionar sobreposição de intervenções aos gráficos e revisão de resultados extraídos. Analisar licença e implementação antes de reutilizar código. |
| [HealthLog — GitHub](https://github.com/MBombeck/HealthLog) | PWA, dados em linha do tempo, prioridade de fontes e recursos de exportação. | Melhorar resolução de conflito por métrica e estudar instalação móvel. Seus recursos são autodeclarados; não foram testados. |
| [Allos — GitHub](https://github.com/FloorLamp/allos) | Histórico pessoal com documentos, exames e dados registrados em SQLite. | Consolidar documentos e contexto em uma visão navegável e auditável. |
| [Longevity OS — GitHub](https://github.com/colby-source/longevity-os) | Reúne exames, suplementos, peptídeos e wearable. | A agregação confirma o espaço de produto; não há motivo para copiar protocolos, escores ou integrações sem verificar evidência e segurança. |
| [Heads Up Health](https://headsuphealth.com/longevity-dashboard) | Gráficos conjuntos de dados clínicos e estilo de vida, com compartilhamento para profissionais. | Melhorar comparação temporal e compartilhamento delimitado; publicidade do fornecedor não comprova benefício clínico. |
| [InsideTracker](https://www.insidetracker.com/tour) | Exames seriados, wearable e orientações personalizadas. | Facilitar comparação entre coletas e explicar qualquer alvo com fonte, indicação e limites. |
| [Function Health](https://www.functionhealth.com/function-membership) | Painel de exames iniciais e nova coleta posterior, com apresentação longitudinal. | Uma lista pessoal de perguntas e exames para discutir pode ser útil; não criar frequência universal de exames. |

Essas páginas descrevem propostas dos fornecedores. Não houve comprovação independente de funcionamento, qualidade clínica, licença de uso de dados ou integração no ambiente do Hub.

## Adicionar

| Prioridade | Proposta | Entrega mínima e critério |
|---|---|---|
| P1 | Linha do tempo clínica integrada | Selecionar marcador e visualizar coletas, sintomas, intervenções e mudanças registradas no mesmo eixo. Mostrar fonte e datas; identificar períodos sobrepostos. A interface deve dizer que proximidade temporal não prova causa. |
| P1 | Revisão de importação de laudos | Criar prévia antes de salvar: nome do marcador, data, valor/unidade brutos, normalização, referência do laboratório, duplicatas e campos incertos. Confirmar manualmente; nenhum lote deve alterar dados sem revisão e backup aplicável. O projeto já tem entrada em lote e normalização: a proposta é completar a experiência de revisão, sem presumir que exista importação geral de PDF no navegador. |
| P1 | Registro contextual de sintomas e eventos | Enriquecer o check-in existente com eventos e observações vinculáveis a uma intervenção, horário e intensidade. Permitir exportação para consulta e registrar incerteza; não diagnosticar causalidade. |
| P2 | Evidência e perguntas para consulta | Associar uma anotação ou pergunta a exame/intervenção; guardar fonte, data, tipo de estudo e classificação de evidência revisável. Incluir no resumo médico quando solicitado. Evitar gerar uma conclusão clínica por votação de usuários. |
| P2 | Instalação móvel e operação com rede instável | Avaliar PWA com funcionamento claramente delimitado, cache sem dados clínicos sensíveis por padrão e fila explícita apenas se houver desenho de conflito e segurança. Não declarar suporte offline completo antes dos testes. |
| P2 | Portabilidade de dados | Evoluir a exportação para um pacote documentado, com esquema, valores e unidades originais e origem. Considerar criptografia de backup como melhoria separada após desenho de chaves e restauração; já existe backup e restauração isolada no projeto. |
| P3 | Alimentação simplificada | Se houver necessidade real, começar por importação CSV/JSON revisável com horário e macronutrientes, sem depender de catálogo proprietário. Definir unidade, origem, duplicidade e limites antes de integrar com gráficos. |

Para medicamentos e suplementos, o [NIH Office of Dietary Supplements](https://ods.od.nih.gov/HealthInformation/ODS_Frequently_Asked_Questions.aspx) recomenda manter um registro para compartilhar com profissionais e alerta para interações. Uma eventual base de interações exige fonte mantida, escopo e data; ausência de alerta não pode significar ausência de risco.

## Aprimorar o que já existe

1. **Exames:** comparar dois painéis lado a lado, exibir valor e referência de cada laboratório, unidade original e fonte, data e método quando disponíveis. A faixa de referência do laudo deve ser separada de qualquer alvo opcional. Incluir um teste de interface para cada marcador relevante, inclusive testosterona.
2. **N-of-1:** usar o rastreador existente para registrar hipótese, métrica escolhida antes do início, períodos, aderência, mudanças simultâneas e dados faltantes. Exibir limitações e tamanho da amostra; não apresentar correlação ou p-valor como prova de benefício individual.
3. **Copiloto e resumo:** permitir consultar a origem de cada afirmação e distinguir dado ausente de inferência. Mostrar quais campos serão enviados a provedor externo antes da chamada. O resumo Markdown/PDF já existe; adicionar referências e eventos relevantes mediante seleção.
4. **Proveniência e sincronização:** exibir, por métrica quando disponível, origem, horário, última atualização e motivo de eventual conflito. O relatório atual reconhece proveniência histórica parcial e estados parciais que ainda não cobrem todos os módulos.
5. **Ritmo circadiano e Energy Bank:** em `backend/app/routers/energy_circadian.py`, os horários padrão são 07:00 e 23:00; o campo de cafeína no check-in não é passado ao cálculo circadiano. Em `src/longevidade/calculators/circadian.py`, o texto afirma um efeito sobre VFC. Exibir horários informados e dados disponíveis, tratar ausência como ausência, explicar a fórmula e remover a afirmação causal automática. O Energy Bank já existe; exibir componentes e opção de ocultar o índice, deixando explícito que é uma estimativa própria.
6. **Privacidade e recuperação:** manter a autenticação separada e o acesso remoto via HTTPS; tornar mais fácil verificar backup e restauração. Separar funcionalidades locais de envios externos, com histórico de destino e consentimento adequado. A operação remota real e o cofre real ainda não foram validados pelo relatório existente.

## Remover ou reduzir

- **Retirar afirmações clínicas categóricas geradas pelo circadiano**, como a promessa atual sobre cafeína e VFC; preservar o registro de horários e reformular a orientação com contexto e incerteza.
- **Substituir a apresentação universal de “alvo ótimo”** por referência do laboratório e, quando houver alvo individual ou diretriz aplicável, identificação de fonte e contexto. O resumo atual classifica resultados com base em `optimal_target` e listas de direção em `src/longevidade/reports/doctor_briefing.py`; revisar com profissional antes de alterar interpretações clínicas. Preservar resultados e cálculos existentes durante a revisão.
- **Reduzir destaque de scores e números sem explicação**: PhenoAge, KDM e Energy Bank devem mostrar insumos, data e limitações e não prometer anos de vida ganhos. Uma [revisão sistemática de relógios baseados em indicadores clínicos](https://pubmed.ncbi.nlm.nih.gov/41678247/) identificou problemas de validação e risco de viés em muitos modelos; isso não determina, por si só, a validade de cada cálculo específico do Hub.
- **Não incorporar automaticamente protocolos de fóruns, prescrições, ajustes de dose, fornecedores ou calculadoras de aplicação.** O FDA descreve riscos e lacunas de segurança para algumas substâncias manipuladas, incluindo BPC-157; a observação é específica aos produtos e vias examinados, não uma classificação de todos os peptídeos. [FDA](https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks).

Estas propostas visam apresentações e automações potencialmente enganosas. Não há evidência nesta pesquisa para excluir telas, históricos ou dados existentes.

## Sequência sugerida

| Etapa | Conteúdo | Resultado verificável |
|---|---|---|
| 1 — confiança | Revisar textos circadianos, alvos e explicações de scores; inventariar fontes de cada indicador. | Estados sem dados e incerteza visíveis; revisão clínica pendente claramente indicada. |
| 2 — histórico conectado | Linha do tempo de exames, intervenções e sintomas; preservar proveniência. | Coletas e eventos em ordem, sem duplicação, com origem e aviso de associação. |
| 3 — entrada e consulta | Prévia de importação e comparação entre coletas; exportação selecionável para consulta. | Dados brutos preservados, duplicatas sinalizadas e PDF/Markdown coerentes em dados sintéticos. |
| 4 — conveniência | PWA e importação nutricional conforme interesse, após definir segurança e compatibilidade. | Operação, recuperação e conflitos testados em ambiente isolado. |

A pesquisa sugere prioridades; não substitui uma análise detalhada de implementação, testes de usabilidade com usuários nem validação clínica independente. Qualquer reconciliação histórica ou ingestão em lote no banco operacional requer o procedimento de backup do projeto e autorização aplicável.
