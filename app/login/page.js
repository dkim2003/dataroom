'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', data.user.id)
      .single();

    if (profile?.status === 'pending') {
      await supabase.auth.signOut();
      setPending(true);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setPending(true);
    setLoading(false);
  }

  if (pending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 className="text-xl font-light text-white mb-3">Access Pending</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your account is awaiting approval. You will receive access once an administrator reviews your request.
          </p>
          <button
            onClick={() => { setPending(false); setMode('login'); }}
            className="mt-8 text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light text-white mb-1">
            {mode === 'login' ? 'Sign in' : 'Request access'}
          </h1>
          <p className="text-gray-500 text-sm">Space Launch Technologies VDR</p>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-gray-950 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Request access'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          {mode === 'login' ? "Don't have access? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-gray-300 hover:text-white transition-colors"
          >
            {mode === 'login' ? 'Request access' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}