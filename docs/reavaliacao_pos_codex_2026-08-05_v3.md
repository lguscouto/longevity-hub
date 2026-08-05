# Nova reavaliação após mudanças do Codex — Longevidade Hub

**Data da execução:** 05/08/2026 13:03 (America/Sao_Paulo)
**Branch:** `master`
**HEAD avaliado:** `9094c07` — `fix(audit): resolve residual findings from reavaliacao_pos_codex_2026-08-05_v2.md`
**Base de comparação:** `59ffa89`
**Relatório anterior:** `docs/reavaliacao_pos_codex_2026-08-05_v2.md`

## 1. Veredito executivo

A hipótese de que tudo foi corrigido **não se confirma**.

O commit `9094c07` corrigiu vários problemas importantes e os comportamentos mais perigosos da avaliação anterior, especialmente:

- a orientação diária agora bloqueia o caso sem qualquer sinal fisiológico atual;
- um único sinal atual não produz mais recomendação de treino intenso;
- o Energy Bank bloqueia o caso em que toda a atividade está ausente;
- endpoints GET auditados não criam nem migram o banco;
- a orientação não usa dados futuros;
- períodos N-of-1 invertidos agora são rejeitados;
- o marcador laboratorial fora da referência agora é classificado como fora da referência;
- o endpoint de saúde deixou de expor o caminho absoluto do banco em runtime;
- os testes de isolamento de banco foram melhorados;
- build, testes frontend, E2E e execução integrada continuam funcionando.

Ainda permanecem defeitos relevantes:

1. **Energy Bank ainda converte ausência parcial de atividade em zero.** Com passos presentes e carga de treino ausente, ou carga de treino presente e passos ausentes, o sistema retorna `status="ok"`, nível 100 e recomenda atividades exigentes.
2. **N-of-1 ainda aceita períodos sobrepostos.** Um experimento sintético com o dia de fronteira nos dois períodos retornou HTTP 200, foi persistido e produziu resultado estatisticamente significativo.
3. **A orientação permite treino intenso com cobertura fisiológica incompleta de 2/3 sinais.** O caso VFC + RHR sem sono resultou em `score=95` e recomendação intensa. Isso precisa ser uma decisão de contrato explícita; não está documentado como requisito mínimo.
4. **A qualidade Zepp continua parcialmente sintética.** Um único valor agregado gera `coverage_pct=100`; passos recebem `sample_count=1440` sem 1.440 observações disponíveis.
5. **O contrato de idade do Doctor Briefing continua usando sentinelas numéricas.** Uma idade explícita de 40 anos é descartada e substituída pelo perfil/fallback.
6. **O PDF mantém alvos fisiológicos hard-coded**, sem demonstrar que são metas individualizadas ou apropriadas ao paciente.
7. **A duração genérica de treino continua semanticamente ambígua.** Campos com unidade explícita funcionam, mas `duration=120` ainda não informa se são segundos ou minutos.
8. **Autosave e acessibilidade do frontend continuam incompletos.** O refresh pós-check-in existe, mas não há fila/serialização/rollback para respostas fora de ordem; controles de energia, tags e modais ainda não têm semântica completa.
9. **A documentação ainda diverge do runtime.** `GET /api/health` não retorna caminho do banco, mas a documentação diz que retorna; os endpoints de orientação, energia, qualidade e check-in não estão descritos na referência da API.
10. **Foi observado ciclo de vida frágil das conexões SQLite no Windows.** O `TemporaryDirectory` não conseguiu remover o banco enquanto conexões criadas pelo repositório ainda estavam vivas (`WinError 32`); a limpeza só funcionou após coleta de lixo.

Portanto, o produto continua classificado como **dashboard experimental de acompanhamento**, não como sistema clínico nem como recomendador confiável de treino, recuperação ou energia.

## 2. Escopo e método

A avaliação preservou o código-fonte e não utilizou o banco, fotos, relatórios ou credenciais reais do usuário.

