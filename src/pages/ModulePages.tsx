import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Button, Card, Checkbox, Dropdown, Empty, Form, Input, Menu, Modal, Select, Space, Switch, Table, Message, Upload } from '../components/ui';
import { IconCheck, IconDelete, IconDown, IconExclamationCircle, IconLoading, IconMore, IconPlus, IconRight, IconUpload } from '@arco-design/web-react/icon';
import { PageHeader } from '../components/PageHeader';
import { PdfDocumentIcon } from '../components/PdfDocumentIcon';
import { useAppStore } from '../store';
import { now } from '../mockData';
import type { Channel, KnowledgeDocument, Skill } from '../types';

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const formatDate = (value: string) => value.replace('T', ' ').slice(0, 16);
const formatDocumentName = (document: KnowledgeDocument) => document.name.toLowerCase().endsWith(`.${document.type.toLowerCase()}`) ? document.name : `${document.name}.${document.type.toLowerCase()}`;
export const KNOWLEDGE_DOCUMENT_MAX_SIZE = 50 * 1024 * 1024;
type KnowledgeUploadItem = { uid: string; originFile?: File };

export function KnowledgeFileModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (files: File[]) => void }) {
  const [fileList, setFileList] = useState<KnowledgeUploadItem[]>([]);
  const reset = () => setFileList([]);
  const close = () => { reset(); onClose(); };
  const validate = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { Message.error(`${file.name} 仅支持 PDF 文档`); return false; }
    if (file.size > KNOWLEDGE_DOCUMENT_MAX_SIZE) { Message.error(`${file.name} 超过 50 MB 限制`); return false; }
    return true;
  };
  const submit = () => {
    const files = fileList.flatMap((item) => item.originFile ? [item.originFile] : []);
    if (!files.length) { Message.warning('请选择要添加的文档'); return; }
    onAdd(files);
    close();
  };
  return <Modal open={open} title="添加文档" width={640} onCancel={close} onOk={submit} okText="添加文档" okButtonProps={{ disabled: !fileList.length }} destroyOnHidden><div className="knowledge-file-upload"><Upload drag multiple accept=".pdf,application/pdf" autoUpload={false} fileList={fileList} beforeUpload={validate} onChange={(nextList) => setFileList(nextList.filter((item) => item.originFile && validate(item.originFile)))} showUploadList={{ fileIcon: <PdfDocumentIcon />, startIcon: null }}><div className="knowledge-file-dropzone"><span className="knowledge-file-upload-icon"><IconUpload /></span><strong>点击或拖动文档上传</strong><span>支持的文件类型：PDF，最大文件大小：50 MB</span></div></Upload></div></Modal>;
}

