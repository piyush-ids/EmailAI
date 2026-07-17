import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini client (server-side only, hiding the API key)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to clean and map model names to supported API models
function normalizeModelName(model: string): string {
  if (!model) return "gemini-3.5-flash";
  const cleanModel = model.replace(/^models\//, "");
  if (cleanModel === "gemini-3.5-pro" || cleanModel === "gemini-3.5-pro-preview") {
    return "gemini-3.1-pro-preview";
  }
  return cleanModel;
}

// Resilient helper to handle transient Gemini API errors (like 503 high demand) with automatic backup model fallback
async function generateContentWithFallback(params: any, attempt = 1, maxAttempts = 3): Promise<any> {
  const originalModel = normalizeModelName(params.model);
  
  // Decide the model chain sequence to try across attempts
  const modelChain = [originalModel, "gemini-3.1-flash-lite", "gemini-3.5-flash"];
  const currentModel = modelChain[Math.min(attempt - 1, modelChain.length - 1)];
  
  const apiParams = {
    ...params,
    model: currentModel
  };

  try {
    console.log(`[Resilience] Gemini generation attempt ${attempt}/${maxAttempts} using model: ${currentModel}`);
    return await ai.models.generateContent(apiParams);
  } catch (error: any) {
    console.warn(`[Resilience] Gemini attempt ${attempt} failed for model ${currentModel}. Error:`, error.message || error);
    
    // Extract status code/error strings safely
    let statusCode = error.status || error.statusCode || error.code;
    if (error.error && typeof error.error === 'object') {
      statusCode = statusCode || error.error.status || error.error.code;
    }
    
    // Attempt to parse JSON error message from raw error string
    if (error.message && typeof error.message === 'string') {
      try {
        const startIdx = error.message.indexOf("{");
        if (startIdx !== -1) {
          const parsed = JSON.parse(error.message.substring(startIdx));
          if (parsed && parsed.error) {
            statusCode = statusCode || parsed.error.code || parsed.error.status;
          }
        }
      } catch (e) {
        // Safe to ignore
      }
    }

    const errorStr = `${error.message || ""} ${error.stack || ""} ${String(error)} ${error.error ? JSON.stringify(error.error) : ""}`.toUpperCase();
    
    const isTransient = statusCode === 503 || statusCode === 429 || statusCode === "UNAVAILABLE" ||
                        errorStr.includes("503") || 
                        errorStr.includes("429") || 
                        errorStr.includes("UNAVAILABLE") || 
                        errorStr.includes("HIGH DEMAND") ||
                        errorStr.includes("RESOURCE_EXHAUSTED") ||
                        errorStr.includes("RATE_LIMIT") ||
                        errorStr.includes("TEMP");
                        
    if (isTransient && attempt < maxAttempts) {
      // Exponential backoff delay (e.g., 1.5s, 3s)
      const delayMs = attempt * 1500;
      console.log(`[Resilience] Transient error identified (Status: ${statusCode}). Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      return await generateContentWithFallback(params, attempt + 1, maxAttempts);
    }
    
    throw error;
  }
}

// Helper: Decode Gmail base64url format safely
function decodeBase64(data: string): string {
  if (!data) return "";
  const standardBase64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(standardBase64, "base64").toString("utf-8");
  } catch (err) {
    console.error("Base64 decoding error:", err);
    return "";
  }
}

// Helper: Recursively extract body from Gmail message payload
function getEmailBody(payload: any): string {
  if (!payload) return "";
  
  // Try to find text/html first, otherwise fallback to text/plain
  let htmlBody = "";
  let plainBody = "";

  function extract(part: any) {
    if (part.body && part.body.data) {
      const decoded = decodeBase64(part.body.data);
      if (part.mimeType === "text/html") {
        htmlBody = decoded;
      } else if (part.mimeType === "text/plain") {
        plainBody = decoded;
      }
    }
    if (part.parts && part.parts.length > 0) {
      for (const subPart of part.parts) {
        extract(subPart);
      }
    }
  }

  extract(payload);
  
  return htmlBody || plainBody || "";
}

// Helper: Extract header value
function getHeader(headers: any[], name: string): string {
  if (!headers) return "";
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : "";
}

// Helper: Parse attachments list
function getAttachments(payload: any): any[] {
  const list: any[] = [];
  function extract(part: any) {
    if (part.filename && part.body && (part.body.attachmentId || part.body.data)) {
      list.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId || "",
      });
    }
    if (part.parts && part.parts.length > 0) {
      for (const subPart of part.parts) {
        extract(subPart);
      }
    }
  }
  extract(payload);
  return list;
}

// API: Check server environment status
app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
  });
});

// API: List Gmail Labels using access token
app.get("/api/gmail/labels", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gmail labels error: ${errText}` });
    }

    const data = (await response.json()) as any;
    res.json({ labels: data.labels || [] });
  } catch (error: any) {
    console.error("Gmail labels fetch failed:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve Gmail labels" });
  }
});

