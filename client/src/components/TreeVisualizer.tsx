import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TreeNode } from '@/lib/treeTypes';

interface TreeVisualizerProps {
  tree: TreeNode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onAddChild?: (parentId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NodeLayout {
  [key: string]: NodePosition;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 54;
const VERTICAL_SPACING = 140;
const MIN_HORIZONTAL_SPACING = 140;

export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({
  tree,
  selectedNodeId,
  onSelectNode,
  onAddChild,
  onDeleteNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodeLayout, setNodeLayout] = useState<NodeLayout>({});
  const [treeBBox, setTreeBBox] = useState({ x: 0, y: 0, w: 1400, h: 900 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 800 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [nodeOffsets, setNodeOffsets] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const initializedRef = useRef(false);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const calculateTreeWidth = (node: TreeNode): number => {
    if (node.type === 'leaf') return NODE_WIDTH;
    if (!node.branches || Object.keys(node.branches).length === 0) return NODE_WIDTH;
    const childWidths = Object.values(node.branches).map(child => calculateTreeWidth(child));
    return Math.max(NODE_WIDTH, childWidths.reduce((a, b) => a + b, 0) + (childWidths.length - 1) * MIN_HORIZONTAL_SPACING);
  };

  const calculateLayout = useCallback((
    node: TreeNode,
    x: number,
    y: number,
    layout: NodeLayout = {},
    offsets: { [key: string]: { x: number; y: number } } = {}
  ): { layout: NodeLayout } => {
    const offset = offsets[node.id] || { x: 0, y: 0 };
    const ax = x + offset.x;
    const ay = y + offset.y;
    layout[node.id] = { x: ax, y: ay, width: NODE_WIDTH, height: NODE_HEIGHT };
    if (node.type === 'branch' && node.branches) {
      const branches = Object.entries(node.branches);
      if (branches.length > 0) {
        const childWidths = branches.map(([_, child]) => calculateTreeWidth(child));
        const totalWidth = childWidths.reduce((a, b) => a + b, 0) + (branches.length - 1) * MIN_HORIZONTAL_SPACING;
        const startX = ax + NODE_WIDTH / 2 - totalWidth / 2;
        let currentX = startX;
        branches.forEach(([cond], index) => {
          const child = node.branches![cond];
          const cw = childWidths[index];
          calculateLayout(child, currentX + cw / 2 - NODE_WIDTH / 2, ay + VERTICAL_SPACING, layout, offsets);
          currentX += cw + MIN_HORIZONTAL_SPACING;
        });
      }
    }
    return { layout };
  }, []);

  // Compute layout and bounding box
  useEffect(() => {
    const result = calculateLayout(tree, 0, 0, {}, nodeOffsets);
    setNodeLayout(result.layout);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    Object.values(result.layout).forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + pos.width);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + pos.height);
    });
    const pad = 60;
    setTreeBBox({ x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 });
  }, [tree, nodeOffsets, calculateLayout]);

  // Initialize zoom/pan to fit the tree in the container
  useEffect(() => {
    if (treeBBox.w === 0 || treeBBox.h === 0) return;
    const cw = containerSize.w;
    const ch = containerSize.h;
    if (cw === 0 || ch === 0) return;

    const scaleX = cw / treeBBox.w;
    const scaleY = ch / treeBBox.h;
    const fitScale = Math.min(scaleX, scaleY, 1) * 0.9;

    const offsetX = (cw - treeBBox.w * fitScale) / 2 - treeBBox.x * fitScale;
    const offsetY = (ch - treeBBox.h * fitScale) / 2 - treeBBox.y * fitScale;

    setZoom(fitScale);
    setPanX(offsetX);
    setPanY(offsetY);
    initializedRef.current = true;
  }, [treeBBox, containerSize]);

  // Canvas panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
    }
    if (draggedNode && containerRef.current) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setNodeOffsets(prev => ({
        ...prev,
        [draggedNode]: { x: (prev[draggedNode]?.x || 0) + dx, y: (prev[draggedNode]?.y || 0) + dy },
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggedNode(null);
  };

  // Zoom - smoother, with focus on mouse position
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const factor = e.deltaY > 0 ? 0.97 : 1.03;
    const newZoom = Math.max(0.15, Math.min(4, zoom * factor));

    // Zoom towards mouse position
    const scaleChange = newZoom / zoom;
    const newPanX = mx - (mx - panX) * scaleChange;
    const newPanY = my - (my - panY) * scaleChange;

    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }, [zoom, panX, panY]);

