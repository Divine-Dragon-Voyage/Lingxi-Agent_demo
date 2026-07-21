import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { AppState, Agent, AgentConfig, Channel, Flow, Guard, KnowledgeDocument, Skill, Team, TeamMember } from './types';
import { now, seedState } from './mockData';
import { DEFAULT_TEAM_ID, DEFAULT_TEAM_NAME, isDefaultTeam } from './teamDefaults';

type Action =
  | { type: 'agent.update'; id: string; patch: Partial<Agent> }
  | { type: 'agent.config'; id: string; config: AgentConfig }
  | { type: 'agent.publish'; id: string }
  | { type: 'agent.add'; agent: Agent }
  | { type: 'agent.delete'; id: string }
  | { type: 'agent.assignTeams'; id: string; teamIds: string[] }
  | { type: 'team.save'; team: Team }
  | { type: 'team.delete'; id: string }
  | { type: 'document.add'; document: KnowledgeDocument }
  | { type: 'document.update'; id: string; patch: Partial<KnowledgeDocument> }
  | { type: 'document.delete'; id: string }
  | { type: 'skill.add'; skill: Skill }
  | { type: 'skill.toggle'; id: string; enabled: boolean }
  | { type: 'skill.delete'; id: string }
  | { type: 'channel.save'; channel: Channel }
  | { type: 'channel.toggle'; id: string; enabled: boolean }
  | { type: 'channel.delete'; id: string };

const STORAGE_KEY = 'lingxi-agent-prototype:v3:ai-customer-20260720';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const LEGACY_TEAM_IDS: Record<string, string> = { 'team-support': '100001', 'team-sales': '100002', 'team-vip': '100003' };

function keepDefaultTeam(state: AppState): AppState {
  const existing = state.teams.find(isDefaultTeam);
  const humanMembers = new Map<string, TeamMember>();
  state.teams.forEach((team) => team.members.filter((member) => member.kind === 'human').forEach((member) => humanMembers.set(member.id, member)));
  const aiMembers = state.agents.map<TeamMember>((agent) => ({ id: agent.id, kind: 'ai', name: agent.name, serviceId: `AI-${agent.id.slice(-6).toUpperCase()}`, avatar: agent.avatar, online: agent.status === 'published' && agent.acceptingChats, acceptingChats: agent.acceptingChats, priority: 'backup' }));
  const defaultTeam: Team = {
    id: DEFAULT_TEAM_ID,
    name: DEFAULT_TEAM_NAME,
    builtin: true,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: existing?.updatedAt ?? now(),
    members: [...humanMembers.values(), ...aiMembers],
  };
  return {
    ...state,
    agents: state.agents.map((agent) => ({ ...agent, teamIds: Array.from(new Set([DEFAULT_TEAM_ID, ...agent.teamIds])) })),
    teams: [defaultTeam, ...state.teams.filter((team) => !isDefaultTeam(team))],
  };
}

