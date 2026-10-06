# Fase 3: Interface de Usuário - Ficha Médica de Segurança (Medical ID) & Arquitetura de Estilo de Vida

---

## 1. Visão Geral e Objetivos

Esta fase implementa os dois pilares inferiores essenciais do novo Perfil de Longevidade: a **Ficha Médica de Segurança (*Medical ID*)** e a **Arquitetura de Estilo de Vida & Hábitos**, além de um **Modal de Edição Estruturado em Abas** para permitir a gestão intuitiva de todas essas informações.

### Objetivos Principais
1. **Ficha Médica e Segurança Clínica (*Medical ID*)**: Criar um cartão dedicado para dados críticos de saúde (Tipo Sanguíneo/Rh, Alergias, Contato de Emergência ICE, Histórico Familiar e Médico Responsável).
2. **Arquitetura de Estilo de Vida & Hábitos**: Exibir as diretrizes operacionais do dia a dia do usuário (Janela de Jejum, Cronotipo Circadiano, Metas de Hidratação e Sono).
3. **Modal de Edição Estruturado (`EditProfileModal.tsx`)**: Substituir o formulário em linha expansível por um modal acessível organizado por abas temáticas, evitando formulários verticais excessivamente longos.
4. **Conformidade com Primitivas de Formulário**: Utilizar estritamente os componentes canônicos da pasta `frontend/src/components/ui/` (`FormField`, `Input`, `Select`, `Button`).

---

## 2. Componente: Ficha Médica de Segurança (`MedicalIdCard.tsx`)

O cartão `MedicalIdCard` organiza as informações de segurança clínica inspiradas no *Medical ID* da Apple e nas fichas de triagem funcional:

```
+-------------------------------------------------------------------------------+
|  🏥 FICHA MÉDICA & SEGURANÇA (MEDICAL ID)                     [ Em Dia • 🔒 ] |
+-------------------------------------------------------------------------------+
|  [ TIPO SANGUÍNEO ]        [ ALERGIAS & INTOLERÂNCIAS ]                       |
|  O+ (Rh Positivo)          Nenhuma medicamentosa / Lactose (leve)             |
|                                                                               |
|  [ CONTATO DE EMERGÊNCIA (ICE) ]                                              |
|  Juliana (Esposa) • 📞 +55 (11) 98765-4321                                    |
|                                                                               |
|  [ HISTÓRICO FAMILIAR RELEVANTE ]                                             |
|  Doença cardiovascular aterosclerótica paterna aos 62a                        |
|                                                                               |
|  [ MÉDICO / CLÍNICO DE REFERÊNCIA ]                                           |
|  Dr. Roberto Santos (Cardiologia Preventiva)                                  |
+-------------------------------------------------------------------------------+
```

### Especificação dos Campos
* **Tipo Sanguíneo**: Badge visual com destaque estilizado em vermelho/bordô suave (`bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold`).
* **Alergias & Intolerâncias**:
  - Se houver alergia medicamentosa: tag de alerta de segurança em tom âmbar/vermelho.
  - Se não houver: texto neutro assegurado.
* **Contato de Emergência (ICE - *In Case of Emergency*)**:
  - Exibe nome, parentesco e número de telefone com link semântico `tel:+55...` permitindo ligação direta com 1 toque em dispositivos móveis.
* **Médico de Referência**: Nome e especialidade médica para facilitar comunicação em relatórios clínicos.

---

## 3. Componente: Arquitetura de Estilo de Vida (`LifestyleArchitectureCard.tsx`)

Este componente consolida os parâmetros de rotina que contextualizam as medições coletadas pelos relógios e anéis inteligentes:

```
+-------------------------------------------------------------------------------+
|  🌿 ARQUITETURA DE ESTILO DE VIDA & ROTINA                                   |
+-------------------------------------------------------------------------------+
|  [ JANELA DE JEJUM ]       [ CRONOTIPO CIRCADIANO ]                           |
|  16:8 (12:00 às 20:00)     Intermediário Matutino (Janela ideal: 22h45-06h30) |
|                                                                               |
|  [ META DE HIDRATAÇÃO ]    [ META DE SONO ]           [ COMPOSTOS ATIVOS ]    |
|  3.2 L / dia               8.0 horas / noite          5 suplementos no stack  |
+-------------------------------------------------------------------------------+
```

### Especificação dos Campos
* **Janela de Jejum Intermitente**: Informa o protocolo de restrição alimentar temporal adotado (ex: `16:8`, `14:10`, `Circadiano`).
* **Cronotipo Circadiano**: Classificação entre *Matutino (Cotovia)*, *Intermediário* ou *Noturno (Coruja)*, orientando os horários ideais de repouso.
* **Meta de Hidratação Diária**: Volume alvo em mililitros (ex: `3200 ml`).
* **Meta de Sono Noturno**: Horas ideais de descanso (ex: `8.0h`).
* **Stack Ativo**: Contador dinâmico vinculado aos suplementos ativos do banco de dados com link para a aba *Suplementos*.

---

## 4. Modal de Edição Estruturado (`EditProfileModal.tsx`)

