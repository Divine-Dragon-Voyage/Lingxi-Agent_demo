import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Dropdown, Empty, Input, Menu, Message, Modal, Switch, Table } from '../components/ui';
import { IconCopy, IconExclamationCircle, IconMore, IconPlus, IconRobot, IconSearch } from '@arco-design/web-react/icon';
import { now } from '../mockData';
import { useAppStore } from '../store';
import type { Agent, Channel, ChannelType } from '../types';
import liveChatLogo from '../assets/livechat-logo.png';
import channelEmptyState from '../assets/channel-empty-state.png';

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const formatDate = (value?: string) => (value || '').replace('T', ' ').slice(0, 16);
const channelTypes: ChannelType[] = ['livechat', 'telegram'];

type RouteMode = 'all' | 'list' | 'create' | 'edit';

const channelMeta: Record<ChannelType, { name: string; title: string; description: string; tokenLabel: string; tokenField: 'accessToken' | 'botToken' }> = {
  livechat: {
    name: 'Livechat',
    title: 'Livechat',
    description: 'Livechat 消息会以会话形式进入你的收件箱。',
    tokenLabel: 'Access Token',
    tokenField: 'accessToken',
  },
  telegram: {
    name: 'Telegram',
    title: 'Telegram',
    description: 'Telegram 消息会以会话形式进入你的收件箱。',
    tokenLabel: 'Bot Token',
    tokenField: 'botToken',
  },
};

type Draft = {
  name: string;
  agentId?: string;
  accessToken: string;
  botToken: string;
  webhookUrl: string;
};

type ConfigModalState = {
  mode: 'create' | 'edit';
  channel?: Channel;
};

type ChannelFeedback = {
  id: number;
  type: 'success' | 'warning';
  text: string;
};

function TelegramLogo() {
  return <span className="channel-logo-icon channel-logo-telegram" aria-label="Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.8 4.1 18.5 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1L18 6.5c.4-.4-.1-.6-.6-.2L6 13.4l-4.9-1.5c-1.1-.3-1.1-1.1.2-1.6L20.5 3c.9-.3 1.6.2 1.3 1.1Z" /></svg></span>;
}

function ChannelLogo({ type }: { type: ChannelType }) {
  if (type === 'telegram') return <TelegramLogo />;
  return <span className="channel-logo-icon channel-logo-livechat" aria-label="Livechat"><img src={liveChatLogo} alt="" /></span>;
}

function normalizeChannel(channel: Channel): Channel {
  const type = channel.type ?? 'livechat';
  return {
    ...channel,
    type,
    createdAt: channel.createdAt ?? channel.updatedAt,
    webhookUrl: channel.webhookUrl ?? (type === 'livechat' ? `https://im-support.example.com/webhooks/livechat/${channel.id}` : undefined),
  };
}

function pathFor(type?: ChannelType, suffix = '') {
  return type ? `/channels/${type}${suffix}` : '/channels';
}

function useChannelRoute() {
  const location = useLocation();
  const [, section, rawType, rawAction] = location.pathname.split('/');
  if (section !== 'channels') return { type: undefined, mode: 'all' as RouteMode, channelId: undefined };
  const type = channelTypes.includes(rawType as ChannelType) ? rawType as ChannelType : undefined;
  const mode: RouteMode = rawAction === 'new' ? 'create' : rawAction ? 'edit' : type ? 'list' : 'all';
  return { type, mode, channelId: mode === 'edit' ? rawAction : undefined };
}

function ChannelSideNav({ activeType, mode }: { activeType?: ChannelType; mode: RouteMode }) {
  const navigate = useNavigate();
  const activeKey = mode === 'all' ? 'all' : activeType;
  return <aside className="channels-subnav">
    <div className="channels-subnav-title">渠道</div>
    <button type="button" className={activeKey === 'all' ? 'active' : ''} onClick={() => navigate('/channels')}>全部</button>
    {channelTypes.map((type) => <button type="button" key={type} className={activeKey === type ? 'active' : ''} onClick={() => navigate(pathFor(type))}><ChannelLogo type={type} />{channelMeta[type].name}</button>)}
  </aside>;
}

function getAgent(agents: Agent[], agentId?: string) {
  return agentId ? agents.find((agent) => agent.id === agentId) : undefined;
}

function AgentAvatar({ agent }: { agent?: Agent }) {
  if (!agent) return <span className="channel-agent-avatar is-empty"><IconExclamationCircle /></span>;
  if (agent.avatar) return <span className="channel-agent-avatar"><img src={agent.avatar} alt="" /></span>;
  return <span className="channel-agent-avatar"><IconRobot /></span>;
}

function AgentCell({ agent }: { agent?: Agent }) {
  if (!agent) return <span className="channel-unconfigured"><AgentAvatar />未配置</span>;
  return <span className="channel-agent-cell"><AgentAvatar agent={agent} />{agent.name}</span>;
}

