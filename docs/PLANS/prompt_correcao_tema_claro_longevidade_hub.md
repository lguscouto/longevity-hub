# Prompt para Codex — Corrigir o Tema Claro do Longevidade Hub

Você está trabalhando no projeto **Longevidade Hub**, localizado exclusivamente em:

```text
e:\hermes\longevidade
```

O frontend utiliza React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts e Vitest.

## Contexto

Já foi implementada uma opção de tema claro no menu de Configurações, porém o resultado visual ficou incorreto.

O tema escuro atual é o tema original e está visualmente correto. Ele deve permanecer intacto.

O problema está exclusivamente na aparência do novo tema claro.

## Problemas observados no tema claro

A implementação atual apresenta uma mistura inconsistente entre tema claro e tema escuro:

1. O fundo principal da aplicação continua escuro.
2. A barra de data e período continua escura.
3. Os cartões ficaram claros, mas os textos principais continuam brancos.
4. Labels, descrições e valores possuem contraste insuficiente.
5. O cabeçalho ficou claro, mas a logo e os textos não foram corretamente adaptados.
6. O container da navegação ficou cinza-escuro, fazendo itens inativos parecerem desabilitados.
7. Divisores, bordas, botões, inputs e ícones não seguem uma paleta clara consistente.
8. Cards inferiores continuam misturando superfícies claras e escuras sem hierarquia.
9. Há indícios de classes rígidas, como `text-white`, `bg-slate-950`, `bg-black`, `border-white/*` e cores hexadecimais diretamente nos componentes.
10. O tema foi aplicado apenas parcialmente em alguns elementos.

## Objetivo

Corrigir completamente o tema claro existente para que ele seja uma versão clara, limpa, coerente e legível do tema escuro atual.

O resultado esperado é:

- fundo geral claro;
- superfícies e cartões brancos;
- textos escuros;
- bordas suaves;
- elementos secundários em cinza-claro;
- destaque verde/turquesa preservado;
- contraste adequado;
- nenhuma mistura involuntária com o tema escuro.

Não redesenhe a aplicação.

Não altere estrutura, espaçamentos, componentes, navegação ou identidade visual.

---

# 1. Preservar integralmente o tema escuro

O tema escuro atual é a referência oficial.

Não faça ajustes visuais nele, salvo quando forem estritamente necessários para substituir uma cor fixa por um token que preserve exatamente o mesmo resultado escuro.

Ao converter uma cor fixa em token semântico:

- o valor do token no tema escuro deve reproduzir a aparência atual;
- não clarear ou escurecer arbitrariamente o tema original;
- não mudar bordas, sombras, fundos ou textos do tema escuro;
- não modificar as cores de destaque existentes.

Antes e depois da alteração, compare visualmente o tema escuro para identificar regressões.

---

# 2. Corrigir o fundo geral da aplicação

No tema claro, toda a área principal deve utilizar um fundo claro.

Utilizar uma referência semelhante a:

```css
--app-background: #f4f7fb;
```

ou:

```css
--app-background: #f8fafc;
```

O fundo principal não pode continuar usando:

```text
preto
azul-marinho
slate-950
navy
```

Isso inclui:

- elemento `html`;
- elemento `body`;
- root do React;
- layout principal;
- área abaixo do cabeçalho;
- conteúdo das páginas;
- wrappers de dashboard.

No tema claro, não deve existir uma grande área escura envolvendo cartões claros.

---

# 3. Criar uma paleta clara coerente

Utilizar tokens semânticos centralizados.

Paleta de referência para o tema claro:

```css
:root,
[data-theme="light"] {
  --app-background: #f4f7fb;

  --surface-primary: #ffffff;
  --surface-secondary: #f8fafc;
  --surface-tertiary: #f1f5f9;
  --surface-hover: #eef2f7;
  --surface-selected: #e6f8f4;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --text-subtle: #94a3b8;

  --border-primary: #dbe3ee;
  --border-secondary: #e2e8f0;
  --divider: #e2e8f0;

  --header-background: #ffffff;
  --navigation-background: #f8fafc;
  --input-background: #ffffff;
  --overlay-background: rgba(15, 23, 42, 0.45);

  --shadow-card:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 6px 18px rgba(15, 23, 42, 0.05);
}
```

Esses valores são referências. Ajuste-os à arquitetura atual, mas mantenha a mesma lógica visual.

A cor verde/turquesa da identidade do projeto deve continuar sendo utilizada como cor principal de destaque.

