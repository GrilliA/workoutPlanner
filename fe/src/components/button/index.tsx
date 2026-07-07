import "./style.css";

import {
  ButtonRoot,
  ButtonLabel,
  ButtonIcon,
  ButtonSpinner,
} from "./primitives";

export type {
  ButtonRootProps,
  ButtonLabelProps,
  ButtonIconProps,
  ButtonSpinnerProps,
} from "./primitives";

export type {
  ButtonVariant,
  ButtonSize,
  ButtonIconPosition,
} from "./context";

export const Button = {
  Root: ButtonRoot,
  Label: ButtonLabel,
  Icon: ButtonIcon,
  Spinner: ButtonSpinner,
};
