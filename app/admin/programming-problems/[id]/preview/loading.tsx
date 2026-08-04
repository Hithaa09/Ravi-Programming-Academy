export default function AdminProblemPreviewLoading() {
  return (
    <div className="max-w-container-max mx-auto space-y-6 p-10 animate-pulse">
      <div className="h-4 w-40 bg-surface-container-high rounded-lg" />
      <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-80" />
      <div className="bg-surface-container-lowest rounded-2xl p-card-padding shadow-card h-64" />
    </div>
  );
}
