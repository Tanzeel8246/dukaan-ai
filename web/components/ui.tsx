/** Dukaan AI — shared UI primitives: inline SVG icon set + JSON-LD helper. */
import React from "react";

type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function IconBasket({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M5 8h14l-1.3 9.1a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      <path d="M9.5 12.5h.01M14.5 12.5h.01" />
    </svg>
  );
}
export function IconClipboard({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5a3 3 0 0 1 6 0" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  );
}
export function IconBox({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}
export function IconAlert({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
export function IconCash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}
export function IconChart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  );
}
export function IconChat({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}
export function IconPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function IconEdit({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}
export function IconTrash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
export function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
export function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
export function IconClose({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
export function IconSun({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}
export function IconMoon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
export function IconPalette({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M12 21a9 9 0 1 1 9-9c0 2-1.6 3.5-3.6 3.5h-1.9a2.6 2.6 0 0 0-2 4.1c.4.5-.1 1.4-1.5 1.4Z" />
      <path d="M7.2 10.2h.01M10.4 6.6h.01M15.6 6.9h.01M17.4 10.6h.01" />
    </svg>
  );
}
export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
export function IconSend({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
export function IconSpark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}
export function IconTruck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="m3 10.5 9-7.5 9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}
export function IconGear({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
export function IconLogout({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}
export function IconLock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <path d="M12 15.5h.01" />
    </svg>
  );
}
export function IconGlobe({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
export function IconUsers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
export function IconWallet({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}
export function IconCalendarCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}
export function IconReceipt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M14 8H8M16 12H8M13 16H8" />
    </svg>
  );
}
export function IconTrendUp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}
export function IconTrendDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="m22 17-8.5-8.5-5 5L2 7" />
      <path d="M16 17h6v-6" />
    </svg>
  );
}
export function IconClock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
export function IconCard({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
export function IconScale({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} className={className} aria-hidden="true">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}

/** The × affordance inside a .search-box — render only when the box
 *  holds text; clears it in one tap instead of select-all + delete. */
export function SearchClear({
  onClear,
  label,
}: {
  onClear: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="search-clear"
      onClick={onClear}
      aria-label={label}
      tabIndex={-1}
    >
      <IconClose />
    </button>
  );
}

export interface PickItem {
  id: string;
  name: string;
  /** Secondary line: price/unit/stock wording, pre-formatted. */
  meta?: string;
  /** Right-aligned price (or amount), pre-formatted. */
  price?: string;
  badge?: string | null;
  disabled?: boolean;
  /** Quantity already on the target document, when > 0. */
  inCartQty?: number;
  inCartLabel?: string;
}

/**
 * The POS product picker list: search results as full-width rows —
 * one click (or Enter on the keyboard-highlighted row) picks the
 * product. Parents own the search state and the filtering itself
 * (always lib/search); this is presentation only.
 */
export function ProductResultList({
  items,
  activeIndex,
  activeId,
  onPick,
  emptyText,
  listLabel,
}: {
  items: PickItem[];
  activeIndex?: number;
  /** Row to highlight as the current selection (single-pick desks). */
  activeId?: string | null;
  onPick: (id: string) => void;
  emptyText?: string;
  listLabel?: string;
}) {
  if (items.length === 0) {
    return emptyText ? <div className="pick-empty">{emptyText}</div> : null;
  }
  return (
    <div className="pick-list" role="listbox" aria-label={listLabel}>
      {items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          role="option"
          aria-selected={i === activeIndex || it.id === activeId}
          className={
            "pick-row" + (i === activeIndex || it.id === activeId ? " active" : "")
          }
          disabled={it.disabled}
          onClick={() => onPick(it.id)}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="pick-main">
            <span className="pick-name">
              {it.name}
              {it.badge && <span className="badge amber">{it.badge}</span>}
            </span>
            {it.meta && <span className="pick-meta">{it.meta}</span>}
          </span>
          {it.inCartQty != null && it.inCartQty > 0 && (
            <span className="pick-incart">
              {it.inCartLabel ?? `× ${it.inCartQty}`}
            </span>
          )}
          {it.price && <span className="pick-price">{it.price}</span>}
        </button>
      ))}
    </div>
  );
}

/** Keyboard support shared by every picker search input: arrows move
 *  the highlight, Enter picks the highlighted row. Returns true when
 *  the key was consumed. */
export function pickerKeyDown(
  e: React.KeyboardEvent,
  count: number,
  activeIndex: number,
  setActiveIndex: (i: number) => void,
  onEnter: () => void
): boolean {
  if (count <= 0) return false;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setActiveIndex(Math.min(count - 1, activeIndex + 1));
    return true;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    setActiveIndex(Math.max(0, activeIndex - 1));
    return true;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    onEnter();
    return true;
  }
  return false;
}

/** Renders a JSON-LD script tag for structured data. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
