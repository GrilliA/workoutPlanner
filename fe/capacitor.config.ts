import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.traccia.app",
  appName: "TRACCIA",
  webDir: "dist",
  server: {
    // Allow http://127.0.0.1 for local API during native dev (Android + WebView).
    cleartext: true,
  },
  android: {
    // Edge-to-edge on Android 15+; pair with CSS safe-area insets.
    adjustMarginsForEdgeToEdge: "auto",
  },
  plugins: {
    SystemBars: {
      // Light icons on dark app chrome; inject --safe-area-inset-* on Android.
      insetsHandling: "css",
      style: "DARK",
      hidden: false,
      animation: "NONE",
    },
  },
};

export default config;
