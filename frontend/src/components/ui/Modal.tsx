import React, { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { IconButton } from './IconButton'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  ariaLabel?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full'
  children: React.ReactNode
  footer?: React.ReactNode
  showCloseButton?: boolean
  closeButtonAriaLabel?: string
  initialFocusRef?: React.RefObject<HTMLElement | null>
  className?: string
  contentClassName?: string
  headerAction?: React.ReactNode
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-5xl',
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  ariaLabel,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  closeButtonAriaLabel = 'Fechar diálogo',
  initialFocusRef,
  className = '',
  contentClassName = '',
  headerAction,
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

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      data-testid="modal-backdrop"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={!ariaLabel && title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`relative w-full ${sizeClass} max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 my-auto outline-none ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton || headerAction) && (
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="min-w-0">
                {title && (
                  typeof title === 'string' ? (
                    <h2
                      id={titleId}
                      className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate"
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
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerAction}
              {showCloseButton && (
                <IconButton
                  icon={X}
                  onClick={onClose}
                  aria-label={closeButtonAriaLabel}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                />
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-5 sm:p-6 ${contentClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950/40 rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalNode, document.body)
}
