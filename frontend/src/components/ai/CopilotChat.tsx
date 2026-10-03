import React, { useRef, useEffect } from 'react';
import { Bot, Moon, Sparkles, Dumbbell, Calendar, Activity, Send } from 'lucide-react';
import { Button, Input } from '../ui';
import { FormattedChatMessage } from './FormattedChatMessage';
import { ChatMessage } from './types';

export interface CopilotChatProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  isSendingChat: boolean;
  hasApiKey: boolean;
  activeProvider: string;
  selectedModel: string;
  onSendMessage: (customText?: string) => void;
}

export const CopilotChat: React.FC<CopilotChatProps> = ({
  chatMessages,
  chatInput,
  setChatInput,
  isSendingChat,
  hasApiKey,
  activeProvider,
  selectedModel,
  onSendMessage,
}) => {
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof chatBottomRef.current?.scrollIntoView === 'function') {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isSendingChat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat || !hasApiKey) return;
    onSendMessage();
    // Garante preservação de foco no input para uso contínuo (U22-P1-49)
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-radius-lg p-3 sm:p-6 flex flex-col h-[calc(100vh-230px)] min-h-[380px] sm:min-h-[480px] max-h-[820px] shadow-sm space-y-3 sm:space-y-4">
      {/* Header do Chat */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-radius-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Chat Conversacional com o Copiloto
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono px-2.5 py-0.5 rounded-radius-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {activeProvider.toUpperCase()} · {selectedModel.split('/')[1] || selectedModel}
          </span>
        </div>
      </div>

      {/* Sugestões Rápidas de Perguntas Contextuais (horizontal scroll no mobile - U22-P1-48) */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0"
        role="toolbar"
        aria-label="Sugestões rápidas de perguntas"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSendMessage('Como foi meu sono e recuperação nos últimos 3 dias?')}
          leftIcon={Moon}
          className="rounded-radius-full text-xs font-normal bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 min-h-[32px] py-1 shrink-0"
        >
          Sono & Recuperação
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSendMessage('Quais padrões e correlações pessoais foram detectados no meu histórico?')}
          leftIcon={Sparkles}
          className="rounded-radius-full text-xs font-normal bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 min-h-[32px] py-1 shrink-0"
        >
          Padrões Aprendidos
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSendMessage('Como minha carga de treino dos últimos 14 dias impactou minha recuperação e sono?')}
          leftIcon={Dumbbell}
          className="rounded-radius-full text-xs font-normal bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 min-h-[32px] py-1 shrink-0"
        >
          Carga de Treino & HRV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSendMessage('Qual o impacto dos eventos recentes da minha Linha do Tempo (como viagens ou álcool) na minha saúde?')}
          leftIcon={Calendar}
          className="rounded-radius-full text-xs font-normal bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 min-h-[32px] py-1 shrink-0"
        >
          Linha do Tempo & Hábitos
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSendMessage('Qual a relação do meu ApoB e exames laboratoriais com longevidade?')}
          leftIcon={Activity}
          className="rounded-radius-full text-xs font-normal bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 min-h-[32px] py-1 shrink-0"
        >
          Analisar ApoB & Labs
        </Button>
      </div>

      {/* Histórico de Mensagens com Semântica Acessível e Scroll Suave */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Mensagens da conversa"
        tabIndex={0}
        className="flex-1 overflow-y-auto space-y-3 pr-1 sm:pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded-radius-md"
      >
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3 sm:p-3.5 rounded-radius-lg max-w-[90%] sm:max-w-[75%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-semibold rounded-br-none shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-xs'
              }`}
            >
              <FormattedChatMessage text={msg.text} />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 px-1 font-mono">
              {msg.time}
            </span>
          </div>
        ))}
        {isSendingChat && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic">
            <Bot className="h-4 w-4 animate-pulse text-cyan-400" aria-hidden="true" /> Copiloto pensando...
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Formulário de Envio com Foco Acessível (U22-P1-49) */}
      <form onSubmit={handleSubmit} className="pt-2 sm:pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder={
              hasApiKey
                ? 'Faça uma pergunta sobre seus exames, treinos ou eventos...'
                : 'Configure a API Key para conversar...'
            }
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={!hasApiKey || isSendingChat}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          aria-label="Enviar mensagem ao copiloto"
          disabled={!hasApiKey || isSendingChat || !chatInput.trim()}
          loading={isSendingChat}
          leftIcon={Send}
          className="shrink-0"
        >
          Enviar
        </Button>
      </form>
    </div>
  );
};
