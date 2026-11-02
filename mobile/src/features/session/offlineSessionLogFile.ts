import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import {
  decodeOfflineSessionLog,
  encodeOfflineSessionLog,
  type OfflineSessionLog,
} from "./offlineSessionLog";

/**
 * One log per user, next to the session bundle. It holds sets not yet on the
 * server, so it lives in documents and logout (authStore.clear) leaves it.
 * Deleted once the server stored the close.
 */
const userDir = (userId: number): Directory =>
  new Directory(Paths.document, "session", String(userId));

const logFile = (userId: number): File =>
  new File(userDir(userId), "offline-log.json");

const useDisk = (): boolean => Platform.OS !== "web";

/** The log saved for this user, whatever session it is for. */
export async function readOfflineSessionLog(
  userId: number,
): Promise<OfflineSessionLog | null> {
  if (!useDisk()) {
    return null;
  }

  try {
    const file = logFile(userId);

    if (!file.exists) {
      return null;
    }

    return decodeOfflineSessionLog(await file.text());
  } catch {
    return null;
  }
}

/**
 * Write to a temporary file, then move it over the log: an app killed halfway
 * leaves the previous log whole instead of a broken one.
 */
export function saveOfflineSessionLog(
  userId: number,
  log: OfflineSessionLog,
): void {
  if (!useDisk()) {
    return;
  }

  userDir(userId).create({ intermediates: true, idempotent: true });
  const temporaryFile = new File(userDir(userId), "offline-log.json.tmp");
  temporaryFile.create({ intermediates: true, overwrite: true });
  temporaryFile.write(encodeOfflineSessionLog(log));
  temporaryFile.moveSync(logFile(userId), { overwrite: true });
}

export function deleteOfflineSessionLog(userId: number): void {
  if (!useDisk()) {
    return;
  }

  try {
    const file = logFile(userId);

    if (file.exists) {
      file.delete();
    }
  } catch {
    // A leftover log is replaced when the next session saves its own.
  }
}