// API: List & decode messages using access token from client headers
app.get("/api/gmail/messages", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    // 1. Fetch messages list (supports filtering by labelId)
    let gmailListUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15";
    const labelId = req.query.labelId as string;
    if (labelId) {
      let formattedLabelId = labelId;
      if (labelId === "inbox") formattedLabelId = "INBOX";
      else if (labelId === "sent") formattedLabelId = "SENT";
      else if (labelId === "drafts") formattedLabelId = "DRAFT";
      else if (labelId === "spam") formattedLabelId = "SPAM";
      else if (labelId === "trash") formattedLabelId = "TRASH";
      else if (labelId === "starred") formattedLabelId = "STARRED";
      else if (labelId === "important") formattedLabelId = "IMPORTANT";
      
      gmailListUrl += `&labelIds=${encodeURIComponent(formattedLabelId)}`;
    }

    const listResponse = await fetch(
      gmailListUrl,
      {
        headers: { Authorization: authHeader },
      }
    );

    if (!listResponse.ok) {
      const errText = await listResponse.text();
      return res.status(listResponse.status).json({ error: `Gmail list error: ${errText}` });
    }

    const listData = (await listResponse.json()) as any;
    const messages = listData.messages || [];

    // 2. Fetch full details for each message in parallel
    const detailsPromises = messages.map(async (msg: any) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: { Authorization: authHeader },
          }
        );
        if (!detailRes.ok) return null;
        
        const detail = (await detailRes.json()) as any;
        const headers = detail.payload?.headers || [];

        return {
          id: detail.id,
          threadId: detail.threadId,
          snippet: detail.snippet || "",
          labelIds: detail.labelIds || [],
          from: getHeader(headers, "From"),
          to: getHeader(headers, "To"),
          subject: getHeader(headers, "Subject") || "(No Subject)",
          date: getHeader(headers, "Date"),
          body: getEmailBody(detail.payload),
          attachments: getAttachments(detail.payload),
        };
      } catch (err) {
        console.error(`Error fetching detail for message ${msg.id}:`, err);
        return null;
      }
    });

    const detailedMessages = (await Promise.all(detailsPromises)).filter(Boolean);
    res.json({ messages: detailedMessages });
  } catch (error: any) {
    console.error("Gmail messages fetch failed:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve Gmail inbox" });
  }
});

