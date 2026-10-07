import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50/60 px-4 py-8 text-slate-900 sm:px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
        {/* PolyDesk Logo & Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-md shadow-indigo-200">
            P
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            PolyDesk
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            An AI-powered multilingual customer support inbox that lets teams handle tickets in any language without needing bilingual staff.
          </p>
        </div>

        {/* Core Capabilities */}
        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Core Features
          </h2>
          <ul className="space-y-2.5 text-xs text-slate-700 sm:text-sm">
            <li className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>
                <strong className="font-semibold text-slate-900">Real-Time Translation:</strong> Inbound messages detected and translated on demand, with outbound agent replies automatically translated back into the customer's language.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>
                <strong className="font-semibold text-slate-900">AI Triage &amp; Classification:</strong> Automatic topic categorization, urgency scoring (low to critical), and concise English summaries.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>
                <strong className="font-semibold text-slate-900">Per-Agent Language Preferences:</strong> Each agent selects their preferred language while retaining instant access to the customer's original text.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>
                <strong className="font-semibold text-slate-900">Live WebSocket Updates:</strong> Instant real-time updates for new tickets and AI classification statuses across all connected agents.
              </span>
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/submit"
            className="w-full flex-1 min-w-0"
          >
            <Button variant="primary" size="md" className="w-full px-3 sm:px-4">
              I'm a customer - submit a request
            </Button>
          </Link>
          <Link
            to="/login"
            className="w-full flex-1 min-w-0"
          >
            <Button variant="outline" size="md" className="w-full px-3 sm:px-4">
              I'm an agent - sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Landing;