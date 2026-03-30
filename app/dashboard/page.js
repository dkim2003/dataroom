'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = 'contact@kimduhyun.com';

function useExoFont() {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);
}

function cleanMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[\s]*[-*]\s+/gm, '• ')
    .replace(/^#{1,6}\s+/gm, '')
    // Fix rogue citation commas — space before comma or comma after space
    .replace(/\s+,/g, ',')
    // Fix double spaces after bullets
    .replace(/•\s{2,}/g, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Sol chat panel — used in both desktop right panel and center when Sol tab is active
function SolChat({ solMessages, solInput, solLoading, setSolInput, sendSolMessage }) {
  const bottomRef = useRef(null)

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [solMessages, solLoading])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '18px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6' }}/>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>SOL</span>
          <span style={{ fontSize: '13px', color: '#777', marginLeft: 'auto' }}>AI Assistant</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {solMessages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '88%', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6', background: msg.role === 'user' ? '#3b82f6' : 'rgba(255,255,255,0.06)', color: msg.role === 'user' ? '#fff' : '#ddd', fontFamily: 'Exo 2, sans-serif', whiteSpace: 'pre-wrap' }}>
              {msg.role === 'assistant'
              ? cleanMarkdown(msg.content).split('\n').map((line, i) => (
              <div key={i} style={{ paddingLeft: line.startsWith('•') ? '16px' : '0', textIndent: line.startsWith('•') ? '-16px' : '0', marginBottom: line.startsWith('•') ? '4px' : '0' }}>
                {line}
                </div>
                ))
                : msg.content}
                </div>
                </div>
              ))}
              {solLoading && (
                <div style={{ display: 'flex', gap: '4px', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', width: 'fit-content' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#555', animation: `bounce 1.2s infinite ${i*0.2}s` }}/>)}
                  </div>
                )}
                {/* Scroll anchor */}
                <div ref={bottomRef} />
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {['What is OLAC?', 'Summarize the financials', 'What is the ask?'].map(prompt => (
                    <button key={prompt} onClick={() => setSolInput(prompt)} style={{ fontSize: '12px', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#999', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}>
                      {prompt}
                      </button>
                    ))}
                    </div>
                    <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                        value={solInput}
                        onChange={(e) => setSolInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendSolMessage()}
                        placeholder="Ask Sol anything..."
                        style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', outline: 'none' }}
                        />
                        <button
                        onClick={sendSolMessage}
                        disabled={!solInput.trim() || solLoading}
                        style={{ width: '38px', height: '38px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!solInput.trim() || solLoading) ? 0.4 : 1, flexShrink: 0 }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                            </button>
                            </div>
                            </div></div>
                            )
                          }

                          export default function Dashboard() {
                            const router = useRouter();
                            useExoFont();
                            const [user, setUser] = useState(null);
                            const [profile, setProfile] = useState(null);
                            const [loading, setLoading] = useState(true);
                            const [activeTab, setActiveTab] = useState('documents');
                            const [documents, setDocuments] = useState([]);
                            const [docsLoading, setDocsLoading] = useState(true);
                            const [activeFolder, setActiveFolder] = useState(null);
                            const [solDrawerOpen, setSolDrawerOpen] = useState(false);
                            const [uploadFile, setUploadFile] = useState(null);
                            const [uploadFolder, setUploadFolder] = useState('');
                            const [uploadRestricted, setUploadRestricted] = useState(false);
                            const [uploadLoading, setUploadLoading] = useState(false);
                            const [uploadMessage, setUploadMessage] = useState('');
                            const [showUpload, setShowUpload] = useState(false);
                            const [solMessages, setSolMessages] = useState([
                              { role: 'assistant', content: "Hello. I'm Sol, your data room assistant. I can answer questions about Space Launch Technologies and the OLAC system based on the documents in this data room. How can I help?" }
                            ]);
                            const [solInput, setSolInput] = useState('');
                            const [solLoading, setSolLoading] = useState(false);

                            useEffect(() => {
                              async function init() {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) { router.push('/login'); return; }
                                const { data: profile } = await supabase
                                .from('profiles').select('*').eq('id', user.id).single();
                                if (!profile || profile.status === 'pending' || profile.status === 'rejected') {
                                  await supabase.auth.signOut();
                                  router.push('/login');
                                  return;
                                }
                                setUser(user);
                                setProfile(profile);
                                setLoading(false);
                                await loadDocuments();
                              }
                              init();
                            }, []);

                            async function loadDocuments() {
                              const { data: { session } } = await supabase.auth.getSession();
                              const response = await fetch('/api/documents', {
                                headers: { authorization: `Bearer ${session.access_token}` }
                              });
                              const result = await response.json();
                              if (result.documents) setDocuments(result.documents);
                              setDocsLoading(false);
                            }

                            async function openDocument(path, fileName) {
                              const { data: { session } } = await supabase.auth.getSession();
                              const response = await fetch('/api/documents/signed-url', {
                                method: 'POST',
                                headers: {
                                  authorization: `Bearer ${session.access_token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ path, fileName })
                              });

                              const result = await response.json();
                              if (result.signedUrl) {
                                window.open(result.signedUrl, '_blank');
                              } else {
                                alert('Access denied or error generating link.');
                              }
                            }

                            async function handleUpload() {
                              if (!uploadFile || !uploadFolder) return;
                              setUploadLoading(true);
                              setUploadMessage('');
                              const { data: { session } } = await supabase.auth.getSession();
                              const formData = new FormData();
                              formData.append('file', uploadFile);
                              formData.append('folder', uploadFolder);
                              formData.append('isRestricted', uploadRestricted.toString());
                              const response = await fetch('/api/upload', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}` },
                                body: formData
                              });
                              const result = await response.json();
                              if (result.error) {
                                setUploadMessage('Error: ' + result.error);
                              } else {
                                setUploadMessage('File uploaded successfully.');
                                setUploadFile(null);
                                setUploadFolder('');
                                setUploadRestricted(false);
                                await loadDocuments();
                              }
                              setUploadLoading(false);
                            }
                            async function sendSolMessage() {
                              if (!solInput.trim() || solLoading) return;
                              const userMessage = solInput.trim();
                              const currentHistory = solMessages; // capture before state update
    setSolInput('');
    setSolMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSolLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/sol', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
        message: userMessage,
        history: currentHistory
      })
    });
      const result = await response.json();
      setSolMessages(prev => [...prev, {
        role: 'assistant',
        content: result.reply || 'Sorry, I encountered an error. Please try again.'
      }]);
    } catch {
      setSolMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    }
    setSolLoading(false);
  }

  // Sol memory is in React state — it resets automatically on sign out or page close
  async function handleSignOut() {
    setSolMessages([
      { role: 'assistant', content: "Hello. I'm Sol, your data room assistant. I can answer questions about Space Launch Technologies and the OLAC system based on the documents in this data room. How can I help?" }
    ]);
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666', fontSize: '15px', fontFamily: 'Exo 2, sans-serif' }}>Loading...</p>
      </div>
    );
  }

  const isAdmin = user.email === ADMIN_EMAIL;
  const isPostNda = profile.role === 'post_nda';

  const folders = [
  '00_START_HERE',
  '01_Pitch_and_Overview',
  '02_Market_Opportunity',
  '03_Product_Technology',
  '04_Traction',
  '05_Financials',
  '06_Legal',
  '07_Team',
  '08_Fundraising',
  '09_Investor_Updates',
  '10_Appendix'
];

  const filteredDocs = activeFolder
    ? documents.filter(doc => doc.path.split('/')[1] === activeFolder)
    : documents;

  const groupedDocs = filteredDocs.reduce((groups, doc) => {
    const parts = doc.path.split('/');
    const folder = parts.slice(1, -1).join(' / ') || 'General';
    if (!groups[folder]) groups[folder] = [];
    groups[folder].push(doc);
    return groups;
  }, {});

  return (
    <div style={{ fontFamily: 'Exo 2, sans-serif', background: '#080808', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ height: '56px', background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C12 2 8 6 8 12H16C16 6 12 2 12 2Z"/>
            <path d="M8 12L6 16H18L16 12"/>
            <path d="M10 16V20M14 16V20"/>
            <path d="M9 20H15"/>
          </svg>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em' }}>
            SPACE LAUNCH TECHNOLOGIES
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '15px' }} className="hide-mobile">|</span>
          <span style={{ fontSize: '13px', color: '#777', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }} className="hide-mobile">
            VIRTUAL DATA ROOM
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && (
            <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderRadius: '4px', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>
              ADMIN
            </span>
          )}
          {/* Pre-NDA badge — subtle, not alarming */}
          {!isPostNda && !isAdmin && (
            <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(255,255,255,0.05)', color: '#777', borderRadius: '4px', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em', border: '1px solid rgba(255,255,255,0.08)' }}>
              PRE-NDA
            </span>
          )}
          {isPostNda && !isAdmin && (
            <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(255,255,255,0.06)', color: '#888', borderRadius: '4px', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>
              POST-NDA
            </span>
          )}
          <span style={{ fontSize: '14px', color: '#888' }} className="hide-mobile">{user.email}</span>
          <button
            onClick={() => setSolDrawerOpen(!solDrawerOpen)}
            className="show-mobile"
            style={{ display: 'none', padding: '6px 12px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', color: '#3b82f6', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
          >
            Sol AI
          </button>
          <button
            onClick={handleSignOut}
            style={{ fontSize: '14px', color: '#777', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile nav tabs */}
      <div className="show-mobile" style={{ display: 'none', background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', padding: '0 16px' }}>
          {[
            { id: 'documents', label: 'Documents' },
            { id: 'sol', label: 'Sol AI' },
            { id: 'diligence', label: 'Due Diligence' },
            { id: 'pitchdeck', label: 'Pitch Deck' },
            ...(isAdmin ? [{ id: 'investors', label: 'Investors' }, { id: 'activity', label: 'Activity' }] : [])
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === item.id ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === item.id ? '#fff' : '#777', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="main-layout" style={{ flex: 1, display: 'grid', gridTemplateColumns: activeTab === 'sol' ? '220px 1fr' : '220px 1fr 280px', overflow: 'hidden', height: 'calc(100vh - 56px)' }}>

        {/* Left sidebar */}
        <div className="sidebar" style={{ background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 0', overflowY: 'auto' }}>
          <div style={{ padding: '0 16px', marginBottom: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', marginBottom: '8px' }}>NAVIGATION</p>
          </div>
          {[
            { id: 'documents', label: 'Documents', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
            { id: 'sol', label: 'Sol AI', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { id: 'diligence', label: 'Due Diligence', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { id: 'pitchdeck', label: 'Pitch Deck', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
            ...(isAdmin ? [
              { id: 'investors', label: 'Investors', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { id: 'activity', label: 'Activity', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> }
            ] : [])
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (item.id === 'documents') setActiveFolder(null); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', background: activeTab === item.id ? 'rgba(59,130,246,0.1)' : 'none',
                border: 'none', borderLeft: activeTab === item.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === item.id ? '#fff' : '#999', cursor: 'pointer',
                fontSize: '15px', fontFamily: 'Exo 2, sans-serif',
                fontWeight: activeTab === item.id ? '600' : '400',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          {/* Folders */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ padding: '0 16px', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em' }}>FOLDERS</p>
            </div>
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => { setActiveFolder(folder); setActiveTab('documents'); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 16px', background: activeFolder === folder && activeTab === 'documents' ? 'rgba(255,255,255,0.05)' : 'none',
                  border: 'none', borderLeft: activeFolder === folder && activeTab === 'documents' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeFolder === folder && activeTab === 'documents' ? '#fff' : '#888', cursor: 'pointer',
                  fontSize: '14px', fontFamily: 'Exo 2, sans-serif', textAlign: 'left',
                  fontWeight: activeFolder === folder && activeTab === 'documents' ? '600' : '400'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                {folder.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Admin */}
          {isAdmin && (
            <div style={{ padding: '24px 16px 0' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', marginBottom: '8px' }}>ADMIN</p>
              <button
                onClick={() => setShowUpload(!showUpload)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '15px', fontFamily: 'Exo 2, sans-serif', textAlign: 'left' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload file
              </button>
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ overflowY: activeTab === 'sol' ? 'hidden' : 'auto', padding: activeTab === 'sol' ? '0' : '36px', position: 'relative', display: 'flex', flexDirection: 'column' }}>

          {/* Documents tab */}
          {activeTab === 'documents' && (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  {activeFolder ? activeFolder.replace(/_/g, ' ') : 'DOCUMENT LIBRARY'}
                </h1>
                <p style={{ fontSize: '14px', color: '#777' }}>
                  {activeFolder
                    ? `Showing files in ${activeFolder.replace(/_/g, ' ')}`
                    : (isPostNda || isAdmin ? 'Full access — all documents unlocked' : 'Pre-NDA access — patent and white paper locked')}
                </p>
              </div>

              {isAdmin && showUpload && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', marginBottom: '28px' }}>
                  <p style={{ fontSize: '12px', color: '#777', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em', marginBottom: '16px' }}>UPLOAD DOCUMENT</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={(e) => setUploadFile(e.target.files[0])} style={{ fontSize: '14px', color: '#888', fontFamily: 'Exo 2, sans-serif' }} />
                    <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif' }}>
                      <option value="">Select folder...</option>

                      <optgroup label="00 — Start Here"><option value="00_START_HERE/Investor Guide">Investor Guide</option></optgroup>
                      <optgroup label="01 — Pitch and Overview">
                        <option value="01_Pitch_and_Overview/01 Pitch Deck">Pitch Deck</option>
                        <option value="01_Pitch_and_Overview/02 Executive Summary">Executive Summary</option>
                        <option value="01_Pitch_and_Overview/03 Company Overview">Company Overview</option>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setUploadRestricted(!uploadRestricted)}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: uploadRestricted ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)', background: uploadRestricted ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {uploadRestricted && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      </div>
                      <span style={{ fontSize: '14px', color: '#888', fontFamily: 'Exo 2, sans-serif' }}>Post-NDA only</span>
                    </div>
                    <button onClick={handleUpload} disabled={!uploadFile || !uploadFolder || uploadLoading} style={{ alignSelf: 'flex-start', padding: '9px 18px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer', opacity: (!uploadFile || !uploadFolder || uploadLoading) ? 0.4 : 1 }}>
                      {uploadLoading ? 'Uploading...' : 'Upload'}
                    </button>
                    {uploadMessage && <p style={{ fontSize: '14px', color: uploadMessage.includes('Error') ? '#ef4444' : '#22c55e' }}>{uploadMessage}</p>}
                  </div>
                </div>
              )}

              {docsLoading ? (
                <p style={{ fontSize: '14px', color: '#777' }}>Loading documents...</p>
              ) : Object.keys(groupedDocs).length === 0 ? (
                <p style={{ fontSize: '14px', color: '#777' }}>No documents available yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {Object.entries(groupedDocs).map(([folder, files]) => (
                    <div key={folder}>
                      <p style={{ fontSize: '12px', color: '#777', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', marginBottom: '10px' }}>
                        {folder.split(' / ').pop().replace(/^\d+\s+/, '').toUpperCase()}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {files.map(doc => (
                          <div key={doc.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {doc.restricted && !isPostNda && !isAdmin ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                </svg>
                              )}
                              <span style={{ fontSize: '15px', fontWeight: '500', color: doc.restricted && !isPostNda && !isAdmin ? '#555' : '#e0e0e0' }}>{doc.name}</span>
                              {doc.restricted && (
                                <span style={{ fontSize: '11px', padding: '2px 7px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '3px', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em' }}>POST-NDA</span>
                              )}
                            </div>
                            {doc.restricted && !isPostNda && !isAdmin ? (
                              <span style={{ fontSize: '13px', color: '#444' }}>NDA required</span>
                            ) : (
                              <button onClick={() => openDocument(doc.path, doc.name)} style={{ fontSize: '13px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}>
                                Open →
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sol tab — full center view */}
          {activeTab === 'sol' && (
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
    <SolChat
  solMessages={solMessages}
  solInput={solInput}
  solLoading={solLoading}
  setSolInput={setSolInput}
  sendSolMessage={sendSolMessage}
  />
  </div>
)}

          {/* Due Diligence */}
          {activeTab === 'diligence' && (
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>DUE DILIGENCE</h1>
              <p style={{ fontSize: '14px', color: '#777', marginBottom: '28px' }}>Standard investor due diligence checklist</p>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 0' }}>
                {['Pitch deck reviewed', 'Cap table verified', 'Incorporation documents uploaded', 'IP assignments completed', 'Audited financials uploaded', 'NDA executed', 'Board resolutions uploaded', 'Employee agreements reviewed', 'Data room index created', 'Patent documentation reviewed'].map((item, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ width: '17px', height: '17px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}/>
                    <span style={{ fontSize: '15px', color: '#aaa' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pitch Deck */}
          {activeTab === 'pitchdeck' && (
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>PITCH DECK</h1>
              <p style={{ fontSize: '14px', color: '#777', marginBottom: '28px' }}>Space Launch Technologies — Series A</p>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '72px', textAlign: 'center' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <p style={{ fontSize: '15px', color: '#666' }}>Pitch deck will appear here once uploaded by the administrator.</p>
              </div>
            </div>
          )}

          {/* Investors — admin */}
          {activeTab === 'investors' && isAdmin && (
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>INVESTORS</h1>
              <p style={{ fontSize: '14px', color: '#777', marginBottom: '28px' }}>User management and access control</p>
              <button onClick={() => router.push('/dashboard/admin')} style={{ padding: '11px 22px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '15px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>
                Open User Management →
              </button>
            </div>
          )}

          {/* Activity — admin */}
          {activeTab === 'activity' && isAdmin && (
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>ACTIVITY</h1>
              <p style={{ fontSize: '14px', color: '#777', marginBottom: '28px' }}>Audit log — coming soon</p>
            </div>
          )}

        </div>

        {activeTab !== 'sol' && (
  <div className="sol-panel" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
    <SolChat
  solMessages={solMessages}
  solInput={solInput}
  solLoading={solLoading}
  setSolInput={setSolInput}
  sendSolMessage={sendSolMessage}
/>
  </div>
)}

      </div>

      {/* Mobile Sol drawer */}
      {solDrawerOpen && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70vh', background: '#0f0f0f', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6' }}/>
              <span style={{ fontSize: '15px', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>SOL</span>
            </div>
            <button onClick={() => setSolDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '20px' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {solMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '88%', padding: '10px 14px', borderRadius: '8px', fontSize: '15px', lineHeight: '1.6', background: msg.role === 'user' ? '#3b82f6' : 'rgba(255,255,255,0.06)', color: msg.role === 'user' ? '#fff' : '#ddd', fontFamily: 'Exo 2, sans-serif' }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={solInput} onChange={(e) => setSolInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendSolMessage()} placeholder="Ask Sol anything..." style={{ flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '15px', fontFamily: 'Exo 2, sans-serif', outline: 'none' }} />
              <button onClick={sendSolMessage} disabled={!solInput.trim() || solLoading} style={{ width: '42px', height: '42px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!solInput.trim() || solLoading) ? 0.4 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        @media (max-width: 768px) {
          .main-layout { grid-template-columns: 1fr !important; height: auto !important; }
          .sidebar { display: none !important; }
          .sol-panel { display: none !important; }
          .show-mobile { display: flex !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}