import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit2, Check } from 'lucide-react';
import { FileNode } from '../types.ts';
import { getMimeTypeAndIsText } from '../services/fileService.ts';
import { t } from '../i18n.ts';

interface PreviewModalProps {
  fileId?: string | null;
  tempCode?: { code: string; lang: string } | null;
  files: FileNode[];
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  onClose: () => void;
  fontSize: number;
  lang: 'UA' | 'EN';
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ 
  fileId, 
  tempCode, 
  files, 
  setFiles, 
  onClose, 
  fontSize,
  lang
}) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'text' | 'image' | 'audio' | 'video' | 'unknown'>('text');
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const findFile = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFile(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  useEffect(() => {
    setIsEditing(false);
    if (fileId) {
      const file = findFile(files, fileId);
      if (file && !file.isFolder) {
        setContent(file.content || '');
        setTitle(file.name);
        const { category: cat } = getMimeTypeAndIsText(file.name);
        setCategory(cat);
      }
    } else if (tempCode) {
      setContent(tempCode.code);
      setTitle(`Preview: ${tempCode.lang || 'code'}`);
      setCategory('text');
    }
  }, [fileId, tempCode, files]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleSave = () => {
    if (fileId && category === 'text') {
      setFiles(prevFiles => {
        const updateContent = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.id === fileId) {
              return { ...node, content };
            }
            if (node.children) {
              return { ...node, children: updateContent(node.children) };
            }
            return node;
          });
        };
        return updateContent(prevFiles);
      });
      alert(t[lang].saved);
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isEditing) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const renderContent = () => {
    if (category === 'image') {
      return (
        <div className="flex-1 flex items-center justify-center bg-black/50 p-4 overflow-auto">
          <img src={content} alt={title} className="max-w-full max-h-full object-contain rounded shadow-lg" />
        </div>
      );
    }
    if (category === 'video') {
      return (
        <div className="flex-1 flex items-center justify-center bg-black/50 p-4">
          <video src={content} controls className="max-w-full max-h-full rounded shadow-lg" />
        </div>
      );
    }
    if (category === 'audio') {
      return (
        <div className="flex-1 flex items-center justify-center bg-black/50 p-4">
          <audio src={content} controls className="w-full max-w-md" />
        </div>
      );
    }

    const lineCount = content.split('\n').length;
    const lines = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1);

    return (
      <div className="flex-1 flex overflow-hidden relative">
        <div 
          ref={lineNumbersRef}
          className="w-12 bg-theme-base border-r border-theme-border text-theme-muted text-right pr-2 py-4 font-mono select-none overflow-hidden"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}
        >
          {lines.map(line => (
            <div key={line}>{line}</div>
          ))}
        </div>
        
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={!isEditing}
          className={`flex-1 bg-transparent text-theme-text p-4 font-mono resize-none outline-none whitespace-pre ${!isEditing ? 'opacity-80' : ''}`}
          style={{ 
            fontSize: `${fontSize}px`, 
            lineHeight: '1.5',
            tabSize: 2
          }}
          spellCheck={false}
        />
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="w-full max-w-5xl h-full max-h-[80vh] bg-theme-panel rounded-xl shadow-2xl flex flex-col overflow-hidden border border-theme-border">
        
        <div className="h-12 bg-theme-header border-b border-theme-border flex items-center justify-between px-4 shrink-0">
          <span className="text-theme-text font-bold font-mono">{title}</span>
          <div className="flex items-center gap-2">
            {fileId && category === 'text' && (
              !isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-theme-base hover:bg-theme-hover text-theme-text rounded text-sm transition-colors"
                >
                  <Edit2 size={14} /> {t[lang].editFile}
                </button>
              ) : (
                <button 
                  onClick={() => { handleSave(); setIsEditing(false); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm transition-colors"
                >
                  <Check size={14} /> {t[lang].save}
                </button>
              )
            )}
            <button 
              onClick={onClose}
              className="p-1.5 text-theme-muted hover:text-red-400 hover:bg-theme-hover rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};
