function memberInitial(username: string): string {
  return (username.trim()[0] || '?').toUpperCase();
}

function memberTone(username: string): number {
  return username.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;
}

export function MemberAvatar({ username, size = 28 }: { username: string; size?: number }) {
  return <span className={`member-avatar tone-${memberTone(username)}`} style={{ width: size, height: size }} aria-hidden>{memberInitial(username)}</span>;
}
