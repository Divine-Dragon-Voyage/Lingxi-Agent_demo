import { useMemo, useState } from 'react';
import { IconPlus, IconSearch, IconUser } from '@arco-design/web-react/icon';
import { Button, Checkbox, Drawer, Empty, Input, Message, Modal, Space, Switch, Table, Tag } from '../components/ui';
import { STRONG_PASSWORD_MESSAGE, isStrongPassword } from '../auth';
import { useAppStore } from '../store';
import type { TenantAccount, TenantWorkspacePermission } from '../types';

const workspaceLabels: Record<TenantWorkspacePermission, string> = { agents: 'AI Agents', livechat: '在线客服' };
const id = () => `tenant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const nowText = () => new Date().toISOString().replace('T', ' ').slice(0, 16);
const formatTenantTime = (value?: string) => {
  if (!value) return '未登录';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (!match) return value;
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
};

type FormState = {
  tenantName: string;
  ownerUsername: string;
  password: string;
  confirmPassword: string;
  workspacePermissions: TenantWorkspacePermission[];
  enabled: boolean;
};

const initialForm: FormState = { tenantName: '', ownerUsername: '', password: '', confirmPassword: '', workspacePermissions: ['agents', 'livechat'], enabled: true };

export function OpsTenantManagementPage() {
  const { state, dispatch } = useAppStore();
  const [query, setQuery] = useState('');
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [viewing, setViewing] = useState<TenantAccount | null>(null);
  const [editing, setEditing] = useState<TenantAccount | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const tenants = useMemo(() => state.tenantAccounts.filter((tenant) => `${tenant.tenantName}${tenant.ownerUsername}`.toLowerCase().includes(query.trim().toLowerCase())), [query, state.tenantAccounts]);
  const openCreate = () => { setForm(initialForm); setErrors({}); setEditing(null); setDrawerMode('create'); };
  const openEdit = (tenant: TenantAccount) => { setEditing(tenant); setForm({ tenantName: tenant.tenantName, ownerUsername: tenant.ownerUsername, password: '', confirmPassword: '', workspacePermissions: tenant.workspacePermissions, enabled: tenant.enabled }); setErrors({}); setDrawerMode('edit'); };
  const closeDrawer = () => { setDrawerMode(null); setEditing(null); setErrors({}); };
  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.tenantName.trim()) next.tenantName = '请输入租户名称';
    if (drawerMode === 'create') {
      if (!form.ownerUsername.trim()) next.ownerUsername = '请输入 Owner 用户名';
      else if (state.tenantAccounts.some((tenant) => tenant.ownerUsername.trim().toLowerCase() === form.ownerUsername.trim().toLowerCase())) next.ownerUsername = 'Owner 用户名已存在';
      if (!form.password) next.password = '请输入初始密码';
      else if (!isStrongPassword(form.password)) next.password = STRONG_PASSWORD_MESSAGE;
      if (!form.confirmPassword) next.confirmPassword = '请再次输入密码';
      else if (form.password !== form.confirmPassword) next.confirmPassword = '两次输入的密码不一致';
    }
    if (!form.workspacePermissions.length) next.workspacePermissions = '请至少选择一个工作台权限';
    setErrors(next);
    return !Object.keys(next).length;
  };
  const save = () => {
    if (!validate()) return;
    if (drawerMode === 'create') {
      dispatch({ type: 'tenant.add', tenant: { id: id(), tenantName: form.tenantName.trim(), ownerUsername: form.ownerUsername.trim(), password: form.password, workspacePermissions: form.workspacePermissions, enabled: form.enabled, createdAt: nowText() } });
      Message.success('Owner 账号已创建');
      closeDrawer();
      return;
    }
    if (editing) {
      dispatch({ type: 'tenant.update', id: editing.id, patch: { tenantName: form.tenantName.trim(), workspacePermissions: form.workspacePermissions, enabled: form.enabled } });
      Message.success('租户账号已更新');
      closeDrawer();
    }
  };
  const toggleTenant = (tenant: TenantAccount, enabled: boolean) => {
    if (!enabled) {
      Modal.confirm({ title: '确认停用租户？', content: '停用后该 Owner 账号将无法登录，确认停用？', okText: '停用', okButtonProps: { status: 'danger' }, onOk: () => { dispatch({ type: 'tenant.toggle', id: tenant.id, enabled: false }); Message.success('租户已停用'); } });
      return;
    }
    dispatch({ type: 'tenant.toggle', id: tenant.id, enabled: true });
    Message.success('租户已启用');
  };
  return <div className="ops-shell">
    <aside className="ops-sider"><button className="active" type="button"><IconUser />租户账号管理</button></aside>
    <main className="ops-main">
      <header className="ops-header"><div><h1>租户账号管理</h1></div><Button type="primary" icon={<IconPlus />} onClick={openCreate}>创建 Owner 账号</Button></header>
      <section className="ops-content-card">
        <div className="ops-toolbar"><Input.Search value={query} onChange={setQuery} allowClear prefix={<IconSearch />} placeholder="搜索租户名称 / Owner 账号" style={{ width: 300 }} /></div>
        <Table rowKey="id" dataSource={tenants} pagination={false} columns={[
          { title: '租户名称', dataIndex: 'tenantName', width: 220 },
          { title: 'Owner 账号', dataIndex: 'ownerUsername', width: 180 },
          { title: '工作台权限', dataIndex: 'workspacePermissions', render: (value: TenantWorkspacePermission[]) => <Space size={6}>{value.map((permission) => <Tag key={permission} color="arcoblue">{workspaceLabels[permission]}</Tag>)}</Space> },
          { title: '状态', dataIndex: 'enabled', width: 100, render: (value: boolean) => <Tag color={value ? 'success' : 'default'}>{value ? '启用' : '停用'}</Tag> },
          { title: '创建时间', dataIndex: 'createdAt', width: 160, render: formatTenantTime },
          { title: '最近登录', dataIndex: 'lastLoginAt', width: 160, render: formatTenantTime },
          { title: '操作', width: 190, render: (_: unknown, item: TenantAccount) => <Space size={8}><Button type="text" onClick={() => setViewing(item)}>查看</Button><Button type="text" onClick={() => openEdit(item)}>编辑</Button><Button type="text" status={item.enabled ? 'danger' : undefined} onClick={() => toggleTenant(item, !item.enabled)}>{item.enabled ? '停用' : '启用'}</Button></Space> },
        ]} />
        {!tenants.length && <Empty description="暂无匹配租户" />}
      </section>
    </main>
    <Modal open={Boolean(drawerMode)} title={drawerMode === 'create' ? '创建 Owner 账号' : '编辑租户账号'} style={{ width: 520 }} onCancel={closeDrawer} footer={<div className="ops-modal-footer"><Button onClick={closeDrawer}>取消</Button><Button type="primary" onClick={save}>保存</Button></div>}>
      <TenantForm mode={drawerMode ?? 'create'} form={form} errors={errors} onChange={(patch) => { setForm((prev) => ({ ...prev, ...patch })); setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(patch).map((key) => [key, undefined])) })); }} />
    </Modal>
    <Drawer open={Boolean(viewing)} title="租户详情" width={480} onCancel={() => setViewing(null)} footer={null}>{viewing && <div className="ops-detail-list"><Detail label="租户名称" value={viewing.tenantName} /><Detail label="Owner 账号" value={viewing.ownerUsername} /><Detail label="工作台权限" value={viewing.workspacePermissions.map((permission) => workspaceLabels[permission]).join('、')} /><Detail label="状态" value={viewing.enabled ? '启用' : '停用'} /><Detail label="创建时间" value={formatTenantTime(viewing.createdAt)} /><Detail label="最近登录" value={formatTenantTime(viewing.lastLoginAt)} /></div>}</Drawer>
  </div>;
}

function TenantForm({ mode, form, errors, onChange }: { mode: 'create' | 'edit'; form: FormState; errors: Partial<Record<keyof FormState, string>>; onChange: (patch: Partial<FormState>) => void }) {
  return <div className="ops-form">
    <label><span>租户名称 <b>*</b></span><Input value={form.tenantName} onChange={(tenantName: string) => onChange({ tenantName })} placeholder="请输入租户名称" />{errors.tenantName && <small>{errors.tenantName}</small>}</label>
    <label><span>Owner 用户名 <b>*</b></span><Input value={form.ownerUsername} disabled={mode === 'edit'} onChange={(ownerUsername: string) => onChange({ ownerUsername })} placeholder="请输入 Owner 用户名" />{errors.ownerUsername && <small>{errors.ownerUsername}</small>}</label>
    {mode === 'create' && <><label><span>初始密码 <b>*</b></span><Input.Password value={form.password} onChange={(password: string) => onChange({ password })} placeholder="请输入初始密码" />{errors.password && <small>{errors.password}</small>}</label><label><span>确认密码 <b>*</b></span><Input.Password value={form.confirmPassword} onChange={(confirmPassword: string) => onChange({ confirmPassword })} placeholder="请再次输入密码" />{errors.confirmPassword && <small>{errors.confirmPassword}</small>}</label></>}
    <label><span>工作台权限 <b>*</b></span><Checkbox.Group className="ops-workspace-checkboxes" value={form.workspacePermissions} onChange={(value) => onChange({ workspacePermissions: value as TenantWorkspacePermission[] })}><Checkbox value="agents">AI Agents</Checkbox><Checkbox value="livechat">在线客服</Checkbox></Checkbox.Group>{errors.workspacePermissions && <small>{errors.workspacePermissions}</small>}</label>
    <div className="ops-switch-row"><span>状态</span><Switch checked={form.enabled} onChange={(enabled) => onChange({ enabled })} /></div>
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

