export interface FileNode {
  id: string;
  name: string;
  content?: string; // For text files, it's text. For binary, it's a Data URL.
  isFolder: boolean;
  children?: FileNode[];
  parentId?: string | null;
}

export interface ChatAttachment {
  name: string;
  data?: string; // Full Data URL for binary files
  text?: string; // Raw text for code files
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: ChatAttachment[];
  isError?: boolean;
  applied?: boolean;
  isTyping?: boolean;
  replyToId?: string;
}

export interface User {
  email: string;
  name: string;
  isAdmin: boolean;
  avatar?: string;
}

export type ThemeColor = 'brown' | 'black' | 'white' | 'green' | 'blue' | 'orange';

export interface ThemeSettings {
  fontSize: number;
  theme: ThemeColor;
  language: 'UA' | 'EN';
  fontFamily: string;
  contextMode?: 'selected' | 'all';
  newYearMode?: boolean;
  autoBackup?: boolean;
  autoBackupInterval?: number;
  aiModeStepByStep?: boolean;
  aiModeLineReplace?: boolean;
  useCustomCursor?: boolean;
  enableAnimations?: boolean;
}

export interface ProjectState {
  files: FileNode[];
  chatHistory: ChatMessage[];
  projectName: string;
  settings?: ThemeSettings;
}

export interface FileChange {
  type: 'UPDATE' | 'RENAME' | 'DELETE' | 'CREATE_FOLDER' | 'REPLACE' | 'COPY';
  path: string;
  content?: string;
  newPath?: string;
  searchStr?: string;
  replaceStr?: string;
}

export interface ContextFile {
  name: string;
  content: string;
  isImage?: boolean;
}

declare global {
  interface Window {
    CodeLertAPI: {
      getFiles: () => FileNode[];
      addFile: (name: string, content: string, parentId?: string) => void;
      openPreview: (fileId: string) => void;
      sendMessageToAI: (message: string) => void;
    };
  }
}
