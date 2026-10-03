import { useEffect, useRef, useId } from 'react'

export interface UseFocusTrapOptions {
  isOpen: boolean
  onClose?: () => void
  initialFocusRef?: React.RefObject<HTMLElement | null>
  returnFocusOnDeactivate?: boolean
  disableEscape?: boolean
  lockScroll?: boolean
  closeOnNavigation?: boolean
}

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ')

function isVisible(el: HTMLElement): boolean {
  if (el.hasAttribute('hidden')) return false
  if (el.style.display === 'none' || el.style.visibility === 'hidden') return false
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
  }
  return true
}

interface OverlayStackItem {
  id: string
  containerRef: React.RefObject<HTMLElement | null>
  onClose?: () => void
  previousActiveElement: HTMLElement | null
  lockScroll: boolean
  previousBodyOverflow: string
}

const activeOverlayStack: OverlayStackItem[] = []
let globalOriginalOverflow = ''

export function getActiveOverlayCount(): number {
  return activeOverlayStack.length
}

export function resetActiveOverlayStack(): void {
  activeOverlayStack.length = 0
  if (typeof document !== 'undefined') {
    document.body.style.overflow = globalOriginalOverflow
  }
}

/**
 * Hook to contain focus within a modal or drawer container, lock body scroll,
 * listen for Escape, and restore focus to trigger element on close.
 *
 * Implements strict modal stacking: when multiple overlays are open
 * (e.g. Drawer -> Modal -> ConfirmDialog), only the top-most overlay traps Tab
 * and responds to Escape.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions
): void {
  const {
    isOpen,
    onClose,
    initialFocusRef,
    returnFocusOnDeactivate = true,
    disableEscape = false,
    lockScroll = true,
    closeOnNavigation = true,
  } = options

  const overlayId = useId()
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Save previous active element to restore focus on exit
    const prevActive = document.activeElement as HTMLElement | null
    previousActiveElementRef.current = prevActive

    // Lock body scroll if first overlay
    if (activeOverlayStack.length === 0) {
      globalOriginalOverflow = document.body.style.overflow
    }
    const prevOverflow = document.body.style.overflow
    if (lockScroll) {
      document.body.style.overflow = 'hidden'
    }

    // Register this overlay in the stack
    const stackItem: OverlayStackItem = {
      id: overlayId,
      containerRef,
      onClose,
      previousActiveElement: prevActive,
      lockScroll,
      previousBodyOverflow: prevOverflow,
    }
    activeOverlayStack.push(stackItem)

    // Set initial focus
    const focusTimeout = window.setTimeout(() => {
      // Only set initial focus if this overlay is still in the stack
      if (!activeOverlayStack.some((item) => item.id === overlayId)) return

      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
        return
      }

      if (containerRef.current) {
        const focusable = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(isVisible)
        if (focusable.length > 0) {
          focusable[0].focus()
        } else {
          containerRef.current.focus()
        }
      }
    }, 16)

    // Handle keydown for Tab trapping and Escape
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || !containerRef.current) return

      // ONLY the top-most overlay in the stack responds to keyboard events
      const topOverlay = activeOverlayStack[activeOverlayStack.length - 1]
      if (!topOverlay || topOverlay.id !== overlayId) {
        return
      }

      if (event.key === 'Escape') {
        if (!disableEscape && onClose) {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
        return
      }

      if (event.key === 'Tab') {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(isVisible)

        if (focusables.length === 0) {
          event.preventDefault()
          containerRef.current.focus()
          return
        }

        const firstElement = focusables[0]
        const lastElement = focusables[focusables.length - 1]
        const currentActive = document.activeElement

        if (event.shiftKey) {
          // Shift + Tab
          if (currentActive === firstElement || !containerRef.current.contains(currentActive)) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab
          if (currentActive === lastElement || !containerRef.current.contains(currentActive)) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    const handleNavigation = () => {
      if (closeOnNavigation && onClose) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('popstate', handleNavigation)
    window.addEventListener('hashchange', handleNavigation)

    return () => {
      window.clearTimeout(focusTimeout)
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('popstate', handleNavigation)
      window.removeEventListener('hashchange', handleNavigation)

      // Remove from stack
      const idx = activeOverlayStack.findIndex((item) => item.id === overlayId)
      if (idx !== -1) {
        activeOverlayStack.splice(idx, 1)
      }

      // Restore scroll only if no active overlay demands locked scroll
      if (activeOverlayStack.length === 0) {
        if (lockScroll) {
          document.body.style.overflow = globalOriginalOverflow
        }
      } else {
        // Still other overlays open: ensure top overlay still has focus if needed
        const remainingTop = activeOverlayStack[activeOverlayStack.length - 1]
        if (remainingTop?.containerRef?.current) {
          const focusables = Array.from(
            remainingTop.containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
          ).filter(isVisible)
          if (focusables.length > 0) {
            focusables[0].focus?.()
          } else {
            remainingTop.containerRef.current.focus?.()
          }
        }
      }

      if (returnFocusOnDeactivate && previousActiveElementRef.current) {
        // Restore focus to trigger element if still in DOM
        if (document.body.contains(previousActiveElementRef.current)) {
          previousActiveElementRef.current.focus?.()
        }
      }
    }
  }, [
    isOpen,
    onClose,
    containerRef,
    initialFocusRef,
    returnFocusOnDeactivate,
    disableEscape,
    lockScroll,
    closeOnNavigation,
    overlayId,
  ])
}
