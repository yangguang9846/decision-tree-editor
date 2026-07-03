/**
 * 导入决策树对话框。
 * 原 Home.tsx 里的手写蒙层,抽出为独立组件,行为完全一致:
 * 粘贴 JSON / Python Dict / CSV 格式 -> 导入。
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ImportDialogProps {
  open: boolean;
  onImport: (code: string) => boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onImport, onClose }: ImportDialogProps) {
  const [importCode, setImportCode] = useState('');

  useEffect(() => {
    if (open) {
      setImportCode('');
    }
  }, [open]);

  if (!open) return null;

  const handleImport = () => {
    const ok = onImport(importCode);
    if (ok) {
      setImportCode('');
    }
  };

  return (
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
          <Button onClick={onClose} variant="outline" className="flex-1 border-slate-600 text-slate-300">取消</Button>
          <Button onClick={handleImport} className="flex-1 bg-cyan-500 hover:bg-cyan-600">导入</Button>
        </div>
      </Card>
    </div>
  );
}
