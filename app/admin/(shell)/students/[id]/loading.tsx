export default function StudentDetailLoading() {
  return (
    <div className="max-w-container-max mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-36 bg-surface-container-high rounded-lg" />

      {/* Profile header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-container-high" />
          <div className="space-y-2">
            <div className="h-7 w-48 bg-surface-container-high rounded-lg" />
            <div className="h-4 w-56 bg-surface-container-high rounded-lg" />
            <div className="h-3 w-32 bg-surface-container-high rounded-lg" />
          </div>
        </div>
        <div className="h-9 w-28 bg-surface-container-high rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-24" />
        ))}
      </div>

      {/* Content cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-56" />
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-56" />
        <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-64 lg:col-span-2" />
      </div>
    </div>
  );
}
