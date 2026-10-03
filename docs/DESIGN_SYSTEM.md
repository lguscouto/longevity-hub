# Design System — Longevidade Hub v2.2.0

> **Guia Canônico de Arquitetura Visual, Primitives, Tokens, Acessibilidade e Responsividade**  
> **Status:** Ativo & Em Governança Contínua (v2.2.0)  
> **Última Atualização:** Outubro/2026 (v2.2.0 — Baseline v2.1.0 consolidado)

---

## 1. Filosofia e Princípios de Design

O **Longevidade Hub** é uma plataforma médica e de saúde pessoal voltada à longevidade ativa, epigenética e biomarcadores integrativos. Seu design foi concebido sob cinco princípios inegociáveis:

1. **Sobriedade Clínica e Precisão Científica:**
   - A interface rejeita estética de "gamificação", hipérboles de marketing e cores saturadas aleatórias.
   - Elementos gráficos priorizam a legibilidade de dados densos, intervalos de referência clínicos e tendências biométricas confiáveis.
2. **Local-First & Soberania dos Dados:**
   - Todos os componentes são desenhados para funcionamento local autônomo.
   - Estado vazio, perda de conexão ou ausência de chaves de API não bloqueiam a visualização do histórico registrado.
3. **Transparência Epistemológica (Dado vs. Modelo):**
   - Dados observados diretamente (exames laboratoriais, aferições de balança, frequência cardíaca medida por sensor) são rigorosamente distinguidos de modelos matemáticos e inferências (PhenoAge de Morgan Levine, KDM Biological Age, sínteses de IA).
   - É estritamente proibido exibir dados sintéticos ou simulados ("mock data") em produção sem consentimento explícito do usuário.
4. **Acessibilidade Universal (WCAG 2.1 AA):**
   - Todo fluxo crítico deve ser operável via teclado, perceptível por leitores de tela e tolerante a preferências do sistema (como `prefers-reduced-motion`).
5. **Responsividade Contínua (Mobile-First Sem Degradação):**
   - A experiência móvel (smartphones e tablets) possui paridade de dados com a versão desktop, adaptando apresentações tabulares para cartões de linha (*Row Cards*) sem truncamento ilegível.

---

## 2. Tokens de Design (Tailwind CSS)

Os tokens fundamentais estão centralizados em `frontend/tailwind.config.js` e em variáveis CSS em `frontend/src/index.css`.

### 2.1. Escala de Arredondamento Semântico (Border Radius)

A gramática visual do Longevidade Hub adota uma escala semântica coesa mapeada sobre as classes utilitárias do Tailwind CSS e tokens em `tailwind.config.js`:

| Nível Semântico | Classe Tailwind | Valor Real | Aplicação Típica |
| :--- | :--- | :--- | :--- |
| `surface-xs` / `badge` | `rounded-lg` (`rounded-surface-xs`) | `8px` (`0.5rem`) | Badges de status, tags compactas, chips laboratoriais, botões micro. |
| `control` / `surface-sm` | `rounded-xl` (`rounded-surface-sm`) | `12px` (`0.75rem`) | Botões (`Button`), inputs de formulário (`Input`), caixas de seleção (`Select`), tooltips. |
| `card` / `surface-md` | `rounded-2xl` (`rounded-surface-md`) | `16px` (`1.0rem`) | Cards analíticos (`Card`), widgets de gráficos, painéis de métrica. |
| `dialog` / `surface-lg` | `rounded-2xl` (`rounded-surface-lg`) | `16px` (`1.0rem`) | Diálogos (`Modal`), gavetas laterais (`Drawer`), caixas de confirmação suspensas. |
| `pill` | `rounded-full` | `9999px` | Avatares circulares, badges em formato de pílula, barras de progresso, toggles. |

