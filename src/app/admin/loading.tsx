import { LoadingRow, PageShell } from "@/components/ui";

// Shown while the staff workspace loads its counts on the server.
export default function AdminLoading() {
  return (
    <PageShell badge="Local admin" width="wide">
      <div role="status" className="mt-10">
        <LoadingRow>Loading the staff workspace…</LoadingRow>
      </div>
    </PageShell>
  );
}