Foram usados:

- comparação Git entre `59ffa89` e `9094c07`;
- leitura dos algoritmos, routers, componentes e testes relacionados às pendências da v2;
- SQLite temporário em todos os probes que usaram backend;
- fixtures sintéticas para Zepp, laboratório e N-of-1;
- testes Python, Vitest, build React e Playwright;
- servidor FastAPI temporário em `127.0.0.1:8899`;
- validação posterior de que a porta `8899` ficou livre;
- nenhuma alteração funcional no código.

O servidor do usuário em `127.0.0.1:8887` estava ativo durante a auditoria e não foi reiniciado, alterado ou encerrado.

## 3. Mudanças encontradas desde a v2

O diff `59ffa89..9094c07` alterou 14 arquivos, principalmente:

- `daily_guidance.py` e o router correspondente;
- `energy_and_stress.py` e o router de energia;
- router de check-in;
- router N-of-1;
- router de qualidade;
- `DailyCheckinCard.tsx`;
- Doctor Briefing;
- testes de orientação, energia e isolamento;
- `main.py`;
- o relatório v2.

Não houve alteração no motor de correlações, no importador Zepp, no PDF do Doctor Briefing, no parser genérico de duração ou na documentação da API que resolvesse as pendências correspondentes.

## 4. Validações executadas

| Verificação | Resultado observado |
|---|---|
| Backend Python | **114 passed** em 28,22 s |
| Vitest | **36 passed** em 11 arquivos |
| Build React/Vite | sucesso; TypeScript e Vite concluídos |
| Playwright E2E | **4 passed** |
| FastAPI standalone | startup concluído; `GET /` HTTP 200 |
| FastAPI `/api/health` | HTTP 200; `database_connected=true`; sem caminho absoluto |
| FastAPI daily guidance sem dados | `state=insufficient_data`, `score=null` |
| FastAPI energy sem dados | `status=unavailable`, `current_level=null` |
| Correlações | 19 pares: 0 resultados; 20 pares: 1 resultado |
| Hash de banco antes/depois de 14 GETs | inalterado |
| GETs após remoção manual do SQLite | retornaram 200 sem recriar o arquivo |
| Porta temporária `8899` após encerramento | livre |
| Porta E2E `3030` após encerramento | livre |
| `git diff --check 59ffa89..9094c07` | passou |
| Worktree antes da criação deste relatório | limpo |

Os testes verdes não são considerados prova suficiente de correção porque ainda não cobrem os cenários negativos descritos abaixo.

## 5. Probes comportamentais críticos

### 5.1 Orientação diária

Com oito dias de histórico sintético e valores de baseline estáveis:

| Sinais atuais | Estado | Confiança | Score | Ação principal |
|---|---|---:|---:|---|
| nenhum | `insufficient_data` | `unavailable` | `null` | sincronizar dados fisiológicos |
| apenas sono | `moderate` | `low` | `70` | treino leve/médio; sem treino intenso |
| apenas VFC | `moderate` | `low` | `70` | treino leve/médio; sem treino intenso |
| apenas RHR | `moderate` | `low` | `70` | treino leve/médio; sem treino intenso |
| VFC + RHR, sem sono | `optimal` | `medium` | `95` | treino intenso de força ou VO2 Max |
| VFC + RHR + sono | `optimal` | `high` | `100` | treino intenso de força ou VO2 Max |

**Correção confirmada:** o defeito anterior de uma única série fisiológica produzir score 75 e treino intenso foi corrigido.

**Pendência:** a política ainda permite uma recomendação intensa com um sinal fisiológico ausente. Isso pode ser aceitável se o contrato do produto declarar que 2/3 sinais constituem cobertura suficiente, mas essa regra não está formalizada nem acompanhada de teste de aceitação. Para uma política estritamente fail-closed, o sistema deveria limitar a recomendação quando a cobertura não for completa ou exigir uma justificativa explícita de que os sinais restantes são suficientes.

