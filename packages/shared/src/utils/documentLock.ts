export interface DocumentLock {
  diKey: number;
  sessionId: string;
  username: string;
  lockedAt: string;
  expiresAt: string;
}

const STORAGE_KEY = 'packing-list-doc-locks';
const TTL_MS = 4 * 60 * 60 * 1000;

function readLocks(): DocumentLock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as DocumentLock[]) : [];
    const now = Date.now();
    return parsed.filter((lock) => new Date(lock.expiresAt).getTime() > now);
  } catch {
    return [];
  }
}

function writeLocks(locks: DocumentLock[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
}

export function getLockForDiKey(diKey: number): DocumentLock | null {
  return readLocks().find((lock) => lock.diKey === diKey) ?? null;
}

export function acquireDocumentLocks(
  diKeys: number[],
  sessionId: string,
  username: string,
  opts?: { force?: boolean },
): { ok: true } | { ok: false; conflicts: DocumentLock[] } {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS).toISOString();
  const locks = readLocks().filter((lock) => lock.sessionId === sessionId || !diKeys.includes(lock.diKey));

  const conflicts: DocumentLock[] = [];
  for (const diKey of diKeys) {
    const existing = locks.find((lock) => lock.diKey === diKey && lock.sessionId !== sessionId);
    if (existing && !opts?.force) {
      conflicts.push(existing);
    }
  }
  if (conflicts.length) return { ok: false, conflicts };

  const nextLocks = locks.filter((lock) => !diKeys.includes(lock.diKey) || lock.sessionId === sessionId);
  for (const diKey of diKeys) {
    nextLocks.push({
      diKey,
      sessionId,
      username,
      lockedAt: now.toISOString(),
      expiresAt,
    });
  }
  writeLocks(nextLocks);
  return { ok: true };
}

export function refreshDocumentLocks(diKeys: number[], sessionId: string) {
  const locks = readLocks();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS).toISOString();
  let changed = false;

  const next = locks.map((lock) => {
    if (lock.sessionId === sessionId && diKeys.includes(lock.diKey)) {
      changed = true;
      return { ...lock, expiresAt };
    }
    return lock;
  });

  if (changed) writeLocks(next);
}

export function releaseDocumentLocks(diKeys: number[], sessionId: string) {
  const locks = readLocks().filter(
    (lock) => !(lock.sessionId === sessionId && diKeys.includes(lock.diKey)),
  );
  writeLocks(locks);
}

export function releaseAllLocksForSession(sessionId: string) {
  writeLocks(readLocks().filter((lock) => lock.sessionId !== sessionId));
}
