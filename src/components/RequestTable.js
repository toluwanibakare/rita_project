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
      <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-16 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
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
      <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-16 text-center">
        <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm text-gray-500">No requests logged yet.</p>
        <p className="text-xs text-gray-600 mt-1">Use the Device Simulator to generate traffic.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800/60 bg-gray-900/80">
              <th className="px-5 py-3 sticky top-0 bg-gray-900/80">Device ID</th>
              <th className="px-5 py-3 sticky top-0 bg-gray-900/80">Heart Rate</th>
              <th className="px-5 py-3 sticky top-0 bg-gray-900/80">Timestamp</th>
              <th className="px-5 py-3 sticky top-0 bg-gray-900/80">Decision</th>
              <th className="px-5 py-3 sticky top-0 bg-gray-900/80">Diagnostics Stage</th>
              <th className="px-5 py-3 sticky top-0 bg-gray-900/80">Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr
                key={i}
                className={`border-b border-gray-800/40 transition-colors duration-100 hover:bg-gray-800/30 ${
                  i % 2 === 0 ? "bg-transparent" : "bg-gray-900/30"
                }`}
              >
                <td className="px-5 py-3">
                  <span className="font-mono text-xs text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded">
                    {log.deviceId}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="font-mono text-gray-300">{log.heartRate}</span>
                  <span className="text-gray-600 text-xs ml-1">BPM</span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {formatTime(log.timestamp)}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={log.status || log.decision} />
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {log.stage || "—"}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs max-w-[200px] truncate">
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
