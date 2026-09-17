import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconClose,
  IconExclamationCircle,
  IconFilter,
  IconMessage,
  IconRefresh,
  IconRobot,
  IconSearch,
} from '@arco-design/web-react/icon';
import { Button, Empty, Input, Popover, Select } from '../components/ui';
import livechatLogoUrl from '../assets/livechat-logo.png';
import { inboxAgents, inboxChannels, inboxConversations } from '../inboxMockData';
import { useAppStore } from '../store';
import type { Agent, InboxChannelType, InboxConversation } from '../types';

type InboxStatus = 'processing' | 'resolved' | 'ended' | 'all';
type LoadState = 'loading' | 'ready' | 'error';
type FilterType = 'agent' | 'channel';

const statusItems: { key: InboxStatus; label: string }[] = [
  { key: 'processing', label: '处理中' },
  { key: 'resolved', label: '已解决' },
  { key: 'ended', label: '已结束' },
  { key: 'all', label: '全部' },
];

const isInboxStatus = (value: string | null): value is InboxStatus => statusItems.some((item) => item.key === value);
const inboxAgentSourceIds: Record<string, string> = {
  'payment-agent': 'agent-support',
  'account-agent': 'agent-sales',
  'vip-agent': 'agent-vip',
};

function resolveInboxAgent(agents: Agent[], inboxAgent: { id: string; name: string }) {
  const sourceId = inboxAgentSourceIds[inboxAgent.id];
  return agents.find((agent) => agent.id === inboxAgent.id || agent.name === inboxAgent.name)
    ?? agents.find((agent) => sourceId && agent.id === sourceId);
}

function SyncedAgentAvatar({ agent }: { agent?: Agent }) {
  return agent?.avatar ? <img src={agent.avatar} alt="" /> : <IconRobot />;
}

function ChannelLogo({ type }: { type: InboxChannelType }) {
  if (type === 'telegram') {
    return <span className="inbox-channel-logo is-telegram" aria-label="Telegram">
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#26A5E4" />
        <path d="M17.82 7.1 15.9 17.02c-.14.72-.53.9-1.08.56l-3-2.22-1.45 1.4c-.16.16-.3.3-.6.3l.22-3.1 5.64-5.1c.25-.22-.05-.34-.38-.12l-6.98 4.4-3-.94c-.66-.2-.67-.65.14-.96l11.72-4.52c.54-.2 1.02.13.7.38Z" fill="#fff" />
      </svg>
    </span>;
  }
  return <span className="inbox-channel-logo is-livechat" aria-label="LiveChat">
    <img src={livechatLogoUrl} alt="" aria-hidden="true" />
  </span>;
}

function getLatestMessage(conversation: InboxConversation) {
  const latest = conversation.messages.at(-1);
  if (!latest) return '';
  if (latest.type === 'image') return `图片：${latest.content}`;
  return latest.content.replace(/\s+/g, ' ');
}

