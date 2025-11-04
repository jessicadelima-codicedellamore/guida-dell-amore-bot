const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

import {
  getOrCreateUser,
  incrementFreeUsed,
  setPremium
} from '../lib/supabase.js';

import {
  LIMIT_FREE,
  // (mantidas para compatibilidade)
  MSG_START,
  MSG_UPSELL,
  MSG_PREMIUM_ON,
  MSG_PREMIUM_OFF,
  MSG_STATUS,
  MSG_ERROR,
  // Novos (para foto com botão)
  WELCOME_PHOTO,
  PREMIUM_PHOTO,
  CAPTION_START_HTML,
  CAPTION_UPSELL_HTML,
  KB_PREMIUM
} from '../lib/texts.js';

// Envia texto (Markdown)
async function sendMessage(chatId, text, extra = {}) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...extra
    })
  });
}

// Envia foto com legenda HTML (para suportar <b>…</b>)
async function sendPhoto(chatId, photo, caption, extra = {}) {
  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo,
      caption,
      parse_mode: 'HTML',
      ...extra
    })
  });
}

async function openAIReply(prompt) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: 'Sei una guida amorosa spirituale (Guida dell’Amore). Rispondi con calore, chiarezza e fermezza.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });
  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() || '💗';
}

export default async (req, res) => {
  if (req.method === 'GET') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).end();

  const update = req.body;
  const msg = update?.message;
  if (!msg) return res.status(200).json({ ok: true });

  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const fromId = String(msg.from.id);

  try {
    const isAdmin = process.env.ADMIN_TELEGRAM_ID && fromId === process.env.ADMIN_TELEGRAM_ID;

    // /start — agora com FOTO + botão de checkout
    if (text === '/start') {
      await sendPhoto(chatId, WELCOME_PHOTO, CAPTION_START_HTML, {
        reply_markup: KB_PREMIUM
      });
      return res.status(200).json({ ok: true });
    }

    // /status
    if (text.startsWith('/status')) {
      const user = await getOrCreateUser(fromId);
      await sendMessage(chatId, MSG_STATUS(user.free_used, user.is_premium));
      return res.status(200).json({ ok: true });
    }

    // /premium (admin)
    if (isAdmin && text.startsWith('/premium')) {
      const [, cmd, idRaw] = text.split(' ');
      const targetId = idRaw ? idRaw.trim() : fromId;
      if (cmd === 'on') {
        await setPremium(targetId, true);
        await sendMessage(chatId, MSG_PREMIUM_ON(targetId));
      } else if (cmd === 'off') {
        await setPremium(targetId, false);
        await sendMessage(chatId, MSG_PREMIUM_OFF(targetId));
      } else {
        await sendMessage(
          chatId,
          'Uso: `/premium on <telegram_id>` o `/premium off <telegram_id>`',
          { parse_mode: 'Markdown' }
        );
      }
      return res.status(200).json({ ok: true });
    }

    // Fluxo padrão
    const user = await getOrCreateUser(fromId);

    // Se acabou o grátis → FOTO de upsell com botão
    if (!user.is_premium && user.free_used >= LIMIT_FREE) {
      await sendPhoto(chatId, PREMIUM_PHOTO, CAPTION_UPSELL_HTML, {
        reply_markup: KB_PREMIUM
      });
      return res.status(200).json({ ok: true });
    }

    // Resposta normal
    const reply = await openAIReply(text || 'Guidami.');
    await sendMessage(chatId, reply);

    if (!user.is_premium) await incrementFreeUsed(fromId);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    // Mensagem de erro “Hadassa in preghiera”
    await sendMessage(chatId, MSG_ERROR);
    return res.status(200).json({ ok: true });
  }
};
