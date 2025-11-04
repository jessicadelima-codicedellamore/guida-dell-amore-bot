// api/hotmart.js
import { supabase } from '../lib/supabase.js';

function getSecretFromReq(req) {
  // 1) Query string ?secret=...
  if (req.query?.secret) return String(req.query.secret);

  // 2) Headers (casos comuns; deixamos amplo pra ser compatível)
  const h = req.headers || {};
  return (
    h['x-hotmart-webhook-secret'] ||
    h['x-webhook-secret'] ||
    h['x-hotmart-secret'] ||
    h['x-hub-signature'] || // se você optar por HMAC no futuro
    ''
  );
}

function normalizeEmail(any) {
  if (!any) return '';
  return String(any).trim().toLowerCase();
}

function extractPayload(req) {
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
    null;

  return {
    email: normalizeEmail(email),
    status: status ? String(status).trim().toUpperCase() : '',
    product: product ? String(product).trim() : null,
  };
}

function isApproved(status) {
  // Status que consideramos "libera premium"
  return (
    status === 'APPROVED' ||
    status === 'ACTIVE' ||
    status === 'CANCELED_REVERSAL' ||
    /aprov/i.test(status) // cobre "compra aprovada" etc.
  );
}

function isRevoked(status) {
  // Status que removem premium
  return (
    status === 'REFUNDED' ||
    status === 'CHARGEBACK' ||
    status === 'CANCELED' ||
    /reembols|chargeback|cancel/i.test(status)
  );
}

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // 1) Autenticação por segredo simples
    const provided = getSecretFromReq(req);
    const expected = process.env.HOTMART_WEBHOOK_SECRET || '';
    if (!expected || provided !== expected) {
      console.warn('Hotmart webhook: segredo inválido', { provided });
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    // 2) Extrai dados úteis
    const { email, status, product } = extractPayload(req);
    console.log('Hotmart webhook payload:', { email, status, product });

    // 3) Salva o evento na tabela purchases (log)
    if (email && status) {
      await supabase.from('purchases').insert({
        email,
        status,
        product,
      });
    }

    // 4) Liga/desliga Premium pelo e-mail (se o e-mail já foi informado pela usuária no bot)
    if (email && status) {
      if (isApproved(status)) {
        // Ativa premium para quem tem esse e-mail salvo no perfil
        const { data: users } = await supabase
          .from('users')
          .select('telegram_id, email')
          .eq('email', email);

        if (users && users.length > 0) {
          const tids = users.map((u) => u.telegram_id);
          await supabase
            .from('users')
            .update({ is_premium: true })
            .in('telegram_id', tids);
          console.log('Premium ativado via webhook para', tids);
        }
      }

      if (isRevoked(status)) {
        // Remove premium
        const { data: users } = await supabase
          .from('users')
          .select('telegram_id, email')
          .eq('email', email);

        if (users && users.length > 0) {
          const tids = users.map((u) => u.telegram_id);
          await supabase
            .from('users')
            .update({ is_premium: false })
            .in('telegram_id', tids);
          console.log('Premium removido via webhook para', tids);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Hotmart webhook error:', e);
    // Respondemos 200 para a Hotmart não ficar reenviando em loop,
    // mas logamos o erro para investigação.
    return res.status(200).json({ ok: true });
  }
};
