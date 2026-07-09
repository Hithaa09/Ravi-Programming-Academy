export default function DashboardLoading() {
  return (
    <div className="max-w-container-max mx-auto space-y-6 animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <div className="h-8 w-40 bg-surface-container-high rounded-lg" />
        <div className="h-4 w-56 bg-surface-container-high rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-28" />
        ))}
      </div>

      {/* Student Insights */}
      <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-80" />

      {/* Submissions Overview + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-72" />
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-72" />
      </div>

      {/* Top Students + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-64" />
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-64" />
      </div>
    </div>
  );
}
