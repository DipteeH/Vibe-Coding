import type { Metadata } from "next";
import Link from "next/link";
import { getSessionSummary } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enterprise Car Configuration Platform",
  description:
    "Production-grade showcase for enterprise vehicle configuration, pricing, compliance, and quote/order workflows.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionSummary();

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="relative z-10 min-h-screen">
          <header className="border-b border-white/60 bg-white/75 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
              <div>
                <Link href="/" className="text-lg font-semibold text-slate-900 transition hover:text-sky-700">
                  Enterprise Car Configuration Platform
                </Link>
                <p className="text-sm text-slate-500">Authentication-enabled configurator, quote, and admin workspace</p>
              </div>
              <nav className="flex flex-wrap items-center gap-2 text-sm">
                <Link href="/" className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-sky-50 hover:text-sky-700">
                  Configure
                </Link>
                {session.user ? (
                  <>
                    <Link
                      href="/saved-configurations"
                      className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
                    >
                      Saved configurations
                    </Link>
                    {session.user.role === "ADMIN" ? (
                      <Link
                        href="/admin"
                        className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
                      >
                        Admin
                      </Link>
                    ) : null}
                    <div className="ml-2 flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                      <div>
                        <p className="font-medium text-slate-900">{session.user.name}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{session.user.role}</p>
                      </div>
                      <form action="/api/auth/logout" method="post">
                        <button
                          type="submit"
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                        >
                          Sign out
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-700"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
