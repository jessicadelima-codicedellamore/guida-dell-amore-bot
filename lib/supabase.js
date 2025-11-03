import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// Tabela: users (crie no Supabase com o SQL do README)
export async function getOrCreateUser(telegramId) {
  let { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { data: inserted, error: insErr } = await supabase
      .from('users')
      .insert({ telegram_id: telegramId, is_premium: false, free_used: 0 })
      .select()
      .single();
    if (insErr) throw insErr;
    data = inserted;
  }
  return data;
}

export async function incrementFreeUsed(telegramId) {
  const { error } = await supabase.rpc('increment_free_used', { tid: telegramId });
  if (error) throw error;
}

export async function setPremium(telegramId, isPremium) {
  const { error } = await supabase
    .from('users')
    .update({ is_premium: isPremium })
    .eq('telegram_id', telegramId);
  if (error) throw error;
}
