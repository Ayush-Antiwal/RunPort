import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SnackbarToast {
  id: string;
  type?: 'warning' | 'error' | 'info' | 'success';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface SnackbarContextValue {
  toast: (toastData: Omit<SnackbarToast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

export const SnackbarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<SnackbarToast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (toastData: Omit<SnackbarToast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: SnackbarToast = { ...toastData, id };

      setToasts((prev) => [...prev.filter((t) => t.title !== toastData.title), newToast]);

      const duration = toastData.duration ?? 8000;
      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <SnackbarContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Floating Snackbar Toast Container */}
      <div
        aria-live="polite"
        role="region"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm sm:max-w-md w-full pointer-events-none"
      >
        {toasts.map((item) => {
          const isWarning = item.type === 'warning';
          const isError = item.type === 'error';
          const isSuccess = item.type === 'success';

          const icon = isWarning ? (
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
          ) : isError ? (
            <XCircle size={16} className="text-red-400 shrink-0" />
          ) : isSuccess ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <Info size={16} className="text-blue-400 shrink-0" />
          );

          const borderClass = isWarning
            ? 'border-amber-500/35 bg-[#17140f]/95 text-amber-200 shadow-amber-950/20'
            : isError
            ? 'border-red-500/35 bg-[#171113]/95 text-red-200 shadow-red-950/20'
            : isSuccess
            ? 'border-emerald-500/35 bg-[#0f1713]/95 text-emerald-200 shadow-emerald-950/20'
            : 'border-blue-500/35 bg-[#10141b]/95 text-blue-200 shadow-blue-950/20';

          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto border px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 transition-all duration-200 select-none',
                borderClass
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {icon}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold tracking-tight truncate">{item.title}</span>
                  {item.description && (
                    <span className="text-[0.7rem] opacity-80 truncate font-mono mt-0.5">{item.description}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.action && (
                  <button
                    onClick={() => {
                      item.action?.onClick();
                      dismiss(item.id);
                    }}
                    className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap',
                      isWarning
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border-amber-500/40'
                        : isError
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-100 border-red-500/40'
                        : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border-blue-500/40'
                    )}
                  >
                    {item.action.label}
                  </button>
                )}
                <button
                  onClick={() => dismiss(item.id)}
                  title="Dismiss notification"
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </SnackbarContext.Provider>
  );
};

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}
