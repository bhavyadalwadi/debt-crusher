import type { StatusFlag } from "@/lib/types";

const LABELS: Record<StatusFlag, string> = {
  danger: "Danger",
  warning: "Warning",
  watch: "Watch",
  paid: "Paid",
  ok: "OK",
};

export function StatusBadge({ status }: { status: StatusFlag }) {
  return <span className={`status-badge status-${status}`}>{LABELS[status]}</span>;
}
