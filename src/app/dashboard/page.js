"use client";

import { useEffect, useState } from "react";
import { fetchLogs } from "@/lib/api";
import RequestTable from "@/components/RequestTable";

export default function DashboardPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    try {
      const data = await fetchLogs();
      setLogs(Array.isArray(data) ? data : data.logs || []);
    } catch {
      console.error("Failed to fetch logs");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-xs text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Auto-refreshing every 5s
          </div>
          <span className="text-xs text-gray-600">{logs.length} records</span>
        </div>
        <button
          onClick={() => { setLoading(true); loadLogs(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800 transition-colors"
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
