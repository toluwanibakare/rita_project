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
    const { deviceId, heartRate, timestamp, gatewayId } = body;

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

    /**
     * Helper Function: resolveRequest
     * Processes the final outcome of the request, updates the device's last request time,
     * logs the event, and returns the strictly formatted JSON response.
     */
    const resolveRequest = async (status, reason, stage, reachedHospital, dbProtection = null) => {
      deviceState.lastRequestTime = now;

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
        dbProtectionType: dbProtectionStatus
      });
    };

    // ==========================================
    // LAYER 0: IDENTITY & ACCESS MANAGEMENT (IAM)
    // ==========================================
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer iomt_secure_')) {
      return await resolveRequest('BLOCKED', 'Unauthorized: Invalid or missing device authorization token', 'Authentication', false);
    }

    // ==========================================
    // LAYER 0.5: REPLAY ATTACK PREVENTION
    // ==========================================
    const clientTime = new Date(timestamp).getTime();
    const timeDrift = Math.abs(Date.now() - clientTime);
    if (timeDrift > 300000) { // 5 minutes window
      return await resolveRequest('BLOCKED', 'Anti-Replay Trigger: Data timestamp is too far in the past/future', 'Timestamp Validation', false);
    }

    // ==========================================
    // LAYER 0.8: INPUT SANITIZATION & SQL INJECTION (SQLi) SHIELD
    // ==========================================
    // Check text inputs (deviceId & gatewayId) for hazardous SQL constructs (', --, ;, UNION, SELECT, etc.)
    const sqlRegex = /[\'\"]|--|;|union|select|insert|update|delete|drop|or\s+1\s*=\s*1/i;
    if (sqlRegex.test(deviceId) || (gatewayId && sqlRegex.test(gatewayId))) {
      return await resolveRequest(
        'BLOCKED', 
        'Database Shield Trigger: SQL Injection patterns intercepted in gateway headers or device identifiers.', 
        'SQLi Sanitization', 
        false, 
        'Blocked: SQLi Prevented'
      );
    }

    // ==========================================
    // LAYER 1: RATE LIMITING (DoS Mitigation)
    // ==========================================
    if (timeSinceLast < 800) {
      return await resolveRequest('BLOCKED', 'Rate limit exceeded: requests arriving too frequently', 'Rate Limiting', false);
    }

    // ==========================================
    // LAYER 2: MEDICAL RANGE VALIDATION (Spoofing)
    // ==========================================
    if (heartRate < 30 || heartRate > 220) {
      return await resolveRequest('BLOCKED', 'Invalid physiological value: outside human survival range (30-220 bpm)', 'Medical Range Validation', false);
    }

    // ==========================================
    // LAYER 3: ANOMALY DETECTION (Tampering)
    // ==========================================
    let outcomeStatus = 'NORMAL';
    let outcomeReason = 'Processed successfully';

    if (deviceState.history.length > 0) {
      const sum = deviceState.history.reduce((a, b) => a + b, 0);
      const average = sum / deviceState.history.length;
      
      if (Math.abs(heartRate - average) > 40) {
        outcomeStatus = 'FLAGGED';
        outcomeReason = 'Flagged: Telemetry deviation exceeds baseline';
      }
    }

    deviceState.history.push(heartRate);
    if (deviceState.history.length > 5) {
      deviceState.history.shift();
    }

    const reachedHospital = true;
    const finalStage = outcomeStatus === 'NORMAL' ? 'Hospital Server' : 'Anomaly Detection';

    return await resolveRequest(outcomeStatus, outcomeReason, finalStage, reachedHospital);
    
  } catch (error) {
    // Catch-all for any unexpected errors (e.g., malformed JSON)
    console.error('API /vitals Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
