import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => Capacitor.isNativePlatform();

export const getPlatform = (): "ios" | "android" | "web" =>
  Capacitor.getPlatform() as "ios" | "android" | "web";
