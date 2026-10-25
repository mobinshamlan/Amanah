import { AdminShell, type AdminNavItem } from "@/app/admin/AdminShell";
import { LoadingRow } from "@/components/ui";

const NAV: AdminNavItem[] = [
  { key: "matches", label: "Possible matches" },
  { key: "claims", label: "Ownership claims" },
  { key: "reports", label: "All reports" },
  { key: "monitoring", label: "Monitoring" },
];

// Shown while the staff workspace loads its counts on the server.
export default function AdminLoading() {
  return (
    <AdminShell active={null} nav={NAV} title="Staff workspace">
      <div role="status" className="rounded-2xl bg-secondary px-5 py-6">
        <LoadingRow>Loading the staff workspace…</LoadingRow>
      </div>
    </AdminShell>
  );
}
