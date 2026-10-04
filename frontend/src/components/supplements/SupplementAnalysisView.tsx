import React from 'react';
import { Sparkles } from 'lucide-react';
import { EmptyState } from '../ui';

export interface SupplementAnalysisViewProps {
  selectedDate: string;
  isAnalyzing: boolean;
  aiAnalysis: string | null;
  onAnalyzeWithAI: () => void;
  onHideAnalysis: () => void;
}

export const FormattedAnalysis: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let currentKey = 0;

  const renderInline = (rawStr: string) => {
    const parts = rawStr.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="text-cyan-700 dark:text-cyan-300 font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const flushTable = () => {
    if (tableRows.length > 0 || tableHeader.length > 0) {
      elements.push(
        <div
          key={`table-${currentKey++}`}
          className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90"
        >
          <table className="w-full text-xs border-collapse">
            <caption className="sr-only">Tabela da análise por inteligência artificial</caption>
            {tableHeader.length > 0 && (
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-left">
                  {tableHeader.map((col, cIdx) => (
                    <th
                      key={cIdx}
                      scope="col"
                      className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800"
                    >
                      {renderInline(col.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b last:border-b-0 border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="p-2 border-r last:border-r-0 border-slate-200/80 dark:border-slate-800/60 text-slate-700 dark:text-slate-300"
                    >
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (line.includes('---')) continue;
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!line) {
      elements.push(<div key={`sp-${currentKey++}`} className="h-1.5" />);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${currentKey++}`}
          className="font-bold text-slate-900 dark:text-white mt-3 mb-1 text-xs border-b border-slate-200 dark:border-slate-800 pb-1"
        >
          {renderInline(line.replace('### ', ''))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h2-${currentKey++}`}
          className="font-bold text-cyan-700 dark:text-cyan-300 mt-4 mb-1 text-xs uppercase tracking-wider"
        >
          {renderInline(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div
          key={`li-${currentKey++}`}
          className="flex items-start gap-1.5 ml-1 my-0.5 text-slate-700 dark:text-slate-300"
        >
          <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    elements.push(
      <p key={`p-${currentKey++}`} className="my-1 text-slate-700 dark:text-slate-300 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  if (inTable) flushTable();
  return <>{elements}</>;
};

export const SupplementAnalysisView: React.FC<SupplementAnalysisViewProps> = ({
  selectedDate,
  isAnalyzing,
  aiAnalysis,
  onAnalyzeWithAI,
  onHideAnalysis,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-500" />
              Análise integrada do Copiloto
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Avaliação de horários de uso, possíveis interações entre itens e sugestões práticas para sua rotina.
            </p>
          </div>

          <button
            onClick={onAnalyzeWithAI}
            disabled={isAnalyzing}
            className="px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-md shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            {isAnalyzing ? 'Analisando...' : 'Gerar nova análise'}
          </button>
        </div>

        {isAnalyzing && (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O Copiloto está avaliando seus horários, dosagens e possíveis interações...
            </p>
          </div>
        )}

        {!isAnalyzing && aiAnalysis && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-cyan-500/30 text-xs text-slate-800 dark:text-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs uppercase font-black tracking-wider text-cyan-600 dark:text-cyan-400">
                Análise gerada para {selectedDate}
              </span>
              <button
                onClick={onHideAnalysis}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                Ocultar análise
              </button>
            </div>
            <div className="space-y-1">
              <FormattedAnalysis text={aiAnalysis} />
            </div>
          </div>
        )}

        {!isAnalyzing && !aiAnalysis && (
          <EmptyState
            title="Nenhuma análise gerada recentemente"
            description="Clique no botão para analisar sua rotina atual de suplementos e verificar possíveis interações com o Copiloto."
            action={{
              label: 'Iniciar análise com IA',
              onClick: onAnalyzeWithAI,
            }}
          />
        )}
      </div>
    </div>
  );
};
