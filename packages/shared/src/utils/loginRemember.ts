const REMEMBER_KEY = 'scan-goods-remember-login';

export interface RememberLoginPrefs {
  username: string;
  rememberMe: boolean;
}

export function loadRememberLogin(): RememberLoginPrefs | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberLoginPrefs & { branch?: string };
    if (!parsed.rememberMe) return null;
    return {
      username: parsed.username ?? '',
      rememberMe: true,
    };
  } catch {
    return null;
  }
}

export function saveRememberLogin(prefs: RememberLoginPrefs) {
  if (prefs.rememberMe) {
    localStorage.setItem(
      REMEMBER_KEY,
      JSON.stringify({
        username: prefs.username,
        rememberMe: true,
      }),
    );
    return;
  }
  localStorage.removeItem(REMEMBER_KEY);
}
