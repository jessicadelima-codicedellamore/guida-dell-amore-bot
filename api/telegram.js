// api/telegram.js
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

import {
  getOrCreateUser,
  incrementFreeUsed,
  setPremium,
  upsertUserEmail,
  hasApprovedPurchase
} from '../lib/supabase.js';

import {
  LIMIT_FREE,
  MSG_START,
  MSG_UPSELL,
  MSG_PREMIUM_ON,
  MSG_PREMIUM_OFF,
  MSG_STATUS,
  MSG_ERROR,
  WELCOME_IMAGE_URL,
  HOTMART_URL,
  UPSELL_IMAGE_URL,
  MSG_ASK_EMAIL,
  MSG_EMAIL_SAVED,
  MSG_EMAIL_NOT_FOUND,
  MSG_EMAIL_BAD,
  MSG_EMAIL_OK
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

function looksLikeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// ===== HADASSA: stile terapeutico-spirituale (default) + corpo-mente-spirito quando utile =====
async function openAIReply(prompt, userName = '') {
  const nameLine = userName ? `La donna che ti scrive si chiama ${userName}.` : '';
  const stylePrompt = `
Sei *Hadassa*, la Guida dell’Amore™: mentore nel contesto delle relazioni,
con solide basi in psicologia, psicoanalisi, coaching e spiritualità.
Esperta in: dipendenza affettiva, trauma bonding, attaccamento, gaslighting,
relazioni tossiche, guarigione emotiva e sostegno spirituale.

🎯 OBIETTIVO
- Rispondi SEMPRE in italiano chiaro, diretto e comprensibile anche per chi ha bassa scolarità.
- Evita ripetizioni e termini tecnici inutili. Niente frasi generiche o vuote.

🌿 STILE TERAPEUTICO-SPIRITUALE (DEFAULT)
- Voce compassionevole e materna: accoglie senza giudicare e porta pace.
- Linguaggio poetico e simbolico (volo, bambino, casa, chiave, luce, ferita, rinascita), ma semplice.
- Struttura narrativa di guarigione (quando la domanda è emotiva):
  dolore → comprensione → rivelazione → rinascita (chiudi con speranza/piccolo respiro).
- Questo spazio è come un diario spirituale guidato: lei racconta, Hadassa traduce in guarigione.

🧠💓🕊️ CORPO–MENTE–SPIRITO (USA SOLO QUANDO È UTILE ALLA DOMANDA)
- Psicologico (corpo): sistema nervoso, dopamina/ossitocina, attaccamento, astinenza, trauma bonding.
- Mentale (mente): schemi, “codice interiore”, convinzioni, autostoria.
- Spirituale (spirito): legami d’anima, alleanze, preghiera, discernimento (senza dogmatismo).
- Se usi questa lente, presentala in 3 miniblocchi chiari; se non serve, resta nel tono terapeutico-spirituale.

📚 DIDATTICA CHIARA (QUANDO SERVE SPIEGAZIONE/PRATICA)
- Titoletti brevi: 1) Psicologico  2) Mentale  3) Spirituale  4) Cosa fare
- Passi pratici SOLO se aggiungono valore (max 3, concreti, fattibili).
- Conclusione con UNA frase-chiave memorabile (breve).

👩‍🧑 NOMINARE L’UTENTE
- All’inizio, se conosci il nome (dato sopra), chiamala per nome con naturalezza.

⛔ NON fare:
- Niente “cara anima”, “amica mia” ecc. Evita paternalismo e prolissità.

${nameLine}
Messaggio ricevuto: ${prompt}
`;

  console.log('[DBG][openAIReply] calling OpenAI chat.completions...');
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.5,
        messages: [{ role: 'system', content: stylePrompt }]
      })
    });
    const j = await r.json();
    console.log('[DBG][openAIReply] OpenAI response status:', r.status);
    if (r.status >= 400) {
      console.error('[DBG][openAIReply] OpenAI error payload:', j);
    }
    const out = j?.choices?.[0]?.message?.content?.trim() || '💗';
    return out;
  } catch (err) {
    console.error('[DBG][openAIReply] OpenAI call failed:', err);
    throw err;
  }
}

