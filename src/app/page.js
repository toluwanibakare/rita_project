import Link from "next/link";

const cards = [
  {
    href: "/simulator",
    title: "Device Simulator",
    description: "Send mock IoMT vitals and run attack scenarios against your security API.",
    tags: ["POST /api/vitals", "Attack Simulation"],
    accent: "from-sky-100 to-blue-50 border-sky-200",
  },
  {
    href: "/dashboard",
    title: "Monitoring Dashboard",
    description: "Track every processed request, status decisions, and threat reasons in real time.",
    tags: ["GET /api/logs", "Live Updates"],
    accent: "from-emerald-100 to-teal-50 border-emerald-200",
  },
  {
    href: "/overview",
    title: "System Overview",
    description: "View aggregate metrics and telemetry trends across all inbound traffic.",
    tags: ["GET /api/stats", "Analytics"],
    accent: "from-amber-100 to-orange-50 border-amber-200",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 sm:py-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <p className="inline-flex px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-sky-200 bg-sky-50 text-sky-700">
          Final Year Cybersecurity Project
        </p>
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
          IoMT Shield Monitoring Platform
        </h1>
        <p className="mt-3 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
          Simulate medical device traffic, inspect API security decisions, and visualize threat handling across a complete Internet of Medical Things pipeline.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`rounded-2xl border bg-gradient-to-br ${card.accent} p-5 hover:shadow-md transition-all`}
          >
            <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{card.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono border border-slate-200 bg-white text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">How It Works</h3>
        <div className="mt-4 grid sm:grid-cols-3 gap-4">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Step 1</p>
            <h4 className="mt-1 font-semibold text-slate-900">Data Ingestion</h4>
            <p className="mt-2 text-sm text-slate-600">Simulated devices submit heart-rate readings through API requests.</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Step 2</p>
            <h4 className="mt-1 font-semibold text-slate-900">Threat Detection</h4>
            <p className="mt-2 text-sm text-slate-600">Security checks validate request rate, range, and anomaly patterns.</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Step 3</p>
            <h4 className="mt-1 font-semibold text-slate-900">Response</h4>
            <p className="mt-2 text-sm text-slate-600">Threats are blocked or flagged before records reach hospital systems.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