> [!NOTE]
> **Governança de Border Radius (v2.2.0):**
> Valores arbitrários de raio (ex: `rounded-[28px]`) e classes descontinuadas (`rounded-3xl`) são terminantemente proibidos e avaliados com `FAIL` no gate automatizado.
> A auditoria estática (`audit-design-system.mjs`) monitora o uso de classes Tailwind padrão (`rounded-lg`, `rounded-xl`, etc.) via teto de baseline decrescente (ratchet down: 447 abertos). O plano `UX_UI_48` consolidará a convergência definitiva para uma fonte única de verdade entre classes semânticas e tokens do Tailwind.

### 2.2. Tokens de Elevação e Sombras (Box Shadow)

| Token | Classe Tailwind | Definição | Aplicação |
| :--- | :--- | :--- | :--- |
| `subtle` | `shadow-subtle` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Controles em repouso, chips interativos. |
| `card` | `shadow-card` | `0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)` | Superfície padrão de cards em modo claro e escuro. |
| `dialog` | `shadow-dialog` | `0 20px 25px -5px rgb(0 0 0 / 0.25), 0 8px 10px -6px rgb(0 0 0 / 0.25)` | Modais, popovers e diálogos suspensos (Surface 4). |
| `elevation-1` | `shadow-elevation-1` | `0 1px 3px 0 rgb(0 0 0 / 0.1)` | Menus suspensos, dropdowns. |
| `elevation-2` | `shadow-elevation-2` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Painéis flutuantes, banners de notificação. |
| `elevation-3` | `shadow-elevation-3` | `0 10px 15px -3px rgb(0 0 0 / 0.15)` | Gavetas modais (`Drawer`), gaveta de timeline. |

### 2.3. Gramática de Superfícies (Surfaces 0 a 4)

| Superfície | Contexto | Modo Claro | Modo Escuro |
| :--- | :--- | :--- | :--- |
| **Surface 0** | Fundo raiz da aplicação | `bg-slate-50` (`#f8fafc`) | `bg-slate-950` (`#020617`) |
| **Surface 1** | Header fixo e barras de navegação | `bg-white/95 border-b border-slate-200` | `bg-slate-900/95 border-b border-slate-800` |
| **Surface 2** | Cards de métricas e tabelas | `bg-white border-slate-200` | `bg-slate-900 border-slate-800` |
| **Surface 3** | Áreas de filtros, subpainéis e contexto | `bg-slate-100/80 border-slate-200` | `bg-slate-850/80 border-slate-800/80` |
| **Surface 4** | Diálogos e modais sobrepostos | `bg-white shadow-dialog` | `bg-slate-900 shadow-dialog border-slate-800` |

### 2.4. Paleta Semântica e Cores Funcionais

- **Emerald (Verde):** Atingimento de meta, biomarcador em faixa ideal, recuperação parassimpática (HRV elevado), sucesso de sincronização.
- **Cyan / Blue (Ciano / Azul):** Identidade clínica, dados laboratoriais, métricas neutras, ações primárias de navegação e exportação de relatórios.
- **Indigo / Violet (Índigo / Violeta):** Inteligência artificial, correlações N-of-1, projeções epigenéticas e aprendizado de padrões.
- **Amber (Âmbar / Laranja):** Zona de atenção clínica (pré-diabetes, pressão limítrofe), aviso de sincronização pendente, ausência de dados.
- **Rose (Vermelho / Carmim):** Valor crítico fora da faixa terapêutica, erro de pipeline, cancelamento, ação destrutiva de deleção.
- **Slate (Neutros):** Tipografia estrutural, separadores, bordas e superfícies neutras.

---

## 3. Escala Tipográfica e Legibilidade

A tipografia do Longevidade Hub prioriza a leitura rápida e segura de exames e dosagens:

