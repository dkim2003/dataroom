'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [step, setStep] = useState('greeting'); // greeting | investor | employee | login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [solText, setSolText] = useState('');
  const router = useRouter();

  const fullGreeting = "Welcome to SpaceLaunch. I'm Sol, here to guide you through the data room.";

  // Typewriter effect for Sol's greeting
  useEffect(() => {
    if (step !== 'greeting') return;
    setSolText('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setSolText(fullGreeting.slice(0, i));
      if (i >= fullGreeting.length) clearInterval(interval);
    }, 28);
    return () => clearInterval(interval);
  }, [step]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === 'Email not confirmed'
        ? 'Email not confirmed. Please check your inbox for a confirmation and authentication link.'
        : error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status, email_verified')
      .eq('id', data.user.id)
      .single();

    if (profile?.status === 'pending') {
      await supabase.auth.signOut();
      setPending(true);
      setLoading(false);
      return;
    }

    if (profile?.status === 'rejected') {
      await supabase.auth.signOut();
      setRejected(true);
      setLoading(false);
      return;
    }

    if (!profile?.email_verified) {
      await supabase.auth.signOut();
      setError('Please confirm your email first — check your inbox for the access link sent by the administrator.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Role is assigned server-side from userType — never trust a client-supplied role.
    const userType = step === 'investor' ? 'investor' : 'employee';

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, userType })
    });
    const result = await res.json();

    if (!res.ok) {
      const msg = (result.error || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already')) {
        await handleReRequest();
        return;
      }
      setError(result.error || 'Signup failed');
      setLoading(false);
      return;
    }

    setPending(true);
    setLoading(false);
  }

  async function handleReRequest() {
    // Sign in to verify they own the account
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('This email is already registered. Check your password and try again.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('status').eq('id', signInData.user.id).single();

    if (profile?.status === 'rejected') {
      const res = await fetch('/api/re-request-access', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${signInData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fullName })
      });
      const result = await res.json();
      await supabase.auth.signOut();
      if (result.error) {
        setError(result.error);
      } else {
        setPending(true);
      }
    } else if (profile?.status === 'pending') {
      await supabase.auth.signOut();
      setPending(true);
    } else if (profile?.status === 'approved') {
      await supabase.auth.signOut();
      setError('This email already has an approved account. Use "I already have an account" to sign in.');
    } else {
      await supabase.auth.signOut();
      setError('This email is already registered.');
    }
    setLoading(false);
  }

  // --- Pending screen ---
  if (pending) {
    return (
      <div style={styles.page}>
        <div style={styles.bgImage} />
        <div style={{ textAlign: 'center', maxWidth: '480px', padding: '0 32px', position: 'relative', zIndex: 1 }}>
          <div style={styles.iconCircle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 style={{ ...styles.heading, fontSize: '32px' }}>Access Pending</h1>
          <p style={{ ...styles.subtext, fontSize: '22px', lineHeight: '1.7' }}>Your access request is pending and will be reviewed.<br/>If you are approved, you will receive a confirmation email with a sign-in link.</p>
          <button onClick={() => { setPending(false); setStep('greeting'); }} style={{ ...styles.backLink, fontSize: '20px' }}>
            Back to start
          </button>
        </div>
      </div>
    );
  }

  // --- Rejected screen ---
  if (rejected) {
    return (
      <div style={styles.page}>
        <div style={styles.bgImage} />
        <div style={{ textAlign: 'center', maxWidth: '320px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={styles.iconCircle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 style={styles.heading}>Access Denied</h1>
          <p style={styles.subtext}>Your access request was not approved. You can re-submit your request below.</p>
          <button
            onClick={() => { setRejected(false); setStep('investor'); setError(''); }}
            style={{ ...styles.submitBtn, marginTop: '20px' }}
          >
            Re-request access
          </button>
          <button onClick={() => { setRejected(false); setStep('greeting'); }} style={styles.backLink}>
            Back to start
          </button>
        </div>
      </div>
    );
  }

  // --- Greeting screen ---
  if (step === 'greeting') {
    return (
      <div style={styles.page}>
        <div style={styles.bgImage} />
        <div style={{ textAlign: 'center', width: '360px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          {/* Sol indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e40af' }}/>
            <span style={{ fontSize: '14px', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em' }}>SOL</span>
          </div>

          {/* Typewriter greeting */}
          <p style={{ fontSize: '26px', fontWeight: '300', color: '#e0e0e0', lineHeight: '1.6', marginBottom: '48px', height: '130px', fontFamily: 'Exo 2, sans-serif' }}>
            {solText}
            <span style={{ opacity: solText.length < fullGreeting.length ? 1 : 0, borderRight: '1px solid #1e40af', marginLeft: '1px' }}>&nbsp;</span>
          </p>

          {/* Three choice buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => setStep('login')} style={styles.choiceBtnBlue}>
              Log-in<br/><span style={{ fontSize: '15px', fontWeight: '400', opacity: 0.9 }}>(I already have an account)</span>
            </button>
            <button onClick={() => setStep('investor')} style={{ ...styles.choiceBtnOutline, lineHeight: '1.4' }}>
              Request for<br/>investor access
            </button>
            <button onClick={() => setStep('employee')} style={{ ...styles.choiceBtnOutline, lineHeight: '1.4' }}>
              Request for<br/>employee access
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Investor registration ---
  if (step === 'investor') {
    return (
      <div style={styles.page}>
        <div style={styles.bgImage} />
        <div style={{ width: '100%', maxWidth: '320px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e40af' }}/>
              <span style={{ fontSize: '14px', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em' }}>SOL</span>
            </div>
            <h1 style={{ fontSize: '31px', fontWeight: '300', color: '#fff', marginBottom: '6px', fontFamily: 'Exo 2, sans-serif' }}>Request investor access</h1>
            <p style={{ fontSize: '19px', color: '#fff', fontFamily: 'Exo 2, sans-serif' }}>Your request will be reviewed by the administrator.</p>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} required style={styles.input}/>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={styles.input}/>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={styles.input}/>
            {error && <p style={{ color: '#f87171', fontSize: '16px' }}>{error}</p>}
            <button type="submit" disabled={loading} style={styles.submitBtnOutline}>
              {loading ? 'Please wait...' : 'Request access'}
            </button>
          </form>

          <button onClick={() => { setStep('greeting'); setError(''); }} style={styles.backLink}>← Back</button>
        </div>
      </div>
    );
  }

  // --- Employee registration ---
  if (step === 'employee') {
    return (
      <div style={styles.page}>
        <div style={styles.bgImage} />
        <div style={{ width: '100%', maxWidth: '320px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e40af' }}/>
              <span style={{ fontSize: '14px', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em' }}>SOL</span>
            </div>
            <h1 style={{ fontSize: '31px', fontWeight: '300', color: '#fff', marginBottom: '6px', fontFamily: 'Exo 2, sans-serif' }}>Request employee access</h1>
            <p style={{ fontSize: '19px', color: '#fff', fontFamily: 'Exo 2, sans-serif' }}>Your request will be reviewed by the administrator.</p>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} required style={styles.input}/>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={styles.input}/>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={styles.input}/>
            {error && <p style={{ color: '#f87171', fontSize: '16px' }}>{error}</p>}
            <button type="submit" disabled={loading} style={styles.submitBtnOutline}>
              {loading ? 'Please wait...' : 'Request access'}
            </button>
          </form>

          <button onClick={() => { setStep('greeting'); setError(''); }} style={styles.backLink}>← Back</button>
        </div>
      </div>
    );
  }

  // --- Sign in (existing account) ---
  return (
    <div style={styles.page}>
      <div style={styles.bgImage} />
      <div style={{ width: '100%', maxWidth: '320px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e40af' }}/>
            <span style={{ fontSize: '14px', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em' }}>SOL</span>
          </div>
          <h1 style={{ fontSize: '31px', fontWeight: '300', color: '#fff', marginBottom: '6px', fontFamily: 'Exo 2, sans-serif' }}>Welcome back</h1>
          <p style={{ fontSize: '19px', color: '#fff', fontFamily: 'Exo 2, sans-serif' }}>Space Launch Technologies VDR</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={styles.input}/>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={styles.input}/>
          {error && <p style={{ color: '#f87171', fontSize: '16px' }}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Please wait...' : 'Sign in'}
          </button>
        </form>

        <button onClick={() => { setStep('greeting'); setError(''); }} style={styles.backLink}>← Back</button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#080808',
    fontFamily: 'Exo 2, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  bgImage: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'url(/artemis2.jpeg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.28,
    zIndex: 0,
    pointerEvents: 'none',
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '300',
    color: '#fff',
    marginBottom: '10px',
    fontFamily: 'Exo 2, sans-serif',
  },
  subtext: {
    fontSize: '16px',
    color: '#fff',
    lineHeight: '1.6',
    fontFamily: 'Exo 2, sans-serif',
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '16px',
    color: '#fff',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Exo 2, sans-serif',
    width: '100%',
  },
  choiceBtnBlue: {
    width: '100%',
    padding: '18px',
    background: '#1e40af',
    border: 'none',
    borderRadius: '999px',
    color: '#fff',
    fontSize: '20px',
    fontWeight: '600',
    fontFamily: 'Exo 2, sans-serif',
    cursor: 'pointer',
    lineHeight: '1.4',
  },
  choiceBtnOutline: {
    width: '100%',
    padding: '18px',
    background: '#fff',
    border: '2px solid #1e40af',
    borderRadius: '999px',
    color: '#1e40af',
    fontSize: '20px',
    fontWeight: '600',
    fontFamily: 'Exo 2, sans-serif',
    cursor: 'pointer',
  },
  input: {
    padding: '11px 14px',
    background: '#111',
    border: '1px solid #222',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '19px',
    fontFamily: 'Exo 2, sans-serif',
    outline: 'none',
    width: '100%',
  },
  submitBtn: {
    width: '100%',
    padding: '18px',
    background: '#1e40af',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    fontSize: '19px',
    fontWeight: '600',
    fontFamily: 'Exo 2, sans-serif',
    cursor: 'pointer',
    marginTop: '4px',
  },
  submitBtnOutline: {
    width: '100%',
    padding: '18px',
    background: '#fff',
    color: '#1e40af',
    border: '2px solid #1e40af',
    borderRadius: '999px',
    fontSize: '19px',
    fontWeight: '600',
    fontFamily: 'Exo 2, sans-serif',
    cursor: 'pointer',
    marginTop: '4px',
  },
};