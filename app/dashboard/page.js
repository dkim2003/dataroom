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
  { target: 'folders', title: 'Folder Navigation', description: 'Browse documents by category. Restricted folders require a signed NDA — you\'ll be guided through that process automatically.' },
  { target: 'doc-library', title: 'Document Library', description: 'Click any file to open it. Switch between list and grid view using the toggle in the top-right — grid mode shows PDF previews.' },
  { target: 'view-toggle', title: 'List & Grid View', description: 'Toggle between list and grid layouts. Grid view renders live PDF thumbnails so you can visually scan documents at a glance.' },
  { target: 'sol-panel', title: 'Sol AI Assistant', description: 'Ask Sol anything about Space Launch Technologies — financials, technology, the OLAC system, or any document in the data room.' },
  { target: 'pitchdeck-tab', title: 'Pitch Deck', description: 'View the Space Launch Technologies pitch deck directly from this tab.' },
];

const EMPLOYEE_TUTORIAL_STEPS = [
  { target: 'upload-zone', title: 'AI Auto-Sort Upload', description: 'Drop a PDF here and Sol reads it, picks the right folder, and files it automatically. Restricted documents are flagged too.' },
  { target: 'view-toggle', title: 'List & Grid View', description: 'Switch between list and grid layouts. Grid renders live PDF thumbnails. Use the three-dot menu on any file to rename, download, or move to trash.' },
  { target: 'folders', title: 'Drag & Drop', description: 'Drag any file or subfolder from the main area onto a sidebar folder to move it. You can also create new subfolders with the blue New Folder button.' },
  { target: 'trash-nav', title: 'Recently Deleted', description: 'Deleted files land here — not gone forever. Restore them or permanently delete from this view.' },
  { target: 'sol-panel', title: 'Sol AI Assistant', description: 'Ask Sol to find, summarise, or compare documents. Sol also auto-checks due diligence items when matching files are uploaded.' },
  { target: 'diligence-tab', title: 'Due Diligence', description: 'Track the investor checklist here. Items are checked automatically as documents are uploaded and sorted.' },
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

function FileTypeIcon({ name, size = 28 }) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return (
    <div style={{ width: size, height: size, borderRadius: '5px', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.32, fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '-0.02em' }}>PDF</span>
    </div>
  );
  if (ext === 'doc' || ext === 'docx') return (
    <div style={{ width: size, height: size, borderRadius: '5px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.4, fontWeight: '700', color: '#fff', fontFamily: 'serif' }}>W</span>
    </div>
  );
  if (ext === 'xls' || ext === 'xlsx') return (
    <div style={{ width: size, height: size, borderRadius: '5px', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.4, fontWeight: '700', color: '#fff', fontFamily: 'serif' }}>X</span>
    </div>
  );
  if (ext === 'ppt' || ext === 'pptx') return (
    <div style={{ width: size, height: size, borderRadius: '5px', background: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.4, fontWeight: '700', color: '#fff', fontFamily: 'serif' }}>P</span>
    </div>
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '5px', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    </div>
  );
}

function SolDot({ taskToast }) {
  const r = 5.5, cx = 9, cy = 9;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      {!taskToast && <circle cx={cx} cy={cy} r="5" fill="#22c55e"/>}
      {taskToast?.status === 'loading' && <>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(34,197,94,0.2)" strokeWidth="2"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="2"
          strokeDasharray={`${circ * 0.65} ${circ * 0.35}`}
          strokeLinecap="round"
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'spin 0.9s linear infinite' }}/>
      </>}
      {taskToast?.status === 'success' && <>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="2"/>
        <polyline points="5.5,9 7.5,11.5 12.5,6.5" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </>}
      {taskToast?.status === 'error' && <>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="2"/>
        <line x1="6.5" y1="6.5" x2="11.5" y2="11.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="11.5" y1="6.5" x2="6.5" y2="11.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
      </>}
    </svg>
  );
}

