import { formatStatusLabel } from '../utils/helpers';

export default function Badge({ children, variant = 'default', size = 'sm' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
    lost: 'bg-red-50 text-red-700 border border-red-200',
    found: 'bg-green-50 text-green-700 border border-green-200',
    active: 'bg-blue-50 text-blue-700 border border-blue-200',
    claimed: 'bg-purple-50 text-purple-700 border border-purple-200',
    resolved: 'bg-gray-100 text-gray-700 border border-gray-200',
    returned: 'bg-teal-50 text-teal-800 border border-teal-200 font-semibold',
    
    // Claim workflow statuses
    PENDING_FINDER_REVIEW: 'bg-amber-50 text-amber-800 border border-amber-300 font-medium',
    FINDER_APPROVED: 'bg-sky-50 text-sky-800 border border-sky-300 font-medium',
    PENDING_ADMIN_REVIEW: 'bg-indigo-50 text-indigo-800 border border-indigo-300 font-medium',
    FINDER_REJECTED: 'bg-orange-50 text-orange-800 border border-orange-300 font-medium',
    ADMIN_REVIEW_REQUESTED: 'bg-purple-50 text-purple-800 border border-purple-300 font-semibold',
    ADMIN_APPROVED: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold',
    ADMIN_REJECTED: 'bg-red-50 text-red-800 border border-red-300 font-medium',
    HANDOVER_IN_PROGRESS: 'bg-blue-50 text-blue-800 border border-blue-300 font-semibold',
    COMPLETED: 'bg-green-50 text-green-800 border border-green-300 font-semibold',

    // Legacy fallbacks
    pending: 'bg-amber-100 text-amber-800 border border-amber-200',
    approved: 'bg-green-100 text-green-800 border border-green-200',
    rejected: 'bg-red-100 text-red-800 border border-red-200',
  };

  const sizes = {
    xs: 'text-xs px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const resolvedVariant = variants[variant] || variants[children] || variants.default;
  const displayLabel = typeof children === 'string' && children.includes('_')
    ? formatStatusLabel(children)
    : children;

  return (
    <span
      className={`inline-flex items-center rounded-full ${resolvedVariant} ${sizes[size]} whitespace-nowrap`}
    >
      {displayLabel}
    </span>
  );
}
