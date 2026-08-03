# Limitações e divergências verificadas

Esta lista registra achados concretos da leitura de código e validação em 29/07/2026. Ela existe para evitar que documentos, UI ou nomes de funcionalidades sejam interpretados como comportamentos que o repositório ainda não entrega.

A sequência recomendada para corrigir os itens está em [improvement-roadmap.md](improvement-roadmap.md).

## Alta prioridade

### 1. O formulário de métricas manuais usa uma rota inexistente

- **Frontend:** `frontend/src/App.tsx`, `handleSaveMetric`.
- **Chamada feita:** `POST /api/metrics/manual`.
- **Backend disponível:** apenas `POST /api/metrics` em `backend/app/routers/metrics.py`.
- **Efeito:** o botão **Registrar** abre o modal, mas o salvamento recebe 404. O frontend não apresenta o erro ao usuário.
- **Correção mínima:** apontar a chamada para `/api/metrics` ou declarar e testar uma rota `/manual` que delegue ao mesmo upsert.

### ✓ 2. A suíte de testes está isolada do banco operacional

**Resolvido na Fase 0.** O conftest cria banco temporário via `LONGEVIDADE_DB_PATH`, e `test_test_isolation.py` verifica que o banco real não é modificado. A suíte completa roda sem tocar `data/longevity.sqlite3`.

### ✓ 3. KDM exibido na tela passou a usar o KDM real

**Resolvido na Fase 2.** O KDM passou a ser calculado pelo algoritmo real, persistido em `kdm_records`, e a UI mostra o estado real (`status: ok/incomplete`) com biomarcadores faltantes quando aplicável.

### ✓ 4. Razões cardiovasculares normalizadas e conectadas

**Resolvido na Fase 2.** Chaves canônicas (`hdl_cholesterol`, `ldl_cholesterol`, etc.) foram adicionadas ao catálogo e mapeamentos criados na normalização de exames.

## Segurança e privacidade

### 5. Chaves de IA agora usam o cofre do SO para novas gravações, mas podem existir valores legados

O backend passou a gravar novas chaves no cofre do Windows via `keyring` e a expor apenas indicadores/máscaras. Ainda assim, bancos antigos podem conter valores legados até migração manual autorizada.

### ✓ 6. O contexto clínico agora respeita privacy_mode

**Resolvido na Fase 3.** O contexto respeita `privacy_mode=minimal` por padrão, removendo nome, nascimento e histórico completo. O modo `full` é opt-in explícito via confirmação na UI. O frontend exibe provedor, modelo e modo antes de todo envio externo.

### 7. Sem autenticação/autorização HTTP

O backend ainda não exige autenticação; qualquer processo que alcance o servidor local pode chamar as rotas. O CORS, porém, agora é explícito para loopback local.

## Operação e manutenção

### ✓ 8. `run_app.bat` agora instala dependências Node e reconstrói

**Resolvido na Fase 5.** O script verifica `frontend\node_modules` e executa `npm ci` se ausente. O frontend é compilado automaticamente no primeiro uso.

### ✓ 9. Importadores agora retornam resultado estruturado e são testáveis

**Resolvido na Fase 4.** `import_zepp_data` e `import_google_health_data` retornam dict estruturado com `records_read`, `records_inserted`, `records_rejected`, `status` e `exception_message`. Exceções são classificadas e propagadas via `log_pipeline_run`. Fixtures sintéticas em `tests/fixtures/` permitem testes determinísticos sem dependência externa.

### ✓ 10. CGM bruto persiste leituras e Pipeline tem histórico na UI

**Resolvido na Fase 4.** `cgm_readings` agora armazena leituras brutas com dedup por timestamp. Endpoints `/batch` e `/upload-csv` salvam leituras e derivam sumários. O endpoint `GET /api/pipeline-runs` expõe histórico sanitizado, e o `PipelineStatusPanel` na UI mostra estados distintos para "nenhuma fonte", "0 registros válidos" e "falha de importação".

### ✓ 11. Versão unificada em 0.6.0

**Resolvido na Fase 5.** `src/longevidade/version.py` é a fonte única (`__version__ = "0.6.0"`). O pyproject, o FastAPI, o frontend e o endpoint `/api/version` usam o mesmo valor.

### 12. Lote parcial de exames sempre cria PhenoAge

