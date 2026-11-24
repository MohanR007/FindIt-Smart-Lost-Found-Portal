// Shared utility helpers
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateStr);
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function filterItems(items, { query = '', category = '', type = '' }) {
  return items.filter((item) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      (item.tags || []).some((t) => t.includes(q));
    const catLower = category.toLowerCase();
    const itemCatLower = (item.category || '').toLowerCase();
    const matchesCategory =
      !category ||
      item.category === category ||
      itemCatLower.includes(catLower) ||
      catLower.includes(itemCatLower);
    const matchesType = !type || item.type === type;
    return matchesQuery && matchesCategory && matchesType;
  });
}

export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-700 border border-green-200';
    case 'claimed': return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'resolved': return 'bg-gray-100 text-gray-600 border border-gray-200';
    case 'returned': return 'bg-teal-100 text-teal-800 border border-teal-200';
    default: return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
}

export function formatStatusLabel(status = '') {
  const map = {
    PENDING_FINDER_REVIEW: 'Pending Finder Review',
    FINDER_APPROVED: 'Finder Approved',
    PENDING_ADMIN_REVIEW: 'Pending Admin Review',
    FINDER_REJECTED: 'Finder Rejected',
    ADMIN_REVIEW_REQUESTED: 'Dispute: Admin Review Requested',
    ADMIN_APPROVED: 'Admin Approved (Ready for Handover)',
    ADMIN_REJECTED: 'Admin Rejected',
    HANDOVER_IN_PROGRESS: 'Handover In Progress',
    COMPLETED: 'Completed (Item Returned)',
    active: 'Active',
    claimed: 'Claimed',
    resolved: 'Resolved',
    returned: 'Returned to Owner',
  };
  return map[status] || status.replace(/_/g, ' ');
}

export function getClaimStatusColor(status) {
  switch (status) {
    case 'PENDING_FINDER_REVIEW':
      return 'bg-amber-50 text-amber-800 border border-amber-300';
    case 'FINDER_APPROVED':
      return 'bg-sky-50 text-sky-800 border border-sky-300';
    case 'PENDING_ADMIN_REVIEW':
      return 'bg-indigo-50 text-indigo-800 border border-indigo-300';
    case 'FINDER_REJECTED':
      return 'bg-orange-50 text-orange-800 border border-orange-300';
    case 'ADMIN_REVIEW_REQUESTED':
      return 'bg-purple-50 text-purple-800 border border-purple-300';
    case 'ADMIN_APPROVED':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-300';
    case 'ADMIN_REJECTED':
      return 'bg-red-50 text-red-800 border border-red-300';
    case 'HANDOVER_IN_PROGRESS':
      return 'bg-blue-50 text-blue-800 border border-blue-300';
    case 'COMPLETED':
      return 'bg-green-50 text-green-800 border border-green-300';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
}

export function getMatchScoreColor(score) {
  if (score >= 90) return 'text-green-600 bg-green-50';
  if (score >= 75) return 'text-blue-600 bg-blue-50';
  return 'text-amber-600 bg-amber-50';
}
