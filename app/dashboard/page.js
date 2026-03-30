'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = 'contact@kimduhyun.com';

const INVESTOR_TUTORIAL_STEPS = [
  { target: 'doc-library', title: 'Document Library', description: 'Browse all documents about Space Launch Technologies. Click any file to open it.' },
  { target: 'sol-panel', title: 'Sol AI Assistant', description: 'Ask Sol anything about the company, technology, financials, or the OLAC system.' },
  { target: 'folders', title: 'Folder Navigation', description: 'Use these folders to filter documents by category.' },
  { target: 'pitchdeck-tab', title: 'Pitch Deck', description: 'View the Space Launch Technologies pitch deck directly from this tab.' },
];

const EMPLOYEE_TUTORIAL_STEPS = [
  { target: 'doc-library', title: 'Document Library', description: 'Browse and manage all project documents from here.' },
  { target: 'upload-zone', title: 'Upload Documents', description: 'Drag and drop a PDF here — Sol reads it and automatically sorts it into the right folder.' },
  { target: 'sol-panel', title: 'Sol AI Assistant', description: 'Ask Sol anything — sorting, summarising, research, and more.' },
  { target: 'diligence-tab', title: 'Due Diligence', description: 'Track and manage the investor due diligence checklist. Sol auto-checks items when documents are uploaded.' },
];

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
                              { role: 'assistant', content: "Hey! I'm Sol, your data room assistant. I can answer questions about Space Launch Technologies and the OLAC system based on the documents in this data room. How can I help?" }
                            ]);
                            const [solInput, setSolInput] = useState('');
                            const [solLoading, setSolLoading] = useState(false);
                            const [isDragging, setIsDragging] = useState(false);
                            const [dropStatus, setDropStatus] = useState(''); // '' | 'reading' | 'sorting' | 'uploading' | 'done' | 'error'
                            const [dropStatusMessage, setDropStatusMessage] = useState('');
                            const dropZoneInputRef = useRef(null);
                            const [draggingDoc, setDraggingDoc] = useState(null);
                            const [dragOverFolder, setDragOverFolder] = useState(null);
                            const [movingDocPath, setMovingDocPath] = useState(null);
                            const [renamingDocPath, setRenamingDocPath] = useState(null);
                            const [renameValue, setRenameValue] = useState('');
                            const [diligenceItems, setDiligenceItems] = useState([]);
                            const [editingDiligenceId, setEditingDiligenceId] = useState(null);
                            const [diligenceEditValue, setDiligenceEditValue] = useState('');
                            const [newDiligenceText, setNewDiligenceText] = useState('');
                            const [showTutorial, setShowTutorial] = useState(false);
                            const [tutorialStep, setTutorialStep] = useState(0);
                            const [spotlightRect, setSpotlightRect] = useState(null);

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
                                await loadDiligence();
                                if (!profile.has_seen_tutorial) setShowTutorial(true);
                              }
                              init();
                            }, []);

                            // Update spotlight position whenever the tutorial step changes
                            useEffect(() => {
                              if (!showTutorial || !profile) return;
                              const isEmp = profile.role === 'pre_nda_employee' || profile.role === 'post_nda_employee';
                              const steps = isEmp ? EMPLOYEE_TUTORIAL_STEPS : INVESTOR_TUTORIAL_STEPS;
                              const step = steps[tutorialStep];
                              if (!step) return;
                              const timer = setTimeout(() => {
                                const el = document.querySelector(`[data-tutorial="${step.target}"]`);
                                if (el) setSpotlightRect(el.getBoundingClientRect());
                              }, 60);
                              return () => clearTimeout(timer);
                            }, [showTutorial, tutorialStep, profile]);

                            async function loadDocuments() {
                              const { data: { session } } = await supabase.auth.getSession();
                              const response = await fetch('/api/documents', {
                                headers: { authorization: `Bearer ${session.access_token}` }
                              });
                              const result = await response.json();
                              if (result.documents) setDocuments(result.documents);
                              setDocsLoading(false);
                            }

                            async function loadDiligence() {
                              const { data } = await supabase.from('due_diligence').select('*').order('position');
                              if (data) setDiligenceItems(data);
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
                              } else if (result.requiresNda) {
                                window.location.href = '/nda';
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
                            async function handleFileDrop(file) {
                              if (!file) return;
                              if (!file.name.toLowerCase().endsWith('.pdf')) {
                                setDropStatus('error');
                                setDropStatusMessage('Only PDF files are supported.');
                                setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); }, 3000);
                                return;
                              }
                              const { data: { session } } = await supabase.auth.getSession();

                              // Step 1: Reading
                              setDropStatus('reading');
                              setDropStatusMessage('Reading document...');

                              // Step 2: Sort with Sol
                              setDropStatus('sorting');
                              setDropStatusMessage('Sorting with Sol...');
                              const sortForm = new FormData();
                              sortForm.append('file', file);
                              let sortResult;
                              try {
                                const sortResponse = await fetch('/api/sort', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}` },
                                  body: sortForm
                                });
                                sortResult = await sortResponse.json();
                              } catch {
                                setDropStatus('error');
                                setDropStatusMessage('Error contacting Sol. Please try again.');
                                setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); }, 4000);
                                return;
                              }
                              if (sortResult.error) {
                                setDropStatus('error');
                                setDropStatusMessage('Sort error: ' + sortResult.error);
                                setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); }, 4000);
                                return;
                              }

                              const { folder, isRestricted } = sortResult;
                              const folderLabel = folder.split('/').pop();

                              // Step 3: Upload
                              setDropStatus('uploading');
                              setDropStatusMessage(`Uploading to ${folderLabel}...`);
                              const uploadForm = new FormData();
                              uploadForm.append('file', file);
                              uploadForm.append('folder', folder);
                              uploadForm.append('isRestricted', isRestricted.toString());
                              const uploadResponse = await fetch('/api/upload', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}` },
                                body: uploadForm
                              });
                              const uploadResult = await uploadResponse.json();
                              if (uploadResult.error) {
                                setDropStatus('error');
                                setDropStatusMessage('Upload error: ' + uploadResult.error);
                                setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); }, 4000);
                                return;
                              }

                              setDropStatus('done');
                              setDropStatusMessage('Done.');
                              await loadDocuments();
                              await loadDiligence();
                              setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); }, 3000);
                            }

                            async function completeTutorial() {
                              setShowTutorial(false);
                              setSpotlightRect(null);
                              setTutorialStep(0);
                              if (user) {
                                const { data: { session } } = await supabase.auth.getSession();
                                await fetch('/api/tutorial-complete', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}` }
                                });
                              }
                            }

                            async function handleDiligenceToggle(item) {
                              const updated = { checked: !item.checked };
                              await supabase.from('due_diligence').update(updated).eq('id', item.id);
                              setDiligenceItems(prev => prev.map(d => d.id === item.id ? { ...d, ...updated } : d));
                            }

                            async function handleDiligenceEditConfirm(item) {
                              const trimmed = diligenceEditValue.trim();
                              setEditingDiligenceId(null);
                              if (!trimmed || trimmed === item.item) return;
                              await supabase.from('due_diligence').update({ item: trimmed }).eq('id', item.id);
                              setDiligenceItems(prev => prev.map(d => d.id === item.id ? { ...d, item: trimmed } : d));
                            }

                            async function handleDiligenceAdd() {
                              const trimmed = newDiligenceText.trim();
                              if (!trimmed) return;
                              const maxPos = diligenceItems.length > 0 ? Math.max(...diligenceItems.map(d => d.position)) : -1;
                              const { data } = await supabase.from('due_diligence').insert({ item: trimmed, checked: false, position: maxPos + 1 }).select().single();
                              if (data) setDiligenceItems(prev => [...prev, data]);
                              setNewDiligenceText('');
                            }

                            async function handleDiligenceDelete(item) {
                              await supabase.from('due_diligence').delete().eq('id', item.id);
                              setDiligenceItems(prev => prev.filter(d => d.id !== item.id));
                            }

                            async function handleMoveDoc(doc, targetFolder) {
                              const parts = doc.path.split('/');
                              const prefix = parts[0]; // 'general' or 'restricted'
                              const filename = parts[parts.length - 1];
                              const newPath = `${prefix}/${targetFolder}/${filename}`;
                              if (newPath === doc.path) return;
                              setMovingDocPath(doc.path);
                              const { data: { session } } = await supabase.auth.getSession();
                              const response = await fetch('/api/documents/move', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ oldPath: doc.path, newPath })
                              });
                              const result = await response.json();
                              setMovingDocPath(null);
                              if (!result.error) await loadDocuments();
                            }

                            async function handleRenameDoc(doc, newName) {
                              const trimmed = newName.trim();
                              setRenamingDocPath(null);
                              if (!trimmed || trimmed === doc.name) return;
                              const parts = doc.path.split('/');
                              parts[parts.length - 1] = trimmed;
                              const newPath = parts.join('/');
                              setMovingDocPath(doc.path);
                              const { data: { session } } = await supabase.auth.getSession();
                              const response = await fetch('/api/documents/move', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ oldPath: doc.path, newPath })
                              });
                              const result = await response.json();
                              setMovingDocPath(null);
                              if (!result.error) await loadDocuments();
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
      { role: 'assistant', content: "Hey! I'm Sol, your data room assistant. I can answer questions about Space Launch Technologies and the OLAC system based on the documents in this data room. How can I help?" }
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
  const isPostNda = profile.role === 'post_nda_investor' || profile.role === 'post_nda_employee';
  const isEmployee = profile.role === 'pre_nda_employee' || profile.role === 'post_nda_employee';

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
              data-tutorial={item.id === 'diligence' ? 'diligence-tab' : item.id === 'pitchdeck' ? 'pitchdeck-tab' : undefined}
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
          <div data-tutorial="folders" style={{ marginTop: '24px' }}>
            <div style={{ padding: '0 16px', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em' }}>FOLDERS</p>
            </div>
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => { setActiveFolder(folder); setActiveTab('documents'); }}
                onDragOver={(e) => { if (draggingDoc) { e.preventDefault(); setDragOverFolder(folder); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverFolder(null); }}
                onDrop={(e) => { e.preventDefault(); setDragOverFolder(null); if (draggingDoc) handleMoveDoc(draggingDoc, folder); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 16px',
                  background: dragOverFolder === folder ? 'rgba(59,130,246,0.12)' : activeFolder === folder && activeTab === 'documents' ? 'rgba(255,255,255,0.05)' : 'none',
                  border: 'none',
                  borderLeft: dragOverFolder === folder ? '2px solid #3b82f6' : activeFolder === folder && activeTab === 'documents' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: dragOverFolder === folder ? '#3b82f6' : activeFolder === folder && activeTab === 'documents' ? '#fff' : '#888',
                  cursor: 'pointer', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', textAlign: 'left',
                  fontWeight: activeFolder === folder && activeTab === 'documents' ? '600' : '400',
                  transition: 'background 0.1s, color 0.1s',
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
              <div data-tutorial="doc-library" style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  {activeFolder ? activeFolder.replace(/_/g, ' ') : 'DOCUMENT LIBRARY'}
                </h1>
                <p style={{ fontSize: '14px', color: '#777' }}>
                  {activeFolder
                    ? `Showing files in ${activeFolder.replace(/_/g, ' ')}`
                    : (isPostNda || isAdmin ? 'Full access — all documents unlocked' : 'Pre-NDA access — patent and white paper locked')}
                </p>
              </div>

              {/* Drag-and-drop upload zone — visible for employees and admin */}
              {(isEmployee || isAdmin) && (
                <div
                  data-tutorial="upload-zone"
                  onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setIsDragging(true); } }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (!e.dataTransfer.types.includes('Files')) return;
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileDrop(file);
                  }}
                  onClick={() => { if (!dropStatus) dropZoneInputRef.current?.click(); }}
                  style={{
                    border: `1px dashed ${isDragging ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px',
                    padding: '28px',
                    textAlign: 'center',
                    marginBottom: '28px',
                    background: isDragging ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.15s, background 0.15s',
                    cursor: dropStatus ? 'default' : 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    ref={dropZoneInputRef}
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => { const file = e.target.files[0]; if (file) handleFileDrop(file); e.target.value = ''; }}
                  />
                  {dropStatus ? (
                    <p style={{
                      fontSize: '14px',
                      fontFamily: 'Exo 2, sans-serif',
                      color: dropStatus === 'error' ? '#ef4444' : dropStatus === 'done' ? '#22c55e' : '#3b82f6',
                    }}>
                      {dropStatusMessage}
                    </p>
                  ) : (
                    <>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif', margin: 0 }}>
                        Drop a PDF here — Sol will sort it automatically
                      </p>
                    </>
                  )}
                </div>
              )}

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
                        {files.map(doc => {
                          const isMoving = movingDocPath === doc.path;
                          const isRenaming = renamingDocPath === doc.path;
                          const canEdit = isEmployee || isAdmin;
                          return (
                          <div
                            key={doc.path}
                            draggable={canEdit && !isMoving && !isRenaming}
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingDoc(doc); }}
                            onDragEnd={() => { setDraggingDoc(null); setDragOverFolder(null); }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '14px 18px',
                              background: isMoving ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isMoving ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'}`,
                              borderRadius: '6px',
                              opacity: isMoving ? 0.6 : 1,
                              cursor: isMoving ? 'default' : 'pointer',
                              transition: 'opacity 0.15s',
                            }}
                          >
                            <div
                              onClick={() => !isRenaming && openDocument(doc.path, doc.name)}
                              style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}
                            >
                              {doc.restricted && !isPostNda && !isAdmin ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                </svg>
                              )}
                              {isRenaming ? (
                                <input
                                  autoFocus
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameDoc(doc, renameValue);
                                    if (e.key === 'Escape') setRenamingDocPath(null);
                                  }}
                                  onBlur={() => setRenamingDocPath(null)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ fontSize: '15px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }}
                                />
                              ) : (
                                <span style={{ fontSize: '15px', fontWeight: '500', color: doc.restricted && !isPostNda && !isAdmin ? '#555' : '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                              )}
                              {doc.restricted && !isRenaming && (
                                <span style={{ fontSize: '11px', padding: '2px 7px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '3px', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', flexShrink: 0 }}>POST-NDA</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '12px' }}>
                              {isMoving ? (
                                <span style={{ fontSize: '13px', color: '#3b82f6', fontFamily: 'Exo 2, sans-serif' }}>Moving...</span>
                              ) : isRenaming ? null : (
                                <>
                                  {canEdit && !(doc.restricted && !isPostNda && !isAdmin) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setRenamingDocPath(doc.path); setRenameValue(doc.name); }}
                                      style={{ fontSize: '13px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}
                                    >
                                      Rename
                                    </button>
                                  )}
                                  {doc.restricted && !isPostNda && !isAdmin ? (
                                    <button onClick={(e) => { e.stopPropagation(); openDocument(doc.path, doc.name); }} style={{ fontSize: '13px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}>
                                      NDA required →
                                    </button>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); openDocument(doc.path, doc.name); }} style={{ fontSize: '13px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}>
                                      Open →
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          );
                        })}
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
                {diligenceItems.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: i < diligenceItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    {/* Checkbox */}
                    <div
                      onClick={() => (isEmployee || isAdmin) && handleDiligenceToggle(item)}
                      style={{ width: '17px', height: '17px', borderRadius: '4px', border: item.checked ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.15)', background: item.checked ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: (isEmployee || isAdmin) ? 'pointer' : 'default', transition: 'background 0.15s, border-color 0.15s' }}
                    >
                      {item.checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    {/* Item text — inline edit for employees/admin */}
                    {editingDiligenceId === item.id ? (
                      <input
                        autoFocus
                        value={diligenceEditValue}
                        onChange={(e) => setDiligenceEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleDiligenceEditConfirm(item); if (e.key === 'Escape') setEditingDiligenceId(null); }}
                        onBlur={() => handleDiligenceEditConfirm(item)}
                        style={{ flex: 1, fontSize: '15px', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none' }}
                      />
                    ) : (
                      <span
                        onClick={() => (isEmployee || isAdmin) && (setEditingDiligenceId(item.id), setDiligenceEditValue(item.item))}
                        style={{ flex: 1, fontSize: '15px', color: '#aaa', cursor: (isEmployee || isAdmin) ? 'text' : 'default' }}
                      >
                        {item.item}
                      </span>
                    )}
                    {/* Delete button — employees/admin only */}
                    {(isEmployee || isAdmin) && editingDiligenceId !== item.id && (
                      <button
                        onClick={() => handleDiligenceDelete(item)}
                        style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '0 4px', fontSize: '16px', lineHeight: 1, flexShrink: 0 }}
                      >×</button>
                    )}
                  </div>
                ))}
                {diligenceItems.length === 0 && (
                  <div style={{ padding: '20px 18px' }}>
                    <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif' }}>No items yet.</p>
                  </div>
                )}
              </div>
              {/* Add new item — employees/admin only */}
              {(isEmployee || isAdmin) && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <input
                    value={newDiligenceText}
                    onChange={(e) => setNewDiligenceText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDiligenceAdd()}
                    placeholder="Add checklist item..."
                    style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', outline: 'none' }}
                  />
                  <button
                    onClick={handleDiligenceAdd}
                    disabled={!newDiligenceText.trim()}
                    style={{ padding: '10px 18px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer', opacity: newDiligenceText.trim() ? 1 : 0.4 }}
                  >
                    Add
                  </button>
                </div>
              )}
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
  <div data-tutorial="sol-panel" className="sol-panel" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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

      {/* Spotlight tutorial overlay */}
      {showTutorial && spotlightRect && (() => {
        const isEmp = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee';
        const steps = isEmp ? EMPLOYEE_TUTORIAL_STEPS : INVESTOR_TUTORIAL_STEPS;
        const step = steps[tutorialStep];
        if (!step) return null;
        const isLast = tutorialStep === steps.length - 1;
        const pad = 4;
        const cardWidth = 300;
        const cardHeight = 215;
        const viewW = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const viewH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const spaceBelow = viewH - spotlightRect.bottom - 16;
        const spaceAbove = spotlightRect.top - 16;
        let cardTop;
        if (spaceBelow >= cardHeight) {
          cardTop = spotlightRect.bottom + 16;
        } else if (spaceAbove >= cardHeight) {
          cardTop = spotlightRect.top - cardHeight - 16;
        } else {
          cardTop = Math.round(viewH / 2 - cardHeight / 2);
        }
        cardTop = Math.max(16, Math.min(cardTop, viewH - cardHeight - 16));
        const cardLeft = Math.max(16, Math.min(spotlightRect.left, viewW - cardWidth - 16));
        return (
          <>
            {/* Click blocker — prevents interacting with the app behind the tutorial */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }} />
            {/* Spotlight ring — box-shadow creates the dark overlay everywhere except inside the ring */}
            <div style={{
              position: 'fixed',
              top: spotlightRect.top - pad,
              left: spotlightRect.left - pad,
              width: spotlightRect.width + pad * 2,
              height: spotlightRect.height + pad * 2,
              borderRadius: '10px',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.78), 0 0 0 2px #3b82f6, 0 0 20px rgba(59,130,246,0.5)',
              animation: 'spotlightPulse 2s ease-in-out infinite',
              zIndex: 9998,
              pointerEvents: 'none',
            }} />
            {/* Tutorial card */}
            <div style={{
              position: 'fixed', top: cardTop, left: cardLeft, width: `${cardWidth}px`,
              background: '#111', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px',
              padding: '20px', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <p style={{ fontSize: '11px', color: '#3b82f6', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', marginBottom: '6px' }}>
                STEP {tutorialStep + 1} OF {steps.length}
              </p>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', marginBottom: '8px' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#888', fontFamily: 'Exo 2, sans-serif', lineHeight: '1.6', marginBottom: '18px' }}>
                {step.description}
              </p>
              {/* Dot indicators */}
              <div style={{ display: 'flex', gap: '5px', marginBottom: '16px' }}>
                {steps.map((_, i) => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === tutorialStep ? '#3b82f6' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={completeTutorial} style={{ fontSize: '13px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}>
                  Skip
                </button>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {tutorialStep > 0 && (
                    <button
                      onClick={() => setTutorialStep(s => s - 1)}
                      style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#aaa', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
                    >
                      ← Prev
                    </button>
                  )}
                  <button
                    onClick={() => isLast ? completeTutorial() : setTutorialStep(s => s + 1)}
                    style={{ padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer', fontWeight: '600' }}
                  >
                    {isLast ? 'Done' : 'Next →'}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
        @keyframes spotlightPulse {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.78), 0 0 0 2px #3b82f6, 0 0 16px rgba(59,130,246,0.4); }
          50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.78), 0 0 0 2px #3b82f6, 0 0 28px rgba(59,130,246,0.7); }
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