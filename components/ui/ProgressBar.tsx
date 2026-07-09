export function ProgressBar({ label, solved, total, color }: { label: string; solved: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((solved / total) * 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="font-body-md text-body-md font-medium text-on-surface">{label}</span>
        <span className="font-label-md text-label-md">
          <span style={{ color }}>{solved}</span> / {total}
        </span>
      </div>
      <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
