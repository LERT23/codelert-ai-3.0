import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { FileNode, ProjectState } from '../types.ts';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const IGNORED_FILES = [
  '.gitignore', 'README.md', 'server.js', 'package.json', 'package-lock.json',
  'public/index.html', 'public/style.css', 'public/script.js',
  'src/App.js', 'src/index.js', 'src/components/Auth.js',
  'src/components/Chat/Chat.js', 'src/components/Chat/Message.js', 'src/components/Chat/Input.js'
];

export const shouldIgnoreFile = (path: string) => {
  if (path.startsWith('.temp') || path.includes('/.temp/')) return true;
  return IGNORED_FILES.some(ignored => path.endsWith(ignored));
};

export const getMimeTypeAndIsText = (filename: string, type?: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const textExts = ['txt', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'md', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'sh', 'yml', 'yaml', 'xml', 'env', 'codelert'];
  const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'heic', 'heif'];
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'aiff'];
  const videoExts = ['mp4', 'webm', 'avi', 'mov', 'mpeg', 'mpg', 'wmv', '3gpp'];
  const excelExts = ['xlsx', 'xls', 'csv'];

  const mime = type || '';

  if (textExts.includes(ext) || mime.startsWith('text/') || mime === 'application/json') return { isText: true, category: 'text' };
  if (imgExts.includes(ext) || mime.startsWith('image/')) return { isText: false, category: 'image' };
  if (audioExts.includes(ext) || mime.startsWith('audio/')) return { isText: false, category: 'audio' };
  if (videoExts.includes(ext) || mime.startsWith('video/')) return { isText: false, category: 'video' };
  if (excelExts.includes(ext) || mime.includes('spreadsheetml') || mime.includes('excel')) return { isText: false, category: 'excel' };
  if (ext === 'pdf' || mime === 'application/pdf') return { isText: false, category: 'pdf' };

  return { isText: false, category: 'unknown' };
};

export const parseExcelDataUrlToText = (dataUrl: string): string => {
  try {
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const workbook = XLSX.read(bytes.buffer, { type: 'array' });
    let result = '';
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      result += `--- Аркуш: ${sheetName} ---\n${csv}\n\n`;
    });
    return result;
  } catch (e) {
    console.error("Failed to parse Excel file", e);
    return "[Помилка читання Excel файлу]";
  }
};

export const exportProjectToZip = async (files: FileNode[], projectName: string, onProgress?: (percent: number) => void) => {
  const zip = new JSZip();

  const addFilesToZip = (nodes: FileNode[], currentPath: string) => {
    nodes.forEach(node => {
      const path = currentPath ? `${currentPath}/${node.name}` : node.name;
      
      if (shouldIgnoreFile(path)) return;

      if (node.isFolder) {
        zip.folder(path);
        if (node.children && node.children.length > 0) {
          addFilesToZip(node.children, path);
        }
      } else {
        let content: string | Uint8Array = node.content || '';
        if (typeof content === 'string' && content.startsWith('data:')) {
          const base64 = content.split(',')[1];
          content = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        }
        zip.file(path, content);
      }
    });
  };

  addFilesToZip(files, '');

  const content = await zip.generateAsync(
    { type: 'blob', compression: 'STORE' },
    (metadata) => {
      if (onProgress) onProgress(metadata.percent);
    }
  );
  
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName || 'project'}_code.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportProjectState = (state: ProjectState) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `${state.projectName || 'project'}_state.codelert`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const buildTreeFromPaths = async (
  items: { path: string; getContent: () => Promise<string> }[]
): Promise<FileNode[]> => {
  const rootFiles: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();

  const getOrCreateFolder = (path: string): FileNode | null => {
    if (!path) return null;
    if (folderMap.has(path)) return folderMap.get(path)!;

    const parts = path.split('/');
    const name = parts.pop()!;
    const parentPath = parts.join('/');
    
    const folderNode: FileNode = {
      id: generateId(),
      name,
      isFolder: true,
      children: []
    };
    
    folderMap.set(path, folderNode);

    if (parentPath) {
      const parent = getOrCreateFolder(parentPath);
      if (parent && parent.children) {
        parent.children.push(folderNode);
      }
    } else {
      rootFiles.push(folderNode);
    }

    return folderNode;
  };

  const promises = items.map(async (item) => {
    try {
      const content = await item.getContent();
      const parts = item.path.split('/');
      const name = parts.pop()!;
      const parentPath = parts.join('/');
      
      const fileNode: FileNode = {
        id: generateId(),
        name,
        isFolder: false,
        content
      };

      if (parentPath) {
        const parent = getOrCreateFolder(parentPath);
        if (parent && parent.children) {
          parent.children.push(fileNode);
        }
      } else {
        rootFiles.push(fileNode);
      }
    } catch (e) {
      console.error(`Failed to read file ${item.path}`, e);
    }
  });

  await Promise.all(promises);
  return rootFiles;
};

