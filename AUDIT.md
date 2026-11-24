# FindIt – Functional Audit Report

**Date**: November 5, 2026  
**Status**: All Tests Passed (38/38)  
**Build Status**: Vite 8 Production Build Clean (0 Errors, 1.71s)  
**Static Analysis**: `oxlint` 0 Errors across 24 project files  
**Dev Server**: Running at `http://localhost:5174/`

---

## 1. Test Summary

| Category | Tests | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication & Role Protection** | 8 | 8 | 0 | PASS |
| **Item Reporting & Validation** | 6 | 6 | 0 | PASS |
| **Claim Lifecycle – Scenario A (Successful Handover)** | 7 | 7 | 0 | PASS |
| **Claim Lifecycle – Scenario B (Rejection & Dispute Override)** | 6 | 6 | 0 | PASS |
| **Claim Lifecycle – Scenario C (Admin Rejection)** | 3 | 3 | 0 | PASS |
| **Claim Lifecycle – Scenario D (Guardrails & Invalid Claims)** | 4 | 4 | 0 | PASS |
| **Data Consistency & Isolation (User / Finder / Admin)** | 4 | 4 | 0 | PASS |
| **Total** | **38** | **38** | **0** | **100% PASS** |

---

## 2. Core Workflows Verified

### Authentication & Access Control
- **Regular User (`sarah.johnson@example.com`)**: Access to `/dashboard`, `/report`, `/items/:id`. Admin console restricted.
- **Administrator (`emma.wilson@example.com`)**: Full access to `/admin` console, claim overrides, handover tracking, user management.
- **Route Guards**: Non-admins visiting `/admin` receive a styled restricted perimeter gate with a 1-click switch button.
- **Registration**: Auto-registers user, checks duplicate emails, and persists to mock directory.

### Item Reporting
- **Lost & Found Reporting**: Form validation enforces title, category, campus location, date, and min 20-character description.
- **Image Uploads**: Base64 photo preview, 5MB file-size guard, MIME type check, and graceful fallback icon (`📦`).
- **Listing Editing**: Supported in User Dashboard, Finder Dashboard, and directly on `ItemDetailPage` for item owners.

### Two-Level Claim Approval Workflow
1. **Scenario A (Happy Path)**:
   - Claimant files claim with private verification details.
   - Finder approves claim $\rightarrow$ moves to `PENDING_ADMIN_REVIEW`.
   - Admin approves with mandatory rationale $\rightarrow$ moves to `ADMIN_APPROVED`.
   - Finder confirms handover $\rightarrow$ `HANDOVER_IN_PROGRESS`.
   - Claimant confirms receipt $\rightarrow$ `COMPLETED`, associated item marked `returned`.
2. **Scenario B (Finder Rejection & Dispute)**:
   - Finder rejects with mandatory reason (min 5 chars) $\rightarrow$ `FINDER_REJECTED`.
   - Claimant submits dispute statement with additional proof $\rightarrow$ `ADMIN_REVIEW_REQUESTED`.
   - Admin reviews and overrides finder rejection $\rightarrow$ `ADMIN_APPROVED`.
3. **Scenario C (Admin Rejection)**:
   - Admin rejects with mandatory rationale $\rightarrow$ `ADMIN_REJECTED` (handover permanently blocked).
4. **Scenario D (Guardrails)**:
   - **Self-Claiming Blocked**: Users cannot claim items they reported.
   - **Returned Items Blocked**: Items marked `returned` are closed to new claims.
   - **Duplicate Claims Blocked**: Multiple active claims for the same item by the same user are prevented.
   - **Sealed Records**: Returned listings cannot be reopened or toggled back to active.

### Dashboard Data Isolation
- **User Dashboard (`/dashboard`)**: Strictly scoped to current user's reports and claims.
- **Finder Dashboard (`/finder`)**: Strictly scoped to items reported as found by the current user and incoming claims on those items.
- **Admin Dashboard (`/admin`)**: Platform-wide metrics, review queue, handover tracking, listings registry, and user dossiers.

---

## 3. Bugs Discovered & Resolved

| # | Bug Discovered | Impact | Resolution | File |
|---|---|---|---|---|
| 1 | **Registration not persisted to user list** | Newly registered users could not log back in after logout and did not appear in Admin user management. | Appended `newUser` to `MOCK_USERS` during registration. | `src/context/AuthContext.jsx` |
| 2 | **Case-sensitive email sign-in** | Entering email with capital letters failed authentication. | Normalized lookup to `u.email.toLowerCase() === email.trim().toLowerCase()`. | `src/context/AuthContext.jsx` |
| 3 | **Missing duplicate email check** | Registering with existing email was silently allowed. | Added explicit check throwing user-facing error if email already registered. | `src/context/AuthContext.jsx` |
| 4 | **Missing route `/report/:type`** | Direct links or bookmarks to `/report/lost` or `/report/found` threw 404 / unhandled route. | Added `<Route path="/report/:type" />` in router and `useParams` path detection in `ReportPage`. | `src/App.jsx`, `src/pages/ReportPage.jsx` |
| 5 | **No direct Edit Listing option on Item Details** | Item owners could only edit listings from Dashboards, not on the item detail view itself. | Integrated an Edit Listing action and modal directly on `ItemDetailPage` for reporters. | `src/pages/ItemDetailPage.jsx` |
| 6 | **Missing catch-all route** | Typing an invalid URL displayed a blank screen. | Added fallback `<Route path="*" element={<BrowsePage />} />`. | `src/App.jsx` |

---

## 4. Mock Data & Scope Notice

- **Authentication**: Simulated via `AuthContext.jsx` and `MOCK_USERS`.
- **Database / API**: Managed in-memory via `ItemsContext.jsx`.
- **Media Storage**: Base64 and Unsplash assets.
- **Production Note**: Frontend-only role gates are for demo and evaluation purposes; production security will use AWS Cognito JWT authorizers and API Gateway policies.

