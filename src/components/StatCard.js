const iconMap = {
  total: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  normal: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  blocked: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  suspicious: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

const styles = {
  total: {
    icon: "bg-cyan-500/10 text-cyan-400",
    border: "border-cyan-500/10",
    value: "text-cyan-400",
    glow: "from-cyan-500/5",
  },
  normal: {
    icon: "bg-emerald-500/10 text-emerald-400",
    border: "border-emerald-500/10",
    value: "text-emerald-400",
    glow: "from-emerald-500/5",
  },
  blocked: {
    icon: "bg-red-500/10 text-red-400",
    border: "border-red-500/10",
    value: "text-red-400",
    glow: "from-red-500/5",
  },
  suspicious: {
    icon: "bg-amber-500/10 text-amber-400",
    border: "border-amber-500/10",
    value: "text-amber-400",
    glow: "from-amber-500/5",
  },
};

export default function StatCard({ label, value, type = "total" }) {
  const s = styles[type];
  return (
    <div className={`relative overflow-hidden rounded-xl border ${s.border} bg-gray-900/50 p-5 transition-all duration-200 hover:bg-gray-900/80 hover:shadow-lg`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${s.glow} to-transparent pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-3xl font-bold tabular-nums ${s.value}`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${s.icon}`}>
          {iconMap[type]}
        </div>
      </div>
    </div>
  );
}
