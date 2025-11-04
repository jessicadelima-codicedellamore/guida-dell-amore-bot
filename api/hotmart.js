// api/hotmart.js
import { logPurchase, setPremiumByEmail } from '../lib/supabase.js';

// Mapeia vários formatos que a Hotmart pode enviar (v2.0 + variações)
function parseHotmart(body) {
  const b = body || {};
  const d = b.data || {};

  const buyer   = b.buyer   || d.buyer   || {};
  const purch   = b.purchase|| d.purchase|| {};
  const prod    = b.product || d.product || {};

  const email =
    (buyer.email || buyer.checkout_email || b.buyer_email || b.email || '').toLowerCase().trim();

  // normaliza status sempre em UPPER
  const statusRaw =
    purch.status || b.status || d.status || '';
  const status = String(statusRaw || '').toUpperCase().trim();

  // tenta nome/id do produto/oferta
  const product =
    prod.name || prod.id || b.product_name || b.offer || null;

  return { email, status, product };
}

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Loga o payload bruto pra debug (aparece nos Logs da Vercel)
    console.log('Hotmart RAW:', JSON.stringify(req.body));

    const { email, status, product } = parseHotmart(req.body || {});
    console.log('Hotmart parsed:', { email, status, product });

    // Sempre registra em purchases (quando houver dados mínimos)
    if (email && status) {
      await logPurchase(email, status, product);

      // Status que CONCEDEM premium
      const GRANT = new Set(['APPROVED', 'COMPLETE', 'ACTIVE', 'CANCELED_REVERSAL']);
      // Status que REVOGAM premium
      const REVOKE = new Set(['REFUNDED', 'CHARGEBACK', 'CANCELED', 'CANCELLED', 'EXPIRED']);

      if (GRANT.has(status)) {
        await setPremiumByEmail(email, true);
      } else if (REVOKE.has(status)) {
        await setPremiumByEmail(email, false);
      }
    }

    // Sempre responde 200 pra Hotmart não ficar em “retenção”
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Hotmart webhook error:', e);
    // Mesmo em erro, devolve 200 pra não travar a fila de webhooks
    return res.status(200).json({ ok: true });
  }
};
