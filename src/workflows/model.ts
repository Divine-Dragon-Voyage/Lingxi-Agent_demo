import type { Edge, Node } from '@xyflow/react';

export type NodeKind = 'start' | 'end' | 'ai' | 'collect' | 'api' | 'condition' | 'reply' | 'handoff';
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
export const nodeLabels: Record<NodeKind, string> = { start: '开始', end: '结束', ai: 'AI 任务', collect: '信息收集', api: '接口调用', condition: '条件分支', reply: '发送回复', handoff: '转人工' };
export const workflowId = () => crypto.randomUUID?.() ?? `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
export const snapshot = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export const hasChanges = (flow: Workflow) => !flow.published || JSON.stringify(flow.draft) !== JSON.stringify(flow.published);
export const workflowStatus = (flow: Workflow) => !flow.published ? '草稿' : hasChanges(flow) ? '已发布有修改' : '已发布';
export function makeNode(kind: NodeKind, position: { x: number; y: number }, config: Record<string, string> = {}): WorkflowNode {
  const defaults: Partial<Record<NodeKind, Record<string, string>>> = {
    collect: { required: 'true' }, api: { method: 'GET', parameters: '{}', result: '{}' }, condition: { operator: 'equals' },
  };
  return { id: workflowId(), type: 'workflow', position, data: { kind, label: nodeLabels[kind], config: { ...defaults[kind], ...config } } };
}
export function makeWorkflow(name: string, trigger: string): Workflow {
  const timestamp = new Date().toISOString();
  return { id: workflowId(), creator: 'Owen', createdAt: timestamp, updatedAt: timestamp, published: null,
    draft: { name, trigger, nodes: [makeNode('start', { x: 100, y: 200 }), makeNode('end', { x: 480, y: 200 })], edges: [] } };
}
export function connectNodes(source: WorkflowNode, target: WorkflowNode, sourceHandle = 'out'): Edge {
  return { id: workflowId(), source: source.id, target: target.id, sourceHandle, targetHandle: 'in', type: 'smoothstep', label: sourceHandle === 'yes' ? '满足' : sourceHandle === 'no' ? '不满足' : undefined };
}
export function validateWorkflow(draft: WorkflowDraft, teamIds?: string[]): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  const add = (message: string, nodeId?: string) => issues.push({ message, nodeId });
  if (!draft.name.trim() || draft.name.length > 50) add('流程名称必填，最多 50 字');
  if (!draft.trigger.trim() || draft.trigger.length > 500) add('触发器必填，最多 500 字');
  const starts = draft.nodes.filter((node) => node.data.kind === 'start');
  const ends = draft.nodes.filter((node) => node.data.kind === 'end');
  if (starts.length !== 1) add('流程必须包含一个开始节点');
  if (!ends.length) add('请添加结束节点');
  const fields = new Set<string>();
  const required: Partial<Record<NodeKind, [string, string][]>> = {
    ai: [['prompt', '任务提示词']], collect: [['question', '提问内容'], ['field', '收集字段']],
    api: [['url', '接口地址'], ['parameters', '请求参数'], ['result', '模拟返回结果']],
    condition: [['field', '判断字段'], ['value', '比较值']], reply: [['content', '回复内容']], handoff: [['teamId', '目标团队'], ['message', '转接话术']],
  };
  for (const node of draft.nodes) {
    const { kind, config, label } = node.data;
    if (!label.trim()) add('请填写节点名称', node.id);
    for (const [key, title] of required[kind] ?? []) if (!config[key]?.trim()) add(`请填写${title}`, node.id);
    if (kind === 'collect' && config.field) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.field)) add('收集字段须为英文字母、数字或下划线，且不能以数字开头', node.id);
      if (fields.has(config.field)) add('收集字段不能重复', node.id);
      fields.add(config.field);
    }
    if (kind === 'api') {
      try { const url = new URL(config.url); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); } catch { add('请输入有效的 HTTP 或 HTTPS 地址', node.id); }
      for (const key of ['parameters', 'result']) {
        try { JSON.parse(config[key]); } catch { add(`${key === 'parameters' ? '请求参数' : '模拟返回结果'}须为有效 JSON`, node.id); }
      }
    }
    if (kind === 'handoff' && teamIds && !teamIds.includes(config.teamId)) add('请选择有效的目标团队', node.id);
    const outgoing = draft.edges.filter((edge) => edge.source === node.id);
    if (kind !== 'end' && !outgoing.length) add('请连接后续节点', node.id);
    if (kind === 'condition' && !['yes', 'no'].every((handle) => outgoing.some((edge) => edge.sourceHandle === handle))) add('请连接满足与不满足两个出口', node.id);
  }
  const ids = new Set(draft.nodes.map((node) => node.id));
  const outgoing = new Map(draft.nodes.map((node) => [node.id, draft.edges.filter((edge) => edge.source === node.id).map((edge) => edge.target)]));
  for (const edge of draft.edges) {
    const source = draft.nodes.find((node) => node.id === edge.source);
    const target = draft.nodes.find((node) => node.id === edge.target);
    if (!source || !target) { add('存在失效连线'); continue; }
    if (source.data.kind === 'end' || target.data.kind === 'start') add('开始或结束节点的连线方向不正确', source.id);
    const allowed = source.data.kind === 'condition' ? ['yes', 'no'] : ['out'];
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
  draft.nodes.filter((node) => !visited.has(node.id)).forEach((node) => add('该节点未连接到开始节点', node.id));
  return issues.filter((issue, index, all) => all.findIndex((item) => item.nodeId === issue.nodeId && item.message === issue.message) === index);
}

export function seedWorkflows(): Workflow[] {
  const order = makeWorkflow('订单进度查询', '当用户询问订单状态、物流进度或预计送达时间时使用。');
  order.id = 'workflow-order-demo';
  const nodes = [
    makeNode('start', { x: 40, y: 240 }),
    makeNode('collect', { x: 340, y: 240 }, { question: '请提供您的订单号。', field: 'order_id' }),
    makeNode('api', { x: 640, y: 240 }, { url: 'https://example.com/orders', parameters: '{"order_id":"{{order_id}}"}', result: '{"status":"shipped","delivery":"明天下午"}' }),
    makeNode('condition', { x: 940, y: 240 }, { field: 'status', operator: 'equals', value: 'shipped' }),
    makeNode('reply', { x: 1240, y: 100 }, { content: '您的订单 {{order_id}} 已发货，预计明天下午送达。' }),
    makeNode('handoff', { x: 1240, y: 380 }, { teamId: '100001', message: '正在为您转接订单服务专员。' }),
    makeNode('end', { x: 1540, y: 240 }),
  ];
  order.draft.nodes = nodes;
  order.draft.edges = [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]].map(([a, b]) => connectNodes(nodes[a], nodes[b], a === 3 ? (b === 4 ? 'yes' : 'no') : 'out'));
  order.published = snapshot(order.draft); order.publishedAt = order.updatedAt;
  const refund = makeWorkflow('售后转人工', '当用户申请退换货，或售后问题需要人工核实时使用。');
  refund.id = 'workflow-refund-demo';
  refund.draft.nodes = [makeNode('start', { x: 80, y: 220 }), makeNode('handoff', { x: 380, y: 220 }, { teamId: '100001', message: '您的售后需求已记录，正在为您转接人工客服。' }), makeNode('end', { x: 680, y: 220 })];
  refund.draft.edges = [connectNodes(refund.draft.nodes[0], refund.draft.nodes[1]), connectNodes(refund.draft.nodes[1], refund.draft.nodes[2])];
  return [order, refund];
}
