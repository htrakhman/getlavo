import { supabaseAdmin } from '@/lib/supabase/admin';

export async function audit(args: {
  actorId: string | null;
  actorRole?: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  metadata?: Record<string, any>;
}) {
  try {
    const sb = supabaseAdmin();
    await sb.from('audit_logs').insert({
      actor_id: args.actorId,
      actor_role: args.actorRole ?? null,
      action: args.action,
      entity_type: args.entityType ?? null,
      entity_id: args.entityId ?? null,
      metadata: args.metadata ?? null,
    });
  } catch (e) {
    console.error('audit log error', e);
  }
}
