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
  input:   "text-emerald-300",
  prompt:  "text-yellow-400",
};

// ─── Quick-run command presets ──────────────────────────────────────
const COMMANDS = {
  normal: {
    label: "Normal baseline telemetry",
    config: { deviceId: "DEV-IOT-102", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false },
  },
  sqli: {
    label: "SQL Injection attack payload",
    config: { deviceId: "DEV-IOT-102'; DROP TABLE logs;--", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false },
  },
  spoof: {
    label: "Spoofed out-of-range vitals (999 BPM)",
    config: { deviceId: "DEV-IOT-102", heartRate: 999, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false },
  },
  replay: {
    label: "Replay attack (10-minute-old timestamp)",
    config: { deviceId: "DEV-IOT-102", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "replay", bypassShield: false },
  },
  badauth: {
    label: "Invalid authorization token",
    config: { deviceId: "DEV-IOT-102", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer INVALID_TOKEN_12345", timeMode: "current", bypassShield: false },
  },
  anomaly: {
    label: "Anomaly drift (sudden 127 BPM spike)",
    config: { deviceId: "DEV-IOT-102", heartRate: 127, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false },
  },
  bypass: {
    label: "SQL Injection with shield bypassed",
    config: { deviceId: "DEV-IOT-102'; SELECT * FROM logs;--", heartRate: 72, gatewayId: "GW-EDGE-01", authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: true },
  },
};

// ═══════════════════════════════════════════════════════════════════
//  SIMULATOR PAGE — Full Interactive Terminal
// ═══════════════════════════════════════════════════════════════════
export default function SimulatorPage() {
  const [lines, setLines] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [txCount, setTxCount] = useState(0);
  const [phase, setPhase] = useState("boot"); // boot | idle | prompt_device | prompt_hr | prompt_gateway | prompt_token | prompt_ts | prompt_bypass | running
  const [inputValue, setInputValue] = useState("");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const configRef = useRef({
    deviceId: "DEV-IOT-102",
    heartRate: 72,
    gatewayId: "GW-EDGE-01",
    authToken: "Bearer iomt_secure_device_secret_token_1",
    timeMode: "current",
    bypassShield: false,
  });

  // ── Auto-scroll on new lines ────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  // ── Focus input when phase changes ──────────────────────────────
  useEffect(() => {
    if (phase !== "running" && phase !== "boot") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase]);

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
        ["  This terminal traces the complete journey of medical", "default"],
        ["  telemetry data through a 6-layer backend security pipeline.", "default"],
        ["", "dim"],
        ["  Type 'help' to see available commands, or press ENTER", "default"],
        ["  to configure and transmit a custom telemetry packet.", "default"],
        ["", "dim"],
        ["  Ready.", "success"],
        ["", "dim"],
      ];
      for (const [text, color] of welcome) {
        setLines((p) => [...p, { id: `${Date.now()}-${Math.random()}`, text, color }]);
        await new Promise((r) => setTimeout(r, 25));
      }
      setPhase("idle");
    };
    boot();
  }, []);

  // ── Background Supabase sync ────────────────────────────────────
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
  const PACE = 1.8;

  const print = (text, color = "default") => {
    setLines((p) => [...p, { id: `${Date.now()}-${Math.random()}`, text, color }]);
  };

  const typeLine = async (fullText, color = "default") => {
    if (!fullText) { print("", color); return; }
    const lineId = `${Date.now()}-${Math.random()}`;
    setLines((p) => [...p, { id: lineId, text: "", color }]);
    const chunkSize = 3;
    for (let i = chunkSize; i < fullText.length; i += chunkSize) {
      await sleep(12);
      const partial = fullText.substring(0, i);
      setLines((p) => { const a = [...p]; a[a.length - 1] = { ...a[a.length - 1], text: partial }; return a; });
    }
    setLines((p) => { const a = [...p]; a[a.length - 1] = { ...a[a.length - 1], text: fullText }; return a; });
  };

  const isInstantLine = (text) => {
    const t = text.trim();
    if (!t) return true;
    if (/^[═─+|┌┐└┘│\-\s=]+$/.test(t)) return true;
    if (t === '{' || t === '}') return true;
    return false;
  };

  const printBatch = async (batch, delay = 55) => {
    for (const item of batch) {
      const [text, color] = Array.isArray(item) ? item : [item, "default"];
      const c = color || "default";
      if (isInstantLine(text)) { print(text, c); } else { await typeLine(text, c); }
      const jitter = Math.random() * 60;
      if (delay > 0) await sleep(delay * PACE + jitter);
    }
  };

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
  //  EXECUTE TRANSMISSION (same core pipeline output)
  // ═══════════════════════════════════════════════════════════════
  const runTransmission = async (config) => {
    setIsRunning(true);
    setPhase("running");
    const num = txCount + 1;
    setTxCount(num);

    const { deviceId: dev, heartRate: hr, gatewayId: gw, authToken: token, timeMode: tm, bypassShield: bypass } = config;

    const now = new Date();
    let finalTimestamp = now.toISOString();
    let timeDesc = "Current server time (valid)";
    if (tm === "replay") { finalTimestamp = new Date(Date.now() - 600000).toISOString(); timeDesc = "Replayed packet (10 minutes old)"; }
    else if (tm === "future") { finalTimestamp = new Date(Date.now() + 600000).toISOString(); timeDesc = "Future clock drift (10 minutes ahead)"; }
    else if (tm === "invalid") { finalTimestamp = "INVALID_TIMESTAMP_FORMAT"; timeDesc = "Malformed timestamp string"; }

    // ── BANNER ──
    await printBatch([["", "dim"], ["", "dim"],
      ["  =======================================================================", "dim"],
      [`   RITA SECURITY PIPELINE  —  TRANSMISSION #${num}`, "header"],
      [`   ${now.toISOString().replace("T", " ").slice(0, 23)} UTC`, "info"],
      ["  =======================================================================", "dim"],
    ], 35);

    // ── STEP 1 ──
    await printBatch([["", "dim"],
      ["  [STEP 1] WEARABLE DEVICE  —  BIOMETRIC COLLECTION", "header"],
      ["  ─────────────────────────────────────────────────────────────────────", "dim"],
      [`    Device ID:      ${dev}`, "bright"],
      [`    Heart Rate:     ${hr} BPM`, "bright"],
      [`    Gateway Node:   ${gw}`, "bright"],
      [`    Reading Time:   ${finalTimestamp}`, "default"],
      [`    Time Mode:      ${timeDesc}`, "dim"],
      ["", "dim"],
      ["    >>> Biometric reading captured from IoMT wearable sensor", "success"],
    ], 55);
    await pause(200);

    // ── STEP 2 ──
    await printBatch([["", "dim"],
      ["  [STEP 2] EDGE GATEWAY  —  NETWORK FORWARDING", "header"],
      ["  ─────────────────────────────────────────────────────────────────────", "dim"],
      [`    Source:          ${dev} @ Local Network`, "default"],
      [`    Edge Router:     ${gw}`, "default"],
      ["    Destination:    RITA Cloud API Gateway (/api/vitals)", "default"],
      ["    Protocol:       HTTPS / TLS 1.3 (End-to-End Encrypted)", "default"],
      ["", "dim"],
      ["    >>> Telemetry packet encrypted and forwarded to cloud endpoint", "success"],
    ], 55);
    await pause(200);

    // ── STEP 3 ──
    await printBatch([["", "dim"],
      ["  [STEP 3] HTTP REQUEST  —  DISPATCH TO BACKEND", "header"],
      ["  ─────────────────────────────────────────────────────────────────────", "dim"],
      ["", "dim"],
      ["    POST /api/vitals HTTP/1.1", "info"],
      ["    Host: iomt-security.vercel.app", "dim"],
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
    ], 40);
    await pause(400);

    // ── STEP 4 ──
    await printBatch([["", "dim"],
      ["  [STEP 4] BACKEND SECURITY PIPELINE  —  6-LAYER VERIFICATION", "header"],
      ["  ─────────────────────────────────────────────────────────────────────", "dim"],
      ["    Request received by server. Initializing security layers...", "default"],
    ], 55);
    await pause(300);

    let result;
    try {
      result = await sendDeviceData(dev, hr, gw, bypass, token, finalTimestamp);
    } catch (err) {
      await printBatch([["", "dim"], [`    NETWORK ERROR: ${err.message}`, "error"], ["    >>> Transmission failed.", "error"]]);
      setIsRunning(false); setPhase("idle"); return;
    }

    const checks = result.checks || {};

    // Layer 1-6
    const layerDefs = [
      { key: "auth", num: 1, name: "Identity & Access Management (IAM)", lines: [
        ["    Validating Authorization bearer token...", "default"],
        [`    Token: ${token ? token.substring(0, 40) + (token.length > 40 ? "..." : "") : "(empty)"}`, "dim"],
      ]},
      { key: "timestamp", num: 2, name: "Anti-Replay Protection (Timestamp Validation)", lines: [
        [`    Client timestamp:  ${finalTimestamp}`, "default"],
        [`    Server timestamp:  ${new Date().toISOString()}`, "default"],
      ]},
      { key: "sqli", num: 3, name: "SQL Injection Shield (Input Sanitization)", lines: [
        [`    Scanning deviceId:  "${dev}"`, "default"],
        [`    Scanning gatewayId: "${gw}"`, "default"],
        ["    Regex: /['\\\"]|--|;|union|select|insert|drop|or\\s+1\\s*=\\s*1/i", "dim"],
      ]},
      { key: "rateLimit", num: 4, name: "Rate Limiter (DoS Flood Prevention)", lines: [
        ["    Checking request frequency against per-device rate limit...", "default"],
        ["    Minimum interval: 800ms between consecutive writes", "dim"],
      ]},
      { key: "range", num: 5, name: "Medical Range Validation (Spoofing Detection)", lines: [
        [`    Heart rate value:   ${hr} BPM`, "default"],
        ["    Acceptable range:  30 - 220 BPM (Human survival limits)", "dim"],
      ]},
      { key: "anomaly", num: 6, name: "Anomaly Detection (ML Baseline Heuristics)", lines: [
        ["    Comparing reading against device historical rolling average...", "default"],
        ["    Anomaly threshold: +/- 40 BPM delta from baseline", "dim"],
      ]},
    ];

    for (const layer of layerDefs) {
      const check = checks[layer.key];
      await printBatch([
        ["", "dim"],
        ["    +--------------------------------------------------------------+", "dim"],
        [`    |  LAYER ${layer.num}: ${layer.name.padEnd(50)}|`, "info"],
        ["    +--------------------------------------------------------------+", "dim"],
        ...layer.lines,
      ], 65);
      await pause(120);
      await printBatch([[`    >>> ${statusIcon(check?.status)}: ${check?.detail || "No details."}`, statusColor(check?.status)]], 0);
      await pause(200);
    }
    await pause(250);

    // ── STEP 5 ──
    await printBatch([["", "dim"],
      ["  [STEP 5] DATABASE QUERY COMPILATION", "header"],
      ["  ─────────────────────────────────────────────────────────────────────", "dim"],
      ["", "dim"],
      ["    Engine:  PostgreSQL via Supabase Client SDK", "default"],
      ["    Method:  Prepared Parameterized Statement (NOT string concatenation)", "default"],
      ["", "dim"],
      ["    --- VULNERABLE QUERY (String Interpolation - NOT USED) -----------", "error"],
      [`    INSERT INTO public.logs ("deviceId","heartRate","decision")`, "error"],
      [`    VALUES ('${dev}', ${hr}, '${result.status}');`, "error"],
      ["    ^ User input injected directly as executable SQL code", "dim"],
      ["", "dim"],
      ["    --- SECURE QUERY (Parameterized Binding - ACTIVE) ----------------", "success"],
      ["    PREPARE stmt(text, numeric, text) AS", "success"],
      ['    INSERT INTO public.logs ("deviceId","heartRate","decision")', "success"],
      ["    VALUES ($1, $2, $3);", "success"],
      ["", "dim"],
      [`    EXECUTE stmt('${dev}', ${hr}, '${result.status}');`, "success"],
      ["    ^ Inputs bound as safe data literals — injection is inert", "dim"],
    ], 45);
    await pause(300);

    // ── STEP 6 ──
    await printBatch([["", "dim"],
      ["  [STEP 6] DATABASE COMMIT", "header"],
      ["  ─────────────────────────────────────────────────────────────────────", "dim"],
    ], 50);
    if (result.reachedHospitalServer) {
      await printBatch([
        ["    Table:        public.logs", "default"],
        ["    Operation:    INSERT", "default"],
        [`    Protection:   ${result.dbProtectionType || "Parameterized Query (Safe)"}`, "default"],
        ["", "dim"],
        [`    Row:  { deviceId: "${dev}", heartRate: ${hr}, decision: "${result.status}" }`, "bright"],
        ["", "dim"],
        ["    >>> COMMITTED SUCCESSFULLY — Record written to hospital database", "success"],
      ], 55);
    } else {
      await printBatch([
        ["    Operation:    NONE (Write blocked by security pipeline)", "default"],
        [`    Blocked at:   ${result.stage}`, "default"],
        [`    Reason:       ${result.reason}`, "default"],
        ["", "dim"],
        ["    >>> ISOLATED — No database write executed. Threat contained.", "error"],
      ], 55);
    }
    await pause(300);

    // ── STEP 7 ──
    await printBatch([["", "dim"],
      ["  [STEP 7] HTTP RESPONSE  —  RETURNED TO CLIENT", "header"],
      ["  ─────────────────────────────────────────────────────────────────────", "dim"],
      ["", "dim"],
      [`    HTTP/1.1 ${result.status === "BLOCKED" ? "400 Bad Request" : "200 OK"}`, result.status === "BLOCKED" ? "error" : "success"],
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
    ], 40);
    await pause(250);

    // ── VERDICT ──
    const passedCount = Object.values(checks).filter((c) => c.status === "PASSED" || c.status === "BYPASSED").length;
    const totalChecks = Object.keys(checks).length;
    const verdictColor = result.status === "BLOCKED" ? "error" : result.status === "FLAGGED" ? "warning" : "success";
    const verdictLabel = result.status === "BLOCKED" ? "BLOCKED" : result.status === "FLAGGED" ? "FLAGGED (ALLOWED WITH WARNING)" : "APPROVED";

    await printBatch([["", "dim"],
      ["  =======================================================================", "dim"],
      [`   VERDICT:          ${verdictLabel}`, verdictColor],
      [`   Layers Passed:    ${passedCount}/${totalChecks}`, "default"],
      [`   Database Write:   ${result.reachedHospitalServer ? "YES (" + (result.dbProtectionType || "Parameterized") + ")" : "NO (Isolated)"}`, "default"],
      [`   Blocked At:       ${result.status === "BLOCKED" ? result.stage : "N/A — All layers cleared"}`, result.status === "BLOCKED" ? "error" : "dim"],
      ["  =======================================================================", "dim"],
    ], 40);
    await pause(200);

    // Return to idle
    await printBatch([["", "dim"],
      ["  Transmission complete. Press ENTER to start a new one, or type 'help'.", "dim"],
      ["", "dim"],
    ], 40);

    setIsRunning(false);
    setPhase("idle");
  };

  // ═══════════════════════════════════════════════════════════════
  //  INTERACTIVE PROMPT FLOW
  // ═══════════════════════════════════════════════════════════════
  const showHelp = async () => {
    await printBatch([
      ["", "dim"],
      ["  ╔════════════════════════════════════════════════════════════════╗", "dim"],
      ["  ║  AVAILABLE COMMANDS                                          ║", "info"],
      ["  ╠════════════════════════════════════════════════════════════════╣", "dim"],
      ["  ║                                                              ║", "dim"],
      ["  ║  normal    Run normal baseline telemetry                     ║", "default"],
      ["  ║  sqli      Test SQL injection attack                        ║", "default"],
      ["  ║  spoof     Test spoofed out-of-range vitals (999 BPM)       ║", "default"],
      ["  ║  replay    Test replay attack (10-min-old timestamp)        ║", "default"],
      ["  ║  badauth   Test invalid authorization token                 ║", "default"],
      ["  ║  anomaly   Test anomaly detection (high BPM spike)          ║", "default"],
      ["  ║  bypass    SQLi with API shield bypassed                    ║", "default"],
      ["  ║  clear     Clear the console                                ║", "default"],
      ["  ║  help      Show this help message                           ║", "default"],
      ["  ║                                                              ║", "dim"],
      ["  ║  Or press ENTER to build a custom packet step-by-step.      ║", "success"],
      ["  ║                                                              ║", "dim"],
      ["  ╚════════════════════════════════════════════════════════════════╝", "dim"],
      ["", "dim"],
    ], 30);
  };

  const promptDevice = async () => {
    await printBatch([["", "dim"], ["  Configure your telemetry packet:", "info"], ["", "dim"]], 40);
    await typeLine("  Enter Device ID [DEV-IOT-102]:", "prompt");
    setPhase("prompt_device");
  };

  const promptHR = async () => {
    await typeLine("  Enter Heart Rate in BPM [72]:", "prompt");
    setPhase("prompt_hr");
  };

  const promptGateway = async () => {
    await typeLine("  Enter Gateway ID [GW-EDGE-01]:", "prompt");
    setPhase("prompt_gateway");
  };

  const promptToken = async () => {
    await typeLine("  Enter Auth Token [Bearer iomt_secure_device_secret_token_1]:", "prompt");
    setPhase("prompt_token");
  };

  const promptTimestamp = async () => {
    await printBatch([
      ["", "dim"],
      ["  Select Timestamp Mode:", "prompt"],
      ["    1. Current Server Time (Valid)", "default"],
      ["    2. Replayed Packet (10 Min Old)", "default"],
      ["    3. Future Clock Drift (10 Min Ahead)", "default"],
      ["    4. Malformed Format (Invalid)", "default"],
    ], 35);
    await typeLine("  Choose [1-4, default=1]:", "prompt");
    setPhase("prompt_ts");
  };

  const promptBypass = async () => {
    await typeLine("  Bypass SQLi Shield? (y/n) [n]:", "prompt");
    setPhase("prompt_bypass");
  };

  // ═══════════════════════════════════════════════════════════════
  //  INPUT HANDLER (the brain of the terminal)
  // ═══════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    const raw = inputValue.trim();
    setInputValue("");

    switch (phase) {
      // ── IDLE: waiting for command or Enter ──────────────────
      case "idle": {
        print(`  $ ${raw || ""}`, "input");

        if (!raw) {
          // Enter pressed with no command — start interactive prompts
          configRef.current = {
            deviceId: "DEV-IOT-102", heartRate: 72, gatewayId: "GW-EDGE-01",
            authToken: "Bearer iomt_secure_device_secret_token_1", timeMode: "current", bypassShield: false,
          };
          await promptDevice();
          return;
        }

        const cmd = raw.toLowerCase();
        if (cmd === "help") { await showHelp(); return; }
        if (cmd === "clear") { clearConsole(); return; }

        if (COMMANDS[cmd]) {
          await printBatch([["", "dim"], [`  Running preset: ${COMMANDS[cmd].label}`, "info"]], 40);
          await runTransmission(COMMANDS[cmd].config);
          return;
        }

        await typeLine(`  Unknown command: '${raw}'. Type 'help' for available commands.`, "error");
        return;
      }

      // ── DEVICE ID ──────────────────────────────────────────
      case "prompt_device": {
        const val = raw || "DEV-IOT-102";
        print(`  $ ${val}`, "input");
        configRef.current.deviceId = val;
        await promptHR();
        return;
      }

      // ── HEART RATE ─────────────────────────────────────────
      case "prompt_hr": {
        const parsed = parseInt(raw);
        if (raw && isNaN(parsed)) {
          print(`  $ ${raw}`, "input");
          await typeLine("  Invalid number. Please enter a numeric BPM value:", "error");
          return; // stay in same phase
        }
        const val = raw ? parsed : 72;
        print(`  $ ${val}`, "input");
        configRef.current.heartRate = val;
        await promptGateway();
        return;
      }

      // ── GATEWAY ID ─────────────────────────────────────────
      case "prompt_gateway": {
        const val = raw || "GW-EDGE-01";
        print(`  $ ${val}`, "input");
        configRef.current.gatewayId = val;
        await promptToken();
        return;
      }

      // ── AUTH TOKEN ─────────────────────────────────────────
      case "prompt_token": {
        const val = raw || "Bearer iomt_secure_device_secret_token_1";
        print(`  $ ${val}`, "input");
        configRef.current.authToken = val;
        await promptTimestamp();
        return;
      }

      // ── TIMESTAMP MODE ─────────────────────────────────────
      case "prompt_ts": {
        const num = parseInt(raw) || 1;
        const modes = { 1: "current", 2: "replay", 3: "future", 4: "invalid" };
        const labels = { 1: "Current Server Time", 2: "Replayed Packet", 3: "Future Drift", 4: "Malformed" };
        if (num < 1 || num > 4) {
          print(`  $ ${raw}`, "input");
          await typeLine("  Invalid choice. Enter 1, 2, 3, or 4:", "error");
          return;
        }
        print(`  $ ${num} (${labels[num]})`, "input");
        configRef.current.timeMode = modes[num];
        await promptBypass();
        return;
      }

      // ── BYPASS SHIELD ──────────────────────────────────────
      case "prompt_bypass": {
        const val = raw.toLowerCase();
        const bypass = val === "y" || val === "yes";
        print(`  $ ${bypass ? "yes" : "no"}`, "input");
        configRef.current.bypassShield = bypass;

        await printBatch([["", "dim"], ["  Configuration complete. Initiating transmission...", "success"], ["", "dim"]], 50);
        await runTransmission({ ...configRef.current });
        return;
      }

      default:
        return;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getPlaceholder = () => {
    switch (phase) {
      case "idle": return "Type a command or press ENTER to begin...";
      case "prompt_device": return "Device ID (or ENTER for default)";
      case "prompt_hr": return "Heart rate in BPM (or ENTER for 72)";
      case "prompt_gateway": return "Gateway ID (or ENTER for default)";
      case "prompt_token": return "Auth token (or ENTER for default)";
      case "prompt_ts": return "1, 2, 3, or 4 (or ENTER for 1)";
      case "prompt_bypass": return "y or n (or ENTER for n)";
      case "running": return "Transmission in progress...";
      default: return "";
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col">
      {/* ── TERMINAL HEADER ───────────────────────────────────── */}
      <div className="bg-[#0d1117] border-b border-[#1c2333] px-4 py-2.5 flex items-center justify-between shrink-0">
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
        <div className="flex items-center gap-3">
          {isRunning ? (
            <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              TRANSMITTING...
            </span>
          ) : (
            <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {phase === "idle" ? "READY" : "AWAITING INPUT"}
            </span>
          )}
        </div>
      </div>

      {/* ── CONSOLE OUTPUT ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#080c14] px-2 py-3 font-mono text-[11px] leading-[1.65] select-text relative" onClick={() => inputRef.current?.focus()}>
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.03)_2px,rgba(0,0,0,0.03)_4px)] z-10" />

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
          .console-line { animation: fadeSlideIn 0.15s ease-out; }
        `}} />

        <div className="relative z-0">
          {lines.map((line) => (
            <div key={line.id} className={`console-line ${COLOR_MAP[line.color] || COLOR_MAP.default} whitespace-pre-wrap break-all min-h-[1em]`}>
              {line.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── INPUT BAR (Terminal Prompt) ────────────────────────── */}
      <div className="bg-[#0d1117] border-t border-[#1c2333] px-4 py-2.5 flex items-center gap-2 shrink-0">
        <span className="text-emerald-500 font-mono text-sm font-bold select-none">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning || phase === "boot"}
          className="flex-1 bg-transparent text-emerald-300 font-mono text-sm outline-none caret-emerald-400 placeholder-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
          placeholder={getPlaceholder()}
          autoFocus
          autoComplete="off"
          spellCheck="false"
        />
        {!isRunning && phase !== "boot" && (
          <span className="inline-block w-[7px] h-[14px] bg-emerald-400/70" style={{ animation: 'blink 1s step-end infinite' }} />
        )}
      </div>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <div className="bg-[#0a0e17] border-t border-[#1c2333] px-4 py-1.5 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-mono text-slate-700">
          {lines.length} lines | {txCount} transmission{txCount !== 1 ? "s" : ""}
        </span>
        <span className="text-[10px] font-mono text-slate-700">
          Type &apos;help&apos; for commands
        </span>
      </div>
    </div>
  );
}