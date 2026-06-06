"use client";

import { useState, useEffect } from "react";
import { sendDeviceData } from "@/lib/api";

const SCENARIOS = [
  {
    id: "normal",
    name: "Normal Telemetry",
    color: "emerald",
    desc: "Baseline health data",
    config: { deviceId: "DEV-IOT-102", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false },
    narrative: {
      attacker: "None (Legitimate Patient Wearable)",
      objective: "Transmit normal resting heart rate to hospital dashboard",
      method: "Standard HTTPS POST request carrying JSON vitals",
      entryPoint: "Edge Gateway → Cloud API (/api/vitals)",
      riskLevel: "SAFE",
      explanation: "This is a normal baseline transmission. The device sends a realistic heart rate (72 BPM) with a valid authorization token and current timestamp.",
      defenseName: "All Layers Passed",
      defenseTech: "N/A",
      defenseHow: "The data clears all 6 security layers because the authorization is valid, the timestamp is recent, the data format is clean, and the vitals are within normal human ranges.",
      secondLine: "Data is inserted into the PostgreSQL database using parameterized queries for safety."
    }
  },
  {
    id: "sqli",
    name: "SQL Injection",
    color: "rose",
    desc: "Database attack payload",
    config: { deviceId: "DEV-IOT-102'; DROP TABLE logs;--", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false },
    narrative: {
      attacker: "Malicious insider or compromised edge gateway",
      objective: "Destroy or corrupt the hospital's patient vital records table",
      method: "Inject SQL DELETE/DROP commands through the device ID field",
      entryPoint: "HTTP POST body → 'deviceId' parameter",
      riskLevel: "CRITICAL",
      explanation: "The attacker modifies the device identifier from a legitimate value to a malicious SQL payload (e.g. `'; DROP TABLE logs;--`). If the backend uses string concatenation to build SQL queries, this payload would execute a DROP TABLE command, destroying patient records.",
      defenseName: "Layer 3 — SQL Injection Shield",
      defenseTech: "Regex pattern matching (Input Sanitization)",
      defenseHow: "The API scans all text inputs against a known SQL attack pattern library before processing. Malicious constructs like 'DROP TABLE' or 'SELECT' are intercepted and the request is rejected immediately.",
      secondLine: "Even if regex fails, parameterized DB queries prevent SQL injection."
    }
  },
  {
    id: "bypass",
    name: "SQLi (Bypass Shield)",
    color: "amber",
    desc: "Testing DB parameterization",
    config: { deviceId: "DEV-IOT-102'; SELECT * FROM logs;--", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: true },
    narrative: {
      attacker: "Advanced Persistent Threat (APT)",
      objective: "Extract sensitive patient data from the database",
      method: "SQL Injection exploiting a zero-day vulnerability in the gateway shield",
      entryPoint: "Database Execution Layer",
      riskLevel: "HIGH",
      explanation: "This scenario simulates a 'Zero-Day' attack where the primary regex shield (Layer 3) fails or is bypassed. The malicious SQL payload (`'; SELECT * FROM logs;--`) successfully reaches the database execution layer.",
      defenseName: "Database Parameterization",
      defenseTech: "Prepared Statements (Supabase SDK)",
      defenseHow: "PostgreSQL's parameterized statements treat ALL user input as literal data, never as executable SQL code. The database engine pre-compiles the query structure, so the injection string is stored harmlessly as plain text in the deviceId column.",
      secondLine: "The attack is rendered inert, proving the architecture is secure even if edge defenses fail."
    }
  },
  {
    id: "spoof",
    name: "Spoofed Vitals",
    color: "rose",
    desc: "Impossible medical values",
    config: { deviceId: "DEV-IOT-102", heartRate: 999, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false },
    narrative: {
      attacker: "External hacker spoofing device data",
      objective: "Trigger false alarms or corrupt medical analytics",
      method: "Send physiologically impossible heart rate values (999 BPM)",
      entryPoint: "HTTP POST body → 'heartRate' parameter",
      riskLevel: "HIGH",
      explanation: "The attacker intercepts the connection and alters the biometric payload to send a heart rate of 999 BPM. If accepted, this could cause panic, trigger emergency responses, or skew AI analytics.",
      defenseName: "Layer 5 — Medical Range Validation",
      defenseTech: "Contextual Boundary Checking",
      defenseHow: "The security pipeline enforces strict human survival limits (e.g., 30 - 220 BPM). Any value outside this range is immediately flagged as physically impossible and the request is blocked.",
      secondLine: "Protects the integrity of the clinical database from noise."
    }
  },
  {
    id: "replay",
    name: "Replay Attack",
    color: "rose",
    desc: "Stale/reused packet",
    config: { deviceId: "DEV-IOT-102", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "replay", bypassShield: false },
    narrative: {
      attacker: "Network Eavesdropper (Man-in-the-Middle)",
      objective: "Feed old, legitimate data to mask a current critical event",
      method: "Capture a valid telemetry packet and resend it repeatedly",
      entryPoint: "Network transmission layer",
      riskLevel: "MEDIUM",
      explanation: "An attacker captures a perfectly valid, encrypted packet from yesterday (when the patient was fine). They resend it today while the patient is having a heart attack, hoping the system accepts the 'fine' data and doesn't sound the alarm.",
      defenseName: "Layer 2 — Anti-Replay Protection",
      defenseTech: "Timestamp Drift Validation",
      defenseHow: "The API compares the packet's timestamp against the server's current time. If the packet is older than the acceptable drift window (e.g., 5 minutes), it is rejected as stale or replayed data.",
      secondLine: "Ensures only fresh, real-time telemetry is processed."
    }
  },
  {
    id: "badauth",
    name: "Invalid Auth",
    color: "rose",
    desc: "Wrong authorization token",
    config: { deviceId: "DEV-IOT-102", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer INVALID_TOKEN_12345", timeMode: "current", bypassShield: false },
    narrative: {
      attacker: "Unauthorized Device / Rogue Node",
      objective: "Inject data into the hospital network without permission",
      method: "Guess or forge an authorization bearer token",
      entryPoint: "HTTP Headers → 'Authorization'",
      riskLevel: "HIGH",
      explanation: "An unapproved device attempts to connect to the hospital's API endpoint using a forged or expired authorization token.",
      defenseName: "Layer 1 — Identity & Access Management",
      defenseTech: "Bearer Token Authentication",
      defenseHow: "The very first layer verifies the cryptographic signature of the token. If it doesn't match the hospital's secret keys, the connection is instantly severed (HTTP 401 Unauthorized).",
      secondLine: "Zero Trust Architecture principle: verify every request."
    }
  },
  {
    id: "anomaly",
    name: "Anomaly Drift",
    color: "amber",
    desc: "Sudden spike in vitals",
    config: { deviceId: "DEV-IOT-102", heartRate: 127, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false },
    narrative: {
      attacker: "Patient Health Event (or subtle tampering)",
      objective: "N/A (Identifies concerning health trends)",
      method: "Sudden deviation from historical baseline averages",
      entryPoint: "HTTP POST body → 'heartRate' parameter",
      riskLevel: "WARNING",
      explanation: "The heart rate (127 BPM) is technically within human survival limits (so it passes Layer 5), but it represents a sudden, massive spike compared to this specific patient's resting baseline (e.g., 72 BPM).",
      defenseName: "Layer 6 — Anomaly Detection",
      defenseTech: "Statistical Baseline Analysis",
      defenseHow: "The system compares the incoming reading against the patient's rolling historical average. Large deviations are labeled as 'FLAGGED'. The data is saved to the database, but it triggers an emergency dashboard alert.",
      secondLine: "Balances data retention with proactive medical alerts."
    }
  }
];

export default function SimulatorPage() {
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
  const [status, setStatus] = useState("idle"); // idle, running, complete
  const [pipelineState, setPipelineState] = useState(null);
  const [apiResult, setApiResult] = useState(null);

  const handleSelect = (scenario) => {
    setSelectedScenario(scenario);
    setStatus("idle");
    setPipelineState(null);
    setApiResult(null);
  };

  const runScenario = async () => {
    setStatus("running");
    setPipelineState("device");
    await new Promise(r => setTimeout(r, 600));

    setPipelineState("edge");
    await new Promise(r => setTimeout(r, 600));

    setPipelineState("api");
    await new Promise(r => setTimeout(r, 600));

    setPipelineState("security");
    
    // Config prep
    const config = selectedScenario.config;
    let finalTimestamp = new Date().toISOString();
    if (config.timeMode === "replay") finalTimestamp = new Date(Date.now() - 600000).toISOString();

    let res;
    try {
      res = await sendDeviceData(config.deviceId, config.heartRate, config.gatewayId, config.bypassShield, config.authToken, finalTimestamp);
    } catch (e) {
      res = { status: "ERROR", error: e.message };
    }

    setApiResult(res);
    await new Promise(r => setTimeout(r, 1000));
    
    setPipelineState("database");
    setStatus("complete");
  };

  const PipelineNode = ({ id, label, active, error }) => {
    let bg = "bg-white border-slate-200 text-slate-500 shadow-sm";
    if (active) bg = "bg-cyan-50 border-cyan-400 text-cyan-800 shadow-[0_0_15px_rgba(6,182,212,0.3)]";
    if (error) bg = "bg-rose-50 border-rose-400 text-rose-800 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
    
    return (
      <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 transition-all duration-300 ${bg}`}>
        <span className="text-xs font-bold text-center">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* SECTION 1: SCENARIO SELECTOR */}
      <div className="bg-white border-b border-slate-200 p-4 shrink-0 overflow-x-auto shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
             <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider">RITA Simulator — Select Threat Scenario</h2>
          </div>
          <div className="flex gap-3">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelect(s)}
                className={`flex flex-col items-start p-3 rounded-lg border text-left min-w-[200px] transition-colors shadow-sm ${
                  selectedScenario.id === s.id 
                    ? `bg-${s.color}-50 border-${s.color}-400 shadow-[0_0_10px_rgba(var(--color-${s.color}-500),0.1)]` 
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full bg-${s.color}-500`} />
                  <span className={`font-bold text-${s.color}-700 text-sm`}>{s.name}</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* SECTION 2: ATTACK NARRATIVE PANEL */}
        <div className="w-[40%] bg-white border-r border-slate-200 overflow-y-auto p-6 shadow-sm z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">{selectedScenario.name}</h2>
            <span className={`px-2 py-1 rounded text-xs font-bold bg-${selectedScenario.color}-100 text-${selectedScenario.color}-700 border border-${selectedScenario.color}-300`}>
              {selectedScenario.narrative.riskLevel}
            </span>
          </div>

          <div className="space-y-6 text-sm">
            
            {/* THREAT PROFILE */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700">
                THREAT PROFILE
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-slate-500 font-bold">Attacker:</span>
                  <span className="text-slate-800 font-medium">{selectedScenario.narrative.attacker}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-slate-500 font-bold">Objective:</span>
                  <span className="text-slate-800 font-medium">{selectedScenario.narrative.objective}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-slate-500 font-bold">Method:</span>
                  <span className="text-slate-800 font-medium">{selectedScenario.narrative.method}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-slate-500 font-bold">Entry Point:</span>
                  <span className="text-slate-800 font-mono text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">{selectedScenario.narrative.entryPoint}</span>
                </div>
              </div>
            </div>

            {/* ATTACK EXPLANATION */}
            <div>
              <h3 className="text-slate-500 font-bold mb-2 uppercase text-xs tracking-wider">How the attack works</h3>
              <p className="text-slate-700 leading-relaxed font-medium">
                {selectedScenario.narrative.explanation}
              </p>
            </div>

            {/* DEFENSE MECHANISM */}
            <div className="bg-cyan-50/50 rounded-lg border border-cyan-200 shadow-sm overflow-hidden">
               <div className="bg-cyan-100/50 px-4 py-2 border-b border-cyan-200 font-bold text-cyan-800">
                DEFENSE MECHANISM
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-cyan-700 font-bold">Layer:</span>
                  <span className="text-cyan-900 font-bold">{selectedScenario.narrative.defenseName}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-cyan-700 font-bold">Technology:</span>
                  <span className="text-cyan-900 font-bold">{selectedScenario.narrative.defenseTech}</span>
                </div>
                <div className="mt-2 text-cyan-800 leading-relaxed font-medium">
                  <p className="mb-2"><span className="font-bold text-cyan-900">How:</span> {selectedScenario.narrative.defenseHow}</p>
                  <p><span className="font-bold text-cyan-900">Second Line:</span> {selectedScenario.narrative.secondLine}</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: LIVE API FLOW */}
        <div className="flex-1 bg-slate-50 p-8 overflow-y-auto flex flex-col relative">
          
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">RITA — Live API Visualization</h2>
            <button 
              onClick={runScenario}
              disabled={status === "running"}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md disabled:opacity-50 transition-colors"
            >
              {status === "running" ? "Transmitting..." : "Run Scenario"}
            </button>
          </div>

          {/* Flow Diagram */}
          <div className="flex items-center justify-between mb-12 px-4 relative">
            {/* Connecting lines */}
            <div className="absolute top-1/2 left-12 right-12 h-1 bg-slate-200 -z-10 -translate-y-1/2" />
            
            <PipelineNode id="device" label="IoMT Device" active={pipelineState === "device"} />
            <PipelineNode id="edge" label="Edge Gateway" active={pipelineState === "edge"} />
            <PipelineNode id="api" label="API Endpoint" active={pipelineState === "api"} />
            
            <PipelineNode 
              id="security" 
              label="Security Pipeline" 
              active={pipelineState === "security"} 
              error={apiResult?.status === "BLOCKED"}
            />
            
            <PipelineNode 
              id="database" 
              label="PostgreSQL DB" 
              active={pipelineState === "database" && apiResult?.status !== "BLOCKED"} 
              error={apiResult?.status === "BLOCKED"}
            />
          </div>

          {/* Results Area */}
          {apiResult && (
            <div className="grid grid-cols-2 gap-6 mt-4">
              
              {/* Security Checks Detail */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-600 mb-3 border-b border-slate-100 pb-2">Security Pipeline Analysis</h3>
                <div className="space-y-2">
                  {apiResult.checks && Object.entries(apiResult.checks).map(([key, check]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-bold">{key.toUpperCase()}</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                        check.status === "PASSED" ? "bg-emerald-100 text-emerald-700" :
                        check.status === "FAILED" ? "bg-rose-100 text-rose-700" :
                        check.status === "BYPASSED" ? "bg-amber-100 text-amber-700" : "text-slate-500"
                      }`}>
                        {check.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Verdict */}
              <div className={`border shadow-sm rounded-lg p-4 flex flex-col justify-center ${
                apiResult.status === "BLOCKED" ? "bg-rose-50 border-rose-200" :
                apiResult.status === "FLAGGED" ? "bg-amber-50 border-amber-200" :
                "bg-emerald-50 border-emerald-200"
              }`}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-500">System Verdict</h3>
                <div className={`text-2xl font-black mb-2 ${
                  apiResult.status === "BLOCKED" ? "text-rose-600" :
                  apiResult.status === "FLAGGED" ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {apiResult.status}
                </div>
                <div className="text-sm text-slate-700 mb-1 font-medium">
                  <span className="font-bold text-slate-900">Reason:</span> {apiResult.reason}
                </div>
                <div className="text-sm text-slate-700 font-medium">
                  <span className="font-bold text-slate-900">Database:</span> {apiResult.reachedHospitalServer ? 
                    <span className="text-emerald-600 font-bold">Record committed ({apiResult.dbProtectionType || 'Parameterized'})</span> : 
                    <span className="text-rose-600 font-bold">Write blocked (Threat isolated)</span>
                  }
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}