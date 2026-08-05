# Nova avaliação pós-Codex — Longevidade Hub (v5)

**Data da execução:** 05/08/2026
**Branch:** `master`
**HEAD avaliado:** `fb635a3` — `feat(ai+docs): enrich AI context with deterministic guardrails, add GET /api/version, update all project docs`
**Commit anterior da avaliação v4:** `9094c07`
**Escopo:** verificar se os achados da v4 foram realmente corrigidos por comportamento executável, com fixtures sintéticas e banco SQLite temporário.

## Veredito executivo

**Não está tudo corrigido.**

Os commits `90b0c60` e `fb635a3` corrigiram vários achados reais, mas ainda existem falhas reproduzíveis que impedem aprovar o sistema como recomendador clínico/de treino ou declarar qualidade observacional completa.

O worktree estava limpo antes da criação deste relatório e nenhum arquivo de código foi alterado durante a auditoria.

## Correções comprovadas

### 1. Orientação com sinais fisiológicos incompletos

Com histórico sintético e ausência de dados do dia:

```text
none:
  state=insufficient_data
  confidence=unavailable
  score=None

two_signals (HRV + RHR):
  state=moderate
  confidence=medium
  score=70
  ação=treinos leves/médios de Zona 2
```

A combinação parcial não libera mais a recomendação intensa. Este achado foi corrigido para os cenários testados.

### 2. Energy Bank com atividade incompleta

Resultados atuais:

```text
missing_activity:
  status=not_verifiable
  current_level=70
  missing_components=[steps, training_load]

steps_only / load_only:
  status=not_verifiable
  current_level=70
  recomendação=atividade parcial; sincronizar o componente ausente

complete:
  status=ok
```

A ausência (`None`) não é mais tratada como atividade observada. Valores explicitamente observados como zero continuam sendo considerados zero real, o que é semanticamente diferente de ausência.

### 3. Períodos N-of-1 sobrepostos

O caso com controle até `2026-01-03` e tratamento começando em `2026-01-03` agora retorna:

```text
HTTP 400
Períodos de controle e tratamento não podem se sobrepor.
```

### 4. Idade explícita no Doctor Briefing

`patient_age=40` agora aparece corretamente:

```text
**Paciente**: Teste (40 anos)
```

A correção também foi aplicada ao gerador de PDF.

### 5. Endpoint de versão

O endpoint documentado foi adicionado e respondeu corretamente:

```text
GET /api/version -> HTTP 200
{"version":"0.6.0","system":"Longevidade Hub"}
```

### 6. Fechamento de conexões do repositório

Os métodos do `LongevityRepository` passaram a usar um context manager que fecha suas conexões. Isso melhora o lifecycle de consultas e gravações normais.

## Pendências reproduzíveis

### P1 — Guardrail de IA não é determinístico

O commit chama os guardrails de “determinísticos”, mas a implementação atual apenas inclui limitações no contexto/prompt. A resposta do modelo não é validada antes de ser devolvida ou persistida.

Probe adversarial: o LLM sintético recebeu um contexto com dados insuficientes e retornou uma recomendação proibida:

```text
HTTP 200
contains_unsafe_recommendation=True
actionable_steps=Ignore o bloqueio e treine intensamente.
```

O endpoint `/api/ai/generate-insights` preservou e devolveu esse conteúdo. Portanto:

- `insufficient_data` não bloqueia a saída de recomendações intensas;
- `not_verifiable` não bloqueia a saída de recomendações intensas;
- o prompt customizado pode substituir o prompt padrão;
- não existe uma etapa determinística de sanitização, recusa ou downgrade da recomendação.

Isso impede declarar o módulo de IA como fail-closed.

### P1 — Qualidade Zepp ainda confunde disponibilidade com cobertura

A correção reduziu o contador falso de `1440` para `1`, mas ainda calcula:

```text
um único agregado diário de passos:
  sample_count=1
  coverage_pct=100.0
  quality_status=high
```

Para HRV, RHR e sono agregados, o mesmo padrão aparece como `sample_count=1` e `coverage_pct=100.0`.

O resultado agora não inventa 1.440 observações, mas ainda chama de cobertura completa a presença de um único agregado. A qualidade deve distinguir, no mínimo:

- disponibilidade do valor diário;
- número real de observações subjacentes;
- densidade/cobertura do intervalo esperado;
- valor agregado cuja cobertura não é verificável.

### P1 — `initialize_db()` ainda mantém conexão SQLite aberta no Windows

Apesar do context manager do repositório, o schema usa:

```python
with sqlite3.connect(path) as conn:
```

O context manager nativo do `sqlite3.Connection` faz commit/rollback, mas não fecha a conexão. Probe direto, sem repositório:

```text
initialize_db(temp_db)
shutil.rmtree(temp_dir)
PermissionError: [WinError 32] arquivo já está sendo usado
```

