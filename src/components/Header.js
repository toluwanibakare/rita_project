"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";

const pageTitles = {
  "/": "Welcome",
  "/simulator": "Device Simulator",
  "/dashboard": "Monitoring Dashboard",
  "/overview": "System Overview",
  "/profile": "User Profile",
  "/login": "Login",
  "/signup": "Sign Up",
};

const pageDescriptions = {
  "/": "IoMT Security Simulation System",
  "/simulator": "Simulate IoMT device data transmissions and attack scenarios",
  "/dashboard": "Real-time monitoring of all processed device requests",
  "/overview": "Aggregate statistics and system health metrics",
  "/profile": "Manage your personal details and account settings",
  "/login": "Authenticate to continue",
  "/signup": "Create your account",
};

export default function Header({ onMenuClick }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const title = pageTitles[pathname] || "IoMT Shield";
  const description = pageDescriptions[pathname] || "";

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-500 hover:text-slate-900 p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
        <p className="text-[11px] text-slate-500 truncate hidden sm:block">{description}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600" />
          </span>
          Live
        </div>

        {user ? (
          <>
            <Link
              href="/profile"
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {user.fullName || "Profile"}
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
