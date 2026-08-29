import type { HTMLAttributes } from "react";
import { cx } from "@utils/cx";
import "./style.css";

export type BrandLogoProps = HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "md" | "lg";
  layout?: "stack" | "inline";
  mark?: "coach" | "none";
};

export function BrandLogo({
  size = "md",
  layout = "inline",
  mark = "none",
  className,
  ...props
}: BrandLogoProps) {
  return (
    <div
      className={cx(
        "brand-logo",
        `brand-logo--${size}`,
        `brand-logo--${layout}`,
        className,
      )}
      {...props}
    >
      <span className="brand-logo__lockup" aria-label="traccia">
        <span className="brand-logo__word">
          tracci<span className="brand-logo__a">a</span>
        </span>
      </span>
      {mark === "coach" ? <span className="brand-logo__badge">Coach</span> : null}
    </div>
  );
}
