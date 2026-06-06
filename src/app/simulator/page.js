"use client";

import { useState, useEffect, useRef } from "react";
import { sendDeviceData, fetchLogs } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { 
  Activity, Router, Shield, Server, Database, AlertTriangle, 
  CheckCircle, XCircle, ActivitySquare, Cpu, Lock
} from "lucide-react";

// ─── Preset Scenarios ──────────────────────────────────────────────
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
    // For DoS, we might just trigger the same API twice instantly to hit the rate limiter
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

// ─── Main Component ────────────────────────────────────────────────
export default function SimulatorPage() {
  const [activeStage, setActiveStage] = useState("IDLE"); // IDLE, WEARABLE, EDGE, API, API_SCAN, BACKEND, DB, BLOCKED
  const [packetState, setPacketState] = useState(null); // { type: 'safe'|'malicious', payload: ... }
  const [apiVerdict, setApiVerdict] = useState(null); // Result from backend { status, layer, reason }
  const [logs, setLogs] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeLayerScan, setActiveLayerScan] = useState(null);

  // Fetch initial logs for SOC dashboard
  useEffect(() => {
    fetchLogs().then(data => {
      if (data?.logs) setLogs(data.logs.slice(0, 8));
    });
    
    // Subscribe to DB inserts
    const channel = supabase.channel("simulator-soc")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "logs" }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 8));
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ─── Simulation Engine ──────────────────────────────────────────
  const runSimulation = async (preset) => {
    if (isSimulating) return;
    setIsSimulating(true);
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

    // 4. API Scanning (The Engine)
    setActiveStage("API_SCAN");
    
    // Call the real backend to get the actual results
    let result;
    try {
      if (preset.isDos) {
        // Trigger it once to set the timer, then again immediately to hit the limit
        await sendDeviceData(preset.config.deviceId, preset.config.heartRate, preset.config.gatewayId, preset.config.bypassShield, preset.config.authToken, new Date().toISOString());
      }
      
      const ts = preset.config.timeMode === "current" ? new Date().toISOString() : "2020-01-01T00:00:00.000Z";
      result = await sendDeviceData(preset.config.deviceId, preset.config.heartRate, preset.config.gatewayId, preset.config.bypassShield, preset.config.authToken, ts);
    } catch (e) {
      result = { status: "ERROR", reason: e.message };
    }

    const checks = result.checks || {};
    
    // Visually scan through the layers
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
      await sleep(400); // Time to scan each layer
      if (checks[layer.id] && checks[layer.id].status === "FAILED") {
        blockedLayer = layer;
        break;
      }
    }

    if (result.status === "BLOCKED") {
      // 5a. Blocked!
      setActiveStage("BLOCKED");
      setApiVerdict({
        status: "BLOCKED",
        layer: blockedLayer?.name || result.stage,
        reason: finalReason
      });
      await sleep(2000);
    } else {
      // 5b. Passed!
      setActiveLayerScan("PASSED");
      await sleep(500);
      
      setActiveStage("BACKEND");
      await sleep(800);

      setActiveStage("DB");
      setApiVerdict({
        status: "PASSED",
        layer: "Database",
        reason: "Data safely inserted."
      });
      await sleep(1500);
    }

    // Reset
    setActiveStage("IDLE");
    setPacketState(null);
    setApiVerdict(null);
    setActiveLayerScan(null);
    setIsSimulating(false);
  };

  const runMixedTraffic = async () => {
    if (isSimulating) return;
    await runSimulation(PRESETS.find(p => p.id === "normal"));
    await sleep(1000);
    await runSimulation(PRESETS.find(p => p.id === "sqli"));
    await sleep(1000);
    await runSimulation(PRESETS.find(p => p.id === "anomaly"));
  };

  // ─── Render Helpers ─────────────────────────────────────────────
  const getNodeColor = (nodeId) => {
    if (activeStage === "BLOCKED" && nodeId === "API") return "border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.6)] bg-rose-950/40 text-rose-400";
    if (activeStage === nodeId || (nodeId === "API" && activeStage === "API_SCAN")) {
      return packetState?.type === "malicious" 
        ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] bg-[#1c2333] text-rose-400"
        : "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] bg-[#1c2333] text-cyan-300";
    }
    return "border-slate-700 bg-[#0d1117] text-slate-400";
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col text-slate-300 font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flowRight {
          0% { transform: translateX(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(100px); opacity: 0; }
        }
        @keyframes bounceBack {
          0% { transform: translateX(0); opacity: 1; }
          40% { transform: translateX(-30px) scale(1.2); opacity: 1; background-color: #f43f5e; }
          100% { transform: translateX(-150px) scale(0.5) translateY(50px); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(34, 211, 238, 0.2); }
          50% { box-shadow: 0 0 35px rgba(34, 211, 238, 0.6); }
        }
        @keyframes pulseGlowRed {
          0%, 100% { box-shadow: 0 0 15px rgba(244, 63, 94, 0.2); }
          50% { box-shadow: 0 0 45px rgba(244, 63, 94, 0.8); border-color: #f43f5e; }
        }
        .animate-flow { animation: flowRight 0.8s linear forwards; }
        .animate-bounce-back { animation: bounceBack 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .node-active-safe { animation: pulseGlow 1.5s infinite; }
        .node-active-malicious { animation: pulseGlowRed 0.5s infinite; }
      `}} />

      {/* ─── HEADER & CONTROLS ────────────────────────────────────── */}
      <div className="bg-[#0d1117] border-b border-slate-800 p-6 z-10 shrink-0">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Shield className="text-cyan-400" /> API Attack Visualization & Defense Simulator
        </h1>
        <p className="text-slate-400 text-sm mb-6 max-w-4xl">
          This platform demonstrates how medical data moves through an IoMT environment. 
          Select an attack below to visualize how the **API Security Layer** acts as the primary attack surface, 
          detecting and neutralizing malicious payloads *before* they can reach the hospital database.
        </p>

        <div className="flex flex-wrap gap-3">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => runSimulation(p)}
              disabled={isSimulating}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all flex flex-col items-start disabled:opacity-50
                ${p.type === 'safe' 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                  : p.type === 'suspicious' 
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'}`}
            >
              <span>{p.label}</span>
              <span className="text-[10px] opacity-70 font-mono">{p.desc}</span>
            </button>
          ))}
          <button
            onClick={runMixedTraffic}
            disabled={isSimulating}
            className="px-4 py-2 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-sm font-semibold transition-all flex flex-col items-start disabled:opacity-50"
          >
            <span>Mixed Traffic</span>
            <span className="text-[10px] opacity-70 font-mono">Fires multiple requests</span>
          </button>
        </div>
      </div>

      {/* ─── VISUAL ARCHITECTURE FLOW ─────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#080c14] to-[#080c14] p-8 flex flex-col justify-center">
        
        {/* Connection Lines Background */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />

        <div className="flex items-center justify-between relative z-10 max-w-7xl mx-auto w-full">
          
          {/* Node 1: Wearable */}
          <div className="relative flex flex-col items-center">
            <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center bg-[#0d1117] transition-all duration-300 ${getNodeColor("WEARABLE")} ${activeStage === "WEARABLE" ? "scale-110" : ""}`}>
              <Activity className="w-8 h-8" />
            </div>
            <span className="mt-4 font-semibold text-sm">Wearable</span>
            <span className="text-[10px] text-slate-500">IoMT Source</span>
            
            {activeStage === "WEARABLE" && (
              <div className={`absolute top-1/2 -right-8 w-4 h-4 rounded-full -translate-y-1/2 animate-flow ${packetState?.type === 'malicious' ? 'bg-rose-500' : 'bg-emerald-400 shadow-[0_0_10px_#34d399]'}`} />
            )}
          </div>

          {/* Node 2: Edge */}
          <div className="relative flex flex-col items-center">
            <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center bg-[#0d1117] transition-all duration-300 ${getNodeColor("EDGE")} ${activeStage === "EDGE" ? "scale-110" : ""}`}>
              <Router className="w-8 h-8" />
            </div>
            <span className="mt-4 font-semibold text-sm">Gateway</span>
            <span className="text-[10px] text-slate-500">Edge Device</span>

            {activeStage === "EDGE" && (
              <div className={`absolute top-1/2 -right-8 w-4 h-4 rounded-full -translate-y-1/2 animate-flow ${packetState?.type === 'malicious' ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-emerald-400'}`} />
            )}
          </div>

          {/* Node 3: API Security Engine (The main focus) */}
          <div className="relative flex flex-col items-center">
            <div className={`w-40 h-40 rounded-3xl border-4 flex flex-col items-center justify-center transition-all duration-300 ${getNodeColor("API")} ${activeStage === "API_SCAN" || activeStage === "BLOCKED" ? (packetState?.type === 'malicious' ? 'node-active-malicious scale-110' : 'node-active-safe scale-110') : ''}`}>
              {activeStage === "BLOCKED" ? (
                <AlertTriangle className="w-12 h-12 text-rose-500 mb-2" />
              ) : (
                <Shield className={`w-12 h-12 mb-2 ${activeStage === 'API_SCAN' ? 'text-cyan-400' : ''}`} />
              )}
              <span className="font-bold text-center leading-tight">API Security<br/>Gateway</span>
            </div>
            <span className="mt-4 font-semibold text-sm text-cyan-400">The Attack Surface</span>
            
            {/* The Layers Box */}
            <div className="absolute top-[180px] w-64 bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-[10px] font-mono shadow-2xl backdrop-blur-sm">
              <div className="text-slate-400 mb-2 pb-1 border-b border-slate-700 font-bold">INSPECTION ENGINE</div>
              {[
                { id: "auth", name: "1. IAM Auth" },
                { id: "timestamp", name: "2. Anti-Replay" },
                { id: "sqli", name: "3. SQLi Detection" },
                { id: "rateLimit", name: "4. Rate Limiter" },
                { id: "range", name: "5. Med Validation" },
                { id: "anomaly", name: "6. Anomaly Scan" }
              ].map(layer => (
                <div key={layer.id} className="flex justify-between items-center py-1">
                  <span className={`${activeLayerScan === layer.id ? 'text-white font-bold' : 'text-slate-500'}`}>{layer.name}</span>
                  {activeLayerScan === layer.id && activeStage !== "BLOCKED" && <ActivitySquare className="w-3 h-3 animate-spin text-cyan-400" />}
                  {apiVerdict?.layer?.includes(layer.name.split(' ')[1]) && activeStage === "BLOCKED" && <XCircle className="w-3 h-3 text-rose-500" />}
                </div>
              ))}
            </div>

            {/* Packet animations leaving API */}
            {activeStage === "BLOCKED" && (
              <div className="absolute top-1/2 -left-4 w-5 h-5 bg-rose-500 rounded-sm -translate-y-1/2 animate-bounce-back flex items-center justify-center text-[8px] font-bold text-white shadow-[0_0_15px_#f43f5e]">
                !
              </div>
            )}
            {activeStage === "API_SCAN" && activeLayerScan === "PASSED" && (
              <div className="absolute top-1/2 -right-8 w-4 h-4 rounded-full -translate-y-1/2 animate-flow bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            )}

            {/* Floating Alert Box */}
            {apiVerdict && (
              <div className={`absolute -top-24 w-80 p-3 rounded-lg border shadow-2xl backdrop-blur-md flex flex-col items-center text-center animate-[fadeSlideIn_0.3s_ease-out] z-50
                ${apiVerdict.status === 'BLOCKED' ? 'bg-rose-950/80 border-rose-500/50 text-rose-200' : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'}`}>
                <span className="font-bold text-sm uppercase tracking-wider mb-1">
                  {apiVerdict.status === 'BLOCKED' ? 'Attack Blocked' : 'Traffic Safe'}
                </span>
                <span className="text-xs">{apiVerdict.reason}</span>
                {apiVerdict.status === 'BLOCKED' && (
                  <span className="text-[10px] mt-1 text-rose-400 font-mono block border-t border-rose-800/50 pt-1 w-full">Detected at: {apiVerdict.layer}</span>
                )}
              </div>
            )}
          </div>

          {/* Node 4: Backend */}
          <div className="relative flex flex-col items-center">
            <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center bg-[#0d1117] transition-all duration-300 ${getNodeColor("BACKEND")} ${activeStage === "BACKEND" ? "scale-110" : ""}`}>
              <Cpu className="w-8 h-8" />
            </div>
            <span className="mt-4 font-semibold text-sm">App Server</span>
            <span className="text-[10px] text-slate-500">Node.js Backend</span>
            
            {activeStage === "BACKEND" && (
              <div className="absolute top-1/2 -right-8 w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] -translate-y-1/2 animate-flow" />
            )}
          </div>

          {/* Node 5: Database */}
          <div className="relative flex flex-col items-center">
            <div className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center bg-[#0d1117] transition-all duration-300 ${getNodeColor("DB")} ${activeStage === "DB" ? "scale-110 shadow-[0_0_20px_#34d399] border-emerald-400 text-emerald-400" : ""}`}>
              <Database className="w-10 h-10" />
            </div>
            <span className="mt-4 font-semibold text-sm flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" /> Hospital DB
            </span>
            <span className="text-[10px] text-slate-500">PostgreSQL</span>
          </div>

        </div>
      </div>

      {/* ─── SOC DASHBOARD (Logs) ─────────────────────────────────── */}
      <div className="bg-[#0d1117] border-t border-slate-800 shrink-0 h-64 flex flex-col">
        <div className="px-6 py-3 border-b border-slate-800 flex justify-between items-center bg-[#161b22]">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <ActivitySquare className="w-4 h-4 text-cyan-400" /> Security Operations Center (Real-Time Monitoring)
          </h3>
          <span className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="pb-2 font-medium w-32">Timestamp</th>
                <th className="pb-2 font-medium">Device Source</th>
                <th className="pb-2 font-medium">Mitigation Action</th>
                <th className="pb-2 font-medium">Detection Layer</th>
                <th className="pb-2 font-medium">DB Status</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="py-2.5 text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </td>
                  <td className="py-2.5 text-slate-300 truncate max-w-[150px]" title={log.deviceId}>{log.deviceId}</td>
                  <td className="py-2.5">
                    {log.status === "BLOCKED" || log.decision === "BLOCKED" ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold flex w-fit items-center gap-1"><XCircle className="w-3 h-3"/> BLOCKED</span>
                    ) : log.status === "FLAGGED" || log.decision === "FLAGGED" ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold flex w-fit items-center gap-1"><AlertTriangle className="w-3 h-3"/> FLAGGED</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex w-fit items-center gap-1"><CheckCircle className="w-3 h-3"/> ACCEPTED</span>
                    )}
                  </td>
                  <td className="py-2.5 text-slate-400">{log.stage}</td>
                  <td className="py-2.5">
                    {log.reachedHospitalServer ? (
                      <span className="text-emerald-500">Inserted (Safe)</span>
                    ) : (
                      <span className="text-rose-500">Protected (No Write)</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-600">No network traffic detected.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}