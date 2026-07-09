import clsx from "clsx";

interface SegmentedFilterProps<T extends string> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedFilter<T extends string>({ options, value, onChange }: SegmentedFilterProps<T>) {
  return (
    <div className="flex items-center gap-1.5 bg-surface-container-low rounded-lg p-1 border border-outline-variant/20">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={clsx(
            "px-3 py-1.5 rounded-md font-label-md text-label-md transition-colors",
            opt === value ? "bg-primary-container text-white shadow-sm" : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
