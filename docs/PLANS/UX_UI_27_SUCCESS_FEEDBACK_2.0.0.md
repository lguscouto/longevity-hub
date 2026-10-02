# Plano UX/UI — UX_UI_27_SUCCESS_FEEDBACK_2.0.0

> **Título:** Feedback de Sucesso de Primeira Classe e Notificações Contextuais  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Implementar um padrão de feedback de sucesso leve e local-first (banners contextuais ou toasts temporários) para confirmação de ações de mutação.

## Contexto da versão 2.0.0
Ações como registrar métrica manual, marcar suplemento tomado ou recalcular KDM fecham o modal ou atualizam a tela sem feedback afirmativo claro.

## Problema
O usuário fica em dúvida se a ação foi realmente persistida quando o modal simplesmente desaparece.

## Evidências
Falta de notificação explícita de sucesso pós-salvamento em formulários manuais.

## Estado atual
Ações fecham modais sem anúncio afirmativo ou rely em atualização indireta de cards.

## O que já foi resolvido
Tratamento de erro robusto com ApiError.

## O que permanece
Confirmação explícita de sucesso.

## Escopo
1. Criar primitive de feedback afirmativo contextual (Toast ou InlineBanner).
2. Exibir mensagem temporária (3 segundos) ao salvar métricas, exames, doses e avaliações.
3. Anunciar via aria-live='polite'.

## Fora de escopo
Adicionar bibliotecas pesadas terceiras de notificação.

## Arquivos afetados
- frontend/src/components/ui/Toast.tsx (Novo)
- frontend/src/App.tsx
- frontend/src/components/ManualEntryModal.tsx
- frontend/src/components/SupplementsView.tsx

## Componentes envolvidos
Toast, App, ManualEntryModal, SupplementsView

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Implementar componente leve autônomo com auto-dismiss e suporte a teclado.

## Estados e comportamento
Entrada suave com fade-in, permanência por 3s e saída automática ou por clique no X.

## Acessibilidade
role='status', aria-live='polite', não bloqueia foco.

## Responsividade
Posicionado no canto inferior direito no desktop e barra fixa na base no mobile.

## Dark/Light
Fundo contrastante com borda verde semântica (emerald-500).

## Microcopy
'Métrica registrada com sucesso!', 'Dose confirmada!', 'Avaliação física salva!'.

## Testes unitários
Toast.test.tsx validando auto-fechamento e acessibilidade.

## Testes E2E
Playwright validando aparição do toast após submit de métrica.

## Visual QA
Inspeção visual da animação em 375x667.

## Critérios de aceite
- Feedback afirmativo exibido após cada mutação de sucesso.
- Desaparecimento automático sem prender a navegação do usuário.

## Riscos
Empilhamento excessivo de notificações se múltiplas ações forem disparadas simultaneamente.

## Rollback
Reversão do componente Toast via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Planejamento Inicial | N/A | 02/10/2026 | Local | PENDING | Aguardando início da execução |

## Checklist de conclusão
- [ ] Implementação de código finalizada
- [ ] Testes unitários aprovados
- [ ] Testes E2E aprovados
- [ ] Validação visual realizada
- [ ] Evidências de execução registradas
- [ ] Homologação concluída
