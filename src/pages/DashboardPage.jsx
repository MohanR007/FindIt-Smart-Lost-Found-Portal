import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, CheckCircle, Zap, PlusCircle, ArrowRight,
  Clock, MapPin, FileText, Inbox, LogIn,
  Eye, Check, X, ShieldCheck,
  Calendar, Edit3, ExternalLink,
  UserCheck, RotateCcw, Compass, Loader2
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

// Edit Report Modal
function EditReportModal({ item, onClose, onSave }) {
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
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#101D36]/10 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8999AE]">Listing Modification</span>
            <h3 className="font-serif text-xl font-bold text-[#101D36]">Edit Report #{item.id}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8999AE] hover:text-[#101D36] hover:bg-gray-100 transition cursor-pointer"
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
              <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Listing Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
              >
                <option value="active">Active (Open)</option>
                <option value="claimed">Claim Pending</option>
                <option value="returned">Returned / Resolved</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Campus Location</label>
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
            <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Full Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
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

export default function DashboardPage() {
  const { currentUser, loginAsDemoUser, isLoading } = useAuth();
  const {
    getItemsByUser,
    getClaimsByUser,
    getIncomingClaimsForFinder,
    getMatchesForUser,
    items,
    updateItem,
    updateItemStatus,
    finderApproveClaim,
    finderRejectClaim,
    requestAdminReview,
    adminApproveClaim,
    adminRejectClaim,
    confirmHandover,
  } = useItems();
  const navigate = useNavigate();

  // Navigation state
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'myClaims' | 'incoming' | 'matches'
  const [reportSubFilter, setReportSubFilter] = useState('all'); // 'all' | 'lost' | 'found'
  const [activeModalClaim, setActiveModalClaim] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // 1. Data derived for the logged in user (unconditional)
  const myItems = currentUser ? getItemsByUser(currentUser.id) : [];
  const mySubmittedClaims = currentUser ? getClaimsByUser(currentUser.id) : [];
  const incomingClaims = currentUser ? getIncomingClaimsForFinder(currentUser.id) : [];
  const myMatches = currentUser ? getMatchesForUser(currentUser.id) : [];

  // Filtered reports (computed directly, no conditional hooks)
  const myLostItems = myItems.filter((i) => i.type === 'lost');
  const myFoundItems = myItems.filter((i) => i.type === 'found');
  const displayedReports =
    reportSubFilter === 'lost'
      ? myLostItems
      : reportSubFilter === 'found'
      ? myFoundItems
      : myItems;

  // Statistics calculations (100% calculated from existing data)
  const totalItemsReported = myItems.length;
  const activeLostReports = myItems.filter((i) => i.type === 'lost' && i.status !== 'returned').length;
  const activeClaimsCount = mySubmittedClaims.filter(
    (c) => c.status !== CLAIM_STATUSES.COMPLETED && c.status !== CLAIM_STATUSES.ADMIN_REJECTED
  ).length;
  const potentialMatchesCount = myMatches.length;

  // Pending reviews count for Finder tab
  const pendingFinderReviewCount = incomingClaims.filter(
    (c) => c.status === CLAIM_STATUSES.PENDING_FINDER_REVIEW
  ).length;

  // 6. Chronological Activity Timeline (computed directly during render)
  const activityTimeline = (() => {
    if (!currentUser) return [];
    const events = [];

    // User reports
    myItems.forEach((item) => {
      events.push({
        id: `act-item-${item.id}`,
        type: 'report',
        title: `Reported ${item.type === 'lost' ? 'Lost' : 'Found'} Item`,
        itemName: item.name,
        timestamp: item.createdAt || item.date,
        status: item.status,
        link: `/items/${item.id}`,
        badge: item.type === 'lost' ? 'Lost Property' : 'Found Property',
        badgeColor: item.type === 'lost' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      });
    });

    // Submitted claims
    mySubmittedClaims.forEach((claim) => {
      const itm = items.find((i) => i.id === claim.itemId);
      events.push({
        id: `act-claim-${claim.id}`,
        type: 'claim_filed',
        title: 'Ownership Claim Filed',
        itemName: itm?.name || 'Item',
        timestamp: claim.createdAt,
        status: claim.status,
        claim,
        badge: 'Claimant Petition',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      });

      // Claim history events
      if (claim.history && claim.history.length > 0) {
        claim.history.forEach((h, idx) => {
          if (h.action !== 'Claim Submitted') {
            events.push({
              id: `act-claim-hist-${claim.id}-${idx}`,
              type: 'claim_progress',
              title: h.action,
              itemName: itm?.name || 'Item',
              timestamp: h.timestamp,
              comment: h.comment,
              claim,
              badge: h.role === 'admin' ? 'Admin Action' : 'Finder Action',
              badgeColor: h.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            });
          }
        });
      }
    });

    // Incoming claims
    incomingClaims.forEach((claim) => {
      const itm = items.find((i) => i.id === claim.itemId);
      events.push({
        id: `act-incoming-${claim.id}`,
        type: 'incoming_claim',
        title: `Incoming Claim from ${claim.claimerName}`,
        itemName: itm?.name || 'Found Property',
        timestamp: claim.createdAt,
        status: claim.status,
        claim,
        badge: 'Finder Review',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      });
    });

    return events
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8);
  })();

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function handleSaveEditedItem(itemId, updatedFields) {
    if (updateItem) {
      await updateItem(itemId, updatedFields);
      showToast('Listing updated successfully.');
    }
  }

  async function handleToggleStatus(item) {
    const nextStatus = item.status === 'returned' ? 'active' : 'returned';
    await updateItemStatus(item.id, nextStatus);
    showToast(`Listing status updated to ${nextStatus.toUpperCase()}.`);
  }

  async function handleQuickFinderApprove(claimId) {
    try {
      await finderApproveClaim(claimId, 'Finder approved claim from dashboard quick action.', currentUser);
      showToast('Claim approved and forwarded to Administrator for final review.');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleQuickHandoverConfirm(claimId, role) {
    try {
      await confirmHandover(claimId, role, currentUser);
      showToast('Physical handover recorded successfully.');
    } catch (err) {
      alert(err.message);
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
        <h2 className="font-serif text-xl font-bold text-[#101D36] mt-1">Loading Member Dashboard</h2>
        <p className="text-xs text-[#8999AE] mt-1">Restoring verified session and retrieving member records...</p>
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
        <h2 className="font-serif text-3xl font-bold text-[#101D36] mt-2 mb-2">Member Dashboard</h2>
        <p className="text-sm text-[#8999AE] mb-8 leading-relaxed">
          Sign in to access your registered reports, monitor ownership claims, and execute verified custody handovers.
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
              loginAsDemoUser('user');
            }}
            className="px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#101D36]/20 text-[#101D36] bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            Quick Demo Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#101D36] text-[#F7F5EF] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#2A3E5C] text-xs font-mono animate-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#8999AE] hover:text-white p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#101D36]/10">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#101D36] text-[#F7F5EF] flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            {getInitials(currentUser.name) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-[#8999AE]">Campus Console</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <UserCheck className="w-3 h-3 text-emerald-600" /> DSCE Verified Member
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36] mt-1 tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#8999AE] mt-1">
              Manage your registered reports, monitor ownership claims, and execute verified custody handovers.
            </p>
          </div>
        </div>

        {/* Dual Actions: Report Lost, Report Found, and Finder Console */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/finder"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-[#101D36] bg-white border border-[#E5E7EB] hover:bg-[#F7F5EF] transition shadow-2xs cursor-pointer"
          >
            <Inbox className="w-4 h-4 text-[#8999AE]" />
            <span>Finder Console</span>
          </Link>

          <Link
            to="/report?type=lost"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-rose-700 hover:bg-rose-800 transition shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Lost Item</span>
          </Link>

          <Link
            to="/report?type=found"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Found Item</span>
          </Link>
        </div>
      </div>

      {/* 2. Overview Statistics Grid (Calculated from mock data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={Package}
          label="Total Items Reported"
          value={totalItemsReported}
          detail={`${myLostItems.length} Lost / ${myFoundItems.length} Found`}
          badgeColor="bg-[#DCE5EF]/60 text-[#101D36]"
        />
        <StatCard
          icon={Clock}
          label="Active Lost Reports"
          value={activeLostReports}
          detail="Pending Recovery"
          badgeColor="bg-rose-50 text-rose-700"
        />
        <StatCard
          icon={FileText}
          label="Active Claims"
          value={activeClaimsCount}
          detail="Claimant Role"
          badgeColor="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={Zap}
          label="Potential Matches"
          value={potentialMatchesCount}
          detail="Heuristic Correlations"
          badgeColor="bg-emerald-50 text-emerald-800"
        />
      </div>

      {/* 3. Main Dashboard Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols wide): Tabs & Core Workflows */}
        <div className="lg:col-span-8 space-y-6">
          {/* Glass Tabs Container */}
          <div className="glass-card rounded-3xl border border-[#101D36]/10 shadow-xs overflow-hidden">
            {/* Primary Tab Navigation */}
            <div className="flex items-center gap-2 p-2 border-b border-gray-100 bg-[#F7F5EF]/80 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                    : 'text-[#8999AE] hover:text-[#101D36]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>My Reports</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'reports' ? 'bg-white/20 text-white' : 'bg-[#E5E7EB] text-[#101D36]'
                }`}>
                  {myItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('myClaims')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'myClaims'
                    ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                    : 'text-[#8999AE] hover:text-[#101D36]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>My Claims (Claimant)</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'myClaims' ? 'bg-white/20 text-white' : 'bg-[#E5E7EB] text-[#101D36]'
                }`}>
                  {mySubmittedClaims.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('incoming')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'incoming'
                    ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                    : 'text-[#8999AE] hover:text-[#101D36]'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Incoming Claims (Finder)</span>
                {pendingFinderReviewCount > 0 ? (
                  <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold font-mono">
                    {pendingFinderReviewCount}
                  </span>
                ) : (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === 'incoming' ? 'bg-white/20 text-white' : 'bg-[#E5E7EB] text-[#101D36]'
                  }`}>
                    {incomingClaims.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('matches')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'matches'
                    ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                    : 'text-[#8999AE] hover:text-[#101D36]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Smart Matches</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'matches' ? 'bg-white/20 text-white' : 'bg-[#E5E7EB] text-[#101D36]'
                }`}>
                  {myMatches.length}
                </span>
              </button>
            </div>

            {/* TAB 1: MY REPORTS */}
            {activeTab === 'reports' && (
              <div className="space-y-4 p-5 sm:p-6">
                {/* Sub-filter segmented control */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="inline-flex p-1 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] text-xs">
                    {[
                      { id: 'all', label: 'All Reports', count: myItems.length },
                      { id: 'lost', label: 'Lost Reports', count: myLostItems.length },
                      { id: 'found', label: 'Found Reports', count: myFoundItems.length },
                    ].map((sf) => (
                      <button
                        key={sf.id}
                        onClick={() => setReportSubFilter(sf.id)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                          reportSubFilter === sf.id
                            ? 'bg-[#101D36] text-white shadow-2xs'
                            : 'text-[#8999AE] hover:text-[#101D36]'
                        }`}
                      >
                        {sf.label} ({sf.count})
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-[#8999AE] font-mono">
                    Showing {displayedReports.length} {reportSubFilter === 'all' ? 'total' : reportSubFilter} items
                  </span>
                </div>

                {/* Empty State */}
                {displayedReports.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto">
                      <Package className="w-7 h-7 opacity-70" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-serif text-lg font-bold text-[#101D36]">No Reports Registered</h3>
                      <p className="text-xs text-[#8999AE] max-w-sm mx-auto leading-relaxed">
                        You have not registered any {reportSubFilter === 'all' ? '' : reportSubFilter} property reports yet.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <Link
                        to="/report?type=lost"
                        className="px-4 py-2 rounded-xl bg-[#101D36] text-[#F7F5EF] text-xs font-semibold hover:bg-[#172944] transition shadow-xs"
                      >
                        Report Lost Item
                      </Link>
                      <Link
                        to="/report?type=found"
                        className="px-4 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#101D36] text-xs font-semibold hover:bg-gray-50 transition shadow-2xs"
                      >
                        Report Found Item
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {displayedReports.map((item) => (
                      <div
                        key={item.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Item Photograph Thumbnail with fallback */}
                          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-stone-100 border border-[#E5E7EB] shrink-0">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#8999AE] bg-[#F7F5EF]">
                                <Compass className="w-6 h-6 opacity-40" />
                              </div>
                            )}
                            <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider text-white ${
                              item.type === 'lost' ? 'bg-rose-600/90' : 'bg-emerald-600/90'
                            }`}>
                              {item.type}
                            </span>
                          </div>

                          {/* Item Info */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-[#8999AE]">#{item.id}</span>
                              <Badge variant={item.status}>{item.status}</Badge>
                              <span className="text-[10px] font-medium bg-[#DCE5EF]/60 text-[#101D36] px-2 py-0.5 rounded">
                                {item.category}
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
                                <MapPin className="w-3 h-3 text-[#8999AE]" />
                                <span className="truncate max-w-[200px]">{item.location}</span>
                              </span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#8999AE]" />
                                <span>{formatDate(item.date)}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => setEditingItem(item)}
                            title="Edit Listing Details"
                            className="p-2 rounded-xl border border-[#E5E7EB] bg-white text-[#8999AE] hover:text-[#101D36] hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(item)}
                            title={item.status === 'returned' ? 'Mark as Active' : 'Mark as Returned / Resolved'}
                            className="p-2 rounded-xl border border-[#E5E7EB] bg-white text-[#8999AE] hover:text-[#101D36] hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MY CLAIMS (Claimant View) */}
            {activeTab === 'myClaims' && (
              <div className="divide-y divide-gray-100">
                <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs">
                  <div className="text-blue-900">
                    <span className="font-bold">Claimant Role:</span> Track the status of ownership claims you filed for found items.
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-800">{mySubmittedClaims.length} Claims Total</span>
                </div>

                {mySubmittedClaims.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto">
                      <FileText className="w-7 h-7 opacity-70" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-serif text-lg font-bold text-[#101D36]">No Claims Submitted</h3>
                      <p className="text-xs text-[#8999AE] max-w-sm mx-auto leading-relaxed">
                        When you spot a found item matching your lost property, submit a verified ownership claim.
                      </p>
                    </div>
                    <Link
                      to="/browse?type=found"
                      className="inline-flex px-5 py-2.5 bg-[#101D36] text-[#F7F5EF] rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#172944] transition shadow-xs"
                    >
                      Browse Found Items
                    </Link>
                  </div>
                ) : (
                  mySubmittedClaims.map((claim) => {
                    const claimedItem = items.find((i) => i.id === claim.itemId);
                    const canConfirmReceived =
                      (claim.status === CLAIM_STATUSES.ADMIN_APPROVED || claim.status === CLAIM_STATUSES.HANDOVER_IN_PROGRESS) &&
                      !claim.claimantHandoverConfirmed;

                    return (
                      <div key={claim.id} className="p-5 sm:p-6 space-y-4 hover:bg-[#F7F5EF]/30 transition">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5">
                            {claimedItem?.image ? (
                              <img src={claimedItem.image} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#E5E7EB] shrink-0" />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center text-[#8999AE] shrink-0">
                                <Package className="w-6 h-6 opacity-40" />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-[#101D36]">#{claim.id}</span>
                                <Badge variant={claim.status}>{claim.status}</Badge>
                              </div>
                              <h3 className="font-serif text-lg font-bold text-[#101D36] mt-0.5">
                                {claimedItem?.name || 'Claimed Item'}
                              </h3>
                              <p className="text-xs text-[#8999AE]">
                                Finder: <strong className="text-[#101D36]">{claimedItem?.reporterName || 'Campus Finder'}</strong> &bull; Filed {timeAgo(claim.createdAt)}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setActiveModalClaim(claim)}
                            className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold uppercase tracking-wider text-[#101D36] hover:bg-[#F7F5EF] transition flex items-center gap-1.5 shadow-2xs self-start cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#8999AE]" />
                            <span>View Claim Timeline</span>
                          </button>
                        </div>

                        {/* Visual 3-Stage Progress Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white border border-[#E5E7EB] rounded-2xl text-xs shadow-2xs">
                          <div className="p-2 space-y-0.5">
                            <span className="text-[10px] font-mono uppercase text-[#8999AE] block">Level 1: Finder</span>
                            <span className="font-bold flex items-center gap-1">
                              {claim.status === CLAIM_STATUSES.PENDING_FINDER_REVIEW ? (
                                <span className="text-amber-700">⏳ Under Evaluation</span>
                              ) : claim.status === CLAIM_STATUSES.FINDER_REJECTED ? (
                                <span className="text-rose-700">✗ Finder Rejected</span>
                              ) : (
                                <span className="text-emerald-700">✓ Finder Approved</span>
                              )}
                            </span>
                          </div>

                          <div className="p-2 space-y-0.5 border-t sm:border-t-0 sm:border-l border-gray-100">
                            <span className="text-[10px] font-mono uppercase text-[#8999AE] block">Level 2: Administrator</span>
                            <span className="font-bold flex items-center gap-1">
                              {claim.status === CLAIM_STATUSES.PENDING_ADMIN_REVIEW || claim.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED ? (
                                <span className="text-indigo-700">⏳ Administrative Review</span>
                              ) : claim.status === CLAIM_STATUSES.ADMIN_REJECTED ? (
                                <span className="text-rose-700">✗ Admin Rejected</span>
                              ) : claim.status === CLAIM_STATUSES.ADMIN_APPROVED || claim.status === CLAIM_STATUSES.HANDOVER_IN_PROGRESS || claim.status === CLAIM_STATUSES.COMPLETED ? (
                                <span className="text-emerald-700">✓ Admin Seal Issued</span>
                              ) : (
                                <span className="text-[#8999AE]">Awaiting Finder</span>
                              )}
                            </span>
                          </div>

                          <div className="p-2 space-y-0.5 border-t sm:border-t-0 sm:border-l border-gray-100">
                            <span className="text-[10px] font-mono uppercase text-[#8999AE] block">Level 3: Custody Handover</span>
                            <span className="font-bold flex items-center gap-1">
                              {claim.status === CLAIM_STATUSES.COMPLETED ? (
                                <span className="text-teal-700">✓ Returned to You</span>
                              ) : canConfirmReceived ? (
                                <span className="text-emerald-700 font-semibold animate-pulse">🤝 Ready for Pickup</span>
                              ) : (
                                <span className="text-[#8999AE]">Pending Approvals</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Review Comments / Dispute Action */}
                        {claim.status === CLAIM_STATUSES.FINDER_REJECTED && (
                          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-xs text-rose-950 space-y-1">
                              <strong className="block font-bold">Finder Rejection Reason:</strong>
                              <p className="italic text-rose-900">&ldquo;{claim.finderRejectionReason}&rdquo;</p>
                            </div>
                            <button
                              onClick={() => setActiveModalClaim(claim)}
                              className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-purple-800 transition whitespace-nowrap shadow-xs cursor-pointer"
                            >
                              Dispute: Request Admin Review
                            </button>
                          </div>
                        )}

                        {/* Handover Confirmation Callout */}
                        {canConfirmReceived && (
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-xs text-emerald-950">
                              <strong className="block font-bold">Admin Approved! Handover Ready.</strong>
                              <span>Please confirm here as soon as you have physically received the item from the finder.</span>
                            </div>
                            <button
                              onClick={() => handleQuickHandoverConfirm(claim.id, 'claimant')}
                              className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-emerald-800 transition whitespace-nowrap shadow-xs cursor-pointer"
                            >
                              Confirm Received
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: INCOMING CLAIMS (Finder Review) */}
            {activeTab === 'incoming' && (
              <div className="divide-y divide-gray-100">
                <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between text-xs">
                  <div className="text-amber-900">
                    <span className="font-bold">Finder Role:</span> You physically hold these items. Verify claimant credentials before handover.
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-800">{incomingClaims.length} Claims Total</span>
                </div>

                {incomingClaims.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto">
                      <Inbox className="w-7 h-7 opacity-70" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-serif text-lg font-bold text-[#101D36]">No Incoming Claims</h3>
                      <p className="text-xs text-[#8999AE] max-w-sm mx-auto leading-relaxed">
                        When someone files a claim against an item you found, you will review their credentials here.
                      </p>
                    </div>
                  </div>
                ) : (
                  incomingClaims.map((claim) => {
                    const claimedItem = items.find((i) => i.id === claim.itemId);
                    const isPendingFinder = claim.status === CLAIM_STATUSES.PENDING_FINDER_REVIEW;
                    const canConfirmHandover =
                      (claim.status === CLAIM_STATUSES.ADMIN_APPROVED || claim.status === CLAIM_STATUSES.HANDOVER_IN_PROGRESS) &&
                      !claim.finderHandoverConfirmed;

                    return (
                      <div key={claim.id} className="p-5 sm:p-6 space-y-3.5 hover:bg-[#F7F5EF]/30 transition">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-[#101D36]">#{claim.id}</span>
                              <Badge variant={claim.status}>{claim.status}</Badge>
                            </div>
                            <h3 className="font-serif text-lg font-bold text-[#101D36] mt-1">
                              {claimedItem?.name || 'Found Item'}
                            </h3>
                            <p className="text-xs text-[#8999AE]">
                              Claimant: <strong className="text-[#101D36]">{claim.claimerName}</strong> ({claim.claimerEmail}) &bull; Filed {timeAgo(claim.createdAt)}
                            </p>
                          </div>

                          <button
                            onClick={() => setActiveModalClaim(claim)}
                            className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold uppercase tracking-wider text-[#101D36] hover:bg-[#F7F5EF] transition flex items-center gap-1.5 shadow-2xs self-start cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#8999AE]" />
                            <span>Review Full Claim</span>
                          </button>
                        </div>

                        {/* Grounds snippet */}
                        <div className="p-3.5 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB] text-xs text-[#101D36]/80 space-y-1">
                          <span className="font-bold text-[#101D36] block">Claim Grounds:</span>
                          <p className="italic line-clamp-2">&ldquo;{claim.reason}&rdquo;</p>
                        </div>

                        {/* Quick action controls for Finder */}
                        {isPendingFinder && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleQuickFinderApprove(claim.id)}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Claim</span>
                            </button>
                            <button
                              onClick={() => setActiveModalClaim(claim)}
                              className="px-4 py-2 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-rose-50 transition cursor-pointer"
                            >
                              Reject with Reason
                            </button>
                          </div>
                        )}

                        {canConfirmHandover && (
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-xs text-emerald-900">
                              <strong className="block font-bold">Admin Approved! Handover Ready.</strong>
                              <span>Please confirm once you have physically handed the item over to {claim.claimerName}.</span>
                            </div>
                            <button
                              onClick={() => handleQuickHandoverConfirm(claim.id, 'finder')}
                              className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-emerald-800 transition whitespace-nowrap shadow-xs cursor-pointer"
                            >
                              Confirm Handover
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 4: SMART MATCHES */}
            {activeTab === 'matches' && (
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#101D36]">Heuristic Match Suggestions</h3>
                    <p className="text-xs text-[#8999AE]">Based on cross-correlations with your reported lost items.</p>
                  </div>
                  <Link
                    to="/matches"
                    className="text-xs font-semibold text-[#101D36] hover:underline flex items-center gap-1"
                  >
                    <span>Full Engine</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {myMatches.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto">
                      <Zap className="w-7 h-7 opacity-70" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-serif text-lg font-bold text-[#101D36]">No Potential Matches Found</h3>
                      <p className="text-xs text-[#8999AE] max-w-sm mx-auto leading-relaxed">
                        Our heuristic engine cross-checks new reports automatically. Any high-probability discoveries will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myMatches.map((match) => {
                      const lostItem = items.find((i) => i.id === match.lostItemId);
                      const foundItem = items.find((i) => i.id === match.foundItemId);
                      if (!lostItem || !foundItem) return null;

                      return (
                        <div
                          key={match.id}
                          className="p-5 rounded-2xl border border-[#E5E7EB] bg-white shadow-2xs space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                                {match.matchScore}% Correlation
                              </span>
                              <span className="text-xs font-mono text-[#8999AE]">#{match.id}</span>
                            </div>

                            <Link
                              to={`/items/${foundItem.id}`}
                              className="px-3.5 py-1.5 rounded-xl bg-[#101D36] text-[#F7F5EF] text-xs font-semibold hover:bg-[#172944] transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                            >
                              <span>View Found Item</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
                              <span className="text-[10px] font-mono uppercase text-rose-700 block font-bold">Your Lost Item</span>
                              <p className="text-xs font-bold text-[#101D36] mt-0.5">{lostItem.name}</p>
                              <p className="text-[11px] text-[#8999AE] mt-0.5">{lostItem.location}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
                              <span className="text-[10px] font-mono uppercase text-emerald-700 block font-bold">Discovered Found Item</span>
                              <p className="text-xs font-bold text-[#101D36] mt-0.5">{foundItem.name}</p>
                              <p className="text-[11px] text-[#8999AE] mt-0.5">{foundItem.location}</p>
                            </div>
                          </div>

                          {/* Why it matches */}
                          <div className="pt-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8999AE] block mb-1">
                              Match Justification &amp; Indicators
                            </span>
                            <ul className="space-y-1 text-xs text-[#101D36]/80 list-disc list-inside">
                              {match.reasons.map((reason, idx) => (
                                <li key={idx} className="leading-relaxed">
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols wide): Profile, Recent Activity & Guides */}
        <div className="lg:col-span-4 space-y-6">
          {/* User Profile Summary Card */}
          <div className="glass-card rounded-3xl border border-[#101D36]/10 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#101D36] text-[#F7F5EF] flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                {getInitials(currentUser.name) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-serif text-base font-bold text-[#101D36] truncate">{currentUser.name}</p>
                <p className="text-xs text-[#8999AE] truncate">{currentUser.email}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-[#8999AE]">Campus Affiliation</span>
                <span className="font-semibold text-[#101D36]">DSCE Bengaluru</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8999AE]">Registered Since</span>
                <span className="font-mono text-[#101D36]">Jan 2026</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8999AE]">Custody Clearance</span>
                <span className="font-mono font-bold text-emerald-700">Verified Member</span>
              </div>
            </div>
          </div>

          {/* 6. Recent Activity Chronological Timeline */}
          <div className="glass-card rounded-3xl border border-[#101D36]/10 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#101D36]" />
                <h3 className="font-serif text-base font-bold text-[#101D36]">Recent Activity</h3>
              </div>
              <span className="text-[10px] font-mono text-[#8999AE]">Chronological</span>
            </div>

            {activityTimeline.length === 0 ? (
              <p className="text-xs text-[#8999AE] text-center py-6">No recent account events logged.</p>
            ) : (
              <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB]">
                {activityTimeline.map((act) => (
                  <div key={act.id} className="relative group text-xs">
                    <div className="absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full bg-[#101D36] ring-4 ring-white" />
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[#101D36]">{act.title}</span>
                        <span className="text-[10px] font-mono text-[#8999AE]">{timeAgo(act.timestamp)}</span>
                      </div>
                      <p className="text-[#8999AE] mt-0.5">{act.itemName}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-2 py-0.2 rounded border ${act.badgeColor}`}>
                          {act.badge}
                        </span>
                        {act.link && (
                          <Link to={act.link} className="text-[10px] font-semibold text-[#101D36] hover:underline flex items-center gap-0.5">
                            <span>View</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Two-Level Verification Protocol Overview */}
          <div className="glass-card rounded-3xl border border-[#101D36]/10 shadow-xs p-6 space-y-4">
            <h4 className="text-xs uppercase font-mono tracking-widest font-semibold text-[#101D36] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Custody Verification
            </h4>
            <div className="space-y-3 text-xs text-[#8999AE]">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#101D36] text-white flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">1</span>
                <div>
                  <strong className="text-[#101D36] block">Confidential Filing</strong>
                  <span>Ownership details remain encrypted and private.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#101D36] text-white flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">2</span>
                <div>
                  <strong className="text-[#101D36] block">Finder Corroboration</strong>
                  <span>Finder validates physical traits and marks.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#101D36] text-white flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">3</span>
                <div>
                  <strong className="text-[#101D36] block">Admin Authorization</strong>
                  <span>Campus oversight reviews disputes and issues release seals.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#101D36] text-white flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">4</span>
                <div>
                  <strong className="text-[#101D36] block">Mutual Confirmation</strong>
                  <span>Both parties confirm handoff before record sealing.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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

      {/* Edit Report Modal */}
      {editingItem && (
        <EditReportModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEditedItem}
        />
      )}
    </div>
  );
}
