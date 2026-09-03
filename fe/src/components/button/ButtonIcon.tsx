import { forwardRef, type ReactNode } from "react";
import { cx } from "@utils/cx";
import { ButtonBase, type ButtonBaseProps } from "./ButtonBase";

export type ButtonIconProps = Omit<ButtonBaseProps, "children"> & {
  children: ReactNode;
  "aria-label": string;
};

export const ButtonIcon = forwardRef<HTMLButtonElement, ButtonIconProps>(
  function ButtonIcon({ children, className, ...props }, ref) {
    return (
      <ButtonBase
        {...props}
        ref={ref}
        className={cx("button-base--icon", className)}
      >
        <span className="button-icon" aria-hidden="true">
          {children}
        </span>
      </ButtonBase>
    );
  },
);