// Local fallback generator when Gemini is rate-limited or offline
function getLocalFallbackReply(
  emailSubject: string, 
  emailBody: string, 
  tone: string, 
  language: string, 
  context: string, 
  signature: string,
  userBusinessProfile?: string,
  autoResponderEnabled?: boolean
) {
  let greeting = "Hello,";
  let body = "";
  let closing = `Best regards,\n${signature || "AI Email Reply Agent"}`;

  const isFrench = language?.toLowerCase().includes("french") || language?.toLowerCase().includes("fr");
  const isSpanish = language?.toLowerCase().includes("spanish") || language?.toLowerCase().includes("es");
  const isGerman = language?.toLowerCase().includes("german") || language?.toLowerCase().includes("de");

  if (isFrench) {
    greeting = "Bonjour,";
    closing = `Cordialement,\n${signature || "AI Email Reply Agent"}`;
  } else if (isSpanish) {
    greeting = "Hola,";
    closing = `Atentamente,\n${signature || "AI Email Reply Agent"}`;
  } else if (isGerman) {
    greeting = "Hallo,";
    closing = `Mit freundlichen Grüßen,\n${signature || "AI Email Reply Agent"}`;
  }

  const subjectLower = (emailSubject || "").toLowerCase();
  const bodyLower = (emailBody || "").toLowerCase();

  let category = "General";
  let priority = "Medium";
  let sentiment = "Neutral";
  let summary = "Reviewed message regarding " + (emailSubject || "general inquiry");
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
    body = `⚠️ PHISHING ALERT: This email has been flagged as a Phishing Attempt.
    
The email originates from a suspicious sender or uses high-pressure tactics to force you to click a link.

Safety Recommendation:
1. DO NOT click on any links in this email.
2. DO NOT provide any password, verification code, or billing details.
3. Block the sender address immediately and delete the email.`;
  } else if (subjectLower.includes("offer") || subjectLower.includes("newsletter") || subjectLower.includes("discount") || subjectLower.includes("subscribe") || bodyLower.includes("unsubscribe") || bodyLower.includes("special promotion") || bodyLower.includes("buy now") || bodyLower.includes("marketing")) {
    category = "Ads";
    priority = "Low";
    sentiment = "Neutral";
    summary = "Promotional advertisement or newsletter offering sales or discounts.";
    intent = "Marketing offer";
    body = "Thank you for sharing your promotion. We have suppressed standard notification alerts for this advertisement.";
  } else if (bodyLower.includes("meeting") || bodyLower.includes("schedule") || bodyLower.includes("calendar") || bodyLower.includes("zoom") || bodyLower.includes("meet") || bodyLower.includes("call")) {
    category = "Meeting";
    detectedMeeting = true;
    if (isFrench) {
      body = "Merci pour votre message. Je serais ravi de planifier une réunion avec vous. N'hésitez pas à me proposer quelques créneaux horaires qui vous conviennent.";
    } else if (isSpanish) {
      body = "Gracias por su message. Estaré encantado de programar una reunión. Por favor, indíqueme algunas opciones de fechas y horas que le convengan.";
    } else if (isGerman) {
      body = "Vielen Dank für Ihre Nachricht. Gerne vereinbare ich einen Termin mit Ihnen. Bitte teilen Sie mir einige Terminvorschläge mit, die für Sie passen.";
    } else {
      body = "Thank you for your message. I would be happy to schedule a meeting with you. Please let me know a few dates and times that work best for you.";
    }
  } else if (bodyLower.includes("invoice") || bodyLower.includes("payment") || bodyLower.includes("bill") || bodyLower.includes("receipt") || bodyLower.includes("order")) {
    category = "Invoice/Payment";
    priority = "Urgent";
    if (isFrench) {
      body = "Nous avons bien reçu votre message concernant la facture/le paiement. Notre équipe comptable examine actuellement votre dossier et vous répondra très rapidement.";
    } else if (isSpanish) {
      body = "Hemos recibido su mensaje con respecto a la factura/pago. Nuestro departamento de contabilidad está revisando los detalles y se pondrá en contacto con usted a la brevedad.";
    } else if (isGerman) {
      body = "Wir haben Ihre Nachricht bezüglich der Rechnung/Zahlung erhalten. Unsere Buchhaltung prüft dies derzeit und wird sich in Kürze bei Ihnen melden.";
    } else {
      body = "We have received your message regarding the invoice/payment/order. Our billing and support department is currently reviewing the details and will get back to you shortly.";
    }
  } else if (bodyLower.includes("support") || bodyLower.includes("issue") || bodyLower.includes("error") || bodyLower.includes("help") || bodyLower.includes("broken") || bodyLower.includes("fail")) {
    category = "Support";
    priority = "Urgent";
    if (isFrench) {
      body = "Merci d'avoir contacté notre support technique. Nous sommes désolés pour ce désagrément. Un technicien examine actuellement votre demande et vous contactera rapidement.";
    } else if (isSpanish) {
      body = "Gracias por contactar a nuestro equipo de soporte. Lamentamos las molestias. Un especialista está revisando su caso y le responderá lo antes posible.";
    } else if (isGerman) {
      body = "Vielen Dank, dass Sie sich an unseren Support gewendet haben. Bitte entschuldigen Sie die Unannehmlichkeiten. Ein Techniker prüft Ihre Anfrage und meldet sich schnellstmöglich.";
    } else {
      body = "Thank you for reaching out to our support team. We sincerely apologize for any inconvenience caused. A support specialist is reviewing your issue and will get back to you as soon as possible.";
    }
  } else if (bodyLower.includes("price") || bodyLower.includes("quote") || bodyLower.includes("buy") || bodyLower.includes("cost") || bodyLower.includes("purchase") || bodyLower.includes("bulk")) {
    category = "Sales Inquiry";
    if (isFrench) {
      body = "Merci pour votre intérêt pour nos produits. Un représentant commercial va étudier votre demande et vous transmettre nos offres et tarifs détaillés.";
    } else if (isSpanish) {
      body = "Gracias por su interés en nuestros productos. Un ejecutivo de ventas revisará su solicitud y le enviará la información de precios correspondientes.";
    } else if (isGerman) {
      body = "Vielen Dank für Ihr Interesse an unseren Produkten. Ein Vertriebsmitarbeiter wird Ihre Anfrage prüfen und Ihnen detaillierte Preisinformationen zusenden.";
    } else {
      body = "Thank you for your interest in our products. A sales representative is reviewing your inquiry and will send you detailed pricing options shortly.";
    }
  } else {
    if (isFrench) {
      body = "Merci pour votre courriel. Nous avons bien pris note de votre message et nous reviendrons vers vous dès que possible avec une réponse complète.";
    } else if (isSpanish) {
      body = "Gracias por escribirnos. Hemos recibido su message y nos pondremos en contacto con usted tan pronto como nos sea posible.";
    } else if (isGerman) {
      body = "Vielen Dank für Ihre E-Mail. Wir haben Ihre Nachricht erhalten und werden uns so schnell wie möglich bei Ihnen melden.";
    } else {
      body = "Thank you for your email. We have received your message and are reviewing it. We will get back to you with a comprehensive response as soon as possible.";
    }
  }

  // Handle tones in English
  if (!isFrench && !isSpanish && !isGerman && category !== "Phishing" && category !== "Ads") {
    if (tone === "Friendly") {
      body = "Hi there! " + body + " Hope you're having a fantastic day! Let us know if we can help with anything else.";
    } else if (tone === "Formal") {
      greeting = "Dear Sender,";
      body = "We write to acknowledge receipt of your communication. " + body + " Please accept our assurances of prompt attention.";
    } else if (tone === "Concise" || tone === "Direct") {
      body = "Thanks for your email. " + (body.split(". ")[1] || body);
    } else if (tone === "Empathetic") {
      body = "Thank you for sharing this with us. We understand this is important to you. " + body + " We are here to support you.";
    }
  }

  const finalReply = category === "Phishing" || category === "Ads" ? body : `${greeting}\n\n${body}\n\n${closing}`;

  // Evaluate fallback relevance matching against user business profile if provided
  let isRelevant = true;
  let relevanceReasoning = "Seems to be a legitimate email communication.";

  if (category === "Phishing" || category === "Spam" || category === "Ads") {
    isRelevant = false;
    relevanceReasoning = `Irrelevant: Classifed as ${category}. Suppressing automated replies for system security.`;
  } else if (autoResponderEnabled && userBusinessProfile) {
    const profileWords = userBusinessProfile.toLowerCase().split(/\W+/);
    const hasCommonKeyword = profileWords.some(word => word.length > 3 && (subjectLower.includes(word) || bodyLower.includes(word)));
    if (!hasCommonKeyword && profileWords.length > 5) {
      isRelevant = false;
      relevanceReasoning = "Irrelevant: Email keywords do not directly align with your business profile description.";
    } else {
      relevanceReasoning = "Relevant: Matches interest areas in your business profile.";
    }
  }

  return {
    reply: finalReply,
    category,
    priority,
    sentiment,
    summary,
    intent,
    detectedMeeting,
    detectedPhishing,
    followUpSuggestion: category === "Phishing" ? "Do not reply. Block sender address immediately and delete the email." : "Review email contents and respond to confirm details.",
    isRelevant,
    relevanceReasoning
  };
}

