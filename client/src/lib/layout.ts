/**
 * 决策树布局算法 —— 从 TreeVisualizer.tsx 抽取。
 *
 * 给定一棵树和可选的节点拖拽偏移(offsets),计算每个节点的 (x,y) 位置。
 *
 * 算法说明:
 * - 叶子节点占 NODE_WIDTH 宽度;分支节点宽度 = max(NODE_WIDTH, 子节点宽度之和 + 间距)
 * - 子节点在父节点下方,水平居中排列
 * - offsets 用于节点拖拽(相对偏移,叠加到计算出的坐标上)
 *
 * 原实现里 calculateLayout 对每个子节点重复调用 calculateTreeWidth(O(n²)),
 * 这里合并为一次递归同时返回 width 和 layout(O(n)),坐标输出与原算法完全等价
 * (由 layout.golden.test.ts 快照保证)。
 */
import type { TreeNode } from './treeTypes';

export const NODE_WIDTH = 140;
export const NODE_HEIGHT = 54;
export const VERTICAL_SPACING = 140;
export const MIN_HORIZONTAL_SPACING = 140;

export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeLayout {
  [id: string]: NodePosition;
}

export interface Offsets {
  [id: string]: { x: number; y: number };
}

export interface TreeBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ContainerSize {
  w: number;
  h: number;
}

export interface FitTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export function calculateFitTransform(
  treeBBox: TreeBounds,
  containerSize: ContainerSize,
): FitTransform | null {
  if (treeBBox.w <= 0 || treeBBox.h <= 0 || containerSize.w <= 0 || containerSize.h <= 0) {
    return null;
  }

  const scaleX = containerSize.w / treeBBox.w;
  const scaleY = containerSize.h / treeBBox.h;
  const zoom = Math.min(scaleX, scaleY, 1) * 0.9;

  return {
    zoom,
    panX: (containerSize.w - treeBBox.w * zoom) / 2 - treeBBox.x * zoom,
    panY: (containerSize.h - treeBBox.h * zoom) / 2 - treeBBox.y * zoom,
  };
}

interface LayoutResult {
  layout: NodeLayout;
  width: number;
}

// 一次递归:同时计算子树宽度(用于父节点居中布局)和每个节点坐标。
// 语义与原 calculateTreeWidth + calculateLayout 完全一致。
export function calculateLayout(
  node: TreeNode,
  x: number,
  y: number,
  layout: NodeLayout = {},
  offsets: Offsets = {}
): LayoutResult {
  const offset = offsets[node.id] || { x: 0, y: 0 };
  const ax = x + offset.x;
  const ay = y + offset.y;
  layout[node.id] = { x: ax, y: ay, width: NODE_WIDTH, height: NODE_HEIGHT };

  let width = NODE_WIDTH;

  if (node.type === 'branch' && node.branches) {
    const branches = Object.entries(node.branches);
    if (branches.length > 0) {
      const childWidths = branches.map(([, child]) => subtreeWidth(child));
      const totalWidth =
        childWidths.reduce((a, b) => a + b, 0) +
        (branches.length - 1) * MIN_HORIZONTAL_SPACING;
      width = Math.max(NODE_WIDTH, totalWidth);

      const startX = ax + NODE_WIDTH / 2 - totalWidth / 2;
      let currentX = startX;
      branches.forEach(([cond], index) => {
        const child = node.branches![cond];
        const cw = childWidths[index];
        calculateLayout(
          child,
          currentX + cw / 2 - NODE_WIDTH / 2,
          ay + VERTICAL_SPACING,
          layout,
          offsets
        );
        currentX += cw + MIN_HORIZONTAL_SPACING;
      });
    }
  }

  return { layout, width };
}

// 计算一棵子树的占位宽度(不含坐标)。与原 calculateTreeWidth 等价。
function subtreeWidth(node: TreeNode): number {
  if (node.type === 'leaf') return NODE_WIDTH;
  if (!node.branches || Object.keys(node.branches).length === 0) return NODE_WIDTH;
  const childWidths = Object.values(node.branches).map(child => subtreeWidth(child));
  return Math.max(
    NODE_WIDTH,
    childWidths.reduce((a, b) => a + b, 0) +
      (childWidths.length - 1) * MIN_HORIZONTAL_SPACING
  );
}
