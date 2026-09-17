import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBranch, IconCopy, IconDelete, IconEdit, IconEye, IconMore, IconPlus, IconRefresh, IconCheck, IconLoading } from '@arco-design/web-react/icon';
import { Button, Checkbox, Dropdown, Empty, Form, Input, Menu, Message, Modal, Table, Tag, Tooltip } from '../components/ui';
import { PageHeader } from '../components/PageHeader';
import { useAppStore } from '../store';
import type { Agent } from '../types';
import { makeWorkflow, snapshot, workflowStatus } from './model';
import type { Workflow } from './model';
import './workflow.css';

export function WorkflowStatus({ flow }: { flow: Workflow }) {
  return <Tag color={!flow.published ? 'gray' : workflowStatus(flow) === '已发布' ? 'success' : 'warning'}>{workflowStatus(flow)}</Tag>;
}

export function SaveIndicator() {
  const { saveStatus, retrySave } = useAppStore();
  return <span className={`wf-save wf-save-${saveStatus}`} role="status">{saveStatus === 'error' ? <><span>保存失败</span><Tooltip title="重试保存"><Button type="text" icon={<IconRefresh />} aria-label="重试保存" onClick={retrySave} /></Tooltip></> : <>{saveStatus === 'saving' ? <IconLoading /> : <IconCheck />}{saveStatus === 'saving' ? '保存中' : '已保存'}</>}</span>;
}

