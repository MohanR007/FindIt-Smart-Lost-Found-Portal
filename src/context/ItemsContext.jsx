// Items context — integrated with real AWS DynamoDB, S3 & Claims API Gateway
import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import {
  fetchItems,
  createItem,
  fetchClaims,
  fetchClaimById,
  createClaim,
  submitFinderDecision,
  submitClaimDispute,
  submitAdminDecision,
  confirmHandover as apiConfirmHandover,
} from '../services/api.js';
import { CLAIM_STATUSES } from '../data/mockData';
import { findLiveMatches } from '../utils/matching.js';
import { useAuth } from './AuthContext';

const ItemsContext = createContext(null);

/**
 * Normalizes an item object from AWS DynamoDB / API Gateway to match the frontend schema.
 * Ensures consistent availability of `id`, `itemId`, `status`, `tags`, `image`, `images`, and timestamps.
 */
function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id || raw.itemId || `item-${Date.now()}`;
  const itemId = raw.itemId || id;

  let tags = [];
  if (Array.isArray(raw.tags)) {
    tags = raw.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  } else if (typeof raw.tags === 'string' && raw.tags.trim()) {
    tags = raw.tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  const image = raw.image || (Array.isArray(raw.images) && raw.images[0]) || null;
  const images = Array.isArray(raw.images) && raw.images.length > 0
    ? raw.images
    : (image ? [image] : []);

  return {
    ...raw,
    id,
    itemId,
    imageKey: raw.imageKey || null,
    type: (raw.type || 'lost').toLowerCase(),
    name: raw.name || 'Untitled Item',
    category: raw.category || 'Other',
    description: raw.description || '',
    location: raw.location || '',
    date: raw.date || new Date().toISOString().split('T')[0],
    reportedBy: raw.reportedBy || raw.userId || '',
    reporterName: raw.reporterName || 'Verified Member',
    status: raw.status || 'active',
    activeClaimId: raw.activeClaimId || null,
    image,
    images,
    tags,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

/**
 * Normalizes a claim object from AWS DynamoDB / API Gateway to match the frontend schema.
 * Ensures consistent availability of `id`, `claimId`, `itemId`, roles, statuses, and workflow history.
 */
function normalizeClaim(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const claimId = raw.claimId || raw.id || `claim-${Date.now()}`;
  const id = claimId;
  const itemId = raw.itemId || '';

  return {
    ...raw,
    id,
    claimId,
    itemId,
    claimedBy: raw.claimedBy || '',
    claimerName: raw.claimerName || 'Verified Claimant',
    claimerEmail: raw.claimerEmail || '',
    finderId: raw.finderId || '',
    finderName: raw.finderName || 'Campus Finder',
    status: raw.status || CLAIM_STATUSES.PENDING_FINDER_REVIEW,
    reason: raw.reason || '',
    verificationDetails: raw.verificationDetails || '',
    additionalInfo: raw.additionalInfo || '',
    finderRejectionReason: raw.finderRejectionReason || '',
    disputeReason: raw.disputeReason || '',
    adminReviewComment: raw.adminReviewComment || '',
    finderHandoverConfirmed: Boolean(raw.finderHandoverConfirmed),
    claimantHandoverConfirmed: Boolean(raw.claimantHandoverConfirmed),
    handoverCompletedAt: raw.handoverCompletedAt || null,
    history: Array.isArray(raw.history) ? raw.history : [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function ItemsProvider({ children }) {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]); // Real backend claims (MOCK_CLAIMS removed)
  // Live smart matches computed dynamically from real AWS catalog items
  const matches = useMemo(() => findLiveMatches(items), [items]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState(null);
  const submittingRef = useRef(false);

  // 1. Initial item fetch from AWS DynamoDB on startup
  useEffect(() => {
    let isMounted = true;

    async function loadInitialItems() {
      setIsLoading(true);
      setError(null);
      try {
        const remoteItems = await fetchItems();
        if (isMounted) {
          const normalized = (Array.isArray(remoteItems) ? remoteItems : [])
            .map(normalizeItem)
            .filter(Boolean);
          setItems(normalized);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch items on startup:', err);
          setError(err.message || 'Failed to load items from server.');
          setItems([]); // Strictly empty, do NOT fallback to mock items
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialItems();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initial / reactive claims synchronization for authenticated member
  useEffect(() => {
    let isMounted = true;

    async function syncClaims() {
      if (!currentUser) {
        setClaims([]);
        setIsClaimsLoading(false);
        setClaimsError(null);
        return;
      }

      setIsClaimsLoading(true);
      setClaimsError(null);
      try {
        const remoteClaims = await fetchClaims();
        if (isMounted) {
          const normalized = (Array.isArray(remoteClaims) ? remoteClaims : [])
            .map(normalizeClaim)
            .filter(Boolean);
          setClaims(normalized);
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.message || '';
          if (msg.includes('Authentication required') || msg.includes('sign in')) {
            setClaims([]);
          } else {
            console.error('Failed to sync claims from AWS:', msg);
            setClaimsError(msg);
            setClaims([]);
          }
        }
      } finally {
        if (isMounted) {
          setIsClaimsLoading(false);
        }
      }
    }

    syncClaims();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Helper to re-fetch items on demand from AWS
  async function refreshItems() {
    setIsLoading(true);
    setError(null);
    try {
      const remoteItems = await fetchItems();
      const normalized = (Array.isArray(remoteItems) ? remoteItems : [])
        .map(normalizeItem)
        .filter(Boolean);
      setItems(normalized);
      return normalized;
    } catch (err) {
      console.error('Failed to refresh items:', err);
      setError(err.message || 'Failed to refresh items.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  // Helper to re-fetch claims on demand from AWS
  async function refreshClaims(params = {}) {
    setIsClaimsLoading(true);
    setClaimsError(null);
    try {
      const remoteClaims = await fetchClaims(params);
      const normalized = (Array.isArray(remoteClaims) ? remoteClaims : [])
        .map(normalizeClaim)
        .filter(Boolean);
      setClaims(normalized);
      return normalized;
    } catch (err) {
      console.error('Failed to refresh claims from AWS:', err.message);
      setClaimsError(err.message || 'Failed to refresh claims.');
      throw err;
    } finally {
      setIsClaimsLoading(false);
    }
  }

  // 3. Real API-backed addItem with duplicate submission guard and error propagation
  async function addItem(itemData) {
    if (submittingRef.current) {
      throw new Error('A submission is already in progress. Please wait.');
    }
    submittingRef.current = true;

    try {
      const createdRaw = await createItem(itemData);

      const normalized = normalizeItem({
        ...createdRaw,
        imageKey: createdRaw.imageKey || itemData.imageKey || null,
        image: createdRaw.image || (itemData.image && !itemData.image.startsWith('data:') ? itemData.image : null),
        images: (createdRaw.images && createdRaw.images.length > 0)
          ? createdRaw.images
          : (createdRaw.image ? [createdRaw.image] : []),
        reporterName: createdRaw.reporterName || itemData.reporterName || 'Verified Member',
        reportedBy: createdRaw.reportedBy || itemData.reportedBy || '',
      });

      if (!normalized) {
        throw new Error('Server returned an invalid item format.');
      }

      setItems((prev) => [normalized, ...prev]);
      return normalized;
    } catch (err) {
      console.error('ItemsContext: addItem failed:', err);
      throw err;
    } finally {
      submittingRef.current = false;
    }
  }

  // Update Item status (client state helper for demo / future PATCH /items/{id})
  async function updateItemStatus(itemId, status) {
    setItems((prev) =>
      prev.map((item) =>
        (item.id === itemId || item.itemId === itemId) ? { ...item, status } : item
      )
    );
  }

  // Update Item details (client state helper for demo / future PUT /items/{id})
  async function updateItem(itemId, updatedFields) {
    setItems((prev) =>
      prev.map((item) =>
        (item.id === itemId || item.itemId === itemId) ? { ...item, ...updatedFields } : item
      )
    );
  }

  // -------------------------------------------------------------------------
  // Real AWS Claims Operations
  // -------------------------------------------------------------------------

  /**
   * 1. Submit Claim (Claimant) -> POST /claims
   * Reserves the target found item in DynamoDB atomically.
   */
  async function submitClaim(claimInput) {
    if (submittingRef.current) {
      throw new Error('A submission is already in progress. Please wait.');
    }
    submittingRef.current = true;

    try {
      const createdRaw = await createClaim({
        itemId: claimInput.itemId || claimInput.id,
        reason: claimInput.reason,
        verificationDetails: claimInput.verificationDetails,
        additionalInfo: claimInput.additionalInfo || '',
      });

      const normalized = normalizeClaim(createdRaw);
      if (!normalized) {
        throw new Error('Server returned an invalid claim format.');
      }

      // Add to React state only after backend confirms success
      setClaims((prev) => [
        normalized,
        ...prev.filter((c) => c.id !== normalized.id && c.claimId !== normalized.claimId),
      ]);

      // Update target item status locally to 'claimed' with activeClaimId
      setItems((prev) =>
        prev.map((item) =>
          (item.id === normalized.itemId || item.itemId === normalized.itemId)
            ? { ...item, status: 'claimed', activeClaimId: normalized.id }
            : item
        )
      );

      // Refresh both datasets in background to ensure cluster consistency
      refreshClaims().catch(() => {});
      refreshItems().catch(() => {});

      return normalized;
    } catch (err) {
      console.error('ItemsContext: submitClaim failed:', err.message);
      throw err;
    } finally {
      submittingRef.current = false;
    }
  }

  /**
   * 2. Finder Decision: Approve -> POST /claims/{claimId}/finder-decision (approve)
   * Moves status to PENDING_ADMIN_REVIEW.
   */
  async function finderApproveClaim(claimId, arg2, arg3) {
    if (submittingRef.current) {
      throw new Error('An operation is already in progress. Please wait.');
    }
    submittingRef.current = true;

    try {
      const comment = typeof arg2 === 'string' && arg2.trim()
        ? arg2.trim()
        : (typeof arg3 === 'string' && arg3.trim() ? arg3.trim() : '');

      const updatedRaw = await submitFinderDecision(claimId, {
        decision: 'approve',
        comment,
      });

      const normalized = normalizeClaim(updatedRaw);

      setClaims((prev) =>
        prev.map((c) => (c.id === claimId || c.claimId === claimId) ? normalized : c)
      );

      refreshClaims().catch(() => {});
      return normalized;
    } catch (err) {
      console.error('ItemsContext: finderApproveClaim failed:', err.message);
      throw err;
    } finally {
      submittingRef.current = false;
    }
  }

  /**
   * 3. Finder Decision: Reject -> POST /claims/{claimId}/finder-decision (reject)
   * Moves status to FINDER_REJECTED (item remains reserved for potential dispute).
   */
  async function finderRejectClaim(claimId, arg2, arg3) {
    if (submittingRef.current) {
      throw new Error('An operation is already in progress. Please wait.');
    }
    submittingRef.current = true;

    try {
      const reason = (typeof arg3 === 'string' && arg3.trim().length >= 5)
        ? arg3.trim()
        : (typeof arg2 === 'string' ? arg2.trim() : '');

      if (!reason || reason.length < 5) {
        throw new Error('A detailed explanation (at least 5 characters) is required when rejecting a claim.');
      }

      const updatedRaw = await submitFinderDecision(claimId, {
        decision: 'reject',
        rejectionReason: reason,
      });

      const normalized = normalizeClaim(updatedRaw);

      setClaims((prev) =>
        prev.map((c) => (c.id === claimId || c.claimId === claimId) ? normalized : c)
      );

      refreshClaims().catch(() => {});
      return normalized;
    } catch (err) {
      console.error('ItemsContext: finderRejectClaim failed:', err.message);
      throw err;
    } finally {
      submittingRef.current = false;
    }
  }

  /**
   * 4. Claimant Dispute: Request Admin Review -> POST /claims/{claimId}/dispute
   * Moves status to ADMIN_REVIEW_REQUESTED.
   */
  async function requestAdminReview(claimId, arg2, arg3) {
    if (submittingRef.current) {
      throw new Error('An operation is already in progress. Please wait.');
    }
    submittingRef.current = true;

    try {
      const disputeReason = (typeof arg3 === 'string' && arg3.trim().length >= 10)
        ? arg3.trim()
        : (typeof arg2 === 'string' ? arg2.trim() : '');

      if (!disputeReason || disputeReason.length < 10) {
        throw new Error('Please provide a substantive dispute statement (at least 10 characters) for campus administration review.');
      }

      const updatedRaw = await submitClaimDispute(claimId, disputeReason);
      const normalized = normalizeClaim(updatedRaw);

      setClaims((prev) =>
        prev.map((c) => (c.id === claimId || c.claimId === claimId) ? normalized : c)
      );

      refreshClaims().catch(() => {});
      return normalized;
    } catch (err) {
      console.error('ItemsContext: requestAdminReview failed:', err.message);
      throw err;
    } finally {
      submittingRef.current = false;
    }
  }

  /**
   * 5. Admin Decision: Approve -> POST /claims/{claimId}/admin-decision (approve)
   * Moves status to ADMIN_APPROVED.
   */
  async function adminApproveClaim(claimId, arg2, arg3) {
    if (submittingRef.current) {
      throw new Error('An operation is already in progress. Please wait.');
    }
    submittingRef.current = true;

    try {
      const comment = (typeof arg3 === 'string' && arg3.trim().length >= 5)
        ? arg3.trim()
        : (typeof arg2 === 'string' && arg2.trim().length >= 5
            ? arg2.trim()
            : 'Admin authorized ownership after review of evidence.');

      const updatedRaw = await submitAdminDecision(claimId, {
        decision: 'approve',
        comment,
      });

      const normalized = normalizeClaim(updatedRaw);

      setClaims((prev) =>
        prev.map((c) => (c.id === claimId || c.claimId === claimId) ? normalized : c)
      );

      refreshClaims().catch(() => {});
      return normalized;
    } catch (err) {
      console.error('ItemsContext: adminApproveClaim failed:', err.message);
      throw err;
    } finally {
      submittingRef.current = false;
    }
  }

  /**
   * 6. Admin Decision: Reject -> POST /claims/{claimId}/admin-decision (reject)
   * Atomically releases item status back to 'active' and clears activeClaimId in DynamoDB.
   */
  async function adminRejectClaim(claimId, arg2, arg3) {
    if (submittingRef.current) {
      throw new Error('An operation is already in progress. Please wait.');
    }
    submittingRef.current = true;

    try {
      const comment = (typeof arg3 === 'string' && arg3.trim().length >= 5)
        ? arg3.trim()
        : (typeof arg2 === 'string' ? arg2.trim() : '');

      if (!comment || comment.length < 5) {
        throw new Error('Administrative rejection requires a documented rationale (at least 5 characters).');
      }

      const updatedRaw = await submitAdminDecision(claimId, {
        decision: 'reject',
        comment,
      });

      const normalized = normalizeClaim(updatedRaw);

      setClaims((prev) =>
        prev.map((c) => (c.id === claimId || c.claimId === claimId) ? normalized : c)
      );

      // Revert item state locally to 'active'
      if (normalized.itemId) {
        setItems((prev) =>
          prev.map((item) =>
            (item.id === normalized.itemId || item.itemId === normalized.itemId)
              ? { ...item, status: 'active', activeClaimId: null }
              : item
          )
        );
      }

      refreshClaims().catch(() => {});
      refreshItems().catch(() => {});
      return normalized;
    } catch (err) {
      console.error('ItemsContext: adminRejectClaim failed:', err.message);
      throw err;
    } finally {
      submittingRef.current = false;
    }
  }

  /**
   * 7. Handover Confirmation: Dual Confirmation -> POST /claims/{claimId}/handover
   * First confirmation transitions to HANDOVER_IN_PROGRESS.
   * Second confirmation transitions to COMPLETED and item becomes 'returned'.
   */
  async function confirmHandover(claimId) {
    if (submittingRef.current) {
      throw new Error('An operation is already in progress. Please wait.');
    }
    submittingRef.current = true;

    try {
      const updatedRaw = await apiConfirmHandover(claimId);
      const normalized = normalizeClaim(updatedRaw);

      setClaims((prev) =>
        prev.map((c) => (c.id === claimId || c.claimId === claimId) ? normalized : c)
      );

      // If dual confirmation completed, update item status to 'returned'
      if (normalized.status === CLAIM_STATUSES.COMPLETED && normalized.itemId) {
        setItems((prev) =>
          prev.map((item) =>
            (item.id === normalized.itemId || item.itemId === normalized.itemId)
              ? { ...item, status: 'returned' }
              : item
          )
        );
      }

      refreshClaims().catch(() => {});
      refreshItems().catch(() => {});
      return normalized;
    } catch (err) {
      console.error('ItemsContext: confirmHandover failed:', err.message);
      throw err;
    } finally {
      submittingRef.current = false;
    }
  }

  // -------------------------------------------------------------------------
  // Selectors & Query Helpers
  // -------------------------------------------------------------------------

  function getItemById(id) {
    return items.find((item) => item.id === id || item.itemId === id);
  }

  function getItemsByUser(userId) {
    if (!userId) return [];
    return items.filter((item) => item.reportedBy === userId);
  }

  function getClaimsByUser(userId) {
    if (!userId) return [];
    return claims.filter((c) => c.claimedBy === userId);
  }

  function getIncomingClaimsForFinder(userId) {
    if (!userId) return [];
    const userFoundItemIds = items
      .filter((item) => item.reportedBy === userId)
      .map((item) => item.id || item.itemId);
    return claims.filter(
      (c) => c.finderId === userId || userFoundItemIds.includes(c.itemId)
    );
  }

  async function getClaimById(id) {
    if (!id) return null;
    const local = claims.find((c) => c.id === id || c.claimId === id);
    if (local) return local;
    try {
      const remote = await fetchClaimById(id);
      return normalizeClaim(remote);
    } catch {
      return null;
    }
  }

  function getMatchesForUser(userId) {
    if (!userId) return [];
    const userItemIds = items
      .filter((item) => item.reportedBy === userId)
      .map((item) => item.id || item.itemId);
    return matches.filter(
      (m) =>
        userItemIds.includes(m.lostItemId) || userItemIds.includes(m.foundItemId)
    );
  }

  return (
    <ItemsContext.Provider
      value={{
        items,
        claims,
        matches,
        isLoading,
        error,
        isClaimsLoading,
        claimsError,
        refreshItems,
        refreshClaims,
        addItem,
        updateItem,
        updateItemStatus,
        submitClaim,
        finderApproveClaim,
        finderRejectClaim,
        requestAdminReview,
        adminApproveClaim,
        adminRejectClaim,
        confirmHandover,
        getItemById,
        getClaimById,
        getItemsByUser,
        getClaimsByUser,
        getIncomingClaimsForFinder,
        getMatchesForUser,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  return useContext(ItemsContext);
}
