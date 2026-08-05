# Nova reavaliação após mudanças do Codex — Longevidade Hub

**Data:** 05/08/2026
**Branch:** `master`
**Commit avaliado:** `59ffa89` — `fix(audit): resolve all critical P1, P2, and P3 findings from pendencias_pos_codex_2026-08-05.md`
**Base comparativa:** `6945fdd`
**Documento anterior:** [`pendencias_pos_codex_2026-08-05.md`](pendencias_pos_codex_2026-08-05.md)

## 1. Veredito executivo

O Codex corrigiu uma parte relevante das pendências registradas no estado `6945fdd`:

- a orientação diária agora falha fechada quando não existe nenhum sinal fisiológico atual;
- o Energy Bank deixou de calcular quando falta RHR;
- os handlers GET auditados deixaram de chamar `initialize_db()`;
- o repositório deixou de criar automaticamente um SQLite ausente durante a abertura da conexão;
- a qualidade Zepp passou a verificar limites plausíveis e a persistir estados `low`, `not_verifiable` e `unavailable`;
- o mínimo das correlações foi elevado para 20 pares;
- o refresh da orientação após salvar check-in foi conectado ao componente principal;
- README, overview e referência da API passaram a usar a porta `8887`;
- os problemas de whitespace introduzidos entre `6945fdd` e `59ffa89` não foram reproduzidos no gate de diff.

Entretanto, a mensagem do commit ainda é mais abrangente que a evidência. A nova avaliação encontrou pendências funcionais importantes:

1. **A orientação diária ainda pode emitir score 85 e recomendar treino intenso usando somente um sinal atual**, mantendo `readiness_score = 75` como ponto de partida e tratando sinais ausentes como neutros.
2. **O Energy Bank ainda converte passos e carga de treino ausentes em zero**, produzindo nível 100 e recomendação de atividade exigente sem snapshot de atividade.
3. **O N-of-1 ainda aceita períodos inválidos e persiste experimentos sem observações**, retornando métricas zeradas com status HTTP 200.
4. **A qualidade Zepp ainda apresenta cobertura e densidade sintéticas**, embora a plausibilidade tenha melhorado.
5. **O Doctor Briefing ainda classifica como “Ótimo” um marcador fora da referência quando não há alvo ótimo configurado.**
6. **A acessibilidade, a validação estrutural de payloads e a documentação completa da API continuam incompletas.**

### Decisão

O projeto está **tecnicamente executável e mais resiliente**, mas ainda deve ser tratado como **dashboard experimental de acompanhamento**. Não há evidência suficiente para classificá-lo como recomendador confiável de treino, recuperação, energia ou interpretação clínica.

## 2. Escopo e método

A revisão comparou `59ffa89` com `6945fdd`, leu as alterações e os arquivos afetados, executou as suítes disponíveis e realizou probes comportamentais com fixtures sintéticas.

Restrições observadas:

- nenhum banco operacional foi usado;
- os testes Python usaram `LONGEVIDADE_DB_PATH` apontando para SQLite temporário;
- os probes de ingestão usaram módulos `health_metrics` sintéticos;
- o E2E usou os mocks da suíte Playwright;
- nenhum segredo, token ou chave de IA foi lido ou preservado;
- durante a execução dos testes, o worktree estava limpo quanto ao código; este relatório foi criado depois das validações;

## 3. Validações executadas

| Validação | Resultado |
|---|---:|
| Backend Python com SQLite temporário | **112 passed** em 28,20 s |
| Vitest | **36 passed** em 11 arquivos |
| Build React/TypeScript | **sucesso** |
| Playwright E2E | **4 passed** |
| Uvicorn isolado | startup concluído |
| `GET /` no servidor isolado | HTTP **200**, frontend compilado servido |
| `GET /api/health` | HTTP **200** |
| `GET /api/daily-guidance` sem métrica | HTTP **200**, `insufficient_data` |
| 13 GETs com banco temporário já inicializado | hash do banco **inalterado** |
| `git diff --check 6945fdd..59ffa89` | sem erro |
| listener temporário na porta 8899 após o teste | encerrado; nenhum listener ativo |
| `git status --short --untracked-files=all` antes deste relatório | worktree limpo |

Os avisos do Vitest sobre opções depreciadas do plugin Vite não falharam a suíte, mas devem ser tratados em manutenção futura.

