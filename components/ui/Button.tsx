import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "danger" | "danger-outline" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary-container text-white hover:bg-primary-container/90 shadow-sm",
  secondary: "bg-white text-on-surface border border-outline-variant/40 hover:bg-surface-container-low",
  danger: "bg-error text-white hover:bg-error/90 shadow-sm",
  "danger-outline": "bg-white text-error border border-error/40 hover:bg-error/5",
  ghost: "text-on-surface-variant hover:bg-surface-container-highest/50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-label-md text-label-md font-medium transition-colors",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
