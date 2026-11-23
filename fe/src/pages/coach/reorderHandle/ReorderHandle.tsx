import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import "./style.css";

export type ReorderHandleProps = {
  /** The item's name: the handle reads "Sposta <label>". */
  label: string;
  index: number;
  count: number;
  onMove: (fromIndex: number, toIndex: number) => void;
};

type PointerDrag = {
  pointerId: number;
  startY: number;
  startScrollY: number;
  lastY: number;
  dropSpot: number;
  item: HTMLElement;
  list: HTMLElement;
  frame: number;
  cancelOnEscape: (event: globalThis.KeyboardEvent) => void;
};

// Near the top or bottom edge of the viewport the page scrolls, faster closer to the edge.
const AUTOSCROLL_EDGE = 64;
const AUTOSCROLL_MAX_STEP = 16;
// VoiceOver swallows a message set while focus is being restored after the move.
const ANNOUNCE_DELAY_MS = 400;

const itemsOf = (list: HTMLElement): HTMLElement[] =>
  Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-reorder-item]"));

/**
 * Before which item the dragged one would land: the first whose layout midpoint is below the
 * pointer, or the end. Layout positions ignore the dragged item's translate.
 */
function dropSpotAt(list: HTMLElement, clientY: number): number {
  const pointerY = clientY - list.getBoundingClientRect().top;
  const items = itemsOf(list);
  const spot = items.findIndex((item) => item.offsetTop + item.offsetHeight / 2 > pointerY);

  return spot === -1 ? items.length : spot;
}

/** The index the item ends up at when dropped before `dropSpot`. */
const targetIndexOf = (fromIndex: number, dropSpot: number): number =>
  dropSpot > fromIndex ? dropSpot - 1 : dropSpot;

function showDropMarker(list: HTMLElement, fromIndex: number, dropSpot: number): void {
  const items = itemsOf(list);
  items.forEach((item) => item.removeAttribute("data-reorder-drop"));

  const isInPlace = targetIndexOf(fromIndex, dropSpot) === fromIndex;
  if (isInPlace || items.length === 0) {
    return;
  }

  if (dropSpot < items.length) {
    items[dropSpot].setAttribute("data-reorder-drop", "before");
    return;
  }

  items[items.length - 1].setAttribute("data-reorder-drop", "after");
}

const autoscrollStep = (clientY: number): number => {
  if (clientY < AUTOSCROLL_EDGE) {
    return -Math.ceil(((AUTOSCROLL_EDGE - clientY) / AUTOSCROLL_EDGE) * AUTOSCROLL_MAX_STEP);
  }

  const distanceFromBottom = window.innerHeight - clientY;
  if (distanceFromBottom < AUTOSCROLL_EDGE) {
    return Math.ceil(((AUTOSCROLL_EDGE - distanceFromBottom) / AUTOSCROLL_EDGE) * AUTOSCROLL_MAX_STEP);
  }

  return 0;
};

/**
 * Drag handle of a reorderable list (guide `drag-and-drop`). The list carries
 * `data-reorder-list`, each item `data-reorder-item`.
 * Pointer: drag the handle, a marker shows where the item lands, it moves once on release;
 * Esc cancels. Keyboard: Space or Enter picks the item up, the arrows move it, Space, Enter
 * or leaving the handle drops it, Esc puts it back.
 */
