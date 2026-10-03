import { useEffect, useRef } from 'react';

export interface UseScrollActiveIntoViewOptions {
  activeKey: string | number | boolean;
  behavior?: ScrollBehavior;
  inline?: ScrollLogicalPosition;
  block?: ScrollLogicalPosition;
}

/**
 * Hook to automatically scroll an active navigation element (such as a subnav tab)
 * into visible view within its scrollable parent container whenever activeKey changes.
 */
export function useScrollActiveIntoView<T extends HTMLElement = HTMLElement>(
  options: UseScrollActiveIntoViewOptions
) {
  const { activeKey, behavior = 'smooth', inline = 'nearest', block = 'nearest' } = options;
  const activeElementRef = useRef<T | null>(null);

  useEffect(() => {
    if (activeElementRef.current && typeof activeElementRef.current.scrollIntoView === 'function') {
      try {
        activeElementRef.current.scrollIntoView({
          behavior,
          inline,
          block,
        });
      } catch {
        // Fallback for environments without full ScrollIntoViewOptions support
        activeElementRef.current.scrollIntoView();
      }
    }
  }, [activeKey, behavior, inline, block]);

  return activeElementRef;
}
