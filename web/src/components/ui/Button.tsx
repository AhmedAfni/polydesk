import * as React from 'react';
import type { ReactNode } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  asChild = false,
  className = '',
  disabled = false,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  // Base styles
  const baseClasses = 'inline-flex items-center justify-center gap-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  // Variant styles
  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-slate-50 text-slate-900 hover:bg-slate-100',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[size];

  // Combine all classes
  const classes = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`;

  // If asChild is true, we need to clone the child element and add our classes to it
  if (asChild) {
    // Only allow a single child element when asChild is true
    if (typeof children !== 'object' || children === null || Array.isArray(children)) {
      throw new Error('Button with asChild expects exactly one child element');
    }

    // Clone the child element and merge props
    return React.cloneElement(children as React.ReactElement<any>, {
      ...props,
      className: `${(children as React.ReactElement<any>).props?.className ?? ''} ${className}`.trim(),
    });
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}