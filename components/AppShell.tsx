"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Grid3x3, ListChecks, Settings, Sun } from "lucide-react";

const NAV = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/month", label: "Month", icon: CalendarDays },
  { href: "/year", label: "Year", icon: Grid3x3 },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      {/* Desktop / tablet header */}
      <header className="sticky top-0 z-30 hidden border-b border-line bg-canvas/85 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <Mark />
            <span className="text-[15px] font-semibold tracking-tight">Year</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors duration-150",
                    active
                      ? "bg-ink text-canvas"
                      : "text-ink-muted hover:bg-sunken hover:text-ink",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile header — just the wordmark; navigation lives at the bottom. */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 px-5 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">Year</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-32 pt-6 md:px-6 md:pb-20 md:pt-10">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-col items-center gap-1 py-2.5 transition-colors duration-150",
                  active ? "text-ink" : "text-ink-muted",
                ].join(" ")}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                <span className="text-[10.5px] font-medium tracking-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Four squares — a miniature of the year grid. */
function Mark() {
  return (
    <span className="grid grid-cols-2 gap-[2.5px]" aria-hidden>
      <span className="size-2 rounded-[2.5px] bg-[#F97316]" />
      <span className="size-2 rounded-[2.5px] bg-[#3B9EF5]" />
      <span className="size-2 rounded-[2.5px] bg-[#EC5A8D]" />
      <span className="size-2 rounded-[2.5px] bg-[#4DA167]" />
    </span>
  );
}
