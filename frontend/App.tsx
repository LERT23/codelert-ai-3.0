import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { FileExplorer } from './components/FileExplorer.tsx';
import { Chat } from './components/Chat.tsx';
import { Settings } from './components/Settings.tsx';
import { PreviewModal } from './components/PreviewModal.tsx';
import { LoadingScreen } from './components/App/LoadingScreen.tsx';
import { SnowEffect } from './components/App/SnowEffect.tsx';
import { GiftSpawner } from './components/App/GiftSpawner.tsx';
import { ProjectState, FileNode, ChatMessage, User, ThemeSettings, FileChange } from './types.ts';
import { generateId, saveProjectStateDB, loadProjectStateDB, exportProjectToZip } from './services/fileService.ts';
import { applyChangesToFiles } from './services/projectService.ts';
import { t } from './i18n.ts';

const themesConfig = {
  brown: { base: '#271814', panel: '#3e2723', header: '#4e342e', hover: '#5d4037', border: '#694c41', text: '#eaddd7', muted: '#d2bab0', accent: '#b45309', accentHover: '#d97706' },
  black: { base: '#000000', panel: '#111111', header: '#1a1a1a', hover: '#2a2a2a', border: '#333333', text: '#f5f5f5', muted: '#a3a3a3', accent: '#3b82f6', accentHover: '#60a5fa' },
  white: { base: '#ffffff', panel: '#e0f2fe', header: '#f3f4f6', hover: '#bae6fd', border: '#cbd5e1', text: '#0f172a', muted: '#475569', accent: '#0284c7', accentHover: '#0369a1' },
  green: { base: '#022c22', panel: '#064e3b', header: '#065f46', hover: '#047857', border: '#059669', text: '#d1fae5', muted: '#6ee7b7', accent: '#10b981', accentHover: '#34d399' },
  blue: { base: '#082f49', panel: '#0f172a', header: '#1e293b', hover: '#334155', border: '#475569', text: '#e0f2fe', muted: '#94a3b8', accent: '#0ea5e9', accentHover: '#38bdf8' },
  orange: { base: '#431407', panel: '#7c2d12', header: '#9a3412', hover: '#c2410c', border: '#ea580c', text: '#ffedd5', muted: '#fdba74', accent: '#f97316', accentHover: '#fb923c' }
};

