/**
 * 节点编辑对话框
 */

import React, { useState, useEffect } from 'react';
import { TreeNode } from '@/lib/treeTypes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface NodeEditDialogProps {
  open: boolean;
  node: TreeNode | null;
  onClose: () => void;
  onSave: (updates: Partial<TreeNode>) => void;
}

export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  open,
  node,
  onClose,
  onSave,
}) => {
  const [key, setKey] = useState('');
  const [final, setFinal] = useState('');

  useEffect(() => {
    if (node) {
      if (node.type === 'branch') {
        setKey(node.key || '');
      } else {
        setFinal(node.final || '');
      }
    }
  }, [node, open]);

  const handleSave = () => {
    if (node?.type === 'branch') {
      onSave({ key });
    } else {
      onSave({ final });
    }
    onClose();
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            编辑{node.type === 'branch' ? '分支' : '叶子'}节点
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {node.type === 'branch' ? (
            <div>
              <Label className="text-slate-300 mb-2 block">判断键 (Key)</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="例如: channel_id"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          ) : (
            <div>
              <Label className="text-slate-300 mb-2 block">最终答案 (Final)</Label>
              <Textarea
                value={final}
                onChange={(e) => setFinal(e.target.value)}
                placeholder="输入最终答案..."
                className="bg-slate-700 border-slate-600 text-white min-h-32"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-600 text-slate-300"
          >
            取消
          </Button>
          <Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
