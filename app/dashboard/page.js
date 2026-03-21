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
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploadRestricted, setUploadRestricted] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
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

  async function handleUpload() {
    if (!uploadFile || !uploadFolder) return
    setUploadLoading(true)
    setUploadMessage('')

    const { data: { session } } = await supabase.auth.getSession()
    
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('folder', uploadFolder)
    formData.append('isRestricted', uploadRestricted.toString())
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.access_token}`
      },
      body: formData
    })

    const result = await response.json()

    if (result.error) {
      setUploadMessage('Error: ' + result.error)
    } else {
      setUploadMessage('File uploaded successfully.')
      setUploadFile(null)
      setUploadFolder('')
      setUploadRestricted(false)
    }

    setUploadLoading(false)
  }

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
  <div className="space-y-4 mb-8">
    {/* User management button */}
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
      <p className="text-gray-400 text-sm">
        Manage user approvals, roles, and access from the admin panel.
      </p>
      <button
        onClick={() => router.push('/dashboard/admin')}
        className="ml-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
      >
        Manage Users →
      </button>
    </div>

    {/* File upload section */}
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-white text-sm font-medium mb-4">Upload Document</h2>

      <div className="space-y-3">
        {/* File picker */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Select file</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={(e) => setUploadFile(e.target.files[0])}
            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-800 file:text-white hover:file:bg-gray-700"
          />
        </div>

        {/* Folder selector */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Destination folder</label>
          <select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none"
          >
            <option value="">Select a folder...</option>
            <optgroup label="00 — Start Here">
              <option value="00_START_HERE/Investor Guide">Investor Guide</option>
            </optgroup>
            <optgroup label="02 — Market Opportunity">
              <option value="02_Market_Opportunity/01 Industrial Research">Industrial Research</option>
              <option value="02_Market_Opportunity/02 Competitor Analysis">Competitor Analysis</option>
              <option value="02_Market_Opportunity/03 Customer Segments">Customer Segments</option>
            </optgroup>
            <optgroup label="03 — Product & Technology">
              <option value="03_Product_Technology/01 Product Overview">Product Overview</option>
              <option value="03_Product_Technology/02 Engineering Architecture">Engineering Architecture</option>
              <option value="03_Product_Technology/03 R&D Roadmap">R&D Roadmap</option>
              <option value="03_Product_Technology/04 Patents & IP">Patents & IP</option>
            </optgroup>
            <optgroup label="04 — Traction">
              <option value="04_Traction/01 Revenue Growth">Revenue Growth</option>
              <option value="04_Traction/02 Users & Customers">Users & Customers</option>
              <option value="04_Traction/03 Contracts">Contracts</option>
              <option value="04_Traction/04 Partnerships">Partnerships</option>
              <option value="04_Traction/05 Testimonials">Testimonials</option>
            </optgroup>
            <optgroup label="05 — Financials">
              <option value="05_Financials/01 3-5 Year Financial Model">3-5 Year Financial Model</option>
              <option value="05_Financials/02 Revenue Projections">Revenue Projections</option>
              <option value="05_Financials/03 Cost Structure">Cost Structure</option>
              <option value="05_Financials/04 Burn Rate">Burn Rate</option>
              <option value="05_Financials/Break-Even Analysis">Break-Even Analysis</option>
            </optgroup>
            <optgroup label="06 — Legal">
              <option value="06_Legal/01 Articles of Incorporation">Articles of Incorporation</option>
              <option value="06_Legal/02 Shareholder Agreements">Shareholder Agreements</option>
              <option value="06_Legal/03 IP Assignments">IP Assignments</option>
              <option value="06_Legal/04 NDAs">NDAs</option>
              <option value="06_Legal/05 Employment Agreements">Employment Agreements</option>
            </optgroup>
            <optgroup label="07 — Team">
              <option value="07_Team/01 Founder Bios">Founder Bios</option>
              <option value="07_Team/02 Advisor List">Advisor List</option>
              <option value="07_Team/03 Org Chart">Org Chart</option>
              <option value="07_Team/04 Hiring Plan">Hiring Plan</option>
            </optgroup>
            <optgroup label="08 — Fundraising">
              <option value="08_Fundraising/01 Cap Table">Cap Table</option>
              <option value="08_Fundraising/02 Investment Structure">Investment Structure</option>
              <option value="08_Fundraising/03 Valuation">Valuation</option>
              <option value="08_Fundraising/04 Investor Rights">Investor Rights</option>
              <option value="08_Fundraising/05 Funding Timeline">Funding Timeline</option>
            </optgroup>
            <optgroup label="09 — Investor Updates">
              <option value="09_Investor_Updates/01 Monthly Updates">Monthly Updates</option>
              <option value="09_Investor_Updates/02 Milestones">Milestones</option>
              <option value="09_Investor_Updates/03 Achievements">Achievements</option>
            </optgroup>
            <optgroup label="10 — Appendix">
              <option value="10_Appendix/01 Research Papers">Research Papers</option>
              <option value="10_Appendix/02 Technical Drawings">Technical Drawings</option>
              <option value="10_Appendix/03 Legal References">Legal References</option>
            </optgroup>
          </select>
        </div>

        {/* Restricted toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="restricted"
            checked={uploadRestricted}
            onChange={(e) => setUploadRestricted(e.target.checked)}
            className="w-4 h-4 accent-white"
          />
          <label htmlFor="restricted" className="text-gray-400 text-sm">
            Post-NDA only (patent, white paper)
          </label>
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!uploadFile || !uploadFolder || uploadLoading}
          className="px-4 py-2 bg-white text-gray-950 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {uploadLoading ? 'Uploading...' : 'Upload'}
        </button>

        {/* Status message */}
        {uploadMessage && (
          <p className={`text-sm ${uploadMessage.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {uploadMessage}
          </p>
        )}
      </div>
    </div>
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
