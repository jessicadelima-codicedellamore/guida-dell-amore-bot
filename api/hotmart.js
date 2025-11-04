// api/hotmart.js
import { logPurchase, setPremiumByEmail } from '../lib/supabase.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Validação simples via query ?secret=...
  const qsSecret = req.query?.secret;
  if (
    process.env.HOTMART_WEBHOOK_SECRET &&
    qsSecret !== process.env.HOTMART_WEBHOOK_SECRET
  ) {
    return res.status(401).json({ ok: false, error: 'invalid secret' });
  }

  try {
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
      await logPurchase(email, status, product);

      // Liga/desliga premium automaticamente por email:
      const s = String(status).toUpperCase();
      if (['APPROVED', 'ACTIVE', 'CANCELED_REVERSAL'].includes(s)) {
        await setPremiumByEmail(email, true);
      }
      if (['REFUNDED', 'CANCELED', 'CHARGEBACK'].includes(s)) {
        await setPremiumByEmail(email, false);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Hotmart webhook error:', e);
    return res.status(200).json({ ok: true });
  }
};
