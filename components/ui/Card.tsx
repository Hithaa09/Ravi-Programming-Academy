import { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-card",
        className
      )}
      {...props}
    />
  );
}
