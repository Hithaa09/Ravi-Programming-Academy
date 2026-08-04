export default function EditSqlProblemLoading() {
  return (
    <div className="max-w-container-max mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-surface-container-high rounded-lg" />

      <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-surface-container-high rounded-lg" />
            <div className="h-10 w-full bg-surface-container-high rounded-lg" />
          </div>
        ))}
        <div className="space-y-2">
          <div className="h-4 w-32 bg-surface-container-high rounded-lg" />
          <div className="h-32 w-full bg-surface-container-high rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-surface-container-high rounded-lg" />
            <div className="h-10 w-full bg-surface-container-high rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-surface-container-high rounded-lg" />
            <div className="h-10 w-full bg-surface-container-high rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
