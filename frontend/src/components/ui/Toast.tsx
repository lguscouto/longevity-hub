import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'partial';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'> | string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (toast.duration === 0) return;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-cyan-500 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
    partial: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
  };

  const borderColors: Record<ToastType, string> = {
    success: 'border-emerald-500/30 dark:border-emerald-500/40',
    error: 'border-rose-500/30 dark:border-rose-500/40',
    info: 'border-cyan-500/30 dark:border-cyan-500/40',
    warning: 'border-amber-500/30 dark:border-amber-500/40',
    partial: 'border-amber-500/30 dark:border-amber-500/40',
  };

  const isWarningOrPartial = toast.type === 'warning' || toast.type === 'partial';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border ${borderColors[toast.type]} shadow-xl shadow-slate-900/10 dark:shadow-black/40 text-xs sm:text-sm text-slate-800 dark:text-slate-100 transition-all w-full max-w-sm`}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0 pt-0.5">
        {toast.title && <p className="font-bold text-slate-900 dark:text-white mb-0.5">{toast.title}</p>}
        <p className="leading-snug break-words">{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className={`mt-2 inline-flex items-center gap-1 text-xs font-bold transition rounded-radius-sm px-2.5 py-1 focus-visible:ring-2 focus-visible:outline-none ${
              isWarningOrPartial
                ? 'text-amber-800 dark:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 focus-visible:ring-amber-500'
                : 'text-cyan-800 dark:text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 focus-visible:ring-cyan-500'
            }`}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificações do sistema"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-[70] flex flex-col items-center sm:items-end gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full sm:w-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'> | string, type: ToastType = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem =
        typeof toast === 'string'
          ? { id, message: toast, type, duration: 3500 }
          : { id, duration: 3500, ...toast, type: toast.type || type };

      setToasts((prev) => [...prev.slice(-4), newToast]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      showToast: () => {},
      removeToast: () => {},
    };
  }
  return context;
};
