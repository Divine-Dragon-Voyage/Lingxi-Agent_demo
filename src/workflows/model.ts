import type { Edge, Node } from '@xyflow/react';

export type NodeKind = 'start' | 'end' | 'ai' | 'collect' | 'api' | 'condition' | 'reply' | 'wait';
export type WorkflowNodeData = { kind: NodeKind; label: string; config: Record<string, string>; invalid?: boolean };
export type WorkflowNode = Node<WorkflowNodeData, 'workflow'>;
export interface WorkflowDraft { name: string; trigger: string; nodes: WorkflowNode[]; edges: Edge[] }
export interface Workflow {
  id: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
  draft: WorkflowDraft;
  published: WorkflowDraft | null;
  publishedAt?: string;
}
export interface WorkflowIssue { nodeId?: string; message: string }
export const nodeLabels: Record<NodeKind, string> = { start: '开始', end: '结束', ai: 'AI任务', collect: '收集信息', api: '调用接口', condition: '条件判断', reply: '回复消息', wait: '等待' };
export const workflowId = () => crypto.randomUUID?.() ?? `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
export const snapshot = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export const hasChanges = (flow: Workflow) => !flow.published || JSON.stringify(flow.draft) !== JSON.stringify(flow.published);
export const workflowStatus = (flow: Workflow) => flow.published ? '已发布' : '草稿';

export function normalizeLegacyWorkflow(flow: Workflow): Workflow {
  const normalize = (draft: WorkflowDraft): WorkflowDraft => {
    if (!draft.nodes.some((node) => String(node.data.kind) === 'handoff')) return draft;
    return { ...draft, nodes: draft.nodes.map((node) => String(node.data.kind) === 'handoff' ? {
      ...node, data: { kind: 'reply', label: '回复消息', config: {
        mode: 'fixed', content: flow.id === 'workflow-order-demo'
          ? '暂未查询到发货信息，请核对订单号后再次查询。'
          : '您的问题已记录，请补充相关订单信息，以便进一步核实处理方案。',
      } },
    } : node) };
  };
  return { ...flow, draft: normalize(flow.draft), published: flow.published ? normalize(flow.published) : null };
}

export interface InfoItem { id: string; name: string; type: string; required: boolean }
export interface ConditionRule { field: string; operator: string; value: string }
export interface Branch { id: string; name: string; combination: string; rules: ConditionRule[] }
export interface Mapping { id: string; name: string; value: string }
export function readList<T>(value?: string): T[] {
  try { const parsed = JSON.parse(value ?? '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
export const infoItems = (config: Record<string, string>): InfoItem[] => config.items !== undefined ? readList(config.items) : config.field ? [{ id: 'legacy', name: config.field, type: 'text', required: config.required !== 'false' }] : [];
export const branches = (config: Record<string, string>): Branch[] => config.branches !== undefined ? readList(config.branches) : [{ id: 'yes', name: '满足', combination: 'AND', rules: [{ field: config.field ?? '', operator: config.operator ?? 'equals', value: config.value ?? '' }] }];
export function mappings(config: Record<string, string>, key: string, legacy?: string): Mapping[] {
  if (config[key] !== undefined) return readList(config[key]);
  try { return Object.entries(JSON.parse(config[legacy ?? ''] ?? '{}')).map(([name, value]) => ({ id: name, name, value: String(value) })); } catch { return []; }
}
export function nodePorts(node: WorkflowNode): { id: string; name: string }[] {
  if (node.data.kind === 'end') return [];
  if (node.data.kind === 'condition') return [...branches(node.data.config).map((b) => ({ id: b.id, name: b.name })), { id: 'no', name: '其他情况' }];
  if (node.data.kind === 'wait') return [{ id: 'result', name: '业务结果' }, { id: 'timeout', name: '超时' }];
  return [{ id: 'out', name: '' }];
}
export function outputNames(node: WorkflowNode): string[] {
  if (node.data.kind === 'collect') return infoItems(node.data.config).map((item) => item.name);
  if (node.data.kind === 'api') return mappings(node.data.config, 'outputs', 'result').map((item) => item.name);
  if (node.data.kind === 'ai') return mappings(node.data.config, 'outputs').map((item) => item.name);
  return [];
}
export function ancestorIds(draft: WorkflowDraft, nodeId: string): Set<string> {
  const ancestors = new Set<string>();
  const visit = (id: string) => draft.edges.filter((edge) => edge.target === id).forEach((edge) => { if (!ancestors.has(edge.source) && edge.source !== nodeId) { ancestors.add(edge.source); visit(edge.source); } });
  visit(nodeId);
  return ancestors;
}
export function upstreamVariables(draft: WorkflowDraft, nodeId: string): { label: string; value: string }[] {
  const ancestors = ancestorIds(draft, nodeId);
  return draft.nodes.filter((node) => ancestors.has(node.id)).flatMap((node) => outputNames(node).filter(Boolean).map((name) => ({ label: `${node.data.label} · ${name}`, value: `${node.id}:${name}` })));
}
export function referenceExists(value: string, variables: { value: string }[]): boolean {
  return variables.filter((item) => item.value === value || (!value.includes(':') && item.value.endsWith(`:${value}`))).length === 1;
}
export function makeNode(kind: NodeKind, position: { x: number; y: number }, config: Record<string, string> = {}): WorkflowNode {
  const defaults: Partial<Record<NodeKind, Record<string, string>>> = {
    api: { method: 'GET' }, reply: { mode: 'fixed' },
    condition: { branches: JSON.stringify([{ id: 'yes', name: '分支 1', combination: 'AND', rules: [{ field: '', operator: 'equals', value: '' }] }]) },
  };
  return { id: workflowId(), type: 'workflow', position, data: { kind, label: nodeLabels[kind], config: { ...(kind === 'condition' && config.field ? {} : defaults[kind]), ...config } } };
}
export function makeWorkflow(name: string, trigger: string): Workflow {
  const timestamp = new Date().toISOString();
  return { id: workflowId(), creator: 'Owen', createdAt: timestamp, updatedAt: timestamp, published: null,
    draft: { name, trigger, nodes: [makeNode('start', { x: 100, y: 200 }), makeNode('end', { x: 480, y: 200 })], edges: [] } };
}
export function connectNodes(source: WorkflowNode, target: WorkflowNode, sourceHandle = 'out'): Edge {
  return { id: workflowId(), source: source.id, target: target.id, sourceHandle, targetHandle: 'in', type: 'smoothstep', label: nodePorts(source).find((port) => port.id === sourceHandle)?.name || undefined };
}
export function validateWorkflow(draft: WorkflowDraft, knowledgeIds?: string[]): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  const add = (message: string, nodeId?: string) => issues.push({ message, nodeId });
  if (!draft.name.trim()) add('请输入工作流名称');
  if (!draft.trigger.trim()) add('请输入触发提示词');
  const starts = draft.nodes.filter((node) => node.data.kind === 'start');
  const ends = draft.nodes.filter((node) => node.data.kind === 'end');
  if (starts.length !== 1) add('流程必须包含一个开始节点');
  if (!ends.length) add('请添加结束节点');
  const fields = new Set<string>();
  const required: Partial<Record<NodeKind, [string, string][]>> = {
    api: [['url', '接口地址'], ['method', '请求方式']], wait: [['source', '等待内容'], ['expected', '等待结果']],
    reply: [['content', '回复内容']],
  };
  for (const node of draft.nodes) {
    const { kind, config, label } = node.data;
    if (!label.trim()) add('请填写节点名称', node.id);
    const incomplete = (title: string) => add(`当前节点配置不完整：${title}`, node.id);
    for (const [key, title] of required[kind] ?? []) if (!config[key]?.trim()) incomplete(title);
    if (kind === 'ai' && !(config.goal ?? config.prompt)?.trim()) incomplete('任务目标');
    if (kind === 'ai' && mappings(config, 'outputs').some((row) => !row.name.trim() || !row.value.trim())) incomplete('任务结果');
    if (kind === 'collect') {
      const items = infoItems(config);
      if (!items.length || items.some((item) => !item.name.trim() || !['text', 'number', 'boolean'].includes(item.type))) incomplete('信息项');
    }
    for (const name of outputNames(node)) {
      if (!name.trim()) incomplete('输出信息名称');
      if (fields.has(`${node.id}:${name}`)) incomplete('信息名称不能重复');
      fields.add(`${node.id}:${name}`);
    }
    const variables = upstreamVariables(draft, node.id);
    const checkReference = (value: string) => { if (value && !referenceExists(value, variables)) add('当前引用信息不存在', node.id); };
    if (kind === 'condition') {
      if (!branches(config).length) incomplete('判断分支');
      branches(config).forEach((branch) => {
        if (!branch.name.trim() || !branch.rules.length || branch.rules.some((rule) => !rule.field || !rule.operator || !rule.value.trim())) incomplete('分支名称和判断条件');
        branch.rules.forEach((rule) => checkReference(rule.field));
      });
    }
    if (kind === 'wait') {
      checkReference(config.source);
      if (config.timeout && (!Number.isFinite(Number(config.timeout)) || Number(config.timeout) <= 0)) incomplete('最长等待时间须大于 0');
    }
    for (const key of ['content', 'goal', 'prompt', 'instructions', 'question', 'expected', 'body', 'inputs', 'parameters', 'headers']) {
      for (const match of (config[key] ?? '').matchAll(/\{\{([^{}]+)\}\}/g)) checkReference(match[1]);
    }
    if (knowledgeIds && readList<string>(config.knowledgeIds).some((id) => !knowledgeIds.includes(id))) add('当前引用信息不存在', node.id);
    if (kind === 'api') {
      try { const url = new URL(config.url); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); } catch { add('请输入有效的 HTTP 或 HTTPS 地址', node.id); }
      for (const [key, legacy, title] of [['inputs', 'parameters', '入参'], ['outputs', 'result', '出参'], ['headers', '', '请求头']]) {
        const rows = mappings(config, key, legacy);
        if ((key !== 'headers' && !rows.length) || rows.some((row) => !row.name.trim() || !row.value.trim())) incomplete(title);
      }
      if (config.body?.trim()) { try { JSON.parse(config.body); } catch { incomplete('请求 Body 须为有效 JSON'); } }
    }
    const outgoing = draft.edges.filter((edge) => edge.source === node.id);
    if (nodePorts(node).some((port) => !(kind === 'wait' && port.id === 'timeout' && !config.timeout) && !outgoing.some((edge) => edge.sourceHandle === port.id))) add('存在未完成流程路径', node.id);
  }
  const ids = new Set(draft.nodes.map((node) => node.id));
  const outgoing = new Map(draft.nodes.map((node) => [node.id, draft.edges.filter((edge) => edge.source === node.id).map((edge) => edge.target)]));
  for (const edge of draft.edges) {
    const source = draft.nodes.find((node) => node.id === edge.source);
    const target = draft.nodes.find((node) => node.id === edge.target);
    if (!source || !target) { add('存在失效连线'); continue; }
    if (source.data.kind === 'end' || target.data.kind === 'start') add('开始或结束节点的连线方向不正确', source.id);
    const allowed = nodePorts(source).map((port) => port.id);
    if (!allowed.includes(edge.sourceHandle ?? '') || edge.targetHandle !== 'in') add('连线出口不正确', source.id);
    if (draft.edges.filter((item) => item.source === edge.source && item.sourceHandle === edge.sourceHandle).length > 1) add('同一个出口只能连接一个节点', source.id);
  }
  const visited = new Set<string>();
  const active = new Set<string>();
  const walk = (id: string) => {
    if (active.has(id)) { add('暂不支持循环连线', id); return; }
    if (visited.has(id) || !ids.has(id)) return;
    active.add(id); visited.add(id);
    outgoing.get(id)?.forEach(walk);
    active.delete(id);
  };
  starts.forEach((node) => walk(node.id));
  draft.nodes.filter((node) => !visited.has(node.id)).forEach((node) => add('存在未完成流程路径', node.id));
  return issues.filter((issue, index, all) => all.findIndex((item) => item.nodeId === issue.nodeId && item.message === issue.message) === index);
}

export function seedWorkflows(): Workflow[] {
  const rows = (values: Record<string, string>) => JSON.stringify(Object.entries(values).map(([name, value]) => ({ id: workflowId(), name, value })));
  const order = makeWorkflow('订单进度查询', '当用户询问订单状态、物流进度或预计送达时间时使用。');
  order.id = 'workflow-order-demo';
  const nodes = [
    makeNode('start', { x: 40, y: 240 }),
    makeNode('collect', { x: 300, y: 240 }, { question: '请提供您的订单号。', items: JSON.stringify([{ id: 'order', name: 'order_id', type: 'text', required: true }, { id: 'phone', name: 'phone', type: 'text', required: false }]) }),
    makeNode('api', { x: 600, y: 240 }, { url: 'https://example.com/orders', inputs: rows({ order_id: '{{order_id}}' }), outputs: rows({ status: '$.status', delivery: '$.delivery' }) }),
    makeNode('condition', { x: 900, y: 240 }, { branches: JSON.stringify([{ id: 'shipped', name: '已发货', combination: 'AND', rules: [{ field: 'status', operator: 'equals', value: 'shipped' }] }, { id: 'pending', name: '待发货', combination: 'AND', rules: [{ field: 'status', operator: 'equals', value: 'pending' }] }]) }),
    makeNode('reply', { x: 1200, y: 40 }, { content: '您的订单 {{order_id}} 已发货，预计 {{delivery}} 送达。' }),
    makeNode('wait', { x: 1200, y: 260 }, { source: 'status', expected: 'shipped', timeout: '30' }),
    makeNode('reply', { x: 1200, y: 560 }, { content: '暂未查询到发货信息，请核对订单号后再次查询。' }),
    makeNode('reply', { x: 1500, y: 160 }, { content: '已收到订单发货结果，请留意物流信息。' }),
    makeNode('reply', { x: 1500, y: 380 }, { content: '订单仍在处理中，请稍后再次查询。' }),
    makeNode('end', { x: 1820, y: 240 }),
  ];
  order.draft.nodes = nodes;
  order.draft.edges = [[0, 1, 'out'], [1, 2, 'out'], [2, 3, 'out'], [3, 4, 'shipped'], [3, 5, 'pending'], [3, 6, 'no'], [5, 7, 'result'], [5, 8, 'timeout'], [4, 9, 'out'], [6, 9, 'out'], [7, 9, 'out'], [8, 9, 'out']].map(([a, b, port]) => connectNodes(nodes[Number(a)], nodes[Number(b)], String(port)));
  order.published = snapshot(order.draft); order.publishedAt = order.updatedAt;
  const deposit = makeWorkflow('充值到账查询', '当用户反馈充值成功但余额未更新时使用。');
  deposit.id = 'workflow-deposit-demo';
  deposit.draft.nodes = [
    makeNode('start', { x: 40, y: 200 }),
    makeNode('collect', { x: 300, y: 200 }, { items: JSON.stringify([{ id: 'payment', name: 'payment_id', type: 'text', required: true }]), question: '请提供充值订单号。' }),
    makeNode('ai', { x: 600, y: 200 }, { goal: '核对用户提供的充值信息，整理查询所需资料。', instructions: '已经获取的信息无需重复询问。', completion: '确认充值订单号可供查询', outputs: rows({ verified: 'true' }) }),
    makeNode('api', { x: 900, y: 200 }, { method: 'POST', url: 'https://example.com/payments/status', inputs: rows({ payment_id: '{{payment_id}}' }), outputs: rows({ payment_status: '$.status' }) }),
    makeNode('wait', { x: 1200, y: 200 }, { source: 'payment_status', expected: 'credited', timeout: '5' }),
    makeNode('reply', { x: 1500, y: 60 }, { content: '充值已到账，请刷新余额。' }),
    makeNode('reply', { x: 1500, y: 340 }, { content: '暂未收到到账结果，请保留订单号稍后查询。' }),
    makeNode('end', { x: 1800, y: 200 }),
  ];
  const d = deposit.draft.nodes;
  deposit.draft.edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [5, 7], [6, 7]].map(([a, b]) => connectNodes(d[a], d[b], a === 4 ? b === 5 ? 'result' : 'timeout' : 'out'));
  deposit.published = snapshot(deposit.draft); deposit.publishedAt = deposit.updatedAt;
  const refund = makeWorkflow('售后问题处理', '当用户咨询退换货政策或售后处理方式时使用。');
  refund.id = 'workflow-refund-demo';
  refund.draft.nodes = [makeNode('start', { x: 40, y: 200 }), makeNode('ai', { x: 300, y: 200 }, { goal: '分析客户售后诉求，判断是否符合退换货政策。', outputs: rows({ eligible: 'true' }) }), makeNode('condition', { x: 600, y: 200 }, { field: 'eligible', operator: 'equals', value: 'true' }), makeNode('reply', { x: 900, y: 60 }, { mode: 'ai', content: '根据客户情况说明退换货申请步骤。' }), makeNode('reply', { x: 900, y: 340 }, { content: '请补充订单情况，以便进一步核实售后方案。' }), makeNode('end', { x: 1200, y: 200 })];
  const r = refund.draft.nodes;
  refund.draft.edges = [[0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5]].map(([a, b]) => connectNodes(r[a], r[b], a === 2 ? b === 3 ? 'yes' : 'no' : 'out'));
  return [order, deposit, refund];
}
