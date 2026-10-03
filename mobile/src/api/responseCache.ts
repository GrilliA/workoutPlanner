import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

export type CachePolicy = {
  ttlMs: number;
  persist?: boolean;
};

export const CACHE_SHORT: CachePolicy = { ttlMs: 60_000 };
export const CACHE_CATALOG: CachePolicy = {
  ttlMs: 7 * 24 * 3_600_000,
  persist: true,
};

type CachedEntry = {
  json: unknown;
  storedAt: number;
  persist: boolean;
};

const memory = new Map<string, CachedEntry>();
const inFlight = new Map<string, Promise<unknown>>();
let generation = 0;

const useDisk = (): boolean => Platform.OS !== "web";

const cacheDir = (): Directory => new Directory(Paths.cache, "api-cache");

const diskFileFor = (path: string): File =>
  new File(cacheDir(), `${encodeURIComponent(path)}.json`);

const isFresh = (entry: CachedEntry, ttlMs: number): boolean =>
  Date.now() - entry.storedAt < ttlMs;

async function readDiskEntry(path: string): Promise<CachedEntry | null> {
  if (!useDisk()) {
    return null;
  }

  try {
    const file = diskFileFor(path);
    if (!file.exists) {
      return null;
    }

    const parsed: unknown = JSON.parse(await file.text());
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const { storedAt, json } = parsed as { storedAt?: unknown; json?: unknown };
    if (typeof storedAt !== "number") {
      return null;
    }

    return { json, storedAt, persist: true };
  } catch {
    return null;
  }
}

function writeDiskEntry(path: string, entry: CachedEntry): void {
  if (!useDisk()) {
    return;
  }

  try {
    cacheDir().create({ intermediates: true, idempotent: true });
    const file = diskFileFor(path);
    file.create({ intermediates: true, overwrite: true });
    file.write(JSON.stringify({ storedAt: entry.storedAt, json: entry.json }));
  } catch {
    // Cache persistence is best-effort.
  }
}

function dropDiskEntry(path: string): void {
  if (!useDisk()) {
    return;
  }

  try {
    diskFileFor(path).delete();
  } catch {
    // Ignore missing files and IO errors.
  }
}

export function getCacheGeneration(): number {
  return generation;
}

export async function readCached(
  path: string,
  policy: CachePolicy,
): Promise<unknown | null> {
  const entry = memory.get(path);

  if (entry && isFresh(entry, policy.ttlMs)) {
    return entry.json;
  }

  if (!entry && policy.persist) {
    const diskEntry = await readDiskEntry(path);
    if (diskEntry && isFresh(diskEntry, policy.ttlMs)) {
      memory.set(path, diskEntry);
      return diskEntry.json;
    }
  }

  return null;
}

export async function readCachedStale(
  path: string,
  policy: CachePolicy,
): Promise<unknown | null> {
  const entry = memory.get(path);
  if (entry) {
    return entry.json;
  }

  if (policy.persist) {
    const diskEntry = await readDiskEntry(path);
    if (diskEntry) {
      memory.set(path, diskEntry);
      return diskEntry.json;
    }
  }

  return null;
}

export function writeCached(
  path: string,
  policy: CachePolicy,
  json: unknown,
  generationAtStart: number,
): void {
  if (generationAtStart !== generation) {
    return;
  }

  const entry: CachedEntry = {
    json,
    storedAt: Date.now(),
    persist: policy.persist === true,
  };
  memory.set(path, entry);

  if (policy.persist) {
    writeDiskEntry(path, entry);
  }
}

export function dropCached(path: string, policy: CachePolicy): void {
  memory.delete(path);

  if (policy.persist) {
    dropDiskEntry(path);
  }
}

export function dedupeRequest<T>(
  path: string,
  run: () => Promise<T>,
): Promise<T> {
  const pending = inFlight.get(path);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = run().finally(() => {
    inFlight.delete(path);
  });
  inFlight.set(path, promise);
  return promise;
}

export function clearApiCache(): void {
  generation += 1;
  inFlight.clear();

  for (const [path, entry] of memory) {
    if (!entry.persist) {
      memory.delete(path);
    }
  }
}
