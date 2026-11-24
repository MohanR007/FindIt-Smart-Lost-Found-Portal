import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Calendar, Tag, ArrowLeft,
  CheckCircle, Loader2, X, Share2, Check, Lock, AlertCircle, Info,
  ExternalLink, ShieldCheck, Compass, ChevronRight, Maximize2,
  ChevronLeft, Copy, FileText, UserCheck, Edit3
} from 'lucide-react';
import { useItems } from '../context/ItemsContext';
import { useAuth } from '../context/AuthContext';
import ItemCard from '../components/ItemCard';
import Badge from '../components/Badge';
import ClaimDetailModal from '../components/ClaimDetailModal';
import { formatDate, timeAgo, getInitials } from '../utils/helpers';
import { CLAIM_STATUSES, CATEGORIES, LOCATIONS } from '../data/mockData';

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    getItemById,
    items,
    updateItem,
    submitClaim,
    claims,
    finderApproveClaim,
    finderRejectClaim,
    requestAdminReview,
    adminApproveClaim,
    adminRejectClaim,
    confirmHandover,
  } = useItems();

  const item = getItemById(id);

  // Gallery state
  const imageList = item?.images && item.images.length > 0
    ? item.images
    : (item?.image ? [item.image] : []);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Edit listing state for item reporter
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    location: '',
    description: '',
    status: 'active',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Claim form state
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({
    reason: '',
    verificationDetails: '',
    additionalInfo: '',
  });
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeModalClaim, setActiveModalClaim] = useState(null);

  // Handle keyboard events for lightbox
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight' && imageList.length > 1) {
        setSelectedImageIndex((prev) => (prev + 1) % imageList.length);
      } else if (e.key === 'ArrowLeft' && imageList.length > 1) {
        setSelectedImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, imageList.length]);

  if (!item) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#DCE5EF]/50 text-[#101D36] flex items-center justify-center mx-auto mb-4 border border-[#101D36]/10">
          <Compass className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#101D36] mb-2">Listing Not Found</h2>
        <p className="text-sm text-[#8999AE] mb-6">This catalog record may have expired, resolved, or been relocated.</p>
        <button
          onClick={() => navigate('/browse')}
          className="px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-[#F7F5EF] bg-[#101D36] hover:bg-[#172944] transition cursor-pointer shadow-xs"
        >
          Browse Active Catalog
        </button>
      </div>
    );
  }

  // Similar items (3 to 4 related listings, excluding current item)
  const similarItems = items
    .filter((i) => i.id !== item.id && (i.category === item.category || i.location === item.location))
    .slice(0, 4);

  const isLost = item.type === 'lost';
  const isOwner = currentUser && currentUser.id === item.reportedBy;
  const isReturned = item.status === 'returned';

  // Check if current user already has an active claim
  const existingClaim = claims.find(
    (c) =>
      c.itemId === item.id &&
      c.claimedBy === currentUser?.id &&
      c.status !== CLAIM_STATUSES.ADMIN_REJECTED
  );

  const activeImage = imageList[selectedImageIndex] || imageList[0] || null;

  async function handleClaimSubmit(e) {
    e.preventDefault();
    if (!claimForm.reason.trim() || claimForm.reason.trim().length < 10) {
      setClaimError('Please provide a substantive reason for claiming (at least 10 characters).');
      return;
    }
    if (!claimForm.verificationDetails.trim() || claimForm.verificationDetails.trim().length < 10) {
      setClaimError('Please provide private verification details (at least 10 characters) so the finder and administrator can verify ownership.');
      return;
    }

    setIsSubmitting(true);
    setClaimError('');
    try {
      const newClaim = await submitClaim({
        itemId: item.id,
        claimedBy: currentUser.id,
        claimerName: currentUser.name,
        claimerEmail: currentUser.email,
        reason: claimForm.reason,
        verificationDetails: claimForm.verificationDetails,
        additionalInfo: claimForm.additionalInfo,
      });
      setClaimSuccess(true);
      setShowClaimForm(false);
      setActiveModalClaim(newClaim);
    } catch (err) {
      setClaimError(err.message || 'Failed to submit claim.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  function handleCopyId() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(item.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* 1. Breadcrumb and Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#101D36]/10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-[#8999AE]">
          <Link
            to="/"
            className="hover:text-[#101D36] transition-colors focus:outline-none focus:underline"
          >
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8999AE]/60" />
          <Link
            to="/browse"
            className="hover:text-[#101D36] transition-colors focus:outline-none focus:underline"
          >
            Browse Items
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8999AE]/60" />
          <span className="text-[#101D36] font-semibold truncate max-w-[200px] sm:max-w-xs">
            {item.name}
          </span>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-[#101D36] text-xs font-semibold hover:bg-[#F7F5EF] transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Browse</span>
          </Link>

          <button
            onClick={handleCopyLink}
            aria-label="Share listing link"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-[#101D36] text-xs font-semibold hover:bg-[#F7F5EF] transition shadow-2xs cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#8999AE]" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Image Gallery & Secondary Registry Metadata */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Visual Display (No ID badge over image per user requirements) */}
          <div className="relative rounded-3xl overflow-hidden border border-[#101D36]/10 bg-[#101D36] shadow-sm group">
            <div className="relative aspect-4/3 sm:aspect-16/11 w-full overflow-hidden bg-[#172944]">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-102 cursor-pointer"
                  onClick={() => setIsLightboxOpen(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#DCE5EF] p-8 text-center">
                  <Compass className="w-16 h-16 opacity-30 mb-3" />
                  <p className="text-sm font-medium text-[#DCE5EF]/70">No photograph provided for this listing</p>
                  <p className="text-xs text-[#8999AE] mt-1">Please refer to the written characteristics and location details.</p>
                </div>
              )}

              {/* Status pill on top-left of image */}
              <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md ${
                    isLost ? 'bg-rose-500/90' : 'bg-emerald-600/90'
                  }`}
                >
                  {isLost ? 'Lost Property' : 'Found Property'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium tracking-wide bg-white/90 text-[#101D36] backdrop-blur-md shadow-xs">
                  {item.category}
                </span>
              </div>

              {/* Returned pill on top-right of image */}
              {item.status === 'returned' && (
                <div className="absolute top-4 right-4 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-teal-600 text-white shadow-md flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Returned to Owner
                </div>
              )}

              {/* Enlarge Button in bottom-right corner */}
              {activeImage && (
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#101D36] text-xs font-medium shadow-md backdrop-blur-md transition-all cursor-pointer hover:shadow-lg"
                  aria-label="View enlarged image"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>View Larger</span>
                </button>
              )}
            </div>
          </div>

          {/* Thumbnail Gallery (when multiple images exist) */}
          {imageList.length > 1 && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8999AE] block">
                Item Perspectives ({imageList.length} Photos)
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {imageList.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`Select photo ${index + 1}`}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 transition-all border-2 cursor-pointer ${
                      selectedImageIndex === index
                        ? 'border-[#101D36] ring-2 ring-[#101D36]/20 shadow-sm scale-102'
                        : 'border-[#E5E7EB] opacity-70 hover:opacity-100 hover:border-[#8999AE]'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${item.name} angle ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedImageIndex === index && (
                      <div className="absolute inset-0 bg-[#101D36]/10 pointer-events-none" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Secondary Information Section: Registry Reference & Custody Record (Placed here instead of over image) */}
          <div className="glass-card rounded-2xl border border-[#101D36]/10 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8999AE]" />
                <span className="text-xs font-mono uppercase tracking-widest text-[#8999AE]">Registry Record</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#101D36] bg-[#F7F5EF] px-2.5 py-1 rounded-md border border-[#E5E7EB]">
                  #{item.id}
                </span>
                <button
                  onClick={handleCopyId}
                  title="Copy Reference ID"
                  className="p-1 rounded-md text-[#8999AE] hover:text-[#101D36] hover:bg-gray-100 transition cursor-pointer"
                  aria-label="Copy Item ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#101D36] text-[#F7F5EF] flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                  {getInitials(item.reporterName) || 'U'}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-[#8999AE]">Reported By</p>
                  <p className="text-xs font-bold text-[#101D36] mt-0.5">{item.reporterName || 'Campus Community'}</p>
                  <p className="text-[11px] text-[#8999AE] flex items-center gap-1 mt-0.5">
                    <UserCheck className="w-3 h-3 text-emerald-600" /> DSCE Verified Member
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center font-bold text-xs shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-[#8999AE]">Verification Protocol</p>
                  <p className="text-xs font-bold text-[#101D36] mt-0.5">Two-Level Custody Review</p>
                  <p className="text-[11px] text-[#8999AE] mt-0.5">Finder validation + Admin seal</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-[#8999AE]">
              <span>First recorded {timeAgo(item.createdAt)}</span>
              <span>Listing Status: <span className="font-semibold text-[#101D36] capitalize">{item.status}</span></span>
            </div>
          </div>
        </div>

        {/* Right Column: Item Information & Primary Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Item Information Card */}
          <div className="glass-card rounded-2xl border border-[#101D36]/10 shadow-xs p-6 sm:p-7 space-y-6">
            {/* Status and Category Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  isLost
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isLost ? 'Lost Property' : 'Found Property'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#DCE5EF]/50 text-[#101D36] border border-[#101D36]/10">
                {item.category}
              </span>
              <Badge variant={item.status}>{item.status}</Badge>
            </div>

            {/* Prominent Editorial Heading */}
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36] leading-tight tracking-tight">
                {item.name}
              </h1>
            </div>

            {/* Structured Location and Date Highlights */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-3 p-3 bg-white border border-[#E5E7EB] rounded-xl shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-[#8999AE]">Campus Location</p>
                  <p className="text-xs font-bold text-[#101D36] mt-0.5">{item.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white border border-[#E5E7EB] rounded-xl shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-[#8999AE]">
                    {isLost ? 'Incident Date' : 'Discovery Date'}
                  </p>
                  <p className="text-xs font-bold text-[#101D36] mt-0.5">{formatDate(item.date)}</p>
                </div>
              </div>
            </div>

            {/* Full Item Description */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h3 className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8999AE]">
                Detailed Description
              </h3>
              <p className="text-sm text-[#101D36]/85 leading-relaxed whitespace-pre-line font-normal">
                {item.description}
              </p>
            </div>

            {/* Semantic Characteristic Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8999AE] block">
                  Identifiable Characteristics
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-[#F7F5EF] border border-[#E5E7EB] text-[#101D36] rounded-md"
                    >
                      <Tag className="w-3 h-3 text-[#8999AE]" />
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Primary Actions Section */}
          {/* A. If Item is Returned: Custody Completed */}
          {isReturned && (
            <div className="p-6 rounded-2xl bg-teal-50 border border-teal-200 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-teal-950">
                <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Custody Completed &amp; Item Returned</span>
              </div>
              <p className="text-xs text-teal-800 leading-relaxed">
                Both the finder and verified claimant have confirmed physical handover. This listing has concluded and is closed to new claims.
              </p>
            </div>
          )}

          {/* B. If Current User is the Reporter / Owner */}
          {isOwner && !isReturned && (
            <div className="p-6 rounded-2xl bg-[#DCE5EF]/40 border border-[#DCE5EF] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#101D36]">
                <Info className="w-4 h-4 text-[#101D36] shrink-0" />
                <span>You are the registered reporter of this item</span>
              </div>
              <p className="text-xs text-[#8999AE] leading-relaxed">
                As the reporter, you cannot file claims against your own listing. You can inspect incoming claims or automated smart matches from your dashboard.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#101D36] text-[#F7F5EF] text-xs font-semibold hover:bg-[#172944] transition shadow-xs"
                >
                  <span>Open Dashboard Claims</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({
                      name: item.name || '',
                      category: item.category || '',
                      location: item.location || '',
                      description: item.description || '',
                      status: item.status || 'active',
                    });
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#101D36]/20 bg-white text-[#101D36] text-xs font-semibold hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#101D36]" />
                  <span>Edit Listing</span>
                </button>
              </div>
            </div>
          )}

          {/* C. Found Item: Claim Flow for Authenticated Non-Owner */}
          {!isOwner && !isReturned && item.type === 'found' && currentUser && (
            <div className="glass-card rounded-2xl border border-[#101D36]/10 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-serif text-lg font-bold text-[#101D36]">Claim Ownership</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Open for Claim
                </span>
              </div>

              <p className="text-xs text-[#8999AE] leading-relaxed">
                To safeguard student possessions, all claims undergo finder verification and administrator sign-off prior to physical handover.
              </p>

              {claimSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> Claim Submitted for Evaluation!
                  </div>
                  <p>Your claim is now in Level 1 review with the finder. You can monitor status changes in your dashboard.</p>
                </div>
              )}

              {existingClaim ? (
                <div className="p-4 bg-white border border-[#E5E7EB] rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-[#8999AE]">Your Active Claim:</span>
                    <Badge variant={existingClaim.status}>{existingClaim.status}</Badge>
                  </div>
                  <p className="text-xs text-[#101D36]/80 leading-relaxed">
                    You have an ongoing claim petition filed for this item.
                  </p>
                  <button
                    onClick={() => setActiveModalClaim(existingClaim)}
                    className="w-full py-2.5 bg-[#101D36] text-[#F7F5EF] rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#172944] transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Claim Workflow History</span>
                  </button>
                </div>
              ) : !showClaimForm ? (
                <button
                  onClick={() => setShowClaimForm(true)}
                  className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest text-[#F7F5EF] bg-[#101D36] hover:bg-[#172944] transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#DCE5EF]" />
                  <span>Claim This Item</span>
                </button>
              ) : (
                <form onSubmit={handleClaimSubmit} className="space-y-4 pt-2 border-t border-gray-100">
                  {claimError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{claimError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
                      Grounds for Claim *
                    </label>
                    <textarea
                      value={claimForm.reason}
                      onChange={(e) => setClaimForm({ ...claimForm, reason: e.target.value })}
                      rows={3}
                      placeholder="Explain when and where you lost it, and why this matches your belongings..."
                      className="w-full px-3.5 py-2.5 text-xs border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#101D36] flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        Private Verification Details *
                      </label>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        CONFIDENTIAL
                      </span>
                    </div>
                    <textarea
                      value={claimForm.verificationDetails}
                      onChange={(e) => setClaimForm({ ...claimForm, verificationDetails: e.target.value })}
                      rows={3}
                      placeholder="Provide confidential traits: passcode hint, lockscreen photo, internal markings, serial number, scratch locus, or receipts..."
                      className="w-full px-3.5 py-2.5 text-xs border border-amber-300 rounded-xl bg-amber-50/40 text-[#101D36] placeholder-amber-800/50 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                    />
                    <p className="text-[10px] text-[#8999AE] mt-1 font-mono">
                      🔒 Strictly confidential. Disclosed solely to the verified finder and campus administrative reviewer during custody validation.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
                      Handover Availability (Optional)
                    </label>
                    <input
                      type="text"
                      value={claimForm.additionalInfo}
                      onChange={(e) => setClaimForm({ ...claimForm, additionalInfo: e.target.value })}
                      placeholder="e.g. Can meet at CSE Dept office or Central Library entrance"
                      className="w-full px-3.5 py-2.5 text-xs border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36]"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-[#F7F5EF] bg-[#101D36] hover:bg-[#172944] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DCE5EF]" />}
                      <span>Submit Verified Claim</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClaimForm(false)}
                      className="px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#E5E7EB] text-[#8999AE] hover:text-[#101D36] bg-white hover:bg-gray-50 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* D. Lost Item: No Claim button! Show secondary action */}
          {!isOwner && !isReturned && item.type === 'lost' && (
            <div className="glass-card rounded-2xl border border-[#101D36]/10 shadow-xs p-6 space-y-3.5">
              <h3 className="font-serif text-lg font-bold text-[#101D36]">Did you find this property?</h3>
              <p className="text-xs text-[#8999AE] leading-relaxed">
                This listing is a lost alert posted by a campus member. If you have discovered or have possession of this item, register it as a Found Item to trigger instant smart matching and safe custody handover.
              </p>
              <Link
                to="/report?type=found"
                className="inline-flex items-center justify-center w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition shadow-xs"
              >
                Register as Found Property
              </Link>
            </div>
          )}

          {/* E. Guest Sign-In Callout */}
          {!currentUser && !isReturned && (
            <div className="glass-card rounded-2xl border border-[#101D36]/10 shadow-xs p-6 space-y-3.5">
              <h3 className="font-serif text-base font-bold text-[#101D36]">Campus Authentication Required</h3>
              <p className="text-xs text-[#8999AE] leading-relaxed">
                Sign in with your verified campus credentials to initiate an authenticated ownership claim or coordinate custody.
              </p>
              <Link
                to="/login"
                className="block w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-widest text-[#F7F5EF] bg-[#101D36] text-center hover:bg-[#172944] transition shadow-xs"
              >
                Sign In to File Claim
              </Link>
            </div>
          )}

          {/* 4. Trust & Security Indicator */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#101D36]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#101D36]">
                Two-Level Custody Assurance
              </h4>
            </div>
            <p className="text-xs text-[#8999AE] leading-relaxed">
              FindIt enforces strict dual-layer claim verification: initial corroboration by the finder followed by administrative governance. Private ownership evidence is encrypted and never made publicly visible.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Similar Items: "You May Also Be Looking For" */}
      {similarItems.length > 0 && (
        <div className="pt-12 border-t border-[#101D36]/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-[#8999AE]">Proximity &amp; Category Correlation</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#101D36] mt-1">
                You May Also Be Looking For
              </h2>
              <p className="text-xs sm:text-sm text-[#8999AE] mt-0.5">
                Related campus listings in {item.category} or nearby DSCE locations.
              </p>
            </div>

            <Link
              to="/browse"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#101D36] hover:text-[#172944] transition self-start sm:self-end"
            >
              <span>Explore all in {item.category}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {similarItems.map((si) => (
              <ItemCard key={si.id} item={si} />
            ))}
          </div>
        </div>
      )}

      {/* 6. Image Lightbox Modal */}
      {isLightboxOpen && activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image view"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Header Controls */}
          <div
            className="w-full max-w-5xl flex items-center justify-between pb-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-semibold">{item.name}</span>
              {imageList.length > 1 && (
                <span className="text-xs font-mono text-white/70 bg-white/10 px-2 py-0.5 rounded">
                  {selectedImageIndex + 1} of {imageList.length}
                </span>
              )}
            </div>

            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              aria-label="Close enlarged view"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Enlarged Image */}
          <div
            className="relative max-w-5xl max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage}
              alt={item.name}
              className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />

            {/* Previous Button */}
            {imageList.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
                }}
                className="absolute left-2 sm:-left-12 p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next Button */}
            {imageList.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) => (prev + 1) % imageList.length);
                }}
                className="absolute right-2 sm:-right-12 p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails inside Lightbox */}
          {imageList.length > 1 && (
            <div
              className="flex items-center gap-2 mt-4 overflow-x-auto p-2"
              onClick={(e) => e.stopPropagation()}
            >
              {imageList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx ? 'border-white scale-105' : 'border-white/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Listing Modal for Reporter */}
      {isEditing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#101D36]/10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-[#101D36]">Edit Listing #{item.id}</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg text-[#8999AE] hover:text-[#101D36] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editForm.name.trim() || !editForm.description.trim()) return;
                setIsSavingEdit(true);
                try {
                  await updateItem(item.id, {
                    name: editForm.name.trim(),
                    category: editForm.category,
                    location: editForm.location,
                    description: editForm.description.trim(),
                    status: editForm.status,
                  });
                  setIsEditing(false);
                } finally {
                  setIsSavingEdit(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Item Title</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
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
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
                  >
                    <option value="active">Active (Open)</option>
                    <option value="claimed">Claim Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Campus Location</label>
                <select
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#101D36] mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#8999AE] hover:text-[#101D36] hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-[#101D36] hover:bg-[#172944] text-white text-xs font-semibold uppercase tracking-wider transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Two-Level Claim Detail Modal */}
      {activeModalClaim && (
        <ClaimDetailModal
          claim={activeModalClaim}
          item={item}
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
    </div>
  );
}
