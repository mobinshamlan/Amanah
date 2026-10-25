// The staff workspace shares the public site's palette and type; the frame is
// drawn by AdminShell.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}
