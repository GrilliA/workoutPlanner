import { useId, type HTMLAttributes } from "react";
import { cx } from "@utils/cx";
import "./style.css";

export type BrandLogoProps = HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "md" | "lg";
  layout?: "stack" | "inline";
  mark?: "coach" | "none";
};

function BrandMark({ gradientId }: { gradientId: string }) {
  return (
    <svg
      className="brand-logo__mark"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="12" x2="56" y2="52">
          <stop offset="0%" stopColor="#c7f464" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
      </defs>
      <path
        d="M10 18c8-2 18-3 27-2 4 .4 8 1.4 11 3.2"
        stroke={`url(#${gradientId})`}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M32 16.5c.4 8 .8 18 1.2 28.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M44 18.5c4.5 1.8 8.5 5 10.5 9.5 1.4 3.2 1.2 6.4-.6 9.2-1.5 2.3-3.8 3.8-6.4 4.4"
        stroke={`url(#${gradientId})`}
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path d="M48.2 40.2 58 34.8l-2.2 11.2z" fill={`url(#${gradientId})`} />
    </svg>
  );
}

export function BrandLogo({
  size = "md",
  layout = "inline",
  mark = "none",
  className,
  ...props
}: BrandLogoProps) {
  const gradientId = `brand-mark-${useId().replace(/:/g, "")}`;

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
        <BrandMark gradientId={gradientId} />
        <span className="brand-logo__word">
          tracci<span className="brand-logo__a">a</span>
        </span>
      </span>
      {mark === "coach" ? <span className="brand-logo__badge">Coach</span> : null}
    </div>
  );
}