function formatListTime(value: string) {
  const date = new Date(value);
  const now = new Date('2026-09-16T12:00:00+08:00');
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  if (sameDay) return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  const now = new Date('2026-09-16T12:00:00+08:00');
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return sameDay ? time : `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

function initials(value: string) {
  if (value.startsWith('Visitor')) return '访';
  return value.slice(0, 1).toUpperCase();
}

function avatarTone(value: string) {
  const seed = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `tone-${seed % 6}`;
}

function ListSkeleton() {
  return <div className="inbox-list-skeleton" aria-label="会话列表加载中">
    {Array.from({ length: 6 }).map((_, index) => <div className="inbox-skeleton-row" key={index}>
      <span className="inbox-skeleton-avatar" />
      <span className="inbox-skeleton-lines"><i /><i /><i /></span>
    </div>)}
  </div>;
}

function MessageSkeleton() {
  return <div className="inbox-message-skeleton" aria-label="消息加载中">
    <span className="inbox-skeleton-bubble is-left" />
    <span className="inbox-skeleton-bubble is-right" />
    <span className="inbox-skeleton-bubble is-left is-short" />
  </div>;
}

export function InboxPage() {
  const { state } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [processingExpanded, setProcessingExpanded] = useState(true);
  const [listState, setListState] = useState<LoadState>('loading');
  const [messageState, setMessageState] = useState<LoadState>('loading');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  const [pendingFilter, setPendingFilter] = useState<FilterType | null>(null);
  const [draftFilterTypes, setDraftFilterTypes] = useState<FilterType[]>([]);
  const [draftAgentIds, setDraftAgentIds] = useState<string[]>([]);
  const [draftChannelIds, setDraftChannelIds] = useState<string[]>([]);
  const [filterKeyword, setFilterKeyword] = useState('');
  const conversationRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const messageViewportRef = useRef<HTMLDivElement | null>(null);

  const status = isInboxStatus(searchParams.get('status')) ? searchParams.get('status') as InboxStatus : 'processing';
  const navAgentId = searchParams.get('agent') ?? '';
  const filterAgentIds = useMemo(() => searchParams.getAll('filterAgent'), [searchParams]);
  const channelIds = useMemo(() => searchParams.getAll('channel'), [searchParams]);
  const keyword = searchParams.get('q') ?? '';
  const selectedId = searchParams.get('conversation') ?? '';
  const demoState = searchParams.get('demo') ?? '';

  const updateParams = useCallback((patch: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      next.delete(key);
      if (Array.isArray(value)) value.filter(Boolean).forEach((item) => next.append(key, item));
      else if (value) next.set(key, value);
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const appliedFilterTypes = useMemo<FilterType[]>(() => [
    ...(filterAgentIds.length ? ['agent' as const] : []),
    ...(channelIds.length ? ['channel' as const] : []),
  ], [filterAgentIds, channelIds]);
  const agentFilterKey = filterAgentIds.join('|');
  const channelFilterKey = channelIds.join('|');

  useEffect(() => {
    setDraftAgentIds(filterAgentIds);
    setDraftChannelIds(channelIds);
    setDraftFilterTypes(appliedFilterTypes);
  }, [agentFilterKey, channelFilterKey, filterAgentIds, appliedFilterTypes, channelIds]);

  const visibleFilterCount = appliedFilterTypes.length;
  const syncedAgents = useMemo(() => Object.fromEntries(inboxAgents.map((agent) => [agent.id, resolveInboxAgent(state.agents, agent)])), [state.agents]);

  useEffect(() => {
    if (!pendingFilter || !draftFilterTypes.includes(pendingFilter)) return;
    const timer = window.setTimeout(() => {
      setFilterKeyword('');
      setActiveFilter(pendingFilter);
      setPendingFilter(null);
    });
    return () => window.clearTimeout(timer);
  }, [draftFilterTypes, pendingFilter]);

  useEffect(() => {
    setListState('loading');
    const timer = window.setTimeout(() => setListState(demoState === 'error' ? 'error' : 'ready'), 420);
    return () => window.clearTimeout(timer);
  }, [demoState]);

  const statusCounts = useMemo(() => ({
    processing: inboxConversations.filter((item) => item.state === 'processing').length,
    resolved: inboxConversations.filter((item) => item.closedReason === 'ai_resolved').length,
    ended: inboxConversations.filter((item) => item.state === 'closed').length,
    all: inboxConversations.length,
  }), []);

  const agentCounts = useMemo(() => Object.fromEntries(inboxAgents.map((agent) => [
    agent.id,
    inboxConversations.filter((item) => item.state === 'processing' && item.agentId === agent.id).length,
  ])), []);

  const filteredConversations = useMemo(() => {
    if (demoState === 'empty') return [];
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();
    return inboxConversations
      .filter((item) => {
        if (status === 'processing' && item.state !== 'processing') return false;
        if (status === 'resolved' && item.closedReason !== 'ai_resolved') return false;
        if (status === 'ended' && item.state !== 'closed') return false;
        if (status === 'processing' && navAgentId && item.agentId !== navAgentId) return false;
        if (filterAgentIds.length && !filterAgentIds.includes(item.agentId)) return false;
        if (channelIds.length && !channelIds.includes(item.channelId)) return false;
        if (normalizedKeyword && !item.messages.some((message) => message.role !== 'system' && message.content.toLocaleLowerCase().includes(normalizedKeyword))) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [channelIds, demoState, filterAgentIds, keyword, navAgentId, status]);

  useEffect(() => {
    if (listState !== 'ready') return;
    if (!filteredConversations.length) {
      if (selectedId) updateParams({ conversation: null });
      return;
    }
    if (!filteredConversations.some((item) => item.id === selectedId)) updateParams({ conversation: filteredConversations[0].id });
  }, [filteredConversations, listState, selectedId, updateParams]);

  const selectedConversation = useMemo(() => inboxConversations.find((item) => item.id === selectedId) ?? null, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setMessageState('loading');
    const timer = window.setTimeout(() => setMessageState(demoState === 'message-error' ? 'error' : 'ready'), 280);
    return () => window.clearTimeout(timer);
  }, [demoState, selectedId]);

  useEffect(() => {
    if (listState === 'ready' && selectedId) conversationRefs.current[selectedId]?.scrollIntoView({ block: 'nearest' });
  }, [listState, selectedId]);

  useEffect(() => {
    if (messageState === 'ready') {
      messageViewportRef.current?.scrollTo({ top: messageViewportRef.current.scrollHeight });
    }
  }, [messageState, selectedId]);

  const history = useMemo(() => {
    if (!selectedConversation) return [];
    return inboxConversations
      .filter((item) => item.visitorId === selectedConversation.visitorId && item.channelId === selectedConversation.channelId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedConversation]);
  const historyIndex = history.findIndex((item) => item.id === selectedId);

  const selectStatus = (nextStatus: InboxStatus) => updateParams({ status: nextStatus, agent: null, conversation: null });
  const selectConversation = (id: string) => updateParams({ conversation: id });
  const switchHistory = (target: InboxConversation | undefined) => {
    if (!target) return;
    updateParams({ status: 'all', agent: null, filterAgent: null, channel: null, q: null, conversation: target.id });
  };
  const retryList = () => updateParams({ demo: null });
  const retryMessages = () => updateParams({ demo: null });
  const chooseFilterType = (type: FilterType) => {
    setDraftFilterTypes((types) => types.includes(type) ? types : [...types, type]);
    setFilterKeyword('');
    setFilterMenuOpen(false);
    setActiveFilter(null);
    setPendingFilter(type);
  };
  const toggleFilterValue = (type: FilterType, id: string) => {
    const update = (values: string[]) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
    if (type === 'agent') {
      const nextAgentIds = update(draftAgentIds);
      setDraftAgentIds(nextAgentIds);
      setDraftFilterTypes([
        ...(nextAgentIds.length ? ['agent' as const] : []),
        ...(draftChannelIds.length ? ['channel' as const] : []),
      ]);
      updateParams({ filterAgent: nextAgentIds, channel: draftChannelIds, conversation: null });
    } else {
      const nextChannelIds = update(draftChannelIds);
      setDraftChannelIds(nextChannelIds);
      setDraftFilterTypes([
        ...(draftAgentIds.length ? ['agent' as const] : []),
        ...(nextChannelIds.length ? ['channel' as const] : []),
      ]);
      updateParams({ filterAgent: draftAgentIds, channel: nextChannelIds, conversation: null });
    }
  };
  const removeFilterType = (type: FilterType) => {
    setDraftFilterTypes((types) => types.filter((item) => item !== type));
    if (type === 'agent') {
      setDraftAgentIds([]);
      updateParams({ filterAgent: null, conversation: null });
    } else {
      setDraftChannelIds([]);
      updateParams({ channel: null, conversation: null });
    }
    setActiveFilter(null);
  };
  const clearAppliedFilters = () => {
    setDraftFilterTypes([]);
    setDraftAgentIds([]);
    setDraftChannelIds([]);
    setFilterMenuOpen(false);
    setActiveFilter(null);
    updateParams({ filterAgent: null, channel: null, conversation: null });
  };
  const getFilterLabel = (type: FilterType) => {
    const values = type === 'agent' ? draftAgentIds : draftChannelIds;
    const options = type === 'agent' ? inboxAgents : inboxChannels;
    if (!values.length) return type === 'agent' ? 'AI Agent' : 'Channel';
    if (values.length === 1) return options.find((item) => item.id === values[0])?.name ?? (type === 'agent' ? 'AI Agent' : 'Channel');
    return `${type === 'agent' ? 'AI Agent' : 'Channel'} ${values.length}`;
  };
  const renderFilterPicker = (type: FilterType) => {
    const options = type === 'agent' ? inboxAgents : inboxChannels;
    const values = type === 'agent' ? draftAgentIds : draftChannelIds;
    const normalized = filterKeyword.trim().toLocaleLowerCase();
    const visibleOptions = options.filter((item) => item.name.toLocaleLowerCase().includes(normalized));
    const allSelected = visibleOptions.length > 0 && visibleOptions.every((item) => values.includes(item.id));
    const toggleAll = () => {
      const next = allSelected
        ? values.filter((value) => !visibleOptions.some((item) => item.id === value))
        : Array.from(new Set([...values, ...visibleOptions.map((item) => item.id)]));
      if (type === 'agent') {
        setDraftAgentIds(next);
        setDraftFilterTypes([
          ...(next.length ? ['agent' as const] : []),
          ...(draftChannelIds.length ? ['channel' as const] : []),
        ]);
        updateParams({ filterAgent: next, channel: draftChannelIds, conversation: null });
      } else {
        setDraftChannelIds(next);
        setDraftFilterTypes([
          ...(draftAgentIds.length ? ['agent' as const] : []),
          ...(next.length ? ['channel' as const] : []),
        ]);
        updateParams({ filterAgent: draftAgentIds, channel: next, conversation: null });
      }
    };
    return <div className="inbox-filter-picker">
      <Input autoFocus allowClear value={filterKeyword} prefix={<IconSearch />} placeholder={`搜索${type === 'agent' ? ' AI Agent' : '渠道'}`} onChange={setFilterKeyword} />
      <button type="button" className={`inbox-filter-option is-select-all ${allSelected ? 'is-selected' : ''}`} onClick={toggleAll}>
        <span>全选</span>{allSelected && <IconCheck />}
      </button>
      <div className="inbox-filter-options">
        {visibleOptions.map((item) => {
          const selected = values.includes(item.id);
          const syncedAgent = type === 'agent' ? syncedAgents[item.id] : undefined;
          return <button type="button" className={`inbox-filter-option ${selected ? 'is-selected' : ''}`} key={item.id} onClick={() => toggleFilterValue(type, item.id)}>
            <span className={type === 'agent' ? 'inbox-filter-agent-avatar' : 'inbox-filter-channel-icon'}>{type === 'agent' ? <SyncedAgentAvatar agent={syncedAgent} /> : <ChannelLogo type={inboxChannels.find((channel) => channel.id === item.id)?.type ?? 'livechat'} />}</span>
            <span className="inbox-filter-option-name">{item.name}</span>
            {selected && <IconCheck />}
          </button>;
        })}
        {!visibleOptions.length && <span className="inbox-filter-no-result">没有匹配项</span>}
      </div>
    </div>;
  };

  const emptyText = keyword || filterAgentIds.length || channelIds.length
    ? '没有符合筛选条件的会话'
    : status === 'processing'
      ? '暂无处理中会话'
      : status === 'resolved'
        ? '暂无已解决会话'
        : status === 'ended'
          ? '暂无已结束会话'
          : '暂无会话';
  const activeStatusLabel = statusItems.find((item) => item.key === status)?.label ?? '会话';
  const listTitle = status === 'all' ? 'All chats' : activeStatusLabel;
  const selectedFooterText = selectedConversation?.state === 'processing'
    ? 'AI Agent 正在处理中'
    : selectedConversation?.closedReason === 'ai_resolved'
      ? '该会话已由 AI Agent 解决'
      : selectedConversation?.closedReason === 'human_handoff'
        ? '该会话已转接给人工客服'
        : '该会话已关闭';

  return <section className="page-content inbox-page" aria-label="收件箱">
    <div className="inbox-workspace">
      <aside className="inbox-status-rail" aria-label="会话状态">
        <div className="inbox-rail-header">
          <h1>收件箱</h1>
        </div>
        <div className="inbox-rail-title">聊天</div>
        {statusItems.map((item) => <div key={item.key}>
          <div className="inbox-status-row">
            <button type="button" className={`inbox-status-button ${item.key !== 'processing' && status === item.key && !navAgentId ? 'is-active' : ''} ${item.key === 'processing' ? 'is-disclosure' : ''}`} onClick={() => item.key === 'processing' ? setProcessingExpanded((value) => !value) : selectStatus(item.key)}>
              <span>{item.label}</span>{item.key !== 'processing' && <span className="inbox-status-count">{statusCounts[item.key]}</span>}
            </button>
            {item.key === 'processing' && <button type="button" className="inbox-expand-button" aria-label={processingExpanded ? '收起 AI Agents' : '展开 AI Agents'} onClick={() => setProcessingExpanded((value) => !value)}><span className={`inbox-chevron ${processingExpanded ? 'is-expanded' : ''}`} /></button>}
          </div>
          {item.key === 'processing' && processingExpanded && <div className="inbox-agent-tree">
            <button type="button" className={status === 'processing' && !navAgentId ? 'is-active' : ''} onClick={() => updateParams({ status: 'processing', agent: null, conversation: null })}><span>全部</span><span>{statusCounts.processing}</span></button>
            {inboxAgents.map((agent) => <button type="button" className={status === 'processing' && navAgentId === agent.id ? 'is-active' : ''} key={agent.id} onClick={() => updateParams({ status: 'processing', agent: agent.id, conversation: null })}>
              <span className="inbox-agent-nav-copy"><span className="inbox-agent-nav-avatar"><SyncedAgentAvatar agent={syncedAgents[agent.id]} /></span><span>{agent.name}</span></span>
              <span>{agentCounts[agent.id]}</span>
            </button>)}
          </div>}
        </div>)}
      </aside>

      <section className="inbox-list-panel" aria-label="会话列表">
        <div className="inbox-list-toolbar">
          <div className="inbox-list-heading">
            <div className="inbox-list-title"><strong>{listTitle}</strong><span>{filteredConversations.length} 个会话</span></div>
            <div className="inbox-filter-actions">
              <Popover
                trigger="click"
                position="br"
                popupVisible={filterMenuOpen}
                onVisibleChange={(visible: boolean) => { setFilterMenuOpen(visible); if (visible) setActiveFilter(null); }}
                triggerProps={{ autoFitPosition: true, boundaryDistance: { right: 12, bottom: 12 } }}
                content={<div className="inbox-filter-category-menu">
                  {!draftFilterTypes.includes('agent') && <button type="button" onClick={() => chooseFilterType('agent')}><IconRobot /><span>AI Agent</span></button>}
                  {!draftFilterTypes.includes('channel') && <button type="button" onClick={() => chooseFilterType('channel')}><IconMessage /><span>Channel</span></button>}
                  {draftFilterTypes.length === 2 && <span className="inbox-filter-all-added">所有筛选条件已添加</span>}
                </div>}
              >
                <button type="button" className={`inbox-filter-trigger ${visibleFilterCount ? 'is-active' : ''}`} aria-label="筛选会话">
                  <IconFilter /><span>Filter</span>{visibleFilterCount > 0 && <b>{visibleFilterCount}</b>}
                </button>
              </Popover>
            </div>
          </div>
        </div>
        <div className="inbox-list-tools">
          <Select className="inbox-mobile-status" value={status} aria-label="会话状态" onChange={(value) => selectStatus(value as InboxStatus)} options={statusItems.map((item) => ({ value: item.key, label: `${item.label} ${statusCounts[item.key]}` }))} />
          <Input allowClear value={keyword} prefix={<IconSearch />} aria-label="搜索消息内容" placeholder="搜索消息内容" onChange={(value) => updateParams({ q: value || null, conversation: null })} />
          {draftFilterTypes.length > 0 && <div className="inbox-filter-chips">
            {draftFilterTypes.map((type) => <Popover
              key={type}
              trigger="click"
              position="bl"
              popupVisible={activeFilter === type}
              onVisibleChange={(visible: boolean) => { setActiveFilter(visible ? type : null); if (visible) { setFilterKeyword(''); setFilterMenuOpen(false); } }}
              triggerProps={{ autoFitPosition: true, boundaryDistance: { left: 12, bottom: 12 } }}
              content={renderFilterPicker(type)}
            >
              <span className={`inbox-filter-chip ${activeFilter === type ? 'is-open' : ''}`}>
                <button type="button" className="inbox-filter-chip-main" onClick={() => setActiveFilter(type)}>{type === 'agent' ? <IconRobot /> : <IconMessage />}<span>{getFilterLabel(type)}</span></button>
                <button type="button" className="inbox-filter-chip-remove" aria-label={`移除 ${type === 'agent' ? 'AI Agent' : 'Channel'} 筛选`} onClick={(event) => { event.stopPropagation(); removeFilterType(type); }}><IconClose /></button>
              </span>
            </Popover>)}
          </div>}
        </div>

        <div className="inbox-conversation-list">
          {listState === 'loading' && <ListSkeleton />}
          {listState === 'error' && <div className="inbox-centered-state"><IconExclamationCircle /><strong>会话加载失败</strong><span>请检查网络后重新加载</span><Button type="primary" icon={<IconRefresh />} onClick={retryList}>重新加载</Button></div>}
          {listState === 'ready' && !filteredConversations.length && <div className="inbox-centered-state"><Empty description={emptyText}>{(filterAgentIds.length > 0 || channelIds.length > 0) && <Button type="text" onClick={clearAppliedFilters}>重置筛选</Button>}</Empty></div>}
          {listState === 'ready' && filteredConversations.map((conversation) => <button
            type="button"
            key={conversation.id}
            ref={(node) => { conversationRefs.current[conversation.id] = node; }}
            className={`inbox-conversation-item ${selectedId === conversation.id ? 'is-active' : ''}`}
            onClick={() => selectConversation(conversation.id)}
          >
            <span className={`inbox-customer-avatar ${avatarTone(conversation.customerName)}`}>{initials(conversation.customerName)}</span>
            <span className="inbox-conversation-copy">
              <span className="inbox-conversation-topline"><strong>{conversation.customerName}</strong><time>{formatListTime(conversation.updatedAt)}</time></span>
              <span className="inbox-latest-message">{getLatestMessage(conversation)}</span>
              <span className="inbox-conversation-meta">
                <span><ChannelLogo type={conversation.channelType} />{conversation.channelName}</span>
                <span><IconRobot />{conversation.agentName}</span>
              </span>
            </span>
          </button>)}
        </div>
      </section>

      <section className="inbox-detail-panel" aria-label="会话详情">
        {!selectedConversation || listState !== 'ready' ? <div className="inbox-detail-empty"><IconMessage /><strong>选择会话查看详情</strong><span>消息记录将在这里展示</span></div> : <>
          <header className="inbox-detail-header">
            <strong>{selectedConversation.customerName}</strong>
          </header>
          <div className="inbox-message-viewport" ref={messageViewportRef}>
            {messageState === 'loading' && <MessageSkeleton />}
            {messageState === 'error' && <div className="inbox-centered-state"><IconExclamationCircle /><strong>消息加载失败</strong><span>当前会话暂时无法读取</span><Button type="primary" icon={<IconRefresh />} onClick={retryMessages}>重新加载</Button></div>}
            {messageState === 'ready' && <>
              {history.length > 1 && historyIndex >= 0 && <button type="button" className="inbox-thread-jump is-top" disabled={historyIndex >= history.length - 1} onClick={() => switchHistory(history[historyIndex + 1])}><IconArrowUp /> 上一个会话</button>}
              {selectedConversation.messages.map((message) => message.role === 'system'
                ? <div className="inbox-system-message" key={message.id}><span>{message.content} · {formatMessageTime(message.sentAt)}</span></div>
                : <div className={`inbox-message-row is-${message.role}`} key={message.id}>
                  {message.role === 'customer' && <span className={`inbox-customer-avatar is-message ${avatarTone(selectedConversation.customerName)}`}>{initials(selectedConversation.customerName)}</span>}
                  <div className="inbox-message-content">
                    <span className="inbox-message-author">{message.role === 'agent' ? selectedConversation.agentName : selectedConversation.customerName}</span>
                    {message.type === 'image'
                      ? <figure className="inbox-message-image-card">
                          {message.imageUrl && <img src={message.imageUrl} alt={message.content} />}
                          <figcaption>{message.content}</figcaption>
                        </figure>
                      : <div className="inbox-message-bubble">{message.content}</div>}
                    <time>{formatMessageTime(message.sentAt)}</time>
                  </div>
                  {message.role === 'agent' && <span className="inbox-agent-avatar"><IconRobot /></span>}
                </div>)}
              {history.length > 1 && historyIndex >= 0 && <button type="button" className="inbox-thread-jump is-bottom" disabled={historyIndex <= 0} onClick={() => switchHistory(history[historyIndex - 1])}><IconArrowDown /> 下一个会话</button>}
            </>}
          </div>
          <footer className="inbox-detail-footer">
            <span>{selectedFooterText}</span>
            {selectedConversation.state === 'closed' && <Button size="small" type="secondary">重新打开</Button>}
          </footer>
        </>}
      </section>
    </div>
  </section>;
}
