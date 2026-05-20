import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import store from '@/lib/store';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
    // Attempt to fetch the 50 most recent logs from Supabase
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Supabase fetch error, falling back to in-memory store:', error);
      return NextResponse.json(store.logs.slice(0, 50));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.warn('API /logs Error, falling back to in-memory store:', error);
    return NextResponse.json(store.logs.slice(0, 50));
  }
}
