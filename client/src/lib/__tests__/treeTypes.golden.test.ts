/**
 * 黄金测试基线 —— 重构回归用。
 *
 * 这套测试不是为了"验证正确性"，而是为了"冻结现有行为"。
 * 重构前每个输入的输出都被录制成快照，重构后跑同一套断言，
 * 任何输出变化都会让测试失败，从而抓住行为漂移。
 *
 * 跑法：pnpm test
 */
import { describe, it, expect } from 'vitest';
import {
  dictToTree,
  treeToDict,
  createBranchNode,
  createLeafNode,
  findNode,
  deleteNode,
  spliceNode,
  insertParentAbove,
  renameBranchCondition,
  cloneNode,
} from '../treeTypes';

// 把树导出再导入，做一次往返，看是否稳定。
function roundTrip(input: string): { out: string; reimported: ReturnType<typeof dictToTree> } {
  const tree = dictToTree(input)!;
  const out = treeToDict(tree);
  return { out, reimported: dictToTree(out) };
}

describe('golden: 导入导出往返', () => {
  it('Python dict 含 tuple key + 单元素尾逗号 + else', () => {
    const input = `{
	"platform_feats": ["channel_id"],
	"game_feats": [],
	"fallback": "信息不足",
	"decision_tree": {
		"key": "channel_id",
		"branches": {
			("818", ): { "final": "微信答案\\n第二行" },
			("863", "866"): { "final": "淘宝京东" },
			("else",): { "final": "默认" }
		}
	}
}`;
    const { out, reimported } = roundTrip(input);
    expect(out).toContain('("818",)');
    expect(out).toContain('("863", "866")');
    expect(out).toContain('("else",)');
    expect(out).toContain('"decision_tree"');
    expect(out).toContain('微信答案\\n第二行');
    expect(reimported!.platform_feats).toEqual(['channel_id']);
    expect(reimported!.fallback).toBe('信息不足');
    expect(reimported!.decision_tree!.key).toBe('channel_id');
    expect(Object.keys(reimported!.decision_tree!.branches!)).toEqual(
      expect.arrayContaining(['818', '863,866', 'else'])
    );
  });

  it('JSON 输入走 JSON.parse 路径', () => {
    const input = JSON.stringify({
      platform_feats: ['a'],
      game_feats: ['b'],
      fallback: 'f',
      decision_tree: { key: 'k', branches: { Y: { final: 'yes' } } },
    });
    const { out, reimported } = roundTrip(input);
    expect(reimported!.game_feats).toEqual(['b']);
    // 单元素条件 Y 导出为带尾逗号的 tuple
    expect(out).toContain('("Y",)');
  });

  it('CSV 双双引号格式', () => {
    const input = `{""key"": ""ch"", ""branches"": {(""1"",): {""final"": ""a""}}}`;
    const tree = dictToTree(input)!;
    expect(tree.decision_tree!.key).toBe('ch');
    expect(tree.decision_tree!.branches!['1'].final).toBe('a');
  });

  it('Python True/False/None + 单引号', () => {
    const input = `{'key': 'k', 'branches': {'Y': {'final': 'yes'}, 'N': {'final': None}}}`;
    const tree = dictToTree(input)!;
    expect(tree.decision_tree!.branches!['Y'].final).toBe('yes');
  });

  it('knowledge_tree 键名也能导入', () => {
    const input = `{ "knowledge_tree": { "key": "k", "branches": { "Y": { "final": "y" } } } }`;
    const tree = dictToTree(input)!;
    expect(tree.decision_tree!.key).toBe('k');
  });
});

