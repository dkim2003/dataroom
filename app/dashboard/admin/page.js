'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

const ROLE_LABELS = {
  pre_nda_investor: 'Pre-NDA Investor',
  post_nda_investor: 'Post-NDA Investor',
  pre_nda_employee: 'Pre-NDA Employee',
  post_nda_employee: 'Post-NDA Employee',
}

const ROLE_COLORS = {
  pre_nda_investor: '#888',
  post_nda_investor: '#a855f7',
  pre_nda_employee: '#22c55e',
  post_nda_employee: '#3b82f6',
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/dashboard')
        return
      }
      setUser(user)
      await fetchProfiles()
      setLoading(false)
    }
    init()
  }, [])

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setMessage('Error loading profiles: ' + error.message)
    else setProfiles(data)
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', id)

    if (error) setMessage('Error: ' + error.message)
    else { setMessage('Updated successfully.'); await fetchProfiles() }
  }

  async function updateRole(id, role) {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)

    if (error) setMessage('Error: ' + error.message)
    else { setMessage('Role updated successfully.'); await fetchProfiles() }
  }

  const pending = profiles.filter(p => p.status === 'pending')
  const approved = profiles.filter(p => p.status === 'approved')
  const rejected = profiles.filter(p => p.status === 'rejected')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666', fontFamily: 'Exo 2, sans-serif' }}>Loading...</p>
      </div>
    )
  }

  const cardStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px', padding: '16px 20px', marginBottom: '8px'
  }

  const renderRoleBadge = (role) => (
    <span style={{
      fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
      background: 'rgba(255,255,255,0.06)', color: ROLE_COLORS[role] || '#888',
      fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em'
    }}>
      {ROLE_LABELS[role] || role || 'Unknown'}
    </span>
  )

  const renderRoleDropdown = (profile) => (
    <select
      value={profile.role || ''}
      onChange={e => updateRole(profile.id, e.target.value)}
      style={{
        padding: '5px 10px', background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
        color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif',
        cursor: 'pointer', outline: 'none'
      }}
    >
      <option value="pre_nda_investor">Pre-NDA Investor</option>
      <option value="post_nda_investor">Post-NDA Investor</option>
      <option value="pre_nda_employee">Pre-NDA Employee</option>
      <option value="post_nda_employee">Post-NDA Employee</option>
    </select>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#fff', padding: '40px', fontFamily: 'Exo 2, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '36px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '4px' }}>USER MANAGEMENT</h1>
          <p style={{ fontSize: '13px', color: '#555' }}>Space Launch Technologies — Admin Panel</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ fontSize: '13px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', fontSize: '13px', color: '#22c55e' }}>
          {message}
        </div>
      )}

      {/* Pending */}
      <section style={{ marginBottom: '36px' }}>
        <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', letterSpacing: '0.1em', marginBottom: '12px' }}>
          PENDING APPROVAL ({pending.length})
        </p>
        {pending.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#444' }}>No pending users.</p>
        ) : pending.map(profile => (
          <div key={profile.id} style={cardStyle}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '500', color: '#e0e0e0', marginBottom: '3px' }}>{profile.full_name || 'No name'}</p>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{profile.email}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderRoleBadge(profile.role)}
                <span style={{ fontSize: '11px', color: '#444' }}>
                  {new Date(profile.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {renderRoleDropdown(profile)}
              <button
                onClick={() => updateStatus(profile.id, 'approved')}
                style={{ padding: '7px 16px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '6px', color: '#22c55e', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
              >
                Approve
              </button>
              <button
                onClick={() => updateStatus(profile.id, 'rejected')}
                style={{ padding: '7px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Approved */}
      <section style={{ marginBottom: '36px' }}>
        <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', letterSpacing: '0.1em', marginBottom: '12px' }}>
          APPROVED ({approved.length})
        </p>
        {approved.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#444' }}>No approved users.</p>
        ) : approved.map(profile => (
          <div key={profile.id} style={cardStyle}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '500', color: '#e0e0e0', marginBottom: '3px' }}>{profile.full_name || 'No name'}</p>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{profile.email}</p>
              {renderRoleBadge(profile.role)}
            </div>
            {profile.email !== ADMIN_EMAIL && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {renderRoleDropdown(profile)}
                <button
                  onClick={() => updateStatus(profile.id, 'rejected')}
                  style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#888', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
                >
                  Revoke
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Rejected */}
      <section>
        <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', letterSpacing: '0.1em', marginBottom: '12px' }}>
          REJECTED / REVOKED ({rejected.length})
        </p>
        {rejected.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#444' }}>No rejected users.</p>
        ) : rejected.map(profile => (
          <div key={profile.id} style={cardStyle}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '500', color: '#555', marginBottom: '3px' }}>{profile.full_name || 'No name'}</p>
              <p style={{ fontSize: '13px', color: '#444' }}>{profile.email}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {renderRoleDropdown(profile)}
              <button
                onClick={() => updateStatus(profile.id, 'approved')}
                style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#888', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
              >
                Re-approve
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}