## 4. Matriz de comparação das pendências

| Pendência anterior | Estado em `59ffa89` | Avaliação atual |
|---|---|---|
| Orientação intensa sem qualquer métrica atual | **Corrigida parcialmente** | O caso sem HRV, RHR e sono atuais retorna `insufficient_data`; porém um único sinal atual ainda pode gerar score e treino intenso. |
| Energy Bank positivo sem RHR | **Corrigida parcialmente** | Sem RHR retorna `unavailable`; passos e carga ausentes ainda viram zero. |
| GETs inicializando banco | **Corrigida para os handlers auditados** | Hash permaneceu igual em 13 GETs; há falha inconsistente quando o banco desaparece durante o runtime. |
| Refresh após check-in | **Corrigida parcialmente** | `refreshKey` e callback agora atualizam a orientação; autosave ainda não tem rollback nem serialização. |
| Contratos frágeis no frontend | **Parcial** | Arrays de guidance são normalizados; `tags` ainda pode causar erro numa interação com payload malformado. |
| Correlações abaixo do mínimo | **Corrigida em parte** | Mínimo de 20 pares, datas reais, Spearman e Bonferroni estão presentes. |
| Qualidade Zepp artificial | **Parcial** | Limites plausíveis melhoraram, mas cobertura e `sample_count` continuam sintéticos. |
| Doctor Briefing sem perfil | **Corrigida parcialmente** | Perfil é usado, mas classificação laboratorial e sentinelas de idade permanecem frágeis. |
| N-of-1 sem proteção metodológica | **Não corrigida** | Períodos inválidos são aceitos e resultados sem observações são persistidos. |
| Duração de treino ambígua | **Não corrigida** | Chaves genéricas continuam dependendo de heurística de valor. |
| Migrações sem teste de legado/rollback | **Não corrigida** | Cobertura continua limitada a banco vazio, versão zero e idempotência. |
| Acessibilidade dos novos fluxos | **Não corrigida** | Labels, semântica de grupos, diálogos e teclado continuam incompletos. |
| Documentação divergente | **Parcialmente corrigida** | Porta foi corrigida, mas endpoints novos e health check ainda têm problemas. |
| Whitespace do diff anterior | **Corrigida neste intervalo** | `git diff --check 6945fdd..59ffa89` passou. |

## 5. Pendências críticas remanescentes

### P1 — Daily Guidance ainda usa ponto de partida positivo com apenas um sinal

**Arquivos:**

- `src/longevidade/algorithms/daily_guidance.py`
- `backend/app/routers/daily_guidance.py`

A nova guarda em `daily_guidance.py` verifica se existe pelo menos um sinal atual — HRV, RHR ou sono — com baseline correspondente. Isso elimina o defeito mais grave do estado anterior: histórico válido sozinho já não basta.

O problema residual está no conjunto mínimo escolhido e no score inicial:

```python
readiness_score = 75.0
```

Se somente uma métrica atual estiver disponível e estiver dentro da linha de base, os outros sinais ausentes não reduzem a prontidão. A classificação final pode ser `optimal` e a ação pode recomendar treino intenso.

### Probe reproduzível

Com sete dias de histórico contendo HRV, RHR e sono, foram testados dias com apenas uma métrica atual:

```text
sleep_only -> state=optimal, confidence=medium, score=85,
              ação: treino mais intenso de força ou VO2 Max
hrv_only   -> state=optimal, confidence=medium, score=85,
              ação: treino mais intenso de força ou VO2 Max
rhr_only   -> state=optimal, confidence=medium, score=85,
              ação: treino mais intenso de força ou VO2 Max
```

O caso sem qualquer sinal atual foi corrigido e retornou:

```json
{
  "state": "insufficient_data",
  "score": null,
  "confidence": "unavailable"
}
```

### Impacto

O sistema não fabrica uma métrica individual, mas ainda apresenta uma confiança e uma recomendação de intensidade desproporcionais à cobertura real. A ausência de dois de três sinais de recuperação é tratada como neutralidade, e não como limitação que reduz a recomendação.

### Aceite recomendado

