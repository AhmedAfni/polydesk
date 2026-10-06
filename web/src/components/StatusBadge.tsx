import type { TicketStatus } from '../types/ticket';
import { Badge } from './ui/Badge';

export function StatusBadge({ status }: { status: TicketStatus }) {
  // Map status to badge variants
  const variantMap: Record<TicketStatus, 'default' | 'secondary'> = {
    OPEN: 'secondary',
    PENDING: 'secondary',
    CLOSED: 'default',
  };

  const variant = variantMap[status] || 'default';

  return (
    <Badge variant={variant}>
      <span className="h-1.5 w-1.5 rounded-full ${
        status === 'OPEN' ? 'bg-emerald-500' :
        status === 'PENDING' ? 'bg-amber-500' :
        'bg-slate-400'
      }" />
      {status}
    </Badge>
  );
}