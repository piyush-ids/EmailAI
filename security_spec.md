# Firestore Security Specification (TDD)

This document outlines the security invariants, access models, and test validation payloads (The "Dirty Dozen") designed to defend our AI Email Reply Agent against any unauthorized client-side tampering, ID poisoning, and privilege escalation.

## 1. Data Invariants

1. **User Isolation**: A user can only read, create, update, or delete their own data under their dedicated `/users/{userId}/` subtree.
2. **Identity Integrity**: For any write operation, the document ID and parent parameters (like `{userId}`) must strictly match the authenticated user's `request.auth.uid`.
3. **Data Type and Size Hardening**:
   - String sizes are limited to reasonable lengths (e.g., email subjects <= 500 characters, bodies <= 50000 characters) to prevent Denial of Wallet attacks.
   - IDs must conform to alphanumeric characters: `^[a-zA-Z0-9_\-]+$`.
4. **Temporal Integrity**: Creation and modification timestamps (if managed directly) must strictly align with the server's authoritative clock (`request.time`).
5. **No Anonymous Support**: Users must be authenticated to use the app resources.

---

## 2. The "Dirty Dozen" Payloads

Here are twelve distinct payloads designed to test and break our rules. All of these payloads must be explicitly blocked with `PERMISSION_DENIED`.

### Pillar 1: User Isolation & Path Poisoning
1. **Payload 1: Cross-User Read Access**
   - **Target**: `/users/victim_user_123/emails/email_abc`
   - **User Auth**: UID = `attacker_789`
   - **Action**: Read
   - **Security Goal**: Rejection. Access must be locked to `request.auth.uid == userId`.

2. **Payload 2: ID Poisoning (Junk characters as ID)**
   - **Target**: `/users/attacker_789/emails/invalid%20character%20with%20excessive%20length%20over%20128`
   - **User Auth**: UID = `attacker_789`
   - **Action**: Create
   - **Security Goal**: Rejection. ID contains invalid spaces and exceeds 128 characters.

3. **Payload 3: Arbitrary Wildcard Collection Injection**
   - **Target**: `/admins/some_document`
   - **User Auth**: UID = `attacker_789`
   - **Action**: Create
   - **Security Goal**: Rejection by default-deny catch-all.

---

### Pillar 2: Schema Validation & Shadow Field Tampering
4. **Payload 4: Shadow Field Injection (Ghost Fields)**
   - **Target**: `/users/attacker_789/preferences/settings`
   - **User Auth**: UID = `attacker_789`
   - **Payload**: `{ "tone": "Professional", "language": "English", "enableAutoReply": true, "isSystemAdmin": true }`
   - **Action**: Create/Update
   - **Security Goal**: Rejection. `isSystemAdmin` is a shadow field not present in the allowed schema or whitelisted keys in `affectedKeys().hasOnly()`.

5. **Payload 5: Malicious Type Substitution**
   - **Target**: `/users/attacker_789/rules/rule_111`
   - **User Auth**: UID = `attacker_789`
   - **Payload**: `{ "id": "rule_111", "name": "Hack Rule", "trigger": "new_email", "conditionValue": "Any", "action": "auto_reply", "enabled": "NOT_A_BOOLEAN_STRING" }`
   - **Action**: Create
   - **Security Goal**: Rejection. `enabled` must be a boolean.

6. **Payload 6: Buffer Overflow/Denial of Wallet String Injection**
   - **Target**: `/users/attacker_789/preferences/settings`
   - **User Auth**: UID = `attacker_789`
   - **Payload**: `{ "tone": "Professional", "language": "English", "enableAutoReply": true, "signature": "A".repeat(100000) }`
   - **Action**: Update
   - **Security Goal**: Rejection. Signature must satisfy strict size constraints.

---

### Pillar 3: Identity & Integrity Spoofing
7. **Payload 7: Client-side Created Timestamp Spoofing**
   - **Target**: `/users/attacker_789/emails/email_999`
   - **User Auth**: UID = `attacker_789`
   - **Payload**: `{ "id": "email_999", "threadId": "thr_1", "subject": "Hi", "from": "a@b.com", "to": "me@me.com", "date": "today", "body": "hi", "replySent": true, "replyTimestamp": "2020-01-01 00:00:00" }`
   - **Action**: Create
   - **Security Goal**: Rejection. Custom timestamps cannot bypass Server-authoritative temporal guards if they're written directly, or must conform to standard.

8. **Payload 8: Email Spoofing Attack**
   - **Target**: `/users/attacker_789/emails/email_xyz`
   - **User Auth**: UID = `attacker_789` but with unverified email.
   - **Action**: Read/Write
   - **Security Goal**: Rejection. Standard operations require `request.auth.token.email_verified == true`.

9. **Payload 9: Sibling Dependency Bypass (Orphaned Rules)**
   - **Target**: `/users/attacker_789/rules/rule_222`
   - **User Auth**: UID = `attacker_789`
   - **Payload**: `{ "id": "different_rule_id", "name": "Mismatch Rule", "trigger": "category_match", "conditionValue": "Support", "action": "auto_reply", "enabled": true }`
   - **Action**: Create
   - **Security Goal**: Rejection. The document ID (`rule_222`) must match the field ID (`different_rule_id`) in the payload.

---

### Pillar 4: Secure List Queries & State Safeguards
10. **Payload 10: Blanket Listing Attack (Unbounded Reading)**
    - **Target**: `/users/victim_user_123/emails/`
    - **User Auth**: UID = `attacker_789`
    - **Action**: List (getDocs)
    - **Security Goal**: Rejection. Query must specify a secure constraint ensuring it only matches the user's authenticated UID.

11. **Payload 11: Immutable Field Overwrite**
    - **Target**: `/users/attacker_789/emails/email_xyz`
    - **User Auth**: UID = `attacker_789`
    - **Payload trying to update**: `{ "threadId": "new_forged_thread_id" }`
    - **Action**: Update
    - **Security Goal**: Rejection. Immutable fields like `threadId` must remain identical during updates.

12. **Payload 12: Terminal State Lock-out Bypass**
    - **Target**: `/users/attacker_789/emails/email_xyz` (where `replySent` is already `true`)
    - **User Auth**: UID = `attacker_789`
    - **Payload**: Attempting to alter `replyAction` or changing status back to unsent.
    - **Action**: Update
    - **Security Goal**: Rejection. Once a reply is marked as sent and complete, terminal state rules lock modification.

---

## 3. Test Runner Design

All security conditions are implemented in the main `firestore.rules` file and validated against this spec. No client-side delegation is permitted.
