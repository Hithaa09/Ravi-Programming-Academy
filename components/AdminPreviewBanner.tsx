export function AdminPreviewBanner() {
  return (
    <div className="h-10 flex items-center justify-center gap-2 bg-[#FFF3E0] border-b border-[#FF9800]/30 text-[#FF9800] shrink-0 z-20">
      <span className="material-symbols-outlined text-[18px]">visibility</span>
      <span className="font-label-md text-label-md font-bold tracking-wide">Admin Preview Mode</span>
      <span className="font-label-sm text-label-sm font-medium opacity-80">— this is not the student view</span>
    </div>
  );
}