Arquivos envolvidos:

- `src/longevidade/algorithms/daily_guidance.py`;
- `backend/app/routers/daily_guidance.py`.

### 5.2 Energy Bank

Com sono, VFC e RHR presentes:

| Atividade no dia | Status | Nível | Componentes ausentes | Recomendação |
|---|---|---:|---|---|
| passos e carga ausentes | `not_verifiable` | `70` | `activity` | sincronizar atividade |
| somente passos | `ok` | `100` | `[]` | atividades exigentes |
| somente carga de treino | `ok` | `100` | `[]` | atividades exigentes |
| passos e carga explicitamente zero | `ok` | `100` | `[]` | atividades exigentes |
| passos e carga presentes | `ok` | `96` | `[]` | atividades exigentes |

O problema está no padrão lógico equivalente a:

```python
steps = metric.get("steps") or 0
training_load = metric.get("training_load_daily") or 0
```

Assim, ausência de carga de treino é indistinguível de carga observada igual a zero. O mesmo vale para passos. A implementação só identifica ausência quando os dois componentes de atividade faltam simultaneamente.

**Classificação:** pendência P1/P2, porque o resultado pode ser uma recomendação intensa com snapshot de atividade incompleto.

Critério de aceite recomendado:

- distinguir `None` de `0` em cada componente;
- expor `missing_components=["steps"]` ou `missing_components=["training_load"]` quando aplicável;
- não declarar `status="ok"` completo enquanto faltar um componente necessário;
- só considerar carga zero quando a fonte confirmar explicitamente que não houve treino ou quando houver um snapshot completo do dia.

Arquivo envolvido: `src/longevidade/calculators/energy_and_stress.py`.

### 5.3 Proteção temporal

Foi inserida uma medição sintética somente em `2026-08-06` e consultada orientação para `2026-08-05`.

Resultado:

```text
HTTP 200
state=insufficient_data
score=None
```

O router filtra histórico com `date_ref < date_ref`, portanto a medição futura não vazou para a orientação. Este item está corrigido no caminho HTTP testado.

### 5.4 N-of-1

O caso com `control_start` posterior a `control_end` agora retorna:

```text
HTTP 400
Data de início do controle deve ser anterior ou igual à data de fim.
```

Entretanto, um experimento sintético com períodos sobrepostos:

```text
controle:   2026-01-01 a 2026-01-03
tratamento: 2026-01-03 a 2026-01-06
```

retornou:

```text
HTTP 200
saved=True
control_mean=41.0
treatment_mean=56.25
diff_pct=37.2
cohens_d=2.06
p_value=0.0483
statistically_significant=True
effect_interpretation=Grande
```

O dia `2026-01-03` participou dos dois grupos. O resultado estatístico fica contaminado por desenho inválido e pode parecer evidência de efeito.

**Classificação:** pendência P1/P2.

Critério de aceite recomendado:

- rejeitar qualquer interseção entre os intervalos;
- validar que o tratamento começa depois do controle, salvo se um desenho cruzado for explicitamente suportado;
- retornar `insufficient_data` sem persistir resultado quando o desenho não for válido;
- adicionar teste de intervalo adjacente, intervalo sobreposto, intervalo invertido e datas com lacunas.

Arquivos envolvidos:

- `backend/app/routers/n_of_1.py`;
- `src/longevidade/algorithms/n_of_1.py`.

### 5.5 Qualidade e ingestão Zepp

A sincronização ganhou validações importantes de coleta:

- exige metadata recente;
- rejeita metadata futuro inválido;
- detecta falha simultânea das fontes primárias;
- não transforma falha do sync em sucesso HTTP 200 no endpoint de sincronização.

Essas correções foram confirmadas por inspeção e pela suíte Python.

O cálculo de qualidade ainda permanece observacionalmente frágil. Com um fixture sintético contendo apenas um valor diário para passos, sono, RHR e VFC, o importador persistiu:

