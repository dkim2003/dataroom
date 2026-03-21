'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// The ADMIN_EMAIL constant is the single source of truth for who is admin.
// We check this in every protected admin action so no one else can call these functions.
const ADMIN_EMAIL = 'contact@kimduhyun.com'

export default function AdminPage() {
  const router = useRouter()

  // We store the logged-in user, all profiles, and any status messages in state.
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // This runs once when the page loads.
    // It checks if you're logged in AND if you're the admin.
    // If either check fails, you get sent away immediately.
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

  // fetchProfiles pulls every row from the profiles table.
  // We call this after every approve/reject/revoke action to refresh the list.
  async function fetchProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage('Error loading profiles: ' + error.message)
    } else {
      setProfiles(data)
    }
  }

  // updateStatus is a reusable helper that sets the status column for any user.
  // approve, reject, and revoke all call this with different values.
  async function updateStatus(id, status) {
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', id)

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage(`User ${status} successfully.`)
      await fetchProfiles() // Refresh the list so the UI updates immediately
    }
  }

  // Filter helpers so we can render pending and approved users in separate sections
  const pending = profiles.filter(p => p.status === 'pending')
  const approved = profiles.filter(p => p.status === 'approved')
  const rejected = profiles.filter(p => p.status === 'rejected')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading admin panel...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Space Launch Technologies — User Management</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Status message — shows after any action */}
      {message && (
        <div className="mb-6 p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-green-400">
          {message}
        </div>
      )}

      {/* Pending Users */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-yellow-400">
          Pending Approval ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending users.</p>
        ) : (
          <div className="space-y-3">
            {pending.map(profile => (
              <div
                key={profile.id}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-4"
              >
                <div>
                  <p className="font-medium">{profile.full_name || 'No name'}</p>
                  <p className="text-sm text-gray-400">{profile.email}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Requested: {new Date(profile.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateStatus(profile.id, 'approved')}
                    className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(profile.id, 'rejected')}
                    className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved Users */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-green-400">
          Approved Users ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-gray-500 text-sm">No approved users.</p>
        ) : (
          <div className="space-y-3">
            {approved.map(profile => (
              <div
                key={profile.id}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-4"
              >
                <div>
                  <p className="font-medium">{profile.full_name || 'No name'}</p>
                  <p className="text-sm text-gray-400">{profile.email}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Role: <span className="text-gray-400">{profile.role}</span>
                  </p>
                </div>
                {/* We don't show a Revoke button for ourselves — can't lock yourself out */}
                {profile.email !== ADMIN_EMAIL && (
                  <button
                    onClick={() => updateStatus(profile.id, 'rejected')}
                    className="px-4 py-2 bg-gray-700 hover:bg-red-800 text-white text-sm rounded-lg transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rejected Users */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-red-400">
          Rejected / Revoked ({rejected.length})
        </h2>
        {rejected.length === 0 ? (
          <p className="text-gray-500 text-sm">No rejected users.</p>
        ) : (
          <div className="space-y-3">
            {rejected.map(profile => (
              <div
                key={profile.id}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-4"
              >
                <div>
                  <p className="font-medium">{profile.full_name || 'No name'}</p>
                  <p className="text-sm text-gray-400">{profile.email}</p>
                </div>
                {/* Allow re-approving someone who was previously rejected */}
                <button
                  onClick={() => updateStatus(profile.id, 'approved')}
                  className="px-4 py-2 bg-gray-700 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                >
                  Re-approve
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}