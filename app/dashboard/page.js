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
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
    }
    getUser();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">Space Launch Technologies</span>
          <span className="text-gray-500 text-sm ml-2">Virtual Data Room</span>
        </div>
        <div className="flex items-center gap-4">
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
        <p className="text-gray-500 text-sm">Welcome, {user.email}</p>
      </div>
    </div>
  );
}