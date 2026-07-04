import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (text: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((text: string, type: ToastType = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, text, type }]);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 3500);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast container (Bottom Left) */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none font-cairo">
        {toasts.map(toast => {
          const typeStyles = {
            success: 'bg-emerald-50 border-emerald-100 text-emerald-800 shadow-emerald-50/50',
            error: 'bg-rose-50 border-rose-100 text-rose-800 shadow-rose-50/50',
            info: 'bg-blue-50 border-blue-100 text-blue-800 shadow-blue-50/50',
          };

          const Icon = {
            success: CheckCircle2,
            error: AlertCircle,
            info: Info
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-4 border rounded-2xl shadow-lg transition-all duration-300 animate-slide-in ${typeStyles[toast.type]}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={18} className="shrink-0 stroke-[2.2]" />
                <span className="text-xs font-semibold">{toast.text}</span>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors duration-150 shrink-0 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
