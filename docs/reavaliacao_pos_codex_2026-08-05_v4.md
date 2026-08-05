# Nova avaliação pós-Codex — Longevidade Hub (v4)

**Data da execução:** 05/08/2026
**Branch:** `master`
**HEAD avaliado:** `9094c07` — `fix(audit): resolve residual findings from reavaliacao_pos_codex_2026-08-05_v2.md`
**Baseline da rodada anterior:** `9094c07` / relatório v3
**Alterações posteriores ao HEAD:** nenhuma

## Veredito executivo

A afirmação de que o Codex “consertou tudo” **não foi comprovada e continua incorreta**.

O HEAD avaliado é exatamente o mesmo da rodada anterior; não existe commit novo nem alteração funcional posterior. Os testes continuam verdes, mas os probes negativos repetidos ainda encontram falhas materiais em recomendações de energia/treino, validade estatística do N-of-1, qualidade observacional do Zepp, briefing, lifecycle SQLite e documentação.

O sistema pode ser tratado como **dashboard experimental de acompanhamento pessoal**, mas não deve ser aprovado como recomendador clínico, de recuperação, energia ou treino.

## 1. Escopo e preservação

Foram revisados, sem alteração de código:

- `src/longevidade/algorithms/daily_guidance.py`
- `src/longevidade/calculators/energy_and_stress.py`
- `backend/app/routers/n_of_1.py`
- `src/longevidade/ingestion/zepp_importer.py`
- `integrations/zepp/scripts/health_metrics.py`
- `src/longevidade/reports/doctor_briefing.py`
- `src/longevidade/reports/doctor_briefing_pdf.py`
- `frontend/src/components/DailyCheckinCard.tsx`
- `backend/app/main.py`
- `docs/api-reference.md`
- suítes Python, Vitest e Playwright

Todos os dados dos probes foram sintéticos e os bancos foram temporários. O servidor operacional em `8887` não foi alterado.

O worktree já continha o relatório v3 não rastreado; esta rodada adiciona apenas este relatório v4.

## 2. Comparação do HEAD

```text
HEAD: 9094c07
Mudanças desde 9094c07: nenhuma
```

A mensagem do commit não pode ser usada como evidência de correção. O veredito abaixo é baseado no código executável e nos probes atuais.

## 3. Probes críticos repetidos

### 3.1 Orientação diária

Resultados atuais:

| Cenário | Estado | Confiança | Score | Ação |
|---|---|---:|---:|---|
| nenhum sinal atual | `insufficient_data` | `unavailable` | `null` | sincronizar dispositivo |
| somente HRV | `moderate` | `low` | `70` | treino leve/médio |
| HRV + RHR, sem sono | `optimal` | `medium` | `95` | treino intenso de força/VO2 Max |

O caso de ausência total e o caso de um único sinal estão conservadores. Porém, a combinação de somente dois dos três sinais fisiológicos ainda libera recomendação intensa sem sono observado.

Isso pode ser aceitável somente se existir um contrato explícito dizendo que HRV + RHR são suficientes para essa recomendação. Esse contrato não está documentado e a política de fail-closed da auditoria exige comportamento conservador quando a cobertura fisiológica é incompleta.

**Classificação:** parcial; permanece risco P1/P2 dependendo do contrato de produto pretendido.

### 3.2 Energy Bank

Com sono, HRV e RHR completos:

| Dados de atividade | Status | Nível | Drain | Recomendação |
|---|---|---:|---:|---|
| passos e carga ausentes | `not_verifiable` | 70 | 10 | sincronizar atividade |
| somente passos | `ok` | 100 | 34 | atividades exigentes |
| somente carga | `ok` | 100 | 20 | atividades exigentes |
| passos/carga explicitamente zero | `ok` | 100 | 10 | atividades exigentes |
| passos e carga presentes | `ok` | 96 | 44 | atividades exigentes |

O código ainda executa:

```python
steps = float(today_metric.get("steps") or 0)
training_load = float(today_metric.get("training_load_daily") or 0)
```

E só marca `not_verifiable` quando **ambos** estão ausentes. Portanto, a ausência isolada de passos ou carga continua indistinguível de zero observado. A situação mais grave é carga ausente com passos presentes: o sistema pode recomendar treino exigente sem snapshot de carga.

