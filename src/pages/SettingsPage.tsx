import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, InputNumber, Message } from '../components/ui';
import { IconDown, IconUp } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import type { ChatTimeoutSettings } from '../types';

const NAV_GROUPS: { group: string; items: { key: string; label: string; route: string; menuKey: string }[] }[] = [
  { group: '收件箱', items: [{ key: 'chat-timeout', label: '聊天超时', route: '/settings/chat-timeout', menuKey: 'settings:chat-timeout' }] },
  {
    group: '成员与权限',
    items: [
      { key: 'members', label: '用户管理', route: '/settings/members', menuKey: 'settings:members' },
      { key: 'roles', label: '角色管理', route: '/settings/roles', menuKey: 'settings:roles' },
    ],
  },
];

export function SettingsLayout({ active, title, action, children }: { active: string; title: string; action?: ReactNode; children: ReactNode }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const groups = NAV_GROUPS;
  return <div className="page-content settings-page"><div className="settings-layout">
    <aside className="settings-subnav">
      <div className="settings-subnav-title">设置</div>
      {groups.map((group) => {
        const isCollapsed = collapsed[group.group] ?? false;
        return <div className="settings-group" key={group.group}>
          <div className="settings-group-head">
            <span className="settings-group-name">{group.group}</span>
            <Button type="text" size="mini" icon={isCollapsed ? <IconDown /> : <IconUp />} aria-label={isCollapsed ? `展开${group.group}分组` : `收起${group.group}分组`} onClick={() => setCollapsed((prev) => ({ ...prev, [group.group]: !isCollapsed }))} />
          </div>
          {!isCollapsed && group.items.map((item) => <button key={item.key} type="button" className={`settings-nav-item${active === item.key ? ' active' : ''}`} onClick={() => navigate(item.route)}>{item.label}</button>)}
        </div>;
      })}
    </aside>
    <main className="settings-main">
      <div className="settings-panel-header"><h1>{title}</h1>{action}</div>
      {children}
    </main>
  </div></div>;
}

export function SettingsPage() {
  const { state, dispatch } = useAppStore();
  const toast = Message;
  const saved = state.settings.chatTimeout;
  const [draft, setDraft] = useState<ChatTimeoutSettings>({ ...saved, enabled: true });
  const dirty = draft.minutes !== saved.minutes;
  const update = (patch: Partial<ChatTimeoutSettings>) => setDraft((prev) => ({ ...prev, ...patch }));
  const save = () => { dispatch({ type: 'settings.saveChatTimeout', value: { ...draft, enabled: true } }); toast.success('聊天超时设置已保存'); };
  return <SettingsLayout active="chat-timeout" title="聊天超时">
    <div className="settings-content">
      <p className="settings-description">选择会话没有新消息时的处理方式。</p>
      <div className="settings-option-card">
        <div className="settings-option-row">
          <span>如果没有新消息，超过以下时长后<strong className="settings-option-strong">关闭会话</strong></span>
          <span className="settings-option-control"><InputNumber min={1} max={1440} value={draft.minutes} onChange={(value: number | undefined) => update({ minutes: Math.min(1440, Math.max(1, Number(value) || 1)) })} /><span className="settings-option-unit">分钟</span></span>
        </div>
      </div>
    </div>
    {dirty && <div className="settings-actions"><Button onClick={() => setDraft({ ...saved })}>取消</Button><Button type="primary" onClick={save}>保存</Button></div>}
  </SettingsLayout>;
}
