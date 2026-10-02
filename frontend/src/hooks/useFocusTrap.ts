import { useEffect, useRef } from 'react'

export interface UseFocusTrapOptions {
  isOpen: boolean
  onClose?: () => void
  initialFocusRef?: React.RefObject<HTMLElement | null>
  returnFocusOnDeactivate?: boolean
  disableEscape?: boolean
  lockScroll?: boolean
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

/**
 * Hook to contain focus within a modal or drawer container, lock body scroll,
 * listen for Escape, and restore focus to trigger element on close.
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
  } = options

  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Save previous active element to restore focus on exit
    previousActiveElementRef.current = document.activeElement as HTMLElement | null

    // Lock body scroll
    const previousBodyOverflow = document.body.style.overflow
    if (lockScroll) {
      document.body.style.overflow = 'hidden'
    }

    // Set initial focus
    const focusTimeout = window.setTimeout(() => {
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

      if (event.key === 'Escape' && !disableEscape && onClose) {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key === 'Tab') {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(isVisible)

        if (focusables.length === 0) {
          event.preventDefault()
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

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.clearTimeout(focusTimeout)
      window.removeEventListener('keydown', handleKeyDown, true)

      if (lockScroll) {
        document.body.style.overflow = previousBodyOverflow
      }

      if (returnFocusOnDeactivate && previousActiveElementRef.current) {
        // Restore focus to trigger element
        previousActiveElementRef.current.focus?.()
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
  ])
}
