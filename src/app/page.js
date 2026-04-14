'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setIsAuth(isAuthenticated());
  }, []);

  const features = [
    {
      title: 'Real-Time Monitoring',
      description: 'Track every request in real-time with live updates and comprehensive logging.',
      items: ['Live Request Tracking', 'Threat Visualization', 'Status Filtering'],
    },
    {
      title: 'Security Analytics',
      description: 'Analyze security metrics and trends across your IoMT infrastructure.',
      items: ['Traffic Analytics', 'Threat Patterns', 'Performance Metrics'],
    },
    {
      title: 'Attack Simulation',
      description: 'Test your security posture with realistic attack scenarios and simulations.',
      items: ['DoS Testing', 'Data Spoofing', 'Anomaly Detection'],
    },
    {
      title: 'Device Management',
      description: 'Manage and monitor all connected medical devices in your network.',
      items: ['Device Registry', 'Status Monitoring', 'Configuration'],
    },
    {
      title: 'User Profiles',
      description: 'Manage user accounts, roles, and organizational settings.',
      items: ['Profile Management', 'Role-Based Access', 'Organization Setup'],
    },
    {
      title: 'Advanced Reporting',
      description: 'Generate detailed security reports and compliance documentation.',
      items: ['PDF Export', 'Compliance Reports', 'Audit Logs'],
    },
  ];

  const workflowSteps = [
    {
      number: '01',
      title: 'Data Ingestion',
      description: 'Medical devices send vitals through secure API endpoints. Each reading is timestamped and validated.',
    },
    {
      number: '02',
      title: 'Threat Detection',
      description: 'Multi-stage security pipeline inspects authentication, timing, rate limits, and anomalies.',
    },
    {
      number: '03',
      title: 'Decision & Response',
      description: 'Threats are blocked or flagged. Normal traffic flows safely to hospital systems.',
    },
    {
      number: '04',
      title: 'Audit & Analytics',
      description: 'All events logged for compliance, forensics, and security insights.',
    },
  ];

  const stats = [
    { label: 'Requests Processed', value: '1M+' },
    { label: 'Threats Blocked', value: '10K+' },
    { label: 'Network Uptime', value: '99.9%' },
    { label: 'Security Score', value: 'A+' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Logo/Name */}
        <div className="pt-8 pb-12 border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">I</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">IoMT Shield</h1>
              <p className="text-sm text-slate-500">Medical Device Security Platform</p>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-sm font-semibold text-blue-700">
                {isAuth ? `Welcome back, ${user?.fullName || 'User'}` : 'Cybersecurity Platform'}
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Secure Your Medical Device Network
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
              Monitor, simulate, and analyze Internet of Medical Things security with real-time threat detection and comprehensive analytics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuth ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    href="/simulator"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-slate-300 text-slate-900 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Run Simulation
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-slate-300 text-slate-900 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">{stat.value}</p>
              <p className="text-sm text-slate-600">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Workflow Section */}
        <section className="py-16 mb-16">
          <h3 className="text-3xl font-bold text-slate-900 text-center mb-12">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {workflowSteps.map((step) => (
              <div key={step.number} className="relative">
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{step.number}</span>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 mb-16">
          <h3 className="text-3xl font-bold text-slate-900 text-center mb-12">Powerful Features</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-blue-200 transition-all"
              >
                <h4 className="text-lg font-semibold text-slate-900 mb-3">{feature.title}</h4>
                <p className="text-sm text-slate-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-blue-600 font-bold mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Access Section */}
        {isAuth && (
          <section className="py-16 mb-16">
            <h3 className="text-3xl font-bold text-slate-900 text-center mb-12">Quick Access</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-200 bg-white p-8 hover:shadow-lg hover:border-blue-200 transition-all text-center"
              >
                <div className="text-3xl mb-3">📊</div>
                <h4 className="font-semibold text-slate-900 mb-2">Dashboard</h4>
                <p className="text-sm text-slate-600">Monitor live requests and threats</p>
              </Link>
              <Link
                href="/simulator"
                className="rounded-xl border border-slate-200 bg-white p-8 hover:shadow-lg hover:border-blue-200 transition-all text-center"
              >
                <div className="text-3xl mb-3">🔬</div>
                <h4 className="font-semibold text-slate-900 mb-2">Simulator</h4>
                <p className="text-sm text-slate-600">Test security scenarios</p>
              </Link>
              <Link
                href="/overview"
                className="rounded-xl border border-slate-200 bg-white p-8 hover:shadow-lg hover:border-blue-200 transition-all text-center"
              >
                <div className="text-3xl mb-3">📈</div>
                <h4 className="font-semibold text-slate-900 mb-2">Analytics</h4>
                <p className="text-sm text-slate-600">View security metrics</p>
              </Link>
            </div>
          </section>
        )}

        {/* Footer */}
        <section className="py-16 border-t border-slate-200/50 text-center">
          <p className="text-sm text-slate-600">
            IoMT Shield © 2026. A comprehensive security monitoring platform for medical device networks.
          </p>
        </section>
      </div>
    </div>
  );
}
