import React, { useState } from 'react';
import { FileCode, Copy, Check, Reply, Loader2, RefreshCw, AlertTriangle, FolderPlus, Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import { marked } from 'marked';
import { ChatMessage, FileChange, User } from '../../types.ts';
import { t } from '../../i18n.ts';
import { CollapsibleCodeBlock } from './CollapsibleCodeBlock.tsx';
import { GeneratedImage } from './GeneratedImage.tsx';
import { parseChangesFromText } from './utils.ts';

const renderer = new marked.Renderer();
renderer.image = (href, title, text) => {
  return `|||IMAGE:${href}:::${text}|||`;
};
renderer.link = (href, title, text) => {
  return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${text}</a>`;
};
marked.use({ renderer });

export const ChatMessageBubble: React.FC<{
  msg: ChatMessage;
  onApplyCode: (changes: FileChange[]) => Promise<{success: boolean, errors: string[]}>;
  onPreviewCode: (code: string, lang: string) => void;
  onReply: (msg: ChatMessage) => void;
  onRegenerate: (errorPrompt: string) => void;
  onQuickReply: (text: string) => void;
  lang: 'UA' | 'EN';
  fontFamily: string;
  user: User | null;
  historyLength: number;
  isLastMessage: boolean;
}> = ({ msg, onApplyCode, onPreviewCode, onReply, onRegenerate, onQuickReply, lang, fontFamily, user, historyLength, isLastMessage }) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(msg.applied || false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [applyErrors, setApplyErrors] = useState<string[]>([]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = msg.text;
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

  // Use the robust parser from utils.ts
  const changes = parseChangesFromText(msg.text);
  const hasChanges = changes.length > 0;
  
  const textLower = msg.text.toLowerCase();
  const impliesCodeChange = textLower.includes('file-op') || textLower.includes('[file:') || textLower.includes('[replace:') || textLower.includes('[create_folder:') || textLower.includes('ось оновлений код') || textLower.includes('я змінив') || textLower.includes('застосувати');
  const hasFileOpError = msg.role === 'model' && !hasChanges && impliesCodeChange;

  const handleApplyChanges = async () => {
    if (hasChanges && !isApplying) {
      setIsApplying(true);
      setApplyProgress(10);
      const interval = setInterval(() => setApplyProgress(p => Math.min(p + 15, 90)), 100);

      const result = await onApplyCode(changes);

      clearInterval(interval);
      setApplyProgress(100);

      setTimeout(() => {
        setIsApplying(false);
        setApplyProgress(0);
        if (result.success) {
          setApplied(true);
          setApplyErrors([]);
        } else {
          setApplyErrors(result.errors);
        }
      }, 300);
    }
  };

  const handleSaveImage = (src: string) => {
    const name = prompt('Введіть шлях та назву файлу (наприклад: assets/image.jpg):', 'image.jpg');
    if (name) {
      onApplyCode([{ type: 'UPDATE', path: name, content: src }]);
    }
  };

  const renderMessageContent = (text: string) => {
    const cleanText = text.replace(/\[AUTO_APPLY\]/g, '');
    
    // Split by all supported tags to render them nicely
    const splitRegex = /(\[FILE:[^\]]+\](?:\s*```[\w-]*\n[\s\S]*?```)?|\[REPLACE:[^\]]+\]\s*```(?:text|[\w-]*)\n<<<<\n[\s\S]*?\n====\n[\s\S]*?\n>>>>\n```|\[SAVE_ATTACHMENT:[^\]]+\]|\[CREATE_FOLDER:[^\]]+\]|\[DELETE:[^\]]+\]|\[RENAME:[^\]]+\])/g;
    const parts = cleanText.split(splitRegex);
    
    return parts.map((part, index) => {
      if (!part) return null;
      
      if (part.startsWith('[FILE:')) {
        const match = part.match(/\[FILE:\s*([^\]]+)\](?:\s*```([\w-]*)\n([\s\S]*?)```)?/);
        if (match) {
          const path = match[1].trim();
          const langStr = match[2] || path.split('.').pop() || 'code';
          const code = match[3] !== undefined ? match[3].trim() : '';
          return (
            <div key={index} className="my-3">
              <div className="text-xs text-theme-accent font-bold mb-1 flex items-center gap-1">
                <FileCode size={14} /> {path} {code === '' ? '(Порожній файл)' : ''}
              </div>
              {code !== '' && <CollapsibleCodeBlock code={code} lang={langStr} onPreview={() => onPreviewCode(code, langStr)} langCode={lang} historyLength={historyLength} />}
            </div>
          );
        }
      } else if (part.startsWith('[REPLACE:')) {
        const match = part.match(/\[REPLACE:\s*([^\]]+)\]\s*```(?:text|[\w-]*)\n<<<<\n([\s\S]*?)\n====\n([\s\S]*?)\n>>>>\n```/);
        if (match) {
          const path = match[1].trim();
          const oldCode = match[2];
          const newCode = match[3];
          return (
            <div key={index} className="my-3 border border-theme-border rounded overflow-hidden bg-theme-base relative z-10 max-w-full">
              <div className="p-2 bg-theme-header text-theme-muted text-xs font-mono flex items-center gap-2">
                <FileCode size={14} />
                <span>REPLACE in {path}</span>
              </div>
              <div className="p-2 bg-red-900/20 text-red-300 text-xs font-mono whitespace-pre-wrap border-b border-theme-border">
                - {oldCode.trim()}
              </div>
              <div className="p-2 bg-green-900/20 text-green-300 text-xs font-mono whitespace-pre-wrap">
                + {newCode.trim()}
              </div>
            </div>
          );
        }
      } else if (part.startsWith('[SAVE_ATTACHMENT:')) {
        const match = part.match(/\[SAVE_ATTACHMENT:\s*([^\]]+)\s*->\s*([^\]]+)\]/);
        if (match) {
          return (
            <div key={index} className="my-3 p-2 bg-theme-panel border border-theme-border rounded flex items-center gap-2 text-sm text-theme-text">
              <ImageIcon size={16} className="text-theme-accent" />
              <span>Збереження файлу: <strong>{match[1].trim()}</strong> ➡️ <strong>{match[2].trim()}</strong></span>
            </div>
          );
        }
      } else if (part.startsWith('[CREATE_FOLDER:')) {
        const match = part.match(/\[CREATE_FOLDER:\s*([^\]]+)\]/);
        if (match) {
          return (
            <div key={index} className="my-2 p-2 bg-theme-panel border border-theme-border rounded flex items-center gap-2 text-sm text-theme-text">
              <FolderPlus size={16} className="text-theme-accent" />
              <span>Створити папку: <strong>{match[1].trim()}</strong></span>
            </div>
          );
        }
      } else if (part.startsWith('[DELETE:')) {
        const match = part.match(/\[DELETE:\s*([^\]]+)\]/);
        if (match) {
          return (
            <div key={index} className="my-2 p-2 bg-red-900/20 border border-red-800/50 rounded flex items-center gap-2 text-sm text-red-300">
              <Trash2 size={16} />
              <span>Видалити: <strong>{match[1].trim()}</strong></span>
            </div>
          );
        }
      } else if (part.startsWith('[RENAME:')) {
        const match = part.match(/\[RENAME:\s*([^\]]+)\s*->\s*([^\]]+)\]/);
        if (match) {
          return (
            <div key={index} className="my-2 p-2 bg-theme-panel border border-theme-border rounded flex items-center gap-2 text-sm text-theme-text">
              <Edit2 size={16} className="text-theme-accent" />
              <span>Перейменувати: <strong>{match[1].trim()}</strong> ➡️ <strong>{match[2].trim()}</strong></span>
            </div>
          );
        }
      }
      
      const html = marked.parse(part, { async: false }) as string;
      const chunks = html.split(/\|\|\|IMAGE:(.*?):::(.*?)\|\|\|/g);
      
      if (chunks.length === 1) {
        return <div key={index} className="markdown-body relative z-10 max-w-full" style={{ fontFamily }} dangerouslySetInnerHTML={{ __html: html }} />;
      }

      return (
        <div key={index} className="markdown-body relative z-10 max-w-full" style={{ fontFamily }}>
          {chunks.map((chunk, i) => {
            if (i % 3 === 0) {
              return <span key={i} dangerouslySetInnerHTML={{ __html: chunk }} />;
            } else if (i % 3 === 1) {
              const href = chunk;
              const alt = chunks[i + 1];
              return <GeneratedImage key={i} src={href} alt={alt} onSave={handleSaveImage} />;
            }
            return null;
          })}
        </div>
      );
    });
  };

  const quickReplies = [
    { label: 'Приміняй', text: 'Так, я підтримую цю зміну, застосуй її.' },
    { label: 'Спробуй ще', text: 'Спробуй покращити дану ідею таким методом, щоб не виникло конфліктів у майбутньому та не порушити поточну структуру проекту.' },
    { label: 'Немає кнопки', text: 'Створи, будь ласка, правильний блок [FILE: шлях] або [REPLACE: шлях] для застосування коду, бо наразі кнопка відсутня.' }
  ];

  return (
    <div className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10`}>
      <div className={`flex gap-3 w-full max-w-full md:max-w-4xl min-w-0 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        
        <div className="flex-shrink-0 mt-auto">
          {msg.role === 'model' ? (
            <div className="w-12 h-12 rounded-full bg-theme-panel border border-theme-border flex items-center justify-center text-3xl shadow-lg">
              🕵️
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-theme-panel border border-theme-border flex items-center justify-center text-xl shadow-lg">
              {user?.avatar || '🙇‍♂️'}
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div 
            className={`p-4 rounded-xl relative group overflow-hidden flex flex-col min-w-0 ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-theme-panel to-theme-base text-theme-text rounded-br-none border border-theme-border shadow-md' 
                : msg.isError 
                  ? 'bg-red-900/30 text-red-300 border border-red-800/50 rounded-bl-none'
                  : 'bg-theme-panel text-theme-text rounded-bl-none border border-theme-border shadow-lg'
            }`}
          >
            {msg.role === 'model' && (
              <div className="flex items-center gap-2 mb-3 border-b border-theme-border pb-2">
                <span className="font-bold text-theme-accent text-lg">Code-Lert</span>
              </div>
            )}

            {msg.attachments && msg.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 relative z-10">
                {msg.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1 bg-black/30 px-2 py-1.5 rounded text-xs border border-theme-border max-w-full">
                    {att.data ? <img src={att.data} alt="attachment" className="w-4 h-4 object-cover rounded shrink-0" /> : <FileCode size={14} className="text-theme-accent shrink-0" />}
                    <span className="truncate">{att.name}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-base max-w-full overflow-hidden flex-1 min-w-0">
              {msg.role === 'model' ? renderMessageContent(msg.text) : <span className="whitespace-pre-wrap break-words relative z-10" style={{ fontFamily }}>{msg.text}</span>}
              {msg.isTyping && <span className="inline-block w-2 h-4 ml-1 bg-theme-accent animate-pulse relative z-10"></span>}
            </div>

            {hasFileOpError && !msg.isTyping && (
              <div className="mt-3 p-3 bg-red-900/30 border border-red-800/50 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
                  <AlertTriangle size={16} />
                  Помилка: ШІ не надав код у правильному форматі, тому кнопка застосування відсутня.
                </div>
                <button 
                  onClick={() => onRegenerate("Ви не надали код у правильному форматі [FILE: шлях] або [REPLACE: шлях]. Кнопка застосування не з'явилася. Будь ласка, виправте це і надішліть код правильно.")}
                  className="self-start px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-sm font-bold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={14} /> Перегенерувати
                </button>
              </div>
            )}

            {applyErrors.length > 0 && (
              <div className="mt-3 p-3 bg-red-900/30 border border-red-800/50 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
                  <AlertTriangle size={16} />
                  Помилка застосування змін:
                </div>
                <ul className="text-red-300 text-xs list-disc pl-4">
                  {applyErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
                <button 
                  onClick={() => onRegenerate(`Під час застосування вашого коду виникли помилки:\n${applyErrors.join('\n')}\nБудь ласка, виправте їх.`)}
                  className="self-start px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-sm font-bold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={14} /> Повідомити ШІ та перегенерувати
                </button>
              </div>
            )}

            {msg.role === 'model' && !msg.isError && !msg.isTyping && (
              <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-theme-border/50 relative z-10">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCopy}
                      className={`px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1 transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-theme-base text-theme-muted hover:text-theme-text'}`}
                      title={t[lang].copyAll}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />} {t[lang].copyAll}
                    </button>
                    <button 
                      onClick={() => onReply(msg)}
                      className="px-3 py-1.5 bg-theme-base text-theme-muted hover:text-theme-accentHover rounded text-sm font-bold flex items-center gap-1 transition-colors"
                      title={t[lang].reply}
                    >
                      <Reply size={14} /> {t[lang].reply}
                    </button>
                    <button 
                      onClick={() => onRegenerate("Перегенеруй свою останню відповідь, будь ласка.")}
                      className="px-3 py-1.5 bg-theme-base text-theme-muted hover:text-theme-accentHover rounded text-sm font-bold flex items-center gap-1 transition-colors"
                      title="Перегенерувати відповідь"
                    >
                      <RefreshCw size={14} /> Перегенерувати
                    </button>
                  </div>
                  
                  {hasChanges && (
                    <button 
                      onClick={handleApplyChanges}
                      disabled={isApplying}
                      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${applied ? 'bg-green-600 text-white' : 'bg-theme-accent hover:bg-theme-accentHover text-white disabled:opacity-50'}`}
                      title={t[lang].applyAll}
                    >
                      {isApplying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                      {applied ? 'Зміни застосовано' : isApplying ? t[lang].applyingChanges : t[lang].applyAll}
                    </button>
                  )}
                </div>
                {isApplying && (
                  <div className="w-full h-1 bg-theme-base rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-theme-accent transition-all duration-100" style={{ width: `${applyProgress}%` }}></div>
                  </div>
                )}
              </div>
            )}

            {msg.role === 'user' && (
              <div className="flex flex-wrap gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                <button 
                  onClick={handleCopy}
                  className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-theme-base text-theme-muted hover:text-theme-text'}`}
                  title={t[lang].copyAll}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>

          {/* Quick Replies */}
          {msg.role === 'model' && isLastMessage && !msg.isTyping && !msg.isError && (
            <div className="flex flex-wrap gap-2 mt-2 ml-4">
              {quickReplies.map((qr, i) => (
                <button
                  key={i}
                  onClick={() => onQuickReply(qr.text)}
                  className="px-3 py-1.5 bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-accent hover:border-theme-accent rounded-full text-xs font-bold transition-colors shadow-sm"
                >
                  {qr.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