export const parseImportedZip = async (file: File): Promise<FileNode[]> => {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  const items: { path: string; getContent: () => Promise<string> }[] = [];
  
  contents.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      const { isText, category } = getMimeTypeAndIsText(relativePath);
      items.push({
        path: relativePath,
        getContent: async () => {
          if (isText) {
            return await zipEntry.async('string');
          } else {
            const base64 = await zipEntry.async('base64');
            let mime = 'application/octet-stream';
            const ext = relativePath.split('.').pop()?.toLowerCase();
            if (category === 'image') mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
            if (category === 'audio') mime = `audio/${ext}`;
            if (category === 'video') mime = `video/${ext}`;
            if (category === 'excel') mime = `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
            if (category === 'pdf') mime = 'application/pdf';
            return `data:${mime};base64,${base64}`;
          }
        }
      });
    }
  });

  return buildTreeFromPaths(items);
};

export const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsText(file);
  });
};

export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

export const parseFolderUpload = async (
  fileList: FileList,
  onProgress?: (loadedFiles: number, loadedSize: number, totalFiles: number, totalSize: number) => void,
  signal?: AbortSignal
): Promise<FileNode[]> => {
  const items: { path: string; getContent: () => Promise<string> }[] = [];
  
  let totalSize = 0;
  const totalFiles = fileList.length;
  for (let i = 0; i < totalFiles; i++) {
    totalSize += fileList[i].size;
  }

  let loadedFiles = 0;
  let loadedSize = 0;

  for (let i = 0; i < totalFiles; i++) {
    if (signal?.aborted) throw new Error('Upload cancelled');
    const file = fileList[i];
    const path = file.webkitRelativePath || file.name;
    const { isText } = getMimeTypeAndIsText(file.name, file.type);
    
    items.push({
      path: path,
      getContent: async () => {
        if (signal?.aborted) throw new Error('Upload cancelled');
        const content = await (isText ? fileToText(file) : fileToDataURL(file));
        loadedFiles++;
        loadedSize += file.size;
        if (onProgress) onProgress(loadedFiles, loadedSize, totalFiles, totalSize);
        return content;
      }
    });
  }

  return buildTreeFromPaths(items);
};

export const parseDroppedItems = async (
  items: DataTransferItemList,
  onProgress?: (loadedFiles: number, loadedSize: number, totalFiles: number, totalSize: number) => void,
  signal?: AbortSignal
): Promise<FileNode[]> => {
  const fileEntries: { path: string; file: File }[] = [];

  const readEntry = async (entry: any, path: string = '') => {
    if (signal?.aborted) throw new Error('Upload cancelled');
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => entry.file(resolve));
      fileEntries.push({ path: path + file.name, file });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        dirReader.readEntries(resolve);
      });
      for (const childEntry of entries) {
        await readEntry(childEntry, path + entry.name + '/');
      }
    }
  };

  const promises = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        promises.push(readEntry(entry));
      }
    }
  }
  await Promise.all(promises);

  const parsedItems: { path: string; getContent: () => Promise<string> }[] = [];
  let totalSize = fileEntries.reduce((acc, curr) => acc + curr.file.size, 0);
  let loadedFiles = 0;
  let loadedSize = 0;

  for (const { path, file } of fileEntries) {
    if (signal?.aborted) throw new Error('Upload cancelled');
    const { isText } = getMimeTypeAndIsText(file.name, file.type);
    parsedItems.push({
      path,
      getContent: async () => {
        if (signal?.aborted) throw new Error('Upload cancelled');
        const content = await (isText ? fileToText(file) : fileToDataURL(file));
        loadedFiles++;
        loadedSize += file.size;
        if (onProgress) onProgress(loadedFiles, loadedSize, fileEntries.length, totalSize);
        return content;
      }
    });
  }

  return buildTreeFromPaths(parsedItems);
};

export const saveProjectStateDB = async (state: ProjectState): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CodeLertDB', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      store.put({ id: 'autosave', state });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const loadProjectStateDB = async (): Promise<ProjectState | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CodeLertDB', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const getReq = store.get('autosave');
      getReq.onsuccess = () => resolve(getReq.result ? getReq.result.state : null);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
};
