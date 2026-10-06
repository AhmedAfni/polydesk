import type { Urgency } from '../types/ticket';
import { Badge } from './ui/Badge';

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  // Map urgency levels to badge variants
  const variantMap: Record<Urgency, 'default' | 'destructive'> = {
    CRITICAL: 'destructive',
    HIGH: 'destructive',
    NORMAL: 'default',
    LOW: 'default',
  };

  const variant = variantMap[urgency] || 'default';

  return (
    <Badge variant={variant}>
      {urgency}
    </Badge>
  );
}