import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  FolderPlus, 
  Trash2,
  FileCode2,
  UploadCloud,
  Eye,
  HelpCircle,
  Edit2,
  RefreshCw,
  ChevronsUpDown,
  Music,
  Image as ImageIcon,
  Play,
  FileText,
  XCircle
} from 'lucide-react';
import { FileNode } from '../types.ts';
import { generateId, parseFolderUpload, parseDroppedItems } from '../services/fileService.ts';
import { t } from '../i18n.ts';

interface FileExplorerProps {
  files: FileNode[];
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  onPreviewFile: (id: string) => void;
  includeContext: boolean;
  setIncludeContext: (val: boolean) => void;
  lang: 'UA' | 'EN';
  fontFamily: string;
  onShowClearConfirm: () => void;
  selectedFileIds: Set<string>;
  setSelectedFileIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onRefresh: () => Promise<void>;
  contextMode: 'selected' | 'all';
}

const getFileDisplay = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return { Icon: Music, colorClass: 'text-purple-400' };
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
    return { Icon: ImageIcon, colorClass: 'text-green-400' };
  }
  if (['exe', 'bat', 'sh', 'cmd', 'bin'].includes(ext)) {
    return { Icon: Play, colorClass: 'text-blue-400' };
  }
  return { Icon: FileText, colorClass: 'text-theme-text' };
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  setFiles,
  onPreviewFile,
  includeContext,
  setIncludeContext,
  lang,
  fontFamily,
  onShowClearConfirm,
  selectedFileIds,
  setSelectedFileIds,
  onRefresh,
  contextMode
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<{loadedFiles: number, loadedSize: number, totalFiles: number, totalSize: number} | null>(null);
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectionBox, setSelectionBox] = useState({ startX: 0, startY: 0, currentX: 0, currentY: 0, isSelecting: false });
  const [isDragOverExternal, setIsDragOverExternal] = useState(false);

  const [dialog, setDialog] = useState<{
    type: 'newFile' | 'newFolder' | 'rename' | 'delete';
    targetId: string | null;
    initialValue: string;
  } | null>(null);
  const [dialogInput, setDialogInput] = useState('');

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCollapseExpandAll = () => {
    if (expandedFolders.size > 0) {
      setExpandedFolders(new Set());
    } else {
      const allFolderIds = new Set<string>();
      const collectFolders = (nodes: FileNode[]) => {
        nodes.forEach(n => {
          if (n.isFolder && n.name !== '.temp') {
            allFolderIds.add(n.id);
            if (n.children) collectFolders(n.children);
          }
        });
      };
      collectFolders(files);
      setExpandedFolders(allFolderIds);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshProgress(10);
    const interval = setInterval(() => {
      setRefreshProgress(p => Math.min(p + 20, 90));
    }, 100);

    await onRefresh();

    clearInterval(interval);
    setRefreshProgress(100);
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshProgress(0);
    }, 300);
  };

  const openDialog = (type: 'newFile' | 'newFolder' | 'rename' | 'delete', targetId: string | null, initialValue: string = '') => {
    setDialogInput(initialValue);
    setDialog({ type, targetId, initialValue });
  };

  const closeDialog = () => {
    setDialog(null);
    setDialogInput('');
  };

  const handleDialogSubmit = () => {
    if (!dialog) return;

    if (dialog.type === 'newFile') {
      if (!dialogInput.trim()) return closeDialog();
      const newNode: FileNode = { id: generateId(), name: dialogInput, isFolder: false, content: '', parentId: dialog.targetId };
      addNode(newNode, dialog.targetId);
    } 
    else if (dialog.type === 'newFolder') {
      if (!dialogInput.trim()) return closeDialog();
      const newNode: FileNode = { id: generateId(), name: dialogInput, isFolder: true, children: [], parentId: dialog.targetId };
      addNode(newNode, dialog.targetId);
      if (dialog.targetId) setExpandedFolders(prev => new Set(prev).add(dialog.targetId!));
    } 
    else if (dialog.type === 'rename') {
      if (!dialogInput.trim() || dialogInput === dialog.initialValue) return closeDialog();
      setFiles(prevFiles => {
        const updateNode = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.id === dialog.targetId) return { ...node, name: dialogInput };
            if (node.children) return { ...node, children: updateNode(node.children) };
            return node;
          });
        };
        return updateNode(prevFiles);
      });
    } 
    else if (dialog.type === 'delete') {
      setFiles(prevFiles => {
        const removeNode = (nodes: FileNode[]): FileNode[] => {
          return nodes.filter(node => {
            if (node.id === dialog.targetId) return false;
            if (node.children) node.children = removeNode(node.children);
            return true;
          });
        };
        return removeNode(prevFiles);
      });
      if (dialog.targetId && selectedFileIds.has(dialog.targetId)) {
        const newSel = new Set(selectedFileIds);
        newSel.delete(dialog.targetId);
        setSelectedFileIds(newSel);
      }
    }
    closeDialog();
  };

  const addNode = (newNode: FileNode, parentId: string | null) => {
    setFiles(prevFiles => {
      if (!parentId) return [...prevFiles, newNode];

      const updateChildren = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            return { ...node, children: [...(node.children || []), newNode] };
          }
          if (node.children) {
            return { ...node, children: updateChildren(node.children) };
          }
          return node;
        });
      };

      return updateChildren(prevFiles);
    });
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const controller = new AbortController();
    setUploadAbortController(controller);

    try {
      const newFiles = await parseFolderUpload(fileList, (loadedFiles, loadedSize, totalFiles, totalSize) => {
        setUploadProgress({ loadedFiles, loadedSize, totalFiles, totalSize });
      }, controller.signal);
      setFiles(prev => [...prev, ...newFiles]);
    } catch (err: any) {
      if (err.message !== 'Upload cancelled') {
        console.error(err);
      }
    } finally {
      setUploadProgress(null);
      setUploadAbortController(null);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const cancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const newSel = new Set(selectedFileIds);
      if (newSel.has(id)) newSel.delete(id);
      else newSel.add(id);
      setSelectedFileIds(newSel);
    } else {
      setSelectedFileIds(new Set([id]));
      onPreviewFile(id);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('text/plain')) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      setIsDragOverExternal(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = () => {
    setIsDragOverExternal(false);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverExternal(false);

    if (e.dataTransfer.types.includes('text/plain')) {
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === targetFolderId) return;

      setFiles(prevFiles => {
        let draggedNode: FileNode | null = null;
        
        const removeNode = (nodes: FileNode[]): FileNode[] => {
          return nodes.filter(node => {
            if (node.id === draggedId) {
              draggedNode = node;
              return false;
            }
            if (node.children) {
              node.children = removeNode(node.children);
            }
            return true;
          });
        };
        
        let newFiles = removeNode(prevFiles);
        
        if (!draggedNode) return prevFiles;
        
        const isDescendant = (parentId: string | null, targetId: string | null): boolean => {
          if (targetId === null) return false;
          if (parentId === targetId) return true;
          const findParent = (nodes: FileNode[], id: string): string | null | undefined => {
            for (const n of nodes) {
              if (n.id === id) return n.parentId;
              if (n.children) {
                const p = findParent(n.children, id);
                if (p !== undefined) return p;
              }
            }
            return undefined;
          };
          let currentTargetParent = findParent(newFiles, targetId);
          while (currentTargetParent) {
            if (currentTargetParent === parentId) return true;
            currentTargetParent = findParent(newFiles, currentTargetParent);
          }
          return false;
        };

        if (isDescendant(draggedNode.id, targetFolderId)) {
          return prevFiles;
        }

        draggedNode.parentId = targetFolderId;

        if (targetFolderId === null) {
          newFiles.push(draggedNode);
        } else {
          const addNode = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
              if (node.id === targetFolderId && node.isFolder) {
                return { ...node, children: [...(node.children || []), draggedNode!] };
              }
              if (node.children) {
                return { ...node, children: addNode(node.children) };
              }
              return node;
            });
          };
          newFiles = addNode(newFiles);
        }
        
        return newFiles;
      });
    } else if (e.dataTransfer.items) {
      const controller = new AbortController();
      setUploadAbortController(controller);
      try {
        const newFiles = await parseDroppedItems(e.dataTransfer.items, (loadedFiles, loadedSize, totalFiles, totalSize) => {
          setUploadProgress({ loadedFiles, loadedSize, totalFiles, totalSize });
        }, controller.signal);
        setFiles(prev => [...prev, ...newFiles]);
      } catch (err: any) {
        if (err.message !== 'Upload cancelled') {
          console.error(err);
        }
      } finally {
        setUploadProgress(null);
        setUploadAbortController(null);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; 
    if ((e.target as HTMLElement).closest('button, input, svg')) return; 

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft;
      const y = e.clientY - rect.top + containerRef.current.scrollTop;
      setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y, isSelecting: true });
      
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedFileIds(new Set());
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionBox.isSelecting || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    
    setSelectionBox(prev => ({ ...prev, currentX: x, currentY: y }));

    const boxRect = {
      top: Math.min(selectionBox.startY, y),
      bottom: Math.max(selectionBox.startY, y)
    };

    const newSelected = new Set<string>(e.ctrlKey || e.metaKey ? selectedFileIds : []);
    const items = containerRef.current.querySelectorAll('.file-item');
    
    items.forEach(item => {
      const itemTop = (item as HTMLElement).offsetTop;
      const itemBottom = itemTop + (item as HTMLElement).offsetHeight;
      
      if (itemBottom > boxRect.top && itemTop < boxRect.bottom) {
        const id = item.getAttribute('data-id');
        if (id) newSelected.add(id);
      }
    });
    
    setSelectedFileIds(newSelected);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (selectionBox.isSelecting) {
        setSelectionBox(prev => ({ ...prev, isSelecting: false }));
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [selectionBox.isSelecting]);

  const getStats = (nodes: FileNode[]) => {
    let fileCount = 0;
    let folderCount = 0;
    let lineCount = 0;

    const traverse = (n: FileNode[]) => {
      n.forEach(node => {
        if (node.name === '.temp') return;
        if (node.isFolder) {
          folderCount++;
          if (node.children) traverse(node.children);
        } else {
          fileCount++;
          if (node.content && !node.content.startsWith('data:')) {
            lineCount += node.content.split('\n').length;
          }
        }
      });
    };
    traverse(nodes);
    return { fileCount, folderCount, lineCount };
  };

  const stats = getStats(files);
  const maxLines = 100000;
  const optimalLines = 70000;
  const linePercentage = Math.min(100, (stats.lineCount / maxLines) * 100);
  let progressColor = 'bg-green-500';
  if (stats.lineCount > optimalLines) progressColor = 'bg-yellow-500';
  if (stats.lineCount > maxLines) progressColor = 'bg-red-500';

  const renderTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.filter(n => level > 0 || n.name !== '.temp').map(node => {
      const isExpanded = expandedFolders.has(node.id);
      const isSelected = selectedFileIds.has(node.id);
      const { Icon, colorClass } = getFileDisplay(node.name);

      return (
        <div key={node.id}>
          <div 
            role="button"
            tabIndex={0}
            aria-expanded={node.isFolder ? isExpanded : undefined}
            aria-selected={isSelected}
            draggable
            onDragStart={(e) => handleDragStart(e, node.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, node.isFolder ? node.id : node.parentId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                node.isFolder ? toggleFolder(node.id) : handleFileClick(e as any, node.id);
              }
            }}
            className={`file-item flex items-center group py-1 px-2 cursor-pointer transition-colors ${isSelected ? 'bg-theme-hover text-theme-accent' : 'hover:bg-theme-hover text-theme-text'}`}
            style={{ paddingLeft: `${level * 12 + 8}px`, fontFamily }}
            onClick={(e) => node.isFolder ? toggleFolder(node.id) : handleFileClick(e, node.id)}
            data-id={node.id}
          >
            <span className="mr-1 w-4 flex justify-center">
              {node.isFolder && (
                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              )}
            </span>
            
            {!node.isFolder && contextMode === 'selected' && (
              <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={(e) => {
                  e.stopPropagation();
                  const newSel = new Set(selectedFileIds);
                  if (e.target.checked) newSel.add(node.id);
                  else newSel.delete(node.id);
                  setSelectedFileIds(newSel);
                }}
                className="mr-2 accent-theme-accent"
                aria-label={`Select ${node.name}`}
              />
            )}

            {node.isFolder ? (
              <Folder size={16} className="mr-2 text-theme-accent" />
            ) : (
              <Icon size={16} className={`mr-2 ${isSelected ? 'text-theme-accent' : colorClass}`} />
            )}
            
            <span className={`text-sm truncate flex-1 ${node.name === '.temp' ? 'text-theme-muted italic' : ''}`}>
              {node.name}
            </span>

            <div className="hidden group-hover:flex items-center gap-1 ml-2">
              {!node.isFolder && (
                <button onClick={(e) => { e.stopPropagation(); onPreviewFile(node.id); }} className="p-0.5 hover:text-theme-accentHover" title={t[lang].preview} aria-label={t[lang].preview}>
                  <Eye size={12} />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); openDialog('rename', node.id, node.name); }} className="p-0.5 hover:text-theme-accentHover" title={t[lang].rename} aria-label={t[lang].rename}>
                <Edit2 size={12} />
              </button>
              {node.isFolder && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); openDialog('newFile', node.id); }} className="p-0.5 hover:text-theme-text" title={t[lang].newFile} aria-label={t[lang].newFile}>
                    <Plus size={12} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openDialog('newFolder', node.id); }} className="p-0.5 hover:text-theme-text" title={t[lang].newFolder} aria-label={t[lang].newFolder}>
                    <FolderPlus size={12} />
                  </button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); openDialog('delete', node.id); }} className="p-0.5 hover:text-red-400" title={t[lang].delete} aria-label={t[lang].delete}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          
          {node.isFolder && isExpanded && node.children && (
            <div>{renderTree(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="w-full h-full bg-theme-base flex flex-col relative">
      <div className="p-3 border-b border-theme-border flex justify-between items-center relative">
        <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">{t[lang].explorer}</span>
        <div className="flex gap-1">
          <button onClick={handleRefresh} className="p-1 hover:bg-theme-hover rounded text-theme-muted" title={t[lang].refresh} aria-label={t[lang].refresh}>
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleCollapseExpandAll} className="p-1 hover:bg-theme-hover rounded text-theme-muted" title={t[lang].collapseAll} aria-label={t[lang].collapseAll}>
            <ChevronsUpDown size={16} />
          </button>
          <button onClick={onShowClearConfirm} className="p-1 hover:bg-theme-hover rounded text-red-400" title={t[lang].clearAll} aria-label={t[lang].clearAll}>
            <Trash2 size={16} />
          </button>
          <div className="w-px h-4 bg-theme-border mx-1 self-center"></div>
          <input 
            type="file" 
            ref={folderInputRef} 
            onChange={handleFolderUpload} 
            className="hidden" 
            {...{ webkitdirectory: "", directory: "" } as any} 
          />
          <button onClick={() => folderInputRef.current?.click()} className="p-1 hover:bg-theme-hover rounded text-theme-muted" title={t[lang].uploadFolder} aria-label={t[lang].uploadFolder}>
            <UploadCloud size={16} />
          </button>
          <button onClick={() => openDialog('newFile', null)} className="p-1 hover:bg-theme-hover rounded text-theme-muted" title={t[lang].newFile} aria-label={t[lang].newFile}>
            <Plus size={16} />
          </button>
          <button onClick={() => openDialog('newFolder', null)} className="p-1 hover:bg-theme-hover rounded text-theme-muted" title={t[lang].newFolder} aria-label={t[lang].newFolder}>
            <FolderPlus size={16} />
          </button>
        </div>
        {isRefreshing && (
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-theme-base">
            <div className="h-full bg-theme-accent transition-all duration-100" style={{ width: `${refreshProgress}%` }}></div>
          </div>
        )}
      </div>
      
      <div className="p-2 border-b border-theme-border bg-theme-panel/50">
        <div className="flex justify-between text-xs text-theme-muted mb-1">
          <span>Файлів: {stats.fileCount} | Папок: {stats.folderCount}</span>
          <span>Рядків: {stats.lineCount.toLocaleString()} / 100k</span>
        </div>
        <div className="w-full bg-theme-base rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${progressColor}`} 
            style={{ width: `${linePercentage}%` }}
          ></div>
        </div>
      </div>

      {uploadProgress && (
        <div className="p-2 bg-theme-panel border-b border-theme-border">
          <div className="flex justify-between items-center text-xs text-theme-muted mb-1">
            <span>{t[lang].uploading} {uploadProgress.loadedFiles}/{uploadProgress.totalFiles}</span>
            <div className="flex items-center gap-2">
              <span>{formatSize(uploadProgress.loadedSize)} / {formatSize(uploadProgress.totalSize)}</span>
              <button onClick={cancelUpload} className="text-red-400 hover:text-red-300" title="Скасувати" aria-label="Скасувати">
                <XCircle size={14} />
              </button>
            </div>
          </div>
          <div className="w-full bg-theme-base rounded-full h-1.5">
            <div 
              className="bg-theme-accent h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${(uploadProgress.loadedSize / uploadProgress.totalSize) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className={`flex-1 overflow-y-auto py-2 relative select-none ${isDragOverExternal ? 'bg-theme-hover/50 border-2 border-dashed border-theme-accent' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {selectionBox.isSelecting && (
          <div style={{
            position: 'absolute',
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
            backgroundColor: 'rgba(var(--color-accent-rgb, 180, 83, 9), 0.2)',
            border: '1px solid var(--color-accent)',
            pointerEvents: 'none',
            zIndex: 50
          }} />
        )}

        {files.filter(f => f.name !== '.temp').length === 0 ? (
          <div className="text-center text-theme-muted text-sm mt-10 px-4" style={{ fontFamily }}>
            {t[lang].emptyProject}
          </div>
        ) : (
          renderTree(files)
        )}
      </div>

      {contextMode === 'selected' && (
        <div className="p-3 border-t border-theme-border bg-theme-header shrink-0">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-theme-text cursor-pointer hover:text-theme-accentHover">
              <input 
                type="checkbox" 
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                className="accent-theme-accent"
              />
              <span>{t[lang].context}</span>
            </label>
            <div className="relative group">
              <HelpCircle size={14} className="text-theme-muted cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-theme-panel text-theme-text text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {t[lang].contextTooltip}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Dialog Modal */}
      {dialog && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-panel p-6 rounded-xl border border-theme-border shadow-2xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-theme-text mb-4">
              {dialog.type === 'newFile' ? t[lang].enterFileName : 
               dialog.type === 'newFolder' ? t[lang].enterFolderName : 
               dialog.type === 'rename' ? t[lang].enterNewName : 
               t[lang].delete}
            </h3>
            
            {dialog.type === 'delete' ? (
              <p className="text-theme-muted mb-6">{t[lang].confirmDelete}</p>
            ) : (
              <input 
                type="text" 
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDialogSubmit()}
                className="w-full bg-theme-base border border-theme-border text-theme-text rounded p-2 outline-none focus:border-theme-accent mb-6"
                autoFocus
              />
            )}
            
            <div className="flex justify-end gap-3">
              <button onClick={closeDialog} className="px-4 py-2 rounded bg-theme-base text-theme-text hover:bg-theme-hover transition-colors">
                {t[lang].cancel}
              </button>
              <button 
                onClick={handleDialogSubmit} 
                className={`px-4 py-2 rounded text-white transition-colors ${dialog.type === 'delete' ? 'bg-red-600 hover:bg-red-500' : 'bg-theme-accent hover:bg-theme-accentHover'}`}
              >
                {t[lang].confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