describe('golden: 树操作', () => {
  // 构造一棵固定结构的测试树：
  //   root(key=root)
  //   ├── Y(条件) → leaf "yes"
  //   └── N(条件) → branch(key=nested)
  //                  ├── a → leaf "a"
  //                  └── b → leaf "b"
  function buildTestTree() {
    const root = createBranchNode('root');
    root.branches!['Y'] = createLeafNode('yes');
    const nested = createBranchNode('nested');
    nested.branches!['a'] = createLeafNode('a');
    nested.branches!['b'] = createLeafNode('b');
    root.branches!['N'] = nested;
    return root;
  }

  it('findNode 找到子节点和嵌套节点', () => {
    const root = buildTestTree();
    const yId = root.branches!['Y'].id;
    const aId = root.branches!['N'].branches!['a'].id;
    expect(findNode(root, yId)?.final).toBe('yes');
    expect(findNode(root, aId)?.final).toBe('a');
    expect(findNode(root, 'nonexistent')).toBeNull();
  });

  it('deleteNode 删除子树', () => {
    const root = buildTestTree();
    const yId = root.branches!['Y'].id;
    const after = deleteNode(cloneNode(root), yId)!;
    expect(Object.keys(after.branches!)).toEqual(['N']);
    expect(Object.keys(root.branches!)).toEqual(['Y', 'N']);
  });

  it('spliceNode 删除节点但保留子树(重挂到祖父)', () => {
    const root = buildTestTree();
    const nestedId = root.branches!['N'].id;
    const after = spliceNode(cloneNode(root), nestedId)!;
    expect(after.branches!['N']).toBeUndefined();
    expect(after.branches!['a']).toBeDefined();
    expect(after.branches!['b']).toBeDefined();
  });

  it('insertParentAbove 在节点上方插入判断节点', () => {
    const root = buildTestTree();
    const yId = root.branches!['Y'].id;
    const after = insertParentAbove(cloneNode(root), yId, 'newkey')!;
    const newParent = after.branches!['Y'];
    expect(newParent.type).toBe('branch');
    expect(newParent.key).toBe('newkey');
    expect(newParent.branches!['else'].id).toBe(yId);
  });

  it('insertParentAbove 对根节点：新节点成为新根', () => {
    const root = buildTestTree();
    const after = insertParentAbove(cloneNode(root), root.id, 'newroot')!;
    expect(after.key).toBe('newroot');
    expect(after.branches!['else'].id).toBe(root.id);
  });

  it('renameBranchCondition 重命名条件', () => {
    const root = buildTestTree();
    const after = renameBranchCondition(cloneNode(root), root.id, 'Y', 'YES')!;
    expect(after.branches!['YES']).toBeDefined();
    expect(after.branches!['Y']).toBeUndefined();
  });

  it('renameBranchCondition 拒绝覆盖已存在的键', () => {
    const root = buildTestTree();
    const after = renameBranchCondition(cloneNode(root), root.id, 'Y', 'N');
    expect(after).toBeNull();
  });

  it('cloneNode 深拷贝(改副本不影响原)', () => {
    const root = buildTestTree();
    const copy = cloneNode(root);
    copy.branches!['Y'].final = 'changed';
    expect(root.branches!['Y'].final).toBe('yes');
    expect(copy.id).toBe(root.id);
  });

  it('treeToDict 对空树返回 {}', () => {
    expect(treeToDict({ platform_feats: [], game_feats: [], decision_tree: null })).toBe('{}');
  });
});

describe('golden: 导出文本格式细节', () => {
  it('单元素 tuple 有尾逗号, 多元素无尾逗号', () => {
    const root = createBranchNode('k');
    root.branches!['single'] = createLeafNode('s');
    root.branches!['multi,a,b'] = createLeafNode('m');
    const out = treeToDict({ platform_feats: [], game_feats: [], fallback: '', decision_tree: root });
    expect(out).toContain('("single",)');
    expect(out).toContain('("multi", "a", "b")');
  });

  it('特殊字符转义(反斜杠/双引号/换行)', () => {
    const root = createBranchNode('k');
    root.branches!['x'] = createLeafNode('含"引号"和\\反斜杠和\n换行');
    const out = treeToDict({ platform_feats: [], game_feats: [], fallback: '', decision_tree: root });
    expect(out).toContain('\\"引号\\"');
    expect(out).toContain('\\\\反斜杠');
    expect(out).toContain('\\n换行');
  });
});
