"use client";

import { useState, useEffect } from "react";
import { sendDeviceData, simulateAttack, fetchLogs } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";

export default function SimulatorPage() {
  const [deviceId, setDeviceId] = useState("DEV-IOT-102");
  const [heartRate, setHeartRate] = useState(72);
  const [gatewayId, setGatewayId] = useState("GW-EDGE-01");
  const [customAuthToken, setCustomAuthToken] = useState("Bearer iomt_secure_device_secret_token_1");
  const [customTimeOption, setCustomTimeOption] = useState("current");
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [bypassShield, setBypassShield] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [activeTab, setActiveTab] = useState("server-log");

  // Animation & Flow state
  const [activeStep, setActiveStep] = useState(null); // 'wearable' | 'edge' | 'gateway' | 'hospital'
  const [flowStatus, setFlowStatus] = useState({
    wearable: "idle", // 'idle' | 'sending' | 'success' | 'error'
    edge: "idle",
    gateway: "idle",
    hospital: "idle",
  });

  // 6-stage security inspection check
  const [securityInspection, setSecurityInspection] = useState({
    authCheck: { status: "pending", label: "Identity Authorization Check" },
    timeVerify: { status: "pending", label: "Replay Attack Prevention" },
    sqliCheck: { status: "pending", label: "SQL Injection Shield" },
    rateLimit: { status: "pending", label: "Rate Limiting Checks" },
    rangeCheck: { status: "pending", label: "Medical Range Validation" },
    anomalyCheck: { status: "pending", label: "Lightweight Anomaly Detection" }
  });

  // Load logs on mount
  async function loadLogs() {
    try {
      const data = await fetchLogs();
      setRecentLogs(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    // 1. Initial fetch
    loadLogs();

    // 2. Real-time Subscription to automatically sync log stream
    const channel = supabase
      .channel("simulator-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        (payload) => {
          setRecentLogs((prev) => {
            const exists = prev.some(
              (log) => 
                log.timestamp === payload.new.timestamp && 
                log.deviceId === payload.new.deviceId
            );
            if (exists) return prev;

            const formattedLog = {
              ...payload.new,
              heartRate: Number(payload.new.heartRate)
            };
            return [formattedLog, ...prev].slice(0, 50);
          });

          // Quietly sync with server-side merged store
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper inside sending flow to animate steps
  const animateFlow = async (sendFn) => {
    setLoading(true);
    setCurrentResponse(null);
    setSecurityInspection({
      authCheck: { status: "pending", label: "Identity Authorization Check" },
      timeVerify: { status: "pending", label: "Replay Attack Prevention" },
      sqliCheck: { status: "pending", label: "SQL Injection Shield" },
      rateLimit: { status: "pending", label: "Rate Limiting Checks" },
      rangeCheck: { status: "pending", label: "Medical Value Consistency" },
      anomalyCheck: { status: "pending", label: "Pattern Anomaly Scanning" }
    });

    try {
      // Step 1: Wearable collects reading & junction pause
      setActiveStep("wearable_wait");
      await new Promise(r => setTimeout(r, 600));
      setActiveStep("wearable_travel");
      await new Promise(r => setTimeout(r, 1000));

      // Step 2: Edge Gateway junction pause & forwards
      setActiveStep("edge_wait");
      await new Promise(r => setTimeout(r, 600));
      setActiveStep("edge_travel");
      await new Promise(r => setTimeout(r, 1000));

      // Step 3: API Gateway Shield verification pause
      setActiveStep("gateway_wait");
      await new Promise(r => setTimeout(r, 600));
      
      const result = await sendFn();
      setCurrentResponse(result);

      if (result.status === "BLOCKED") {
        setActiveStep("gateway_blocked");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("security-alarm", { detail: result }));
        }
        if (result.stage === "Authentication") {
          setSecurityInspection({
            authCheck: { status: "fail", label: "Unauthorized Access" },
            timeVerify: { status: "skipped", label: "Not Evaluated" },
            sqliCheck: { status: "skipped", label: "Not Evaluated" },
            rateLimit: { status: "skipped", label: "Not Evaluated" },
            rangeCheck: { status: "skipped", label: "Not Evaluated" },
            anomalyCheck: { status: "skipped", label: "Not Evaluated" }
          });
        } else if (result.stage === "Timestamp Validation") {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "fail", label: "Invalid Timestamp Drift" },
            sqliCheck: { status: "skipped", label: "Not Evaluated" },
            rateLimit: { status: "skipped", label: "Not Evaluated" },
            rangeCheck: { status: "skipped", label: "Not Evaluated" },
            anomalyCheck: { status: "skipped", label: "Not Evaluated" }
          });
        } else if (result.stage === "SQLi Sanitization") {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "pass", label: "Timestamp Verified" },
            sqliCheck: { status: "fail", label: "SQL Injection Payload Detected" },
            rateLimit: { status: "skipped", label: "Not Evaluated" },
            rangeCheck: { status: "skipped", label: "Not Evaluated" },
            anomalyCheck: { status: "skipped", label: "Not Evaluated" }
          });
        } else if (result.stage === "Rate Limiting") {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "pass", label: "Timestamp Verified" },
            sqliCheck: { status: "pass", label: "No SQLi Detected" },
            rateLimit: { status: "fail", label: "Rate Limit Exceeded" },
            rangeCheck: { status: "skipped", label: "Not Evaluated" },
            anomalyCheck: { status: "skipped", label: "Not Evaluated" }
          });
        } else if (result.stage === "Medical Range Validation") {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "pass", label: "Timestamp Verified" },
            sqliCheck: { status: "pass", label: "No SQLi Detected" },
            rateLimit: { status: "pass", label: "Timing Approved" },
            rangeCheck: { status: "fail", label: "Physiological Out-of-Bounds" },
            anomalyCheck: { status: "skipped", label: "Not Evaluated" }
          });
        }
        setFlowStatus(p => ({ ...p, gateway: "error" }));
      } else if (result.status === "FLAGGED") {
        const isBypassed = result.dbProtectionType?.includes('Bypassed API');
        setSecurityInspection({
          authCheck: { status: "pass", label: "Identity Verified" },
          timeVerify: { status: "pass", label: "Timestamp Verified" },
          sqliCheck: isBypassed 
            ? { status: "warn", label: "Shield Bypassed (SQLi Detected)" }
            : { status: "pass", label: "No SQLi Detected" },
          rateLimit: { status: "pass", label: "Timing Approved" },
          rangeCheck: { status: "pass", label: "Normal Range Approved" },
          anomalyCheck: { status: "warn", label: "Telemetry Anomaly Flagged" }
        });
        setFlowStatus(p => ({ ...p, gateway: "success" }));
        setActiveStep("gateway_travel");
        await new Promise(r => setTimeout(r, 1000));
        setActiveStep("hospital");
      } else {
        const isBypassed = result.dbProtectionType?.includes('Bypassed API');
        setSecurityInspection({
          authCheck: { status: "pass", label: "Identity Verified" },
          timeVerify: { status: "pass", label: "Timestamp Verified" },
          sqliCheck: isBypassed 
            ? { status: "warn", label: "Shield Bypassed (SQLi Detected)" }
            : { status: "pass", label: "No SQLi Detected" },
          rateLimit: { status: "pass", label: "Timing Approved" },
          rangeCheck: { status: "pass", label: "Normal Range Approved" },
          anomalyCheck: { status: "pass", label: "Data Pattern Approved" }
        });
        setFlowStatus(p => ({ ...p, gateway: "success" }));
        setActiveStep("gateway_travel");
        await new Promise(r => setTimeout(r, 1000));
        setActiveStep("hospital");
      }

      setLoading(false);
      loadLogs();

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Unified helper to set up request metadata and trigger flow animation
  const triggerDeviceTelemetry = (device, rate, gateway, bypass, token = null, timeOption = null) => {
    const activeToken = token !== null ? token : customAuthToken;
    const activeTimeOption = timeOption !== null ? timeOption : customTimeOption;

    let finalTimestamp = new Date().toISOString();
    if (activeTimeOption === "replay") {
      finalTimestamp = new Date(Date.now() - 600000).toISOString(); // 10 minutes ago
    } else if (activeTimeOption === "future") {
      finalTimestamp = new Date(Date.now() + 600000).toISOString(); // 10 minutes ahead
    } else if (activeTimeOption === "invalid") {
      finalTimestamp = "INVALID_TIMESTAMP_FORMAT_TEST";
    }

    const reqPayload = {
      url: "/api/vitals",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": activeToken
      },
      body: {
        deviceId: device,
        heartRate: Number(rate),
        gatewayId: gateway,
        timestamp: finalTimestamp,
        bypassSqliShield: bypass
      }
    };
    
    setCurrentRequest(reqPayload);
    setActiveTab("server-log"); // Reset tab to live server log on new requests

    animateFlow(async () => {
      return sendDeviceData(
        reqPayload.body.deviceId,
        reqPayload.body.heartRate,
        reqPayload.body.gatewayId,
        reqPayload.body.bypassSqliShield,
        activeToken,
        finalTimestamp
      );
    });
  };

  // Main custom manual transmit trigger
  const handleTransmitCustom = () => {
    triggerDeviceTelemetry(deviceId, heartRate, gatewayId, bypassShield, customAuthToken, customTimeOption);
  };

  // 1. Transmit Baseline Telemetry
  const handleSendNormal = () => {
    const variance = Math.floor(Math.random() * 5) - 2;
    const finalHR = 72 + variance;
    setDeviceId("DEV-IOT-102");
    setHeartRate(finalHR);
    setGatewayId("GW-EDGE-01");
    setCustomAuthToken("Bearer iomt_secure_device_secret_token_1");
    setCustomTimeOption("current");
    triggerDeviceTelemetry("DEV-IOT-102", finalHR, "GW-EDGE-01", bypassShield, "Bearer iomt_secure_device_secret_token_1", "current");
  };

  // 2. Falsified Telemetry (Spoofing)
  const handleSendSpoofing = () => {
    const badValues = [-5, 12, 299, 500, 999];
    const randomBad = badValues[Math.floor(Math.random() * badValues.length)];
    setDeviceId("DEV-IOT-102");
    setHeartRate(randomBad);
    setGatewayId("GW-EDGE-01");
    setCustomAuthToken("Bearer iomt_secure_device_secret_token_1");
    setCustomTimeOption("current");
    triggerDeviceTelemetry("DEV-IOT-102", randomBad, "GW-EDGE-01", bypassShield, "Bearer iomt_secure_device_secret_token_1", "current");
  };

  // 3. High-Frequency Stress Scan (DoS)
  const handleAttackDoS = async () => {
    setLoading(true);
    setFlowStatus(p => ({ ...p, wearable: "sending", edge: "sending", gateway: "sending" }));
    
    setCurrentRequest({
      url: "/api/vitals (30 rapid parallel requests)",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": customAuthToken
      },
      body: {
        deviceId: deviceId,
        heartRate: "30 randomized packets (-50 to 450 BPM)",
        gatewayId: gatewayId,
        timestamp: "Sent concurrently in parallel",
        bypassSqliShield: bypassShield
      }
    });
    setActiveTab("server-log");

    try {
      await simulateAttack(deviceId, 30);
      loadLogs();
      setCurrentResponse({ 
        status: "SCAN_COMPLETE", 
        reachedHospitalServer: false,
        reason: "Active rate limiting isolated telemetry flood from database.",
        message: "High-Frequency stress scan completed. Transmitted 30 rapid packets to validate rate limiter boundaries." 
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // 4. Telemetry Wave Drift (Anomaly)
  const handleSendAnomaly = () => {
    setDeviceId("DEV-IOT-102");
    setHeartRate(127);
    setGatewayId("GW-EDGE-01");
    setCustomAuthToken("Bearer iomt_secure_device_secret_token_1");
    setCustomTimeOption("current");
    triggerDeviceTelemetry("DEV-IOT-102", 127, "GW-EDGE-01", bypassShield, "Bearer iomt_secure_device_secret_token_1", "current");
  };

  // 5. Database SQL Injection Payload Test
  const handleSendSQLi = (presetPayload = null) => {
    const payload = presetPayload || "DEV-IOT-102'; SELECT * FROM logs;--";
    setDeviceId(payload);
    setHeartRate(72);
    setGatewayId("GW-EDGE-01");
    setCustomAuthToken("Bearer iomt_secure_device_secret_token_1");
    setCustomTimeOption("current");
    triggerDeviceTelemetry(payload, 72, "GW-EDGE-01", bypassShield, "Bearer iomt_secure_device_secret_token_1", "current");
  };

  const isWearableStep = activeStep?.startsWith("wearable");
  const isEdgeStep = activeStep?.startsWith("edge");
  const isGatewayStep = activeStep?.startsWith("gateway");

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <style jsx>{`
        @keyframes marquee {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes packetFlow {
          0% { left: 0%; opacity: 0; transform: translateY(-50%) scale(0.6); }
          15% { opacity: 1; transform: translateY(-50%) scale(1.1); }
          85% { opacity: 1; transform: translateY(-50%) scale(1.1); }
          100% { left: 100%; opacity: 0; transform: translateY(-50%) scale(0.6); }
        }
        @keyframes ripple {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 0.3; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }
        @keyframes packetFlowVertical {
          0% { top: 0%; opacity: 0; transform: translateX(-50%) scale(0.6); }
          15% { opacity: 1; transform: translateX(-50%) scale(1.1); }
          85% { opacity: 1; transform: translateX(-50%) scale(1.1); }
          100% { top: 100%; opacity: 0; transform: translateX(-50%) scale(0.6); }
        }
        @keyframes pulseHeart {
          0% { transform: scale(0.9); }
          30% { transform: scale(1.2); }
          40% { transform: scale(0.95); }
          55% { transform: scale(1.1); }
          100% { transform: scale(0.9); }
        }
        .alive-link {
          stroke-dasharray: 6 6;
          animation: marquee 1s linear infinite;
        }
        .packet-pulse {
          position: absolute;
          border-radius: 9999px;
          z-index: 30;
        }
        @media (min-width: 768px) {
          .packet-pulse {
            top: 50%;
            left: 0%;
            animation: packetFlow 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
        }
        @media (max-width: 767px) {
          .packet-pulse {
            top: 0%;
            left: 50%;
            animation: packetFlowVertical 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
        }
        .node-glow {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          animation: ripple 2s infinite;
          z-index: 0;
        }
        .float-animation {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>

      {/* System Explanation Card on Top */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-start gap-5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-sky-600 shadow-lg shadow-sky-500/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">Secure Hospital Telemetry Console</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Verify how your database is protected from front-end to back-end. Real-time patient telemetry passes through 
              a multi-layer defensive shield. <span className="text-sky-600 font-medium">Identity authorization, anti-replay, SQL Injection filters, rate limiters, and ML anomaly scanners</span> protect database writes, isolating malicious packets and ensuring clinical integrity.
            </p>
          </div>
        </div>
      </div>

      {/* Main Unified Dashboard Grid (Controls on Left, Pipeline Visualizer on Right) */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left Column: Simulator Controls (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-base font-bold text-slate-800">Telemetry Gateway Simulator</h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">Interactive</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Transmit clinical measurements and database stress-tests.</p>
              
              <div className="space-y-5 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">Device Configuration</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Device ID</span>
                      <input 
                        type="text" 
                        value={deviceId} 
                        onChange={e => setDeviceId(e.target.value)} 
                        className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none" 
                        placeholder="Device ID"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Gateway ID</span>
                      <input 
                        type="text" 
                        value={gatewayId} 
                        onChange={e => setGatewayId(e.target.value)} 
                        className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none" 
                        placeholder="Gateway ID"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Custom Security Headers & Parameters */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">Security Headers & Parameters</label>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Authorization Header (Token)</span>
                      <input 
                        type="text" 
                        value={customAuthToken} 
                        onChange={e => setCustomAuthToken(e.target.value)} 
                        className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-600 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none" 
                        placeholder="Bearer token"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Client Timestamp Offset</span>
                      <select 
                        value={customTimeOption} 
                        onChange={e => setCustomTimeOption(e.target.value)} 
                        className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none cursor-pointer"
                      >
                        <option value="current">Current Server Time (Valid - 0s Drift)</option>
                        <option value="replay">Replayed Session (Invalid - 10 Minutes Old)</option>
                        <option value="future">Future Clock Drift (Invalid - 10 Minutes Ahead)</option>
                        <option value="invalid">Malformed Format (Invalid Raw Text)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Dynamic Heartbeat Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 relative overflow-hidden flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    {/* Pulsing heart SVG */}
                    <div className="relative shrink-0 flex items-center justify-center w-12 h-12 bg-white rounded-full border border-slate-200 shadow-sm">
                      <svg 
                        className="w-7 h-7 text-rose-500 transition-all duration-300" 
                        style={{
                          animation: `pulseHeart ${60 / Math.max(10, Math.min(230, heartRate || 72))}s infinite cubic-bezier(0.215, 0.61, 0.355, 1)`,
                        }}
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      {activeStep === 'wearable_wait' && <div className="node-glow bg-rose-500/20 absolute inset-0 rounded-full"></div>}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pulse State</span>
                      <h4 className={`text-xs font-bold mt-0.5 ${
                        heartRate >= 60 && heartRate <= 100 
                          ? 'text-emerald-600' 
                          : 'text-rose-500 animate-pulse'
                      }`}>
                        {heartRate >= 60 && heartRate <= 100 
                          ? 'Normal Sinus Rhythm' 
                          : heartRate < 60 
                            ? 'Bradycardia (Low Pulse)' 
                            : 'Tachycardia (High Pulse)'
                        }
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-mono font-extrabold text-slate-800">{heartRate}</span>
                    <span className="text-xs text-slate-500 font-bold ml-1">BPM</span>
                  </div>
                </div>

                {/* 4. Heart Rate Simulator */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-500">Heart Rate Simulation</label>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      heartRate >= 60 && heartRate <= 100 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}>
                      {heartRate} BPM
                    </span>
                  </div>
                  
                  {/* Highlighted normal track indicator */}
                  <div className="relative">
                    <input 
                      type="range" 
                      min="10" 
                      max="230" 
                      value={heartRate} 
                      onChange={e => setHeartRate(e.target.value)} 
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-sky-500 relative z-10" 
                    />
                    {/* Visual track highlights */}
                    <div className="absolute top-1/2 left-0 right-0 h-2 bg-slate-200 -translate-y-1/2 rounded-lg overflow-hidden flex">
                      {/* Low zone: 10 to 60 (22.7%) */}
                      <div className="h-full bg-rose-200/50" style={{ width: '22.7%' }}></div>
                      {/* Normal zone: 60 to 100 (18.2%) */}
                      <div className="h-full bg-emerald-400" style={{ width: '18.2%' }}></div>
                      {/* High zone: 100 to 230 (59.1%) */}
                      <div className="h-full bg-rose-200/50" style={{ width: '59.1%' }}></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-medium">
                    <span className="text-rose-600">Bradycardia (&lt;60)</span>
                    <span className="text-emerald-600 font-bold">Normal (60-100)</span>
                    <span className="text-rose-600">Tachycardia (&gt;100)</span>
                  </div>
                </div>

                {/* 5. Advanced Security Sandbox controls */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-3">
                      <span className="text-[9px] uppercase font-bold text-blue-600 tracking-wider">Advanced Sandbox Control</span>
                      <h4 className="text-xs font-bold text-slate-700 mt-0.5">Bypass API SQLi Shield</h4>
                      <p className="text-[9.5px] text-slate-400 leading-snug mt-0.5">
                        Deactivate the API regex gateway check to simulate vulnerabilities. This proves database resilience using parameterized SQL columns!
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={bypassShield} 
                        onChange={e => setBypassShield(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* 6. Primary Action Trigger Button */}
                <button
                  onClick={handleTransmitCustom}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-700 hover:to-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg mt-2 flex items-center justify-center gap-2"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  TRANSMIT CUSTOM TELEMETRY PACKET
                </button>
              </div>
            </div>

            {/* Simulated Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <button 
                onClick={handleSendNormal} 
                disabled={loading} 
                className="group relative p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/5 group-hover:translate-x-full transition-transform duration-500" />
                <div className="relative flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-emerald-600">Baseline Telemetry</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Legitimate medical signs</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={handleSendSpoofing} 
                disabled={loading} 
                className="group relative p-3 rounded-xl bg-gradient-to-r from-rose-500/10 to-rose-600/5 border border-rose-500/30 hover:border-rose-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 to-rose-500/5 group-hover:translate-x-full transition-transform duration-500" />
                <div className="relative flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-rose-600">Out-Of-Bounds Test</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Falsified vital values</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={handleAttackDoS} 
                disabled={loading} 
                className="group relative p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/5 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-purple-500/5 group-hover:translate-x-full transition-transform duration-500" />
                <div className="relative flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-purple-600">High-Freq Stress</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Enforce rate limits</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={handleSendAnomaly} 
                disabled={loading} 
                className="group relative p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 hover:border-amber-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 to-amber-500/5 group-hover:translate-x-full transition-transform duration-500" />
                <div className="relative flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-amber-600">Telemetry Drift</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Sudden delta deviation</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={handleSendSQLi} 
                disabled={loading} 
                className="group relative p-3 rounded-xl bg-gradient-to-r from-blue-600/10 to-blue-700/5 border border-blue-500/30 hover:border-blue-600/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden sm:col-span-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-blue-600/5 group-hover:translate-x-full transition-transform duration-500" />
                <div className="relative flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-blue-600">Database SQL Injection Probe (SQLi)</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Inject SQL commands to test Backend Parameterization and Entry Shields</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Node Pipeline & Security Inspection (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Node Chain Pipeline Visualizer */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
            
            <h3 className="text-xs font-bold text-sky-600 mb-6 uppercase tracking-widest text-center flex items-center justify-center gap-2">
              <span className="w-6 h-px bg-sky-200"></span>
              Live Telemetry Flow Visualizer
              <span className="w-6 h-px bg-sky-200"></span>
            </h3>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-1 relative">
              
              {/* Node 1: Wearable */}
              <div className="flex flex-col items-center z-10 text-center min-w-[90px] relative group">
                {activeStep === 'wearable_wait' && <div className="node-glow bg-sky-500/20"></div>}
                
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-md transition-all duration-300 transform group-hover:scale-105 ${
                  isWearableStep 
                    ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-sky-500/10 scale-105' 
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className={`text-[10px] font-bold mt-2 ${isWearableStep ? 'text-sky-600' : 'text-slate-500'}`}>Wearable</p>
                <p className="text-[8px] text-slate-400">Vitals Source</p>
              </div>

              {/* Wire 1 */}
              <div className="h-6 w-px md:h-auto md:flex-1 md:w-16 relative flex items-center justify-center">
                <svg className="absolute w-full h-full overflow-visible">
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke={activeStep === 'wearable_travel' ? '#0ea5e9' : '#e2e8f0'} strokeWidth="2" className={`hidden md:block ${activeStep === 'wearable_travel' ? 'alive-link' : ''}`} />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke={activeStep === 'wearable_travel' ? '#0ea5e9' : '#e2e8f0'} strokeWidth="2" className={`md:hidden ${activeStep === 'wearable_travel' ? 'alive-link' : ''}`} />
                </svg>
                {activeStep === 'wearable_travel' && (
                  <div className="packet-pulse w-5 h-5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)] animate-ping"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                  </div>
                )}
              </div>

              {/* Node 2: Edge Gateway */}
              <div className="flex flex-col items-center z-10 text-center min-w-[90px] relative group">
                {activeStep === 'edge_wait' && <div className="node-glow bg-sky-500/20"></div>}
                
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-md transition-all duration-300 transform group-hover:scale-105 ${
                  isEdgeStep 
                    ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-sky-500/10 scale-105' 
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                  </svg>
                </div>
                <p className={`text-[10px] font-bold mt-2 ${isEdgeStep ? 'text-sky-600' : 'text-slate-500'}`}>Edge Node</p>
                <p className="text-[8px] text-slate-400">Local Router</p>
              </div>

              {/* Wire 2 */}
              <div className="h-6 w-px md:h-auto md:flex-1 md:w-16 relative flex items-center justify-center">
                <svg className="absolute w-full h-full overflow-visible">
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke={activeStep === 'edge_travel' ? '#0ea5e9' : '#e2e8f0'} strokeWidth="2" className={`hidden md:block ${activeStep === 'edge_travel' ? 'alive-link' : ''}`} />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke={activeStep === 'edge_travel' ? '#0ea5e9' : '#e2e8f0'} strokeWidth="2" className={`md:hidden ${activeStep === 'edge_travel' ? 'alive-link' : ''}`} />
                </svg>
                {activeStep === 'edge_travel' && (
                  <div className="packet-pulse w-5 h-5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)] animate-ping"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                  </div>
                )}
              </div>

              {/* Node 3: API Shield Gateway */}
              <div className="flex flex-col items-center z-10 text-center min-w-[100px] relative group">
                {activeStep === 'gateway_wait' && <div className="node-glow bg-amber-500/20"></div>}
                
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-md transition-all duration-300 transform group-hover:scale-105 ${
                  isGatewayStep 
                    ? activeStep === 'gateway_blocked' 
                      ? 'border-rose-500 bg-rose-50 text-rose-500 shadow-rose-500/10 scale-105' 
                      : 'border-amber-500 bg-amber-50 text-amber-500 shadow-amber-500/10 scale-105'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}>
                  {activeStep === 'gateway_blocked' ? (
                    <svg className="w-6 h-6 text-rose-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-8v6m0 5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                </div>
                <p className={`text-[10px] font-bold mt-2 ${
                  isGatewayStep 
                    ? activeStep === 'gateway_blocked' 
                      ? 'text-rose-500 font-extrabold' 
                      : 'text-amber-500'
                    : 'text-slate-500'
                }`}>API Shield</p>
                <p className="text-[8px] text-slate-400">Security Gate</p>
              </div>

              {/* Wire 3 */}
              <div className="h-6 w-px md:h-auto md:flex-1 md:w-16 relative flex items-center justify-center">
                <svg className="absolute w-full h-full overflow-visible">
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke={activeStep === 'gateway_travel' ? '#10b981' : '#e2e8f0'} strokeWidth="2" className={`hidden md:block ${activeStep === 'gateway_travel' ? 'alive-link' : ''}`} />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke={activeStep === 'gateway_travel' ? '#10b981' : '#e2e8f0'} strokeWidth="2" className={`md:hidden ${activeStep === 'gateway_travel' ? 'alive-link' : ''}`} />
                </svg>
                {activeStep === 'gateway_travel' && (
                  <div className="packet-pulse w-5 h-5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-ping"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  </div>
                )}
              </div>

              {/* Node 4: Hospital Server (Database) */}
              <div className="flex flex-col items-center z-10 text-center min-w-[90px] relative group">
                {activeStep === 'hospital' && <div className="node-glow bg-emerald-500/20"></div>}
                
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-md transition-all duration-300 transform group-hover:scale-105 ${
                  activeStep === 'hospital' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-emerald-500/10 scale-105' 
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className={`text-[10px] font-bold mt-2 ${activeStep === 'hospital' ? 'text-emerald-500 font-extrabold' : 'text-slate-500'}`}>Hospital DB</p>
                <p className="text-[8px] text-slate-400">Secure Storage</p>
              </div>
            </div>
          </div>

          {/* Security Inspection Checklist */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-base font-bold text-slate-800">Security Inspection Pipeline</h3>
              {currentResponse && <StatusBadge status={currentResponse.status} />}
            </div>
            <p className="text-xs text-slate-400 mb-6">Real-time gateway audits executed on incoming packets.</p>
            
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(securityInspection).map(([key, config], idx) => {
                let border = "border-slate-200 bg-white hover:bg-slate-50";
                let icon = (<div className="w-4 h-4 rounded-full border border-slate-300"></div>);
                let labelColor = "text-slate-600";

                if (config.status === "pass") {
                   border = "border-emerald-200 bg-emerald-50/40";
                   labelColor = "text-emerald-700 font-bold";
                   icon = (<svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 8" />
                   </svg>);
                } else if (config.status === "fail") {
                   border = "border-rose-200 bg-rose-50/40";
                   labelColor = "text-rose-600 font-bold";
                   icon = (<svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                   </svg>);
                } else if (config.status === "warn") {
                   border = "border-amber-200 bg-amber-50/40";
                   labelColor = "text-amber-700 font-bold";
                   icon = (<svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4" />
                   </svg>);
                } else if (config.status === "skipped") {
                   border = "border-slate-200 bg-slate-50/30 opacity-60";
                   labelColor = "text-slate-400";
                   icon = (<svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                   </svg>);
                } else {
                   icon = (<div className="w-4 h-4 rounded-full border border-sky-500/50 border-t-transparent animate-spin"></div>);
                }

                return (
                  <div key={key} className={`flex items-start gap-3 p-3 rounded-xl border ${border} transition-all duration-300`}>
                    <div className="shrink-0 mt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs truncate block ${labelColor}`}>{config.label}</span>
                      <p className="text-[9px] text-slate-400 mt-1 leading-snug">
                        {idx === 0 && "Validates API cryptographic keys & bearer tokens."}
                        {idx === 1 && "Verifies timestamp drift bounds to stop session replays."}
                        {idx === 2 && "Input Guard: Filters dangerous SQL characters and scripts."}
                        {idx === 3 && "Protects DB pool from flooding and connection crashes."}
                        {idx === 4 && "Clinical check: filters off physiological impossible BPMs."}
                        {idx === 5 && "ML heuristics: Flags delta shifts from historical average."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {currentResponse && (
              <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 select-none">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] text-slate-500 font-sans font-semibold ml-2">HTTP / API Payload Inspector</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <button 
                      onClick={() => setActiveTab("server-log")}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold transition-colors ${
                        activeTab === "server-log" 
                          ? "bg-slate-800 text-sky-400 border border-slate-700" 
                          : "text-slate-400 hover:bg-slate-900/50"
                      }`}
                    >
                      Server Console Log
                    </button>
                    <button 
                      onClick={() => setActiveTab("sql")}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold transition-colors ${
                        activeTab === "sql" 
                          ? "bg-slate-800 text-sky-400 border border-slate-700" 
                          : "text-slate-400 hover:bg-slate-900/50"
                      }`}
                    >
                      SQL Compilation
                    </button>
                    <button 
                      onClick={() => setActiveTab("summary")}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold transition-colors ${
                        activeTab === "summary" 
                          ? "bg-slate-800 text-sky-400 border border-slate-700" 
                          : "text-slate-400 hover:bg-slate-900/50"
                      }`}
                    >
                      Verdict Summary
                    </button>
                    <button 
                      onClick={() => setActiveTab("request")}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold transition-colors ${
                        activeTab === "request" 
                          ? "bg-slate-800 text-sky-400 border border-slate-700" 
                          : "text-slate-400 hover:bg-slate-900/50"
                      }`}
                    >
                      Request Payload
                    </button>
                    <button 
                      onClick={() => setActiveTab("response")}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold transition-colors ${
                        activeTab === "response" 
                          ? "bg-slate-800 text-sky-400 border border-slate-700" 
                          : "text-slate-400 hover:bg-slate-900/50"
                      }`}
                    >
                      Response Payload
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-4 overflow-y-auto max-h-[380px] select-text">
                  {activeTab === "server-log" && (
                    <div className="font-mono text-[10px] space-y-1.5 text-slate-300">
                      <div>[{new Date().toISOString().replace('T', ' ').substring(0, 19)}] INCOMING TELEMETRY REQUEST from IP {currentResponse.requestOrigin || '192.168.1.12'}</div>
                      
                      {/* Layer 0: IAM Check */}
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[LAYER 0: IAM Check]</span>
                        <span className="text-slate-300">Analyzing Authorization Header...</span>
                      </div>
                      <div className="pl-6">
                        {currentResponse.checks?.auth?.status === "PASSED" ? (
                          <span className="text-emerald-400">✔ PASSED: {currentResponse.checks.auth.detail}</span>
                        ) : (
                          <span className="text-rose-400 font-extrabold">✘ FAILED: {currentResponse.checks?.auth?.detail || 'Verification failed.'}</span>
                        )}
                      </div>

                      {/* Layer 0.5: Replay Check */}
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[LAYER 0.5: Replay Check]</span>
                        <span className="text-slate-300">Verifying Client Timestamp Drift...</span>
                      </div>
                      <div className="pl-6">
                        {currentResponse.checks?.timestamp?.status === "PASSED" ? (
                          <span className="text-emerald-400">✔ PASSED: {currentResponse.checks.timestamp.detail}</span>
                        ) : currentResponse.checks?.timestamp?.status === "FAILED" ? (
                          <span className="text-rose-400 font-extrabold">✘ FAILED: {currentResponse.checks.timestamp.detail}</span>
                        ) : (
                          <span className="text-slate-500">⏳ SKIPPED: {currentResponse.checks?.timestamp?.detail || 'Preceding layer blocked execution.'}</span>
                        )}
                      </div>

                      {/* Layer 0.8: SQLi Check */}
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[LAYER 0.8: SQLi Check]</span>
                        <span className="text-slate-300">Scanning input parameters for SQL constructs...</span>
                      </div>
                      <div className="pl-6">
                        {currentResponse.checks?.sqli?.status === "PASSED" ? (
                          <span className="text-emerald-400">✔ PASSED: {currentResponse.checks.sqli.detail}</span>
                        ) : currentResponse.checks?.sqli?.status === "FAILED" ? (
                          <span className="text-rose-400 font-extrabold">✘ FAILED: {currentResponse.checks.sqli.detail}</span>
                        ) : currentResponse.checks?.sqli?.status === "BYPASSED" ? (
                          <span className="text-amber-400 font-bold">⚠ BYPASSED: {currentResponse.checks.sqli.detail}</span>
                        ) : (
                          <span className="text-slate-500">⏳ SKIPPED: {currentResponse.checks?.sqli?.detail || 'Preceding layer blocked execution.'}</span>
                        )}
                      </div>

                      {/* Layer 1: Rate Limiter */}
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[LAYER 1: Rate Limiter]</span>
                        <span className="text-slate-300">Checking time interval since last write...</span>
                      </div>
                      <div className="pl-6">
                        {currentResponse.checks?.rateLimit?.status === "PASSED" ? (
                          <span className="text-emerald-400">✔ PASSED: {currentResponse.checks.rateLimit.detail}</span>
                        ) : currentResponse.checks?.rateLimit?.status === "FAILED" ? (
                          <span className="text-rose-400 font-extrabold">✘ FAILED: {currentResponse.checks.rateLimit.detail}</span>
                        ) : (
                          <span className="text-slate-500">⏳ SKIPPED: {currentResponse.checks?.rateLimit?.detail || 'Preceding layer blocked execution.'}</span>
                        )}
                      </div>

                      {/* Layer 2: Medical Range */}
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[LAYER 2: Medical Range]</span>
                        <span className="text-slate-300">Validating physiological heart rate bounds...</span>
                      </div>
                      <div className="pl-6">
                        {currentResponse.checks?.range?.status === "PASSED" ? (
                          <span className="text-emerald-400">✔ PASSED: {currentResponse.checks.range.detail}</span>
                        ) : currentResponse.checks?.range?.status === "FAILED" ? (
                          <span className="text-rose-400 font-extrabold">✘ FAILED: {currentResponse.checks.range.detail}</span>
                        ) : (
                          <span className="text-slate-500">⏳ SKIPPED: {currentResponse.checks?.range?.detail || 'Preceding layer blocked execution.'}</span>
                        )}
                      </div>

                      {/* Layer 3: ML Anomaly */}
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[LAYER 3: ML Anomaly]</span>
                        <span className="text-slate-300">Comparing vital reading against historical baseline...</span>
                      </div>
                      <div className="pl-6">
                        {currentResponse.checks?.anomaly?.status === "PASSED" ? (
                          <span className="text-emerald-400">✔ PASSED: {currentResponse.checks.anomaly.detail}</span>
                        ) : currentResponse.checks?.anomaly?.status === "FAILED" ? (
                          <span className="text-amber-400 font-bold">⚠ FLAGGED: {currentResponse.checks.anomaly.detail}</span>
                        ) : (
                          <span className="text-slate-500">⏳ SKIPPED: {currentResponse.checks?.anomaly?.detail || 'Preceding layer blocked execution.'}</span>
                        )}
                      </div>

                      {/* Database Commit Status */}
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-1 bg-slate-950/40 p-2.5 rounded border border-slate-850">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0 font-bold">[PIPELINE VERDICT]</span>
                          <span className={`font-extrabold ${
                            currentResponse.status === "BLOCKED" 
                              ? "text-rose-400 animate-pulse" 
                              : currentResponse.status === "FLAGGED" 
                                ? "text-amber-400" 
                                : "text-emerald-400"
                          }`}>
                            REQUEST {currentResponse.status} AT {currentResponse.stage} STAGE
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0 font-bold">[DATABASE COMMIT]</span>
                          <span className={`font-extrabold ${
                            currentResponse.reachedHospitalServer 
                              ? currentResponse.dbProtectionType?.includes("Bypassed") 
                                ? "text-amber-400 font-extrabold" 
                                : "text-emerald-400" 
                              : "text-rose-400"
                          }`}>
                            {currentResponse.reachedHospitalServer 
                              ? `COMMITTED SUCCESSFULLY via ${currentResponse.dbProtectionType}` 
                              : `BLOCKED / ISOLATED (No database write executed)`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "sql" && (
                    <div className="font-mono text-[10px] space-y-4">
                      {/* 1. Insecure Concatenation Assembly */}
                      <div className="space-y-1 bg-slate-950 p-3 rounded border border-rose-950/40">
                        <div className="text-rose-400 font-extrabold border-b border-rose-950/30 pb-1 flex items-center justify-between">
                          <span>⚠️ INSECURE QUERY ASSEMBLY (Vulnerable String Interpolation)</span>
                          <span className="text-[9px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 text-rose-400 font-sans">Risk: HIGH</span>
                        </div>
                        <pre className="text-slate-400 overflow-x-auto pt-2 text-[9.5px]">
{`INSERT INTO public.logs ("deviceId", "heartRate", "decision", "dbProtectionType") 
VALUES ('`}<span className="text-rose-400 font-extrabold underline">{currentRequest?.body?.deviceId || deviceId}</span>{`', ${currentRequest?.body?.heartRate || heartRate}, '${currentResponse.status}', 'Insecure String Concatenation');`}
                        </pre>
                        <p className="text-[9.5px] text-slate-500 leading-relaxed pt-1.5 font-sans">
                          <strong>Vulnerability Mechanics:</strong> If you use simple string templates, any semicolon (<code>;</code>) input terminates the original query. The database engine immediately compiles and executes whatever SQL commands follow the terminator under root credentials (e.g. leaking metrics or dropping databases).
                        </p>
                      </div>

                      {/* 2. Secure Prepared Parameterized Bindings */}
                      <div className="space-y-1 bg-slate-950 p-3 rounded border border-emerald-950/40">
                        <div className="text-emerald-400 font-extrabold border-b border-emerald-950/30 pb-1 flex items-center justify-between">
                          <span>✅ SECURE QUERY ASSEMBLY (Prepared Parameterized Query)</span>
                          <span className="text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-emerald-400 font-sans">Secure</span>
                        </div>
                        <pre className="text-slate-400 overflow-x-auto pt-2 text-[9.5px]">
{`-- Step 1: Pre-compile statement template inside SQL Parser
PREPARE insert_log (text, numeric, text, text) AS
INSERT INTO public.logs ("deviceId", "heartRate", "decision", "dbProtectionType") 
VALUES ($1, $2, $3, $4);

-- Step 2: Safely bind parameters and execute
EXECUTE insert_log(
  $1 = '`}<span className="text-emerald-400 font-semibold">{currentRequest?.body?.deviceId || deviceId}</span>{`',
  $2 = ${currentRequest?.body?.heartRate || heartRate},
  $3 = '${currentResponse.status}',
  $4 = '${currentResponse.reachedHospitalServer ? currentResponse.dbProtectionType : 'Isolated (No Write)'}'
);`}
                        </pre>
                        <p className="text-[9.5px] text-slate-500 leading-relaxed pt-1.5 font-sans">
                          <strong>Defense Mechanics:</strong> The SQL command template layout is pre-compiled before variables are bound. Input parameters are handled strictly as data literals—not code. The single quotes and command terminators are treated as plain text, rendering the injection fully inert.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "summary" && (
                    <div className="space-y-3 font-sans text-slate-300">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          currentResponse.status === "BLOCKED" 
                            ? "bg-rose-500/10 text-rose-400" 
                            : currentResponse.status === "FLAGGED" 
                              ? "bg-amber-500/10 text-amber-400" 
                              : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-xs">
                          <span className="font-semibold text-slate-100 text-xs block">System Security Audit Log</span>
                          <p className="text-slate-400 font-mono text-[10px] mt-1 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
                            {currentResponse.reason || currentResponse.message}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-800 text-[10px]">
                            <div>
                              <span className="text-slate-500 block uppercase font-bold tracking-wider text-[8px]">Decision Status</span>
                              <span className={`font-bold inline-block mt-0.5 ${
                                currentResponse.status === "BLOCKED" 
                                  ? "text-rose-400 font-extrabold" 
                                  : currentResponse.status === "FLAGGED" 
                                    ? "text-amber-400 font-extrabold" 
                                    : "text-emerald-400 font-extrabold"
                              }`}>
                                {currentResponse.status}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block uppercase font-bold tracking-wider text-[8px]">Database Security Shield</span>
                              {currentResponse.reachedHospitalServer ? (
                                <span className={`font-extrabold inline-block mt-0.5 ${
                                  currentResponse.dbProtectionType?.includes("Bypassed") 
                                    ? "text-amber-400 underline underline-offset-2 decoration-amber-500/50 animate-pulse" 
                                    : "text-emerald-400"
                                }`}>
                                  {currentResponse.dbProtectionType || "Safe Parameterized"}
                                </span>
                              ) : currentResponse.dbProtectionType === 'Blocked: SQLi Prevented' ? (
                                <span className="font-extrabold text-rose-400 inline-block mt-0.5">Blocked: SQLi Prevented</span>
                              ) : (
                                <span className="font-bold text-slate-400 inline-block mt-0.5">Isolated (No DB Write)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "request" && currentRequest && (
                    <div className="font-mono text-[10px] space-y-3">
                      <div>
                        <span className="text-sky-400 font-bold">METHOD:</span> <span className="text-emerald-400">POST</span>
                      </div>
                      <div>
                        <span className="text-sky-400 font-bold">URL:</span> <span className="text-slate-300">{currentRequest.url}</span>
                      </div>
                      <div>
                        <span className="text-sky-400 font-bold">HEADERS:</span>
                        <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 mt-1 text-slate-400 overflow-x-auto">
{JSON.stringify(currentRequest.headers, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-sky-400 font-bold">JSON PAYLOAD BODY:</span>
                        <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 mt-1 text-slate-300 overflow-x-auto">
{JSON.stringify(currentRequest.body, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {activeTab === "response" && (
                    <div className="font-mono text-[10px] space-y-3">
                      <div>
                        <span className="text-sky-400 font-bold">HTTP STATUS:</span> <span className={`font-bold ${
                          currentResponse.status === "BLOCKED" ? "text-rose-400" : "text-emerald-400"
                        }`}>{currentResponse.status === "BLOCKED" ? "400 Bad Request" : "200 OK"}</span>
                      </div>
                      <div>
                        <span className="text-sky-400 font-bold">HEADERS:</span>
                        <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 mt-1 text-slate-400 overflow-x-auto">
{`{
  "content-type": "application/json; charset=utf-8",
  "x-hospital-shield-inspected": "true",
  "x-hospital-shield-decision": "${currentResponse.status}"
}`}
                        </pre>
                      </div>
                      <div>
                        <span className="text-sky-400 font-bold">JSON RESPONSE BODY:</span>
                        <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 mt-1 text-emerald-300 overflow-x-auto">
{JSON.stringify(currentResponse, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📊 Summary Cards (Live Stats) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Scans</p>
              <p className="text-xl font-extrabold text-slate-800 mt-1">{recentLogs.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, recentLogs.length)}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Clean Transmissions</p>
              <p className="text-xl font-extrabold text-emerald-600 mt-1">{recentLogs.filter(l => l.decision === 'NORMAL').length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 8" />
              </svg>
            </div>
          </div>
          <div className="mt-3.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(recentLogs.filter(l => l.decision === 'NORMAL').length / (recentLogs.length || 1)) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mitigated Threats</p>
              <p className="text-xl font-extrabold text-rose-500 mt-1">{recentLogs.filter(l => l.decision === 'BLOCKED').length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4" />
              </svg>
            </div>
          </div>
          <div className="mt-3.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(recentLogs.filter(l => l.decision === 'BLOCKED').length / (recentLogs.length || 1)) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Telemetry Anomalies</p>
              <p className="text-xl font-extrabold text-amber-500 mt-1">{recentLogs.filter(l => l.decision === 'FLAGGED').length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(recentLogs.filter(l => l.decision === 'FLAGGED').length / (recentLogs.length || 1)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* 📊 Logs Dashboard Grid (Simulation Feedback) */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Hospital Dashboard Panel */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Hospital Database Stream</h4>
              <p className="text-[10px] text-slate-400">Securely saved patient vitals written via Parameterized Queries.</p>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-left">Timestamp</th>
                  <th className="p-3 text-left">Device ID</th>
                  <th className="p-3 text-left">Heart Rate</th>
                  <th className="p-3 text-left">Database Protection</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.filter(l => l.reachedHospitalServer).slice(0, 10).map((log, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-mono text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3 font-mono text-[10px] text-sky-700 bg-sky-50/50 border border-sky-100/55 rounded max-w-[100px] truncate">{log.deviceId}</td>
                    <td className="p-3 font-bold text-emerald-600">{log.heartRate} BPM</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        {log.dbProtectionType || 'Safe Parameterized'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentLogs.filter(l => l.reachedHospitalServer).length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 text-xs">No active telemetry stored.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Threat Audit Log Table */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-500 border border-rose-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Telemetry Mitigation Audits</h4>
              <p className="text-[10px] text-slate-400">Blocked and isolated out-of-bound or injection threat vectors.</p>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-left">Verdict</th>
                  <th className="p-3 text-left">Heart Rate</th>
                  <th className="p-3 text-left">Diagnostics Block</th>
                  <th className="p-3 text-left">Database Isolation</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.filter(l => l.decision === 'BLOCKED' || l.decision === 'FLAGGED').slice(0, 10).map((log, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        log.decision === 'BLOCKED' 
                          ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {log.decision}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-600">{log.heartRate} BPM</td>
                    <td className="p-3 text-slate-500 font-semibold">{log.stage}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        log.dbProtectionType?.includes('SQLi') 
                          ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' 
                          : 'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>
                        {log.dbProtectionType || 'Isolated (No Write)'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentLogs.filter(l => l.decision === 'BLOCKED' || l.decision === 'FLAGGED').length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 text-xs">No mitigated events recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}