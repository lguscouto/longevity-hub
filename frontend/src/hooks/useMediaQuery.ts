import { useEffect, useState } from 'react';

/** Breakpoint `md` do Tailwind (768px): a partir dele, listagens clínicas usam tabela. */
export const DESKTOP_TABLE_QUERY = '(min-width: 768px)';

function readMatch(query: string, fallback: boolean): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return fallback;
  const mql = window.matchMedia(query);
  return mql && typeof mql.matches === 'boolean' ? mql.matches : fallback;
}

/**
 * useMediaQuery (UX_UI_41)
 *
 * Renderiza **uma única** árvore (tabela OU cards) em vez de duplicar o markup com
 * `hidden md:table` — evita conteúdo clínico duplicado para leitores de tela.
 *
 * Em ambientes sem `matchMedia` (jsdom/SSR) retorna `fallback` (default: desktop).
 */
export function useMediaQuery(query: string, fallback = true): boolean {
  const [matches, setMatches] = useState(() => readMatch(query, fallback));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    if (!mql) return;
    setMatches(mql.matches);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    // Safari < 14
    mql.addListener?.(handler);
    return () => mql.removeListener?.(handler);
  }, [query]);

  return matches;
}