export function KnowledgePageV2() {
  const { state, dispatch } = useAppStore();
  const [fileOpen, setFileOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDocument>();
  const [query, setQuery] = useState('');
  const docs = state.documents.filter((doc) => doc.type === 'PDF' && doc.name.toLowerCase().includes(query.toLowerCase()));
  const boundAgents = deleteTarget ? state.agents.filter((agent) => agent.draft.knowledgeIds.includes(deleteTarget.id) || agent.published?.knowledgeIds.includes(deleteTarget.id)) : [];
  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    let accepted = 0;
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      if (ext !== 'PDF') { Message.error(`${file.name} 仅支持 PDF 文档`); continue; }
      if (file.size > KNOWLEDGE_DOCUMENT_MAX_SIZE) { Message.error(`${file.name} 超过 50 MB 限制`); continue; }
      const createdAt = now();
      const document: KnowledgeDocument = { id: makeId('doc'), type: 'PDF', name: file.name, source: file.name, size: file.size, creator: 'Owen', status: 'adding', content: '正在上传文档……', createdAt, updatedAt: createdAt };
      dispatch({ type: 'document.add', document });
      accepted += 1;
      window.setTimeout(() => dispatch({ type: 'document.update', id: document.id, patch: { content: '正在切片处理……' } }), 450);
      window.setTimeout(() => dispatch({ type: 'document.update', id: document.id, patch: { content: '正在进行数据处理……' } }), 900);
      window.setTimeout(() => dispatch({ type: 'document.update', id: document.id, patch: { status: 'success', content: `文档「${file.name}」处理成功。` } }), 1400);
    }
    if (accepted) Message.success('文档已加入处理队列');
  };
  const retry = (doc: KnowledgeDocument) => {
    dispatch({ type: 'document.update', id: doc.id, patch: { status: 'adding', content: '正在重新上传文档……', updatedAt: now() } });
    window.setTimeout(() => dispatch({ type: 'document.update', id: doc.id, patch: { content: '正在切片处理……', updatedAt: now() } }), 450);
    window.setTimeout(() => dispatch({ type: 'document.update', id: doc.id, patch: { content: '正在进行数据处理……', updatedAt: now() } }), 900);
    window.setTimeout(() => dispatch({ type: 'document.update', id: doc.id, patch: { status: 'success', content: `文档「${doc.name}」处理成功。`, updatedAt: now() } }), 1400);
  };
  const confirmDelete = () => {
    if (!deleteTarget || boundAgents.length) { setDeleteTarget(undefined); return; }
    dispatch({ type: 'document.delete', id: deleteTarget.id });
    setDeleteTarget(undefined);
    Message.success('文档已删除');
  };
  const deleteDocument = (doc: KnowledgeDocument) => setDeleteTarget(doc);
  const more = (doc: KnowledgeDocument) => <Menu>{doc.status === 'failed' && <Menu.Item key="retry" onClick={() => retry(doc)}>重新处理</Menu.Item>}<Menu.Item key="delete" className="danger-menu-item" onClick={() => deleteDocument(doc)}>删除文档</Menu.Item></Menu>;
  return <div className="page-content module-page"><PageHeader title="知识库" actions={<Button type="primary" icon={<IconUpload />} onClick={() => setFileOpen(true)}>添加文档</Button>} /><div className="module-toolbar"><Input.Search value={query} onChange={setQuery} allowClear placeholder="搜索文档名称" /></div><Table rowKey="id" dataSource={docs} pagination={{ pageSize: 8 }} columns={[{ title: '名称', dataIndex: 'name', render: (value: string) => <div className="module-name-cell"><PdfDocumentIcon /><strong>{value}</strong></div> }, { title: '创建者', dataIndex: 'creator' }, { title: '创建时间', dataIndex: 'createdAt', render: (_: unknown, item: KnowledgeDocument) => formatDate(item.createdAt || item.updatedAt) }, { title: '状态', dataIndex: 'status', render: (value: KnowledgeDocument['status'], item: KnowledgeDocument) => value === 'success' ? <span className="knowledge-document-status success"><IconCheck />处理成功</span> : value === 'failed' ? <span className="knowledge-document-status failed"><IconExclamationCircle /><span>处理失败</span><small>{item.content}</small></span> : <span className="knowledge-document-status processing"><IconLoading />处理中</span> }, { title: '操作', width: 72, render: (_: unknown, item: KnowledgeDocument) => <Dropdown droplist={more(item)} trigger="click"><Button type="text" className="table-more-button" icon={<IconMore />} aria-label={`${item.name} 更多操作`} /></Dropdown> }]} /><KnowledgeFileModal open={fileOpen} onClose={() => setFileOpen(false)} onAdd={addFiles} /><Modal open={Boolean(deleteTarget)} title={boundAgents.length ? '暂时无法删除文档' : '删除文档？'} okText={boundAgents.length ? '我知道了' : '删除文档'} hideCancel={Boolean(boundAgents.length)} onCancel={() => setDeleteTarget(undefined)} onOk={confirmDelete} destroyOnHidden>{deleteTarget && (boundAgents.length ? <div className="knowledge-delete-blocked"><p>「{formatDocumentName(deleteTarget)}」已被以下 AI 客服绑定。请先在对应 AI 客服的「知识库」中解除绑定，再返回删除。</p><ul>{boundAgents.map((agent) => <li key={agent.id}>{agent.name || '未命名'}</li>)}</ul></div> : <>确认删除「{formatDocumentName(deleteTarget)}」？删除后无法恢复。</>)}</Modal></div>;
}

