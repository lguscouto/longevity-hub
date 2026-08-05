# Nova avaliação pós-Codex — Longevidade Hub (v6)

**Data da execução:** 05/08/2026
**Branch:** `master`
**HEAD avaliado:** `473fa67` — `fix(v5-audit): resolve all 8 pendencies from v5 evaluation report`
**Base comparada:** `fb635a3` (HEAD da revisão v5)

---

## Veredito executivo

O commit atual corrige parte relevante das pendências da v5, mas a alegação de que **"tudo foi resolvido" é falsa**.

Há três bloqueadores verificáveis para uso como recomendador de saúde/treino:

1. o guardrail de IA ainda é contornável e permite/persiste recomendação de treino intenso com dados insuficientes;
2. o PDF do Doctor Briefing ainda inclui um marcador declarado sintético como se fosse exame real;
3. o preset de PhenoAge da interface salva valores de exemplo como exames canônicos sem qualquer provenance sintética.

Além disso, o check-in reduziu chamadas com debounce, mas não serializa requisições concorrentes nem protege respostas fora de ordem.

**Classificação operacional atual:** dashboard experimental de acompanhamento pessoal.
**Não aprovado** para recomendar intensidade de treino ou servir como material clínico confiável sem revisão humana.

---

## Escopo e método

A revisão foi feita sem alterar código de produção e sem usar banco, relatórios ou credenciais reais.

Foram usados:

- SQLite temporário em cada probe;
- fixtures sintéticas locais;
- `TestClient` FastAPI para contratos HTTP reais das rotas;
- respostas adversariais simuladas no adaptador de LLM, sem chamada externa;
- PDF real gerado por ReportLab e extraído com `pdftotext`;
- testes React efêmeros, removidos após a execução;
- servidor Uvicorn temporário em `127.0.0.1:8899`, encerrado e verificado ao final.

Nenhum segredo, token ou dado pessoal foi incluído neste relatório.

---

## Mudanças identificadas desde v5

O commit `473fa67` alterou os seguintes pontos relevantes:

- validação pós-processamento para as rotas de IA;
- parse de datas em N-of-1;
- debounce e atributos ARIA no check-in diário;
- descarte de duração Zepp ambígua sem unidade;
- qualidade Zepp agregada marcada como não verificável;
- fechamento explícito da conexão em `initialize_db()`;
- filtro Markdown de marcadores com nomes sintéticos;
- catálogo centralizado para metas fisiológicas no PDF;
- duas novas provas unitárias de guardrail de IA.

---

## Correções comprovadas

### 1. Conexão SQLite em `initialize_db()` — corrigida

O `with sqlite3.connect(...)` anterior fazia commit/rollback, mas não fechava a conexão no Windows. A implementação atual usa `try/finally` e `conn.close()`.

Probe executado no mesmo processo:

```text
initialize_db(temp_db)
shutil.rmtree(temp_dir) -> ok
```

O `WinError 32` reproduzido na v5 não ocorreu.

---

### 2. Qualidade de snapshot diário Zepp — corrigida no contrato avaliado

Para um único agregado diário sintético de passos:

```json
{
  "sample_count": 1,
  "coverage_pct": null,
  "quality_status": "not_verifiable"
}
```

O sistema não afirma mais `100%` de cobertura nem qualidade `high` a partir de um único snapshot diário.

---

### 3. Duração Zepp sem unidade — corrigida

Foram avaliados três registros no mesmo dia:

- `duration=120`, sem unidade: descartado;
- `duration=120, unit="s"`: convertido em 2 minutos;
- `duration_min=120`: preservado como 120 minutos.

Resultado observado:

```text
workout_count=3
workout_duration_min=122.0
```

Logo, o campo genérico ambíguo não é mais interpretado por heurística numérica.

---

### 4. N-of-1 — corrigido

Contratos HTTP atuais:

```text
períodos sobrepostos  -> HTTP 400
"2026-99-99"          -> HTTP 422
```

As datas são campos `date` do Pydantic e os períodos são convertidos explicitamente para ISO antes da persistência.

---

### 5. Doctor Briefing Markdown: idade e marcador explicitamente sintético — corrigidos parcialmente

Resultado do probe:

```text
**Paciente**: Teste (40 anos)
markdown_contains_marker=False
```

