import { Email, AutomationRule, AIPerference } from "./types";

export const DEFAULT_PREFERENCES: AIPerference = {
  tone: "Professional",
  language: "English",
  customContext: "We run 'Brew & Byte', an online premium roasted-to-order coffee subscription service for software engineers.",
  signature: "Best regards,\nBrew & Byte Operations Team",
  enableAutoReply: false,
  autoDeletePhishing: true,
  suppressAdsNotifications: true,
  userBusinessProfile: "We run 'Brew & Byte', selling custom roasted coffee beans, espresso accessories, and office coffee setups for tech companies.",
  autoResponderEnabled: true,
  customResponseRules: "Introduce our company briefly, address their concern directly, provide the appropriate office link or contact details, and invite them to reach out if they have any further questions.",
  aiModel: "models/gemini-3.5-flash",
  savedQuickMessages: [
    { id: "msg_1", title: "Support Greeting", content: "Hi! Thanks for reaching out to Brew & Byte support. We've received your query and are on it!" },
    { id: "msg_2", title: "Sales Brochure Link", content: "Thanks for your interest! You can check our corporate coffee catalog here: https://brewandbyte.com/catalog.pdf" },
    { id: "msg_3", title: "Meeting Booking Link", content: "We'd love to discuss this with you. Please book a slot with our team here: https://calendly.com/brewandbyte-chat" }
  ],
  analyzeEmailsEnabled: true,
  detectThreatsEnabled: true,
  blockAdsEnabled: true,
  directDeleteEnabled: false,
  autoReplyLegitimateOnly: true,
  enforceCustomRulesEnabled: true,
  theme: "light",
  businessName: "Brew & Byte",
  brandTagline: "Premium, roasted-to-order single-origin specialty coffee subscriptions for software engineers.",
  brandValues: "Unyielding Quality, Direct Ethical Sourcing, Optimized Developer Productivity",
  brandLogoSymbol: "coffee"
};