| Métrica | `sample_count` | `coverage_pct` | `quality_status` |
|---|---:|---:|---|
| `steps` | `1440` | `100.0` | `high` |
| `sleep_minutes` | `1` | `100.0` | `not_verifiable` |
| `rhr_bpm` | `1` | `100.0` | `not_verifiable` |
| `hrv_ms` | `1` | `100.0` | `not_verifiable` |
| `pai_score` ausente | `0` | `0.0` | `unavailable` |

O valor agregado diário de passos não prova 1.440 amostras. A presença de um valor também não prova cobertura integral do período. `quality_status="high"` para passos é atribuído por regra fixa, não por densidade observada.

**Classificação:** pendência P2.

Critério de aceite recomendado:

- persistir a contagem real de pontos ou intervalos observados;
- calcular o denominador de cobertura conforme a resolução da fonte;
- separar `observed`, `aggregated`, `estimated` e `unavailable`;
- não atribuir `high` a um agregado diário sem evidência de densidade;
- testar duplicatas, lacunas, valores fora de faixa e snapshots parciais.

Arquivo envolvido: `src/longevidade/ingestion/zepp_importer.py`.

### 5.6 Doctor Briefing

Foi confirmada uma correção: um marcador sintético `999 u` com referência `0–100` agora aparece como:

```text
Marcador sintético | 999.0 u | 0.0-100.0 | - | Fora da Ref. (Acima)
```

Porém, o contrato de idade continua problemático. Com perfil sintético de idade 55 e chamada com `patient_age=40`, o briefing retornou:

```text
**Paciente**: Teste (32 anos)
```

A implementação descarta sentinelas numéricas (`32.0` e `40.0`) em vez de usar `None` para indicar ausência. Assim, 32 e 40 são tratados como “não informados”, embora sejam idades válidas.

O PDF mantém a mesma regra e também possui metas fixas como:

- RHR `< 60 bpm`;
- HRV `> 40 ms`;
- SpO2 `96–99%`;
- respiração `12–16 rpm`;
- VO2 Max `> 45.0`.

Esses valores podem ser apresentados como alvos clínicos gerais sem indicação de fonte, população, faixa etária ou personalização. O relatório também não informa claramente tamanho amostral e qualidade da média de 30 dias.

**Classificação:** pendência P2.

Arquivos envolvidos:

- `src/longevidade/reports/doctor_briefing.py`;
- `src/longevidade/reports/doctor_briefing_pdf.py`.

### 5.7 Check-in e frontend

Correções confirmadas:

- `tags` é normalizado para array ao carregar;
- o toggle de tag também usa fallback seguro;
- a orientação é atualizada por callback após PUT bem-sucedido;
- o E2E não apresentou tela preta nem fallback clínico canned.

Pendências restantes:

- cada clique dispara um PUT independente;
- não há fila, debounce ou número de versão para impedir respostas fora de ordem;
- a UI atualiza otimisticamente e, em falha, exibe erro sem rollback garantido do estado local;
- o controle de energia ainda não possui `role="group"`, `aria-label` e `aria-pressed` equivalentes aos controles de humor/estresse;
- tags não expõem `aria-pressed`;
- modais e alguns cards precisam de semântica de diálogo, foco e teclado;
- os E2E atuais usam mocks e não exercitam concorrência nem falha de PUT.

Arquivo principal: `frontend/src/components/DailyCheckinCard.tsx`.

**Classificação:** pendência P2/P3.

### 5.8 Duração de treino

Probe atual:

```python
{
  "generic_duration_120": 120,
  "explicit_seconds_120": 2.0,
  "explicit_minutes_120": 120
}
```

Campos explicitamente nomeados em segundos ou minutos funcionam. O campo genérico `duration` continua sem contrato confiável; um limiar numérico isolado não permite saber se 120 representa segundos ou minutos.

