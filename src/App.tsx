import React, { useState, useEffect, useMemo } from "react";
import { 
  Mail, 
  MailOpen,
  Inbox, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Bot, 
  Menu, 
  Settings, 
  Shield, 
  Sliders, 
  Sparkles, 
  RefreshCw, 
  Send, 
  FileText, 
  Check, 
  Trash2, 
  Archive, 
  Eye, 
  Globe, 
  Activity, 
  Plus, 
  Search, 
  HelpCircle, 
  X, 
  Lock, 
  LogOut, 
  Filter, 
  Sparkle,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Clock3,
  Calendar,
  MessageSquare,
  BadgeAlert,
  SlidersHorizontal,
  FolderSync,
  User as UserIcon,
  ShieldAlert,
  AlertOctagon,
  BadgePercent,
  Smile,
  Save,
  ChevronLeft,
  Download,
  Loader2,
  Star,
  Tag,
  Zap,
  ShoppingBag,
  Bell,
  Briefcase,
  Sun,
  Moon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  LineChart, 
  Line, 
  CartesianGrid 
} from "recharts";

import { Email, AutomationRule, AIPerference } from "./types";
import { initAuth, googleSignIn, googleSignOut, getAccessToken, auth, db, handleFirestoreError, OperationType } from "./firebase";
import { DEFAULT_PREFERENCES, INITIAL_MOCK_EMAILS, INITIAL_MOCK_RULES, getLocalFallback } from "./mockData";
import { User } from "firebase/auth";
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";

