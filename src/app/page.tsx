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
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Antrian Online
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Queue Management System — MVP
        </p>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
          >
            <span className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              {link.title}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