**Classificação:** pendência P2.

Critério de aceite: cada fonte deve normalizar para campos explícitos, por exemplo `duration_seconds` ou `duration_minutes`, rejeitando ou marcando como ambíguo qualquer campo genérico sem unidade.

Arquivo envolvido: `integrations/zepp/scripts/health_metrics.py`.

### 5.9 GETs e efeitos colaterais

Foi executado um probe com SQLite temporário sobre 14 rotas GET:

- métricas;
- pipeline;
- suplementos e logs;
- Doctor Briefing Markdown/PDF;
- qualidade;
- check-ins;
- orientação;
- Energy/Circadian;
- correlações;
- N-of-1.

Com banco existente:

```text
todos os endpoints: HTTP 200
hash antes/depois: inalterado
```

Com o banco removido manualmente enquanto o servidor de teste continuava ativo:

```text
todos os endpoints: HTTP 200
arquivo recriado: false
```

A propriedade de leitura pura está corrigida nos endpoints testados.

Foi observado separadamente que o repositório abre conexões com `with sqlite3.connect(...)`, mas não fecha explicitamente a conexão ao sair do bloco. Durante o probe de qualidade, o `TemporaryDirectory` falhou com `WinError 32` ao tentar remover o SQLite ainda aberto; o processo só conseguiu limpar depois que as referências foram coletadas.

Isso não demonstrou escrita indevida por GET, mas indica risco de:

- bloqueio de arquivos no Windows;
- falhas ao substituir/remover banco em operações de manutenção;
- acúmulo de conexões em processos de longa duração.

**Classificação:** pureza dos GETs corrigida; ciclo de vida SQLite permanece P2/P3.

### 5.10 Correlações

Probe atual:

```text
19 pares: 0 resultados
20 pares: 1 resultado
```

O motor usa datas reais, Spearman e correção de Bonferroni. Este item está corrigido no escopo testado.

### 5.11 Documentação e privacidade operacional

O runtime atual de `/api/health` retorna:

```json
{
  "status": "ok",
  "system": "Longevidade Hub",
  "database_connected": true,
  "version": "0.6.0"
}
```

Não há mais caminho absoluto no payload.

Entretanto, `docs/api-reference.md` ainda afirma que o endpoint retorna “caminho do banco” e não documenta os endpoints novos de:

- `/api/daily-guidance`;
- `/api/energy-circadian`;
- `/api/quality`;
- `/api/checkins`.

**Classificação:** pendência P3 de documentação e contrato.

## 6. Matriz de status

| Área | Status atual | Veredito |
|---|---|---|
| Orientação sem dados | corrigido | confirmado por probe e teste |
| Orientação com um único sinal | corrigido | score limitado a 70 e sem treino intenso |
| Orientação com cobertura 2/3 | parcialmente corrigido | ainda permite ação intensa; contrato precisa ser explicitado |
| Energy Bank sem atividade | corrigido | `not_verifiable`, nível conservador |
| Energy Bank com atividade parcial | **não corrigido** | ausência de componente vira zero |
| GETs sem inicialização/migração | corrigido nos 14 GETs auditados | hash e ausência de recriação confirmados |
| Ciclo de vida SQLite Windows | parcialmente corrigido | conexões não fecham explicitamente |
| Sync Zepp | melhorado/corrigido | freshness e falhas primárias verificadas |
| Qualidade Zepp | parcialmente corrigido | cobertura e amostragem ainda sintéticas |
| Correlação temporal | corrigido | mínimo de pares e datas reais confirmados |
| N-of-1 data invertida | corrigido | HTTP 400 confirmado |
| N-of-1 períodos sobrepostos | **não corrigido** | persiste resultado significativo inválido |
| Doctor Briefing fora da referência | corrigido | status fora da referência confirmado |
| Doctor Briefing idade | **não corrigido** | sentinelas 32/40 continuam descartando valores válidos |
| Doctor Briefing PDF | parcialmente corrigido | alvos continuam hard-coded |
| Duração de treino | parcialmente corrigido | campos explícitos funcionam; genérico ambíguo |
| Refresh pós-check-in | parcialmente corrigido | callback existe; concorrência/rollback não resolvidos |
| Contrato de payload frontend | melhorado | tags protegidas; demais contratos ainda sem schema runtime completo |
| Acessibilidade | não concluída | controles e modais ainda incompletos |
| Documentação API | parcialmente corrigida | porta atualizada; contratos novos ausentes/divergentes |
| Testes negativos | insuficientes | suíte verde não cobre os principais resíduos |

