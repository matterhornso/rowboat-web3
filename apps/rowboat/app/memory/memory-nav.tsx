"use client";

import { usePathname } from "next/navigation";
import { Mic, Library, Sparkles, Link2 } from "lucide-react";

const NAV = [
  { href: "/memory", label: "Record", icon: Mic },
  { href: "/memory/library", label: "Library", icon: Library },
  { href: "/memory/brief", label: "Brief", icon: Sparkles },
  { href: "/memory/connect", label: "Connect", icon: Link2 },
];

export function MemoryNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-20 bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-white/10"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/memory"
              ? pathname === "/memory"
              : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-3.5 sm:py-4 text-sm whitespace-nowrap border-b-2 transition-all touch-manipulation ${
                active
                  ? "border-[#D4A853] text-[#D4A853]"
                  : "border-transparent text-white/50 hover:text-white/80 active:text-white/90"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
