import { setPremium } from '../lib/supabase.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const event = req.body?.event || req.body?.event_name || '';
  const buyerTelegramId = req.body?.buyer?.telegram_id || req.body?.buyer_telegram_id || null;
  const status = req.body?.purchase?.status || req.body?.status || '';

  console.log('Hotmart webhook:', { event, status, buyerTelegramId });

  if (buyerTelegramId) {
    if (['APPROVED', 'ACTIVE', 'CANCELED_REVERSAL'].includes(status) || /compra aprovada/i.test(status)) {
      await setPremium(String(buyerTelegramId), true);
    }
    if (['REFUNDED', 'CHARGEBACK', 'CANCELED'].includes(status) || /reembols/i.test(status) || /chargeback/i.test(status)) {
      await setPremium(String(buyerTelegramId), false);
    }
  }

  return res.status(200).json({ ok: true });
};
