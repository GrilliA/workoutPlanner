import type { CSSProperties } from "react";
import { cx } from "@utils/cx";
import "./style.css";

export type SkeletonProps = {
  variant?: "block" | "text";
  width?: string | number;
  height?: string | number;
  className?: string;
};

export function Skeleton({
  variant = "block",
  width,
  height,
  className,
}: SkeletonProps) {
  const style: CSSProperties = {};

  if (width !== undefined) {
    style.width = typeof width === "number" ? `${width}px` : width;
  }

  if (height !== undefined) {
    style.height = typeof height === "number" ? `${height}px` : height;
  }

  return (
    <span
      className={cx("skeleton", variant, className)}
      style={style}
      aria-hidden="true"
    />
  );
}
