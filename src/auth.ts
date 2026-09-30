export const LOGIN_SESSION_KEY = 'im-support:demo-session';
export const STRONG_PASSWORD_MESSAGE = '密码至少12位，并需包含大写字母、小写字母、数字和特殊字符';
export const isStrongPassword = (value: string) =>
  value.length >= 12 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9\s]/.test(value);

export interface DemoSession { username: string }
export function readDemoSession(): DemoSession | null {
  try {
    const session = JSON.parse(sessionStorage.getItem(LOGIN_SESSION_KEY) ?? 'null');
    return typeof session?.username === 'string' && session.username.trim() ? { username: session.username.trim() } : null;
  } catch { return null; }
}
