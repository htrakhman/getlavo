import { supabaseAdmin } from '@/lib/supabase/admin';

export async function logError(args: {
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
}) {
  try {
    const sb = supabaseAdmin();
    await sb.from('error_logs').insert({
      source: args.source,
      message: args.message.slice(0, 1000),
      stack: args.stack?.slice(0, 4000),
      context: args.context ?? null,
    });
  } catch (e) {
    console.error('error_log insert failed', e);
  }
}

export async function logJobRun(args: {
  jobName: string;
  status: 'ok' | 'error';
  durationMs: number;
  detail?: Record<string, any>;
}) {
  try {
    const sb = supabaseAdmin();
    await sb.from('job_runs').insert({
      job_name: args.jobName,
      status: args.status,
      duration_ms: args.durationMs,
      detail: args.detail ?? null,
    });
  } catch (e) {
    console.error('job_run insert failed', e);
  }
}
