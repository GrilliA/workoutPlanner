import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import {
  decodeSessionBundle,
  encodeSessionBundle,
  type SessionBundle,
} from "./sessionBundleCodec";

export type { SessionBundle } from "./sessionBundleCodec";

/**
 * One bundle per user, for the session opened last: in documents, not cache,
 * so the OS does not drop it while the athlete is offline.
 */
const userDir = (userId: number): Directory =>
  new Directory(Paths.document, "session", String(userId));

const bundleFile = (userId: number): File =>
  new File(userDir(userId), "bundle.json");

const useDisk = (): boolean => Platform.OS !== "web";

export async function readSessionBundle(
  userId: number,
  sessionId: number,
): Promise<SessionBundle | null> {
  if (!useDisk()) {
    return null;
  }

  try {
    const file = bundleFile(userId);

    if (!file.exists) {
      return null;
    }

    return decodeSessionBundle(await file.text(), sessionId);
  } catch {
    return null;
  }
}

/** Best effort: a failed write only means the next offline open has older data. */
export function saveSessionBundle(userId: number, bundle: SessionBundle): void {
  if (!useDisk()) {
    return;
  }

  try {
    userDir(userId).create({ intermediates: true, idempotent: true });
    const file = bundleFile(userId);
    file.create({ intermediates: true, overwrite: true });
    file.write(encodeSessionBundle(bundle));
  } catch {
    // Keep the screen working; the server stays the source of truth.
  }
}