// API: Generate context-aware replies & classify using Gemini
app.post("/api/generate-reply", async (req, res) => {
  const { 
    emailSubject, 
    emailBody, 
    tone, 
    language, 
    context, 
    signature, 
    userBusinessProfile, 
    autoResponderEnabled, 
    customResponseRules, 
    aiModel,
    businessName,
    brandTagline,
    brandValues,
    brandLogoSymbol
  } = req.body;

  if (!emailBody) {
    return res.status(400).json({ error: "Missing emailBody parameter" });
  }

  // If no Gemini key is provided, use our smart offline template fallback directly
  if (!process.env.GEMINI_API_KEY) {
    const fallback = getLocalFallbackReply(emailSubject, emailBody, tone, language, context, signature, userBusinessProfile, autoResponderEnabled);
    return res.json({ ...fallback, isFallback: true });
  }

  try {
    const systemPrompt = `You are an expert full-stack AI Email Reply Agent.
Analyze the incoming email below and perform these tasks:
1. Identify the sender's intent.
2. Classify the email category. Must be one of: "Support", "Sales Inquiry", "Complaint", "Feedback", "Meeting", "Inquiry", "Invoice/Payment", "Spam", "Phishing", "Ads", or "General".
3. Assign priority: "Urgent", "Medium", or "Low". (Spam/Phishing/Ads should be Low).
4. Detect sentiment: "Positive", "Neutral", "Negative".
5. Extract a short 1-sentence summary.
6. Detect if it's a spam or phishing email (true/false).
7. Detect if it contains a meeting scheduling request (true/false).
8. Determine if this email is RELEVANT and useful/important/genuine to the user's specific business profile, branding, and goals.
   - Business Brand Name: "${businessName || "Not specified"}"
   - Brand Tagline: "${brandTagline || "Not specified"}"
   - Core Brand Values: "${brandValues || "Not specified"}"
   - User's Business Profile: "${userBusinessProfile || "Not specified"}"
   - Flag "isRelevant" as true ONLY if it is a genuine, non-fraudulent, non-spam message that directly relates to or is useful for the user's business work/ideas/offers. 
   - Flag "isRelevant" as false if it is Spam, Phishing, an unrelated Sales offer/Ad targeting the user, or totally unrelated to what the user does.
   - Provide a brief 1-sentence "relevanceReasoning" detailing why.
9. Generate a highly polished, polite, and contextual response.
   - Tone must match: "${tone || "Professional"}" (options: Professional, Friendly, Formal, Concise, Direct, Empathetic).
   - Language must be: "${language || "English"}".
   - Follow user-defined business context: "${context || "No custom business guidelines specified."}".
   - Custom reply layout and information guidelines: "${customResponseRules || "None specified. Craft standard contextual response."}"
   - Signature to append: "${signature || "AI Email Reply Agent"}".
   - If the email is Phishing, Spam, or Ads, do NOT reply directly but generate a helpful warning/alert advising not to reply or click links, and set the reply field to this warning or safe notice.

You MUST respond strictly with a valid, parseable JSON object of the following TypeScript structure:
{
  "reply": "draft reply content or warning alert",
  "category": "Support" | "Sales Inquiry" | "Complaint" | "Feedback" | "Meeting" | "Inquiry" | "Invoice/Payment" | "Spam" | "Phishing" | "Ads" | "General",
  "priority": "Urgent" | "Medium" | "Low",
  "sentiment": "Positive" | "Neutral" | "Negative",
  "summary": "1-sentence summary",
  "intent": "The sender's core request/intent",
  "detectedMeeting": boolean,
  "detectedPhishing": boolean,
  "followUpSuggestion": "Actionable follow-up suggestion",
  "isRelevant": boolean,
  "relevanceReasoning": "Why this email is relevant or irrelevant to the business profile"
}

Do NOT include any markdown code blocks (like \`\`\`json) or extra text. Output ONLY the JSON string.`;

    const promptText = `Subject: ${emailSubject || "(No Subject)"}\nContent:\n${emailBody}`;

    const result = await generateContentWithFallback({
      model: aiModel || "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\nEmail Content to Analyze:\n" + promptText }] }
      ],
    });

    const responseText = result.text?.trim() || "";
    
    // Clean potential markdown wrapped blocks
    let cleanedText = responseText;
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    try {
      const parsedAnalysis = JSON.parse(cleanedText);
      res.json(parsedAnalysis);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", cleanedText);
      // Fallback response formatting
      res.json({
        reply: responseText,
        category: "General",
        priority: "Medium",
        sentiment: "Neutral",
        summary: "Analyzed incoming email",
        intent: "General communication",
        detectedMeeting: false,
        detectedPhishing: false,
        followUpSuggestion: "Review and respond manually."
      });
    }
  } catch (error: any) {
    console.info("[Resilient Single Fallback] Gemini limits reached. Switched gracefully to high-quality local templates.");
    // Graceful fallback to the offline template generator
    const fallback = getLocalFallbackReply(emailSubject, emailBody, tone, language, context, signature);
    res.json({ ...fallback, isFallback: true, error: error.message });
  }
});

