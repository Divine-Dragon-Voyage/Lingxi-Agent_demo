import { useMemo, useState } from 'react';
import { Button, Drawer, Empty, Input, Message, Modal, Select, Switch, Table } from '../components/ui';
import { IconPlus, IconSearch } from '@arco-design/web-react/icon';
import { useAppStore } from '../store';
import { now } from '../mockData';
import { currentMember } from '../permissions';
import { MemberAvatar } from '../components/MemberAvatar';
import { SettingsLayout } from './SettingsPage';
import type { TenantMember, TenantRole } from '../types';

import { STRONG_PASSWORD_MESSAGE, isStrongPassword } from '../auth';

const newMemberId = () => `member-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function UserManagementPage() {
  const { state, dispatch } = useAppStore();
  const toast = Message;
  const me = currentMember(state)!;
  const roleById = useMemo(() => new Map(state.roles.map((role) => [role.id, role])), [state.roles]);
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState<null | { mode: 'create' } | { mode: 'edit' | 'view'; member: TenantMember }>(null);
  const [resetTarget, setResetTarget] = useState<TenantMember | null>(null);

  const keywordTrimmed = keyword.trim().toLowerCase();
  const members = useMemo(() => {
    const matched = state.members.filter((member) => !keywordTrimmed || member.username.toLowerCase().includes(keywordTrimmed));
    const rest = matched.filter((member) => member.id !== me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return [...matched.filter((member) => member.id === me.id), ...rest];
  }, [state.members, me.id, keywordTrimmed]);

  const toggleEnabled = (member: TenantMember, enabled: boolean) => {
    if (enabled) {
      dispatch({ type: 'member.toggleEnabled', id: member.id, enabled: true });
      toast.success('已启用');
      return;
    }
    Modal.confirm({
      title: '停用成员？',
      content: `${member.username} 将立即失去系统访问权限，账号及历史数据仍会保留。`,
      okText: '停用',
      cancelText: '取消',
      okButtonProps: { status: 'danger' },
      onOk: () => { dispatch({ type: 'member.toggleEnabled', id: member.id, enabled: false }); toast.success('已停用'); },
    });
  };

  const confirmDelete = (member: TenantMember) => {
    Modal.confirm({
      title: '删除成员？',
      content: `${member.username} 将从团队成员列表中移除，并立即失去访问权限。此操作不可恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { status: 'danger' },
      onOk: () => { dispatch({ type: 'member.delete', id: member.id }); toast.success('成员已删除'); },
    });
  };

  const isOwner = (member: TenantMember) => member.roleId === 'role-owner';

  return <SettingsLayout active="members" title="用户管理" action={<Button type="primary" onClick={() => setForm({ mode: 'create' })}><IconPlus />创建用户</Button>}>
    <div className="settings-content is-wide">
      <div className="settings-toolbar">
        <Input className="settings-search" allowClear value={keyword} onChange={setKeyword} placeholder="搜索用户名" prefix={<IconSearch />} aria-label="搜索用户名" />
      </div>
      {members.length ? <Table className="member-table user-table" rowKey="id" dataSource={members} pagination={false} columns={[
        { title: '用户', width: '38%', render: (_: unknown, member: TenantMember) => <span className="member-cell"><MemberAvatar username={member.username} /><span className="member-name">{member.username}{member.id === me.id && <span className="member-you">（你）</span>}</span></span> },
        { title: '角色', width: '24%', render: (_: unknown, member: TenantMember) => roleById.get(member.roleId)?.name ?? '—' },
        { title: '启用', width: '16%', render: (_: unknown, member: TenantMember) => <Switch checked={member.enabled} disabled={member.id === me.id || isOwner(member)} onChange={(checked: boolean) => toggleEnabled(member, checked)} aria-label={`启用 ${member.username}`} /> },
        {
          title: '操作',
          width: '22%',
          render: (_: unknown, member: TenantMember) => isOwner(member)
            ? <Button type="text" className="member-action-button" onClick={() => setForm({ mode: 'view', member })}>查看</Button>
            : <span className="member-action-group"><Button type="text" className="member-action-button" onClick={() => setForm({ mode: 'edit', member })}>编辑</Button><Button type="text" className="member-action-button" onClick={() => setResetTarget(member)}>重置密码</Button><Button type="text" status="danger" className="member-action-button" disabled={member.id === me.id} onClick={() => confirmDelete(member)}>删除</Button></span>,
        },
      ]} /> : <Empty description="未找到相关成员" />}
    </div>
    {form && <UserFormDrawer form={form} roles={state.roles} members={state.members} onClose={() => setForm(null)} />}
    {resetTarget && <ResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} />}
  </SettingsLayout>;
}

