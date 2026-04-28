import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    // Fetch the 50 most recent logs from Supabase
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API /logs Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
