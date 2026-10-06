import { useEffect } from 'react';

interface ToastProps {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  id,
  title,
  description,
  action,
  className = '',
  onClose,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose, duration]);

  return (
    <div
      key={id}
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex w-auto sm:w-full sm:max-w-sm flex-col items-end gap-4 pointer-events-auto ${className}`}
    >
      <div className="flex w-full items-start gap-3.5 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-lg ring-1 ring-black/5">
        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          {/* Toast icon - could be customized based on toast type */}
        </div>
        <div className="space-y-2 text-left w-full">
          <div className="flex justify-between">
            <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
            <button
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              onClick={onClose}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {description && (
            <p className="text-[11px] text-slate-700">{description}</p>
          )}
          {action && (
            <div className="mt-2">{action}</div>
          )}
        </div>
      </div>
    </div>
  );
}