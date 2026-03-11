"use client";

export default function DeviceForm({ deviceId, heartRate, onDeviceIdChange, onHeartRateChange }) {
  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-cyan-500/10">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Device Configuration</h3>
          <p className="text-[10px] text-gray-500">Set the simulated device parameters</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Device ID
          </label>
          <input
            type="text"
            value={deviceId}
            onChange={(e) => onDeviceIdChange(e.target.value)}
            className="w-full rounded-lg bg-gray-800/60 border border-gray-700/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
            placeholder="e.g. DEVICE-001"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Heart Rate (BPM)
          </label>
          <input
            type="number"
            value={heartRate}
            onChange={(e) => onHeartRateChange(Number(e.target.value))}
            className="w-full rounded-lg bg-gray-800/60 border border-gray-700/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
            placeholder="e.g. 75"
          />
          <p className="text-[10px] text-gray-600 mt-1">Normal range: 60–100 BPM</p>
        </div>
      </div>
    </div>
  );
}
