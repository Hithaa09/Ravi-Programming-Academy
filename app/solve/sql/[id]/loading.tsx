export default function SolveSqlProblemLoading() {
  return (
    <>
      {/* Mobile: the real page shows a "use a laptop" notice below md:, so the
          loading state should too rather than rendering nothing at all. */}
      <div className="md:hidden h-screen flex flex-col items-center justify-center text-center px-8 bg-background animate-pulse">
        <div className="w-12 h-12 rounded-full bg-surface-container-high mb-4" />
        <div className="h-5 w-48 bg-surface-container-high rounded-lg mb-2" />
        <div className="h-4 w-56 bg-surface-container-high rounded-lg" />
      </div>

      <div className="hidden md:flex md:flex-col h-screen overflow-hidden bg-background animate-pulse">
        {/* Header */}
        <div className="h-14 flex items-center px-4 bg-surface-container-lowest border-b border-surface-container-high shrink-0">
          <div className="h-4 w-32 bg-surface-container-high rounded-lg" />
        </div>

        {/* Split view */}
        <div className="flex flex-1 min-h-0">
          {/* Left pane: problem description */}
          <div className="w-1/2 border-r border-surface-container-high p-6 space-y-4 overflow-hidden">
            <div className="h-6 w-2/3 bg-surface-container-high rounded-lg" />
            <div className="h-4 w-24 bg-surface-container-high rounded-lg" />
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full bg-surface-container-high rounded-lg" />
              <div className="h-4 w-full bg-surface-container-high rounded-lg" />
              <div className="h-4 w-5/6 bg-surface-container-high rounded-lg" />
              <div className="h-4 w-3/4 bg-surface-container-high rounded-lg" />
            </div>
            <div className="h-24 w-full bg-surface-container-lowest rounded-2xl shadow-card mt-4" />
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full bg-surface-container-high rounded-lg" />
              <div className="h-4 w-2/3 bg-surface-container-high rounded-lg" />
            </div>
          </div>

          {/* Right pane: query editor */}
          <div className="w-1/2 flex flex-col">
            <div className="h-10 border-b border-surface-container-high shrink-0" />
            <div className="flex-1 bg-surface-container-lowest m-4 rounded-2xl shadow-card" />
          </div>
        </div>
      </div>
    </>
  );
}
