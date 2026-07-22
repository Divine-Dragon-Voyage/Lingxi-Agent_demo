import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Avatar, Button, Checkbox, Dropdown, Empty, Input, Menu, Message, Modal, Space, Table } from '../components/ui';
import { IconCheck, IconCopy, IconDelete, IconDown, IconEdit, IconMore, IconPlus, IconSearch } from '@arco-design/web-react/icon';
import { useNavigate, useParams } from 'react-router-dom';
import { TeamAvatar } from '../components/TeamSelect';
import { PageHeader } from '../components/PageHeader';
import { now } from '../mockData';
import { useAppStore } from '../store';
import { isDefaultTeam } from '../teamDefaults';
import type { Team, TeamMember } from '../types';

type Candidate = TeamMember;

const humanStaff: Candidate[] = [
  { id: 'staff-lin', kind: 'human', name: '林雨', serviceId: 'CS-10021', online: true, acceptingChats: true, priority: 'primary' },
  { id: 'staff-wang', kind: 'human', name: '王涵', serviceId: 'CS-10036', online: false, acceptingChats: false, priority: 'backup' },
  { id: 'staff-zhou', kind: 'human', name: '周宁', serviceId: 'CS-10052', online: true, acceptingChats: true, priority: 'primary' },
  { id: 'staff-chen', kind: 'human', name: '陈嘉', serviceId: 'CS-10068', online: true, acceptingChats: true, priority: 'primary' },
  { id: 'staff-liu', kind: 'human', name: '刘璇', serviceId: 'CS-10073', online: true, acceptingChats: true, priority: 'backup' },
];

const copyTeam = (team: Team): Team => JSON.parse(JSON.stringify(team));
const initials = (name: string) => name.slice(0, 1).toUpperCase();

const nextTeamId = (teams: Team[]) => {
  const ids = teams.map((team) => Number(team.id)).filter((value) => Number.isFinite(value));
  return String(Math.max(100000, ...ids) + 1);
};

function MemberIdentity({ member }: { member: TeamMember }) {
  return <div className="team-member-identity"><Avatar className={member.kind === 'ai' ? 'team-member-avatar ai' : 'team-member-avatar'}>{member.avatar ? <img src={member.avatar} alt="" /> : initials(member.name)}</Avatar><span><strong>{member.name}</strong><small>{member.serviceId}</small></span></div>;
}

function resolveCandidates(state: ReturnType<typeof useAppStore>['state'], excludedIds: string[]) {
  const aiMembers: Candidate[] = state.agents.map((agent) => ({ id: agent.id, kind: 'ai', name: agent.name, serviceId: `AI-${agent.id.slice(-6).toUpperCase()}`, avatar: agent.avatar, online: agent.status === 'published' && agent.acceptingChats, acceptingChats: agent.acceptingChats, priority: 'backup' }));
  return [...humanStaff, ...aiMembers].filter((member) => !excludedIds.includes(member.id));
}

