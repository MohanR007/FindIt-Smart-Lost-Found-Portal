import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, CheckCircle, XCircle, Shield, AlertTriangle, Clock,
  ArrowRight, Lock, MapPin, Calendar, Check, MessageSquare
} from 'lucide-react';
import Badge from './Badge';
import { formatDateTime } from '../utils/helpers';
import { CLAIM_STATUSES } from '../data/mockData';

export default function ClaimDetailModal({
  claim,
  item,
  currentUser,
  onClose,
  onFinderApprove,
  onFinderReject,
  onRequestAdminReview,
  onAdminApprove,
  onAdminReject,
  onConfirmHandover,
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const [adminComment, setAdminComment] = useState('');
  const [showAdminAction, setShowAdminAction] = useState(null); // 'approve' | 'reject' | null

  const [finderApproveComment, setFinderApproveComment] = useState('');
  const [showFinderApproveForm, setShowFinderApproveForm] = useState(false);

  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!claim) return null;

  const isClaimant = currentUser?.id === claim.claimedBy;
  const isFinder = currentUser?.id === claim.finderId || currentUser?.id === item?.reportedBy;
  const isAdmin = currentUser?.role === 'admin';

  // Authorization check for private verification details:
  // Visible to Claimant (their own details), Finder (to verify), and Admin.
  const canViewPrivateDetails = isClaimant || isFinder || isAdmin;

  // Stepper calculations
  const getStepIndex = (status) => {
    switch (status) {
      case CLAIM_STATUSES.PENDING_FINDER_REVIEW:
        return 1;
      case CLAIM_STATUSES.FINDER_APPROVED:
      case CLAIM_STATUSES.PENDING_ADMIN_REVIEW:
      case CLAIM_STATUSES.FINDER_REJECTED:
      case CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED:
        return 2;
      case CLAIM_STATUSES.ADMIN_APPROVED:
      case CLAIM_STATUSES.ADMIN_REJECTED:
      case CLAIM_STATUSES.HANDOVER_IN_PROGRESS:
        return 3;
      case CLAIM_STATUSES.COMPLETED:
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = getStepIndex(claim.status);

  async function handleFinderApprove() {
    setActionError('');
    setIsProcessing(true);
    try {
      await onFinderApprove(claim.id, finderApproveComment, currentUser);
      setShowFinderApproveForm(false);
    } catch (err) {
      setActionError(err.message || 'Failed to approve claim.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleFinderReject() {
    if (!rejectReason.trim()) {
      setActionError('A rejection reason is mandatory.');
      return;
    }
    setActionError('');
    setIsProcessing(true);
    try {
      await onFinderReject(claim.id, rejectReason.trim(), currentUser);
      setShowRejectForm(false);
    } catch (err) {
      setActionError(err.message || 'Failed to reject claim.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRequestAdminReview() {
    if (!disputeReason.trim()) {
      setActionError('Please explain why you dispute this rejection.');
      return;
    }
    setActionError('');
    setIsProcessing(true);
    try {
      await onRequestAdminReview(claim.id, disputeReason.trim(), currentUser);
      setShowDisputeForm(false);
    } catch (err) {
      setActionError(err.message || 'Failed to request admin review.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAdminDecision(decision) {
    if (!adminComment.trim()) {
      setActionError('A review comment is mandatory for administrative decisions.');
      return;
    }
    setActionError('');
    setIsProcessing(true);
    try {
      if (decision === 'approve') {
        await onAdminApprove(claim.id, adminComment.trim(), currentUser);
      } else {
        await onAdminReject(claim.id, adminComment.trim(), currentUser);
      }
      setShowAdminAction(null);
    } catch (err) {
      setActionError(err.message || 'Failed to process admin review.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleHandover(role) {
    setActionError('');
    setIsProcessing(true);
    try {
      await onConfirmHandover(claim.id, role, currentUser);
    } catch (err) {
      setActionError(err.message || 'Failed to confirm handover.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101D36]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-[#101D36]/15 overflow-hidden my-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-[#F7F5EF] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#DCE5EF] bg-[#101D36] shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[#8999AE] uppercase">{claim.id}</span>
                <Badge variant={claim.status}>{claim.status}</Badge>
              </div>
              <h2 className="font-serif text-lg font-bold text-[#101D36] line-clamp-1 mt-0.5">{item?.name || 'Claim Details'}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8999AE] hover:text-[#101D36] hover:bg-gray-200/60 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action error banner */}
          {actionError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Stepper */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Claim Progress</p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { step: 1, label: '1. Submitted' },
                { step: 2, label: '2. Finder Review' },
                { step: 3, label: '3. Admin Review' },
                { step: 4, label: '4. Handover' },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition ${
                      currentStep > s.step || claim.status === CLAIM_STATUSES.COMPLETED
                        ? 'bg-green-600 text-white'
                        : currentStep === s.step
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > s.step || claim.status === CLAIM_STATUSES.COMPLETED ? <Check className="w-3.5 h-3.5" /> : s.step}
                  </div>
                  <span className={`text-[11px] leading-tight font-medium ${currentStep === s.step ? 'text-blue-900 font-bold' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Item details card */}
          {item && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start shadow-xs">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                    Found Item
                  </span>
                  <span className="text-xs text-gray-400 font-medium">· {item.category}</span>
                  <Badge variant={item.status}>{item.status}</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{item.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                  <Link to={`/items/${item.id}`} className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium">
                    View full report <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Parties overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Claimant (Owner applicant)</span>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{claim.claimerName}</p>
              <p className="text-xs text-gray-500">{claim.claimerEmail}</p>
            </div>
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Finder (Item custodian)</span>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{item?.reporterName || 'Finder'}</p>
              <p className="text-xs text-gray-500">Dayananda Sagar College of Engineering</p>
            </div>
          </div>

          {/* Claim reason & additional info */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" /> Claim Reason
              </h4>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {claim.reason}
              </div>
            </div>

            {/* Private verification details */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> Private Ownership Verification Details
              </h4>
              {canViewPrivateDetails ? (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-1">
                    <Lock className="w-3.5 h-3.5 text-amber-700" /> Confidential Proof
                    <span className="text-[11px] font-normal text-amber-700">(Visible to Claimant, Finder & Administrator only)</span>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-line font-mono bg-white/60 p-2.5 rounded-lg border border-amber-200/60">
                    {claim.verificationDetails}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  Private verification details are protected and only accessible by authorized reviewers.
                </div>
              )}
            </div>

            {claim.additionalInfo && (
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Additional Information</h4>
                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">{claim.additionalInfo}</p>
              </div>
            )}
          </div>

          {/* Conditional Workflow Action Boxes */}

          {/* 1. Finder Rejection & Dispute Box */}
          {claim.status === CLAIM_STATUSES.FINDER_REJECTED && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-orange-950">Claim Rejected by Finder</h4>
                  <p className="text-xs text-orange-800 mt-1">
                    <strong>Reason given:</strong> {claim.finderRejectionReason}
                  </p>
                </div>
              </div>

              {/* If claimant is viewing, allow requesting Admin Review */}
              {isClaimant && (
                <div className="pt-2 border-t border-orange-200">
                  {!showDisputeForm ? (
                    <button
                      onClick={() => setShowDisputeForm(true)}
                      className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-semibold hover:bg-purple-800 transition"
                    >
                      Dispute Decision: Request Administrator Review
                    </button>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <label className="block text-xs font-semibold text-purple-900">
                        Explain why you dispute this rejection (provide additional ID / proof):
                      </label>
                      <textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        rows={3}
                        placeholder="Provide additional corroborating evidence or clarify misunderstood details..."
                        className="w-full text-xs p-2.5 border border-purple-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleRequestAdminReview}
                          disabled={isProcessing}
                          className="px-4 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-semibold hover:bg-purple-800 transition disabled:opacity-60"
                        >
                          Submit Dispute to Admin
                        </button>
                        <button
                          onClick={() => setShowDisputeForm(false)}
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. Dispute Pending Admin Review Box */}
          {claim.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-purple-950">Disputed Claim Under Administrator Review</h4>
                  <p className="text-xs text-purple-800 mt-1">
                    <strong>Finder's initial rejection:</strong> {claim.finderRejectionReason}
                  </p>
                  <p className="text-xs text-purple-900 mt-1">
                    <strong>Claimant dispute explanation:</strong> {claim.disputeReason}
                  </p>
                  <p className="text-[11px] text-purple-700 mt-2 italic">
                    The portal administrator will review all submissions and may override the finder's rejection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Handover Section (Admin Approved or Handover in Progress) */}
          {(claim.status === CLAIM_STATUSES.ADMIN_APPROVED ||
            claim.status === CLAIM_STATUSES.HANDOVER_IN_PROGRESS ||
            claim.status === CLAIM_STATUSES.COMPLETED) && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {claim.status === CLAIM_STATUSES.COMPLETED
                      ? 'Handover Completed & Item Returned'
                      : 'Physical Handover Verification'}
                  </h4>
                  {claim.adminReviewComment && (
                    <p className="text-xs text-emerald-800 mt-1">
                      <strong>Admin approval notes:</strong> {claim.adminReviewComment}
                    </p>
                  )}
                </div>
                <Badge variant={claim.status}>{claim.status}</Badge>
              </div>

              {/* Handover checklists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className={`p-3 rounded-xl border text-xs ${claim.finderHandoverConfirmed ? 'bg-white border-green-300 text-green-900' : 'bg-white/70 border-gray-200 text-gray-700'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">Finder Confirmation:</span>
                    {claim.finderHandoverConfirmed ? (
                      <span className="text-xs font-bold text-green-700 flex items-center gap-0.5">
                        <Check className="w-3.5 h-3.5" /> Confirmed
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-medium">Pending</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">Finder verifies item has been handed over.</p>
                  {isFinder && !claim.finderHandoverConfirmed && claim.status !== CLAIM_STATUSES.COMPLETED && (
                    <button
                      onClick={() => handleHandover('finder')}
                      disabled={isProcessing}
                      className="mt-2.5 w-full py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition shadow-xs disabled:opacity-60"
                    >
                      Confirm I Handed Over Item
                    </button>
                  )}
                </div>

                <div className={`p-3 rounded-xl border text-xs ${claim.claimantHandoverConfirmed ? 'bg-white border-green-300 text-green-900' : 'bg-white/70 border-gray-200 text-gray-700'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">Claimant Confirmation:</span>
                    {claim.claimantHandoverConfirmed ? (
                      <span className="text-xs font-bold text-green-700 flex items-center gap-0.5">
                        <Check className="w-3.5 h-3.5" /> Confirmed
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-medium">Pending</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">Claimant verifies item has been safely received.</p>
                  {isClaimant && !claim.claimantHandoverConfirmed && claim.status !== CLAIM_STATUSES.COMPLETED && (
                    <button
                      onClick={() => handleHandover('claimant')}
                      disabled={isProcessing}
                      className="mt-2.5 w-full py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition shadow-xs disabled:opacity-60"
                    >
                      Confirm I Received My Item
                    </button>
                  )}
                </div>
              </div>

              {claim.status === CLAIM_STATUSES.COMPLETED && (
                <div className="p-3 bg-green-100/70 border border-green-300 rounded-lg text-xs text-green-900 font-medium">
                  🎉 Reunited! Both parties have confirmed handover. This item has officially been marked as <strong>RETURNED</strong>.
                </div>
              )}
            </div>
          )}

          {/* 4. Admin Rejection Box */}
          {claim.status === CLAIM_STATUSES.ADMIN_REJECTED && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <h4 className="text-sm font-bold text-red-950 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-600" /> Final Decision: Rejected by Administrator
              </h4>
              <p className="text-xs text-red-800 mt-1">
                <strong>Review notes:</strong> {claim.adminReviewComment}
              </p>
            </div>
          )}

          {/* Interactive Role Actions */}

          {/* Finder Review Form (when PENDING_FINDER_REVIEW) */}
          {isFinder && claim.status === CLAIM_STATUSES.PENDING_FINDER_REVIEW && (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">Finder Action Required</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Review the claimant's explanation and private verification proof above. Does this match the item you found?
              </p>

              {!showRejectForm && !showFinderApproveForm ? (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowFinderApproveForm(true)}
                    className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition"
                  >
                    Approve Claim (Forward to Admin)
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition"
                  >
                    Reject Claim
                  </button>
                </div>
              ) : showFinderApproveForm ? (
                <div className="space-y-2 pt-2 border-t border-blue-200">
                  <label className="block text-xs font-semibold text-gray-700">Optional approval note:</label>
                  <input
                    type="text"
                    value={finderApproveComment}
                    onChange={(e) => setFinderApproveComment(e.target.value)}
                    placeholder="e.g. Verification proof matches unique markings observed..."
                    className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleFinderApprove}
                      disabled={isProcessing}
                      className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-60"
                    >
                      Confirm Approval
                    </button>
                    <button
                      onClick={() => setShowFinderApproveForm(false)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-100"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-blue-200">
                  <label className="block text-xs font-semibold text-red-900">
                    Mandatory Rejection Reason: *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="State clearly why the description does not match the item..."
                    className="w-full text-xs p-2.5 border border-red-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleFinderReject}
                      disabled={isProcessing}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-100"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Review Action (when PENDING_ADMIN_REVIEW or ADMIN_REVIEW_REQUESTED) */}
          {isAdmin && (claim.status === CLAIM_STATUSES.PENDING_ADMIN_REVIEW || claim.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED) && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" /> Administrative Review & Final Authorization
                </h4>
                {claim.status === CLAIM_STATUSES.ADMIN_REVIEW_REQUESTED && (
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    Dispute Override Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                As portal administrator, verify private serial numbers, invoices, or dispute arguments. Admin approval is required for final handover authorization.
              </p>

              {!showAdminAction ? (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowAdminAction('approve')}
                    className="flex-1 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition"
                  >
                    Authorize Claim (Admin Approve)
                  </button>
                  <button
                    onClick={() => setShowAdminAction('reject')}
                    className="flex-1 py-2 bg-red-700 text-white rounded-xl text-xs font-semibold hover:bg-red-800 transition"
                  >
                    Reject Claim (Admin Reject)
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-indigo-200">
                  <label className="block text-xs font-semibold text-gray-800">
                    Mandatory Administrator Review Comment: *
                  </label>
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    rows={3}
                    placeholder={`Provide clear justification for ${showAdminAction === 'approve' ? 'approving' : 'rejecting'} this claim...`}
                    className="w-full text-xs p-2.5 border border-indigo-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAdminDecision(showAdminAction)}
                      disabled={isProcessing}
                      className={`px-4 py-1.5 text-white rounded-lg text-xs font-semibold disabled:opacity-60 ${
                        showAdminAction === 'approve' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'
                      }`}
                    >
                      {showAdminAction === 'approve' ? 'Confirm Admin Approval' : 'Confirm Admin Rejection'}
                    </button>
                    <button
                      onClick={() => setShowAdminAction(null)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Claim Activity History / Audit Trail */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" /> Claim Activity History ({claim.history?.length || 0})
            </h4>
            <div className="space-y-3 pl-2 border-l-2 border-gray-200 ml-2">
              {(claim.history || []).map((h) => (
                <div key={h.id || h.timestamp} className="relative pl-4 text-xs">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{h.action}</span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded-md bg-gray-100 text-gray-600">
                      {h.role}
                    </span>
                    <span className="text-gray-400">by {h.performedBy}</span>
                    <span className="text-gray-400 ml-auto">{formatDateTime(h.timestamp)}</span>
                  </div>
                  {h.comment && (
                    <p className="text-gray-600 mt-1 bg-gray-50/80 p-2 rounded-lg border border-gray-100 leading-relaxed">
                      {h.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
