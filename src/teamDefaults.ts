import type { Team } from './types';

export const DEFAULT_TEAM_ID = '100000';
export const DEFAULT_TEAM_NAME = '通用';

export const isDefaultTeam = (team: Pick<Team, 'id' | 'builtin'>) => team.id === DEFAULT_TEAM_ID || Boolean(team.builtin);