Não substituir a identidade atual por azul genérico.

---

# 4. Corrigir o cabeçalho

No tema claro, o cabeçalho deve possuir:

- fundo branco ou cinza muito claro;
- borda inferior suave;
- textos escuros;
- textos secundários em cinza;
- ícones escuros ou semânticos;
- sombra muito discreta, caso necessário.

O cabeçalho não deve utilizar um fundo cinza pesado.

## Logo

Verificar como a logo é construída.

Caso a logo seja composta por texto HTML:

- usar texto escuro no tema claro;
- preservar a parte verde/turquesa;
- manter texto branco no tema escuro.

Caso seja uma imagem oficial:

- não editar o arquivo;
- não aplicar filtros CSS que mudem suas cores;
- procurar uma versão oficial alternativa no repositório;
- na ausência de uma versão apropriada, usar um container que mantenha a logo legível.

Também corrigir o subtítulo abaixo da logo, que deve possuir contraste suficiente no tema claro.

---

# 5. Corrigir a navegação superior

No tema claro, o container central da navegação não deve parecer um bloco escuro ou desabilitado.

Utilizar:

- fundo branco ou cinza muito claro;
- borda suave;
- texto inativo em cinza médio;
- ícones inativos em cinza médio;
- hover visível;
- item ativo mantendo o verde/turquesa atual;
- texto do item ativo com contraste adequado.

Referência:

```text
Navegação inativa:
- fundo transparente
- texto #64748b
- ícone #64748b

Hover:
- fundo #f1f5f9
- texto #0f172a

Selecionado:
- fundo verde/turquesa atual
- texto branco
```

Não utilizar baixa opacidade em todo o item inativo.

Itens inativos devem parecer disponíveis, não desabilitados.

---

# 6. Corrigir botões do cabeçalho

Revisar individualmente:

- Configurações;
- Registrar;
- Doctor Briefing;
- Sync Zepp.

No tema claro:

### Botão neutro

```text
fundo branco
texto escuro
borda cinza-clara
hover cinza-claro
```

### Botão de destaque

Manter o verde/turquesa atual com texto de contraste adequado.

### Botão contornado

Usar borda e texto turquesa suficientemente escuros para fundo claro.

Não deixar textos em ciano muito claro sobre fundo cinza-claro.

---

# 7. Corrigir a barra de data e período

A barra contendo:

- seletor de data;
- botão Hoje;
- data escrita por extenso;
- seletor 7d, 30d e 90d;

deve utilizar o tema claro.

No tema claro:

```text
Container principal: branco
Borda: cinza-clara
Texto principal: escuro
Texto secundário: cinza médio
Controles internos: branco ou cinza muito claro
Estado ativo: verde/turquesa
Estado hover: cinza-claro
```

Não manter esse container em azul-marinho no tema claro.

O fundo dos seletores deve ser claramente distinguível do fundo geral da página.

---

# 8. Corrigir títulos e textos da página

No tema claro:

```text
Título principal: #0f172a
Texto secundário: #64748b
Texto discreto: #94a3b8
```

O título “Visão Geral” não pode continuar branco sobre um fundo que deveria ser claro.

A data de atualização deve ser legível, mas visualmente secundária.

O botão de atualização deve usar:

- fundo branco;
- borda cinza-clara;
- ícone escuro;
- hover cinza-claro.

---

# 9. Corrigir os cartões de métricas

Os cartões principais devem possuir:

```text
Fundo: branco
Borda: cinza-clara
Texto principal: escuro
Texto secundário: cinza médio
Divisor: cinza-claro
Sombra: suave
```

Não utilizar cinza médio como fundo principal dos cartões.

Não manter números ou descrições em branco.

## Hierarquia correta

### Label da métrica

Exemplos:

```text
PASSOS 24H
RHR REPOUSO
HRV NOTURNA
```

Usar:

```text
cinza médio
peso semibold
contraste suficiente
```

### Valor principal

Exemplos:

```text
3.261
0h 00m
41,1 mL/kg/min
```

Usar:

```text
cor escura
peso forte
maior destaque visual
```

### Unidade

Usar texto secundário, sem ficar claro demais.

### Texto inferior

Exemplos:

```text
Meta: 10.000
Alvo: < 55 bpm
Monitorado
```

Usar cor secundária legível.

### Divisor

Usar um cinza-claro como:

```text
#e2e8f0
```

Não usar uma linha escura forte.

---

# 10. Preservar as cores dos ícones de métricas

Os ícones coloridos podem manter suas categorias atuais:

