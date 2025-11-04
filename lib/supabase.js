// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Backend usa SERVICE_ROLE
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// === Usuária por Telegram ID ===
export async function getOrCreateUser(telegramId) {
  const tid = Number(telegramId);
  let { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', tid)
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    const { data: inserted, error: insErr } = await supabase
      .from('users')
      .insert({ telegram_id: tid, is_premium: false, free_used: 0 })
      .select()
      .single();
    if (insErr) throw insErr;
    data = inserted;
  }
  return data;
}

// Incrementa contador grátis (RPC já criada no Supabase)
export async function incrementFreeUsed(telegramId) {
  const { error } = await supabase.rpc('increment_free_used', { tid: Number(telegramId) });
  if (error) throw error;
}

// Liga/desliga Premium por telegram_id
export async function setPremium(telegramId, on) {
  const { error } = await supabase
    .from('users')
    .update({ is_premium: !!on })
    .eq('telegram_id', Number(telegramId));
  if (error) throw error;
}

// === Nomes que seu api/telegram.js já usa ===
export async function upsertUserEmail(telegramId, email) {
  const { error } = await supabase
    .from('users')
    .update({ email: String(email).toLowerCase() })
    .eq('telegram_id', Number(telegramId));
  if (error) throw error;
}

export async function hasApprovedPurchase(email) {
  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('email', String(email).toLowerCase())
    .in('status', ['APPROVED', 'ACTIVE', 'CANCELED_REVERSAL'])
    .limit(1);
  if (error) throw error;
  return !!(data && data.length);
}

// (usado pelo webhook para ligar/desligar por email)
export async function setPremiumByEmail(email, on) {
  const { error } = await supabase
    .from('users')
    .update({ is_premium: !!on })
    .eq('email', String(email).toLowerCase());
  if (error) throw error;
}

// Log de compra
export async function logPurchase(email, status, product) {
  const { error } = await supabase
    .from('purchases')
    .insert({
      email: String(email).toLowerCase(),
      status: String(status).trim(),
      product: product ? String(product).trim() : null
    });
  if (error) throw error;
}