export const INITIAL_MOCK_EMAILS: Email[] = [
  {
    id: "mock_1",
    threadId: "thread_1",
    snippet: "Hi, I ordered your dark roast beans last week, but the package hasn't arrived. Can I get a tracking update?",
    subject: "Where is my coffee order? #10943",
    from: "Alice Johnson <alice@example.com>",
    to: "support@brewandbyte.com",
    date: "Fri, Jul 3, 2026 at 10:14 AM",
    body: "Hi support team,\n\nI placed an order for 2 bags of your 'Overclocked Dark Roast' beans last Wednesday (Order #10943). It was supposed to ship in 2 days but I have not received any shipping confirmation or tracking link yet.\n\nCould you please check this for me? I'm running low on caffeine and cannot code without it!\n\nThanks,\nAlice",
    labelIds: ["INBOX", "UNREAD"],
    attachments: [],
    category: "Support",
    priority: "Urgent",
    sentiment: "Negative",
    summary: "Customer Alice Johnson is asking for a tracking update on their coffee order #10943 which hasn't arrived.",
    intent: "Track shipment of order #10943",
    detectedMeeting: false,
    detectedPhishing: false,
    followUpSuggestion: "Provide a valid tracking code and offer a discount coupon for the delay.",
    aiSuggestedReply: `Dear Alice,

Thank you for reaching out and we sincerely apologize for the delay. We know how critical premium coffee is to your coding sessions!

I have looked up your order #10943 for the 'Overclocked Dark Roast'. It has been shipped via Priority Courier yesterday and is currently on its way. Your tracking number is BB-94827-US. You should receive the delivery by tomorrow afternoon.

As a gesture of goodwill for the delay, we have credited a 15% discount code to your account for your next purchase.

If you need anything else, please let us know. Happy coding!

Best regards,
Brew & Byte Operations Team`
  },
  {
    id: "mock_2",
    threadId: "thread_2",
    snippet: "Hello! We are looking to order 50 gift baskets of your gourmet coffee for our software engineering team's summer retreat.",
    subject: "Bulk corporate inquiry for developer retreat",
    from: "Marcus Vance <marcus.v@innovatetech.io>",
    to: "sales@brewandbyte.com",
    date: "Fri, Jul 3, 2026 at 9:02 AM",
    body: "Hello Brew & Byte Team,\n\nI love your coffee branding! I am the people ops lead at InnovateTech. We have an upcoming hybrid developer retreat in August and would love to customize 50 special coffee packages to mail out to our engineers.\n\nCould we arrange a quick call next week to discuss customization options, corporate discounts, and shipping logistics?\n\nLet me know if Monday afternoon works for you.\n\nBest,\nMarcus",
    labelIds: ["INBOX", "UNREAD"],
    attachments: [
      { filename: "InnovateTech_Retreat_Logo.png", mimeType: "image/png", size: 104857, attachmentId: "att_1" }
    ],
    category: "Sales Inquiry",
    priority: "Urgent",
    sentiment: "Positive",
    summary: "Marcus Vance is requesting a bulk corporate coffee order of 50 customized gift baskets for a developer retreat.",
    intent: "Discuss bulk purchase details and schedule a phone call",
    detectedMeeting: true,
    detectedPhishing: false,
    followUpSuggestion: "Schedule a video conference using the meeting scheduler assistance.",
    aiSuggestedReply: `Dear Marcus,

Thank you for your inquiry and for your wonderful feedback about Brew & Byte! We would be absolutely thrilled to create custom corporate gift baskets for your engineering team at InnovateTech.

We can definitely accommodate custom labeling, special roasts, and single-destination or split-destination shipping.

Regarding our discussion, Monday afternoon works perfectly. Here is a link to schedule a time: [Insert Meeting Link] or let us know if 2:00 PM EST works for you.

Looking forward to fueling your retreat!

Best regards,
Brew & Byte Operations Team`
  },
  {
    id: "mock_3",
    threadId: "thread_3",
    snippet: "URGENT SAFETY ALERT: Your secure email dashboard access has been suspended due to security violations. Click below immediately...",
    subject: "SECURE ACCOUNT SUSPENDED: Verify identity now",
    from: "Security Team <alert-security-update@free-domains-auth.ru>",
    to: "piyushideasparkweb@gmail.com",
    date: "Fri, Jul 3, 2026 at 2:15 AM",
    body: "Dear Customer,\n\nYour account has been locked due to multiple failed login attempts. To recover your workspace access immediately and avoid permanent deletion of your data, you must verify your identity immediately.\n\nClick the link below to verify within 24 hours:\nhttps://free-domains-auth.ru/login/secure-verify-id=39201\n\nFailure to do so will result in complete service suspension.\n\nRegards,\nWorkspace Admin Security",
    labelIds: ["INBOX", "UNREAD"],
    attachments: [],
    category: "Phishing",
    priority: "Low",
    sentiment: "Negative",
    summary: "Phishing attempt impersonating workspace security asking the user to click a suspicious link due to account suspension.",
    intent: "Steal login credentials via fraudulent link",
    detectedMeeting: false,
    detectedPhishing: true,
    followUpSuggestion: "Do not reply. Block sender address immediately and delete the email.",
    aiSuggestedReply: `⚠️ PHISHING ALERT: This email has been flagged as a Phishing Attempt.

The email originates from a suspicious domain (free-domains-auth.ru) and uses high-pressure scare tactics ("suspend workspace access", "verify within 24 hours") to force you into clicking a suspicious URL.

Safety Recommendation:
1. DO NOT click on any links in this email.
2. DO NOT provide any password, verification code, or billing details.
3. Mark this email as Spam and report Phishing inside Gmail.`
  },
  {
    id: "mock_ads",
    threadId: "thread_4",
    snippet: "🔥 MEGA DISCOUNT: Upgrade your servers for 50% off! Get virtual private servers starting at $4/mo.",
    subject: "🔥 MEGA DISCOUNT: Upgrade your servers for 50% off!",
    from: "Cloud Promo <deals@superclouds.com>",
    to: "piyushideasparkweb@gmail.com",
    date: "Fri, Jul 3, 2026 at 4:30 PM",
    body: "Hello developer,\n\nWe are excited to offer you a massive 50% discount on all virtual private servers and database clusters for the next 48 hours!\n\nUpgrade your infrastructure today with code DEVSERVER50 and scale to infinity.\n\nClick the link to get 50% discount instantly: https://superclouds.com/promotions\n\nUnsubscribe from this newsletter at https://superclouds.com/optout\n\nCheers,\nSuperClouds Marketing Team",
    labelIds: ["INBOX", "UNREAD"],
    attachments: [],
    category: "Ads",
    priority: "Low",
    sentiment: "Positive",
    summary: "Cloud Promo is offering a 50% discount upgrade code DEVSERVER50 on cloud servers.",
    intent: "Sell cloud server subscriptions via a promo discount",
    detectedMeeting: false,
    detectedPhishing: false,
    followUpSuggestion: "Skip replying or delete. Safe promotional content.",
    aiSuggestedReply: "⚠️ ADVERTISING: This email is identified as a promotional ad. Silent filters are active."
  }
];

