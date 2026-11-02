import { useEffect, useRef, type RefObject } from "react";

const LISTBOX_GAP = 4;
const VIEWPORT_MARGIN = 8;

export type FloatingListboxOptions = {
  maxHeight: number;
  /** Same width as the trigger; otherwise the list may grow wider than it. */
  matchTriggerWidth?: boolean;
};

type ListboxPlacement = {
  left: number;
  width: number;
  maxHeight: number;
  top: number | null;
  bottom: number | null;
};

/** Under the trigger, or above it when the space below is too short. */
function listboxPlacement(
  triggerRect: DOMRect,
  viewportHeight: number,
  maxHeight: number,
): ListboxPlacement {
  const spaceBelow = viewportHeight - triggerRect.bottom - LISTBOX_GAP - VIEWPORT_MARGIN;
  const spaceAbove = triggerRect.top - LISTBOX_GAP - VIEWPORT_MARGIN;
  const opensUpward = spaceBelow < maxHeight && spaceAbove > spaceBelow;
  const availableHeight = opensUpward ? spaceAbove : spaceBelow;
  const placement = {
    left: triggerRect.left,
    width: triggerRect.width,
    maxHeight: Math.min(maxHeight, availableHeight),
  };

  if (opensUpward) {
    return { ...placement, top: null, bottom: viewportHeight - triggerRect.top + LISTBOX_GAP };
  }
  return { ...placement, top: triggerRect.bottom + LISTBOX_GAP, bottom: null };
}

const toPixels = (value: number | null) => (value === null ? "auto" : `${value}px`);

function placeListbox(
  listbox: HTMLElement,
  trigger: HTMLElement,
  { maxHeight, matchTriggerWidth = false }: FloatingListboxOptions,
): void {
  const placement = listboxPlacement(
    trigger.getBoundingClientRect(),
    window.innerHeight,
    maxHeight,
  );
  const width = toPixels(placement.width);

  listbox.style.left = toPixels(placement.left);
  listbox.style.top = toPixels(placement.top);
  listbox.style.bottom = toPixels(placement.bottom);
  listbox.style.maxHeight = toPixels(placement.maxHeight);
  listbox.style.minWidth = width;
  listbox.style.width = matchTriggerWidth ? width : "";
}

// Top layer so `overflow: hidden` and transformed ancestors cannot clip the list.
function showAsPopover(listbox: HTMLElement): void {
  const canShowPopover = "showPopover" in listbox;
  if (canShowPopover && !listbox.matches(":popover-open")) {
    listbox.showPopover();
  }
}

/**
 * Pins a `popover="manual"` listbox to its trigger with fixed coordinates and keeps it
 * there while the page scrolls or resizes (on phones the keyboard resizes the viewport).
 * Returns the ref callback for the listbox; render the listbox only while it is open.
 */
export function useFloatingListbox(
  triggerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  { maxHeight, matchTriggerWidth = false }: FloatingListboxOptions,
): (listbox: HTMLElement | null) => void {
  const listboxRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const followTrigger = () => {
      const listbox = listboxRef.current;
      const trigger = triggerRef.current;
      if (listbox && trigger) {
        placeListbox(listbox, trigger, { maxHeight, matchTriggerWidth });
      }
    };
    window.addEventListener("scroll", followTrigger, true);
    window.addEventListener("resize", followTrigger);
    return () => {
      window.removeEventListener("scroll", followTrigger, true);
      window.removeEventListener("resize", followTrigger);
    };
  }, [isOpen, triggerRef, maxHeight, matchTriggerWidth]);

  // Runs on every render (new callback each time), so the list follows layout changes too.
  return (listbox) => {
    listboxRef.current = listbox;
    const trigger = triggerRef.current;
    if (!listbox || !trigger) return;
    placeListbox(listbox, trigger, { maxHeight, matchTriggerWidth });
    showAsPopover(listbox);
  };
}
