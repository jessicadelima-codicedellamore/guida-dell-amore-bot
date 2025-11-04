// api/hotmart.js
import { logPurchase, setPremiumByEmail } from '../lib/supabase.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Mostra o corpo completo nos logs (pra entender o formato exato)
    console.log('Hotmart webhook RAW body:', JSON.stringify(req.body));

    // Como o Hotmart envia nested dentro de "data"
    const data = req.body?.data || req.body || {};

    const buyer = data.buyer || {};
    const purchase = data.purchase || {};
    const product = data.product || {};

    // Captura o e-mail de vários lugares possíveis
    const email =
      buyer.email ||
      buyer.checkout_email ||
      data.buyer_email ||
      data.email ||
      '';

    // Captura o status
    const status =
      purchase.status ||
      data.status ||
      req.body.status ||
      '';

    // Nome ou id do produto
    const productName = product.name || product.id || data.product_name || null;

    console.log('Hotmart parsed:', { email, status, product: productName });

    if (email && status) {
      await logPurchase(email, status, productName);

      const s = String(status).toUpperCase();
      if (['APPROVED', 'ACTIVE', 'COMPLETE', 'CANCELED_REVERSAL'].includes(s)) {
        await setPremiumByEmail(email, true);
      } else if (['REFUNDED', 'CANCELED', 'CHARGEBACK', 'EXPIRED'].includes(s)) {
        await setPremiumByEmail(email, false);
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Hotmart webhook error:', e);
    res.status(200).json({ ok: true });
  }
};
