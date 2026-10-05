import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAiLogs, type AiLogsResponse } from '../lib/queries'
import { formatRelativeTime } from '../lib/format'
import { clearToken } from '../lib/auth'

export function AdminLogs() {
  const navigate = useNavigate()
  const [data, setData] = useState<AiLogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  const fetchLogs = async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const result = await getAiLogs()
      setData(result)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch AI logs'
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
        const result = await getAiLogs()
        if (!ignore) {
          setData(result)
          setError(null)
          setLoading(false)
        }
      } catch (err: unknown) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : 'Failed to fetch AI logs'
          setError(message)
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      ignore = true
    }
  }, [])

  const stats = data?.stats ?? {
    totalCalls: data?.totalCalls ?? 0,
    successRate: data?.successRate ?? 0,
    avgLatencyMs: data?.avgLatencyMs ?? 0,
    byTask: data?.byTask ?? {},
    byModel: data?.byModel ?? {},
  }

  const logs = data?.logs ?? []

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link
              to="/inbox"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
              title="Back to Inbox"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold leading-tight text-slate-900">
                  AI Call Logs
                </h1>
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                  Observability
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Track latency, success rates, and models across classifications and translations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchLogs(true)}
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

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Error Notification */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center justify-between">
              <p>Failed to load AI logs: {error}</p>
              <button
                onClick={() => fetchLogs(true)}
                className="font-medium underline hover:text-red-900"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total Calls */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total AI Calls</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {loading ? '—' : stats.totalCalls}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              {Object.entries(stats.byTask).map(([task, count]) => (
                <span key={task} className="capitalize">
                  <span className="font-semibold text-slate-700">{count}</span> {task}
                </span>
              ))}
            </div>
          </div>

          {/* Success Rate */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Success Rate</span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  stats.successRate >= 90
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {loading ? '—' : `${stats.successRate}%`}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {stats.totalCalls > 0
                ? `${Math.round((stats.totalCalls * stats.successRate) / 100)} / ${stats.totalCalls} successful calls`
                : 'No requests yet'}
            </div>
          </div>

          {/* Average Latency */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Average Latency</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {loading ? '—' : `${stats.avgLatencyMs} ms`}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Measured end-to-end duration
            </div>
          </div>
        </div>

        {/* Model Breakdown Pills (if any models recorded) */}
        {Object.keys(stats.byModel).length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Models used:</span>
            {Object.entries(stats.byModel).map(([model, count]) => (
              <span
                key={model}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span className="font-mono text-[11px] text-slate-600">{model.split('/').pop() || model}</span>
                <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">{count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Table of Recent Logs */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent AI Calls</h3>
              <p className="text-xs text-slate-500">Showing the latest {logs.length} calls (newest first)</p>
            </div>
          </div>

          {loading && logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500">Loading AI call logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No AI call logs recorded yet. Create or reply to a ticket to generate logs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3">Task</th>
                    <th scope="col" className="px-5 py-3">Model</th>
                    <th scope="col" className="px-5 py-3">Status</th>
                    <th scope="col" className="px-5 py-3">Latency</th>
                    <th scope="col" className="px-5 py-3">Timestamp</th>
                    <th scope="col" className="px-5 py-3">Details / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.map((log) => {
                    const isClassify = log.task === 'classify'
                    return (
                      <tr key={log.id} className="transition-colors hover:bg-slate-50/60">
                        {/* Task */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                              isClassify
                                ? 'border border-indigo-200 bg-indigo-50 text-indigo-700'
                                : 'border border-sky-200 bg-sky-50 text-sky-700'
                            }`}
                          >
                            {log.task}
                          </span>
                        </td>

                        {/* Model */}
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-800 max-w-[200px] truncate" title={log.model}>
                          {log.model}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              <span>✓</span>
                              <span>Success</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                              <span>✗</span>
                              <span>Failed</span>
                            </span>
                          )}
                        </td>

                        {/* Latency */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-700">
                          <span
                            className={
                              log.latencyMs > 3000
                                ? 'text-amber-600 font-semibold'
                                : log.latencyMs > 5000
                                ? 'text-red-600 font-semibold'
                                : 'text-slate-700'
                            }
                          >
                            {log.latencyMs} ms
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                          <div>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                          <div className="text-[10px] text-slate-400">{formatRelativeTime(log.createdAt)}</div>
                        </td>

                        {/* Error */}
                        <td className="px-5 py-3.5 max-w-[240px]">
                          {log.error ? (
                            <span className="text-red-600 truncate block" title={log.error}>
                              {log.error}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminLogs
