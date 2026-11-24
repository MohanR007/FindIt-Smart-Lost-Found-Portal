import { MOCK_USERS, MOCK_ITEMS, MOCK_CLAIMS, CLAIM_STATUSES } from './src/data/mockData.js';
import { filterItems, formatDate, getInitials, formatStatusLabel } from './src/utils/helpers.js';

console.log('--- FINDIT AUTOMATED AUDIT SUITE ---');

let passedTests = 0;
let failedTests = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passedTests++;
    results.push({ status: 'PASS', message });
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    results.push({ status: 'FAIL', message });
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// 1. AUTHENTICATION & ROLES AUDIT
console.log('\n[1. AUTHENTICATION & USER ROLES]');
const adminUser = MOCK_USERS.find((u) => u.role === 'admin');
assert(!!adminUser, 'Admin user exists in MOCK_USERS (Emma Wilson)');
assert(adminUser?.email === 'emma.wilson@example.com', 'Admin email is emma.wilson@example.com');

const regularUser = MOCK_USERS.find((u) => u.role === 'user');
assert(!!regularUser, 'Regular user exists in MOCK_USERS (Sarah Johnson)');
assert(regularUser?.role === 'user', 'Regular user has role user');

// Check all mock users have required fields
const allUsersValid = MOCK_USERS.every((u) => u.id && u.name && u.email && u.role);
assert(allUsersValid, 'All mock users have id, name, email, and role');

// 2. DATA CONSISTENCY & STATUS INTEGRITY
console.log('\n[2. MOCK DATA & STATUS INTEGRITY]');
const validClaimStatuses = Object.values(CLAIM_STATUSES);
const allClaimsValidStatus = MOCK_CLAIMS.every((c) => validClaimStatuses.includes(c.status));
assert(allClaimsValidStatus, 'All mock claims use recognized CLAIM_STATUSES enum values');

const allClaimsHaveItems = MOCK_CLAIMS.every((c) => MOCK_ITEMS.some((i) => i.id === c.itemId));
assert(allClaimsHaveItems, 'All mock claims reference valid item IDs in MOCK_ITEMS');

const allClaimsHaveClaimants = MOCK_CLAIMS.every((c) => MOCK_USERS.some((u) => u.id === c.claimedBy));
assert(allClaimsHaveClaimants, 'All mock claims reference valid user IDs in MOCK_USERS');

const completedClaims = MOCK_CLAIMS.filter((c) => c.status === 'COMPLETED');
for (const c of completedClaims) {
  const item = MOCK_ITEMS.find((i) => i.id === c.itemId);
  assert(item?.status === 'returned', `Item #${c.itemId} for completed claim #${c.id} has status returned`);
  assert(c.finderHandoverConfirmed === true, `Completed claim #${c.id} has finderHandoverConfirmed === true`);
  assert(c.claimantHandoverConfirmed === true, `Completed claim #${c.id} has claimantHandoverConfirmed === true`);
}

// 3. CLAIM WORKFLOW SIMULATION TESTS
console.log('\n[3. CLAIM WORKFLOW STATE MACHINE]');

// Setup mutable state clone
let testItems = JSON.parse(JSON.stringify(MOCK_ITEMS));
let testClaims = JSON.parse(JSON.stringify(MOCK_CLAIMS));

// Submit Claim logic replication
function submitClaim({ itemId, claimedBy, claimerName, claimerEmail, reason, verificationDetails, additionalInfo = '' }) {
  const targetItem = testItems.find((i) => i.id === itemId);
  if (!targetItem) throw new Error('Item not found.');
  if (targetItem.status === 'returned') throw new Error('This item has already been returned and is no longer open for claims.');
  if (targetItem.reportedBy === claimedBy) throw new Error('You cannot claim an item you reported yourself.');

  const existingActive = testClaims.find(
    (c) =>
      c.itemId === itemId &&
      c.claimedBy === claimedBy &&
      c.status !== CLAIM_STATUSES.ADMIN_REJECTED &&
      c.status !== CLAIM_STATUSES.COMPLETED
  );
  if (existingActive) throw new Error(`You already have an active claim for this item (${existingActive.status}).`);

  const now = new Date().toISOString();
  const newClaim = {
    id: `claim-test-${Date.now()}`,
    itemId,
    claimedBy,
    claimerName,
    claimerEmail: claimerEmail || `${claimerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    finderId: targetItem.reportedBy,
    reason: reason.trim(),
    verificationDetails: verificationDetails.trim(),
    additionalInfo: (additionalInfo || '').trim(),
    status: CLAIM_STATUSES.PENDING_FINDER_REVIEW,
    finderRejectionReason: '',
    disputeReason: '',
    adminReviewComment: '',
    finderHandoverConfirmed: false,
    claimantHandoverConfirmed: false,
    handoverCompletedAt: null,
    createdAt: now,
    updatedAt: now,
    history: [{ id: `h-${Date.now()}`, action: 'Claim Submitted', performedBy: claimerName, role: 'claimant', timestamp: now, comment: 'Submitted' }],
  };
  testClaims.unshift(newClaim);
  return newClaim;
}

function finderApproveClaim(claimId, comment = '', currentUser) {
  const now = new Date().toISOString();
  testClaims = testClaims.map((c) => {
    if (c.id !== claimId) return c;
    return {
      ...c,
      status: CLAIM_STATUSES.PENDING_ADMIN_REVIEW,
      updatedAt: now,
      history: [...c.history, { id: `h-${Date.now()}`, action: 'Finder Approved', performedBy: currentUser?.name || 'Finder', role: 'finder', timestamp: now, comment }],
    };
  });
}

function finderRejectClaim(claimId, reason, currentUser) {
  if (!reason || !reason.trim()) throw new Error('A rejection reason is mandatory.');
  const now = new Date().toISOString();
  testClaims = testClaims.map((c) => {
    if (c.id !== claimId) return c;
    return {
      ...c,
      status: CLAIM_STATUSES.FINDER_REJECTED,
      finderRejectionReason: reason.trim(),
      updatedAt: now,
      history: [...c.history, { id: `h-${Date.now()}`, action: 'Finder Rejected', performedBy: currentUser?.name || 'Finder', role: 'finder', timestamp: now, comment: reason.trim() }],
    };
  });
}

function requestAdminReview(claimId, disputeReason, currentUser) {
  if (!disputeReason || !disputeReason.trim()) throw new Error('Please provide details explaining why the finder rejection should be reviewed.');
  const now = new Date().toISOString();
  testClaims = testClaims.map((c) => {
    if (c.id !== claimId) return c;
    return {
      ...c,
      status: CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED,
      disputeReason: disputeReason.trim(),
      updatedAt: now,
      history: [...c.history, { id: `h-${Date.now()}`, action: 'Admin Review Requested', performedBy: currentUser?.name || 'Claimant', role: 'claimant', timestamp: now, comment: disputeReason.trim() }],
    };
  });
}

function adminApproveClaim(claimId, reviewComment, currentUser) {
  if (!reviewComment || !reviewComment.trim()) throw new Error('A review comment is required for administrator approval.');
  const now = new Date().toISOString();
  testClaims = testClaims.map((c) => {
    if (c.id !== claimId) return c;
    return {
      ...c,
      status: CLAIM_STATUSES.ADMIN_APPROVED,
      adminReviewComment: reviewComment.trim(),
      updatedAt: now,
      history: [...c.history, { id: `h-${Date.now()}`, action: 'Admin Approved', performedBy: currentUser?.name || 'Administrator', role: 'admin', timestamp: now, comment: reviewComment.trim() }],
    };
  });
}

function adminRejectClaim(claimId, reviewComment, currentUser) {
  if (!reviewComment || !reviewComment.trim()) throw new Error('A review comment is required for administrator rejection.');
  const now = new Date().toISOString();
  testClaims = testClaims.map((c) => {
    if (c.id !== claimId) return c;
    return {
      ...c,
      status: CLAIM_STATUSES.ADMIN_REJECTED,
      adminReviewComment: reviewComment.trim(),
      updatedAt: now,
      history: [...c.history, { id: `h-${Date.now()}`, action: 'Admin Rejected', performedBy: currentUser?.name || 'Administrator', role: 'admin', timestamp: now, comment: reviewComment.trim() }],
    };
  });
}

function confirmHandover(claimId, role, _currentUser) {
  const now = new Date().toISOString();
  const claimToUpdate = testClaims.find((c) => c.id === claimId);
  if (!claimToUpdate) return;

  const finderConfirmed = role === 'finder' ? true : claimToUpdate.finderHandoverConfirmed;
  const claimantConfirmed = role === 'claimant' ? true : claimToUpdate.claimantHandoverConfirmed;
  const isBothConfirmed = finderConfirmed && claimantConfirmed;

  const newStatus = isBothConfirmed ? CLAIM_STATUSES.COMPLETED : CLAIM_STATUSES.HANDOVER_IN_PROGRESS;

  testClaims = testClaims.map((c) => {
    if (c.id !== claimId) return c;
    return {
      ...c,
      status: newStatus,
      finderHandoverConfirmed: finderConfirmed,
      claimantHandoverConfirmed: claimantConfirmed,
      handoverCompletedAt: isBothConfirmed ? now : c.handoverCompletedAt,
      updatedAt: now,
    };
  });

  if (isBothConfirmed && claimToUpdate.itemId) {
    testItems = testItems.map((item) => (item.id === claimToUpdate.itemId ? { ...item, status: 'returned' } : item));
  }
}

// SCENARIO A: Successful claim flow
console.log('\n--- Testing Scenario A (Successful Claim) ---');
// item-004 is found by u5 (Priya Patel). Let's have u2 (Michael Chen) claim it.
const claimA = submitClaim({
  itemId: 'item-004',
  claimedBy: 'u2',
  claimerName: 'Michael Chen',
  claimerEmail: 'michael.chen@example.com',
  reason: 'I left my wallet in the library reading room.',
  verificationDetails: 'Inside has my metro card and old student card.',
});
assert(claimA.status === 'PENDING_FINDER_REVIEW', 'Step 1: Claim submitted with PENDING_FINDER_REVIEW');

finderApproveClaim(claimA.id, 'Proofs match', { name: 'Priya Patel' });
const claimAAfterFinder = testClaims.find((c) => c.id === claimA.id);
assert(claimAAfterFinder.status === 'PENDING_ADMIN_REVIEW', 'Step 2: Finder approved -> PENDING_ADMIN_REVIEW');

adminApproveClaim(claimA.id, 'Verified college ID and receipt.', { name: 'Emma Wilson' });
const claimAAfterAdmin = testClaims.find((c) => c.id === claimA.id);
assert(claimAAfterAdmin.status === 'ADMIN_APPROVED', 'Step 3: Admin approved -> ADMIN_APPROVED');

confirmHandover(claimA.id, 'finder', { name: 'Priya Patel' });
const claimAAfterFinderHandover = testClaims.find((c) => c.id === claimA.id);
assert(claimAAfterFinderHandover.status === 'HANDOVER_IN_PROGRESS', 'Step 4a: Finder confirmed handover -> HANDOVER_IN_PROGRESS');
assert(claimAAfterFinderHandover.finderHandoverConfirmed === true, 'Finder handover flag is true');
assert(claimAAfterFinderHandover.claimantHandoverConfirmed === false, 'Claimant handover flag is still false');

confirmHandover(claimA.id, 'claimant', { name: 'Michael Chen' });
const claimACompleted = testClaims.find((c) => c.id === claimA.id);
assert(claimACompleted.status === 'COMPLETED', 'Step 4b: Both confirmed -> COMPLETED');
const item004 = testItems.find((i) => i.id === 'item-004');
assert(item004.status === 'returned', 'Step 4c: Associated item status updated to returned');

// SCENARIO B: Finder Rejection & Dispute Resolution
console.log('\n--- Testing Scenario B (Finder Rejection & Dispute) ---');
// item-006 is found by u3 (Emma Wilson). Let's have u4 (James Rodriguez) claim it.
const claimB = submitClaim({
  itemId: 'item-006',
  claimedBy: 'u4',
  claimerName: 'James Rodriguez',
  claimerEmail: 'james.rodriguez@example.com',
  reason: 'Lost my keys near basketball court.',
  verificationDetails: 'Silver whistle attached.',
});
assert(claimB.status === 'PENDING_FINDER_REVIEW', 'Scenario B Step 1: Claim submitted');

// Test mandatory rejection reason validation
let threwEmptyRejection = false;
try {
  finderRejectClaim(claimB.id, '', { name: 'Emma Wilson' });
} catch {
  threwEmptyRejection = true;
}
assert(threwEmptyRejection, 'Scenario B Step 2: Finder rejection rejects empty reason');

finderRejectClaim(claimB.id, 'Keychain color does not match description.', { name: 'Emma Wilson' });
const claimBRejected = testClaims.find((c) => c.id === claimB.id);
assert(claimBRejected.status === 'FINDER_REJECTED', 'Scenario B Step 3: Finder rejected with reason -> FINDER_REJECTED');
assert(claimBRejected.finderRejectionReason === 'Keychain color does not match description.', 'Finder rejection reason stored');

// Test mandatory dispute reason validation
let threwEmptyDispute = false;
try {
  requestAdminReview(claimB.id, '', { name: 'James Rodriguez' });
} catch {
  threwEmptyDispute = true;
}
assert(threwEmptyDispute, 'Scenario B Step 4: Dispute submission rejects empty reason');

requestAdminReview(claimB.id, 'I have spare duplicate key with identical serial number.', { name: 'James Rodriguez' });
const claimBDisputed = testClaims.find((c) => c.id === claimB.id);
assert(claimBDisputed.status === 'ADMIN_REVIEW_REQUESTED', 'Scenario B Step 5: Admin review requested -> ADMIN_REVIEW_REQUESTED');

adminApproveClaim(claimB.id, 'Admin override: claimant verified with duplicate key serial.', { name: 'Emma Wilson' });
const claimBOverridden = testClaims.find((c) => c.id === claimB.id);
assert(claimBOverridden.status === 'ADMIN_APPROVED', 'Scenario B Step 6: Admin override -> ADMIN_APPROVED');

// SCENARIO C: Admin Rejection
console.log('\n--- Testing Scenario C (Admin Rejection) ---');
// item-010 is found by u4. Let's have u2 claim it.
const claimC = submitClaim({
  itemId: 'item-010',
  claimedBy: 'u2',
  claimerName: 'Michael Chen',
  claimerEmail: 'michael.chen@example.com',
  reason: 'Lost my watch.',
  verificationDetails: 'Black dial.',
});
finderApproveClaim(claimC.id, 'Looks plausible', { name: 'James Rodriguez' });

// Test mandatory admin comment validation
let threwEmptyAdminComment = false;
try {
  adminRejectClaim(claimC.id, '', { name: 'Emma Wilson' });
} catch {
  threwEmptyAdminComment = true;
}
assert(threwEmptyAdminComment, 'Scenario C Step 1: Admin rejection requires non-empty comment');

adminRejectClaim(claimC.id, 'Serial number does not match receipt submitted by user.', { name: 'Emma Wilson' });
const claimCRejected = testClaims.find((c) => c.id === claimC.id);
assert(claimCRejected.status === 'ADMIN_REJECTED', 'Scenario C Step 2: Admin rejected -> ADMIN_REJECTED');
assert(claimCRejected.adminReviewComment === 'Serial number does not match receipt submitted by user.', 'Admin rejection comment recorded');

// SCENARIO D: Invalid Claims & Guardrails
console.log('\n--- Testing Scenario D (Invalid Claims & Guardrails) ---');
// 1. Self claiming
let threwSelfClaim = false;
try {
  // item-002 reportedBy: 'u2' (Michael Chen). u2 tries to claim it.
  submitClaim({
    itemId: 'item-002',
    claimedBy: 'u2',
    claimerName: 'Michael Chen',
    reason: 'My phone',
    verificationDetails: 'Details',
  });
} catch {
  threwSelfClaim = true;
}
assert(threwSelfClaim, 'Scenario D Step 1: Cannot claim self-reported item');

// 2. Claiming returned item
let threwReturnedClaim = false;
try {
  // item-012 has status 'returned'
  submitClaim({
    itemId: 'item-012',
    claimedBy: 'u1',
    claimerName: 'Sarah Johnson',
    reason: 'My earbuds',
    verificationDetails: 'Details',
  });
} catch {
  threwReturnedClaim = true;
}
assert(threwReturnedClaim, 'Scenario D Step 2: Cannot claim already returned item');

// 3. Duplicate active claim
let threwDuplicateClaim = false;
try {
  // claim-001 is active on item-002 by u1. Try to submit another claim on item-002 by u1.
  submitClaim({
    itemId: 'item-002',
    claimedBy: 'u1',
    claimerName: 'Sarah Johnson',
    reason: 'Another attempt',
    verificationDetails: 'Different details',
  });
} catch {
  threwDuplicateClaim = true;
}
assert(threwDuplicateClaim, 'Scenario D Step 3: Duplicate active claim is blocked');

// 4. FILTERING & SEARCH TESTS
console.log('\n[4. SEARCH & FILTERING UTILITY]');
const allFiltered = filterItems(MOCK_ITEMS, { query: 'iPhone' });
assert(allFiltered.length >= 2, `Search 'iPhone' found ${allFiltered.length} items`);

const categoryFiltered = filterItems(MOCK_ITEMS, { category: 'Electronics' });
assert(categoryFiltered.length >= 4, `Category filter 'Electronics' found ${categoryFiltered.length} items`);

const typeFiltered = filterItems(MOCK_ITEMS, { type: 'lost' });
assert(typeFiltered.every((i) => i.type === 'lost'), 'Type filter "lost" returned only lost items');

// 5. HELPER TESTS
console.log('\n[5. HELPER UTILITY INTEGRITY]');
assert(getInitials('Sarah Johnson') === 'SJ', 'getInitials("Sarah Johnson") === "SJ"');
assert(formatStatusLabel('PENDING_FINDER_REVIEW') === 'Pending Finder Review', 'formatStatusLabel works');
assert(formatDate('2026-11-03') === 'Nov 3, 2026', 'formatDate parses valid date');

console.log('\n========================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
