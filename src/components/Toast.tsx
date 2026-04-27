"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    if (type !== 'loading') {
      setTimeout(() => removeToast(id), 4000);
    }
  }, [removeToast]);

  const success = (msg: string) => addToast(msg, 'success');
  const error = (msg: string) => addToast(msg, 'error');
  const info = (msg: string) => addToast(msg, 'info');

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border min-w-[300px] max-w-md
              animate-in slide-in-from-right-10 fade-in duration-300
              ${t.type === 'success' ? 'bg-[#065f46] text-white border-[#059669]' : ''}
              ${t.type === 'error' ? 'bg-[#78350f] text-white border-[#92400e]' : ''}
              ${t.type === 'info' ? 'bg-[#1a1a1a] text-white border-[#333]' : ''}
              ${t.type === 'loading' ? 'bg-[#1a1a1a] text-white border-[#333]' : ''}
            `}
          >
            <div className="shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-300" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-300" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-[var(--color-primary)]" />}
              {t.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />}
            </div>
            <p className="text-sm font-semibold flex-1 leading-relaxed">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