function normalizeTeamIds(state: AppState): AppState {
  const used = new Set<string>();
  const idMap = new Map<string, string>();
  let nextId = 100001;
  state.teams.forEach((team) => {
    const legacy = LEGACY_TEAM_IDS[team.id];
    let normalized = legacy || (/^\d+$/.test(team.id) ? team.id : '');
    if (!normalized || used.has(normalized)) {
      while (used.has(String(nextId))) nextId += 1;
      normalized = String(nextId++);
    }
    used.add(normalized);
    idMap.set(team.id, normalized);
  });
  const remap = (id?: string) => id ? (idMap.get(id) || LEGACY_TEAM_IDS[id] || id) : id;
  const remapConfig = (config: AgentConfig): AgentConfig => ({ ...config, transferToHuman: { ...config.transferToHuman, teamId: remap(config.transferToHuman.teamId) } });
  return keepDefaultTeam({
    ...state,
    teams: state.teams.map((team) => ({ ...team, id: remap(team.id)!, builtin: isDefaultTeam(team) || team.id === DEFAULT_TEAM_ID ? true : team.builtin })),
    agents: state.agents.map((agent) => ({
      ...agent,
      teamIds: Array.from(new Set(agent.teamIds.map((id) => remap(id)!).filter(Boolean))),
      draft: remapConfig(agent.draft),
      published: agent.published ? remapConfig(agent.published) : null,
    })),
  });
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'agent.update': {
      const agents = state.agents.map((item) => item.id === action.id ? { ...item, ...action.patch, updatedAt: now() } : item);
      const changed = agents.find((item) => item.id === action.id);
      return {
        ...state,
        agents,
        teams: changed ? state.teams.map((team) => ({ ...team, members: team.members.map((member) => member.kind === 'ai' && member.id === changed.id ? { ...member, name: changed.name, avatar: changed.avatar, acceptingChats: changed.acceptingChats, online: changed.status === 'published' && changed.acceptingChats } : member) })) : state.teams,
      };
    }
    case 'agent.config': return { ...state, agents: state.agents.map((item) => item.id === action.id ? { ...item, draft: action.config, updatedAt: now() } : item) };
    case 'agent.publish': return { ...state, agents: state.agents.map((item) => item.id === action.id ? { ...item, status: 'published', published: clone(item.draft), updatedAt: now() } : item) };
    case 'agent.add': {
      const agent = { ...action.agent, teamIds: Array.from(new Set([DEFAULT_TEAM_ID, ...action.agent.teamIds])) };
      const member: TeamMember = { id: agent.id, kind: 'ai', name: agent.name, serviceId: `AI-${agent.id.slice(-6).toUpperCase()}`, avatar: agent.avatar, online: false, acceptingChats: false, priority: 'backup' };
      return { ...state, agents: [agent, ...state.agents], teams: state.teams.map((team) => agent.teamIds.includes(team.id) ? { ...team, members: [...team.members, member], updatedAt: now() } : team) };
    }
    case 'agent.delete': return { ...state, agents: state.agents.filter((item) => item.id !== action.id), channels: state.channels.filter((item) => item.agentId !== action.id), teams: state.teams.map((team) => ({ ...team, members: team.members.filter((member) => member.id !== action.id) })) };
    case 'agent.assignTeams': {
      const agent = state.agents.find((item) => item.id === action.id);
      if (!agent) return state;
      const member: TeamMember = { id: agent.id, kind: 'ai', name: agent.name, serviceId: `AI-${agent.id.slice(-6).toUpperCase()}`, avatar: agent.avatar, online: agent.status === 'published' && agent.acceptingChats, acceptingChats: agent.acceptingChats, priority: 'backup' };
      return {
        ...state,
        agents: state.agents.map((item) => item.id === action.id ? { ...item, teamIds: Array.from(new Set([DEFAULT_TEAM_ID, ...action.teamIds])), updatedAt: now() } : item),
        teams: state.teams.map((team) => [DEFAULT_TEAM_ID, ...action.teamIds].includes(team.id) ? { ...team, members: team.members.some((item) => item.id === agent.id) ? team.members : [...team.members, member], updatedAt: now() } : { ...team, members: team.members.filter((item) => item.id !== agent.id), updatedAt: now() }),
      };
    }
    case 'team.save': {
      if (isDefaultTeam(action.team)) return keepDefaultTeam(state);
      const previous = state.teams.find((item) => item.id === action.team.id);
      const teams = previous ? state.teams.map((item) => item.id === action.team.id ? action.team : item) : [action.team, ...state.teams];
      const memberIds = new Set(action.team.members.filter((member) => member.kind === 'ai').map((member) => member.id));
      const previousIds = new Set(previous?.members.filter((member) => member.kind === 'ai').map((member) => member.id) ?? []);
      return {
        ...state,
        teams,
        agents: state.agents.map((agent) => {
          if (!memberIds.has(agent.id) && !previousIds.has(agent.id)) return agent;
          const teamIds = memberIds.has(agent.id) ? Array.from(new Set([...agent.teamIds, action.team.id])) : agent.teamIds.filter((id) => id !== action.team.id);
          return { ...agent, teamIds, updatedAt: now() };
        }),
      };
    }
    case 'team.delete': return action.id === DEFAULT_TEAM_ID ? state : { ...state, teams: state.teams.filter((item) => item.id !== action.id), agents: state.agents.map((agent) => ({ ...agent, teamIds: agent.teamIds.filter((id) => id !== action.id) })) };
    case 'document.add': return { ...state, documents: [action.document, ...state.documents] };
    case 'document.update': return { ...state, documents: state.documents.map((item) => item.id === action.id ? { ...item, ...action.patch, updatedAt: now() } : item) };
    case 'document.delete': return { ...state, documents: state.documents.filter((item) => item.id !== action.id), agents: state.agents.map((item) => ({ ...item, draft: { ...item.draft, knowledgeIds: item.draft.knowledgeIds.filter((id) => id !== action.id) }, published: item.published ? { ...item.published, knowledgeIds: item.published.knowledgeIds.filter((id) => id !== action.id) } : null })) };
    case 'skill.add': return { ...state, skills: [action.skill, ...state.skills] };
    case 'skill.toggle': return { ...state, skills: state.skills.map((item) => item.id === action.id ? { ...item, enabled: action.enabled, updatedAt: now() } : item), agents: action.enabled ? state.agents : state.agents.map((item) => ({ ...item, draft: { ...item.draft, skillIds: item.draft.skillIds.filter((id) => id !== action.id) }, published: item.published ? { ...item.published, skillIds: item.published.skillIds.filter((id) => id !== action.id) } : null })) };
    case 'skill.delete': return { ...state, skills: state.skills.filter((item) => item.id !== action.id), agents: state.agents.map((item) => ({ ...item, draft: { ...item.draft, skillIds: item.draft.skillIds.filter((id) => id !== action.id) }, published: item.published ? { ...item.published, skillIds: item.published.skillIds.filter((id) => id !== action.id) } : null })) };
    case 'channel.save': return { ...state, channels: state.channels.some((item) => item.id === action.channel.id) ? state.channels.map((item) => item.id === action.channel.id ? action.channel : item) : [action.channel, ...state.channels] };
    case 'channel.toggle': return { ...state, channels: state.channels.map((item) => item.id === action.id ? { ...item, enabled: action.enabled, updatedAt: now() } : item) };
    case 'channel.delete': return { ...state, channels: state.channels.filter((item) => item.id !== action.id) };
    default: return state;
  }
}

function loadState(): AppState {
  try { const stored = localStorage.getItem(STORAGE_KEY); return normalizeTeamIds(stored ? JSON.parse(stored) : seedState); } catch { return normalizeTeamIds(seedState); }
}

const StoreContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useAppStore must be used inside AppProvider');
  return context;
}

export const updateAgentConfig = (id: string, current: AgentConfig, patch: Partial<AgentConfig>) => ({ type: 'agent.config' as const, id, config: { ...current, ...patch } });
export const updateFlow = (config: AgentConfig, flow: Flow) => ({ ...config, flows: config.flows.map((item) => item.id === flow.id ? flow : item) });
export const updateGuards = (config: AgentConfig, guards: Guard[]) => ({ ...config, guards });