// Sol chat panel — used in both desktop right panel and center when Sol tab is active
function SolChat({ solMessages, solInput, solLoading, setSolInput, sendSolMessage, taskToast }) {
  const bottomRef = useRef(null)

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [solMessages, solLoading])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '18px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SolDot taskToast={taskToast} />
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>SOL</span>
          <span style={{ fontSize: '13px', color: '#777', marginLeft: 'auto' }}>ask me anything!</span>
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
                            const [dropFolder, setDropFolder] = useState(null);
                            const [dropRestricted, setDropRestricted] = useState(false);
                            const dropZoneInputRef = useRef(null);
                            const [draggingDoc, setDraggingDoc] = useState(null);
                            const [draggingFolder, setDraggingFolder] = useState(null);
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
                            const [activityLogs, setActivityLogs] = useState([]);
                            const [activityLoading, setActivityLoading] = useState(false);
                            const [expandedActivityRows, setExpandedActivityRows] = useState(new Set());
                            const [activityView, setActivityView] = useState('recency');
                            const [expandedActivityGroups, setExpandedActivityGroups] = useState(new Set());
                            const [docView, setDocView] = useState('list');
                            const [userRecents, setUserRecents] = useState({});
                            const [previewUrls, setPreviewUrls] = useState({});
                            const [pdfThumbnails, setPdfThumbnails] = useState({});
                            const [openMenuPath, setOpenMenuPath] = useState(null);
                            const [openFolderMenu, setOpenFolderMenu] = useState(null);
                            const [renamingFolderPath, setRenamingFolderPath] = useState(null);
                            const [renameFolderValue, setRenameFolderValue] = useState('');
                            const [trashItems, setTrashItems] = useState([]);
                            const [trashLoading, setTrashLoading] = useState(false);
                            const [creatingFolderIn, setCreatingFolderIn] = useState(null);
                            const [expandedFolders, setExpandedFolders] = useState(new Set());
                            const [foldersGroupOpen, setFoldersGroupOpen] = useState(true);
                            const [internalGroupOpen, setInternalGroupOpen] = useState(true);
                            const [folderPaths, setFolderPaths] = useState([]);
                            const [newFolderName, setNewFolderName] = useState('');
                            const [pitchDeckPages, setPitchDeckPages] = useState([]);
                            const [pitchDeckLoading, setPitchDeckLoading] = useState(false);
                            const [pitchDeckError, setPitchDeckError] = useState(null);
                            const [folderOrder, setFolderOrder] = useState([]);
                            const [reorderingFolder, setReorderingFolder] = useState(null);
                            const [reorderDropTarget, setReorderDropTarget] = useState(null);
                            const [taskToast, setTaskToast] = useState(null);
                            const taskTimerRef = useRef(null);
                            const [dragOverTrash, setDragOverTrash] = useState(false);
                            const [newFolderAccess, setNewFolderAccess] = useState('public');
                            const [links, setLinks] = useState([]);
                            const [addingLink, setAddingLink] = useState(false);
                            const [linkTargetFolder, setLinkTargetFolder] = useState(null);
                            const [linkName, setLinkName] = useState('');
                            const [linkUrl, setLinkUrl] = useState('');
                            const [privateItems, setPrivateItems] = useState([]);
                            const [addingPrivate, setAddingPrivate] = useState(null); // null | 'note' | 'link'
                            const [privateTitle, setPrivateTitle] = useState('');
                            const [privateContent, setPrivateContent] = useState('');
                            const [privateFiles, setPrivateFiles] = useState([]);
                            const [privateFilesLoading, setPrivateFilesLoading] = useState(false);
                            const [selectedPrivateUserId, setSelectedPrivateUserId] = useState(null);
                            const [allProfiles, setAllProfiles] = useState([]);
                            const [privateUploadDragging, setPrivateUploadDragging] = useState(false);
                            const [privateDropStatus, setPrivateDropStatus] = useState('');
                            const [privateDropMessage, setPrivateDropMessage] = useState('');
                            const privateUploadRef = useRef(null);
                            const [renamingPrivateFilePath, setRenamingPrivateFilePath] = useState(null);
                            const [renamePrivateFileValue, setRenamePrivateFileValue] = useState('');
                            const [privateOpen, setPrivateOpen] = useState(true);
                            const [privateActiveSubfolder, setPrivateActiveSubfolder] = useState(null);
                            const [privateSubfolderMap, setPrivateSubfolderMap] = useState({});
                            const [expandedPrivateFolders, setExpandedPrivateFolders] = useState(new Set());
                            const [creatingPrivateFolder, setCreatingPrivateFolder] = useState(false);
                            const [newPrivateFolderName, setNewPrivateFolderName] = useState('');
                            const [privateDocView, setPrivateDocView] = useState('list');
                            const [folderNames, setFolderNames] = useState({});
                            const [contextMenu, setContextMenu] = useState(null); // { folder, x, y }
                            const [renamingTopFolder, setRenamingTopFolder] = useState(null);
                            const [renameTopFolderValue, setRenameTopFolderValue] = useState('');
                            const [renamingLinkId, setRenamingLinkId] = useState(null);
                            const [renameLinkValue, setRenameLinkValue] = useState('');
                            const [renamingPrivateItemId, setRenamingPrivateItemId] = useState(null);
                            const [renamePrivateItemValue, setRenamePrivateItemValue] = useState('');
                            const [privateItemMenuId, setPrivateItemMenuId] = useState(null);

                            useEffect(() => {
                              async function init() {
                                // Detect magic link arrival via URL hash — mark email as verified
                                if (typeof window !== 'undefined' && window.location.hash.includes('type=magiclink')) {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  if (session) {
                                    await fetch('/api/verify-email', { method: 'POST', headers: { authorization: `Bearer ${session.access_token}` } });
                                  }
                                  // Clean up hash from URL
                                  window.history.replaceState(null, '', window.location.pathname);
                                }

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
                                await loadDocuments();
                                setLoading(false);
                                const adminCheck = user.email === ADMIN_EMAIL || profile?.is_admin === true;
                                const { data: { session } } = await supabase.auth.getSession();
                                await Promise.all([
                                  loadDiligence(),
                                  loadUserRecents(),
                                  loadLinks(),
                                  loadPrivateItems(),
                                  loadPrivateFiles(null),
                                  loadPrivateFolderTree(null),
                                  fetch('/api/folder-order').then(r => r.json()).then(d => { if (d.order?.length) setFolderOrder(d.order); }),
                                  fetch('/api/folder-names', { headers: { authorization: `Bearer ${session.access_token}` } }).then(r => r.json()).then(d => { if (d.names) setFolderNames(d.names); }),
                                  adminCheck ? fetch('/api/admin/profiles', { headers: { authorization: `Bearer ${session.access_token}` } }).then(r => r.json()).then(d => { if (d.profiles) setAllProfiles(d.profiles); }) : Promise.resolve()
                                ]);
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

                            useEffect(() => {
                              if (!openMenuPath) return;
                              const close = () => setOpenMenuPath(null);
                              document.addEventListener('click', close);
                              return () => document.removeEventListener('click', close);
                            }, [openMenuPath]);

                            useEffect(() => {
                              if (!contextMenu) return;
                              const close = () => setContextMenu(null);
                              document.addEventListener('click', close);
                              return () => document.removeEventListener('click', close);
                            }, [contextMenu]);

                            useEffect(() => {
                              if (!privateItemMenuId) return;
                              const close = () => setPrivateItemMenuId(null);
                              document.addEventListener('click', close);
                              return () => document.removeEventListener('click', close);
                            }, [privateItemMenuId]);


                            async function renderPdfThumbnail(url, path) {
                              const tryRender = async (retries = 6) => {
                                const pdfjs = window.pdfjsLib;
                                if (!pdfjs) {
                                  if (retries > 0) {
                                    await new Promise(r => setTimeout(r, 600));
                                    return tryRender(retries - 1);
                                  }
                                  return;
                                }
                                try {
                                  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                                  const pdf = await pdfjs.getDocument({ url, withCredentials: false }).promise;
                                  const page = await pdf.getPage(1);
                                  const viewport = page.getViewport({ scale: 2 });
                                  const canvas = document.createElement('canvas');
                                  canvas.width = viewport.width;
                                  canvas.height = viewport.height;
                                  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                                  const thumb = canvas.toDataURL('image/jpeg', 0.85);
                                  setPdfThumbnails(prev => ({ ...prev, [path]: thumb }));
                                } catch (e) { /* fail silently — card will show placeholder */ }
                              };
                              tryRender();
                            }

                            useEffect(() => {
                              if (docView === 'grid' && documents.length > 0) {
                                supabase.auth.getSession().then(({ data: { session } }) => {
                                  fetch('/api/documents/preview-urls', {
                                    method: 'POST',
                                    headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ docs: documents.map(d => ({ path: d.path })) })
                                  }).then(r => r.json()).then(result => {
                                    if (result.urls) {
                                      setPreviewUrls(result.urls);
                                      Object.entries(result.urls).forEach(([path, url]) => {
                                        if (url) {
                                          const doc = documents.find(d => d.path === path);
                                          if (doc?.mimeType === 'application/pdf' || doc?.name.toLowerCase().endsWith('.pdf')) {
                                            renderPdfThumbnail(url, path);
                                          }
                                        }
                                      });
                                    }
                                  });
                                });
                              }
                            }, [docView, documents]);

                            useEffect(() => {
                              if (!openFolderMenu) return;
                              function handleClickOutside() { setOpenFolderMenu(null); }
                              document.addEventListener('click', handleClickOutside);
                              return () => document.removeEventListener('click', handleClickOutside);
                            }, [openFolderMenu]);

                            useEffect(() => {
                              if (activeTab !== 'pitchdeck' || pitchDeckPages.length > 0 || pitchDeckLoading) return;
                              async function loadPitchDeck() {
                                setPitchDeckLoading(true);
                                setPitchDeckError(null);
                                try {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  const res = await fetch('/api/documents', { headers: { authorization: `Bearer ${session.access_token}` } });
                                  const result = await res.json();
                                  const pitchDoc = result.documents?.find(d =>
                                    d.path.includes('01_Pitch_and_Overview') &&
                                    (d.name.toLowerCase().endsWith('.pdf') || d.mimeType === 'application/pdf')
                                  );
                                  if (!pitchDoc) { setPitchDeckError('no_file'); setPitchDeckLoading(false); return; }
                                  const urlRes = await fetch('/api/documents/signed-url', {
                                    method: 'POST',
                                    headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ path: pitchDoc.path, fileName: pitchDoc.name })
                                  });
                                  const urlData = await urlRes.json();
                                  if (!urlData.signedUrl) { setPitchDeckError('url_failed'); setPitchDeckLoading(false); return; }
                                  const tryRender = async (retries = 8) => {
                                    const pdfjs = window.pdfjsLib;
                                    if (!pdfjs) {
                                      if (retries > 0) { await new Promise(r => setTimeout(r, 600)); return tryRender(retries - 1); }
                                      setPitchDeckError('pdfjs_unavailable'); setPitchDeckLoading(false); return;
                                    }
                                    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                                    const pdf = await pdfjs.getDocument({ url: urlData.signedUrl, withCredentials: false }).promise;
                                    for (let i = 1; i <= pdf.numPages; i++) {
                                      const page = await pdf.getPage(i);
                                      const viewport = page.getViewport({ scale: 1.5 });
                                      const canvas = document.createElement('canvas');
                                      canvas.width = viewport.width;
                                      canvas.height = viewport.height;
                                      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                                      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                                      setPitchDeckPages(prev => [...prev, dataUrl]);
                                      if (i === 1) setPitchDeckLoading(false);
                                    }
                                  };
                                  tryRender();
                                } catch (e) { setPitchDeckError(e.message); setPitchDeckLoading(false); }
                              }
                              loadPitchDeck();
                            }, [activeTab]);

                            async function loadDocuments() {
                              const { data: { session } } = await supabase.auth.getSession();
                              const response = await fetch('/api/documents', {
                                headers: { authorization: `Bearer ${session.access_token}` }
                              });
                              const result = await response.json();
                              if (result.documents) setDocuments(result.documents);
                              if (result.folderPaths) setFolderPaths(result.folderPaths);
                              setDocsLoading(false);
                            }

                            async function loadDiligence() {
                              const { data } = await supabase.from('due_diligence').select('*').order('position');
                              if (data) setDiligenceItems(data);
                            }

                            async function loadTrash() {
                              setTrashLoading(true);
                              const { data: { session } } = await supabase.auth.getSession();
                              const res = await fetch('/api/trash', { headers: { authorization: `Bearer ${session.access_token}` } });
                              const result = await res.json();
                              if (result.items) setTrashItems(result.items);
                              setTrashLoading(false);
                            }

                            async function moveToTrash(path, fileName) {
                              taskStart('Moving to trash...');
                              const { data: { session } } = await supabase.auth.getSession();
                              await fetch('/api/trash', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ path, fileName })
                              });
                              await loadDocuments();
                              taskDone('Moved to trash');
                            }

                            async function restoreFromTrash(trashId) {
                              taskStart('Restoring...');
                              const { data: { session } } = await supabase.auth.getSession();
                              await fetch('/api/trash/restore', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ trashId })
                              });
                              await loadTrash();
                              await loadDocuments();
                              taskDone('Restored');
                            }

                            async function deleteFromTrash(trashId) {
                              taskStart('Deleting...');
                              const { data: { session } } = await supabase.auth.getSession();
                              await fetch('/api/trash/delete', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ trashId })
                              });
                              await loadTrash();
                              taskDone('Deleted');
                            }

                            async function restoreAllFromTrash() {
                              if (trashItems.length === 0) return;
                              taskStart('Restoring all...');
                              const { data: { session } } = await supabase.auth.getSession();
                              for (const item of trashItems) {
                                await fetch('/api/trash/restore', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ trashId: item.id })
                                });
                              }
                              await loadTrash();
                              await loadDocuments();
                              taskDone('All restored');
                            }

                            async function deleteAllFromTrash() {
                              if (trashItems.length === 0) return;
                              taskStart('Deleting all...');
                              const { data: { session } } = await supabase.auth.getSession();
                              for (const item of trashItems) {
                                await fetch('/api/trash/delete', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ trashId: item.id })
                                });
                              }
                              await loadTrash();
                              taskDone('All deleted');
                            }

                            async function downloadDocument(path, fileName) {
                              const { data: { session } } = await supabase.auth.getSession();
                              const res = await fetch('/api/documents/download', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ path, fileName })
                              });
                              const result = await res.json();
                              if (result.signedUrl) {
                                const a = document.createElement('a');
                                a.href = result.signedUrl;
                                a.download = fileName;
                                a.click();
                              } else if (result.requiresNda) {
                                window.location.href = '/nda';
                              }
                            }

                            async function createFolder(parentFolderPath, folderName, isRestricted, isInternal = false) {
                              const folderPath = parentFolderPath ? `${parentFolderPath}/${folderName}` : folderName;
                              const { data: { session } } = await supabase.auth.getSession();
                              taskStart('Creating folder...');
                              await fetch('/api/folders', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ folderPath, isRestricted, isInternal })
                              });
                              setCreatingFolderIn(null);
                              setNewFolderName('');
                              await loadDocuments();
                              taskDone('Folder created');
                            }

                            async function saveFolderOrder(newOrder) {
                              const { data: { session } } = await supabase.auth.getSession();
                              await fetch('/api/folder-order', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ order: newOrder })
                              });
                            }

                            function taskStart(message) {
                              if (taskTimerRef.current) clearTimeout(taskTimerRef.current);
                              setTaskToast({ message, status: 'loading' });
                            }
                            function taskDone(message, status = 'success') {
                              if (taskTimerRef.current) clearTimeout(taskTimerRef.current);
                              setTaskToast({ message, status });
                              taskTimerRef.current = setTimeout(() => setTaskToast(null), 2500);
                            }

                            async function loadUserRecents() {
                              const { data: { session } } = await supabase.auth.getSession();
                              const response = await fetch('/api/activity/user-recents', {
                                headers: { authorization: `Bearer ${session.access_token}` }
                              });
                              const result = await response.json();
                              if (result.recents) setUserRecents(result.recents);
                            }

                            async function loadLinks() {
                              const { data: { session } } = await supabase.auth.getSession();
                              const res = await fetch('/api/links', { headers: { authorization: `Bearer ${session.access_token}` } });
                              const result = await res.json();
                              if (result.links) setLinks(result.links);
                            }

                            async function createLink() {
                              if (!linkName.trim() || !linkUrl.trim()) return;
                              const name = linkName.trim();
                              const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
                              const targetFolder = linkTargetFolder;
                              setAddingLink(false);
                              setLinkTargetFolder(null);
                              setLinkName('');
                              setLinkUrl('');

                              const { data: { session } } = await supabase.auth.getSession();

                              if (targetFolder) {
                                // Direct save to folder — no Sol sorting
                                taskStart('Saving link...');
                                const saveRes = await fetch('/api/links', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name, url, folder: targetFolder, restricted: false, internal: false })
                                });
                                const saveResult = await saveRes.json();
                                if (!saveResult.error) {
                                  setLinks(prev => [...prev, saveResult.link]);
                                  taskDone('Link saved');
                                } else {
                                  taskDone('Failed to save link', 'error');
                                }
                                return;
                              }

                              // Sol-sort (root level)
                              taskStart('Sorting link...');
                              const sortRes = await fetch('/api/sort-link', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name, url })
                              });
                              const sortResult = await sortRes.json();
                              if (sortResult.error) { taskDone('Failed to sort link', 'error'); return; }
                              taskStart('Saving link...');
                              const saveRes = await fetch('/api/links', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name, url, folder: sortResult.folder, restricted: sortResult.isRestricted, internal: false })
                              });
                              const saveResult = await saveRes.json();
                              if (!saveResult.error) {
                                setLinks(prev => [...prev, saveResult.link]);
                                setDropFolder(sortResult.folder);
                                const folderLabel = sortResult.folder.replace(/_/g, ' ').replace(/^\d+\s+/, '');
                                taskDone(`Link saved to ${folderLabel}`);
                              } else {
                                taskDone('Failed to save link', 'error');
                              }
                            }

                            async function deleteLink(id) {
                              const { data: { session } } = await supabase.auth.getSession();
                              await fetch('/api/links', {
                                method: 'DELETE',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id })
                              });
                              setLinks(prev => prev.filter(l => l.id !== id));
                            }

                            async function loadPrivateItems() {
                              const { data: { session } } = await supabase.auth.getSession();
                              const res = await fetch('/api/private', { headers: { authorization: `Bearer ${session.access_token}` } });
                              const result = await res.json();
                              if (result.items) setPrivateItems(result.items);
                            }

                            async function createPrivateItem() {
                              if (!privateTitle.trim() || !privateContent.trim() || !addingPrivate) return;
                              const { data: { session } } = await supabase.auth.getSession();
                              const content = addingPrivate === 'link' && !privateContent.trim().startsWith('http')
                                ? `https://${privateContent.trim()}` : privateContent.trim();
                              const res = await fetch('/api/private', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: addingPrivate, title: privateTitle.trim(), content })
                              });
                              const result = await res.json();
                              if (!result.error) {
                                setPrivateItems(prev => [result.item, ...prev]);
                                setPrivateTitle('');
                                setPrivateContent('');
                                setAddingPrivate(null);
                              } else {
                                taskDone('Failed to save: ' + result.error, 'error');
                              }
                            }

                            async function deletePrivateItem(id) {
                              const { data: { session } } = await supabase.auth.getSession();
                              await fetch('/api/private', {
                                method: 'DELETE',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id })
                              });
                              setPrivateItems(prev => prev.filter(i => i.id !== id));
                            }

                            async function loadPrivateFiles(userId, subfolder) {
                              setPrivateFilesLoading(true);
                              const { data: { session } } = await supabase.auth.getSession();
                              const params = new URLSearchParams();
                              if (userId) params.set('userId', userId);
                              if (subfolder) params.set('subfolder', subfolder);
                              const qs = params.toString();
                              const res = await fetch(`/api/private-files${qs ? '?' + qs : ''}`, { headers: { authorization: `Bearer ${session.access_token}` } });
                              const result = await res.json();
                              if (result.files) setPrivateFiles(result.files);
                              setPrivateFilesLoading(false);
                            }

                            async function loadPrivateFolderTree(userId) {
                              const { data: { session } } = await supabase.auth.getSession();
                              const params = new URLSearchParams();
                              if (userId) params.set('userId', userId);
                              params.set('recursive', 'true');
                              const res = await fetch(`/api/private-files?${params}`, { headers: { authorization: `Bearer ${session.access_token}` } });
                              const result = await res.json();
                              if (result.folderPaths) {
                                const map = {};
                                result.folderPaths.forEach(fp => {
                                  const parts = fp.split('/');
                                  const parentPath = parts.slice(0, -1).join('/');
                                  const childName = parts[parts.length - 1];
                                  if (!map[parentPath]) map[parentPath] = new Set();
                                  map[parentPath].add(childName);
                                });
                                setPrivateSubfolderMap(map);
                              }
                            }

                            async function deletePrivateFile(path) {
                              const { data: { session } } = await supabase.auth.getSession();
                              await fetch('/api/private-files', {
                                method: 'DELETE',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ path })
                              });
                              setPrivateFiles(prev => prev.filter(f => f.path !== path));
                            }

                            async function handlePrivateFileDrop(file) {
                              if (!file) return;
                              setPrivateDropStatus('uploading');
                              setPrivateDropMessage('Uploading...');
                              taskStart('Uploading to private...');
                              const { data: { session } } = await supabase.auth.getSession();
                              const form = new FormData();
                              form.append('file', file);
                              form.append('isPrivate', 'true');
                              if (privateActiveSubfolder) form.append('privateSubfolder', privateActiveSubfolder);
                              const res = await fetch('/api/upload', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}` },
                                body: form
                              });
                              const result = await res.json();
                              if (result.error) {
                                setPrivateDropStatus('error');
                                setPrivateDropMessage('Upload failed: ' + result.error);
                                taskDone('Upload failed', 'error');
                              } else {
                                setPrivateDropStatus('done');
                                setPrivateDropMessage('Uploaded.');
                                taskDone('Uploaded to private');
                                await loadPrivateFiles(selectedPrivateUserId, privateActiveSubfolder);
                              }
                              setTimeout(() => { setPrivateDropStatus(''); setPrivateDropMessage(''); }, 3000);
                            }

                            async function renamePrivateFile(file, newName) {
                              const trimmed = newName.trim();
                              setRenamingPrivateFilePath(null);
                              if (!trimmed || trimmed === file.name) return;
                              const { data: { session } } = await supabase.auth.getSession();
                              taskStart('Renaming...');
                              const res = await fetch('/api/private-files', {
                                method: 'PATCH',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ path: file.path, newName: trimmed })
                              });
                              const result = await res.json();
                              if (!result.error) {
                                setPrivateFiles(prev => prev.map(f => f.path === file.path ? { ...f, name: trimmed, path: result.newPath } : f));
                                taskDone('Renamed');
                              } else {
                                taskDone('Rename failed', 'error');
                              }
                            }


                            // Fix: reload from server after folder creation (not just optimistic)
                            async function createPrivateFolderFixed() {
                              const name = newPrivateFolderName.trim();
                              if (!name) return;
                              setCreatingPrivateFolder(false);
                              setNewPrivateFolderName('');
                              const fullPath = privateActiveSubfolder ? `${privateActiveSubfolder}/${name}` : name;
                              const { data: { session } } = await supabase.auth.getSession();
                              taskStart('Creating folder...');
                              const res = await fetch('/api/private-files', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ folderName: fullPath, userId: selectedPrivateUserId || undefined })
                              });
                              const result = await res.json();
                              if (!result.error) {
                                taskDone('Folder created');
                                await loadPrivateFolderTree(selectedPrivateUserId);
                              } else {
                                taskDone('Failed to create folder', 'error');
                              }
                            }

                            async function renamePrivateSubfolder(oldPath, newName) {
                              const trimmed = newName.trim();
                              if (!trimmed) return;
                              const parts = oldPath.split('/');
                              const newPath = [...parts.slice(0, -1), trimmed].join('/');
                              if (newPath === oldPath) return;
                              taskStart('Renaming folder...');
                              const { data: { session } } = await supabase.auth.getSession();
                              const userId = selectedPrivateUserId || user.id;

                              // Get all folder paths under oldPath (including oldPath itself)
                              const treeParams = new URLSearchParams();
                              if (selectedPrivateUserId) treeParams.set('userId', selectedPrivateUserId);
                              treeParams.set('recursive', 'true');
                              const treeRes = await fetch(`/api/private-files?${treeParams}`, { headers: { authorization: `Bearer ${session.access_token}` } });
                              const treeResult = await treeRes.json();
                              const allFolderPaths = [oldPath, ...(treeResult.folderPaths || []).filter(fp => fp.startsWith(oldPath + '/'))];

                              // Move files in every folder (direct files only per folder — combined covers all depths)
                              for (const folderPath of allFolderPaths) {
                                const params = new URLSearchParams();
                                if (selectedPrivateUserId) params.set('userId', selectedPrivateUserId);
                                params.set('subfolder', folderPath);
                                const res = await fetch(`/api/private-files?${params}`, { headers: { authorization: `Bearer ${session.access_token}` } });
                                const result = await res.json();
                                for (const f of (result.files || [])) {
                                  const relFolder = f.path.split('/').slice(2, -1).join('/');
                                  const newRelFolder = newPath + relFolder.slice(oldPath.length);
                                  const newFilePath = `private/${userId}/${newRelFolder}/${f.path.split('/').pop()}`;
                                  await fetch('/api/private-files', {
                                    method: 'PATCH',
                                    headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ path: f.path, newPath: newFilePath })
                                  });
                                }
                                // Recreate .keep at new path
                                const newFolderPath = newPath + folderPath.slice(oldPath.length);
                                await fetch('/api/private-files', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ folderName: newFolderPath, userId: selectedPrivateUserId || undefined })
                                });
                                // Delete old .keep
                                await fetch('/api/private-files', {
                                  method: 'DELETE',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ path: `private/${userId}/${folderPath}/.keep` })
                                });
                              }

                              if (privateActiveSubfolder === oldPath || privateActiveSubfolder?.startsWith(oldPath + '/')) {
                                setPrivateActiveSubfolder(newPath + (privateActiveSubfolder || '').slice(oldPath.length));
                              }
                              await loadPrivateFolderTree(selectedPrivateUserId);
                              taskDone('Folder renamed');
                            }

                            async function deletePrivateSubfolder(subPath) {
                              taskStart('Deleting folder...');
                              const { data: { session } } = await supabase.auth.getSession();
                              const userId = selectedPrivateUserId || user.id;

                              // Get all nested folder paths (including subPath itself)
                              const treeParams = new URLSearchParams();
                              if (selectedPrivateUserId) treeParams.set('userId', selectedPrivateUserId);
                              treeParams.set('recursive', 'true');
                              const treeRes = await fetch(`/api/private-files?${treeParams}`, { headers: { authorization: `Bearer ${session.access_token}` } });
                              const treeResult = await treeRes.json();
                              const allFolderPaths = [subPath, ...(treeResult.folderPaths || []).filter(fp => fp.startsWith(subPath + '/'))];

                              // Delete files and .keep in every folder
                              for (const folderPath of allFolderPaths) {
                                const params = new URLSearchParams();
                                if (selectedPrivateUserId) params.set('userId', selectedPrivateUserId);
                                params.set('subfolder', folderPath);
                                const res = await fetch(`/api/private-files?${params}`, { headers: { authorization: `Bearer ${session.access_token}` } });
                                const result = await res.json();
                                for (const f of (result.files || [])) {
                                  await fetch('/api/private-files', {
                                    method: 'DELETE',
                                    headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ path: f.path })
                                  });
                                }
                                await fetch('/api/private-files', {
                                  method: 'DELETE',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ path: `private/${userId}/${folderPath}/.keep` })
                                });
                              }

                              if (privateActiveSubfolder === subPath || privateActiveSubfolder?.startsWith(subPath + '/')) {
                                setPrivateActiveSubfolder(null);
                                await loadPrivateFiles(selectedPrivateUserId, null);
                              }
                              await loadPrivateFolderTree(selectedPrivateUserId);
                              taskDone('Folder deleted');
                            }

                            async function renameLink(id, newName) {
                              const trimmed = newName.trim();
                              setRenamingLinkId(null);
                              if (!trimmed) return;
                              const { data: { session } } = await supabase.auth.getSession();
                              taskStart('Renaming...');
                              const res = await fetch('/api/links', {
                                method: 'PATCH',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id, name: trimmed })
                              });
                              const result = await res.json();
                              if (!result.error) {
                                setLinks(prev => prev.map(l => l.id === id ? { ...l, name: trimmed } : l));
                                taskDone('Link renamed');
                              } else {
                                taskDone('Rename failed', 'error');
                              }
                            }

                            async function renamePrivateItem(id, newTitle) {
                              const trimmed = newTitle.trim();
                              setRenamingPrivateItemId(null);
                              if (!trimmed) return;
                              const { data: { session } } = await supabase.auth.getSession();
                              const res = await fetch('/api/private', {
                                method: 'PATCH',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id, title: trimmed })
                              });
                              const result = await res.json();
                              if (!result.error) {
                                setPrivateItems(prev => prev.map(i => i.id === id ? { ...i, title: trimmed } : i));
                                taskDone('Renamed');
                              } else {
                                taskDone('Rename failed', 'error');
                              }
                            }

                            async function saveTopFolderName(original, display) {
                              const trimmed = display.trim();
                              setRenamingTopFolder(null);
                              if (!trimmed || trimmed === (folderNames[original] || original.replace(/_/g, ' ').replace(/^\d+\s+/, ''))) return;
                              const { data: { session } } = await supabase.auth.getSession();
                              await fetch('/api/folder-names', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ original, display: trimmed })
                              });
                              setFolderNames(prev => ({ ...prev, [original]: trimmed }));
                            }

                            async function deleteTopLevelFolder(folderName, displayName) {
                              if (!confirm(`Delete folder "${displayName}"? All files inside will be moved to trash.`)) return;
                              setContextMenu(null);
                              taskStart('Moving files to trash...');
                              const folderDocs = documents.filter(d => d.path.split('/')[1] === folderName);
                              const { data: { session } } = await supabase.auth.getSession();
                              for (const doc of folderDocs) {
                                await fetch('/api/trash', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ path: doc.path, name: doc.name })
                                });
                              }
                              if (folderNames[folderName]) {
                                await fetch('/api/folder-names', {
                                  method: 'DELETE',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ original: folderName })
                                });
                                setFolderNames(prev => { const n = { ...prev }; delete n[folderName]; return n; });
                              }
                              await loadDocuments();
                              taskDone(`"${displayName}" moved to trash`);
                            }

                            async function loadActivity() {
                              setActivityLoading(true);
                              const { data: { session } } = await supabase.auth.getSession();
                              const response = await fetch('/api/activity', {
                                headers: { authorization: `Bearer ${session.access_token}` }
                              });
                              const result = await response.json();
                              if (result.logs) setActivityLogs(result.logs);
                              setActivityLoading(false);
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
                                setUserRecents(prev => ({ ...prev, [fileName]: new Date().toISOString() }));
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
                              taskStart('Uploading file...');
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
                                taskDone('Upload failed', 'error');
                              } else {
                                setUploadMessage('File uploaded successfully.');
                                taskDone('File uploaded');
                                setUploadFile(null); setUploadFolder(''); setUploadRestricted(false);
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

                              // If inside a folder, skip Sol and upload directly to current location
                              if (activeFolder) {
                                const topFolder = activeFolder.split('/')[0];
                                const isInternal = folderPaths.some(fp => fp.startsWith('internal/') && fp.split('/')[1] === topFolder);
                                const isRestricted = dropRestricted || folderPaths.some(fp => fp.startsWith('restricted/') && fp.split('/')[1] === topFolder);
                                const folderLabel = activeFolder.split('/').pop().replace(/_/g, ' ').replace(/^\d+\s+/, '');
                                setDropStatus('uploading');
                                setDropStatusMessage(`Uploading to ${folderLabel}...`);
                                taskStart(`Uploading to ${folderLabel}...`);
                                const uploadForm = new FormData();
                                uploadForm.append('file', file);
                                uploadForm.append('folder', activeFolder);
                                uploadForm.append('isRestricted', isRestricted.toString());
                                uploadForm.append('isInternal', isInternal.toString());
                                const uploadResponse = await fetch('/api/upload', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}` },
                                  body: uploadForm
                                });
                                const uploadResult = await uploadResponse.json();
                                if (uploadResult.error) {
                                  setDropStatus('error');
                                  setDropStatusMessage('Upload error: ' + uploadResult.error);
                                  taskDone('Upload failed', 'error');
                                  setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); }, 4000);
                                  return;
                                }
                                setDropStatus('done');
                                setDropStatusMessage('Done.');
                                setDropFolder(activeFolder);
                                setDropRestricted(false);
                                taskDone('Upload complete');
                                await loadDocuments();
                                await loadDiligence();
                                setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); setDropFolder(null); }, 5000);
                                return;
                              }

                              // Document Library — use Sol auto-sort
                              setDropStatus('sorting');
                              setDropStatusMessage('Sorting with Sol...');
                              taskStart('Sorting with Sol...');
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
                                taskDone('Upload failed', 'error');
                                setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); }, 4000);
                                return;
                              }
                              if (sortResult.error) {
                                setDropStatus('error');
                                setDropStatusMessage('Sort error: ' + sortResult.error);
                                taskDone('Upload failed', 'error');
                                setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); }, 4000);
                                return;
                              }

                              const { folder, isRestricted } = sortResult;
                              const folderLabel = folder.split('/').pop();
                              setDropStatus('uploading');
                              setDropStatusMessage(`Uploading to ${folderLabel}...`);
                              taskStart(`Uploading to ${folderLabel}...`);
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
                                taskDone('Upload failed', 'error');
                                setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); }, 4000);
                                return;
                              }

                              setDropStatus('done');
                              setDropStatusMessage('Done.');
                              setDropFolder(folder);
                              taskDone('Upload complete');
                              await loadDocuments();
                              await loadDiligence();
                              setTimeout(() => { setDropStatus(''); setDropStatusMessage(''); setDropFolder(null); }, 5000);
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
                              taskStart('Moving file...');
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
                              taskDone(result.error ? 'Move failed' : 'File moved', result.error ? 'error' : 'success');
                            }

                            async function handleMoveFolder({ topFolder, sub }, targetFolder) {
                              if (targetFolder === topFolder) return;
                              const folderDocs = documents.filter(doc => {
                                const p = doc.path.split('/');
                                return p[1] === topFolder && p[2] === sub;
                              });
                              if (folderDocs.length === 0) return;
                              taskStart('Moving folder...');
                              const { data: { session } } = await supabase.auth.getSession();
                              for (const doc of folderDocs) {
                                const p = doc.path.split('/');
                                p[1] = targetFolder;
                                const newPath = p.join('/');
                                await fetch('/api/documents/move', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ oldPath: doc.path, newPath })
                                });
                              }
                              await loadDocuments();
                              taskDone('Folder moved');
                            }

                            async function handleRenameDoc(doc, newName) {
                              const trimmed = newName.trim();
                              setRenamingDocPath(null);
                              if (!trimmed || trimmed === doc.name) return;
                              const parts = doc.path.split('/');
                              parts[parts.length - 1] = trimmed;
                              const newPath = parts.join('/');
                              const { data: { session } } = await supabase.auth.getSession();
                              taskStart('Renaming...');
                              const response = await fetch('/api/documents/move', {
                                method: 'POST',
                                headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ oldPath: doc.path, newPath })
                              });
                              const result = await response.json();
                              if (!result.error) {
                                setDocuments(prev => prev.map(d =>
                                  d.path === doc.path ? { ...d, name: trimmed, path: newPath } : d
                                ));
                                setUserRecents(prev => {
                                  if (!prev[doc.name]) return prev;
                                  const next = { ...prev, [trimmed]: prev[doc.name] };
                                  delete next[doc.name];
                                  return next;
                                });
                                taskDone('Renamed');
                              } else {
                                taskDone('Rename failed', 'error');
                              }
                            }

                            async function downloadFolder(topFolder, sub) {
                              const folderDocs = documents.filter(doc => {
                                const p = doc.path.split('/');
                                return p[1] === topFolder && p[2] === sub;
                              });
                              if (folderDocs.length === 0) return;
                              const JSZip = window.JSZip;
                              if (!JSZip) { alert('Download not ready, please try again.'); return; }
                              const zip = new JSZip();
                              const { data: { session } } = await supabase.auth.getSession();
                              for (const doc of folderDocs) {
                                const res = await fetch('/api/documents/download', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ path: doc.path, fileName: doc.name })
                                });
                                const result = await res.json();
                                if (result.signedUrl) {
                                  const fileRes = await fetch(result.signedUrl);
                                  const blob = await fileRes.blob();
                                  zip.file(doc.name, blob);
                                }
                              }
                              const content = await zip.generateAsync({ type: 'blob' });
                              const a = document.createElement('a');
                              a.href = URL.createObjectURL(content);
                              a.download = `${sub.replace(/^\d+\s+/, '')}.zip`;
                              a.click();
                            }

                            async function moveFolderToTrash(folderPath) {
                              // folderPath = 'TopFolder/Sub' or 'TopFolder/Sub/NestedSub' (no prefix)
                              taskStart('Moving folder to trash...');
                              const folderDocs = documents.filter(doc => {
                                const p = doc.path.split('/');
                                const docFolder = p.slice(1, -1).join('/');
                                return docFolder === folderPath || docFolder.startsWith(folderPath + '/');
                              });
                              const { data: { session } } = await supabase.auth.getSession();
                              for (const doc of folderDocs) {
                                await fetch('/api/trash', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ path: doc.path, fileName: doc.name })
                                });
                              }
                              // Delete all .keep placeholders for this folder and its subfolders
                              const matchingPaths = folderPaths.filter(fp => {
                                const noPrefix = fp.split('/').slice(1).join('/');
                                return noPrefix === folderPath || noPrefix.startsWith(folderPath + '/');
                              });
                              for (const fp of matchingPaths) {
                                await fetch('/api/folders', {
                                  method: 'DELETE',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ keepPath: `${fp}/.keep` })
                                });
                              }
                              if (activeFolder === folderPath || activeFolder?.startsWith(folderPath + '/')) {
                                setActiveFolder(folderPath.split('/').slice(0, -1).join('/') || null);
                              }
                              await loadDocuments();
                              taskDone('Moved to trash');
                            }

                            async function moveTopFolderToTrash(folderName) {
                              taskStart('Moving folder to trash...');
                              const folderDocs = documents.filter(doc => doc.path.split('/')[1] === folderName);
                              const { data: { session } } = await supabase.auth.getSession();
                              for (const doc of folderDocs) {
                                await fetch('/api/trash', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ path: doc.path, fileName: doc.name })
                                });
                              }
                              // Delete all .keep placeholders for this top-level folder and its subfolders
                              const keepPaths = folderPaths.filter(fp => fp.split('/')[1] === folderName);
                              for (const fp of keepPaths) {
                                await fetch('/api/folders', {
                                  method: 'DELETE',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ keepPath: `${fp}/.keep` })
                                });
                              }
                              // Remove from folder order
                              const newOrder = folderOrder.filter(f => f !== folderName);
                              setFolderOrder(newOrder);
                              await saveFolderOrder(newOrder);
                              if (activeFolder === folderName || activeFolder?.startsWith(folderName + '/')) {
                                setActiveFolder(null);
                              }
                              await loadDocuments();
                              taskDone('Folder moved to trash');
                            }

                            async function renameFolder(topFolder, oldSub, newSub) {
                              const trimmed = newSub.trim();
                              setRenamingFolderPath(null);
                              if (!trimmed || trimmed === oldSub) return;
                              taskStart('Renaming folder...');
                              const oldFullPath = `${topFolder}/${oldSub}`;
                              const newFullPath = `${topFolder}/${trimmed}`;
                              // Optimistic update
                              setDocuments(prev => prev.map(d => {
                                const p = d.path.split('/');
                                const docFolder = p.slice(1, -1).join('/');
                                if (docFolder === oldFullPath || docFolder.startsWith(oldFullPath + '/')) {
                                  const newDocFolder = newFullPath + docFolder.slice(oldFullPath.length);
                                  return { ...d, path: p[0] + '/' + newDocFolder + '/' + p[p.length - 1] };
                                }
                                return d;
                              }));
                              setFolderPaths(prev => prev.map(fp => {
                                const parts = fp.split('/');
                                const noPrefix = parts.slice(1).join('/');
                                if (noPrefix === oldFullPath || noPrefix.startsWith(oldFullPath + '/')) {
                                  return parts[0] + '/' + newFullPath + noPrefix.slice(oldFullPath.length);
                                }
                                return fp;
                              }));
                              if (activeFolder === oldFullPath || activeFolder?.startsWith(oldFullPath + '/')) {
                                setActiveFolder(newFullPath + (activeFolder || '').slice(oldFullPath.length));
                              }
                              // API calls (use original documents/folderPaths captured before state updates)
                              const folderDocs = documents.filter(doc => {
                                const p = doc.path.split('/');
                                const docFolder = p.slice(1, -1).join('/');
                                return docFolder === oldFullPath || docFolder.startsWith(oldFullPath + '/');
                              });
                              const folderFullPath = folderPaths.find(fp => fp.split('/').slice(1).join('/') === oldFullPath);
                              const { data: { session } } = await supabase.auth.getSession();
                              for (const doc of folderDocs) {
                                const p = doc.path.split('/');
                                const docFolder = p.slice(1, -1).join('/');
                                const newDocFolder = newFullPath + docFolder.slice(oldFullPath.length);
                                const newPath = p[0] + '/' + newDocFolder + '/' + p[p.length - 1];
                                await fetch('/api/documents/move', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ oldPath: doc.path, newPath })
                                });
                              }
                              // Move the .keep placeholder
                              if (folderFullPath) {
                                const isRestricted = folderFullPath.startsWith('restricted');
                                const isInternal = folderFullPath.startsWith('internal');
                                await fetch('/api/folders', {
                                  method: 'DELETE',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ keepPath: `${folderFullPath}/.keep` })
                                });
                                await fetch('/api/folders', {
                                  method: 'POST',
                                  headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ folderPath: newFullPath, isRestricted, isInternal })
                                });
                              }
                              taskDone('Folder renamed');
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
    const r = 5.5, cx = 9, cy = 9, circ = 2 * Math.PI * r;
    return (
      <div style={{ minHeight: '100vh', background: '#080808' }}>
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: '16px', background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '20px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', fontFamily: 'Exo 2, sans-serif', whiteSpace: 'nowrap' }}>
          <svg width="28" height="28" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(34,197,94,0.2)" strokeWidth="2"/>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="2"
              strokeDasharray={`${circ * 0.65} ${circ * 0.35}`}
              strokeLinecap="round"
              style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'spin 0.9s linear infinite' }}/>
          </svg>
          <span style={{ fontSize: '18px', color: '#aaa' }}>Logging you in...</span>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isAdmin = user.email === ADMIN_EMAIL || profile.is_admin === true;
  const isPostNda = profile.role === 'post_nda_investor' || profile.role === 'post_nda_employee';
  const isEmployee = profile.role === 'pre_nda_employee' || profile.role === 'post_nda_employee';

  const FALLBACK_FOLDERS = ['00_START_HERE','01_Pitch_and_Overview','02_Market_Opportunity','03_Product_Technology','04_Traction','05_Financials','06_Legal','07_Team','08_Fundraising','09_Investor_Updates','10_Appendix'];
  const allTopFolders = [...new Set(folderPaths.filter(fp => fp.split('/').length === 2).map(fp => fp.split('/')[1]))];
  const baseFolders = [...new Set([...FALLBACK_FOLDERS, ...allTopFolders])];
  const folders = folderOrder.length > 0
    ? [...folderOrder.filter(f => baseFolders.includes(f)), ...baseFolders.filter(f => !folderOrder.includes(f))]
    : baseFolders;

  const internalFolderNames = new Set(folderPaths.filter(fp => fp.startsWith('internal/')).map(fp => fp.split('/')[1]));
  const publicFolders = folders.filter(f => !internalFolderNames.has(f));
  const internalFolders = folders.filter(f => internalFolderNames.has(f));

  // Build subfolder map from folderPaths (includes empty folders, all depths)
  // Key = parent path without prefix (e.g. 'TopFolder' or 'TopFolder/Sub')
  // Value = Set of direct child names
  const subfolderMap = {};
  folderPaths.forEach(fp => {
    const parts = fp.split('/');
    // parts[0] = prefix (general/restricted/internal), parts[1..] = folder path
    if (parts.length >= 3) {
      const parentPath = parts.slice(1, -1).join('/'); // parent without prefix
      const childName = parts[parts.length - 1];
      if (!subfolderMap[parentPath]) subfolderMap[parentPath] = new Set();
      subfolderMap[parentPath].add(childName);
    }
  });

  // Investors cannot see internal documents at all
  const visibleDocuments = (isEmployee || isAdmin) ? documents : documents.filter(doc => !doc.internal);

  const filteredDocs = activeFolder
    ? (() => {
        if (activeFolder.includes('/')) {
          // Subfolder at any depth: only files directly inside this folder
          return visibleDocuments.filter(doc => {
            const p = doc.path.split('/');
            const docFolder = p.slice(1, -1).join('/');
            return docFolder === activeFolder;
          });
        }
        // Top-level folder: only direct files (not files inside subfolders)
        return visibleDocuments.filter(doc => {
          const p = doc.path.split('/');
          return p[1] === activeFolder && p.length === 3;
        });
      })()
    : visibleDocuments;

  const filteredLinks = activeFolder
    ? links.filter(l => l.folder === activeFolder && l.folder !== '__private__')
    : links.filter(l => l.folder !== '__private__');

  const groupedDocs = filteredDocs.reduce((groups, doc) => {
    const parts = doc.path.split('/');
    const folder = parts.slice(1, -1).join(' / ') || 'General';
    if (!groups[folder]) groups[folder] = [];
    groups[folder].push(doc);
    return groups;
  }, {});

  return (
    <div style={{ fontFamily: 'Exo 2, sans-serif', background: '#080808', minHeight: '100vh', display: 'flex', flexDirection: 'column', zoom: 1.2 }}>

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
              onClick={() => { setActiveTab(item.id); if (item.id === 'activity') loadActivity(); }}
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
              onClick={() => { setActiveTab(item.id); if (item.id === 'documents') { setActiveFolder(null); } if (item.id === 'activity') loadActivity(); }}
              data-tutorial={item.id === 'diligence' ? 'diligence-tab' : item.id === 'pitchdeck' ? 'pitchdeck-tab' : undefined}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', background: (activeTab === item.id && !(item.id === 'documents' && activeFolder)) ? 'rgba(59,130,246,0.1)' : 'none',
                border: 'none', borderLeft: (activeTab === item.id && !(item.id === 'documents' && activeFolder)) ? '2px solid #3b82f6' : '2px solid transparent',
                color: (activeTab === item.id && !(item.id === 'documents' && activeFolder)) ? '#fff' : '#999', cursor: 'pointer',
                fontSize: '15px', fontFamily: 'Exo 2, sans-serif',
                fontWeight: (activeTab === item.id && !(item.id === 'documents' && activeFolder)) ? '600' : '400',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          {/* Folders */}
          {(() => {
            // Recursive subfolder renderer for sidebar
            const renderSubFolders = (parentPath, depth, iconColor) => {
              const subs = subfolderMap[parentPath] ? [...subfolderMap[parentPath]].sort() : [];
              return subs.map(sub => {
                const subPath = `${parentPath}/${sub}`;
                const subActive = activeFolder === subPath && activeTab === 'documents';
                const isSubDragOver = dragOverFolder === subPath;
                const isSubExpanded = expandedFolders.has(subPath);
                const hasChildren = subfolderMap[subPath]?.size > 0;
                const indent = 22 + depth * 14;
                return (
                  <div key={subPath}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', background: isSubDragOver ? 'rgba(59,130,246,0.12)' : subActive ? 'rgba(255,255,255,0.04)' : 'none', borderLeft: isSubDragOver ? '2px solid #3b82f6' : subActive ? '2px solid #3b82f6' : '2px solid transparent', transition: 'background 0.1s' }}
                      onDragOver={(e) => { if (draggingDoc || draggingFolder) { e.preventDefault(); setDragOverFolder(subPath); } }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverFolder(null); }}
                      onDrop={(e) => { e.preventDefault(); setDragOverFolder(null); if (draggingDoc) handleMoveDoc(draggingDoc, subPath); if (draggingFolder) handleMoveFolder(draggingFolder, subPath); }}
                    >
                      <button
                        onClick={() => { setActiveFolder(subPath); setActiveTab('documents'); }}
                        onContextMenu={(isEmployee || isAdmin) ? (e) => { e.preventDefault(); const zoom = 1.2; setContextMenu({ type: 'sub', folderPath: subPath, x: e.clientX / zoom, y: e.clientY / zoom }); } : undefined}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: `7px 8px 7px ${indent}px`, background: 'none', border: 'none', color: isSubDragOver ? '#3b82f6' : subActive ? '#ddd' : '#666', cursor: 'pointer', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', textAlign: 'left', transition: 'color 0.1s' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isSubDragOver ? '#3b82f6' : subActive ? '#ddd' : iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                        {sub.replace(/^\d+\s+/, '')}
                      </button>
                      {hasChildren && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedFolders(prev => { const n = new Set(prev); n.has(subPath) ? n.delete(subPath) : n.add(subPath); return n; }); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: subActive ? '#aaa' : '#555', padding: '7px 12px 7px 4px', lineHeight: 1, fontSize: '16px', transition: 'transform 0.2s, color 0.1s', transform: isSubExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-flex', alignItems: 'center' }}
                        >›</button>
                      )}
                    </div>
                    {isSubExpanded && renderSubFolders(subPath, depth + 1, iconColor)}
                  </div>
                );
              });
            };

            const renderFolderItem = (folder, iconColor) => {
              const isExpanded = expandedFolders.has(folder);
              const isInSubfolder = activeFolder?.startsWith(folder + '/') && activeTab === 'documents';
              const isActive = (activeFolder === folder && activeTab === 'documents') || (!isExpanded && isInSubfolder);
              const subs = subfolderMap[folder] ? [...subfolderMap[folder]].sort() : [];
              return (
                <div key={folder}>
                  <div
                    draggable={(isEmployee || isAdmin) && !draggingDoc && !draggingFolder}
                    onDragStart={(e) => { if (!draggingDoc && !draggingFolder) { e.dataTransfer.effectAllowed = 'move'; setReorderingFolder(folder); } }}
                    onDragEnd={() => { setReorderingFolder(null); setReorderDropTarget(null); }}
                    style={{
                      display: 'flex', alignItems: 'center',
                      background: dragOverFolder === folder ? 'rgba(59,130,246,0.12)' : isActive ? 'rgba(255,255,255,0.05)' : 'none',
                      borderLeft: dragOverFolder === folder ? '2px solid #3b82f6' : isActive ? '2px solid #3b82f6' : '2px solid transparent',
                      borderTop: reorderDropTarget === folder ? '2px solid #3b82f6' : '2px solid transparent',
                      transition: 'background 0.1s',
                      opacity: reorderingFolder === folder ? 0.4 : 1,
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (reorderingFolder && reorderingFolder !== folder) { setReorderDropTarget(folder); }
                      else if (draggingDoc || draggingFolder) { setDragOverFolder(folder); }
                    }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setDragOverFolder(null); setReorderDropTarget(null); } }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (reorderingFolder && reorderingFolder !== folder) {
                        const newOrder = [...folders];
                        const fromIdx = newOrder.indexOf(reorderingFolder);
                        const toIdx = newOrder.indexOf(folder);
                        if (fromIdx !== -1 && toIdx !== -1) { newOrder.splice(fromIdx, 1); newOrder.splice(toIdx, 0, reorderingFolder); }
                        setFolderOrder(newOrder);
                        saveFolderOrder(newOrder);
                      } else {
                        setDragOverFolder(null);
                        if (draggingDoc) handleMoveDoc(draggingDoc, folder);
                        if (draggingFolder) handleMoveFolder(draggingFolder, folder);
                      }
                      setReorderingFolder(null); setReorderDropTarget(null);
                    }}
                  >
                    <button
                      onClick={() => { setActiveFolder(folder); setActiveTab('documents'); }}
                      onContextMenu={(isEmployee || isAdmin) ? (e) => { e.preventDefault(); const zoom = 1.2; setContextMenu({ folder, x: e.clientX / zoom, y: e.clientY / zoom }); } : undefined}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 8px 9px 14px',
                        background: 'none', border: 'none',
                        color: dragOverFolder === folder ? '#3b82f6' : isActive ? '#fff' : iconColor,
                        cursor: 'pointer',
                        fontSize: '14px', fontFamily: 'Exo 2, sans-serif', textAlign: 'left',
                        fontWeight: isActive ? '600' : '400',
                        transition: 'color 0.1s',
                      }}
                    >
                      {iconColor === '#fb923c' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dragOverFolder === folder ? '#3b82f6' : isActive ? '#fff' : iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dragOverFolder === folder ? '#3b82f6' : isActive ? '#fff' : iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                      )}
                      {renamingTopFolder === folder ? (
                        <input
                          autoFocus
                          value={renameTopFolderValue}
                          onChange={e => setRenameTopFolderValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveTopFolderName(folder, renameTopFolderValue); if (e.key === 'Escape') setRenamingTopFolder(null); }}
                          onBlur={() => saveTopFolderName(folder, renameTopFolderValue)}
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: '13px', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', width: '100%' }}
                        />
                      ) : (folderNames[folder] || folder.replace(/_/g, ' ').replace(/^\d+\s+/, ''))}
                    </button>
                    {subs.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedFolders(prev => { const n = new Set(prev); n.has(folder) ? n.delete(folder) : n.add(folder); return n; }); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: isActive ? '#aaa' : '#555', padding: '9px 12px 9px 4px', lineHeight: 1, fontSize: '18px', transition: 'transform 0.2s, color 0.1s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-flex', alignItems: 'center' }}
                        title="Toggle subfolders"
                      >›</button>
                    )}
                  </div>
                  {isExpanded && renderSubFolders(folder, 1, iconColor)}
                </div>
              );
            };

            const groupHeader = (label, isOpen, toggle, accent) => (
              <button
                onClick={toggle}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 16px', marginBottom: '6px', background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: '600', color: accent || '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', margin: 0 }}>{label}</p>
                <span style={{ fontSize: '18px', color: accent || '#555', transition: 'transform 0.2s', display: 'inline-flex', alignItems: 'center', lineHeight: 1, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
              </button>
            );

            return (
              <div data-tutorial="folders" style={{ marginTop: '24px' }}>
                {/* Public folders group */}
                {groupHeader('FOLDERS', foldersGroupOpen, () => setFoldersGroupOpen(o => !o), '#555')}
                {foldersGroupOpen && publicFolders.map(f => renderFolderItem(f, '#888'))}

                {/* Internal folders group — employees/admins only */}
                {(isEmployee || isAdmin) && (
                  <div style={{ marginTop: '16px' }}>
                    {groupHeader('INTERNAL', internalGroupOpen, () => setInternalGroupOpen(o => !o), '#fb923c')}
                    {internalGroupOpen && internalFolders.map(f => renderFolderItem(f, '#fb923c'))}
                  </div>
                )}

                {/* Private workspace — employees and admin only */}
                {(isEmployee || isAdmin) && (<>
                <div style={{ margin: '16px 16px 6px', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                <div style={{
                  display: 'flex', alignItems: 'center',
                  borderLeft: activeTab === 'private' && !privateActiveSubfolder ? '2px solid #a855f7' : '2px solid transparent',
                  marginBottom: '6px',
                }}>
                  {/* Label — switches to private tab */}
                  <button
                    onClick={() => { setActiveTab('private'); setActiveFolder(null); setPrivateActiveSubfolder(null); setPrivateOpen(true); loadPrivateFiles(null, null); loadPrivateItems(); }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 8px 0 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#a855f7', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', margin: 0 }}>PRIVATE</p>
                  </button>
                  {/* Arrow — only toggles expand/collapse */}
                  <button
                    onClick={e => { e.stopPropagation(); setPrivateOpen(o => !o); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 14px 4px 4px', color: '#a855f7', fontSize: '18px', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', transform: privateOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>›</span>
                  </button>
                </div>
                {privateOpen && (() => {
                  const renderPrivateSubFolders = (parentPath, depth) => {
                    const subs = privateSubfolderMap[parentPath] ? [...privateSubfolderMap[parentPath]].sort() : [];
                    return subs.map(sub => {
                      const subPath = parentPath ? `${parentPath}/${sub}` : sub;
                      const subActive = activeTab === 'private' && privateActiveSubfolder === subPath;
                      const isExpanded = expandedPrivateFolders.has(subPath);
                      const hasChildren = privateSubfolderMap[subPath]?.size > 0;
                      const indent = 32 + depth * 14;
                      return (
                        <div key={subPath}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                              onClick={() => { setActiveTab('private'); setPrivateActiveSubfolder(subPath); setActiveFolder(null); loadPrivateFiles(selectedPrivateUserId, subPath); }}
                              onContextMenu={(e) => { e.preventDefault(); const zoom = 1.2; setContextMenu({ type: 'private-sub', sub: subPath, x: e.clientX / zoom, y: e.clientY / zoom }); }}
                              style={{
                                flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                                padding: `7px 16px 7px ${indent}px`,
                                background: subActive ? 'rgba(255,255,255,0.04)' : 'none',
                                border: 'none', borderLeft: subActive ? '2px solid #a855f7' : '2px solid transparent',
                                color: subActive ? '#c084fc' : '#666',
                                cursor: 'pointer', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', textAlign: 'left',
                                transition: 'background 0.1s, color 0.1s',
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                              </svg>
                              {sub}
                            </button>
                            {hasChildren && (
                              <button
                                onClick={e => { e.stopPropagation(); setExpandedPrivateFolders(prev => { const next = new Set(prev); if (next.has(subPath)) next.delete(subPath); else next.add(subPath); return next; }); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px 8px 4px 4px', fontSize: '16px', lineHeight: 1 }}
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>›</span>
                              </button>
                            )}
                          </div>
                          {isExpanded && renderPrivateSubFolders(subPath, depth + 1)}
                        </div>
                      );
                    });
                  };
                  return renderPrivateSubFolders('', 0);
                })()}
                </>)}

                {/* Recently Deleted */}
                {(isEmployee || isAdmin) && (
                  <>
                    <div style={{ margin: '10px 16px 6px', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                    <button
                      data-tutorial="trash-nav"
                      onClick={() => { setActiveFolder('__trash__'); setActiveTab('documents'); loadTrash(); }}
                      onDragOver={(e) => { if (draggingDoc || draggingFolder || reorderingFolder) { e.preventDefault(); setDragOverTrash(true); } }}
                      onDragLeave={() => setDragOverTrash(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTrash(false);
                        if (draggingDoc) { moveToTrash(draggingDoc.path, draggingDoc.name); setDraggingDoc(null); }
                        else if (draggingFolder) { moveFolderToTrash(`${draggingFolder.topFolder}/${draggingFolder.sub}`); setDraggingFolder(null); }
                        else if (reorderingFolder) { moveTopFolderToTrash(reorderingFolder); setReorderingFolder(null); }
                        setDragOverFolder(null);
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 16px',
                        background: dragOverTrash ? 'rgba(239,68,68,0.12)' : activeFolder === '__trash__' ? 'rgba(255,255,255,0.05)' : 'none',
                        border: 'none',
                        borderLeft: dragOverTrash ? '2px solid #ef4444' : activeFolder === '__trash__' ? '2px solid #ef4444' : '2px solid transparent',
                        color: dragOverTrash ? '#ef4444' : activeFolder === '__trash__' ? '#ef4444' : '#666',
                        cursor: 'pointer', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', textAlign: 'left',
                        transition: 'background 0.1s, color 0.1s',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                      Recently Deleted
                    </button>
                  </>
                )}
              </div>
            );
          })()}

        </div>

        {/* Main content */}
        <div style={{ overflowY: activeTab === 'sol' ? 'hidden' : 'auto', padding: activeTab === 'sol' ? '0' : '36px', position: 'relative', display: 'flex', flexDirection: 'column' }}>

          {/* Documents tab */}
          {activeTab === 'documents' && activeFolder === '__trash__' && (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>RECENTLY DELETED</h1>
                  <p style={{ fontSize: '14px', color: '#777' }}>Files are permanently deleted 30 days after being moved here.</p>
                </div>
                {trashItems.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexShrink: 0 }}>
                    <button onClick={() => restoreAllFromTrash()} style={{ padding: '7px 14px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', color: '#93c5fd', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Recover all</button>
                    <button onClick={() => { if (confirm('Permanently delete all items in trash?')) deleteAllFromTrash(); }} style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', color: '#f87171', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Delete all</button>
                  </div>
                )}
              </div>
              {trashLoading ? (
                <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif' }}>Loading...</p>
              ) : trashItems.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif' }}>No deleted files.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {trashItems.map((item) => {
                    const daysLeft = Math.max(0, Math.ceil((new Date(item.expires_at) - new Date()) / (1000 * 60 * 60 * 24)));
                    const folderLabel = item.original_path.split('/').slice(1, -1).join(' / ');
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '14px', fontWeight: '500', color: '#bbb', fontFamily: 'Exo 2, sans-serif', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file_name}</p>
                            <p style={{ fontSize: '11px', color: '#444', fontFamily: 'Exo 2, sans-serif', margin: '2px 0 0' }}>{folderLabel} · deleted by {item.trashed_by_email} · {daysLeft}d left</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '12px' }}>
                          <button onClick={() => restoreFromTrash(item.id)} style={{ fontSize: '13px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}>Restore</button>
                          <button onClick={() => { if (confirm('Permanently delete this file?')) deleteFromTrash(item.id); }} style={{ fontSize: '13px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Documents tab */}
          {activeTab === 'documents' && activeFolder !== '__trash__' && (
            <div onClick={() => { if (openMenuPath) setOpenMenuPath(null); if (openFolderMenu) setOpenFolderMenu(null); }}>
              <div data-tutorial="doc-library" style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    {activeFolder ? activeFolder.split('/').map(p => p.replace(/_/g, ' ').replace(/^\d+\s+/, '')).join(' / ') : 'DOCUMENT LIBRARY'}
                  </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  {(isEmployee || isAdmin) && !activeFolder && (
                    <button onClick={() => { setAddingLink(true); setLinkName(''); setLinkUrl(''); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#888', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      Add link
                    </button>
                  )}
                  <div data-tutorial="view-toggle" style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setDocView('list')} title="List view" style={{ padding: '7px 10px', background: docView === 'list' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)', border: docView === 'list' ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={docView === 'list' ? '#93c5fd' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </button>
                    <button onClick={() => setDocView('grid')} title="Grid view" style={{ padding: '7px 10px', background: docView === 'grid' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)', border: docView === 'grid' ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={docView === 'grid' ? '#93c5fd' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    </button>
                  </div>
                </div>
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
                    textAlign: 'center',
                    marginBottom: '28px',
                    height: '140px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <p style={{
                        fontSize: '14px',
                        fontFamily: 'Exo 2, sans-serif',
                        color: dropStatus === 'error' ? '#ef4444' : dropStatus === 'done' ? '#22c55e' : '#3b82f6',
                        margin: 0,
                      }}>
                        {dropStatusMessage}
                      </p>
                      {dropStatus === 'done' && dropFolder && !activeFolder && (
                        <button
                          onClick={() => { setActiveFolder(dropFolder); setActiveTab('documents'); }}
                          style={{ fontSize: '13px', color: '#93c5fd', background: 'none', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'Exo 2, sans-serif' }}
                        >
                          Go to folder →
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif', margin: 0 }}>
                          {activeFolder ? 'Drop a PDF here — file will be added to this folder' : 'Drop a PDF here — Sol will sort it automatically'}
                        </p>
                        {activeFolder && (() => {
                          const topFolder = activeFolder.split('/')[0];
                          const isAlreadyRestricted = folderPaths.some(fp => fp.startsWith('restricted/') && fp.split('/')[1] === topFolder);
                          const isAlreadyInternal = folderPaths.some(fp => fp.startsWith('internal/') && fp.split('/')[1] === topFolder);
                          if (isAlreadyRestricted || isAlreadyInternal) return null;
                          return (
                            <div onClick={(e) => { e.stopPropagation(); setDropRestricted(r => !r); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                              <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: dropRestricted ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.2)', background: dropRestricted ? '#a855f7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                {dropRestricted && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                              </div>
                              <span style={{ fontSize: '12px', color: dropRestricted ? '#a855f7' : '#555', fontFamily: 'Exo 2, sans-serif', transition: 'color 0.15s' }}>Post-NDA only</span>
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              )}


              {/* Action bar — back button + new folder, shown whenever employee/admin or inside a subfolder */}
              {(isEmployee || isAdmin || activeFolder?.includes('/')) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', minHeight: '34px' }}>
                  {/* Back button — invisible when not in a subfolder, but reserves space */}
                  <button
                    onClick={() => setActiveFolder(activeFolder?.split('/').slice(0, -1).join('/') || null)}
                    style={{
                      visibility: activeFolder?.includes('/') ? 'visible' : 'hidden',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'none', border: 'none', color: '#888', fontSize: '13px',
                      fontFamily: 'Exo 2, sans-serif', cursor: 'pointer', padding: '0',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    {activeFolder?.split('/').slice(0, -1).map(p => p.replace(/_/g, ' ').replace(/^\d+\s+/, '')).join(' / ')}
                  </button>
                  {/* New folder — right side */}
                  {(isEmployee || isAdmin) && (() => {
                    const folderKey = activeFolder || '__root__';
                    const folderParent = activeFolder || null;
                    const topFolder = activeFolder?.split('/')[0];
                    const isInternalContext = activeFolder && folderPaths.some(fp => fp.startsWith('internal/') && fp.split('/')[1] === topFolder);
                    const isRestrictedContext = activeFolder && folderPaths.some(fp => fp.startsWith('restricted/') && fp.split('/')[1] === topFolder);
                    const doCreate = () => { if (newFolderName.trim()) createFolder(folderParent, newFolderName.trim(), isRestrictedContext || newFolderAccess === 'restricted', isInternalContext || newFolderAccess === 'internal'); };
                    return creatingFolderIn === folderKey ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) doCreate(); if (e.key === 'Escape') { setCreatingFolderIn(null); setNewFolderName(''); } }} placeholder="Folder name..." style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '6px', color: '#fff', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', outline: 'none', width: '160px' }} />
                        {!isInternalContext && !isRestrictedContext && (
                          <select value={newFolderAccess} onChange={(e) => setNewFolderAccess(e.target.value)} style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#aaa', fontSize: '12px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer', outline: 'none' }}>
                            <option value="public">Public</option>
                            <option value="restricted">Restricted</option>
                            <option value="internal">Internal</option>
                          </select>
                        )}
                        <button onClick={doCreate} style={{ padding: '7px 14px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Create</button>
                        <button onClick={() => { setCreatingFolderIn(null); setNewFolderName(''); }} style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#777', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => { setAddingLink(true); setLinkTargetFolder(activeFolder); setLinkName(''); setLinkUrl(''); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#888', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          Add link
                        </button>
                        <button onClick={() => setCreatingFolderIn(folderKey)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '6px', color: '#93c5fd', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          New folder
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {docsLoading ? (
                <p style={{ fontSize: '14px', color: '#777' }}>Loading documents...</p>
              ) : Object.keys(groupedDocs).length === 0 && !(activeFolder && subfolderMap[activeFolder]?.size > 0) ? (
                <>
                  {filteredLinks.length === 0 && <p style={{ fontSize: '14px', color: '#777' }}>No documents available yet.</p>}
                  {filteredLinks.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', padding: '6px 18px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>LINKS</span>
                        <span /><span />
                      </div>
                      {filteredLinks.map(link => (
                        <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', alignItems: 'center', padding: '11px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: renamingLinkId === link.id ? 'default' : 'pointer' }} onClick={() => renamingLinkId !== link.id && window.open(link.url, '_blank')}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            {renamingLinkId === link.id ? <input autoFocus value={renameLinkValue} onChange={e => setRenameLinkValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameLink(link.id, renameLinkValue); if (e.key === 'Escape') setRenamingLinkId(null); }} onBlur={() => renameLink(link.id, renameLinkValue)} onClick={e => e.stopPropagation()} style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }} /> : <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.name}</span>}
                          </div>
                          <span />
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            {(isEmployee || isAdmin) && (
                              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                <button onClick={e => { e.stopPropagation(); setOpenMenuPath(openMenuPath === link.id ? null : link.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                {openMenuPath === link.id && (
                                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                    <button onClick={() => { setOpenMenuPath(null); window.open(link.url, '_blank'); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                    <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/>
                                    <button onClick={() => { setOpenMenuPath(null); if (confirm(`Remove link "${link.name}"?`)) deleteLink(link.id); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Remove</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : Object.keys(groupedDocs).length === 0 && activeFolder && subfolderMap[activeFolder]?.size > 0 ? (() => {
                const subs = [...subfolderMap[activeFolder]].sort();
                return (
                  <>
                    {docView === 'grid' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                        {subs.map(sub => {
                          const folderPath = `${activeFolder}/${sub}`;
                          const isRenaming = renamingFolderPath === folderPath;
                          return (
                            <div
                              key={sub}
                              draggable={isEmployee || isAdmin}
                              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingFolder({ topFolder: activeFolder, sub }); }}
                              onDragEnd={() => { setDraggingFolder(null); setDragOverFolder(null); }}
                              onClick={() => !isRenaming && setActiveFolder(folderPath)}
                              style={{ display: 'flex', flexDirection: 'column', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', cursor: 'pointer', transition: 'border-color 0.15s', position: 'relative' }}
                            >
                              <div style={{ height: '120px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                              </div>
                              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {isRenaming ? (
                                    <input autoFocus value={renameFolderValue} onChange={(e) => setRenameFolderValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(activeFolder, sub, renameFolderValue); if (e.key === 'Escape') setRenamingFolderPath(null); }} onBlur={() => setRenamingFolderPath(null)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '12px', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 6px', fontFamily: 'Exo 2, sans-serif', outline: 'none', width: '100%' }} />
                                  ) : (
                                    <p style={{ fontSize: '12px', fontWeight: '500', color: '#ddd', fontFamily: 'Exo 2, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{sub.replace(/^\d+\s+/, '')}</p>
                                  )}
                                </div>
                                {!isRenaming && (
                                  <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                                    <button onClick={(e) => { e.stopPropagation(); setOpenFolderMenu(openFolderMenu === folderPath ? null : folderPath); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 6px', borderRadius: '4px', fontSize: '16px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                    {openFolderMenu === folderPath && (
                                      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, bottom: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginBottom: '4px' }}>
                                        <button onClick={() => { setOpenFolderMenu(null); setActiveFolder(folderPath); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                        {(isEmployee || isAdmin) && <button onClick={() => { setOpenFolderMenu(null); downloadFolder(activeFolder, sub); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Download</button>}
                                        {(isEmployee || isAdmin) && <button onClick={() => { setOpenFolderMenu(null); setRenamingFolderPath(folderPath); setRenameFolderValue(sub.replace(/^\d+\s+/, '')); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                        {(isEmployee || isAdmin) && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenFolderMenu(null); if (confirm(`Move "${sub.replace(/^\d+\s+/, '')}" and all its contents to trash?`)) moveFolderToTrash(`${activeFolder}/${sub}`); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Move to trash</button></>}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', padding: '6px 18px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>NAME</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>LAST OPENED</span>
                          <span />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {subs.map(sub => {
                            const folderPath = `${activeFolder}/${sub}`;
                            const isRenaming = renamingFolderPath === folderPath;
                            return (
                              <div key={sub} draggable={isEmployee || isAdmin} onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingFolder({ topFolder: activeFolder, sub }); }} onDragEnd={() => { setDraggingFolder(null); setDragOverFolder(null); }} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', alignItems: 'center', padding: '11px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer' }}>
                                <div onClick={() => !isRenaming && setActiveFolder(folderPath)} style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                  {isRenaming ? (
                                    <input autoFocus value={renameFolderValue} onChange={(e) => setRenameFolderValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(activeFolder, sub, renameFolderValue); if (e.key === 'Escape') setRenamingFolderPath(null); }} onBlur={() => setRenamingFolderPath(null)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }} />
                                  ) : (
                                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.replace(/^\d+\s+/, '')}</span>
                                  )}
                                </div>
                                <span style={{ fontSize: '13px', color: '#444', fontFamily: 'Exo 2, sans-serif' }}>—</span>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                  {!isRenaming && (
                                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                      <button onClick={(e) => { e.stopPropagation(); setOpenFolderMenu(openFolderMenu === folderPath ? null : folderPath); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                      {openFolderMenu === folderPath && (
                                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                          <button onClick={() => { setOpenFolderMenu(null); setActiveFolder(folderPath); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                          {(isEmployee || isAdmin) && <button onClick={() => { setOpenFolderMenu(null); downloadFolder(activeFolder, sub); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Download</button>}
                                          {(isEmployee || isAdmin) && <button onClick={() => { setOpenFolderMenu(null); setRenamingFolderPath(folderPath); setRenameFolderValue(sub.replace(/^\d+\s+/, '')); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                          {(isEmployee || isAdmin) && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenFolderMenu(null); if (confirm(`Move "${sub.replace(/^\d+\s+/, '')}" and all its contents to trash?`)) moveFolderToTrash(`${activeFolder}/${sub}`); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Move to trash</button></>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    {filteredLinks.length > 0 && (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', padding: '6px 18px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>LINKS</span>
                          <span /><span />
                        </div>
                        {filteredLinks.map(link => (
                          <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', alignItems: 'center', padding: '11px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: renamingLinkId === link.id ? 'default' : 'pointer' }} onClick={() => renamingLinkId !== link.id && window.open(link.url, '_blank')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              {renamingLinkId === link.id ? <input autoFocus value={renameLinkValue} onChange={e => setRenameLinkValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameLink(link.id, renameLinkValue); if (e.key === 'Escape') setRenamingLinkId(null); }} onBlur={() => renameLink(link.id, renameLinkValue)} onClick={e => e.stopPropagation()} style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }} /> : <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.name}</span>}
                            </div>
                            <span />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {(isEmployee || isAdmin) && (
                                <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                  <button onClick={e => { e.stopPropagation(); setOpenMenuPath(openMenuPath === link.id ? null : link.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                  {openMenuPath === link.id && (
                                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                      <button onClick={() => { setOpenMenuPath(null); window.open(link.url, '_blank'); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                      <button onClick={() => { setOpenMenuPath(null); setRenamingLinkId(link.id); setRenameLinkValue(link.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>
                                      <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/>
                                      <button onClick={() => { setOpenMenuPath(null); if (confirm(`Remove link "${link.name}"?`)) deleteLink(link.id); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Remove</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })() : !activeFolder ? (() => {
                const sorted = [...documents].sort((a, b) => {
                  const aTime = userRecents[a.name] ? new Date(userRecents[a.name]).getTime() : 0;
                  const bTime = userRecents[b.name] ? new Date(userRecents[b.name]).getTime() : 0;
                  return bTime - aTime;
                });
                const DocRow = (doc) => {
                  const isMoving = movingDocPath === doc.path;
                  const isRenaming = renamingDocPath === doc.path;
                  const canEdit = isEmployee || isAdmin;
                  const isLocked = doc.restricted && !isPostNda && !isAdmin;
                  const lastOpened = userRecents[doc.name];
                  return (
                    <div
                      key={doc.path}
                      draggable={canEdit && !isMoving && !isRenaming}
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingDoc(doc); }}
                      onDragEnd={() => { setDraggingDoc(null); setDragOverFolder(null); }}
                      style={{ display: 'grid', gridTemplateColumns: (isEmployee || isAdmin) ? '1fr 180px 120px 40px' : '1fr 180px 40px', alignItems: 'center', padding: '11px 18px', background: isMoving ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isMoving ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '6px', opacity: isMoving ? 0.6 : 1, cursor: isMoving ? 'default' : 'pointer', transition: 'opacity 0.15s' }}
                    >
                      {/* Name column */}
                      <div onClick={() => !isRenaming && openDocument(doc.path, doc.name)} style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        {isRenaming ? (
                          <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameDoc(doc, renameValue); if (e.key === 'Escape') setRenamingDocPath(null); }} onBlur={() => setRenamingDocPath(null)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }} />
                        ) : (
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                        )}
                        {doc.internal && !isRenaming && <span style={{ fontSize: '11px', padding: '2px 7px', background: 'rgba(251,146,60,0.1)', color: '#fb923c', borderRadius: '3px', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', flexShrink: 0 }}>INTERNAL</span>}
                      </div>
                      {/* Last Opened column */}
                      <span style={{ fontSize: '13px', color: '#444', fontFamily: 'Exo 2, sans-serif' }}>
                        {isMoving ? <span style={{ color: '#3b82f6' }}>Moving...</span> : lastOpened ? `${new Date(lastOpened).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} ${new Date(lastOpened).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}` : '—'}
                      </span>
                      {/* Date Created column — employees/admin only */}
                      {(isEmployee || isAdmin) && <span style={{ fontSize: '13px', color: '#444', fontFamily: 'Exo 2, sans-serif' }}>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span>}
                      {/* Actions column */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {!isMoving && !isRenaming && (
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuPath(openMenuPath === doc.path ? null : doc.path); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}
                            >⋮</button>
                            {openMenuPath === doc.path && (
                              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                {!isLocked && <button onClick={() => { setOpenMenuPath(null); openDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>}
                                {isLocked && <button onClick={() => { setOpenMenuPath(null); openDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#555', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>NDA required</button>}
                                {!isLocked && <button onClick={() => { setOpenMenuPath(null); downloadDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Download</button>}
                                {canEdit && !isLocked && <button onClick={() => { setOpenMenuPath(null); setRenamingDocPath(doc.path); setRenameValue(doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                {canEdit && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenMenuPath(null); if (confirm(`Move "${doc.name}" to trash?`)) moveToTrash(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Move to trash</button></>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };
                const DocCard = (doc) => {
                  const isMoving = movingDocPath === doc.path;
                  const isRenaming = renamingDocPath === doc.path;
                  const canEdit = isEmployee || isAdmin;
                  const isLocked = doc.restricted && !isPostNda && !isAdmin;
                  const lastOpened = userRecents[doc.name];
                  const previewUrl = previewUrls[doc.path];
                  const isPdf = doc.mimeType === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf');
                  return (
                    <div
                      key={doc.path}
                      draggable={canEdit && !isMoving && !isRenaming}
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingDoc(doc); }}
                      onDragEnd={() => { setDraggingDoc(null); setDragOverFolder(null); }}
                      onClick={() => !isRenaming && !isMoving && openDocument(doc.path, doc.name)}
                      style={{ display: 'flex', flexDirection: 'column', background: isMoving ? 'rgba(59,130,246,0.06)' : '#111', border: `1px solid ${isMoving ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', overflow: 'hidden', cursor: isMoving ? 'default' : 'pointer', opacity: isMoving ? 0.6 : 1, transition: 'border-color 0.15s' }}
                    >
                      {/* Preview area */}
                      <div style={{ height: '160px', background: '#1a1a1a', overflow: 'hidden', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {isPdf && pdfThumbnails[doc.path] ? (
                          <img src={pdfThumbnails[doc.path]} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                        ) : isPdf ? (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #2a2a2a', borderTopColor: '#444', animation: 'spin 1s linear infinite' }} />
                          </div>
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileTypeIcon name={doc.name} size={48} />
                          </div>
                        )}
                        {isLocked && (
                          <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', padding: '2px 6px', background: 'rgba(59,130,246,0.2)', color: '#93c5fd', borderRadius: '3px', fontFamily: 'Exo 2, sans-serif', backdropFilter: 'blur(4px)' }}>POST-NDA</div>
                        )}
                      </div>
                      {/* Footer */}
                      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileTypeIcon name={doc.name} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {isRenaming ? (
                            <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameDoc(doc, renameValue); if (e.key === 'Escape') setRenamingDocPath(null); }} onBlur={() => setRenamingDocPath(null)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '12px', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 6px', fontFamily: 'Exo 2, sans-serif', outline: 'none', width: '100%' }} />
                          ) : (
                            <p style={{ fontSize: '12px', fontWeight: '500', color: '#ddd', fontFamily: 'Exo 2, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{doc.name}</p>
                          )}
                          <p style={{ fontSize: '11px', color: '#3a3a3a', fontFamily: 'Exo 2, sans-serif', margin: '2px 0 0' }}>
                            {isMoving ? 'Moving...' : lastOpened ? `Opened ${new Date(lastOpened).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}` : 'Not yet opened'}
                          </p>
                        </div>
                        {!isMoving && !isRenaming && (
                          <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuPath(openMenuPath === doc.path ? null : doc.path); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 6px', borderRadius: '4px', fontSize: '16px', lineHeight: 1, fontFamily: 'monospace' }}
                            >⋮</button>
                            {openMenuPath === doc.path && (
                              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, bottom: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginBottom: '4px' }}>
                                <button onClick={() => { setOpenMenuPath(null); openDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                {!isLocked && <button onClick={() => { setOpenMenuPath(null); downloadDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Download</button>}
                                {canEdit && !isLocked && <button onClick={() => { setOpenMenuPath(null); setRenamingDocPath(doc.path); setRenameValue(doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                {canEdit && !isLocked && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenMenuPath(null); if (confirm(`Move "${doc.name}" to trash?`)) moveToTrash(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Move to trash</button></>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };
                const linksList = filteredLinks.length > 0 ? (
                  <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', padding: '6px 18px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>LINKS</span>
                      <span /><span />
                    </div>
                    {filteredLinks.map(link => (
                      <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', alignItems: 'center', padding: '11px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: renamingLinkId === link.id ? 'default' : 'pointer' }} onClick={() => renamingLinkId !== link.id && window.open(link.url, '_blank')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          {renamingLinkId === link.id ? <input autoFocus value={renameLinkValue} onChange={e => setRenameLinkValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameLink(link.id, renameLinkValue); if (e.key === 'Escape') setRenamingLinkId(null); }} onBlur={() => renameLink(link.id, renameLinkValue)} onClick={e => e.stopPropagation()} style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }} /> : <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.name}</span>}
                          {renamingLinkId !== link.id && <span style={{ fontSize: '11px', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'Exo 2, sans-serif', flexShrink: 0 }}>{link.folder.replace(/_/g, ' ').replace(/^\d+\s+/, '')}</span>}
                        </div>
                        <span />
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {(isEmployee || isAdmin) && (
                            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                              <button onClick={e => { e.stopPropagation(); setOpenMenuPath(openMenuPath === link.id ? null : link.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                              {openMenuPath === link.id && (
                                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                  <button onClick={() => { setOpenMenuPath(null); window.open(link.url, '_blank'); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                  <button onClick={() => { setOpenMenuPath(null); setRenamingLinkId(link.id); setRenameLinkValue(link.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>
                                  <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/>
                                  <button onClick={() => { setOpenMenuPath(null); if (confirm(`Remove link "${link.name}"?`)) deleteLink(link.id); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Remove</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
                return docView === 'grid' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                      {sorted.map(doc => DocCard(doc))}
                    </div>
                    {linksList}
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: (isEmployee || isAdmin) ? '1fr 180px 120px 40px' : '1fr 180px 40px', padding: '6px 18px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>NAME</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>LAST OPENED</span>
                      {(isEmployee || isAdmin) && <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>DATE CREATED</span>}
                      <span />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {sorted.map(doc => DocRow(doc))}
                    </div>
                    {linksList}
                  </>
                );
              })() : (
                <>
                {activeFolder && subfolderMap[activeFolder]?.size > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ fontSize: '12px', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', marginBottom: '10px' }}>SUBFOLDERS</p>
                    {docView === 'grid' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                        {[...subfolderMap[activeFolder]].sort().map(sub => {
                          const folderPath = `${activeFolder}/${sub}`;
                          const isRenaming = renamingFolderPath === folderPath;
                          return (
                            <div
                              key={sub}
                              draggable={isEmployee || isAdmin}
                              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingFolder({ topFolder: activeFolder, sub }); }}
                              onDragEnd={() => { setDraggingFolder(null); setDragOverFolder(null); }}
                              onClick={() => !isRenaming && setActiveFolder(folderPath)}
                              style={{ display: 'flex', flexDirection: 'column', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}
                            >
                              <div style={{ height: '120px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                              </div>
                              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {isRenaming ? (
                                    <input autoFocus value={renameFolderValue} onChange={(e) => setRenameFolderValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(activeFolder, sub, renameFolderValue); if (e.key === 'Escape') setRenamingFolderPath(null); }} onBlur={() => setRenamingFolderPath(null)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '12px', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 6px', fontFamily: 'Exo 2, sans-serif', outline: 'none', width: '100%' }} />
                                  ) : (
                                    <p style={{ fontSize: '12px', fontWeight: '500', color: '#ddd', fontFamily: 'Exo 2, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{sub.replace(/^\d+\s+/, '')}</p>
                                  )}
                                </div>
                                {!isRenaming && (
                                  <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                                    <button onClick={(e) => { e.stopPropagation(); setOpenFolderMenu(openFolderMenu === folderPath ? null : folderPath); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 6px', borderRadius: '4px', fontSize: '16px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                    {openFolderMenu === folderPath && (
                                      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, bottom: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginBottom: '4px' }}>
                                        <button onClick={() => { setOpenFolderMenu(null); setActiveFolder(folderPath); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                        {(isEmployee || isAdmin) && <button onClick={() => { setOpenFolderMenu(null); downloadFolder(activeFolder, sub); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Download</button>}
                                        {(isEmployee || isAdmin) && <button onClick={() => { setOpenFolderMenu(null); setRenamingFolderPath(folderPath); setRenameFolderValue(sub.replace(/^\d+\s+/, '')); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                        {(isEmployee || isAdmin) && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenFolderMenu(null); if (confirm(`Move "${sub.replace(/^\d+\s+/, '')}" and all its contents to trash?`)) moveFolderToTrash(`${activeFolder}/${sub}`); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Move to trash</button></>}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', padding: '6px 18px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>NAME</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>LAST OPENED</span>
                          <span />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {[...subfolderMap[activeFolder]].sort().map(sub => {
                            const folderPath = `${activeFolder}/${sub}`;
                            const isRenaming = renamingFolderPath === folderPath;
                            return (
                              <div key={sub} draggable={isEmployee || isAdmin} onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingFolder({ topFolder: activeFolder, sub }); }} onDragEnd={() => { setDraggingFolder(null); setDragOverFolder(null); }} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', alignItems: 'center', padding: '11px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer' }}>
                                <div onClick={() => !isRenaming && setActiveFolder(folderPath)} style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                  {isRenaming ? (
                                    <input autoFocus value={renameFolderValue} onChange={(e) => setRenameFolderValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(activeFolder, sub, renameFolderValue); if (e.key === 'Escape') setRenamingFolderPath(null); }} onBlur={() => setRenamingFolderPath(null)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }} />
                                  ) : (
                                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.replace(/^\d+\s+/, '')}</span>
                                  )}
                                </div>
                                <span style={{ fontSize: '13px', color: '#444', fontFamily: 'Exo 2, sans-serif' }}>—</span>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                  {!isRenaming && (
                                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                      <button onClick={(e) => { e.stopPropagation(); setOpenFolderMenu(openFolderMenu === folderPath ? null : folderPath); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                      {openFolderMenu === folderPath && (
                                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                          <button onClick={() => { setOpenFolderMenu(null); setActiveFolder(folderPath); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                          {(isEmployee || isAdmin) && <button onClick={() => { setOpenFolderMenu(null); downloadFolder(activeFolder, sub); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Download</button>}
                                          {(isEmployee || isAdmin) && <button onClick={() => { setOpenFolderMenu(null); setRenamingFolderPath(folderPath); setRenameFolderValue(sub.replace(/^\d+\s+/, '')); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                          {(isEmployee || isAdmin) && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenFolderMenu(null); if (confirm(`Move "${sub.replace(/^\d+\s+/, '')}" and all its contents to trash?`)) moveFolderToTrash(`${activeFolder}/${sub}`); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Move to trash</button></>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {Object.entries(groupedDocs).map(([folder, files]) => (
                    <div key={folder}>
                      {docView === 'list' ? (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: (isEmployee || isAdmin) ? '1fr 180px 120px 40px' : '1fr 180px 40px', padding: '6px 18px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>NAME</span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>LAST OPENED</span>
                            {(isEmployee || isAdmin) && <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>DATE CREATED</span>}
                            <span />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {files.map(doc => {
                            const isMoving = movingDocPath === doc.path;
                            const isRenaming = renamingDocPath === doc.path;
                            const canEdit = isEmployee || isAdmin;
                            const isLocked = doc.restricted && !isPostNda && !isAdmin;
                            const lastOpened = userRecents[doc.name];
                            return (
                              <div
                                key={doc.path}
                                draggable={canEdit && !isMoving && !isRenaming}
                                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingDoc(doc); }}
                                onDragEnd={() => { setDraggingDoc(null); setDragOverFolder(null); }}
                                style={{ display: 'grid', gridTemplateColumns: (isEmployee || isAdmin) ? '1fr 180px 120px 40px' : '1fr 180px 40px', alignItems: 'center', padding: '11px 18px', background: isMoving ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isMoving ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '6px', opacity: isMoving ? 0.6 : 1, cursor: isMoving ? 'default' : 'pointer', transition: 'opacity 0.15s' }}
                              >
                                <div onClick={() => !isRenaming && openDocument(doc.path, doc.name)} style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                  {isRenaming ? (
                                    <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameDoc(doc, renameValue); if (e.key === 'Escape') setRenamingDocPath(null); }} onBlur={() => setRenamingDocPath(null)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }} />
                                  ) : (
                                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                                  )}
                        {doc.internal && !isRenaming && <span style={{ fontSize: '11px', padding: '2px 7px', background: 'rgba(251,146,60,0.1)', color: '#fb923c', borderRadius: '3px', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', flexShrink: 0 }}>INTERNAL</span>}
                                </div>
                                <span style={{ fontSize: '13px', color: '#444', fontFamily: 'Exo 2, sans-serif' }}>
                                  {isMoving ? <span style={{ color: '#3b82f6' }}>Moving...</span> : lastOpened ? `${new Date(lastOpened).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} ${new Date(lastOpened).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}` : '—'}
                                </span>
                                {(isEmployee || isAdmin) && <span style={{ fontSize: '13px', color: '#444', fontFamily: 'Exo 2, sans-serif' }}>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span>}
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                  {!isMoving && !isRenaming && (
                                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuPath(openMenuPath === doc.path ? null : doc.path); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                      {openMenuPath === doc.path && (
                                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                          {!isLocked && <button onClick={() => { setOpenMenuPath(null); openDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>}
                                          {isLocked && <button onClick={() => { setOpenMenuPath(null); openDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#555', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>NDA required</button>}
                                          {!isLocked && <button onClick={() => { setOpenMenuPath(null); downloadDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Download</button>}
                                          {canEdit && !isLocked && <button onClick={() => { setOpenMenuPath(null); setRenamingDocPath(doc.path); setRenameValue(doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                          {canEdit && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenMenuPath(null); if (confirm(`Move "${doc.name}" to trash?`)) moveToTrash(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Move to trash</button></>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                          {files.map(doc => {
                            const isMoving = movingDocPath === doc.path;
                            const isRenaming = renamingDocPath === doc.path;
                            const canEdit = isEmployee || isAdmin;
                            const isLocked = doc.restricted && !isPostNda && !isAdmin;
                            const previewUrl = previewUrls[doc.path];
                            const isPdf = doc.mimeType === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf');
                            return (
                              <div
                                key={doc.path}
                                draggable={canEdit && !isMoving && !isRenaming}
                                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingDoc(doc); }}
                                onDragEnd={() => { setDraggingDoc(null); setDragOverFolder(null); }}
                                onClick={() => !isRenaming && !isMoving && openDocument(doc.path, doc.name)}
                                style={{ display: 'flex', flexDirection: 'column', background: isMoving ? 'rgba(59,130,246,0.06)' : '#111', border: `1px solid ${isMoving ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', overflow: 'hidden', cursor: isMoving ? 'default' : 'pointer', opacity: isMoving ? 0.6 : 1, transition: 'border-color 0.15s' }}
                              >
                                <div style={{ height: '160px', background: '#1a1a1a', overflow: 'hidden', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                  {isPdf && pdfThumbnails[doc.path] ? (
                                    <img src={pdfThumbnails[doc.path]} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                                  ) : !isPdf ? (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <FileTypeIcon name={doc.name} size={48} />
                                    </div>
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #2a2a2a', borderTopColor: '#444' }} />
                                    </div>
                                  )}
                                </div>
                                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <FileTypeIcon name={doc.name} size={28} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    {isRenaming ? (
                                      <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameDoc(doc, renameValue); if (e.key === 'Escape') setRenamingDocPath(null); }} onBlur={() => setRenamingDocPath(null)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '12px', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '4px', padding: '2px 6px', fontFamily: 'Exo 2, sans-serif', outline: 'none', width: '100%' }} />
                                    ) : (
                                      <p style={{ fontSize: '12px', fontWeight: '500', color: '#ddd', fontFamily: 'Exo 2, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{doc.name}</p>
                                    )}
                                    <p style={{ fontSize: '11px', color: '#3a3a3a', fontFamily: 'Exo 2, sans-serif', margin: '2px 0 0' }}>{isMoving ? 'Moving...' : 'Not yet opened'}</p>
                                  </div>
                                  {!isMoving && !isRenaming && (
                                    <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuPath(openMenuPath === doc.path ? null : doc.path); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 6px', borderRadius: '4px', fontSize: '16px', lineHeight: 1, fontFamily: 'monospace' }}
                                      >⋮</button>
                                      {openMenuPath === doc.path && (
                                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, bottom: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginBottom: '4px' }}>
                                          <button onClick={() => { setOpenMenuPath(null); openDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                          {!isLocked && <button onClick={() => { setOpenMenuPath(null); downloadDocument(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Download</button>}
                                          {canEdit && !isLocked && <button onClick={() => { setOpenMenuPath(null); setRenamingDocPath(doc.path); setRenameValue(doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                          {canEdit && !isLocked && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenMenuPath(null); if (confirm(`Move "${doc.name}" to trash?`)) moveToTrash(doc.path, doc.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Move to trash</button></>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Links section */}
                {filteredLinks.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    {docView === 'list' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', padding: '6px 18px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>LINKS</span>
                          <span />
                          <span />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {filteredLinks.map(link => (
                            <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', alignItems: 'center', padding: '11px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer' }}
                              onClick={() => window.open(link.url, '_blank')}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.name}</span>
                              </div>
                              <span />
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                {(isEmployee || isAdmin) && (
                                  <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                    <button onClick={e => { e.stopPropagation(); setOpenMenuPath(openMenuPath === link.id ? null : link.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                    {openMenuPath === link.id && (
                                      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                        <button onClick={() => { setOpenMenuPath(null); window.open(link.url, '_blank'); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                        <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/>
                                        <button onClick={() => { setOpenMenuPath(null); if (confirm(`Remove link "${link.name}"?`)) deleteLink(link.id); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Remove</button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {docView === 'grid' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                        {filteredLinks.map(link => (
                          <div key={link.id} onClick={() => window.open(link.url, '_blank')}
                            style={{ display: 'flex', flexDirection: 'column', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}>
                            <div style={{ height: '160px', background: '#1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              <span style={{ fontSize: '11px', color: '#3b82f6', fontFamily: 'Exo 2, sans-serif' }}>External link</span>
                            </div>
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <p style={{ fontSize: '12px', fontWeight: '500', color: '#ddd', fontFamily: 'Exo 2, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, flex: 1 }}>{link.name}</p>
                              {(isEmployee || isAdmin) && (
                                <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                  <button onClick={e => { e.stopPropagation(); setOpenMenuPath(openMenuPath === link.id ? null : link.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '2px 4px', fontSize: '16px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                  {openMenuPath === link.id && (
                                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, bottom: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginBottom: '4px' }}>
                                      <button onClick={() => { setOpenMenuPath(null); window.open(link.url, '_blank'); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                      <button onClick={() => { setOpenMenuPath(null); setRenamingLinkId(link.id); setRenameLinkValue(link.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>
                                      <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/>
                                      <button onClick={() => { setOpenMenuPath(null); if (confirm(`Remove link "${link.name}"?`)) deleteLink(link.id); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Remove</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            </div>
          )}

          {/* Private tab — employees and admin only */}
          {(isEmployee || isAdmin) && activeTab === 'private' && (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  {isAdmin && selectedPrivateUserId ? `PRIVATE — ${allProfiles.find(p => p.id === selectedPrivateUserId)?.email || selectedPrivateUserId}` : 'PRIVATE'}
                </h1>
                <p style={{ fontSize: '13px', color: '#555', fontFamily: 'Exo 2, sans-serif' }}>
                  {isAdmin && selectedPrivateUserId ? "Viewing another user's private folder." : 'Only visible to you.'}
                </p>
              </div>

              {/* Upload zone — hidden when viewing another user's folder */}
              {!selectedPrivateUserId && (
                <div
                  onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setPrivateUploadDragging(true); } }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPrivateUploadDragging(false); }}
                  onDrop={(e) => { e.preventDefault(); setPrivateUploadDragging(false); if (!e.dataTransfer.types.includes('Files')) return; const file = e.dataTransfer.files[0]; if (file) handlePrivateFileDrop(file); }}
                  onClick={() => { if (!privateDropStatus) privateUploadRef.current?.click(); }}
                  style={{ border: `1px dashed ${privateUploadDragging ? '#a855f7' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', textAlign: 'center', marginBottom: '20px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: privateUploadDragging ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.02)', cursor: privateDropStatus ? 'default' : 'pointer', transition: 'border-color 0.15s, background 0.15s', userSelect: 'none' }}
                >
                  <input ref={privateUploadRef} type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files[0]; if (f) handlePrivateFileDrop(f); e.target.value = ''; }} />
                  {privateDropStatus ? (
                    <p style={{ fontSize: '14px', fontFamily: 'Exo 2, sans-serif', color: privateDropStatus === 'error' ? '#ef4444' : privateDropStatus === 'done' ? '#22c55e' : '#a855f7', margin: 0 }}>{privateDropMessage}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif', margin: 0 }}>Drop a file here to upload privately</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', minHeight: '34px', gap: '8px' }}>
                {/* Left: back button (when inside subfolder) or admin selector */}
                {privateActiveSubfolder ? (
                  <button
                    onClick={() => {
                      const parts = privateActiveSubfolder.split('/');
                      const parentPath = parts.slice(0, -1).join('/') || null;
                      setPrivateActiveSubfolder(parentPath);
                      loadPrivateFiles(selectedPrivateUserId, parentPath);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#888', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer', padding: '0' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Private
                  </button>
                ) : isAdmin && allProfiles.length > 0 ? (
                  <select
                    value={selectedPrivateUserId || ''}
                    onChange={async e => {
                      const uid = e.target.value || null;
                      setSelectedPrivateUserId(uid);
                      setPrivateActiveSubfolder(null);
                      await loadPrivateFiles(uid, null);
                      await loadPrivateFolderTree(uid);
                      if (!uid) await loadPrivateItems();
                    }}
                    style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#aaa', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value="">My private</option>
                    {allProfiles.filter(p => p.id !== user.id).map(p => (
                      <option key={p.id} value={p.id}>{p.email}</option>
                    ))}
                  </select>
                ) : <span />}
                {/* Right: view toggle + Add link + New folder */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* View toggle */}
                  <button onClick={() => setPrivateDocView('list')} title="List view" style={{ padding: '7px 10px', background: privateDocView === 'list' ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)', border: privateDocView === 'list' ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={privateDocView === 'list' ? '#c084fc' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  </button>
                  <button onClick={() => setPrivateDocView('grid')} title="Grid view" style={{ padding: '7px 10px', background: privateDocView === 'grid' ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)', border: privateDocView === 'grid' ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={privateDocView === 'grid' ? '#c084fc' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  </button>
                  {!selectedPrivateUserId && (
                    <>
                      {!privateActiveSubfolder && <button onClick={() => { setAddingLink(true); setLinkTargetFolder('__private__'); setLinkName(''); setLinkUrl(''); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#888', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        Add link
                      </button>}
                      {(creatingPrivateFolder ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input autoFocus value={newPrivateFolderName} onChange={e => setNewPrivateFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newPrivateFolderName.trim()) createPrivateFolderFixed(); if (e.key === 'Escape') { setCreatingPrivateFolder(false); setNewPrivateFolderName(''); } }} placeholder="Folder name..." style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '6px', color: '#fff', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', outline: 'none', width: '140px' }} />
                          <button onClick={createPrivateFolderFixed} style={{ padding: '7px 14px', background: '#a855f7', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Create</button>
                          <button onClick={() => { setCreatingPrivateFolder(false); setNewPrivateFolderName(''); }} style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#777', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setCreatingPrivateFolder(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', borderRadius: '6px', color: '#a855f7', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          New folder
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Subfolder cards — shown at any level */}
              {(() => {
                const currentLevel = privateActiveSubfolder || '';
                const subsAtLevel = privateSubfolderMap[currentLevel] ? [...privateSubfolderMap[currentLevel]].sort() : [];
                if (subsAtLevel.length === 0) return null;
                return (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', marginBottom: '8px' }}>FOLDERS</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {subsAtLevel.map(sub => {
                        const subPath = currentLevel ? `${currentLevel}/${sub}` : sub;
                        return (
                          <div
                            key={subPath}
                            onClick={() => { if (openFolderMenu === `__private_sub__${subPath}`) return; setPrivateActiveSubfolder(subPath); loadPrivateFiles(selectedPrivateUserId, subPath); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', fontFamily: 'Exo 2, sans-serif', flex: 1 }}>{sub}</span>
                            {!selectedPrivateUserId && (
                              <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                <button onClick={e => { e.stopPropagation(); setOpenFolderMenu(openFolderMenu === `__private_sub__${subPath}` ? null : `__private_sub__${subPath}`); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                {openFolderMenu === `__private_sub__${subPath}` && (
                                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                    <button onClick={() => { setOpenFolderMenu(null); setPrivateActiveSubfolder(subPath); loadPrivateFiles(selectedPrivateUserId, subPath); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                    <button onClick={() => { setOpenFolderMenu(null); const n = window.prompt('Rename folder:', sub); if (n && n.trim()) renamePrivateSubfolder(subPath, n.trim()); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>
                                    <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/>
                                    <button onClick={() => { setOpenFolderMenu(null); if (confirm(`Delete folder "${sub}"? All files inside will be deleted.`)) deletePrivateSubfolder(subPath); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Delete folder</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Add link form */}
              {addingPrivate === 'link' && !selectedPrivateUserId && (
                <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input autoFocus value={privateTitle} onChange={e => setPrivateTitle(e.target.value)} placeholder="Link name..." style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', outline: 'none' }} />
                    <input value={privateContent} onChange={e => setPrivateContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && privateTitle.trim() && privateContent.trim()) createPrivateItem(); }} placeholder="https://..." style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setAddingPrivate(null)} style={{ padding: '7px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#666', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={createPrivateItem} disabled={!privateTitle.trim() || !privateContent.trim()} style={{ padding: '7px 16px', background: privateTitle.trim() && privateContent.trim() ? '#a855f7' : 'rgba(168,85,247,0.2)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600', fontFamily: 'Exo 2, sans-serif', cursor: privateTitle.trim() && privateContent.trim() ? 'pointer' : 'default' }}>Save</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Private files */}
              {privateFiles.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', marginBottom: '8px' }}>FILES</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {privateDocView === 'grid' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '10px' }}>
                        {privateFiles.map(file => (
                          <div key={file.path} onClick={() => openDocument(file.path, file.name)} style={{ display: 'flex', flexDirection: 'column', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                            <div style={{ height: '90px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FileTypeIcon name={file.name} size={32} />
                            </div>
                            <div style={{ padding: '8px 10px' }}>
                              <p style={{ fontSize: '12px', fontWeight: '500', color: '#ddd', fontFamily: 'Exo 2, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{file.name}</p>
                              {isAdmin && file.createdAt && <p style={{ fontSize: '11px', color: '#444', fontFamily: 'Exo 2, sans-serif', margin: '2px 0 0' }}>{new Date(file.createdAt).toLocaleDateString()}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      privateFiles.map(file => {
                        const isRenaming = renamingPrivateFilePath === file.path;
                        return (
                          <div key={file.path} style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 130px 40px' : '1fr 40px', alignItems: 'center', padding: '11px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, cursor: isRenaming ? 'default' : 'pointer' }} onClick={() => !isRenaming && openDocument(file.path, file.name)}>
                              <FileTypeIcon name={file.name} size={24} />
                              {isRenaming ? (
                                <input autoFocus value={renamePrivateFileValue} onChange={e => setRenamePrivateFileValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renamePrivateFile(file, renamePrivateFileValue); if (e.key === 'Escape') setRenamingPrivateFilePath(null); }} onBlur={() => renamePrivateFile(file, renamePrivateFileValue)} onClick={e => e.stopPropagation()} style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }} />
                              ) : (
                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', fontFamily: 'Exo 2, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                              )}
                            </div>
                            {isAdmin && <span style={{ fontSize: '12px', color: '#444', fontFamily: 'Exo 2, sans-serif' }}>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : '—'}</span>}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {!isRenaming && (
                                <div style={{ position: 'relative' }}>
                                  <button onClick={e => { e.stopPropagation(); setOpenMenuPath(openMenuPath === file.path ? null : file.path); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                  {openMenuPath === file.path && (
                                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                      <button onClick={() => { setOpenMenuPath(null); openDocument(file.path, file.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                      <button onClick={() => { setOpenMenuPath(null); downloadDocument(file.path, file.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Download</button>
                                      {!selectedPrivateUserId && <button onClick={() => { setOpenMenuPath(null); setRenamingPrivateFilePath(file.path); setRenamePrivateFileValue(file.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                      {!selectedPrivateUserId && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenMenuPath(null); if (confirm(`Delete "${file.name}"?`)) deletePrivateFile(file.path); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Delete</button></>}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              {privateFilesLoading && <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif', marginBottom: '16px' }}>Loading files...</p>}

              {/* Private links — from document_links with folder='__private__', only shown at root */}
              {!privateActiveSubfolder && (() => {
                const viewUserId = selectedPrivateUserId || user.id;
                const privateLinks = links.filter(l => l.folder === '__private__' && (l.created_by === viewUserId || (isAdmin && !selectedPrivateUserId)));
                if (privateLinks.length === 0) return null;
                return (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.1em', marginBottom: '8px' }}>LINKS</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {privateLinks.map(link => {
                        const isRenaming = renamingLinkId === link.id;
                        return (
                          <div key={link.id} style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 130px 40px' : '1fr 40px', alignItems: 'center', padding: '11px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: isRenaming ? 'default' : 'pointer' }} onClick={() => !isRenaming && window.open(link.url, '_blank')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              {isRenaming ? (
                                <input autoFocus value={renameLinkValue} onChange={e => setRenameLinkValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameLink(link.id, renameLinkValue); if (e.key === 'Escape') setRenamingLinkId(null); }} onBlur={() => renameLink(link.id, renameLinkValue)} onClick={e => e.stopPropagation()} style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', padding: '2px 8px', fontFamily: 'Exo 2, sans-serif', outline: 'none', flex: 1, minWidth: 0 }} />
                              ) : (
                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.name}</span>
                              )}
                            </div>
                            {isAdmin && <span style={{ fontSize: '12px', color: '#444', fontFamily: 'Exo 2, sans-serif' }}>{link.created_at ? new Date(link.created_at).toLocaleDateString() : '—'}</span>}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                              <div style={{ position: 'relative' }}>
                                <button onClick={e => { e.stopPropagation(); setOpenMenuPath(openMenuPath === link.id ? null : link.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', borderRadius: '4px', fontSize: '18px', lineHeight: 1, fontFamily: 'monospace' }}>⋮</button>
                                {openMenuPath === link.id && (
                                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 50, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                    <button onClick={() => { setOpenMenuPath(null); window.open(link.url, '_blank'); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Open</button>
                                    {link.created_by === user.id && <button onClick={() => { setOpenMenuPath(null); setRenamingLinkId(link.id); setRenameLinkValue(link.name); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Rename</button>}
                                    {(link.created_by === user.id || isAdmin) && <><div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/><button onClick={() => { setOpenMenuPath(null); if (confirm(`Remove link "${link.name}"?`)) deleteLink(link.id); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Remove</button></>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Empty state */}
              {!privateFilesLoading && privateFiles.length === 0 && (privateSubfolderMap[privateActiveSubfolder || '']?.size ?? 0) === 0 && links.filter(l => l.folder === '__private__' && (l.created_by === (selectedPrivateUserId || user.id) || (isAdmin && !selectedPrivateUserId))).length === 0 && (
                <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif' }}>
                  {selectedPrivateUserId ? 'No private files for this user.' : 'Nothing here yet. Upload a file, add a link, or create a folder.'}
                </p>
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
  taskToast={taskToast}
  />
  </div>
)}

          {/* Due Diligence */}
          {activeTab === 'diligence' && (
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em', marginBottom: '6px' }}>DUE DILIGENCE</h1>
              <p style={{ fontSize: '14px', color: '#777', marginBottom: '28px' }}>Standard investor due diligence checklist</p>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 0' }}>
                {[...diligenceItems].sort((a, b) => b.checked - a.checked).map((item, i) => (
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
              {pitchDeckLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', color: '#555' }}>
                  <div style={{ width: '28px', height: '28px', border: '2px solid #333', borderTop: '2px solid #888', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }} />
                  <p style={{ fontSize: '14px' }}>Loading pitch deck...</p>
                </div>
              )}
              {!pitchDeckLoading && pitchDeckError === 'no_file' && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '72px', textAlign: 'center' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <p style={{ fontSize: '15px', color: '#666' }}>{isAdmin ? 'Upload the pitch deck PDF to the 01_Pitch_and_Overview folder to display it here.' : 'Pitch deck will appear here once uploaded by the administrator.'}</p>
                </div>
              )}
              {!pitchDeckLoading && pitchDeckError && pitchDeckError !== 'no_file' && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#666' }}>Could not load pitch deck. Please try refreshing.</p>
                </div>
              )}
              {!pitchDeckLoading && pitchDeckPages.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  {pitchDeckPages.map((src, i) => (
                    <div key={i} style={{ width: '100%', position: 'relative' }}>
                      <img src={src} alt={`Slide ${i + 1}`} style={{ width: '100%', display: 'block', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }} />
                      <div style={{ position: 'absolute', bottom: '10px', right: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{i + 1} / {pitchDeckPages.length}</div>
                    </div>
                  ))}
                </div>
              )}
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
          {activeTab === 'activity' && isAdmin && (() => {
            const actionLabel = (action) => action === 'document_viewed' ? 'Opened document' : action === 'sol_document_query' ? 'Sol (with docs)' : 'Sol query';
            const fmtTime = (ts) => ts.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) + ' ' + ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
            const toggleRow = (rowKey) => setExpandedActivityRows(prev => { const next = new Set(prev); if (next.has(rowKey)) next.delete(rowKey); else next.add(rowKey); return next; });

            const LogRow = ({ log, i, total, showUser, showEvent }) => {
              const rowKey = log.id || i;
              const isExpanded = expandedActivityRows.has(rowKey);
              const detail = log.document_name || '';
              const ts = new Date(log.created_at);
              return (
                <div style={{ borderBottom: i < total - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 220px', padding: '11px 16px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#555', fontFamily: 'Exo 2, sans-serif' }}>{fmtTime(ts)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {showEvent && <span style={{ fontSize: '13px', color: '#ccc', fontFamily: 'Exo 2, sans-serif' }}>{actionLabel(log.action)}</span>}
                      {detail && <button onClick={() => toggleRow(rowKey)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer', padding: 0 }}>{isExpanded ? 'hide' : 'details'}</button>}
                    </div>
                    {showUser && <span style={{ fontSize: '12px', color: '#555', fontFamily: 'Exo 2, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.user_email}</span>}
                  </div>
                  {isExpanded && detail && (
                    <div style={{ padding: '0 16px 11px 176px' }}>
                      <p style={{ fontSize: '12px', color: '#777', fontFamily: 'Exo 2, sans-serif', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '8px 12px' }}>{detail}</p>
                    </div>
                  )}
                </div>
              );
            };

            const toggleGroup = (key) => setExpandedActivityGroups(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });

            const GroupedTable = ({ groups, showUser, showEvent }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {groups.map(([groupName, logs]) => {
                  const open = expandedActivityGroups.has(groupName);
                  return (
                    <div key={groupName} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
                      <button onClick={() => toggleGroup(groupName)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#ccc', fontFamily: 'Exo 2, sans-serif' }}>{groupName}</span>
                          <span style={{ fontSize: '12px', color: '#444', fontFamily: 'Exo 2, sans-serif' }}>{logs.length} event{logs.length !== 1 ? 's' : ''}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#555', fontFamily: 'Exo 2, sans-serif' }}>{open ? '▲' : '▼'}</span>
                      </button>
                      {open && (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 220px', padding: '7px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>TIME</span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>{showEvent ? 'EVENT' : ''}</span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>{showUser ? 'USER' : ''}</span>
                          </div>
                          {logs.map((log, i) => <LogRow key={log.id || i} log={log} i={i} total={logs.length} showUser={showUser} showEvent={showEvent} />)}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );

            const byUser = () => {
              const map = {};
              activityLogs.forEach(log => { if (!map[log.user_email]) map[log.user_email] = []; map[log.user_email].push(log); });
              return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
            };

            const byType = () => {
              const order = ['document_viewed', 'sol_document_query', 'sol_query'];
              const map = {};
              activityLogs.forEach(log => { if (!map[log.action]) map[log.action] = []; map[log.action].push(log); });
              return order.filter(k => map[k]).map(k => [actionLabel(k), map[k]]);
            };

            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.05em' }}>ACTIVITY</h1>
                  <button onClick={loadActivity} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#aaa', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Refresh</button>
                </div>
                <p style={{ fontSize: '14px', color: '#777', marginBottom: '16px' }}>Audit log — document views and Sol queries</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  {[['recency', 'By recency'], ['user', 'By user'], ['type', 'By type']].map(([id, label]) => (
                    <button key={id} onClick={() => setActivityView(id)} style={{ padding: '7px 16px', background: activityView === id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)', border: activityView === id ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: activityView === id ? '#93c5fd' : '#666', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>{label}</button>
                  ))}
                </div>
                {activityLoading ? (
                  <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif' }}>Loading...</p>
                ) : activityLogs.length === 0 ? (
                  <p style={{ fontSize: '14px', color: '#555', fontFamily: 'Exo 2, sans-serif' }}>No activity recorded yet.</p>
                ) : activityView === 'recency' ? (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 220px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>TIME</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>EVENT</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#555', fontFamily: 'Exo 2, sans-serif', letterSpacing: '0.08em' }}>USER</span>
                    </div>
                    {activityLogs.map((log, i) => <LogRow key={log.id || i} log={log} i={i} total={activityLogs.length} showUser={true} showEvent={true} />)}
                  </div>
                ) : activityView === 'user' ? (
                  <GroupedTable groups={byUser()} showUser={false} showEvent={true} />
                ) : (
                  <GroupedTable groups={byType()} showUser={true} showEvent={false} />
                )}
              </div>
            );
          })()}

        </div>

        {activeTab !== 'sol' && (
  <div data-tutorial="sol-panel" className="sol-panel" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
    <SolChat
  solMessages={solMessages}
  solInput={solInput}
  solLoading={solLoading}
  setSolInput={setSolInput}
  sendSolMessage={sendSolMessage}
  taskToast={taskToast}
/>
  </div>
)}

      </div>

      {/* Mobile Sol drawer */}
      {solDrawerOpen && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70vh', background: '#0f0f0f', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}/>
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

      {/* Right-click context menu for folders */}
      {contextMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 300, minWidth: '160px', padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
        >
          {/* Top-level folder rename */}
          {(!contextMenu.type || contextMenu.type === 'top') && <>
            <button
              onClick={() => {
                const current = folderNames[contextMenu.folder] || contextMenu.folder.replace(/_/g, ' ').replace(/^\d+\s+/, '');
                setRenamingTopFolder(contextMenu.folder);
                setRenameTopFolderValue(current);
                setContextMenu(null);
              }}
              style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
            >Rename</button>
            {isAdmin && <>
              <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/>
              <button
                onClick={() => {
                  const displayName = folderNames[contextMenu.folder] || contextMenu.folder.replace(/_/g, ' ').replace(/^\d+\s+/, '');
                  deleteTopLevelFolder(contextMenu.folder, displayName);
                }}
                style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
              >Delete folder</button>
            </>}
          </>}
          {/* Subfolder rename + delete (public/internal) */}
          {contextMenu.type === 'sub' && (() => {
            const fpParts = contextMenu.folderPath.split('/');
            const subName = fpParts[fpParts.length - 1];
            return (<>
              <button
                onClick={() => {
                  const newName = window.prompt('Rename folder:', subName.replace(/^\d+\s+/, ''));
                  setContextMenu(null);
                  if (newName && newName.trim()) renameFolder(fpParts.slice(0, -1).join('/'), subName, newName.trim());
                }}
                style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
              >Rename</button>
              <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/>
              <button
                onClick={() => {
                  const fp = contextMenu.folderPath;
                  setContextMenu(null);
                  if (confirm(`Move "${subName.replace(/^\d+\s+/, '')}" and all its contents to trash?`)) moveFolderToTrash(fp);
                }}
                style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
              >Delete folder</button>
            </>);
          })()}
          {/* Private subfolder rename */}
          {contextMenu.type === 'private-sub' && (() => {
            const subPath = contextMenu.sub;
            const subDisplayName = subPath.split('/').pop();
            return (<>
              <button
                onClick={() => {
                  const newName = window.prompt('Rename folder:', subDisplayName);
                  setContextMenu(null);
                  if (newName && newName.trim()) renamePrivateSubfolder(subPath, newName.trim());
                }}
                style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ccc', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
              >Rename</button>
              <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}/>
              <button
                onClick={() => {
                  setContextMenu(null);
                  if (confirm(`Delete folder "${subDisplayName}"? All files inside will be deleted.`)) deletePrivateSubfolder(subPath);
                }}
                style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}
              >Delete folder</button>
            </>);
          })()}
        </div>
      )}

      {/* Add link modal */}
      {addingLink && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => { setAddingLink(false); setLinkTargetFolder(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '28px', width: '400px', fontFamily: 'Exo 2, sans-serif' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: linkTargetFolder ? '6px' : '20px' }}>Add link</h2>
            {linkTargetFolder && <p style={{ fontSize: '12px', color: '#555', fontFamily: 'Exo 2, sans-serif', marginBottom: '20px' }}>Saving to: {linkTargetFolder === '__private__' ? 'Private' : linkTargetFolder.split('/').map(p => p.replace(/_/g, ' ').replace(/^\d+\s+/, '')).join(' / ')}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#555', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>NAME</label>
                <input
                  autoFocus
                  value={linkName}
                  onChange={e => setLinkName(e.target.value)}
                  placeholder="e.g. Financial Model"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#555', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>URL</label>
                <input
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && linkName.trim() && linkUrl.trim()) createLink(); }}
                  placeholder="https://docs.google.com/..."
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#fff', fontSize: '14px', fontFamily: 'Exo 2, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setAddingLink(false); setLinkTargetFolder(null); }} style={{ padding: '9px 18px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#666', fontSize: '13px', fontFamily: 'Exo 2, sans-serif', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createLink} disabled={!linkName.trim() || !linkUrl.trim()} style={{ padding: '9px 18px', background: linkName.trim() && linkUrl.trim() ? '#fff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '7px', color: linkName.trim() && linkUrl.trim() ? '#000' : '#555', fontSize: '13px', fontWeight: '600', fontFamily: 'Exo 2, sans-serif', cursor: linkName.trim() && linkUrl.trim() ? 'pointer' : 'default' }}>Add link</button>
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
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