export const INITIAL_MOCK_RULES: AutomationRule[] = [
  {
    id: "rule_1",
    name: "Auto-Draft Sales Responses",
    trigger: "category_match",
    conditionValue: "Sales Inquiry",
    action: "create_draft",
    actionValue: "Polite response",
    enabled: true,
  },
  {
    id: "rule_2",
    name: "Spam Auto-Archiver",
    trigger: "category_match",
    conditionValue: "Spam",
    action: "add_label",
    actionValue: "TRASH",
    enabled: true,
  },
  {
    id: "rule_3",
    name: "Urgent Escalator",
    trigger: "priority_match",
    conditionValue: "Urgent",
    action: "escalate",
    actionValue: "Notify Slack/Staff",
    enabled: false,
  }
];

export function getLocalFallback(subject: string, body: string, tone: string = "Professional", language: string = "English", signature: string = "AI Email Reply Agent") {
  let greeting = "Hello,";
  let bodyText = "";
  let closing = `Best regards,\n${signature}`;

  const isFrench = language.toLowerCase().includes("french") || language.toLowerCase().includes("fr");
  const isSpanish = language.toLowerCase().includes("spanish") || language.toLowerCase().includes("es");
  const isGerman = language.toLowerCase().includes("german") || language.toLowerCase().includes("de");

  if (isFrench) {
    greeting = "Bonjour,";
    closing = `Cordialement,\n${signature}`;
  } else if (isSpanish) {
    greeting = "Hola,";
    closing = `Atentamente,\n${signature}`;
  } else if (isGerman) {
    greeting = "Hallo,";
    closing = `Mit freundlichen Grüßen,\n${signature}`;
  }

  const subjectLower = (subject || "").toLowerCase();
  const bodyLower = (body || "").toLowerCase();

  let category = "General";
  let priority = "Medium";
  let sentiment = "Neutral";
  let summary = "Reviewed message regarding " + (subject || "general inquiry");
  let intent = "General communication";
  let detectedMeeting = false;
  let detectedPhishing = false;

  // Spam/Phishing detection
  if (subjectLower.includes("suspended") || subjectLower.includes("locked") || subjectLower.includes("verify identity") || bodyLower.includes("click below") || bodyLower.includes("identity verify") || bodyLower.includes("failed login attempts") || bodyLower.includes("free-domains-auth.ru") || subjectLower.includes("phishing") || bodyLower.includes("phishing")) {
    category = "Phishing";
    priority = "Low";
    sentiment = "Negative";
    detectedPhishing = true;
    summary = "Phishing alert: suspicious message pretending to lock account or verify identity.";
    intent = "Fraudulent identity verification link";
    bodyText = `⚠️ PHISHING ALERT: This email has been flagged as a Phishing Attempt.
    
The email originates from a suspicious sender or uses high-pressure tactics to force you to click a link.

Safety Recommendation:
1. DO NOT click on any links in this email.
2. DO NOT provide any password, verification code, or billing details.
3. Block the sender address immediately and delete the email.`;
  } else if (bodyLower.includes("meeting") || bodyLower.includes("schedule") || bodyLower.includes("calendar") || bodyLower.includes("zoom") || bodyLower.includes("meet") || bodyLower.includes("call")) {
    category = "Meeting";
    detectedMeeting = true;
    if (isFrench) {
      bodyText = "Merci pour votre message. Je serais ravi de planifier une réunion avec vous. N'hésitez pas à me proposer quelques créneaux horaires qui vous conviennent.";
    } else if (isSpanish) {
      bodyText = "Gracias por su mensaje. Estaré encantado de programar una reunión. Por favor, indíqueme algunas opciones de fechas y horas que le convengan.";
    } else if (isGerman) {
      bodyText = "Vielen Dank für Ihre Nachricht. Gerne vereinbare ich einen Termin mit Ihnen. Bitte teilen Sie mir einige Terminvorschläge mit, die für Sie passen.";
    } else {
      bodyText = "Thank you for your message. I would be happy to schedule a meeting with you. Please let me know a few dates and times that work best for you.";
    }
  } else if (bodyLower.includes("invoice") || bodyLower.includes("payment") || bodyLower.includes("bill") || bodyLower.includes("receipt") || bodyLower.includes("order")) {
    category = "Invoice/Payment";
    priority = "Urgent";
    if (isFrench) {
      bodyText = "Nous avons bien reçu votre message concernant la facture/le paiement. Notre équipe comptable examine actuellement votre dossier et vous répondra très rapidement.";
    } else if (isSpanish) {
      bodyText = "Hemos recibido su mensaje con respecto a la factura/pago. Nuestro departamento de contabilidad está revisando los detalles y se pondrá en contacto con usted a la brevedad.";
    } else if (isGerman) {
      bodyText = "Wir haben Ihre Nachricht bezüglich der Rechnung/Zahlung erhalten. Unsere Buchhaltung prüft dies derzeit und wird sich in Kürze bei Ihnen melden.";
    } else {
      bodyText = "We have received your message regarding the invoice/payment/order. Our billing and support department is currently reviewing the details and will get back to you shortly.";
    }
  } else if (bodyLower.includes("support") || bodyLower.includes("issue") || bodyLower.includes("error") || bodyLower.includes("help") || bodyLower.includes("broken") || bodyLower.includes("fail")) {
    category = "Support";
    priority = "Urgent";
    if (isFrench) {
      bodyText = "Merci d'avoir contacté notre support technique. Nous sommes désolés pour ce désagrément. Un technicien examine actuellement votre demande et vous contactera rapidement.";
    } else if (isSpanish) {
      bodyText = "Gracias por contactar a nuestro equipo de soporte. Lamentamos las molestias. Un especialista está revisando su caso y le responderá lo antes posible.";
    } else if (isGerman) {
      bodyText = "Vielen Dank, dass Sie sich an unseren Support gewendet haben. Bitte entschuldigen Sie die Unannehmlichkeiten. Ein Techniker prüft Ihre Anfrage und meldet sich schnellstmöglich.";
    } else {
      bodyText = "Thank you for reaching out to our support team. We sincerely apologize for any inconvenience caused. A support specialist is reviewing your issue and will get back to you as soon as possible.";
    }
  } else if (bodyLower.includes("price") || bodyLower.includes("quote") || bodyLower.includes("buy") || bodyLower.includes("cost") || bodyLower.includes("purchase") || bodyLower.includes("bulk")) {
    category = "Sales Inquiry";
    if (isFrench) {
      bodyText = "Merci pour votre intérêt pour nos produits. Un représentant commercial va étudier votre demande et vous transmettre nos offres et tarifs détaillés.";
    } else if (isSpanish) {
      bodyText = "Gracias por su interés en nuestros productos. Un ejecutivo de ventas revisará su solicitud y le enviará la información de precios correspondientes.";
    } else if (isGerman) {
      bodyText = "Vielen Dank für Ihr Interesse an unseren Produkten. Ein Vertriebsmitarbeiter wird Ihre Anfrage prüfen und Ihnen detaillierte Preisinformationen zusenden.";
    } else {
      bodyText = "Thank you for your interest in our products. A sales representative is reviewing your inquiry and will send you detailed pricing options shortly.";
    }
  } else {
    if (isFrench) {
      bodyText = "Merci pour votre courriel. Nous avons bien pris note de votre message et nous reviendrons vers vous dès que possible avec une réponse complète.";
    } else if (isSpanish) {
      bodyText = "Gracias por escribirnos. Hemos recibido su mensaje y nos pondremos en contacto con usted tan pronto como nos sea posible.";
    } else if (isGerman) {
      bodyText = "Vielen Dank für Ihre E-Mail. Wir haben Ihre Nachricht erhalten und werden uns so schnell wie möglich bei Ihnen melden.";
    } else {
      bodyText = "Thank you for your email. We have received your message and are reviewing it. We will get back to you with a comprehensive response as soon as possible.";
    }
  }

  // Handle tones in English
  if (!isFrench && !isSpanish && !isGerman && category !== "Phishing") {
    if (tone === "Friendly") {
      bodyText = "Hi there! " + bodyText + " Hope you're having a fantastic day! Let us know if we can help with anything else.";
    } else if (tone === "Formal") {
      greeting = "Dear Sender,";
      bodyText = "We write to acknowledge receipt of your communication. " + bodyText + " Please accept our assurances of prompt attention.";
    } else if (tone === "Concise" || tone === "Direct") {
      bodyText = "Thanks for your email. " + (bodyText.split(". ")[1] || bodyText);
    } else if (tone === "Empathetic") {
      bodyText = "Thank you for sharing this with us. We understand this is important to you. " + bodyText + " We are here to support you.";
    }
  }

  const finalReply = category === "Phishing" ? bodyText : `${greeting}\n\n${bodyText}\n\n${closing}`;

  return {
    reply: finalReply,
    category: category as "Support" | "Sales Inquiry" | "Complaint" | "Feedback" | "Meeting" | "Inquiry" | "Invoice/Payment" | "Spam" | "Phishing" | "General" | "Ads",
    priority: priority as "Urgent" | "Medium" | "Low",
    sentiment: sentiment as "Positive" | "Neutral" | "Negative",
    summary,
    intent,
    detectedMeeting,
    detectedPhishing,
    followUpSuggestion: category === "Phishing" ? "Do not reply. Block sender address immediately and delete the email." : "Review email contents and respond to confirm details."
  };
}
