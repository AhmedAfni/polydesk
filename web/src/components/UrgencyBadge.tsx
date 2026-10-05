import type { Urgency } from '../types/ticket'

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  switch (urgency) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200/80">
          CRITICAL
        </span>
      )
    case 'HIGH':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200/80">
          HIGH
        </span>
      )
    case 'NORMAL':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
          NORMAL
        </span>
      )
    case 'LOW':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
          LOW
        </span>
      )
  }
}
