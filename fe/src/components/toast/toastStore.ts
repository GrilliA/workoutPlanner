export type ToastMessage = {
  id: number;
  kind: "error" | "success";
  message: string;
};

type ToastListener = (toasts: ToastMessage[]) => void;

const DISMISS_MS = 4000;

let toasts: ToastMessage[] = [];
let nextId = 1;
const listeners = new Set<ToastListener>();

const emit = () => {
  listeners.forEach((listener) => listener(toasts));
};

const dismiss = (id: number) => {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
};

const push = (kind: ToastMessage["kind"], message: string) => {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  window.setTimeout(() => dismiss(id), DISMISS_MS);
};

export const toast = {
  error: (message: string) => {
    push("error", message);
  },
  success: (message: string) => {
    push("success", message);
  },
};

export const subscribeToasts = (listener: ToastListener): (() => void) => {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
};
