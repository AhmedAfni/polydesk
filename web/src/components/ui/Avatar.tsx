import type { ReactNode } from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function Avatar({
  src,
  alt = '',
  className = '',
  fallback,
  size = 'md',
}: AvatarProps) {
  // Size classes
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-9 w-9',
  }[size];

  // Base classes
  const baseClasses = 'flex h-full w-full items-center justify-center rounded-full border bg-slate-200';

  // Combine all classes
  const classes = `${baseClasses} ${sizeClasses} ${className}`;

  return (
    <div className="relative">
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${classes} object-cover`}
        />
      ) : (
        <div className={classes}>
          {fallback || (
            <span className="text-xs font-medium text-slate-600">
              {alt?.charAt(0) || '?'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}