import { NextResponse } from 'next/server';
import store from '@/lib/store';

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
    const { deviceId, heartRate, timestamp } = body;

    // Validate that the required fields are present and of the correct type
    if (!deviceId || typeof heartRate !== 'number' || !timestamp) {
      return NextResponse.json(
        { error: 'Invalid request body. Ensure deviceId (string), heartRate (number), and timestamp (string) are provided.' },
        { status: 400 }
      );
    }

    // 2. Setup Device State
    // If we haven't seen this device before, initialize its state in our in-memory store.
    if (!store.deviceStates[deviceId]) {
      store.deviceStates[deviceId] = {
        lastRequestTime: null, // Tracks when the last request was made (for rate limiting)
        history: []            // Stores the last 5 valid heart rate readings (for anomaly detection)
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
    const resolveRequest = (status, reason) => {
      // Always update the last request time for this device, even if blocked
      deviceState.lastRequestTime = now;

      // Log the request and decision in our in-memory array for the frontend /api/logs endpoint
      store.logs.unshift({
        deviceId,
        heartRate,
        decision: status, // Example: "NORMAL", "BLOCKED", or "FLAGGED"
        reason,
        timestamp: new Date().toISOString() // Server-side time of processing
      });

      // Send the response back to the client/device
      return NextResponse.json({
        status,       // "NORMAL", "BLOCKED", "FLAGGED"
        reason,       // Explanation of the status
        deviceId,     // Echoed from request
        heartRate,    // Echoed from request
        timestamp     // Echoed from request
      });
    };

    // ==========================================
    // LAYER 1: RATE LIMITING (DoS Mitigation)
    // ==========================================
    // If the device sends another request in less than 800 milliseconds, block it.
    if (timeSinceLast < 800) {
      return resolveRequest('BLOCKED', 'Rate limit exceeded');
    }

    // ==========================================
    // LAYER 2: MEDICAL RANGE VALIDATION (Spoofing)
    // ==========================================
    // Valid human heart rates are generally assumed to be between 30 and 220 bpm.
    if (heartRate < 30 || heartRate > 220) {
      return resolveRequest('BLOCKED', 'Invalid physiological value');
    }

    // ==========================================
    // LAYER 3: ANOMALY DETECTION (Tampering/Data integrity)
    // ==========================================
    let outcomeStatus = 'NORMAL';
    let outcomeReason = 'Processed successfully';

    // If we have enough history to compare against...
    if (deviceState.history.length > 0) {
      // Calculate the moving average of the last few heart rate values
      const sum = deviceState.history.reduce((a, b) => a + b, 0);
      const average = sum / deviceState.history.length;
      
      // If the new heart rate deviates by more than 40 bpm from the device's usual average,
      // it might be a spoofed value or clinical anomaly.
      if (Math.abs(heartRate - average) > 40) {
        outcomeStatus = 'FLAGGED';
        outcomeReason = 'Suspicious pattern detected: excessive deviation from historical average';
      }
    }

    // Only add VALID readings to the history (we do this after checking boundaries)
    deviceState.history.push(heartRate);
    
    // Keep only the last 5 readings to act as a lightweight moving window
    if (deviceState.history.length > 5) {
      deviceState.history.shift(); // Remove the oldest reading
    }

    // If it passed all layers, or just triggered a flag, return the final result
    return resolveRequest(outcomeStatus, outcomeReason);
    
  } catch (error) {
    // Catch-all for any unexpected errors (e.g., malformed JSON)
    console.error('API /vitals Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