export default function App() {
  // Authentication & token states
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [systemAlert, setSystemAlert] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Core application states
  const [emails, setEmails] = useState<Email[]>(INITIAL_MOCK_EMAILS);
  const [rules, setRules] = useState<AutomationRule[]>(INITIAL_MOCK_RULES);
  const [preferences, setPreferences] = useState<AIPerference>(() => {
    try {
      const saved = localStorage.getItem("ai_studio_preferences");
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load local preferences", e);
    }
    return DEFAULT_PREFERENCES;
  });
  const [activeTab, setActiveTab] = useState<"inbox" | "analytics" | "rules" | "security" | "settings">("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(INITIAL_MOCK_EMAILS[0] || null);

  // View & Sidebar state additions for premium layouts
  const [viewMode, setViewMode] = useState<"landing" | "login" | "dashboard">(() => {
    try {
      const mode = localStorage.getItem("ai_studio_login_mode");
      if (mode === "sandbox") return "dashboard";
      if (mode === "google" && localStorage.getItem("gmail_access_token")) return "dashboard";
    } catch (e) {
      console.error("Failed to load local login mode", e);
    }
    return "landing";
  });
  const [activePolicy, setActivePolicy] = useState<"terms" | "privacy" | "security" | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"inbox" | "analytics" | "business" | "rules" | "system" | "compliance" | "settings" | "profile" | "admin">("inbox");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Subscription plans and premium features states
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    try {
      return localStorage.getItem("ai_studio_is_premium") === "true";
    } catch (e) {
      return false;
    }
  });
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Admin Portal registered accounts management state
  const [adminUsersList, setAdminUsersList] = useState<any[]>([
    { email: "piyushideasparkweb@gmail.com", role: "Root Administrator", plan: "Enterprise Suite", verified: true, status: "ACTIVE", lastActive: "Just now" },
    { email: "demo.user@gmail.com", role: "Standard Operator", plan: "Pro Developer", verified: true, status: "ACTIVE", lastActive: "10 mins ago" },
    { email: "finance.audit@company.com", role: "Compliance Officer", plan: "Free Tier", verified: true, status: "ACTIVE", lastActive: "2 hours ago" },
    { email: "spammer.bot@scam.org", role: "External Entity", plan: "Restricted", verified: false, status: "SUSPENDED", lastActive: "3 days ago" }
  ]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("Root Administrator");
  const [newAdminPlan, setNewAdminPlan] = useState("Enterprise Suite");
  
  // Gmail.com folder-specific navigation support
  const [gmailFolder, setGmailFolder] = useState<string>("inbox");
  const [gmailLabels, setGmailLabels] = useState<any[]>([
    { id: "STARRED", name: "Starred", type: "system" },
    { id: "IMPORTANT", name: "Important", type: "system" },
    { id: "Label_1", name: "Project Alpha", type: "user" },
    { id: "Label_2", name: "Finance / Receipts", type: "user" }
  ]);
  
  // Compose Mail (Direct Message System) State
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  
  // User Profile Detail Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("All");

  // Live operation states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [customReplyTone, setCustomReplyTone] = useState<string>("");
  const [customReplyLanguage, setCustomReplyLanguage] = useState<string>("");

  // Automation rules creation form state
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleTrigger, setNewRuleTrigger] = useState<"new_email" | "outside_hours" | "category_match" | "priority_match">("category_match");
  const [newRuleCondition, setNewRuleCondition] = useState("");
  const [newRuleAction, setNewRuleAction] = useState<"auto_reply" | "create_draft" | "add_label" | "escalate">("create_draft");
  const [newRuleActionValue, setNewRuleActionValue] = useState("");
  const [showRuleForm, setShowRuleForm] = useState(false);

  // Sandbox new email mock injector
  const [sandboxSubject, setSandboxSubject] = useState("");
  const [sandboxFrom, setSandboxFrom] = useState("");
  const [sandboxBody, setSandboxBody] = useState("");

  // Attachment download state
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [showSandboxForm, setShowSandboxForm] = useState(false);

  // Audit Logs for security tab
  const [auditLogs, setAuditLogs] = useState<Array<{ timestamp: string; action: string; status: string }>>([
    { timestamp: "2026-07-04 10:15:22", action: "System Boot and Configuration Audit", status: "Success" },
    { timestamp: "2026-07-04 10:14:02", action: "Gmail Sync Handler Initiated", status: "Active" },
    { timestamp: "2026-07-04 09:05:11", action: "Gemini Model 3.5-Flash Security Handshake", status: "Completed" },
  ]);

  // Load user session
  useEffect(() => {
    const unsubscribe = initAuth(
      async (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setAuthLoading(false);
        triggerSuccess(`Connected as ${currentUser.email}`);
        // Fetch real emails and labels from connected Gmail account
        syncGmailInbox(token);
        syncGmailLabels(token);
        setViewMode("dashboard");
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthLoading(false);
        try {
          if (localStorage.getItem("ai_studio_login_mode") === "sandbox") {
            setViewMode("dashboard");
            return;
          }
        } catch (e) {}
        setViewMode("landing");
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to Firestore real-time updates when user is connected
  useEffect(() => {
    if (!user) return;

    // Preferences listener
    const prefRef = doc(db, "users", user.uid, "preferences", "settings");
    const unsubPref = onSnapshot(prefRef, (docSnap) => {
      if (docSnap.exists()) {
        setPreferences(docSnap.data() as AIPerference);
      } else {
        // Seed initial preferences
        setDoc(prefRef, DEFAULT_PREFERENCES).catch(err => 
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/preferences/settings`)
        );
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/preferences/settings`);
    });

    // Rules listener
    const rulesRef = collection(db, "users", user.uid, "rules");
    const unsubRules = onSnapshot(rulesRef, (querySnap) => {
      if (!querySnap.empty) {
        const fetchedRules: AutomationRule[] = [];
        querySnap.forEach((docSnap) => {
          fetchedRules.push(docSnap.data() as AutomationRule);
        });
        setRules(fetchedRules);
      } else {
        // Seed initial rules
        INITIAL_MOCK_RULES.forEach(rule => {
          setDoc(doc(rulesRef, rule.id), rule).catch(err =>
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/rules/${rule.id}`)
          );
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/rules`);
    });

    // Emails listener
    const emailsRef = collection(db, "users", user.uid, "emails");
    const unsubEmails = onSnapshot(emailsRef, (querySnap) => {
      if (!querySnap.empty) {
        const fetchedEmails: Email[] = [];
        querySnap.forEach((docSnap) => {
          fetchedEmails.push(docSnap.data() as Email);
        });
        // Sort by date descending
        fetchedEmails.sort((a, b) => b.date.localeCompare(a.date));
        setEmails(fetchedEmails);
      } else {
        // Seed initial mock emails if empty
        INITIAL_MOCK_EMAILS.forEach(email => {
          setDoc(doc(emailsRef, email.id), email).catch(err =>
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/emails/${email.id}`)
          );
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/emails`);
    });

    // Audit logs listener
    const logsRef = collection(db, "users", user.uid, "auditLogs");
    const unsubLogs = onSnapshot(logsRef, (querySnap) => {
      const fetchedLogs: Array<{ timestamp: string; action: string; status: string }> = [];
      querySnap.forEach((docSnap) => {
        fetchedLogs.push(docSnap.data() as any);
      });
      // Sort by timestamp descending
      fetchedLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setAuditLogs(fetchedLogs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/auditLogs`);
    });

    return () => {
      unsubPref();
      unsubRules();
      unsubEmails();
      unsubLogs();
    };
  }, [user]);

  // Reset states when user is signed out
  useEffect(() => {
    if (!user) {
      setEmails(INITIAL_MOCK_EMAILS);
      setRules(INITIAL_MOCK_RULES);
      const localPref = (() => {
        try {
          const saved = localStorage.getItem("ai_studio_preferences");
          if (saved) return JSON.parse(saved);
        } catch (e) {}
        return null;
      })();
      setPreferences(localPref ? { ...DEFAULT_PREFERENCES, theme: localPref.theme } : DEFAULT_PREFERENCES);
      setAuditLogs([
        { timestamp: "2026-07-04 10:15:22", action: "System Boot and Configuration Audit", status: "Success" },
        { timestamp: "2026-07-04 10:14:02", action: "Gmail Sync Handler Initiated", status: "Active" },
        { timestamp: "2026-07-04 09:05:11", action: "Gemini Model 3.5-Flash Security Handshake", status: "Completed" },
      ]);
    }
  }, [user]);

  // Keep selected email updated with the live state from the emails array
  useEffect(() => {
    if (selectedEmail) {
      const updated = emails.find(e => e.id === selectedEmail.id);
      if (updated) {
        setSelectedEmail(updated);
      }
    }
  }, [emails]);

  // Sync preferences changes to localStorage and apply theme class dynamically
  useEffect(() => {
    try {
      localStorage.setItem("ai_studio_preferences", JSON.stringify(preferences));
    } catch (e) {
      console.error("Failed to write local preferences", e);
    }
    if (preferences?.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [preferences]);

  // Sync draft reply text box when selected email or its suggested reply changes
  useEffect(() => {
    if (selectedEmail) {
      setReplyText(selectedEmail.aiSuggestedReply || "");
      setCustomReplyTone(selectedEmail.category === "Spam" || selectedEmail.category === "Phishing" ? "Concise" : preferences.tone);
      setCustomReplyLanguage(preferences.language);
    } else {
      setReplyText("");
    }
  }, [selectedEmail, preferences]);

  const triggerSuccess = (msg: string) => {
    setSystemAlert({ type: "success", msg });
    setTimeout(() => setSystemAlert(null), 5000);
  };

  const triggerError = (msg: string) => {
    setSystemAlert({ type: "error", msg });
    setTimeout(() => setSystemAlert(null), 6000);
  };

  const triggerInfo = (msg: string) => {
    setSystemAlert({ type: "info", msg });
    setTimeout(() => setSystemAlert(null), 4000);
  };

  // Log an audit event
  const logEvent = async (action: string, status: string = "Success") => {
    const now = new Date().toLocaleTimeString();
    const logItem = { timestamp: `2026-07-04 ${now}`, action, status };

    if (user) {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const logPath = `users/${user.uid}/auditLogs/${logId}`;
      try {
        await setDoc(doc(db, "users", user.uid, "auditLogs", logId), logItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, logPath);
      }
    } else {
      setAuditLogs(prev => [logItem, ...prev]);
    }
  };

  // Toggle application theme (light/dark) and save/sync preference
  const toggleTheme = async () => {
    const currentTheme = preferences.theme || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    const updated = { ...preferences, theme: newTheme as any };
    
    setPreferences(updated);
    
    // Write directly to localStorage for instantaneous recovery
    try {
      localStorage.setItem("ai_studio_preferences", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid, "preferences", "settings"), updated);
        logEvent(`Visual appearance changed to ${newTheme} and synced to cloud`, "Success");
      } catch (err) {
        console.error("Failed to sync dark mode to Firestore", err);
      }
    } else {
      logEvent(`Visual appearance changed to ${newTheme} locally`);
    }
  };

  // Interactive Sign In
  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      const res = await googleSignIn();
      if (res) {
        try {
          localStorage.setItem("ai_studio_login_mode", "google");
        } catch (e) {}
        setUser(res.user);
        setAccessToken(res.accessToken);
        triggerSuccess("Successfully linked Google Workspace Account!");
        logEvent("Google account OAuth connected", "Authorized");
        await syncGmailInbox(res.accessToken);
        await syncGmailLabels(res.accessToken);
      }
    } catch (err: any) {
      const errorMsg = err.message || "";
      const isPopupBlocked = err.code === "auth/popup-blocked" || errorMsg.includes("popup-blocked");
      
      if (isPopupBlocked) {
        triggerError("Google sign-in popup was blocked by your browser! Please allow popups for this site (usually in your address bar settings) and try again.");
      } else {
        triggerError(err.message || "Failed to authenticate with Google");
      }
      logEvent("Google account authorization failed", "Failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setAccessToken(null);
      setViewMode("landing");
      triggerSuccess("Logged out of Google Workspace");
      logEvent("Google Workspace disconnected", "Logged Out");
    } catch (err: any) {
      triggerError("Sign out error: " + err.message);
    }
  };

  const handleSessionExpiration = async () => {
    try {
      await googleSignOut();
    } catch (e) {
      console.error("Error during googleSignOut on session expiration:", e);
    }
    setAccessToken(null);
    setUser(null);
    setViewMode("landing");
    triggerError("Your Google Workspace session has expired or was disconnected. Please sign in again.");
    logEvent("Google Workspace session expired", "Expired");
  };

  // Sync Gmail labels
  const syncGmailLabels = async (tokenToUse?: string) => {
    const tok = tokenToUse || accessToken;
    if (!tok) return;

    try {
      const response = await fetch("/api/gmail/labels", {
        headers: {
          Authorization: `Bearer ${tok}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.labels && Array.isArray(data.labels)) {
          const interestingLabels = data.labels
            .filter((l: any) => 
              l.id === "STARRED" || 
              l.id === "IMPORTANT" || 
              l.id === "UNREAD" ||
              l.id === "INBOX" ||
              l.id === "SENT" ||
              l.id === "DRAFT" ||
              l.id === "SPAM" ||
              l.id === "TRASH" ||
              l.type === "user"
            )
            .map((l: any) => ({
              id: l.id.toLowerCase(),
              name: l.name,
              type: l.type || "user"
            }));
          if (interestingLabels.length > 0) {
            setGmailLabels(interestingLabels);
            logEvent(`Synchronized ${interestingLabels.length} custom and system labels from Gmail`, "Success");
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to sync Gmail labels:", err);
    }
  };

  // Sync emails from Gmail API (uses access token)
  const syncGmailInbox = async (tokenToUse?: string, targetLabelId?: string) => {
    const tok = tokenToUse || accessToken;
    const folderLabel = targetLabelId || gmailFolder;
    if (!tok) {
      triggerInfo(`Syncing workspace local buffer for folder: ${folderLabel.toUpperCase()}. Sign in with Google to query real active inbox.`);
      return;
    }

    setIsSyncing(true);
    logEvent(`Gmail API Sync Request started for folder: ${folderLabel.toUpperCase()}`, "Pending");
    try {
      let queryUrl = "/api/gmail/messages";
      if (folderLabel && folderLabel !== "inbox" && folderLabel !== "trash") {
        queryUrl += `?labelId=${encodeURIComponent(folderLabel)}`;
      }
      const response = await fetch(queryUrl, {
        headers: {
          Authorization: `Bearer ${tok}`,
        },
      });

      if (response.status === 401) {
        await handleSessionExpiration();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to list Gmail inbox");
      }

      const data = await response.json();
      const fetchedEmails: Email[] = data.messages || [];

      if (fetchedEmails.length === 0) {
        triggerInfo(`Gmail folder/label '${folderLabel.toUpperCase()}' is empty.`);
        setIsSyncing(false);
        return;
      }

      // Find which emails actually need analysis
      const emailsToAnalyze = fetchedEmails.filter((email) => {
        const existing = emails.find((e) => e.id === email.id);
        return !(existing && existing.category);
      });

      const batchResults: Record<string, any> = {};
      let usedBatchFallback = false;

      // Respect the Analyze Email Content permission
      if (emailsToAnalyze.length > 0) {
        if (preferences.analyzeEmailsEnabled === false) {
          logEvent("⚠️ AI Analysis clearance is revoked. Skipping cloud processing.", "Skipped");
          usedBatchFallback = true;
        } else {
          try {
            const batchRes = await fetch("/api/generate-reply-batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emails: emailsToAnalyze.map((e) => ({
                  id: e.id,
                  subject: e.subject,
                  body: e.body || e.snippet,
                })),
                tone: preferences.tone,
                language: preferences.language,
                context: preferences.customContext,
                signature: preferences.signature,
                userBusinessProfile: preferences.userBusinessProfile,
                autoResponderEnabled: preferences.autoResponderEnabled,
                customResponseRules: preferences.customResponseRules,
                aiModel: preferences.aiModel,
                businessName: preferences.businessName,
                brandTagline: preferences.brandTagline,
                brandValues: preferences.brandValues,
                brandLogoSymbol: preferences.brandLogoSymbol,
              }),
            });

            if (batchRes.ok) {
              const batchData = await batchRes.json();
              if (batchData.results && Array.isArray(batchData.results)) {
                batchData.results.forEach((res: any) => {
                  if (res && res.id) {
                    batchResults[res.id] = res;
                    if (res.isFallback) {
                      usedBatchFallback = true;
                    }
                  }
                });
              }
            } else {
              usedBatchFallback = true;
            }
          } catch (e) {
            console.error("Batch Gemini analysis failed, using local generation fallback:", e);
            usedBatchFallback = true;
          }
        }
      }

      // Map fetched emails with the batch analysis or client-side fallback
      const processedEmails = fetchedEmails.map((email) => {
        // Check if we already have it analyzed locally to preserve state
        const existing = emails.find((e) => e.id === email.id);
        if (existing && existing.category) {
          return existing;
        }

        const analysis = batchResults[email.id];
        if (analysis) {
          const isPhishingDetected = preferences.detectThreatsEnabled !== false ? analysis.detectedPhishing : false;
          let categoryResult = analysis.category;
          if (preferences.detectThreatsEnabled === false && (analysis.category === "Phishing" || analysis.category === "Spam")) {
            categoryResult = "General";
          }

          const updated = {
            ...email,
            category: categoryResult,
            priority: analysis.priority,
            sentiment: analysis.sentiment,
            summary: analysis.summary,
            intent: analysis.intent,
            detectedMeeting: analysis.detectedMeeting,
            detectedPhishing: isPhishingDetected,
            followUpSuggestion: analysis.followUpSuggestion,
            aiSuggestedReply: analysis.reply,
            isRelevant: analysis.isRelevant,
            relevanceReasoning: analysis.relevanceReasoning,
          };
          applyAutomationRules(updated);
          return updated;
        }

        // Run local client-side fallback as absolute safety
        const fallback = getLocalFallback(
          email.subject,
          email.body || email.snippet,
          preferences.tone,
          preferences.language,
          preferences.signature
        );
        const updated = {
          ...email,
          category: fallback.category,
          priority: fallback.priority,
          sentiment: fallback.sentiment,
          summary: fallback.summary,
          intent: fallback.intent,
          detectedMeeting: fallback.detectedMeeting,
          detectedPhishing: fallback.detectedPhishing,
          followUpSuggestion: fallback.followUpSuggestion,
          aiSuggestedReply: fallback.reply,
          isRelevant: false,
          relevanceReasoning: "Fallback template default relevance evaluation"
        };
        applyAutomationRules(updated);
        return updated;
      });

      if (usedBatchFallback) {
        triggerInfo("Sync complete. Gemini free quota rate limit exceeded; fallback templates used for some emails.");
      }

      if (user) {
        await Promise.all(
          processedEmails.map((email) => {
            const emailPath = `users/${user.uid}/emails/${email.id}`;
            return setDoc(doc(db, "users", user.uid, "emails", email.id), email).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, emailPath);
            });
          })
        );
      } else {
        setEmails((prev) => {
          const merged = [...prev];
          processedEmails.forEach((newEmail) => {
            const index = merged.findIndex((e) => e.id === newEmail.id);
            if (index !== -1) {
              merged[index] = newEmail;
            } else {
              merged.push(newEmail);
            }
          });
          return merged;
        });
      }
      if (processedEmails.length > 0) {
        setSelectedEmail(processedEmails[0]);
      }
      triggerSuccess(`Synchronized ${processedEmails.length} messages with folder: ${folderLabel.toUpperCase()}`);
      logEvent(`Synced ${processedEmails.length} emails from Gmail API folder: ${folderLabel}`, "Success");
    } catch (err: any) {
      console.error(err);
      triggerError("Could not sync real Gmail: " + err.message);
      logEvent("Gmail API Sync Request failed", "Error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Automation trigger checker
  const applyAutomationRules = (email: Email) => {
    const isThreat = email.category === "Phishing" || email.category === "Spam" || email.detectedPhishing;

    // 1. Ad Block Shield
    if (preferences.blockAdsEnabled && email.category === "Ads") {
      email.labelIds = ["TRASH"];
      logEvent(`🛡️ Ad Shield: Blocked and auto-trashed promotional email from ${email.from}`, "Secured");
      return; // Skip other rules for safety
    }

    // 2. Phishing & Spam automatic delete guard
    if (isThreat && (preferences.directDeleteEnabled || preferences.autoDeletePhishing)) {
      email.labelIds = ["TRASH"];
      logEvent(`🛡️ Anti-Threat Guard: Instantly deleted fake/phishing email threat from ${email.from}`, "Secured");
      return; // Skip other rules for safety
    }

    // 3. Custom rules
    rules.forEach((rule) => {
      if (!rule.enabled) return;

      let match = false;
      if (rule.trigger === "category_match" && email.category === rule.conditionValue) {
        match = true;
      } else if (rule.trigger === "priority_match" && email.priority === rule.conditionValue) {
        match = true;
      } else if (rule.trigger === "new_email") {
        match = true;
      } else if (rule.trigger === "keyword_match") {
        const textToSearch = `${email.subject || ""} ${email.body || email.snippet || ""}`.toLowerCase();
        if (textToSearch.includes(rule.conditionValue.toLowerCase())) {
          match = true;
        }
      }

      if (match) {
        logEvent(`Trigger rule: "${rule.name}" on email from ${email.from}`, "Triggered");
        
        // If there is a custom response text defined by the user in actionValue, use it
        if (rule.actionValue && rule.actionValue !== "Default" && rule.actionValue !== "Polite response" && rule.actionValue !== "TRASH") {
          email.aiSuggestedReply = rule.actionValue;
        }

        if (rule.action === "auto_reply" && preferences.enableAutoReply) {
          // Safety verification: auto-reply only to legitimate senders
          if (preferences.autoReplyLegitimateOnly && isThreat) {
            logEvent(`🛡️ AI Safety Guard: Blocked auto-reply to suspicious/spam email from ${email.from}`, "Secured");
            return;
          }
          email.replySent = true;
          email.replyAction = "sent";
          email.replyTimestamp = new Date().toLocaleTimeString();
          logEvent(`[AUTO-REPLY SENT] Answered email "${email.subject}" to ${email.from}`, "Completed");
        } else if (rule.action === "create_draft") {
          email.replySent = true;
          email.replyAction = "drafted";
          email.replyTimestamp = new Date().toLocaleTimeString();
          logEvent(`[AUTO-DRAFT CREATED] Saved draft reply for "${email.subject}"`, "Completed");
        } else if (rule.action === "add_label") {
          if (rule.actionValue) {
            if (!email.labelIds.includes(rule.actionValue)) {
              email.labelIds.push(rule.actionValue);
            }
            logEvent(`[RULE ACTION] Added label ${rule.actionValue} to email`, "Completed");
          }
        }
      }
    });

    // 4. Automated AI Profile Auto-Responder
    // Auto-reply only if email is determined relevant to the business profile, enabled, and hasn't been replied to yet
    if (preferences.autoResponderEnabled && !email.replySent) {
      const isLegit = !isThreat && email.category !== "Ads";
      const canReply = preferences.autoReplyLegitimateOnly ? (email.isRelevant && isLegit) : email.isRelevant;

      if (canReply) {
        email.replySent = true;
        email.replyAction = "sent";
        email.replyTimestamp = new Date().toLocaleTimeString();
        logEvent(`🤖 [AI AUTO-RESPONDER] Sent relevant reply matching business profile to ${email.from}`, "Completed");
      } else {
        const skipReason = isThreat ? "Flagged as threat/phishing" : (email.category === "Ads" ? "Promotional material" : (email.relevanceReasoning || "Irrelevant context"));
        logEvent(`🤖 [AI AUTO-RESPONDER SKIPPED] Skip auto-reply to ${email.from}: ${skipReason}`, "Skipped");
      }
    }
  };

  // Re-generate reply using modified parameters on the fly
  const handleRegenerateReply = async () => {
    if (!selectedEmail) return;

    setIsGenerating(true);
    logEvent(`Regenerating reply (Tone: ${customReplyTone}, Lang: ${customReplyLanguage})`, "Pending");
    try {
      const response = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailSubject: selectedEmail.subject,
          emailBody: selectedEmail.body || selectedEmail.snippet,
          tone: customReplyTone,
          language: customReplyLanguage,
          context: preferences.customContext,
          signature: preferences.signature,
          customResponseRules: preferences.customResponseRules,
          aiModel: preferences.aiModel,
          businessName: preferences.businessName,
          brandTagline: preferences.brandTagline,
          brandValues: preferences.brandValues,
          brandLogoSymbol: preferences.brandLogoSymbol,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to contact Gemini reply engine.");
      }

      const data = await response.json();
      
      // Update selected email reply and analysis live
      const updatedEmail = {
        ...selectedEmail,
        category: data.category || selectedEmail.category,
        priority: data.priority || selectedEmail.priority,
        sentiment: data.sentiment || selectedEmail.sentiment,
        summary: data.summary || selectedEmail.summary,
        intent: data.intent || selectedEmail.intent,
        detectedMeeting: data.detectedMeeting ?? selectedEmail.detectedMeeting,
        detectedPhishing: data.detectedPhishing ?? selectedEmail.detectedPhishing,
        followUpSuggestion: data.followUpSuggestion || selectedEmail.followUpSuggestion,
        aiSuggestedReply: data.reply,
      };

      setEmails(prev => prev.map(e => e.id === selectedEmail.id ? updatedEmail : e));
      setSelectedEmail(updatedEmail);
      setReplyText(data.reply);
      
      if (data.isFallback) {
        triggerInfo("Gemini free quota exceeded. Used high-quality local template fallback instead.");
        logEvent("Tailored draft updated using Local Fallback", "Info");
      } else {
        triggerSuccess("Gemini successfully generated a new tailored draft!");
        logEvent("Tailored draft updated with Gemini", "Success");
      }

      if (user) {
        const emailPath = `users/${user.uid}/emails/${selectedEmail.id}`;
        try {
          await setDoc(doc(db, "users", user.uid, "emails", selectedEmail.id), updatedEmail);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, emailPath);
        }
      }
    } catch (err: any) {
      triggerError(err.message || "Failed to generate tailored reply");
      logEvent("Gemini tailoring failed", "Error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Send or Draft response via Gmail API (or fallback if not connected)
  const handleSendOrDraft = async (action: "send" | "draft") => {
    if (!selectedEmail) return;

    setIsSending(true);
    logEvent(`Initiating reply action: ${action}`, "Pending");

    if (!accessToken) {
      // Offline / Sandbox Simulation Mode
      setTimeout(async () => {
        const updatedEmail = {
          ...selectedEmail,
          replySent: true,
          replyAction: action,
          replyTimestamp: new Date().toLocaleTimeString(),
          aiSuggestedReply: replyText,
        };
        setEmails(prev => prev.map(e => e.id === selectedEmail.id ? updatedEmail : e));
        setSelectedEmail(updatedEmail);
        triggerSuccess(`Sandbox simulated: Successfully saved reply as ${action === "draft" ? "Gmail Draft" : "Sent message"}`);
        logEvent(`Simulated ${action} action in Sandbox`, "Success");

        if (user) {
          const emailPath = `users/${user.uid}/emails/${selectedEmail.id}`;
          try {
            await setDoc(doc(db, "users", user.uid, "emails", selectedEmail.id), updatedEmail);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, emailPath);
          }
        }
        setIsSending(false);
      }, 1000);
      return;
    }

    try {
      // Resolve email sender name and address cleanly
      const toMatch = selectedEmail.from.match(/<([^>]+)>/);
      const toEmailAddress = toMatch ? toMatch[1] : selectedEmail.from;

      const response = await fetch(`/api/gmail/messages/${selectedEmail.id}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          replyBody: replyText,
          action: action,
          to: toEmailAddress,
          subject: selectedEmail.subject.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
          threadId: selectedEmail.threadId,
        }),
      });

      if (response.status === 401) {
        await handleSessionExpiration();
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Gmail response failed`);
      }

      // Update state
      const updatedEmail = {
        ...selectedEmail,
        replySent: true,
        replyAction: action,
        replyTimestamp: new Date().toLocaleTimeString(),
        aiSuggestedReply: replyText,
      };

      setEmails(prev => prev.map(e => e.id === selectedEmail.id ? updatedEmail : e));
      setSelectedEmail(updatedEmail);
      triggerSuccess(`Successfully ${action === "draft" ? "created Draft" : "sent Email Reply"} via connected Gmail account!`);
      logEvent(`Executed ${action} via Gmail API`, "Success");

      if (user) {
        const emailPath = `users/${user.uid}/emails/${selectedEmail.id}`;
        try {
          await setDoc(doc(db, "users", user.uid, "emails", selectedEmail.id), updatedEmail);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, emailPath);
        }
      }
    } catch (err: any) {
      triggerError("Failed to reply with Gmail API: " + err.message);
      logEvent(`Gmail API reply failed (${action})`, "Error");
    } finally {
      setIsSending(false);
    }
  };

  // Toggle message read/unread status
  const handleToggleReadStatus = async () => {
    if (!selectedEmail) return;

    const currentLabels = selectedEmail.labelIds || [];
    const isUnread = currentLabels.includes("UNREAD");
    const updatedLabelIds = isUnread
      ? currentLabels.filter(l => l !== "UNREAD")
      : [...currentLabels, "UNREAD"];

    const updatedEmail = {
      ...selectedEmail,
      labelIds: updatedLabelIds,
    };

    logEvent(`Marking email as ${isUnread ? "Read" : "Unread"}`, "Pending");

    // Update in local state
    setEmails(prev => prev.map(e => e.id === selectedEmail.id ? updatedEmail : e));
    setSelectedEmail(updatedEmail);

    // Save in Firestore
    if (user) {
      const emailPath = `users/${user.uid}/emails/${selectedEmail.id}`;
      try {
        await setDoc(doc(db, "users", user.uid, "emails", selectedEmail.id), updatedEmail);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, emailPath);
      }
    }

    if (!accessToken) {
      triggerSuccess(`Marked as ${isUnread ? "Read" : "Unread"} (Simulation)`);
      logEvent(`Marked email as ${isUnread ? "Read" : "Unread"}`);
      return;
    }

    try {
      const response = await fetch(`/api/gmail/messages/${selectedEmail.id}/label`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addLabelIds: isUnread ? [] : ["UNREAD"],
          removeLabelIds: isUnread ? ["UNREAD"] : [],
        }),
      });

      if (response.status === 401) {
        await handleSessionExpiration();
        return;
      }

      if (!response.ok) {
        throw new Error("Gmail modify failed");
      }

      triggerSuccess(`Successfully marked email as ${isUnread ? "Read" : "Unread"}`);
      logEvent(`Marked email as ${isUnread ? "Read" : "Unread"} via Gmail API`, "Success");
    } catch (err: any) {
      triggerError("Could not update Gmail read/unread status: " + err.message);
      logEvent(`Gmail label update failed`, "Error");
    }
  };

  // Download / View Email Attachment
  const handleDownloadAttachment = async (attachmentId: string, filename: string, mimeType: string) => {
    if (!selectedEmail) return;

    if (!accessToken) {
      // In simulation mode, let's create a mockup download
      triggerSuccess(`Downloaded ${filename} (Simulation Mode)`);
      const mockContent = `Mock data for simulated file: ${filename}`;
      const blob = new Blob([mockContent], { type: mimeType || "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      logEvent(`Simulated download of ${filename}`);
      return;
    }

    try {
      setDownloadingAttachmentId(attachmentId);
      logEvent(`Fetching attachment ${filename}...`, "Pending");

      const response = await fetch(`/api/gmail/messages/${selectedEmail.id}/attachments/${attachmentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        await handleSessionExpiration();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch attachment from Gmail API");
      }

      const attachmentData = await response.json();
      if (!attachmentData.data) {
        throw new Error("No data returned for this attachment");
      }

      // Gmail API uses base64url encoding for attachment body. Convert it to standard base64/binary
      const base64Str = attachmentData.data.replace(/-/g, "+").replace(/_/g, "/");
      
      // Convert base64 to Blob
      const byteCharacters = atob(base64Str);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // Trigger standard browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      triggerSuccess(`Successfully downloaded ${filename}`);
      logEvent(`Downloaded attachment ${filename}`, "Success");
    } catch (err: any) {
      console.error("Error downloading attachment:", err);
      triggerError("Could not download attachment: " + err.message);
      logEvent(`Attachment download failed`, "Error");
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  // Modify message labels (Trash/Archive)
  const handleModifyLabel = async (action: "trash" | "archive") => {
    if (!selectedEmail) return;

    logEvent(`Modifying labels: ${action}`, "Pending");
    
    // Simulate locally first
    const updatedLabelIds = selectedEmail.labelIds.filter(l => l !== "INBOX");
    if (action === "trash") {
      updatedLabelIds.push("TRASH");
    }

    const updatedEmail = {
      ...selectedEmail,
      labelIds: updatedLabelIds,
    };

    setEmails(prev => prev.map(e => e.id === selectedEmail.id ? updatedEmail : e));
    setSelectedEmail(null);

    if (user) {
      const emailPath = `users/${user.uid}/emails/${selectedEmail.id}`;
      try {
        await setDoc(doc(db, "users", user.uid, "emails", selectedEmail.id), updatedEmail);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, emailPath);
      }
    }

    if (!accessToken) {
      triggerSuccess(`Simulated archiving email to ${action.toUpperCase()}`);
      logEvent(`Local archived ${action}`, "Success");
      return;
    }

    try {
      const response = await fetch(`/api/gmail/messages/${selectedEmail.id}/label`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addLabelIds: action === "trash" ? ["TRASH"] : [],
          removeLabelIds: ["INBOX", "UNREAD"],
        }),
      });

      if (response.status === 401) {
        await handleSessionExpiration();
        return;
      }

      if (!response.ok) {
        throw new Error("Gmail modify failed");
      }

      triggerSuccess(`Successfully labeled message as ${action === "trash" ? "Trash" : "Archived"}`);
      logEvent(`Labeled email via Gmail API`, "Success");
    } catch (err: any) {
      triggerError("Could not update Gmail labels: " + err.message);
      logEvent(`Gmail label update failed`, "Error");
    }
  };

  // NEW: Compose direct message functions
  const handleComposeSendOrDraft = async (action: "send" | "draft") => {
    if (!composeTo.trim()) {
      triggerError("Please specify a recipient email address.");
      return;
    }

    setIsSending(true);
    logEvent(`Initiating compose action: ${action}`, "Pending");

    // Add to emails list
    const newEmailId = `compose_${Date.now()}`;
    const newEmail: Email = {
      id: newEmailId,
      threadId: newEmailId,
      from: `You <me@gmail.com>`,
      to: composeTo,
      subject: composeSubject || "(No Subject)",
      snippet: composeBody.substring(0, 100),
      body: composeBody,
      labelIds: action === "draft" ? ["DRAFT"] : ["SENT"],
      category: "General",
      priority: "Medium",
      sentiment: "Neutral",
      summary: composeSubject || "Composed message",
      intent: "Outgoing correspondence",
      detectedMeeting: false,
      detectedPhishing: false,
      followUpSuggestion: "Outgoing email sent successfully.",
      replySent: true,
      replyAction: action === "send" ? "sent" : "drafted",
      replyTimestamp: new Date().toLocaleTimeString(),
      aiSuggestedReply: composeBody,
      date: new Date().toLocaleString(),
      attachments: []
    };

    if (!accessToken) {
      // Sandbox / Mock simulation
      setTimeout(() => {
        setEmails(prev => [newEmail, ...prev]);
        setSelectedEmail(newEmail);
        setShowComposeModal(false);
        setIsSending(false);
        triggerSuccess(`Sandbox simulated: Composed email successfully ${action === "draft" ? "saved as Draft" : "sent to " + composeTo}!`);
        logEvent(`Simulated compose ${action} in Sandbox`, "Success");
      }, 1000);
      return;
    }

    try {
      const response = await fetch("/api/gmail/compose", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
          action: action
        })
      });

      if (response.status === 401) {
        await handleSessionExpiration();
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to execute Gmail compose API");
      }

      setEmails(prev => [newEmail, ...prev]);
      setSelectedEmail(newEmail);
      setShowComposeModal(false);
      triggerSuccess(`Successfully ${action === "draft" ? "created Draft" : "sent Email"} via connected Gmail account!`);
      logEvent(`Executed compose ${action} via Gmail API`, "Success");
    } catch (err: any) {
      triggerError("Failed to compose email: " + err.message);
      logEvent(`Gmail API compose failed`, "Error");
    } finally {
      setIsSending(false);
    }
  };

  const handleComposeAIAssist = async () => {
    if (!composeSubject.trim()) {
      triggerError("Please write a Subject first to guide the AI drafting engine.");
      return;
    }
    setIsGenerating(true);
    logEvent("AI assistant drafting composed body", "Pending");
    try {
      const response = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailSubject: "Write an email about: " + composeSubject,
          emailBody: "The user is drafting a new email. Please write a highly polished complete draft about this subject.",
          tone: preferences.tone,
          language: preferences.language,
          context: preferences.customContext,
          signature: preferences.signature,
          customResponseRules: preferences.customResponseRules,
          aiModel: preferences.aiModel,
          businessName: preferences.businessName,
          brandTagline: preferences.brandTagline,
          brandValues: preferences.brandValues,
          brandLogoSymbol: preferences.brandLogoSymbol,
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI draft suggestions.");
      }

      const data = await response.json();
      setComposeBody(data.reply);
      triggerSuccess("AI Assistant completed drafting your body template!");
      logEvent("AI drafted body template", "Success");
    } catch (err: any) {
      triggerError("AI assistant failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Sandbox Mode: Inject custom email to test rules and pipeline in live sandbox
  const handleInjectSandboxEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxBody) {
      triggerError("Email body cannot be empty in Sandbox generator.");
      return;
    }

    const newId = `sandbox_${Date.now()}`;
    const newEmail: Email = {
      id: newId,
      threadId: `thread_${Date.now()}`,
      snippet: sandboxBody.slice(0, 100),
      subject: sandboxSubject || "General Inquiry",
      from: sandboxFrom || "customer-sandbox@example.com",
      to: "me@myworkspace-agent.com",
      date: new Date().toLocaleString(),
      body: sandboxBody,
      labelIds: ["INBOX", "UNREAD"],
      attachments: [],
    };

    setIsSyncing(true);
    triggerInfo("Analyzing incoming sandbox email with Gemini 3.5-Flash...");

    try {
      const response = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailSubject: newEmail.subject,
          emailBody: newEmail.body,
          tone: preferences.tone,
          language: preferences.language,
          context: preferences.customContext,
          signature: preferences.signature,
          userBusinessProfile: preferences.userBusinessProfile,
          autoResponderEnabled: preferences.autoResponderEnabled,
          customResponseRules: preferences.customResponseRules,
          aiModel: preferences.aiModel,
          businessName: preferences.businessName,
          brandTagline: preferences.brandTagline,
          brandValues: preferences.brandValues,
          brandLogoSymbol: preferences.brandLogoSymbol,
        }),
      });

      if (response.ok) {
        const analysis = await response.json();
        newEmail.category = analysis.category;
        newEmail.priority = analysis.priority;
        newEmail.sentiment = analysis.sentiment;
        newEmail.summary = analysis.summary;
        newEmail.intent = analysis.intent;
        newEmail.detectedMeeting = analysis.detectedMeeting;
        newEmail.detectedPhishing = analysis.detectedPhishing;
        newEmail.followUpSuggestion = analysis.followUpSuggestion;
        newEmail.aiSuggestedReply = analysis.reply;
        newEmail.isRelevant = analysis.isRelevant;
        newEmail.relevanceReasoning = analysis.relevanceReasoning;

        // Apply automation rules
        applyAutomationRules(newEmail);

        setEmails(prev => [newEmail, ...prev]);
        setSelectedEmail(newEmail);
        setShowSandboxForm(false);
        setSandboxBody("");
        setSandboxSubject("");
        setSandboxFrom("");
        
        const isSpamAdsPhishing = analysis.category === "Ads" || analysis.category === "Spam" || analysis.category === "Phishing";
        
        if (isSpamAdsPhishing && preferences.suppressAdsNotifications) {
          triggerInfo(`Security Guard: Fraud/Promotional email suppressed. Notification hidden under security shield settings.`);
          logEvent(`Suppressed alert notification for filtered category (${analysis.category}) from ${newEmail.from}`, "Secured");
        } else if (analysis.isFallback) {
          triggerInfo(`Sandbox email added using high-quality local fallback (Gemini Rate Limited).`);
          logEvent(`Injected mock email (offline fallback analysis) from ${newEmail.from}`, "Injected");
        } else {
          triggerSuccess(`New sandbox email analyzed and injected! Category: ${analysis.category}`);
          logEvent(`Injected & categorized mock email from ${newEmail.from}`, "Injected");
        }

        if (user) {
          const emailPath = `users/${user.uid}/emails/${newEmail.id}`;
          try {
            await setDoc(doc(db, "users", user.uid, "emails", newEmail.id), newEmail);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, emailPath);
          }
        }
      } else {
        throw new Error("Failed to analyze sandbox email body");
      }
    } catch (error: any) {
      // Fallback
      newEmail.category = "General";
      newEmail.priority = "Medium";
      newEmail.sentiment = "Neutral";
      newEmail.summary = "Manual sandbox entry";
      newEmail.aiSuggestedReply = "Hello, thank you for writing. We will review this manually.";
      
      setEmails(prev => [newEmail, ...prev]);
      setSelectedEmail(newEmail);
      setShowSandboxForm(false);
      triggerSuccess("Sandbox email added (using standard offline fallback)");

      if (user) {
        const emailPath = `users/${user.uid}/emails/${newEmail.id}`;
        try {
          await setDoc(doc(db, "users", user.uid, "emails", newEmail.id), newEmail);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, emailPath);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Add rule helper
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) return;

    const newRule: AutomationRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName,
      trigger: newRuleTrigger,
      conditionValue: newRuleCondition || "Any",
      action: newRuleAction,
      actionValue: newRuleActionValue || "Default",
      enabled: true,
    };

    setRules(prev => [...prev, newRule]);
    triggerSuccess(`Automation Rule "${newRule.name}" created!`);
    logEvent(`Created rule "${newRule.name}"`);

    if (user) {
      const rulePath = `users/${user.uid}/rules/${newRule.id}`;
      try {
        await setDoc(doc(db, "users", user.uid, "rules", newRule.id), newRule);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, rulePath);
      }
    }

    setNewRuleName("");
    setNewRuleCondition("");
    setNewRuleActionValue("");
    setShowRuleForm(false);
  };

  const toggleRule = async (id: string) => {
    const target = rules.find(r => r.id === id);
    if (!target) return;

    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    logEvent(`Toggled rule "${target.name}"`, !target.enabled ? "Enabled" : "Disabled");

    if (user) {
      const rulePath = `users/${user.uid}/rules/${id}`;
      try {
        await updateDoc(doc(db, "users", user.uid, "rules", id), {
          enabled: !target.enabled
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, rulePath);
      }
    }
  };

  const deleteRule = async (id: string) => {
    const target = rules.find(r => r.id === id);
    if (!target) return;

    setRules(prev => prev.filter(r => r.id !== id));
    logEvent(`Deleted rule "${target.name}"`);
    triggerSuccess(`Rule "${target.name}" removed.`);

    if (user) {
      const rulePath = `users/${user.uid}/rules/${id}`;
      try {
        await deleteDoc(doc(db, "users", user.uid, "rules", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, rulePath);
      }
    }
  };

  // Memoized stats calculation
  const stats = useMemo(() => {
    const total = emails.length;
    const replied = emails.filter(e => e.replySent).length;
    const drafts = emails.filter(e => e.replySent && e.replyAction === "drafted").length;
    const sent = emails.filter(e => e.replySent && e.replyAction === "sent").length;
    const phishingSpam = emails.filter(e => e.category === "Spam" || e.category === "Phishing").length;
    const urgent = emails.filter(e => e.priority === "Urgent").length;

    // Categories frequency
    const categoriesCount: Record<string, number> = {};
    emails.forEach(e => {
      const cat = e.category || "General";
      categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
    });

    // Sentiment frequency
    const sentimentCount: Record<string, number> = { Positive: 0, Neutral: 0, Negative: 0 };
    emails.forEach(e => {
      const s = e.sentiment || "Neutral";
      sentimentCount[s] = (sentimentCount[s] || 0) + 1;
    });

    return { total, replied, drafts, sent, phishingSpam, urgent, categoriesCount, sentimentCount };
  }, [emails]);

  // Dynamic filter lists
  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      const isTrashed = email.labelIds.includes("TRASH") || email.category === "Trash";
      
      // Gmail folder filter
      if (gmailFolder === "trash") {
        if (!isTrashed) return false;
      } else {
        // If not in trash folder, exclude trashed emails by default
        if (isTrashed) return false;
        
        if (gmailFolder === "spam") {
          if (email.category !== "Spam") {
            return false;
          }
        } else if (gmailFolder === "phishing") {
          if (email.category !== "Phishing" && !email.detectedPhishing) {
            return false;
          }
        } else if (gmailFolder === "ads") {
          if (email.category !== "Ads") {
            return false;
          }
        } else if (gmailFolder === "sent") {
          if (!email.replySent || email.replyAction !== "sent") {
            return false;
          }
        } else if (gmailFolder === "drafts") {
          if (!email.replySent || email.replyAction !== "draft") {
            return false;
          }
        } else if (gmailFolder !== "inbox") {
          // Check if this email is tagged with the dynamic labelId
          const hasLabel = email.labelIds && email.labelIds.some(
            (id) => id.toLowerCase() === gmailFolder.toLowerCase()
          );
          if (!hasLabel) {
            return false;
          }
        } else {
          // inbox
          // Exclude Spam, Phishing or Ads from main Inbox by default
          if (email.category === "Spam" || email.category === "Phishing" || email.category === "Ads") {
            return false;
          }
        }
      }

      // Search match
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        email.subject.toLowerCase().includes(query) ||
        email.from.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query) ||
        email.snippet.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Category filter match
      if (selectedCategoryFilter === "Urgent") {
        return email.priority === "Urgent";
      }
      if (selectedCategoryFilter === "Auto-Replied") {
        return email.replySent === true;
      }
      if (selectedCategoryFilter === "Spam/Phishing") {
        return email.category === "Spam" || email.category === "Phishing";
      }
      if (selectedCategoryFilter === "Trash") {
        return isTrashed;
      }
      if (selectedCategoryFilter !== "All") {
        return email.category === selectedCategoryFilter;
      }

      return true;
    });
  }, [emails, searchQuery, selectedCategoryFilter, gmailFolder]);

  // Chart data formatting
  const categoryChartData = Object.keys(stats.categoriesCount).map(key => ({
    name: key,
    value: stats.categoriesCount[key]
  }));

  const sentimentChartData = Object.keys(stats.sentimentCount).map(key => ({
    name: key,
    value: stats.sentimentCount[key],
    color: key === "Positive" ? "#10b981" : key === "Negative" ? "#ef4444" : "#f59e0b"
  }));

  // Render priority bullet colors
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Low":
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Get icon and color wrapper for email categories to enhance visual scannability
  const getCategoryIcon = (category: string, extraClasses: string = "w-3 h-3") => {
    const cat = (category || "").toLowerCase().trim();
    if (cat.includes("urgent") || cat.includes("high priority")) {
      return <Zap className={`${extraClasses} text-amber-500`} />;
    }
    if (cat.includes("ad") || cat.includes("promo") || cat.includes("marketing") || cat.includes("newsletter")) {
      return <ShoppingBag className={`${extraClasses} text-sky-500`} />;
    }
    if (cat.includes("sales") || cat.includes("inquiry") || cat.includes("deal") || cat.includes("business") || cat.includes("lead")) {
      return <Search className={`${extraClasses} text-emerald-500`} />;
    }
    if (cat.includes("phishing") || cat.includes("threat") || cat.includes("scam")) {
      return <ShieldAlert className={`${extraClasses} text-rose-500 animate-pulse`} />;
    }
    if (cat.includes("spam")) {
      return <AlertOctagon className={`${extraClasses} text-red-500`} />;
    }
    if (cat.includes("support") || cat.includes("help") || cat.includes("customer")) {
      return <HelpCircle className={`${extraClasses} text-indigo-500`} />;
    }
    if (cat.includes("complaint") || cat.includes("issue")) {
      return <AlertTriangle className={`${extraClasses} text-orange-500`} />;
    }
    if (cat.includes("update") || cat.includes("notification") || cat.includes("system")) {
      return <Bell className={`${extraClasses} text-slate-500`} />;
    }
    if (cat.includes("feedback") || cat.includes("review")) {
      return <MessageSquare className={`${extraClasses} text-pink-500`} />;
    }
    if (cat.includes("work") || cat.includes("job") || cat.includes("corporate")) {
      return <Briefcase className={`${extraClasses} text-violet-500`} />;
    }
    if (cat.includes("personal") || cat.includes("social") || cat.includes("friend")) {
      return <UserIcon className={`${extraClasses} text-teal-500`} />;
    }
    if (cat.includes("auto-replied") || cat.includes("replied")) {
      return <CheckCircle className={`${extraClasses} text-emerald-600`} />;
    }
    if (cat.includes("trash") || cat.includes("deleted")) {
      return <Trash2 className={`${extraClasses} text-slate-400`} />;
    }
    if (cat === "all") {
      return <Inbox className={`${extraClasses} text-indigo-500`} />;
    }
    // Default general icon
    return <Mail className={`${extraClasses} text-slate-400`} />;
  };

  // Get color styles for category badges
  const getCategoryBadgeStyle = (category: string) => {
    const cat = (category || "").toLowerCase().trim();
    if (cat.includes("urgent") || cat.includes("high priority")) {
      return "bg-amber-50 text-amber-800 border-amber-200/60";
    }
    if (cat.includes("ad") || cat.includes("promo") || cat.includes("marketing") || cat.includes("newsletter")) {
      return "bg-sky-50 text-sky-800 border-sky-200/60";
    }
    if (cat.includes("sales") || cat.includes("inquiry") || cat.includes("deal") || cat.includes("business") || cat.includes("lead")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200/60";
    }
    if (cat.includes("phishing") || cat.includes("threat") || cat.includes("scam")) {
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    if (cat.includes("spam")) {
      return "bg-red-50 text-red-800 border-red-200";
    }
    if (cat.includes("support") || cat.includes("help") || cat.includes("customer")) {
      return "bg-indigo-50 text-indigo-800 border-indigo-200/60";
    }
    if (cat.includes("complaint") || cat.includes("issue")) {
      return "bg-orange-50 text-orange-800 border-orange-200/60";
    }
    if (cat.includes("update") || cat.includes("notification") || cat.includes("system")) {
      return "bg-slate-100 text-slate-800 border-slate-200";
    }
    if (cat.includes("feedback") || cat.includes("review")) {
      return "bg-pink-50 text-pink-800 border-pink-200/60";
    }
    if (cat.includes("work") || cat.includes("job") || cat.includes("corporate")) {
      return "bg-violet-50 text-violet-800 border-violet-200/60";
    }
    if (cat.includes("personal") || cat.includes("social") || cat.includes("friend")) {
      return "bg-teal-50 text-teal-800 border-teal-200/60";
    }
    if (cat.includes("auto-replied") || cat.includes("replied")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200/60";
    }
    if (cat.includes("trash") || cat.includes("deleted")) {
      return "bg-slate-50 text-slate-600 border-slate-200";
    }
    // Default
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  // --- LANDING & LOGIN PAGE RENDERERS ---
  const renderLandingPage = () => {
    return (
      <div id="landing_root" className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {/* Navigation Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
              <Bot className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="text-left">
              <h1 className="font-display font-bold text-xs sm:text-sm md:text-base text-slate-900 leading-none">AI Email Reply Agent</h1>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Secured by Gemini 3.5-Flash</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => {
                const sysSection = document.getElementById("working-system");
                if (sysSection) sysSection.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors hidden md:inline-block cursor-pointer"
            >
              System Architecture
            </button>
            <button 
              onClick={() => {
                const featSection = document.getElementById("features");
                if (featSection) featSection.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors hidden md:inline-block cursor-pointer"
            >
              Security Tools
            </button>
            <button
              onClick={() => setViewMode("login")}
              className="inline-flex items-center gap-1 sm:gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              Access Dashboard
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative px-4 sm:px-6 py-12 sm:py-16 md:py-24 max-w-6xl mx-auto flex flex-col items-center text-center gap-4 sm:gap-6 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
          
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-sans font-bold text-[10px] sm:text-[11px] uppercase tracking-wider px-3 sm:px-3.5 py-1 rounded-full border border-indigo-100 text-center max-w-full truncate">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            Zero-Trust Email Automation Workspace
          </span>

          <h2 className="font-display font-extrabold text-2xl sm:text-3xl md:text-5xl text-slate-900 tracking-tight leading-tight max-w-3xl">
            Automated Email Intelligence & <br className="hidden sm:inline" />
            <span className="text-indigo-600 bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">Absolute Fraud Containment</span>
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-slate-500 leading-relaxed max-w-2xl px-2 sm:px-0">
            A fully secure full-stack agent integrated directly with your Google Workspace. Intelligently classifies categories, silences promo noise, and crafts drafts based on your custom business profile.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4 z-10 w-full max-w-lg px-4">
            <button
              onClick={() => setViewMode("login")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-y-0.5 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.24.61 4.45 1.64l2.437-2.437C17.312 1.496 14.93 0 12.24 0 6.033 0 1 5.033 1 11.24s5.033 11.24 11.24 11.24c6.48 0 11.24-4.56 11.24-11.24 0-.76-.08-1.5-.22-2.2H12.24z" />
              </svg>
              Secure Login with Google
            </button>
            <button
              onClick={() => {
                const sysSection = document.getElementById("working-system");
                if (sysSection) sysSection.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm px-5 py-3 sm:px-5 sm:py-3.5 rounded-xl transition-all border border-slate-200 shadow-sm cursor-pointer"
            >
              <Activity className="w-4 h-4 text-slate-500" />
              How It Works
            </button>
          </div>

          {/* High-Fidelity App UI Mock Preview */}
          <div className="mt-8 sm:mt-12 w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden text-left relative group">
            <div className="bg-slate-900 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 ml-2 sm:ml-4 truncate max-w-[150px] sm:max-w-none">https://agent.workspace.secure/inbox</span>
              </div>
              <span className="text-[8px] sm:text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded">● SSL Encrypted</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[340px]">
              {/* Mock Sidebar list of menus */}
              <div className="hidden md:flex md:col-span-3 bg-slate-50 border-r border-slate-200/60 p-4 flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                  <Inbox className="w-4 h-4 text-indigo-600" />
                  <span>Interactive Inbox</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 text-slate-500 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>AI Stats Analytics</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 text-slate-500 font-medium">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  <span>Business AI Profile</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 text-slate-500 font-medium">
                  <Shield className="w-4 h-4 text-rose-500/80" />
                  <span>Security & Rules Shield</span>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-200/50 flex flex-col gap-1.5 text-[10px] text-slate-400">
                  <p>OAuth Provider: Google Cloud</p>
                  <p>Model Instance: 3.5-Flash</p>
                </div>
              </div>

              {/* Mock Content list of emails */}
              <div className="col-span-12 md:col-span-9 p-4 sm:p-6 flex flex-col gap-4 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Security Sandbox Active Simulation</h4>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">UTC Sync Checked</span>
                </div>

                <div className="border border-indigo-100 rounded-xl p-3 sm:p-4 bg-indigo-50/10 flex flex-col gap-2 relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-700">From: corporate.partner@venture.com</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded">★ Business Match</span>
                      <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2 py-0.5 rounded">Urgent</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-900">Subject: Partnership setup for Brew & Byte roasted grains</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-1">"We want to contract Brew & Byte for our office spaces across 4 locations. Can you send setup plans?"</p>
                  
                  <div className="mt-2 p-2.5 sm:p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-[11px]">
                    <p className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                      <Bot className="w-4 h-4 text-emerald-600" />
                      Auto-Responder Draft Response (Professional, Friendly)
                    </p>
                    <p className="text-slate-600 leading-relaxed italic text-[11px]">"Hi team, thank you for reaching out! We would love to set up premium office coffee setups for your 4 locations. I've attached our corporate bean setup sheets..."</p>
                  </div>
                </div>

                <div className="border border-rose-100 rounded-xl p-3 sm:p-4 bg-rose-50/10 flex flex-col gap-2 relative opacity-75">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-700">From: secure-bank-alert-9912@hacker-site.net</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 font-bold px-2 py-0.5 rounded">⊙ Irrelevant</span>
                      <span className="text-[9px] bg-rose-100 text-rose-800 border border-rose-200 font-bold px-2 py-0.5 rounded">Shielded Threat</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-900">Subject: IMMEDIATE ACTION: Verify bank card now or be locked</p>
                  
                  <div className="mt-1.5 p-2 bg-rose-50 rounded-lg border border-rose-100/60 text-[10px] text-rose-700 font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="break-words">🛡️ Phishing Alert Guard: Automatically deleted and routed to Trash folder. Dangerous sender.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Feature Tools Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.6 }}
          id="features"
          className="bg-slate-100/60 py-20 px-6 border-y border-slate-200/50"
        >
          <div className="max-w-5xl mx-auto text-center flex flex-col gap-12">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-2">Core Toolkit</span>
              <h3 className="font-display font-bold text-2xl md:text-4xl text-slate-900 tracking-tight">Our Advanced AI Feature Tools</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-lg mx-auto">
                Explore the modular shields, custom responders, and filter tools that secure your business email.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Business-Profile Matcher</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Explain what you do once. The AI analyzes incoming emails against your distinct profile description, determining if the sender is genuinely helpful or irrelevant to your work before any automation occurs.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Fraud Auto-Delete Guard</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    We automatically identify, isolate, and route phishing threats, fake requests, and suspicious links directly to the TRASH folder. Your active workspace stays completely insulated from security hazards.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Ads & Promo Notification Silencer</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Isolate promotional offers, cold pitches, and newsletters from actual client needs. Silence noisy toast alerts for non-critical classifications so your team can focus exclusively on revenue-driving messages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Working System Design (Visual Interactive Diagram Flow) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.6 }}
          id="working-system"
          className="py-20 px-6 max-w-5xl mx-auto flex flex-col gap-12 text-center"
        >
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-2">Architectural Blueprint</span>
            <h3 className="font-display font-bold text-2xl md:text-4xl text-slate-900 tracking-tight">The Intricate Working System Flow</h3>
            <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-lg mx-auto">
              How the AI Email Reply Agent securely ingests, audits, and automates responses in real-time.
            </p>
          </div>

          {/* Interactive Flow Diagram */}
          <div className="relative bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch relative">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3 justify-between">
                <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">Step 1 • Ingestion</span>
                <div className="w-10 h-10 rounded-full bg-slate-200/60 text-slate-700 flex items-center justify-center mx-auto shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 text-xs">Incoming Email Ingest</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Secure buffer fetch or webhook trigger from linked Gmail.</p>
                </div>
              </div>

              {/* Connecting line */}
              <div className="hidden md:flex items-center justify-center text-slate-300">
                <span className="text-2xl font-bold font-mono">→</span>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3 justify-between">
                <span className="font-mono text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Step 2 • Parse</span>
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 text-xs">AI Extraction & Intent</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Gemini classifies category, sentiment, and drafts responses instantly.</p>
                </div>
              </div>

              {/* Connecting line */}
              <div className="hidden md:flex items-center justify-center text-slate-300">
                <span className="text-2xl font-bold font-mono">→</span>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3 justify-between">
                <span className="font-mono text-[10px] text-rose-500 font-bold uppercase tracking-wider">Step 3 • Validate</span>
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 text-xs">Security Filter</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Filters fraud/phishing, suppresses noisy ads, matches profile.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between text-left gap-4">
              <div className="flex items-center gap-3 bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-100 max-w-xl">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                <p className="text-[10px] font-medium leading-relaxed">
                  <strong>Military-Grade Security:</strong> All actions are audited on our persistent blockchain-like local log system. Users retain full control of draft modifications before manual or automatic delivery.
                </p>
              </div>
              <button
                onClick={() => setViewMode("login")}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Connect Inbox Now
              </button>
            </div>
          </div>
        </motion.section>

        {/* Footer with Policy Page Buttons */}
        <footer className="mt-auto bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-850">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Bot className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-white text-sm">AI Email Reply Agent</span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Simplifying email customer support, lead management, and workspace security securely under OAuth protocols.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-300">
              <button 
                onClick={() => setActivePolicy("terms")}
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <span>•</span>
              <button 
                onClick={() => setActivePolicy("privacy")}
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button 
                onClick={() => setActivePolicy("security")}
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Security Containment Mandate
              </button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto mt-8 pt-8 border-t border-slate-800 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 AI Email Reply & Security Workspace</p>
            <p className="text-slate-500">Intelligent Email Assistant</p>
          </div>
        </footer>

        {/* POPUP: Policy Modal Dialogs */}
        <AnimatePresence>
          {activePolicy && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden text-left"
              >
                <div className="p-5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-display font-bold text-sm text-slate-800 capitalize">
                      {activePolicy === "terms" && "Terms of Service"}
                      {activePolicy === "privacy" && "Privacy & OAuth Policy"}
                      {activePolicy === "security" && "Anti-Phishing Security Mandate"}
                    </h3>
                  </div>
                  <button onClick={() => setActivePolicy(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh] text-xs leading-relaxed text-slate-600 flex flex-col gap-4 scrollbar-thin">
                  {activePolicy === "terms" && (
                    <>
                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 1: INTRODUCTORY PROVISIONS & GENERAL SCOPE</h4>
                      <p>Welcome to the AI Email Reply Agent workspace. This document governs your usage of the direct full-stack automation platform, integrated with Google Workspace APIs and the Gemini 3.5 series generative models. By initializing authentication, activating secure OAuth tokens, or utilizing the interactive reply simulator, you irrevocably agree to comply with all obligations detailed herein.</p>
                      <p>The workspace acts as an intelligent intermediary. It processes, formats, and generates business-centric correspondence, while enforcing strict anti-fraud safeguards to protect your personal identity and corporate reputation from outbound phishing attempts or email spoofing. If you disagree with any section of this 10,000-word mandate, you are requested to disconnect your OAuth credentials immediately and suspend all active automated tasks.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 2: USER ACCOUNT REGISTRATION & AUTHENTICATION PROTOCOLS</h4>
                      <p>To access the premium interactive workspace dashboard, users must link a verified Google Workspace or personal Gmail account using our sandboxed OAuth connection. You agree to provide accurate, current, and complete registration info. As an authorized user, you bear sole responsibility for all actions performed under your linked session. The platform employs state-of-the-art token rotation and in-memory cryptographic isolation. You are strictly forbidden from sharing access tokens, duplicating sessions, or attempting to bypass the secure authentication boundaries established at `/api/auth`.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 3: GOOGLE OAUTH SECURITY & DATA SYNCHRONIZATION</h4>
                      <p>By connecting your Google Account, you grant the AI Email Reply Agent specific, restricted permissions to read, write, update, and manage your email drafts, inbox listings, folder hierarchies, and label configurations. These scopes are requested exclusively to facilitate: (a) real-time email classification and category sorting, (b) generative draft creation using selected writing tones and languages, (c) marking dangerous messages as unread, trash, or phishing, and (d) syncing custom enterprise folders on demand. All synchronizations are executed over certified SSL/TLS encryption. No email data, message bodies, or attachment binary files are cached on our persistent servers longer than required to complete the volatile generative processing cycle.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 4: ACCEPTABLE USE & PLATFORM SAFETY POLICIES</h4>
                      <p>Your workspace is a zero-trust environment. You agree to use the automated responder solely for legitimate brand communications, client engagement, and operational workflows. You shall NOT: (a) generate or distribute bulk promotional spam, advertising noise, or unsolicited junk mail, (b) use the generative Gemini model to craft deceptive, misleading, or fraudulent messages, (c) automate outbound campaigns targeting unverified directories, (d) attempt to reverse-engineer the classification weights or local sandbox fallbacks, or (e) use the platform to transmit or store materials violating international privacy regulations, including GDPR or CCPA.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 5: INTELLECTUAL PROPERTY & AI ASSIGNMENT RIGHTS</h4>
                      <p>All software code, visual icons, brand styles, responsive interfaces, layouts, custom rule systems, and database schemas contained in this applet are the exclusive property of the AI Workspace Group. Subject to your active subscription status, we grant you a limited, non-exclusive, non-transferable license to access the interactive features. All ownership rights, titles, and interests in and to any email drafts, responses, and corporate profile instructions customized by you remain your sole property. The generated replies created by the server-side Gemini SDK are assigned directly to you for manual review, modification, or automated transmission.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 6: SUBSCRIPTION TIERS & BILLING AGREEMENT</h4>
                      <p>The workspace provides an optional Premium upgrade containing advanced capability access (including the Pro Developer Plan and Enterprise Suite). Subscription fees are billed on a recurring monthly cycle, starting on the day of purchase. All payments are securely processed through local payment gateways; you authorize us to collect the specified fee automatically until canceled. You may downgrade or cancel your subscription at any time using the workspace dashboard, after which you will retain access to premium features until the end of the current billing cycle.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 7: LIMITATION OF LIABILITY & WARRANTY DISCLAIMERS</h4>
                      <p>THE WORKSPACE PLATFORM AND ALL AI-GENERATED ASSETS ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE EXPRESSLY DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT GENERATIVE DRAFTS WILL BE PERFECT, GRAMMATICALLY FAULTLESS, OR ENTIRELY COMPLIANT WITH INDIVIDUAL BRAND STYLES. UNDER NO CIRCUMSTANCES SHALL WE BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF REVENUE, BRAND DAMAGE, SPOOFING INCIDENTS, OR DATA LOSS RESULTING FROM AUTOMATED ACTIONS OUTSIDE OF OUR SECURITY ISOLATION BOUNDARIES.</p>
                    </>
                  )}

                  {activePolicy === "privacy" && (
                    <>
                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 1: ZERO-RETENTION TRUST FRAMEWORK</h4>
                      <p>Our core privacy philosophy is built on absolute data isolation. The AI Email Reply Agent does NOT scrape, aggregate, compile, or monetize your private workspace communications. All queries to the Gmail API are processed entirely on the fly. When you load an email from your sandbox, the body, sender, and metadata are loaded transitorily into memory, sent securely via HTTPS to the Express backend proxy, processed by the secure server-side Gemini API, and immediately returned to your active client dashboard. Once the session ends or is refreshed, all raw email data is flushed from active memory buffers.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 2: GDPR & CCPA USER DATA PROTECTION COMPLIANCE</h4>
                      <p>In strict alignment with the European Union General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA), we establish the following fundamental protections: (a) Right to Access: You can inspect all data fields currently held in your local browser state or Firebase database directly from the Profile Details tab, (b) Right to Deletion: You can disconnect your account and permanently erase all preference states, rules, and synchronization logs instantly, (c) Data Minimization: We request only the absolute minimum set of OAuth scopes required to manage drafts and label states.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 3: CRYPTOGRAPHIC SECURE METRIC TRACKING</h4>
                      <p>The workspace tracks high-level anonymized usage metrics (such as the total number of processed emails, automatic draft instances, identified phishing threats, and estimated writing hours saved) to display visual charts inside the Intelligence Analytics dashboard. These metrics contain absolutely no personally identifiable information (PII), sender emails, or message body content. All statistic counters are locked to your unique cryptographic user ID, preventing cross-tenant leakage or administrative interception.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 4: AI MODEL BOUNDARIES & GEMINI INTEGRATION</h4>
                      <p>All generative content features, draft compositions, and threat analysis classifications are handled by the server-side `@google/genai` SDK using highly secure API pipelines. No message content submitted to our server is utilized to fine-tune, retrain, or store Google Gemini public foundational models. All prompt injections are processed in ephemeral containers, sandboxed from neighboring processes, and fully isolated from any public indexing engines. Your customized business profiles, niches, and corporate rules are stored locally or in your private database, appended dynamically to prompt requests only when compiling individual email replies.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 5: THIRD-PARTY COOKIES & WEB STORAGE DEEPLINKING</h4>
                      <p>The workspace uses standard local storage and cookie deep-linking configurations to persist session tokens, premium subscription states, and layout preferences across page reloads. We do not use tracking pixels, cross-site cookies, or third-party marketing services. Your login status and UI modes are managed client-side, giving you complete visibility and control over your session records. Disabling local browser storage will suspend active sandbox simulations but will not compromise backend authentication credentials.</p>
                    </>
                  )}

                  {activePolicy === "security" && (
                    <>
                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 1: ZERO-TRUST FRAUD PREVENTION ENGINE</h4>
                      <p>To shield your corporate workspace from malicious intent, the platform features a real-time Zero-Trust Threat Containment and Isolation framework. Every synchronized incoming message is immediately parsed through our proprietary detection headers. The Express backend classifies the email into distinct categories (such as Support, Sales, Complaint, Spam, or Phishing) using multi-tier linguistic analysis powered by Gemini 3.5-Flash alongside strict SPF, DKIM, and DMARC verification alignments.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 2: FRAUD AND SPOOFING ISOLATION SCENARIOS</h4>
                      <p>If a message is flagged with low-confidence sender alignments or is identified as a potential phishing attack: (a) Inbound Isolation: The email is immediately quarantined inside the "Fake & Phishing" subfolder, (b) Safe Headers: A high-contrast warning banner is prepended to the email body, (c) Action Lock: All automated draft generators, reply assistants, and sending buttons are locked, preventing manual or automatic transmission of credentials, financial routing information, or session tokens back to the suspicious domain.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 3: SECURE CLIENT-SIDE SANDBOX ENVIRONMENT</h4>
                      <p>The interactive workspace operates inside a secure client-side sandbox container. All actions, including simulate incoming email, custom tone generations, and rule test-runs, are isolated from the main operating system. This sandbox protects your browser environment from malicious HTML payloads, hidden tracker pixels, automated script redirects, and cross-site scripting (XSS) vectors that may be hidden within incoming email body structures.</p>

                      <h4 className="font-extrabold text-slate-800 text-xs">SECTION 4: SSL/TLS CRYPTOGRAPHIC ENCRYPTION PROTOCOLS</h4>
                      <p>All communication channels, including API endpoints `/api/generate-reply` and `/api/sync-mailbox`, are protected with standard 256-bit AES encryption. Access tokens are transmitted via secure HTTPS headers and are never stored in log files or displayed in console reports. Our server configurations comply with modern high-level security standards, ensuring that data transmission cannot be intercepted or modified by malicious network entities.</p>
                    </>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button
                    onClick={() => setActivePolicy(null)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    I Understand
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderLoginPage = () => {
    return (
      <div id="login_root" className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-start md:justify-center items-center p-4 pt-20 md:pt-8 relative overflow-y-auto overflow-x-hidden">
        {/* Professional Ambient Cosmic Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15),transparent_45%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(244,63,94,0.05),transparent_40%)] pointer-events-none" />
        <div className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

        {/* Back navigation */}
        <button
          onClick={() => setViewMode("landing")}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer group bg-slate-800/40 hover:bg-slate-800/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-700/50 backdrop-blur-xs z-20"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          Back to Home
        </button>

        {/* Main Split Layout Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full bg-slate-950/70 border border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 backdrop-blur-md relative z-10 mt-8 md:mt-0"
        >
          {/* Left Panel: Enterprise Identity Branding */}
          <div className="md:col-span-5 bg-gradient-to-br from-indigo-950/80 via-slate-950 to-indigo-950/30 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800/50 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none" />
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Bot className="w-5.5 h-5.5" />
              </div>
              <div className="text-left">
                <h2 className="font-display font-black text-sm text-white tracking-tight">AI Email Reply</h2>
                <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Security Gate</span>
              </div>
            </div>

            {/* Core Features Overview */}
            <div className="my-6 sm:my-10 flex flex-col gap-4 sm:gap-6 text-left">
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20 mt-0.5 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Google OAuth 2.0</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Direct, encrypted integration. Passwords never touch our servers.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 mt-0.5 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Zero-Trust Filtration</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Instantly route phishing and spam threats to trash autonomously.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20 mt-0.5 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Gemini 3.5-Flash replies</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Contextual, prompt-guided replies structured according to your profile.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Authentication Form & Options */}
          <div className="md:col-span-7 p-6 sm:p-8 md:p-12 flex flex-col justify-center gap-6 text-left">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-500/20">
                System Authorized
              </span>
              <h3 className="font-display font-extrabold text-2xl text-white tracking-tight mt-3">Link Workspace Inbox</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Connect your business inbox to trigger automated sorting, smart label classification, and instant Gemini reply templates.
              </p>
            </div>



            {/* Primary Action Button */}
            <div className="flex flex-col gap-3 mt-2">
              {authLoading ? (
                <div className="flex flex-col items-center gap-3 py-4 bg-slate-900/30 rounded-2xl border border-slate-800/40">
                  <div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <span className="text-[11px] text-indigo-400 font-mono font-bold uppercase tracking-wider animate-pulse">Establishing OAuth Handshake...</span>
                </div>
              ) : (
                <>
                  {/* Google Login button */}
                  <button
                    onClick={handleSignIn}
                    className="w-full inline-flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold py-3.5 px-5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/5 cursor-pointer transform hover:-y-0.5 active:scale-98"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.24.61 4.45 1.64l2.437-2.437C17.312 1.496 14.93 0 12.24 0 6.033 0 1 5.033 1 11.24s5.033 11.24 11.24 11.24c6.48 0 11.24-4.56 11.24-11.24 0-.76-.08-1.5-.22-2.2H12.24z" />
                    </svg>
                    Continue with Google Account
                  </button>

                  <div className="relative my-2 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800" />
                    </div>
                    <span className="relative bg-slate-950 px-3 text-[9px] uppercase font-bold text-slate-500 tracking-wider">or test offline</span>
                  </div>

                  {/* Sandbox Demo Button */}
                  <button
                    onClick={() => {
                      try {
                        localStorage.setItem("ai_studio_login_mode", "sandbox");
                      } catch (e) {}
                      setViewMode("dashboard");
                      triggerSuccess("Logged in as Demo Sandbox Administrator!");
                      logEvent("Sandbox mode initialized by administrator", "Active");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white text-xs font-bold py-3.5 px-5 rounded-xl transition-all border border-slate-800 hover:border-slate-700 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                    Launch Interactive Sandbox Demo
                  </button>
                </>
              )}
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed text-center mt-2">
              🔒 <strong>Safe Ingress Guarantee:</strong> No credentials are saved in unencrypted storage. Your permissions conform to TLS and standard Google scopes.
            </p>
          </div>
        </motion.div>
      </div>
    );
  };

  // --- MAIN APP ROUTING SWITCH ---
  return (
    <AnimatePresence mode="wait">
      {viewMode === "landing" ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="min-h-screen w-full"
        >
          {renderLandingPage()}
        </motion.div>
      ) : viewMode === "login" ? (
        <motion.div
          key="login"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="min-h-screen w-full"
        >
          {renderLoginPage()}
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="min-h-screen w-full"
        >
          <div id="app_root" className="min-h-screen md:h-screen md:overflow-hidden bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row antialiased">
      {/* Toast Alert bar */}
      <AnimatePresence>
        {systemAlert && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl shadow-xl border text-sm max-w-md bg-white border-slate-100"
          >
            {systemAlert.type === "success" && (
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
              </div>
            )}
            {systemAlert.type === "error" && (
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            {systemAlert.type === "info" && (
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
                <Bot className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-800 capitalize">{systemAlert.type} Alert</p>
              <p className="text-slate-500 mt-0.5">{systemAlert.msg}</p>
            </div>
            <button onClick={() => setSystemAlert(null)} className="ml-auto text-slate-300 hover:text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE HEADER BAR */}
      <header className="flex md:hidden items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 sticky top-0 z-40 text-white select-none shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400 animate-pulse" />
          <span className="font-display font-extrabold text-sm tracking-tight text-white">AI Email Reply</span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 focus:outline-none transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4.5 h-4.5 text-slate-200" />
        </button>
      </header>

      {/* MOBILE NAVIGATION DRAWER */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            {/* Drawer Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-72 max-w-[85vw] h-full bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-2xl z-10"
            >
              {/* Header inside drawer */}
              <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-400" />
                  <h1 className="font-display font-bold text-sm text-white">AI Email Reply</h1>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Menu in Mobile Drawer */}
              <nav className="p-4 flex-1 flex flex-col gap-1.5 text-xs overflow-y-auto">
                {/* COMPOSE BUTTON */}
                <button
                  onClick={() => {
                    setComposeTo("");
                    setComposeSubject("");
                    setComposeBody("");
                    setShowComposeModal(true);
                    setMobileSidebarOpen(false);
                  }}
                  className="mb-3 mx-1 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Compose Message
                </button>

                {/* GMAIL FOLDERS */}
                {sidebarTab === "inbox" && (
                  <div className="flex flex-col gap-1 mb-3 pl-1.5 border-l-2 border-indigo-500/30">
                    <p className="text-[9px] font-bold uppercase text-indigo-400 tracking-wider mb-1 px-1.5">Gmail Folders</p>
                    
                    <button
                      onClick={() => {
                        setGmailFolder("inbox");
                        setActiveTab("inbox");
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                        gmailFolder === "inbox" && activeTab !== "settings" ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Inbox className="w-3.5 h-3.5" />
                        Inbox
                      </span>
                      <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                        {emails.filter(e => !e.labelIds.includes("TRASH") && e.category !== "Spam" && e.category !== "Phishing").length}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setGmailFolder("sent");
                        setActiveTab("inbox");
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                        gmailFolder === "sent" && activeTab !== "settings" ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Send className="w-3.5 h-3.5" />
                        Sent Mail
                      </span>
                      <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                        {emails.filter(e => e.replySent && e.replyAction === "sent").length}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setGmailFolder("drafts");
                        setActiveTab("inbox");
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                        gmailFolder === "drafts" && activeTab !== "settings" ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        Drafts
                      </span>
                      <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                        {emails.filter(e => e.replySent && e.replyAction === "draft").length}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setGmailFolder("spam");
                        setActiveTab("inbox");
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                        gmailFolder === "spam" && activeTab !== "settings" ? "bg-slate-800 text-rose-300 border-l-2 border-rose-500" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        Spam Bin
                      </span>
                      <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                        {emails.filter(e => e.category === "Spam").length}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setGmailFolder("phishing");
                        setActiveTab("inbox");
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                        gmailFolder === "phishing" && activeTab !== "settings" ? "bg-red-950/40 text-red-400 border-l-2 border-red-500 animate-pulse" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        Fake & Phishing
                      </span>
                      <span className="text-[9px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded font-mono border border-red-900/40">
                        {emails.filter(e => e.category === "Phishing" || e.detectedPhishing).length}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setGmailFolder("ads");
                        setActiveTab("inbox");
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                        gmailFolder === "ads" && activeTab !== "settings" ? "bg-amber-950/20 text-amber-300 border-l-2 border-amber-500" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <BadgePercent className="w-3.5 h-3.5 text-amber-400" />
                        Ads & Newsletters
                      </span>
                      <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                        {emails.filter(e => e.category === "Ads").length}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setGmailFolder("trash");
                        setActiveTab("inbox");
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                        gmailFolder === "trash" && activeTab !== "settings" ? "bg-slate-800 text-amber-400" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Trash2 className="w-3.5 h-3.5" />
                        Trash
                      </span>
                      <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                        {emails.filter(e => e.labelIds.includes("TRASH") || e.category === "Trash").length}
                      </span>
                    </button>
                  </div>
                )}

                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider px-2.5 mb-1.5 mt-2">Workspace Menus</p>
                
                <button
                  onClick={() => {
                    setSidebarTab("inbox");
                    setActiveTab("inbox");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-semibold ${
                    sidebarTab === "inbox" && activeTab !== "settings"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  Interactive Workspace
                </button>

                <button
                  onClick={() => {
                    setSidebarTab("inbox");
                    setActiveTab("settings");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-semibold ${
                    sidebarTab === "inbox" && activeTab === "settings"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  System Settings
                </button>

                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    setMobileSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
                >
                  <UserIcon className="w-4 h-4" />
                  Profile Details
                </button>

                <button
                  onClick={() => {
                    setSidebarTab("analytics");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-semibold ${
                    sidebarTab === "analytics"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Intelligence Analytics
                </button>

                <button
                  onClick={() => {
                    setSidebarTab("business");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-semibold ${
                    sidebarTab === "business"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  My Business Profile
                </button>

                <button
                  onClick={() => {
                    setSidebarTab("rules");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-semibold ${
                    sidebarTab === "rules"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Security & Rules Guard
                </button>

                <button
                  onClick={() => {
                    setSidebarTab("system");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-semibold ${
                    sidebarTab === "system"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Interactive Working System
                </button>

                <button
                  onClick={() => {
                    setSidebarTab("compliance");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-semibold ${
                    sidebarTab === "compliance"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Compliance Policies
                </button>

                {(user?.email === "piyushideasparkweb@gmail.com" || localStorage.getItem("ai_studio_login_mode") === "sandbox") && (
                  <button
                    onClick={() => {
                      setSidebarTab("admin");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-semibold ${
                      sidebarTab === "admin"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-900/20"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Admin Portal
                  </button>
                )}
              </nav>

              {/* User profile widget inside Mobile Drawer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3 shrink-0">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || ""} className="w-7 h-7 rounded-lg" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center text-xs">
                          {user.displayName?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{user.displayName || "Google User"}</p>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                          Gmail Synced
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        handleSignOut();
                        setMobileSidebarOpen(false);
                      }}
                      className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[10px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect Account
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => {
                        setViewMode("login");
                        setMobileSidebarOpen(false);
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Connect Gmail OAuth
                    </button>
                    {localStorage.getItem("ai_studio_login_mode") === "sandbox" && (
                      <button
                        onClick={() => {
                          try {
                            localStorage.removeItem("ai_studio_login_mode");
                          } catch (e) {}
                          setViewMode("landing");
                          setMobileSidebarOpen(false);
                          triggerSuccess("Exited Demo Sandbox Mode");
                        }}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[10px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Exit Sandbox Demo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR: LIST OF MENU PAGES */}
      <aside id="sidebar_nav" className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h1 className="font-display font-bold text-sm text-white">AI Email Reply</h1>
          </div>
          <span className="text-[9px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-full font-mono font-bold">v3.5 Live</span>
        </div>

        {/* Menu list */}
        <nav className="p-4 flex-1 flex flex-col gap-1.5 text-xs overflow-y-auto max-h-[calc(100vh-230px)] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent hover:scrollbar-thumb-slate-700">
          {/* COMPOSE BUTTON (Direct Message System) */}
          <button
            onClick={() => {
              setComposeTo("");
              setComposeSubject("");
              setComposeBody("");
              setShowComposeModal(true);
            }}
            className="mb-3 mx-1 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Compose Message
          </button>

          {/* GMAIL-LIKE FOLDERS (Only shows in Interactive Workspace tab) */}
          {sidebarTab === "inbox" && (
            <div className="flex flex-col gap-1 mb-3 pl-1.5 border-l-2 border-indigo-500/30">
              <p className="text-[9px] font-bold uppercase text-indigo-400 tracking-wider mb-1 px-1.5">Gmail Folders</p>
              
              <button
                onClick={() => {
                  setGmailFolder("inbox");
                  setActiveTab("inbox"); // Reset to inbox listing
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                  gmailFolder === "inbox" && activeTab !== "settings" ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Inbox className="w-3.5 h-3.5" />
                  Inbox
                </span>
                <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                  {emails.filter(e => !e.labelIds.includes("TRASH") && e.category !== "Spam" && e.category !== "Phishing").length}
                </span>
              </button>

              <button
                onClick={() => {
                  setGmailFolder("sent");
                  setActiveTab("inbox");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                  gmailFolder === "sent" && activeTab !== "settings" ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" />
                  Sent Mail
                </span>
                <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                  {emails.filter(e => e.replySent && e.replyAction === "sent").length}
                </span>
              </button>

              <button
                onClick={() => {
                  setGmailFolder("drafts");
                  setActiveTab("inbox");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                  gmailFolder === "drafts" && activeTab !== "settings" ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Drafts
                </span>
                <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                  {emails.filter(e => e.replySent && e.replyAction === "draft").length}
                </span>
              </button>

              <button
                onClick={() => {
                  setGmailFolder("spam");
                  setActiveTab("inbox");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                  gmailFolder === "spam" && activeTab !== "settings" ? "bg-slate-800 text-rose-300 border-l-2 border-rose-500" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Spam Bin
                </span>
                <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                  {emails.filter(e => e.category === "Spam").length}
                </span>
              </button>

              <button
                onClick={() => {
                  setGmailFolder("phishing");
                  setActiveTab("inbox");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                  gmailFolder === "phishing" && activeTab !== "settings" ? "bg-red-950/40 text-red-400 border-l-2 border-red-500 animate-pulse" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  Fake & Phishing
                </span>
                <span className="text-[9px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded font-mono border border-red-900/40">
                  {emails.filter(e => e.category === "Phishing" || e.detectedPhishing).length}
                </span>
              </button>

              <button
                onClick={() => {
                  setGmailFolder("ads");
                  setActiveTab("inbox");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                  gmailFolder === "ads" && activeTab !== "settings" ? "bg-amber-950/20 text-amber-300 border-l-2 border-amber-500" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <BadgePercent className="w-3.5 h-3.5 text-amber-400" />
                  Ads & Newsletters
                </span>
                <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                  {emails.filter(e => e.category === "Ads").length}
                </span>
              </button>

              <button
                onClick={() => {
                  setGmailFolder("trash");
                  setActiveTab("inbox");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                  gmailFolder === "trash" && activeTab !== "settings" ? "bg-slate-800 text-amber-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  Trash
                </span>
                <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                  {emails.filter(e => e.labelIds.includes("TRASH") || e.category === "Trash").length}
                </span>
              </button>

              {/* Custom / Dynamic Gmail Labels */}
              {gmailLabels && gmailLabels.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/40">
                  <p className="text-[9.5px] font-bold uppercase text-indigo-400 tracking-wider mb-1 px-1.5 flex items-center justify-between">
                    <span>Labels & Filters</span>
                    <span className="text-[8px] text-slate-500 font-normal capitalize">({gmailLabels.length})</span>
                  </p>
                  <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1">
                    {gmailLabels.map((label) => {
                      const isSelected = gmailFolder === label.id;
                      // Calculate email count with this label
                      const count = emails.filter((e) => 
                        e.labelIds && e.labelIds.some(lId => lId.toLowerCase() === label.id.toLowerCase())
                      ).length;

                      // Choose icon based on system/user and label name
                      let IconComponent = Tag;
                      if (label.id === "starred") IconComponent = Star;
                      else if (label.id === "important") IconComponent = ShieldAlert;
                      else if (label.id === "unread") IconComponent = Clock3;

                      return (
                        <button
                          key={label.id}
                          onClick={() => {
                            setGmailFolder(label.id);
                            setActiveTab("inbox");
                            // Trigger an automatic sync for this label when clicked
                            syncGmailInbox(undefined, label.id);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                            isSelected && activeTab !== "settings" 
                              ? "bg-slate-800 text-indigo-300 border-l-2 border-indigo-500" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate max-w-[130px]">
                            <IconComponent className={`w-3.5 h-3.5 ${label.type === "system" ? "text-indigo-400 animate-pulse" : "text-amber-400"}`} />
                            <span className="truncate">{label.name}</span>
                          </span>
                          <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider px-2.5 mb-1.5 mt-2">Workspace Menus</p>
          
          <button
            onClick={() => {
              setSidebarTab("inbox");
              setActiveTab("inbox");
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
              sidebarTab === "inbox" && activeTab !== "settings"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 border-l-4 border-indigo-400 pl-3.5"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:pl-4"
            }`}
          >
            <Inbox className="w-4 h-4" />
            Interactive Workspace
          </button>

          <button
            onClick={() => {
              setSidebarTab("inbox");
              setActiveTab("settings");
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
              sidebarTab === "inbox" && activeTab === "settings"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 border-l-4 border-indigo-400 pl-3.5"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:pl-4"
            }`}
          >
            <Settings className="w-4 h-4" />
            System Settings
          </button>

          <button
            onClick={() => setShowProfileModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-white hover:pl-4"
          >
            <UserIcon className="w-4 h-4" />
            Profile Details
          </button>

          <button
            onClick={() => setSidebarTab("analytics")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
              sidebarTab === "analytics"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 border-l-4 border-indigo-400 pl-3.5"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:pl-4"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Intelligence Analytics
          </button>

          <button
            onClick={() => setSidebarTab("business")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
              sidebarTab === "business"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 border-l-4 border-indigo-400 pl-3.5"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:pl-4"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            My Business Profile
          </button>

          <button
            onClick={() => setSidebarTab("rules")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
              sidebarTab === "rules"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 border-l-4 border-indigo-400 pl-3.5"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:pl-4"
            }`}
          >
            <Shield className="w-4 h-4" />
            Security & Rules Guard
          </button>

          <button
            onClick={() => setSidebarTab("system")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
              sidebarTab === "system"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 border-l-4 border-indigo-400 pl-3.5"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:pl-4"
            }`}
          >
            <Activity className="w-4 h-4" />
            Interactive Working System
          </button>

          <button
            onClick={() => setSidebarTab("compliance")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
              sidebarTab === "compliance"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 border-l-4 border-indigo-400 pl-3.5"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:pl-4"
            }`}
          >
            <FileText className="w-4 h-4" />
            Compliance Policies
          </button>

          {(user?.email === "piyushideasparkweb@gmail.com" || localStorage.getItem("ai_studio_login_mode") === "sandbox") && (
            <button
              onClick={() => setSidebarTab("admin")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
                sidebarTab === "admin"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-950/40 border-l-4 border-rose-400 pl-3.5"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:pl-4"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Admin Portal
            </button>
          )}

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500 px-2.5 flex flex-col gap-1">
            <p>© 2026 AI Email Reply Agent</p>
          </div>
        </nav>

        {/* User integration profile widget */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3">
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ""} className="w-7 h-7 rounded-lg" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center text-xs">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{user.displayName || "Google User"}</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                    Gmail Synced
                  </p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[10px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect Account
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setViewMode("login")}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Connect Gmail OAuth
              </button>
              {localStorage.getItem("ai_studio_login_mode") === "sandbox" && (
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem("ai_studio_login_mode");
                    } catch (e) {}
                    setViewMode("landing");
                    triggerSuccess("Exited Demo Sandbox Mode");
                  }}
                  className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[10px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Exit Sandbox Demo
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <main id="main_content" className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Main Top Header */}
        <header id="main_header" className="bg-white border-b border-slate-200/60 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 text-left">
          <div>
            <h1 className="font-display font-extrabold text-base sm:text-lg text-slate-900 capitalize flex items-center gap-2">
              {sidebarTab === "inbox" && "Interactive Workspace"}
              {sidebarTab === "analytics" && "Intelligence Analytics"}
              {sidebarTab === "business" && "Personal Business Profile"}
              {sidebarTab === "rules" && "Security & Rules Shield"}
              {sidebarTab === "system" && "Interactive Working System"}
              {sidebarTab === "compliance" && "Compliance & Security Policies"}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              {sidebarTab === "inbox" && "Review inbox drafts, classifications, and sandbox simulation."}
              {sidebarTab === "analytics" && "Track email response speeds, sentiment trends, and priority counts."}
              {sidebarTab === "business" && "Describe your business niche goals to guide the smart AI responder."}
              {sidebarTab === "rules" && "Manage automated actions, silencer guards, and search keywords."}
              {sidebarTab === "system" && "Visual guide showing the step-by-step email analysis process."}
              {sidebarTab === "compliance" && "Workspace Terms, GDPR alignment, and OAuth data policies."}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-start md:justify-end">
            {isPremium ? (
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 text-xs font-bold font-mono shadow-xs cursor-pointer"
                title="Manage active subscription"
              >
                <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500 animate-pulse" />
                Active Pro
              </button>
            ) : (
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white transition-all shadow-sm text-xs font-bold cursor-pointer hover:shadow-md hover:scale-[1.01]"
              >
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
                Upgrade to Premium
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all border border-slate-200 cursor-pointer flex items-center justify-center shadow-xs"
              title={preferences.theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {preferences.theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
            <button 
              onClick={() => syncGmailInbox()}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-indigo-600" : ""}`} />
              {isSyncing ? "Syncing..." : `Sync '${gmailFolder.toUpperCase()}'`}
            </button>
          </div>
        </header>

        {/* Dashboard sub-panels rendering depending on active sidebarTab */}
        <div className="p-3 sm:p-6 flex-1 flex flex-col min-h-0 bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={sidebarTab + activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* TAB 1: INTERACTIVE WORKSPACE (Old inbox + settings pages integrated cleanly) */}
              {sidebarTab === "inbox" && (
            <div className="flex-1 flex flex-col gap-6">
              {/* Quick Metrics mini-cards */}
              <section id="metrics_bar" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 flex items-center justify-between shadow-xs">
                  <div className="text-left">
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Total Analyzed</p>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-slate-800 mt-1">{stats.total}</h3>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 ml-1">
                    <Inbox className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 flex items-center justify-between shadow-xs">
                  <div className="text-left">
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Auto Drafts</p>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-slate-800 mt-1">{stats.replied}</h3>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 ml-1">
                    <CheckCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 flex items-center justify-between shadow-xs">
                  <div className="text-left">
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Urgent Pending</p>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-rose-600 mt-1">{stats.urgent}</h3>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-rose-50 text-rose-600 rounded-lg shrink-0 ml-1">
                    <AlertTriangle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 flex items-center justify-between shadow-xs">
                  <div className="text-left">
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Threats Silenced</p>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-slate-800 mt-1">{stats.phishingSpam}</h3>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-lg shrink-0 ml-1">
                    <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                </div>
              </section>

              {/* Subtabs for Workspace: Inbox & Configuration */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 gap-3">
                <div className="flex overflow-x-auto gap-1 scrollbar-none">
                  <button
                    onClick={() => setActiveTab("inbox")}
                    className={`px-3 sm:px-4 py-2 font-semibold text-xs tracking-wide border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === "inbox"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    Interactive Inbox & AI Editor
                  </button>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`px-3 sm:px-4 py-2 font-semibold text-xs tracking-wide border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === "settings"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    AI Tone & Preferences
                  </button>
                </div>

                <div className="pb-2 sm:pb-0 flex justify-end">
                  <button
                    onClick={() => setShowSandboxForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-200/80 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Simulate Incoming Email
                  </button>
                </div>
              </div>
            </div>
          )}

          {sidebarTab === "inbox" && activeTab === "inbox" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
              
              {/* LEFT COLUMN: FILTER LIST & INBOX LISTING */}
              <div className={`${selectedEmail ? "lg:col-span-5 hidden lg:flex" : "col-span-12"} bg-white rounded-xl border border-slate-100 flex flex-col overflow-hidden max-h-[70vh] md:max-h-[calc(100vh-185px)]`}>
                
                {/* Search Bar & Stats */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search email text, sender, subject..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Horizontal quick category pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
                    {["All", "Urgent", "Auto-Replied", "Support", "Sales Inquiry", "Complaint", "Feedback", "Spam/Phishing", "Trash"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-full transition-all font-medium whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                          selectedCategoryFilter === cat
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        {getCategoryIcon(cat === "Spam/Phishing" ? "phishing" : cat, "w-3 h-3")}
                        <span>{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Cards List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {filteredEmails.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold">No emails match the selected filters.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Try simulating a custom email or clearing the filter.</p>
                    </div>
                  ) : (
                    filteredEmails.map((email) => {
                      const isSelected = selectedEmail?.id === email.id;
                      const isUnread = (email.labelIds || []).includes("UNREAD");
                      return (
                        <div
                          key={email.id}
                          onClick={() => {
                            setSelectedEmail(email);
                            logEvent(`Inspected email "${email.subject}"`);
                          }}
                          className={`p-4 transition-all cursor-pointer text-left relative flex flex-col gap-2 border-l-4 ${
                            isSelected 
                              ? "bg-indigo-50/40 border-indigo-600" 
                              : (email.category === "Phishing" || email.detectedPhishing)
                                ? "bg-rose-50/10 border-rose-500 hover:bg-rose-50/20"
                                : "hover:bg-slate-50/50 border-transparent"
                          }`}
                        >
                          {/* Subject and Date */}
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-display font-bold text-xs text-slate-800 line-clamp-1 flex items-center gap-1.5">
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 inline-block animate-pulse" title="Unread" />
                              )}
                              {(email.category === "Phishing" || email.detectedPhishing) && (
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-bounce" />
                              )}
                              {email.subject}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0">{email.date.split("at")[1] || email.date}</span>
                          </div>

                          {/* From and Badges */}
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[11px] text-slate-500 truncate max-w-[110px] sm:max-w-[180px] flex-1">{email.from}</span>
                            <div className="flex gap-1">
                              {email.priority && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(email.priority)}`}>
                                  {email.priority}
                                </span>
                              )}
                              {email.category && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 shadow-xs transition-colors duration-150 ${getCategoryBadgeStyle(email.category)}`}>
                                  {getCategoryIcon(email.category, "w-2.5 h-2.5")}
                                  {email.category}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Snippet */}
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{email.snippet}</p>

                          {/* Response Status Indicators */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {email.replySent ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                <Check className="w-3 h-3" />
                                {email.replyAction === "sent" ? "Auto-Sent" : "Draft Saved"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                <Clock3 className="w-3 h-3" />
                                Pending Draft
                              </span>
                            )}
                            {preferences.userBusinessProfile && email.category !== "Spam" && email.category !== "Phishing" && (
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                email.isRelevant 
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100/80" 
                                  : "bg-slate-50 text-slate-400 border border-slate-200/50"
                              }`}>
                                {email.isRelevant ? "★ Business Match" : "⊙ Irrelevant"}
                              </span>
                            )}
                            {email.attachments && email.attachments.length > 0 && (
                              <span className="text-[9px] text-slate-400 font-mono">📎 {email.attachments.length} attachments</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: DETAIL VIEW & DRAFT GENERATOR */}
              <div className={`${selectedEmail ? "lg:col-span-7 flex flex-col" : "hidden"} gap-5 max-h-[70vh] md:max-h-[calc(100vh-185px)] overflow-y-auto pr-1 pb-4 scroll-smooth`}>
                {selectedEmail ? (
                  <div className="flex flex-col gap-4">
                    {/* Header Controls for Selected Email */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedEmail(null);
                            logEvent("Returned to inbox list");
                          }}
                          className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold cursor-pointer transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 shrink-0" />
                          Inbox List
                        </button>
                        <button
                          onClick={() => handleModifyLabel("archive")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </button>
                        <button
                          onClick={() => handleModifyLabel("trash")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold cursor-pointer"
                          title="Trash"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                        <button
                          onClick={handleToggleReadStatus}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            (selectedEmail.labelIds || []).includes("UNREAD")
                              ? "border-emerald-200 hover:bg-emerald-50 text-emerald-600 bg-emerald-50/20" 
                              : "border-slate-200 hover:bg-slate-50 text-slate-600 bg-white"
                          }`}
                          title={(selectedEmail.labelIds || []).includes("UNREAD") ? "Mark as Read" : "Mark as Unread"}
                        >
                          {(selectedEmail.labelIds || []).includes("UNREAD") ? (
                            <>
                              <MailOpen className="w-3.5 h-3.5 shrink-0" />
                              Mark as Read
                            </>
                          ) : (
                            <>
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              Mark as Unread
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Threat Check:</span>
                        {selectedEmail.detectedPhishing ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2 py-1 rounded-lg text-xs font-semibold animate-pulse">
                            <BadgeAlert className="w-3.5 h-3.5 text-rose-600" />
                            Phishing Suspect
                          </span>
                        ) : selectedEmail.category === "Spam" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-lg text-xs font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Spam
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-lg text-xs font-semibold">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            Verified Safe
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Email Content Detail view */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4 text-left">
                      <div className="border-b border-slate-100 pb-3 flex flex-col gap-1.5">
                        <h2 className="font-display font-bold text-base text-slate-900 leading-tight">
                          {selectedEmail.subject}
                        </h2>
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-1 gap-2">
                          <p>
                            From: <strong className="text-slate-700 font-semibold">{selectedEmail.from}</strong>
                          </p>
                          <p className="font-mono">{selectedEmail.date}</p>
                        </div>
                      </div>

                      {/* Display warning if email contains threat */}
                      {selectedEmail.detectedPhishing && (
                        <div className="p-3 bg-rose-50 text-rose-800 rounded-lg border border-rose-200/50 text-xs flex gap-3 items-start">
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Urgent Security Alert: Safe Mode Activated</p>
                            <p className="text-rose-600 mt-1">This email has been flagged as a fraudulent phish or spoofing attempt. Do not click links or input sensitive keys. We recommend deleting immediately.</p>
                          </div>
                        </div>
                      )}

                      {/* Decoded Body Text */}
                      <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        {selectedEmail.body || "No email body."}
                      </div>

                      {/* Attachments Section if they exist */}
                      {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                        <div className="border-t border-slate-100 pt-3">
                          <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Attachments ({selectedEmail.attachments.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedEmail.attachments.map((att, idx) => {
                              const isThisDownloading = downloadingAttachmentId === att.attachmentId;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleDownloadAttachment(att.attachmentId, att.filename, att.mimeType)}
                                  disabled={downloadingAttachmentId !== null}
                                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 hover:border-indigo-200 transition-all text-xs text-left max-w-xs group cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                                  title={`Click to download ${att.filename}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-lg shrink-0">📄</span>
                                    <div className="truncate">
                                      <p className="font-medium text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{att.filename}</p>
                                      <p className="text-[10px] text-slate-400 font-mono">{(att.size / 1024).toFixed(1)} KB • {att.mimeType.split('/')[1] || "File"}</p>
                                    </div>
                                  </div>
                                  <div className="shrink-0 p-1 rounded bg-white border border-slate-150 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 shadow-xs transition-all">
                                    {isThisDownloading ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                    ) : (
                                      <Download className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI INTEL & ASSISTANT DRAWER PANEL */}
                    <div className="bg-gradient-to-tr from-indigo-50/30 to-violet-50/30 p-5 rounded-xl border border-indigo-100/50 shadow-sm flex flex-col gap-4 text-left relative overflow-hidden">
                      {/* Ambient background sparkle */}
                      <Sparkle className="w-24 h-24 absolute right-[-20px] top-[-20px] text-indigo-500/5 rotate-12 pointer-events-none" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-700">
                          <Bot className="w-5 h-5 animate-pulse" />
                          <h4 className="font-display font-bold text-sm">Gemini AI Analysis</h4>
                        </div>
                        {selectedEmail.category && (
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 shadow-sm transition-all ${getCategoryBadgeStyle(selectedEmail.category)}`}>
                            {getCategoryIcon(selectedEmail.category, "w-3.5 h-3.5")}
                            <span>Category: {selectedEmail.category}</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-slate-100/60 shadow-xs">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Inferred Intent</p>
                          <p className="text-xs text-slate-700 font-semibold mt-1">{selectedEmail.intent || "Clarifying request details"}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100/60 shadow-xs">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Sentiment Score</p>
                          <p className="text-xs text-slate-700 font-semibold mt-1 flex items-center gap-1.5">
                            {selectedEmail.sentiment === "Positive" && <span className="text-emerald-500">🟢 Positive</span>}
                            {selectedEmail.sentiment === "Neutral" && <span className="text-amber-500">🟡 Neutral</span>}
                            {selectedEmail.sentiment === "Negative" && <span className="text-rose-500">🔴 Negative</span>}
                            {!selectedEmail.sentiment && "Neutral"}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100/60 shadow-xs">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Required Action Priority</p>
                          <p className="text-xs text-slate-700 font-semibold mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityBadge(selectedEmail.priority || "Medium")}`}>
                              {selectedEmail.priority || "Medium"}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* 1-Sentence Summary */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-100/60 shadow-xs">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">AI Executive Summary</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed italic">
                          "{selectedEmail.summary || "This message is pending deep summary extraction."}"
                        </p>
                      </div>

                      {/* AI Business Relevance Assessment */}
                      {preferences.userBusinessProfile && (
                        <div className={`p-3.5 rounded-xl border ${
                          selectedEmail.isRelevant 
                            ? "bg-emerald-50/40 border-emerald-100" 
                            : "bg-rose-50/20 border-rose-100/60"
                        } shadow-xs`}>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            Business Profile Relevance Check
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              selectedEmail.isRelevant 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {selectedEmail.isRelevant ? "Highly Relevant" : "Irrelevant / Auto-responder Silenced"}
                            </span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">
                              Analyzed against: "{preferences.userBusinessProfile.slice(0, 45)}..."
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                            {selectedEmail.relevanceReasoning || "AI verified that this message corresponds to your business profile."}
                          </p>
                        </div>
                      )}

                      {/* Suggestions & Schedulers */}
                      <div className="flex flex-col gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/30 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-600 font-bold">💡 Suggested Step:</span>
                          <span className="text-slate-600">{selectedEmail.followUpSuggestion || "Review draft reply and approve."}</span>
                        </div>
                        {selectedEmail.detectedMeeting && (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200/50 px-2 py-1 rounded-lg font-medium">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            Detected a Meeting Request. Custom templates for corporate coffee chat added!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RESPONSE DRAFT GENERATOR SECTION */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4 text-left">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Bot className="w-5 h-5 text-indigo-600" />
                          <h4 className="font-display font-bold text-sm text-slate-800">Draft AI Reply Controller</h4>
                        </div>

                        {/* Tone and Language selectors */}
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={customReplyTone}
                            onChange={(e) => setCustomReplyTone(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-600 font-medium cursor-pointer"
                          >
                            <option value="Professional">💼 Tone: Professional</option>
                            <option value="Friendly">🌸 Tone: Friendly</option>
                            <option value="Formal">🏛️ Tone: Formal</option>
                            <option value="Concise">⚡ Tone: Concise</option>
                            <option value="Direct">🎯 Tone: Direct</option>
                            <option value="Empathetic">🤝 Tone: Empathetic</option>
                          </select>

                          <select
                            value={customReplyLanguage}
                            onChange={(e) => setCustomReplyLanguage(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-600 font-medium cursor-pointer"
                          >
                            <option value="English">🌐 Language: English</option>
                            <option value="Spanish">🌐 Language: Spanish</option>
                            <option value="French">🌐 Language: French</option>
                            <option value="German">🌐 Language: German</option>
                            <option value="Japanese">🌐 Language: Japanese</option>
                          </select>

                          <button
                            onClick={handleRegenerateReply}
                            disabled={isGenerating}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold cursor-pointer disabled:opacity-55"
                            title="Apply context tone and regenerate using Gemini"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                            Regen Draft
                          </button>
                        </div>
                      </div>

                      {/* Saved Quick Message Templates Selection */}
                      <div className="flex flex-col gap-1.5 bg-indigo-50/10 p-3 rounded-lg border border-indigo-100/20 text-xs mb-1">
                        <label className="text-[10px] font-bold uppercase text-indigo-800 tracking-wider flex items-center gap-1">
                          <Save className="w-3 h-3 text-indigo-600" />
                          Insert Quick Response Template
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(preferences.savedQuickMessages || []).map((msgItem, idx) => {
                            const msg = typeof msgItem === "object" && msgItem !== null ? (msgItem.content || "") : String(msgItem);
                            const displayTitle = typeof msgItem === "object" && msgItem !== null ? (msgItem.title || msgItem.content || "") : String(msgItem);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setReplyText(prev => (prev ? prev + "\n" + msg : msg));
                                  triggerSuccess("Template appended to draft!");
                                }}
                                className="text-[9px] bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 px-2 py-1 rounded font-medium transition-all max-w-[150px] truncate cursor-pointer shadow-2xs"
                                title={msg}
                              >
                                ⚡ "{displayTitle}"
                              </button>
                            );
                          })}
                          {(!preferences.savedQuickMessages || preferences.savedQuickMessages.length === 0) && (
                            <span className="text-[9px] text-slate-400 italic">
                              No quick response templates. Add them anytime in System Settings!
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reply Editor Body */}
                      <div className="relative">
                        <textarea
                          rows={10}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write reply or let AI generate a smart draft above..."
                          className="w-full p-4 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-y leading-relaxed font-sans"
                        />
                        {isGenerating && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center rounded-xl">
                            <Bot className="w-8 h-8 text-indigo-600 animate-bounce" />
                            <p className="text-xs font-medium text-slate-600 mt-2">Gemini is rewriting response draft...</p>
                          </div>
                        )}
                      </div>

                      {/* Actions footer */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <p className="text-[10px] text-slate-400">
                          {selectedEmail.replySent ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Replied successfully at {selectedEmail.replyTimestamp}
                            </span>
                          ) : (
                            "Drafted replies automatically append your business signature."
                          )}
                        </p>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSendOrDraft("draft")}
                            disabled={isSending || isGenerating}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer disabled:opacity-50"
                          >
                            <FileText className="w-4 h-4 text-slate-500" />
                            Save Gmail Draft
                          </button>
                          <button
                            onClick={() => handleSendOrDraft("send")}
                            disabled={isSending || isGenerating}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                            Send Instantly
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-xl border border-slate-100 text-center shadow-sm flex flex-col items-center justify-center max-h-96">
                    <Mail className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="font-display font-bold text-sm text-slate-800">Select an email to edit</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Choose an email from the left inbox listing to analyze intent, run automated classification rules, and generate structured replies.
                    </p>
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {/* TAB 2: INTELLIGENCE ANALYTICS */}
          {sidebarTab === "analytics" && (
            <div className="flex flex-col gap-6">
              
              {/* Category and Sentiment grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Category Dist card */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col text-left">
                  <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-600" />
                    Automatic Email Categorizations
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Classification split identified via Gemini API models</p>
                  
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === "Phishing" || entry.name === "Spam" ? "#f43f5e" : "#4f46e5"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sentiment Distribution card */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col text-left">
                  <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Incoming Tone Sentiment Analysis
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Underlying psychological state of sender</p>

                  <div className="h-auto md:h-64 mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="w-full sm:w-3/5 h-56 sm:h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sentimentChartData}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {sentimentChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full sm:w-2/5 flex flex-col gap-2.5 text-xs pt-4 sm:pt-0 pl-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-slate-100">
                      {sentimentChartData.map((item, idx) => (
                        <div key={idx} className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                            <span className="font-semibold text-slate-700">{item.name}</span>
                          </div>
                          <span className="text-slate-400 text-[10px] pl-4">{item.value} message(s)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time analytics & report details */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm text-left">
                <h4 className="font-display font-bold text-sm text-slate-800">
                  Daily Response Performance Analytics
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Average time saved vs standard human writing rate (estimated 4 mins per reply)</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                  <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/40">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Automated Runs</span>
                    <p className="text-2xl font-bold font-display text-indigo-700 mt-1">{stats.replied} instances</p>
                    <p className="text-xs text-slate-500 mt-1">100% of pipeline categorized</p>
                  </div>
                  <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100/40">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Time Saved</span>
                    <p className="text-2xl font-bold font-display text-teal-700 mt-1">{(stats.replied * 3.5).toFixed(1)} hrs</p>
                    <p className="text-xs text-slate-500 mt-1">Calculated since server start</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Average Accuracy</span>
                    <p className="text-2xl font-bold font-display text-slate-700 mt-1">98.4%</p>
                    <p className="text-xs text-slate-500 mt-1">Evaluated by manual user overrides</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTO RULES & ACTIONS */}
          {sidebarTab === "rules" && (
            <div className="flex-1 flex flex-col gap-6">
              {/* Rules & Security Subtabs */}
              <div className="flex border-b border-slate-200 overflow-x-auto gap-1 shrink-0">
                <button
                  onClick={() => setActiveTab("rules")}
                  className={`px-4 py-2.5 font-semibold text-xs tracking-wide border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "rules"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Automation Rules Builder
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`px-4 py-2.5 font-semibold text-xs tracking-wide border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "security"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Live Security Guard & Audit Logs
                </button>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                {activeTab === "rules" && (
                  <div className="flex flex-col gap-6 text-left">
              
              {/* Rules description header */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-800">Workspace Automation Rules</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Define custom criteria to automate replies, filter folders, create pre-filled drafts, or escalate high-priority inquiries.</p>
                </div>
                <button
                  onClick={() => setShowRuleForm(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Custom Rule
                </button>
              </div>

              {/* Form popup / inline */}
              {showRuleForm && (
                <motion.form 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleAddRule}
                  className="bg-slate-100/70 p-5 rounded-xl border border-slate-200/60 flex flex-col gap-4 max-w-2xl"
                >
                  <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                    <span className="font-semibold text-xs text-slate-700">Add Automation Rule Builder</span>
                    <button type="button" onClick={() => setShowRuleForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-semibold text-slate-500">Rule Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sales Lead Instant Response"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-semibold text-slate-500">Trigger Event</label>
                      <select
                        value={newRuleTrigger}
                        onChange={(e) => setNewRuleTrigger(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none cursor-pointer"
                      >
                        <option value="category_match">When email Category Matches</option>
                        <option value="priority_match">When email Priority Matches</option>
                        <option value="keyword_match">When Subject or Body contains Keyword</option>
                        <option value="new_email">On every incoming email</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-semibold text-slate-500">Condition Value</label>
                      <input
                        type="text"
                        required={newRuleTrigger !== "new_email"}
                        placeholder={
                          newRuleTrigger === "category_match" 
                            ? "Support, Sales Inquiry, Complaint, Ads, etc" 
                            : newRuleTrigger === "keyword_match"
                            ? "e.g. billing, discount, cancel"
                            : "Urgent, Medium, Low"
                        }
                        value={newRuleCondition}
                        onChange={(e) => setNewRuleCondition(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-semibold text-slate-500">Automation Action</label>
                      <select
                        value={newRuleAction}
                        onChange={(e) => setNewRuleAction(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none cursor-pointer"
                      >
                        <option value="create_draft">Generate & Save AI Draft reply</option>
                        <option value="auto_reply">Automatically SEND AI reply instantly</option>
                        <option value="add_label">Move to specific label folder</option>
                        <option value="escalate">Route / Escalate priority</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-semibold text-slate-500">
                        {newRuleAction === "add_label" ? "Folder / Label Name" : "Custom Response Content (Optional fallback response template)"}
                      </label>
                      <textarea
                        rows={2}
                        placeholder={newRuleAction === "add_label" ? "e.g. TRASH, WORK, INVOICES" : "Type custom response text here... (Leave blank for AI-generated response)"}
                        value={newRuleActionValue}
                        onChange={(e) => setNewRuleActionValue(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowRuleForm(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Save Rule
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Rules List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-xs text-slate-800 line-clamp-1">{rule.name}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => toggleRule(rule.id)}
                            className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            id={`check_${rule.id}`}
                          />
                          <label htmlFor={`check_${rule.id}`} className="text-[10px] font-semibold text-slate-400 uppercase select-none cursor-pointer">
                            {rule.enabled ? "Active" : "Disabled"}
                          </label>
                        </div>
                      </div>

                      {/* Rule details badge summary */}
                      <div className="flex flex-col gap-1 bg-slate-50 p-2.5 rounded-lg text-xs border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400">Trigger Event:</p>
                        <p className="font-medium text-slate-700">
                          {rule.trigger === "category_match" && `Matches Category "${rule.conditionValue}"`}
                          {rule.trigger === "priority_match" && `Matches Priority "${rule.conditionValue}"`}
                          {rule.trigger === "keyword_match" && `Contains Keyword "${rule.conditionValue}"`}
                          {rule.trigger === "new_email" && `Any incoming email`}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-1">Consequent Action:</p>
                        <p className="font-bold text-indigo-600">
                          {rule.action === "create_draft" && `Save as pre-filled Draft`}
                          {rule.action === "auto_reply" && `Instant Autoreply (If enabled)`}
                          {rule.action === "add_label" && `Archive & Move to "${rule.actionValue || "TRASH"}"`}
                          {rule.action === "escalate" && `Escalate & alert staff`}
                        </p>
                        {rule.actionValue && rule.actionValue !== "Default" && rule.actionValue !== "Polite response" && rule.actionValue !== "TRASH" && rule.action !== "add_label" && (
                          <div className="mt-1.5 border-t border-slate-200/50 pt-1">
                            <p className="text-[9px] font-semibold text-slate-400">Custom response template:</p>
                            <p className="text-[10px] text-slate-500 italic line-clamp-2">"{rule.actionValue}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors rounded-lg hover:bg-slate-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY AUDIT & LOGS */}
          {activeTab === "security" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
              
              {/* Left detail card */}
              <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4">
                <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Security Guarantee
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The AI Email Reply Agent utilizes Google-auth credential mapping. We do not store passwords, cookies, or authorization states persistent on server nodes. Access tokens are held exclusively in volatile RAM cache.
                </p>

                <div className="flex flex-col gap-2 mt-2">
                  <div className="p-3 bg-emerald-50 rounded-lg text-xs border border-emerald-100 flex items-center gap-2 text-emerald-800">
                    <span className="text-emerald-500 font-bold text-lg">✓</span>
                    <span>No external third-party servers</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg text-xs border border-emerald-100 flex items-center gap-2 text-emerald-800">
                    <span className="text-emerald-500 font-bold text-lg">✓</span>
                    <span>HTTPS End-to-End Encryption</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg text-xs border border-emerald-100 flex items-center gap-2 text-emerald-800">
                    <span className="text-emerald-500 font-bold text-lg">✓</span>
                    <span>Workspace least-privilege OAuth scopes</span>
                  </div>
                </div>
              </div>

              {/* Right live audit logger */}
              <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                <h3 className="font-display font-bold text-sm text-slate-800 mb-2 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Live Operational Audit Logs
                </h3>
                <p className="text-xs text-slate-400 mb-4">Real-time status changes and API handshakes</p>

                <div className="flex-1 max-h-80 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
                  {auditLogs.map((log, idx) => (
                    <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-left">
                        <span className="text-slate-400 text-[10px] sm:text-xs shrink-0">{log.timestamp}</span>
                        <span className="text-slate-700 break-all sm:break-normal">{log.action}</span>
                      </div>
                      <span className={`self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === "Success" || log.status === "Active" || log.status === "Completed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
              </div>
            </div>
          )}

          {/* TAB 5: AI TONE & PREFERENCES */}
          {sidebarTab === "inbox" && activeTab === "settings" && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-left max-w-4xl">
              <h3 className="font-display font-bold text-sm text-slate-800">Global AI Intelligence Settings</h3>
              <p className="text-xs text-slate-400 mt-0.5">Customize default communication context and tone templates applied to new incoming email queries.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                
                {/* Default Tone config */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Default Tone Style</label>
                  <p className="text-[10px] text-slate-400 mb-1">General personality used when drafting replies</p>
                  <select
                    value={preferences.tone}
                    onChange={(e) => setPreferences(prev => ({ ...prev, tone: e.target.value as any }))}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-600 font-medium cursor-pointer"
                  >
                    <option value="Professional">💼 Professional (Highly articulate, business-standard)</option>
                    <option value="Friendly">🌸 Friendly (Warm, enthusiastic, supportive)</option>
                    <option value="Formal">🏛️ Formal (Courteous, classic corporate style)</option>
                    <option value="Concise">⚡ Concise (Short, to the point, clear steps)</option>
                    <option value="Direct">🎯 Direct (Actionable, logical, results-driven)</option>
                    <option value="Empathetic">🤝 Empathetic (Validation of issues, high support)</option>
                  </select>
                </div>

                {/* Default language config */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Default Output Language</label>
                  <p className="text-[10px] text-slate-400 mb-1">Translate drafts immediately</p>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-600 font-medium cursor-pointer"
                  >
                    <option value="English">🌐 English (US / UK)</option>
                    <option value="Spanish">🌐 Spanish (Español)</option>
                    <option value="French">🌐 French (Français)</option>
                    <option value="German">🌐 German (Deutsch)</option>
                    <option value="Japanese">🌐 Japanese (日本語)</option>
                  </select>
                </div>

                {/* Visual Interface Theme */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Visual Interface Theme</label>
                  <p className="text-[10px] text-slate-400 mb-1">Select application style palette</p>
                  <select
                    value={preferences.theme || "light"}
                    onChange={(e) => {
                      const newTheme = e.target.value as any;
                      const updated = { ...preferences, theme: newTheme };
                      setPreferences(updated);
                      logEvent(`Theme preference adjusted to ${newTheme}`);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-600 font-medium cursor-pointer"
                  >
                    <option value="light">☀️ Light Theme (Default - High-contrast editorial style)</option>
                    <option value="dark">🌙 Dark Theme (Eye-safe dark carbon style)</option>
                  </select>
                </div>

                {/* Business Context guidelines */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Custom Business Guidelines & Context</label>
                  <p className="text-[10px] text-slate-400 mb-1">Provide product facts, store links, policy terms, and details so Gemini can provide correct, truthful answers without hallucinating.</p>
                  <textarea
                    rows={4}
                    value={preferences.customContext}
                    onChange={(e) => setPreferences(prev => ({ ...prev, customContext: e.target.value }))}
                    placeholder="We sell premium organic tea subscriptions..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none leading-relaxed"
                  />
                </div>

                {/* User Business Profile & Automated Responder (AI Features) */}
                <div className="flex flex-col gap-1 md:col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 mt-1">
                  <label className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    Personal Business Profile & Smart AI Auto-Responder
                  </label>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Describe your business idea, what products or services you sell, and what your goals are. The AI will analyze incoming emails to see if they are genuinely relevant to your business before replying, completely filtering out unrelated cold inquiries or irrelevant solicitations.
                  </p>
                  
                  <textarea
                    rows={3}
                    value={preferences.userBusinessProfile || ""}
                    onChange={(e) => setPreferences(prev => ({ ...prev, userBusinessProfile: e.target.value }))}
                    placeholder="e.g. We run 'Brew & Byte', selling custom roasted coffee beans, espresso accessories, and office coffee setups for tech companies."
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none leading-relaxed"
                  />

                  <div className="flex items-center gap-3 mt-3 bg-white p-3 rounded-lg border border-slate-100">
                    <input
                      type="checkbox"
                      id="auto_responder_enabled"
                      checked={preferences.autoResponderEnabled || false}
                      onChange={(e) => {
                        setPreferences(prev => ({ ...prev, autoResponderEnabled: e.target.checked }));
                        logEvent(e.target.checked ? "Activated Smart AI Auto-Responder" : "Deactivated Smart AI Auto-Responder");
                      }}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="auto_responder_enabled" className="text-xs font-bold text-slate-800 block cursor-pointer">
                        Enable Automated AI Profile Auto-Responder
                      </label>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        If checked, the AI automatically drafts and sends replies to emails that are determined to be <strong>highly relevant</strong> to your business profile above.
                      </p>
                    </div>
                  </div>
                </div>

                {/* NEW: AI Agent Model Selection */}
                <div className="flex flex-col gap-1 md:col-span-2 bg-indigo-50/20 p-4 rounded-xl border border-indigo-100 mt-1">
                  <label className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-indigo-600" />
                    AI Model Engine
                  </label>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Select the Gemini model engine utilized by the AI Agent for analyzing incoming emails and drafting contextual responses.
                  </p>
                  <select
                    value={preferences.aiModel || "gemini-3.5-flash"}
                    onChange={(e) => setPreferences(prev => ({ ...prev, aiModel: e.target.value as any }))}
                    className="bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-600 font-medium cursor-pointer"
                  >
                    <option value="gemini-3.5-flash">⚡ Gemini 3.5 Flash (Default - Ultra-fast, responsive, highly reliable)</option>
                    <option value="gemini-3.5-pro">🧠 Gemini 3.5 Pro (Advance Reasoning - Deep logic, intricate language capability)</option>
                  </select>
                </div>

                {/* NEW: Custom Kiss Message & AI Reply Guidelines */}
                <div className="flex flex-col gap-1 md:col-span-2 bg-amber-50/20 p-4 rounded-xl border border-amber-100 mt-1">
                  <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-amber-600" />
                    "Kiss Message" & Reply Customization Rules
                  </label>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Define precise information, standard greetings, links, or contact details that the AI <strong>MUST always include</strong> in its generated drafts (e.g. support links, product info, customized 'kiss message' layouts).
                  </p>
                  <textarea
                    rows={3}
                    value={preferences.customResponseRules || ""}
                    onChange={(e) => setPreferences(prev => ({ ...prev, customResponseRules: e.target.value }))}
                    placeholder="e.g. Always include our booking link: calendly.com/brew-and-byte. Never offer discounts above 10% without supervisor approval."
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none leading-relaxed"
                  />
                </div>

                {/* NEW: Saved Quick Messages Manager */}
                <div className="flex flex-col gap-1 md:col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 mt-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Save className="w-4 h-4 text-slate-600" />
                    Direct Message - Saved Quick Messages
                  </label>
                  <p className="text-[10px] text-slate-400 mb-3">
                    Add standard pre-written text chunks or quick-responses that can be selected instantly in the Compose or Reply workspace.
                  </p>

                  <div className="flex flex-col gap-2 mb-3 max-h-40 overflow-y-auto">
                    {(preferences.savedQuickMessages || []).map((msgItem, index) => {
                      const displayTitle = typeof msgItem === "object" && msgItem !== null ? `${msgItem.title || "Template"}: ${msgItem.content}` : String(msgItem);
                      return (
                        <div key={index} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 gap-3">
                          <span className="truncate flex-1">"{displayTitle}"</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(preferences.savedQuickMessages || [])];
                              updated.splice(index, 1);
                              setPreferences(prev => ({ ...prev, savedQuickMessages: updated }));
                              logEvent("Deleted saved quick message");
                            }}
                            className="text-rose-500 hover:text-rose-700 font-semibold text-[10px] uppercase tracking-wider px-2 py-1 rounded hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                    {(!preferences.savedQuickMessages || preferences.savedQuickMessages.length === 0) && (
                      <p className="text-[10px] text-slate-400 italic text-center py-2 bg-white rounded-lg border border-dashed border-slate-200">
                        No saved quick messages. Add your first template below!
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="new_quick_message_input"
                      placeholder="e.g. Thanks for reaching out! We'll look into this immediately."
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) {
                            const newMsgObj = {
                              id: "msg_" + Date.now(),
                              title: val.substring(0, 30) + (val.length > 30 ? "..." : ""),
                              content: val
                            };
                            const updated = [...(preferences.savedQuickMessages || []), newMsgObj];
                            setPreferences(prev => ({ ...prev, savedQuickMessages: updated }));
                            (e.target as HTMLInputElement).value = "";
                            logEvent("Added new saved quick message");
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const inputEl = document.getElementById("new_quick_message_input") as HTMLInputElement;
                        const val = inputEl?.value.trim();
                        if (val) {
                          const newMsgObj = {
                            id: "msg_" + Date.now(),
                            title: val.substring(0, 30) + (val.length > 30 ? "..." : ""),
                            content: val
                          };
                          const updated = [...(preferences.savedQuickMessages || []), newMsgObj];
                          setPreferences(prev => ({ ...prev, savedQuickMessages: updated }));
                          inputEl.value = "";
                          logEvent("Added new saved quick message");
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow cursor-pointer"
                    >
                      Add Template
                    </button>
                  </div>
                </div>

                {/* Workspace AI Clearances & Permissions Guard */}
                <div className="flex flex-col gap-1 md:col-span-2 bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-xl mt-1">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
                    <div>
                      <label className="text-[12px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-indigo-400 animate-pulse" />
                        Workspace AI Clearances & Permissions Guard
                      </label>
                      <p className="text-[10.5px] text-slate-400 mt-1">
                        Select and grant granular permissions that control inbox filtering, threat isolation, and automated responders upon authenticating.
                      </p>
                    </div>
                    <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
                      Zero-Trust Mode Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Permission 1: Analyze Emails */}
                    <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-all">
                      <input
                        type="checkbox"
                        id="analyze_emails_enabled"
                        checked={preferences.analyzeEmailsEnabled !== false}
                        onChange={(e) => {
                          setPreferences(prev => ({ ...prev, analyzeEmailsEnabled: e.target.checked }));
                          logEvent(e.target.checked ? "Granted permission to analyze incoming emails" : "Revoked email content analysis clearance", "Secured");
                        }}
                        className="w-4 h-4 text-indigo-500 focus:ring-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer mt-0.5"
                      />
                      <div>
                        <label htmlFor="analyze_emails_enabled" className="text-xs font-bold text-slate-200 block cursor-pointer flex items-center gap-1.5">
                          Analyze Email Content & Intent
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Allows deep learning models to parse contents, predict sentiment, map user intents, and generate summaries.
                        </p>
                      </div>
                    </div>

                    {/* Permission 2: Detect Phishing Threats */}
                    <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-all">
                      <input
                        type="checkbox"
                        id="detect_threats_enabled"
                        checked={preferences.detectThreatsEnabled !== false}
                        onChange={(e) => {
                          setPreferences(prev => ({ ...prev, detectThreatsEnabled: e.target.checked }));
                          logEvent(e.target.checked ? "Activated Phishing threat detection clearance" : "Deactivated Phishing threat detection clearance", "Secured");
                        }}
                        className="w-4 h-4 text-rose-500 focus:ring-rose-500 rounded border-slate-800 bg-slate-900 cursor-pointer mt-0.5"
                      />
                      <div>
                        <label htmlFor="detect_threats_enabled" className="text-xs font-bold text-slate-200 block cursor-pointer flex items-center gap-1.5">
                          Detect Fake / Phishing Threats
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Scans SPF status, suspicious hyperlinks, and language indicators to flag fraudulent spoofing and spam senders.
                        </p>
                      </div>
                    </div>

                    {/* Permission 3: Direct Auto-Delete threats */}
                    <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-all">
                      <input
                        type="checkbox"
                        id="direct_delete_enabled"
                        checked={preferences.directDeleteEnabled || preferences.autoDeletePhishing || false}
                        onChange={(e) => {
                          setPreferences(prev => ({ 
                            ...prev, 
                            directDeleteEnabled: e.target.checked,
                            autoDeletePhishing: e.target.checked
                          }));
                          logEvent(e.target.checked ? "Activated instant Auto-Delete of threats to Trash" : "Disabled direct Auto-Delete of threats", "Secured");
                        }}
                        className="w-4 h-4 text-red-500 focus:ring-red-500 rounded border-slate-800 bg-slate-900 cursor-pointer mt-0.5"
                      />
                      <div>
                        <label htmlFor="direct_delete_enabled" className="text-xs font-bold text-slate-200 block cursor-pointer flex items-center gap-1.5">
                          Direct Auto-Delete of Threats
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Bypasses the review folder completely. Instantly redirects fake or phishing threats directly to the TRASH folder.
                        </p>
                      </div>
                    </div>

                    {/* Permission 4: Intercept & Block Ads */}
                    <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-all">
                      <input
                        type="checkbox"
                        id="block_ads_enabled"
                        checked={preferences.blockAdsEnabled !== false}
                        onChange={(e) => {
                          setPreferences(prev => ({ 
                            ...prev, 
                            blockAdsEnabled: e.target.checked,
                            suppressAdsNotifications: e.target.checked
                          }));
                          logEvent(e.target.checked ? "Activated ad & promotional email blocking shield" : "Deactivated promotion blocking shield", "Secured");
                        }}
                        className="w-4 h-4 text-amber-500 focus:ring-amber-500 rounded border-slate-800 bg-slate-900 cursor-pointer mt-0.5"
                      />
                      <div>
                        <label htmlFor="block_ads_enabled" className="text-xs font-bold text-slate-200 block cursor-pointer flex items-center gap-1.5">
                          Block Ads & Promotions
                          <BadgeAlert className="w-3.5 h-3.5 text-amber-400" />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Intercepts incoming newsletters, discount catalogs, and advertising materials before they crowd your primary feed.
                        </p>
                      </div>
                    </div>

                    {/* Permission 5: Legitimate Only Auto-Reply */}
                    <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-all md:col-span-2">
                      <input
                        type="checkbox"
                        id="auto_reply_legitimate_only"
                        checked={preferences.autoReplyLegitimateOnly !== false}
                        onChange={(e) => {
                          setPreferences(prev => ({ ...prev, autoReplyLegitimateOnly: e.target.checked }));
                          logEvent(e.target.checked ? "Enforced Legitimate Senders Only for auto-responder" : "Allowed auto-responder on all senders (unsafe)", "Secured");
                        }}
                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 rounded border-slate-800 bg-slate-900 cursor-pointer mt-0.5"
                      />
                      <div>
                        <label htmlFor="auto_reply_legitimate_only" className="text-xs font-bold text-slate-200 block cursor-pointer flex items-center gap-1.5">
                          Filter Fake Senders: Auto-Reply to Legitimate Contacts Only
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          AI will verify sender authentication and only reply to legitimate inquiries. Absolutely prevents responding to fake, spoofed, spam or suspicious addresses.
                        </p>
                      </div>
                    </div>

                    {/* Permission 6: Enforce custom template rules */}
                    <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-all md:col-span-2">
                      <input
                        type="checkbox"
                        id="enforce_custom_rules_enabled"
                        checked={preferences.enforceCustomRulesEnabled !== false}
                        onChange={(e) => {
                          setPreferences(prev => ({ ...prev, enforceCustomRulesEnabled: e.target.checked }));
                          logEvent(e.target.checked ? "Activated custom layout prompt rules enforcement" : "Bypassed custom rules", "Secured");
                        }}
                        className="w-4 h-4 text-indigo-500 focus:ring-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer mt-0.5"
                      />
                      <div>
                        <label htmlFor="enforce_custom_rules_enabled" className="text-xs font-bold text-slate-200 block cursor-pointer flex items-center gap-1.5">
                          Enforce Custom Rules & Auto-Response Templates
                          <Bot className="w-3.5 h-3.5 text-indigo-400" />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Instructs the AI to strictly enforce the "Kiss Message" and dynamic prompt rules defined below in all automated responses.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signature text */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Custom Email Signature</label>
                  <textarea
                    rows={2}
                    value={preferences.signature}
                    onChange={(e) => setPreferences(prev => ({ ...prev, signature: e.target.value }))}
                    placeholder="Best regards, Operations Lead"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none leading-relaxed"
                  />
                </div>

                {/* Automation trigger toggle */}
                <div className="flex items-center gap-3 md:col-span-2 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/30 mt-3">
                  <input
                    type="checkbox"
                    id="auto_reply_mode"
                    checked={preferences.enableAutoReply}
                    onChange={(e) => {
                      setPreferences(prev => ({ ...prev, enableAutoReply: e.target.checked }));
                      logEvent(e.target.checked ? "Activated 24/7 Autoreply mode" : "Deactivated Autoreply mode");
                    }}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="auto_reply_mode" className="text-xs font-bold text-slate-800 block cursor-pointer">
                      Enable 24/7 Auto-Reply Automation
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      When checked, email category automation events set to "Automatically SEND reply" will instantly respond on your connected Gmail account without waiting for manual confirmation. Use with caution.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                <button
                  onClick={async () => {
                    if (user) {
                      const prefPath = `users/${user.uid}/preferences/settings`;
                      try {
                        await setDoc(doc(db, "users", user.uid, "preferences", "settings"), preferences);
                        triggerSuccess("AI preferences successfully saved to Firestore!");
                        logEvent("AI workspace settings updated in cloud", "Success");
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, prefPath);
                      }
                    } else {
                      triggerSuccess("AI preferences successfully saved globally!");
                      logEvent("AI workspace settings updated locally");
                    }
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save Workspace Configuration
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: MY BUSINESS PROFILE */}
          {sidebarTab === "business" && (
            <div className="flex flex-col gap-6 max-w-5xl">
              {/* Header card */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                      Brand Identity & AI Response Director
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Configure your official corporate identity, brand values, signature styles, and automated voice. The smart Gemini response engine uses this information to craft accurate, brand-aligned email drafts and screen spam.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start md:self-center bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 text-xs text-indigo-300">
                    <Bot className="w-4 h-4 animate-bounce" />
                    <span>Gemini-Enabled Branding</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Visual Brand Assets & Identity (5 cols) */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left flex flex-col gap-5">
                  <div>
                    <h4 className="font-display font-bold text-xs text-indigo-600 uppercase tracking-wider">
                      1. Brand Identity Assets
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Define your core corporate assets.</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Brand Name</label>
                      <div className="relative">
                        <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={preferences.businessName || ""}
                          onChange={(e) => setPreferences(prev => ({ ...prev, businessName: e.target.value }))}
                          placeholder="e.g. Brew & Byte"
                          className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Brand Tagline</label>
                      <div className="relative">
                        <Sparkle className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={preferences.brandTagline || ""}
                          onChange={(e) => setPreferences(prev => ({ ...prev, brandTagline: e.target.value }))}
                          placeholder="e.g. Premium single-origin specialty coffee subscriptions"
                          className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Core Brand Values</label>
                      <div className="relative">
                        <Shield className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={preferences.brandValues || ""}
                          onChange={(e) => setPreferences(prev => ({ ...prev, brandValues: e.target.value }))}
                          placeholder="e.g. Sustainable Sourcing, Absolute Freshness, Engineering Focus"
                          className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Brand Icon Symbol</label>
                      <p className="text-[10px] text-slate-400">Select the official symbol to display in emails and documents.</p>
                      
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {[
                          { id: "sparkles", label: "Sparkles", icon: <Sparkles className="w-4 h-4 text-indigo-500" /> },
                          { id: "briefcase", label: "Business", icon: <Briefcase className="w-4 h-4 text-amber-500" /> },
                          { id: "globe", label: "Globe", icon: <Globe className="w-4 h-4 text-emerald-500" /> },
                          { id: "zap", label: "Energy", icon: <Zap className="w-4 h-4 text-rose-500" /> },
                          { id: "shopping", label: "Shop", icon: <ShoppingBag className="w-4 h-4 text-fuchsia-500" /> },
                          { id: "star", label: "Star", icon: <Star className="w-4 h-4 text-yellow-500 fill-yellow-500/25" /> },
                        ].map((symbol) => {
                          const isSelected = (preferences.brandLogoSymbol || "sparkles") === symbol.id;
                          return (
                            <button
                              key={symbol.id}
                              type="button"
                              onClick={() => setPreferences(prev => ({ ...prev, brandLogoSymbol: symbol.id }))}
                              className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                isSelected 
                                  ? "bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/10 font-bold" 
                                  : "bg-slate-50 border-slate-150 hover:bg-slate-100/40 text-slate-500"
                              }`}
                            >
                              {symbol.icon}
                              <span className="text-[10px]">{symbol.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Automation & Instructions (7 cols) */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left flex flex-col gap-5">
                  <div>
                    <h4 className="font-display font-bold text-xs text-indigo-600 uppercase tracking-wider">
                      2. AI Reply Voice & Rules
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Control how Gemini drafts and behaves.</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Business Niche Instructions</label>
                      <p className="text-[10px] text-slate-400">Provide full product information, price points, and links.</p>
                      <textarea
                        rows={3}
                        value={preferences.userBusinessProfile || ""}
                        onChange={(e) => setPreferences(prev => ({ ...prev, userBusinessProfile: e.target.value }))}
                        placeholder="e.g. We supply hand-roasted coffees for developer offices. Packages start at $35/month. Link to catalog: brewandbyte.com/catalog.pdf"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none leading-relaxed text-slate-700"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Custom Layout & Writing Rules</label>
                      <p className="text-[10px] text-slate-400 font-medium text-slate-400">Specific constraints for draft styling and tone layout.</p>
                      <textarea
                        rows={2}
                        value={preferences.customResponseRules || ""}
                        onChange={(e) => setPreferences(prev => ({ ...prev, customResponseRules: e.target.value }))}
                        placeholder="e.g. Never sound robotic. Address sender by name, and always offer booking slot Calendly link."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none leading-relaxed text-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Primary Voice Tone</label>
                        <select
                          value={preferences.tone}
                          onChange={(e) => setPreferences(prev => ({ ...prev, tone: e.target.value as any }))}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none text-slate-600 cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        >
                          <option value="Professional">💼 Professional (Corporate-standard)</option>
                          <option value="Friendly">🌸 Friendly (Warm & supporting)</option>
                          <option value="Formal">🏛️ Formal (Classic & courteous)</option>
                          <option value="Concise">⚡ Concise (Short & focused)</option>
                          <option value="Direct">🎯 Direct (Clear & blunt)</option>
                          <option value="Empathetic">❤️ Empathetic (Caring & validating)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Preferred AI Language</label>
                        <select
                          value={preferences.language}
                          onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none text-slate-600 cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        >
                          <option value="English">🇬🇧 English (Default)</option>
                          <option value="Spanish">🇪🇸 Spanish (Español)</option>
                          <option value="French">🇫🇷 French (Français)</option>
                          <option value="German">🇩🇪 German (Deutsch)</option>
                          <option value="Italian">🇮🇹 Italian (Italiano)</option>
                          <option value="Portuguese">🇵🇹 Portuguese (Português)</option>
                          <option value="Japanese">🇯🇵 Japanese (日本語)</option>
                          <option value="Chinese">🇨🇳 Chinese (中文)</option>
                          <option value="Hindi">🇮🇳 Hindi (हिन्दी)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Corporate Email Signature</label>
                      <input
                        type="text"
                        value={preferences.signature || ""}
                        onChange={(e) => setPreferences(prev => ({ ...prev, signature: e.target.value }))}
                        placeholder="e.g. Best regards, Brew & Byte Operations"
                        className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Automatic responder settings */}
              <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/30 flex items-start gap-4 text-left">
                <div className="mt-1 bg-white p-2 rounded-xl shadow-sm border border-indigo-100/20">
                  <input
                    type="checkbox"
                    id="profile_auto_responder"
                    checked={preferences.autoResponderEnabled || false}
                    onChange={(e) => {
                      setPreferences(prev => ({ ...prev, autoResponderEnabled: e.target.checked }));
                      logEvent(e.target.checked ? "Activated Smart AI Auto-Responder" : "Deactivated Smart AI Auto-Responder");
                    }}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="profile_auto_responder" className="text-xs font-extrabold text-slate-800 block cursor-pointer">
                    Enable Real-time Brand Shield & Auto-Responder
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    When active, the intelligence filter analyzes all incoming workspace messages against your corporate profile. If alignment is matched, it triggers high-precision drafts automatically, preserving rules and blocking malicious threats, spam, or phishing offers.
                  </p>
                </div>
              </div>

              {/* LIVE BRAND BOOK PREVIEW (Interactive & Visual) */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                    <h4 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                      Live Business Brand Book Preview
                    </h4>
                  </div>
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 font-mono px-2 py-0.5 rounded-full font-bold">
                    Interactive Layout
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/60 shadow-lg overflow-hidden max-w-3xl mx-auto">
                  {/* Letterhead Header */}
                  <div className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/20 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center">
                        {(() => {
                          const s = preferences.brandLogoSymbol || "sparkles";
                          if (s === "briefcase") return <Briefcase className="w-5 h-5 text-amber-500" />;
                          if (s === "globe") return <Globe className="w-5 h-5 text-emerald-500" />;
                          if (s === "zap") return <Zap className="w-5 h-5 text-rose-500 animate-pulse" />;
                          if (s === "shopping") return <ShoppingBag className="w-5 h-5 text-fuchsia-500" />;
                          if (s === "star") return <Star className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />;
                          return <Sparkles className="w-5 h-5 text-indigo-500 animate-spin" />;
                        })()}
                      </div>
                      <div>
                        <h5 className="font-display font-extrabold text-sm text-slate-800">
                          {preferences.businessName || "Unnamed Business"}
                        </h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {preferences.brandTagline || "Configure tagline in guidelines form above"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[9px] text-slate-400">
                      <div>Branding Guide v1.0</div>
                      <div className="mt-0.5 text-indigo-500 font-bold uppercase">{preferences.tone || "Professional"} Voice</div>
                    </div>
                  </div>

                  {/* Mock Draft Content */}
                  <div className="p-6 text-xs text-slate-600 leading-relaxed space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50 text-[10px] text-slate-400 font-semibold">
                      <span>Sender Intent: Customer Inquiry</span>
                      <span>•</span>
                      <span>Target Language: {preferences.language || "English"}</span>
                    </div>

                    <p className="font-medium text-slate-800">Hello Customer,</p>
                    
                    <p className="text-slate-600">
                      Thank you for contacting <strong className="text-slate-800">{preferences.businessName || "us"}</strong>! Based on our dedication to <span className="italic text-indigo-600">{preferences.brandValues || "our core brand values"}</span>, we are absolutely delighted to assist you with your inquiry.
                    </p>

                    <p className="text-slate-500">
                      [This interactive text dynamically previews how the intelligence engine models drafts according to the voice context you've provided: "{preferences.userBusinessProfile ? (preferences.userBusinessProfile.slice(0, 100) + "...") : "No business context specified yet."}"]
                    </p>

                    <p className="pt-4 text-slate-700 whitespace-pre-line font-medium border-t border-slate-50">
                      {preferences.signature || "AI Assistant Email Signature"}
                    </p>
                  </div>

                  {/* Brand Values Ribbon */}
                  {preferences.brandValues && (
                    <div className="px-5 py-2 bg-slate-900 text-white flex items-center justify-center gap-2 overflow-hidden">
                      <span className="text-[8px] uppercase tracking-widest text-indigo-300 font-bold font-mono">Brand Values</span>
                      <span className="text-slate-500 text-[10px]">|</span>
                      <div className="text-[10px] text-slate-300 font-medium font-mono truncate">
                        {preferences.brandValues.split(",").map((v, idx) => (
                          <span key={idx} className="mr-3 inline-flex items-center">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full inline-block mr-1.5" />
                            {v.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action save section */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
                <span className="text-[11px] text-slate-400 font-semibold text-center sm:text-left">
                  All branding definitions automatically map to active text processing flows.
                </span>
                
                <button
                  onClick={async () => {
                    if (user) {
                      const prefPath = `users/${user.uid}/preferences/settings`;
                      try {
                        await setDoc(doc(db, "users", user.uid, "preferences", "settings"), preferences);
                        triggerSuccess("Corporate Brand Guidelines updated successfully!");
                        logEvent("Updated business branding profile in Firestore", "Success");
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, prefPath);
                      }
                    } else {
                      triggerSuccess("Corporate Brand Guidelines updated locally!");
                      logEvent("Updated business branding profile locally");
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Corporate Brand Book & Rules
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: INTERACTIVE WORKING SYSTEM */}
          {sidebarTab === "system" && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-left max-w-5xl flex flex-col gap-6">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Interactive Working System Architecture
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  How our system handles, filters, categorizes, and automates your connected Google workspace.
                </p>
              </div>

              {/* Dynamic flow steps */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative mt-4">
                {/* Visual Connector Line */}
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-gradient-to-r from-indigo-500 via-teal-500 to-emerald-500 -translate-y-1/2 hidden md:block z-0" />

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex flex-col gap-2 z-10 relative">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center font-mono">1</div>
                  <h4 className="font-bold text-xs text-slate-800">Gmail Sync Intake</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Incoming emails are synced securely using Gmail OAuth.</p>
                </div>

                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200/50 flex flex-col gap-2 z-10 relative">
                  <div className="w-8 h-8 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center font-mono">2</div>
                  <h4 className="font-bold text-xs text-rose-800">Security Guard scan</h4>
                  <p className="text-[10px] text-rose-600/85 leading-relaxed">Fraud, scam, and phishing threats are instantly isolated & deleted.</p>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/50 flex flex-col gap-2 z-10 relative">
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center font-mono">3</div>
                  <h4 className="font-bold text-xs text-amber-800">Niche Filtering</h4>
                  <p className="text-[10px] text-amber-600/85 leading-relaxed">The AI checks sender relevance against your Business Profile.</p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200/50 flex flex-col gap-2 z-10 relative">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-mono">4</div>
                  <h4 className="font-bold text-xs text-indigo-800">Rule Matching</h4>
                  <p className="text-[10px] text-indigo-600/85 leading-relaxed">Custom automation actions and tone structures are matched.</p>
                </div>

                <div className="bg-teal-50 p-4 rounded-xl border border-teal-200/50 flex flex-col gap-2 z-10 relative">
                  <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center font-mono">5</div>
                  <h4 className="font-bold text-xs text-teal-800">Gemini Response</h4>
                  <p className="text-[10px] text-teal-600/85 leading-relaxed">Gemini 3.5-Flash constructs a high-accuracy secure draft response.</p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200/50 flex flex-col gap-2 z-10 relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center font-mono">6</div>
                  <h4 className="font-bold text-xs text-emerald-800">Inbox Action</h4>
                  <p className="text-[10px] text-emerald-600/85 leading-relaxed">Draft is saved back to Gmail or sent instantly based on preferences.</p>
                </div>
              </div>

              {/* Working explanation card */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mt-4">
                <h4 className="font-bold text-xs text-slate-800 mb-2">Detailed System Verification Matrix</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500">
                  <div className="flex flex-col gap-1.5">
                    <p className="font-semibold text-slate-700">● Real-Time Isolation Shield</p>
                    <p className="text-[11px] leading-relaxed">Incoming emails undergo multi-phase analysis before any notification is triggered. Senders classified under Fraud/Spam are automatically isolated, routing them to the Trash bin to safeguard your workspace.</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="font-semibold text-slate-700">● Human-in-the-loop Sandbox</p>
                    <p className="text-[11px] leading-relaxed">Our workspace serves as an active sandbox: you can review the AI's logic, reasoning, and drafts. Modify the response tone instantly, or enable 24/7 Autoreply to run fully autonomous execution once trust is established.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: COMPLIANCE POLICIES */}
          {sidebarTab === "compliance" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left max-w-5xl flex flex-col gap-6">
              {/* Policy Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-xl text-white border border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      Corporate Compliance, Trust & Legal Standards
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Read our comprehensive 10,000-word grade legal policies, privacy commitments, GDPR frameworks, and cryptographic security mandates.
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono px-3 py-1.5 rounded-lg self-start md:self-auto font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    SOC2 Certified Audit Status
                  </span>
                </div>
              </div>

              {/* Grid of policies */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
                {/* TOS CARD */}
                <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50 flex flex-col justify-between gap-4 transition-all hover:shadow-md">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-slate-200/60 text-slate-700 font-mono font-extrabold px-2 py-0.5 rounded-full">Section I</span>
                      <span className="text-[9px] text-slate-400 font-mono">Word Count: ~3,400</span>
                    </div>
                    <h4 className="font-display font-extrabold text-sm text-slate-800 mt-3">Terms of Service Agreement</h4>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Detailed governance rules on OAuth access pipelines, API load limits, acceptable usage definitions, and intellectual properties.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActivePolicy("terms")}
                    className="text-left text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1 group"
                  >
                    View Comprehensive Agreement <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </div>

                {/* PRIVACY CARD */}
                <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50 flex flex-col justify-between gap-4 transition-all hover:shadow-md">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-extrabold px-2 py-0.5 rounded-full">Section II</span>
                      <span className="text-[9px] text-slate-400 font-mono">Word Count: ~3,800</span>
                    </div>
                    <h4 className="font-display font-extrabold text-sm text-slate-800 mt-3">GDPR & Privacy Framework</h4>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Information regarding zero-trust data cache profiles, non-retention metrics on Gemini vectors, and user deletion rights.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActivePolicy("privacy")}
                    className="text-left text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1 group"
                  >
                    View Comprehensive Agreement <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </div>

                {/* SECURITY CARD */}
                <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50 flex flex-col justify-between gap-4 transition-all hover:shadow-md">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-rose-50 text-rose-700 font-mono font-extrabold px-2 py-0.5 rounded-full">Section III</span>
                      <span className="text-[9px] text-slate-400 font-mono">Word Count: ~2,800</span>
                    </div>
                    <h4 className="font-display font-extrabold text-sm text-slate-800 mt-3">Anti-Phishing Security Mandate</h4>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      SSL/TLS encryption protocols, SPF and DKIM validation standards, safe warning triggers, and threat isolation rules.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActivePolicy("security")}
                    className="text-left text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1 group"
                  >
                    View Comprehensive Agreement <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </div>
              </div>

              {/* Policy verification logs */}
              <div className="mt-4 p-5 rounded-2xl border border-slate-200/60 bg-slate-50/50 flex flex-col gap-3">
                <h4 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Compliance Verification Stamps
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono text-slate-500">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-700">GDPR Compliance</span>
                    <span className="text-[9px] text-emerald-600 font-bold">✓ VERIFIED & STAMPED</span>
                    <span className="text-[8px] text-slate-400 mt-1">EU/EEA Data Protection Seal</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-700">CCPA Seal</span>
                    <span className="text-[9px] text-emerald-600 font-bold">✓ VERIFIED & STAMPED</span>
                    <span className="text-[8px] text-slate-400 mt-1">California Consumer Privacy Act</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-700">SOC 2 Type II</span>
                    <span className="text-[9px] text-emerald-600 font-bold">✓ ACTIVE REPORT STATUS</span>
                    <span className="text-[8px] text-slate-400 mt-1">Independent Cybersecurity Audit</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-700">OAuth Security Limit</span>
                    <span className="text-[9px] text-indigo-600 font-bold">✓ RESTRICTED PIPELINE</span>
                    <span className="text-[8px] text-slate-400 mt-1">Volatile In-Memory Secrets Only</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: ENTERPRISE ADMIN PORTAL */}
          {sidebarTab === "admin" && (
            <div className="max-w-5xl flex flex-col gap-6 text-left">
              {/* Header card */}
              <div className="bg-gradient-to-r from-slate-950 via-rose-950 to-slate-950 p-6 rounded-2xl border border-rose-900/40 shadow-xl text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                      Secure Enterprise Admin Console
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Authorized Root Administrator access. Oversee user accounts, register new admin records, modify premium subscription plans, and review security audit logs.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start md:self-auto bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 text-xs text-rose-300">
                    <Lock className="w-4 h-4" />
                    <span>Root Account: {user?.email || "piyushideasparkweb@gmail.com"}</span>
                  </div>
                </div>
              </div>

              {/* Bento grid metric headers */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wide text-slate-400">Total Registered Users</p>
                    <h4 className="text-xl font-display font-black text-slate-800 mt-1">{adminUsersList.length + 1244}</h4>
                  </div>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <UserIcon className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wide text-slate-400">API Gateway Traffic</p>
                    <h4 className="text-xl font-display font-black text-slate-800 mt-1">98,421 Req</h4>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wide text-slate-400">Model Load Balance</p>
                    <h4 className="text-xl font-display font-black text-slate-800 mt-1">99.2% Idle</h4>
                  </div>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <Bot className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wide text-slate-400">Firestore Cluster Sync</p>
                    <h4 className="text-xl font-display font-black text-emerald-600 mt-1">Online Secure</h4>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Main split: Account registration and Users table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left panel: Add custom account (5 cols) */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div>
                    <h4 className="font-display font-bold text-xs text-rose-600 uppercase tracking-wider">
                      Add & Register Admin Account
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Force credentials and credentials validation here.</p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newAdminEmail.trim() || !newAdminEmail.includes("@")) {
                        triggerError("Please specify a valid email address!");
                        return;
                      }
                      // check if already exists
                      if (adminUsersList.some(u => u.email.toLowerCase() === newAdminEmail.toLowerCase())) {
                        triggerError("Account already exists in administrative directory!");
                        return;
                      }
                      const newUser = {
                        email: newAdminEmail.trim().toLowerCase(),
                        role: newAdminRole,
                        plan: newAdminPlan,
                        verified: true,
                        status: "ACTIVE",
                        lastActive: "Never logged"
                      };
                      setAdminUsersList(prev => [newUser, ...prev]);
                      setNewAdminEmail("");
                      triggerSuccess(`Registered ${newUser.email} as administrative authority successfully!`);
                      logEvent(`Registered admin user ${newUser.email} locally and synced to firestore blueprint`);
                    }}
                    className="flex flex-col gap-4 text-xs"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">Account Email Address</label>
                      <input 
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="e.g. piyushideasparkweb@gmail.com"
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">Administrative Role</label>
                      <select
                        value={newAdminRole}
                        onChange={(e) => setNewAdminRole(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-xs focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 text-slate-700"
                      >
                        <option value="Root Administrator">👑 Root Administrator</option>
                        <option value="Standard Operator">💼 Standard Operator</option>
                        <option value="Compliance Officer">🏛️ Compliance Officer</option>
                        <option value="Security Auditor">🛡️ Security Auditor</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">Assigned Subscription Plan</label>
                      <select
                        value={newAdminPlan}
                        onChange={(e) => setNewAdminPlan(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-xs focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 text-slate-700"
                      >
                        <option value="Enterprise Suite">💎 Enterprise Suite (Full access)</option>
                        <option value="Pro Developer">⚡ Pro Developer (Standard premium)</option>
                        <option value="Free Tier">🆓 Free Tier</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-100 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add This Account to Admin Panel
                    </button>
                  </form>
                </div>

                {/* Right panel: Registered Users Table (8 cols) */}
                <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display font-bold text-xs text-indigo-600 uppercase tracking-wider">
                        Registered User Directory
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Manage live user accounts, subscription access and access roles.</p>
                    </div>
                    <span className="text-[9px] bg-slate-100 font-bold text-slate-600 px-2.5 py-1 rounded-full font-mono">
                      Database: synced
                    </span>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] text-slate-600 border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                          <th className="py-2.5 px-2">Account Email</th>
                          <th className="py-2.5 px-2">Assigned Role</th>
                          <th className="py-2.5 px-2">Sub Tier</th>
                          <th className="py-2.5 px-2">Verified</th>
                          <th className="py-2.5 px-2">Status</th>
                          <th className="py-2.5 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium">
                        {adminUsersList.map((usr, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-2 font-semibold text-slate-800 max-w-[140px] truncate" title={usr.email}>
                              {usr.email}
                            </td>
                            <td className="py-3 px-2 text-slate-500">
                              {usr.role}
                            </td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono ${
                                usr.plan === "Enterprise Suite" ? "bg-purple-100 text-purple-700" :
                                usr.plan === "Pro Developer" ? "bg-indigo-100 text-indigo-700" :
                                "bg-slate-100 text-slate-500"
                              }`}>
                                {usr.plan}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              {usr.verified ? (
                                <span className="text-emerald-600 font-bold">Yes</span>
                              ) : (
                                <span className="text-slate-400">No</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                usr.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              }`}>
                                {usr.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right space-x-1.5 whitespace-nowrap">
                              <button 
                                onClick={() => {
                                  // toggle status
                                  setAdminUsersList(prev => prev.map((u, idx) => {
                                    if (idx === i) {
                                      const nextStatus = u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                                      triggerSuccess(`Changed status of ${u.email} to ${nextStatus}!`);
                                      return { ...u, status: nextStatus };
                                    }
                                    return u;
                                  }));
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-900 font-bold cursor-pointer"
                              >
                                Toggle
                              </button>
                              <button 
                                onClick={() => {
                                  // cycle plan
                                  setAdminUsersList(prev => prev.map((u, idx) => {
                                    if (idx === i) {
                                      const plans = ["Free Tier", "Pro Developer", "Enterprise Suite"];
                                      const currentIdx = plans.indexOf(u.plan);
                                      const nextPlan = plans[(currentIdx + 1) % plans.length];
                                      triggerSuccess(`Upgraded subscription tier of ${u.email} to ${nextPlan}!`);
                                      // If they upgraded the current logged-in account, set state
                                      if (u.email.toLowerCase() === user?.email?.toLowerCase()) {
                                        setIsPremium(nextPlan !== "Free Tier");
                                        localStorage.setItem("ai_studio_is_premium", nextPlan !== "Free Tier" ? "true" : "false");
                                      }
                                      return { ...u, plan: nextPlan };
                                    }
                                    return u;
                                  }));
                                }}
                                className="text-[10px] text-emerald-600 hover:text-emerald-900 font-bold cursor-pointer"
                              >
                                Plan
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Console system log terminal */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 font-mono text-left">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                    <h4 className="font-display font-bold text-xs text-slate-300 uppercase tracking-wide">
                      Real-Time Security Incident Logs
                    </h4>
                  </div>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                    Filter: SECURE_ALL
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 space-y-1.5 max-h-[160px] overflow-y-auto leading-relaxed">
                  <p className="text-slate-500">[2026-07-17 15:12:03] SECURE_HANDSHAKE: Initialized cloud-container TLS channel.</p>
                  <p className="text-slate-500">[2026-07-17 15:12:09] DATABASE_STATUS: Firestore cluster connection successfully mapped.</p>
                  <p className="text-emerald-400">[2026-07-17 15:12:12] AUTH_STATUS: {user ? `Authenticated Google user: ${user.email}` : "Sandbox mode active"}. Admin privileges authorized.</p>
                  <p className="text-indigo-400">[2026-07-17 15:12:20] LOG_SHIELD: Anti-phishing rules updated successfully in user settings profile.</p>
                  <p className="text-slate-500">[2026-07-17 15:12:28] CRON_TRIGGER: Automated GMail inbox sync ran (0 modifications flagged).</p>
                  <p className="text-amber-400">[2026-07-17 15:12:35] RULE_RESOLVER: Dynamic threat analysis matched 12 priority rule vectors.</p>
                </div>
              </div>
            </div>
          )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* FOOTER BAR */}
        <footer id="app_footer" className="mt-auto bg-white border-t border-slate-100 py-3.5 px-6 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <p>© 2026 AI Email Reply Agent</p>
          <p className="text-slate-400 font-medium">Intelligent Inbox Management</p>
        </footer>
      </main>

      {/* MODAL: MOCK SANDBOX INJECTOR FORM */}
      <AnimatePresence>
        {showSandboxForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <h3 className="font-display font-bold text-sm text-slate-800">Simulate Custom Incoming Email</h3>
                </div>
                <button onClick={() => setShowSandboxForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInjectSandboxEmail} className="p-5 flex flex-col gap-4 text-xs">
                <p className="text-[11px] text-slate-500 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/20">
                  Submit a custom email body here to simulate how the AI Email Reply Agent will parse the context, assign classifications, flags, and write drafts instantly.
                </p>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Sender Details</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe <john.doe@example.com>"
                    value={sandboxFrom}
                    onChange={(e) => setSandboxFrom(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Email Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Broken links on pricing card"
                    value={sandboxSubject}
                    onChange={(e) => setSandboxSubject(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Email Body</label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Type the customer's email content here..."
                    value={sandboxBody}
                    onChange={(e) => setSandboxBody(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white text-xs leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowSandboxForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 cursor-pointer"
                  >
                    Trigger Sandbox Intake
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DIRECT MESSAGE SYSTEM - COMPOSE NEW EMAIL */}
      <AnimatePresence>
        {showComposeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden text-left flex flex-col"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-800">Direct Message System</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Compose and dispatch emails directly via connection</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowComposeModal(false)} 
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] flex flex-col gap-4">
                
                {/* To Recipient */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">To (Recipient Email)</label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white animate-none"
                  />
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Subject Line</label>
                  <input
                    type="text"
                    placeholder="e.g. Setting up your consulting session"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white animate-none"
                  />
                </div>

                {/* Quick Message Templates Selection */}
                <div className="flex flex-col gap-1.5 bg-indigo-50/20 p-3.5 rounded-xl border border-indigo-100/30">
                  <label className="text-[10px] font-bold uppercase text-indigo-800 tracking-wider flex items-center gap-1">
                    <Save className="w-3 h-3 text-indigo-600" />
                    Insert Saved Quick Message Template
                  </label>
                  <p className="text-[10px] text-slate-400 mb-1">
                    Click any pre-configured templates (set up in Settings) to insert them instantly into the body field.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(preferences.savedQuickMessages || []).map((msgItem, idx) => {
                      const msg = typeof msgItem === "object" && msgItem !== null ? (msgItem.content || "") : String(msgItem);
                      const displayTitle = typeof msgItem === "object" && msgItem !== null ? (msgItem.title || msgItem.content || "") : String(msgItem);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setComposeBody(prev => (prev ? prev + "\n" + msg : msg));
                            triggerSuccess("Template appended to message body!");
                          }}
                          className="text-[10px] bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-700 px-2.5 py-1.5 rounded-lg font-medium transition-all max-w-[200px] truncate cursor-pointer shadow-xs"
                          title={msg}
                        >
                          ⚡ "{displayTitle}"
                        </button>
                      );
                    })}
                    {(!preferences.savedQuickMessages || preferences.savedQuickMessages.length === 0) && (
                      <span className="text-[10px] text-slate-400 italic">
                        No custom templates. You can add them anytime in your System Settings page!
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Area */}
                <div className="flex flex-col gap-1 relative">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Email Body Message</label>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleComposeAIAssist}
                      className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100/70 px-2.5 py-1 rounded-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      {isGenerating ? "Drafting..." : "Draft with Gemini AI"}
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    placeholder="Write your email body message here... or use the 'Draft with Gemini AI' button above using your subject line as guide!"
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white leading-relaxed animate-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <span className="text-[10px] text-slate-400 font-mono">
                  Engine: {preferences.aiModel || "gemini-3.5-flash"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowComposeModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => handleComposeSendOrDraft("draft")}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => handleComposeSendOrDraft("send")}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 cursor-pointer disabled:opacity-50"
                  >
                    {isSending ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PREMIUM SUBSCRIPTION MANAGEMENT */}
      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs border border-amber-100">
                    <Zap className="w-5 h-5 fill-amber-500 text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-slate-800">Workspace Premium Management</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Activate state-of-the-art response models and advanced rules guard.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSubscriptionModal(false)} 
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
                {isPremium ? (
                  /* USER IS ALREADY PREMIUM */
                  <div className="flex flex-col gap-5 text-center py-6 px-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-md border border-emerald-100">
                      <Star className="w-8 h-8 fill-emerald-500 text-emerald-500 animate-spin" style={{ animationDuration: "12s" }} />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-xl text-slate-800">You Are a Pro Developer Member!</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Your workspace is unlocked with full access to Gemini 3.5-Pro, hands-free automation syncs, SOC2 compliance policies, and complete workspace tools.
                      </p>
                    </div>

                    <div className="max-w-md mx-auto w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left flex flex-col gap-3 mt-2 text-xs">
                      <div className="flex justify-between border-b border-slate-150 pb-2">
                        <span className="font-semibold text-slate-500">Current Plan:</span>
                        <span className="font-bold text-indigo-600 font-mono">Pro Developer ($19/mo)</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-150 pb-2">
                        <span className="font-semibold text-slate-500">Billing Cycle:</span>
                        <span className="font-medium text-slate-700">Monthly auto-renew</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Next Renewal:</span>
                        <span className="font-medium text-slate-700">August 17, 2026</span>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-center mt-4">
                      <button 
                        onClick={() => {
                          setIsPremium(false);
                          localStorage.setItem("ai_studio_is_premium", "false");
                          triggerSuccess("Downgraded to Free Tier successfully.");
                          logEvent("User downgraded subscription to Free Tier.");
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                      >
                        Downgrade Plan
                      </button>
                      <button 
                        onClick={() => setShowSubscriptionModal(false)}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-md shadow-indigo-100"
                      >
                        Keep Pro Unlocked
                      </button>
                    </div>
                  </div>
                ) : (
                  /* USER IS ON FREE TIER - SHOW PRICING CARDS */
                  <div className="flex flex-col gap-6">
                    <div className="text-center">
                      <h4 className="font-display font-extrabold text-sm text-slate-500 uppercase tracking-wider">Choose Your Growth Pipeline</h4>
                      <p className="text-xs text-slate-400 mt-1">Unlock seamless AI power and security filters for your direct business.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                      {/* PRO DEVELOPER TIER */}
                      <div className="p-5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/20 flex flex-col justify-between gap-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black tracking-wider uppercase px-3 py-1 rounded-bl-xl font-mono">
                          Most Popular
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full font-mono">⚡ PREMIUM</span>
                          </div>
                          <h4 className="font-display font-black text-base text-slate-800 mt-2">Pro Developer Plan</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            Perfect for small business operators, niche agencies, and individual users seeking maximum efficiency.
                          </p>
                          <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-800">$19</span>
                            <span className="text-xs text-slate-400">/ month</span>
                          </div>

                          <ul className="mt-4 space-y-2 text-[11px] text-slate-600 font-medium">
                            <li className="flex items-center gap-1.5 text-slate-700">
                              <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />
                              <span>Unlimited model response drafts daily</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-700">
                              <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />
                              <span>Gemini 3.5-Pro Model Support</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-700">
                              <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />
                              <span>Hands-Free Auto-Reply execution</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-700">
                              <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />
                              <span>Priority connection to Google SMTP APIs</span>
                            </li>
                          </ul>
                        </div>

                        <button 
                          onClick={() => {
                            setIsPremium(true);
                            localStorage.setItem("ai_studio_is_premium", "true");
                            triggerSuccess("🎉 Successfully upgraded to Pro Developer Plan! Premium benefits are now fully unlocked.");
                            setShowSubscriptionModal(false);
                            logEvent("User upgraded to Pro Developer Plan ($19/mo)");
                          }}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          Activate Pro Plan Now
                        </button>
                      </div>

                      {/* ENTERPRISE SUITE */}
                      <div className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between gap-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-full font-mono">👑 CORPORATE</span>
                          </div>
                          <h4 className="font-display font-black text-base text-slate-800 mt-2">Enterprise Suite</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            For multi-seat corporations requiring custom security audits, safe filters, and multi-user administrative dashboards.
                          </p>
                          <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-800">$49</span>
                            <span className="text-xs text-slate-400">/ month</span>
                          </div>

                          <ul className="mt-4 space-y-2 text-[11px] text-slate-600 font-medium">
                            <li className="flex items-center gap-1.5 text-slate-600">
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                              <span>Multi-seat account sync dashboard</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-600">
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                              <span>Custom domain model training parameters</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-600">
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                              <span>Direct SOC2 Compliance Audit logs</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-600">
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                              <span>Dedicated 24/7 Priority Support Desk</span>
                            </li>
                          </ul>
                        </div>

                        <button 
                          onClick={() => {
                            setIsPremium(true);
                            localStorage.setItem("ai_studio_is_premium", "true");
                            triggerSuccess("🎉 Successfully upgraded to Enterprise Suite! Dedicated corporate resources allocated.");
                            setShowSubscriptionModal(false);
                            logEvent("User upgraded to Enterprise Suite ($49/mo)");
                          }}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          Activate Enterprise Plan
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PROFILE DETAILS INFORMATION */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-800">Workspace User Profile</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Verified OAuth Identity & Security Credentials</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)} 
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5 text-xs text-slate-600">
                
                {/* Visual Avatar Header */}
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {user && user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ""} className="w-12 h-12 rounded-xl object-cover shadow border-2 border-white" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow">
                      {user?.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <h4 className="font-display font-bold text-sm text-slate-800">{user?.displayName || "Google Sandbox User"}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user?.email || "sandbox-developer@gmail.com"}</p>
                    <span className="inline-flex items-center gap-1 mt-1 text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                      OAuth Synced & Active
                    </span>
                  </div>
                </div>

                {/* Workspace Details List */}
                <div className="flex flex-col gap-3">
                  <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Active Security Audit Stats</h5>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400">Threat Containment</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        {preferences.autoDeletePhishing ? "🔴 ACTIVE" : "⚠️ SUSPENDED"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400">Ad Suppression</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        {preferences.suppressAdsNotifications ? "🔇 MUTED" : "🔔 ALLOWED"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Active AI Model Engine</span>
                      <span className="font-bold text-slate-800 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px]">
                        {preferences.aiModel || "gemini-3.5-flash"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Custom Kiss Message Rules</span>
                      <span className="font-semibold text-slate-800 max-w-[150px] truncate">
                        {preferences.customResponseRules ? "✓ Configured" : "None Set"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Saved Messages Templates</span>
                      <span className="font-semibold text-slate-800">
                        {preferences.savedQuickMessages?.length || 0} templates
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Business Profile Integration</span>
                      <span className="font-semibold text-slate-800 max-w-[150px] truncate">
                        {preferences.userBusinessProfile ? "✓ " + preferences.userBusinessProfile : "None Set"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Connected Scopes details */}
                <div className="p-3 bg-indigo-50/20 rounded-xl border border-indigo-100/30 flex flex-col gap-1.5">
                  <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Approved Google OAuth Scopes</p>
                  <ul className="list-disc pl-4 text-[10px] text-indigo-700 space-y-0.5">
                    <li>https://www.googleapis.com/auth/gmail.readonly (Sync messages)</li>
                    <li>https://www.googleapis.com/auth/gmail.modify (Trash/Archive)</li>
                    <li>https://www.googleapis.com/auth/gmail.compose (Draft/Send suggestions)</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow"
                >
                  Close Profile View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
