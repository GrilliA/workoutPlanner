import { useEffect, useRef, useState } from "react";

const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

const findInAppLink = (event: MouseEvent): HTMLAnchorElement | null => {
  if (!(event.target instanceof Element)) {
    return null;
  }

  const link = event.target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) {
    return null;
  }

  const opensElsewhere = link.target !== "" && link.target !== "_self";
  const isSameOrigin = link.origin === window.location.origin;
  return isSameOrigin && !opensElsewhere ? link : null;
};

/**
 * Asks before leaving a page with unsaved changes.
 * Covers in-app links (Indietro, sidebar, bottom nav) and closing or reloading the tab.
 * The browser back button is not covered: wouter has no way to block history navigation.
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const [blockedLink, setBlockedLink] = useState<HTMLAnchorElement | null>(null);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    // Capture phase on document runs before React's own listeners, so wouter's Link never sees the click.
    const handleLinkClick = (event: MouseEvent) => {
      const link = findInAppLink(event);
      const shouldAsk = link !== null && isPlainLeftClick(event) && !isLeavingRef.current;
      if (!shouldAsk) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setBlockedLink(link);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [hasUnsavedChanges]);

  // Clicking the same link again lets wouter navigate, whatever the router base is.
  const leavePage = () => {
    if (!blockedLink) {
      return;
    }

    isLeavingRef.current = true;
    setBlockedLink(null);
    blockedLink.click();
  };

  return {
    isLeaveDialogOpen: blockedLink !== null,
    leavePage,
    stayOnPage: () => setBlockedLink(null),
  };
}