function MemberSelector({ candidates, selected, onChange }: { candidates: Candidate[]; selected: string[]; onChange: (selected: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'human' | 'ai'>('all');
  const [query, setQuery] = useState('');
  const visibleCandidates = candidates.filter((candidate) => (tab === 'all' || candidate.kind === (tab === 'human' ? 'human' : 'ai')) && `${candidate.name}${candidate.serviceId}`.toLowerCase().includes(query.toLowerCase()));
  const allSelected = candidates.length > 0 && candidates.every((candidate) => selected.includes(candidate.id));
  const partiallySelected = selected.some((id) => candidates.some((candidate) => candidate.id === id)) && !allSelected;
  const toggle = (id: string, checked: boolean) => onChange(checked ? [...selected, id] : selected.filter((item) => item !== id));
  return <div className="member-selector">
    <Button type="text" className="member-selector-trigger" onClick={() => setOpen((current) => !current)} aria-expanded={open}><span className={selected.length ? '' : 'muted'}>{selected.length ? `已选择 ${selected.length} 名成员` : '请选择成员'}</span><IconDown className={open ? 'open' : ''} /></Button>
    {open && <div className="member-selector-popover">
      <Input prefix={<IconSearch />} value={query} placeholder="搜索成员" allowClear onChange={setQuery} />
      <div className="member-picker-tabs"><Button type="text" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>全部</Button><Button type="text" className={tab === 'human' ? 'active' : ''} onClick={() => setTab('human')}>人工客服</Button><Button type="text" className={tab === 'ai' ? 'active' : ''} onClick={() => setTab('ai')}>AI客服</Button></div>
      <label className="member-picker-select-all"><Checkbox checked={allSelected} indeterminate={partiallySelected} onChange={(checked) => onChange(checked ? candidates.map((candidate) => candidate.id) : [])} />全选</label>
      <div className="member-picker-list">{visibleCandidates.length ? visibleCandidates.map((member) => <label className="member-picker-row" key={member.id}><Checkbox checked={selected.includes(member.id)} onChange={(checked) => toggle(member.id, checked)} /><MemberIdentity member={member} /></label>) : <Empty description="未找到匹配成员" />}</div>
    </div>}
  </div>;
}

function CandidatePicker({ visible, title, excludedIds, onCancel, onConfirm }: { visible: boolean; title: string; excludedIds: string[]; onCancel: () => void; onConfirm: (members: Candidate[]) => void }) {
  const { state } = useAppStore();
  const [selected, setSelected] = useState<string[]>([]);
  const candidates = useMemo(() => resolveCandidates(state, excludedIds), [state, excludedIds]);
  useEffect(() => { if (visible) setSelected([]); }, [visible]);
  return <Modal visible={visible} title={title} className="member-picker-modal" width={640} onCancel={onCancel} footer={<Space><Button onClick={onCancel}>取消</Button><Button type="primary" disabled={!selected.length} onClick={() => onConfirm(candidates.filter((member) => selected.includes(member.id)))}>添加</Button></Space>}><div className="team-modal-members"><label className="team-field-label">选择成员</label><MemberSelector candidates={candidates} selected={selected} onChange={setSelected} /></div></Modal>;
}

function TeamCreateModal({ visible, onCancel, onCreated }: { visible: boolean; onCancel: () => void; onCreated: (team: Team) => void }) {
  const { state, dispatch } = useAppStore();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const candidates = useMemo(() => resolveCandidates(state, []), [state]);
  useEffect(() => { if (visible) { setName(''); setSelected([]); } }, [visible]);
  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const timestamp = now();
    const team: Team = { id: nextTeamId(state.teams), name: trimmed, createdAt: timestamp, updatedAt: timestamp, members: candidates.filter((member) => selected.includes(member.id)) };
    dispatch({ type: 'team.save', team });
    onCreated(team);
  };
  return <Modal visible={visible} title="新建团队" className="team-create-modal" width={640} onCancel={onCancel} footer={<Space><Button onClick={onCancel}>取消</Button><Button type="primary" disabled={!name.trim()} onClick={save}>创建团队</Button></Space>}>
    <div className="team-create-form"><div className="team-create-field"><label className="team-field-label">团队名称</label><Input value={name} maxLength={32} showWordLimit placeholder="请输入团队名称" onChange={setName} /></div>
    <div className="team-modal-members"><label className="team-field-label">选择成员</label><MemberSelector candidates={candidates} selected={selected} onChange={setSelected} /></div></div>
  </Modal>;
}

function TeamCreatedModal({ team, onClose, onCreateAnother }: { team?: Team; onClose: () => void; onCreateAnother: () => void }) {
  return <Modal visible={Boolean(team)} title={null} footer={null} className="team-created-modal" width={480} onCancel={onClose}>
    <div className="team-created-result">
      <span className="team-created-icon" aria-hidden="true"><IconCheck /></span>
      <h2>「{team?.name}」创建成功</h2>
      <p>已成功添加 {team?.members.length ?? 0} 名团队成员</p>
      <div className="team-created-actions"><Button onClick={onCreateAnother}>继续创建</Button><Button type="primary" onClick={onClose}>完成</Button></div>
    </div>
  </Modal>;
}

export function TeamsPage() {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [createVisible, setCreateVisible] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<Team>();
  const [deletingTeam, setDeletingTeam] = useState<Team>();
  const [copiedId, setCopiedId] = useState<string>();
  const teams = state.teams.filter((team) => team.name.includes(query.trim())).sort((left, right) => Number(isDefaultTeam(right)) - Number(isDefaultTeam(left)));
  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => current === id ? undefined : current), 1600);
    } catch {
      setCopiedId(undefined);
    }
  };
  const requestDeleteTeam = (team: Team) => {
    const usedBy = state.agents.find((agent) => agent.draft.transferToHuman.mode === 'specified' && agent.draft.transferToHuman.teamId === team.id);
    if (usedBy) { Message.warning(`AI客服「${usedBy.name}」正在转至该团队，请先修改其转人工设置。`); return; }
    setDeletingTeam(team);
  };
  const confirmDeleteTeam = () => {
    if (!deletingTeam) return;
    dispatch({ type: 'team.delete', id: deletingTeam.id });
    setDeletingTeam(undefined);
    Message.success('团队已删除');
  };
  const columns = [
    { title: '名称', dataIndex: 'name', render: (_: unknown, team: Team) => <button className="team-name-cell" onClick={() => navigate(`/teams/${team.id}`)}><TeamAvatar team={team} /><span><strong>{team.name}</strong><small>{team.members.length} 名成员</small></span></button> },
    { title: 'ID', dataIndex: 'id', render: (id: string) => <span className="team-id-cell"><span className="mono muted">{id}</span><Button type="text" className={`team-id-copy${copiedId === id ? ' copied' : ''}`} icon={copiedId === id ? <IconCheck /> : <IconCopy />} aria-label={copiedId === id ? `已复制团队 ID ${id}` : `复制团队 ID ${id}`} title={copiedId === id ? '已复制' : '复制 ID'} onClick={(event: MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); void copyId(id); }} /></span> },
    { title: '在线成员', key: 'accepting', render: (_: unknown, team: Team) => <span>{team.members.filter((member) => member.acceptingChats && member.online).length}/{team.members.length}</span> },
    { title: '操作', key: 'actions', align: 'right' as const, render: (_: unknown, team: Team) => <Dropdown droplist={<Menu onClickMenuItem={(key) => key === 'edit' ? navigate(`/teams/${team.id}`) : requestDeleteTeam(team)}><Menu.Item key="edit"><IconEdit />编辑</Menu.Item>{!isDefaultTeam(team) && <Menu.Item key="delete" className="danger-menu-item"><IconDelete />删除</Menu.Item>}</Menu>}><Button type="text" icon={<IconMore />} aria-label={`更多操作：${team.name}`} /></Dropdown> },
  ];
  return <section className="module-page page-content team-page"><PageHeader title="团队" actions={<Button type="primary" icon={<IconPlus />} onClick={() => setCreateVisible(true)}>新建团队</Button>} /><div className="filter-bar"><Input className="module-search" prefix={<IconSearch />} placeholder="搜索团队" value={query} onChange={setQuery} /></div><Table rowKey="id" columns={columns} data={teams} pagination={false} /><TeamCreateModal visible={createVisible} onCancel={() => setCreateVisible(false)} onCreated={(team) => { setCreateVisible(false); setCreatedTeam(team); }} /><TeamCreatedModal team={createdTeam} onClose={() => setCreatedTeam(undefined)} onCreateAnother={() => { setCreatedTeam(undefined); setCreateVisible(true); }} /><Modal visible={Boolean(deletingTeam)} title="删除团队？" className="team-delete-modal" width={480} okText="删除" cancelText="取消" okButtonProps={{ status: 'danger' }} onCancel={() => setDeletingTeam(undefined)} onOk={confirmDeleteTeam}><div className="team-delete-content"><p>删除后将无法恢复，但不会删除团队中的客服。</p><p>确定删除「<strong>{deletingTeam?.name}</strong>」吗？</p></div></Modal></section>;
}