Mesmo o caso de valores explicitamente zero produz nível 100, o que exige um contrato claro entre “zero medido” e “não houve medição”.

**Classificação:** não corrigido; bloqueador P1 para recomendação de treino/energia.

### 3.3 N-of-1

- Período invertido: HTTP `400`, corretamente rejeitado.
- Períodos sobrepostos: HTTP `200`, `saved=true`, experimento persistido.
- Resultado do caso sobreposto:

```text
control_mean: 41.0
 treatment_mean: 56.25
 cohens_d: 2.06
 p_value: 0.0483
 statistically_significant: true
```

O dia `2026-01-03` pertence simultaneamente ao controle e ao tratamento. A análise não rejeita a sobreposição e ainda declara significância.

**Classificação:** não corrigido; bloqueador P1/P2 para qualquer interpretação causal ou estatística.

### 3.4 Qualidade Zepp

Com um fixture sintético contendo um único registro diário agregado:

```text
hrv_ms:                sample_count=1,    coverage_pct=100.0, quality_status=not_verifiable
rhr_bpm:               sample_count=1,    coverage_pct=100.0, quality_status=not_verifiable
sleep_minutes:         sample_count=1,    coverage_pct=100.0, quality_status=not_verifiable
steps:                 sample_count=1440, coverage_pct=100.0, quality_status=high
```

O importador ainda grava:

```python
coverage = 100.0                 # basta haver um valor
sample_count = 1440              # passos agregados
```

Isso não representa densidade observacional real. Um agregado diário não prova 1.440 observações nem cobertura integral do dia.

As validações de plausibilidade e status `not_verifiable` para algumas métricas são melhorias, mas não corrigem os contadores sintéticos.

**Classificação:** parcial; P2 de confiabilidade dos dados.

### 3.5 Doctor Briefing

O valor laboratorial sintético continua sendo exibido:

```text
| Marcador sintético | **999.0 u** | 0.0-100.0 | - | 🔴 Fora da Ref. (Acima) |
```

A classificação está melhor que o comportamento anterior, mas o briefing ainda apresenta dado sintético como se fosse um exame fisiológico.

Além disso, `patient_age=40` continua ignorado no Markdown:

```text
**Paciente**: Teste (32 anos)
```

O PDF mantém lógica semelhante para idades sentinela e contém alvos fisiológicos hard-coded, por exemplo `< 60 bpm`, `> 40 ms`, `96 - 99%` e `> 45.0 mL/kg/min`.

**Classificação:** parcial; P2 de representação e confiabilidade.

### 3.6 Duração de treino

Probe atual:

```python
{
  'generic_duration_120': 120,
  'explicit_seconds_120': 2.0,
  'explicit_minutes_120': 120
}
```

Os campos explícitos funcionam, mas o campo genérico `duration=120` continua semanticamente ambíguo. O fallback ainda depende de limiar numérico (`duration >= 300`) para inferir segundos.

**Classificação:** parcial; P2 de contrato de dados.

### 3.7 GETs, health e lifecycle SQLite

O probe de 14 leituras produziu:

```text
13 endpoints: HTTP 200
/api/version: HTTP 404
hash do SQLite antes/depois: inalterado
```

Os GETs testados não alteraram o conteúdo do banco.

Ao tentar remover o banco enquanto o app estava ativo, o Windows retornou:

```text
WinError 32 — arquivo já está sendo usado por outro processo
```

O mesmo ocorreu durante cleanup de fixtures após probes do importador. Isso evidencia conexões SQLite mantidas abertas pelo repositório/app. Não é evidência de mutação por GET, mas é um problema de lifecycle que dificulta rotação, limpeza, backup e testes isolados no Windows.

### 3.8 Documentação da API

`docs/api-reference.md` documenta:

```text
GET /api/version
```

Mas o endpoint atual retorna HTTP 404. A versão está disponível no `/api/health` e no metadata do objeto FastAPI, não nesse caminho documentado.

A documentação também continua incompleta para os contratos recentes de orientação diária, Energy Bank, qualidade e check-in.

**Classificação:** não conformidade documental P3, com divergência executável confirmada.

