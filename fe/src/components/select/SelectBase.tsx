import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@utils/cx";
import { useFloatingListbox } from "@utils/useFloatingListbox";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectBaseProps = {
  id?: string;
  name?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
};

const LISTBOX_MAX_HEIGHT = 256;

const OPEN_KEYS = ["ArrowDown", "ArrowUp", "Enter", " "];

function movedIndex(key: string, current: number, count: number): number {
  const last = count - 1;
  if (key === "ArrowDown") return Math.min(current + 1, last);
  if (key === "ArrowUp") return Math.max(current - 1, 0);
  if (key === "Home") return 0;
  if (key === "End") return last;
  return current;
}

/** Next option whose label starts with the typed letter, wrapping after the current one. */
function typeaheadIndex(
  options: SelectOption[],
  letter: string,
  current: number,
): number {
  const startsWithLetter = (option: SelectOption) =>
    option.label.toLocaleLowerCase().startsWith(letter.toLocaleLowerCase());
  const after = options.findIndex(
    (option, index) => index > current && startsWithLetter(option),
  );
  if (after >= 0) return after;
  const fromStart = options.findIndex(startsWithLetter);
  return fromStart >= 0 ? fromStart : current;
}

export function SelectBase({
  id: idProp,
  name,
  value,
  options,
  onChange,
  placeholder = "Seleziona…",
  required,
  disabled = false,
  invalid = false,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: SelectBaseProps) {
  const generatedId = useId();
  const triggerId = idProp ?? generatedId;
  const listboxId = `${triggerId}-listbox`;
  const optionId = (index: number) => `${triggerId}-option-${index}`;

  const triggerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const attachListbox = useFloatingListbox(triggerRef, isOpen, {
    maxHeight: LISTBOX_MAX_HEIGHT,
  });

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex];

  const openListbox = () => {
    if (disabled) return;
    setActiveIndex(Math.max(selectedIndex, 0));
    setIsOpen(true);
  };

  const closeListbox = () => setIsOpen(false);

  const chooseOption = (index: number) => {
    const option = options[index];
    if (option) {
      onChange(option.value);
    }
    closeListbox();
  };

  useEffect(() => {
    if (!isOpen) return;
    const activeOption = document.getElementById(`${triggerId}-option-${activeIndex}`);
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex, triggerId]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (OPEN_KEYS.includes(event.key)) {
        event.preventDefault();
        openListbox();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeListbox();
      return;
    }
    if (event.key === "Tab") {
      closeListbox();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseOption(activeIndex);
      return;
    }

    const isLetter = event.key.length === 1 && !event.ctrlKey && !event.metaKey;
    const nextIndex = isLetter
      ? typeaheadIndex(options, event.key, activeIndex)
      : movedIndex(event.key, activeIndex, options.length);
    if (nextIndex !== activeIndex || isLetter) {
      event.preventDefault();
      setActiveIndex(nextIndex);
    }
  };

  const activeDescendant = isOpen ? optionId(activeIndex) : undefined;

  return (
    <div
      className={cx(
        "select-base",
        isOpen && "select-base--open",
        invalid && "select-base--error",
        disabled && "select-base--disabled",
        className,
      )}
    >
      <div
        ref={triggerRef}
        id={triggerId}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-activedescendant={activeDescendant}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-disabled={disabled || undefined}
        className="select-base__trigger"
        onClick={isOpen ? closeListbox : openListbox}
        onKeyDown={handleKeyDown}
        onBlur={closeListbox}
      >
        <span
          className={cx(
            "select-base__value",
            !selectedOption && "select-base__value--placeholder",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="select-base__chevron" aria-hidden="true" />
      </div>

      {isOpen ? (
        <div
          ref={attachListbox}
          id={listboxId}
          role="listbox"
          popover="manual"
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabel}
          className="select-base__listbox"
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={index === selectedIndex}
              className={cx(
                "select-base__option",
                index === activeIndex && "select-base__option--active",
              )}
              // Keep focus on the trigger so blur does not close the list before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(index)}
            >
              {option.label}
            </div>
          ))}
        </div>
      ) : null}

      {/* Lets the form's native `required` check and FormData see the value. */}
      <input
        className="select-base__native"
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        onChange={() => {}}
        onFocus={() => triggerRef.current?.focus()}
      />
    </div>
  );
}