- **`text-xs` (12px):** Legendas auxiliares, faixas de referência (`Ref: 70–99 mg/dL`), unidades de medida, metadados de sincronização e datas secundárias.
- **`text-sm` (14px):** Corpo de texto secundário, labels de campos de formulário, nomes de compostos em rotinas, botões compactos.
- **`text-base` (16px):** Corpo principal de leitura, descrições detalhadas, textos explicativos e inputs de texto.
- **`text-lg` (18px):** Títulos de cartões de métrica, cabeçalhos de tabelas e divisores de seção.
- **`text-xl` / `text-2xl` (20–24px):** Títulos de abas principais, cabeçalhos de modais e headlines de painéis.
- **`text-metric` / `font-mono` (24–36px):** Valores quantitativos com peso visual (ex: glicemia `88 mg/dL`, HRV `64 ms`), com cifras alinhadas monospaçadas para evitar saltos visuais.

> [!CAUTION]
> Microtipografias abaixo de 12px (`text-[9px]`, `text-[10px]`, `text-[11px]`) são terminantemente proibidas para qualquer texto informativo, clínico ou funcional no sistema (piso semântico do Design System: `text-xs` / 12px). Exceções pontuais decorativas exigem anotação explícita e validação no audit de conformidade.

---

## 4. Catálogo de Primitives Reutilizáveis

Todos os primitives do Design System residem em `frontend/src/components/ui/` e são exportados pelo índice `index.ts`:

### 4.1. `Button`
Controle de ação padronizado com suporte nativo a acessibilidade (`focus-visible`), variantes semânticas e estado de carregamento sem distorção dimensional:

```tsx
import { Button } from './ui';

<Button variant="primary" size="md" onClick={handleSave}>
  Salvar Registro
</Button>

<Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
  Excluir
</Button>
```

- **Variantes:** `primary` (gradiente/cyan sólido), `secondary` (slate neutro), `outline` (borda fina), `ghost` (sem fundo), `danger` (rose/destrutivo).
- **Tamanhos:** `sm` (padding compacto, `text-xs`), `md` (padrão, `text-sm`, `min-h-[40px]`), `lg` (`text-base`, `min-h-[44px]`).
- **Estados:** `default`, `hover`, `focus-visible`, `active`, `disabled`, `isLoading` (com spinner acessível).

### 4.2. `IconButton`
Botão compacto para barras de ferramentas e ações em linha. Exige obrigatoriamente a propriedade `aria-label` para leitor de tela e garante alvo de toque de no mínimo $44\times 44$px em dispositivos móveis:

```tsx
import { IconButton } from './ui';
import { Trash2 } from 'lucide-react';

<IconButton
  icon={<Trash2 className="h-4 w-4" />}
  aria-label="Excluir este exame laboratorial"
  variant="danger"
  onClick={() => confirmDelete(item.id)}
/>
```

### 4.3. `StatusBadge`
Chip semântico unificado para status clínicos e operacionais:

```tsx
import { StatusBadge } from './ui';

<StatusBadge variant="success">Normal</StatusBadge>
<StatusBadge variant="warning">Atenção</StatusBadge>
<StatusBadge variant="danger">Fora do Alvo</StatusBadge>
<StatusBadge variant="neutral">Pendente</StatusBadge>
```

### 4.4. `Card` & Estrutura de Cartão
Contêiner com tokens semânticos de elevação e superfície:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui';

<Card elevation="card" className="h-full">
  <CardHeader>
    <CardTitle>Composição Corporal</CardTitle>
    <CardDescription>Evolução de massa magra e adiposidade visceral</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Gráfico ou tabela */}
  </CardContent>
</Card>
```

### 4.5. `EmptyState`
Componente para estados vazios sem dados. Substitui divs ad-hoc e responde obrigatoriamente a: o que falta, por que está vazio e como o usuário pode agir:

```tsx
import { EmptyState } from './ui';
import { FlaskConical } from 'lucide-react';

<EmptyState
  icon={FlaskConical}
  title="Nenhum experimento N-of-1 ativo"
  description="Inicie um protocolo de autoexperimentação para correlacionar intervenções (suplementação, sono, treino) aos seus biomarcadores."
  actionLabel="Criar Primeiro Experimento"
  onAction={() => setShowNewModal(true)}
