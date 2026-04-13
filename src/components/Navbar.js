"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/simulator", label: "Device Simulator" },
  { href: "/dashboard", label: "Monitoring Dashboard" },
  { href: "/overview", label: "System Overview" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="text-lg font-bold tracking-wide text-sky-700">
          IoMT Shield
        </Link>

        <div className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
