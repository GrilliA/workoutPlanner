import { useEffect } from "react";
import { useLocation } from "wouter";
import { initRestTimerNative } from "@pages/sessions/active/resttimer/restTimerService";
import { setAppNavigator } from "@utils/appNavigation";

export function NativeBootstrap() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setAppNavigator(setLocation);
    void initRestTimerNative();
  }, [setLocation]);

  return null;
}
