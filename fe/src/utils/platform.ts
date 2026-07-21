/** Web client always runs in the browser. Native shell is `mobile/` (Expo). */
export const isNative = (): boolean => false;

export const getPlatform = (): "ios" | "android" | "web" => "web";
