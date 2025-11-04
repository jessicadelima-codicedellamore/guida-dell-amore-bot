// api/hotmart.js
import { supabase } from '../lib/supabase.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Hotmart manda estruturas diferentes conforme o tipo de webhook; tentamos pegar os campos mais comuns
    const body = req.body || {};
    const email =
      (body.buyer && (body.buyer.email || body.buyer.checkout_email)) ||
      body.buyer_email ||
      body.email ||
      '';
    const status =
      (body.purchase && body.purchase.status) ||
      body.status ||
      (body.data && body.data.status) ||
      '';
    const product =
      (body.product && (body.product.name || body.product.id)) ||
      body.product_name ||
      body.offer ||
      '';

    if (email && status) {
      await supabase.from('purchases').insert({
        email: String(email).toLowerCase().trim(),
        status: String(status).trim(),
        product: product ? String(product).trim() : null
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Hotmart webhook error:', e);
    return res.status(200).json({ ok: true });
  }
};
