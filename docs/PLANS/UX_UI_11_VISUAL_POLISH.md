# Plano UX/UI — UX_UI_11_VISUAL_POLISH

## Objetivo
Promover o refinamento estético e a sobriedade visual do Longevidade Hub, reduzindo o uso excessivo de efeitos decorativos (glassmorphism indiscriminado, gradientes conflitantes e efeitos `glow-*`), eliminando animações de escala intrusivas (`hover:scale-*`) em cards de leitura de dados e garantindo suporte estrito à diretiva de acessibilidade de movimento reduzido (`prefers-reduced-motion`).

## Problema
- Presença generalizada de efeitos visuais pesados concorrendo pela atenção do usuário: aproximadamente 60 ocorrências de `bg-gradient-to-*`, 32 de `backdrop-blur` e 27 classes de `glow-*`.
- Uso de `hover:scale-[1.02]` em cards de métricas vitais (`MetricCard.tsx`), causando pequenos saltos visuais contínuos ao movimentar o mouse sobre o painel de dados.
- Ausência de tratamento sistemático para `prefers-reduced-motion`, fazendo com que spinners e transições automáticas continuem rodando para usuários com sensibilidade vestibular ou preferências de redução de movimento ativas no sistema operacional.
- O excesso de decorações visuais confere à aplicação uma aparência de "dashboard futurista de ficção científica" em detrimento da legibilidade e clareza clínica que um aplicativo de saúde exige.

## Evidências
- `frontend/src/components/MetricCard.tsx`: classes `hover:scale-[1.02]`, gradientes em todos os cards e fundos de ícones multicoloridos.
- `frontend/src/index.css`: classes `.glow-emerald`, `.glow-cyan` aplicadas de forma recorrente.
- Auditoria de UX/UI v1.9.8: itens `UX-P1-08`, `UX-P2-02` e `UX-P2-03`.

## Escopo
- **Sobriedade de Superfícies & Fim do "Glow" Excessivo:**
  - Reservar gradientes e efeitos de brilho (`glow-*`) exclusivamente para:
    - O ícone principal da marca no Header.
    - Indicadores discretos de novidade ou IA.
    - Estados comemorativos de metas atingidas (ex: 100% de compliance diário).
  - Cards de métricas e dados devem utilizar superfícies limpas, bordas com contraste semântico sutil (`border-slate-200/80 dark:border-slate-800/80`) e elevação controlada (`shadow-xs` / `shadow-sm`).
- **Eliminação de `hover:scale-*` em Cartões de Dados:**
  - Substituir o efeito de ampliação física (`scale-[1.02]`) por feedback estático elegante:
    - Leve realce de borda (`hover:border-slate-300 dark:hover:border-slate-700`).
    - Mudança sutil de tonalidade do fundo (`hover:bg-slate-50/50 dark:hover:bg-slate-850/50`).
  - Manter `scale` e zoom exclusivamente em visualizações onde isso tem valor funcional direto (ex: galeria de fotos corporais em Avaliações Físicas).
- **Suporte a `prefers-reduced-motion`:**
  - Adicionar regra global no Tailwind / CSS:
    ```css
    @media (prefers-reduced-motion: reduce) {
      *,
      ::before,
      ::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ```
  - Animações funcionais indispensáveis (ex: indicação de que um processo está em andamento) devem usar indicadores estáticos claros (ex: badge com texto "Sincronizando...") quando a preferência estiver ativa.

## Fora de escopo
- Redesenho de diagramas SVG ou gráficos Recharts fundamentais.
- Alteração da identidade de marca básica (Longevidade Hub).

## Arquivos afetados
- `frontend/src/index.css`
- `frontend/tailwind.config.js`
- `frontend/src/components/MetricCard.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/DailyGuidanceCard.tsx`
- `frontend/src/components/DailyCheckinCard.tsx`
- `docs/PLANS/UX_UI_11_VISUAL_POLISH.md`

## Componentes envolvidos
- `MetricCard`
- `Header`
- Todos os widgets de dashboard em `frontend/src/components/`

## Dependências
- `UX_UI_01_DESIGN_SYSTEM`

## Estratégia de implementação
1. **Regra Global de Reduced Motion:**
   - Injetar diretiva CSS em `index.css` garantindo desaceleração e desativação de animações desnecessárias.
2. **Refatoração de `MetricCard.tsx`:**
   - Remover `hover:scale-[1.02]`.
   - Simplificar as classes do `colorMap` e `iconBgMap`, substituindo gradientes lineares por fundos sólidos translúcidos (`bg-emerald-500/10` em vez de `bg-gradient-to-br from-emerald-500/10 via-... to-transparent`).
3. **Auditoria Visual de Glassmorphism:**
   - Reduzir a intensidade de `backdrop-blur-md` para superfícies que não precisam de transparência dinâmica, melhorando também o desempenho de renderização em placas gráficas integradas e smartphones.

## Estados e comportamento
- Cards passam a ter estabilidade posicional completa sob o ponteiro do mouse, transmitindo precisão e confiança clínica.
- Ambientes com preferência de movimento reduzido ativada não sofrem com rotações contínuas de spinners ou pulsos estroboscópicos.

## Acessibilidade
- Conformidade com o Critério WCAG 2.3.3 (Animação a partir de Interações).
- Aumento do contraste visual de textos ao remover fundos com gradientes complexos sob tipografias finas.

## Responsividade
- O desempenho de rolagem (FPS de scroll) melhora substancialmente em navegadores mobile com a remoção de múltiplos `backdrop-blur` e `hover:scale` simultâneos.

## Testes
- Teste de renderização com a mídia `prefers-reduced-motion: reduce` ativa no navegador (DevTools Rendering panel).
- Teste unitário verificando que `MetricCard` não possui mais a classe `hover:scale-[1.02]`.

## Critérios de aceite
- [x] Eliminação de `hover:scale-*` em todos os cards de métricas e tabelas de dados.
- [x] Diretiva global `prefers-reduced-motion` ativa e funcional.
- [x] Redução de gradientes e efeitos glow em cards analíticos de rotina.
- [x] Zero regressão em contraste e legibilidade em dark e light mode.

## Riscos
- Risco de usuários acharem a interface "menos chamativa".
- Mitigação: demonstrar que a hierarquia de informação e a legibilidade dos dados de saúde ganharam clareza e autoridade clínica com a sobriedade.

## Rollback
- Reversão controlada dos arquivos `MetricCard.tsx` e `index.css` via Git.

## Checklist de conclusão
- [x] Adicionar CSS de reduced motion em `index.css`
- [x] Remover hover scale de `MetricCard.tsx`
- [x] Suavizar gradientes em widgets analíticos
- [x] Validar testes unitários e visuais