- definir e documentar um conjunto mínimo de sinais para cada nível de orientação;
- impedir `optimal` e treino intenso com somente uma série fisiológica atual, salvo política explicitamente justificada;
- remover o score positivo implícito de `75` quando o conjunto mínimo não estiver completo;
- declarar no payload quais fatores foram observados e quais estão ausentes;
- adicionar testes para zero, um, dois e três sinais atuais, incluindo a proibição de ação intensa nos estados incompletos.

## 6. Energy Bank ainda trata atividade ausente como zero

**Arquivo:** `src/longevidade/calculators/energy_and_stress.py`

A exigência de RHR foi adicionada corretamente:

- sono ausente → `unavailable`;
- HRV ausente → `unavailable`;
- RHR ausente → `unavailable`.

Porém, os campos de atividade continuam assimetricamente preenchidos:

```python
steps = float(today_metric.get("steps") or 0)
training_load = float(today_metric.get("training_load_daily") or 0)
```

### Probe reproduzível

Com somente `sleep_minutes=480`, `hrv_ms=40` e `rhr_bpm=55`, sem passos e sem carga de treino, o resultado foi:

```json
{
  "status": "ok",
  "current_level": 100,
  "recharge": 90,
  "drain": 10,
  "recommendation": "Nível de energia excelente. Bom momento para atividades exigentes."
}
```

O mesmo resultado ocorreu quando `steps=0` e `training_load_daily=0` foram informados explicitamente. Portanto, o cálculo não diferencia ausência de snapshot de atividade de zero observado.

### Impacto

O sistema pode superestimar energia e recomendar esforço exigente quando não sabe se houve atividade ou treino. Isso viola o requisito de não interpretar ausência de snapshot como carga zero.

### Aceite recomendado

- diferenciar `None` de zero observado em todos os componentes;
- exigir snapshot de passos/carga para publicar `current_level` completo ou retornar um estado parcial sem recomendação forte;
- incluir `observed_components`, `missing_components` e uma limitação no payload;
- cobrir separadamente: campos ausentes, zero observado, valores negativos inválidos e carga presente.

## 7. GETs: efeito colateral corrigido, contrato de banco ausente ainda inconsistente

**Arquivos:**

- `src/longevidade/db/repository.py`
- `backend/app/main.py`
- `backend/app/routers/*.py`

O repositório agora verifica a existência do arquivo antes de abrir SQLite. Os handlers GET modificados não chamam mais `initialize_db()`.

Com um banco temporário inicializado, 13 rotas de leitura foram chamadas e o SHA-256 do arquivo permaneceu igual antes e depois. Isso confirma que, no caminho normal, a leitura não migra, semeia nem altera os dados.

As rotas testadas incluíram métricas, pipeline, suplementos, auditoria, logs, Doctor Briefing Markdown/PDF, qualidade, orientação, energia, correlações e check-ins.

### Limitação residual

Quando o arquivo ainda não existe e as funções de rota são executadas sem o lifespan do FastAPI, os resultados não são uniformes:

```text
metrics       -> ok, lista vazia
reports       -> ok, relatório sem banco
pipeline      -> ok, lista vazia
supplements   -> ok, lista vazia
correlations  -> ok, lista vazia
quality       -> FileNotFoundError
guidance      -> FileNotFoundError
energy        -> FileNotFoundError
checkin       -> FileNotFoundError
```

No servidor integrado, o lifespan inicializa o banco antes de atender as rotas. Assim, o defeito de criação no GET foi corrigido, mas a política para banco ausente durante a vida do processo ainda não está definida e pode resultar em HTTP 500 para algumas rotas.

### Aceite recomendado

- manter criação/migração exclusivamente no startup controlado ou em comando explícito;
- padronizar respostas para banco ausente, preferencialmente `503` ou estado `unavailable`, em vez de exceção não tratada;
- adicionar teste de banco removido após o startup;
- garantir que nenhum health check ou GET revele detalhes desnecessários do sistema.

## 8. Check-in e contratos do frontend

### 8.1 Refresh da orientação

A integração foi melhorada:

- `App.tsx` mantém `guidanceRevision`;
- `DailyCheckinCard` chama `onCheckinUpdated` após PUT bem-sucedido;
- o callback incrementa a revisão e atualiza os dados do dashboard;
- `DailyGuidanceCard` inclui `refreshKey` nas dependências do efeito.

Isso corrige a ausência de refresh que existia no estado anterior.

### 8.2 Autosave ainda é frágil

`DailyCheckinCard` salva imediatamente a cada clique. Permanecem riscos:

