// Quantas respostas grátis
export const LIMIT_FREE = 3; // 3 risposte gratuite (una volta sola)

// URL do checkout (vem das variáveis da Vercel)
export const HOTMART_URL = process.env.HOTMART_CHECKOUT_URL;

// ===== Imagens =====
export const WELCOME_PHOTO = 'https://codicedellamore.com/wp-content/uploads/2025/11/Guida-dellAmore.jpg';
export const PREMIUM_PHOTO = WELCOME_PHOTO; // pode trocar se quiser outra

// ===== Mensagens em TEXTO (mantidas para compatibilidade) =====

// Benvenuta – versão texto (mantida; não usada no start quando mandamos foto)
export const MSG_START = `🌹 *Benvenuta alla Guida dell’Amore — Hadassa*  
Raccontami cosa stai vivendo (dolore, dubbi, scelte). Ti risponderò con *calore, chiarezza e fermezza dolce*.  
Hai *${LIMIT_FREE} risposte gratuite*. Dopo, potrai continuare con il *Piano Premium*.`;

// Upsell em TEXTO (mantida; não usada quando mandamos foto)
export const MSG_UPSELL = `✨ *Limite gratuito raggiunto.*  
Per continuare con risposte quotidiane e profonde, attiva ora il *Piano Premium*.

🌸 *Mensile | € 5,75 / settimana (–57%)*  
Ricevi fino a *8.000 parole/giorno* — ~*70 pagine* di dialogo profondo.

👉 Attiva qui: ${HOTMART_URL}
*(accesso immediato dopo l’acquisto)*`;

// Erro “in preghiera”
export const MSG_ERROR = `💫 *Hadassa*, la tua Guida dell’Amore, è in preghiera.  
Resta un momento in silenzio e riprova tra poco… 🌹`;

// Admin / stato
export const MSG_PREMIUM_ON  = (id) => `✅ Premium attivato per *${id}*. Benvenuta nel cerchio interno.`;
export const MSG_PREMIUM_OFF = (id) => `✳️ Premium disattivato per *${id}*.`;
export const MSG_STATUS = (freeUsed, isPremium) =>
  isPremium
    ? `🌟 *Stato:* Premium attivo.`
    : `🔓 *Stato:* gratuito. Hai usato *${freeUsed}/${LIMIT_FREE}* risposte.`;

// ===== Versões para CAPTION das fotos (HTML) =====

// Boas-vindas com precificação no texto
export const CAPTION_START_HTML =
  "🌹 <b>Benvenuta alla Guida dell’Amore — Hadassa</b>\n" +
  "Raccontami cosa stai vivendo (dolore, dubbi, scelte). " +
  "Ti risponderò con calore, chiarezza e fermezza dolce.\n\n" +
  `Hai <b>${LIMIT_FREE} risposte gratuite</b>. Dopo, potrai continuare con il <b>Piano Premium</b>.\n` +
  "Mensile | <b>€ 5,75 / settimana</b> (–57%).";

// Upsell quando acaba o gratuito
export const CAPTION_UPSELL_HTML =
  "❌ Hai esaurito le risposte gratuite.\n\n" +
  "💗 <b>Piano Premium</b>\n" +
  "Mensile | <b>€ 5,75 / settimana</b> (–57%)\n" +
  "Ricevi fino a <b>8.000 parole al giorno</b> — ~70 pagine di dialogo profondo.";

// ===== Teclado (botão) com o link do checkout =====
export const KB_PREMIUM = {
  inline_keyboard: [
    [{ text: "✨ Attiva il Piano Premium", url: HOTMART_URL }]
  ]
};
