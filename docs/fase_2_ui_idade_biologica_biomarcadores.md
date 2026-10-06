# Fase 2: Interface de Usuário - Hero do Protocolo, Snapshot de Idade Biológica & Biomarcadores de Ouro

---

## 1. Visão Geral e Objetivos

Esta fase é responsável por transformar a metade superior da tela **Meu Perfil** em um painel executivo de longevidade, eliminando o aspecto de cadastro acadêmico e substituindo-o por um ambiente biométrico de alto impacto.

### Objetivos Principais
1. **Hero do Protocolo de Longevidade**: Redesenhar o banner superior destacando a identidade do usuário, o status do protocolo, o tempo de adesão ininterrupta (*streak* de dias), a fase atual e as metas prioritárias de saúde selecionadas.
2. **Snapshot de Idade Biológica (PhenoAge / KDM)**: Exibir em destaque a idade celular estimada pelo Longevidade Hub em relação à idade cronológica, calculando visualmente o delta biológico (anos de rejuvenescimento) e o ritmo de envelhecimento (*pace of aging*).
3. **Grade de Biomarcadores de Ouro (Pilares de Peter Attia / Outlive)**: Apresentar os indicadores fisiológicos padrão-ouro de reserva funcional (VO2 Max, HRV basal, FC Repouso, % Gordura, Relação Cintura-Estatura WHtR e Força de Preensão manual).
4. **Respeito Estrito ao Design System**: Utilizar exclusivamente tokens canônicos de cor, espaçamento, sombras e cantos arredondados (`rounded-radius-xl`, `border-slate-200 dark:border-slate-800`), garantindo suporte nativo a temas Claro e Escuro.

---

## 2. Arquitetura de Componentes Frontend

Para evitar componentes monolíticos e facilitar a manutenção e testes, a estrutura será decomposta em subcomponentes modulares dentro de `frontend/src/components/profile/`:

```
frontend/src/components/profile/
├── ProfilePersonalSection.tsx          # Componente agregador da aba "Meu Perfil"
├── ProfileHeroCard.tsx                 # Banner superior (Avatar, Fase, Streak, Metas)
├── BiologicalAgeSnapshotCard.tsx       # Card de Idade Biológica e Pace of Aging
├── GoldenBiomarkersGrid.tsx            # Grid com os 5 Pilares de Longevidade
├── ProfileTypes.ts                     # Interfaces TypeScript sincronizadas com a API
└── ProfilePersonalSection.test.tsx     # Suíte de testes com React Testing Library
```

---

## 3. Tipagem TypeScript (`ProfileTypes.ts`)

A interface `ProfileData` será atualizada para refletir o contrato enriquecido da Fase 1:

```typescript
export interface ProtocolInfo {
  status: string;
  phase?: string;
  start_date?: string;
  streak_days?: number;
  longevity_goals?: string[];
}

export interface BiologicalAgeInfo {
  calculated_at?: string;
  biological_age?: number;
  chronological_age?: number;
  age_delta?: number;
  pace_of_aging?: number;
  status?: string;
}

export interface GoldenMetricsInfo {
  date_ref?: string;
  vo2_max?: number;
  vo2_max_percentile?: string;
  rhr_bpm?: number;
  hrv_ms?: number;
  body_fat_pct?: number;
  target_body_fat_pct?: number;
  waist_cm?: number;
  whtr?: number;
  grip_strength_kg?: number;
  spo2_avg_pct?: number;
}

export interface ProfileData {
  name: string;
  email?: string;
  birthdate?: string;
  chronological_age?: number;
  height_cm?: number;
  current_weight_kg?: number;
  target_weight_kg?: number;
  bmi?: number;
  gender?: string;
  avatar_url?: string;
  google_connected: boolean;
  source: string;

  protocol?: ProtocolInfo;
  biological_age?: BiologicalAgeInfo;
  golden_metrics?: GoldenMetricsInfo;
  medical_id?: any;
  lifestyle?: any;
}
```

---

## 4. Detalhamento dos Componentes

### 4.1 `ProfileHeroCard.tsx`
* **Identidade Visual**:
  - Avatar dinâmico com gradiente esmeralda (`from-emerald-500 to-cyan-500`) ou foto (`avatar_url`).
  - Nome completo e e-mail.
  - Tag de status via `StatusBadge variant="success" dot` (*Protocolo Ativo*).
* **Indicadores de Protocolo**:
  - Badge de fase atual: *"Fase 2: Otimização Mitocondrial"*.
  - Contador de adesão: *"Dia 143 contínuo"*.
* **Tags de Metas de Longevidade**:
  - Pílulas visuais elegantes com ícones discretos (ex: `Heart` para Cardiovascular, `Dumbbell` para Hipertrofia, `Sparkles` para Rejuvenescimento Celular).
* **Barra de Ações**:
  - Botão secundário *"Editar Perfil"*.

### 4.2 `BiologicalAgeSnapshotCard.tsx`
* **Exibição do Delta Biológico**:
  - Se $\text{Idade Biológica} < \text{Idade Cronológica}$: badge e valor em verde esmeralda com indicador de rejuvenescimento (ex: `-2.6 anos de idade celular`).
  - Se $\text{Idade Biológica} > \text{Idade Cronológica}$: badge em tom âmbar com recomendação preventiva.