- atualização otimista sem rollback do estado local quando a requisição falha;
- várias requisições concorrentes para cliques rápidos;
- resposta antiga podendo terminar depois da resposta nova;
- nenhum debounce, abortamento ou número de versão da mutação.

### 8.3 Payloads malformados

`DailyGuidanceCard` normaliza `factors` e `limitations` com `Array.isArray`, o que melhora o comportamento com `{}`.

Mas `DailyCheckinCard` ainda executa:

```typescript
checkin.tags.includes(tagId)
```

O fallback visual usa `Array.isArray`, mas o handler de interação não. Um payload com `tags: {}` pode carregar sem derrubar a tela e falhar somente quando o usuário clicar numa tag. A suíte E2E atual não cobre essa interação com payload inválido.

### Aceite recomendado

- normalizar o objeto inteiro recebido da API antes de armazená-lo no estado;
- fazer rollback em erro de PUT;
- serializar ou cancelar mutações concorrentes;
- cobrir tags, factors e limitations com objetos, escalares, `null` e arrays inválidos.

## 9. Qualidade e ingestão Zepp

**Arquivos:**

- `src/longevidade/ingestion/zepp_importer.py`
- `integrations/zepp/scripts/health_metrics.py`
- `src/longevidade/metrics/catalog.py`
- `backend/app/routers/quality.py`

A implementação atual melhorou a segurança semântica:

- chaves desconhecidas não entram no resumo esperado;
- HRV fora da faixa plausível virou `low` no probe;
- passos plausíveis foram classificados como `high`;
- métricas agregadas sem densidade verificável foram classificadas como `not_verifiable`;
- ausência de valor virou `unavailable`.

### Probe sintético

Para um registro com HRV `999`, passos `8123`, sono, RHR, SpO2, respiração e PAI:

```text
hrv_ms                  -> low
steps                   -> high
pai_score               -> not_verifiable
respiratory_rate_rpm    -> not_verifiable
rhr_bpm                 -> not_verifiable
sleep_minutes           -> not_verifiable
spo2_avg_pct            -> not_verifiable
coverage_pct            -> 100.0 para todos os itens presentes
sample_count            -> 1440 para passos e 1 para agregados
```

### Problemas remanescentes

- `coverage_pct=100` continua significando apenas “há um valor”, não cobertura observacional real;
- `sample_count=1440` para passos é presumido pelo importador;
- agregados recebem `sample_count=1`, sem representar a densidade do snapshot;
- a lista de sete métricas é duplicada no importador e no router, em vez de ser derivada integralmente do catálogo;
- as regras `min_observations` e `baseline_days` do catálogo não são usadas nesse fluxo;
- os testes atuais usam mocks sintéticos e ainda não comprovam todos os formatos reais de HRV RMSSD, SpO2, respiração, pressão arterial, PAI e duração de treino.

### Aceite recomendado

- transportar metadados de amostra do parser Zepp até o banco;
- usar `METRICS_CATALOG` como fonte única de chaves e regras;
- distinguir cobertura observada, disponibilidade e plausibilidade;
- marcar como `not_verifiable` quando o formato não fornecer densidade real;
- adicionar fixtures por formato real documentado e testes de campos desconhecidos.

## 10. Correlações

**Arquivos:**

- `src/longevidade/analytics/correlations.py`
- `backend/app/routers/correlations.py`

Esta pendência foi em grande parte corrigida:

- correspondência por datas de calendário;
- lags explícitos;
- Spearman via SciPy quando disponível;
- mínimo padrão de 20 pares;
- correção de Bonferroni;
- `sample_count`, `p_value` e `is_significant` no resultado.

O probe produziu zero resultados com 19 pares e um resultado com 20 pares.

Ainda seria recomendável:

- expor também o nível de significância ajustado ou o número total de hipóteses no contrato;
- marcar explicitamente o resultado como observacional e não causal;
- incluir cobertura e qualidade das métricas usadas;
- validar lags, datas irregulares e séries constantes em testes de API.

Classificação: **corrigida quanto ao defeito principal de alinhamento temporal e amostra mínima; parcialmente pendente quanto à comunicação metodológica.**

## 11. N-of-1 permanece metodologicamente insuficiente

**Arquivos:**

