type NavigateFn = (path: string) => void;

let navigate: NavigateFn | null = null;

export function setAppNavigator(fn: NavigateFn): void {
  navigate = fn;
}

export function navigateTo(path: string): void {
  navigate?.(path);
}
