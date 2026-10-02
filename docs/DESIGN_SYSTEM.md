# Design System — Longevidade Hub v2.1.0

> **Guia Canônico de Arquitetura Visual, Primitives, Tokens, Acessibilidade e Responsividade**  
> **Status:** Ativo & Estabilizado  
> **Última Atualização:** Outubro/2026 (v2.1.0)

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

### 2.1. Escala de Arredondamento (Border Radius)

| Token | Classe Tailwind | Valor | Aplicação Típica |
| :--- | :--- | :--- | :--- |
| `radius-sm` | `rounded-sm` | `8px` (`0.5rem`) | Badges de status, tags compactas, chips laboratoriais. |
| `radius-md` | `rounded-md` | `12px` (`0.75rem`) | Botões (`Button`), inputs de formulário, caixas de seleção, tooltips. |
| `radius-lg` | `rounded-lg` | `20px` (`1.25rem`) | Cards analíticos (`Card`), widgets de gráficos, painéis de métrica. |
| `radius-xl` | `rounded-xl` | `24px` (`1.5rem`) | Diálogos (`Modal`), gavetas laterais (`Drawer`), caixas de confirmação. |

> [!NOTE]
> Valores arbitrários de raio (ex: `rounded-3xl` ou `rounded-[28px]`) estão descontinuados. Utilize sempre a escala tokenizada.

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
| **Surface 1** | Header fixo e barras de navegação | `bg-white/80 backdrop-blur-md` | `bg-slate-900/80 backdrop-blur-md border-slate-800` |
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
> Microtipografias abaixo de 11px (`text-[9px]`, `text-[10px]`) são proibidas para textos funcionais essenciais. Devem ser restritas exclusivamente a siglas de tags compactas e labels decorativos de apoio.

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
- Backdrop translúcido com `backdrop-blur-md` e bloqueio de scroll na página principal.

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

### 7.2. Distinção Obrigatória: Dado Observado vs. Modelo
- **Dado Observado:** Acompanhado de data de coleta, valor, unidade e laboratório/origem comprovada.
- **Modelo / Estimativa:** Deve conter identificação clara da metodologia (ex: *Modelo Morgan Levine 2018*, *Algoritmo Klemera-Doubal*) e rótulo indicando que se trata de uma projeção matemática baseada nos insumos disponíveis.

### 7.3. Aviso Clínico Canônico
Todo relatório exportado, sumário de IA, painel de longevidade e o rodapé geral da aplicação devem apresentar o aviso clínico padronizado:

> **Aviso Clínico:** Este aplicativo organiza e analisa dados de saúde coletados pelo próprio usuário. Não substitui o diagnóstico, acompanhamento ou prescrição médica. Consulte sempre um médico ou profissional de saúde habilitado antes de iniciar ou alterar intervenções terapêuticas.
