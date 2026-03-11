const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function sendDeviceData(deviceId, heartRate) {
  const res = await fetch(`${API_BASE}/api/device-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: deviceId, heart_rate: heartRate }),
  });
  return res.json();
}

export async function fetchLogs() {
  const res = await fetch(`${API_BASE}/api/logs`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  return res.json();
}

export async function simulateAttack(deviceId, totalRequests = 50) {
  const results = [];
  const promises = [];

  for (let i = 0; i < totalRequests; i++) {
    const randomHR = Math.floor(Math.random() * 500) - 50; // -50 to 449
    promises.push(
      sendDeviceData(deviceId, randomHR)
        .then((data) => results.push({ index: i, ...data }))
        .catch((err) => results.push({ index: i, error: err.message }))
    );
  }

  await Promise.allSettled(promises);
  return results;
}
