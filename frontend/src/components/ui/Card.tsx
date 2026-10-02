import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  surface?: 'default' | 'raised' | 'highlight';
}

const surfaceClasses = {
  default: 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs',
  raised: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md',
  highlight: 'bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ surface = 'default', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl transition-colors ${surfaceClasses[surface]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-base font-bold tracking-tight text-slate-900 dark:text-white ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs text-slate-500 dark:text-slate-400 font-medium ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`p-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);
