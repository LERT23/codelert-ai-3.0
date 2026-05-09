import { FileChange } from '../../types.ts';

export const highlightCode = (code: string) => {
  let highlighted = code
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\/\/.*|\/\*[\s\S]*?\*\/)/g, '<span class="text-green-500 opacity-80">$1</span>')
    .replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '<span class="text-yellow-400">$&</span>')
    .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|class|interface|type|public|private|async|await|try|catch|new|switch|case|break|continue|default|yield)\b/g, '<span class="text-blue-400 font-bold">$1</span>')
    .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-purple-400 font-bold">$1</span>')
    .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="text-teal-400">$1</span>')
    .replace(/(\b[a-zA-Z0-9_]+\b)(?=\s*\()/g, '<span class="text-yellow-200">$1</span>');
  return highlighted;
};

export const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const parseChangesFromText = (text: string): FileChange[] => {
  const changes: FileChange[] = [];
  
  // Match [FILE: path] followed optionally by a code block. 
  // This allows empty files to be created just by using [FILE: path]
  const fileRegex = /\[FILE:\s*([^\]]+)\](?:\s*```[\w-]*\n([\s\S]*?)```)?/g;
  let match;
  while ((match = fileRegex.exec(text)) !== null) {
    changes.push({ type: 'UPDATE', path: match[1].trim(), content: match[2] || '' });
  }

  // Match [REPLACE: path] followed by a code block with <<<< ==== >>>>
  const replaceRegex = /\[REPLACE:\s*([^\]]+)\]\s*```(?:text|[\w-]*)\n<<<<\n([\s\S]*?)\n====\n([\s\S]*?)\n>>>>\n```/g;
  while ((match = replaceRegex.exec(text)) !== null) {
    changes.push({ type: 'REPLACE', path: match[1].trim(), searchStr: match[2], replaceStr: match[3] });
  }

  const renameRegex = /\[RENAME:\s*([^\]]+)\s*->\s*([^\]]+)\]/g;
  while ((match = renameRegex.exec(text)) !== null) {
    changes.push({ type: 'RENAME', path: match[1].trim(), newPath: match[2].trim() });
  }

  const deleteRegex = /\[DELETE:\s*([^\]]+)\]/g;
  while ((match = deleteRegex.exec(text)) !== null) {
    changes.push({ type: 'DELETE', path: match[1].trim() });
  }

  const folderRegex = /\[CREATE_FOLDER:\s*([^\]]+)\]/g;
  while ((match = folderRegex.exec(text)) !== null) {
    changes.push({ type: 'CREATE_FOLDER', path: match[1].trim() });
  }

  const saveAttachmentRegex = /\[SAVE_ATTACHMENT:\s*([^\]]+)\s*->\s*([^\]]+)\]/g;
  while ((match = saveAttachmentRegex.exec(text)) !== null) {
    changes.push({ type: 'COPY', path: `.temp/uploads/${match[1].trim()}`, newPath: match[2].trim() });
  }

  return changes;
};
