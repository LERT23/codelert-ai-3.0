import { FileNode, FileChange } from '../types.ts';
import { generateId } from './fileService.ts';

export const applyChangesToFiles = (prevFiles: FileNode[], changes: FileChange[]): FileNode[] => {
  let newFiles: FileNode[] = JSON.parse(JSON.stringify(prevFiles));
  let errors: string[] = [];
  
  const ensurePath = (nodes: FileNode[], pathParts: string[], parentId: string | null): string | null => {
    if (pathParts.length === 0) return parentId;
    const folderName = pathParts[0];
    let folder = nodes.find(n => n.isFolder && n.name === folderName);
    if (!folder) {
      folder = { id: generateId(), name: folderName, isFolder: true, children: [], parentId };
      nodes.push(folder);
    }
    if (!folder.children) folder.children = [];
    return ensurePath(folder.children, pathParts.slice(1), folder.id);
  };

  const findNodeAndParentList = (nodes: FileNode[], pathParts: string[]): { list: FileNode[], index: number } | null => {
    if (pathParts.length === 1) {
      const idx = nodes.findIndex(n => n.name === pathParts[0]);
      return idx !== -1 ? { list: nodes, index: idx } : null;
    }
    const folder = nodes.find(n => n.isFolder && n.name === pathParts[0]);
    if (folder && folder.children) {
      return findNodeAndParentList(folder.children, pathParts.slice(1));
    }
    return null;
  };

  changes.forEach(change => {
    if (change.path.endsWith('/')) {
      change.type = 'CREATE_FOLDER';
    }
    const pathParts = change.path.split('/').filter(p => p);
    if (pathParts.length === 0) return;

    if (change.type === 'CREATE_FOLDER') {
      ensurePath(newFiles, pathParts, null);
      return;
    }

    const fileName = pathParts.pop()!;

    if (change.type === 'UPDATE') {
      const parentId = ensurePath(newFiles, pathParts, null);
      const targetList = pathParts.length === 0 ? newFiles : 
        (function findList(nodes: FileNode[], parts: string[]): FileNode[] {
          if (parts.length === 0) return nodes;
          const f = nodes.find(n => n.isFolder && n.name === parts[0]);
          return f && f.children ? findList(f.children, parts.slice(1)) : nodes;
        })(newFiles, pathParts);

      const existing = targetList.find(n => !n.isFolder && n.name === fileName);
      if (existing) {
        existing.content = change.content;
      } else {
        targetList.push({
          id: generateId(),
          name: fileName,
          isFolder: false,
          content: change.content,
          parentId
        });
      }
    } 
    else if (change.type === 'REPLACE') {
      const targetList = pathParts.length === 0 ? newFiles : 
        (function findList(nodes: FileNode[], parts: string[]): FileNode[] {
          if (parts.length === 0) return nodes;
          const f = nodes.find(n => n.isFolder && n.name === parts[0]);
          return f && f.children ? findList(f.children, parts.slice(1)) : nodes;
        })(newFiles, pathParts);

      const existing = targetList.find(n => !n.isFolder && n.name === fileName);
      if (existing && existing.content !== undefined) {
        if (change.searchStr) {
          // Normalize line endings to \n for robust comparison
          const normalizedContent = existing.content.replace(/\r\n/g, '\n');
          const normalizedSearch = change.searchStr.replace(/\r\n/g, '\n');
          
          if (normalizedContent.includes(normalizedSearch)) {
            const normalizedReplace = change.replaceStr ? change.replaceStr.replace(/\r\n/g, '\n') : '';
            existing.content = normalizedContent.replace(normalizedSearch, normalizedReplace);
          } else {
            const firstLine = normalizedSearch.split('\n')[0].trim();
            errors.push(`[REPLACE ERROR] У файлі ${change.path} не знайдено точний збіг для блоку коду, що починається з: "${firstLine}". Переконайся, що старий код вказано СИМВОЛ В СИМВОЛ як у поточному файлі.`);
          }
        }
      } else {
        errors.push(`[FILE NOT FOUND] Файл ${change.path} не знайдено для заміни.`);
      }
    }
    else if (change.type === 'COPY' && change.newPath) {
      const sourceParts = change.path.split('/').filter(p => p);
      const sourceResult = findNodeAndParentList(newFiles, sourceParts);
      if (sourceResult) {
        const sourceNode = sourceResult.list[sourceResult.index];
        
        const destParts = change.newPath.split('/').filter(p => p);
        const destName = destParts.pop()!;
        const destParentId = ensurePath(newFiles, destParts, null);
        
        const targetList = destParts.length === 0 ? newFiles : 
          (function findList(nodes: FileNode[], parts: string[]): FileNode[] {
            if (parts.length === 0) return nodes;
            const f = nodes.find(n => n.isFolder && n.name === parts[0]);
            return f && f.children ? findList(f.children, parts.slice(1)) : nodes;
          })(newFiles, destParts);
        
        const existing = targetList.find(n => !n.isFolder && n.name === destName);
        if (existing) {
          existing.content = sourceNode.content;
        } else {
          targetList.push({
            id: generateId(),
            name: destName,
            isFolder: false,
            content: sourceNode.content,
            parentId: destParentId
          });
        }
      } else {
        errors.push(`[COPY ERROR] Вихідний файл ${change.path} не знайдено.`);
      }
    }
    else if (change.type === 'DELETE') {
      const fullParts = change.path.split('/').filter(p => p);
      const result = findNodeAndParentList(newFiles, fullParts);
      if (result) {
        result.list.splice(result.index, 1);
      }
    }
    else if (change.type === 'RENAME' && change.newPath) {
      const fullParts = change.path.split('/').filter(p => p);
      const result = findNodeAndParentList(newFiles, fullParts);
      if (result) {
        const node = result.list[result.index];
        const newParts = change.newPath.split('/').filter(p => p);
        const newName = newParts.pop()!;
        
        if (newParts.join('/') !== pathParts.join('/')) {
          result.list.splice(result.index, 1);
          const newParentId = ensurePath(newFiles, newParts, null);
          const targetList = newParts.length === 0 ? newFiles : 
            (function findList(nodes: FileNode[], parts: string[]): FileNode[] {
              if (parts.length === 0) return nodes;
              const f = nodes.find(n => n.isFolder && n.name === parts[0]);
              return f && f.children ? findList(f.children, parts.slice(1)) : nodes;
            })(newFiles, newParts);
          
          node.name = newName;
          node.parentId = newParentId;
          targetList.push(node);
        } else {
          node.name = newName;
        }
      }
    }
  });
  
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return newFiles;
};