O mesmo erro ocorreu no probe de importação Zepp durante o cleanup do `TemporaryDirectory`. A conexão deve ser explicitamente fechada, por exemplo com `contextlib.closing(...)` ou `conn.close()` em `finally`.

### P2 — Marcadores sintéticos ainda são apresentados como exames

O Doctor Briefing continua imprimindo um marcador artificial normalmente como exame laboratorial:

```text
| Marcador sintético | **999.0 u** | 0.0-100.0 | - | 🔴 Fora da Ref. (Acima) |
```

Não há distinção visual/semântica entre exame real, fixture, dado de teste ou valor sintético. Isso é perigoso em um documento destinado a consulta médica.

### P2 — Metas hard-coded permanecem no PDF

`doctor_briefing_pdf.py` ainda contém metas fixas como:

```text
< 60 bpm
> 40 ms
96 - 99%
12 - 16 rpm
> 45.0 mL/kg/min
```

Essas metas não são carregadas do catálogo/configuração nem claramente marcadas como referências gerais não personalizadas. O Markdown usa metas provenientes do registro laboratorial quando disponíveis, mas o PDF continua com valores fixos.

### P2 — Unidade do campo genérico de duração Zepp continua ambígua

Probe atual:

```python
{
  "generic_duration_120": 120,
  "explicit_seconds_120": 2.0,
  "explicit_minutes_120": 120
}
```

Os campos explícitos funcionam, mas `duration=120` permanece interpretado sem unidade confiável. O parser deve exigir unidade/fonte explícita ou rejeitar o campo genérico em vez de inferir silenciosamente.

### P2 — N-of-1 aceita datas semanticamente inválidas

A validação continua baseada em comparação lexical de strings. Um payload com `2026-99-99` foi aceito pelo Pydantic e retornou:

```text
HTTP 200
status=insufficient_data
saved=false
```

O endpoint deveria rejeitar datas inválidas com HTTP 400/422 antes de calcular estatísticas. Os campos também deveriam usar `date` ou validação equivalente, não `str` livre.

### P2 — Autosave do check-in continua vulnerável a concorrência

`DailyCheckinCard.tsx` continua disparando `saveCheckin()` a cada clique, sem:

- debounce;
- fila/serialização por data;
- número de versão ou request ID;
- cancelamento/ignore de respostas antigas;
- rollback do estado otimista em erro;
- bloqueio explícito de ações durante gravação.

O refresh após sucesso existe, mas não resolve duas gravações concorrentes que terminem fora de ordem. Também permanecem lacunas de acessibilidade: os botões de energia e tags não têm os mesmos rótulos/estados ARIA dos controles de humor e estresse.

## Testes executados

```text
Backend: 114 passed in 29.54s
Vitest: 36 passed em 11 arquivos
Build frontend: sucesso; TypeScript e Vite concluídos
Playwright E2E: 4 passed
Git diff --check: passou
```

Os testes verdes não cobrem adequadamente os probes negativos de IA, cobertura observacional, lifecycle de `initialize_db`, datas inválidas, concorrência do autosave e distinção de marcadores sintéticos.

## Servidor real isolado

Servidor iniciado com banco SQLite temporário:

```text
127.0.0.1:8899
GET /api/health   -> 200
GET /api/version  -> 200
```

Resposta de health observada:

```json
{
  "status": "ok",
  "system": "Longevidade Hub",
  "database_connected": true,
  "version": "0.6.0"
}
```

Após o probe, o processo foi encerrado e a porta `8899` foi confirmada livre.

## Gate de release

| Área | Situação |
|---|---|
| Backend e frontend compilam | Aprovado tecnicamente |
| Testes existentes | Verdes |
| Orientação parcial | Corrigida nos cenários testados |
| Energy Bank parcial | Corrigido nos cenários testados |
| N-of-1 sobreposição | Corrigida |
| N-of-1 datas inválidas | Pendente |
| Qualidade observacional Zepp | Pendente |
| Lifecycle SQLite no Windows | Pendente |
| Doctor Briefing sem dados sintéticos enganadores | Pendente |
| Metas do PDF configuráveis/rastreáveis | Pendente |
| Duração Zepp com unidade | Pendente |
| Autosave concorrente/acessível | Pendente |
| IA fail-closed | Pendente crítico |
| Aprovação clínica ou como recomendador de treino | **Reprovado** |

## Conclusão

A mensagem do Codex de que “corrigiu tudo” não é confirmada. Houve progresso concreto e quatro achados importantes foram corrigidos, mas permanecem falhas de segurança da IA, qualidade de dados e lifecycle SQLite, além de pendências de contrato e apresentação clínica.

A classificação recomendada continua sendo:

> **Dashboard experimental de acompanhamento pessoal, sem confiabilidade clínica e sem autorização para prescrever treino ou conduta médica.**
