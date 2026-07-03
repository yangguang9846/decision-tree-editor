/**
 * 决策树状态与操作 —— 从 Home.tsx 抽取。
 *
 * 封装树结构、元信息(platform/game feats、fallback)、选中节点，
 * 以及所有树操作(add/delete/splice/insert/rename/import/export)。
 * 所有操作走 treeTypes 的纯函数，返回不可变新树。
 *
 * 行为与原 Home.tsx 内联实现完全等价(包括 toast 文案、选中节点设置时机)。
 */
import { useState, useCallback } from 'react';
import {
  type TreeNode,
  type TreeData,
  createBranchNode,
  createLeafNode,
  treeToDict,
  dictToTree,
  findNode,
  deleteNode,
  spliceNode,
  insertParentAbove as insertParentAboveNode,
  renameBranchCondition,
  addChildNode,
  updateNode,
} from '@/lib/treeTypes';
import { createExampleTree } from '@/lib/exampleData';
import { toast } from 'sonner';

export interface TreeActions {
  createNewTree: () => void;
  loadExample: () => void;
  selectNode: (nodeId: string) => void;
  clearSelection: () => void;
  addChild: (parentId: string, condition: string, type: 'branch' | 'leaf', branchKey: string) => boolean;
  deleteNodeAndSubtree: (nodeId: string) => void;
  deleteNodeOnly: (nodeId: string) => void;
  insertParentAbove: (nodeId: string) => void;
  renameCondition: (parentId: string, oldCond: string, newCond: string) => void;
  updateNodeFields: (updates: Partial<TreeNode>) => void;
  importFromCode: (code: string) => boolean;
}

export interface UseTreeStateReturn {
  tree: TreeNode | null;
  platformFeats: string[];
  gameFeats: string[];
  fallback: string;
  selectedNodeId: string | null;
  selectedNode: TreeNode | null;
  treeData: TreeData;
  dictCode: string;
  setPlatformFeats: React.Dispatch<React.SetStateAction<string[]>>;
  setGameFeats: React.Dispatch<React.SetStateAction<string[]>>;
  setFallback: React.Dispatch<React.SetStateAction<string>>;
  actions: TreeActions;
}

export function useTreeState(): UseTreeStateReturn {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [platformFeats, setPlatformFeats] = useState<string[]>([]);
  const [gameFeats, setGameFeats] = useState<string[]>([]);
  const [fallback, setFallback] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleCreateNewTree = useCallback(() => {
    const newTree = createBranchNode('root_key');
    setTree(newTree);
    setPlatformFeats([]);
    setGameFeats([]);
    setFallback('');
    setSelectedNodeId(newTree.id);
    toast.success('已创建新的决策树');
  }, []);

  const handleLoadExample = useCallback(() => {
    const exampleData = createExampleTree();
    setTree(exampleData.decision_tree);
    setPlatformFeats(exampleData.platform_feats);
    setGameFeats(exampleData.game_feats);
    setFallback(exampleData.fallback || '');
    setSelectedNodeId(exampleData.decision_tree?.id || null);
    toast.success('已加载示例决策树');
  }, []);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // 添加子节点。返回是否成功(供调用方决定是否关闭对话框/清空输入)。
  const addChild = useCallback(
    (parentId: string, condition: string, type: 'branch' | 'leaf', branchKey: string): boolean => {
      if (!condition.trim()) {
        toast.error('请输入条件');
        return false;
      }
      if (type === 'branch' && !branchKey.trim()) {
        toast.error('请输入分支节点的判断键');
        return false;
      }
      const newChild = type === 'branch' ? createBranchNode(branchKey) : createLeafNode('');
      let ok = false;
      setTree(prev => {
        if (!prev) return prev;
        const newTree = addChildNode(prev, parentId, condition, newChild);
        if (newTree) {
          ok = true;
          toast.success(`已添加${type === 'branch' ? '分支' : '叶子'}节点`);
          return newTree;
        }
        toast.error('该条件已存在');
        return prev;
      });
      return ok;
    },
    []
  );

  const deleteNodeAndSubtree = useCallback((nodeId: string) => {
    setTree(prev => {
      if (!prev) return prev;
      if (prev.id === nodeId) {
        toast.error('不能删除根节点');
        return prev;
      }
      const newTree = deleteNode(prev, nodeId);
      if (newTree) {
        setSelectedNodeId(null);
        toast.success('已删除节点');
      }
      return newTree;
    });
  }, []);

  const deleteNodeOnly = useCallback((nodeId: string) => {
    setTree(prev => {
      if (!prev) return prev;
      if (prev.id === nodeId) {
        toast.error('不能删除根节点');
        return prev;
      }
      const newTree = spliceNode(prev, nodeId);
      if (newTree) {
        setSelectedNodeId(null);
        toast.success('已删除节点，子树已保留');
      }
      return newTree;
    });
  }, []);

  const insertParentAbove = useCallback((nodeId: string) => {
    setTree(prev => {
      if (!prev) return prev;
      const newTree = insertParentAboveNode(prev, nodeId, '');
      if (newTree) {
        setSelectedNodeId(newTree.id);
        toast.success('已在上方插入判断节点');
      }
      return newTree;
    });
  }, []);

  const renameCondition = useCallback((parentId: string, oldCond: string, newCond: string) => {
    if (!parentId || !oldCond.trim() || !newCond.trim()) return;
    if (oldCond === newCond) {
      return;
    }
    setTree(prev => {
      if (!prev) return prev;
      const newTree = renameBranchCondition(prev, parentId, oldCond, newCond);
      if (newTree) {
        toast.success('条件已更新');
        return newTree;
      }
      toast.error('条件名冲突或节点不存在');
      return prev;
    });
  }, []);

  const updateNodeFields = useCallback((updates: Partial<TreeNode>) => {
    if (!selectedNodeId) return;
    setTree(prev => {
      if (!prev) return prev;
      const newTree = updateNode(prev, selectedNodeId, updates);
      if (newTree) {
        toast.success('节点已更新');
        return newTree;
      }
      return prev;
    });
  }, [selectedNodeId]);

  const importFromCode = useCallback((code: string): boolean => {
    if (!code.trim()) {
      toast.error('请粘贴代码');
      return false;
    }
    try {
      const importedData = dictToTree(code);
      if (importedData && importedData.decision_tree) {
        setTree(importedData.decision_tree);
        setPlatformFeats(importedData.platform_feats);
        setGameFeats(importedData.game_feats);
        setFallback(importedData.fallback || '');
        setSelectedNodeId(importedData.decision_tree.id || null);
        toast.success('决策树导入成功');
        return true;
      }
      toast.error('无法解析决策树');
      return false;
    } catch (error) {
      toast.error('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
      return false;
    }
  }, []);

  const treeData: TreeData = {
    platform_feats: platformFeats,
    game_feats: gameFeats,
    fallback,
    decision_tree: tree,
  };
  const dictCode = tree ? treeToDict(treeData) : '';

  const selectedNode = tree && selectedNodeId ? findNode(tree, selectedNodeId) : null;

  return {
    tree,
    platformFeats,
    gameFeats,
    fallback,
    selectedNodeId,
    selectedNode,
    treeData,
    dictCode,
    setPlatformFeats,
    setGameFeats,
    setFallback,
    actions: {
      createNewTree: handleCreateNewTree,
      loadExample: handleLoadExample,
      selectNode,
      clearSelection,
      addChild,
      deleteNodeAndSubtree,
      deleteNodeOnly,
      insertParentAbove,
      renameCondition,
      updateNodeFields,
      importFromCode,
    },
  };
}
