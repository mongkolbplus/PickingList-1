export type AppRole = 'admin' | 'user';

const ADMIN_USERS_KEY = 'packing-list-admin-users';

function readAdminUsers(): string[] {
  try {
    const raw = localStorage.getItem(ADMIN_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function getAdminUsers(): string[] {
  return readAdminUsers();
}

export function setAdminUsers(usernames: string[]) {
  const normalized = [...new Set(usernames.map((u) => u.trim()).filter(Boolean))];
  localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(normalized));
}

export function getUserRole(username: string | null | undefined): AppRole {
  if (!username?.trim()) return 'user';
  const admins = readAdminUsers();
  if (!admins.length) return 'admin';
  return admins.some((u) => u.toLowerCase() === username.trim().toLowerCase())
    ? 'admin'
    : 'user';
}

export function canAccessSettings(role: AppRole) {
  return role === 'admin';
}

export function canForceUnlock(role: AppRole) {
  return role === 'admin';
}

export function canClosePartial(_role: AppRole) {
  return true;
}
