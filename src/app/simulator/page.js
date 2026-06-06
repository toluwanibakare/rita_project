"use client";

import { useState, useEffect, useRef } from "react";
import { sendDeviceData, fetchLogs } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { 
  Activity, Router, Shield, Server, Database, AlertTriangle, 
  CheckCircle, XCircle, ActivitySquare, Cpu, Lock, Terminal, FileCode2
} from "lucide-react";

// ─── Preset Scenarios & Explanations ──────────────────────────────
const PRESETS = [
  {
    id: "normal",
    label: "Normal Traffic",
    desc: "Valid vitals (72 BPM)",
    type: "safe",
    config: {
      deviceId: "DEV-IOT-102", heartRate: 72, gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false,
    },
  },
  {
    id: "sqli",
    label: "SQL Injection",
    desc: "Injects ' OR 1=1 --",
    type: "malicious",
    config: {
      deviceId: "DEV-IOT-102' OR 1=1 --", heartRate: 72, gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false,
    },
  },
  {
    id: "dos",
    label: "DoS Attack",
    desc: "Rapid API flooding",
    type: "malicious",
    config: {
      deviceId: "DEV-IOT-102", heartRate: 72, gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false,
    },
    isDos: true,
  },
  {
    id: "spoof",
    label: "Spoofed Data",
    desc: "Impossible HR (999 BPM)",
    type: "malicious",
    config: {
      deviceId: "DEV-IOT-102", heartRate: 999, gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false,
    },
  },
  {
    id: "anomaly",
    label: "Anomaly Attack",
    desc: "Sudden spike (150 BPM)",
    type: "suspicious",
    config: {
      deviceId: "DEV-IOT-102", heartRate: 150, gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false,
    },
  },
];

const EXPLANATIONS = {
  normal: {
    q1: "Normal traffic enters the system safely as a properly structured JSON payload originating from an authorized wearable device.",
    q2: "No attack is detected. The packet successfully passes all 6 security layers inside the API Engine.",
    q3: "The backend accepts the request because it passed rate limits, physiological bounds, and structural checks.",
    q4: "The API gateway passively monitors the request and allows it to proceed, updating the moving average baselines.",
    q5: "Before reaching the database, the Node.js application server formats the data and prepares parameterized SQL statements.",
    q6: "Since this is safe traffic, the absence of protection would have no adverse effect.",
    q7: "In IoMT systems, continuous, uninterrupted flow of safe physiological data is critical for real-time patient monitoring.",
    q8: "The API layer acts as the front door. By inspecting normal traffic here, we guarantee only clean data ever touches medical records."
  },
  sqli: {
    q1: "The attacker intercepts the edge device transmission and injects malicious SQL characters (' OR 1=1 --) into the deviceId field.",
    q2: "The attack is detected at Layer 3 (SQLi Detection) inside the API Security Engine via regex and input sanitization.",
    q3: "The backend server instantly drops the request. It never attempts to parse or execute the malicious string.",
    q4: "The API gateway blocks the payload, returns an HTTP 400 Bad Request to the attacker, and logs the event.",
    q5: "The request is completely destroyed. The database is never queried, and no connection pool is wasted.",
    q6: "Without this shield, the SQL command would execute, potentially wiping patient records or granting unauthorized access.",
    q7: "IoMT edge nodes are often physically accessible and easily compromised. Zero-trust API validation is required.",
    q8: "Since the database cannot distinguish between legitimate edge nodes and compromised ones, the API must filter everything first."
  },
  dos: {
    q1: "A compromised device floods the network with thousands of rapid-fire telemetry requests to exhaust server resources.",
    q2: "Detected at Layer 4 (Rate Limiter) when the API notices multiple requests arriving in under 800 milliseconds.",
    q3: "The backend is protected from CPU exhaustion and database connection pool starvation.",
    q4: "The API gateway begins dropping excess packets instantly (HTTP 429 Too Many Requests), protecting downstream servers.",
    q5: "The malicious packets are discarded at the edge of the API, keeping the database totally isolated from the flood.",
    q6: "The hospital database would crash under the load, causing a system-wide denial of service for all monitoring stations.",
    q7: "Medical networks often have limited bandwidth. A single hijacked device can easily flood a hospital network.",
    q8: "The API layer is the only choke point capable of absorbing and discarding high-volume traffic before it crashes internal systems."
  },
  spoof: {
    q1: "An attacker sends structurally valid JSON, but with an impossible physiological value (e.g., 999 BPM) to trigger false alarms.",
    q2: "Detected at Layer 5 (Medical Validation). The API checks the value against human survival bounds (30 - 220 BPM).",
    q3: "The backend rejects the data to maintain clinical integrity and prevent alarm fatigue for nurses.",
    q4: "The API gateway parses the physiological payload, spots the discrepancy, and blocks the insertion.",
    q5: "The request is dropped. The fake data never corrupts the patient's historical medical timeline.",
    q6: "Doctors would receive critical false alarms, potentially leading to incorrect emergency treatments or alarm fatigue.",
    q7: "Wearable sensors can malfunction or be tampered with. The system must never trust raw sensor data blindly.",
    q8: "By enforcing clinical rules at the API layer, we keep the database purely focused on storage, not medical logic validation."
  },
  anomaly: {
    q1: "The attacker subtly alters the telemetry data (e.g., jumping from 80 to 150 BPM) to mimic a cardiac event.",
    q2: "Detected at Layer 6 (Statistical Anomaly). The API computes a moving average and flags sudden, unnatural deviations.",
    q3: "The backend flags the data rather than blocking it, ensuring doctors can review suspicious but potentially real medical events.",
    q4: "The API gateway runs a lightweight algorithm to compare the new packet against historical baselines.",
    q5: "The request is marked as 'FLAGGED' and then inserted into the database for clinical review.",
    q6: "Subtle data manipulation attacks would go unnoticed, potentially leading to slow poisoning of medical datasets.",
    q7: "In healthcare, anomalies can mean either an attack or a dying patient. Both require immediate attention.",
    q8: "The API is the best place to run real-time statistical buffers, as it sees all data before it is committed."
  }
};