export function ChannelsPage() {
  const route = useChannelRoute();
  return <div className="page-content channels-page"><div className="channels-layout"><ChannelSideNav activeType={route.type} mode={route.mode} /><main className="channels-main">{route.mode === 'all' && <AllChannelsPage />}{route.type && route.mode !== 'all' && <ChannelTypePage type={route.type} routeMode={route.mode} routeChannelId={route.channelId} />}</main></div></div>;
}

function AllChannelsPage() {
  const { state } = useAppStore();
  const navigate = useNavigate();
  const channels = useMemo(() => state.channels.map(normalizeChannel), [state.channels]);
  return <section className="channels-panel"><div className="channels-panel-header"><h1>全部渠道</h1></div><div className="channel-type-grid">{channelTypes.map((type) => {
    const count = channels.filter((channel) => channel.type === type).length;
    return <article className="channel-type-card" key={type}>
      <div className="channel-type-card-head"><ChannelLogo type={type} /><div><h2>{channelMeta[type].name}</h2>{count > 0 && <span className="channel-connected-pill">已连接 {count}</span>}</div></div>
      <p>{channelMeta[type].description}</p>
      <Button className={count > 0 ? 'channel-card-link' : 'channel-connect-button'} type={count > 0 ? 'text' : 'secondary'} onClick={() => navigate(count > 0 ? pathFor(type) : pathFor(type, '/new'))}>{count > 0 ? '管理' : '连接'}</Button>
    </article>;
  })}</div></section>;
}

function ChannelTypePage({ type, routeMode, routeChannelId }: { type: ChannelType; routeMode: RouteMode; routeChannelId?: string }) {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Channel>();
  const [deleteName, setDeleteName] = useState('');
  const [query, setQuery] = useState('');
  const [configModal, setConfigModal] = useState<ConfigModalState | null>(null);
  const [feedback, setFeedback] = useState<ChannelFeedback | null>(null);
  const normalizedChannels = useMemo(() => state.channels.map(normalizeChannel), [state.channels]);
  const channels = useMemo(() => normalizedChannels.filter((channel) => channel.type === type).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [normalizedChannels, type]);
  const filteredChannels = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return channels;
    return channels.filter((channel) => channel.name.toLowerCase().includes(keyword));
  }, [channels, query]);

  useEffect(() => {
    if (routeMode === 'create') {
      setConfigModal({ mode: 'create' });
      return;
    }
    if (routeMode === 'edit' && routeChannelId) {
      const target = channels.find((channel) => channel.id === routeChannelId);
      setConfigModal(target ? { mode: 'edit', channel: target } : null);
    }
  }, [channels, routeChannelId, routeMode]);

  const closeConfig = () => {
    setConfigModal(null);
    if (routeMode === 'create' || routeMode === 'edit') navigate(pathFor(type), { replace: true });
  };
  const closeDelete = () => { setDeleteTarget(undefined); setDeleteName(''); };
  const showFeedback = (type: ChannelFeedback['type'], text: string) => {
    const id = Date.now();
    setFeedback({ id, type, text });
    window.setTimeout(() => {
      setFeedback((current) => current?.id === id ? null : current);
    }, 2000);
  };
  const remove = () => {
    if (!deleteTarget || deleteName !== deleteTarget.name) return;
    dispatch({ type: 'channel.delete', id: deleteTarget.id });
    Message.success('渠道已删除，历史会话数据已保留');
    closeDelete();
  };
  const toggleEnabled = (channel: Channel, enabled: boolean) => {
    const agent = getAgent(state.agents, channel.agentId);
    if (enabled && !agent) {
      showFeedback('warning', '请先配置接待 AI Agent 后再启用渠道');
      Message.warning('请先配置接待 AI Agent 后再启用渠道');
      return;
    }
    dispatch({ type: 'channel.toggle', id: channel.id, enabled });
    showFeedback('success', enabled ? '渠道已启用' : '渠道已停用');
    Message.success(enabled ? '渠道已启用' : '渠道已停用');
  };
  const more = (channel: Channel) => <Menu>
    <Menu.Item key="edit" onClick={() => setConfigModal({ mode: 'edit', channel })}>编辑</Menu.Item>
    <Menu.Item key="delete" className="danger-menu-item" onClick={() => { setDeleteTarget(channel); setDeleteName(''); }}>删除</Menu.Item>
  </Menu>;
  const hasSearchResult = filteredChannels.length > 0;

  return <section className="channels-panel">{feedback && <div className={`channel-feedback-toast is-${feedback.type}`} role="status" aria-live="polite">{feedback.text}</div>}<div className="channels-panel-header"><h1>{channelMeta[type].title}</h1><Button className="channel-add-button" type="primary" onClick={() => setConfigModal({ mode: 'create' })}><span><IconPlus />添加新连接</span></Button></div>
    <div className="channel-list-content">{channels.length > 0 && <div className="channel-list-toolbar"><Input prefix={<IconSearch />} value={query} onChange={setQuery} placeholder="搜索渠道名称" allowClear /></div>}
    {hasSearchResult ? <Table rowKey="id" dataSource={filteredChannels} pagination={false} columns={[
      { title: '渠道名称', dataIndex: 'name', render: (value: string) => <div className="channel-name-cell"><div><strong>{value}</strong></div></div> },
      { title: '接待 AI Agent', dataIndex: 'agentId', render: (value?: string) => <AgentCell agent={getAgent(state.agents, value)} /> },
      { title: '创建时间', dataIndex: 'createdAt', render: (value?: string) => <span className="channel-created-at">{formatDate(value)}</span> },
      { title: '启用状态', dataIndex: 'enabled', width: 96, render: (value: boolean, item: Channel) => <Switch checked={Boolean(value)} onChange={(checked) => toggleEnabled(item, checked)} /> },
      { title: '操作', width: 72, render: (_: unknown, item: Channel) => <Dropdown trigger="click" droplist={more(item)}><Button type="text" className="table-more-button" icon={<IconMore />} aria-label={`${item.name} 更多操作`} /></Dropdown> },
    ]} /> : channels.length ? <Empty description="没有找到匹配的渠道" /> : <ChannelEmptyState type={type} onAdd={() => setConfigModal({ mode: 'create' })} />}</div>
    <DeleteChannelModal target={deleteTarget} value={deleteName} onChange={setDeleteName} onCancel={closeDelete} onConfirm={remove} />
    <ChannelConfigModal type={type} modal={configModal} onClose={closeConfig} />
  </section>;
}