`ingest_lab_records` registra um PhenoAge para todo lote não vazio, embora o comentário indique que isso ocorreria somente quando os marcadores necessários estivessem presentes. Na prática, os marcadores ausentes recebem valores default antes do cálculo. Um painel incompleto pode, portanto, gerar uma idade biológica aparentemente válida, mas parcialmente baseada em valores padrão.

### 13. Chaves estrangeiras não são habilitadas nas conexões do repositório

O schema executa `PRAGMA foreign_keys = ON` somente na conexão de `initialize_db`. `LongevityRepository._get_connection()` abre conexões SQLite novas sem repetir o pragma. Assim, a garantia declarada de integridade referencial não está assegurada em todas as operações do repositório.

### 14. Documentação legada tinha referências de caminho e screenshots desatualizadas

- `docs/sdd.md` ainda aponta para `E:\antigravity\projetos\longevidade\docs\sdd.md`, e não para a raiz atual `E:\hermes\longevidade`.
- O README raiz cita um importador CGM em `src/longevidade/ingestion/`, mas a implementação atual fica em `backend/app/routers/cgm.py`.
- `docs/screenshots/README.md` referenciava três capturas `.png` inexistentes; essas referências foram corrigidas nesta documentação para os arquivos `.jpg` rastreados.

### ✓ 15. Frontend tem base de testes estabelecida

**Resolvido na Fase 5.** Vitest + jsdom + @testing-library/react configurados. 25 testes em 9 arquivos cobrem API, fluxo principal, KDM, CGM, consentimento de IA e consentimento de pipeline.

### 16. Dashboard usa valores estáticos como fallback para dados ausentes

Quando a API não retorna métricas, a Visão Geral exibe números pré-definidos em vez de um estado inequívoco de indisponibilidade: 4.100 passos, RHR 68 bpm, HRV 30 ms, sono 4h30 e VO2 41,08. Além disso, a carga global usa `Promise.all` sem estado de loading/erro; uma falha pode manter os fallbacks ou dados antigos sem aviso. Em uma aplicação de saúde, esses números podem ser interpretados incorretamente como medições reais.

### 17. Feedback de sincronização e upload pode reportar sucesso de forma incorreta

- `SyncProgressModal` define sucesso como qualquer `syncResult` não nulo. O objeto de erro criado por `App.tsx` em uma falha de rede satisfaz essa condição e pode mostrar “Sincronização Concluída!”.
- O upload CSV de CGM lê apenas o JSON da resposta, não testa `res.ok`, e renderiza tanto sucesso quanto falha em uma caixa verde.
- Diversas mutações (métricas manuais, exames, perfil, briefing, compliance e a maioria dos suplementos) tratam erros somente com `console.error` ou não conferem respostas HTTP não-2xx.

### ✓ 18. Primeiro clone agora é “um clique”

**Resolvido na Fase 5.** `run_app.bat` executa `npm ci` automaticamente se `frontend\node_modules` não existir, eliminando a etapa manual.

### ✓ 19. Configurações de IA da UI cobrem privacy_mode, chaves no cofre e consentimento

**Resolvido na Fase 3.** O `AISettingsModal` agora tem seletor de `privacy_mode` (minimal/full), rótulos de "Cofre do Windows", e o `AICopilotView` exige confirmação explícita com provedor + modelo + modo antes de enviar dados a LLM externo.

### 20. README promete métricas que a Visão Geral não exibe

O README menciona Readiness e “Peso vs Alvo”, porém os seis cartões da Visão Geral mostram passos, RHR, HRV, sono, VO2 e pressão arterial. Peso/meta aparecem apenas na tela de Perfil.

## Documentação antiga que requer cautela

`docs/sdd.md` descreve intenção arquitetural, não necessariamente o comportamento atual. As afirmações abaixo não correspondem ao código lido:

- transporte “REST API / Async Stream”: as chamadas são HTTP síncronas via `urllib.request`; não há streaming;
- interface abstrata `BaseAIProvider`: não existe essa classe; há três classes concretas;
- criptografia em repouso de chaves: inexistente;
- anonimização local antes do envio à IA: inexistente.

## Itens já verificados e funcionais

- Build de produção do frontend conclui com sucesso.
- A `.venv` funciona quando `PYTHONPATH` é limpo.
- Seis testes isolados passaram: persistência em banco temporário, contexto clínico, mock do provedor, PhenoAge e N-of-1.

Os achados acima não foram corrigidos nesta tarefa, pois o escopo solicitado foi leitura completa e documentação. Eles estão registrados para uma correção futura com testes isolados e sem expor dados reais.