- passos em verde;
- coração em rosa/vermelho;
- HRV em ciano;
- sono em roxo;
- VO2 em amarelo;
- pressão em verde.

No tema claro:

- usar fundo colorido suave;
- usar borda colorida discreta;
- usar ícone com cor mais forte;
- garantir contraste.

Exemplo conceitual:

```text
Fundo: cor da categoria com baixa intensidade
Borda: cor da categoria com intensidade intermediária
Ícone: cor da categoria com intensidade forte
```

Não usar transparência tão alta que o ícone desapareça.

---

# 11. Corrigir cartões inferiores

Revisar especificamente:

- Idade Biológica;
- Score de Disciplina Blueprint;
- qualquer painel interno desses cards.

No tema claro:

- fundo externo branco;
- títulos escuros;
- descrições em cinza médio;
- valores principais escuros;
- bordas claras;
- divisores claros;
- badges legíveis;
- botões com contraste correto.

Painéis internos não devem permanecer cinza-escuro sem intenção.

Quando existir uma seção secundária dentro do card, utilizar:

```text
#f8fafc
```

ou:

```text
#f1f5f9
```

com texto escuro.

Não manter textos brancos em uma superfície clara.

---

# 12. Auditar cores fixas

Pesquisar no frontend por ocorrências semelhantes a:

```text
text-white
text-gray-100
text-slate-100
text-zinc-100

bg-black
bg-slate-950
bg-slate-900
bg-gray-900
bg-zinc-900

border-white
border-slate-700
border-slate-800

#000
#020617
#0f172a
#111827
```

Também pesquisar:

- estilos inline;
- objetos de estilo;
- configurações de gráficos;
- classes montadas por template string;
- pseudo-elementos;
- componentes compartilhados;
- arquivos CSS;
- variáveis antigas.

Não substituir cegamente todas as ocorrências.

Classificar cada uso como:

1. estrutural;
2. semântico;
3. cor de marca;
4. estado;
5. componente exclusivamente escuro;
6. conteúdo que realmente deve permanecer branco.

Exemplo de uso legítimo de texto branco:

- botão verde preenchido;
- badge colorido;
- conteúdo sobre superfície escura intencional;
- overlay.

Não manter `text-white` em cards brancos ou cinza-claros.

---

# 13. Utilizar tokens semânticos

Evitar implementar o tema claro adicionando centenas de condicionais como:

```tsx
theme === "light"
  ? "bg-white text-black"
  : "bg-slate-950 text-white"
```

Não espalhar lógica de tema pelos componentes.

Preferir classes ou tokens semânticos como:

```text
bg-app
bg-surface
bg-surface-secondary
text-primary
text-secondary
text-muted
border-primary
```

Mapear esses nomes para variáveis CSS ou para a estratégia já utilizada pelo Tailwind.

Exemplo conceitual:

```tsx
<div className="bg-surface text-primary border-border">
```

O componente deve permanecer o mesmo e receber automaticamente a paleta correta.

---

# 14. Não usar soluções artificiais

Não corrigir o tema utilizando:

- `filter: invert()`;
- opacidade aplicada no layout inteiro;
- filtros de brilho;
- sobreposição branca global;
- pseudoelemento cobrindo a página;
- alteração automática de todas as cores;
- regra CSS global forçando `color: black`;
- `!important` em grande escala;
- duplicação completa de cada página.

A solução deve ser estrutural e baseada em tokens.

---

# 15. Inputs, modais e componentes compartilhados

Auditar também componentes que podem não estar visíveis no screenshot:

- inputs;
- selects;
- textareas;
- checkboxes;
- radio buttons;
- modais;
- dropdowns;
- tooltips;
- toasts;
- tabelas;
- tabs;
- calendários;
- date pickers;
- skeletons;
- estados vazios;
- alertas;
- loaders.

No tema claro, todos devem usar:

- superfície clara;
- texto escuro;
- placeholder visível;
- borda distinguível;
- foco visível;
- estados de hover e disabled adequados.

Não limitar a correção ao dashboard.

---

# 16. Gráficos Recharts

Revisar os gráficos existentes.

No tema claro:

```text
Grade: cinza-claro
Eixos: cinza médio
Labels: cinza médio ou escuro
Tooltip: branco
Borda do tooltip: cinza-clara
Texto do tooltip: escuro
Cursor: cinza-claro
```

Centralizar as cores dos gráficos em um único módulo ou função.

Não alterar as cores das séries que já representem métricas específicas, salvo quando não houver contraste suficiente.

