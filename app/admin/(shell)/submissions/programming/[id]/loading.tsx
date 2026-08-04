export default function ProgrammingSubmissionDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-28 bg-surface-container-high rounded-lg" />

      <div className="space-y-2">
        <div className="h-8 w-56 bg-surface-container-high rounded-lg" />
        <div className="h-4 w-72 bg-surface-container-high rounded-lg" />
      </div>

      <div className="bg-surface-container-high rounded-xl h-16" />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 h-20" />
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 h-48" />
    </div>
  );
}