// API: Generate context-aware replies & classify a batch of emails using Gemini in a single request to avoid rate limits
app.post("/api/generate-reply-batch", async (req, res) => {
  const { 
    emails, 
    tone, 
    language, 
    context, 
    signature, 
    userBusinessProfile, 
    autoResponderEnabled, 
    customResponseRules, 
    aiModel,
    businessName,
    brandTagline,
    brandValues,
    brandLogoSymbol
  } = req.body;

  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ error: "Missing or invalid emails array parameter" });
  }

  if (emails.length === 0) {
    return res.json({ results: [] });
  }

  // If no Gemini key is provided, run the local fallback generator for each email immediately
  if (!process.env.GEMINI_API_KEY) {
    const fallbackResults = emails.map(email => ({
      id: email.id,
      ...getLocalFallbackReply(email.subject, email.body || email.snippet, tone, language, context, signature, userBusinessProfile, autoResponderEnabled),
      isFallback: true
    }));
    return res.json({ results: fallbackResults });
  }

  try {
    const systemPrompt = `You are an expert full-stack AI Email Reply Agent.
Analyze the list of incoming emails below and perform these tasks for EACH email:
1. Identify the sender's intent.
2. Classify the email category. Must be one of: "Support", "Sales Inquiry", "Complaint", "Feedback", "Meeting", "Inquiry", "Invoice/Payment", "Spam", "Phishing", "Ads", or "General".
3. Assign priority: "Urgent", "Medium", or "Low". (Spam/Phishing/Ads should be Low).
4. Detect sentiment: "Positive", "Neutral", "Negative".
5. Extract a short 1-sentence summary.
6. Detect if it's a spam or phishing email (true/false).
7. Detect if it contains a meeting scheduling request (true/false).
8. Determine if this email is RELEVANT and useful/important/genuine to the user's specific business profile, branding, and goals.
   - Business Brand Name: "${businessName || "Not specified"}"
   - Brand Tagline: "${brandTagline || "Not specified"}"
   - Core Brand Values: "${brandValues || "Not specified"}"
   - User's Business Profile: "${userBusinessProfile || "Not specified"}"
   - Set "isRelevant" as true ONLY if it is a genuine, non-fraudulent, non-spam message that directly relates to or is useful for the user's business work/ideas/offers.
   - Set "isRelevant" as false if it is Spam, Phishing, an unrelated Sales offer/Ad targeting the user, or totally unrelated to what the user does.
   - Provide a brief 1-sentence "relevanceReasoning" detailing why.
9. Generate a highly polished, polite, and contextual response.
   - Tone must match: "${tone || "Professional"}" (options: Professional, Friendly, Formal, Concise, Direct, Empathetic).
   - Language must be: "${language || "English"}".
   - Follow user-defined business context: "${context || "No custom business guidelines specified."}".
   - Custom reply layout and information guidelines: "${customResponseRules || "None specified. Craft standard contextual response."}"
   - Signature to append: "${signature || "AI Email Reply Agent"}".
   - If the email is Phishing, Spam, or Ads, do NOT reply directly but generate a helpful alert message warning why it is dangerous and advising not to reply, and set the reply field to this warning or draft a safe rejection template.

You MUST respond strictly with a valid, parseable JSON array of objects of the following TypeScript structure:
[
  {
    "id": "string representing the email ID from the input",
    "reply": "draft reply content or warning alert",
    "category": "Support" | "Sales Inquiry" | "Complaint" | "Feedback" | "Meeting" | "Inquiry" | "Invoice/Payment" | "Spam" | "Phishing" | "Ads" | "General",
    "priority": "Urgent" | "Medium" | "Low",
    "sentiment": "Positive" | "Neutral" | "Negative",
    "summary": "1-sentence summary",
    "intent": "The sender's core request/intent",
    "detectedMeeting": boolean,
    "detectedPhishing": boolean,
    "followUpSuggestion": "Actionable follow-up suggestion",
    "isRelevant": boolean,
    "relevanceReasoning": "Why this email is relevant or irrelevant to the business profile"
  }
]

Do NOT include any markdown code blocks (like \`\`\`json) or extra text. Output ONLY the JSON string representing the array.`;

    const emailsInputText = emails.map(email => `ID: ${email.id}\nSubject: ${email.subject || "(No Subject)"}\nContent: ${email.body || email.snippet}\n---`).join("\n");

    const result = await generateContentWithFallback({
      model: aiModel || "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\nEmails list to analyze:\n" + emailsInputText }] }
      ],
    });

    const responseText = result.text?.trim() || "";
    
    // Clean potential markdown wrapped blocks
    let cleanedText = responseText;
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    try {
      const parsedAnalysis = JSON.parse(cleanedText);
      res.json({ results: parsedAnalysis });
    } catch (parseErr) {
      console.info("[Resilient Batch Parse] Notice: Raw response format needed adjustment. Applying high-quality local template backups.");
      const fallbackResults = emails.map(email => ({
        id: email.id,
        ...getLocalFallbackReply(email.subject, email.body || email.snippet, tone, language, context, signature, userBusinessProfile, autoResponderEnabled),
        isFallback: true
      }));
      res.json({ results: fallbackResults });
    }
  } catch (error: any) {
    console.info("[Resilient Batch Fallback] Gemini limits reached. Switched gracefully to high-quality local templates.");
    // Graceful fallback to local generator for each email
    const fallbackResults = emails.map(email => ({
      id: email.id,
      ...getLocalFallbackReply(email.subject, email.body || email.snippet, tone, language, context, signature, userBusinessProfile, autoResponderEnabled),
      isFallback: true,
      error: error.message
    }));
    res.json({ results: fallbackResults });
  }
});

