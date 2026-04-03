'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function NdaContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const event        = searchParams.get('event')

  const [status,  setStatus]  = useState('idle')   // idle | loading | success | error | cancelled
  const [message, setMessage] = useState('')

  // Handle return from DocuSign
  useEffect(() => {
    if (!event) return

    if (event === 'signing_complete' || event === 'completed') {
      completeNda()
    } else if (event === 'cancel' || event === 'decline' || event === 'session_timeout' || event === 'ttl_expired') {
      setStatus('cancelled')
    } else {
      setStatus('error')
      setMessage('Something went wrong during signing. Please try again.')
    }
  }, [event])

  async function completeNda() {
    setStatus('loading')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/nda-complete', {
        method: 'POST',
        headers: { authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
        // Refresh session so new role is reflected, then redirect
        await supabase.auth.refreshSession()
        setTimeout(() => router.push('/dashboard'), 2500)
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to complete NDA.')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  async function startSigning() {
    setStatus('loading')
    setMessage('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/nda-sign', {
        method: 'POST',
        headers: { authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()

      if (data.signingUrl) {
        window.location.href = data.signingUrl
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to start NDA signing.')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Exo 2', sans-serif",
    padding: '24px'
  }

  const cardStyle = {
    background: '#111',
    border: '1px solid #222',
    borderRadius: '16px',
    padding: '48px',
    maxWidth: '520px',
    width: '100%',
    textAlign: 'center'
  }

  // ── Success state ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
          <h1 style={{ color: '#fff', fontSize: '22px', marginBottom: '12px' }}>NDA Signed</h1>
          <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
            Your NDA has been signed successfully. You now have full access to the data room.
          </p>
          <p style={{ color: '#555', fontSize: '12px', marginTop: '20px' }}>Redirecting to dashboard…</p>
        </div>
      </div>
    )
  }

  // ── Cancelled state ────────────────────────────────────────────
  if (status === 'cancelled') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ color: '#fff', fontSize: '22px', marginBottom: '12px' }}>Signing Cancelled</h1>
          <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
            You cancelled the NDA signing. You can sign it at any time to unlock full document access.
          </p>
          <button
            onClick={() => { setStatus('idle') }}
            style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', color: '#555', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '12px', display: 'block', width: '100%', fontFamily: "'Exo 2', sans-serif" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Loading state ──────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ color: '#555', fontSize: '14px' }}>
            {event === 'signing_complete' ? 'Finalising your NDA…' : 'Preparing signing session…'}
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ color: '#fff', fontSize: '22px', marginBottom: '12px' }}>Something went wrong</h1>
          <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
            {message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={() => { setStatus('idle'); setMessage('') }}
            style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', color: '#555', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '12px', display: 'block', width: '100%', fontFamily: "'Exo 2', sans-serif" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Default (idle) state — NDA info + sign button ──────────────
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '36px', marginBottom: '20px' }}>📄</div>
        <h1 style={{ color: '#fff', fontSize: '22px', marginBottom: '8px' }}>
          Non-Disclosure Agreement
        </h1>
        <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>
          Space Launch Technologies
        </p>

        <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '20px', textAlign: 'left', marginBottom: '28px' }}>
          <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.7', margin: 0 }}>
            To access restricted documents — including patents, technical architecture, financials, and legal agreements — you must sign our standard Non-Disclosure Agreement.
          </p>
          <ul style={{ color: '#666', fontSize: '13px', lineHeight: '1.8', marginTop: '12px', paddingLeft: '18px' }}>
            <li>Signing takes under 2 minutes via DocuSign</li>
            <li>The NDA is legally binding upon completion</li>
            <li>You will receive a signed copy by email</li>
            <li>Full document access is granted immediately after signing</li>
          </ul>
        </div>

        <button
          onClick={startSigning}
          style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '8px', padding: '12px 32px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Exo 2', sans-serif", width: '100%' }}
        >
          Sign NDA via DocuSign
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', color: '#444', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '14px', fontFamily: "'Exo 2', sans-serif" }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}

export default function NdaPage() {
  return (
    <Suspense fallback={null}>
      <NdaContent />
    </Suspense>
  )
}
