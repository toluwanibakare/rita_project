"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setIsAuth(isAuthenticated());
  }, []);

  const features = [
    {
      title: "Real-Time Monitoring",
      description: "Track every request in real time with live updates.",
      items: ["Live Request Tracking", "Threat Visualization", "Status Filtering"],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      title: "Security Analytics",
      description: "Analyze threats and patterns across your network.",
      items: ["Traffic Analytics", "Threat Patterns", "Performance Metrics"],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: "Attack Simulation",
      description: "Test your system with realistic attack scenarios.",
      items: ["DoS Testing", "Data Spoofing", "Anomaly Detection"],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: "Device Management",
      description: "Monitor and manage connected medical devices.",
      items: ["Device Registry", "Status Monitoring", "Configuration"],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 8h14" />
        </svg>
      ),
    },
    {
      title: "User Profiles",
      description: "Control users, roles, and permissions.",
      items: ["Profile Management", "Access Control", "Organization Setup"],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: "Advanced Reporting",
      description: "Generate detailed logs and reports.",
      items: ["PDF Export", "Compliance Reports", "Audit Logs"],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const workflowSteps = [
    {
      title: "Data Ingestion",
      description: "Devices send vitals through secure endpoints.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      title: "Threat Detection",
      description: "Pipeline inspects timing, rate, and anomalies.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      title: "Decision Layer",
      description: "Threats are blocked or flagged instantly.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: "Audit Logs",
      description: "All events are stored for analytics and compliance.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="pt-8 pb-12 border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              I
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">IoMT Shield</h1>
              <p className="text-sm text-slate-500">Medical Security Platform</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <section className="py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Medical Security Platform</span>
          </div>
          <h2 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Secure Your Medical Network
          </h2>

          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Real time monitoring, attack simulation, and intelligent threat detection
            for modern medical systems.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuth ? (
              <>
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>
                <Link href="/simulator" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Simulator
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Get Started
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">99.9%</div>
              <div className="text-sm text-slate-500">Threat Detection Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">&lt;50ms</div>
              <div className="text-sm text-slate-500">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">24/7</div>
              <div className="text-sm text-slate-500">Real-time Monitoring</div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">How It Works</h3>
            <p className="text-slate-500 max-w-2xl mx-auto">End-to-end security pipeline for medical IoT devices</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {workflowSteps.map((step, i) => (
              <div key={i} className="group p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <div className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-1 rounded-full">0{i + 1}</div>
                </div>
                <h4 className="font-semibold text-lg mb-2 text-slate-900">{step.title}</h4>
                <p className="text-sm text-slate-600">{step.description}</p>
                {i < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">Powerful Features</h3>
            <p className="text-slate-500 max-w-2xl mx-auto">Everything you need to secure your medical infrastructure</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div key={f.title} className="group p-6 rounded-xl border bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>

                <h4 className="font-semibold text-lg mb-2 text-slate-900">{f.title}</h4>
                <p className="text-sm text-slate-600 mb-4">{f.description}</p>

                <ul className="space-y-2">
                  {f.items.map((item) => (
                    <li key={item} className="text-sm text-slate-600 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Access */}
        {isAuth && (
          <section className="py-16">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-slate-900 mb-4">Quick Access</h3>
              <p className="text-slate-500">Jump straight to your most used tools</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { 
                  title: "Dashboard", 
                  desc: "Monitor live traffic and system status", 
                  link: "/dashboard",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  )
                },
                { 
                  title: "Simulator", 
                  desc: "Run attack scenarios and test security", 
                  link: "/simulator",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                { 
                  title: "Analytics", 
                  desc: "View detailed insights and reports", 
                  link: "/overview",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )
                },
              ].map((item) => (
                <Link key={item.title} href={item.link} className="group p-8 rounded-xl border bg-white text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h4 className="font-semibold text-lg mb-2 text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Access <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA Section */}
        {!isAuth && (
          <section className="py-16">
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-12 text-center text-white">
              <h3 className="text-3xl font-bold mb-4">Ready to Secure Your Medical Network?</h3>
              <p className="text-blue-100 mb-8 max-w-2xl mx-auto">Join leading healthcare providers using IoMT Shield for comprehensive medical device security.</p>
              <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-blue-600 font-semibold hover:bg-slate-100 transition-all shadow-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Try it now
              </Link>
            </div>
          </section>
        )}

        {/* Footer */}
        <section className="py-12 border-t text-center text-sm text-slate-600">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                I
              </div>
              <span className="font-medium text-slate-700">IoMT Shield</span>
            </div>
            <div className="text-slate-500">© 2026 IoMT Shield. All rights reserved.</div>
          </div>
        </section>
      </div>
    </div>
  );
}