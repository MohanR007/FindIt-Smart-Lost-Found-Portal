import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, CheckCircle, PlusCircle, ArrowRight,
  Clock, MapPin, Inbox, LogIn,
  Eye, Check, X, ShieldCheck, AlertTriangle,
  Calendar, Edit3, ExternalLink,
  UserCheck, Compass, Lock,
  CheckCircle2, Handshake, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import Badge from '../components/Badge';
import ClaimDetailModal from '../components/ClaimDetailModal';
import { formatDate, timeAgo, getInitials } from '../utils/helpers';
import { CLAIM_STATUSES, LOCATIONS, CATEGORIES } from '../data/mockData';

// Reusable Metric Stat Card
function StatCard({ icon: Icon, label, value, detail, badgeColor = 'bg-[#DCE5EF]/60 text-[#101D36]' }) {
  return (
    <div className="glass-card rounded-2xl border border-[#101D36]/10 p-5 shadow-xs transition hover:shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${badgeColor} flex items-center justify-center shadow-inner`}>
          <Icon className="w-5 h-5" />
        </div>
        {detail && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8999AE] bg-[#F7F5EF] px-2 py-0.5 rounded-md border border-[#E5E7EB]">
            {detail}
          </span>
        )}
      </div>
      <p className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36] tracking-tight">{value}</p>
      <p className="text-xs uppercase font-mono tracking-wider text-[#8999AE] mt-1.5">{label}</p>
    </div>
  );
}