function ChannelEmptyState({ type, onAdd }: { type: ChannelType; onAdd: () => void }) {
  return <div className="channel-empty-state"><img src={channelEmptyState} alt="" /><h2>将 {channelMeta[type].name} 消息接入收件箱</h2><p>{channelMeta[type].description} 添加连接后，你可以为该渠道指定接待 AI Agent。</p><Button type="primary" icon={<IconPlus />} onClick={onAdd}>添加新连接</Button></div>;
}

function DeleteChannelModal({ target, value, onChange, onCancel, onConfirm }: { target?: Channel; value: string; onChange: (value: string) => void; onCancel: () => void; onConfirm: () => void }) {
  return <Modal open={Boolean(target)} title={target ? `删除渠道「${target.name}」？` : '删除渠道？'} okText="确认删除" cancelText="取消" okButtonProps={{ status: 'danger', disabled: !target || value !== target.name }} onCancel={onCancel} onOk={onConfirm} destroyOnHidden>
    <div className="channel-delete-confirm"><p>删除后该渠道的入站消息将立即停止，历史会话保留但不可继续接收。请输入渠道名称以确认。</p><label><span>渠道名称</span><Input value={value} onChange={onChange} placeholder={target?.name ?? '请输入渠道名称'} /></label></div>
  </Modal>;
}

function buildInitialDraft(type: ChannelType, channel?: Channel): Draft {
  const normalized = channel ? normalizeChannel(channel) : undefined;
  const id = normalized?.id ?? makeId(`channel-${type}`);
  return {
    name: normalized?.name ?? '',
    agentId: normalized?.agentId,
    accessToken: normalized?.accessToken ?? '',
    botToken: normalized?.botToken ?? '',
    webhookUrl: normalized?.webhookUrl ?? (type === 'livechat' ? `https://im-support.example.com/webhooks/livechat/${id}` : ''),
  };
}

