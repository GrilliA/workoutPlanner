import { useEffect, useRef, type RefObject } from "react";

/**
 * A button that is disabled while it works drops the focus on the page body. When the work
 * is done the focus goes back to the button, unless the user already moved it elsewhere.
 */
export function useFocusBackAfterPending(
  buttonRef: RefObject<HTMLElement | null>,
  isPending: boolean,
): void {
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true;
      return;
    }

    if (!wasPendingRef.current) {
      return;
    }

    wasPendingRef.current = false;
    const isFocusLost = document.activeElement === document.body || document.activeElement === null;

    if (isFocusLost) {
      buttonRef.current?.focus();
    }
  }, [buttonRef, isPending]);
}
