import clsx from "clsx";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

// For large page counts, collapse the middle into "..." — always keep the
// first page, last page, and a window around the current page visible.
function getPageList(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = Array.from(new Set<number>([1, 2, totalPages - 1, totalPages, current - 1, current, current + 1]));
  const sorted = pages.filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({ page, pageSize, total, onPageChange, itemLabel = "items" }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pageBtn = (label: React.ReactNode, target: number, disabled: boolean, active = false) => (
    <button
      type="button"
      key={typeof label === "string" ? label : target}
      disabled={disabled}
      onClick={() => onPageChange(target)}
      className={clsx(
        "w-8 h-8 flex items-center justify-center rounded border font-label-md text-label-md transition-colors",
        active ? "bg-primary-container text-white border-primary-container" : "bg-white border-outline-variant/30 text-on-surface hover:bg-surface-container-highest",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-between mt-6 px-2 flex-wrap gap-3">
      <span className="font-body-md text-body-md text-on-surface-variant">
        Showing {start} to {end} of {total} {itemLabel}
      </span>
      <div className="flex items-center gap-1.5">
        {pageBtn(<span className="material-symbols-outlined text-[18px]">chevron_left</span>, page - 1, page === 1)}
        {getPageList(page, totalPages).map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-on-surface-variant font-label-md text-label-md">…</span>
          ) : (
            pageBtn(p, p, false, p === page)
          )
        )}
        {pageBtn(<span className="material-symbols-outlined text-[18px]">chevron_right</span>, page + 1, page === totalPages)}
      </div>
    </div>
  );
}
