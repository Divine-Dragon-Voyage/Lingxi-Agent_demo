export type Status = 'draft' | 'published';
export type KnowledgeStatus = 'adding' | 'success' | 'failed';
export type SessionStatus = 'active' | 'ended' | 'human' | 'error';

export interface Flow {
  id: string;
  name: string;
  trigger: string;
  content: string;
  contentHtml: string;
  updatedAt: string;
}

export interface Guard {
  id: string;
  name: string;
  prompt: string;
  action: 'end' | 'fixed';
  fixedReply: string;
  enabled: boolean;
  updatedAt: string;
}

export interface EnvironmentVariable {
  id: string;
  name: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface AgentConfig {
  prompt: string;
  language: string;
  style: string;
  memoryEnabled: boolean;
  memoryDays: number | 'permanent';
  historyRounds: number;
  errorMessage: string;
  transferToHuman: TransferToHumanConfig;
  flows: Flow[];
  skillIds: string[];
  knowledgeIds: string[];
  guards: Guard[];
  variables: EnvironmentVariable[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  teamIds: string[];
  acceptingChats: boolean;
  status: Status;
  updatedAt: string;
  draft: AgentConfig;
  published: AgentConfig | null;
}

export interface TransferToHumanConfig {
  enabled: boolean;
  mode: 'automatic' | 'specified';
  teamId?: string;
}

export type TeamMemberKind = 'human' | 'ai';
export type TeamPriority = 'primary' | 'backup';

export interface TeamMember {
  id: string;
  kind: TeamMemberKind;
  name: string;
  serviceId: string;
  avatar?: string;
  online: boolean;
  acceptingChats: boolean;
  priority: TeamPriority;
}

export interface Team {
  id: string;
  name: string;
  builtin?: boolean;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
}

export interface KnowledgeDocument {
  id: string;
  type: string;
  name: string;
  source: string;
  size?: number;
  creator: string;
  status: KnowledgeStatus;
  content: string;
  createdAt?: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  agentId: string;
  enabled: boolean;
  accountId: string;
  accessToken: string;
  receiveGroups: string[];
  humanGroups: string[];
  opening: string;
  hotQuestions: string[];
  ending: string;
  humanEnabled: boolean;
  humanFallback: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  title: string;
  channel: string;
  agentId: string;
  startedAt: string;
  messageCount: number;
  status: SessionStatus;
  hits: string[];
  messages: { role: 'user' | 'agent' | 'system'; content: string }[];
}

export interface AppState {
  demoDataVersion?: number;
  agents: Agent[];
  teams: Team[];
  documents: KnowledgeDocument[];
  skills: Skill[];
  channels: Channel[];
  sessions: Session[];
}
