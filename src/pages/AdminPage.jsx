import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Package, CheckCircle, Shield,
  Clock, Eye, ChevronDown, Inbox,
  AlertTriangle, ShieldCheck,
  Search, X, CheckCircle2,
  Handshake, Lock, ExternalLink,
  BarChart2, Activity,
  ArrowRight, Compass, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import { MOCK_USERS, CLAIM_STATUSES, CATEGORIES } from '../data/mockData';
import { timeAgo, formatDate, getInitials } from '../utils/helpers';
import Badge from '../components/Badge';
import ClaimDetailModal from '../components/ClaimDetailModal';

// Reusable Metric Card
function StatCard({ icon: Icon, label, value, detail, color = 'bg-[#DCE5EF]/60 text-[#101D36]' }) {
  return (
    <div className="glass-card rounded-2xl border border-[#101D36]/10 p-5 shadow-xs transition hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-inner`}>
          <Icon className="w-5 h-5" />
        </div>
        {detail && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#F7F5EF] border border-[#E5E7EB] text-[#8999AE]">
            {detail}
          </span>
        )}
      </div>
      <p className="font-serif text-3xl font-bold text-[#101D36] mt-3 tracking-tight">{value}</p>
      <p className="text-xs uppercase font-mono tracking-wider text-[#8999AE] mt-1">{label}</p>
    </div>
  );
}

