// lib/texts.js

// Limite de mensagens grátis (uma única vez)
export const LIMIT_FREE = 3;

// Checkout Hotmart (setado em variáveis da Vercel)
export const HOTMART_URL = process.env.HOTMART_CHECKOUT_URL;

// Imagens
export const WELCOME_IMAGE_URL =
  'https://codicedellamore.com/wp-content/uploads/2025/11/Guida-dellAmore-1.jpg';
export const UPSELL_IMAGE_URL = WELCOME_IMAGE_URL;

// Mensagem inicial (vai como legenda da foto)
export const MSG_START = `🌹 *Benvenuta alla Guida dell’Amore — Hadassa*  
Raccontami cosa stai vivendo (dolore, dubbi, scelte).  
Ti risponderò con *calore, chiarezza e fermezza dolce*.  

Hai *${LIMIT_FREE} risposte gratuite*, una sola volta.

🌸 *Mensile | € 5,75 / settimana (–57%)*  
Dopo, potrai continuare con il *Piano Premium*.`;

// Upsell (limite atingido)
export const MSG_UPSELL = `✨ *Hai esaurito le risposte gratuite.*  
Per continuare con dialoghi quotidiani e profondi, attiva ora il *Piano Premium*.

🌸 *Mensile | € 5,75 / settimana (–57%)*  
Ricevi fino a *8.000 parole/giorno* (~*70 pagine* di dialogo con la Guida dell’Amore).

👉 Attiva qui: ${HOTMART_URL}  
*(accesso immediato dopo l’acquisto)*`;

// ===== Fluxo de e-mail (atenção: nomes únicos, sem duplicata) =====
export const MSG_ASK_EMAIL = `💌 *Per attivare il Premium automaticamente*, scrivi qui l’*email* usata nell’acquisto (Hotmart).`;

export const MSG_EMAIL_SAVED = (email) =>
  `📨 Email salvata: *${email}*.\nVerifico il tuo acquisto…`;

export const MSG_EMAIL_NOT_FOUND =
  `❓ Non ho trovato un acquisto approvato con questa email.\nSe hai acquistato da poco, attendi qualche minuto e riprova.\nIn caso di dubbio, inviami l’email corretta o contatta il supporto.`;

export const MSG_EMAIL_OK = (e) =>
  `✅ Email salvata: *${e}*. Se il pagamento è *APPROVATO*, il Premium si attiva subito.`;

export const MSG_EMAIL_BAD =
  `🚫 Formato email non valido. Esempio: \`/email nome@dominio.com\``;

// Mensagem de erro
export const MSG_ERROR = `💫 *Hadassa*, la tua Guida dell’Amore, è in preghiera.  
Resta un momento in silenzio e riprova tra poco… 🌹`;

// Status e admin
export const MSG_PREMIUM_ON = (id) =>
  `✅ Premium attivato per *${id}*. Benvenuta nel cerchio interno.`;
export const MSG_PREMIUM_OFF = (id) =>
  `✳️ Premium disattivato per *${id}*.`;
export const MSG_STATUS = (freeUsed, isPremium) =>
  isPremium
    ? `🌟 *Stato:* Premium attivo.`
    : `🔓 *Stato:* gratuito. Hai usato *${freeUsed}/${LIMIT_FREE}* risposte (una sola volta).`;
