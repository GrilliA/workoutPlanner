import {
  forwardRef,
  useCallback,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { cx } from "@utils/cx";
import {
  ButtonProvider,
  type ButtonContextValue,
  type ButtonSize,
  type ButtonVariant,
  type ButtonIconPosition,
} from "../context";

export type ButtonRootProps = Omit<ComponentPropsWithoutRef<"button">, "disabled"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
};

export const ButtonRoot = forwardRef<HTMLButtonElement, ButtonRootProps>(
  function ButtonRoot(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      type = "button",
      className,
      children,
      ...props
    },
    ref,
  ) {
    const [hasStartIcon, setHasStartIcon] = useState(false);
    const [hasEndIcon, setHasEndIcon] = useState(false);
    const isDisabled = disabled || loading;

    const registerIcon = useCallback((position: ButtonIconPosition) => {
      if (position === "start") {
        setHasStartIcon(true);
        return () => setHasStartIcon(false);
      }

      setHasEndIcon(true);
      return () => setHasEndIcon(false);
    }, []);

    const contextValue: ButtonContextValue = {
      variant,
      size,
      disabled: isDisabled,
      loading,
      hasStartIcon,
      hasEndIcon,
      registerIcon,
    };

    const rootClassName = cx(
      "button-root",
      `button-root--${variant}`,
      `button-root--${size}`,
      loading && "button-root--loading",
      isDisabled && "button-root--disabled",
      hasStartIcon && "button-root--with-start-icon",
      hasEndIcon && "button-root--with-end-icon",
      className,
    );

    return (
      <ButtonProvider value={contextValue}>
        <button
          ref={ref}
          type={type}
          disabled={isDisabled}
          aria-busy={loading || undefined}
          aria-disabled={isDisabled || undefined}
          className={rootClassName}
          {...props}
        >
          {children}
        </button>
      </ButtonProvider>
    );
  },
);
