"use client";

import { useState, useEffect } from "react";
import { sendDeviceData, simulateAttack, fetchLogs } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default function SimulatorPage() {
  const [deviceId, setDeviceId] = useState("DEV-IOT-102");
  const [heartRate, setHeartRate] = useState(72);
  const [gatewayId, setGatewayId] = useState("GW-EDGE-01");
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  // Animation & Flow state
  const [activeStep, setActiveStep] = useState(null); // 'wearable' | 'edge' | 'gateway' | 'hospital'
  const [flowStatus, setFlowStatus] = useState({
    wearable: "idle", // 'idle' | 'sending' | 'success' | 'error'
    edge: "idle",
    gateway: "idle",
    hospital: "idle",
  });

  const [securityInspection, setSecurityInspection] = useState({
    rateLimit: { status: "pending", label: "Rate Limiting Check" },
    rangeCheck: { status: "pending", label: "Medical Range Validation" },
    anomalyCheck: { status: "pending", label: "Lightweight Anomaly Detection" }
  });

  // Load logs on mount for lists
  async function loadLogs() {
    try {
      const data = await fetchLogs();
      setRecentLogs(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  // Helper inside sending flow to animate steps
  const animateFlow = async (sendFn) => {
    setLoading(true);
    setCurrentResponse(null);
    setSecurityInspection({
      authCheck: { status: "pending", label: "Identity Authorization Check" },
      timeVerify: { status: "pending", label: "Replay Attack Prevention" },
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
        if (result.stage === "Authentication") {
          setSecurityInspection({
            authCheck: { status: "fail", label: "Unauthorized Access" },
            timeVerify: { status: "skipped", label: "Not Evaluated" },
            rateLimit: { status: "skipped", label: "Not Evaluated" },
            rangeCheck: { status: "skipped", label: "Not Evaluated" },
            anomalyCheck: { status: "skipped", label: "Not Evaluated" }
          });
        } else if (result.stage === "Timestamp Validation") {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "fail", label: "Invalid Timestamp Drift" },
            rateLimit: { status: "skipped", label: "Not Evaluated" },
            rangeCheck: { status: "skipped", label: "Not Evaluated" },
            anomalyCheck: { status: "skipped", label: "Not Evaluated" }
          });
        } else if (result.stage === "Rate Limiting") {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "pass", label: "Timestamp Verified" },
            rateLimit: { status: "fail", label: "Rate Limit Exceeded" },
            rangeCheck: { status: "skipped", label: "Not Evaluated" },
            anomalyCheck: { status: "skipped", label: "Not Evaluated" }
          });
        } else if (result.stage === "Medical Range Validation") {
          setSecurityInspection({
            authCheck: { status: "pass", label: "Identity Verified" },
            timeVerify: { status: "pass", label: "Timestamp Verified" },
            rateLimit: { status: "pass", label: "Timing Approved" },
            rangeCheck: { status: "fail", label: "Impossible Health Value" },
            anomalyCheck: { status: "skipped", label: "Not Evaluated" }
          });
        }
        setFlowStatus(p => ({ ...p, gateway: "error" }));
      } else if (result.status === "FLAGGED") {
        setSecurityInspection({
          authCheck: { status: "pass", label: "Identity Verified" },
          timeVerify: { status: "pass", label: "Timestamp Verified" },
          rateLimit: { status: "pass", label: "Timing Approved" },
          rangeCheck: { status: "pass", label: "Normal Range Approved" },
          anomalyCheck: { status: "warn", label: "Suspicious pattern flagged" }
        });
        setFlowStatus(p => ({ ...p, gateway: "success" }));
        setActiveStep("gateway_travel");
        await new Promise(r => setTimeout(r, 1000));
        setActiveStep("hospital");
      } else {
        setSecurityInspection({
          authCheck: { status: "pass", label: "Identity Verified" },
          timeVerify: { status: "pass", label: "Timestamp Verified" },
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

  // 1. Normal Traffic Simulator
  const handleSendNormal = () => {
    animateFlow(async () => {
      const variance = Math.floor(Math.random() * 5) - 2;
      return sendDeviceData(deviceId, Number(heartRate) + variance, gatewayId);
    });
  };

  // 2. Spoofing Attack Simulator (impossible values)
  const handleSendSpoofing = () => {
    animateFlow(async () => {
      const badValues = [-5, 12, 299, 500, 999];
      const randomBad = badValues[Math.floor(Math.random() * badValues.length)];
      return sendDeviceData(deviceId, randomBad, gatewayId);
    });
  };

  // 3. DoS Attack Burst Accelerator
  const handleAttackDoS = async () => {
    setLoading(true);
    setFlowStatus(p => ({ ...p, wearable: "sending", edge: "sending", gateway: "sending" }));
    try {
      await simulateAttack(deviceId, 30);
      loadLogs();
      setCurrentResponse({ status: "ATTACK_COMPLETE", message: "Simulated 30 parallel requests to test Rate Limiting boundaries." });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // 4. Subtle Anomaly Trigger
  const handleSendAnomaly = () => {
    animateFlow(async () => {
      // Sends a sudden spike to trigger moving window check
      return sendDeviceData(deviceId, Number(heartRate) + 55, gatewayId);
    });
  };

  const isWearableStep = activeStep?.startsWith("wearable");
  const isEdgeStep = activeStep?.startsWith("edge");
  const isGatewayStep = activeStep?.startsWith("gateway");

  return (
    <div className="space-y-6">
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
        .alive-link {
          stroke-dasharray: 6 6;
          animation: marquee 1s linear infinite;
        }
        .packet-pulse {
          position: absolute;
          top: 50%;
          border-radius: 9999px;
          animation: packetFlow 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          z-index: 30;
        }
        .node-glow {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          animation: ripple 2s infinite;
          z-index: 0;
        }
      `}</style>

      {/* System Explanation Card on Top */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h2 className="font-semibold text-white leading-tight">Project Goal: API Attack Detection Visualizer</h2>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Use the controls below to generate data flow. Observe how requests pass through the Edge Gateway to the Service Provider API. 
              The <strong>API Gateway Shield</strong> inspects the data checking Rate, Range, and Pattern consistency to block attacks <strong>before</strong> they pollute the Hospital dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* High-Impact Node Chain Architecture visual tracking panel */}
      <div className="rounded-xl border border-gray-800/60 bg-gray-950/40 p-8 backdrop-blur-sm relative overflow-hidden">
        {/* Background Grid Accent for Matrix Look */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />
        
        <h3 className="text-sm font-semibold text-white mb-8 uppercase tracking-wider text-center">Simulated Internet of Medical Things (IoMT) Data Pipeline</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 relative">
          
          {/* Node 1: Wearable */}
          <div className="flex flex-col items-center z-10 text-center max-w-[120px] relative">
            {activeStep === 'wearable_wait' && <div className="node-glow bg-cyan-500/20"></div>}
            }
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-300 ${isWearableStep ? 'border-cyan-400 bg-cyan-950/40 shadow-cyan-500/20' : 'border-gray-700 bg-gray-900 text-gray-500'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <p className={`text-[11px] font-bold mt-2 ${isWearableStep ? 'text-cyan-400' : 'text-white/80'}`}>Wearable Device</p>
            <p className="text-[9px] text-gray-500 mt-0.5">Generates Vitals</p>
          </div>

          {/* Wire 1 */}
          <div className="h-8 w-0.5 md:h-2 md:w-full relative flex items-center justify-center">
            <svg className="absolute w-full h-full overflow-visible">
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke={activeStep === 'wearable_travel' ? '#22D3EE' : '#374151'} strokeWidth="2" className={activeStep === 'wearable_travel' ? 'alive-link' : ''} />
            </svg>
            {activeStep === 'wearable_travel' && (
              <div className="packet-pulse w-4 h-4 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4v4.5a.75.75 0 01-1.5 0V6a.75.75 0 011.5 0zm0 6h-1.5v-1.5h1.5V12z"/></svg>
              </div>
            )}
          </div>

          {/* Node 2: Edge Gateway */}
          <div className="flex flex-col items-center z-10 text-center max-w-[120px] relative">
            {activeStep === 'edge_wait' && <div className="node-glow bg-cyan-500/20"></div>}
            }
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-300 ${isEdgeStep ? 'border-cyan-400 bg-cyan-950/40 shadow-cyan-500/20' : 'border-gray-700 bg-gray-900 text-gray-500'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2-2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
            </div>
            <p className={`text-[11px] font-bold mt-2 ${isEdgeStep ? 'text-cyan-400' : 'text-white/80'}`}>Edge Gateway</p>
            <p className="text-[9px] text-gray-500 mt-0.5">Forwards To Cloud</p>
          </div>

          {/* Wire 2 */}
          <div className="h-8 w-0.5 md:h-2 md:w-full relative flex items-center justify-center">
            <svg className="absolute w-full h-full overflow-visible">
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke={activeStep === 'edge_travel' ? '#22D3EE' : '#374151'} strokeWidth="2" className={activeStep === 'edge_travel' ? 'alive-link' : ''} />
            </svg>
            {activeStep === 'edge_travel' && (
              <div className="packet-pulse w-4 h-4 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4v4.5a.75.75 0 01-1.5 0V6a.75.75 0 011.5 0zm0 6h-1.5v-1.5h1.5V12z"/></svg>
              </div>
            )}
          </div>

          {/* Node 3: API Gateway Shield */}
          <div className="flex flex-col items-center z-10 text-center max-w-[140px] relative">
            {activeStep === 'gateway_wait' && <div className="node-glow bg-amber-500/20"></div>}
            }
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-300 ${isGatewayStep ? activeStep === 'gateway_blocked' ? 'border-red-500 bg-red-950/20 shadow-red-500/40 scale-105' : 'border-amber-500 bg-amber-950/20 shadow-amber-500/30 scale-105' : 'border-gray-700 bg-gray-900 text-gray-500'}`}>
              {activeStep === 'gateway_blocked' ? (
                <svg className="w-7 h-7 text-red-500 animate-[bounce_0.5s_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              )}
            </div>
            <p className={`text-[12px] font-black mt-2 uppercase tracking-wide ${isGatewayStep ? activeStep === 'gateway_blocked' ? 'text-red-500' : 'text-amber-500' : 'text-amber-400/80'}`}>API Shield</p>
            <p className="text-[9px] text-amber-500/60 font-medium">Defects Inspector</p>
          </div>

          {/* Wire 3 */}
          <div className="h-8 w-0.5 md:h-2 md:w-full relative flex items-center justify-center">
            <svg className="absolute w-full h-full overflow-visible">
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke={activeStep === 'gateway_travel' ? '#F59E0B' : '#374151'} strokeWidth="2" className={activeStep === 'gateway_travel' ? 'alive-link' : ''} />
            </svg>
            {activeStep === 'gateway_travel' && (
              <div className="packet-pulse w-4 h-4 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4v4.5a.75.75 0 01-1.5 0V6a.75.75 0 011.5 0zm0 6h-1.5v-1.5h1.5V12z"/></svg>
              </div>
            )}
          </div>

          {/* Node 4: Hospital Server */}
          <div className="flex flex-col items-center z-10 text-center max-w-[120px] relative">
            {activeStep === 'hospital' && <div className="node-glow bg-emerald-500/20"></div>}
            }
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-300 ${activeStep === 'hospital' ? 'border-emerald-400 bg-emerald-950/40 shadow-emerald-500/20' : 'border-gray-700 bg-gray-900 text-gray-500'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <p className={`text-[11px] font-bold mt-2 ${activeStep === 'hospital' ? 'text-emerald-400' : 'text-white/80'}`}>Hospital Server</p>
            <p className="text-[9px] text-gray-500 mt-0.5">Saves Clean Records</p>
          </div>
        </div>
      </div>

      {/* 📊 Summary Cards (Live Stats) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Requests</p>
            <p className="text-xl font-bold text-white mt-1">{recentLogs.length}</p>
          </div>
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Approved (Safe Docs)</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{recentLogs.filter(l => l.decision === 'NORMAL').length}</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 8" /></svg>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Blocked Attacks</p>
            <p className="text-xl font-bold text-red-500 mt-1">{recentLogs.filter(l => l.decision === 'BLOCKED').length}</p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4" /></svg>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Flagged (Suspicious)</p>
            <p className="text-xl font-bold text-amber-500 mt-1">{recentLogs.filter(l => l.decision === 'FLAGGED').length}</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Simulation Controller Panel */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Testing Simulator Controller</h3>
            <p className="text-[11px] text-gray-500 mb-4">Select an experiment to trigger data movement and stimulate the API Defender</p>
            
            <div className="space-y-4 mb-5">
              <div>
                <label className="text-[11px] font-medium text-gray-400">Mock Settings</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input type="text" value={deviceId} onChange={e => setDeviceId(e.target.value)} className="rounded-lg bg-gray-950 border border-gray-800 p-2 text-xs text-gray-300" placeholder="Device Registration ID" />
                  <input type="text" value={gatewayId} onChange={e => setGatewayId(e.target.value)} className="rounded-lg bg-gray-950 border border-gray-800 p-2 text-xs text-gray-300" placeholder="Edge Node Reference" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400">Wearable Setup: Heart Rate Context ({heartRate} bpm)</label>
                <input type="range" min="10" max="230" value={heartRate} onChange={e => setHeartRate(e.target.value)} className="w-full h-1 mt-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={handleSendNormal} disabled={loading} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/15 disabled:opacity-40 flex flex-col items-start gap-1">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Normal Traffic</span>
                <span className="text-[9px] font-normal text-gray-400">Simulates healthy client request</span>
              </button>
              
              <button onClick={handleSendSpoofing} disabled={loading} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold hover:bg-red-500/15 disabled:opacity-40 flex flex-col items-start gap-1">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Spoofing Attack</span>
                <span className="text-[9px] font-normal text-gray-400">Falsified rates (e.g., -5, 500 bpm)</span>
              </button>
              
              <button onClick={handleAttackDoS} disabled={loading} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold hover:bg-amber-500/15 disabled:opacity-40 flex flex-col items-start gap-1">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> DoS Flooding</span>
                <span className="text-[9px] font-normal text-gray-400">Rapid batch to crash node servers</span>
              </button>
              
              <button onClick={handleSendAnomaly} disabled={loading} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-semibold hover:bg-blue-500/15 disabled:opacity-40 flex flex-col items-start gap-1">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Subtle Anomaly</span>
                <span className="text-[9px] font-normal text-gray-400">Trigger continuous pattern spikes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inspection Control */}
        <div className="lg:col-span-12 xl:col-span-7">
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5 h-full">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-semibold text-white">API Gateway Shield Pipeline Verification</h3>
              {currentResponse && <StatusBadge status={currentResponse.status} />}
            </div>
            <p className="text-[11px] text-gray-500 mb-4">Observe step-by-step inspections executing on standard payloads</p>
            
            <div className="space-y-3">
              {Object.entries(securityInspection).map(([key, config], idx) => {
                let border = "border-gray-800/50 bg-gray-900/30";
                let icon = (<div className="w-4 h-4 rounded-full border border-gray-600"></div>);
                )
                let labelColor = "text-gray-400";

                if (config.status === "pass") {
                   border = "border-emerald-500/30 bg-emerald-500/5";
                   labelColor = "text-emerald-400 font-medium";
                   icon = (<svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 8" /></svg>);
                   )
                } else if (config.status === "fail") {
                   border = "border-red-500/30 bg-red-500/5";
                   labelColor = "text-red-500 font-medium";
                   icon = (<svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>);
                   )
                } else if (config.status === "warn") {
                   border = "border-amber-500/30 bg-amber-500/5";
                   labelColor = "text-amber-500 font-medium";
                   icon = (<svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4" /></svg>);
                   )
                } else if (config.status === "skipped") {
                   border = "border-gray-800/30 bg-gray-950/20 opacity-40";
                   labelColor = "text-gray-600";
                   icon = (<svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>);
                   )
                }

                return (
                  <div key={key} className={`flex items-center justify-between p-3 rounded-lg border ${border} transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">{icon}</div>
                      <div>
                        <span className={`text-xs ${labelColor}`}>{config.label}</span>
                        <p className="text-[9px] text-gray-500 mt-0.5">
                          {idx === 0 && "Blocks floods exceeding 800ms intervals"}
                          {idx === 1 && "Verifies if heart beats sit between 30-220 bpm"}
                          {idx === 2 && "Compares deviation averages with dynamic rolling index"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">Stage {idx + 1}</span>
                  </div>
                );
              })}
            </div>

            {currentResponse && currentResponse.status !== 'ATTACK_COMPLETE' && (
              <div className="mt-4 p-3 rounded-lg bg-gray-950 border border-gray-800/80 text-[11px] font-mono text-gray-400 space-y-1">
                <p><span className="text-cyan-400">Response Verification:</span> {currentResponse.reason}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-cyan-400">Reached Hospital Server:</span>
                  {currentResponse.reachedHospitalServer ? (
                    <span className="flex items-center gap-1 text-emerald-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> True - Saved</span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> False - Filtered at Gateway</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📊 Logs Dashboard Grid (Simulation Feedback) */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Hospital Dashboard Panel */}
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5">
          <h4 className="text-sm font-semibold text-white mb-1">Approved Healthcare Stream (Hospital Module)</h4>
          <p className="text-[11px] text-gray-500 mb-3">Traffic that bypassed Security checks successfully and was committed to doctor charts</p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-800/40 text-xs">
            <table className="w-full">
              <thead className="bg-gray-900/40 text-gray-500 text-[10px] uppercase font-bold sticky top-0">
                <tr className="border-b border-gray-800/60"><th className="p-2 text-left">Time</th><th className="p-2 text-left">Device</th><th className="p-2 text-left">HR Value</th></tr>
              </thead>
              <tbody>
                {recentLogs.filter(l => l.reachedHospitalServer).slice(0, 10).map((log, i) => (
                  <tr key={i} className="border-b border-gray-800/30 text-gray-400"><td className="p-2 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td><td className="p-2">{log.deviceId}</td><td className="p-2 font-semibold text-emerald-400">{log.heartRate} bpm</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Threat log Table */}
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5">
          <h4 className="text-sm font-semibold text-white mb-1">Threat Mitigation Matrix (Sensor Blockings)</h4>
          <p className="text-[11px] text-gray-500 mb-3">Malicious traffic flagged or dropped locally before polluting doctor data warehouses</p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-800/40 text-xs">
            <table className="w-full">
              <thead className="bg-gray-900/40 text-gray-500 text-[10px] uppercase font-bold sticky top-0">
                <tr className="border-b border-gray-800/60"><th className="p-2 text-left">Result</th><th className="p-2 text-left">HeartRate</th><th className="p-2 text-left">Layer Reference</th></tr>
              </thead>
              <tbody>
                {recentLogs.filter(l => l.decision === 'BLOCKED' || l.decision === 'FLAGGED').slice(0, 10).map((log, i) => (
                  <tr key={i} className="border-b border-gray-800/30 text-gray-400">
                    <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${log.decision === 'BLOCKED' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>{log.decision}</span></td>
                    <td className="p-2 font-mono">{log.heartRate} bpm</td>
                    <td className="p-2 text-[10px] text-gray-500">{log.stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
