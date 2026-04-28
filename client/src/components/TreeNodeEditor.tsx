/**
 * 树形节点编辑组件
 * 设计理念：深蓝科技感 - 使用彩色节点卡片、流动的连接线、发光效果
 */

import React, { useState } from 'react';
import { TreeNode, createBranchNode, createLeafNode, NodeType } from '@/lib/treeTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, MoreVertical } from 'lucide-react';

interface TreeNodeEditorProps {
  node: TreeNode;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
  onAddChild: (parentId: string, condition: string, childNode: TreeNode) => void;
  onUpdateNode: (nodeId: string, updates: Partial<TreeNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  depth: number;
  condition?: string;
}

export const TreeNodeEditor: React.FC<TreeNodeEditorProps> = ({
  node,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onAddChild,
  onUpdateNode,
  onDeleteNode,
  depth,
  condition,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editKey, setEditKey] = useState(node.key || '');
  const [editFinal, setEditFinal] = useState(node.final || '');
  const [addChildDialogOpen, setAddChildDialogOpen] = useState(false);
  const [newCondition, setNewCondition] = useState('');
  const [newChildType, setNewChildType] = useState<NodeType>('leaf');

  const handleEditSave = () => {
    if (node.type === 'branch') {
      onUpdateNode(node.id, { key: editKey });
    } else {
      onUpdateNode(node.id, { final: editFinal });
    }
    setEditDialogOpen(false);
  };

  const handleAddChild = () => {
    if (!newCondition.trim()) return;
    const childNode = newChildType === 'branch' ? createBranchNode() : createLeafNode();
    onAddChild(node.id, newCondition, childNode);
    setNewCondition('');
    setNewChildType('leaf');
    setAddChildDialogOpen(false);
  };

  const isBranch = node.type === 'branch';
  const hasChildren = isBranch && node.branches && Object.keys(node.branches).length > 0;
  const nodeColor = isBranch ? 'node-branch' : 'node-leaf';

  return (
    <div className="relative">
      {/* 节点卡片 */}
      <div
        className={`
          flex items-center gap-2 p-3 rounded-lg cursor-pointer
          transition-all duration-200 mb-2
          ${nodeColor}
          ${isSelected ? 'ring-2 ring-white scale-105' : ''}
          node-hover
        `}
        onClick={() => onSelect(node.id)}
        style={{
          marginLeft: `${depth * 24}px`,
        }}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-white" />
            ) : (
              <ChevronRight size={16} className="text-white" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        {/* 节点内容 */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {isBranch ? `Key: ${node.key || '(未设置)'}` : 'Final'}
          </div>
          {condition && (
            <div className="text-xs text-white/70 truncate">
              Condition: {condition}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex-shrink-0 flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setEditDialogOpen(true);
            }}
          >
            <Edit2 size={14} className="text-white" />
          </Button>

          {isBranch && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setAddChildDialogOpen(true);
              }}
            >
              <Plus size={14} className="text-white" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-white/20"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical size={14} className="text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem
                className="text-red-400 cursor-pointer"
                onClick={() => onDeleteNode(node.id)}
              >
                <Trash2 size={14} className="mr-2" />
                删除节点
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 子节点 */}
      {isBranch && isExpanded && node.branches && (
        <div>
          {Object.entries(node.branches).map(([condition, childNode]) => (
            <TreeNodeEditor
              key={childNode.id}
              node={childNode}
              isSelected={isSelected}
              isExpanded={isExpanded}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onAddChild={onAddChild}
              onUpdateNode={onUpdateNode}
              onDeleteNode={onDeleteNode}
              depth={depth + 1}
              condition={condition}
            />
          ))}
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isBranch ? '编辑分支节点' : '编辑叶子节点'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isBranch ? (
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  判断键 (Key)
                </label>
                <Input
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  placeholder="例如: channel_id"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  最终答案 (Final)
                </label>
                <Textarea
                  value={editFinal}
                  onChange={(e) => setEditFinal(e.target.value)}
                  placeholder="输入最终答案..."
                  className="bg-slate-700 border-slate-600 text-white min-h-32"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              取消
            </Button>
            <Button onClick={handleEditSave} className="bg-cyan-500 hover:bg-cyan-600">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加子节点对话框 */}
      <Dialog open={addChildDialogOpen} onOpenChange={setAddChildDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">添加子节点</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">
                条件值 (Condition)
              </label>
              <Input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="例如: 818"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">
                子节点类型
              </label>
              <div className="flex gap-2">
                <Button
                  variant={newChildType === 'branch' ? 'default' : 'outline'}
                  onClick={() => setNewChildType('branch')}
                  className={
                    newChildType === 'branch'
                      ? 'bg-cyan-500 hover:bg-cyan-600'
                      : 'border-slate-600 text-slate-300'
                  }
                >
                  分支节点
                </Button>
                <Button
                  variant={newChildType === 'leaf' ? 'default' : 'outline'}
                  onClick={() => setNewChildType('leaf')}
                  className={
                    newChildType === 'leaf'
                      ? 'bg-purple-500 hover:bg-purple-600'
                      : 'border-slate-600 text-slate-300'
                  }
                >
                  叶子节点
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddChildDialogOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              取消
            </Button>
            <Button onClick={handleAddChild} className="bg-cyan-500 hover:bg-cyan-600">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
