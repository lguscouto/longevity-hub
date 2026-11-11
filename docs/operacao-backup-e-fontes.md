# Operação, backup e fontes de dados

## Instalação e inicialização

O lock Python `backend/requirements-lock.txt` foi gerado para Windows x86_64 e Python 3.14. `run_app.bat --update` instala esse lock, registra o pacote sem resolver novas dependências e executa `npm ci` com `frontend/package-lock.json`; a opção substitui o conteúdo de `node_modules`. A instalação limpa desses locks e o build foram exercitados em diretórios temporários. O servidor dessa instalação foi iniciado com banco e diretório Hermes temporários e respondeu por HTTP.

O iniciador compara um fingerprint das fontes, configuração e lock do frontend e recompila quando necessário. A verificação cobre o `index.html` e os assets nele referenciados; não é uma auditoria de integridade de todos os chunks. Em `--dev`, o Vite serve as fontes diretamente. Veja [acesso e credenciais](acesso-e-credenciais.md) para a configuração obrigatória de senha e HTTPS.

## Backup e restauração isolada

O backup contém um snapshot consistente do SQLite, fotos encontradas em `data/physical_assessments` ou `data/photos`, e manifesto com hashes. Configurações persistidas no SQLite entram no banco. Não entram credenciais do cofre do sistema, variáveis de ambiente, configurações ou tokens em arquivos externos, código, dependências e configurações do roteador/proxy. Faça cópias próprias desses itens conforme necessário, protegendo seus segredos. O pacote não é criptografado.

```powershell
.venv\Scripts\python.exe -m src.longevidade.backup create
.venv\Scripts\python.exe -m src.longevidade.backup verify CAMINHO_DO_ZIP
.venv\Scripts\python.exe -m src.longevidade.backup restore CAMINHO_DO_ZIP --db CAMINHO_ISOLADO\longevity.sqlite3 --photos CAMINHO_ISOLADO\fotos
```

A restauração recusa um banco de destino existente e fotos que seriam sobrescritas. Ela valida o manifesto, hashes e integridade SQLite; use uma pasta isolada e mantenha a instalação operacional fechada durante qualquer procedimento manual de recuperação. A substituição do banco operacional não é realizada automaticamente por este fluxo.

O backup é obrigatório antes de ingestões em lote e reconciliação histórica. A reconciliação da linha do tempo na inicialização e no comando explícito adquire o lock compartilhado, cria e verifica um backup antes de processar; se falhar, não reconcilia. A inicialização pode levar mais tempo e produzir novos arquivos de backup.

## Retenção

Não há exclusão automática. Escolha quantas cópias manter e revise primeiro os arquivos elegíveis:

```powershell
.venv\Scripts\python.exe -m src.longevidade.backup retention --dir data\backups --keep 10
```

O parâmetro `--keep` deve ser no mínimo 1; o comando considera apenas nomes gerados pelo projeto e ignora links simbólicos. Adicione `--apply` somente quando quiser remover as cópias listadas. Escolha a retenção considerando também cópias externas e espaço disponível.

## Fontes e limites de proveniência

Na sincronização integrada, o Zepp é processado primeiro e Google Health depois; Hevy contribui principalmente com treinos. Para a mesma data e campo, `daily_metrics` aceita o último valor não nulo gravado; não há prioridade fixa por fonte em todas as entradas. Um valor nulo não apaga o valor já existente. As avaliações físicas prevalecem sobre métricas diárias na linha de composição quando as datas coincidem. A tabela de qualidade registra fonte por métrica em alguns fluxos, com cobertura parcial. Novas gravações invalidam os registros de qualidade dos campos atualizados, na mesma transação. Registros anteriores a essa regra podem estar desatualizados e o histórico existente não é reatribuído. O campo `source` da linha diária não comprova a origem de cada campo. Não usar essa informação como proveniência completa até corrigir e validar todos os caminhos.

O lock `sync.lock` coordena a sincronização HTTP, agendada, histórica e por webhook e a reconciliação da linha do tempo. A rotina histórica Zepp também cria e verifica backup antes de coletar ou importar. Em caso de contenção ou falha da coleta do webhook, um sinal vazio é salvo ao lado do banco. A próxima sincronização agendada e autenticada tenta coletar a janela habitual de 30 dias. O sinal é retirado após sucesso, e avisos recebidos durante a coleta ficam para a próxima execução. O mecanismo agrupa tentativas sem guardar conteúdo do evento e depende de uma execução agendada futura. A entrega ainda usa processamento em segundo plano. Os sinais locais ficam fora do backup. Os testes verificam exclusão mútua entre processos e não substituem a validação operacional das tarefas agendadas do usuário.

## Licenças e mídia

O repositório tem licença MIT em `LICENSE`. O código de exercícios aponta para [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset); o próprio projeto distingue o código e os dados das imagens e GIFs © Gym visual e informa que a reutilização da mídia está sujeita a termos e licença próprios. O Git não empacota as imagens ou GIFs de exercícios, que são consultados por URL externa. O catálogo local não identifica uma revisão exata da origem; licença específica para a mídia e direitos de redistribuição desta aplicação não foram comprovados. Não presumir que a licença MIT do projeto cubra essas mídias. Consulte a [licença e os avisos do projeto de origem](https://github.com/hasaneyldrm/exercises-dataset/blob/main/LICENSE) antes de redistribuir.
