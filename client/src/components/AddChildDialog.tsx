/**
 * 添加子节点对话框。
 * 原 Home.tsx 里的手写蒙层,抽出为独立组件,行为完全一致:
 * 选节点类型(分支/叶子) -> 输入条件 -> (分支还要输入 key) -> 添加。
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface AddChildDialogProps {
  open: boolean;
  onAdd: (condition: string, type: 'branch' | 'leaf', branchKey: string) => boolean;
  onClose: () => void;
}

export function AddChildDialog({ open, onAdd, onClose }: AddChildDialogProps) {
  const [nodeType, setNodeType] = useState<'branch' | 'leaf' | null>(null);
  const [newCondition, setNewCondition] = useState('');
  const [newNodeKey, setNewNodeKey] = useState('');

  // 打开时重置状态
  useEffect(() => {
    if (open) {
      setNodeType(null);
      setNewCondition('');
      setNewNodeKey('');
    }
  }, [open]);

  if (!open) return null;

  const handleAdd = () => {
    if (!nodeType) return;
    const ok = onAdd(newCondition, nodeType, newNodeKey);
    if (ok) {
      setNewCondition('');
      setNewNodeKey('');
      setNodeType(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="bg-slate-800 border-slate-700 p-6 w-96">
        <h2 className="text-lg font-bold text-white mb-4">添加子节点</h2>
        <div className="mb-4">
          <label className="text-sm text-slate-300 block mb-2">节点类型</label>
          <div className="flex gap-2">
            <Button onClick={() => setNodeType('branch')} className={`flex-1 ${nodeType === 'branch' ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}>分支节点</Button>
            <Button onClick={() => setNodeType('leaf')} className={`flex-1 ${nodeType === 'leaf' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-700 hover:bg-slate-600'}`}>叶子节点</Button>
          </div>
        </div>
        <Input
          value={newCondition}
          onChange={(e) => setNewCondition(e.target.value)}
          placeholder="输入条件（如：Y, N, 818, else）"
          className="bg-slate-700 border-slate-600 text-white mb-4"
          onKeyDown={(e) => { if (e.key === 'Enter' && nodeType) handleAdd(); }}
        />
        {nodeType === 'branch' && (
          <Input
            value={newNodeKey}
            onChange={(e) => setNewNodeKey(e.target.value)}
            placeholder="输入判断键（如：channel_id）"
            className="bg-slate-700 border-slate-600 text-white mb-4"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
        )}
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 border-slate-600 text-slate-300">取消</Button>
          <Button onClick={handleAdd} disabled={!nodeType} className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50">添加</Button>
        </div>
      </Card>
    </div>
  );
}
