export const LIMIT_FREE = 3; // 3 respostas grátis (uma vez só)

export const HOTMART_URL = process.env.HOTMART_CHECKOUT_URL;

export const MSG_START = `🌹 *Benvenuta alla Guida dell’Amore*.
Raccontami il tuo momento (dolore, dubbi, scelte). Ti risponderò con parole di pace e chiarezza.

Hai *${LIMIT_FREE} risposte gratuite*. Dopo, potrai continuare con il *Piano Premium* (€23/mese).`;

export const MSG_UPSELL = `✨ *Limite gratuito raggiunto.*
Per continuare il tuo percorso con risposte quotidiane e profonde, attiva ora il *Piano Premium* (€23/mese).

🌸 *Mensile | € 5,75 / settimana (–57%)*  
Ricevi fino a *8.000 parole/giorno* — come *70 pagine* di dialogo profondo con la Guida dell’Amore.

👉 [Attiva qui](${HOTMART_URL})`;

export const MSG_PREMIUM_ON = (id) => `✅ Premium attivato per *${id}*. Benvenuta nel cerchio interno.`;
export const MSG_PREMIUM_OFF = (id) => `✳️ Premium disattivato per *${id}*.`;
export const MSG_STATUS = (freeUsed, isPremium) =>
  isPremium
    ? `🌟 *Stato:* Premium attivo.`
    : `🔓 *Stato:* gratuito. Hai usato *${freeUsed}/${LIMIT_FREE}* risposte.`;