// Reject Claim Modal (Enforces Mandatory Reason)
function RejectClaimModal({ claim, itemName, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('A substantive rejection reason is mandatory (at least 5 characters).');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onConfirm(claim.id, reason.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reject claim.');
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
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-serif text-lg font-bold text-[#101D36]">Reject Ownership Claim</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8999AE] hover:text-[#101D36] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#8999AE] leading-relaxed">
          You are evaluating claim <strong className="text-[#101D36]">#{claim.id}</strong> by{' '}
          <strong className="text-[#101D36]">{claim.claimerName}</strong> for <strong className="text-[#101D36]">{itemName}</strong>.
          You must provide a clear factual explanation (e.g. secret characteristics did not match, color mismatch, wrong lock code).
        </p>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
              Mandatory Rejection Grounds *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Explain why the claimant's answers do not corroborate ownership of the item you hold..."
              className="w-full px-3.5 py-2.5 text-xs border border-rose-200 rounded-xl bg-rose-50/20 text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-rose-400"
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
              className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold uppercase tracking-wider transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Recording Rejection...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Found Item Modal
function EditFoundItemModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    name: item.name || '',
    category: item.category || '',
    location: item.location || '',
    description: item.description || '',
    status: item.status || 'active',
  });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(item.id, form);
      onClose();
    } catch {
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
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
          <h3 className="font-serif text-lg font-bold text-[#101D36]">Edit Found Property #{item.id}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8999AE] hover:text-[#101D36] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Item Title</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Custody Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
              >
                <option value="active">Available (Open)</option>
                <option value="claimed">Claim Pending</option>
                <option value="returned">Returned to Owner</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Discovery Campus Location</label>
            <select
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Description &amp; Custody Details</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
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
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#101D36] text-[#F7F5EF] text-xs font-semibold uppercase tracking-wider hover:bg-[#172944] transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinderPage() {
  const { currentUser, loginAsDemoUser, isLoading } = useAuth();
  const {
    items,
    claims,
    getItemsByUser,
    getIncomingClaimsForFinder,
    updateItem,
    finderApproveClaim,
    finderRejectClaim,
    requestAdminReview,
    adminApproveClaim,
    adminRejectClaim,
    confirmHandover,
  } = useItems();
  const navigate = useNavigate();

  // Navigation & state
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'myFound'
  const [claimStatusFilter, setClaimStatusFilter] = useState('all'); // 'all' | 'pending' | 'adminReview' | 'disputed' | 'readyHandover' | 'completed'
  const [itemStatusFilter, setItemStatusFilter] = useState('all'); // 'all' | 'active' | 'claimed' | 'returned'
  const [selectedClaimForReject, setSelectedClaimForReject] = useState(null);
  const [activeModalClaim, setActiveModalClaim] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // 1. Data derived for the logged-in finder
  const myItems = currentUser ? getItemsByUser(currentUser.id) : [];
  const myFoundItems = myItems.filter((i) => i.type === 'found');
  const incomingClaims = currentUser ? getIncomingClaimsForFinder(currentUser.id) : [];

  // Overview statistics calculations (100% from mock data)
  const totalFoundItems = myFoundItems.length;
  const availableItemsCount = myFoundItems.filter((i) => i.status === 'active').length;
  const pendingClaimItemsCount = myFoundItems.filter((i) => i.status === 'claimed').length;
  const returnedItemsCount = myFoundItems.filter((i) => i.status === 'returned').length;
  const incomingClaimsCount = incomingClaims.length;
  const pendingFinderReviewCount = incomingClaims.filter(
    (c) => c.status === CLAIM_STATUSES.PENDING_FINDER_REVIEW
  ).length;

  // Filtered Found Items (computed directly during render)
  const displayedFoundItems =
    itemStatusFilter === 'all'
      ? myFoundItems
      : myFoundItems.filter((i) => i.status === itemStatusFilter);

  // Filtered Incoming Claims (computed directly during render)
  const displayedClaims = (() => {
    if (claimStatusFilter === 'pending') {
      return incomingClaims.filter((c) => c.status === CLAIM_STATUSES.PENDING_FINDER_REVIEW);
    }
    if (claimStatusFilter === 'adminReview') {
      return incomingClaims.filter((c) => c.status === CLAIM_STATUSES.PENDING_ADMIN_REVIEW);
    }
    if (claimStatusFilter === 'disputed') {
      return incomingClaims.filter((c) => c.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED);
    }
    if (claimStatusFilter === 'readyHandover') {
      return incomingClaims.filter(
        (c) => c.status === CLAIM_STATUSES.ADMIN_APPROVED || c.status === CLAIM_STATUSES.HANDOVER_IN_PROGRESS
      );
    }
    if (claimStatusFilter === 'completed') {
      return incomingClaims.filter((c) => c.status === CLAIM_STATUSES.COMPLETED);
    }
    return incomingClaims;
  })();

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // Handle Approve Claim -> PENDING_ADMIN_REVIEW
  async function handleApprove(claimId) {
    try {
      await finderApproveClaim(claimId, 'Finder verified claimant verification details and approved claim.', currentUser);
      showToast('Claim approved. Forwarded to Campus Administrator for final sign-off.');
    } catch (err) {
      alert(err.message);
    }
  }

  // Handle Reject Claim -> FINDER_REJECTED (with mandatory reason)
  async function handleReject(claimId, reason) {
    try {
      await finderRejectClaim(claimId, reason, currentUser);
      showToast('Claim rejected. Notification sent to claimant.');
    } catch (err) {
      alert(err.message);
    }
  }

  // Handle Handover Confirmation -> Updates to HANDOVER_IN_PROGRESS or COMPLETED
  async function handleConfirmHandover(claimId) {
    try {
      await confirmHandover(claimId, 'finder', currentUser);
      showToast('Handover confirmed by Finder. Status updated.');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSaveEditedItem(itemId, updatedFields) {
    if (updateItem) {
      await updateItem(itemId, updatedFields);
      showToast('Found property record updated successfully.');
    }
  }

  // Loading State Guard - Prevents displaying "Authentication Required" while restoring Cognito session
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mb-4 border border-[#101D36]/10 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#101D36]" />
        </div>
        <span className="text-xs uppercase font-mono tracking-widest text-[#8999AE]">Authentication in Progress</span>
        <h2 className="font-serif text-xl font-bold text-[#101D36] mt-1">Loading Finder Dashboard</h2>
        <p className="text-xs text-[#8999AE] mt-1">Restoring verified session and retrieving found property reports...</p>
      </div>
    );
  }

  // Authentication guard
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto mb-4 border border-[#101D36]/10 shadow-sm">
          <LogIn className="w-8 h-8" />
        </div>
        <span className="text-xs uppercase font-mono tracking-widest text-[#8999AE]">Authentication Required</span>
        <h2 className="font-serif text-3xl font-bold text-[#101D36] mt-2 mb-2">Finder Dashboard</h2>
        <p className="text-sm text-[#8999AE] mb-8 leading-relaxed">
          Sign in to manage your found items and verify ownership claims across campus.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-[#101D36] hover:bg-[#172944] transition cursor-pointer shadow-xs"
          >
            Go to Sign In
          </button>
          <button
            onClick={() => {
              loginAsDemoUser('finder');
            }}
            className="px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#101D36]/20 text-[#101D36] bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            Sign in as Demo Finder (Michael)
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

      {/* 1. Finder Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#101D36]/10">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#101D36] text-[#F7F5EF] flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            {getInitials(currentUser.name) || 'F'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-[#8999AE]">Physical Custody Console</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <UserCheck className="w-3 h-3 text-emerald-600" /> Authorized Campus Finder
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36] mt-1 tracking-tight">
              Finder Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#8999AE] mt-1">
              Manage your found items and verify ownership claims. Corroborate private descriptors before administrative sign-off.
            </p>
          </div>
        </div>

        {/* Primary Action & Shortcuts */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/report?type=found"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Found Item</span>
          </Link>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#101D36] text-xs font-semibold hover:bg-[#F7F5EF] transition shadow-2xs cursor-pointer"
          >
            <span>User Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Overview Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={Package}
          label="Total Found Items"
          value={totalFoundItems}
          detail="Physical Custody"
          badgeColor="bg-[#DCE5EF]/60 text-[#101D36]"
        />
        <StatCard
          icon={Compass}
          label="Available Items"
          value={availableItemsCount}
          detail={`${pendingClaimItemsCount} Pending / ${returnedItemsCount} Returned`}
          badgeColor="bg-sky-50 text-sky-800"
        />
        <StatCard
          icon={Inbox}
          label="Incoming Claims"
          value={incomingClaimsCount}
          detail="Filed by Claimants"
          badgeColor="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={AlertTriangle}
          label="Pending Finder Reviews"
          value={pendingFinderReviewCount}
          detail={pendingFinderReviewCount > 0 ? 'Action Required' : 'All Clear'}
          badgeColor={pendingFinderReviewCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'}
        />
      </div>

      {/* 3. Main Workspace Navigation Tabs */}
      <div className="glass-card rounded-3xl border border-[#101D36]/10 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 p-2 border-b border-gray-100 bg-[#F7F5EF]/80 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
              activeTab === 'incoming'
                ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                : 'text-[#8999AE] hover:text-[#101D36]'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Incoming Claims to Review</span>
            {pendingFinderReviewCount > 0 ? (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold font-mono">
                {pendingFinderReviewCount} Action Needed
              </span>
            ) : (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'incoming' ? 'bg-white/20 text-white' : 'bg-[#E5E7EB] text-[#101D36]'
              }`}>
                {incomingClaims.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('myFound')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
              activeTab === 'myFound'
                ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                : 'text-[#8999AE] hover:text-[#101D36]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>My Found Items Registry</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'myFound' ? 'bg-white/20 text-white' : 'bg-[#E5E7EB] text-[#101D36]'
            }`}>
              {myFoundItems.length}
            </span>
          </button>
        </div>

        {/* TAB 1: INCOMING CLAIMS */}
        {activeTab === 'incoming' && (
          <div className="p-5 sm:p-7 space-y-6">
            {/* Filter Pills for Claims */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Incoming', count: incomingClaims.length },
                  { id: 'pending', label: 'Pending Review', count: pendingFinderReviewCount },
                  { id: 'adminReview', label: 'In Admin Review', count: incomingClaims.filter(c => c.status === CLAIM_STATUSES.PENDING_ADMIN_REVIEW).length },
                  { id: 'disputed', label: 'Disputes', count: incomingClaims.filter(c => c.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED).length },
                  { id: 'readyHandover', label: 'Ready for Handover', count: incomingClaims.filter(c => c.status === CLAIM_STATUSES.ADMIN_APPROVED || c.status === CLAIM_STATUSES.HANDOVER_IN_PROGRESS).length },
                  { id: 'completed', label: 'Completed', count: incomingClaims.filter(c => c.status === CLAIM_STATUSES.COMPLETED).length },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setClaimStatusFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      claimStatusFilter === filter.id
                        ? 'bg-[#101D36] text-white shadow-2xs'
                        : 'bg-[#F7F5EF] text-[#8999AE] hover:text-[#101D36] border border-[#E5E7EB]'
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span className="font-mono text-[10px] opacity-80">({filter.count})</span>
                  </button>
                ))}
              </div>

              <span className="text-xs font-mono text-[#8999AE]">
                Showing {displayedClaims.length} of {incomingClaims.length} claims
              </span>
            </div>

            {/* Empty State */}
            {displayedClaims.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto">
                  <Inbox className="w-7 h-7 opacity-70" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-[#101D36]">No Claims in this Category</h3>
                  <p className="text-xs text-[#8999AE] max-w-sm mx-auto leading-relaxed">
                    {claimStatusFilter === 'all'
                      ? 'You currently have no incoming claims on any of your found item reports.'
                      : `No claims match the "${claimStatusFilter}" filter.`}
                  </p>
                </div>
                {claimStatusFilter !== 'all' && (
                  <button
                    onClick={() => setClaimStatusFilter('all')}
                    className="px-4 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-semibold text-[#101D36] hover:bg-gray-50 transition cursor-pointer"
                  >
                    Reset Filter to All
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {displayedClaims.map((claim) => {
                  const claimedItem = items.find((i) => i.id === claim.itemId);
                  const isPendingFinder = claim.status === CLAIM_STATUSES.PENDING_FINDER_REVIEW;
                  const isPendingAdmin = claim.status === CLAIM_STATUSES.PENDING_ADMIN_REVIEW;
                  const isDisputed = claim.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED;
                  const isAdminApproved = claim.status === CLAIM_STATUSES.ADMIN_APPROVED || claim.status === CLAIM_STATUSES.HANDOVER_IN_PROGRESS;
                  const isCompleted = claim.status === CLAIM_STATUSES.COMPLETED;
                  const canConfirmHandover = isAdminApproved && !claim.finderHandoverConfirmed;

                  return (
                    <div
                      key={claim.id}
                      className="p-6 rounded-3xl border border-[#E5E7EB] bg-white shadow-2xs space-y-5 hover:border-[#101D36]/30 transition"
                    >
                      {/* Claim Header & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          {/* Claimant Avatar & Name */}
                          <div className="w-10 h-10 rounded-xl bg-[#101D36] text-[#F7F5EF] flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
                            {getInitials(claim.claimerName) || 'C'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#101D36] text-sm">{claim.claimerName}</span>
                              <span className="text-[11px] font-mono text-[#8999AE]">#{claim.id}</span>
                            </div>
                            <p className="text-xs text-[#8999AE]">{claim.claimerEmail} &bull; Submitted {timeAgo(claim.createdAt)} ({formatDate(claim.createdAt)})</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <Badge variant={claim.status}>{claim.status}</Badge>
                          <button
                            onClick={() => setActiveModalClaim(claim)}
                            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#8999AE] hover:text-[#101D36] hover:bg-gray-50 transition cursor-pointer"
                            title="Open full claim modal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Claimed Item Summary Strip */}
                      <div className="p-3.5 bg-[#F7F5EF] rounded-2xl border border-[#E5E7EB] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {claimedItem?.image ? (
                            <img src={claimedItem.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#E5E7EB]" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#8999AE] shrink-0">
                              <Package className="w-5 h-5 opacity-40" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono uppercase text-[#8999AE] block">Target Found Item</span>
                            <Link to={`/items/${claimedItem?.id}`} className="font-serif font-bold text-sm text-[#101D36] hover:underline truncate block">
                              {claimedItem?.name || 'Found Item'}
                            </Link>
                            <span className="text-[11px] text-[#8999AE] flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {claimedItem?.location}
                            </span>
                          </div>
                        </div>

                        <Link
                          to={`/items/${claimedItem?.id}`}
                          className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] text-xs font-semibold text-[#101D36] hover:bg-gray-50 transition shrink-0 flex items-center gap-1 shadow-2xs"
                        >
                          <span>Listing</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* Claim Grounds & Private Verification Proof */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Public Claim Grounds */}
                        <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] space-y-1.5 shadow-2xs">
                          <span className="text-[10px] font-mono uppercase font-bold text-[#8999AE] block">
                            Claim Grounds (Public Stated Reason)
                          </span>
                          <p className="text-xs text-[#101D36] leading-relaxed italic">
                            &ldquo;{claim.reason}&rdquo;
                          </p>
                          {claim.additionalInfo && (
                            <p className="text-[11px] text-[#8999AE] pt-1 border-t border-gray-100">
                              <strong>Availability:</strong> {claim.additionalInfo}
                            </p>
                          )}
                        </div>

                        {/* Private Verification Details (Authorised for Finder) */}
                        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-300 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase font-bold text-amber-900 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-700" />
                              Private Verification Details
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">
                              CONFIDENTIAL
                            </span>
                          </div>
                          <p className="text-xs text-[#101D36] font-mono leading-relaxed bg-white/70 p-2.5 rounded-xl border border-amber-200">
                            {claim.verificationDetails || 'No private verification details provided.'}
                          </p>
                          <p className="text-[10px] text-amber-800/80 leading-tight">
                            🔒 Disclosed to you as physical holder to cross-check secret markings, lock screens, serials, or contents before releasing item.
                          </p>
                        </div>
                      </div>

                      {/* 5. FINDER REVIEW ACTIONS (For PENDING_FINDER_REVIEW) */}
                      {isPendingFinder && (
                        <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs text-blue-950 space-y-0.5">
                            <strong className="block font-bold">Action Required: Corroborate Ownership</strong>
                            <p className="text-blue-900">
                              Confirm whether the claimant&apos;s private proof matches the item you possess.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleApprove(claim.id)}
                              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Claim</span>
                            </button>

                            <button
                              onClick={() => setSelectedClaimForReject(claim)}
                              className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject Claim</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 6. ADMIN REVIEW STATUS & DISPUTES */}
                      {isPendingAdmin && (
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
                          <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                          <div className="text-xs text-indigo-950 space-y-1">
                            <strong className="block font-bold">Awaiting Administrative Authorization (Read-Only)</strong>
                            <p className="text-indigo-900 leading-relaxed">
                              You have verified and approved this claim. A DSCE campus administrator must now perform final oversight and issue the custody release seal before handover can proceed.
                            </p>
                          </div>
                        </div>
                      )}

                      {isDisputed && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-orange-950">
                            <AlertTriangle className="w-4 h-4 text-orange-700 shrink-0" />
                            <span>Dispute in Progress: Claimant Contested Your Rejection</span>
                          </div>
                          <p className="text-xs text-orange-900 leading-relaxed">
                            The claimant requested administrator review. An administrator is evaluating the case and will issue a final decision. As finder, you cannot override the administrator.
                          </p>
                          {claim.disputeReason && (
                            <div className="p-2.5 rounded-xl bg-white border border-orange-200 text-xs text-[#101D36]">
                              <strong className="block text-[10px] font-mono uppercase text-orange-900">Claimant&apos;s Dispute Argument:</strong>
                              <p className="italic mt-0.5">&ldquo;{claim.disputeReason}&rdquo;</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 7. HANDOVER MANAGEMENT (For ADMIN_APPROVED) */}
                      {isAdminApproved && (
                        <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-emerald-950">
                              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                              <h4 className="font-serif text-base font-bold">Campus Custody Handover Ready</h4>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold uppercase">
                              Admin Authorized
                            </span>
                          </div>

                          <p className="text-xs text-emerald-900 leading-relaxed">
                            Campus administration has authorized this item for physical return. Please coordinate in-person transfer with {claim.claimerName} on campus. Both parties must confirm handover.
                          </p>

                          {/* Dual Confirmation Status Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                              claim.finderHandoverConfirmed ? 'bg-white border-emerald-300 text-emerald-900' : 'bg-white/70 border-emerald-200 text-[#101D36]'
                            }`}>
                              {claim.finderHandoverConfirmed ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              )}
                              <div>
                                <span className="font-bold block">Finder Confirmation (You)</span>
                                <span className="text-[11px] text-[#8999AE]">
                                  {claim.finderHandoverConfirmed ? 'Item physically handed over' : 'Awaiting your confirmation'}
                                </span>
                              </div>
                            </div>

                            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                              claim.claimantHandoverConfirmed ? 'bg-white border-emerald-300 text-emerald-900' : 'bg-white/70 border-emerald-200 text-[#101D36]'
                            }`}>
                              {claim.claimantHandoverConfirmed ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              )}
                              <div>
                                <span className="font-bold block">Claimant Confirmation ({claim.claimerName})</span>
                                <span className="text-[11px] text-[#8999AE]">
                                  {claim.claimantHandoverConfirmed ? 'Confirmed item received' : 'Awaiting claimant receipt'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Finder Action Button */}
                          {canConfirmHandover && (
                            <div className="pt-2 flex justify-end">
                              <button
                                onClick={() => handleConfirmHandover(claim.id)}
                                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Handshake className="w-4 h-4" />
                                <span>Confirm Physical Item Handed Over</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Completed State */}
                      {isCompleted && (
                        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-xs text-teal-950">
                          <div className="flex items-center gap-2 font-bold">
                            <CheckCircle className="w-4 h-4 text-teal-600" />
                            <span>Custody Finalized: Both Parties Confirmed Handover</span>
                          </div>
                          <span className="font-mono text-[11px] text-teal-800">Item Status: Returned</span>
                        </div>
                      )}

                      {/* 8. CLAIM ACTIVITY TIMELINE */}
                      {claim.history && claim.history.length > 0 && (
                        <div className="pt-3 border-t border-gray-100 space-y-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8999AE] block">
                            Audit Trail &amp; Decision Timeline ({claim.history.length} Events)
                          </span>
                          <div className="space-y-1.5 text-xs">
                            {claim.history.map((hist, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-[#F7F5EF]/60">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="text-[#101D36]">{hist.action}</strong>
                                    <span className="text-[#8999AE]">&bull; {hist.performedBy} ({hist.role})</span>
                                  </div>
                                  {hist.comment && (
                                    <p className="text-[11px] text-[#101D36]/80 italic">&ldquo;{hist.comment}&rdquo;</p>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-[#8999AE] shrink-0">{timeAgo(hist.timestamp)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY FOUND ITEMS */}
        {activeTab === 'myFound' && (
          <div className="p-5 sm:p-7 space-y-6">
            {/* Filter pills for found items */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Found Items', count: myFoundItems.length },
                  { id: 'active', label: 'Available (Open)', count: availableItemsCount },
                  { id: 'claimed', label: 'Pending Claim', count: pendingClaimItemsCount },
                  { id: 'returned', label: 'Returned to Owner', count: returnedItemsCount },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setItemStatusFilter(st.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      itemStatusFilter === st.id
                        ? 'bg-[#101D36] text-white shadow-2xs'
                        : 'bg-[#F7F5EF] text-[#8999AE] hover:text-[#101D36] border border-[#E5E7EB]'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className="font-mono text-[10px] opacity-80">({st.count})</span>
                  </button>
                ))}
              </div>

              <span className="text-xs font-mono text-[#8999AE]">
                Showing {displayedFoundItems.length} of {myFoundItems.length} items
              </span>
            </div>

            {/* Empty State */}
            {displayedFoundItems.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7 opacity-70" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-[#101D36]">No Found Items Registered</h3>
                  <p className="text-xs text-[#8999AE] max-w-sm mx-auto leading-relaxed">
                    You have not registered any found property listings yet. When you discover lost items on campus, catalog them here.
                  </p>
                </div>
                <Link
                  to="/report?type=found"
                  className="inline-flex px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition shadow-xs"
                >
                  Report Found Item Now
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {displayedFoundItems.map((item) => {
                  const itemClaims = claims.filter((c) => c.itemId === item.id);
                  const activeItemClaims = itemClaims.filter((c) => c.status !== CLAIM_STATUSES.COMPLETED && c.status !== CLAIM_STATUSES.ADMIN_REJECTED);

                  return (
                    <div
                      key={item.id}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Photograph with fallback */}
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 border border-[#E5E7EB] shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8999AE] bg-[#F7F5EF]">
                              <Compass className="w-6 h-6 opacity-40" />
                            </div>
                          )}
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-emerald-700/90 text-white">
                            Found
                          </span>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-mono text-[#8999AE]">#{item.id}</span>
                            <Badge variant={item.status}>{item.status}</Badge>
                            <span className="text-[10px] font-medium bg-[#DCE5EF]/60 text-[#101D36] px-2 py-0.5 rounded">
                              {item.category}
                            </span>
                            {/* Associated claims counter */}
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              activeItemClaims.length > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-gray-100 text-[#8999AE]'
                            }`}>
                              {itemClaims.length} {itemClaims.length === 1 ? 'Claim' : 'Claims'} Filed
                            </span>
                          </div>

                          <Link
                            to={`/items/${item.id}`}
                            className="font-serif text-base font-bold text-[#101D36] hover:text-emerald-800 transition line-clamp-1 block"
                          >
                            {item.name}
                          </Link>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8999AE]">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[200px]">{item.location}</span>
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(item.date)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-2 rounded-xl border border-[#E5E7EB] bg-white text-[#8999AE] hover:text-[#101D36] hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                          title="Edit Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          to={`/items/${item.id}`}
                          className="px-3.5 py-2 rounded-xl bg-[#101D36] hover:bg-[#172944] text-[#F7F5EF] text-xs font-semibold transition flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claim Detail Modal */}
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

      {/* Reject Reason Modal (Mandatory validation) */}
      {selectedClaimForReject && (
        <RejectClaimModal
          claim={selectedClaimForReject}
          itemName={items.find((i) => i.id === selectedClaimForReject.itemId)?.name || 'Found Property'}
          onClose={() => setSelectedClaimForReject(null)}
          onConfirm={handleReject}
        />
      )}

      {/* Edit Found Item Modal */}
      {editingItem && (
        <EditFoundItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEditedItem}
        />
      )}
    </div>
  );
}
