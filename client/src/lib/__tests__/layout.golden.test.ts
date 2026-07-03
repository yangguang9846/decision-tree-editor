/**
 * 布局算法黄金快照 —— 冻结 calculateLayout 的坐标输出。
 *
 * 快照是用算法的"原实现"(TreeVisualizer 里 O(n²) 版本)录制的,
 * 现在改为引用 lib/layout.ts 的 O(n) 版本,跑同一套快照 ——
 * 通过则证明新算法坐标输出与原算法完全等价。
 */
import { describe, it, expect } from 'vitest';
import { createBranchNode, createLeafNode, type TreeNode } from '../treeTypes';
import { calculateLayout } from '../layout';

// 把坐标快照压缩成可读字符串,方便对比。
// 注意:不含 node id —— id 是随机生成的,写进签名会让每次跑都变。
// 用 DFS 遍历顺序,每节点输出 type:key@x,y —— 同一棵树结构稳定,与 id 无关。
function layoutSig(tree: TreeNode, offsets: { [key: string]: { x: number; y: number } } = {}): string {
  const { layout } = calculateLayout(tree, 0, 0, {}, offsets);
  const parts: string[] = [];
  const visit = (node: TreeNode) => {
    const p = layout[node.id];
    if (p) parts.push(`${node.type}:${node.key ?? node.final ?? ''}@${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    if (node.branches) {
      for (const child of Object.values(node.branches)) visit(child);
    }
  };
  visit(tree);
  return parts.join(' | ');
}

// === 参考树 ===
function singleLeaf() { return createLeafNode('leaf'); }

function linearChain() {
  // root → A → B → leaf  (每个分支只有一个子节点)
  const root = createBranchNode('root');
  const a = createBranchNode('a');
  const b = createBranchNode('b');
  b.branches!['c'] = createLeafNode('leaf');
  a.branches!['b'] = b;
  root.branches!['a'] = a;
  return root;
}

function wideTree() {
  // root 下 3 个叶子分支
  const root = createBranchNode('root');
  root.branches!['x'] = createLeafNode('x');
  root.branches!['y'] = createLeafNode('y');
  root.branches!['z'] = createLeafNode('z');
  return root;
}

function nestedTree() {
  // root
  //  ├── a (leaf)
  //  └── b (branch)
  //       ├── b1 (leaf)
  //       └── b2 (branch)
  //            └── b2a (leaf)
  const root = createBranchNode('root');
  root.branches!['a'] = createLeafNode('a');
  const b = createBranchNode('b');
  b.branches!['b1'] = createLeafNode('b1');
  const b2 = createBranchNode('b2');
  b2.branches!['b2a'] = createLeafNode('b2a');
  b.branches!['b2'] = b2;
  root.branches!['b'] = b;
  return root;
}

describe('golden: 布局算法坐标快照', () => {
  it('单叶子节点', () => {
    const sig = layoutSig(singleLeaf());
    expect(sig).toBe('leaf:leaf@0.0,0.0');
  });

  it('线性链(root→a→b→leaf)坐标稳定', () => {
    const sig = layoutSig(linearChain());
    expect(sig).toMatchSnapshot('linearChain');
  });

  it('宽树(3 叶子分支)坐标稳定', () => {
    const sig = layoutSig(wideTree());
    expect(sig).toMatchSnapshot('wideTree');
  });

  it('嵌套树坐标稳定', () => {
    const sig = layoutSig(nestedTree());
    expect(sig).toMatchSnapshot('nestedTree');
  });

  it('offset 偏移生效(拖拽后)', () => {
    const root = wideTree();
    const yId = root.branches!['y'].id;
    const sig = layoutSig(root, { [yId]: { x: 100, y: 50 } });
    expect(sig).toMatchSnapshot('withOffset');
  });
});
