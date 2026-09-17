import { useState } from 'react';
import { Button, Checkbox, InputNumber, Message } from '../components/ui';
import { IconDown, IconUp } from '@arco-design/web-react/icon';
import { useAppStore } from '../store';
import type { ChatTimeoutSettings } from '../types';

export function SettingsPage() {
  const { state, dispatch } = useAppStore();
  const toast = Message;
  const saved = state.settings.chatTimeout;
  const [draft, setDraft] = useState<ChatTimeoutSettings>({ ...saved });
  const [expanded, setExpanded] = useState(true);
  const dirty = draft.enabled !== saved.enabled || draft.minutes !== saved.minutes;
  const update = (patch: Partial<ChatTimeoutSettings>) => setDraft((prev) => ({ ...prev, ...patch }));
  const save = () => { dispatch({ type: 'settings.saveChatTimeout', value: draft }); toast.success('聊天超时设置已保存'); };
  return <div className="page-content settings-page"><div className="settings-layout">
    <aside className="settings-subnav">
      <div className="settings-subnav-title">设置</div>
      <div className="settings-group">
        <div className="settings-group-head">
          <span className="settings-group-name">收件箱</span>
          <Button type="text" size="mini" icon={expanded ? <IconUp /> : <IconDown />} aria-label={expanded ? '收起收件箱分组' : '展开收件箱分组'} onClick={() => setExpanded((value) => !value)} />
        </div>
        {expanded && <button type="button" className="settings-nav-item active">聊天超时</button>}
      </div>
    </aside>
    <main className="settings-main">
      <div className="settings-panel-header"><h1>聊天超时</h1></div>
      <div className="settings-content">
        <p className="settings-description">选择会话没有新消息时的处理方式。</p>
        <div className="settings-option-card">
          <div className="settings-option-row">
            <Checkbox checked={draft.enabled} onChange={(enabled: boolean) => update({ enabled })}><span>如果没有新消息，超过以下时长后<strong className="settings-option-strong">关闭会话</strong></span></Checkbox>
            {draft.enabled && <span className="settings-option-control"><InputNumber min={1} max={1440} value={draft.minutes} onChange={(value: number | undefined) => update({ minutes: Math.min(1440, Math.max(1, Number(value) || 1)) })} /><span className="settings-option-unit">分钟</span></span>}
          </div>
        </div>
      </div>
      {dirty && <div className="settings-actions"><Button onClick={() => setDraft({ ...saved })}>取消</Button><Button type="primary" onClick={save}>保存</Button></div>}
    </main>
  </div></div>;
}
