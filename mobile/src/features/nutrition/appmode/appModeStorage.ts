import { parseStoredAppMode, type AppMode } from "./appMode";

/** Le due chiamate di expo-secure-store che servono (sessionStorage sul web). */
export type AppModeStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
};

/** Una chiave per utente: sullo stesso telefono un altro atleta non eredita la modalità. */
const storageKeyFor = (userId: number): string => `traccia.appMode.${userId}`;

/** Ultima modalità scelta; con un errore di lettura si parte in Allenamento. */
export async function readStoredAppMode(storage: AppModeStorage, userId: number): Promise<AppMode> {
  try {
    const storedValue = await storage.getItemAsync(storageKeyFor(userId));
    return parseStoredAppMode(storedValue);
  } catch {
    return "training";
  }
}

/** Un errore di scrittura non blocca il cambio: la scelta vale fino alla chiusura dell'app. */
export async function saveAppMode(
  storage: AppModeStorage,
  userId: number,
  mode: AppMode,
): Promise<void> {
  try {
    await storage.setItemAsync(storageKeyFor(userId), mode);
  } catch {
    // Keychain/Keystore non disponibile: non c'è nulla da mostrare all'atleta.
  }
}
