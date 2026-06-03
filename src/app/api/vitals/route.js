import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import store from '@/lib/store';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * POST /api/vitals
 * 
 * This endpoint simulates an Internet of Medical Things (IoMT) gateway.
 * It receives physiological data (e.g., heart rate) and processes it through 
 * three security layers to detect and mitigate potential API attacks or invalid data.
 * 
 * Expected Request Body:
 * {
 *   "deviceId": "device001", // (string) ID of the sending device
 *   "heartRate": 85,         // (number) Heart rate in beats per minute
 *   "timestamp": "2026-03-11T12:00:00Z" // (string) Time the reading was taken
 * }
 */
export async function POST(request) {
  try {
    // 1. Parse the incoming JSON payload
    const body = await request.json();
    const { deviceId, heartRate, timestamp, gatewayId, bypassSqliShield } = body;

    // Validate that the required fields are present and of the correct type
    if (!deviceId || typeof heartRate !== 'number' || !timestamp) {
      return NextResponse.json(
        { error: 'Invalid request body. Ensure deviceId (string), heartRate (number), and timestamp (string) are provided.' },
        { status: 400 }
      );
    }

    // 2. Setup Device State
    if (!store.deviceStates[deviceId]) {
      store.deviceStates[deviceId] = {
        lastRequestTime: null,
        history: [72, 70, 74, 71, 73] // Pre-populate baseline history so anomaly detection works instantly
      };
    }

    const deviceState = store.deviceStates[deviceId];
    const now = Date.now();
    const timeSinceLast = deviceState.lastRequestTime 
      ? now - deviceState.lastRequestTime 
      : Infinity;

    // Line-by-line inspection checklist tracker
    const checks = {
      auth: { status: "PENDING", detail: "Awaiting inspection." },
      timestamp: { status: "PENDING", detail: "Awaiting inspection." },
      sqli: { status: "PENDING", detail: "Awaiting inspection." },
      rateLimit: { status: "PENDING", detail: "Awaiting inspection." },
      range: { status: "PENDING", detail: "Awaiting inspection." },
      anomaly: { status: "PENDING", detail: "Awaiting inspection." }
    };

    /**
     * Helper Function: resolveRequest
     * Processes the final outcome of the request, updates the device's last request time,
     * logs the event, and returns the strictly formatted JSON response.
     */
    const resolveRequest = async (status, reason, stage, reachedHospital, dbProtection = null) => {
      // Only update lastRequestTime on non-IAM, non-AntiReplay failures to avoid locking rates on malicious spam
      if (stage !== 'Authentication' && stage !== 'Timestamp Validation') {
        deviceState.lastRequestTime = now;
      }

      // Mark all remaining PENDING checks as SKIPPED
      Object.keys(checks).forEach(key => {
        if (checks[key].status === "PENDING") {
          checks[key].status = "SKIPPED";
          checks[key].detail = "Skipped: Preceding check blocked or early-resolved the request.";
        }
      });

      // Determine database safeguard classification
      const defaultDbProtection = reachedHospital 
        ? 'Parameterized Query (Safe)' 
        : 'Isolated (No Write)';
      const dbProtectionStatus = dbProtection || defaultDbProtection;

      const logEntry = {
        deviceId,
        heartRate,
        decision: status, 
        reason,
        timestamp: new Date().toISOString(),
        stage, 
        reachedHospitalServer: reachedHospital,
        gatewayId: gatewayId || 'GW-EDGE-01',
        requestOrigin: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        dbProtectionType: dbProtectionStatus
      };

      store.logs.unshift(logEntry);
      
      // Attempt to save to Supabase, catching any errors to maintain local store availability
      try {
        const { error } = await supabase.from('logs').insert([logEntry]);
        if (error) {
          console.warn('Supabase insert error (saved to in-memory store only):', error);
        }
      } catch (dbError) {
        console.warn('Supabase connection error (saved to in-memory store only):', dbError);
      }

      return NextResponse.json({
        status,
        reason,
        deviceId,
        heartRate,
        timestamp,
        stage,
        reachedHospitalServer: reachedHospital,
        dbProtectionType: dbProtectionStatus,
        checks
      });
    };

    // ==========================================
    // LAYER 0: IDENTITY & ACCESS MANAGEMENT (IAM)
    // ==========================================
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer iomt_secure_')) {
      checks.auth = { 
        status: "FAILED", 
        detail: `Unauthorized: Bearer token is ${!authHeader ? 'missing' : 'invalid'}.` 
      };
      return await resolveRequest('BLOCKED', 'Unauthorized: Invalid or missing device authorization token', 'Authentication', false);
    } else {
      checks.auth = { 
        status: "PASSED", 
        detail: "Bearer token verified successfully." 
      };
    }

    // ==========================================
    // LAYER 0.5: REPLAY ATTACK PREVENTION
    // ==========================================
    const clientTime = new Date(timestamp).getTime();
    const timeDrift = Math.abs(Date.now() - clientTime);
    if (isNaN(clientTime) || timeDrift > 300000) { // 5 minutes window
      checks.timestamp = { 
        status: "FAILED", 
        detail: `Replay Protection Triggered: Clock drift is ${isNaN(clientTime) ? 'invalid' : (timeDrift / 1000).toFixed(1) + 's'} (Max threshold: 300s).`
      };
      return await resolveRequest('BLOCKED', 'Anti-Replay Trigger: Data timestamp is too far in the past/future', 'Timestamp Validation', false);
    } else {
      checks.timestamp = { 
        status: "PASSED", 
        detail: `Drift is ${(timeDrift / 1000).toFixed(1)}s (Within 300s safe window).` 
      };
    }

    // ==========================================
    // LAYER 0.8: INPUT SANITIZATION & SQL INJECTION (SQLi) SHIELD
    // ==========================================
    // Check text inputs (deviceId & gatewayId) for hazardous SQL constructs (', --, ;, UNION, SELECT, etc.)
    const sqlRegex = /[\'\"]|--|;|union|select|insert|update|delete|drop|or\s+1\s*=\s*1/i;
    const hasSqli = sqlRegex.test(deviceId) || (gatewayId && sqlRegex.test(gatewayId));
    let isSqliBypassed = false;

    if (hasSqli) {
      if (bypassSqliShield) {
        isSqliBypassed = true;
        checks.sqli = { 
          status: "BYPASSED", 
          detail: "SQL Injection constructs detected, but skip filter toggled active in Sandbox." 
        };
        console.warn('API SHIELD BYPASSED: SQL Injection pattern allowed through to test parameterized query security.');
      } else {
        const matchingPart = sqlRegex.exec(deviceId || gatewayId)?.[0];
        checks.sqli = { 
          status: "FAILED", 
          detail: `SQL Injection Pattern Detected inside parameters: '${matchingPart}'` 
        };
        return await resolveRequest(
          'BLOCKED', 
          'Database Shield Trigger: SQL Injection patterns intercepted in gateway headers or device identifiers.', 
          'SQLi Sanitization', 
          false, 
          'Blocked: SQLi Prevented'
        );
      }
    } else {
      checks.sqli = { 
        status: "PASSED", 
        detail: "No SQL injection constructs detected." 
      };
    }

    // ==========================================
    // LAYER 1: RATE LIMITING (DoS Mitigation)
    // ==========================================
    if (timeSinceLast < 800) {
      checks.rateLimit = { 
        status: "FAILED", 
        detail: `Rate Limit Exceeded: request arrived after only ${timeSinceLast}ms (Min threshold: 800ms).` 
      };
      return await resolveRequest('BLOCKED', 'Rate limit exceeded: requests arriving too frequently', 'Rate Limiting', false);
    } else {
      checks.rateLimit = { 
        status: "PASSED", 
        detail: `${timeSinceLast === Infinity ? 'First write' : timeSinceLast + 'ms elapsed'} since last request (Min threshold: 800ms).` 
      };
    }

    // ==========================================
    // LAYER 2: MEDICAL RANGE VALIDATION (Spoofing)
    // ==========================================
    if (heartRate < 30 || heartRate > 220) {
      checks.range = { 
        status: "FAILED", 
        detail: `Physiological Bounds Violated: ${heartRate} BPM is outside biological survival limits (30-220 BPM).` 
      };
      return await resolveRequest('BLOCKED', 'Invalid physiological value: outside human survival range (30-220 bpm)', 'Medical Range Validation', false);
    } else {
      checks.range = { 
        status: "PASSED", 
        detail: `${heartRate} BPM is within biological survival limits (30-220 BPM).` 
      };
    }

    // ==========================================
    // LAYER 3: ANOMALY DETECTION (Tampering)
    // ==========================================
    let outcomeStatus = 'NORMAL';
    let outcomeReason = 'Processed successfully';
    let anomalyDiff = 0;
    let average = 72;

    if (deviceState.history.length > 0) {
      const sum = deviceState.history.reduce((a, b) => a + b, 0);
      average = sum / deviceState.history.length;
      anomalyDiff = Math.abs(heartRate - average);
      
      if (anomalyDiff > 40) {
        outcomeStatus = 'FLAGGED';
        outcomeReason = 'Flagged: Telemetry deviation exceeds baseline';
        checks.anomaly = { 
          status: "FAILED", 
          detail: `Telemetry Deviation Flagged: Delta from baseline is ${anomalyDiff.toFixed(1)} BPM (Threshold: 40 BPM).` 
        };
      } else {
        checks.anomaly = { 
          status: "PASSED", 
          detail: `Telemetry Delta is ${anomalyDiff.toFixed(1)} BPM from baseline (Threshold: 40 BPM).` 
        };
      }
    } else {
      checks.anomaly = { 
        status: "PASSED", 
        detail: "No historical baseline loaded yet. Anomaly detection skipped for initial write." 
      };
    }

    deviceState.history.push(heartRate);
    if (deviceState.history.length > 5) {
      deviceState.history.shift();
    }

    const reachedHospital = true;
    const finalStage = outcomeStatus === 'NORMAL' ? 'Hospital Server' : 'Anomaly Detection';

    return await resolveRequest(
      outcomeStatus, 
      isSqliBypassed ? 'Telemetry processed despite SQLi constructs; saved securely by DB parameterization.' : outcomeReason, 
      finalStage, 
      reachedHospital,
      isSqliBypassed ? 'Safe Parameterized (Bypassed API)' : null
    );
    
  } catch (error) {
    // Catch-all for any unexpected errors (e.g., malformed JSON)
    console.error('API /vitals Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
