export default function AdminLeaderboardLoading() {
  return (
    <div className="max-w-container-max mx-auto space-y-6 animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <div className="h-8 w-40 bg-surface-container-high rounded-lg" />
        <div className="h-4 w-96 bg-surface-container-high rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-24" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden border border-outline-variant/20">
        <div className="h-12 bg-surface-bright border-b border-surface-variant/50" />
        <div className="flex flex-col">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 mx-6 my-3 bg-surface-container-high rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