  // Node interactions
  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    onSelectNode(nodeId);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button === 0) {
      setDraggedNode(nodeId);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectNode(nodeId);
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  };

  const renderConnections = () => {
    const lines: React.ReactNode[] = [];
    let lid = 0;
    const draw = (node: TreeNode) => {
      if (node.type !== 'branch' || !node.branches) return;
      const pp = nodeLayout[node.id];
      if (!pp) return;
      for (const [cond, child] of Object.entries(node.branches)) {
        const cp = nodeLayout[child.id];
        if (!cp) continue;
        const x1 = pp.x + pp.width / 2, y1 = pp.y + pp.height;
        const x2 = cp.x + cp.width / 2, y2 = cp.y;
        const cy = (y1 + y2) / 2;
        lines.push(<path key={`l-${lid++}`} d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`} stroke="#334155" strokeWidth="2" fill="none" />);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const txt = cond.length > 22 ? cond.substring(0, 22) + '...' : cond;
        const bw = Math.max(40, txt.length * 6 + 16);
        lines.push(
          <g key={`lb-${lid++}`}>
            <rect x={mx - bw / 2} y={my - 10} width={bw} height={20} fill="#1e293b" stroke="#06B6D4" strokeWidth="0.5" rx="4" />
            <text x={mx} y={my + 4} textAnchor="middle" fontSize="10" fill="#06B6D4" fontWeight="500">{txt}</text>
          </g>
        );
        draw(child);
      }
    };
    draw(tree);
    return lines;
  };

  const renderNodes = () => {
    const nodes: React.ReactNode[] = [];
    let nid = 0;
    const draw = (node: TreeNode) => {
      const pos = nodeLayout[node.id];
      if (!pos) return;
      const sel = selectedNodeId === node.id;
      const isB = node.type === 'branch';
      nodes.push(
        <g key={`n-${nid++}`} onClick={(e) => handleNodeClick(e, node.id)} onMouseDown={(e) => handleNodeMouseDown(e, node.id)} onContextMenu={(e) => handleNodeContextMenu(e, node.id)} style={{ cursor: 'pointer' }}>
          <rect x={pos.x} y={pos.y} width={pos.width} height={pos.height} rx="8"
            fill={isB ? '#06B6D4' : '#A855F7'}
            stroke={sel ? '#FCD34D' : 'transparent'}
            strokeWidth={sel ? 3 : 0}
            opacity={sel ? 1 : 0.88}
            filter={sel ? 'drop-shadow(0 0 6px rgba(250,204,21,0.5))' : undefined}
          />
          <text x={pos.x + pos.width / 2} y={pos.y + 18} textAnchor="middle" fontSize="11" fontWeight="600" fill="white" pointerEvents="none">{isB ? 'Key: ' + (node.key || 'root') : 'Final'}</text>
          <text x={pos.x + pos.width / 2} y={pos.y + 36} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.85)" pointerEvents="none">
            {isB ? ((node.branches ? Object.keys(node.branches).length : 0) + ' 个分支') : (node.final || '(空)').substring(0, 18)}
          </text>
        </g>
      );
      if (isB && node.branches) {
        for (const child of Object.values(node.branches)) draw(child);
      }
    };
    draw(tree);
    return nodes;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-900 overflow-hidden"
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        width="100%"
        height="100%"
        className="bg-slate-900 block"
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {renderConnections()}
          {renderNodes()}
        </g>
      </svg>

      {contextMenu && (
        <div className="fixed bg-slate-800 border border-slate-600 rounded-md shadow-xl z-50 py-1 min-w-[140px]" style={{ top: contextMenu.y, left: contextMenu.x }} onMouseLeave={() => setContextMenu(null)}>
          <button className="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-cyan-400" onClick={() => { onAddChild?.(contextMenu.nodeId); setContextMenu(null); }}>
            + 添加子分支
          </button>
          <button className="block w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-slate-700" onClick={() => { onDeleteNode?.(contextMenu.nodeId); setContextMenu(null); }}>
            删除节点
          </button>
        </div>
      )}

      <div className="absolute bottom-3 left-4 text-xs text-slate-600 pointer-events-none select-none">
        拖拽画布平移 | 滚轮缩放 | 拖拽节点调整位置
      </div>
      <div className="absolute bottom-3 right-4 text-xs text-slate-500 pointer-events-none select-none">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};
