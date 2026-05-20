import StatusBadge from "./StatusBadge";

function formatTime(timestamp) {
  if (!timestamp) return "—";
  const d = new Date(timestamp);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function RequestTable({ logs, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-16 text-center shadow-sm backdrop-blur-sm">
        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading request logs…
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-16 text-center shadow-sm backdrop-blur-sm">
        <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm text-slate-600">No requests logged yet.</p>
        <p className="text-xs text-slate-500 mt-1">Use the Device Simulator to generate traffic.</p>
      </div>
    );
  }

  const renderDbProtection = (type) => {
    const t = type || 'Isolated (No Write)';
    if (t.includes('Safe') || t.includes('Parameterized')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Secure Parameterization
        </span>
      );
    }
    if (t.includes('SQLi') || t.includes('Blocked')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
          <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Blocked: SQLi Prevented
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded bg-slate-50 text-slate-600 border border-slate-200">
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        Isolated (No DB Write)
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 overflow-hidden shadow-sm backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-sky-50/40">
              <th className="px-5 py-3 sticky top-0 bg-slate-50">Device ID</th>
              <th className="px-5 py-3 sticky top-0 bg-slate-50">Heart Rate</th>
              <th className="px-5 py-3 sticky top-0 bg-slate-50">Timestamp</th>
              <th className="px-5 py-3 sticky top-0 bg-slate-50">Decision</th>
              <th className="px-5 py-3 sticky top-0 bg-slate-50">Database Shield</th>
              <th className="px-5 py-3 sticky top-0 bg-slate-50">Diagnostics Stage</th>
              <th className="px-5 py-3 sticky top-0 bg-slate-50">Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr
                key={i}
                className={`border-b border-slate-200/70 transition-colors duration-150 hover:bg-sky-50/50 ${
                  i % 2 === 0 ? "bg-transparent" : "bg-slate-50/40"
                }`}
              >
                <td className="px-5 py-3">
                  <span className="font-mono text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    {log.deviceId}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="font-mono text-slate-700">{log.heartRate}</span>
                  <span className="text-slate-500 text-xs ml-1">BPM</span>
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">
                  {formatTime(log.timestamp)}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={log.status || log.decision} />
                </td>
                <td className="px-5 py-3">
                  {renderDbProtection(log.dbProtectionType)}
                </td>
                <td className="px-5 py-3 text-slate-600 text-xs">
                  {log.stage || "—"}
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                  {log.reason || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
