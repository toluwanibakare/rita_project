"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { isAuthenticated } from "@/lib/auth";
import { fetchLogs } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function DashboardShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(true); // Default true to prevent hydration flash
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isHomePage = pathname === "/";

  // Emergency Alarm States
  const [alarmActive, setAlarmActive] = useState(false);
  const [lastAckTimestamp, setLastAckTimestamp] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rita_alarm_ack_ts') || null;
    }
    return null;
  });

  useEffect(() => {
    const authenticated = isAuthenticated();
    setIsAuth(authenticated);
    
    if (!authenticated && !isAuthPage && !isHomePage) {
      window.location.href = "/login";
    }
  }, [pathname, isAuthPage, isHomePage]);

  // A. Realtime database logs subscription to trigger alarm if new threat is detected
  useEffect(() => {
    if (!isAuth || isAuthPage) return;

    const handleNewThreat = (log) => {
      const isThreat = log.decision === "BLOCKED" || log.status === "BLOCKED";
      if (isThreat && log.timestamp !== lastAckTimestamp) {
        setAlarmActive(true);
      }
    };

    const checkEmergency = async () => {
      try {
        const res = await fetchLogs();
        const logsArray = Array.isArray(res) ? res : (res && res.logs) || [];
        if (logsArray.length > 0) {
          handleNewThreat(logsArray[0]);
        }
      } catch (err) {
        console.error("Emergency system failed to check telemetry logs:", err);
      }
    };

    // Initial check
    checkEmergency();

    // Subscribe to realtime insert events for instantaneous threat alerting
    const channel = supabase
      .channel("alarm-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        (payload) => {
          console.log("Emergency system real-time threat scan:", payload.new);
          handleNewThreat(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuth, isAuthPage, lastAckTimestamp]);

  // B. Instant client-side alarm event listener
  useEffect(() => {
    const handleAlarm = () => {
      setAlarmActive(true);
    };
    window.addEventListener("security-alarm", handleAlarm);
    return () => window.removeEventListener("security-alarm", handleAlarm);
  }, []);

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
    <div className={`min-h-screen bg-transparent text-slate-900 transition-all duration-300 ${alarmActive ? "pt-16" : ""}`}>
      {/* 1. Global Red-Alarm Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes borderPulse {
          0% { box-shadow: inset 0 0 25px rgba(225, 29, 72, 0.4); border-color: rgba(225, 29, 72, 0.4); }
          50% { box-shadow: inset 0 0 70px rgba(225, 29, 72, 0.9); border-color: rgba(225, 29, 72, 0.9); }
          100% { box-shadow: inset 0 0 25px rgba(225, 29, 72, 0.4); border-color: rgba(225, 29, 72, 0.4); }
        }
        @keyframes bannerFlash {
          0% { background-color: rgb(225, 29, 72); }
          50% { background-color: rgb(159, 18, 57); }
          100% { background-color: rgb(225, 29, 72); }
        }
        @keyframes siteRedFlash {
          0% { background-color: rgba(225, 29, 72, 0); }
          50% { background-color: rgba(225, 29, 72, 0.15); }
          100% { background-color: rgba(225, 29, 72, 0); }
        }
      `}} />

      {/* 2. Pulsing Flashing Screen Border for Code Red */}
      {alarmActive && (
        <div className="fixed inset-y-0 left-0 lg:left-64 right-0 pointer-events-none z-40 border-[6px] border-rose-600 animate-[borderPulse_1.5s_infinite] shadow-[inset_0_0_80px_rgba(225,29,72,0.7)]" />
      )}

      {/* 2.5. Full Screen semi-transparent red flashing overlay (site flashing red) */}
      {alarmActive && (
        <div className="fixed inset-y-0 left-0 lg:left-64 right-0 pointer-events-none z-30 animate-[siteRedFlash_1.5s_infinite]" />
      )}

      {/* 3. Global Flashing Caution Banner at the Top */}
      {alarmActive && (
        <div className="fixed top-0 left-0 lg:left-64 right-0 h-16 z-40 text-white px-4 lg:px-6 flex items-center justify-between shadow-2xl animate-[bannerFlash_1.2s_infinite] border-b-2 border-rose-900 select-none">
          <div className="flex items-center gap-3">
            {/* Pulsing warning sign */}
            <span className="p-1.5 rounded-lg bg-white text-rose-600 shadow-sm animate-bounce flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div className="min-w-0">
              <h4 className="font-extrabold text-xs lg:text-sm tracking-wider uppercase flex items-center gap-2">
                CRITICAL WARNING: TELEMETRY THREAT SHIELDED
              </h4>
              <p className="text-[10px] text-rose-100 font-medium truncate hidden sm:block">
                Dangerous physiological spoofing or database injection payload intercepted. Target database has been safeguarded.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setAlarmActive(false);
              // Store timestamp of latest log so it doesn't trigger on subsequent polls or refreshes
              fetchLogs().then((res) => {
                const logsArray = Array.isArray(res) ? res : (res && res.logs) || [];
                if (logsArray.length > 0) {
                  const ts = logsArray[0].timestamp;
                  setLastAckTimestamp(ts);
                  try { localStorage.setItem('rita_alarm_ack_ts', ts); } catch(e) {}
                }
              });
            }}
            className="px-3.5 py-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 text-[11px] font-extrabold transition-all shadow-md active:scale-95 shrink-0"
          >
            ACKNOWLEDGE & MUTE
          </button>
        </div>
      )}

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
