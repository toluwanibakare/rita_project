import { NextResponse } from 'next/server';
import store from '@/lib/store';

/**
 * GET /api/logs
 * 
 * This endpoint is used by the frontend dashboard to retrieve the history 
 * of processed IoMT requests and their security classification.
 * 
 * Returns an array of log objects. Each log contains:
 * - deviceId: (string) The ID of the device that sent the request
 * - heartRate: (number) The simulated heart rate reading sent by the device
 * - decision: (string) The security classification ("NORMAL", "BLOCKED", "FLAGGED")
 * - reason: (string) A textual explanation of why the decision was made
 * - timestamp: (string) The server-side timestamp of when the request was processed
 */
export async function GET() {
  try {
    // Return all logged events from our in-memory store
    // The vitals API uses "unshift()" to add new logs, so this array 
    // is already sorted from most recent to oldest.
    return NextResponse.json(store.logs);
  } catch (error) {
    console.error('API /logs Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
