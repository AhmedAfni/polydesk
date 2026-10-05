import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getTranslatedTicket, replyToTicket, getMe } from '../lib/queries'
import type { TranslatedTicket } from '../lib/queries'
import { UrgencyBadge } from '../components/UrgencyBadge'
import { StatusBadge } from '../components/StatusBadge'
import { formatRelativeTime, getLanguageName } from '../lib/format'
import { socket } from '../lib/socket'

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [ticket, setTicket] = useState<TranslatedTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [agentLang, setAgentLang] = useState('en')

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load agent's preferred language on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getMe()
        setAgentLang(profile.preferredLanguage || 'en')
      } catch {
        // Fallback to English
      }
    }
    void loadProfile()
  }, [])

  const fetchTicketDetails = useCallback(async (initial = false) => {
    if (!id) return
    try {
      const data = await getTranslatedTicket(id, agentLang)
      setTicket(data)
      setError(null)
      if (initial) {
        setTimeout(scrollToBottom, 100)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch ticket'
      setError(msg)
    } finally {
      if (initial) setLoading(false)
    }
  }, [id, agentLang])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!id) return
      try {
        const data = await getTranslatedTicket(id, agentLang)
        if (!ignore) {
          setTicket(data)
          setError(null)
          setLoading(false)
          setTimeout(scrollToBottom, 100)
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch ticket'
          setError(msg)
          setLoading(false)
        }
      }
    }

    void load()

    socket.connect()

    const handleTicketUpdated = (updatedTicket: any) => {
      if (updatedTicket.id === id) {
        // Re-fetch with translation when a live update arrives
        void load()
      }
    }

    socket.on('ticket:updated', handleTicketUpdated)

    return () => {
      ignore = true
      socket.off('ticket:updated', handleTicketUpdated)
      socket.disconnect()
    }
  }, [id, agentLang])

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!id || !replyMessage.trim() || isSending) return

    setIsSending(true)
    setSendError(null)

    try {
      await replyToTicket(id, replyMessage.trim(), agentLang)
      setReplyMessage('')
      await fetchTicketDetails(false)
      setTimeout(scrollToBottom, 100)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reply'
      setSendError(msg)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSendReply()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Loading ticket thread...</p>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900">Ticket Not Found</h2>
          <p className="mt-1 text-sm text-slate-600">{error || 'This ticket does not exist or was deleted.'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            &larr; Back to Inbox
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/60 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
              title="Back to Inbox"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">#{ticket.id.slice(-6)}</span>
                <h1 className="text-sm font-semibold text-slate-900 truncate max-w-[400px]">
                  {ticket.subject}
                </h1>
              </div>
              <p className="text-xs text-slate-500">
                Customer: <span className="font-medium text-slate-700">{ticket.customer?.name || ticket.customer?.email}</span>
                {ticket.customer?.name && (
                  <span className="text-slate-400"> ({ticket.customer.email})</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UrgencyBadge urgency={ticket.urgency} />
            <StatusBadge status={ticket.status} />
            {ticket.topic && (
              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                {ticket.topic}
              </span>
            )}
            {ticket.aiStatus === 'pending' && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Processing...
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Conversation Container */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
        {/* Ticket Summary Banner (if AI generated) */}
        {ticket.summary && (
          <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-900">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-indigo-700 uppercase tracking-wide text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded">
                AI Summary
              </span>
              <p className="leading-relaxed flex-1">{ticket.summary}</p>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex flex-1 flex-col gap-4">
          {ticket.messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No messages in this ticket yet.
            </div>
          ) : (
            ticket.messages.map((message) => {
              const isInbound = message.direction === 'INBOUND'
              const displayText = message.displayText || message.originalText
              const originalText = message.originalText
              const isTranslated = displayText !== originalText

              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                >
                  {/* Sender & Timestamp Header */}
                  <div className="mb-1 flex items-center gap-2 px-1 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-600">
                      {isInbound
                        ? ticket.customer?.name || 'Customer'
                        : 'Support Agent'}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeTime(message.createdAt)}</span>
                    {message.originalLanguage && (
                      <>
                        <span>•</span>
                        <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px] text-slate-600">
                          {getLanguageName(message.originalLanguage)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Chat Bubble */}
                  <div
                    className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-2xs ${
                      isInbound
                        ? 'rounded-tl-xs border border-slate-200/80 bg-white text-slate-900'
                        : 'rounded-tr-xs bg-indigo-600 text-white'
                    }`}
                  >
                    {/* Primary display text (translated into agent's language) */}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {displayText}
                    </div>

                    {/* Show original text if it differs */}
                    {isTranslated && (
                      <div
                        className={`mt-3 pt-2.5 border-t text-xs ${
                          isInbound
                            ? 'border-slate-100 text-slate-600 bg-slate-50/60 -mx-4 -mb-4 p-3 rounded-b-2xl'
                            : 'border-indigo-500/60 text-indigo-100 bg-indigo-700/30 -mx-4 -mb-4 p-3 rounded-b-2xl'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 font-semibold text-[10px] uppercase tracking-wider opacity-80">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          Original ({getLanguageName(message.originalLanguage || 'unknown')}):
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {originalText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Area (Sticky or pinned at bottom) */}
        <div className="sticky bottom-4 mt-6">
          <form
            onSubmit={handleSendReply}
            className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/50"
          >
            {sendError && (
              <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
                Failed to send reply: {sendError}
              </div>
            )}

            <textarea
              rows={3}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder={`Type your reply in ${getLanguageName(agentLang)} (it will be auto-translated to the customer's language)...`}
              className="w-full resize-none border-0 p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:bg-slate-50"
            />

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
              <span className="text-[11px] text-slate-400">
                Press <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd> + <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send
              </span>

              <button
                type="submit"
                disabled={isSending || !replyMessage.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <span>Send Reply</span>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
export default TicketDetail
