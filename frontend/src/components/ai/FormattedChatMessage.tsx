import React from 'react';

export interface FormattedChatMessageProps {
  text: string;
}

export const FormattedChatMessage: React.FC<FormattedChatMessageProps> = ({ text }) => {
  if (!text) return null;

  // Processa linha a linha identificando tabelas, cabeçalhos, listas e negrito
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let currentKey = 0;

  const renderFormattedInlineText = (rawStr: string) => {
    // Substitui **texto** por <strong>
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
          className="my-2 overflow-x-auto rounded-radius-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80"
        >
          <table className="w-full text-xs border-collapse">
            <caption className="sr-only">Tabela de resposta da IA</caption>
            {tableHeader.length > 0 && (
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-left">
                  {tableHeader.map((col, cIdx) => (
                    <th
                      key={cIdx}
                      scope="col"
                      className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800"
                    >
                      {renderFormattedInlineText(col.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b last:border-b-0 border-slate-200 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800/60 text-slate-700 dark:text-slate-300"
                    >
                      {renderFormattedInlineText(cell.trim())}
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

    // Detecta tabela Markdown (ex: | Métrica | Valor |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      // Ignora linha divisória Markdown (ex: |---|---|)
      if (line.includes('---')) {
        continue;
      }
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

    // Cabeçalhos (### Título)
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${currentKey++}`}
          className="font-extrabold text-slate-900 dark:text-white text-xs mt-3 mb-1.5 border-b border-slate-200 dark:border-slate-800 pb-1"
        >
          {renderFormattedInlineText(line.replace('### ', ''))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h2-${currentKey++}`}
          className="font-black text-cyan-700 dark:text-cyan-300 text-sm mt-3 mb-1.5 border-b border-cyan-500/20 pb-1"
        >
          {renderFormattedInlineText(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    // Tópicos com lista (- item ou * item)
    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      const cleanLine = line.replace(/^[-*]\s+|\d+\.\s+/, '');
      elements.push(
        <div
          key={`li-${currentKey++}`}
          className="flex items-start gap-1.5 ml-2 my-0.5 text-slate-700 dark:text-slate-300"
        >
          <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
          <span>{renderFormattedInlineText(cleanLine)}</span>
        </div>
      );
      continue;
    }

    // Parágrafo normal
    elements.push(
      <p
        key={`p-${currentKey++}`}
        className="my-1 leading-relaxed text-slate-700 dark:text-slate-300"
      >
        {renderFormattedInlineText(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable();
  }

  return <div className="space-y-0.5">{elements}</div>;
};
