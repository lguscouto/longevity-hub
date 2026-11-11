# Acesso e credenciais

O painel e o portal do personal têm sessões diferentes. O servidor exige sessão do proprietário nas APIs do painel e permite ao personal autenticado somente as leituras usadas pelo seu portal, incluindo fotos e ZIP. As sessões são mantidas na memória do processo e expiram; reiniciar o servidor encerra as sessões. A interface volta à entrada se não conseguir revalidar a sessão, verificando periodicamente e ao retornar à aba. O PIN antigo da interface não é uma credencial de autorização.

## Preparar o acesso do proprietário

No computador que executa o servidor e com o mesmo usuário Windows que executará a aplicação, configure a senha no cofre do sistema:

```powershell
.venv\Scripts\python.exe -m backend.app.access
```

Digite e confirme uma senha de pelo menos 12 caracteres no terminal. A digitação não é exibida. A aplicação não cria essa senha automaticamente. Para substituí-la, execute o comando novamente; a alteração é uma ação administrativa local. Após iniciar, abra o endereço local informado pelo aplicativo e entre com a senha. O portal do personal continua acessível pelo link da tela de entrada.

Se `frontend/dist` já existir após atualizar o código, execute `npm ci` quando necessário e `npm run build` dentro de `frontend` antes de iniciar; o iniciador atual não recompila automaticamente uma pasta existente.

Se a conta do personal ainda usar a senha inicial distribuída pelo projeto, o primeiro login exige escolher uma senha nova de pelo menos 12 caracteres antes de liberar os dados. Essa troca inicial só é aceita no próprio computador servidor ou em uma sessão do proprietário autenticada; isso impede que alguém use a senha pública para tomar a conta remotamente. Nenhuma senha existente é alterada automaticamente. Trocar a senha encerra as outras sessões do mesmo personal.

## Acesso remoto e proxy

Requisições de API externas exigem HTTPS. HTTP é aceito apenas quando o cliente e o endereço do serviço são loopback. Para proxy reverso, configure a terminação TLS e inclua somente os IPs dos proxies confiáveis em `LONGEVIDADE_TRUSTED_PROXIES`, separados por vírgulas. O proxy deve encaminhar `Host` e definir `X-Forwarded-Proto`; não deve aceitar esse cabeçalho diretamente do cliente. A aplicação ignora esse cabeçalho para os demais IPs.

Execute Uvicorn com `--no-proxy-headers`, como no `run_app.bat`, para impedir que um intermediário não configurado reescreva o esquema ou endereço antes da verificação da aplicação. A configuração de proxy, certificado, roteador e produção não é alterada pelo projeto. Teste o acesso HTTPS real no ambiente em que o servidor será usado antes de disponibilizá-lo remotamente.

O callback OAuth permanece público e valida o parâmetro de estado. O webhook Google exige segredo configurado em `GOOGLE_HEALTH_WEBHOOK_SECRET` ou `GOOGLE_HEALTH_ENDPOINT_AUTH`, ou assinatura criptográfica válida para notificações; o handshake exige o segredo. Sem esses controles o webhook rejeita a solicitação.

## Cofre e arquivos legados

Novas credenciais Google Health, Zepp e Hevy são gravadas no cofre do sistema; falha no cofre não deve resultar em gravação de novas credenciais em texto simples. Os arquivos legados continuam disponíveis para leitura e não são removidos automaticamente. O cofre deve estar acessível ao mesmo usuário que executa a sincronização agendada.

Para preparar uma cópia reversível de um arquivo legado, primeiro inspecione o resultado sem aplicar:

```powershell
.venv\Scripts\python.exe -m scripts.migrate_legacy_credentials google CAMINHO_DO_ARQUIVO
.venv\Scripts\python.exe -m scripts.migrate_legacy_credentials zepp CAMINHO_DO_ARQUIVO
.venv\Scripts\python.exe -m scripts.migrate_legacy_credentials hevy CAMINHO_DO_ARQUIVO
```

Adicione `--apply` ao comando escolhido para copiar a credencial ao cofre. A ferramenta não sobrescreve uma entrada existente e preserva o arquivo original. Para Google, informe o caminho de token configurado para a aplicação, pois ele identifica a entrada no cofre. A reversão exige uma decisão explícita sobre a entrada no cofre; não apague arquivos sem verificar o acesso e o backup.
