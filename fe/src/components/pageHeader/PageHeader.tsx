import type { ReactNode, Ref } from "react";
import "./style.css";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Lets a page move the focus to its title when the content that had it is replaced. */
  titleRef?: Ref<HTMLHeadingElement>;
};

export function PageHeader({ title, subtitle, action, titleRef }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1 ref={titleRef} tabIndex={titleRef ? -1 : undefined}>
          {title}
        </h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
