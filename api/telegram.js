// api/telegram.js

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

import { getOrCreateUser, incrementFreeUsed, setPremium } from '../lib/supabase.js';
import {
  LIMIT_FREE,
  MSG_START,
  MSG_UPSELL,
  MSG_PREMIUM_ON,
  MSG_PREMIUM_OFF,
  MSG_STATUS,
  MSG_ERROR,
  WELCOME_IMAGE_URL,
  HOTMART_URL
} from '../lib/texts.js';

async function sendMessage(chatId, text, extra = {}) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra })
  });
}

async function sendPhoto(chatId, photoUrl, caption, extra = {}) {
  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'Markdown', ...extra })
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
        { role: 'system', content: 'Sei una guida amorosa spirituale (Guida dell’Amore). Rispondi con calore, chiarezza e fermezza.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  const j = await r.json();
  return j?.choices?.[0]?.message?.content?.trim() || '💗';
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

    // /start → envia imagem + legenda + botão do checkout
    if (text === '/start') {
      await sendPhoto(chatId, WELCOME_IMAGE_URL, MSG_START, {
        reply_markup: {
          inline_keyboard: [[{ text: '💖 Attiva il Premium (–57%)', url: HOTMART_URL }]]
        }
      });
      return res.status(200).json({ ok: true });
    }

    // /status → mostra o status do usuário
    if (text.startsWith('/status')) {
      const user = await getOrCreateUser(fromId);
      await sendMessage(chatId, MSG_STATUS(user.free_used, user.is_premium));
      return res.status(200).json({ ok: true });
    }

    // /premium → comando de admin
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
        await sendMessage(chatId, 'Uso: `/premium on <telegram_id>` o `/premium off <telegram_id>`', { parse_mode: 'Markdown' });
      }
      return res.status(200).json({ ok: true });
    }

    // fluxo normal
    const user = await getOrCreateUser(fromId);

    // se já usou o limite gratuito e não é premium → upsell
    if (!user.is_premium && user.free_used >= LIMIT_FREE) {
      await sendMessage(chatId, MSG_UPSELL, {
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[{ text: '💖 Attiva il Premium (–57%)', url: HOTMART_URL }]]
        }
      });
      return res.status(200).json({ ok: true });
    }

    // resposta normal
    const reply = await openAIReply(text || 'Guidami.');
    await sendMessage(chatId, reply);

    // conta a mensagem se ainda for grátis
    if (!user.is_premium) await incrementFreeUsed(fromId);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    await sendMessage(chatId, MSG_ERROR);
    return res.status(200).json({ ok: true });
  }
};
