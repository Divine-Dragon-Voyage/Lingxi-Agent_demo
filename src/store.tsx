import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { AppState, Agent, AgentConfig, Channel, Flow, Guard, KnowledgeDocument, Skill } from './types';
import { now, seedState } from './mockData';

type Action =
  | { type: 'agent.update'; id: string; patch: Partial<Agent> }
  | { type: 'agent.config'; id: string; config: AgentConfig }
  | { type: 'agent.publish'; id: string }
  | { type: 'agent.add'; agent: Agent }
  | { type: 'agent.delete'; id: string }
  | { type: 'document.add'; document: KnowledgeDocument }
  | { type: 'document.update'; id: string; patch: Partial<KnowledgeDocument> }
  | { type: 'document.delete'; id: string }
  | { type: 'skill.add'; skill: Skill }
  | { type: 'skill.toggle'; id: string; enabled: boolean }
  | { type: 'skill.delete'; id: string }
  | { type: 'channel.save'; channel: Channel }
  | { type: 'channel.toggle'; id: string; enabled: boolean }
  | { type: 'channel.delete'; id: string };

const STORAGE_KEY = 'lingxi-agent-prototype:v2:scenario-20260711';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'agent.update': return { ...state, agents: state.agents.map((item) => item.id === action.id ? { ...item, ...action.patch, updatedAt: now() } : item) };
    case 'agent.config': return { ...state, agents: state.agents.map((item) => item.id === action.id ? { ...item, draft: action.config, updatedAt: now() } : item) };
    case 'agent.publish': return { ...state, agents: state.agents.map((item) => item.id === action.id ? { ...item, status: 'published', published: clone(item.draft), updatedAt: now() } : item) };
    case 'agent.add': return { ...state, agents: [action.agent, ...state.agents] };
    case 'agent.delete': return { ...state, agents: state.agents.filter((item) => item.id !== action.id), channels: state.channels.filter((item) => item.agentId !== action.id) };
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
  try { const stored = localStorage.getItem(STORAGE_KEY); return stored ? JSON.parse(stored) : seedState; } catch { return seedState; }
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
