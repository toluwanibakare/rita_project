import Link from "next/link";

const cards = [
  {
    href: "/simulator",
    title: "Device Simulator",
    description: "Send mock heart rate data from simulated IoMT devices and test attack scenarios against the security API.",
    color: "from-cyan-500/10 to-transparent border-cyan-500/15 hover:border-cyan-500/30",
    iconColor: "bg-cyan-500/10 text-cyan-400",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    tags: ["POST /api/vitals", "Attack Sim"],
  },
  {
    href: "/dashboard",
    title: "Monitoring Dashboard",
    description: "Real-time view of every request processed by the security system with status decisions and threat reasons.",
    color: "from-emerald-500/10 to-transparent border-emerald-500/15 hover:border-emerald-500/30",
    iconColor: "bg-emerald-500/10 text-emerald-400",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    tags: ["GET /api/logs", "Auto-refresh"],
  },
  {
    href: "/overview",
    title: "System Overview",
    description: "Aggregate statistics showing total, normal, blocked, and suspicious requests across the entire system.",
    color: "from-violet-500/10 to-transparent border-violet-500/15 hover:border-violet-500/30",
    iconColor: "bg-violet-500/10 text-violet-400",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    tags: ["GET /api/stats", "Live counters"],
  },
];

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/15 text-[11px] font-medium text-cyan-400 mb-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Final Year Cybersecurity Project
        </div>
        <h1 className="text-3xl font-bold text-white">
          IoMT <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Shield</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
          A security simulation system for Internet of Medical Things. Detect and block API attacks targeting medical device endpoints in real time.
        </p>
      </div>

      {/* Quick-start cards */}
      <div className="grid gap-4">
        {cards.map(({ href, title, description, color, iconColor, icon, tags }) => (
          <Link
            key={href}
            href={href}
            className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 transition-all duration-200 hover:shadow-lg ${color}`}
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 p-2.5 rounded-lg ${iconColor}`}>
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-white group-hover:text-white/90 mb-1">
                  {title}
                  <svg className="w-4 h-4 inline-block ml-1.5 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{description}</p>
                <div className="flex gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-500 bg-gray-800/50 border border-gray-700/30">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">How the System Works</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-xs text-gray-400">
          <div className="flex gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] font-bold">1</div>
            <div>
              <p className="font-medium text-gray-300 mb-1">Data Ingestion</p>
              <p className="leading-relaxed">Simulated IoMT devices send heart rate readings via POST requests to the security API.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[10px] font-bold">2</div>
            <div>
              <p className="font-medium text-gray-300 mb-1">Threat Detection</p>
              <p className="leading-relaxed">The backend validates data ranges, detects DoS patterns, and flags anomalies in real time.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-[10px] font-bold">3</div>
            <div>
              <p className="font-medium text-gray-300 mb-1">Response</p>
              <p className="leading-relaxed">Malicious requests are blocked, suspicious ones flagged, and clean data passes through.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
