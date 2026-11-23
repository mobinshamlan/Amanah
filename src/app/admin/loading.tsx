import { AdminShell, type AdminNavItem } from "@/app/admin/AdminShell";
import { admin } from "@/i18n/messages/admin";
import { getMessages } from "@/i18n/server";

// Shown while the workspace loads its queues. The final layout with each
// value replaced by a flat bar at its real size, so nothing shifts when the
// data lands.

function Bar({ className }: { className: string }) {
  return <span aria-hidden className={`block rounded-md bg-secondary ${className}`} />;
}

export default async function AdminLoading() {
  const t = await getMessages(admin);
  const nav: AdminNavItem[] = (["matches", "candidates", "claims", "reports", "monitoring"] as const).map(
    (key) => ({ key, label: t.section[key] }),
  );
  return (
    <AdminShell active={null} nav={nav} title={t.workspace} t={t}>
      <div role="status" className="flex flex-col gap-3">
        <p className="sr-only">{t.loading}</p>
        <Bar className="h-5 w-40" />
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="grid gap-4 rounded-[1.25rem] bg-background p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6 sm:p-5"
          >
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Bar className="h-7 w-20 rounded-full" />
                  <Bar className="h-6 w-3/4" />
                </div>
                <div className="flex flex-col gap-2">
                  <Bar className="h-7 w-20 rounded-full" />
                  <Bar className="h-6 w-2/3" />
                </div>
              </div>
              <Bar className="h-4 w-full max-w-[60ch]" />
              <Bar className="h-7 w-36 rounded-full" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Bar className="h-7 w-16" />
              <Bar className="h-3.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