// Telegram: obter URL do arquivo
async function getTelegramFileUrl(fileId) {
  const r = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const j = await r.json();
  if (!j.ok) throw new Error('getFile failed');
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${j.result.file_path}`;
}

// ===== Transcrever áudio em ITALIANO e não mostrar por padrão =====
async function transcribeFromUrl(fileUrl, language = 'it') {
  console.log('[DBG][transcribe] fetching audio from Telegram fileUrl:', fileUrl);
  const audioResp = await fetch(fileUrl);
  const audioBuf = await audioResp.arrayBuffer();

  const fd = new FormData();
  fd.append('model', 'whisper-1');
  fd.append('file', new Blob([audioBuf]), 'voice.ogg');
  fd.append('language', language);
  fd.append('translate', 'false');

  console.log('[DBG][transcribe] calling OpenAI whisper...');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: fd
  });
  const j = await r.json();
  console.log('[DBG][transcribe] whisper status:', r.status, 'payload keys:', Object.keys(j || {}));
  if (!j.text) {
    console.error('[DBG][transcribe] no transcript text. full payload:', j);
    throw new Error('no transcript');
  }
  const txt = j.text.trim();
  console.log('[DBG][transcribe] got transcript (first 100 chars):', txt.slice(0, 100));
  return txt;
}

// ===== Helpers de FAQ Preço/Pagamento =====
function isPricingQuestion(t) {
  return /\b(prezzo|costo|quanto costa|quanto è|preço|valor)\b/i.test(t);
}
function isPaymentQuestion(t) {
  return /\b(pagamento|pagare|paghi|pagar|formas? de pagamento|metodi di pagamento|paypal|carta|boleto|pix)\b/i.test(t);
}
function faqPricingMessage() {
  return (
`💖 *Piano Premium — Guida dell’Amore*
• *Mensile*: circa *€ 5,75 a settimana* (–57%)
• Accesso immediato dopo l’acquisto
• Fino a *8.000 parole/giorno* (~*70 pagine* di dialogo)
• Risposte profonde, personalizzate, ogni giorno

Attiva qui: ${HOTMART_URL}`
  );
}
function faqPaymentMessage() {
  return (
`💳 *Metodi di pagamento*
• Carte di credito/debito
• (Se disponibile su Hotmart nel tuo Paese) *PayPal*

Dopo il pagamento *l’accesso è immediato*.
Attiva qui: ${HOTMART_URL}`
  );
}

// ===== Handler =====
export default async (req, res) => {
  if (req.method === 'GET') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).end();

  const update = req.body;
  console.log('[DBG][update] raw update:', JSON.stringify(update));

  const msg = update?.message;
  if (!msg) {
    console.log('[DBG][update] no message field, finishing.');
    return res.status(200).json({ ok: true });
  }

  const chatId = msg.chat.id;
  const fromId = String(msg.from.id);

  // Entrada: texto ou áudio
  let text = (msg.text || '').trim();
  console.log('[DBG][input] fromId:', fromId, 'hasText:', !!text, 'hasVoice:', !!msg.voice, 'hasAudio:', !!msg.audio);

  // Limite de voz (padrão 120s = 2 min)
  const VOICE_MAX_SECONDS = Number(process.env.VOICE_MAX_SECONDS || 120);

  // Flag para não enviar MSG_ERROR depois de já ter respondido algo
  let responded = false;

  try {
    const isAdmin = process.env.ADMIN_TELEGRAM_ID && fromId === process.env.ADMIN_TELEGRAM_ID;

    // Áudio/voice
    let durationSec = 0;
    if (msg.voice?.duration) durationSec = Number(msg.voice.duration);
    if (msg.audio?.duration) durationSec = Number(msg.audio.duration);
    if (durationSec) console.log('[DBG][voice] durationSec:', durationSec);

    if (!text && (msg.voice || msg.audio)) {
      if (durationSec > VOICE_MAX_SECONDS) {
        console.log('[DBG][voice] too long, sending limit message.');
        await sendMessage(
          chatId,
          `🎧 Il messaggio vocale è lungo *${Math.round(durationSec)}s*.\n` +
            `Per favore invia audio fino a *${VOICE_MAX_SECONDS}s* oppure spezzalo in parti più brevi.\n` +
            `Se vuoi, puoi anche scrivere in testo — ti risponderò con la stessa cura. 🌹`
        );
        responded = true;
        return res.status(200).json({ ok: true });
      }
      try {
        const fileId = (msg.voice?.file_id || msg.audio?.file_id);
        const url = await getTelegramFileUrl(fileId);
        text = await transcribeFromUrl(url, 'it');
        if (process.env.SHOW_TRANSCRIPT === '1') {
          await sendMessage(chatId, `🗣️ *Trascrizione:* _${text}_`, { disable_web_page_preview: true });
        }
      } catch (err) {
        console.error('[DBG][voice] transcription failed:', err);
        await sendMessage(chatId, '📝 Non sono riuscita a trascrivere il vocale. Puoi riprovare o scrivermi in testo?');
        responded = true;
        return res.status(200).json({ ok: true });
      }
    }

    // /start
    if (text === '/start') {
      console.log('[DBG][/start] sending welcome photo...');
      await sendPhoto(chatId, WELCOME_IMAGE_URL, MSG_START, {
        reply_markup: {
          inline_keyboard: [[{ text: '💖 Attiva il Premium (–57%)', url: HOTMART_URL }]]
        }
      });
      responded = true;
      return res.status(200).json({ ok: true });
    }

    // /status
    if (text.startsWith('/status')) {
      const user = await getOrCreateUser(fromId);
      console.log('[DBG][/status] user:', { fromId, free_used: user.free_used, is_premium: user.is_premium, LIMIT_FREE });
      await sendMessage(chatId, MSG_STATUS(user.free_used, user.is_premium));
      responded = true;
      return res.status(200).json({ ok: true });
    }

    // /email
    if (text.startsWith('/email')) {
      const e = text.replace('/email', '').trim();
      console.log('[DBG][/email] received:', e);
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
      if (!e || !ok) {
        await sendMessage(chatId, MSG_EMAIL_BAD);
        responded = true;
        return res.status(200).json({ ok: true });
      }
      await upsertUserEmail(fromId, e);
      await sendMessage(chatId, MSG_EMAIL_OK(e));
      const hasPurchase = await hasApprovedPurchase(e);
      console.log('[DBG][/email] hasApprovedPurchase:', hasPurchase);
      if (hasPurchase) {
        await setPremium(fromId, true);
        await sendMessage(chatId, '✨ *Premium attivato automaticamente.* Benvenuta nel cerchio interno!');
      } else {
        await sendMessage(chatId, MSG_EMAIL_NOT_FOUND);
      }
      responded = true;
      return res.status(200).json({ ok: true });
    }

    // /premium (admin)
    if (isAdmin && text.startsWith('/premium')) {
      const [, cmd, idRaw] = text.split(' ');
      const targetId = idRaw ? idRaw.trim() : fromId;
      console.log('[DBG][/premium] cmd:', cmd, 'targetId:', targetId);
      if (cmd === 'on') {
        await setPremium(targetId, true);
        await sendMessage(chatId, MSG_PREMIUM_ON(targetId));
      } else if (cmd === 'off') {
        await setPremium(targetId, false);
        await sendMessage(chatId, MSG_PREMIUM_OFF(targetId));
      } else {
        await sendMessage(chatId, 'Uso: `/premium on <telegram_id>` o `/premium off <telegram_id>`');
      }
      responded = true;
      return res.status(200).json({ ok: true });
    }

    // ===== FAQ — ativo para TODAS, mas conta limite só se NÃO-PREMIUM =====
    const user = await getOrCreateUser(fromId);
    console.log('[DBG][user] loaded:', { fromId, free_used: user.free_used, is_premium: user.is_premium, LIMIT_FREE });

    if (text) {
      const t = text.toLowerCase();
      if (isPricingQuestion(t)) {
        console.log('[DBG][FAQ] pricing question matched.');
        await sendMessage(chatId, faqPricingMessage(), {
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [[{ text: '💖 Attiva il Premium', url: HOTMART_URL }]]
          }
        });
        if (!user.is_premium) {
          try { await incrementFreeUsed(fromId); console.log('[DBG][FAQ] increment free_used (pricing) OK'); }
          catch (err) { console.error('[DBG][FAQ] increment free_used (pricing) ERR:', err); }
        }
        responded = true;
        return res.status(200).json({ ok: true });
      }
      if (isPaymentQuestion(t)) {
        console.log('[DBG][FAQ] payment question matched.');
        await sendMessage(chatId, faqPaymentMessage(), {
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [[{ text: '💖 Procedi al pagamento', url: HOTMART_URL }]]
          }
        });
        if (!user.is_premium) {
          try { await incrementFreeUsed(fromId); console.log('[DBG][FAQ] increment free_used (payment) OK'); }
          catch (err) { console.error('[DBG][FAQ] increment free_used (payment) ERR:', err); }
        }
        responded = true;
        return res.status(200).json({ ok: true });
      }
    }

    // E-mail no texto
    if (looksLikeEmail(text)) {
      const email = text.toLowerCase();
      console.log('[DBG][email-inline] detected:', email);
      await sendMessage(chatId, MSG_EMAIL_SAVED(email));
      await upsertUserEmail(fromId, email);
      const ok = await hasApprovedPurchase(email);
      console.log('[DBG][email-inline] hasApprovedPurchase:', ok);
      if (ok) {
        await setPremium(fromId, true);
        await sendMessage(chatId, '✨ *Premium attivato automaticamente.* Benvenuta nel cerchio interno!');
      } else {
        await sendMessage(chatId, MSG_EMAIL_NOT_FOUND);
      }
      responded = true;
      return res.status(200).json({ ok: true });
    }

    // Limite grátis
    if (!user.is_premium && user.free_used >= LIMIT_FREE) {
      console.log('[DBG][limit] reached. free_used:', user.free_used, 'LIMIT_FREE:', LIMIT_FREE);
      await sendPhoto(chatId, UPSELL_IMAGE_URL, MSG_UPSELL, {
        reply_markup: { inline_keyboard: [[{ text: '💖 Attiva il Premium (–57%)', url: HOTMART_URL }]] }
      });
      await sendMessage(chatId, MSG_ASK_EMAIL);
      responded = true;
      return res.status(200).json({ ok: true });
    }

    // Mensagem vazia
    if (!text) {
      console.log('[DBG][empty] no text after all, instructing user.');
      await sendMessage(chatId, '📝 Inviami un *messaggio di testo* o un *messaggio vocale* chiaro (max 2 minuti).');
      responded = true;
      return res.status(200).json({ ok: true });
    }

    // Resposta IA
    const userName = msg.from?.first_name || '';
    console.log('[DBG][AI] calling openAIReply...');
    let reply;
    try {
      reply = await openAIReply(text || 'Guidami.', userName);
    } catch (err) {
      console.error('[DBG][AI] openAIReply failed:', err);
      await sendMessage(chatId, MSG_ERROR);
      responded = true;
      return res.status(200).json({ ok: true });
    }
    await sendMessage(chatId, reply);
    responded = true;
    console.log('[DBG][AI] reply sent.');

    try {
      if (!user.is_premium) {
        await incrementFreeUsed(fromId);
        console.log('[DBG][counter] increment free_used OK for', fromId);
      } else {
        console.log('[DBG][counter] premium user, not incrementing.');
      }
    } catch (err) {
      console.error('[DBG][counter] increment free_used ERR:', err);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[DBG][handler] caught error:', e);
    if (!responded) await sendMessage(chatId, MSG_ERROR);
    return res.status(200).json({ ok: true });
  }
};
