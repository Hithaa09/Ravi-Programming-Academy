export default function LeaderboardLoading() {
  return (
    <div className="max-w-container-max mx-auto flex flex-col gap-6 animate-pulse">
      {/* Title + tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="h-8 w-40 bg-surface-container-high rounded-lg" />
        <div className="h-9 w-64 bg-surface-container-high rounded-lg" />
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
