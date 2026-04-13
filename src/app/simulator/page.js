"use client";

import { useEffect, useState } from "react";
import { fetchLogs, sendDeviceData, simulateAttack } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

const initialInspection = {
  authCheck: { status: "pending", label: "Identity Authorization Check" },
  timeVerify: { status: "pending", label: "Replay Attack Prevention" },
  rateLimit: { status: "pending", label: "Rate Limiting" },
  rangeCheck: { status: "pending", label: "Medical Range Validation" },
  anomalyCheck: { status: "pending", label: "Anomaly Pattern Scan" },
};

export default function SimulatorPage() {
  const [deviceId, setDeviceId] = useState("DEV-IOT-102");
  const [heartRate, setHeartRate] = useState(72);
  const [gatewayId, setGatewayId] = useState("GW-EDGE-01");
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [activeStep, setActiveStep] = useState("idle");
  const [securityInspection, setSecurityInspection] = useState(initialInspection);

  async function loadLogs() {
    try {
      const data = await fetchLogs();
      setRecentLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  const runSimulation = async (sendFn) => {
    setLoading(true);
    setCurrentResponse(null);
    setSecurityInspection(initialInspection);

    try {
      setActiveStep("wearable");
      await new Promise((r) => setTimeout(r, 300));
      setActiveStep("gateway");
      await new Promise((r) => setTimeout(r, 350));

      const result = await sendFn();
      setCurrentResponse(result);

      if (result.status === "BLOCKED") {
        if (result.stage === "Authentication") {
          setSecurityInspection({
            authCheck: { status: "fail", label: "Unauthorized Access" },
            timeVerify: { status: "skipped", label: "Skipped" },
            rateLimit: { status: "skipped", label: "Skipped" },
            rangeCheck: { status: "skipped", label: "Skipped" },
            anomalyCheck: { status: "skipped", label: "Skipped" },
          });
        } else if (result.stage === "Timestamp Validation") {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "fail", label: "Invalid Timestamp Drift" },
            rateLimit: { status: "skipped", label: "Skipped" },
            rangeCheck: { status: "skipped", label: "Skipped" },
            anomalyCheck: { status: "skipped", label: "Skipped" },
          });
        } else if (result.stage === "Rate Limiting") {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "pass", label: "Timestamp Verified" },
            rateLimit: { status: "fail", label: "Rate Limit Exceeded" },
            rangeCheck: { status: "skipped", label: "Skipped" },
            anomalyCheck: { status: "skipped", label: "Skipped" },
          });
        } else {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "pass", label: "Timestamp Verified" },
            rateLimit: { status: "pass", label: "Timing Approved" },
            rangeCheck: { status: "fail", label: "Out-of-Range Value" },
            anomalyCheck: { status: "skipped", label: "Skipped" },
          });
        }
        setActiveStep("blocked");
      } else if (result.status === "FLAGGED") {
        setSecurityInspection({
          authCheck: { status: "pass", label: "Identity Verified" },
          timeVerify: { status: "pass", label: "Timestamp Verified" },
          rateLimit: { status: "pass", label: "Timing Approved" },
          rangeCheck: { status: "pass", label: "In Valid Range" },
          anomalyCheck: { status: "warn", label: "Suspicious Pattern Flagged" },
        });
        setActiveStep("hospital");
      } else {
        setSecurityInspection({
          authCheck: { status: "pass", label: "Identity Verified" },
          timeVerify: { status: "pass", label: "Timestamp Verified" },
          rateLimit: { status: "pass", label: "Timing Approved" },
          rangeCheck: { status: "pass", label: "In Valid Range" },
          anomalyCheck: { status: "pass", label: "Pattern Approved" },
        });
        setActiveStep("hospital");
      }

      await loadLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNormal = () => {
    runSimulation(async () => {
      const variance = Math.floor(Math.random() * 5) - 2;
      return sendDeviceData(deviceId, Number(heartRate) + variance, gatewayId);
    });
  };

  const handleSendSpoofing = () => {
    runSimulation(async () => {
      const badValues = [-5, 12, 299, 500, 999];
      const randomBad = badValues[Math.floor(Math.random() * badValues.length)];
      return sendDeviceData(deviceId, randomBad, gatewayId);
    });
  };

  const handleSendAnomaly = () => {
    runSimulation(async () => sendDeviceData(deviceId, Number(heartRate) + 55, gatewayId));
  };

  const handleAttackDoS = async () => {
    setLoading(true);
    setActiveStep("gateway");
    try {
      await simulateAttack(deviceId, 30);
      await loadLogs();
      setCurrentResponse({
        status: "ATTACK_COMPLETE",
        reason: "Simulated 30 parallel requests to stress-test rate limiting.",
        reachedHospitalServer: false,
      });
      setSecurityInspection({
        ...initialInspection,
        authCheck: { status: "pass", label: "Identity Verified" },
        timeVerify: { status: "pass", label: "Timestamp Verified" },
        rateLimit: { status: "warn", label: "Rate Control Triggered by Burst" },
      });
      setActiveStep("blocked");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approvedCount = recentLogs.filter((l) => l.decision === "NORMAL").length;
  const blockedCount = recentLogs.filter((l) => l.decision === "BLOCKED").length;
  const flaggedCount = recentLogs.filter((l) => l.decision === "FLAGGED").length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-sky-200 bg-white p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">API Attack Detection Visualizer</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Trigger clean traffic and attack patterns to watch how each request is validated before reaching the hospital server.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">IoMT Data Flow</h3>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <div className={`rounded-xl p-3 border ${activeStep === "wearable" ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-xs font-semibold text-slate-800">Wearable Device</p>
            <p className="text-[11px] text-slate-500">Generates vitals payload.</p>
          </div>
          <div className={`rounded-xl p-3 border ${activeStep === "gateway" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-xs font-semibold text-slate-800">API Gateway Shield</p>
            <p className="text-[11px] text-slate-500">Runs authorization and threat checks.</p>
          </div>
          <div className={`rounded-xl p-3 border ${activeStep === "hospital" ? "border-emerald-300 bg-emerald-50" : activeStep === "blocked" ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-xs font-semibold text-slate-800">Hospital Server</p>
            <p className="text-[11px] text-slate-500">Stores clean requests only.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Total Requests" value={recentLogs.length} tone="sky" />
        <Stat title="Approved" value={approvedCount} tone="emerald" />
        <Stat title="Blocked" value={blockedCount} tone="rose" />
        <Stat title="Flagged" value={flaggedCount} tone="amber" />
      </section>

      <section className="grid xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Simulation Controller</h3>
          <p className="text-[11px] text-slate-500 mt-1">Adjust payload and choose a test scenario.</p>

          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <Input label="Device ID" value={deviceId} onChange={setDeviceId} />
            <Input label="Gateway ID" value={gatewayId} onChange={setGatewayId} />
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-slate-700">Heart Rate Context: {heartRate} bpm</label>
            <input
              type="range"
              min="10"
              max="230"
              value={heartRate}
              onChange={(e) => setHeartRate(Number(e.target.value))}
              className="w-full mt-2 accent-sky-600"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            <ActionButton onClick={handleSendNormal} disabled={loading} tone="emerald" title="Normal Traffic" desc="Healthy request" />
            <ActionButton onClick={handleSendSpoofing} disabled={loading} tone="rose" title="Spoofing Attack" desc="Impossible values" />
            <ActionButton onClick={handleAttackDoS} disabled={loading} tone="amber" title="DoS Flooding" desc="Rapid parallel requests" />
            <ActionButton onClick={handleSendAnomaly} disabled={loading} tone="sky" title="Subtle Anomaly" desc="Spike deviation pattern" />
          </div>
        </div>

        <div className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Security Inspection</h3>
            {currentResponse?.status ? <StatusBadge status={currentResponse.status} /> : null}
          </div>

          <div className="mt-4 space-y-2.5">
            {Object.entries(securityInspection).map(([key, item], idx) => (
              <InspectionRow key={key} label={item.label} status={item.status} stage={idx + 1} />
            ))}
          </div>

          {currentResponse && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <p>
                <span className="font-semibold text-slate-800">Result:</span> {currentResponse.reason}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Reached Hospital:</span>{" "}
                {currentResponse.reachedHospitalServer ? "Yes" : "No"}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <LogPanel
          title="Approved Healthcare Stream"
          subtitle="Requests that safely reached the hospital server"
          rows={recentLogs.filter((l) => l.reachedHospitalServer).slice(0, 10)}
          mode="approved"
        />

        <LogPanel
          title="Threat Mitigation Log"
          subtitle="Blocked or flagged requests intercepted by the gateway"
          rows={recentLogs.filter((l) => l.decision === "BLOCKED" || l.decision === "FLAGGED").slice(0, 10)}
          mode="threat"
        />
      </section>
    </div>
  );
}

function Stat({ title, value, tone }) {
  const tones = {
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide font-semibold">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>
  );
}

function ActionButton({ onClick, disabled, tone, title, desc }) {
  const tones = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    rose: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100",
    amber: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
    sky: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      <p className="text-xs font-semibold">{title}</p>
      <p className="text-[11px] mt-1 opacity-80">{desc}</p>
    </button>
  );
}

function InspectionRow({ label, status, stage }) {
  const statusStyle = {
    pending: "border-slate-200 bg-slate-50 text-slate-600",
    pass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    fail: "border-rose-200 bg-rose-50 text-rose-700",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    skipped: "border-slate-200 bg-slate-100 text-slate-500",
  };

  return (
    <div className={`rounded-xl border p-3 flex items-center justify-between ${statusStyle[status] || statusStyle.pending}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] font-mono">Stage {stage}</p>
    </div>
  );
}

function LogPanel({ title, subtitle, rows, mode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>

      <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
            <tr>
              <th className="p-2 text-left">Time</th>
              <th className="p-2 text-left">Device</th>
              <th className="p-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.deviceId}-${i}`} className="border-b border-slate-100">
                <td className="p-2 text-slate-500 font-mono">{new Date(row.timestamp).toLocaleTimeString()}</td>
                <td className="p-2 text-slate-700">{row.deviceId}</td>
                <td className="p-2">
                  {mode === "approved" ? (
                    <span className="text-emerald-700 font-medium">{row.heartRate} bpm</span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.decision === "BLOCKED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                      {row.decision}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="p-3 text-center text-slate-500">No records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
