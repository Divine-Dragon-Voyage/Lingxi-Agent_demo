import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Drawer, Input, Message, Modal, Table, Tree } from '../components/ui';
import { IconPlus } from '@arco-design/web-react/icon';
import { useAppStore } from '../store';
import { now } from '../mockData';
import { currentMember, expandToLeaves, MENU_TREE } from '../permissions';
import { MemberAvatar } from '../components/MemberAvatar';
import { SettingsLayout } from './SettingsPage';
import type { TenantRole } from '../types';

const newRoleId = () => `role-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function RoleManagementPage() {
  const { state, dispatch } = useAppStore();
  const toast = Message;
  const me = currentMember(state)!;
  const roles = state.roles.filter((role) => role.id !== 'role-owner');
  const [form, setForm] = useState<null | { mode: 'create' } | { mode: 'edit' | 'view'; role: TenantRole }>(null);
  const [membersRole, setMembersRole] = useState<TenantRole | null>(null);
  const [deleteRole, setDeleteRole] = useState<TenantRole | null>(null);

  const membersOf = (roleId: string) => state.members.filter((member) => member.roleId === roleId);

  const removeRole = (role: TenantRole) => {
    const count = membersOf(role.id).length;
    if (count > 0) {
      Message.error(`该角色正在被${count}名成员使用，请先调整成员角色后再删除。`);
      return;
    }
    setDeleteRole(role);
  };

  return <SettingsLayout active="roles" title="角色管理" action={<Button type="primary" onClick={() => setForm({ mode: 'create' })}><IconPlus />创建角色</Button>}>
    <div className="settings-content is-wide">
      <Table className="member-table role-table" rowKey="id" dataSource={roles} pagination={false} columns={[
        { title: '角色名称', width: '40%', render: (_: unknown, role: TenantRole) => <span className="member-name">{role.name}</span> },
        {
          title: '授权用户',
          width: '35%',
          render: (_: unknown, role: TenantRole) => {
            const count = membersOf(role.id).length;
            return count > 0
              ? <span className="role-member-count"><span>{count}</span><Button type="text" className="member-count-button" onClick={() => setMembersRole(role)}>查看用户</Button></span>
              : <span className="member-count-zero">未关联</span>;
          },
        },
        {
          title: '操作',
          width: '25%',
          render: (_: unknown, role: TenantRole) => role.builtin
            ? <Button type="text" className="member-action-button" onClick={() => setForm({ mode: 'view', role })}>查看</Button>
            : <span className="member-action-group"><Button type="text" className="member-action-button" onClick={() => setForm({ mode: 'edit', role })}>编辑</Button><Button type="text" status="danger" className="member-action-button" onClick={() => removeRole(role)}>删除</Button></span>,
        },
      ]} />
    </div>
    {form && <RoleFormDrawer form={form} roles={state.roles} onClose={() => setForm(null)} />}
    {membersRole && <RoleMembersModal role={membersRole} members={membersOf(membersRole.id)} meId={me.id} onClose={() => setMembersRole(null)} />}
    <Modal open={Boolean(deleteRole)} title="删除角色？" okText="删除" cancelText="取消" okButtonProps={{ status: 'danger' }} onCancel={() => setDeleteRole(null)} onOk={() => { if (deleteRole) { dispatch({ type: 'role.delete', id: deleteRole.id }); toast.success('角色已删除'); } setDeleteRole(null); }} destroyOnHidden>
      <p className="member-modal-text">{deleteRole?.name} 将从角色列表中移除，此操作不可恢复。</p>
    </Modal>
  </SettingsLayout>;
}

function RoleFormDrawer({ form, roles, onClose }: { form: { mode: 'create' } | { mode: 'edit' | 'view'; role: TenantRole }; roles: TenantRole[]; onClose: () => void }) {
  const { dispatch } = useAppStore();
  const toast = Message;
  const isCreate = form.mode === 'create';
  const isView = form.mode === 'view';
  const role = form.mode !== 'create' ? form.role : null;
  const [name, setName] = useState(role?.name ?? '');
  const [menuKeys, setMenuKeys] = useState<string[]>(role?.menuKeys ?? []);
  const [error, setError] = useState('');
  const treeWrapRef = useRef<HTMLDivElement | null>(null);

  const treeData = useMemo(() => MENU_TREE.map((node) => ({
    key: node.key,
    title: node.label,
    children: node.children?.map((child) => ({ key: child.key, title: child.label, children: child.children?.map((leaf) => ({ key: leaf.key, title: leaf.label })) })),
  })), []);

  const sameKeys = (a: string[], b: string[]) => a.length === b.length && a.every((key) => b.includes(key));
  const dirty = isView ? false : isCreate ? Boolean(name.trim() && menuKeys.length) : (name.trim() !== role?.name.trim() || !sameKeys(menuKeys, role?.menuKeys ?? []));
  const halfCheckedKeys = useMemo(() => MENU_TREE.flatMap((node) => {
    const groups = [node, ...(node.children ?? [])];
    return groups.flatMap((group) => {
      if (!group.children?.length) return [];
      const leafKeys = group.children.flatMap((child) => child.children?.map((leaf) => leaf.key) ?? [child.key]);
      const checkedCount = leafKeys.filter((key) => menuKeys.includes(key)).length;
      return checkedCount > 0 && checkedCount < leafKeys.length ? [group.key] : [];
    });
  }), [menuKeys]);

  useEffect(() => {
    const syncIndeterminate = () => {
      const inputs = treeWrapRef.current?.querySelectorAll<HTMLInputElement>('input') ?? [];
      inputs.forEach((input) => {
        input.indeterminate = halfCheckedKeys.includes(input.value);
      });
    };
    syncIndeterminate();
    const frameId = window.requestAnimationFrame(syncIndeterminate);
    return () => window.cancelAnimationFrame(frameId);
  }, [halfCheckedKeys]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) setError('请输入角色名称');
    else if (trimmed === 'Owner') setError('Owner为系统角色名称，请使用其他名称');
    else if (trimmed === '超级管理员' && role?.name !== '超级管理员') setError('超级管理员为系统角色名称，请使用其他名称');
    else if (roles.some((item) => item.id !== role?.id && item.name.trim().toLowerCase() === trimmed.toLowerCase())) setError('角色名称已存在，请重新输入');
    else if (!menuKeys.length) setError('请至少勾选一个菜单权限');
    else setError('');
    if (!trimmed || trimmed === 'Owner' || trimmed === '超级管理员' || !menuKeys.length || roles.some((item) => item.id !== role?.id && item.name.trim().toLowerCase() === trimmed.toLowerCase())) return;
    if (isCreate) {
      dispatch({ type: 'role.add', role: { id: newRoleId(), name: trimmed, menuKeys, createdAt: now() } });
      toast.success('角色已创建');
    } else if (role) {
      dispatch({ type: 'role.update', id: role.id, patch: { name: trimmed, menuKeys } });
      toast.success('已保存，权限已立即生效');
    }
    onClose();
  };

  return <Drawer open title={isCreate ? '创建角色' : isView ? '查看角色' : '编辑角色'} width={480} onCancel={onClose}
    footer={isView ? <div className="member-drawer-footer"><Button type="primary" onClick={onClose}>关闭</Button></div> : <div className="member-drawer-footer"><Button onClick={onClose}>取消</Button><Button type="primary" disabled={!dirty} onClick={submit}>{isCreate ? '创建' : '保存'}</Button></div>}>
    <div className="member-form" key={role?.id ?? 'new-role'}>
      <label className="member-form-label" htmlFor="role-name">角色名称<span className="member-form-required">*</span></label>
      <Input id="role-name" value={name} onChange={(value: string) => { setName(value); setError(''); }} placeholder="请输入角色名称" error={Boolean(error && error !== '请至少勾选一个菜单权限')} disabled={isView} />
      {error && error !== '请至少勾选一个菜单权限' && <div className="member-form-error" role="alert">{error}</div>}
      <label className="member-form-label">菜单权限<span className="member-form-required">*</span></label>
      <div className="permission-tree-wrap" ref={treeWrapRef}>
        <Tree checkable selectable={false} blockNode treeData={treeData} defaultCheckedKeys={menuKeys} onCheck={(keys: string[]) => { if (!isView) setMenuKeys(expandToLeaves(keys)); }} disabled={isView} />
      </div>
      {error === '请至少勾选一个菜单权限' && <div className="member-form-error" role="alert">{error}</div>}
      <div className="member-form-hint">仅配置页面级访问权限，勾选后该角色可使用页面全部功能。</div>
    </div>
  </Drawer>;
}

function RoleMembersModal({ role, members, meId, onClose }: { role: TenantRole; members: import('../types').TenantMember[]; meId: string; onClose: () => void }) {
  const ordered = [...members.filter((member) => member.id === meId), ...members.filter((member) => member.id !== meId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))];
  return <Modal open title={`${role.name} - 授权用户`} okText="关闭" hideCancel onCancel={onClose} onOk={onClose} destroyOnHidden>
    {ordered.length ? <div className="member-drawer-list member-modal-list">
      {ordered.map((member) => <div className="member-drawer-item" key={member.id}><MemberAvatar username={member.username} size={32} /><span className="member-name">{member.username}{member.id === meId && <span className="member-you">（你）</span>}</span></div>)}
    </div> : null}
  </Modal>;
}
