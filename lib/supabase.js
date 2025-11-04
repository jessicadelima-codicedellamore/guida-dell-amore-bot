// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Use a SERVICE_ROLE no backend (webhook/rotas API). NUNCA no frontend.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Cria/obtém usuária pelo Telegram ID
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

// Incrementa contador free (RPC)
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

// === Nomes que o seu api/telegram.js espera ===

// upsertUserEmail (equivalente ao seu setEmail)
export async function upsertUserEmail(telegramId, email) {
  const { error } = await supabase
    .from('users')
    .update({ email })
    .eq('telegram_id', Number(telegramId));
  if (error) throw error;
}

// Consulta se existe compra aprovada para o email
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

// Ativa premium por EMAIL (usado se quiser ligar direto via webhook)
export async function setPremiumByEmail(email, on) {
  const { error } = await supabase
    .from('users')
    .update({ is_premium: !!on })
    .eq('email', String(email).toLowerCase());
  if (error) throw error;
}

// Log de compra (opcional, já está sendo usado no webhook)
export async function logPurchase(email, status, product) {
  const { error } = await supabase
    .from('purchases')
    .insert({ email: String(email).toLowerCase(), status, product });
  if (error) throw error;
}
