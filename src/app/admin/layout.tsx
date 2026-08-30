import Link from "next/link";

const NAV = [
  { href: "/admin/services", label: "Layanan" },
  { href: "/admin/counters", label: "Loket" },
  { href: "/admin/staff", label: "Staff" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Admin</span>
          <nav className="flex gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/counter"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Counter Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