// Admin Decision Modal (Requires Mandatory Review Comment)
function AdminDecisionModal({ claim, itemName, actionType, onClose, onConfirm }) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isApprove = actionType === 'approve';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 5) {
      setError('A mandatory administrative review comment is required (at least 5 characters).');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onConfirm(claim.id, comment.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#101D36]/10 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            {isApprove ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <h3 className="font-serif text-lg font-bold text-[#101D36]">
              {isApprove ? 'Issue Administrative Approval Seal' : 'Issue Administrative Rejection'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#8999AE] hover:text-[#101D36] transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#8999AE] leading-relaxed">
          You are recording an administrative determination for claim <strong className="text-[#101D36]">#{claim.id}</strong> on{' '}
          <strong className="text-[#101D36]">{itemName}</strong> filed by <strong className="text-[#101D36]">{claim.claimerName}</strong>.
          {isApprove
            ? ' Approval authorizes physical item handover and overrides any prior finder rejection.'
            : ' Rejection terminates the claim petition and archives the record.'}
        </p>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
              Mandatory Administrative Comment *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder={isApprove ? 'Document the rationale for authorizing this custody release (e.g. valid proof provided, serials match, dispute resolved)...' : 'Document the factual grounds for administrative denial...'}
              className="w-full px-3.5 py-2.5 text-xs border border-[#E5E7EB] rounded-xl text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#8999AE] hover:text-[#101D36] hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold uppercase tracking-wider transition shadow-xs cursor-pointer disabled:opacity-60 ${
                isApprove ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {isSubmitting ? 'Recording...' : isApprove ? 'Confirm Approval Seal' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// User Dossier Modal
function UserDossierModal({ user, items, claims, onClose }) {
  const userItems = items.filter((i) => i.reportedBy === user.id);
  const userClaims = claims.filter((c) => c.claimedBy === user.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#101D36]/10 space-y-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#101D36] text-[#F7F5EF] flex items-center justify-center font-bold text-sm">
              {getInitials(user.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#101D36]">{user.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#DCE5EF] text-[#101D36] uppercase font-bold">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-[#8999AE]">{user.email} &bull; Member since {formatDate(user.joinedDate)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#8999AE] hover:text-[#101D36] transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Activity Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB]">
            <span className="text-[10px] font-mono uppercase text-[#8999AE]">Registered Listings</span>
            <p className="font-serif text-xl font-bold text-[#101D36] mt-0.5">{userItems.length}</p>
          </div>
          <div className="p-3 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB]">
            <span className="text-[10px] font-mono uppercase text-[#8999AE]">Ownership Claims Filed</span>
            <p className="font-serif text-xl font-bold text-[#101D36] mt-0.5">{userClaims.length}</p>
          </div>
        </div>

        {/* Reported Items */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-[#101D36]">
            User Reports ({userItems.length})
          </h4>
          {userItems.length === 0 ? (
            <p className="text-xs text-[#8999AE]">No reports filed by this member.</p>
          ) : (
            <div className="divide-y divide-gray-100 border border-[#E5E7EB] rounded-xl overflow-hidden text-xs">
              {userItems.map((itm) => (
                <div key={itm.id} className="p-3 flex items-center justify-between gap-2 hover:bg-[#F7F5EF]/50">
                  <div className="min-w-0">
                    <p className="font-bold text-[#101D36] truncate">{itm.name}</p>
                    <p className="text-[11px] text-[#8999AE]">{itm.location} &bull; {formatDate(itm.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={itm.type}>{itm.type}</Badge>
                    <Badge variant={itm.status}>{itm.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claims Filed */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-[#101D36]">
            Claims Filed ({userClaims.length})
          </h4>
          {userClaims.length === 0 ? (
            <p className="text-xs text-[#8999AE]">No ownership claims filed by this member.</p>
          ) : (
            <div className="divide-y divide-gray-100 border border-[#E5E7EB] rounded-xl overflow-hidden text-xs">
              {userClaims.map((clm) => {
                const targetItm = items.find((i) => i.id === clm.itemId);
                return (
                  <div key={clm.id} className="p-3 flex items-center justify-between gap-2 hover:bg-[#F7F5EF]/50">
                    <div className="min-w-0">
                      <p className="font-bold text-[#101D36] truncate">{targetItm?.name || 'Item'}</p>
                      <p className="text-[11px] text-[#8999AE]">Filed {timeAgo(clm.createdAt)}</p>
                    </div>
                    <Badge variant={clm.status}>{clm.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { currentUser, loginAsDemoUser, isLoading } = useAuth();
  const {
    items,
    claims,
    updateItemStatus,
    finderApproveClaim,
    finderRejectClaim,
    requestAdminReview,
    adminApproveClaim,
    adminRejectClaim,
    confirmHandover,
  } = useItems();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'queue' | 'claims' | 'items' | 'handovers' | 'users'
  const [activeModalClaim, setActiveModalClaim] = useState(null);
  const [activeDecision, setActiveDecision] = useState(null); // { claim, actionType: 'approve' | 'reject' }
  const [inspectingUser, setInspectingUser] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Claim filtering state
  const [claimSearch, setClaimSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('');
  const [claimCategoryFilter, setClaimCategoryFilter] = useState('');
  const [claimDateSort, setClaimDateSort] = useState('newest');

  // Item filtering state
  const [itemSearch, setItemSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('');

  // User filtering state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // User directory combining registered directory and active authenticated member
  const allPlatformUsers = useMemo(() => {
    if (currentUser && !MOCK_USERS.some((u) => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email?.toLowerCase())) {
      return [currentUser, ...MOCK_USERS];
    }
    return MOCK_USERS;
  }, [currentUser]);

  // 1. Dynamic Overview Statistics
  const totalUsers = allPlatformUsers.length;
  const totalListings = items.length;
  const activeLostItems = items.filter((i) => i.type === 'lost' && i.status !== 'returned').length;
  const activeFoundItems = items.filter((i) => i.type === 'found' && i.status !== 'returned').length;
  const claimsAwaitingReview = claims.filter((c) => c.status === CLAIM_STATUSES.PENDING_ADMIN_REVIEW).length;
  const disputedClaims = claims.filter((c) => c.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED).length;
  const returnedItems = items.filter((i) => i.status === 'returned').length;

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // 2. Platform Analytics Data
  const lostCount = items.filter((i) => i.type === 'lost').length;
  const foundCount = items.filter((i) => i.type === 'found').length;
  const lostPercent = Math.round((lostCount / (totalListings || 1)) * 100);
  const foundPercent = 100 - lostPercent;

  // Monthly activity distribution
  const monthlyActivity = [
    { month: 'August', count: 18, height: '40%' },
    { month: 'September', count: 32, height: '65%' },
    { month: 'October', count: 48, height: '95%' },
    { month: 'November', count: 28, height: '58%' },
  ];

  // Claims by Status counts
  const claimStatusCounts = useMemo(() => {
    const counts = {};
    Object.values(CLAIM_STATUSES).forEach((st) => {
      counts[st] = claims.filter((c) => c.status === st).length;
    });
    return counts;
  }, [claims]);

  // 3. Filtered Claims Table Data
  const filteredClaims = useMemo(() => {
    return claims
      .filter((c) => {
        const targetItm = items.find((i) => i.id === c.itemId);
        // Search text: claim ID, claimant, finder, item name
        if (claimSearch.trim()) {
          const q = claimSearch.toLowerCase();
          const matchId = c.id.toLowerCase().includes(q);
          const matchClaimer = c.claimerName?.toLowerCase().includes(q);
          const matchEmail = c.claimerEmail?.toLowerCase().includes(q);
          const matchItem = targetItm?.name?.toLowerCase().includes(q);
          const matchFinder = targetItm?.reporterName?.toLowerCase().includes(q);
          if (!matchId && !matchClaimer && !matchEmail && !matchItem && !matchFinder) return false;
        }

        if (claimStatusFilter && c.status !== claimStatusFilter) return false;
        if (claimCategoryFilter && targetItm?.category !== claimCategoryFilter) return false;

        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.createdAt);
        const db = new Date(b.createdAt);
        return claimDateSort === 'newest' ? db - da : da - db;
      });
  }, [claims, items, claimSearch, claimStatusFilter, claimCategoryFilter, claimDateSort]);

  // 4. Admin Review Queue Data (PENDING_ADMIN_REVIEW + ADMIN_REVIEW_REQUESTED)
  const reviewQueueClaims = useMemo(() => {
    return claims.filter(
      (c) => c.status === CLAIM_STATUSES.PENDING_ADMIN_REVIEW || c.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED
    );
  }, [claims]);

  // 5. Filtered Items Registry Data
  const filteredItems = useMemo(() => {
    return items.filter((itm) => {
      if (itemSearch.trim()) {
        const q = itemSearch.toLowerCase();
        const matchName = itm.name?.toLowerCase().includes(q);
        const matchLoc = itm.location?.toLowerCase().includes(q);
        const matchId = itm.id?.toLowerCase().includes(q);
        if (!matchName && !matchLoc && !matchId) return false;
      }
      if (itemTypeFilter && itm.type !== itemTypeFilter) return false;
      if (itemStatusFilter && itm.status !== itemStatusFilter) return false;
      return true;
    });
  }, [items, itemSearch, itemTypeFilter, itemStatusFilter]);

  // 6. Filtered Users Data
  const filteredUsers = useMemo(() => {
    return allPlatformUsers.filter((u) => {
      if (userSearch.trim()) {
        const q = userSearch.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      if (userRoleFilter && u.role !== userRoleFilter) return false;
      return true;
    });
  }, [allPlatformUsers, userSearch, userRoleFilter]);

  // 7. Handover Monitoring Claims
  const handoverClaims = useMemo(() => {
    return claims.filter(
      (c) =>
        c.status === CLAIM_STATUSES.ADMIN_APPROVED ||
        c.status === CLAIM_STATUSES.HANDOVER_IN_PROGRESS ||
        c.status === CLAIM_STATUSES.COMPLETED
    );
  }, [claims]);

  // Handle Admin Decisions
  async function handleAdminApprove(claimId, comment) {
    await adminApproveClaim(claimId, comment, currentUser);
    showToast('Administrative seal issued! Claim moved to authorized handover.');
  }

  async function handleAdminReject(claimId, comment) {
    await adminRejectClaim(claimId, comment, currentUser);
    showToast('Claim officially rejected by campus administration.');
  }

  // Handle Listing Status Changes
  async function handleChangeItemStatus(itemId, newStatus) {
    const targetItem = items.find((i) => i.id === itemId);
    if (targetItem?.status === 'returned' && newStatus !== 'returned') {
      alert('Sealed items that have completed physical return cannot be reopened.');
      return;
    }
    await updateItemStatus(itemId, newStatus);
    showToast(`Listing status updated to ${newStatus.toUpperCase()}.`);
  }

  // Loading State Guard - Prevents displaying "Administrative role required" while restoring Cognito session
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mb-4 border border-[#101D36]/10 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#101D36]" />
        </div>
        <span className="text-xs uppercase font-mono tracking-widest text-[#8999AE]">Authentication in Progress</span>
        <h2 className="font-serif text-xl font-bold text-[#101D36] mt-1">Verifying Administrator Clearance</h2>
        <p className="text-xs text-[#8999AE] mt-1">Restoring verified session and retrieving custody permissions...</p>
      </div>
    );
  }

  // Auth Guard
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <span className="text-xs uppercase font-mono tracking-widest text-amber-800">Privileged Clearance Required</span>
        <h2 className="font-serif text-2xl font-bold text-[#101D36] mt-2 mb-2">Administrative Role Required</h2>
        <p className="text-sm text-[#8999AE] mb-6 leading-relaxed">
          Access to this dashboard is restricted to authorized campus custody officers. Switch to the administrative account (Emma Wilson) to proceed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login"
            className="px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-[#101D36] hover:bg-[#172944] inline-block transition shadow-xs"
          >
            Sign in as Admin
          </Link>
          <button
            type="button"
            onClick={() => loginAsDemoUser('admin')}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#101D36]/20 text-[#101D36] bg-white hover:bg-gray-50 transition shadow-2xs cursor-pointer"
          >
            Demo Admin Clearance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#101D36] text-[#F7F5EF] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#2A3E5C] text-xs font-mono animate-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#8999AE] hover:text-white p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#101D36]/10">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#8999AE] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#101D36]" /> Dean of Students Custody Oversight
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36] mt-1">Admin Dashboard</h1>
          <p className="text-sm text-[#8999AE] mt-1">
            Monitor and manage the FindIt platform. Review claims, resolve disputes, oversee handovers, and audit listings.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#DCE5EF] rounded-full self-start sm:self-auto shadow-2xs">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-mono font-bold text-[#101D36]">Signed in as {currentUser.name} (Admin)</span>
        </div>
      </div>

      {/* 2. Overview Statistics (All 7 metrics calculated dynamically) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard icon={Users} label="Total Users" value={totalUsers} color="bg-blue-50 text-blue-700" />
        <StatCard icon={Package} label="Total Listings" value={totalListings} color="bg-stone-100 text-stone-800" />
        <StatCard icon={Clock} label="Active Lost" value={activeLostItems} color="bg-rose-50 text-rose-700" />
        <StatCard icon={Compass} label="Active Found" value={activeFoundItems} color="bg-emerald-50 text-emerald-700" />
        <StatCard icon={Clock} label="Awaiting Review" value={claimsAwaitingReview} detail={claimsAwaitingReview > 0 ? 'Urgent' : null} color="bg-amber-100 text-amber-900" />
        <StatCard icon={AlertTriangle} label="Disputed Claims" value={disputedClaims} detail={disputedClaims > 0 ? 'Arbitrate' : null} color="bg-purple-50 text-purple-700" />
        <StatCard icon={CheckCircle2} label="Returned Items" value={returnedItems} color="bg-teal-50 text-teal-800" />
      </div>

      {/* 3. Primary Section Navigation Tabs */}
      <div className="glass-card rounded-3xl border border-[#101D36]/10 shadow-xs overflow-hidden">
        <div className="flex items-center gap-1.5 p-2 border-b border-gray-100 bg-[#F7F5EF]/80 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview & Analytics', icon: BarChart2 },
            {
              id: 'queue',
              label: 'Admin Review Queue',
              icon: AlertTriangle,
              count: reviewQueueClaims.length,
              urgent: reviewQueueClaims.length > 0,
            },
            { id: 'claims', label: 'Claim Management', icon: Inbox, count: claims.length },
            { id: 'handovers', label: 'Handover Monitoring', icon: Handshake, count: handoverClaims.length },
            { id: 'items', label: 'Listing Management', icon: Package, count: items.length },
            { id: 'users', label: 'User Directory', icon: Users, count: MOCK_USERS.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                    : 'text-[#8999AE] hover:text-[#101D36]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.urgent
                        ? 'bg-amber-500 text-white font-bold'
                        : 'bg-[#E5E7EB] text-[#101D36]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Lost vs Found Ratio Visualization */}
              <div className="p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-[#101D36]">Lost vs. Found Distribution</h3>
                  <span className="text-xs font-mono text-[#8999AE]">{totalListings} Listings Total</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-rose-700 font-bold">Lost Property: {lostCount} ({lostPercent}%)</span>
                    <span className="text-emerald-700 font-bold">Found Property: {foundCount} ({foundPercent}%)</span>
                  </div>
                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    <div style={{ width: `${lostPercent}%` }} className="bg-rose-600 transition-all duration-500" />
                    <div style={{ width: `${foundPercent}%` }} className="bg-emerald-600 transition-all duration-500" />
                  </div>
                </div>

                <p className="text-xs text-[#8999AE] leading-relaxed">
                  Ratio reflects active reports filed by Dayananda Sagar College of Engineering campus community members.
                </p>
              </div>

              {/* Monthly Listing Activity Bar Chart */}
              <div className="p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-[#101D36]">Monthly Activity Histogram</h3>
                  <span className="text-xs font-mono text-[#8999AE]">Fall 2026 Registry</span>
                </div>

                <div className="flex items-end justify-between gap-4 h-32 pt-4 px-2 border-b border-gray-100">
                  {monthlyActivity.map((bar) => (
                    <div key={bar.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-mono font-bold text-[#101D36]">{bar.count}</span>
                      <div
                        style={{ height: bar.height }}
                        className="w-full max-w-[42px] bg-[#101D36] hover:bg-[#172944] rounded-t-lg transition-all"
                      />
                      <span className="text-[10px] font-mono text-[#8999AE]">{bar.month.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Claims by Status Breakdown */}
            <div className="p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-2xs space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#101D36]">Claims Custody Pipeline by Status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'Pending Finder Review', count: claimStatusCounts.PENDING_FINDER_REVIEW || 0, color: 'text-amber-800 bg-amber-50 border-amber-200' },
                  { label: 'Pending Admin Review', count: claimStatusCounts.PENDING_ADMIN_REVIEW || 0, color: 'text-indigo-800 bg-indigo-50 border-indigo-200' },
                  { label: 'Disputes (Review Req.)', count: claimStatusCounts.ADMIN_REVIEW_REQUESTED || 0, color: 'text-purple-800 bg-purple-50 border-purple-200' },
                  { label: 'Admin Approved', count: claimStatusCounts.ADMIN_APPROVED || 0, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
                  { label: 'Handover in Progress', count: claimStatusCounts.HANDOVER_IN_PROGRESS || 0, color: 'text-teal-800 bg-teal-50 border-teal-200' },
                  { label: 'Completed (Returned)', count: claimStatusCounts.COMPLETED || 0, color: 'text-teal-900 bg-teal-100 border-teal-300' },
                  { label: 'Finder Rejected', count: claimStatusCounts.FINDER_REJECTED || 0, color: 'text-orange-800 bg-orange-50 border-orange-200' },
                  { label: 'Admin Rejected', count: claimStatusCounts.ADMIN_REJECTED || 0, color: 'text-rose-800 bg-rose-50 border-rose-200' },
                ].map((item) => (
                  <div key={item.label} className={`p-3 rounded-xl border ${item.color} flex flex-col justify-between`}>
                    <span className="text-[11px] font-mono uppercase">{item.label}</span>
                    <span className="text-xl font-bold font-serif mt-1">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently Reported Listings & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="font-serif text-base font-bold text-[#101D36]">Recently Reported Items</h3>
                  <button onClick={() => setActiveTab('items')} className="text-xs text-[#101D36] hover:underline flex items-center gap-1">
                    <span>All Items</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="divide-y divide-gray-100 text-xs">
                  {items.slice(0, 4).map((i) => (
                    <div key={i.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link to={`/items/${i.id}`} className="font-bold text-[#101D36] hover:underline truncate block">
                          {i.name}
                        </Link>
                        <p className="text-[#8999AE] text-[11px]">{i.location} &bull; {timeAgo(i.createdAt)}</p>
                      </div>
                      <Badge variant={i.type}>{i.type}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="font-serif text-base font-bold text-[#101D36]">Platform Activity Stream</h3>
                  <span className="text-xs font-mono text-[#8999AE]">Real-Time Audit</span>
                </div>
                <div className="space-y-3 text-xs">
                  {claims.slice(0, 4).map((c) => {
                    const itm = items.find((i) => i.id === c.itemId);
                    return (
                      <div key={c.id} className="p-2.5 rounded-xl bg-[#F7F5EF] flex items-start gap-2.5">
                        <Activity className="w-4 h-4 text-[#101D36] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[#101D36]">
                            <strong className="font-bold">{c.claimerName}</strong> filed claim for <strong>{itm?.name}</strong>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={c.status}>{c.status}</Badge>
                            <span className="text-[10px] font-mono text-[#8999AE]">{timeAgo(c.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADMIN REVIEW QUEUE (Section 4) */}
        {activeTab === 'queue' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="font-serif text-xl font-bold text-[#101D36]">Administrator Evaluation Queue</h2>
              <p className="text-xs text-[#8999AE] mt-0.5">
                Claims requiring campus administration approval or arbitration of disputed finder rejections.
              </p>
            </div>

            {reviewQueueClaims.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#101D36]">Review Queue is Clear</h3>
                <p className="text-xs text-[#8999AE] max-w-sm mx-auto">
                  All claims have been evaluated. New finder approvals or disputed claims will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviewQueueClaims.map((claim) => {
                  const targetItm = items.find((i) => i.id === claim.itemId);
                  const isDisputed = claim.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED;

                  return (
                    <div
                      key={claim.id}
                      className={`p-6 rounded-3xl border transition space-y-5 ${
                        isDisputed ? 'bg-purple-50/30 border-purple-200' : 'bg-white border-[#E5E7EB]'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#101D36]">#{claim.id}</span>
                            <Badge variant={claim.status}>{claim.status}</Badge>
                            {isDisputed && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-700 text-white">
                                Dispute: Override Available
                              </span>
                            )}
                          </div>
                          <h3 className="font-serif text-lg font-bold text-[#101D36] mt-1">
                            {targetItm?.name || 'Item'}
                          </h3>
                        </div>

                        <span className="text-xs font-mono text-[#8999AE]">
                          Submitted {timeAgo(claim.createdAt)} ({formatDate(claim.createdAt)})
                        </span>
                      </div>

                      {/* Item and Participants Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB]">
                          <span className="text-[10px] font-mono uppercase text-[#8999AE] block">Target Item</span>
                          <p className="font-bold text-[#101D36] mt-0.5">{targetItm?.name}</p>
                          <p className="text-[11px] text-[#8999AE]">{targetItm?.location} &bull; {targetItm?.category}</p>
                        </div>

                        <div className="p-3 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB]">
                          <span className="text-[10px] font-mono uppercase text-[#8999AE] block">Claimant</span>
                          <p className="font-bold text-[#101D36] mt-0.5">{claim.claimerName}</p>
                          <p className="text-[11px] text-[#8999AE]">{claim.claimerEmail}</p>
                        </div>

                        <div className="p-3 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB]">
                          <span className="text-[10px] font-mono uppercase text-[#8999AE] block">Finder (Physical Holder)</span>
                          <p className="font-bold text-[#101D36] mt-0.5">{targetItm?.reporterName || 'Campus Finder'}</p>
                          <p className="text-[11px] text-[#8999AE]">Custody Location: {targetItm?.location}</p>
                        </div>
                      </div>

                      {/* Public Grounds & Private Ownership Verification Evidence */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] space-y-1">
                          <span className="font-bold text-[#101D36] block">Public Grounds for Claim:</span>
                          <p className="italic text-[#101D36]/80">&ldquo;{claim.reason}&rdquo;</p>
                          {claim.additionalInfo && (
                            <p className="text-[#8999AE] text-[11px] pt-1">
                              <strong>Handover Note:</strong> {claim.additionalInfo}
                            </p>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-300 space-y-1">
                          <span className="font-bold text-amber-950 flex items-center gap-1 block">
                            <Lock className="w-3.5 h-3.5 text-amber-700" />
                            Private Ownership Verification Evidence (Administrator Clearance):
                          </span>
                          <p className="font-mono text-amber-900 bg-white/70 p-2 rounded-lg border border-amber-200">
                            {claim.verificationDetails || 'No private descriptors provided.'}
                          </p>
                        </div>
                      </div>

                      {/* If Disputed, show Finder's Rejection Reason and Claimant's Dispute Argument */}
                      {isDisputed && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-2 text-xs">
                          <div className="font-bold text-orange-950 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-orange-700" />
                            <span>Arbitration Context: Finder Rejected &rarr; Claimant Disputed</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-2.5 rounded-xl bg-white border border-orange-200">
                              <strong className="block text-[10px] font-mono text-[#8999AE]">Finder&apos;s Rejection Reason:</strong>
                              <p className="italic text-[#101D36] mt-0.5">&ldquo;{claim.finderRejectionReason}&rdquo;</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-orange-200">
                              <strong className="block text-[10px] font-mono text-[#8999AE]">Claimant&apos;s Dispute Argument:</strong>
                              <p className="italic text-[#101D36] mt-0.5">&ldquo;{claim.disputeReason}&rdquo;</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons for Administrator */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
                        <button
                          onClick={() => setActiveModalClaim(claim)}
                          className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold uppercase tracking-wider text-[#101D36] hover:bg-gray-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#8999AE]" />
                          <span>View Full Claim Audit Trail</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveDecision({ claim, actionType: 'reject' })}
                            className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject Claim</span>
                          </button>

                          <button
                            onClick={() => setActiveDecision({ claim, actionType: 'approve' })}
                            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{isDisputed ? 'Override Rejection & Approve' : 'Approve & Release Seal'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLAIM MANAGEMENT TABLE (Section 3) */}
        {activeTab === 'claims' && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE]" />
                <input
                  type="text"
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  placeholder="Search Claim ID, Item, Claimant, Finder..."
                  className="w-full pl-9 pr-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
                />
              </div>

              <div className="relative">
                <select
                  value={claimStatusFilter}
                  onChange={(e) => setClaimStatusFilter(e.target.value)}
                  className="appearance-none w-full pl-3.5 pr-8 py-2.5 border border-[#E5E7EB] rounded-xl text-xs font-semibold uppercase tracking-wider bg-white text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  {Object.values(CLAIM_STATUSES).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={claimCategoryFilter}
                  onChange={(e) => setClaimCategoryFilter(e.target.value)}
                  className="appearance-none w-full pl-3.5 pr-8 py-2.5 border border-[#E5E7EB] rounded-xl text-xs font-semibold uppercase tracking-wider bg-white text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={claimDateSort}
                  onChange={(e) => setClaimDateSort(e.target.value)}
                  className="appearance-none w-full pl-3.5 pr-8 py-2.5 border border-[#E5E7EB] rounded-xl text-xs font-semibold uppercase tracking-wider bg-white text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
              </div>
            </div>

            {/* Claims Table */}
            <div className="border border-[#E5E7EB] rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F7F5EF] border-b border-gray-200/60 text-[#8999AE] font-mono uppercase tracking-wider text-[11px]">
                    <th className="text-left px-5 py-3.5">Claim ID &amp; Item</th>
                    <th className="text-left px-4 py-3.5">Claimant</th>
                    <th className="text-left px-4 py-3.5 hidden md:table-cell">Finder</th>
                    <th className="text-left px-4 py-3.5">Status</th>
                    <th className="text-left px-4 py-3.5 hidden lg:table-cell">Submitted</th>
                    <th className="text-right px-5 py-3.5">Review Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-[#8999AE]">
                        No claims match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((claim) => {
                      const itm = items.find((i) => i.id === claim.itemId);
                      return (
                        <tr key={claim.id} className="hover:bg-white transition">
                          <td className="px-5 py-4">
                            <span className="font-mono text-[10px] text-[#8999AE] font-bold">#{claim.id}</span>
                            <p className="font-serif font-bold text-[#101D36] text-sm line-clamp-1">{itm?.name || 'Item'}</p>
                            <span className="text-[11px] font-mono text-[#8999AE]">{itm?.category}</span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-bold text-[#101D36]">{claim.claimerName}</p>
                            <p className="text-[11px] font-mono text-[#8999AE]">{claim.claimerEmail}</p>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <p className="font-medium text-[#101D36]">{itm?.reporterName || 'Finder'}</p>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={claim.status}>{claim.status}</Badge>
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell text-[#8999AE] font-mono">
                            {formatDate(claim.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setActiveModalClaim(claim)}
                              className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#101D36] hover:bg-gray-50 transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#8999AE]" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: HANDOVER MONITORING (Section 7) */}
        {activeTab === 'handovers' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="font-serif text-xl font-bold text-[#101D36]">Custody Handover Monitoring</h2>
              <p className="text-xs text-[#8999AE]">
                Track authorized claims during in-person campus handover. Records only finalize as COMPLETED when both parties corroborate.
              </p>
            </div>

            <div className="space-y-4">
              {handoverClaims.length === 0 ? (
                <div className="p-16 text-center text-[#8999AE]">No claims currently in handover state.</div>
              ) : (
                handoverClaims.map((claim) => {
                  const itm = items.find((i) => i.id === claim.itemId);
                  const isCompleted = claim.status === CLAIM_STATUSES.COMPLETED;

                  return (
                    <div key={claim.id} className="p-5 rounded-2xl border border-[#E5E7EB] bg-white shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#101D36]">#{claim.id}</span>
                          <span className="font-serif font-bold text-base text-[#101D36]">{itm?.name}</span>
                          <Badge variant={claim.status}>{claim.status}</Badge>
                        </div>
                        <button
                          onClick={() => setActiveModalClaim(claim)}
                          className="text-xs font-semibold text-[#101D36] hover:underline flex items-center gap-1 self-start sm:self-auto"
                        >
                          <span>View Timeline</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB] flex items-center gap-2">
                          {claim.finderHandoverConfirmed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                          <div>
                            <strong>Finder Transfer: </strong>
                            <span>{claim.finderHandoverConfirmed ? 'Confirmed handed over' : 'Awaiting confirmation'}</span>
                          </div>
                        </div>

                        <div className="p-3 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB] flex items-center gap-2">
                          {claim.claimantHandoverConfirmed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                          <div>
                            <strong>Claimant Receipt ({claim.claimerName}): </strong>
                            <span>{claim.claimantHandoverConfirmed ? 'Confirmed item received' : 'Awaiting confirmation'}</span>
                          </div>
                        </div>
                      </div>

                      {isCompleted && (
                        <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          <span>Finalized &amp; Returned &bull; Associated Listing is Sealed</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LISTING REGISTRY MANAGEMENT (Section 6) */}
        {activeTab === 'items' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE]" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search item name, location, ID..."
                  className="w-full pl-9 pr-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
                />
              </div>

              <div className="relative">
                <select
                  value={itemTypeFilter}
                  onChange={(e) => setItemTypeFilter(e.target.value)}
                  className="appearance-none w-full pl-3.5 pr-8 py-2.5 border border-[#E5E7EB] rounded-xl text-xs font-semibold uppercase tracking-wider bg-white text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
                >
                  <option value="">All Types (Lost &amp; Found)</option>
                  <option value="lost">Lost Property</option>
                  <option value="found">Found Property</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={itemStatusFilter}
                  onChange={(e) => setItemStatusFilter(e.target.value)}
                  className="appearance-none w-full pl-3.5 pr-8 py-2.5 border border-[#E5E7EB] rounded-xl text-xs font-semibold uppercase tracking-wider bg-white text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="claimed">Claimed</option>
                  <option value="resolved">Resolved</option>
                  <option value="returned">Returned</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-[#E5E7EB] rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F7F5EF] border-b border-gray-200/60 text-[#8999AE] font-mono uppercase tracking-wider text-[11px]">
                    <th className="text-left px-5 py-3.5">Item Record</th>
                    <th className="text-left px-4 py-3.5">Type</th>
                    <th className="text-left px-4 py-3.5 hidden md:table-cell">Campus Location</th>
                    <th className="text-left px-4 py-3.5 hidden lg:table-cell">Reported</th>
                    <th className="text-left px-4 py-3.5">Status</th>
                    <th className="text-right px-5 py-3.5">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((itm) => {
                    const isReturned = itm.status === 'returned';
                    return (
                      <tr key={itm.id} className="hover:bg-white transition">
                        <td className="px-5 py-4">
                          <span className="font-mono text-[10px] text-[#8999AE]">#{itm.id}</span>
                          <p className="font-serif font-bold text-[#101D36] text-sm line-clamp-1">{itm.name}</p>
                          <span className="text-[11px] font-mono text-[#8999AE]">{itm.category}</span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={itm.type}>{itm.type}</Badge>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell text-[#8999AE] font-mono">
                          {itm.location}
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell text-[#8999AE] font-mono">
                          {formatDate(itm.date)}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={itm.status}>{itm.status}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              to={`/items/${itm.id}`}
                              className="p-2 rounded-lg border border-[#E5E7EB] text-[#8999AE] hover:text-[#101D36] hover:bg-gray-50 transition"
                              title="Inspect Public Listing"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>

                            {!isReturned && (
                              <button
                                onClick={() => handleChangeItemStatus(itm.id, itm.status === 'resolved' ? 'active' : 'resolved')}
                                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[11px] font-semibold text-[#101D36] hover:bg-gray-50 transition cursor-pointer"
                              >
                                {itm.status === 'resolved' ? 'Reopen' : 'Resolve'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: USER DIRECTORY (Section 5) */}
        {activeTab === 'users' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE]" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user name, email..."
                  className="w-full pl-9 pr-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
                />
              </div>

              <div className="relative">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="appearance-none w-full pl-3.5 pr-8 py-2.5 border border-[#E5E7EB] rounded-xl text-xs font-semibold uppercase tracking-wider bg-white text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Administrators</option>
                  <option value="user">Campus Members</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-[#E5E7EB] rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F7F5EF] border-b border-gray-200/60 text-[#8999AE] font-mono uppercase tracking-wider text-[11px]">
                    <th className="text-left px-5 py-3.5">Campus Member</th>
                    <th className="text-left px-4 py-3.5">Role</th>
                    <th className="text-left px-4 py-3.5">Member Since</th>
                    <th className="text-left px-4 py-3.5 hidden sm:table-cell">Listings</th>
                    <th className="text-left px-4 py-3.5 hidden sm:table-cell">Claims</th>
                    <th className="text-right px-5 py-3.5">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u) => {
                    const uItemsCount = items.filter((i) => i.reportedBy === u.id).length;
                    const uClaimsCount = claims.filter((c) => c.claimedBy === u.id).length;
                    return (
                      <tr key={u.id} className="hover:bg-white transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#101D36] text-[#F7F5EF] flex items-center justify-center font-bold text-xs">
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <p className="font-bold text-[#101D36]">{u.name}</p>
                              <p className="text-[11px] font-mono text-[#8999AE]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-[#8999AE]">
                          {formatDate(u.joinedDate)}
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell font-mono">
                          {uItemsCount}
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell font-mono">
                          {uClaimsCount}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setInspectingUser(u)}
                            className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#101D36] hover:bg-gray-50 transition cursor-pointer"
                          >
                            View Dossier
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Claim Detail Modal in Admin Mode */}
      {activeModalClaim && (
        <ClaimDetailModal
          claim={activeModalClaim}
          item={items.find((i) => i.id === activeModalClaim.itemId)}
          currentUser={currentUser}
          onClose={() => setActiveModalClaim(null)}
          onFinderApprove={finderApproveClaim}
          onFinderReject={finderRejectClaim}
          onRequestAdminReview={requestAdminReview}
          onAdminApprove={adminApproveClaim}
          onAdminReject={adminRejectClaim}
          onConfirmHandover={confirmHandover}
        />
      )}

      {/* Admin Decision Modal */}
      {activeDecision && (
        <AdminDecisionModal
          claim={activeDecision.claim}
          itemName={items.find((i) => i.id === activeDecision.claim.itemId)?.name || 'Property'}
          actionType={activeDecision.actionType}
          onClose={() => setActiveDecision(null)}
          onConfirm={activeDecision.actionType === 'approve' ? handleAdminApprove : handleAdminReject}
        />
      )}

      {/* User Dossier Modal */}
      {inspectingUser && (
        <UserDossierModal
          user={inspectingUser}
          items={items}
          claims={claims}
          onClose={() => setInspectingUser(null)}
        />
      )}
    </div>
  );
}
