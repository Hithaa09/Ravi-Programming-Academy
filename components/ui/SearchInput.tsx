import { InputHTMLAttributes } from "react";
import clsx from "clsx";

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={clsx("relative group flex-1", className)}>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
        search
      </span>
      <input
        type="text"
        className="w-full bg-white border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-colors shadow-sm"
        {...props}
      />
    </div>
  );
}
