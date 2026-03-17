// Use a relative path so it hits our Next.js API routes by default
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Sends a single device reading to the backend API.
 * The backend expects deviceId (string), heartRate (number), and a timestamp (string).
 */
export async function sendDeviceData(deviceId, heartRate, gatewayId = 'GW-EDGE-01') {
  const res = await fetch(`${API_BASE}/api/vitals`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer iomt_secure_device_secret_token_1" 
    },
    body: JSON.stringify({ 
      deviceId: deviceId, 
      heartRate: Number(heartRate),
      gatewayId: gatewayId,
      timestamp: new Date().toISOString()
    }),
  });
  return res.json();
}

/**
 * Fetches the logs of processed requests from the backend API.
 */
export async function fetchLogs() {
  const res = await fetch(`${API_BASE}/api/logs`);
  return res.json();
}

/**
 * Endpoint for stats.
 * Note: We haven't built an /api/stats route yet, so this will 404
 * unless added later or mock data is returned by the frontend.
 */
export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  return res.json();
}

/**
 * Simulates an attack by sending a burst of requests rapidly.
 * This should trigger the rate limiter for the specified deviceId.
 */
export async function simulateAttack(deviceId, totalRequests = 50) {
  const results = [];
  const promises = [];

  for (let i = 0; i < totalRequests; i++) {
    // Generates a random heart rate between -50 and 449 to trigger the value range check too.
    const randomHR = Math.floor(Math.random() * 500) - 50; 
    
    // We intentionally ignore awaiting each one to fire them off in parallel (triggers Rate Limiter)
    promises.push(
      sendDeviceData(deviceId, randomHR)
        .then((data) => results.push({ index: i, ...data }))
        .catch((err) => results.push({ index: i, error: err.message }))
    );
  }

  await Promise.allSettled(promises);
  return results;
}