function SkillAvatar({ name }: { name: string }) { return <span className="skill-avatar">{name.slice(0, 1).toUpperCase()}</span>; }
const demoSkillDescriptions: Record<string, string> = {
  'skill-order': '查询订单状态、物流进度和预计送达时间，支持按订单号返回配送状态，并补充异常物流节点、退款进度和客户追问所需的处理建议。',
  'skill-ticket': '为客户创建售后工单并返回工单编号，支持记录问题和处理结果，同时补充问题分类、优先级、跟进节点和处理时限。',
  'skill-customer': '根据客户标识查询会员等级和服务记录，辅助判断客户服务权益，并结合历史咨询、订单状态和服务规则给出匹配结果。',
};

function SkillUploadModal({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: (file: File) => void }) {
  const [file, setFile] = useState<File>();
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const reset = () => { setFile(undefined); setError(''); setUploading(false); };
  const close = () => { reset(); onClose(); };
  const choose = (candidate?: File) => {
    if (!candidate) return;
    const ext = candidate.name.split('.').pop()?.toLowerCase() || '';
    if (!['zip', 'skill', 'md'].includes(ext)) { setFile(undefined); setError('仅支持 .zip、.skill、.md 格式的技能文件'); return; }
    setError(''); setFile(candidate);
  };
  const confirm = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'md') {
      const content = await file.text();
      if (!content.includes('name:') || !content.includes('description:')) { setError('SKILL.md 需要通过 YAML 定义技能名称与描述'); return; }
    }
    setUploading(true);
    window.setTimeout(() => { onUploaded(file); close(); }, 500);
  };
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); choose(event.dataTransfer.files?.[0]); };
  return <Modal open={open} title="上传技能" width={640} onCancel={close} footer={<Space><Button onClick={close}>取消</Button><Button type="primary" disabled={!file || Boolean(error) || uploading} loading={uploading} onClick={confirm}>确认</Button></Space>} destroyOnHidden>
    <input id="skill-upload-v2" type="file" hidden accept=".zip,.skill,.md" onChange={(event: ChangeEvent<HTMLInputElement>) => { choose(event.target.files?.[0]); event.currentTarget.value = ''; }} />
    <div className={`skill-upload-dropzone${file ? ' has-file' : ''}`} role="button" tabIndex={0} onClick={() => document.getElementById('skill-upload-v2')?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') document.getElementById('skill-upload-v2')?.click(); }} onDragOver={(event) => event.preventDefault()} onDrop={drop}>
      <IconUpload className="skill-upload-icon" />
      {file ? <><strong>{file.name}</strong><span>点击或拖拽更换文件</span></> : <><strong>点击或拖拽上传技能文件</strong><span>zip或.skill文件，根目录包含SKILL.md。SKILL.md通过YAML格式定义技能名称与描述。</span></>}
    </div>
    {error && <div className="skill-upload-error">{error}</div>}
  </Modal>;
}

