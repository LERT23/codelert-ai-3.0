import React, { useRef } from 'react';
import { Upload, Download, Save, HelpCircle } from 'lucide-react';
import { ThemeSettings, ProjectState, ThemeColor } from '../types.ts';
import { exportProjectState, parseImportedZip } from '../services/fileService.ts';
import { t } from '../i18n.ts';

interface SettingsProps {
  settings: ThemeSettings;
  setSettings: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  projectState: ProjectState;
  onImportState: (state: ProjectState) => void;
  onImportZip: (files: any[]) => void;
  lang: 'UA' | 'EN';
}

const themesList: { id: ThemeColor; name: string; color: string; text?: string }[] = [
  { id: 'brown', name: 'Coffee Life', color: '#3e2723' },
  { id: 'black', name: 'Black', color: '#111111' },
  { id: 'white', name: 'White', color: '#f3f4f6', text: '#1f2937' },
  { id: 'green', name: 'Green', color: '#064e3b' },
  { id: 'blue', name: 'Blue', color: '#0f172a' },
  { id: 'orange', name: 'Orange', color: '#7c2d12' }
];

const fontsList = [
  { id: 'sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'System Default' },
  { id: '"Fira Code", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Fira Code' },
  { id: '"Consolas", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Consolas' },
  { id: '"Ubuntu Mono", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Ubuntu Mono' },
  { id: '"Roboto Mono", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Roboto Mono' },
  { id: '"JetBrains Mono", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'JetBrains Mono' },
  { id: '"Source Code Pro", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Source Code Pro' },
  { id: '"Courier New", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Courier New' },
  { id: 'Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Arial' }
];

export const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  setSettings,
  projectState,
  onImportState,
  onImportZip,
  lang
}) => {
  const stateInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleExportState = () => {
    exportProjectState(projectState);
  };

  const handleStateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const state = JSON.parse(event.target?.result as string) as ProjectState;
        if (state.files && state.chatHistory) {
          onImportState(state);
        } else {
          alert('Невірний формат файлу стану.');
        }
      } catch (err) {
        alert('Помилка читання файлу стану.');
      }
    };
    reader.readAsText(file);
    if (stateInputRef.current) stateInputRef.current.value = '';
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const files = await parseImportedZip(file);
      onImportZip(files);
    } catch (err) {
      console.error(err);
    }
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  return (
    <div className="w-full h-full bg-theme-base flex flex-col p-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-theme-text mb-6 border-b border-theme-border pb-2">{t[lang].settings}</h2>
      
      <div className="space-y-6">
        <div className="p-3 bg-theme-panel rounded-lg border border-theme-border space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
            <input 
              type="checkbox" 
              checked={settings.aiModeStepByStep || false}
              onChange={(e) => setSettings({ ...settings, aiModeStepByStep: e.target.checked })}
              className="accent-theme-accent w-4 h-4"
            />
            <span>{t[lang].aiModeStepByStep}</span>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
            <input 
              type="checkbox" 
              checked={settings.aiModeLineReplace !== false}
              onChange={(e) => setSettings({ ...settings, aiModeLineReplace: e.target.checked })}
              className="accent-theme-accent w-4 h-4"
            />
            <span>{t[lang].aiModeLineReplace}</span>
          </label>
        </div>

        <div className="p-3 bg-theme-panel rounded-lg border border-theme-border">
          <label className="flex items-center gap-2 text-sm font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
            <input 
              type="checkbox" 
              checked={settings.autoBackup || false}
              onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
              className="accent-theme-accent w-4 h-4"
            />
            <span>{t[lang].autoBackup}</span>
          </label>
          {settings.autoBackup && (
            <select 
              value={settings.autoBackupInterval || 30}
              onChange={(e) => setSettings({ ...settings, autoBackupInterval: parseInt(e.target.value) })}
              className="w-full mt-3 bg-theme-header border border-theme-border text-theme-text rounded p-2 outline-none focus:border-theme-accent text-sm"
            >
              <option value={20}>20 {t[lang].minutes}</option>
              <option value={30}>30 {t[lang].minutes}</option>
              <option value={60}>60 {t[lang].minutes}</option>
            </select>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
            <input 
              type="checkbox" 
              checked={settings.newYearMode || false}
              onChange={(e) => setSettings({ ...settings, newYearMode: e.target.checked })}
              className="accent-theme-accent w-4 h-4"
            />
            <span>{t[lang].newYearMode}</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
            <input 
              type="checkbox" 
              checked={settings.useCustomCursor !== false}
              onChange={(e) => setSettings({ ...settings, useCustomCursor: e.target.checked })}
              className="accent-theme-accent w-4 h-4"
            />
            <span>{t[lang].customCursor}</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
            <input 
              type="checkbox" 
              checked={settings.enableAnimations !== false}
              onChange={(e) => setSettings({ ...settings, enableAnimations: e.target.checked })}
              className="accent-theme-accent w-4 h-4"
            />
            <span>{t[lang].enableAnimations}</span>
          </label>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-theme-muted">
              {t[lang].contextMode}
            </label>
            <div className="relative group">
              <HelpCircle size={14} className="text-theme-muted cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 w-56 p-2 bg-theme-panel text-theme-text text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {t[lang].contextTooltip}
              </div>
            </div>
          </div>
          <select 
            value={settings.contextMode || 'all'}
            onChange={(e) => setSettings({ ...settings, contextMode: e.target.value as 'selected' | 'all' })}
            className="w-full bg-theme-header border border-theme-border text-theme-text rounded p-2 outline-none focus:border-theme-accent"
          >
            <option value="all">{t[lang].contextModeAll}</option>
            <option value="selected">{t[lang].contextModeSelected}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-muted mb-2">
            {t[lang].fontSize}: {settings.fontSize}px
          </label>
          <input 
            type="range" 
            min="10" 
            max="24" 
            value={settings.fontSize}
            onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
            className="w-full accent-theme-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-muted mb-2">
            {t[lang].theme}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {themesList.map(theme => (
              <button 
                key={theme.id}
                onClick={() => setSettings({ ...settings, theme: theme.id })}
                className={`h-10 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-transform hover:scale-105 ${settings.theme === theme.id ? 'border-theme-accent scale-105' : 'border-transparent'}`}
                style={{ backgroundColor: theme.color, color: theme.text || '#fff' }}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-muted mb-2">
            {t[lang].fontFamily}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {fontsList.map(font => (
              <button 
                key={font.id}
                onClick={() => setSettings({ ...settings, fontFamily: font.id })}
                className={`p-2 rounded-lg border flex items-center justify-center transition-colors relative group ${settings.fontFamily === font.id ? 'border-theme-accent bg-theme-hover' : 'border-theme-border bg-theme-panel hover:bg-theme-hover'}`}
                style={{ fontFamily: font.id }}
                title={font.name}
              >
                <span className="text-xl font-bold text-theme-text">Tt</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-theme-panel text-theme-text text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-theme-border">
                  {font.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-muted mb-2">
            {t[lang].language}
          </label>
          <div className="flex gap-2">
            <button 
              onClick={() => setSettings({ ...settings, language: 'UA' })}
              className={`flex-1 py-1.5 rounded border ${settings.language === 'UA' ? 'bg-theme-accent border-theme-accentHover text-white' : 'bg-theme-header border-theme-border text-theme-muted'}`}
            >
              UA
            </button>
            <button 
              onClick={() => setSettings({ ...settings, language: 'EN' })}
              className={`flex-1 py-1.5 rounded border ${settings.language === 'EN' ? 'bg-theme-accent border-theme-accentHover text-white' : 'bg-theme-header border-theme-border text-theme-muted'}`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-theme-border space-y-3">
          <h3 className="text-sm font-bold text-theme-muted mb-2">{t[lang].projectManagement}</h3>
          
          <input type="file" accept=".codelert" ref={stateInputRef} onChange={handleStateFileChange} className="hidden" />
          <input type="file" accept=".zip" ref={zipInputRef} onChange={handleZipFileChange} className="hidden" />

          <button onClick={() => zipInputRef.current?.click()} className="w-full flex items-center gap-2 bg-theme-header hover:bg-theme-hover text-theme-text p-2 rounded border border-theme-border transition-colors text-sm">
            <Upload size={16} /> {t[lang].importZip}
          </button>
          
          <button onClick={() => stateInputRef.current?.click()} className="w-full flex items-center gap-2 bg-theme-header hover:bg-theme-hover text-theme-text p-2 rounded border border-theme-border transition-colors text-sm">
            <Download size={16} /> {t[lang].loadState}
          </button>
          
          <button onClick={handleExportState} className="w-full flex items-center gap-2 bg-theme-header hover:bg-theme-hover text-theme-text p-2 rounded border border-theme-border transition-colors text-sm" title="Зберігає файли, історію чату та налаштування">
            <Save size={16} /> {t[lang].saveState} (Код + Чат)
          </button>
        </div>
      </div>
    </div>
  );
};