## 7. Prioridade recomendada

### P1 — antes de tratar o produto como recomendador confiável

1. Corrigir Energy Bank para nunca tratar componente de atividade ausente como zero.
2. Rejeitar períodos N-of-1 sobrepostos e impedir persistência de análises com desenho inválido.
3. Formalizar a política da orientação com cobertura 2/3; se a política for estritamente fail-closed, impedir treino intenso sem cobertura completa.

### P2 — antes de uma release experimental mais confiável

4. Reestruturar qualidade Zepp com contagem observada, cobertura por resolução e status de agregação.
5. Substituir sentinelas de idade por `None` e remover alvos fisiológicos não individualizados ou rotulá-los como referências gerais não diagnósticas.
6. Normalizar unidades de duração de treino por fonte.
7. Fechar explicitamente conexões SQLite com context manager que encerre a conexão.
8. Implementar fila/debounce/versionamento e rollback no autosave do check-in.
9. Ampliar testes negativos para os cenários encontrados nesta avaliação.

### P3 — qualidade de produto

10. Corrigir documentação da API e incluir os quatro grupos de endpoints ausentes.
11. Completar semântica ARIA, teclado, foco e papéis de diálogo.
12. Adicionar E2E contra backend isolado para check-in, orientação, energia e ausência de dados.

## 8. Gate de aceite sugerido

A próxima reavaliação só deve classificar o sistema como aprovado experimentalmente quando os probes abaixo passarem:

```text
[ ] nenhum sinal atual -> insufficient_data, score null, sem recomendação de treino
[ ] um sinal atual -> ação conservadora
[ ] dois sinais atuais -> comportamento definido por contrato e teste
[ ] passos presentes + carga ausente -> missing_components explícito, sem carga zero implícita
[ ] carga presente + passos ausentes -> missing_components explícito
[ ] zeros observados -> distintos de campos ausentes
[ ] períodos N-of-1 invertidos -> HTTP 400
[ ] períodos N-of-1 sobrepostos -> HTTP 400, sem persistência
[ ] qualidade de passos -> sem sample_count=1440 inventado
[ ] agregado diário -> coverage não automaticamente igual a 100%
[ ] idade explícita 32/40 -> preservada como valor válido
[ ] idade ausente -> fallback somente via None
[ ] duração genérica sem unidade -> rejeitada ou marcada como ambígua
[ ] check-in com PUTs concorrentes -> estado final determinístico
[ ] falha de PUT -> rollback ou refetch consistente
[ ] GETs -> nenhum arquivo criado, migrado ou semeado
[ ] conexões SQLite -> fechadas antes da remoção do arquivo
[ ] API reference -> alinhada com todos os endpoints ativos
```

## 9. Estado final da auditoria

O commit `9094c07` representa progresso real e corrigiu a maior parte dos achados mais imediatos, mas a mensagem “resolve residual findings” não deve ser interpretada como prova de resolução completa.

**Conclusão:** não, ainda não foi corrigido tudo. O bloqueio principal agora é a combinação de **Energy Bank com atividade parcial**, **N-of-1 sobreposto** e **qualidade observacional Zepp**. O projeto pode continuar sendo executado como dashboard experimental, desde que suas recomendações sejam tratadas como não clínicas e não determinantes.