function UserFormDrawer({ form, roles, members, onClose }: { form: { mode: 'create' } | { mode: 'edit' | 'view'; member: TenantMember }; roles: TenantRole[]; members: TenantMember[]; onClose: () => void }) {
  const { dispatch } = useAppStore();
  const toast = Message;
  const isCreate = form.mode === 'create';
  const isView = form.mode === 'view';
  const member = form.mode !== 'create' ? form.member : null;
  const roleLocked = isView || member?.roleId === 'role-owner';
  const [username, setUsername] = useState(member?.username ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(member?.roleId ?? '');
  const [errors, setErrors] = useState<{ username?: string; password?: string; roleId?: string }>({});
  const selectableRoles = roleLocked ? roles : roles.filter((role) => role.id !== 'role-owner');
  const dirty = isView ? false : isCreate ? Boolean(username.trim() && password && roleId) : roleId !== member?.roleId && Boolean(roleId);

  const submit = () => {
    const next: typeof errors = {};
    if (isCreate) {
      if (!username.trim()) next.username = '请输入用户名';
      else if (members.some((item) => item.username.trim().toLowerCase() === username.trim().toLowerCase())) next.username = '用户名已存在，请重新输入';
      if (!isStrongPassword(password)) next.password = STRONG_PASSWORD_MESSAGE;
    }
    if (!roleId) next.roleId = '请选择角色';
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    if (isCreate) {
      dispatch({ type: 'member.add', member: { id: newMemberId(), username: username.trim(), roleId, enabled: true, createdAt: now() } });
      toast.success('用户已创建');
    } else if (member) {
      dispatch({ type: 'member.updateRole', id: member.id, roleId });
      toast.success('已保存');
    }
    onClose();
  };

  return <Drawer open title={isCreate ? '创建用户' : isView ? '查看用户' : '编辑用户'} width={420} onCancel={onClose}
    footer={isView ? <div className="member-drawer-footer"><Button type="primary" onClick={onClose}>关闭</Button></div> : <div className="member-drawer-footer"><Button onClick={onClose}>取消</Button><Button type="primary" disabled={!dirty} onClick={submit}>{isCreate ? '创建' : '保存'}</Button></div>}>
    <div className="member-form">
      {isCreate ? <>
        <label className="member-form-label" htmlFor="member-username">用户名<span className="member-form-required">*</span></label>
        <Input id="member-username" value={username} onChange={(value: string) => { setUsername(value); setErrors((prev) => ({ ...prev, username: undefined })); }} placeholder="请输入用户名" error={Boolean(errors.username)} onClear={() => setErrors((prev) => ({ ...prev, username: undefined }))} />
        {errors.username && <div className="member-form-error" role="alert">{errors.username}</div>}
        <label className="member-form-label" htmlFor="member-password">密码<span className="member-form-required">*</span></label>
        <Input.Password id="member-password" value={password} onChange={(value: string) => { setPassword(value); setErrors((prev) => ({ ...prev, password: undefined })); }} placeholder="请输入初始登录密码" error={Boolean(errors.password)} />
        {errors.password && <div className="member-form-error" role="alert">{errors.password}</div>}
      </> : member && <div className="member-form-static"><MemberAvatar username={member.username} size={36} /><span className="member-name">{member.username}</span></div>}
      <label className="member-form-label" htmlFor="member-role">角色<span className="member-form-required">*</span></label>
      <Select id="member-role" value={roleId} onChange={(value: string) => { setRoleId(value); setErrors((prev) => ({ ...prev, roleId: undefined })); }} placeholder="请选择角色" disabled={roleLocked}>
        {selectableRoles.map((role) => <Select.Option key={role.id} value={role.id}>{role.name}</Select.Option>)}
      </Select>
      {errors.roleId && <div className="member-form-error" role="alert">{errors.roleId}</div>}
      {member?.roleId === 'role-owner' && <div className="member-form-hint">Owner 为租户所有者身份，不允许变更。</div>}
    </div>
  </Drawer>;
}

function ResetPasswordModal({ target, onClose }: { target: TenantMember; onClose: () => void }) {
  const toast = Message;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const submit = () => {
    const next: typeof errors = {};
    if (!isStrongPassword(password)) next.password = STRONG_PASSWORD_MESSAGE;
    if (confirm !== password) next.confirm = '两次输入的密码不一致';
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    toast.success('密码已重置');
    onClose();
  };

  return <Modal open title={`重置密码 · ${target.username}`} okText="重置" cancelText="取消" onCancel={onClose} onOk={submit} destroyOnHidden>
    <div className="member-form">
      <label className="member-form-label" htmlFor="reset-password">新密码<span className="member-form-required">*</span></label>
      <Input.Password id="reset-password" value={password} onChange={(value: string) => { setPassword(value); setErrors((prev) => ({ ...prev, password: undefined })); }} placeholder="请输入新密码" error={Boolean(errors.password)} />
      {errors.password && <div className="member-form-error" role="alert">{errors.password}</div>}
      <label className="member-form-label" htmlFor="reset-confirm">确认密码<span className="member-form-required">*</span></label>
      <Input.Password id="reset-confirm" value={confirm} onChange={(value: string) => { setConfirm(value); setErrors((prev) => ({ ...prev, confirm: undefined })); }} placeholder="请再次输入新密码" error={Boolean(errors.confirm)} />
      {errors.confirm && <div className="member-form-error" role="alert">{errors.confirm}</div>}
      <div className="member-form-hint">重置成功后，该成员需要使用新密码重新登录。</div>
    </div>
  </Modal>;
}