- `backend/app/routers/n_of_1.py`
- `src/longevidade/algorithms/n_of_1.py`
- `frontend/src/components/NOf1Tracker.tsx`

O cálculo ainda:

- usa teste t independente e Cohen's d;
- exige somente três observações por grupo;
- retorna valores zerados e `p_value=1.0` quando a amostra é insuficiente;
- não calcula intervalo de confiança;
- não mede adesão ou cobertura temporal;
- não controla confundidores, washout, sazonalidade ou autocorrelação;
- não valida se períodos são ordenados, não sobrepostos e de duração esperada.

### Probe reproduzível

Um POST com período de controle invertido e sem métricas retornou:

```json
{
  "status_code": 200,
  "response_status": "ok",
  "stored_count": 1,
  "stats": {
    "control_mean": 0.0,
    "treatment_mean": 0.0,
    "cohens_d": 0.0,
    "p_value": 1.0,
    "statistically_significant": false,
    "effect_interpretation": "Amostras insuficientes (< 3 observações)"
  }
}
```

Persistir esse registro como `ok` mistura “experimento criado” com “análise válida”.

### Aceite recomendado

- validar ordem, duração e não sobreposição dos períodos;
- retornar estado explícito `insufficient_data` sem publicar resultado como análise concluída;
- armazenar `n_control`, `n_treatment`, cobertura, adesão e limitações;
- adicionar intervalo de confiança e documentação das hipóteses estatísticas;
- não exibir “Significativo” apenas por um booleano sem contexto de amostra.

## 12. Doctor Briefing

**Arquivos:**

- `src/longevidade/reports/doctor_briefing.py`
- `src/longevidade/reports/doctor_briefing_pdf.py`

A consulta ao `user_profile` como fallback foi confirmada. Porém, permanecem riscos metodológicos.

### Classificação laboratorial

O Markdown começa com `Ótimo` e só troca o status quando encontra alvo ótimo conhecido. Se o exame possui faixa laboratorial `0–100`, não possui `optimal_target` e tem valor sintético `999`, o briefing gera:

```text
| Marcador sintético | **999.0 u** | 0.0-100.0 | - | 🟢 Ótimo |
```

Isso é uma classificação incorreta: a ausência de alvo ótimo não elimina a referência laboratorial.

### Outros problemas

- o PDF ainda usa alvos fixos como `< 60 bpm`, `> 40 ms`, `96–99%` e `> 45.0 mL/kg/min`;
- os valores `40`, `32` e `40` continuam funcionando como sentinelas implícitas de idade em vez de `None` ser o único sinal de fallback;
- o relatório não informa cobertura por métrica, número de observações, qualidade, tendências ou limitações de completude;
- a ausência de dados clínicos é mostrada como “Sem dados”, mas o texto ainda é apresentado como relatório clínico sem uma seção forte de limitações;
- o endpoint PDF retorna bytes vazios quando o banco não está inicializado, em vez de um erro estruturado.

### Aceite recomendado

- classificar contra faixa laboratorial quando ela existir, mesmo sem alvo ótimo;
- usar somente `None` como fallback de nome/idade;
- transportar fonte, data, n de observações e qualidade para o relatório;
- separar claramente observado, referência, alvo, hipótese e recomendação para discussão médica;
- retornar `503` ou resposta estruturada quando não houver banco para gerar PDF.

## 13. Duração de treino ainda ambígua

**Arquivo:** `integrations/zepp/scripts/health_metrics.py`

A heurística atual trata chaves explícitas de segundos de forma diferente, mas uma chave genérica continua ambígua.

Probe com a data atual:

```text
generic duration=120    -> 120 minutos
explicit durationTime=120 -> 2 minutos
explicit duration_min=120  -> 120 minutos
```

Sem contrato de unidade do formato de origem, o mesmo valor numérico pode ser interpretado de forma diferente. É necessário mapear cada campo por versão/formato Zepp, não por limiar numérico.

## 14. Migrações e recuperação

**Arquivos:**

- `src/longevidade/db/migrations.py`
- `src/longevidade/db/schema.py`
- `tests/test_db_migrations.py`

A suíte confirma banco vazio, `user_version=0` e idempotência. Ainda não há prova de:

- upgrade de banco legado populado;
- migração interrompida no meio;
- backup e restore antes de cutover;
- versão inesperada ou incompatível;
- consistência entre o schema baseline e as migrações versionadas;
- preservação de dados após alteração de colunas.

