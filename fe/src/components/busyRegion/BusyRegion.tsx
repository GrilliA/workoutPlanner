import type { ReactNode } from "react";
import { cx } from "@utils/cx";
import "./style.css";

type BusyRegionProps = {
  busy: boolean;
  label?: string;
  children: ReactNode;
  className?: string;
};

export function BusyRegion({
  busy,
  label = "Caricamento…",
  children,
  className,
}: BusyRegionProps) {
  return (
    <div
      className={cx("busy-region", busy && "busy-region--busy", className)}
      aria-busy={busy || undefined}
    >
      <div className="busy-region__content">{children}</div>
      {busy ? (
        <div className="busy-region__overlay" role="status">
          <span className="busy-region__spinner" aria-hidden="true" />
          <span className="busy-region__label">{label}</span>
        </div>
      ) : null}
    </div>
  );
}
