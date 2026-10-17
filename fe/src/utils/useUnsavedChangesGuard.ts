import { useEffect, useRef, useState } from "react";

const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

// Buttons that navigate in code (e.g. Logout) opt in with `data-leaves-page`.
const findLeavingElement = (event: MouseEvent): HTMLElement | null => {
  if (!(event.target instanceof Element)) {
    return null;
  }

  const element = event.target.closest("a[href], [data-leaves-page]");
  if (!(element instanceof HTMLElement)) {
    return null;
  }
  if (!(element instanceof HTMLAnchorElement)) {
    return element;
  }

  const opensElsewhere = element.target !== "" && element.target !== "_self";
  const isSameOrigin = element.origin === window.location.origin;
  return isSameOrigin && !opensElsewhere ? element : null;
};

/**
 * Asks before leaving a page with unsaved changes.
 * Covers in-app links (Indietro, sidebar, bottom nav), `data-leaves-page` buttons (Logout)
 * and closing or reloading the tab.
 * The browser back button is not covered: wouter has no way to block history navigation.
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const [blockedElement, setBlockedElement] = useState<HTMLElement | null>(null);
  // True only while the confirmed click is being dispatched again.
  const isLeavingRef = useRef(false);
  // A confirmed plain link loads a new document: the browser must not ask a second time.
  const isUnloadingRef = useRef(false);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isUnloadingRef.current) {
        return;
      }
      event.preventDefault();
    };

    // Capture phase on document runs before React's own listeners, so wouter's Link never sees the click.
    const handleLinkClick = (event: MouseEvent) => {
      const element = findLeavingElement(event);
      const shouldAsk = element !== null && isPlainLeftClick(event) && !isLeavingRef.current;
      if (!shouldAsk) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setBlockedElement(element);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [hasUnsavedChanges]);

  // Clicking the same element again lets wouter (or the button) navigate, whatever the router base is.
  // dispatchEvent is synchronous and returns false when a handler called preventDefault:
  // wouter's Link does, so only a link nobody handled loads a new document.
  const leavePage = () => {
    if (!blockedElement) {
      return;
    }

    setBlockedElement(null);
    isLeavingRef.current = true;
    const isNotHandled = blockedElement.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, view: window }),
    );
    isLeavingRef.current = false;
    isUnloadingRef.current = isNotHandled && blockedElement instanceof HTMLAnchorElement;
  };

  return {
    isLeaveDialogOpen: blockedElement !== null,
    leavePage,
    stayOnPage: () => setBlockedElement(null),
  };
}
