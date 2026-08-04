export default function SubmissionsLoading() {
  return (
    <div className="max-w-container-max mx-auto animate-pulse">
      <div className="h-8 w-44 bg-surface-container-high rounded-lg mb-8" />

      <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/20 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="h-10 w-64 bg-surface-container-high rounded-lg" />
          <div className="h-10 w-36 bg-surface-container-high rounded-lg" />
        </div>

        {/* Table */}
        <div className="p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-container-high rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