/>
```

### 4.6. `LoadingIndicator`
Indicador de carregamento acessível (`role="status"`, `aria-live="polite"`). Respeita `prefers-reduced-motion` substituindo a animação de rotação contínua por pulsação suave ou texto estático:

```tsx
import { LoadingIndicator } from './ui';

<LoadingIndicator message="Calculando idade biológica PhenoAge..." />
```

### 4.7. `Modal` & `Drawer`
Diálogos e gavetas modais com gerenciamento completo de foco acessível:
- Aprisionamento de foco (*focus trap*).
- Fechamento com tecla `Escape`.
- Foco automático no primeiro controle interativo ao abrir e retorno ao gatilho original ao fechar.
- Backdrop do overlay: único local autorizado do sistema com transluscência discreta (`backdrop-blur-sm`) sobre Surface 4 para foco contextual, com bloqueio de scroll na página principal.

### 4.8. `ConfirmDialog`
Modal especializado para confirmação de ações de alto impacto (exclusão de exames, cancelamento de protocolos):

```tsx
import { ConfirmDialog } from './ui';

<ConfirmDialog
  isOpen={showConfirm}
  title="Excluir Avaliação Física?"
  description="Esta ação removerá permanentemente as dobras cutâneas, perímetros e fotos associadas a esta data."
  confirmLabel="Sim, Excluir"
  isDestructive
  isLoading={isDeleting}
  onConfirm={handleDeleteConfirmed}
  onCancel={() => setShowConfirm(false)}
/>
```

### 4.9. `TimeRangeControl`
Controle segmentado padronizado para navegação temporal em painéis e gráficos:
- Opções padronizadas: `Hoje` (24h), `7 dias`, `30 dias`, `90 dias`, `Tudo`.
- Suporte a navegação por teclado (`ArrowLeft` e `ArrowRight`).
- Anúncio semântico para leitores de tela (`aria-current="true"` ou role `radiogroup`).

### 4.10. `SyncStatusBadge`
Badge semântico e acessível para comunicação de estado de sincronização e frescor de dados. Mapeia os 8 estados canônicos do sistema:
- `never`: Nunca sincronizado (cinza/slate).
- `syncing`: Sincronização em andamento (spinner acessível, cyan).
- `success`: Sincronizado com sucesso e dados recentes (emerald).
- `partial`: Sincronização parcial com dados incompletos ou advertências (amber).
- `error`: Falha operacional de rede ou servidor (rose).
- `expired`: Credenciais ou token de integração expirado (amber).
- `disconnected`: Integração desconectada intencionalmente (slate).
- `stale`: Dados antigos sem upload há mais de 7 dias (amber).

```tsx
import { SyncStatusBadge } from './ui';

<SyncStatusBadge
  state="success"
  lastSyncAt="2026-10-03T14:30:00Z"
  coveredUntil="14:00"
  serviceName="Zepp Wearables"
/>
```

### 4.11. `ResponsiveDataTable`
Componente canônico para apresentação de dados densos com comportamento responsivo inteligente:
- **Desktop (≥ md):** Tabela clínica semântica (`<table role="table">`) com cabeçalho de colunas estruturado e `caption` acessível via `sr-only`.
- **Mobile (< md):** Cartões de linha (*Row Cards*) independentes que impedem overflow horizontal, preservam padding tátil e associam cada valor ao seu respectivo rótulo de coluna.

```tsx
import { ResponsiveDataTable } from './ui';

<ResponsiveDataTable
  caption="Histórico de Exames Laboratoriais"
  data={records}
  columns={[
    { key: 'date', label: 'Data', render: (r) => r.formattedDate },
    { key: 'name', label: 'Biomarcador', render: (r) => r.name },
    { key: 'value', label: 'Resultado', align: 'right', render: (r) => `${r.value} ${r.unit}` },
  ]}
