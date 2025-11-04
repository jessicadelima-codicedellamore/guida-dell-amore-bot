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

// ===== Helpers =====
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
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'Markdown',
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
          content:
            'Sei una guida amorosa spirituale (Guida dell’Amore). Rispondi con calore, chiarezza e fermezza.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });
  const j = await r.json();
  return j?.choices?.[0]?.message?.content?.trim() || '💗';
}

// Telegram: obter URL do arquivo
async function getTelegramFileUrl(fileId) {
  const r = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const j = await r.json();
  if (!j.ok) throw new Error('getFile failed');
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${j.result.file_path}`;
}

// OpenAI Whisper: transcrever áudio a partir de URL
async function transcribeFromUrl(fileUrl) {
  const audioResp = await fetch(fileUrl);
  const audioBuf = await audioResp.arrayBuffer();

  const fd = new FormData();
  fd.append('model', 'whisper-1'); // bom para OGG (voz Telegram)
  fd.append('file', new Blob([audioBuf]), 'voice.ogg');

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: fd
  });
  const j = await r.json();
  if (!j.text) throw new Error('no transcript');
  return j.text.trim();
}

// ===== Handler =====
export default async (req, res) => {
  if (req.method === 'GET') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).end();

  const update = req.body;
  const msg = update?.message;
  if (!msg) return res.status(200).json({ ok: true });

  const chatId = msg.chat.id;
  const fromId = String(msg.from.id);

  // Entrada pode ser texto ou áudio
  let text = (msg.text || '').trim();

  // Limite de voz (padrão 120s = 2 min). Pode alterar via env VOICE_MAX_SECONDS.
  const VOICE_MAX_SECONDS = Number(process.env.VOICE_MAX_SECONDS || 120);

  try {
    const isAdmin = process.env.ADMIN_TELEGRAM_ID && fromId === process.env.ADMIN_TELEGRAM_ID;

    // Se veio voice/audio, checa duração
    let durationSec = 0;
    if (msg.voice?.duration) durationSec = Number(msg.voice.duration);
    if (msg.audio?.duration) durationSec = Number(msg.audio.duration);

    if (!text && (msg.voice || msg.audio)) {
      // recusa se acima do limite
      if (durationSec > VOICE_MAX_SECONDS) {
        await sendMessage(
          chatId,
          `🎧 Il messaggio vocale è lungo *${Math.round(durationSec)}s*.\n` +
          `Per favore invia audio fino a *${VOICE_MAX_SECONDS}s* oppure spezzalo in parti più brevi.\n` +
          `Se vuoi, puoi anche scrivere in testo — ti risponderò con la stessa cura. 🌹`
        );
        return res.status(200).json({ ok: true });
      }

      // dentro do limite → transcreve
      const fileId = (msg.voice?.file_id || msg.audio?.file_id);
      const url = await getTelegramFileUrl(fileId);
      text = await transcribeFromUrl(url);

      // opcional: mostrar a transcrição
      await sendMessage(chatId, `🗣️ *Trascrizione:* _${text}_`, { disable_web_page_preview: true });
    }

    // /start → imagem + legenda + botão de checkout
    if (text === '/start') {
      await sendPhoto(chatId, WELCOME_IMAGE_URL, MSG_START, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💖 Attiva il Premium (–57%)', url: HOTMART_URL }]
          ]
        }
      });
      return res.status(200).json({ ok: true });
    }

    // /status → mostra status
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

    // atingiu limite gratuito e não é premium → upsell com botão
    if (!user.is_premium && user.free_used >= LIMIT_FREE) {
      await sendMessage(chatId, MSG_UPSELL, {
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{ text: '💖 Attiva il Premium (–57%)', url: HOTMART_URL }]
          ]
        }
      });
      return res.status(200).json({ ok: true });
    }

    // Se ainda não houver texto (ex.: áudio vazio), instrui a usuária
    if (!text) {
      await sendMessage(
        chatId,
        '📝 Inviami un *messaggio di testo* o un *messaggio vocale* chiaro (max 2 minuti).'
      );
      return res.status(200).json({ ok: true });
    }

    // Resposta da IA
    const reply = await openAIReply(text || 'Guidami.');
    await sendMessage(chatId, reply);

    // Contabiliza grátis
    if (!user.is_premium) await incrementFreeUsed(fromId);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    await sendMessage(chatId, MSG_ERROR);
    return res.status(200).json({ ok: true });
  }
};
