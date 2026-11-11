# Baselines visuais — Longevidade Hub

O teste visual cobre seis telas (`overview`, `labs`, `workouts`, `supplements`, `ai` e `profile`), em dois tamanhos (375×667 e 1280×800) e dois temas (claro e escuro): 24 capturas por plataforma.

## Referências ativas

- [`baselines/win32/`](baselines/win32/): Chromium executado no Windows.
- [`baselines/linux/`](baselines/linux/): Chromium da imagem oficial Playwright usada pelo CI.
- Cada pasta contém 24 PNGs e um `metadata.json` com plataforma, viewport, tema, estado e instante de captura.
- As imagens antigas diretamente em `baselines/` e em `legacy/` são registros históricos; não são carregadas pelo teste ativo.

As referências das duas plataformas foram inspecionadas lado a lado. A execução comum compara pixels e não atualiza imagens ou metadados. A tolerância atual é `maxDiffPixelRatio: 0.01` por captura.

## Comparar

No Windows, a configuração lê `win32`:

```powershell
cd frontend
npm run test:visual
```

No Linux/CI, usar a mesma imagem e dependências Playwright do workflow. Em CI, o comando é executado no container do workflow:

```sh
cd frontend
npm run test:visual
```

## Capturar uma proposta de atualização

Uma atualização é deliberada: gere candidatos fora das pastas aprovadas, revise os 24 resultados e só então promova PNGs e manifesto para a pasta da plataforma correspondente. O `--output` usa um diretório separado para evitar que o Playwright limpe a pasta de candidatos.

Windows (PowerShell):

```powershell
cd frontend
$env:LONGEVIDADE_VISUAL_CANDIDATES = '1'
npm run test:visual:update -- --output=test-results/phase5-capture-win32
Remove-Item Env:LONGEVIDADE_VISUAL_CANDIDATES
```

Linux/CI (execute no diretório raiz do repositório; a imagem abaixo corresponde ao workflow):

```sh
docker run --rm --init --ipc=host \
  --mount type=bind,source="$PWD",target=/repo \
  --mount type=volume,source=longevidade-phase5-node-modules,target=/repo/frontend/node_modules,volume-nocopy \
  -w /repo/frontend \
  -e CI=1 -e TZ=America/Sao_Paulo -e LONGEVIDADE_VISUAL_CANDIDATES=1 \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  sh -ec 'npm ci && npm run test:visual:update -- --output=test-results/phase5-capture-linux'
```

Não use `--update-snapshots` no fluxo de comparação nem copie candidatos sem revisão visual. A suíte fixa locale, fuso, relógio, tema, dados simulados e movimento reduzido. Dados reais e o banco operacional não são usados.
