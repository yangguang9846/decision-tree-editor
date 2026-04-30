import { createBranchNode, createLeafNode, TreeData } from './treeTypes';

export function createExampleTree(): TreeData {
  const root = createBranchNode('channel_id');

  // 818,863,866,864,861 -> leaf (微信/淘宝/京东/快手/抖音)
  root.branches!['818,863,866,864,861'] = createLeafNode(
    '微信/淘宝/京东/快手/抖音同步头像昵称，需先更换对应平台头像和昵称，且等待3小时才能同步至游戏，请耐心等待同步生效'
  );

  // 208,204,214,207,206 -> leaf (默认头像)
  root.branches!['208,204,214,207,206'] = createLeafNode(
    '游戏目前暂时不支持修改自定义头像和昵称，但提供了一些默认头像供你选择。你可以进入游戏，在左上角点击头像，进入个人中心，再次点击头像，选择更换。'
  );

  // 101,100,105,106,107,110,113,194,195,501 -> nested
  const nested1 = createBranchNode('has_profile_change_history');

  const nested1Y = createBranchNode('profile_audit_status');
  nested1Y.branches!['verify'] = createLeafNode('我查看你最近一次修改头像昵称的时间是xx，目前资料在审核中，会存在一定的延迟，请耐心等待');
  nested1Y.branches!['fail'] = createLeafNode('我查看你最近一次修改头像昵称的时间是xx，但内容审核不通过，建议更换其他头像昵称重新提交');
  nested1Y.branches!['success'] = createLeafNode('我查看你最近一次修改头像昵称的时间是xx，已经审核通过了，你可以重新登录游戏查看是否刷新');

  const nested1N = createBranchNode('has_rename_card');
  nested1N.branches!['Y'] = createLeafNode(
    '你还没有申请修改头像昵称，修改头像昵称有两种方式：\n1.进入游戏，在左上角点击头像，进入个人中心，再次点击头像，选择更换；\n2.你也可以在此页面，从手机相册上传一张图片作为头像；\n\n若你想修改昵称，可以点击昵称处直接修改昵称。我查看你购买了改名卡，使用改名卡是否遇到困难？\n\n无困难回复:好的，后续有其他疑问欢迎联系我\n\n有困难:帮用户【提交缺陷工单】'
  );
  nested1N.branches!['N'] = createLeafNode(
    '你还没有申请修改头像昵称，修改头像昵称有两种方式：\n1.进入游戏，在左上角点击头像，进入个人中心，再次点击头像，选择更换；\n2.你也可以在此页面，从手机相册上传一张图片作为头像；\n\n若你想修改昵称，可以点击昵称处直接修改昵称。'
  );

  nested1.branches!['Y'] = nested1Y;
  nested1.branches!['N'] = nested1N;
  root.branches!['101,100,105,106,107,110,113,194,195,501'] = nested1;

  // else -> leaf
  root.branches!['else'] = createLeafNode(
    '游戏目前暂时不支持修改自定义头像和昵称，但提供了一些默认头像供你选择。你可以进入游戏，在左上角点击头像，进入个人中心，再次点击头像，选择更换。'
  );

  return {
    platform_feats: ['channel_id', 'has_profile_change_history', 'profile_audit_status'],
    game_feats: ['has_rename_card'],
    fallback: '当前信息暂时不足，无法继续判断，请转人工客服协助确认。',
    decision_tree: root
  };
}
