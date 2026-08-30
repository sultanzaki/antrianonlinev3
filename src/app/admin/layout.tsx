import Link from "next/link";

const NAV = [
  { href: "/admin/analytics", label: "Analitik" },
  { href: "/admin/services", label: "Layanan" },
  { href: "/admin/counters", label: "Loket" },
  { href: "/admin/staff", label: "Staff" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-semibold text-foreground">Admin</span>
          <nav className="flex gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/counter" className="text-muted hover:text-foreground">
              Counter Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
