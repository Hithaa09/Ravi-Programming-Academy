export default function AdminStudentsLoading() {
  return (
    <div className="max-w-container-max mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-surface-container-high rounded-lg" />

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-card overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-outline-variant/10 bg-surface-bright flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="h-10 w-full md:w-64 bg-surface-container-high rounded-lg" />
          <div className="h-10 w-40 bg-surface-container-high rounded-lg" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-outline-variant/10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 mx-6 my-4 bg-surface-container-high rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