A idade explícita é respeitada e o gerador Markdown ignora nomes/chaves contendo termos como `sintético`, `fixture`, `mock` ou `teste`.

---

### 6. Endpoint e servidor isolado — aprovados no smoke test

Servidor temporário iniciado com banco isolado:

```text
GET /               -> HTTP 200
GET /api/health     -> HTTP 200
GET /api/version    -> HTTP 200
```

Respostas observadas:

```json
{"status":"ok","system":"Longevidade Hub","database_connected":true,"version":"0.6.0"}
```

```json
{"version":"0.6.0","system":"Longevidade Hub"}
```

O SHA-256 do banco temporário permaneceu inalterado durante os GETs consultados. Após a auditoria, a porta `8899` foi confirmada livre.

---

### 7. Metas fisiológicas no PDF — melhoria estrutural confirmada

As metas deixaram de estar repetidas inline no gerador e passaram a ser consultadas em `physiological_targets.py`. O PDF agora rotula a coluna como referência geral.

Isso melhora manutenibilidade e reduz a dispersão de constantes, mas não transforma metas gerais em metas clínicas personalizadas.

---

## Falhas ainda reproduzíveis

## P0 — Guardrail de IA é contornável em dados insuficientes

A nova proteção é baseada em uma lista curta de substrings:

```python
["intenso", "intensa", "vo2 max", "exigente", "ignorar", "força", "alta intensidade"]
```

Ela não aplica uma política semântica nem substitui conteúdo inseguro por padrão quando o estado é restrito.

### Probe HTTP: dados ausentes + vocabulário fora da lista

Resposta simulada do LLM:

```text
Faça sprints máximos hoje, mesmo sem os dados de recuperação.
```

Resposta real da rota `POST /api/ai/generate-insights`:

```json
{
  "http_status": 200,
  "guardrail_applied": true,
  "insight_text": "Faça sprints máximos hoje, mesmo sem os dados de recuperação.",
  "actionable_steps": "Faça sprints máximos hoje, mesmo sem os dados de recuperação."
}
```

O campo decorativo `guardrail_applied=true` não bloqueia, remove, reescreve nem impede a persistência do conteúdo perigoso.

### Probe HTTP: dois sinais atuais, terceiro ausente

O motor determinístico retornou corretamente:

```json
{
  "state": "moderate",
  "confidence": "medium",
  "score": 70,
  "observed_signals": ["hrv_ms", "rhr_bpm"],
  "missing_signals": ["sleep_minutes"],
  "primary_action": "Mantenha treinos leves/médios de Zona 2 e regularidade na rotina.",
  "limitations": [
    "Falta o sinal de recuperação sleep_minutes para recomendação de treino elevado/intenso."
  ]
}
```

Mesmo assim, a rota retornou recomendação intensa inalterada:

```json
{
  "http_status": 200,
  "guardrail_applied": null,
  "insight_text": "Faça um treino intenso hoje.",
  "actionable_steps": "Faça um treino intenso hoje."
}
```

Causa direta: o gate considera apenas `confidence in ("low", "unavailable")`; `medium` não é restrito, embora o algoritmo de orientação proíba treino intenso com dois de três sinais.

### Chat e persistência também falham

O mesmo vocabulário alternativo foi enviado a `POST /api/ai/chat` com dados ausentes.

```text
HTTP 200
reply=Faça sprints máximos hoje, mesmo sem os dados de recuperação.
```

A resposta insegura também foi persistida no histórico de IA.

**Impacto:** o principal requisito fail-closed continua ausente. A aplicação ainda pode recomendar treino intenso diante de dados insuficientes.

---

## P1 — PDF continua apresentando marcador sintético como exame real

O gerador Markdown recebeu filtro, mas o PDF não recebeu filtro equivalente.

Fixture persistida:

```text
Marcador sintético | 999.0 u | referência 0.0–100.0
```

Texto extraído do PDF real:

```text
2. Marcadores Laboratoriais Recentes
Marcador sintético
999.0 u
Ref. Lab 0.0 - 100.0
```

O PDF é exatamente o canal de exportação direcionado ao médico, portanto o comportamento é materialmente mais grave do que no Markdown.

---

## P1 — O preset PhenoAge cria exames sem provenance sintética

A interface possui o botão **“9 Marcadores PhenoAge”**. O teste efêmero do componente confirmou que ele envia nove registros como:

