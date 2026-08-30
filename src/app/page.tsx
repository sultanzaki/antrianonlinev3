import Link from "next/link";

const LINKS = [
  {
    href: "/kiosk",
    title: "Kiosk",
    description: "Ambil nomor antrian",
  },
  {
    href: "/display",
    title: "TV Display",
    description: "Layar nomor antrian yang sedang dipanggil",
  },
  {
    href: "/counter",
    title: "Staff Counter",
    description: "Login staff untuk memanggil & melayani antrian",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-6 py-24">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Antrian Online</h1>
        <p className="mt-2 text-muted">Queue Management System</p>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:border-brand hover:shadow-md"
          >
            <span className="text-lg font-medium text-foreground">{link.title}</span>
            <span className="text-sm text-muted">{link.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
