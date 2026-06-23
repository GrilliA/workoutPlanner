import "./input.css";

import {
  InputRoot,
  InputLabel,
  InputField,
  InputControl,
  InputAddon,
  InputHelper,
  InputError,
} from "./primitives";

export type {
  InputRootProps,
  InputLabelProps,
  InputFieldProps,
  InputControlProps,
  InputAddonProps,
  InputHelperProps,
  InputErrorProps,
} from "./primitives";

export const Input = {
  Root: InputRoot,
  Label: InputLabel,
  Field: InputField,
  Control: InputControl,
  Addon: InputAddon,
  Helper: InputHelper,
  Error: InputError,
};
