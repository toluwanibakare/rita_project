"use client";

import { useState, useEffect, useRef } from "react";
import { sendDeviceData } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// ─── Color mapping for console lines ───────────────────────────────
const COLOR_MAP = {
  default: "text-slate-300",
  header:  "text-cyan-400 font-bold",
  success: "text-emerald-400",
  error:   "text-rose-400 font-semibold",
  warning: "text-amber-400",
  info:    "text-sky-400",
  dim:     "text-slate-600",
  bright:  "text-slate-100",
};

// ─── Preset scenarios ──────────────────────────────────────────────
const PRESETS = [
  {
    label: "Normal Telemetry",
    desc: "Valid baseline vitals",
    dot: "bg-emerald-500",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
    text: "text-emerald-400",
    config: {
      deviceId: "DEV-IOT-102",
      heartRate: 72,
      gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1",
      timeMode: "current",
      bypassShield: false,
    },
  },
  {
    label: "SQL Injection",
    desc: "Inject SQL into Device ID",
    dot: "bg-rose-500",
    border: "border-rose-500/30 hover:border-rose-400/60",
    text: "text-rose-400",
    config: {
      deviceId: "DEV-IOT-102'; DROP TABLE logs;--",
      heartRate: 72,
      gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1",
      timeMode: "current",
      bypassShield: false,
    },
  },
  {
    label: "Spoofed Vitals",
    desc: "Out-of-range heart rate",
    dot: "bg-orange-500",
    border: "border-orange-500/30 hover:border-orange-400/60",
    text: "text-orange-400",
    config: {
      deviceId: "DEV-IOT-102",
      heartRate: 999,
      gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1",
      timeMode: "current",
      bypassShield: false,
    },
  },
  {
    label: "Replay Attack",
    desc: "Timestamp 10 min old",
    dot: "bg-purple-500",
    border: "border-purple-500/30 hover:border-purple-400/60",
    text: "text-purple-400",
    config: {
      deviceId: "DEV-IOT-102",
      heartRate: 72,
      gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1",
      timeMode: "replay",
      bypassShield: false,
    },
  },
  {
    label: "Invalid Auth",
    desc: "Bad authorization token",
    dot: "bg-red-500",
    border: "border-red-500/30 hover:border-red-400/60",
    text: "text-red-400",
    config: {
      deviceId: "DEV-IOT-102",
      heartRate: 72,
      gatewayId: "GW-EDGE-01",
      authToken: "Bearer INVALID_TOKEN",
      timeMode: "current",
      bypassShield: false,
    },
  },
  {
    label: "Anomaly Drift",
    desc: "Sudden delta deviation",
    dot: "bg-amber-500",
    border: "border-amber-500/30 hover:border-amber-400/60",
    text: "text-amber-400",
    config: {
      deviceId: "DEV-IOT-102",
      heartRate: 127,
      gatewayId: "GW-EDGE-01",
      authToken: "Bearer iomt_secure_device_secret_token_1",
      timeMode: "current",
      bypassShield: false,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════
//  SIMULATOR PAGE — Terminal Console
// ═══════════════════════════════════════════════════════════════════
export default function SimulatorPage() {
  // ── Form state ──────────────────────────────────────────────────
  const [deviceId, setDeviceId] = useState("DEV-IOT-102");
  const [heartRate, setHeartRate] = useState(72);
  const [gatewayId, setGatewayId] = useState("GW-EDGE-01");
  const [authToken, setAuthToken] = useState("Bearer iomt_secure_device_secret_token_1");
  const [timeMode, setTimeMode] = useState("current");
  const [bypassShield, setBypassShield] = useState(false);

  // ── Console state ───────────────────────────────────────────────
  const [lines, setLines] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [txCount, setTxCount] = useState(0);

  const bottomRef = useRef(null);

  // ── Auto-scroll on new lines ────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  // ── Welcome message on mount ────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      const welcome = [
        ["", "dim"],
        ["  ██████╗  ██╗████████╗ █████╗ ", "header"],
        ["  ██╔══██╗ ██║╚══██╔══╝██╔══██╗", "header"],
        ["  ██████╔╝ ██║   ██║   ███████║", "header"],
        ["  ██╔══██╗ ██║   ██║   ██╔══██║", "header"],
        ["  ██║  ██║ ██║   ██║   ██║  ██║", "header"],
        ["  ╚═╝  ╚═╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝", "header"],
        ["", "dim"],
        ["  Real-time IoMT Telemetry Analyzer v1.0.0", "info"],
        ["  Secure API Pipeline Simulation Console", "dim"],
        ["  ──────────────────────────────────────────────────", "dim"],
        ["", "dim"],
        ["  Configure telemetry parameters in the control panel above,", "default"],
        ["  then press EXECUTE to trace the complete API journey through", "default"],
        ["  the 6-layer backend security pipeline.", "default"],
        ["", "dim"],
        ["  Quick-fill presets are available for common attack scenarios.", "dim"],
        ["", "dim"],
        ["  Awaiting transmission...", "success"],
        ["", "dim"],
      ];
      for (const [text, color] of welcome) {
        setLines((p) => [...p, { id: `${Date.now()}-${Math.random()}`, text, color }]);
        await new Promise((r) => setTimeout(r, 25));
      }
    };
    boot();
  }, []);

  // ── Background Supabase sync (keeps real-time pipeline warm) ────
  useEffect(() => {
    const channel = supabase
      .channel("simulator-console")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "logs" }, () => {})
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Pace multiplier — makes the console feel deliberate and real
  const PACE = 2.8;

  const print = (text, color = "default") => {
    setLines((p) => [...p, { id: `${Date.now()}-${Math.random()}`, text, color }]);
  };

  // Prints lines with deliberate pacing + random jitter for natural feel
  const printBatch = async (batch, delay = 55) => {
    for (const item of batch) {
      const [text, color] = Array.isArray(item) ? item : [item, "default"];
      print(text, color || "default");
      const jitter = Math.random() * 80;
      if (delay > 0) await sleep(delay * PACE + jitter);
    }
  };

  // Longer pauses between major sections (simulates processing)
  const pause = (ms) => sleep(ms * PACE + Math.random() * 200);

  const clearConsole = () => setLines([]);

  const statusColor = (s) => {
    if (s === "PASSED") return "success";
    if (s === "FAILED") return "error";
    if (s === "BYPASSED") return "warning";
    return "dim";
  };

  const statusIcon = (s) => {
    if (s === "PASSED") return "PASSED";
    if (s === "FAILED") return "FAILED";
    if (s === "BYPASSED") return "BYPASSED";
    return "SKIPPED";
  };

  // ═══════════════════════════════════════════════════════════════
  //  EXECUTE TRANSMISSION — The core function
  // ═══════════════════════════════════════════════════════════════
  const executeTransmission = async (overrides = {}) => {
    if (isRunning) return;
    setIsRunning(true);

    const num = txCount + 1;
    setTxCount(num);

    // Resolve values (overrides take precedence for preset calls)
    const dev = overrides.deviceId ?? deviceId;
    const hr = overrides.heartRate ?? heartRate;
    const gw = overrides.gatewayId ?? gatewayId;
    const token = overrides.authToken ?? authToken;
    const tm = overrides.timeMode ?? timeMode;
    const bypass = overrides.bypassShield ?? bypassShield;

    const now = new Date();
    let finalTimestamp = now.toISOString();
    let timeDesc = "Current server time (valid)";

    if (tm === "replay") {
      finalTimestamp = new Date(Date.now() - 600000).toISOString();
      timeDesc = "Replayed packet (10 minutes old)";
    } else if (tm === "future") {
      finalTimestamp = new Date(Date.now() + 600000).toISOString();
      timeDesc = "Future clock drift (10 minutes ahead)";
    } else if (tm === "invalid") {
      finalTimestamp = "INVALID_TIMESTAMP_FORMAT";
      timeDesc = "Malformed timestamp string";
    }

    // ── BANNER ────────────────────────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["", "dim"],
        ["  =======================================================================", "dim"],
        [`   RITA SECURITY PIPELINE  —  TRANSMISSION #${num}`, "header"],
        [`   ${now.toISOString().replace("T", " ").slice(0, 23)} UTC`, "info"],
        ["  =======================================================================", "dim"],
      ],
      35
    );

    // ── STEP 1: DEVICE COLLECTION ─────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["  [STEP 1] WEARABLE DEVICE  —  BIOMETRIC COLLECTION", "header"],
        ["  ─────────────────────────────────────────────────────────────────────", "dim"],
        [`    Device ID:      ${dev}`, "bright"],
        [`    Heart Rate:     ${hr} BPM`, "bright"],
        [`    Gateway Node:   ${gw}`, "bright"],
        [`    Reading Time:   ${finalTimestamp}`, "default"],
        [`    Time Mode:      ${timeDesc}`, "dim"],
        ["", "dim"],
        ["    >>> Biometric reading captured from IoMT wearable sensor", "success"],
      ],
      55
    );
    await pause(250);

    // ── STEP 2: EDGE GATEWAY ──────────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["  [STEP 2] EDGE GATEWAY  —  NETWORK FORWARDING", "header"],
        ["  ─────────────────────────────────────────────────────────────────────", "dim"],
        [`    Source:          ${dev} @ Local Network`, "default"],
        [`    Edge Router:     ${gw}`, "default"],
        ["    Destination:    RITA Cloud API Gateway (/api/vitals)", "default"],
        ["    Protocol:       HTTPS / TLS 1.3 (End-to-End Encrypted)", "default"],
        ["", "dim"],
        ["    >>> Telemetry packet encrypted and forwarded to cloud endpoint", "success"],
      ],
      55
    );
    await pause(250);

    // ── STEP 3: HTTP REQUEST ──────────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["  [STEP 3] HTTP REQUEST  —  DISPATCH TO BACKEND", "header"],
        ["  ─────────────────────────────────────────────────────────────────────", "dim"],
        ["", "dim"],
        ["    POST /api/vitals HTTP/1.1", "info"],
        ["    Host: rita-gateway.vercel.app", "dim"],
        [`    Authorization: ${token}`, "dim"],
        ["    Content-Type: application/json", "dim"],
        ["", "dim"],
        ["    Request Body:", "default"],
        ["    {", "bright"],
        [`      "deviceId": "${dev}",`, "bright"],
        [`      "heartRate": ${hr},`, "bright"],
        [`      "gatewayId": "${gw}",`, "bright"],
        [`      "timestamp": "${finalTimestamp}",`, "bright"],
        [`      "bypassSqliShield": ${bypass}`, "bright"],
        ["    }", "bright"],
        ["", "dim"],
        ["    >>> Request dispatched to Next.js API route handler...", "info"],
      ],
      40
    );
    await pause(500);

    // ── STEP 4: SECURITY PIPELINE ─────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["  [STEP 4] BACKEND SECURITY PIPELINE  —  6-LAYER VERIFICATION", "header"],
        ["  ─────────────────────────────────────────────────────────────────────", "dim"],
        ["    Request received by server. Initializing security layers...", "default"],
      ],
      55
    );
    await pause(400);

    // Actually call the API
    let result;
    try {
      result = await sendDeviceData(dev, hr, gw, bypass, token, finalTimestamp);
    } catch (err) {
      await printBatch([
        ["", "dim"],
        [`    NETWORK ERROR: ${err.message}`, "error"],
        ["    >>> Transmission failed. Check server connection.", "error"],
      ]);
      setIsRunning(false);
      return;
    }

    const checks = result.checks || {};

    // ── Layer 1: IAM ────────────────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["    +--------------------------------------------------------------+", "dim"],
        ["    |  LAYER 1: Identity & Access Management (IAM)                |", "info"],
        ["    +--------------------------------------------------------------+", "dim"],
        ["    Validating Authorization bearer token...", "default"],
        [`    Token: ${token ? token.substring(0, 40) + (token.length > 40 ? "..." : "") : "(empty)"}`, "dim"],
      ],
      65
    );
    await pause(150);
    await printBatch([
      [`    >>> ${statusIcon(checks.auth?.status)}: ${checks.auth?.detail || "No details."}`, statusColor(checks.auth?.status)],
    ], 0);
    await pause(250);

    // ── Layer 2: Anti-Replay ────────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["    +--------------------------------------------------------------+", "dim"],
        ["    |  LAYER 2: Anti-Replay Protection (Timestamp Validation)     |", "info"],
        ["    +--------------------------------------------------------------+", "dim"],
        [`    Client timestamp:  ${finalTimestamp}`, "default"],
        [`    Server timestamp:  ${new Date().toISOString()}`, "default"],
      ],
      65
    );
    await pause(150);
    await printBatch([
      [`    >>> ${statusIcon(checks.timestamp?.status)}: ${checks.timestamp?.detail || "No details."}`, statusColor(checks.timestamp?.status)],
    ], 0);
    await pause(250);

    // ── Layer 3: SQL Injection ──────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["    +--------------------------------------------------------------+", "dim"],
        ["    |  LAYER 3: SQL Injection Shield (Input Sanitization)          |", "info"],
        ["    +--------------------------------------------------------------+", "dim"],
        [`    Scanning deviceId:  "${dev}"`, "default"],
        [`    Scanning gatewayId: "${gw}"`, "default"],
        ["    Regex pattern:     /['\\\"]|--|;|union|select|insert|drop|or\\s+1\\s*=\\s*1/i", "dim"],
      ],
      65
    );
    await pause(150);
    await printBatch([
      [`    >>> ${statusIcon(checks.sqli?.status)}: ${checks.sqli?.detail || "No details."}`, statusColor(checks.sqli?.status)],
    ], 0);
    await pause(250);

    // ── Layer 4: Rate Limiter ───────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["    +--------------------------------------------------------------+", "dim"],
        ["    |  LAYER 4: Rate Limiter (DoS Flood Prevention)               |", "info"],
        ["    +--------------------------------------------------------------+", "dim"],
        ["    Checking request frequency against per-device rate limit...", "default"],
        ["    Minimum interval: 800ms between consecutive writes", "dim"],
      ],
      65
    );
    await pause(150);
    await printBatch([
      [`    >>> ${statusIcon(checks.rateLimit?.status)}: ${checks.rateLimit?.detail || "No details."}`, statusColor(checks.rateLimit?.status)],
    ], 0);
    await pause(250);

    // ── Layer 5: Medical Range ──────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["    +--------------------------------------------------------------+", "dim"],
        ["    |  LAYER 5: Medical Range Validation (Spoofing Detection)      |", "info"],
        ["    +--------------------------------------------------------------+", "dim"],
        [`    Heart rate value:   ${hr} BPM`, "default"],
        ["    Acceptable range:  30 - 220 BPM (Human survival limits)", "dim"],
      ],
      65
    );
    await pause(150);
    await printBatch([
      [`    >>> ${statusIcon(checks.range?.status)}: ${checks.range?.detail || "No details."}`, statusColor(checks.range?.status)],
    ], 0);
    await pause(250);

    // ── Layer 6: Anomaly Detection ──────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["    +--------------------------------------------------------------+", "dim"],
        ["    |  LAYER 6: Anomaly Detection (Statistical Baseline)           |", "info"],
        ["    +--------------------------------------------------------------+", "dim"],
        ["    Comparing reading against device historical rolling average...", "default"],
        ["    Anomaly threshold: +/- 40 BPM delta from baseline", "dim"],
      ],
      65
    );
    await pause(150);
    await printBatch([
      [`    >>> ${statusIcon(checks.anomaly?.status)}: ${checks.anomaly?.detail || "No details."}`, statusColor(checks.anomaly?.status)],
    ], 0);
    await pause(350);

    // ── STEP 5: SQL COMPILATION ───────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["  [STEP 5] DATABASE QUERY COMPILATION", "header"],
        ["  ─────────────────────────────────────────────────────────────────────", "dim"],
        ["", "dim"],
        ["    Engine:  PostgreSQL via Supabase Client SDK", "default"],
        ["    Method:  Prepared Parameterized Statement (NOT string concatenation)", "default"],
        ["", "dim"],
        ["    --- VULNERABLE QUERY (String Interpolation - NOT USED) -----------", "error"],
        [`    INSERT INTO public.logs ("deviceId","heartRate","decision")`, "error"],
        [`    VALUES ('${dev}', ${hr}, '${result.status}');`, "error"],
        ["    ^ User input is injected directly as executable SQL code", "dim"],
        ["", "dim"],
        ["    --- SECURE QUERY (Parameterized Binding - ACTIVE) ----------------", "success"],
        ["    PREPARE stmt(text, numeric, text) AS", "success"],
        ['    INSERT INTO public.logs ("deviceId","heartRate","decision")', "success"],
        ["    VALUES ($1, $2, $3);", "success"],
        ["", "dim"],
        [`    EXECUTE stmt('${dev}', ${hr}, '${result.status}');`, "success"],
        ["    ^ Inputs are bound as safe data literals — injection is inert", "dim"],
      ],
      45
    );
    await pause(350);

    // ── STEP 6: DATABASE COMMIT ───────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["  [STEP 6] DATABASE COMMIT", "header"],
        ["  ─────────────────────────────────────────────────────────────────────", "dim"],
      ],
      50
    );

    if (result.reachedHospitalServer) {
      await printBatch(
        [
          ["    Table:        public.logs", "default"],
          ["    Operation:    INSERT", "default"],
          [`    Protection:   ${result.dbProtectionType || "Parameterized Query (Safe)"}`, "default"],
          ["", "dim"],
          [`    Row:  { deviceId: "${dev}", heartRate: ${hr}, decision: "${result.status}" }`, "bright"],
          ["", "dim"],
          ["    >>> COMMITTED SUCCESSFULLY — Record written to hospital database", "success"],
        ],
        55
      );
    } else {
      await printBatch(
        [
          ["    Operation:    NONE (Write blocked by security pipeline)", "default"],
          [`    Blocked at:   ${result.stage}`, "default"],
          [`    Reason:       ${result.reason}`, "default"],
          ["", "dim"],
          ["    >>> ISOLATED — No database write executed. Threat contained.", "error"],
        ],
        55
      );
    }
    await pause(350);

    // ── STEP 7: HTTP RESPONSE ─────────────────────────────────
    await printBatch(
      [
        ["", "dim"],
        ["  [STEP 7] HTTP RESPONSE  —  RETURNED TO CLIENT", "header"],
        ["  ─────────────────────────────────────────────────────────────────────", "dim"],
        ["", "dim"],
        [
          `    HTTP/1.1 ${result.status === "BLOCKED" ? "400 Bad Request" : "200 OK"}`,
          result.status === "BLOCKED" ? "error" : "success",
        ],
        ['    x-hospital-shield-decision: "' + result.status + '"', "dim"],
        ["", "dim"],
        ["    Response Body:", "default"],
        ["    {", "bright"],
        [`      "status": "${result.status}",`, "bright"],
        [`      "reason": "${result.reason}",`, "bright"],
        [`      "stage": "${result.stage}",`, "bright"],
        [`      "reachedHospitalServer": ${result.reachedHospitalServer},`, "bright"],
        [`      "dbProtectionType": "${result.dbProtectionType || "N/A"}"`, "bright"],
        ["    }", "bright"],
      ],
      40
    );
    await pause(350);

    // ── VERDICT BANNER ────────────────────────────────────────
    const passedCount = Object.values(checks).filter(
      (c) => c.status === "PASSED" || c.status === "BYPASSED"
    ).length;
    const totalChecks = Object.keys(checks).length;

    const verdictColor =
      result.status === "BLOCKED" ? "error" : result.status === "FLAGGED" ? "warning" : "success";
    const verdictLabel =
      result.status === "BLOCKED"
        ? "BLOCKED"
        : result.status === "FLAGGED"
        ? "FLAGGED (ALLOWED WITH WARNING)"
        : "APPROVED";

    await printBatch(
      [
        ["", "dim"],
        ["  =======================================================================", "dim"],
        [`   VERDICT:          ${verdictLabel}`, verdictColor],
        [`   Layers Passed:    ${passedCount}/${totalChecks}`, "default"],
        [
          `   Database Write:   ${result.reachedHospitalServer ? "YES (" + (result.dbProtectionType || "Parameterized") + ")" : "NO (Isolated)"}`,
          "default",
        ],
        [
          `   Blocked At:       ${result.status === "BLOCKED" ? result.stage : "N/A — All layers cleared"}`,
          result.status === "BLOCKED" ? "error" : "dim",
        ],
        ["  =======================================================================", "dim"],
        ["", "dim"],
        ["  Awaiting next transmission...", "dim"],
        ["", "dim"],
      ],
      40
    );

    setIsRunning(false);
  };

  // ═══════════════════════════════════════════════════════════════
  //  PRESET HANDLER
  // ═══════════════════════════════════════════════════════════════
  const DEFAULTS = {
    deviceId: "DEV-IOT-102",
    heartRate: 72,
    gatewayId: "GW-EDGE-01",
    authToken: "Bearer iomt_secure_device_secret_token_1",
    timeMode: "current",
    bypassShield: false,
  };

  const resetForm = () => {
    setDeviceId(DEFAULTS.deviceId);
    setHeartRate(DEFAULTS.heartRate);
    setGatewayId(DEFAULTS.gatewayId);
    setAuthToken(DEFAULTS.authToken);
    setTimeMode(DEFAULTS.timeMode);
    setBypassShield(DEFAULTS.bypassShield);
  };

  const runPreset = (preset) => {
    // Temporarily show preset values in the form during execution
    setDeviceId(preset.config.deviceId);
    setHeartRate(preset.config.heartRate);
    setGatewayId(preset.config.gatewayId);
    setAuthToken(preset.config.authToken);
    setTimeMode(preset.config.timeMode);
    setBypassShield(preset.config.bypassShield);
    // Execute with explicit values, then reset form to defaults after
    executeTransmission(preset.config).then(() => resetForm());
  };

  const handleManualExecute = () => {
    executeTransmission();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isRunning) handleManualExecute();
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col">
      {/* ── CONTROL PANEL (Input Bar) ─────────────────────────── */}
      <div className="bg-[#0d1117] border-b border-[#1c2333] px-4 py-4 shrink-0">
        {/* Title */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <h1 className="text-sm font-bold text-slate-300 tracking-wide font-mono">
              Telemetry Console
            </h1>
            <span className="text-[9px] font-mono text-slate-600 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
              v1.0.0
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                TRANSMITTING...
              </span>
            )}
            {!isRunning && (
              <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                IDLE
              </span>
            )}
          </div>
        </div>

        {/* Row 1: Device ID, Heart Rate, Gateway ID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2" onKeyDown={handleKeyDown}>
          <div>
            <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 block">
              Device ID
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-[#161b22] border border-[#2a3040] text-emerald-300 font-mono text-xs rounded-lg px-3 py-2 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-colors placeholder-slate-600"
              placeholder="e.g. DEV-IOT-102"
            />
          </div>
          <div>
            <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 block">
              Heart Rate (BPM)
            </label>
            <input
              type="number"
              value={heartRate}
              onChange={(e) => setHeartRate(Number(e.target.value))}
              className="w-full bg-[#161b22] border border-[#2a3040] text-emerald-300 font-mono text-xs rounded-lg px-3 py-2 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-colors placeholder-slate-600"
              placeholder="e.g. 72"
            />
          </div>
          <div>
            <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 block">
              Gateway ID
            </label>
            <input
              type="text"
              value={gatewayId}
              onChange={(e) => setGatewayId(e.target.value)}
              className="w-full bg-[#161b22] border border-[#2a3040] text-emerald-300 font-mono text-xs rounded-lg px-3 py-2 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-colors placeholder-slate-600"
              placeholder="e.g. GW-EDGE-01"
            />
          </div>
        </div>

        {/* Row 2: Auth Token */}
        <div className="mb-2" onKeyDown={handleKeyDown}>
          <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 block">
            Authorization Token
          </label>
          <input
            type="text"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            className="w-full bg-[#161b22] border border-[#2a3040] text-amber-300/80 font-mono text-xs rounded-lg px-3 py-2 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-colors placeholder-slate-600"
            placeholder="Bearer ..."
          />
        </div>

        {/* Row 3: Timestamp Mode | Bypass Toggle | Execute */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 mb-3" onKeyDown={handleKeyDown}>
          <div className="flex-1">
            <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 block">
              Timestamp Mode
            </label>
            <select
              value={timeMode}
              onChange={(e) => setTimeMode(e.target.value)}
              className="w-full bg-[#161b22] border border-[#2a3040] text-slate-300 font-mono text-xs rounded-lg px-3 py-2 focus:border-cyan-500/60 focus:outline-none cursor-pointer transition-colors"
            >
              <option value="current">Current Server Time (Valid)</option>
              <option value="replay">Replayed Packet (10 Min Old)</option>
              <option value="future">Future Clock Drift (10 Min Ahead)</option>
              <option value="invalid">Malformed Format (Invalid)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 bg-[#161b22] border border-[#2a3040] rounded-lg shrink-0">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
              Bypass SQLi Shield
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={bypassShield}
                onChange={(e) => setBypassShield(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-500 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-600" />
            </label>
          </div>

          <button
            onClick={handleManualExecute}
            disabled={isRunning}
            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] shrink-0 tracking-wider shadow-lg shadow-cyan-900/30"
          >
            {isRunning ? "RUNNING..." : "EXECUTE"}
          </button>
        </div>

        {/* Row 4: Preset chips */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[9px] font-mono text-slate-600 self-center mr-1">PRESETS:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => runPreset(p)}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${p.border} bg-[#161b22] text-[10px] font-mono font-semibold ${p.text} transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1c2333] active:scale-[0.97]`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONSOLE OUTPUT ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#080c14] px-2 py-3 font-mono text-[11px] leading-[1.65] select-text relative">
        {/* Scanline overlay for terminal feel */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.03)_2px,rgba(0,0,0,0.03)_4px)] z-10" />

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(2px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .console-line {
            animation: fadeSlideIn 0.15s ease-out;
          }
        `}} />

        <div className="relative z-0">
          {lines.map((line) => (
            <div key={line.id} className={`console-line ${COLOR_MAP[line.color] || COLOR_MAP.default} whitespace-pre-wrap break-all min-h-[1em]`}>
              {line.text}
            </div>
          ))}
          {/* Blinking cursor */}
          <div className="flex items-center gap-0 mt-0.5">
            <span className="text-emerald-500/70">{'>'}</span>
            <span
              className="inline-block w-[7px] h-[14px] bg-emerald-400/80 ml-1"
              style={{ animation: 'blink 1s step-end infinite' }}
            />
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── FOOTER BAR ────────────────────────────────────────── */}
      <div className="bg-[#0d1117] border-t border-[#1c2333] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-slate-600">
            {lines.length} lines | {txCount} transmission{txCount !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={clearConsole}
          className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-800/50"
        >
          Clear Console
        </button>
      </div>
    </div>
  );
}