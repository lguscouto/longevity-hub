import React from 'react'
import { Sparkles } from 'lucide-react'

interface ExplainChangeButtonProps {
  onClick: () => void
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export const ExplainChangeButton: React.FC<ExplainChangeButtonProps> = ({
  onClick,
  label = 'Entender mudança',
  className = '',
  size = 'sm',
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1 text-[11px] gap-1 rounded-xl'
      : 'px-3.5 py-1.5 text-xs gap-1.5 rounded-2xl'

  return (
    <button
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
      className={`inline-flex items-center font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition shadow-xs cursor-pointer ${sizeClasses} ${className}`}
      title="Explicar possíveis fatores contextuais associados a esta alteração"
    >
      <Sparkles className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      <span>{label}</span>
    </button>
  )
}
