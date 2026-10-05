import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getTickets, getMe, updateMyLanguage } from '../lib/queries'
import type { Ticket, Urgency } from '../types/ticket'
import { UrgencyBadge } from '../components/UrgencyBadge'
import { StatusBadge } from '../components/StatusBadge'
import { formatRelativeTime } from '../lib/format'
import { clearToken } from '../lib/auth'
import { socket } from '../lib/socket'

const URGENCY_WEIGHTS: Record<Urgency, number> = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'nl', label: 'Dutch' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ru', label: 'Russian' },
]

interface Toast {
  id: string
  subject: string
  customer: string
  timestamp: number
}

export function Inbox() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [agentLang, setAgentLang] = useState('en')
  const [isChangingLang, setIsChangingLang] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  // Load agent profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getMe()
        setAgentLang(profile.preferredLanguage || 'en')
      } catch {
        // Fallback
      }
    }
    void loadProfile()
  }, [])

  const handleLanguageChange = async (newLang: string) => {
    setIsChangingLang(true)
    try {
      const updated = await updateMyLanguage(newLang)
      setAgentLang(updated.preferredLanguage)
    } catch {
      // Revert on error
    } finally {
      setIsChangingLang(false)
    }
  }

  // Toast dismissal timer
  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setInterval(() => {
      const now = Date.now()
      setToasts((prev) => prev.filter((t) => now - t.timestamp < 5000))
    }, 500)
    return () => clearInterval(timer)
  }, [toasts])

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const fetchTicketsList = async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const data = await getTickets()
      setTickets(data)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tickets'
      setError(message)
    } finally {
      setLoading(false)
      if (isManual) setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const data = await getTickets()
        if (!ignore) {
          setTickets(data)
          setError(null)
          setLoading(false)
        }
      } catch (err: unknown) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : 'Failed to fetch tickets'
          setError(message)
          setLoading(false)
        }
      }
    }

    void load()

    socket.connect()

    const handleConnect = () => setIsConnected(true)
    const handleDisconnect = () => setIsConnected(false)

    const handleTicketCreated = (newTicket: Ticket) => {
      setTickets((prev) => {
        if (prev.some((t) => t.id === newTicket.id)) {
          return prev.map((t) => (t.id === newTicket.id ? newTicket : t))
        }
        return [newTicket, ...prev]
      })

      // Show toast notification
      setToasts((prev) => [
        ...prev,
        {
          id: newTicket.id,
          subject: newTicket.subject,
          customer: newTicket.customer?.name || newTicket.customer?.email || 'Unknown',
          timestamp: Date.now(),
        },
      ])
    }

    const handleTicketUpdated = (updatedTicket: Ticket) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
      )
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('ticket:created', handleTicketCreated)
    socket.on('ticket:updated', handleTicketUpdated)

    return () => {
      ignore = true
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('ticket:created', handleTicketCreated)
      socket.off('ticket:updated', handleTicketUpdated)
      socket.disconnect()
    }
  }, [])

  // Sort so urgent tickets are visually prominent at the top
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const weightA = URGENCY_WEIGHTS[a.urgency] ?? 0
      const weightB = URGENCY_WEIGHTS[b.urgency] ?? 0
      if (weightB !== weightA) {
        return weightB - weightA
      }
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    })
  }, [tickets])

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900">
      {/* Top App Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-200">
              P
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-slate-900">
                PolyDesk
              </h1>
              <p className="text-xs text-slate-500">Multilingual Support Inbox</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Picker */}
            <div className="relative flex items-center gap-1.5 rounded-md border border-slate-200 bg-white shadow-xs">
              <svg
                className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <select
                id="language-picker"
                value={agentLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isChangingLang}
                className="appearance-none bg-transparent py-1.5 pl-7 pr-6 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded-md disabled:opacity-50 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </span>
              {isConnected ? 'Live updates' : 'Connecting...'}
            </div>

            <button
              onClick={() => fetchTicketsList(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
            >
              <svg
                className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.038 8.038 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>

            <Link
              to="/admin/logs"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-indigo-600"
              title="AI Call Logs"
            >
              <svg
                className="h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Logs
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-red-600"
              title="Log out"
            >
              <svg
                className="h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Inbox
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Manage and reply to incoming tickets translated in real-time
            </p>
          </div>

          <div className="text-xs text-slate-500">
            {sortedTickets.length} {sortedTickets.length === 1 ? 'ticket' : 'tickets'}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center justify-between">
              <p>Failed to load tickets: {error}</p>
              <button
                onClick={() => fetchTicketsList(true)}
                className="font-medium underline hover:text-red-900"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && tickets.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500">Loading support tickets...</p>
          </div>
        ) : sortedTickets.length === 0 ? (
          /* Empty State */
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">No tickets found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Incoming tickets created via the API will automatically appear here.
            </p>
          </div>
        ) : (
          /* Tickets Table / List */
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
            <div className="divide-y divide-slate-100">
              {sortedTickets.map((ticket) => {
                const customerDisplay =
                  ticket.customer?.name || ticket.customer?.email || 'Unknown Customer'
                const isPendingAI = ticket.aiStatus === 'pending'

                return (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="group flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Left: Badges and Subject */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <UrgencyBadge urgency={ticket.urgency} />
                        <StatusBadge status={ticket.status} />

                        {ticket.topic && (
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                            {ticket.topic}
                          </span>
                        )}

                        {isPendingAI && (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                            Processing...
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {ticket.subject}
                        </h3>
                      </div>

                      {ticket.summary && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {ticket.summary}
                        </p>
                      )}
                    </div>

                    {/* Right: Customer & Time */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-xs text-slate-500">
                      <div className="text-left sm:text-right">
                        <span className="font-medium text-slate-700 block max-w-[160px] truncate">
                          {customerDisplay}
                        </span>
                        <span className="text-slate-400">
                          {formatRelativeTime(ticket.lastMessageAt)}
                        </span>
                      </div>

                      <svg
                        className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3" style={{ pointerEvents: 'none' }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-slide-in-right flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/95 px-4 py-3.5 shadow-lg shadow-slate-200/50 backdrop-blur-sm"
            style={{ pointerEvents: 'auto', minWidth: '320px', maxWidth: '400px' }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900">New Ticket</p>
              <p className="mt-0.5 truncate text-xs text-slate-700 font-medium">{toast.subject}</p>
              <p className="text-[11px] text-slate-500">from {toast.customer}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Toast animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  )
}
export default Inbox
