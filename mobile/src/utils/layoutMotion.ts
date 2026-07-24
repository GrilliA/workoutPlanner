import { LayoutAnimation, Platform, UIManager } from "react-native";

let androidEnabled = false;

function ensureAndroidLayoutAnimations() {
  if (androidEnabled || Platform.OS !== "android") {
    return;
  }
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  androidEnabled = true;
}

/** Soft insert/remove for list rows (esercizi, giorni, timer). */
export function animateLayoutSoft() {
  ensureAndroidLayoutAnimations();
  LayoutAnimation.configureNext({
    duration: 220,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
}
