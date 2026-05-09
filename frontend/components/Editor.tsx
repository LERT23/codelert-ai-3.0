import React, { useState, useEffect, useRef } from 'react';
import { FileNode } from '../types.ts';

interface EditorProps {
  activeFileId: string | null;
  files: FileNode[];
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  fontSize: number;
}

export const Editor: React.FC<EditorProps> = ({ activeFileId, files, setFiles, fontSize }) => {
  const [content, setContent] = useState('');
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Find active file recursively
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
    if (activeFileId) {
      const file = findFile(files, activeFileId);
      if (file && !file.isFolder) {
        setActiveFile(file);
        setContent(file.content || '');
      } else {
        setActiveFile(null);
        setContent('');
      }
    } else {
      setActiveFile(null);
      setContent('');
    }
  }, [activeFileId, files]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (activeFileId) {
      setFiles(prevFiles => {
        const updateContent = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.id === activeFileId) {
              return { ...node, content: newContent };
            }
            if (node.children) {
              return { ...node, children: updateContent(node.children) };
            }
            return node;
          });
        };
        return updateContent(prevFiles);
      });
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      
      // Update state and cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
      
      // Trigger update to parent
      handleChange({ target: { value: newContent } } as any);
    }
  };

  if (!activeFile) {
    return (
      <div className="flex-1 bg-[#271814] flex items-center justify-center text-brown-600">
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-20">{"{ }"}</div>
          <p>Виберіть файл для редагування</p>
        </div>
      </div>
    );
  }

  const lineCount = content.split('\n').length;
  const lines = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col bg-[#1e120f] overflow-hidden">
      <div className="h-10 bg-brown-900 border-b border-brown-800 flex items-center px-4 shrink-0">
        <span className="text-brown-200 text-sm font-mono">{activeFile.name}</span>
      </div>
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line numbers */}
        <div 
          ref={lineNumbersRef}
          className="w-12 bg-[#1a0f0c] border-r border-brown-800 text-brown-600 text-right pr-2 py-4 font-mono select-none overflow-hidden"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}
        >
          {lines.map(line => (
            <div key={line}>{line}</div>
          ))}
        </div>
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-brown-100 p-4 font-mono resize-none outline-none whitespace-pre"
          style={{ 
            fontSize: `${fontSize}px`, 
            lineHeight: '1.5',
            tabSize: 2
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
};
