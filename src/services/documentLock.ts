import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DocumentLock {
  diKey: number;
  sessionId: string;
  username: string;
  lockedAt: string;
  expiresAt: string;
}

const STORAGE_KEY = 'packing-list-doc-locks';
const TTL_MS = 4 * 60 * 60 * 1000;

async function readLocks(): Promise<DocumentLock[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as DocumentLock[]) : [];
    const now = Date.now();
    return parsed.filter((lock) => new Date(lock.expiresAt).getTime() > now);
  } catch {
    return [];
  }
}

async function writeLocks(locks: DocumentLock[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
}

export async function acquireDocumentLocks(
  diKeys: number[],
  sessionId: string,
  username: string,
  opts?: { force?: boolean },
): Promise<{ ok: true } | { ok: false; conflicts: DocumentLock[] }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS).toISOString();
  const locks = (await readLocks()).filter(
    (lock) => lock.sessionId === sessionId || !diKeys.includes(lock.diKey),
  );

  const conflicts: DocumentLock[] = [];
  for (const diKey of diKeys) {
    const existing = locks.find(
      (lock) => lock.diKey === diKey && lock.sessionId !== sessionId,
    );
    if (existing && !opts?.force) {
      conflicts.push(existing);
    }
  }
  if (conflicts.length) return { ok: false, conflicts };

  const nextLocks = locks.filter(
    (lock) => !diKeys.includes(lock.diKey) || lock.sessionId === sessionId,
  );
  for (const diKey of diKeys) {
    nextLocks.push({
      diKey,
      sessionId,
      username,
      lockedAt: now.toISOString(),
      expiresAt,
    });
  }
  await writeLocks(nextLocks);
  return { ok: true };
}

export async function releaseDocumentLocks(diKeys: number[], sessionId: string) {
  const locks = (await readLocks()).filter(
    (lock) => !(lock.sessionId === sessionId && diKeys.includes(lock.diKey)),
  );
  await writeLocks(locks);
}

export async function releaseAllLocksForSession(sessionId: string) {
  await writeLocks((await readLocks()).filter((lock) => lock.sessionId !== sessionId));
}
