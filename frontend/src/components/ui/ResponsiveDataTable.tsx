import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, MoveHorizontal } from 'lucide-react';
import { DESKTOP_TABLE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * Prioridade de cada coluna no Row Card mobile (UX_UI_41 / Master §28–§31):
 * - `primary`   → cabeçalho do card (identidade da linha: data, nome)
 * - `secondary` → grade sempre visível (campos clinicamente prioritários)
 * - `detail`    → dentro de "Mais detalhes" (progressive disclosure, nunca removido — §30/§136)
 * - `action`    → rodapé do card (botões)
 */
export type ColumnPriority = 'primary' | 'secondary' | 'detail' | 'action';

export interface DataColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Rótulo textual do campo no card mobile. Default: `header` quando string. */
  label?: string;
  render: (row: T) => React.ReactNode;
  priority?: ColumnPriority;
  align?: 'left' | 'right';
  headerClassName?: string;
  cellClassName?: string;
}

export interface ResponsiveDataTableProps<T> {
  /** Legenda acessível da tabela (`<caption>`) e rótulo da lista de cards. */
  caption: string;
  captionVisible?: boolean;
  columns: DataColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  /** Nome acessível do Row Card (ex.: "Treino de 18/08/2026 — Corrida"). */
  getRowLabel?: (row: T) => string;
  onRowClick?: (row: T) => void;
  isRowSelected?: (row: T) => boolean;
  /** Fixa a primeira coluna durante scroll horizontal (tabelas de auditoria densas). */
  stickyFirstColumn?: boolean;
  /** Força layout (testes/visual QA). Default: `auto` via media query `md`. */
  layout?: 'auto' | 'table' | 'cards';
  detailsLabel?: string;
  footer?: React.ReactNode;
  className?: string;
  tableClassName?: string;
}

const labelOf = <T,>(col: DataColumn<T>) =>
  col.label ?? (typeof col.header === 'string' ? col.header : col.key);

/**
 * ResponsiveDataTable
 *
 * Desktop (≥ md): `<table>` semântica com `<caption>` e `th scope="col"` para comparabilidade.
 * Mobile (< md): Row Cards com campos prioritários + detalhes expansíveis.
 * Renderiza apenas um dos layouts por vez (sem duplicação de conteúdo no DOM).
 */
export function ResponsiveDataTable<T>({
  caption,
  captionVisible = false,
  columns,
  rows,
  getRowKey,
  getRowLabel,
  onRowClick,
  isRowSelected,
  stickyFirstColumn = false,
  layout = 'auto',
  detailsLabel = 'Mais detalhes',
  footer,
  className = '',
  tableClassName = '',
}: ResponsiveDataTableProps<T>) {
  const isDesktop = useMediaQuery(DESKTOP_TABLE_QUERY, true);
  const showTable = layout === 'table' || (layout === 'auto' && isDesktop);

  return (
    <div className={`min-w-0 max-w-full ${className}`} data-layout={showTable ? 'table' : 'cards'}>
      {showTable ? (
        <DesktopTable
          caption={caption}
          captionVisible={captionVisible}
          columns={columns}
          rows={rows}
          getRowKey={getRowKey}
          onRowClick={onRowClick}
          isRowSelected={isRowSelected}
          stickyFirstColumn={stickyFirstColumn}
          tableClassName={tableClassName}
        />
      ) : (
        <RowCards
          caption={caption}
          captionVisible={captionVisible}
          columns={columns}
          rows={rows}
          getRowKey={getRowKey}
          getRowLabel={getRowLabel}
          onRowClick={onRowClick}
          isRowSelected={isRowSelected}
          detailsLabel={detailsLabel}
        />
      )}
      {footer}
    </div>
  );
}

type InnerProps<T> = Pick<
  ResponsiveDataTableProps<T>,
  'caption' | 'captionVisible' | 'columns' | 'rows' | 'getRowKey' | 'onRowClick' | 'isRowSelected'
>;

