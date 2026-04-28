"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { isAuthenticated } from "@/lib/auth";

export default function DashboardShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(true); // Default true to prevent hydration flash
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isHomePage = pathname === "/";

  useEffect(() => {
    const authenticated = isAuthenticated();
    setIsAuth(authenticated);
    
    if (!authenticated && !isAuthPage && !isHomePage) {
      window.location.href = "/login";
    }
  }, [pathname, isAuthPage, isHomePage]);

  if (isAuthPage) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  if (isHomePage && !isAuth) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  if (!isAuth && !isAuthPage && !isHomePage) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-7">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
