import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function logAudit({ action, entityType, entityId, entityLabel, oldValue, newValue }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('audit_log').insert({
    user_id: user.id,
    user_email: user.email,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
  })
}
