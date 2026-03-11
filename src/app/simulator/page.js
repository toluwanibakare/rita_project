"use client";

import { useState } from "react";
import { sendDeviceData, simulateAttack } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import DeviceForm from "@/components/DeviceForm";

export default function SimulatorPage() {
  const [deviceId, setDeviceId] = useState("DEVICE-001");
  const [heartRate, setHeartRate] = useState(75);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attackLog, setAttackLog] = useState([]);

  // Send Normal Data
  // To avoid looking like a frozen device, we add a tiny bit of natural variance (+/- 2 bpm)
  // This simulates a real patient's fluctuating heart rate and passes the Anomaly Check cleanly.
  async function handleSendNormal() {
    setLoading(true);
    setAttackLog([]);
    try {
      // Natural variance between -2 and +2 from base
      const variance = Math.floor(Math.random() * 5) - 2; 
      const realisticHR = Number(heartRate) + variance;
      
      const data = await sendDeviceData(deviceId, realisticHR);
      setResponse(data);
    } catch {
      setResponse({ status: "ERROR", message: "Could not reach backend" });
    }
    setLoading(false);
  }

  // Send Fake / Spoofed Data (Layer 2 & Layer 3 Tester)
  // This either sends an impossible physiological value (triggers Layer 2: Range Validator)
  // OR it sends a value just outside the moving average (triggers Layer 3: Anomaly Detection)
  async function handleSendFake() {
    setLoading(true);
    setAttackLog([]);
    
    // Mix of impossible values (spoofing) and abnormal spikes (tampering)
    const fakeValues = [
      -10,        // Impossible low
      0,          // Flatline (medical emergency, often spoofed)
      18,         // Below 30 (Impossible human resting rate)
      250,        // Above 220 (Impossible high)
      999,        // Glitch / Data Injection
      Number(heartRate) + 60, // Spike to trigger Layer 3 (Anomaly) without triggering Layer 2
      Number(heartRate) - 50  // Drop to trigger Layer 3 (Anomaly) without triggering Layer 2
    ];
    
    const fakeHR = fakeValues[Math.floor(Math.random() * fakeValues.length)];
    try {
      const data = await sendDeviceData(deviceId, fakeHR);
      setResponse({ ...data, sentValue: fakeHR });
    } catch {
      setResponse({ status: "ERROR", message: "Could not reach backend" });
    }
    setLoading(false);
  }

  // Simulate DoS Attack (Layer 1 Tester)
  // Sends a rapid burst of requests to trigger the Rate Limiter
  async function handleAttack() {
    setLoading(true);
    setResponse(null);
    setAttackLog([]);
    try {
      // API lib fires 50 requests concurrently without waiting.
      const results = await simulateAttack(deviceId, 50);
      setAttackLog(results);
      
      const blockedCount = results.filter((r) => r.status === "BLOCKED").length;
      
      setResponse({
        status: "ATTACK_COMPLETE",
        message: `Sent 50 rapid requests in parallel. The Rate Limiter successfully blocked ${blockedCount} requests.`,
      });
    } catch {
      setResponse({ status: "ERROR", message: "Attack simulation failed" });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Top row — Device config + controls */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Card 1 — Device Inputs */}
        <DeviceForm
          deviceId={deviceId}
          heartRate={heartRate}
          onDeviceIdChange={setDeviceId}
          onHeartRateChange={setHeartRate}
        />

        {/* Card 2 — Simulation Controls */}
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Simulation Controls</h3>
              <p className="text-[10px] text-gray-500">Choose what type of data to send</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={handleSendNormal}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-medium hover:bg-sky-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1 text-left">Send Normal Data</span>
              <span className="text-[10px] text-sky-500/60">Valid BPM (Simulate Pattern)</span>
            </button>

            <button
              onClick={handleSendFake}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium hover:bg-amber-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="flex-1 text-left">Send Fake Medical Data</span>
              <span className="text-[10px] text-amber-500/60">Spoofing / Injection Attack</span>
            </button>

            <button
              onClick={handleAttack}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium hover:bg-red-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="flex-1 text-left">Simulate DoS Burst</span>
              <span className="text-[10px] text-red-500/60">50 rapid requests (Flood)</span>
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing request…
            </div>
          )}
        </div>
      </div>

      {/* Card 3 — API Response */}
      {response && (
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">API Response</h3>
            </div>
            <StatusBadge status={response.status} />
          </div>

          {response.message && (
            <p className="text-sm text-gray-400">{response.message}</p>
          )}

          <pre className="rounded-lg bg-gray-950/60 border border-gray-800/40 p-4 text-xs text-gray-400 font-mono overflow-x-auto leading-relaxed">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}

      {/* Attack Log */}
      {attackLog.length > 0 && (
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-red-500/10">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Attack Log Statistics</h3>
              <p className="text-[10px] text-gray-500">{attackLog.length} requests sent concurrently</p>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-800/40">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-900/90">
                <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800/40">
                  <th className="px-3 py-2 w-12">#</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Details</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {attackLog.map((entry, i) => (
                  <tr key={i} className={`border-b border-gray-800/30 ${i % 2 === 0 ? "bg-transparent" : "bg-gray-900/30"}`}>
                    <td className="px-3 py-1.5 text-gray-600 font-mono">{(entry.index ?? i) + 1}</td>
                    <td className="px-3 py-1.5">
                      <StatusBadge status={entry.status || "ERROR"} />
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">
                      Sent {entry.heartRate || entry.sentValue || 'Random'} bpm
                    </td>
                    <td className="px-3 py-1.5 text-gray-400 truncate max-w-[200px]">
                      {entry.reason || entry.message || entry.error || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