/>
```

### 4.12. `EvidenceBlock` (IA e Epistemologia)
Bloco padrão para apresentação de sínteses analíticas e correlações de IA, eliminando risco de confusão epistemológica entre dados medidos e inferências algorítmicas:
- **Observação Fisiológica:** Dado mensurado ou fato empírico identificado.
- **Conduta Prática Recomendada:** Ação prática ou intervenção sugerida.
- **Limitação da Inferência:** Advertência de que associações não implicam causalidade estrita.
- **Dados Considerados:** Transparência de insumos (fontes, contagem de registros, período amostral).
- **Selo Obrigatório:** Badge visual explícito "Gerado por IA".

### 4.13. Arquitetura Semântica do Header e Navegação

O cabeçalho superior (`<header>`) organiza a interface em quatro regiões semânticas bem delineadas, evitando sobrecarga cognitiva e separando estritamente comandos operacionais de preferências e infraestrutura:

```text
Header (<header role="banner">)
  ├── 1. Identidade & Marca (Brand)
  ├── 2. Ações Utilitárias (HeaderUtilityActions, role="toolbar")
  │     ├── Ações Clínicas Operacionais ("Ações do Dia", role="group")
  │     │     ├── Registrar Métrica (PlusCircle)
  │     │     └── Doctor Briefing (Stethoscope)
  │     ├── Infraestrutura & Sincronização (role="group")
  │     │     ├── Sync Wearables Zepp (com indicador de estado)
  │     │     └── Sync Google Health Connect
  │     └── Preferências & Configurações de Sistema (role="group")
  │           ├── Configurações de IA e Provedores (Settings)
  │           └── Alternador de Tema Claro/Escuro (Sun/Moon)
  ├── 3. Navegação Primária (<nav aria-label="Navegação Principal">)
  │     └── 6 Áreas Canônicas: Hoje, Saúde, Treinos, Intervenções, IA & Copiloto, Perfil
  └── 4. Sub-navegação Contextual (<nav aria-label="Sub-navegação de ...">)
        └── Segmentos específicos da área ativa (ex: Exames, Sono, Linha do Tempo, Avaliações Físicas)
