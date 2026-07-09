import clsx from "clsx";

type StreakFrequency = "daily" | "weekly" | "monthly";
type StreakBadgeSize = "sm" | "default" | "lg";

interface StreakBadgeProps {
  /** Streak length value */
  days: number;
  /** Streak frequency used for the unit label */
  frequency?: StreakFrequency;
  /** Optional caption shown below the count (defaults to "streak") */
  subtitle?: string;
  size?: StreakBadgeSize;
  className?: string;
}

const FREQUENCY_LABEL: Record<StreakFrequency, string> = { daily: "day", weekly: "week", monthly: "month" };

const SIZE_CLASSES: Record<StreakBadgeSize, { wrap: string; icon: string; value: string; unit: string; subtitle: string }> = {
  sm: { wrap: "gap-1 px-3 py-2", icon: "text-[22px]", value: "font-headline-md text-headline-md", unit: "font-label-sm text-label-sm", subtitle: "font-label-sm text-label-sm" },
  default: { wrap: "gap-2 px-5 py-4", icon: "text-[32px]", value: "font-headline-lg text-headline-lg", unit: "font-body-md text-body-md", subtitle: "font-body-md text-body-md" },
  lg: { wrap: "gap-3 px-6 py-5", icon: "text-[40px]", value: "font-headline-xl text-headline-xl", unit: "font-body-lg text-body-lg", subtitle: "font-body-lg text-body-lg" },
};

export function StreakBadge({ days, frequency = "daily", subtitle, size = "sm", className }: StreakBadgeProps) {
  const unit = days === 1 ? FREQUENCY_LABEL[frequency] : `${FREQUENCY_LABEL[frequency]}s`;
  const s = SIZE_CLASSES[size];

  return (
    <div
      role="status"
      aria-label={`${days} ${unit} streak`}
      className={clsx(
        "inline-flex flex-col items-center justify-center rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-card text-center",
        s.wrap,
        className
      )}
    >
      <span className={clsx("material-symbols-outlined shrink-0 text-[#FF7043]", s.icon)} aria-hidden="true">
        local_fire_department
      </span>
      <span className={clsx("leading-none text-on-surface font-bold", s.value)}>
        {days}
        <span className={clsx("ml-1 font-medium text-on-surface-variant", s.unit)}>{unit}</span>
      </span>
      <span className={clsx("text-on-surface-variant", s.subtitle)}>{subtitle ?? "streak"}</span>
    </div>
  );
}
