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
      <div className="rounded-2xl glass-card p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-start gap-5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10">
            <svg className="w-6 h-6" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">IoMT Security Shield</h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Experience real-time API attack detection in action. Each request travels through our multi-layer security pipeline where 
              <span className="text-cyan-400 font-medium"> Rate Limiting, Range Validation, and Anomaly Detection </span> 
              work together to block malicious traffic before it reaches the hospital dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* High-Impact Node Chain Architecture visual tracking panel */}
      <div className="rounded-2xl glass-card p-6 relative overflow-hidden">
        {/* Background Grid Accent for Matrix Look */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <h3 className="text-sm font-semibold text-cyan-400 mb-8 uppercase tracking-wider text-center flex items-center justify-center gap-2">
          <span className="w-8 h-px bg-gradient-to-r from-transparent to-cyan-500"></span>
          Data Pipeline Security Flow
          <span className="w-8 h-px bg-gradient-to-l from-transparent to-cyan-500"></span>
        </h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-2 relative">
          
          {/* Node 1: Wearable */}
          <div className="flex flex-col items-center z-10 text-center min-w-[120px] relative group">
            {activeStep === 'wearable_wait' && <div className="node-glow bg-cyan-500/30"></div>}
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-500 transform group-hover:scale-105 ${
              isWearableStep 
                ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 shadow-cyan-500/30 scale-110' 
                : 'border-slate-700 bg-slate-50 text-slate-500'
            }`}>
              <svg className="w-8 h-8" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className={`text-xs font-bold mt-3 transition-colors duration-300 ${isWearableStep ? 'text-cyan-400' : 'text-slate-400'}`}>Wearable Device</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Patient Vitals</p>
            {activeStep === 'wearable_wait' && <div className="absolute -bottom-6 text-[10px] text-cyan-400 font-mono animate-pulse">Transmitting...</div>}
          </div>

          {/* Wire 1 */}
          <div className="h-10 w-px md:h-auto md:flex-1 md:w-24 relative flex items-center justify-center min-h-[40px] md:min-h-[auto] md:min-w-[60px]">
            <svg className="absolute w-full h-full overflow-visible">
              {/* Desktop horizontal line */}
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke={activeStep === 'wearable_travel' ? '#22D3EE' : '#334155'} strokeWidth="2" className={`hidden md:block ${activeStep === 'wearable_travel' ? 'alive-link' : ''}`} />
              {/* Mobile vertical line */}
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke={activeStep === 'wearable_travel' ? '#22D3EE' : '#334155'} strokeWidth="2" className={`md:hidden ${activeStep === 'wearable_travel' ? 'alive-link' : ''}`} />
            </svg>
            {activeStep === 'wearable_travel' && (
              <div className="packet-pulse w-6 h-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400 animate-[spin_1.5s_linear_infinite]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
              </div>
            )}
          </div>

          {/* Node 2: Edge Gateway */}
          <div className="flex flex-col items-center z-10 text-center min-w-[120px] relative group">
            {activeStep === 'edge_wait' && <div className="node-glow bg-cyan-500/30"></div>}
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-500 transform group-hover:scale-105 ${
              isEdgeStep 
                ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 shadow-cyan-500/30 scale-110' 
                : 'border-slate-700 bg-slate-50 text-slate-500'
            }`}>
              <svg className="w-8 h-8" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <p className={`text-xs font-bold mt-3 transition-colors duration-300 ${isEdgeStep ? 'text-cyan-400' : 'text-slate-400'}`}>Edge Gateway</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Local Aggregator</p>
          </div>

          {/* Wire 2 */}
          <div className="h-10 w-px md:h-auto md:flex-1 md:w-24 relative flex items-center justify-center min-h-[40px] md:min-h-[auto] md:min-w-[60px]">
            <svg className="absolute w-full h-full overflow-visible">
              {/* Desktop horizontal line */}
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke={activeStep === 'edge_travel' ? '#22D3EE' : '#334155'} strokeWidth="2" className={`hidden md:block ${activeStep === 'edge_travel' ? 'alive-link' : ''}`} />
              {/* Mobile vertical line */}
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke={activeStep === 'edge_travel' ? '#22D3EE' : '#334155'} strokeWidth="2" className={`md:hidden ${activeStep === 'edge_travel' ? 'alive-link' : ''}`} />
            </svg>
            {activeStep === 'edge_travel' && (
              <div className="packet-pulse w-6 h-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400 animate-[spin_1.5s_linear_infinite]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
              </div>
            )}
          </div>

          {/* Node 3: API Gateway Shield */}
          <div className="flex flex-col items-center z-10 text-center min-w-[140px] relative group">
            {activeStep === 'gateway_wait' && <div className="node-glow bg-amber-500/30"></div>}
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-500 transform group-hover:scale-105 ${
              isGatewayStep 
                ? activeStep === 'gateway_blocked' 
                  ? 'border-red-500 bg-gradient-to-br from-red-500/20 to-red-600/10 shadow-red-500/30 scale-110' 
                  : 'border-amber-500 bg-gradient-to-br from-amber-500/20 to-amber-600/10 shadow-amber-500/30 scale-110'
                : 'border-slate-700 bg-slate-50 text-slate-500'
            }`}>
              {activeStep === 'gateway_blocked' ? (
                <svg className="w-8 h-8 text-red-500 animate-pulse" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
            </div>
            <p className={`text-xs font-bold mt-3 transition-colors duration-300 ${
              isGatewayStep 
                ? activeStep === 'gateway_blocked' 
                  ? 'text-red-500' 
                  : 'text-amber-500'
                : 'text-amber-400/70'
            }`}>API Shield</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Security Layer</p>
          </div>

          {/* Wire 3 */}
          <div className="h-10 w-px md:h-auto md:flex-1 md:w-24 relative flex items-center justify-center min-h-[40px] md:min-h-[auto] md:min-w-[60px]">
            <svg className="absolute w-full h-full overflow-visible">
              {/* Desktop horizontal line */}
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke={activeStep === 'gateway_travel' ? '#F59E0B' : '#334155'} strokeWidth="2" className={`hidden md:block ${activeStep === 'gateway_travel' ? 'alive-link' : ''}`} />
              {/* Mobile vertical line */}
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke={activeStep === 'gateway_travel' ? '#F59E0B' : '#334155'} strokeWidth="2" className={`md:hidden ${activeStep === 'gateway_travel' ? 'alive-link' : ''}`} />
            </svg>
            {activeStep === 'gateway_travel' && (
              <div className="packet-pulse w-6 h-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500 animate-[spin_1.5s_linear_infinite]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
              </div>
            )}
          </div>

          {/* Node 4: Hospital Server */}
          <div className="flex flex-col items-center z-10 text-center min-w-[120px] relative group">
            {activeStep === 'hospital' && <div className="node-glow bg-emerald-500/30"></div>}
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-500 transform group-hover:scale-105 ${
              activeStep === 'hospital' 
                ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-emerald-500/30 scale-110' 
                : 'border-slate-700 bg-slate-50 text-slate-500'
            }`}>
              <svg className="w-8 h-8" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className={`text-xs font-bold mt-3 transition-colors duration-300 ${activeStep === 'hospital' ? 'text-emerald-400' : 'text-slate-400'}`}>Hospital Core</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Secure Storage</p>
          </div>
        </div>
      </div>

      {/* 📊 Summary Cards (Live Stats) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 shadow-smrounded-2xl p-5 glass-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Total Events</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{recentLogs.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
              <svg className="w-5 h-5" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, recentLogs.length)}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-smrounded-2xl p-5 glass-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Clean Records</p>
              <p className="text-2xl font-bold text-emerald-400 mt-2">{recentLogs.filter(l => l.decision === 'NORMAL').length}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 8" />
              </svg>
            </div>
          </div>
          <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(recentLogs.filter(l => l.decision === 'NORMAL').length / (recentLogs.length || 1)) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-smrounded-2xl p-5 glass-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Threats Blocked</p>
              <p className="text-2xl font-bold text-red-400 mt-2">{recentLogs.filter(l => l.decision === 'BLOCKED').length}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4" />
              </svg>
            </div>
          </div>
          <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${(recentLogs.filter(l => l.decision === 'BLOCKED').length / (recentLogs.length || 1)) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-smrounded-2xl p-5 glass-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Suspicious</p>
              <p className="text-2xl font-bold text-amber-400 mt-2">{recentLogs.filter(l => l.decision === 'FLAGGED').length}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(recentLogs.filter(l => l.decision === 'FLAGGED').length / (recentLogs.length || 1)) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Simulation Controller Panel */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 shadow-smrounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Attack Simulator</h3>
            <p className="text-xs text-slate-400 mb-6">Choose an attack vector to test the security pipeline</p>
            
            <div className="space-y-5 mb-6">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Device Configuration</label>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    value={deviceId} 
                    onChange={e => setDeviceId(e.target.value)} 
                    className="rounded-xl bg-slate-50 border border-slate-700 p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none" 
                    placeholder="Device ID"
                  />
                  <input 
                    type="text" 
                    value={gatewayId} 
                    onChange={e => setGatewayId(e.target.value)} 
                    className="rounded-xl bg-slate-50 border border-slate-700 p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none" 
                    placeholder="Gateway ID"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-slate-400">Heart Rate Simulation</label>
                  <span className="text-sm font-mono font-bold text-cyan-400">{heartRate} BPM</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="230" 
                  value={heartRate} 
                  onChange={e => setHeartRate(e.target.value)} 
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-cyan-500" 
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Critical Low</span>
                  <span>Normal Range</span>
                  <span>Critical High</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={handleSendNormal} 
                disabled={loading} 
                className="group relative p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/5 group-hover:translate-x-full transition-transform duration-500" />
                <div className="relative flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-emerald-400">Normal Traffic</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Legitimate patient data</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={handleSendSpoofing} 
                disabled={loading} 
                className="group relative p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/30 hover:border-red-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/5 group-hover:translate-x-full transition-transform duration-500" />
                <div className="relative flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-red-400">Spoofing Attack</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Falsified medical values</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={handleAttackDoS} 
                disabled={loading} 
                className="group relative p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 hover:border-amber-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 to-amber-500/5 group-hover:translate-x-full transition-transform duration-500" />
                <div className="relative flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-amber-400">DoS Flood</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Rate limit testing</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={handleSendAnomaly} 
                disabled={loading} 
                className="group relative p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/5 group-hover:translate-x-full transition-transform duration-500" />
                <div className="relative flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-blue-400">Subtle Anomaly</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Pattern deviation</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Inspection Control */}
        <div className="lg:col-span-12 xl:col-span-7">
          <div className="bg-white border border-slate-200 shadow-smrounded-2xl p-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Security Inspection Pipeline</h3>
              {currentResponse && <StatusBadge status={currentResponse.status} />}
            </div>
            <p className="text-xs text-slate-400 mb-6">Real-time security checks performed on each request</p>
            
            <div className="space-y-3">
              {Object.entries(securityInspection).map(([key, config], idx) => {
                let border = "border-slate-700/50 bg-white/30";
                let icon = (<div className="w-5 h-5 rounded-full border-2 border-slate-600"></div>);
                let labelColor = "text-slate-400";

                if (config.status === "pass") {
                   border = "border-emerald-500/30 bg-emerald-500/5";
                   labelColor = "text-emerald-400 font-medium";
                   icon = (<svg className="w-5 h-5 text-emerald-400" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 8" />
                   </svg>);
                   
                } else if (config.status === "fail") {
                   border = "border-red-500/30 bg-red-500/5";
                   labelColor = "text-red-500 font-medium";
                   icon = (<svg className="w-5 h-5 text-red-500" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                   </svg>);
                   
                } else if (config.status === "warn") {
                   border = "border-amber-500/30 bg-amber-500/5";
                   labelColor = "text-amber-500 font-medium";
                   icon = (<svg className="w-5 h-5 text-amber-500" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4" />
                   </svg>);
                   
                } else if (config.status === "skipped") {
                   border = "border-slate-700/20 bg-white/20 opacity-50";
                   labelColor = "text-slate-500";
                   icon = (<svg className="w-5 h-5 text-slate-500" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                   </svg>);
                   
                } else {
                   icon = (<div className="w-5 h-5 rounded-full border-2 border-cyan-500/50 animate-pulse"></div>);
                }

                return (
                  <div key={key} className={`flex items-center justify-between p-4 rounded-xl border ${border} transition-all duration-300 hover:scale-[1.02]`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="shrink-0">{icon}</div>
                      <div className="flex-1">
                        <span className={`text-sm ${labelColor}`}>{config.label}</span>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {idx === 0 && "Prevents request flooding beyond threshold limits"}
                          {idx === 1 && "Validates medical data within safe parameters (30-220 BPM)"}
                          {idx === 2 && "Detects unusual patterns using ML algorithms"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded">0{idx + 1}</span>
                  </div>
                );
              })}
            </div>

            {currentResponse && currentResponse.status !== 'ATTACK_COMPLETE' && (
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <svg className="w-4 h-4" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-mono text-slate-600">{currentResponse.reason}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400">Hospital Status:</span>
                      {currentResponse.reachedHospitalServer ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                          Data Saved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                          Blocked at Gateway
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📊 Logs Dashboard Grid (Simulation Feedback) */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Hospital Dashboard Panel */}
        <div className="bg-white border border-slate-200 shadow-smrounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">Clean Data Stream</h4>
              <p className="text-[11px] text-slate-400">Approved medical records in hospital database</p>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-700/50">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold sticky top-0">
                <tr className="border-b border-slate-700">
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Device ID</th>
                  <th className="p-3 text-left">Heart Rate</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.filter(l => l.reachedHospitalServer).slice(0, 10).map((log, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-white/30 transition-colors">
                    <td className="p-3 font-mono text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3 text-xs text-slate-600">{log.deviceId}</td>
                    <td className="p-3 font-semibold text-emerald-400">{log.heartRate} BPM</td>
                  </tr>
                ))}
                {recentLogs.filter(l => l.reachedHospitalServer).length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-slate-500 text-sm">No clean records yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Threat log Table */}
        <div className="bg-white border border-slate-200 shadow-smrounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">Threat Intelligence</h4>
              <p className="text-[11px] text-slate-400">Blocked and flagged malicious requests</p>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-700/50">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold sticky top-0">
                <tr className="border-b border-slate-700">
                  <th className="p-3 text-left">Verdict</th>
                  <th className="p-3 text-left">Heart Rate</th>
                  <th className="p-3 text-left">Block Stage</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.filter(l => l.decision === 'BLOCKED' || l.decision === 'FLAGGED').slice(0, 10).map((log, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-white/30 transition-colors">
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-medium ${
                        log.decision === 'BLOCKED' 
                          ? 'bg-red-500/10 text-red-400' 
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {log.decision}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-600">{log.heartRate} BPM</td>
                    <td className="p-3 text-xs text-slate-400">{log.stage}</td>
                  </tr>
                ))}
                {recentLogs.filter(l => l.decision === 'BLOCKED' || l.decision === 'FLAGGED').length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-slate-500 text-sm">No threats detected yet</td>
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