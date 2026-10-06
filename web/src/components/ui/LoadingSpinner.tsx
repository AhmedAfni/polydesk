import type { ReactNode } from 'react';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: ReactNode;
}

export function LoadingSpinner({
  className = '',
  size = 'md',
  label,
}: LoadingSpinnerProps) {
  // Size classes
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size];

  // Base classes
  const baseClasses = 'inline-flex items-center justify-center rounded-full border-2 border-primary border-t-transparent animate-spin';

  // Combine all classes
  const classes = `${baseClasses} ${sizeClasses} ${className}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={classes} aria-label="Loading">
        {/* The spinning indicator */}
      </div>
      {label && <span className="text-xs text-slate-500">{label}</span>}
    </div>
  );
}