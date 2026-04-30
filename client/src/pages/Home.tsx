import React, { useState, useCallback } from 'react';
import { TreeNode, createBranchNode, createLeafNode, treeToDict, findNode, deleteNode, cloneNode, dictToTree, TreeData } from '@/lib/treeTypes';
import { createExampleTree } from '@/lib/exampleData';
import { TreeVisualizer } from '@/components/TreeVisualizer';
import { NodeEditDialog } from '@/components/NodeEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Copy, Download, Plus, RefreshCw, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [platformFeats, setPlatformFeats] = useState<string[]>([]);
  const [gameFeats, setGameFeats] = useState<string[]>([]);
  const [fallback, setFallback] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [nodeTypeToAdd, setNodeTypeToAdd] = useState<'branch' | 'leaf' | null>(null);
  const [newCondition, setNewCondition] = useState('');
  const [newNodeKey, setNewNodeKey] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [newPlatformFeat, setNewPlatformFeat] = useState('');
  const [newGameFeat, setNewGameFeat] = useState('');

  const handleCreateNewTree = useCallback(() => {
    const newTree = createBranchNode('root_key');
    setTree(newTree);
    setPlatformFeats([]);
    setGameFeats([]);
    setFallback('');
    setSelectedNodeId(newTree.id);
    setShowCodePreview(false);
    toast.success('已创建新的决策树');
  }, []);

  const handleLoadExample = useCallback(() => {
    const exampleData = createExampleTree();
    setTree(exampleData.decision_tree);
    setPlatformFeats(exampleData.platform_feats);
    setGameFeats(exampleData.game_feats);
    setFallback(exampleData.fallback || '');
    setSelectedNodeId(exampleData.decision_tree?.id || null);
    setShowCodePreview(false);
    toast.success('已加载示例决策树');
  }, []);

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleAddNode = useCallback(() => {
    if (!selectedNodeId || !newCondition.trim()) {
      toast.error('请输入条件');
      return;
    }
    if (nodeTypeToAdd === 'branch' && !newNodeKey.trim()) {
      toast.error('请输入分支节点的判断键');
      return;
    }

    setTree(prev => {
      if (!prev) return prev;
      const newTree = cloneNode(prev);
      const parent = findNode(newTree, selectedNodeId);
      if (parent && parent.type === 'branch') {
        if (!parent.branches) parent.branches = {};
        if (parent.branches[newCondition]) {
          toast.error('该条件已存在');
          return newTree;
        }
        const newChild = nodeTypeToAdd === 'branch'
          ? createBranchNode(newNodeKey)
          : createLeafNode('');
        parent.branches[newCondition] = newChild;
        toast.success(`已添加${nodeTypeToAdd === 'branch' ? '分支' : '叶子'}节点`);
      } else {
        toast.error('只能在分支节点上添加子节点');
      }
      return newTree;
    });

    setNewCondition('');
    setNewNodeKey('');
    setNodeTypeToAdd(null);
    setAddNodeDialogOpen(false);
  }, [selectedNodeId, newCondition, newNodeKey, nodeTypeToAdd]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (tree?.id === nodeId) {
      toast.error('不能删除根节点');
      return;
    }
    setTree(prev => {
      const newTree = deleteNode(prev, nodeId);
      if (newTree) {
        setSelectedNodeId(null);
        toast.success('已删除节点');
      }
      return newTree;
    });
  }, [tree]);

  const handleUpdateNode = useCallback((updates: Partial<TreeNode>) => {
    if (!selectedNodeId) return;
    setTree(prev => {
      if (!prev) return prev;
      const newTree = cloneNode(prev);
      const node = findNode(newTree, selectedNodeId);
      if (node) {
        Object.assign(node, updates);
        toast.success('节点已更新');
      }
      return newTree;
    });
  }, [selectedNodeId]);

  const treeData: TreeData = {
    platform_feats: platformFeats,
    game_feats: gameFeats,
    fallback,
    decision_tree: tree
  };
  const dictCode = tree ? treeToDict(treeData) : '';

  const handleCopyCode = useCallback(() => {
    if (!tree) return;
    navigator.clipboard.writeText(dictCode);
    toast.success('已复制到剪贴板');
  }, [dictCode, tree]);

  const handleImportTree = useCallback(() => {
    if (!importCode.trim()) {
      toast.error('请粘贴代码');
      return;
    }
    try {
      const importedData = dictToTree(importCode);
      if (importedData && importedData.decision_tree) {
        setTree(importedData.decision_tree);
        setPlatformFeats(importedData.platform_feats);
        setGameFeats(importedData.game_feats);
        setFallback(importedData.fallback || '');
        setSelectedNodeId(importedData.decision_tree.id || null);
        setImportDialogOpen(false);
        setImportCode('');
        setShowCodePreview(false);
        toast.success('决策树导入成功');
      } else {
        toast.error('无法解析决策树');
      }
    } catch (error) {
      toast.error('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }, [importCode]);

  const handleDownloadCode = useCallback(() => {
    if (!tree) return;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(dictCode));
    element.setAttribute('download', 'decision_tree.py');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('已下载 decision_tree.py');
  }, [dictCode, tree]);

  const addPlatformFeat = () => {
    const v = newPlatformFeat.trim();
    if (v && !platformFeats.includes(v)) {
      setPlatformFeats([...platformFeats, v]);
      setNewPlatformFeat('');
    }
  };
  const removePlatformFeat = (idx: number) => {
    setPlatformFeats(platformFeats.filter((_, i) => i !== idx));
  };
  const addGameFeat = () => {
    const v = newGameFeat.trim();
    if (v && !gameFeats.includes(v)) {
      setGameFeats([...gameFeats, v]);
      setNewGameFeat('');
    }
  };
  const removeGameFeat = (idx: number) => {
    setGameFeats(gameFeats.filter((_, i) => i !== idx));
  };

  const selectedNode = tree && selectedNodeId ? findNode(tree, selectedNodeId) : null;

  return (
    <div className="min-h-screen bg-slate-900 text-foreground flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            决策树编辑器
          </h1>
          <p className="text-xs text-slate-400">可视化编辑客服决策树，一键生成 Python Dict</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {!tree ? (
            <>
              <Button onClick={handleCreateNewTree} className="bg-cyan-500 hover:bg-cyan-600 text-white"><Plus size={14} className="mr-1" />创建新树</Button>
              <Button onClick={handleLoadExample} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">加载示例</Button>
              <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700"><Upload size={14} className="mr-1" />导入</Button>
            </>
          ) : (
            <>
              <Button onClick={handleLoadExample} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">重新加载示例</Button>
              <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"><Upload size={14} className="mr-1" />导入</Button>
              <Button onClick={handleCreateNewTree} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"><RefreshCw size={14} className="mr-1" />新建</Button>
              <Button onClick={() => setAddNodeDialogOpen(true)} disabled={!selectedNode || selectedNode.type !== 'branch'} className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 text-xs"><Plus size={14} className="mr-1" />添加子节点</Button>
              <Button onClick={() => setEditDialogOpen(true)} disabled={!selectedNode} className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 text-xs">编辑节点</Button>
              <Button onClick={() => setShowCodePreview(!showCodePreview)} className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs"><Copy size={14} className="mr-1" />{showCodePreview ? '隐藏代码' : '查看代码'}</Button>
              <Button onClick={handleDownloadCode} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"><Download size={14} className="mr-1" />下载</Button>
            </>
          )}
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex-1 flex overflow-hidden gap-0">
        {/* 左侧：画布 */}
        <div className="flex-1 flex flex-col">
          {!tree ? (
            <div className="flex-1 flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <div className="text-6xl mb-4">🌳</div>
                <p className="text-slate-400 mb-6">还没有创建决策树</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleCreateNewTree} className="bg-cyan-500 hover:bg-cyan-600 text-white"><Plus size={16} className="mr-2" />创建新树</Button>
                  <Button onClick={handleLoadExample} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">加载示例</Button>
                </div>
              </div>
            </div>
          ) : (
            <TreeVisualizer
              tree={tree}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              onAddChild={(nodeId) => { setSelectedNodeId(nodeId); setAddNodeDialogOpen(true); }}
              onDeleteNode={handleDeleteNode}
            />
          )}
        </div>

        {/* 右侧面板 */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-y-auto flex-shrink-0">
          {/* 树的元信息 */}
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-sm font-bold text-cyan-400 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
              树的元信息
            </h2>

            {/* 平台特征列表 */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 block mb-2">Platform Feat List</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {platformFeats.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-900/50 text-teal-200 rounded-full text-xs font-mono">
                    {f}
                    <button onClick={() => removePlatformFeat(i)} className="hover:text-white opacity-60 hover:opacity-100"><X size={10} /></button>
                  </span>
                ))}
                {platformFeats.length === 0 && <span className="text-xs text-slate-500">暂无平台特征</span>}
              </div>
              <div className="flex gap-1">
                <Input
                  value={newPlatformFeat}
                  onChange={(e) => setNewPlatformFeat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addPlatformFeat(); }}
                  placeholder="添加特征..."
                  className="h-7 text-xs bg-slate-900 border-slate-600 text-white"
                />
                <Button onClick={addPlatformFeat} size="sm" className="h-7 px-2 bg-cyan-500 hover:bg-cyan-600 text-xs">+</Button>
              </div>
            </div>

            {/* 游戏特征列表 */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 block mb-2">Game Feat List</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {gameFeats.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-900/50 text-purple-200 rounded-full text-xs font-mono">
                    {f}
                    <button onClick={() => removeGameFeat(i)} className="hover:text-white opacity-60 hover:opacity-100"><X size={10} /></button>
                  </span>
                ))}
                {gameFeats.length === 0 && <span className="text-xs text-slate-500">暂无游戏特征</span>}
              </div>
              <div className="flex gap-1">
                <Input
                  value={newGameFeat}
                  onChange={(e) => setNewGameFeat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addGameFeat(); }}
                  placeholder="添加特征..."
                  className="h-7 text-xs bg-slate-900 border-slate-600 text-white"
                />
                <Button onClick={addGameFeat} size="sm" className="h-7 px-2 bg-purple-500 hover:bg-purple-600 text-xs">+</Button>
              </div>
            </div>

            {/* 判断失败默认回复 */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Fallback</label>
              <Textarea
                value={fallback}
                onChange={(e) => setFallback(e.target.value)}
                placeholder="当字段缺失或判断无法继续时使用的默认回复..."
                className="min-h-20 bg-slate-900 border-slate-600 text-white text-xs resize-y"
              />
            </div>
          </div>

          {/* 节点属性 */}
          <div className="p-4 border-b border-slate-700 flex-1">
            <h2 className="text-sm font-bold text-cyan-400 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
              节点属性
            </h2>

            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">类型</label>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${selectedNode.type === 'branch' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'}`}>
                    {selectedNode.type === 'branch' ? '分支节点' : '叶子节点'}
                  </span>
                </div>
                {selectedNode.type === 'branch' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">判断键 (Key)</label>
                      <div className="text-sm text-slate-300 font-mono bg-slate-900 p-2 rounded">{selectedNode.key || '(未设置)'}</div>
                    </div>
                    {selectedNode.branches && (
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">分支 ({Object.keys(selectedNode.branches).length})</label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {Object.entries(selectedNode.branches).map(([cond, child]) => (
                            <div key={cond} className="flex items-center gap-1 text-xs bg-slate-900 rounded p-1.5">
                              <span className="text-cyan-300 font-mono flex-1 truncate" title={cond}>{cond}</span>
                              <span className="text-slate-500">→ {child.type === 'branch' ? '分支' : '叶子'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {selectedNode.type === 'leaf' && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">最终答案 (Final)</label>
                    <div className="text-xs text-slate-300 whitespace-pre-wrap break-words bg-slate-900 p-2 rounded max-h-40 overflow-auto">{selectedNode.final || '(未设置)'}</div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => setEditDialogOpen(true)} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs h-7">编辑</Button>
                  {tree && selectedNode.id !== tree.id && (
                    <Button onClick={() => handleDeleteNode(selectedNode.id)} size="sm" variant="destructive" className="flex-1 text-xs h-7">删除</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs">点击画布上的节点查看其属性</div>
            )}
          </div>

          {/* 代码预览 */}
          {showCodePreview && tree && (
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-cyan-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Python Dict</h3>
                <div className="flex items-center gap-1">
                  <Button onClick={handleCopyCode} size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-xs h-7 min-w-20 px-3">
                    <Copy size={12} className="mr-1" />复制代码
                  </Button>
                  <Button onClick={() => setShowCodePreview(false)} size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200 h-7 w-7 p-0">✕</Button>
                </div>
              </div>
              <pre className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 overflow-auto font-mono max-h-80 whitespace-pre-wrap">{dictCode}</pre>
            </div>
          )}
        </div>
      </div>

      {/* 编辑节点对话框 */}
      <NodeEditDialog
        open={editDialogOpen}
        node={selectedNode}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleUpdateNode}
      />

      {/* 添加子节点对话框 */}
      {addNodeDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-800 border-slate-700 p-6 w-96">
            <h2 className="text-lg font-bold text-white mb-4">添加子节点</h2>
            <div className="mb-4">
              <label className="text-sm text-slate-300 block mb-2">节点类型</label>
              <div className="flex gap-2">
                <Button onClick={() => setNodeTypeToAdd('branch')} className={`flex-1 ${nodeTypeToAdd === 'branch' ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}>分支节点</Button>
                <Button onClick={() => setNodeTypeToAdd('leaf')} className={`flex-1 ${nodeTypeToAdd === 'leaf' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-700 hover:bg-slate-600'}`}>叶子节点</Button>
              </div>
            </div>
            <Input
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              placeholder="输入条件（如：Y, N, 818, else）"
              className="bg-slate-700 border-slate-600 text-white mb-4"
              onKeyDown={(e) => { if (e.key === 'Enter' && nodeTypeToAdd) handleAddNode(); }}
            />
            {nodeTypeToAdd === 'branch' && (
              <Input
                value={newNodeKey}
                onChange={(e) => setNewNodeKey(e.target.value)}
                placeholder="输入判断键（如：channel_id）"
                className="bg-slate-700 border-slate-600 text-white mb-4"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddNode(); }}
              />
            )}
            <div className="flex gap-2">
              <Button onClick={() => { setAddNodeDialogOpen(false); setNewCondition(''); setNewNodeKey(''); setNodeTypeToAdd(null); }} variant="outline" className="flex-1 border-slate-600 text-slate-300">取消</Button>
              <Button onClick={handleAddNode} disabled={!nodeTypeToAdd} className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50">添加</Button>
            </div>
          </Card>
        </div>
      )}

      {/* 导入对话框 */}
      {importDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-800 border-slate-700 p-6 w-[500px] max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-bold text-white mb-2">导入决策树</h2>
            <p className="text-xs text-slate-400 mb-3">粘贴 JSON 或 Python Dict 格式，支持模板 CSV 格式和元组键</p>
            <textarea
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder={`{
  "platform_feats": ["channel_id"],
  "game_feats": [],
  "fallback": "当前信息暂时不足，请转人工客服协助确认。",
  "decision_tree": {
    "key": "channel_id",
    "branches": {
      "818": { "final": "答案" },
      "else": { "final": "默认答案" }
    }
  }
}`}
              className="bg-slate-700 border border-slate-600 text-white rounded p-3 mb-4 flex-1 font-mono text-sm resize-none min-h-[200px]"
            />
            <div className="flex gap-2">
              <Button onClick={() => { setImportDialogOpen(false); setImportCode(''); }} variant="outline" className="flex-1 border-slate-600 text-slate-300">取消</Button>
              <Button onClick={handleImportTree} className="flex-1 bg-cyan-500 hover:bg-cyan-600">导入</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
