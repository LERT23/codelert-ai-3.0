import React, { useState } from 'react';
import { 
  Menu, 
  Download, 
  Settings,
  UserCircle,
  Crown,
  LogOut,
  X
} from 'lucide-react';
import { ProjectState, User, ThemeSettings } from '../types.ts';
import { exportProjectToZip } from '../services/fileService.ts';
import { t } from '../i18n.ts';
import { GoogleAuthModal } from './Header/GoogleAuthModal.tsx';

interface HeaderProps {
  projectName: string;
  setProjectName: (name: string) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  projectState: ProjectState;
  user: User | null;
  setUser: (user: User | null) => void;
  lang: 'UA' | 'EN';
  settings: ThemeSettings;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  setProjectName,
  toggleLeftSidebar,
  toggleRightSidebar,
  projectState,
  user,
  setUser,
  lang,
  settings
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExportZip = async () => {
    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportProjectToZip(projectState.files, projectName, (percent) => {
        setExportProgress(percent);
      });
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 500);
    }
  };

  const handleLogin = (email: string) => {
    const isAdmin = email.toLowerCase() === 'lipinsky2033@gmail.com';
    const name = email.split('@')[0];
    setUser({ email, name, isAdmin, avatar: '🙇‍♂️' });
    setShowAuthModal(false);
  };

  const emojis = ['🙇‍♂️', '👨‍💻', '👩‍💻', '🤖', '👾', '👽', '🤓', '🚀', '😎', '🐱‍💻'];
  
  const handleAvatarClick = () => {
    if (user) {
      const currentIndex = emojis.indexOf(user.avatar || '🙇‍♂️');
      const nextIndex = (currentIndex + 1) % emojis.length;
      setUser({ ...user, avatar: emojis[nextIndex] });
    }
  };

  return (
    <>
      {showAuthModal && <GoogleAuthModal onClose={() => setShowAuthModal(false)} onLogin={handleLogin} />}
      <header className="h-14 bg-theme-header border-b border-theme-border flex items-center justify-between px-4 shrink-0 relative z-50">
        {settings.newYearMode && (
          <div className="absolute top-0 left-0 w-full h-4 pointer-events-none flex justify-around overflow-hidden opacity-90 z-50">
            {[...Array(40)].map((_, i) => (
              <div 
                key={i} 
                className={`w-3 h-4 rounded-full ${i % 3 === 0 ? 'bg-red-500' : i % 3 === 1 ? 'bg-green-500' : 'bg-yellow-400'} animate-pulse shadow-[0_0_10px_currentColor]`} 
                style={{ animationDelay: `${i * 0.1}s`, marginTop: i % 2 === 0 ? '-4px' : '0' }}
              ></div>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLeftSidebar}
            className="p-2 hover:bg-theme-hover rounded text-theme-text transition-colors"
          >
            <Menu size={22} />
          </button>
          
          <div className="flex items-center gap-2">
            <span 
              className="font-extrabold text-theme-text text-xl tracking-wide flex items-center gap-1"
              style={{ 
                WebkitTextStroke: '1px rgba(0,0,0,0.5)', 
                textShadow: '0 0 10px var(--color-accent), 0 2px 4px rgba(0,0,0,0.5)' 
              }}
            >
              CodeLert AI {settings.newYearMode && <span className="text-2xl -mt-1 ml-1">🎅🎄🎁</span>}
            </span>
            <span className="text-theme-accent text-sm font-bold">2.0</span>
          </div>

          <div className="h-6 w-px bg-theme-border mx-2"></div>

          <input 
            type="text" 
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-theme-border focus:border-theme-accent focus:outline-none text-theme-text px-1 py-0.5 w-48 transition-colors"
          />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <button 
            onClick={handleExportZip} 
            disabled={isExporting}
            className="flex items-center gap-2 bg-theme-accent hover:bg-theme-accentHover text-white px-6 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-lg disabled:opacity-70"
          >
            <Download size={18} />
            {isExporting ? `Створення архіву... ${Math.round(exportProgress)}%` : t[lang].downloadProject}
          </button>
          {isExporting && (
            <div className="w-full h-1 bg-theme-base rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${exportProgress}%` }}></div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block text-xs text-theme-muted font-medium mr-2">
            {t[lang].author}
          </div>

          {user ? (
            <div className="flex items-center gap-2 bg-theme-base px-3 py-1.5 rounded border border-theme-border">
              <div className="relative cursor-pointer select-none" onClick={handleAvatarClick} title="Змінити аватар">
                {user.avatar ? (
                  <span className="text-xl leading-none block">{user.avatar}</span>
                ) : (
                  <UserCircle size={22} className="text-theme-muted" />
                )}
                {user.isAdmin && (
                  <Crown size={12} className="absolute -top-2 -right-2 text-amber-400 fill-amber-400" />
                )}
              </div>
              <span className={`text-sm ${user.isAdmin ? 'text-amber-400 font-bold' : 'text-theme-text'}`}>
                {user.name}
              </span>
              <button onClick={() => setUser(null)} className="ml-2 text-theme-muted hover:text-red-400" title={t[lang].logout}>
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 bg-white text-gray-800 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t[lang].login}
            </button>
          )}

          <div className="h-6 w-px bg-theme-border mx-1"></div>

          <button 
            onClick={toggleRightSidebar}
            className="p-2 ml-1 hover:bg-theme-hover rounded text-theme-text transition-colors"
          >
            <Settings size={22} />
          </button>
        </div>
      </header>
    </>
  );
};