## 15. Acessibilidade

Permanecem pendências observáveis em:

- `DailyCheckinCard.tsx`: escalas sem `fieldset`/`legend` e o controle de energia sem rótulo contextual completo;
- `DataQualityPanel.tsx`: input de data sem `<label>` associado;
- `DoctorBriefingModal.tsx` e outros modais: ausência de contrato completo de `role="dialog"`, `aria-modal`, Escape, trap e restauração de foco;
- `SupplementsView.tsx`: cards interativos implementados como `div onClick`, sem equivalente de teclado;
- `NOf1Tracker.tsx`: formulário sem validação de ordem/sobreposição das datas e controles com semântica incompleta.

A acessibilidade básica existente não substitui testes de teclado, foco e leitor de tela.

## 16. Documentação e health check

A porta `8887` foi atualizada em README, overview e referência geral da API. Ainda há divergências funcionais:

- `docs/api-reference.md` não documenta integralmente `/api/daily-guidance`, `/api/energy-circadian`, `/api/quality/daily` e `/api/checkins`;
- `GET /api/health` retorna o caminho absoluto do banco no campo `database`;
- o caminho do banco é informação de diagnóstico local desnecessária para um health check comum e aumenta a exposição de estrutura do host;
- `docs/pendencias_pos_codex_2026-08-05.md` descreve o estado `6945fdd` e deve ser lido como documento histórico; este arquivo é a avaliação do estado `59ffa89`.

## 17. Ordem recomendada de correção

1. Tornar Daily Guidance estritamente conservadora quando somente uma série atual estiver disponível.
2. Remover `steps`/`training_load` ficticiamente iguais a zero do Energy Bank e distinguir ausência de zero observado.
3. Padronizar o comportamento de todas as rotas para banco ausente sem reintroduzir inicialização em GET.
4. Validar períodos e estados de amostra do N-of-1 antes de persistir análise.
5. Corrigir qualidade Zepp para refletir densidade real ou declarar `not_verifiable`.
6. Corrigir classificação de exames, sentinelas e referências fixas do Doctor Briefing.
7. Adicionar testes negativos de payload, check-in concorrente, acessibilidade e fluxo E2E de dados inválidos.
8. Corrigir duração de treino por contrato de unidade do formato Zepp.
9. Cobrir migração de banco legado, rollback/restore e versão inesperada.
10. Completar API reference, health check e semântica acessível.

## 18. Gate recomendado para nova release

Antes de descrever o produto como confiável para orientar treino ou recuperação, exigir, com banco temporário e fixtures sintéticas:

```bash
export PYTHONPATH=''
export LONGEVIDADE_DB_PATH='<sqlite-temporario>'
.venv/Scripts/python.exe -m pytest -q

cd frontend
npm run test:run
npm run build
npm run test:e2e
```

Além das suítes passarem, o gate deve comprovar:

- nenhuma recomendação intensa com cobertura fisiológica insuficiente;
- nenhum score energético positivo quando passos/carga essenciais estiverem ausentes;
- nenhum GET criando, migrando ou semeando banco;
- respostas consistentes para banco ausente;
- qualidade derivada de observações reais ou explicitamente indisponível;
- N-of-1 inválido não persistido como análise `ok`;
- Doctor Briefing sem classificações positivas indevidas;
- documentação alinhada ao código;
- `git diff --check` limpo;
- execução integrada abrindo `http://127.0.0.1:8887`.

## 19. Conclusão final

`59ffa89` representa uma melhora verificável sobre `6945fdd` e corrigiu os dois probes mais óbvios da auditoria anterior: orientação sem qualquer métrica atual e Energy Bank sem RHR. Também eliminou efeitos colaterais de inicialização no caminho normal de leitura, melhorou a plausibilidade Zepp e conectou o refresh do check-in.

A correção, contudo, ainda não é completa. A orientação continua otimista com apenas um sinal, o Energy Bank trata atividade desconhecida como zero, o N-of-1 aceita dados inválidos, a qualidade ainda superestima cobertura e o Doctor Briefing pode classificar um exame fora da referência como ótimo.

**Status recomendado:** executável e testado como **dashboard experimental de acompanhamento**; **não aprovado como recomendador clínico ou de treino confiável**.
