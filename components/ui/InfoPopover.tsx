"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface InfoRow {
  label: string;
  value: string;
}

export function InfoPopover({ rows }: { rows: InfoRow[] }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setRect(r);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside() { setOpen(false); }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
        aria-label="Show details"
        title="Details"
      >
        <span className="material-symbols-outlined text-[18px]">info</span>
      </button>
      {open && rect && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: rect.bottom + 6,
            left: Math.max(8, rect.right - 208),
            zIndex: 9999,
          }}
          className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg p-3.5 w-52"
        >
          <dl className="space-y-2">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <dt className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{label}</dt>
                <dd className="font-label-sm text-label-sm text-on-surface font-medium text-right">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>,
        document.body
      )}
    </>
  );
}
