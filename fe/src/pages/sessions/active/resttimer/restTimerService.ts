/**
 * Web-only rest timer alerts (beep + vibrate).
 * Native notifications/haptics live in `mobile/` (Expo) after Capacitor removal.
 */
export const REST_TIMER_NOTIFICATION_ID = 9001;

const NOTIFICATION_TITLE = "Recupero finito";

const playWebBeep = (): void => {
  const AudioContextCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.25, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.45);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.45);

  void context.close();
};

const playWebVibrate = (): void => {
  navigator.vibrate?.([200, 100, 200]);
};

export async function initRestTimerNative(): Promise<void> {
  // No-op on web — native path is the Expo app in `/mobile`.
}

export function canScheduleNativeNotification(): boolean {
  return false;
}

export async function scheduleRestAlert(): Promise<void> {
  // Web cannot schedule reliable background local notifications without a service worker.
}

export async function cancelRestAlert(): Promise<void> {}

export async function triggerHaptic(): Promise<void> {}

export async function playRestDoneAlert(inForeground: boolean): Promise<void> {
  if (!inForeground) {
    return;
  }

  playWebBeep();
  playWebVibrate();
  void NOTIFICATION_TITLE;
}
