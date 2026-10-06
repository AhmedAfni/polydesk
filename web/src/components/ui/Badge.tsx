import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  children: ReactNode;
}

export function Badge({
  variant = 'default',
  className = '',
  children,
}: BadgeProps) {
  // Base styles
  const baseClasses = 'inline-flex items-center rounded-xs text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

  // Variant styles
  const variantClasses = {
    default: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
    secondary: 'bg-slate-50 text-slate-600 hover:bg-slate-100',
    destructive: 'bg-red-50 text-red-600 hover:bg-red-100',
    outline: 'border border-slate-200 bg-transparent hover:bg-slate-50',
  }[variant];

  // Combine all classes
  const classes = `${baseClasses} ${variantClasses} ${className}`;

  return (
    <span className={classes}>
      {children}
    </span>
  );
}