* **Ritmo de Envelhecimento (*Pace of Aging*)**:
  - Exibição de valor relativo (ex: `0.88x` — indicando que o corpo envelhece 10.5 meses a cada 12 meses cronológicos).
* **Estado Vazio Convidativo**:
  - Caso o usuário ainda não tenha registrado exames laboratoriais necessários para o cálculo de PhenoAge (Albumina, Creatinina, PCR-us, Glicose, etc.), o card exibe uma ilustração limpa com mensagem explicativa e botão *"Registrar Exames de Sangue"* que navega para a aba de Exames.

### 4.3 `GoldenBiomarkersGrid.tsx`
Apresenta os pilares de longevidade recomendados na *Medicine 3.0* do Dr. Peter Attia:

1. **Aptidão Cardiorrespiratória (Cardio/Mitocôndria)**:
   - Métrica principal: `VO2 Max` (ex: `44.5 ml/kg/min`).
   - Métrica secundária: Percentil de longevidade (`Top 20% para a faixa etária de 30-39 anos`).
2. **Recuperação Autonômica & Coração**:
   - `HRV Basal` (Variabilidade da Frequência Cardíaca em ms) + `FC Repouso` (RHR em bpm).
3. **Composição Corporal Real (Além do IMC)**:
   - `% Gordura Corporal` atual vs Meta (ex: `21.4%` $\rightarrow$ meta `15.0%`).
   - `Relação Cintura-Estatura (WHtR)`: Métrica clínica superior ao IMC para acúmulo de gordura visceral (ideal $< 0.50$).
4. **Reserva Muscular & Força Funcional**:
   - `Grip Strength`: Força de preensão em kg (marcador padrão da literatura médica para expectativa de vida independente e prevenção de sarcopenia).

---

## 5. Algoritmos de Apresentação e Classificações Clínicas

### 5.1 Classificação de Relação Cintura-Estatura (WHtR)
$$\text{WHtR} = \frac{\text{Cintura (cm)}}{\text{Altura (cm)}}$$

* $\text{WHtR} < 0.40$: Abaixo do peso / Baixa reserva
* $0.40 \le \text{WHtR} \le 0.49$: **Faixa Ótima de Longevidade (Verde)**
* $0.50 \le \text{WHtR} \le 0.59$: Risco aumentado (Atenção / Âmbar)
* $\text{WHtR} \ge 0.60$: Alto risco cardiometabólico

### 5.2 Percentil de VO2 Max (Tabela Ajustada por Idade/Sexo)
O componente incluirá uma tabela de referência leve para contextualizar o número do usuário (ex: para homens de 30-39 anos, VO2 Max $> 45$ representa o quartil superior de proteção contra mortalidade por todas as causas).

---

## 6. Conformidade Visual e Acessibilidade

* **Tokens Canônicos**: Uso estrito das classes utilitárias definidas no `DESIGN_SYSTEM.md`:
  - Bordas: `border border-slate-200 dark:border-slate-800`
  - Superfícies: `bg-white dark:bg-slate-900` e cards secundários em `bg-slate-50 dark:bg-slate-900/60`
  - Cantos: `rounded-radius-xl` e `rounded-radius-lg`
* **Contraste e Legibilidade**: Relação de contraste mínima de 4.5:1 em todos os rótulos secundários, utilizando `text-slate-600 dark:text-slate-400`.
* **Semântica HTML**: Regiões demarcadas com `role="region"`, `aria-label="Resumo de Idade Biológica"` e títulos hierárquicos `h3`, `h4`.

---

## 7. Plano de Testes de Interface

Arquivo: `frontend/src/components/profile/ProfilePersonalSection.test.tsx`

1. **Renderização do Banner do Protocolo**:
   - Testa se o nome, fase, streak de dias e tags de metas aparecem corretamente.
2. **Exibição do Snapshot de Idade Biológica**:
   - Verifica se o delta negativo é formatado com sinal (`-2.6 anos`) e destaque positivo.
   - Testa renderização do estado sem exames (`biological_age == null`) validando a presença da mensagem informativa e ausência de quebras.
3. **Renderização da Grade de Biomarcadores**:
   - Valida se VO2 Max, HRV, % Gordura e WHtR calculam seus rótulos corretos a partir das props fornecidas.
   - Valida que ausência de dados pontuais (ex: grip strength nulo) exibe `"-"` ou `"Não medido"` sem gerar erros no console.

---

## 8. Critérios de Aceitação e Definição de Pronto (DoD)

- [ ] Componente `ProfileHeroCard` renderizado com suporte a status, fase e metas.
- [ ] Componente `BiologicalAgeSnapshotCard` renderizado com cálculo correto de delta e empty state educativo.
- [ ] Componente `GoldenBiomarkersGrid` renderizado com os 4 cartões de reserva funcional.
- [ ] Conformance total com tema escuro e claro sem regressão de tokens do Design System.
- [ ] 100% dos testes unitários de frontend passando no `vitest run`.
