import React, { forwardRef } from 'react'

export const Checkbox = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>>(
  ({ className = '', ...props }, ref) => <input ref={ref} type="checkbox" className={`h-5 w-5 shrink-0 accent-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${className}`} {...props} />,
)
Checkbox.displayName = 'Checkbox'
