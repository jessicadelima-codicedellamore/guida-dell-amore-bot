// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// Cria ou obtém a usuária pelo Telegram ID
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

// Incrementa contador de mensagens grátis
export async function incrementFreeUsed(telegramId) {
  const { error } = await supabase.rpc('increment_free_used', { tid: telegramId });
  if (error) throw error;
}

// Liga/desliga Premium
export async function setPremium(telegramId, isPremium) {
  const { error } = await supabase
    .from('users')
    .update({ is_premium: isPremium })
    .eq('telegram_id', telegramId);
  if (error) throw error;
}

// Salva/atualiza e-mail no perfil
export async function upsertUserEmail(telegramId, email) {
  const { error } = await supabase
    .from('users')
    .update({ email })
    .eq('telegram_id', telegramId);
  if (error) throw error;
}

// Verifica se existe compra aprovada para este e-mail
export async function hasApprovedPurchase(email) {
  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('email', email.toLowerCase())
    .in('status', ['APPROVED', 'ACTIVE', 'CANCELED_REVERSAL'])
    .limit(1);
  if (error) throw error;
  return (data && data.length > 0);
}
