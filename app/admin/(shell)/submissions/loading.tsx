export default function AdminSubmissionsLoading() {
  return (
    <div className="max-w-container-max mx-auto space-y-6 animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <div className="h-8 w-44 bg-surface-container-high rounded-lg" />
        <div className="h-4 w-72 bg-surface-container-high rounded-lg" />
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 h-20" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/20 overflow-hidden">
        <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="h-10 w-64 bg-surface-container-high rounded-lg" />
          <div className="h-10 w-36 bg-surface-container-high rounded-lg" />
        </div>
        <div className="p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-container-high rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
