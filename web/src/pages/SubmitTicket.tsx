import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import api from '../lib/api';
import { Input } from '../components/ui';
import { Textarea } from '../components/ui';
import { Button } from '../components/ui';

export function SubmitTicket() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = () => {
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setError(null);
    setIsSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post('/tickets', {
        customerName: name.trim() || undefined,
        customerEmail: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          setError('Please wait a moment before submitting another request');
          return;
        }
        const resMsg = err.response?.data?.message;
        if (resMsg) {
          setError(Array.isArray(resMsg) ? resMsg.join(', ') : String(resMsg));
          return;
        }
      }
      setError('Something went wrong. Please check your information and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50/60 px-4 py-12 text-slate-900 sm:px-6">
      <div className="w-full max-w-lg">
        {/* PolyDesk Logo & Header Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-md shadow-indigo-200">
            P
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            PolyDesk Support
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
            Submit a support ticket and our team will get back to you promptly
          </p>
        </div>

        {/* Card Content: Confirmation or Form */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
          {isSuccess ? (
            <div className="py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="mt-5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Thanks! We've received your message and will respond shortly.
              </h2>

              <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                Your support request has been logged. We'll send updates directly to your email address.
              </p>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <Button
                  variant="primary"
                  onClick={handleReset}
                  className="w-full sm:w-auto sm:px-6"
                >
                  Submit another request
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Banner */}
              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
                  <div className="flex items-start gap-2.5">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="customerName" className="block text-xs font-medium text-slate-700">
                      Your name <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <Input
                      id="customerName"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={setName}
                    />
                  </div>

                  <div>
                    <label htmlFor="customerEmail" className="block text-xs font-medium text-slate-700">
                      Email address <span className="text-indigo-600">*</span>
                    </label>
                    <Input
                      type="email"
                      id="customerEmail"
                      required
                      placeholder="jane@example.com"
                      value={email}
                      onChange={setEmail}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-xs font-medium text-slate-700">
                    Subject <span className="text-indigo-600">*</span>
                  </label>
                  <Input
                    id="subject"
                    required
                    placeholder="How can we help?"
                    value={subject}
                    onChange={setSubject}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="message" className="block text-xs font-medium text-slate-700">
                      Message <span className="text-indigo-600">*</span>
                    </label>
                  </div>
                  <Textarea
                    id="message"
                    required
                    rows={5}
                    placeholder="Type in any language - we'll translate it automatically..."
                    value={message}
                    onChange={setMessage}
                  />
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-600">
                    <svg className="h-3.5 w-3.5 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span>Type in any language - we'll translate it automatically</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit request</span>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Demo navigation link to agent portal */}
        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs font-medium text-slate-400 hover:text-slate-600 transition">
            Agent Portal Sign In &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SubmitTicket;