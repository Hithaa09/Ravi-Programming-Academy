export function StatCard({
  value, label, delta, icon,
}: { value: string | number; label: string; delta?: string; icon: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card flex items-start gap-4">
      <span className="material-symbols-outlined text-on-surface-variant text-[28px] shrink-0">{icon}</span>
      <div>
        <h3 className="font-headline-xl text-headline-xl text-on-surface leading-tight">{value}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-2">{label}</p>
        {delta && <p className="font-label-sm text-label-sm font-semibold text-emerald-600">{delta}</p>}
      </div>
    </div>
  );
}
