import { forwardRef } from "react";
import { ButtonBase, type ButtonBaseProps } from "./ButtonBase";
import { ButtonLabel } from "./ButtonLabel";

export type ButtonProps = ButtonBaseProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ children, ...props }, ref) {
    return (
      <ButtonBase {...props} ref={ref}>
        <ButtonLabel>{children}</ButtonLabel>
      </ButtonBase>
    );
  },
);