// API: Send or save reply draft via Gmail
app.post("/api/gmail/messages/:id/reply", async (req, res) => {
  const authHeader = req.headers.authorization;
  const { id } = req.params;
  const { replyBody, action, to, subject, threadId } = req.body;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    // To reply properly, Gmail requires a raw RFC822 formatted MIME message, encoded in base64url.
    // For a simple send/draft we can use the messages/send endpoint or drafts/create endpoint.
    
    // Construct the standard MIME message headers
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject || "Re:").toString("base64")}?=`;
    const mimeParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
    ];

    if (threadId) {
      mimeParts.push(`In-Reply-To: ${id}`);
      mimeParts.push(`References: ${id}`);
    }

    mimeParts.push(""); // empty line before body
    
    // Format body as HTML with linebreaks
    const formattedBody = replyBody.replace(/\n/g, "<br />");
    mimeParts.push(formattedBody);

    const rawMessage = mimeParts.join("\r\n");
    // Encode in base64url
    const base64urlEncoded = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    let gmailEndpoint = "";
    let payload: any = {};

    if (action === "draft") {
      gmailEndpoint = "https://gmail.googleapis.com/gmail/v1/users/me/drafts";
      payload = {
        message: {
          raw: base64urlEncoded,
          threadId: threadId || id,
        },
      };
    } else {
      gmailEndpoint = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
      payload = {
        raw: base64urlEncoded,
        threadId: threadId || id,
      };
    }

    const response = await fetch(gmailEndpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gmail send/draft failed: ${errText}` });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Gmail reply action failed:", error);
    res.status(500).json({ error: error.message || "Failed to perform Gmail reply action" });
  }
});