function ChannelConfigModal({ type, modal, onClose }: { type: ChannelType; modal: ConfigModalState | null; onClose: () => void }) {
  const { state, dispatch } = useAppStore();
  const mode = modal?.mode ?? 'create';
  const existing = modal?.channel ? normalizeChannel(modal.channel) : undefined;
  const [draft, setDraft] = useState<Draft>(() => buildInitialDraft(type, existing));
  const [dirty, setDirty] = useState(mode === 'create');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const selectedAgent = getAgent(state.agents, draft.agentId);

  useEffect(() => {
    setDraft(buildInitialDraft(type, existing));
    setDirty(mode === 'create');
    setError('');
    setSaving(false);
    setAgentPickerOpen(false);
  }, [existing, mode, type]);

  const update = (patch: Partial<Draft>) => {
    setDraft((value) => ({ ...value, ...patch }));
    setDirty(true);
    setError('');
  };
  const validate = () => {
    const name = draft.name.trim();
    if (!name) return '请输入渠道名称';
    if (state.channels.some((channel) => channel.id !== existing?.id && channel.name.trim().toLowerCase() === name.toLowerCase())) return '渠道名称已存在，请使用唯一名称';
    if (!draft.agentId) return '请选择接待 AI Agent';
    if (type === 'livechat') {
      if (draft.accessToken.trim().length < 8) return 'Access Token 至少需要 8 个字符';
      if (/fail|invalid/i.test(draft.accessToken)) return 'Access Token 校验失败，请检查 Livechat 后台凭证';
    }
    if (type === 'telegram') {
      if (!/^\d+:\S+$/.test(draft.botToken.trim())) return 'Bot Token 格式不正确，示例：123456789:token';
      if (/fail|invalid/i.test(draft.botToken)) return 'Bot Token 校验失败，请检查 Telegram Bot 凭证';
      if (state.channels.some((channel) => channel.id !== existing?.id && normalizeChannel(channel).type === 'telegram' && channel.botToken === draft.botToken.trim())) return '该 Telegram Bot 已绑定其他渠道';
    }
    return '';
  };
  const submit = () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    window.setTimeout(() => {
      const savedAt = now();
      const id = existing?.id ?? makeId(`channel-${type}`);
      const channel: Channel = {
        ...existing,
        id,
        type,
        name: draft.name.trim(),
        agentId: draft.agentId,
        enabled: existing?.enabled ?? true,
        accessToken: type === 'livechat' ? draft.accessToken.trim() : undefined,
        botToken: type === 'telegram' ? draft.botToken.trim() : undefined,
        webhookUrl: type === 'livechat' ? draft.webhookUrl : undefined,
        receiveGroups: existing?.receiveGroups ?? [],
        humanGroups: existing?.humanGroups ?? [],
        opening: existing?.opening ?? '',
        hotQuestions: existing?.hotQuestions ?? [],
        ending: existing?.ending ?? '',
        humanEnabled: existing?.humanEnabled ?? false,
        humanFallback: existing?.humanFallback ?? '',
        createdAt: existing?.createdAt ?? savedAt,
        updatedAt: savedAt,
      };
      dispatch({ type: 'channel.save', channel });
      setSaving(false);
      Message.success(mode === 'create' ? '渠道已连接' : '渠道已保存');
      onClose();
    }, 600);
  };
  const copyWebhook = () => {
    void navigator.clipboard?.writeText(draft.webhookUrl);
    Message.success('Webhook URL 已复制');
  };
  const tokenField = channelMeta[type].tokenField;

  const title = <span className="channel-config-title"><ChannelLogo type={type} />{mode === 'create' ? `接入 ${channelMeta[type].name}` : `编辑 ${channelMeta[type].name}`}</span>;

  return <Modal className="channel-config-modal" open={Boolean(modal)} title={title} footer={null} onCancel={onClose} destroyOnHidden>
    <div className="channel-config-form">
      <label className="channel-field"><span>渠道名称</span><Input value={draft.name} onChange={(name) => update({ name })} placeholder="请输入渠道名称" /></label>
      <label className="channel-field"><span>{channelMeta[type].tokenLabel}</span><Input.Password value={draft[tokenField]} onChange={(value) => update({ [tokenField]: value })} placeholder={type === 'telegram' ? '123456789:telegram_bot_token' : '输入 Livechat Access Token'} /></label>
      {type === 'livechat' && <label className="channel-field"><span>Webhook URL</span><div className="channel-copy-field"><Input value={draft.webhookUrl} readOnly /><Button icon={<IconCopy />} onClick={copyWebhook}>复制</Button></div></label>}
      <div className="channel-field"><span>接待 AI Agent</span><div className="channel-agent-select">
        <button type="button" className={`channel-agent-select-trigger ${agentPickerOpen ? 'is-open' : ''}`} onClick={() => setAgentPickerOpen((open) => !open)}>
          <span>{selectedAgent ? <><AgentAvatar agent={selectedAgent} />{selectedAgent.name}</> : '选择接待 AI Agent'}</span>
          <i aria-hidden="true" />
        </button>
        {agentPickerOpen && <div className="channel-agent-options">
          {state.agents.map((agent) => <button type="button" key={agent.id} className={agent.id === draft.agentId ? 'is-selected' : ''} onClick={() => { update({ agentId: agent.id }); setAgentPickerOpen(false); }}>
            <AgentAvatar agent={agent} />
            <span>{agent.name || '未命名'}</span>
          </button>)}
        </div>}
      </div></div>
      {error && <div className="channel-form-error">{error}</div>}
      <div className="channel-form-actions"><Button onClick={onClose}>取消</Button><Button type="primary" loading={saving} disabled={mode === 'edit' && !dirty} onClick={submit}>{mode === 'create' ? '连接' : '保存'}</Button></div>
    </div>
  </Modal>;
}
