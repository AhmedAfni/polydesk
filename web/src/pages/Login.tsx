import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import { saveToken } from '../lib/auth'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await api.post<{ accessToken: string; user: unknown }>('/auth/login', {
        email,
        password,
      })

      if (response.data?.accessToken) {
        saveToken(response.data.accessToken)
        navigate('/')
      } else {
        setError('Login failed: No access token received.')
      }
    } catch (err: unknown) {
      let message = 'Invalid email or password. Please try again.'
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } }
        const resMsg = axiosErr.response?.data?.message
        if (resMsg) {
          message = Array.isArray(resMsg) ? resMsg.join(', ') : resMsg
        }
      }
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/60 px-4 py-12 text-slate-900 sm:px-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200/80 bg-white p-8 shadow-xs">
        {/* Header with App Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white shadow-sm shadow-indigo-200">
            P
          </div>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
            PolyDesk Agent Portal
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Sign in to access and manage support tickets
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@polydesk.com"
              className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <Link
            to="/submit"
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
          >
            Submit a support request instead &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login
