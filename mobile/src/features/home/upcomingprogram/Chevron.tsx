import Svg, { Path } from "react-native-svg";
import { colors } from "../../../theme";

/** Freccia "apri" delle righe toccabili. */
export function Chevron() {
  return (
    <Svg width={9} height={15} viewBox="0 0 9 15" fill="none" accessibilityElementsHidden>
      <Path
        d="M1.5 1.5l6 6-6 6"
        stroke={colors.text}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
