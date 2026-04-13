import React, { useState } from 'react';
import type { UseAuthReturn } from '../hooks/useAuth';

export const AuthForm: React.FC<{ auth: UseAuthReturn }> = ({ auth }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    if (mode === 'signup') {
      const err = await auth.signUp(email, password);
      if (err) { setError(err); }
      else { setMessage('Check your email to confirm your account.'); }
    } else {
      const err = await auth.signIn(email, password);
      if (err) { setError(err); }
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-lg border border-gray-300 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">Piano Practice</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
            className={`flex-1 py-2 rounded font-semibold transition ${
              mode === 'signin' ? 'bg-slate-900 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
            className={`flex-1 py-2 rounded font-semibold transition ${
              mode === 'signup' ? 'bg-slate-900 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-slate-900 hover:bg-black text-white font-bold rounded transition disabled:opacity-50"
          >
            {submitting ? '...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
};
