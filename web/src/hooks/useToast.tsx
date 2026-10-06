import { useState, useCallback, useRef, createContext, useContext } from 'react';
import { Toast } from '../components/ui/Toast';
import type { ReactNode } from 'react';

interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

interface ToastState {
  id: string;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastState[];
  addToast: (options: ToastOptions) => () => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastIdRef = useRef(0);

  const generateId = useCallback(() => {
    return `${Date.now()}-${++toastIdRef.current}`;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((options: ToastOptions) => {
    const toast: ToastState = {
      id: generateId(),
      title: options.title,
      description: options.description,
      duration: options.duration,
    };

    setToasts(prev => [...prev, toast]);

    // Return a function to manually dismiss the toast
    return () => {
      removeToast(toast.id);
    };
  }, [generateId, removeToast]);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              title={toast.title}
              description={toast.description}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}