export function ReorderHandle({ label, index, count, onMove }: ReorderHandleProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<PointerDrag | null>(null);
  const hintId = useId();
  const [grabbedFrom, setGrabbedFrom] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Set by this handle's own moves: React reinserting the item blurs the handle.
  const isMovingRef = useRef(false);
  const previousIndexRef = useRef(index);
  const isGrabbed = grabbedFrom !== null;

  useEffect(() => {
    if (previousIndexRef.current === index) {
      return;
    }

    previousIndexRef.current = index;

    if (!isMovingRef.current) {
      return;
    }

    isMovingRef.current = false;
    const item = buttonRef.current?.closest<HTMLElement>("[data-reorder-item]");
    item?.scrollIntoView({ block: "nearest" });
    buttonRef.current?.focus({ preventScroll: true });
    setAnnouncement("");
    const timer = window.setTimeout(
      () => setAnnouncement(`${label} in posizione ${index + 1} di ${count}`),
      ANNOUNCE_DELAY_MS,
    );

    return () => window.clearTimeout(timer);
  }, [index, count, label]);

  // The item shows it is picked up. A list inside an item (foods in a meal) has its own
  // handles, so the item is marked by its own handle and not found by `:has()`.
  useEffect(() => {
    const item = buttonRef.current?.closest<HTMLElement>("[data-reorder-item]");

    if (!isGrabbed || !item) {
      return;
    }

    item.setAttribute("data-reorder-grabbed", "");
    return () => item.removeAttribute("data-reorder-grabbed");
  }, [isGrabbed]);

  // Unmounted mid-drag (the list reloaded): stop the scroll loop and the Esc listener.
  useEffect(
    () => () => {
      const drag = dragRef.current;
      if (drag !== null) {
        window.cancelAnimationFrame(drag.frame);
        document.removeEventListener("keydown", drag.cancelOnEscape);
        document.documentElement.classList.remove("is-reordering");
      }
    },
    [],
  );

  const moveTo = (toIndex: number) => {
    if (toIndex === index || toIndex < 0 || toIndex >= count) {
      return;
    }

    isMovingRef.current = true;
    onMove(index, toIndex);
  };

  const followPointer = (drag: PointerDrag) => {
    const scrolled = window.scrollY - drag.startScrollY;
    drag.item.style.translate = `0 ${drag.lastY - drag.startY + scrolled}px`;
    drag.dropSpot = dropSpotAt(drag.list, drag.lastY);
    showDropMarker(drag.list, index, drag.dropSpot);
  };

  const autoscroll = () => {
    const drag = dragRef.current;
    if (drag === null) {
      return;
    }

    const step = autoscrollStep(drag.lastY);
    if (step !== 0) {
      window.scrollBy(0, step);
      followPointer(drag);
    }
    drag.frame = window.requestAnimationFrame(autoscroll);
  };

  const endDrag = (shouldMove: boolean) => {
    const drag = dragRef.current;
    if (drag === null) {
      return;
    }

    dragRef.current = null;
    window.cancelAnimationFrame(drag.frame);
    document.removeEventListener("keydown", drag.cancelOnEscape);
    document.documentElement.classList.remove("is-reordering");
    drag.item.removeAttribute("data-reorder-dragging");
    drag.item.style.translate = "";
    itemsOf(drag.list).forEach((item) => item.removeAttribute("data-reorder-drop"));

    if (shouldMove) {
      moveTo(targetIndexOf(index, drag.dropSpot));
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const item = event.currentTarget.closest<HTMLElement>("[data-reorder-item]");
    const list = item?.closest<HTMLElement>("[data-reorder-list]");
    const isPrimary = event.button === 0 && event.isPrimary;

    if (!isPrimary || dragRef.current !== null || !item || !list || count < 2) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    item.setAttribute("data-reorder-dragging", "");
    document.documentElement.classList.add("is-reordering");
    const cancelOnEscape = (keyEvent: globalThis.KeyboardEvent) => {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        endDrag(false);
        setAnnouncement(`Spostamento di ${label} annullato`);
      }
    };
    document.addEventListener("keydown", cancelOnEscape);
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollY: window.scrollY,
      lastY: event.clientY,
      dropSpot: index,
      item,
      list,
      frame: window.requestAnimationFrame(autoscroll),
      cancelOnEscape,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }

    drag.lastY = event.clientY;
    followPointer(drag);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      endDrag(true);
    }
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      endDrag(false);
    }
  };

  // Only keyboard activation (detail 0) toggles the grab: a pointer press is a drag.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0 || count < 2) {
      return;
    }

    if (isGrabbed) {
      setGrabbedFrom(null);
      setAnnouncement(`${label} lasciato in posizione ${index + 1} di ${count}`);
      return;
    }

    setGrabbedFrom(index);
    setAnnouncement(`${label} preso. Frecce su e giù per spostarlo, Spazio per lasciarlo, Esc per annullare`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isGrabbed) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveTo(index - 1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveTo(index + 1);
      return;
    }

    if (event.key === "Escape" && grabbedFrom !== null) {
      event.preventDefault();
      moveTo(grabbedFrom);
      setGrabbedFrom(null);
      setAnnouncement(`Spostamento di ${label} annullato`);
    }
  };

  const handleBlur = () => {
    if (isGrabbed && !isMovingRef.current) {
      setGrabbedFrom(null);
    }
  };

  const hint = isGrabbed
    ? "Frecce per spostare · Spazio per lasciare · Esc per annullare"
    : "Trascina, oppure Spazio e frecce";

  return (
    <span className="reorder-handle">
      <button
        ref={buttonRef}
        type="button"
        className="reorder-handle__button"
        aria-label={`Sposta ${label}`}
        aria-describedby={hintId}
        aria-pressed={isGrabbed}
        disabled={count < 2}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </button>
      <span id={hintId} className="reorder-handle__hint">
        {hint}
      </span>
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </span>
  );
}