export function TeamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const current = state.teams.find((team) => team.id === id);
  const [draft, setDraft] = useState<Team | null>(current ? copyTeam(current) : null);
  const [query, setQuery] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  useEffect(() => { setDraft(current ? copyTeam(current) : null); }, [current]);
  if (!current || !draft) return <section className="module-page page-content"><div className="module-page-body"><Empty description="团队不存在" /><Button onClick={() => navigate('/teams')}>返回团队列表</Button></div></section>;
  const defaultTeam = isDefaultTeam(current);
  const dirty = JSON.stringify(current) !== JSON.stringify(draft);
  const displayMembers = draft.members.filter((member) => member.name.includes(query.trim()));
  const remove = (memberId: string) => setDraft((team) => team ? { ...team, members: team.members.filter((member) => member.id !== memberId) } : team);
  const addMembers = (members: Candidate[]) => { setDraft((team) => team ? { ...team, members: [...team.members, ...members] } : team); setPickerVisible(false); };
  const columns = [
    { title: '名称', dataIndex: 'name', render: (_: unknown, member: TeamMember) => <MemberIdentity member={member} /> },
    { title: '', key: 'remove', align: 'right' as const, render: (_: unknown, member: TeamMember) => !defaultTeam && <Button type="text" icon={<IconDelete />} aria-label={`移除${member.name}`} onClick={() => remove(member.id)} /> },
  ];
  return <section className="module-page page-content team-page team-detail-page"><div className="team-detail-nav"><Button type="text" onClick={() => navigate('/teams')}>← 返回</Button></div><div className="team-detail-editor"><section className="team-basic-info"><TeamAvatar team={draft} size={56} /><div><label className="team-field-label">名称</label><Input value={draft.name} maxLength={32} disabled={defaultTeam} onChange={(name) => setDraft((team) => team ? { ...team, name } : team)} /></div></section><section className="team-members-section"><div className="team-members-head"><h2>{draft.members.length} 名成员</h2>{!defaultTeam && <Button type="primary" icon={<IconPlus />} onClick={() => setPickerVisible(true)}>添加成员</Button>}</div><div className="team-members-tools"><Input className="module-search" prefix={<IconSearch />} placeholder="搜索团队成员" value={query} onChange={setQuery} /></div><Table rowKey="id" columns={columns} data={displayMembers} pagination={false} /></section></div>{dirty && <div className="team-sticky-actions"><Button onClick={() => setDraft(copyTeam(current))}>取消</Button><Button type="primary" onClick={() => { dispatch({ type: 'team.save', team: { ...draft, updatedAt: now() } }); }}>保存</Button></div>}<CandidatePicker visible={pickerVisible} title="添加成员" excludedIds={draft.members.map((member) => member.id)} onCancel={() => setPickerVisible(false)} onConfirm={addMembers} /></section>;
}
