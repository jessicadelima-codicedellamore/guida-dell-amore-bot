// api/hotmart.js
import { logPurchase, setPremiumByEmail } from '../lib/supabase.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // ===== DEBUG INICIAL =====
    console.log('[HOTMART][RAW]', JSON.stringify(req.body));
    console.log('[HOTMART][HDR] x-hotmart-hottok =', req.headers['x-hotmart-hottok']);

    // ===== VALIDAÇÃO DO HOTTOK =====
    const expected = (process.env.HOTMART_WEBHOOK_SECRET || '').trim();
    const got = String(req.headers['x-hotmart-hottok'] || '').trim();

    if (expected) {
      if (!got) {
        console.warn('[HOTMART][WARN] Header X-HOTMART-HOTTOK ausente.');
        return res.status(401).json({ ok: false, error: 'missing_hottok' });
      }
      if (got !== expected) {
        console.warn('[HOTMART][WARN] HOTTOK inválido. got=', got);
        return res.status(401).json({ ok: false, error: 'invalid_hottok' });
      }
    } else {
      console.warn('[HOTMART][WARN] HOTMART_WEBHOOK_SECRET não definido; aceitando chamadas sem validação.');
      // Se quiser bloquear quando não houver segredo, troque a linha acima por um return 500.
    }

    // ===== PARSE DO CORPO (Hotmart v2 manda em data.*) =====
    const data = req.body?.data || req.body || {};

    const buyer = data.buyer || {};
    const purchase = data.purchase || {};
    const product = data.product || {};

    // Captura email de múltiplos campos possíveis
    const email =
      buyer.email ||
      buyer.checkout_email ||
      data.buyer_email ||
      data.email ||
      '';

    // Captura status de múltiplos possíveis
    const status =
      purchase.status ||
      data.status ||
      req.body.status ||
      '';

    // Nome/id do produto
    const productName = product.name || product.id || data.product_name || null;

    console.log('[HOTMART][PARSED]', { email, status, product: productName });

    // ===== LOG E AÇÃO NO SUPABASE =====
    if (email && status) {
      await logPurchase(email, status, productName);

      const s = String(status).toUpperCase();
      if (['APPROVED', 'ACTIVE', 'COMPLETE', 'CANCELED_REVERSAL'].includes(s)) {
        await setPremiumByEmail(email, true);
        console.log('[HOTMART][ACTION] Premium ON ->', email);
      } else if (['REFUNDED', 'CANCELED', 'CHARGEBACK', 'EXPIRED'].includes(s)) {
        await setPremiumByEmail(email, false);
        console.log('[HOTMART][ACTION] Premium OFF ->', email);
      } else {
        console.log('[HOTMART][ACTION] Status sem ação específica:', s);
      }
    } else {
      console.warn('[HOTMART][WARN] Sem email ou status no payload.');
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[HOTMART][ERR]', e);
    // Sempre 200 para Hotmart não “reprovar” a entrega (você já loga o erro acima)
    return res.status(200).json({ ok: true });
  }
};