// API: Modify email labels (e.g., Mark read, Archive, Trash)
app.post("/api/gmail/messages/:id/label", async (req, res) => {
  const authHeader = req.headers.authorization;
  const { id } = req.params;
  const { addLabelIds, removeLabelIds } = req.body;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addLabelIds: addLabelIds || [],
          removeLabelIds: removeLabelIds || [],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gmail label change failed: ${errText}` });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Gmail label modification failed:", error);
    res.status(500).json({ error: error.message || "Failed to modify email labels" });
  }
});

// API: Get email attachment data
app.get("/api/gmail/messages/:messageId/attachments/:attachmentId", async (req, res) => {
  const authHeader = req.headers.authorization;
  const { messageId, attachmentId } = req.params;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gmail get attachment failed: ${errText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Gmail attachment retrieval failed:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve email attachment" });
  }
});


// API: Compose a fresh email (send or draft)
app.post("/api/gmail/compose", async (req, res) => {
  const authHeader = req.headers.authorization;
  const { to, subject, body, action } = req.body;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject || "(No Subject)").toString("base64")}?=`;
    const mimeParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      "",
      body.replace(/\n/g, "<br />")
    ];

    const rawMessage = mimeParts.join("\r\n");
    const base64urlEncoded = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    let gmailEndpoint = "";
    let payload: any = {};

    if (action === "draft") {
      gmailEndpoint = "https://gmail.googleapis.com/gmail/v1/users/me/drafts";
      payload = {
        message: {
          raw: base64urlEncoded
        }
      };
    } else {
      gmailEndpoint = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
      payload = {
        raw: base64urlEncoded
      };
    }

    const response = await fetch(gmailEndpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gmail compose failed: ${errText}` });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Gmail compose failed:", error);
    res.status(500).json({ error: error.message || "Failed to compose email" });
  }
});

// Serve static frontend files in production or hook Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
