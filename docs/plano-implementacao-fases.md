# Plano de implementação por fases

Base: [reavaliação de 11/11/2026](reavaliacao-plano-ux-2026-11-11.md) e plano aprovado na conversa. As fases são independentes para revisão e não autorizam publicação, mudanças em produção ou alteração de credenciais reais.

**Andamento:** fase 0 registrada no commit `ad0301f`. Fase 1 implementada localmente para a ingestão em lote: os nove marcadores exigem unidades suportadas, a validação ocorre antes da inserção e os dados originais são preservados. A suíte Python executada após a mudança funcional teve 420 aprovações; os testes específicos finais tiveram 19 aprovações, incluindo verificações adicionais dos nove marcadores. A fase 2 e as demais continuam pendentes. A validação de outros caminhos e de outros indicadores não está coberta pela conclusão da fase 1.

| Fase | Escopo | Critério de conclusão |
|---|---|---|
| 0 — Marco inicial | Commit dos ajustes anteriores, preservando alterações preexistentes. | Commit criado; estado Git conferido. |
| 1 — Exames e PhenoAge | Validar unidades dos nove marcadores do PhenoAge antes de gravar lotes; preservar originais e verificar idade, proveniência e equivalência. | Erros identificáveis sem gravação parcial; testes com dados sintéticos passam. |
| 2 — Demais indicadores clínicos | Estender validação de unidades e consistência a todos os indicadores derivados, KDM e relatórios. | Conversões equivalentes e unidades incompatíveis verificadas nos caminhos aplicáveis. |
| 3 — Acesso e privacidade | Sessão própria do proprietário, isolamento do personal, HTTPS externo, callbacks e credenciais no cofre. | Matriz de autorização e compatibilidade de imagens/downloads passa; nenhuma credencial operacional alterada. |
| 4 — Interface e comunicação | Responsividade, linguagem, avisos de IA, estados de erro e invariantes de filtros clínicos. | Cenários claros, escuro, 320 px, teclado e filtros validados. |
| 5 — Qualidade visual e testes | Corrigir E2E, comparar baselines sem sobrescrevê-los e reduzir dívida do design system. | Suítes relevantes e comparação visual passam; baseline só muda por atualização deliberada. |
| 6 — Operação e documentação | Inicialização, backup/restauração, locks, proveniência, instalação e documentação. | Restauração e concorrência validadas em dados sintéticos; documentação atualizada. |
| 7 — Validação final | Suítes completas e relatório A01–A19 com limitações. | Evidências registradas e nenhum item incompleto declarado como concluído. |

Cada fase deve preservar os arquivos e alterações existentes. Qualquer migração ou reconciliação sobre o banco operacional exige as salvaguardas do `AGENTS.md` e autorização aplicável; testes usam bancos temporários.
