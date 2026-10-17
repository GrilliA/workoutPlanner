import LottieView from "lottie-react-native";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export type MascotName = "waiting" | "sleeping" | "notebook";

const SOURCES = {
  waiting: require("../../../assets/lottie/waiting.json"),
  sleeping: require("../../../assets/lottie/sleeping.json"),
  notebook: require("../../../assets/lottie/notebook.json"),
} as const;

type MascotProps = {
  name: MascotName;
  size?: number;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Mascotte Lottie degli stati vuoti (fonti in `assets/lottie/CREDITS.md`). */
export function Mascot({ name, size = 200, loop = true, style }: MascotProps) {
  return (
    // Box della misura chiesta: su web il player Lottie altrimenti si allarga.
    <View style={[styles.frame, { width: size, height: size }, style]}>
      <LottieView
        source={SOURCES[name]}
        autoPlay
        loop={loop}
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
  },
});