```text
metric_key=fasting_glucose
metric_name=Glicose de Jejum
value=88
```

Nenhum registro inclui:

```text
source
notes
synthetic
```

Consequentemente:

- os dados de exemplo são indistinguíveis de resultados laboratoriais reais;
- o filtro baseado em palavras (`mock`, `fixture`, `sintético`) não os detecta;
- Markdown, PDF, cálculos derivados e painel podem tratar valores de exemplo como dados clínicos reais.

O botão deve ser convertido em calculadora/preview não persistente, ou o esquema precisa de uma provenance explícita e fail-closed (por exemplo, `record_origin=synthetic|patient_lab|imported`).

---

## P2 — Check-in diário continua sem serialização de escrita

Foram adicionados debounce de 600 ms e atributos ARIA, o que é uma melhoria real. Porém:

- não há fila/serialização de PUTs;
- não há `AbortController` ou cancelamento de request anterior;
- não há número de versão/compare-and-swap;
- não há prevenção de resposta antiga sobrescrever estado novo;
- não há limpeza do timer no unmount.

Teste React efêmero:

1. um PUT foi iniciado e mantido pendente;
2. uma segunda alteração foi feita;
3. após o debounce, um segundo PUT iniciou antes da conclusão do primeiro.

Resultado:

```text
2 PUTs concorrentes enquanto o primeiro permanecia pendente
```

O debounce diminui volume, mas não cumpre a garantia de consistência pedida para atualizações assíncronas concorrentes.

---

## Cobertura de testes executada

```text
Backend pytest:          116 passed in 28.75s
Frontend Vitest:         36 passed em 11 arquivos
Build TypeScript/Vite:   sucesso
Playwright E2E:          4 passed
Teste efêmero check-in:  1 passed (confirmou concorrência)
Teste efêmero PhenoAge:  1 passed (confirmou ausência de provenance)
```

Os testes novos de guardrail cobrem somente termos explicitamente enumerados e o cenário de dados totalmente ausentes. Eles não cobrem:

- vocabulário alternativo de treino intenso;
- estado `confidence="medium"`;
- sanitização de `insight_text`;
- persistência de conteúdo bloqueado;
- rota `/api/ai/chat`;
- comportamento de exportação PDF;
- provenance do preset PhenoAge;
- concorrência no check-in.

---

## Requisitos mínimos antes de nova aprovação

1. **Substituir blacklist textual da IA por política determinística.**
   - Se a orientação não tiver `confidence="high"`, ou se Energy Bank estiver `unavailable`/`not_verifiable`, gerar somente uma resposta permitida pelo aplicativo.
   - Não devolver nem persistir texto cru do LLM que contrarie a política.
   - Sanitizar `insight_text`, `actionable_steps` e chat; cobrir sinônimos, não apenas palavras literais.

2. **Implementar provenance de exame no esquema e na UI.**
   - Registrar a origem como dado laboratorial real, importado, manual, cálculo, demo ou fixture.
   - Bloquear por padrão dados sintéticos em Doctor Briefing Markdown/PDF e em análises clínicas.
   - Remover ou tornar não persistente o preset de PhenoAge até existir essa distinção.

3. **Aplicar o mesmo filtro ao PDF.**
   - A política de elegibilidade deve ser compartilhada entre Markdown e PDF, não duplicada.

4. **Serializar autosave do check-in.**
   - Usar fila por data ou revisão monotônica;
   - cancelar/ignorar requests obsoletas;
   - limpar timers no unmount;
   - adicionar teste de resposta fora de ordem e falha de rede.

---

## Conclusão

O commit `473fa67` resolveu corretamente seis aspectos relevantes da v5: fechamento SQLite, qualidade Zepp agregada, duração ambígua, N-of-1, idade/filtro Markdown e endpoint documentado. Também melhorou acessibilidade e organização das metas do PDF.

No entanto, **não resolve os controles que mais importam para segurança de decisão**:

- recomendações intensas ainda atravessam a IA em estados restritos;
- dados sintéticos ainda podem chegar ao material médico, principalmente via PDF e preset da interface;
- gravações concorrentes de check-in continuam sem controle de ordem.

Portanto, a conclusão permanece: **não aprovado como recomendador de saúde/treino; somente dashboard experimental com supervisão humana.**
