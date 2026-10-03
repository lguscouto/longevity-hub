import React, { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { IconButton } from './IconButton'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  badge?: React.ReactNode
  ariaLabel?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  footer?: React.ReactNode
  showCloseButton?: boolean
  closeButtonAriaLabel?: string
  initialFocusRef?: React.RefObject<HTMLElement | null>
  className?: string
  contentClassName?: string
}

const SIZE_CLASSES: Record<NonNullable<DrawerProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  badge,
  ariaLabel,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  closeButtonAriaLabel = 'Fechar painel lateral',
  initialFocusRef,
  className = '',
  contentClassName = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useFocusTrap(containerRef, {
    isOpen,
    onClose,
    initialFocusRef,
  })

  if (!isOpen || typeof document === 'undefined') return null

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md

  const drawerNode = (
    <div
      className="fixed inset-0 z-40 overflow-hidden"
      data-testid="drawer-root"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        /* ds-exception: DSX-002 */
        className="absolute inset-0 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        data-testid="drawer-backdrop"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={!ariaLabel && title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          aria-label={ariaLabel}
          tabIndex={-1}
          className={`pointer-events-auto w-screen ${sizeClass} bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-elevation-3 flex flex-col transform transition-transform animate-in slide-in-from-right duration-300 outline-none ${className}`}
        >
          {/* Header */}
          {(title || showCloseButton || badge) && (
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0 gap-3">
              <div className="min-w-0 pr-2">
                {badge && <div className="mb-1.5">{badge}</div>}
                {title && (
                  typeof title === 'string' ? (
                    <h2
                      id={titleId}
                      className="text-base font-bold text-slate-900 dark:text-white truncate"
                    >
                      {title}
                    </h2>
                  ) : (
                    <div id={titleId}>{title}</div>
                  )
                )}
                {description && (
                  <p
                    id={descriptionId}
                    className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2"
                  >
                    {description}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <IconButton
                  icon={X}
                  onClick={onClose}
                  aria-label={closeButtonAriaLabel}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                />
              )}
            </div>
          )}

          {/* Drawer Body */}
          <div className={`flex-1 overflow-y-auto p-6 ${contentClassName}`}>
            {children}
          </div>

          {/* Optional Footer */}
          {footer && (
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(drawerNode, document.body)
}
