import type { CSSProperties, ReactNode } from "react";
import { Link } from "wouter";
import { cx } from "@utils/cx";
import "./style.css";

export type CoachCardProps = {
  href?: string;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function CardChevron() {
  return (
    <span className="coach-card__chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          d="M9 6l6 6-6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function CoachCard({
  href,
  title,
  subtitle,
  children,
  className,
  style,
}: CoachCardProps) {
  const heading = title ? <h2>{title}</h2> : null;
  const description = subtitle ? <p>{subtitle}</p> : null;

  if (href) {
    return (
      <Link href={href} className={cx("coach-card", "coach-card--nav", className)} style={style}>
        <span className="coach-card__body">
          {heading}
          {description}
          {children}
        </span>
        <CardChevron />
      </Link>
    );
  }

  return (
    <div className={cx("coach-card", className)} style={style}>
      {heading}
      {description}
      {children}
    </div>
  );
}

export function CoachCardList({ children }: { children: ReactNode }) {
  return <div className="coach-card-list">{children}</div>;
}