```

#### Regras de Governança do Header:
1. **Piso de Alvo de Toque:** Todo botão e item de navegação possui dimensões táteis mínimas de $44 \times 44$px (ou pseudoelementos `after:min-h-[44px]` em mobile).
2. **Separação de Infraestrutura vs. Rotina Clínica:** Ações clínicas do dia permanecem proeminentes à esquerda no toolbar, enquanto sincronização e configurações avançadas ficam agrupadas à direita.
3. **Paridade de Acesso:** Todas as configurações técnicas e chaves de IA acessíveis pelo atalho rápido do Header também estão disponíveis no painel de **Perfil → Integrações & Configurações**, permitindo gestão profunda de provedores (BYOK) sem poluir o fluxo clínico diário.

---

## 5. Diretrizes de Acessibilidade (WCAG 2.1 AA)

1. **Relação de Contraste de Cores:**
   - Todo texto de corpo e leitura de dados deve possuir contraste mínimo de **4.5:1** contra o fundo em modo claro e modo escuro.
   - Textos grandes (acima de 18px bold ou 24px regular) devem respeitar contraste mínimo de **3:1**.
2. **Navegação por Teclado e Anéis de Foco:**
   - Todos os elementos interativos possuem anel de foco visível padronizado: `focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none`.
   - Modais fecham via `Escape`.
3. **Preferência de Movimento Reduzido (`prefers-reduced-motion`):**
   - Respeitada globalmente via CSS (`index.css`):
     ```css
     @media (prefers-reduced-motion: reduce) {
       *, *::before, *::after {
         animation-duration: 0.01ms !important;
         animation-iteration-count: 1 !important;
         transition-duration: 0.01ms !important;
         scroll-behavior: auto !important;
       }
       .animate-spin, .animate-pulse, .animate-bounce, .animate-ping {
         animation: none !important;
       }
     }
     ```
4. **Alvos de Toque em Telas Móveis:**
   - Mínimo de $44\times 44$px para botões primários, itens de navegação e botões de ação em linhas de tabela.

---

## 6. Estratégia de Responsividade (Mobile-First)

A aplicação é continuamente testada e homologada em quatro viewports de referência:

| Dispositivo | Viewport | Comportamento Principal |
| :--- | :--- | :--- |
| **iPhone SE** | `375×667` | Tabelas convertidas em **Row Cards** individuais (`block md:table`); cabeçalhos ocultos; labels em linha (`md:hidden`); contenção com `min-w-0` e `truncate`. |
| **iPhone 14** | `390×844` | Navegação por abas com rolagem horizontal touch fluida; modais ocupam $95\%$ da largura com padding seguro. |
| **iPad Portrait** | `768×1024` | Transição de Row Cards para tabelas clássicas com colunas completas (`md:table-cell`). |
| **Desktop Standard**| `1280×800` | Layout completo com grade multi-coluna, gráficos integrados lado a lado e tabelas com padding amplo (`py-3 px-4`). |

### Padrão de Tabela Responsiva com Row Cards:

```tsx
<div className="overflow-x-auto">
  <table className="w-full text-left border-collapse block md:table">
    <thead className="hidden md:table-header-group">
      <tr className="border-b border-slate-200 dark:border-slate-800">
        <th className="py-3 px-4 text-xs font-semibold text-slate-500">Data</th>
        <th className="py-3 px-4 text-xs font-semibold text-slate-500">Biomarcador</th>
        <th className="py-3 px-4 text-xs font-semibold text-slate-500 text-right">Resultado</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 block md:table-row-group">
      {items.map((item) => (
        <tr key={item.id} className="block md:table-row p-4 md:p-0 bg-white dark:bg-slate-900 mb-3 md:mb-0 rounded-2xl md:rounded-none border md:border-0 border-slate-200 dark:border-slate-800">
          <td className="block md:table-cell py-1 md:py-3 md:px-4 text-sm">
            <span className="text-xs font-bold text-slate-400 md:hidden mr-2">Data:</span>
            {item.date}
          </td>
          <td className="block md:table-cell py-1 md:py-3 md:px-4 text-sm font-medium">
            <span className="text-xs font-bold text-slate-400 md:hidden mr-2">Biomarcador:</span>
            {item.name}
          </td>
          <td className="block md:table-cell py-1 md:py-3 md:px-4 text-sm font-mono text-right">
            <span className="text-xs font-bold text-slate-400 md:hidden mr-2">Resultado:</span>
            {item.value} {item.unit}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 7. Diretrizes de Microcopy & Avisos Clínicos

### 7.1. Princípios de Redação
- **Curto, Direto e Tarefeiro:** Evitar jargões grandiloquentes como *"Hub de Inteligência Epigenética Global"* ou *"Otimização Biológica Quântica"*. Usar linguagem humana: *"Como você está se sentindo hoje?"*, *"Histórico de alterações auditado"*.
- **Mesmo Termo para o Mesmo Conceito:** Não alternar entre "Exames", "Labs", "Laudos" e "Testes" no mesmo contexto. O termo canônico para exames de sangue é **Exames Laboratoriais**.

### 7.2. Camada Epistemológica (`SourceTag`)
Todo indicador ou conclusão analítica na interface possui uma classificação epistemológica explícita (WCAG 1.4.1 — nunca apenas por cor; com ícone semântico, texto claro e `role="note"`):
- **Dado Observado (`observed`):** Medição física direta obtida por sensor wearable homologado (ex: FC, HRV, passos) ou resultado de laudo laboratorial comprovado com provenance.
- **Modelo Matemático (`model`):** Projeção algorítmica matemática calculada a partir de múltiplos biomarcadores biológicos validados na literatura médica (ex: Morgan Levine PhenoAge 2018, Klemera-Doubal KDM).
- **Inferência de IA (`inference`):** Conclusão interpretativa, correlação hipotética ou síntese gerada por Inteligência Artificial — orientada a apoiar o raciocínio clínico, exigindo validação médica profissional.
- **Referência Clínica (`clinical`):** Parâmetro normativo estabelecido por diretrizes médicas e consensos de saúde.
- **Atenção Clínica (`warning`):** Sinalização de desvio relevante ou dado fora da faixa esperada.
- **Ação Recomendada (`action`):** Passo prático, sugestão comportamental ou conduta operacional recomendada.

### 7.3. Vocabulário Canônico: Metas vs. Referências (Master §14, §40)
- **Meta Pessoal:** Objetivo funcional individual deliberadamente definido pelo usuário em seu protocolo (ex: caminhar 10.000 passos/dia, dormir 8 horas). Somente neste contexto o termo "Meta" é autorizado.
- **Proibição de "Alvo" para Referências:** É estritamente proibido usar o termo "Alvo" para referências estatísticas, laboratoriais ou populacionais.
- **Referência Clínica:** Faixa ou parâmetro normativo adotado por diretrizes médicas padrão (ex: Taxa Respiratória 12 a 20 rpm).
- **Referência Ótima (Longevidade):** Faixa funcional preconizada pela medicina preventiva e de longevidade para otimização de sobrevida e resiliência biológica (ex: FC de repouso < 55 bpm, ApoB < 70 mg/dL, PCR-us < 0.5 mg/L).
- **Estimativa:** Valor numérico aproximado ou projetado (ex: Estimativa de calorias ativas 24h).

### 7.4. Taxonomia dos 6 Estados de Ausência de Dados (Master §15, §16, UX_UI_43)
A aplicação nunca converte dados ausentes em valor zero real (`0`). Zero real medido (ex: 0 passos, 0 eventos de apneia) é preservado. Quando não há dados, aplica-se a taxonomia tipada:
1. **Sem dados (`no_data`):** Nenhum registro encontrado para a janela temporal selecionada. Exibe `—` e texto acessível explicativo.
2. **Não monitorado (`unmonitored`):** Biomarcador ou métrica não configurado para rastreamento ativo nas preferências.
3. **Não calculável (`uncomputable`):** Insumos necessários incompletos para alimentar o algoritmo matemático.
4. **Não sincronizado (`unsynced`):** Dispositivo pareado sem upload recente de pacotes.
5. **Desatualizado (`stale`):** Medição com idade superior ao horizonte de validade clínica (≥ 7 dias).
6. **Erro de leitura (`error`):** Falha técnica na captura, transmissão ou integridade do pacote.

### 7.5. Padrão de Semântica Temporal e Frescor do Dado (Master §75, §76, §77)
- **Rótulos Canônicos de Período:** `Hoje`, `Ontem`, `Últimos 7 dias`, `Últimos 30 dias`, `Últimos 90 dias`, `Período personalizado`. Proibido misturar livremente `30d` com `30 dias`.
- **Frescor do Dado:** Avaliado por `formatDataFreshness`: `Atualizado hoje`, `Atualizado ontem`, `Atualizado há X dias` (< 7 dias) e `Dados desatualizados (há X dias)` (≥ 7 dias).
- **Timezone Local:** Toda formatação de data e hora apresentada ao usuário no frontend utiliza explicitamente o fuso horário local (`pt-BR`).

### 7.6. Aviso Clínico Canônico
Todo relatório exportado, sumário de IA, painel de longevidade e o rodapé geral da aplicação devem apresentar o aviso clínico padronizado:

> **Aviso Clínico:** Este aplicativo organiza e analisa dados de saúde coletados pelo próprio usuário. Não substitui o diagnóstico, acompanhamento ou prescrição médica. Consulte sempre um médico ou profissional de saúde habilitado antes de iniciar ou alterar intervenções terapêuticas.

---

## 8. Governança, Auditoria Automatizada e Registro de Exceções (v2.1.0+)

Para assegurar que as diretrizes do Design System não se degradem ao longo do desenvolvimento contínuo, a plataforma conta com um motor estático de conformidade automatizada (`frontend/scripts/audit-design-system.mjs`) e um registro formal de exceções.

### 8.1. Motor de Auditoria de Conformidade

O comando pode ser executado a qualquer momento dentro do diretório `frontend/`:

```bash
npm run audit:design-system
```

O auditor inspeciona recursivamente `src/**/*.{ts,tsx,css}` (excluindo arquivos de teste e primitives em `components/ui/` onde aplicável) e avalia 16 regras estruturais distribuídas em 7 categorias:

1. **Tipografia:** Proibição de microtexto funcional (`text-[9px]`, `text-[10px]`, `text-[10.5px]`, `text-[11px]`).
2. **Raio de Borda (Radius):** Restrição a tokens canônicos (`radius.arbitrary`, `radius.3xl`, `radius.non-token`).
3. **Gradientes:** Rejeição de gradientes arbitrários em fundos (`bg-gradient-to-*`) que contradigam a sobriedade clínica.
4. **Efeitos Visuais:** Restrição de glow decorativo (`effects.glow`), blur em excesso (`backdrop-blur`) e sombras arbitrárias.
5. **Acessibilidade de Foco:** Detecção de `focus:outline-none` sem o correspondente anel `focus-visible`.
6. **Movimento (Motion):** Restrição a animações decorativas permanentes (`animate-ping`, `animate-bounce`).
7. **Controles Nativos:** Detecção de uso desgovernado de tags `<button>`, `<input>`, `<select>` e `<textarea>` em telas e modais em detrimento dos primitives de UI correspondentes.

### 8.2. Estados e Portão de Regressão (Ratchet Baseline)

Cada regra do auditor é classificada em um dos quatro estados canônicos:

- **`PASS`:** Nenhuma ocorrência não justificada encontrada no código.
- **`EXCEPTION`:** Ocorrências identificadas possuem justificativa formal registrada em `docs/DESIGN_SYSTEM_EXCEPTIONS.md` e marcadas no código via `ds-exception: DSX-NNN`.
- **`WARN`:** Dívida legada identificada, porém contida dentro do teto histórico registrado em `frontend/audit-baseline.json`. O comando encerra com exit code `0`.
- **`FAIL`:** Regressão detectada (ocorrências abertas excedem o baseline estipulado) ou exceção referenciada no código sem registro correspondente em documentação. O comando encerra imediatamente com exit code `1`, bloqueando pipelines e releases.

### 8.3. Atualização do Baseline e Redução Gradual da Dívida

Sempre que uma refatoração ou plano de consolidação eliminar ocorrências de dívida técnica, o baseline deve sofrer *ratchet down* (redução irreversível do teto) com o comando:

```bash
npm run audit:design-system:baseline
```

O baseline nunca deve ser afrouxado ou aumentado manualmente para mascarar novas violações.

### 8.4. Fluxo de Registro de Exceções

Quando uma exceção visual for clinicamente ou tecnicamente necessária (por exemplo, gradiente estrito de escala térmica em um gráfico de variabilidade glicêmica):

1. Reserve o próximo identificador sequencial `DSX-NNN` em `docs/DESIGN_SYSTEM_EXCEPTIONS.md`.
2. Documente o arquivo, regra afetada, justificativa detalhada e prazo/status.
3. No código-fonte correspondente, anote na linha anterior ou na mesma linha:
   ```tsx
   // ds-exception: DSX-001
   <div className="bg-gradient-to-r ...">
   ```

