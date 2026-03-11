"use client";

import { usePathname } from "next/navigation";

const pageTitles = {
  "/": "Welcome",
  "/simulator": "Device Simulator",
  "/dashboard": "Monitoring Dashboard",
  "/overview": "System Overview",
};

const pageDescriptions = {
  "/": "IoMT Security Simulation System",
  "/simulator": "Simulate IoMT device data transmissions and attack scenarios",
  "/dashboard": "Real-time monitoring of all processed device requests",
  "/overview": "Aggregate statistics and system health metrics",
};

export default function Header({ onMenuClick }) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "IoMT Shield";
  const description = pageDescriptions[pathname] || "";

  return (
    <header className="sticky top-0 z-30 h-16 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/80 flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-400 hover:text-white p-1.5 -ml-1.5 rounded-lg hover:bg-gray-800"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-base font-semibold text-white truncate">{title}</h1>
        <p className="text-[11px] text-gray-500 truncate hidden sm:block">{description}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-xs text-gray-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          Live
        </div>
      </div>
    </header>
  );
}