---

# 17. Propriedade `color-scheme`

Aplicar corretamente:

```css
color-scheme: light;
```

no tema claro e:

```css
color-scheme: dark;
```

no tema escuro.

Isso ajuda controles nativos do navegador, campos e barras de rolagem a acompanharem o tema.

Não usar apenas essa propriedade como substituto da estilização dos componentes.

---

# 18. Validação visual obrigatória

Validar o resultado em, no mínimo:

```text
Desktop: aproximadamente 1536 × 864
Mobile: aproximadamente 390 × 844
```

No desktop, verificar especificamente:

1. Cabeçalho;
2. Logo;
3. Navegação;
4. Botões;
5. Barra de data;
6. Título da página;
7. Cards de métricas;
8. Cards inferiores;
9. Modais;
10. Gráficos.

No celular, verificar:

1. Menu mobile;
2. Cabeçalho;
3. Cards empilhados;
4. Seletor de período;
5. Formulários;
6. Ausência de rolagem horizontal indevida.

Caso o projeto já possua Playwright, Cypress ou ferramenta de screenshots, reutilizá-la.

Não instalar uma nova biblioteca apenas para esta validação.

---

# 19. Testes

Manter os testes já existentes de:

- troca de tema;
- persistência;
- aplicação da classe ou atributo;
- fallback para tema escuro.

Adicionar ou atualizar testes para garantir:

1. Fundo principal correto no tema claro;
2. Cabeçalho usando tokens claros;
3. Barra de período usando tokens claros;
4. Card de métrica usando superfície clara;
5. Valor principal usando texto escuro;
6. Texto secundário usando token legível;
7. Navegação inativa não sendo marcada como desabilitada;
8. Tema escuro mantendo as classes ou tokens esperados.

Não criar testes frágeis baseados em todos os valores hexadecimais da página.

Testar principalmente o uso correto dos tokens e a aplicação do tema.

---

# 20. Critérios de aceitação

A correção somente estará concluída quando:

1. O fundo geral ficar claro no tema claro;
2. Não existir uma grande área preta envolvendo cards claros;
3. O cabeçalho estiver legível;
4. A logo estiver legível;
5. A navegação estiver clara e não parecer desabilitada;
6. A barra de data estiver clara;
7. Os cartões estiverem brancos;
8. Todos os números principais estiverem escuros;
9. Labels e descrições possuírem contraste adequado;
10. Divisores e bordas forem discretos;
11. Cards inferiores estiverem consistentes;
12. Inputs, modais e dropdowns estiverem adaptados;
13. Gráficos estiverem legíveis;
14. O destaque verde/turquesa for preservado;
15. Não houver `text-white` sobre superfícies claras;
16. O tema escuro permanecer visualmente igual ao original;
17. Não houver alterações estruturais no layout;
18. Os testes passarem;
19. O build de produção passar;
20. A documentação da estratégia de cores estiver atualizada.

---

# 21. Processo de execução

Antes de editar:

1. Inspecione a implementação atual do tema;
2. Identifique os arquivos alterados na primeira implementação;
3. Localize o provider ou hook de tema;
4. Localize os tokens atuais;
5. Identifique todas as cores rígidas;
6. Apresente um plano curto de correção;
7. Somente depois implemente as alterações.

Durante a correção:

- não reescreva o frontend;
- não redesenhe os componentes;
- não altere o backend;
- não instale dependências sem necessidade;
- não introduza `any`;
- não utilize `!important` indiscriminadamente;
- não desative testes;
- não esconda erros;
- não acesse arquivos fora de `e:\hermes\longevidade`.

---

# 22. Validação obrigatória

Executar:

```bash
cd frontend
npm run test -- --run
```

Depois:

```bash
npm run build
```

Caso exista script de lint:

```bash
npm run lint
```

Verificar primeiro o `package.json`.

Não declarar a tarefa concluída se algum comando falhar.

---

# 23. Relatório final

Ao concluir, apresentar:

1. Causa raiz da aparência incorreta;
2. Arquivos alterados;
3. Cores rígidas substituídas;
4. Tokens criados ou corrigidos;
5. Componentes revisados;
6. Como o tema escuro foi preservado;
7. Resultado da validação visual;
8. Resultado exato dos testes;
9. Resultado exato do build;
10. Pendências ou componentes ainda inconsistentes.

Inclua screenshots finais do dashboard nos temas claro e escuro, caso o ambiente permita.

Não ocultar problemas restantes.
