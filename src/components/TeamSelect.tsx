import { Checkbox, Select } from './ui';
import type { Team } from '../types';

const TEAM_COLORS = ['#7b61d1', '#0e87d1', '#d17a00', '#00a870', '#d14f7b', '#5c6bc0'];

const colorForTeam = (team: Pick<Team, 'id'>) => TEAM_COLORS[Array.from(team.id).reduce((total, char) => total + char.charCodeAt(0), 0) % TEAM_COLORS.length];

export function TeamAvatar({ team, size = 32 }: { team: Pick<Team, 'id' | 'name'>; size?: number }) {
  return <span className="team-color-avatar" style={{ width: size, height: size, backgroundColor: colorForTeam(team) }}>{team.name.slice(0, 1).toUpperCase()}</span>;
}

export function TeamSelect({ teams, value, multiple = false, placeholder = '选择团队', onChange }: { teams: Team[]; value?: string | string[]; multiple?: boolean; placeholder?: string; onChange?: (value: string | string[]) => void }) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const allSelected = teams.length > 0 && selected.length === teams.length;
  const options = teams.map((team) => ({
    value: team.id,
    label: <span className="team-select-label"><TeamAvatar team={team} size={22} /><span className="team-select-name">{team.name}</span></span>,
  }));
  return <Select
    mode={multiple ? 'multiple' : undefined}
    value={value}
    allowClear
    showSearch
    placeholder={placeholder}
    options={options}
    filterOption={(input, option) => {
      const optionValue = (option.props as { value?: string }).value;
      return teams.find((team) => team.id === optionValue)?.name.toLowerCase().includes(input.toLowerCase()) ?? false;
    }}
    onChange={(next) => onChange?.(next as string | string[])}
    dropdownRender={(menu) => multiple ? <div className="team-select-dropdown"><button type="button" className="team-select-all" onMouseDown={(event) => event.preventDefault()} onClick={() => onChange?.(allSelected ? [] : teams.map((team) => team.id))}><Checkbox checked={allSelected} indeterminate={selected.length > 0 && !allSelected} />全选</button>{menu}</div> : menu}
  />;
}
