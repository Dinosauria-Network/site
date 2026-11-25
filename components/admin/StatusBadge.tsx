/** Status badge (Phase 5) — restrained, square, thin border. */
interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const cls = ["admin-status", `admin-status-${status || "draft"}`, className ?? ""].join(" ");
  return <span className={cls}>{status || "—"}</span>;
}