const App: React.FC = () => {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(250);
  const [includeContext, setIncludeContext] = useState(false);
  
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewTempCode, setPreviewTempCode] = useState<{code: string, lang: string} | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [projectName, setProjectName] = useState('MyProject');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<ThemeSettings>({ 
    fontSize: 15, 
    theme: 'brown',
    language: 'EN',
    fontFamily: '"Fira Code", monospace',
    contextMode: 'all',
    newYearMode: false,
    autoBackup: false,
    autoBackupInterval: 30,
    aiModeStepByStep: false,
    aiModeLineReplace: true,
    useCustomCursor: true,
    enableAnimations: true
  });

  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 3000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(100, Math.floor((elapsed / duration) * 100));
      setLoadProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => setIsAppLoading(false), 200);
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadProjectStateDB().then(state => {
      if (state) {
        setProjectName(state.projectName || 'MyProject');
        setFiles(state.files || []);
        setChatHistory(state.chatHistory || []);
        if (state.settings) setSettings({ ...settings, ...state.settings });
      } else {
        const saved = localStorage.getItem('codelert_autosave');
        if (saved) {
          try {
            const state: ProjectState = JSON.parse(saved);
            setProjectName(state.projectName || 'MyProject');
            setFiles(state.files || []);
            setChatHistory(state.chatHistory || []);
            if (state.settings) setSettings({ ...settings, ...state.settings });
          } catch (e) {
            console.error("Failed to load autosave", e);
          }
        }
      }
    }).catch(e => console.error("Failed to load from DB", e));
    
    const savedUser = localStorage.getItem('codelert_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch(e) {}
    }
  }, []);

  // Debounced save to localStorage to prevent performance issues and quota errors
  useEffect(() => {
    const state: ProjectState = { projectName, files, chatHistory, settings };
    
    // Save to IndexedDB immediately
    saveProjectStateDB(state).catch(e => {
      console.error("Failed to save to DB", e);
    });

    // Debounce localStorage save
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('codelert_autosave', JSON.stringify({
          ...state,
          // Truncate large files for localStorage to avoid QuotaExceededError
          files: state.files.map(f => ({...f, content: f.content && f.content.length > 100000 ? '' : f.content}))
        }));
      } catch(err) {
        console.error("LocalStorage quota exceeded");
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [projectName, files, chatHistory, settings]);

  useEffect(() => {
    if (!settings.autoBackup) return;
    const intervalMs = (settings.autoBackupInterval || 30) * 60 * 1000;
    const timer = setInterval(() => {
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
      exportProjectToZip(filesRef.current, `CodeLert_Backup_${dateStr}`);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [settings.autoBackup, settings.autoBackupInterval]);

  useEffect(() => {
    const root = document.documentElement;
    let t = themesConfig[settings.theme] || themesConfig['brown'];
    
    if (settings.newYearMode) {
      t = {
        base: 'rgba(2, 44, 34, 0.85)',
        panel: 'rgba(6, 78, 59, 0.9)',
        header: 'rgba(6, 95, 70, 0.95)',
        hover: 'rgba(4, 120, 87, 0.8)',
        border: 'rgba(5, 150, 105, 0.5)',
        text: '#d1fae5',
        muted: '#6ee7b7',
        accent: '#ef4444',
        accentHover: '#dc2626'
      };
      document.body.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10 L15 35 L25 35 L10 55 L50 55 L35 35 L45 35 Z' fill='%23064e3b' fill-opacity='0.4'/%3E%3C/svg%3E\")";
      document.body.style.backgroundColor = "#022c22";
    } else {
      document.body.style.backgroundImage = "none";
      document.body.style.backgroundColor = t.base;
    }

    root.style.setProperty('--color-base', t.base);
    root.style.setProperty('--color-panel', t.panel);
    root.style.setProperty('--color-header', t.header);
    root.style.setProperty('--color-hover', t.hover);
    root.style.setProperty('--color-border', t.border);
    root.style.setProperty('--color-text', t.text);
    root.style.setProperty('--color-muted', t.muted);
    root.style.setProperty('--color-accent', t.accent);
    root.style.setProperty('--color-accent-hover', t.accentHover);

    // Dynamic Cursor Generation based on theme accent color
    const cursorColor = encodeURIComponent(t.accent);
    const pointerColor = encodeURIComponent(t.accentHover);
    
    const cursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${cursorColor}" stroke="white" stroke-width="1.5"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.36z"/></svg>`;
    const pointerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${pointerColor}" stroke="white" stroke-width="1.5"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.36z"/></svg>`;

    root.style.setProperty('--cursor-default', `url('data:image/svg+xml;utf8,${cursorSvg}') 4 4, auto`);
    root.style.setProperty('--cursor-pointer', `url('data:image/svg+xml;utf8,${pointerSvg}') 4 4, pointer`);

    if (settings.useCustomCursor !== false) {
      document.body.classList.add('custom-cursor-enabled');
    } else {
      document.body.classList.remove('custom-cursor-enabled');
    }

    if (settings.enableAnimations === false) {
      document.body.classList.add('disable-animations');
    } else {
      document.body.classList.remove('disable-animations');
    }

  }, [settings.theme, settings.newYearMode, settings.useCustomCursor, settings.enableAnimations]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('codelert_user', JSON.stringify(user));
      handleApplyCode([{ type: 'UPDATE', path: '.temp/session.json', content: JSON.stringify(user, null, 2) }]);
    } else {
      localStorage.removeItem('codelert_user');
      handleApplyCode([{ type: 'DELETE', path: '.temp/session.json' }]);
    }
  }, [user]);

  useEffect(() => {
    window.CodeLertAPI = {
      getFiles: () => files,
      addFile: (name: string, content: string, parentId?: string) => {
        const newNode: FileNode = { id: generateId(), name, content, isFolder: false, parentId: parentId || null };
        setFiles(prev => [...prev, newNode]);
      },
      openPreview: (fileId: string) => {
        setPreviewFileId(fileId);
      },
      sendMessageToAI: (msg: string) => {
        console.warn("sendMessageToAI is handled inside Chat component");
      }
    };
  }, [files]);

  const handleImportState = (state: ProjectState) => {
    setProjectName(state.projectName || 'ImportedProject');
    setFiles(state.files || []);
    setChatHistory(state.chatHistory || []);
    if (state.settings) setSettings({ ...settings, ...state.settings });
    setPreviewFileId(null);
  };

  const handleImportZip = (importedFiles: FileNode[]) => {
    if (confirm('Імпорт архіву замінить поточні файли. Продовжити?')) {
      setFiles(importedFiles);
      setPreviewFileId(null);
    }
  };

  const handlePreviewCode = (code: string, lang: string) => {
    setPreviewTempCode({ code, lang });
  };

  const handleClearAll = () => {
    setFiles(prev => prev.filter(f => f.name === '.temp'));
    setChatHistory(prev => [...prev, {
      id: generateId(),
      role: 'model',
      text: t[settings.language].structureCleared,
      isError: false
    }]);
    setSelectedFileIds(new Set());
    setPreviewFileId(null);
    setPreviewTempCode(null);
  };

  const handleRefreshStructure = async () => {
    const state = await loadProjectStateDB();
    if (state && state.files) {
      setFiles(state.files);
    }
  };

  const handleApplyCode = async (changes: FileChange[]): Promise<{success: boolean, errors: string[]}> => {
    return new Promise(resolve => {
      setFiles(prevFiles => {
        try {
          const newFiles = applyChangesToFiles(prevFiles, changes);
          resolve({ success: true, errors: [] });
          return newFiles;
        } catch (e: any) {
          resolve({ success: false, errors: [e.message || 'Unknown error applying changes'] });
          return prevFiles;
        }
      });
    });
  };

  const handleAddTempFile = (filename: string, content: string) => {
    handleApplyCode([{ type: 'UPDATE', path: `.temp/${filename}`, content }]);
  };

  const handleAddFiles = (newFiles: FileNode[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleSidebarResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setLeftSidebarWidth(Math.max(200, Math.min(startWidth + deltaX, window.innerWidth * 0.5)));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (isAppLoading) {
    return <LoadingScreen progress={loadProgress} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans bg-theme-base text-theme-text relative">
      {settings.newYearMode && settings.enableAnimations !== false && <SnowEffect />}
      {settings.newYearMode && settings.enableAnimations !== false && <GiftSpawner />}
      
      <Header 
        projectName={projectName}
        setProjectName={setProjectName}
        toggleLeftSidebar={() => setShowLeftSidebar(!showLeftSidebar)}
        toggleRightSidebar={() => setShowRightSidebar(!showRightSidebar)}
        projectState={{ projectName, files, chatHistory, settings }}
        user={user}
        setUser={setUser}
        lang={settings.language}
        settings={settings}
      />
      
      <div className="flex-1 flex overflow-hidden relative z-10">
        {showLeftSidebar && (
          <div 
            className="shrink-0 border-r border-theme-border bg-theme-base/90 backdrop-blur-sm relative"
            style={{ width: `${leftSidebarWidth}px` }}
          >
            <FileExplorer 
              files={files} 
              setFiles={setFiles}
              onPreviewFile={(id) => setPreviewFileId(id)}
              includeContext={includeContext}
              setIncludeContext={setIncludeContext}
              lang={settings.language}
              fontFamily={settings.fontFamily}
              onShowClearConfirm={() => setShowClearConfirm(true)}
              selectedFileIds={selectedFileIds}
              setSelectedFileIds={setSelectedFileIds}
              onRefresh={handleRefreshStructure}
              contextMode={settings.contextMode || 'selected'}
            />
            <div 
              className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-theme-accent transition-colors z-20"
              onMouseDown={handleSidebarResizeMouseDown}
            />
          </div>
        )}
        
        <div className={`flex-1 flex flex-col bg-theme-base/80 backdrop-blur-sm transition-all duration-300 items-center min-w-0`}>
          <div className={`w-full h-full flex flex-col transition-all duration-300 min-w-0 ${!showLeftSidebar && !showRightSidebar ? 'max-w-5xl border-x border-theme-border shadow-2xl bg-theme-base' : ''}`}>
            <Chat 
              history={chatHistory}
              setHistory={setChatHistory}
              projectFiles={files}
              onPreviewCode={handlePreviewCode}
              includeContext={includeContext}
              onApplyCode={handleApplyCode}
              lang={settings.language}
              fontSize={settings.fontSize}
              fontFamily={settings.fontFamily}
              selectedFileIds={selectedFileIds}
              user={user}
              onAddTempFile={handleAddTempFile}
              contextMode={settings.contextMode || 'selected'}
              settings={settings}
              onAddFiles={handleAddFiles}
            />
          </div>
        </div>
        
        {showRightSidebar && (
          <div className="w-1/4 min-w-[300px] shrink-0 border-l border-theme-border bg-theme-base/90 backdrop-blur-sm">
            <Settings 
              settings={settings} 
              setSettings={setSettings} 
              projectState={{ projectName, files, chatHistory, settings }}
              onImportState={handleImportState}
              onImportZip={handleImportZip}
              lang={settings.language}
            />
          </div>
        )}
      </div>

      {(previewFileId || previewTempCode) && (
        <PreviewModal 
          fileId={previewFileId}
          tempCode={previewTempCode}
          files={files}
          setFiles={setFiles}
          onClose={() => {
            setPreviewFileId(null);
            setPreviewTempCode(null);
          }}
          fontSize={settings.fontSize}
          lang={settings.language}
        />
      )}

      {showClearConfirm && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-theme-panel p-6 rounded-xl border border-theme-border shadow-2xl max-w-md w-full">
            <h3 className="text-lg font-bold text-theme-text mb-4">Очистити структуру проекту?</h3>
            <p className="text-theme-muted mb-6">Ви впевнені, що хочете видалити всі файли та папки? Цю дію неможливо скасувати.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded bg-theme-base text-theme-text hover:bg-theme-hover transition-colors">Ні, скасувати</button>
              <button onClick={() => {
                handleClearAll();
                setShowClearConfirm(false);
              }} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500 transition-colors">Так, очистити</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
