import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AppModeStorage } from "./appModeStorage";

/** expo-secure-store non ha un'implementazione web: l'anteprima web usa sessionStorage, come authStore. */
export const deviceAppModeStorage: AppModeStorage =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => sessionStorage.getItem(key),
        setItemAsync: async (key: string, value: string) => sessionStorage.setItem(key, value),
      }
    : SecureStore;
