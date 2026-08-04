export default function DashboardLoading() {
  return (
    <div className="max-w-container-max mx-auto space-y-6 animate-pulse">
      {/* Greeting + streak */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-surface-container-high rounded-lg" />
          <div className="h-4 w-72 bg-surface-container-high rounded-lg" />
        </div>
        <div className="h-20 w-20 bg-surface-container-high rounded-2xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-28" />
        ))}
      </div>

      {/* Programming Progress + SQL Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-56" />
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-56" />
      </div>

      {/* Weekly Activity + Top Learners */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-64" />
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-64" />
      </div>

      {/* Recent SQL Submissions */}
      <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-72" />
    </div>
  );
}
