export const LIMIT_FREE = 3; // 3 risposte gratuite (una volta sola)
export const HOTMART_URL = process.env.HOTMART_CHECKOUT_URL;

// Benvenuta
export const MSG_START = `🌹 *Benvenuta alla Guida dell’Amore — Hadassa*  
Raccontami cosa stai vivendo (dolore, dubbi, scelte). Ti risponderò con *calore, chiarezza e fermezza dolce*.  
Hai *${LIMIT_FREE} risposte gratuite*. Dopo, potrai continuare con il *Piano Premium* (€23/mese).`;

// Upsell (limite raggiunto)
export const MSG_UPSELL = `✨ *Limite gratuito raggiunto.*  
Per continuare con risposte quotidiane e profonde, attiva ora il *Piano Premium*.

🌸 *Mensile | € 5,75 / settimana (–57%)*  
Ricevi fino a *8.000 parole/giorno* — come ~*70 pagine* di dialogo profondo con la Guida dell’Amore.

👉 Attiva qui: ${HOTMART_URL}
*(l’accesso è immediato dopo l’acquisto)*`;

// Errore “in preghiera”
export const MSG_ERROR = `💫 *Hadassa*, la tua Guida dell’Amore, è in preghiera.  
Resta un momento in silenzio e riprova tra poco… 🌹`;

// Admin / stato
export const MSG_PREMIUM_ON  = (id) => `✅ Premium attivato per *${id}*. Benvenuta nel cerchio interno.`;
export const MSG_PREMIUM_OFF = (id) => `✳️ Premium disattivato per *${id}*.`;
export const MSG_STATUS = (freeUsed, isPremium) =>
  isPremium
    ? `🌟 *Stato:* Premium attivo.`
    : `🔓 *Stato:* gratuito. Hai usato *${freeUsed}/${LIMIT_FREE}* risposte.`;
