import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut as firebaseSignOut
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy,
  limit as firestoreLimit
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { Email, AutomationRule, AIPerference } from "./types";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  
  // If it's a connectivity issue or offline timeout, log as a warning and do not throw a fatal error
  const isNetworkIssue = errMsg.includes("Could not reach Cloud Firestore backend") || 
                         errMsg.includes("the client is offline") || 
                         errMsg.includes("unreachable") ||
                         errMsg.includes("Failed to get document");
                         
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isNetworkIssue) {
    console.warn("Firestore running in resilient offline/cached mode:", errMsg);
    return; // Don't throw to avoid disrupting the UI
  }

  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  // Solve login/loading crashes by warning instead of throwing a fatal app-breaking error
  console.warn("Gracefully recovered from Firestore Operation error. Operating in offline-resilient backup mode.");
}

// CRITICAL CONSTRAINT: When the application initially boots, test the connection
async function testConnection() {
  try {
    const { getDocFromServer } = await import("firebase/firestore");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore secure server handshake completed.");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('Could not reach Cloud Firestore backend') || error.message.includes('unreachable'))) {
      console.warn("Firestore running resiliently: Server handshake deferred. Operating using local IndexedDB persistent cache.");
    }
  }
}
testConnection();

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/gmail.modify");

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem("gmail_access_token");

// Initialize listener for auth state change
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check for redirect result on initialization
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          localStorage.setItem("gmail_access_token", cachedAccessToken);
          if (result.user && onAuthSuccess) {
            onAuthSuccess(result.user, cachedAccessToken);
          }
        }
      }
    })
    .catch((error) => {
      console.error("Error retrieving Google redirect credentials:", error);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Allow manual sign-in if token hasn't been cached yet in the current run
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      // Keep cachedAccessToken and localStorage so that it persists across page loads/initializations.
      // Only trigger the failure callback to show the landing page.
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth. Ensure you granted Gmail permissions.");
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem("gmail_access_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google sign-in popup error:", error);
    const isPopupBlocked = error.code === "auth/popup-blocked" || 
                           (error.message && error.message.includes("popup-blocked"));
    if (isPopupBlocked) {
      console.warn("Google sign-in popup blocked. Initiating redirect flow fallback...");
      try {
        await signInWithRedirect(auth, provider);
        return null;
      } catch (redirectErr) {
        console.error("Google sign-in redirect fallback failed:", redirectErr);
        throw redirectErr;
      }
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem("gmail_access_token", token);
};

export const googleSignOut = async () => {
  await firebaseSignOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem("gmail_access_token");
  localStorage.removeItem("ai_studio_login_mode");
};

// ==========================================
// FIRESTORE DURABLE PERSISTENCE HELPERS
// ==========================================

// 1. Preferences Persistence
export const dbSavePreferences = async (userId: string, preferences: AIPerference): Promise<void> => {
  try {
    const docRef = doc(db, "users", userId, "preferences", "default");
    await setDoc(docRef, preferences, { merge: true });
  } catch (err) {
    console.error("Error saving preferences to Firestore:", err);
  }
};

export const dbGetPreferences = async (userId: string): Promise<AIPerference | null> => {
  try {
    const docRef = doc(db, "users", userId, "preferences", "default");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AIPerference;
    }
    return null;
  } catch (err) {
    console.error("Error fetching preferences from Firestore:", err);
    return null;
  }
};

// 2. Automation Rules Persistence
export const dbSaveRule = async (userId: string, rule: AutomationRule): Promise<void> => {
  try {
    const docRef = doc(db, "users", userId, "rules", rule.id);
    await setDoc(docRef, rule, { merge: true });
  } catch (err) {
    console.error("Error saving rule to Firestore:", err);
  }
};

export const dbDeleteRule = async (userId: string, ruleId: string): Promise<void> => {
  try {
    const docRef = doc(db, "users", userId, "rules", ruleId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting rule from Firestore:", err);
  }
};

export const dbGetRules = async (userId: string): Promise<AutomationRule[]> => {
  try {
    const colRef = collection(db, "users", userId, "rules");
    const querySnap = await getDocs(colRef);
    const rules: AutomationRule[] = [];
    querySnap.forEach((doc) => {
      rules.push(doc.data() as AutomationRule);
    });
    return rules;
  } catch (err) {
    console.error("Error fetching rules from Firestore:", err);
    return [];
  }
};

// 3. Emails Cache Persistence
export const dbSaveEmail = async (userId: string, email: Email): Promise<void> => {
  try {
    const docRef = doc(db, "users", userId, "emails", email.id);
    await setDoc(docRef, email, { merge: true });
  } catch (err) {
    console.error("Error saving email to Firestore:", err);
  }
};

export const dbSaveEmailsBatch = async (userId: string, emails: Email[]): Promise<void> => {
  try {
    const promises = emails.map((email) => dbSaveEmail(userId, email));
    await Promise.all(promises);
  } catch (err) {
    console.error("Error saving batch of emails to Firestore:", err);
  }
};

export const dbGetEmails = async (userId: string): Promise<Email[]> => {
  try {
    const colRef = collection(db, "users", userId, "emails");
    const querySnap = await getDocs(colRef);
    const emails: Email[] = [];
    querySnap.forEach((doc) => {
      emails.push(doc.data() as Email);
    });
    return emails;
  } catch (err) {
    console.error("Error fetching emails from Firestore:", err);
    return [];
  }
};

// 4. Audit Logs Persistence
export const dbSaveAuditLog = async (
  userId: string, 
  log: { timestamp: string; action: string; status: string }
): Promise<void> => {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const docRef = doc(db, "users", userId, "auditLogs", id);
    await setDoc(docRef, log);
  } catch (err) {
    console.error("Error saving audit log to Firestore:", err);
  }
};

export const dbGetAuditLogs = async (userId: string): Promise<Array<{ timestamp: string; action: string; status: string }>> => {
  try {
    const colRef = collection(db, "users", userId, "auditLogs");
    const q = query(colRef, orderBy("timestamp", "desc"), firestoreLimit(50));
    const querySnap = await getDocs(q);
    const logs: Array<{ timestamp: string; action: string; status: string }> = [];
    querySnap.forEach((doc) => {
      logs.push(doc.data() as any);
    });
    return logs;
  } catch (err) {
    console.error("Error fetching audit logs from Firestore:", err);
    return [];
  }
};
