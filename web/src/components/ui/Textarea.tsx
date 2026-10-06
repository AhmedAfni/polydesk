import * as React from 'react';
import type { ReactNode } from 'react';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'rows'> {
  placeholder?: string;
  value?: string;
  onChange?: ((e: React.ChangeEvent<HTMLTextAreaElement>) => void) | ((value: string) => void) | React.Dispatch<React.SetStateAction<string>>;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  id?: string;
  label?: ReactNode;
  showLabel?: boolean;
}

export function Textarea({
  placeholder = '',
  value = '',
  onChange,
  className = '',
  disabled = false,
  required = false,
  rows = 5,
  id,
  label,
  showLabel = true,
  ...props
}: TextareaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!onChange) return;
    (onChange as any)(e.target.value, e);
  };

  return (
    <div className="space-y-1.5">
      {showLabel && label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-slate-700"
        >
          {label}
          {required && (
            <span className="text-indigo-600">*</span>
          )}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={`mt-1.5 block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${className}`}
        disabled={disabled}
        required={required}
        rows={rows}
        id={id}
        {...props}
      />
    </div>
  );
}