"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/simulator", label: "Device Simulator" },
  { href: "/dashboard", label: "Monitoring Dashboard" },
  { href: "/overview", label: "System Overview" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="text-lg font-bold tracking-wide text-cyan-400">
          IoMT Shield
        </Link>

        <div className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-cyan-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
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
