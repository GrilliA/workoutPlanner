import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Android emette solo gli eventi "did"; su iOS "will" evita un frame di sovrapposizione. */
const SHOW_EVENT = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const HIDE_EVENT = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

/** Vero con la tastiera aperta: i bottoni flottanti si nascondono per non coprire i campi. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(SHOW_EVENT, () => setVisible(true));
    const hide = Keyboard.addListener(HIDE_EVENT, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
