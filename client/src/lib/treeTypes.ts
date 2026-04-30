export type NodeType = 'branch' | 'leaf';

export interface TreeNode {
  id: string;
  type: NodeType;
  key?: string;
  branches?: Record<string, TreeNode>;
  final?: string;
}

export interface TreeData {
  platform_feats: string[];
  game_feats: string[];
  fallback?: string;
  decision_tree: TreeNode | null;
}

export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createBranchNode(key: string = ''): TreeNode {
  return { id: generateNodeId(), type: 'branch', key, branches: {} };
}

export function createLeafNode(final: string = ''): TreeNode {
  return { id: generateNodeId(), type: 'leaf', final };
}

export function findNode(node: TreeNode | null, targetId: string): TreeNode | null {
  if (!node) return null;
  if (node.id === targetId) return node;
  if (node.branches) {
    for (const branch of Object.values(node.branches)) {
      const found = findNode(branch, targetId);
      if (found) return found;
    }
  }
  return null;
}

export function findNodePath(
  node: TreeNode | null,
  targetId: string,
  path: Array<{ node: TreeNode; condition?: string }> = []
): Array<{ node: TreeNode; condition?: string }> | null {
  if (!node) return null;
  path.push({ node });
  if (node.id === targetId) return path;
  if (node.branches) {
    for (const [condition, branch] of Object.entries(node.branches)) {
      const found = findNodePath(branch, targetId, [...path]);
      if (found) return found;
    }
  }
  return null;
}

export function deleteNode(root: TreeNode | null, targetId: string): TreeNode | null {
  if (!root) return null;
  if (root.id === targetId) return null;
  if (root.branches) {
    const newBranches: Record<string, TreeNode> = {};
    for (const [condition, branch] of Object.entries(root.branches)) {
      const result = deleteNode(branch, targetId);
      if (result) newBranches[condition] = result;
    }
    root.branches = newBranches;
  }
  return root;
}

// ====== Python Dict Export ======

export function treeToDict(treeData: TreeData): string {
  if (!treeData.decision_tree) return '{}';

  function nodeToObj(n: TreeNode): any {
    if (n.type === 'leaf') {
      return { final: n.final || '' };
    }
    const obj: any = {};
    if (n.key) obj.key = n.key;
    if (n.branches && Object.keys(n.branches).length > 0) {
      const branchesObj: any = {};
      for (const [condition, branch] of Object.entries(n.branches)) {
        const parts = condition.split(',').map(c => c.trim()).filter(Boolean);
        const tupleKey = '(' + parts.map(p => `"${p}"`).join(', ') + (parts.length === 1 ? ',' : '') + ')';
        branchesObj[tupleKey] = nodeToObj(branch);
      }
      obj.branches = branchesObj;
    }
    return obj;
  }

  const finalObj = {
    platform_feats: treeData.platform_feats || [],
    game_feats: treeData.game_feats || [],
    fallback: treeData.fallback || '',
    decision_tree: nodeToObj(treeData.decision_tree)
  };

  return pythonDictStringify(finalObj);
}

function pythonDictStringify(obj: any, indent: number = 0): string {
  const spaces = '\t'.repeat(indent);
  const nextSpaces = '\t'.repeat(indent + 1);

  if (typeof obj === 'string') {
    const escaped = obj
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `"${escaped}"`;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (obj === null) return 'None';
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return '[' + obj.map((item: any) => pythonDictStringify(item, indent)).join(', ') + ']';
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const items = keys.map(key => {
      const value = pythonDictStringify(obj[key], indent + 1);
      if (key.startsWith('(') && key.endsWith(')')) {
        return `${nextSpaces}${key}: ${value}`;
      }
      return `${nextSpaces}"${key}": ${value}`;
    });
    return '{\n' + items.join(',\n') + '\n' + spaces + '}';
  }
  return 'null';
}

// ====== Python Dict Import ======

export function dictToTree(dictStr: string): TreeData | null {
  try {
    const obj = parsePythonDict(dictStr);

    const treeObj = obj.decision_tree || obj.knowledge_tree || obj;

    return {
      platform_feats: obj.platform_feats || [],
      game_feats: obj.game_feats || [],
      fallback: obj.fallback || '',
      decision_tree: objToTree(treeObj)
    };
  } catch (error) {
    console.error('Failed to parse dict:', error);
    return null;
  }
}

/**
 * Parse a Python dict string (or JSON) into a JS object.
 * Handles: tuple keys, Python booleans/None, double-double-quotes from CSV.
 */
function parsePythonDict(str: string): any {
  str = str.trim();

  // Try JSON first
  try { return JSON.parse(str); } catch (_) {}

  // Convert Python dict syntax to JSON
  let s = str;

  // Step 1: If the user copied directly from a raw CSV cell, CSV stores
  // literal quote characters as doubled quotes. Restore that CSV layer first.
  s = s.replace(/""/g, '"');

  // Step 2: Replace Python literals
  s = s.replace(/\bTrue\b/g, 'true');
  s = s.replace(/\bFalse\b/g, 'false');
  s = s.replace(/\bNone\b/g, 'null');

  // Step 3: Handle tuple keys like ("818", ) or ("863", "866", "864", "861")
  // Replace with comma-separated string keys
  s = s.replace(/\(\s*((?:"[^"]*"\s*,?\s*)+)\)\s*:/g, (_match: string, inner: string) => {
    const keys: string[] = [];
    const re = /"([^"]*)"/g;
    let m;
    while ((m = re.exec(inner)) !== null) {
      keys.push(m[1]);
    }
    return '"' + keys.join(',') + '":';
  });

  // Step 4: Handle single quotes (Python allows single-quoted strings)
  // Be careful to only replace string-delimiting single quotes
  s = s.replace(/'([^']*)'/g, '"$1"');

  try {
    return JSON.parse(s);
  } catch (e) {
    console.error('Failed to parse Python dict:', e);
    throw new Error('Unable to parse. Please check the format.');
  }
}

function objToTree(obj: any): TreeNode | null {
  if (!obj || typeof obj !== 'object') return null;

  // Leaf: has final but no branches and no key
  const hasFinal = obj.final !== undefined;
  const hasBranches = obj.branches && typeof obj.branches === 'object' && Object.keys(obj.branches).length > 0;
  const hasKey = obj.key !== undefined && obj.key !== '';

  if (hasFinal && !hasBranches && !hasKey) {
    return createLeafNode(obj.final);
  }

  // Branch node
  const node = createBranchNode(obj.key || '');
  if (hasBranches) {
    for (const [condition, branch] of Object.entries(obj.branches)) {
      const childNode = objToTree(branch);
      if (childNode) {
        node.branches![condition] = childNode;
      }
    }
  }
  return node;
}

// ====== Clone ======

export function cloneNode(node: TreeNode): TreeNode {
  const cloned: TreeNode = {
    id: node.id,
    type: node.type,
    key: node.key,
    final: node.final,
  };
  if (node.branches) {
    cloned.branches = {};
    for (const [condition, branch] of Object.entries(node.branches)) {
      cloned.branches[condition] = cloneNode(branch);
    }
  }
  return cloned;
}
