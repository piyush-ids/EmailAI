export interface Email {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  labelIds: string[];
  attachments: {
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }[];
  // AI-augmented fields
  category?: "Support" | "Sales Inquiry" | "Complaint" | "Feedback" | "Meeting" | "Inquiry" | "Invoice/Payment" | "Spam" | "Phishing" | "General" | "Ads";
  priority?: "Urgent" | "Medium" | "Low";
  sentiment?: "Positive" | "Neutral" | "Negative";
  summary?: string;
  intent?: string;
  detectedMeeting?: boolean;
  detectedPhishing?: boolean;
  followUpSuggestion?: string;
  aiSuggestedReply?: string;
  replySent?: boolean;
  replyAction?: "sent" | "drafted";
  replyTimestamp?: string;
  // Relevance fields for automated profile auto-responder
  isRelevant?: boolean;
  relevanceReasoning?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: "new_email" | "outside_hours" | "category_match" | "priority_match" | "keyword_match";
  conditionValue: string; // e.g. "Support" or "Urgent" or a keyword like "refund"
  action: "auto_reply" | "create_draft" | "add_label" | "escalate";
  actionValue: string; // e.g. "Template A" or "Urgent Alert" or a custom response body like "We will get back to you soon regarding your refund."
  enabled: boolean;
}

export interface AIPerference {
  tone: "Professional" | "Friendly" | "Formal" | "Concise" | "Direct" | "Empathetic";
  language: string;
  customContext: string;
  signature: string;
  enableAutoReply: boolean;
  // Advanced Security & Auto-Response Options
  autoDeletePhishing: boolean;
  suppressAdsNotifications: boolean;
  userBusinessProfile: string;
  autoResponderEnabled: boolean;
  // Custom response content & templates
  customResponseRules?: string;
  aiModel?: string;
  savedQuickMessages?: Array<{ id: string; title: string; content: string }>;
  // Detailed permissions requested by the user
  analyzeEmailsEnabled?: boolean;
  detectThreatsEnabled?: boolean;
  blockAdsEnabled?: boolean;
  directDeleteEnabled?: boolean;
  autoReplyLegitimateOnly?: boolean;
  enforceCustomRulesEnabled?: boolean;
  theme?: "light" | "dark";
  // Brand details
  businessName?: string;
  brandTagline?: string;
  brandValues?: string;
  brandLogoSymbol?: string;
}
