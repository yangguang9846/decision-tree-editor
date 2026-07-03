import { useState, useCallback } from 'react';
import { TreeVisualizer } from '@/components/TreeVisualizer';
import { NodeEditDialog } from '@/components/NodeEditDialog';
import { AddChildDialog } from '@/components/AddChildDialog';
import { ImportDialog } from '@/components/ImportDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, Pencil, Plus, RefreshCw, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTreeState } from '@/hooks/useTreeState';

export default function Home() {
  const {
    tree,
    platformFeats,
    gameFeats,
    fallback,
    selectedNodeId,
    selectedNode,
    dictCode,
    setPlatformFeats,
    setGameFeats,
    setFallback,
    actions,
  } = useTreeState();

  const [showCodePreview, setShowCodePreview] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [newPlatformFeat, setNewPlatformFeat] = useState('');
  const [newGameFeat, setNewGameFeat] = useState('');
  const [editingCondNodeId, setEditingCondNodeId] = useState<string | null>(null);
  const [editingCondOld, setEditingCondOld] = useState('');
  const [editingCondNew, setEditingCondNew] = useState('');
  // 添加子节点对话框需要知道目标父节点:打开时锁定
  const [addChildTargetId, setAddChildTargetId] = useState<string | null>(null);

  // 添加子节点:工具栏按钮针对当前选中节点
  const openAddChildForSelected = useCallback(() => {
    if (selectedNode?.type === 'branch') {
      setAddChildTargetId(selectedNode.id);
      setAddNodeDialogOpen(true);
    }
  }, [selectedNode]);

  // 画布右键"添加子分支"针对特定节点
  const openAddChildForNode = useCallback((nodeId: string) => {
    actions.selectNode(nodeId);
    setAddChildTargetId(nodeId);
    setAddNodeDialogOpen(true);
  }, [actions]);

  const handleAddChild = useCallback((condition: string, type: 'branch' | 'leaf', branchKey: string) => {
    if (!addChildTargetId) return false;
    return actions.addChild(addChildTargetId, condition, type, branchKey);
  }, [addChildTargetId, actions]);

  const handleEditCondition = useCallback((parentId: string, condition: string) => {
    actions.selectNode(parentId);
    setEditingCondNodeId(parentId);
    setEditingCondOld(condition);
    setEditingCondNew(condition);
  }, [actions]);

  const handleRenameCondition = useCallback(() => {
    if (!editingCondNodeId || !editingCondOld.trim() || !editingCondNew.trim()) return;
    if (editingCondOld === editingCondNew) {
      setEditingCondNodeId(null);
      return;
    }
    actions.renameCondition(editingCondNodeId, editingCondOld, editingCondNew);
    setEditingCondNodeId(null);
  }, [editingCondNodeId, editingCondOld, editingCondNew, actions]);

  const handleCopyCode = useCallback(() => {
    if (!tree) return;
    navigator.clipboard.writeText(dictCode);
    toast.success('已复制到剪贴板');
  }, [dictCode, tree]);

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

  const handleImport = useCallback((code: string) => {
    const ok = actions.importFromCode(code);
    if (ok) {
      setImportDialogOpen(false);
      setShowCodePreview(false);
    }
    return ok;
  }, [actions]);

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
              <Button onClick={actions.createNewTree} className="bg-cyan-500 hover:bg-cyan-600 text-white"><Plus size={14} className="mr-1" />创建新树</Button>
              <Button onClick={actions.loadExample} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">加载示例</Button>
              <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700"><Upload size={14} className="mr-1" />导入</Button>
            </>
          ) : (
            <>
              <Button onClick={actions.loadExample} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">重新加载示例</Button>
              <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"><Upload size={14} className="mr-1" />导入</Button>
              <Button onClick={actions.createNewTree} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"><RefreshCw size={14} className="mr-1" />新建</Button>
              <Button onClick={openAddChildForSelected} disabled={!selectedNode || selectedNode.type !== 'branch'} className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 text-xs"><Plus size={14} className="mr-1" />添加子节点</Button>
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
                  <Button onClick={actions.createNewTree} className="bg-cyan-500 hover:bg-cyan-600 text-white"><Plus size={16} className="mr-2" />创建新树</Button>
                  <Button onClick={actions.loadExample} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">加载示例</Button>
                </div>
              </div>
            </div>
          ) : (
            <TreeVisualizer
              tree={tree}
              selectedNodeId={selectedNodeId}
              onSelectNode={actions.selectNode}
              onAddChild={openAddChildForNode}
              onDeleteNode={actions.deleteNodeAndSubtree}
              onDeleteNodeOnly={actions.deleteNodeOnly}
              onInsertParentAbove={actions.insertParentAbove}
              onEditCondition={handleEditCondition}
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
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {Object.entries(selectedNode.branches).map(([cond, child]) => (
                            <div key={cond} className="flex items-center gap-1 text-xs bg-slate-900 rounded p-1.5">
                              {editingCondNodeId === selectedNode.id && editingCondOld === cond ? (
                                <input
                                  value={editingCondNew}
                                  onChange={(e) => setEditingCondNew(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCondition(); else if (e.key === 'Escape') setEditingCondNodeId(null); }}
                                  onBlur={() => setEditingCondNodeId(null)}
                                  autoFocus
                                  className="flex-1 bg-slate-700 border border-cyan-500 text-cyan-300 font-mono rounded px-1 py-0.5 outline-none text-xs"
                                />
                              ) : (
                                <>
                                  <span className="text-cyan-300 font-mono flex-1 truncate" title={cond}>{cond}</span>
                                  <button
                                    onClick={() => { setEditingCondNodeId(selectedNode.id); setEditingCondOld(cond); setEditingCondNew(cond); }}
                                    className="text-slate-400 hover:text-cyan-400 flex-shrink-0"
                                    title="编辑条件"
                                  >
                                    <Pencil size={10} />
                                  </button>
                                </>
                              )}
                              <span className="text-slate-500 flex-shrink-0">→ {child.type === 'branch' ? '分支' : '叶子'}</span>
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
                    <Button onClick={() => actions.deleteNodeAndSubtree(selectedNode.id)} size="sm" variant="destructive" className="flex-1 text-xs h-7">删除</Button>
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
        onSave={actions.updateNodeFields}
      />

      {/* 添加子节点对话框 */}
      <AddChildDialog
        open={addNodeDialogOpen}
        onAdd={handleAddChild}
        onClose={() => { setAddNodeDialogOpen(false); setAddChildTargetId(null); }}
      />

      {/* 导入对话框 */}
      <ImportDialog
        open={importDialogOpen}
        onImport={handleImport}
        onClose={() => setImportDialogOpen(false)}
      />
    </div>
  );
}
