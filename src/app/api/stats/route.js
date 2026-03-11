import { NextResponse } from 'next/server';
import store from '@/lib/store';

/**
 * GET /api/stats
 * 
 * Returns calculated statistics based on the in-memory logs.
 * Used by the frontend Overview dashboard.
 */
export async function GET() {
  try {
    const logs = store.logs;
    
    // Calculate stats
    const stats = {
      total: logs.length,
      normal: logs.filter((log) => log.decision === 'NORMAL').length,
      blocked: logs.filter((log) => log.decision === 'BLOCKED').length,
      suspicious: logs.filter((log) => log.decision === 'FLAGGED').length,
      
      // We also extract recent logs specifically formatted for recharts
      // We'll reverse the array to make it chronological (left to right = oldest to newest)
      chartData: logs.slice(0, 30).reverse().map((log) => ({
        time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        heartRate: log.heartRate,
        decision: log.decision
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('API /stats Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