Para garantir ergonomia visual e evitar poluição da tela com um formulário de mais de 15 campos, a edição será realizada através de um modal com abas de navegação vertical/horizontal:

```
+-------------------------------------------------------------------------------+
|  Editar Perfil de Longevidade                                             [X] |
+-------------------------------------------------------------------------------+
|  [ Dados Pessoais ] [ Ficha Médica ] [ Estilo de Vida ] [ Metas do Protocolo] |
|-------------------------------------------------------------------------------|
|                                                                               |
|   (Conteúdo da aba selecionada usando FormField, Input, Select canônicos)     |
|                                                                               |
|-------------------------------------------------------------------------------|
|                                                  [ Cancelar ] [ Salvar Perfil]|
+-------------------------------------------------------------------------------+
```

### Abas do Modal

#### Aba 1: Dados Pessoais & Antropometria
* Nome Completo (`Input text`)
* Data de Nascimento (`Input date`)
* Sexo Biológico (`Select: Masculino, Feminino`)
* Altura em cm (`Input number step="0.5"`)
* Peso Atual em kg (`Input number step="0.1"`)
* Meta de Peso em kg (`Input number step="0.5"`)

#### Aba 2: Ficha Médica & Emergência
* Tipo Sanguíneo (`Select: A+, A-, B+, B-, AB+, AB-, O+, O-, Não sei`)
* Alergias & Intolerâncias (`Input text` com tags ou texto livre)
* Histórico Familiar (`Input text` ou `Textarea`)
* Contato de Emergência - Nome (`Input text`)
* Contato de Emergência - Telefone (`Input tel`)
* Médico de Referência (`Input text`)

#### Aba 3: Estilo de Vida & Hábitos
* Janela de Jejum (`Select: Sem restrição, 12:12, 14:10, 16:8, 18:6, 20:4, Personalizado`)
* Cronotipo (`Select: Matutino, Intermediário, Noturno`)
* Meta Diária de Água em ml (`Input number step="100"`)
* Meta de Sono em horas (`Input number step="0.5"`)
* Meta de Gordura Corporal em % (`Input number step="0.5"`)

#### Aba 4: Metas de Longevidade & Protocolo
* Fase do Protocolo (`Input text` — ex: *"Fase 2: Otimização Mitocondrial"*)
* Data de Início do Protocolo (`Input date`)
* Metas Prioritárias (`Multi-select checkboxes`):
  - [x] Otimização Cardiovascular (ApoB < 70, VO2 Max elevado)
  - [x] Hipertrofia & Força Muscular (Prevenção de Sarcopenia)
  - [x] Redução de Idade Biológica (PhenoAge / KDM)
  - [ ] Saúde Metabólica & Sensibilidade à Insulina
  - [ ] Otimização do Sono Profundo & Recuperação

---

## 5. Validação de Formulários e Integração com a API

* **Tratamento de Strings Vazias**: Valores em branco devem ser transmitidos como `null` ou omitidos no payload JSON para evitar gravação de strings vazias no banco de dados.
* **Validação de Limites Fisiológicos**:
  - Altura: $50 \le \text{cm} \le 250$
  - Peso: $20 \le \text{kg} \le 300$
  - Água: $500 \le \text{ml} \le 8000$
  - Sono: $4.0 \le \text{horas} \le 14.0$
* **Feedback de Sucesso**: Ao salvar com sucesso, fecha o modal, atualiza o estado local do perfil sem necessidade de recarregar a página e exibe toast de confirmação.

---

## 6. Conformidade com Design System e Acessibilidade

* O modal utilizará o container padrão com `role="dialog"`, `aria-modal="true"`, foco gerenciado automaticamente no primeiro campo e fechamento pela tecla `Escape`.
* Os campos obrigatórios serão sinalizados com `required` semântico e rótulo claro no `FormField`.
* Todos os inputs terão rótulos devidamente associados via `id` e `htmlFor`.

---

## 7. Plano de Testes de Interface

Arquivo: `frontend/src/components/profile/EditProfileModal.test.tsx`

1. **Navegação entre Abas do Modal**:
   - Valida que clicar na aba *"Ficha Médica"* esconde os campos de dados físicos e exibe o campo de Tipo Sanguíneo.
2. **Submissão do Formulário Enriquecido**:
   - Simula o preenchimento de campos médicos e de estilo de vida e verifica se o callback `onUpdateProfile` recebe o payload completo estruturado.
3. **Comportamento do Contato de Emergência**:
   - Valida que o link telefônico no `MedicalIdCard` gera o atributo `href="tel:..."` correto.

---

## 8. Critérios de Aceitação e Definição de Pronto (DoD)

- [ ] Componente `MedicalIdCard` implementado com tratamento de estados preenchidos e não informados.
- [ ] Componente `LifestyleArchitectureCard` implementado e renderizado ao lado da Ficha Médica.
- [ ] Componente `EditProfileModal` implementado com as 4 abas e validação de limites.
- [ ] Suporte perfeito a dark mode e contraste WCAG 2.1 AA.
- [ ] Testes de unidade e interação passando com cobertura adequada.