export function WorkflowBasicsModal({ initial, onClose, onSubmit }: { initial?: { name: string; trigger: string }; onClose: () => void; onSubmit: (name: string, trigger: string) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [trigger, setTrigger] = useState(initial?.trigger ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setSubmitted(true);
    if (!name.trim() || !trigger.trim()) return;
    setBusy(true);
    try { onSubmit(name.trim(), trigger.trim()); } catch { Message.error('操作失败，请重试'); } finally { setBusy(false); }
  };
  return <Modal open title={initial ? '编辑基础信息' : '新建流程'} onCancel={onClose} onOk={submit} confirmLoading={busy} okText={initial ? '保存' : '创建并配置'} style={{ maxWidth: 'calc(100vw - 32px)' }} width={560}>
    <Form layout="vertical">
      <Form.Item label={<label htmlFor="wf-name">流程名称</label>} required validateStatus={submitted && !name.trim() ? 'error' : undefined} help={submitted && !name.trim() ? '请输入流程名称' : undefined}>
        <Input id="wf-name" autoFocus maxLength={50} value={name} onChange={setName} placeholder="例如：订单进度查询" />
      </Form.Item>
      <Form.Item label={<label htmlFor="wf-trigger">触发器</label>} required validateStatus={submitted && !trigger.trim() ? 'error' : undefined} help={submitted && !trigger.trim() ? '请描述 AI Agent 应何时使用此流程' : undefined}>
        <Input.TextArea id="wf-trigger" maxLength={500} showCount rows={5} value={trigger} onChange={setTrigger} placeholder="描述 AI Agent 应何时使用此流程，例如：用户询问订单状态或物流进度时。" />
      </Form.Item>
    </Form>
  </Modal>;
}

export function WorkflowsPage() {
  const { state, dispatch, saveStatus } = useAppStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Workflow>();
  const flows = state.workflows.filter((flow) => `${flow.draft.name} ${flow.draft.trigger}`.toLowerCase().includes(query.trim().toLowerCase()));
  const bindings = removing ? state.agents.filter((agent) => agent.draft.workflowIds?.includes(removing.id) || agent.published?.workflowIds?.includes(removing.id)) : [];
  const copy = (flow: Workflow) => {
    const copied = makeWorkflow(`${flow.draft.name.slice(0, 47)} 副本`, flow.draft.trigger);
    copied.draft.nodes = snapshot(flow.draft.nodes); copied.draft.edges = snapshot(flow.draft.edges);
    dispatch({ type: 'workflow.add', workflow: copied }); setPage(1); Message.success('已复制为草稿');
  };
  return <div className="page-content module-page wf-list-page">
    <PageHeader title="工作流" actions={<Button type="primary" icon={<IconPlus />} onClick={() => setCreating(true)}>新建流程</Button>} />
    <div className="wf-list-toolbar"><Input.Search value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="搜索流程名称或触发器" allowClear />{saveStatus === 'error' && <SaveIndicator />}</div>
    <Table rowKey="id" dataSource={flows} scroll={{ x: 720 }} pagination={{ current: Math.min(page, Math.max(1, Math.ceil(flows.length / 10))), pageSize: 10, total: flows.length, showTotal: true, onChange: setPage }} noDataElement={<Empty icon={<IconBranch />} description={query ? '未找到匹配的工作流' : '暂无工作流'}>{!query && <Button type="primary" onClick={() => setCreating(true)}>新建流程</Button>}</Empty>} columns={[
      { title: '名称', dataIndex: 'name', width: 300, render: (_: unknown, flow: Workflow) => <div className="wf-name-cell"><span className="wf-resource-icon"><IconBranch /></span><Tooltip title={flow.draft.name}><button className="wf-name-link" onClick={() => navigate(`/workflows/${flow.id}`)}>{flow.draft.name}</button></Tooltip><WorkflowStatus flow={flow} /></div> },
      { title: '触发器', render: (_: unknown, flow: Workflow) => <Tooltip title={flow.draft.trigger}><span className="wf-trigger-text">{flow.draft.trigger}</span></Tooltip> },
      { title: '创建者', dataIndex: 'creator', width: 100 },
      { title: '操作', width: 100, fixed: 'right', render: (_: unknown, flow: Workflow) => <div className="wf-row-actions"><Tooltip title="编辑流程"><Button type="text" icon={<IconEdit />} aria-label={`编辑流程：${flow.draft.name}`} onClick={() => navigate(`/workflows/${flow.id}`)} /></Tooltip><Dropdown trigger="click" droplist={<Menu><Menu.Item key="copy" onClick={() => copy(flow)}><IconCopy /> 复制</Menu.Item><Menu.Item key="delete" className="danger-menu-item" onClick={() => setRemoving(flow)}><IconDelete /> 删除</Menu.Item></Menu>}><Button type="text" icon={<IconMore />} aria-label={`${flow.draft.name} 更多操作`} /></Dropdown></div> },
    ]} />
    {creating && <WorkflowBasicsModal onClose={() => setCreating(false)} onSubmit={(name, trigger) => { const flow = makeWorkflow(name, trigger); dispatch({ type: 'workflow.add', workflow: flow }); setCreating(false); navigate(`/workflows/${flow.id}`); }} />}
    <Modal open={Boolean(removing)} title={bindings.length ? '工作流正在被使用' : '删除工作流？'} onCancel={() => setRemoving(undefined)} okText={bindings.length ? '知道了' : '删除'} okButtonProps={{ status: bindings.length ? undefined : 'danger' }} onOk={() => { if (removing && !bindings.length) { dispatch({ type: 'workflow.delete', id: removing.id }); Message.success('工作流已删除'); } setRemoving(undefined); }}>
      {bindings.length ? <><p>请先解绑并发布以下 AI Agent 的配置，再删除「{removing?.draft.name}」。</p><div className="wf-bound-agents">{bindings.map((agent) => <Button type="text" key={agent.id} onClick={() => navigate(`/agents/${agent.id}/workflow`)}>{agent.name}</Button>)}</div></> : <p>确认删除「{removing?.draft.name}」？删除后无法恢复。</p>}
    </Modal>
  </div>;
}

export function AgentWorkflowSection({ agent }: { agent: Agent }) {
  const { state, dispatch, saveStatus } = useAppStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pickerQuery, setPickerQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [removing, setRemoving] = useState<Workflow>();
  const attachedIds = agent.draft.workflowIds ?? [];
  const matches = (flow: Workflow, value: string) => `${flow.published?.name} ${flow.published?.trigger}`.toLowerCase().includes(value.trim().toLowerCase());
  const attached = state.workflows.filter((flow) => attachedIds.includes(flow.id));
  const available = state.workflows.filter((flow) => flow.published && !attachedIds.includes(flow.id));
  const visibleAvailable = available.filter((flow) => matches(flow, pickerQuery));
  const close = () => { setOpen(false); setSelected([]); setPickerQuery(''); };
  const view = (flow: Workflow) => navigate(`/workflows/${flow.id}?version=published&agent=${encodeURIComponent(agent.id)}`);
  return <div className="detail-resource-page wf-binding-page">
    <div className="detail-toolbar"><h1 className="resource-page-title">工作流</h1><Button type="primary" icon={<IconPlus />} onClick={() => setOpen(true)}>绑定工作流</Button></div>
    <Input.Search className="resource-page-search" value={query} onChange={setQuery} placeholder="搜索流程名称或触发器" allowClear />
    {saveStatus === 'error' && <SaveIndicator />}
    <Table rowKey="id" dataSource={attached.filter((flow) => matches(flow, query))} pagination={false} scroll={{ x: 540 }} noDataElement={<Empty icon={<IconBranch />} description={attached.length ? '未找到匹配的工作流' : '当前 AI Agent 尚未绑定工作流'} />} columns={[
      { title: '名称', width: 180, render: (_: unknown, flow: Workflow) => <div className="wf-name-cell"><span className="wf-resource-icon"><IconBranch /></span><Tooltip title={flow.published?.name}><button className="wf-name-link" onClick={() => view(flow)}>{flow.published?.name}</button></Tooltip></div> },
      { title: '触发器', render: (_: unknown, flow: Workflow) => <Tooltip title={flow.published?.trigger}><span className="wf-trigger-text">{flow.published?.trigger}</span></Tooltip> },
      { title: '创建者', dataIndex: 'creator', width: 90 },
      { title: '操作', width: 88, render: (_: unknown, flow: Workflow) => <div className="wf-row-actions"><Tooltip title="查看已发布流程"><Button type="text" icon={<IconEye />} aria-label={`查看流程：${flow.published?.name}`} onClick={() => view(flow)} /></Tooltip><Tooltip title="解绑工作流"><Button type="text" danger icon={<IconDelete />} aria-label={`解绑工作流：${flow.published?.name}`} onClick={() => setRemoving(flow)} /></Tooltip></div> },
    ]} />
    <Modal open={open} title="绑定工作流" className="resource-picker-modal" style={{ maxWidth: 'calc(100vw - 32px)' }} width={600} onCancel={close} okText={selected.length ? `绑定所选工作流（${selected.length}）` : '绑定所选工作流'} okButtonProps={{ disabled: !selected.length }} onOk={() => { dispatch({ type: 'agent.workflows', id: agent.id, workflowIds: [...attachedIds, ...selected] }); close(); Message.success('工作流已绑定'); }}>
      <Input.Search value={pickerQuery} onChange={setPickerQuery} placeholder="搜索已发布工作流" allowClear />
      <div className="resource-picker-list wf-picker-list">{visibleAvailable.map((flow) => <Checkbox key={flow.id} checked={selected.includes(flow.id)} onChange={(checked) => setSelected((prev) => checked ? [...prev, flow.id] : prev.filter((id) => id !== flow.id))}><span className="wf-picker-content"><span className="wf-picker-title"><IconBranch /><strong>{flow.published!.name}</strong><Tag color="success">已发布</Tag></span><span className="wf-picker-trigger">{flow.published!.trigger}</span></span></Checkbox>)}</div>
      {!visibleAvailable.length && <Empty description={pickerQuery ? '未找到匹配的已发布工作流' : '暂无可绑定的已发布工作流'} />}
    </Modal>
    <Modal open={Boolean(removing)} title="解绑工作流？" onCancel={() => setRemoving(undefined)} okText="解绑" okButtonProps={{ status: 'danger' }} onOk={() => { if (removing) dispatch({ type: 'agent.workflows', id: agent.id, workflowIds: attachedIds.filter((id) => id !== removing.id) }); setRemoving(undefined); Message.success('工作流已解绑'); }}>
      <p>确认解绑「{removing?.published?.name}」？发布 AI Agent 后生效，源工作流不会被删除。</p>
    </Modal>
  </div>;
}