function DesktopTable<T>({
  caption,
  captionVisible,
  columns,
  rows,
  getRowKey,
  onRowClick,
  isRowSelected,
  stickyFirstColumn,
  tableClassName,
}: InnerProps<T> & { stickyFirstColumn: boolean; tableClassName: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows.length, columns.length]);

  const stickyClass = 'sticky left-0 z-[1] bg-white dark:bg-slate-900';

  return (
    <>
      {scrollable && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
          <MoveHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Deslize horizontalmente para ver todas as colunas
          {stickyFirstColumn ? ' (a primeira coluna permanece fixa)' : ''}.
        </p>
      )}
      {/* overflow-x-auto justificado (UX_UI_41): tabela de auditoria densa, coluna primária fixa + indicação acima */}
      <div
        ref={scrollRef}
        className="overflow-x-auto max-w-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-radius-sm"
        role="region"
        aria-label={`${caption}${scrollable ? ' (rolável horizontalmente)' : ''}`}
        tabIndex={scrollable ? 0 : undefined}
      >
        <table className={`w-full text-left text-xs ${tableClassName}`}>
          <caption className={captionVisible ? 'text-left text-xs text-slate-500 dark:text-slate-400 pb-2' : 'sr-only'}>
            {caption}
          </caption>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider text-xs">
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`py-3 px-4 whitespace-nowrap ${col.align === 'right' ? 'text-right' : ''} ${
                    stickyFirstColumn && idx === 0 ? stickyClass : ''
                  } ${col.headerClassName ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {rows.map((row, rowIdx) => {
              const selected = isRowSelected?.(row) ?? false;
              return (
                <tr
                  key={getRowKey(row, rowIdx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
                    selected ? 'bg-cyan-500/10 dark:bg-cyan-500/15' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {columns.map((col, idx) => {
                    const content = col.render(row);
                    const cellClass = `py-3 px-4 align-middle whitespace-nowrap ${col.align === 'right' ? 'text-right' : ''} ${
                      stickyFirstColumn && idx === 0 ? stickyClass : ''
                    } ${col.cellClassName ?? ''}`;
                    if (idx === 0) {
                      return (
                        <th key={col.key} scope="row" className={`font-normal ${cellClass}`}>
                          {content}
                        </th>
                      );
                    }
                    return (
                      <td
                        key={col.key}
                        className={cellClass}
                        onClick={col.priority === 'action' ? (e) => e.stopPropagation() : undefined}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RowCards<T>({
  caption,
  captionVisible,
  columns,
  rows,
  getRowKey,
  getRowLabel,
  onRowClick,
  isRowSelected,
  detailsLabel,
}: InnerProps<T> & { getRowLabel?: (row: T) => string; detailsLabel: string }) {
  const primary = columns.filter((c) => c.priority === 'primary');
  const secondary = columns.filter((c) => !c.priority || c.priority === 'secondary');
  const detail = columns.filter((c) => c.priority === 'detail');
  const actions = columns.filter((c) => c.priority === 'action');
  const headingCols = primary.length > 0 ? primary : columns.slice(0, 1);
  const bodyCols = primary.length > 0 ? secondary : secondary.filter((c) => c !== columns[0]);

  return (
    <div>
      {captionVisible && <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">{caption}</p>}
      <ul aria-label={caption} className="space-y-3">
        {rows.map((row, rowIdx) => {
          const selected = isRowSelected?.(row) ?? false;
          return (
            <li key={getRowKey(row, rowIdx)}>
              <article
                aria-label={getRowLabel?.(row)}
                className={`p-3.5 rounded-radius-md border transition-colors ${
                  selected
                    ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/15'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                }`}
              >
                <div
                  className={`flex items-start justify-between gap-2 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  <div className="min-w-0 flex-1 space-y-1 text-sm font-bold text-slate-900 dark:text-white">
                    {headingCols.map((col) => (
                      <div key={col.key}>{col.render(row)}</div>
                    ))}
                  </div>
                  {onRowClick && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" aria-hidden="true" />}
                </div>

                {bodyCols.length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    {bodyCols.map((col) => (
                      <div key={col.key} className="min-w-0">
                        <dt className="text-slate-500 dark:text-slate-400">{labelOf(col)}</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200 break-words">{col.render(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {detail.length > 0 && (
                  <details className="mt-3 group">
                    <summary className="cursor-pointer select-none text-xs font-semibold text-cyan-700 dark:text-cyan-400 min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-radius-sm">
                      {detailsLabel} ({detail.length})
                    </summary>
                    <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      {detail.map((col) => (
                        <div key={col.key} className="min-w-0">
                          <dt className="text-slate-500 dark:text-slate-400">{labelOf(col)}</dt>
                          <dd className="font-semibold text-slate-800 dark:text-slate-200 break-words">{col.render(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}

                {actions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    {actions.map((col) => (
                      <React.Fragment key={col.key}>{col.render(row)}</React.Fragment>
                    ))}
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