// ─── Main Component ────────────────────────────────────────────────
export default function SimulatorPage() {
  const [activeStage, setActiveStage] = useState("IDLE"); // IDLE, WEARABLE, EDGE, API, API_SCAN, BACKEND, DB, BLOCKED
  const [packetState, setPacketState] = useState(null); // { type: 'safe'|'malicious', preset: ... }
  const [apiVerdict, setApiVerdict] = useState(null); // { status, layer, reason }
  const [logs, setLogs] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeLayerScan, setActiveLayerScan] = useState(null);
  const [activePresetId, setActivePresetId] = useState("normal");

  // Fetch logs
  useEffect(() => {
    fetchLogs().then(data => {
      if (data?.logs) setLogs(data.logs.slice(0, 6));
    });
    
    const channel = supabase.channel("simulator-soc")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "logs" }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 6));
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ─── Simulation Engine ──────────────────────────────────────────
  const runSimulation = async (preset) => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActivePresetId(preset.id);
    setApiVerdict(null);
    setActiveLayerScan(null);

    const isMalicious = preset.type !== "safe";
    setPacketState({ type: isMalicious ? "malicious" : "safe", preset: preset.id });

    // 1. Wearable
    setActiveStage("WEARABLE");
    await sleep(800);

    // 2. Edge
    setActiveStage("EDGE");
    await sleep(800);

    // 3. API Entry
    setActiveStage("API");
    await sleep(500);

    // 4. API Scanning
    setActiveStage("API_SCAN");
    
    let result;
    try {
      if (preset.isDos) {
        await sendDeviceData(preset.config.deviceId, preset.config.heartRate, preset.config.gatewayId, preset.config.bypassShield, preset.config.authToken, new Date().toISOString());
      }
      const ts = preset.config.timeMode === "current" ? new Date().toISOString() : "2020-01-01T00:00:00.000Z";
      result = await sendDeviceData(preset.config.deviceId, preset.config.heartRate, preset.config.gatewayId, preset.config.bypassShield, preset.config.authToken, ts);
    } catch (e) {
      result = { status: "ERROR", reason: e.message };
    }

    const checks = result.checks || {};
    const layers = [
      { id: "auth", name: "IAM Authorization" },
      { id: "timestamp", name: "Anti-Replay" },
      { id: "sqli", name: "SQLi Detection" },
      { id: "rateLimit", name: "Rate Limiter" },
      { id: "range", name: "Medical Validation" },
      { id: "anomaly", name: "Anomaly Detection" }
    ];

    let blockedLayer = null;
    let finalReason = result.reason;

    for (const layer of layers) {
      setActiveLayerScan(layer.id);
      await sleep(400); 
      if (checks[layer.id] && checks[layer.id].status === "FAILED") {
        blockedLayer = layer;
        break;
      }
    }

    if (result.status === "BLOCKED") {
      setActiveStage("BLOCKED");
      setApiVerdict({ status: "BLOCKED", layer: blockedLayer?.name || result.stage, reason: finalReason });
      await sleep(2000);
    } else {
      setActiveLayerScan("PASSED");
      await sleep(500);
      setActiveStage("BACKEND");
      await sleep(800);
      setActiveStage("DB");
      setApiVerdict({ status: "PASSED", layer: "Database", reason: "Data safely inserted." });
      await sleep(1500);
    }

    setActiveStage("IDLE");
    setPacketState(null);
    setApiVerdict(null);
    setActiveLayerScan(null);
    setIsSimulating(false);
  };

  const activeExplanation = EXPLANATIONS[activePresetId] || EXPLANATIONS.normal;
  const activePresetConfig = PRESETS.find(p => p.id === activePresetId)?.config || PRESETS[0].config;

  // ─── Render Helpers (LIGHT THEME) ────────────────────────────────
  const getNodeColor = (nodeId) => {
    if (activeStage === "BLOCKED" && nodeId === "API") return "border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)] bg-rose-50 text-rose-600";
    if (activeStage === nodeId || (nodeId === "API" && activeStage === "API_SCAN")) {
      return packetState?.type === "malicious" 
        ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] bg-white text-rose-600"
        : "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-white text-emerald-600";
    }
    return "border-slate-200 bg-white text-slate-500 shadow-sm";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flowRight {
          0% { transform: translateX(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(100px); opacity: 0; }
        }
        @keyframes bounceBack {
          0% { transform: translateX(0); opacity: 1; }
          40% { transform: translateX(-30px) scale(1.2); opacity: 1; background-color: #ef4444; }
          100% { transform: translateX(-150px) scale(0.5) translateY(50px); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); border-color: #10b981; }
          50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.5); border-color: #34d399; }
        }
        @keyframes pulseGlowRed {
          0%, 100% { box-shadow: 0 0 15px rgba(244, 63, 94, 0.2); border-color: #f43f5e; }
          50% { box-shadow: 0 0 35px rgba(244, 63, 94, 0.6); border-color: #fb7185; }
        }
        .animate-flow { animation: flowRight 0.8s linear forwards; }
        .animate-bounce-back { animation: bounceBack 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .node-active-safe { animation: pulseGlow 1.5s infinite; }
        .node-active-malicious { animation: pulseGlowRed 0.5s infinite; }
      `}} />

      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT COLUMN: SIMULATOR & PAYLOAD ─────────────────────── */}
        <div className="w-2/3 flex flex-col border-r border-slate-200 bg-slate-50">
          
          {/* Controls */}
          <div className="bg-white border-b border-slate-200 p-6 z-10 shrink-0">
            <h1 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Shield className="text-emerald-500 w-6 h-6" /> API Attack Visualization Simulator
            </h1>
            <p className="text-slate-500 text-sm mb-4">
              Click a scenario below to visualize data flow, API inspection, and payload interception.
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => runSimulation(p)}
                  disabled={isSimulating}
                  className={`px-3 py-1.5 rounded border text-sm font-semibold transition-all disabled:opacity-50
                    ${activePresetId === p.id ? 'ring-2 ring-offset-1' : ''}
                    ${p.type === 'safe' 
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-500' 
                      : p.type === 'suspicious' 
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-500'
                      : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 ring-rose-500'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Flow Diagram */}
          <div className="relative flex-1 bg-slate-100/50 p-6 flex flex-col justify-center min-h-[350px]">
            <div className="absolute top-1/2 left-10 right-10 h-1 bg-slate-300 -translate-y-1/2 z-0 rounded" />

            <div className="flex items-center justify-between relative z-10 w-full max-w-4xl mx-auto">
              {/* Node 1: Wearable */}
              <div className="relative flex flex-col items-center">
                <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all duration-300 bg-white ${getNodeColor("WEARABLE")} ${activeStage === "WEARABLE" ? "scale-110" : ""}`}>
                  <Activity className="w-6 h-6" />
                </div>
                <span className="mt-2 font-semibold text-xs text-slate-700">Wearable</span>
                {activeStage === "WEARABLE" && (
                  <div className={`absolute top-1/2 -right-6 w-3 h-3 rounded-full -translate-y-1/2 animate-flow ${packetState?.type === 'malicious' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                )}
              </div>

              {/* Node 2: Edge */}
              <div className="relative flex flex-col items-center">
                <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all duration-300 bg-white ${getNodeColor("EDGE")} ${activeStage === "EDGE" ? "scale-110" : ""}`}>
                  <Router className="w-6 h-6" />
                </div>
                <span className="mt-2 font-semibold text-xs text-slate-700">Gateway</span>
                {activeStage === "EDGE" && (
                  <div className={`absolute top-1/2 -right-6 w-3 h-3 rounded-full -translate-y-1/2 animate-flow ${packetState?.type === 'malicious' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                )}
              </div>

              {/* Node 3: API Security */}
              <div className="relative flex flex-col items-center">
                <div className={`w-32 h-32 rounded-2xl border-[3px] flex flex-col items-center justify-center transition-all duration-300 bg-white ${getNodeColor("API")} ${activeStage === "API_SCAN" || activeStage === "BLOCKED" ? (packetState?.type === 'malicious' ? 'node-active-malicious scale-110' : 'node-active-safe scale-110') : ''}`}>
                  {activeStage === "BLOCKED" ? <AlertTriangle className="w-10 h-10 text-rose-500 mb-1" /> : <Shield className={`w-10 h-10 mb-1 ${activeStage === 'API_SCAN' ? 'text-emerald-500' : ''}`} />}
                  <span className="font-bold text-[11px] text-center leading-tight">API Security<br/>Engine</span>
                </div>
                
                <div className="absolute top-[140px] w-52 bg-white border border-slate-200 rounded-lg p-2 text-[9px] font-mono shadow-xl z-20">
                  <div className="text-slate-600 mb-1 pb-1 border-b border-slate-100 font-bold">INSPECTION ENGINE</div>
                  {[
                    { id: "auth", name: "1. IAM Auth" }, { id: "timestamp", name: "2. Anti-Replay" },
                    { id: "sqli", name: "3. SQLi Detection" }, { id: "rateLimit", name: "4. Rate Limiter" },
                    { id: "range", name: "5. Med Validation" }, { id: "anomaly", name: "6. Anomaly Scan" }
                  ].map(layer => (
                    <div key={layer.id} className="flex justify-between items-center py-0.5">
                      <span className={`${activeLayerScan === layer.id ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>{layer.name}</span>
                      {activeLayerScan === layer.id && activeStage !== "BLOCKED" && <ActivitySquare className="w-3 h-3 animate-spin text-emerald-500" />}
                      {apiVerdict?.layer?.includes(layer.name.split(' ')[1]) && activeStage === "BLOCKED" && <XCircle className="w-3 h-3 text-rose-500" />}
                    </div>
                  ))}
                </div>

                {activeStage === "BLOCKED" && (
                  <div className="absolute top-1/2 -left-3 w-4 h-4 bg-rose-500 rounded-sm -translate-y-1/2 animate-bounce-back flex items-center justify-center text-[8px] font-bold text-white shadow-md">!</div>
                )}
                {activeStage === "API_SCAN" && activeLayerScan === "PASSED" && (
                  <div className="absolute top-1/2 -right-6 w-3 h-3 rounded-full -translate-y-1/2 animate-flow bg-emerald-500 shadow-sm" />
                )}

                {apiVerdict && (
                  <div className={`absolute -top-20 w-64 p-2 rounded-lg border shadow-xl flex flex-col items-center text-center animate-[fadeSlideIn_0.3s_ease-out] z-30 bg-white ${apiVerdict.status === 'BLOCKED' ? 'border-rose-200' : 'border-emerald-200'}`}>
                    <span className={`font-bold text-xs uppercase ${apiVerdict.status === 'BLOCKED' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {apiVerdict.status === 'BLOCKED' ? 'Attack Blocked' : 'Traffic Safe'}
                    </span>
                    <span className="text-[10px] text-slate-600 mt-0.5">{apiVerdict.reason}</span>
                  </div>
                )}
              </div>

              {/* Node 4: Backend */}
              <div className="relative flex flex-col items-center">
                <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all duration-300 bg-white ${getNodeColor("BACKEND")} ${activeStage === "BACKEND" ? "scale-110" : ""}`}>
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="mt-2 font-semibold text-xs text-slate-700">App Server</span>
                {activeStage === "BACKEND" && (
                  <div className="absolute top-1/2 -right-6 w-3 h-3 rounded-full bg-emerald-500 -translate-y-1/2 animate-flow shadow-sm" />
                )}
              </div>

              {/* Node 5: Database */}
              <div className="relative flex flex-col items-center">
                <div className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center transition-all duration-300 bg-white ${getNodeColor("DB")} ${activeStage === "DB" ? "scale-110 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-400 text-emerald-500" : ""}`}>
                  <Database className="w-8 h-8" />
                </div>
                <span className="mt-2 font-semibold text-xs flex items-center gap-1 text-slate-700">
                  <Lock className="w-3 h-3 text-emerald-500" /> Hospital DB
                </span>
              </div>
            </div>
          </div>

          {/* Live Payload Inspector */}
          <div className="h-48 bg-slate-900 border-t border-slate-800 p-4 shrink-0 flex flex-col font-mono text-[11px] text-slate-300 overflow-hidden relative">
            <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2 border-b border-slate-700 pb-1">
              <Terminal className="w-3 h-3" /> Live API Payload Inspector
            </h3>
            {packetState ? (
              <div className="flex gap-6 overflow-hidden">
                <div className="flex-1">
                  <div className="text-slate-500 mb-1">HTTP REQUEST</div>
                  <div className="text-sky-300">POST /api/vitals HTTP/1.1</div>
                  <div>Host: api.hospital-iomt.local</div>
                  <div>Authorization: {activePresetConfig.authToken}</div>
                  <div>Content-Type: application/json</div>
                </div>
                <div className="flex-1">
                  <div className="text-slate-500 mb-1">JSON BODY</div>
                  <pre className="text-amber-200/90 whitespace-pre-wrap leading-tight">
{`{
  "deviceId": "${activePresetConfig.deviceId}",
  "heartRate": ${activePresetConfig.heartRate},
  "gatewayId": "${activePresetConfig.gatewayId}",
  "timestamp": "${new Date().toISOString()}"
}`}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600 italic">
                Waiting for transmission...
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: ACADEMIC DEFENSE PANEL ───────────────────── */}
        <div className="w-1/3 bg-white flex flex-col border-b border-slate-200">
          <div className="p-4 bg-slate-100 border-b border-slate-200 shrink-0">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-indigo-500" /> Academic Defense View
            </h2>
            <p className="text-xs text-slate-500 mt-1">Explaining: <strong className="text-indigo-600">{PRESETS.find(p=>p.id===activePresetId)?.label}</strong></p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-slate-600">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">1. How does the attack enter?</strong>
              {activeExplanation.q1}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">2. Where is it detected?</strong>
              {activeExplanation.q2}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">3. How is the backend protected?</strong>
              {activeExplanation.q3}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">4. How does the API mitigate it?</strong>
              {activeExplanation.q4}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">5. Pre-database actions?</strong>
              {activeExplanation.q5}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">6. If protection was absent?</strong>
              {activeExplanation.q6}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">7. Application to IoMT?</strong>
              {activeExplanation.q7}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">8. Why target the API layer?</strong>
              {activeExplanation.q8}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM: SOC DASHBOARD (Logs) ───────────────────────────── */}
      <div className="h-48 bg-white border-t border-slate-200 shrink-0 flex flex-col shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-20">
        <div className="px-5 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-xs flex items-center gap-2 text-slate-700">
            <ActivitySquare className="w-4 h-4 text-emerald-500" /> Security Operations Center (SOC Logs)
          </h3>
          <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Feed
          </span>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="pb-1.5 font-semibold w-24">Time</th>
                <th className="pb-1.5 font-semibold">Source Payload</th>
                <th className="pb-1.5 font-semibold">Action Taken</th>
                <th className="pb-1.5 font-semibold">Detection Layer</th>
                <th className="pb-1.5 font-semibold">DB Status</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-2 text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </td>
                  <td className="py-2 text-slate-700 truncate max-w-[150px]" title={log.deviceId}>{log.deviceId}</td>
                  <td className="py-2">
                    {log.status === "BLOCKED" || log.decision === "BLOCKED" ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 font-bold flex w-fit items-center gap-1"><XCircle className="w-3 h-3"/> BLOCKED</span>
                    ) : log.status === "FLAGGED" || log.decision === "FLAGGED" ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold flex w-fit items-center gap-1"><AlertTriangle className="w-3 h-3"/> FLAGGED</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold flex w-fit items-center gap-1"><CheckCircle className="w-3 h-3"/> ACCEPTED</span>
                    )}
                  </td>
                  <td className="py-2 text-slate-500">{log.stage}</td>
                  <td className="py-2">
                    {log.reachedHospitalServer ? (
                      <span className="text-emerald-600 font-semibold">Inserted (Safe)</span>
                    ) : (
                      <span className="text-rose-600 font-semibold">Protected (No Write)</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">No network traffic detected.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}