export function SkillsPageV2() {
  const { state, dispatch } = useAppStore();
  const [query, setQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const skills = state.skills.filter((skill) => `${skill.name}${skill.description}`.toLowerCase().includes(query.toLowerCase()));
  const upload = (file: File) => {
    const skill: Skill = { id: makeId('skill'), name: file.name.replace(/\.(zip|skill|md)$/i, ''), description: `从 ${file.name} 导入的技能能力包`, enabled: true, updatedAt: now() };
    dispatch({ type: 'skill.add', skill }); Message.success('技能上传成功');
  };
  return <div className="page-content module-page module-page-list"><PageHeader title="技能" actions={<Button type="primary" icon={<IconUpload />} onClick={() => setUploadOpen(true)}>上传技能</Button>} /><div className="module-toolbar"><Input.Search value={query} onChange={setQuery} allowClear placeholder="搜索技能" /></div>{skills.length ? <div className="resource-grid skill-resource-grid">{skills.map((skill) => <Card key={skill.id} className="resource-card skill-card"><div className="skill-card-head"><div className="module-name-cell"><SkillAvatar name={skill.name} /><div><strong>{skill.name}</strong></div></div><Switch checked={skill.enabled} onChange={(checked) => { if (!checked) Modal.confirm({ title: '关闭技能？', content: '关闭后将解除已绑定关系。', onOk: () => { dispatch({ type: 'skill.toggle', id: skill.id, enabled: false }); Message.success('技能已关闭'); } }); else { dispatch({ type: 'skill.toggle', id: skill.id, enabled: true }); Message.success('技能已启用'); } }} /></div><p className="agent-description skill-description">{demoSkillDescriptions[skill.id] || skill.description}</p><div className="skill-card-footer"><Dropdown droplist={<Menu><Menu.Item key="delete" className="danger-menu-item" onClick={() => Modal.confirm({ title: '删除技能？', content: '删除后将解除相关绑定关系。', onOk: () => { dispatch({ type: 'skill.delete', id: skill.id }); Message.success('技能已删除'); } })}><IconDelete /> 删除技能</Menu.Item></Menu>} trigger="click"><Button type="text" className="skill-more-button" icon={<IconMore />} aria-label="更多操作" /></Dropdown></div></Card>)}</div> : <Empty description="暂无技能" />}<SkillUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={upload} /></div>;
}

const liveChatGroups = ['TC General', 'TestTG', 'NOW32', 'General', 'OMG67'];

function GroupMultiSelect({ value = [], onChange, placeholder }: { value?: string[]; onChange?: (value: string[]) => void; placeholder: string }) {
  const [query, setQuery] = useState('');
  const visibleGroups = liveChatGroups.filter((group) => group.toLowerCase().includes(query.toLowerCase()));
  const toggle = (group: string, checked: boolean) => onChange?.(checked ? [...value, group] : value.filter((item) => item !== group));
  const selectedLabel = value.length ? <div className="group-select-values">{value.slice(0, 2).map((group) => <span className="group-select-value" key={group}><i>{group.charAt(0).toUpperCase()}</i>{group}</span>)}{value.length > 2 && <span className="group-select-more">+{value.length - 2}</span>}</div> : <span className="group-select-placeholder">{placeholder}</span>;
  const panel = <div className="group-picker-panel" onClick={(event) => event.stopPropagation()}><div className="group-picker-header"><strong>Group（{liveChatGroups.length}）</strong><Input.Search value={query} onChange={setQuery} allowClear placeholder="搜索 Group" /></div><div className="group-picker-list">{visibleGroups.map((group, index) => <label className="group-picker-option" key={group}><Checkbox checked={value.includes(group)} onChange={(checked) => toggle(group, checked)} /><span className={`group-letter group-letter-${index % 5}`}>{group.charAt(0).toUpperCase()}</span><span>{group}</span></label>)}</div></div>;
  return <Dropdown trigger="click" position="bl" droplist={panel}><button className="group-select-trigger" type="button"><span>{selectedLabel}</span><IconDown /></button></Dropdown>;
}

function HotQuestionsEditor({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => { const question = draft.trim(); if (!question) return; onChange([...value, question]); setDraft(''); };
  return <div className="hot-question-list">{value.map((question, index) => <div className="hot-question-row" key={`${question}-${index}`}><Input value={question} onChange={(next) => onChange(value.map((item, itemIndex) => itemIndex === index ? next : item))} /><Button type="text" icon={<IconDelete />} aria-label={`删除热门问题：${question}`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} /></div>)}<Input value={draft} onChange={setDraft} onPressEnter={add} placeholder="输入热门问题，按 Enter 添加" /></div>;
}

function ChannelWizard({ open, onClose, channel }: { open: boolean; onClose: () => void; channel?: Channel }) {
  const { state, dispatch } = useAppStore();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(false);
  const [hotQuestions, setHotQuestions] = useState<string[]>([]);
  const [humanEnabled, setHumanEnabled] = useState(true);
  const [expanded, setExpanded] = useState({ groups: false, reception: false, human: false });
  const agents = state.agents.filter((agent) => agent.status === 'published');
  const steps = ['基础信息', '访问凭证', '服务配置'];
  const initialValues = channel || { enabled: true, humanEnabled: true, receiveGroups: [], humanGroups: [], opening: '你好，我是灵犀智能体，很高兴为你提供帮助。', ending: '如果问题已经解决，可以结束本次会话。', humanFallback: '当前人工服务繁忙，请稍后再试。' };
  const close = () => { setStep(0); setChecking(false); onClose(); };
  const next = async () => {
    if (step === 0) { await form.validateFields(); setStep(1); return; }
    if (step === 1) {
      await form.validateFields(); setChecking(true);
      window.setTimeout(() => { setChecking(false); setStep(2); }, 500);
    }
  };
  const save = async () => {
    try {
      const values = await form.validateFields();
      if (!values.receiveGroups?.length) { setExpanded((value) => ({ ...value, groups: true })); Message.error('请选择接待 Group'); return; }
      const item: Channel = { id: channel?.id || makeId('channel'), name: values.name, agentId: values.agentId, enabled: values.enabled ?? true, accountId: values.accountId, accessToken: values.accessToken, receiveGroups: values.receiveGroups || [], humanGroups: humanEnabled ? values.humanGroups || [] : [], opening: values.opening || '', hotQuestions, ending: values.ending || '', humanEnabled, humanFallback: humanEnabled ? values.humanFallback || '' : '', updatedAt: now() };
      dispatch({ type: 'channel.save', channel: item }); Message.success(channel ? '渠道配置已保存' : '渠道已创建'); close();
    } catch {
      setExpanded({ groups: true, reception: true, human: true });
    }
  };
  const section = (key: keyof typeof expanded, title: string, content: React.ReactNode) => <section className={`channel-config-section${expanded[key] ? ' is-open' : ''}`}><button className="channel-config-trigger" type="button" onClick={() => setExpanded((value) => ({ ...value, [key]: !value[key] }))}><strong>{title}</strong>{expanded[key] ? <IconDown /> : <IconRight />}</button><div className="channel-config-content" hidden={!expanded[key]}>{content}</div></section>;
  return <Modal open={open} title={channel ? '配置 LiveChat 渠道' : '新建 LiveChat 渠道'} width={760} onCancel={close} footer={null} afterOpenChange={(visible) => { if (visible) { setStep(0); setChecking(false); setExpanded({ groups: false, reception: false, human: false }); setHumanEnabled(channel?.humanEnabled ?? true); setHotQuestions(channel?.hotQuestions || []); form.setFieldsValue(initialValues); } }}><div className="channel-steps">{steps.map((label, index) => <div className={`${index === step ? 'active' : ''}${index < step ? ' complete' : ''}`} key={label}><span>{index < step ? '✓' : index + 1}</span>{label}</div>)}</div><Form form={form} layout="vertical" initialValues={initialValues}><div className="channel-step-content">{step === 0 && <><Form.Item name="name" label="渠道名称" rules={[{ required: true, message: '请输入渠道名称' }]}><Input /></Form.Item><Form.Item name="agentId" label="接待智能体" rules={[{ required: true, message: '请选择接待智能体' }]}><Select options={agents.map((agent) => ({ label: agent.name, value: agent.id }))} /></Form.Item></>}{step === 1 && <><Form.Item name="accountId" label="Account ID" rules={[{ required: true, message: '请输入 Account ID' }]}><Input /></Form.Item><Form.Item name="accessToken" label="Access Token" rules={[{ required: true, message: '请输入 Access Token' }]}><Input.Password /></Form.Item></>}{step === 2 && <div className="channel-service-config">{section('groups', 'Group 配置', <><Form.Item name="receiveGroups" label="接待 Group" rules={[{ required: true, message: '请选择接待 Group' }]}><GroupMultiSelect placeholder="请选择接待 Group" /></Form.Item>{humanEnabled && <Form.Item name="humanGroups" label="转人工 Group"><GroupMultiSelect placeholder="请选择转人工 Group" /></Form.Item>}</>)}{section('reception', '接待配置', <><Form.Item name="opening" label="开场白"><Input.TextArea rows={3} /></Form.Item><Form.Item label="热门问题"><HotQuestionsEditor value={hotQuestions} onChange={setHotQuestions} /></Form.Item><Form.Item name="ending" label="结束语"><Input.TextArea rows={3} /></Form.Item></>)}{section('human', '转人工', <><div className="channel-inline-switch"><span>转人工开关</span><Switch checked={humanEnabled} onChange={setHumanEnabled} /></div>{humanEnabled && <Form.Item name="humanFallback" label="转人工失败话术"><Input.TextArea rows={3} /></Form.Item>}</>)}<div className="channel-inline-switch channel-status-switch"><span>渠道状态</span><Form.Item name="enabled" valuePropName="checked" noStyle><Switch /></Form.Item></div></div>}</div></Form><div className="channel-step-actions"><Button disabled={step === 0 || checking} onClick={() => setStep((value) => value - 1)}>上一步</Button>{step < 2 ? <Button type="primary" loading={checking} onClick={next}>下一步</Button> : <Button type="primary" onClick={save}>保存</Button>}</div></Modal>;
}

export function ChannelsPageV2() {
  const { state, dispatch } = useAppStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Channel>();
  const [query, setQuery] = useState('');
  const agents = new Map(state.agents.map((agent) => [agent.id, agent.name]));
  const channels = state.channels.filter((channel) => channel.name.toLowerCase().includes(query.toLowerCase()));
  const more = (channel: Channel) => <Menu><Menu.Item key="configure" onClick={() => { setEditing(channel); setOpen(true); }}>配置</Menu.Item><Menu.Item key="delete" className="danger-menu-item" onClick={() => Modal.confirm({ title: '删除渠道？', content: '删除后，该渠道将停止接收消息。', onOk: () => { dispatch({ type: 'channel.delete', id: channel.id }); Message.success('渠道已删除'); } })}>删除渠道</Menu.Item></Menu>;
  return <div className="page-content module-page module-page-list"><PageHeader title="渠道" actions={<Button type="primary" icon={<IconPlus />} onClick={() => { setEditing(undefined); setOpen(true); }}>新建渠道</Button>} /><div className="channel-type-row"><button className="active" type="button" aria-label="LiveChat 渠道类型"><span className="channel-type-icon"><img src="/assets/livechat-logo-mark.png" alt="" /></span>LiveChat</button></div><div className="module-toolbar"><Input.Search value={query} onChange={setQuery} allowClear placeholder="搜索渠道" /></div><Table rowKey="id" dataSource={channels} pagination={false} columns={[{ title: '渠道名称', dataIndex: 'name' }, { title: '接待智能体', dataIndex: 'agentId', render: (value: string) => agents.get(value) || '未绑定' }, { title: '启用状态', dataIndex: 'enabled', render: (value: boolean, item: Channel) => <Switch checked={value} onChange={(enabled) => { dispatch({ type: 'channel.toggle', id: item.id, enabled }); Message.success(enabled ? '渠道已启用' : '渠道已关闭'); }} aria-label={`${item.name}${value ? '已启用' : '已关闭'}`} /> }, { title: '最近更新', dataIndex: 'updatedAt', render: formatDate }, { title: '操作', width: 72, render: (_: unknown, item: Channel) => <Dropdown droplist={more(item)} trigger="click"><Button type="text" className="table-more-button" icon={<IconMore />} aria-label={`${item.name} 更多操作`} /></Dropdown> }]} /><ChannelWizard open={open} onClose={() => setOpen(false)} channel={editing} /></div>;
}
