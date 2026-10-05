import type { TicketStatus } from '../types/ticket'

export function StatusBadge({ status }: { status: TicketStatus }) {
  switch (status) {
    case 'OPEN':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          OPEN
        </span>
      )
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          PENDING
        </span>
      )
    case 'CLOSED':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          CLOSED
        </span>
      )
  }
}
