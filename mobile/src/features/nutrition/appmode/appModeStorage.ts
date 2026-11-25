import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { parseStoredAppMode, type AppMode } from "./appMode";

/** expo-secure-store non ha un'implementazione web: l'anteprima web usa sessionStorage, come authStore. */
const modeStorage =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => sessionStorage.getItem(key),
        setItemAsync: async (key: string, value: string) => sessionStorage.setItem(key, value),
      }
    : SecureStore;

/** Una chiave per utente: sullo stesso telefono un altro atleta non eredita la modalità. */
const storageKeyFor = (userId: number): string => `traccia.appMode.${userId}`;

/** Ultima modalità scelta; con un errore di lettura si parte in Allenamento. */
export async function readStoredAppMode(userId: number): Promise<AppMode> {
  try {
    const storedValue = await modeStorage.getItemAsync(storageKeyFor(userId));
    return parseStoredAppMode(storedValue);
  } catch {
    return "training";
  }
}

/** Un errore di scrittura non blocca il cambio: la scelta vale fino alla chiusura dell'app. */
export async function saveAppMode(userId: number, mode: AppMode): Promise<void> {
  try {
    await modeStorage.setItemAsync(storageKeyFor(userId), mode);
  } catch {
    // Keychain/Keystore non disponibile: non c'è nulla da mostrare all'atleta.
  }
}
