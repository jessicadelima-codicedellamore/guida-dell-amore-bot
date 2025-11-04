// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

export async function getOrCreateUser(telegramId) {
  const tid = Number(telegramId);
  let { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', tid)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const { data: inserted, error: insErr } = await supabase
      .from('users')
      .insert({ telegram_id: tid })
      .select('*')
      .single();
    if (insErr) throw insErr;
    data = inserted;
  }
  return data;
}

export async function incrementFreeUsed(telegramId) {
  const { error } = await supabase.rpc('increment_free_used', { tid: Number(telegramId) });
  if (error) throw error;
}

export async function setPremium(telegramId, on) {
  const { error } = await supabase
    .from('users')
    .update({ is_premium: !!on })
    .eq('telegram_id', Number(telegramId));
  if (error) throw error;
}

export async function setEmail(telegramId, email) {
  const { error } = await supabase
    .from('users')
    .update({ email })
    .eq('telegram_id', Number(telegramId));
  if (error) throw error;
}

// Ativa premium por EMAIL (usado pelo webhook Hotmart)
export async function setPremiumByEmail(email, on) {
  const { error } = await supabase
    .from('users')
    .update({ is_premium: !!on })
    .ilike('email', email); // case-insensitive
  if (error) throw error;
}

// Loga compra
export async function logPurchase(email, status, product) {
  const { error } = await supabase
    .from('purchases')
    .insert({ email, status, product });
  if (error) throw error;
}
