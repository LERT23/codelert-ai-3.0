import React, { useState, useEffect } from 'react';
import { FileCode, Copy, Check, Eye } from 'lucide-react';
import { t } from '../../i18n.ts';
import { highlightCode } from './utils.ts';

export const CollapsibleCodeBlock: React.FC<{ 
  code: string; 
  lang: string; 
  onPreview: () => void; 
  langCode: 'UA'|'EN';
  historyLength: number;
}> = ({ code, lang, onPreview, langCode, historyLength }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-collapse when a new message is added to history
  useEffect(() => {
    setIsOpen(false);
  }, [historyLength]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for sandboxed environments
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="my-3 border border-theme-border rounded overflow-hidden bg-theme-base relative z-10 max-w-full">
      <div 
        className="flex justify-between items-center p-2 bg-theme-header cursor-pointer hover:bg-theme-hover transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-theme-muted text-xs font-mono">
          <FileCode size={14} />
          <span>{lang || 'code'}</span>
          <span className="text-theme-accent ml-2">{isOpen ? `(${t[langCode].collapse})` : `(${t[langCode].expand})`}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="p-1 text-theme-muted hover:text-theme-accentHover rounded"
            title={t[langCode].openInEditor}
          >
            <Eye size={14} />
          </button>
          <button 
            onClick={handleCopy}
            className={`p-1 rounded flex items-center gap-1 transition-colors ${copied ? 'bg-green-600 text-white' : 'text-theme-muted hover:text-theme-text'}`}
            title={t[langCode].copyCode}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <pre 
          className="p-3 text-sm text-theme-text font-mono whitespace-pre-wrap break-all overflow-x-hidden max-w-full"
          dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
        />
      )}
    </div>
  );
};
