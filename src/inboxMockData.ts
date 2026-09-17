import type { InboxClosedReason, InboxConversation, InboxMessage } from './types';
import mockPaymentReceiptUrl from './assets/mock-payment-receipt.png';

const message = (
  conversationId: string,
  order: number,
  role: InboxMessage['role'],
  content: string,
  sentAt: string,
  type: InboxMessage['type'] = 'text',
  imageUrl?: string,
): InboxMessage => ({
  id: `${conversationId}-message-${order}`,
  role,
  content,
  type,
  imageUrl,
  sentAt,
});

const atMinute = (value: string, minutes: number, seconds: number) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  date.setSeconds(seconds, 0);
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}+08:00`;
};

type ConversationInput = Omit<InboxConversation, 'messages'> & {
  customerMessage: string;
  agentMessage: string;
  systemMessage?: string;
};

const conversation = ({ customerMessage, agentMessage, systemMessage, ...item }: ConversationInput): InboxConversation => {
  const startedAt = item.createdAt;
  const needsPaymentCheck = item.agentId === 'payment-agent';
  const needsAccountCheck = item.agentId === 'account-agent';
  const customerFollowUp = item.state === 'processing'
    ? '我现在还在页面等结果，请帮我继续查一下。'
    : item.closedReason === 'human_handoff'
      ? '如果需要人工处理，我可以继续等待。'
      : item.closedReason === 'timeout'
        ? '我稍后再补充信息。'
        : '这样我就明白了。';
  const agentFollowUp = item.state === 'processing'
    ? '好的，我会继续跟进当前状态，有更新会立即告知您。'
    : item.closedReason === 'human_handoff'
      ? '好的，这类问题需要人工继续核对，我会为您转接。'
      : item.closedReason === 'timeout'
        ? '好的，如果您暂时离开，会话可能因长时间无互动自动关闭。'
        : '不客气，如果还有其他问题，也可以继续发送消息。';
  const customerDetail = needsPaymentCheck
    ? '订单页面显示还在处理中，我担心资金会不会丢失。'
    : needsAccountCheck
      ? '如果需要验证身份，我可以提供注册邮箱和最近登录设备。'
      : '我这个账号是 VIP，想确认是否会影响今天的权益。';
  const agentDetail = item.state === 'processing'
    ? needsPaymentCheck
      ? '我已经拿到渠道初步返回，当前还在等待最终确认，不会丢失资金。'
      : needsAccountCheck
        ? '我已完成账户状态检查，正在核对安全验证条件。'
        : '我已查询到您的 VIP 档位，正在核对活动发放记录。'
    : item.closedReason === 'ai_resolved'
      ? '我已把处理步骤和注意事项发给您，本次问题可以直接按页面提示完成。'
      : item.closedReason === 'human_handoff'
        ? '我会把已收集的信息带给人工客服，避免您重复说明。'
        : '稍后您再次发起会话时，可以继续提供这些信息。';
  const customerConfirm = item.state === 'processing'
    ? '好的，我继续等你这边的查询结果。'
    : item.closedReason === 'timeout'
      ? '我先离开一下。'
      : '好的，明白了。';
  const agentFinal = item.state === 'processing'
    ? '我会保持当前会话处理中，有新状态会继续同步给您。'
    : item.closedReason === 'ai_resolved'
      ? '如果后续还有异常，您可以带着同一订单号再次咨询。'
      : item.closedReason === 'human_handoff'
        ? '已为您生成转人工摘要，人工客服接入后会继续处理。'
        : '由于长时间没有新的互动，系统稍后会自动关闭本次会话。';
  const messages = [
    message(item.id, 1, 'system', '会话开始', startedAt),
    message(item.id, 2, 'customer', customerMessage, atMinute(startedAt, 0, 18)),
    message(item.id, 3, 'agent', agentMessage, atMinute(startedAt, 1, 4)),
    message(item.id, 4, 'customer', customerFollowUp, atMinute(startedAt, 2, 16)),
    message(item.id, 5, 'agent', agentFollowUp, atMinute(startedAt, 3, 2)),
    message(item.id, 6, 'customer', customerDetail, atMinute(startedAt, 5, 10)),
    message(item.id, 7, 'agent', agentDetail, atMinute(startedAt, 6, 22)),
    message(item.id, 8, 'customer', customerConfirm, atMinute(startedAt, 8, 6)),
    message(item.id, 9, 'agent', agentFinal, atMinute(startedAt, 9, 18)),
  ];
  if (systemMessage) messages.push(message(item.id, 10, 'system', systemMessage, item.updatedAt));
  return { ...item, messages };
};

const processing = (
  id: string,
  visitorId: string,
  customerName: string,
  channelId: string,
  channelType: InboxConversation['channelType'],
  channelName: string,
  agentId: string,
  agentName: string,
  createdAt: string,
  updatedAt: string,
  customerMessage: string,
  agentMessage: string,
) => conversation({ id, visitorId, customerName, channelId, channelType, channelName, agentId, agentName, state: 'processing', closedReason: null, createdAt, updatedAt, customerMessage, agentMessage });

const closed = (
  id: string,
  visitorId: string,
  customerName: string,
  channelId: string,
  channelType: InboxConversation['channelType'],
  channelName: string,
  agentId: string,
  agentName: string,
  reason: Exclude<InboxClosedReason, null>,
  createdAt: string,
  updatedAt: string,
  customerMessage: string,
  agentMessage: string,
) => {
  const systemMessage = reason === 'ai_resolved'
    ? '会话结束'
    : reason === 'human_handoff'
      ? '已转接给人工客服'
      : '会话已关闭\n由于 15 分钟无消息互动';
  return conversation({ id, visitorId, customerName, channelId, channelType, channelName, agentId, agentName, state: 'closed', closedReason: reason, createdAt, updatedAt, customerMessage, agentMessage, systemMessage });
};

const richConversationMessages: Record<string, InboxMessage[]> = {
  'conv-p-001': [
    message('conv-p-001', 1, 'system', '会话开始', '2026-09-16T10:36:00+08:00'),
    message('conv-p-001', 2, 'customer', '我的充值不到账，订单号是 R202609160018。', '2026-09-16T10:36:18+08:00'),
    message('conv-p-001', 3, 'agent', '您好，我正在查询这笔充值订单，请稍候。', '2026-09-16T10:36:32+08:00'),
    message('conv-p-001', 4, 'agent', '系统显示该订单已进入支付渠道回调队列，我需要再核对一下渠道返回时间。', '2026-09-16T10:37:12+08:00'),
    message('conv-p-001', 5, 'customer', '银行卡已经扣款了，我需要提供截图吗？', '2026-09-16T10:38:06+08:00'),
    message('conv-p-001', 6, 'agent', '可以的，您可以上传扣款截图。我会同时用订单号继续查询。', '2026-09-16T10:38:31+08:00'),
    message('conv-p-001', 7, 'customer', '这是我的扣款截图。', '2026-09-16T10:39:03+08:00', 'image', mockPaymentReceiptUrl),
    message('conv-p-001', 8, 'agent', '已收到截图。截图中的订单号与您提供的信息一致，我继续核对渠道返回状态。', '2026-09-16T10:39:28+08:00'),
    message('conv-p-001', 9, 'agent', '目前看到支付渠道已返回成功，但账户余额还未完成同步。我已为您发起余额同步检查。', '2026-09-16T10:40:28+08:00'),
    message('conv-p-001', 10, 'customer', '大概多久可以到账？', '2026-09-16T10:41:08+08:00'),
    message('conv-p-001', 11, 'agent', '通常 1 到 3 分钟内会完成同步。若 5 分钟后仍未到账，我会转人工继续跟进。', '2026-09-16T10:42:00+08:00'),
  ],
  'conv-r-002': [
    message('conv-r-002', 1, 'system', '会话开始', '2026-09-14T14:08:00+08:00'),
    message('conv-r-002', 2, 'customer', '充值支持哪些支付方式？', '2026-09-14T14:08:18+08:00'),
    message('conv-r-002', 3, 'agent', '目前支持银行卡、电子钱包和数字货币充值。不同地区可用方式会略有差异。', '2026-09-14T14:08:32+08:00'),
    message('conv-r-002', 4, 'customer', '我在哪里看当前可用的方式？', '2026-09-14T14:09:12+08:00'),
    message('conv-r-002', 5, 'agent', '您可以打开充值页面，系统会根据账号地区和当前渠道状态展示可用方式。', '2026-09-14T14:09:46+08:00'),
    message('conv-r-002', 6, 'agent', '选择具体支付方式后，页面会展示最低金额、到账时间和注意事项。', '2026-09-14T14:10:20+08:00'),
    message('conv-r-002', 7, 'customer', '数字货币充值最低金额是多少？', '2026-09-14T14:11:36+08:00'),
    message('conv-r-002', 8, 'agent', '最低金额会随币种变化，充值页面会在您选择币种后展示具体限制。', '2026-09-14T14:12:18+08:00'),
    message('conv-r-002', 9, 'customer', '明白了，谢谢。', '2026-09-14T14:15:31+08:00'),
    message('conv-r-002', 10, 'system', '会话结束', '2026-09-14T14:16:00+08:00'),
  ],
};

const enrichConversation = (item: InboxConversation): InboxConversation => richConversationMessages[item.id]
  ? { ...item, messages: richConversationMessages[item.id] }
  : item;

export const inboxAgents = [
  { id: 'payment-agent', name: 'Payment Agent' },
  { id: 'account-agent', name: 'Account Agent' },
  { id: 'vip-agent', name: 'VIP Agent' },
] as const;

export const inboxChannels = [
  { id: 'web-payment', type: 'livechat', name: '官网充值客服' },
  { id: 'tg-payment', type: 'telegram', name: 'TG 充值渠道' },
  { id: 'line-service', type: 'livechat', name: 'LINE 客服渠道' },
] as const;

const baseInboxConversations: InboxConversation[] = [
  processing('conv-p-001', 'visitor-839201', 'Visitor #839201', 'web-payment', 'livechat', '官网充值客服', 'payment-agent', 'Payment Agent', '2026-09-16T10:36:00+08:00', '2026-09-16T10:42:00+08:00', '我的充值不到账，订单号是 R202609160018。', '您好，我正在查询这笔充值订单，请稍候。'),
  processing('conv-p-002', 'customer-mike', 'Mike', 'tg-payment', 'telegram', 'TG 充值渠道', 'payment-agent', 'Payment Agent', '2026-09-16T10:21:00+08:00', '2026-09-16T10:35:00+08:00', '充值成功了，余额还是没有变化。', '我已经记录您的充值信息，正在核对入账状态。'),
  processing('conv-p-003', 'customer-john123', 'john123', 'web-payment', 'livechat', '官网充值客服', 'payment-agent', 'Payment Agent', '2026-09-16T10:12:00+08:00', '2026-09-16T10:28:00+08:00', '为什么我的提款一直审核中？', '我正在查询提款审核进度，请稍候。'),
  processing('conv-p-004', 'visitor-901221', 'TG_901221', 'tg-payment', 'telegram', 'TG 充值渠道', 'payment-agent', 'Payment Agent', '2026-09-16T09:58:00+08:00', '2026-09-16T10:19:00+08:00', '银行卡扣款了，但平台没有到账。', '请提供充值订单号，我将继续为您查询。'),
  processing('conv-p-005', 'customer-ava88', 'Ava88', 'line-service', 'livechat', 'LINE 客服渠道', 'payment-agent', 'Payment Agent', '2026-09-16T09:43:00+08:00', '2026-09-16T10:07:00+08:00', '提款提示账户信息错误。', '我正在核对您的提款账户信息。'),
  processing('conv-p-006', 'visitor-556801', 'Visitor #556801', 'web-payment', 'livechat', '官网充值客服', 'payment-agent', 'Payment Agent', '2026-09-16T09:35:00+08:00', '2026-09-16T09:54:00+08:00', '充值页面一直显示处理中。', '我正在查询支付渠道返回的订单状态。'),
  processing('conv-p-007', 'customer-leo9', 'Leo_9', 'tg-payment', 'telegram', 'TG 充值渠道', 'payment-agent', 'Payment Agent', '2026-09-16T09:18:00+08:00', '2026-09-16T09:41:00+08:00', '这笔提款什么时候能到账？', '我正在查询预计到账时间。'),
  processing('conv-p-008', 'visitor-302190', 'Visitor #302190', 'web-payment', 'livechat', '官网充值客服', 'account-agent', 'Account Agent', '2026-09-16T09:06:00+08:00', '2026-09-16T09:32:00+08:00', '我无法登录账户。', '我会先核对账户状态和最近登录记录。'),
  processing('conv-p-009', 'customer-lina22', 'Lina22', 'line-service', 'livechat', 'LINE 客服渠道', 'account-agent', 'Account Agent', '2026-09-16T08:54:00+08:00', '2026-09-16T09:20:00+08:00', '绑定的手机号已经不用了。', '我正在确认可以使用的身份验证方式。'),
  processing('conv-p-010', 'visitor-726501', 'Visitor #726501', 'tg-payment', 'telegram', 'TG 充值渠道', 'account-agent', 'Account Agent', '2026-09-16T08:41:00+08:00', '2026-09-16T09:08:00+08:00', '账户被锁定了，怎么恢复？', '我正在检查账户锁定原因。'),
  processing('conv-p-011', 'customer-vip-river', 'River_VIP', 'line-service', 'livechat', 'LINE 客服渠道', 'vip-agent', 'VIP Agent', '2026-09-16T08:22:00+08:00', '2026-09-16T08:49:00+08:00', 'VIP 专属活动没有发放奖励。', '我正在核对您的 VIP 等级和活动记录。'),
  processing('conv-p-012', 'customer-vip-nora', 'Nora_V8', 'web-payment', 'livechat', '官网充值客服', 'vip-agent', 'VIP Agent', '2026-09-16T08:09:00+08:00', '2026-09-16T08:37:00+08:00', '我的专属提款额度没有更新。', '我正在查询今日 VIP 额度更新状态。'),

  closed('conv-r-001', 'customer-amy77', 'Amy77', 'web-payment', 'livechat', '官网充值客服', 'payment-agent', 'Payment Agent', 'ai_resolved', '2026-09-15T17:18:00+08:00', '2026-09-15T17:24:00+08:00', '怎么充值？', '进入充值页面后选择支付方式，输入金额并确认即可。'),
  closed('conv-r-002', 'visitor-839201', 'Visitor #839201', 'web-payment', 'livechat', '官网充值客服', 'payment-agent', 'Payment Agent', 'ai_resolved', '2026-09-14T14:08:00+08:00', '2026-09-14T14:16:00+08:00', '充值支持哪些支付方式？', '目前支持银行卡、电子钱包和数字货币充值。'),
  closed('conv-r-003', 'customer-ken102', 'Ken102', 'tg-payment', 'telegram', 'TG 充值渠道', 'payment-agent', 'Payment Agent', 'ai_resolved', '2026-09-14T11:02:00+08:00', '2026-09-14T11:09:00+08:00', '最低充值金额是多少？', '当前最低充值金额为 100，页面会根据支付方式展示具体限制。'),
  closed('conv-r-004', 'customer-sara5', 'Sara_5', 'line-service', 'livechat', 'LINE 客服渠道', 'account-agent', 'Account Agent', 'ai_resolved', '2026-09-13T19:31:00+08:00', '2026-09-13T19:40:00+08:00', '如何修改登录密码？', '请进入账户安全页面，完成身份验证后修改密码。'),
  closed('conv-r-005', 'visitor-682201', 'Visitor #682201', 'web-payment', 'livechat', '官网充值客服', 'account-agent', 'Account Agent', 'ai_resolved', '2026-09-13T16:12:00+08:00', '2026-09-13T16:18:00+08:00', '在哪里查看登录记录？', '进入账户安全页面后，选择登录记录即可查看。'),
  closed('conv-r-006', 'customer-vip-oliver', 'Oliver_VIP', 'line-service', 'livechat', 'LINE 客服渠道', 'vip-agent', 'VIP Agent', 'ai_resolved', '2026-09-12T15:06:00+08:00', '2026-09-12T15:14:00+08:00', 'VIP 等级什么时候更新？', 'VIP 等级会在每日数据结算完成后自动更新。'),

  closed('conv-h-001', 'customer-david66', 'David66', 'web-payment', 'livechat', '官网充值客服', 'payment-agent', 'Payment Agent', 'human_handoff', '2026-09-12T11:23:00+08:00', '2026-09-12T11:31:00+08:00', '这笔重复扣款需要人工帮我核对。', '这个问题需要进一步核对支付凭证，我将为您转接人工客服。'),
  closed('conv-h-002', 'customer-tg-6118', 'TG_6118', 'tg-payment', 'telegram', 'TG 充值渠道', 'account-agent', 'Account Agent', 'human_handoff', '2026-09-11T20:14:00+08:00', '2026-09-11T20:22:00+08:00', '我要联系人工修改实名信息。', '请通过以下人工客服链接继续处理：https://support.example.com/handoff'),
  closed('conv-h-003', 'customer-vip-emma', 'Emma_V9', 'line-service', 'livechat', 'LINE 客服渠道', 'vip-agent', 'VIP Agent', 'human_handoff', '2026-09-11T13:10:00+08:00', '2026-09-11T13:18:00+08:00', '请让 VIP 客户经理联系我。', '好的，我将本次会话转交给 VIP 人工服务团队。'),

  closed('conv-t-001', 'visitor-839201', 'Visitor #839201', 'web-payment', 'livechat', '官网充值客服', 'payment-agent', 'Payment Agent', 'timeout', '2026-09-10T10:26:00+08:00', '2026-09-10T10:46:00+08:00', '我想查询昨天的充值。', '请提供充值订单号，我会继续为您查询。'),
  closed('conv-t-002', 'visitor-117302', 'Visitor #117302', 'line-service', 'livechat', 'LINE 客服渠道', 'account-agent', 'Account Agent', 'timeout', '2026-09-09T17:05:00+08:00', '2026-09-09T17:25:00+08:00', '我忘记了账户绑定信息。', '请提供可以验证账户归属的信息。'),
];

export const inboxConversations: InboxConversation[] = baseInboxConversations.map(enrichConversation);
