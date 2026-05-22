"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchLogs } from "@/lib/api";
import RequestTable from "@/components/RequestTable";

export default function DashboardPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    try {
      const data = await fetchLogs();
      setLogs(Array.isArray(data) ? data : (data && data.logs) || []);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    // 1. Initial load
    loadLogs();

    // 2. Real-time Subscription
    const channel = supabase
      .channel("monitoring-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        (payload) => {
          // Prepend new row instantly for absolute real-time responsiveness
          setLogs((prev) => {
            const exists = prev.some(
              (log) => 
                log.timestamp === payload.new.timestamp && 
                log.deviceId === payload.new.deviceId
            );
            if (exists) return prev;

            const formattedLog = {
              ...payload.new,
              heartRate: Number(payload.new.heartRate)
            };
            return [formattedLog, ...prev].slice(0, 50);
          });

          // Quietly update from API gateway to ensure robust merging/consistency
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600" />
            </span>
            Real-time updates active
          </div>
          <span className="text-xs text-slate-500">{logs.length} records</span>
        </div>
        <button
          onClick={() => { setLoading(true); loadLogs(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      <RequestTable logs={logs} loading={loading} />
    </div>
  );
}
