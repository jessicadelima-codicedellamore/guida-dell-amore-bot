// lib/texts.js

// Quantas respostas gratuitas a pessoa tem antes do upsell
export const LIMIT_FREE = 3; // use 1 temporariamente se quiser testar o upsell rápido

// URL do checkout (vem do .env da Vercel)
export const HOTMART_URL = process.env.HOTMART_CHECKOUT_URL;

// Imagem de boas-vindas (HTTPS público)
export const WELCOME_IMAGE_URL =
  'https://codicedellamore.com/wp-content/uploads/2025/11/Guida-dellAmore-1.jpg';

// Mensagem /start (usada como legenda da foto)
export const MSG_START = `🌹 *Benvenuta alla Guida dell’Amore — Hadassa*  
Raccontami cosa stai vivendo (dolore, dubbi, scelte). Ti risponderò con *calore, chiarezza e fermezza dolce*.  
Hai *${LIMIT_FREE} risposte gratuite*. Dopo, potrai continuare con il *Piano Premium* (–57%).`;

// Upsell quando atinge o limite gratuito
export const MSG_UPSELL = `✨ *Limite gratuito raggiunto.*  
Per continuare con risposte quotidiane e profonde, attiva ora il *Piano Premium*.

🌸 *Mensile | € 5,75 / settimana (–57%)*  
Ricevi fino a *8.000 parole/giorno* (~*70 pagine* di dialogo con la Guida dell’Amore).

👉 Attiva qui: ${HOTMART_URL}
*(accesso immediato dopo l’acquisto)*`;

// Mensagem de erro “Hadassa in preghiera”
export const MSG_ERROR = `💫 *Hadassa*, la tua Guida dell’Amore, è in preghiera.  
Resta un momento in silenzio e riprova tra poco… 🌹`;

// Admin / stato
export const MSG_PREMIUM_ON  = (id) => `✅ Premium attivato per *${id}*. Benvenuta nel cerchio interno.`;
export const MSG_PREMIUM_OFF = (id) => `✳️ Premium disattivato per *${id}*.`;
export const MSG_STATUS = (freeUsed, isPremium) =>
  isPremium
    ? `🌟 *Stato:* Premium attivo.`
    : `🔓 *Stato:* gratuito. Hai usato *${freeUsed}/${LIMIT_FREE}* risposte.`;
