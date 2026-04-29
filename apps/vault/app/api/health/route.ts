import { NextResponse } from 'next/server';
import { pingDb } from '@/lib/db';

export async function GET() {
  const checks: Record<string, string> = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
    DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'MISSING',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'set' : 'MISSING',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'set' : 'MISSING',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'set' : 'MISSING',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'set' : 'MISSING',
  };

  if (process.env.DATABASE_URL) {
    checks.database = (await pingDb()) ? 'connected' : 'FAILED';
  } else {
    checks.database = 'SKIPPED (no DATABASE_URL)';
  }

  const healthy = Object.values(checks).every(
    (v) => v === 'set' || v === 'connected' || v.startsWith('SKIPPED'),
  );

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 },
  );
}
