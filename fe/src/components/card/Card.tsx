import { useId, type ReactNode } from "react";
import { CardBase, type CardBaseProps } from "./CardBase";
import { CardTitle } from "./CardTitle";
import { CardMeta } from "./CardMeta";
import { CardTime } from "./CardTime";

export type CardProps = Omit<CardBaseProps, "children"> & {
  title: ReactNode;
  meta?: string;
  time?: string;
  dateTime?: string;
};

export function Card({
  title,
  meta,
  time,
  dateTime,
  labelledBy,
  ...baseProps
}: CardProps) {
  const generatedId = useId();
  const titleId = labelledBy ?? generatedId;

  return (
    <CardBase labelledBy={titleId} {...baseProps}>
      <CardTitle id={titleId}>{title}</CardTitle>
      {meta ? <CardMeta>{meta}</CardMeta> : null}
      {time ? <CardTime dateTime={dateTime}>{time}</CardTime> : null}
    </CardBase>
  );
}
