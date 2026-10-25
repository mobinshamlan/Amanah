import { IBM_Plex_Sans } from "next/font/google";

// The staff workspace has its own type and theme (see .admin-theme in
// globals.css). Public pages are not affected.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className={`${plexSans.variable} admin-theme flex min-h-full flex-1 flex-col bg-frame`}>
      {children}
    </div>
  );
}
