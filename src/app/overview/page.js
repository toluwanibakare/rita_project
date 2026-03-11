"use client";

import { useEffect, useState } from "react";
import { fetchStats } from "@/lib/api";
import StatCard from "@/components/StatCard";

export default function OverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch {
      console.error("Failed to fetch stats");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading statistics…
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-500">Could not load statistics.</p>
        <p className="text-xs text-gray-600 mt-1">Make sure the backend API is running.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={stats.total ?? 0} type="total" />
        <StatCard label="Normal" value={stats.normal ?? 0} type="normal" />
        <StatCard label="Blocked" value={stats.blocked ?? 0} type="blocked" />
        <StatCard label="Suspicious" value={stats.suspicious ?? 0} type="suspicious" />
      </div>

      {/* How It Works */}
      <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Security Pipeline</h3>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-1">Data Ingestion</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">IoMT devices send heart rate data via POST API. Every request is logged for analysis.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-1">Threat Detection</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">Validates data ranges, checks request frequency, detects DoS patterns and anomalies.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-1">Auto Response</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">Malicious requests are blocked, suspicious flagged for review, clean data passes through.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
        <span className="font-medium text-gray-400">Status Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Normal — valid data</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Flagged — suspicious</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Blocked — threat detected</span>
      </div>
    </div>
  );
}