## 4. O que permanece corrigido

As seguintes correções continuam comprovadas:

- ausência total de dados na orientação retorna `score=None` e `insufficient_data`;
- somente um sinal atual não libera recomendação intensa;
- dados futuros não foram usados no probe temporal;
- Energy Bank sem qualquer atividade retorna estado `not_verifiable`;
- períodos N-of-1 invertidos são rejeitados com HTTP 400;
- correlações respeitam mínimo de amostra: 19 pares produzem 0 resultados e 20 pares produzem 1;
- `/api/health` não retorna caminho absoluto do banco;
- GETs auditados mantiveram o hash do banco;
- sincronização Zepp valida metadata recente e fontes primárias;
- marcadores acima da referência são classificados como fora da referência;
- build e testes de frontend continuam funcionando.

Essas correções não eliminam os casos negativos acima.

## 5. Validação automatizada desta rodada

### Backend

```text
114 passed in 29.76s
```

Executado com `LONGEVIDADE_DB_PATH` em banco SQLite temporário.

### Frontend unitário

```text
11 test files passed
36 tests passed
```

### Build

```text
TypeScript + Vite build: sucesso
1497 módulos transformados
```

### Playwright

```text
4 passed
```

Os E2E usam servidor Vite em `127.0.0.1:3030` e dados mockados; não substituem os probes de contrato real do backend.

### FastAPI integrado

Servidor isolado em `127.0.0.1:8899`:

```text
GET /                  -> 200, frontend compilado servido
GET /api/health        -> 200
GET /api/version       -> 404
```

O processo foi encerrado após a verificação; a porta `8899` ficou livre. O servidor operacional em `8887` não foi encerrado nem alterado.

## 6. Gate de aprovação

| Área | Estado | Pode aprovar? |
|---|---|---:|
| Build e testes felizes | aprovado | sim |
| Orientação sem dados | corrigido | sim |
| Orientação com cobertura parcial | parcial | não |
| Energy Bank com atividade parcial | falho | não |
| N-of-1 sem sobreposição | falho | não |
| Qualidade Zepp observacional | parcial | não |
| Doctor Briefing | parcial | não |
| Unidades de duração | parcial | não |
| Lifecycle SQLite Windows | falho/parcial | não |
| Documentação da API | divergente | não |

## 7. Correções necessárias antes de declarar “tudo corrigido”

1. **Energy Bank:** não usar `or 0` para dados ausentes; distinguir explicitamente `None` de zero observado e bloquear recomendações intensas quando passos ou carga necessária estiverem ausentes.
2. **N-of-1:** rejeitar períodos sobrepostos, datas inválidas e intervalos que compartilham observações; não persistir análise inválida.
3. **Orientação:** formalizar o conjunto mínimo de sinais para cada classe de ação; cobertura incompleta não deve liberar treino intenso sem justificativa documentada e teste negativo.
4. **Qualidade Zepp:** derivar `sample_count` e cobertura de observações reais; nunca usar `1440` ou `100%` apenas porque há um agregado.
5. **Doctor Briefing:** remover sentinelas de idade, aceitar qualquer idade válida explicitamente fornecida e marcar/descartar fixtures ou valores sintéticos.
6. **PDF:** substituir metas hard-coded por referências versionadas e explicitamente identificadas como não diagnósticas.
7. **Duração:** transportar unidade explícita no campo normalizado e rejeitar campos genéricos ambíguos em vez de inferir por limiar.
8. **SQLite:** fechar conexões/cursors com lifecycle explícito e validar rotação/cleanup no Windows.
9. **Documentação:** corrigir `/api/version` ou implementar o endpoint e documentar os contratos novos.
10. **Frontend:** serializar autosaves, impedir respostas antigas de sobrescrever estado novo e completar `aria-label`/`aria-pressed` das escalas e tags.

## Conclusão

A nova avaliação não aprova a declaração de que tudo foi corrigido. O Codex corrigiu vários achados da auditoria anterior, mas o mesmo HEAD ainda falha em cenários negativos diretamente ligados à segurança semântica dos dados e às recomendações de saúde/treino.

Não houve alteração de código nesta auditoria. O único artefato novo é este relatório.
