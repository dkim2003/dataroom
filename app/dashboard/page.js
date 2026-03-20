'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile || profile.status === 'pending') {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setUser(user);
      setProfile(profile);
      setLoading(false);
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  const isAdmin = user.email === 'contact@kimduhyun.com';
  const isPostNda = profile.role === 'post_nda';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Space Launch Technologies</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-500 text-sm">Virtual Data Room</span>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">
              Admin
            </span>
          )}
          {isPostNda && !isAdmin && (
            <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">
              Post-NDA
            </span>
          )}
          <span className="text-gray-400 text-sm">{user.email}</span>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="text-gray-500 text-sm hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="px-8 py-12">
        <h1 className="text-2xl font-light mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm mb-8">
          Welcome back, {profile.full_name || user.email}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-500 text-xs mb-1">Access level</p>
            <p className="text-white text-sm font-medium">
              {isAdmin ? 'Administrator' : isPostNda ? 'Post-NDA' : 'Pre-NDA'}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-500 text-xs mb-1">Documents</p>
            <p className="text-white text-sm font-medium">
              {isPostNda || isAdmin ? 'Full access' : 'Limited access'}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-500 text-xs mb-1">NDA status</p>
            <p className="text-white text-sm font-medium">
              {isPostNda || isAdmin ? 'Signed' : 'Not signed'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
            <p className="text-gray-400 text-sm">
              Admin panel coming next — user approvals, activity tracker, document management.
            </p>
          </div>
        )}

        {!isPostNda && !isAdmin && (
          <div className="bg-gray-900 border border-yellow-900 rounded-lg p-4">
            <p className="text-yellow-500 text-sm font-medium mb-1">NDA required for full access</p>
            <p className="text-gray-400 text-sm">
              Sign the NDA to unlock the patent and white paper documents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
