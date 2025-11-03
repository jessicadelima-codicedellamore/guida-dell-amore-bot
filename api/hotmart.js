// api/hotmart.js — versão simples (grava email + status)
import { supabase } from '../lib/supabase.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // A Hotmart pode mandar campos em formatos levemente diferentes.
  const email =
    req.body?.buyer?.email ||
    req.body?.data?.buyer?.email ||
    req.body?.email ||
    null;

  const status =
    req.body?.purchase?.status ||
    req.body?.data?.status ||
    req.body?.status ||
    'UNKNOWN';

  const product =
    req.body?.product?.name ||
    req.body?.data?.product?.name ||
    req.body?.product ||
    null;

  // Log só para depuração (aparece nos logs da Vercel)
  console.log('Hotmart webhook (simples):', { email, status, product });

  // Se tiver email, salva. (Se vier sem email, só responde ok)
  if (email) {
    const { error } = await supabase
      .from('purchases')
      .insert({ email, status, product });

    if (error) {
      console.error('Erro ao salvar purchase:', error);
    }
  }

  // Sempre responde ok para a Hotmart considerar entregue
  return res.status(200).json({ ok: true });
};
