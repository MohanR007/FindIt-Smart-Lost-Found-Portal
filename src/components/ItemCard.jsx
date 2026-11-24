import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Tag, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export default function ItemCard({ item }) {
  const navigate = useNavigate();
  const isLost = item.type === 'lost';
  const isReturned = item.status === 'returned';
  const isClaimed = item.status === 'claimed';

  const categoryPills = {
    Electronics: 'bg-[#101D36]/5 text-[#101D36] border-[#101D36]/10',
    'Clothing & Accessories': 'bg-rose-50 text-rose-800 border-rose-100',
    'Bags & Wallets': 'bg-amber-50 text-amber-800 border-amber-100',
    Keys: 'bg-yellow-50 text-yellow-800 border-yellow-100',
    Jewelry: 'bg-orange-50 text-orange-800 border-orange-100',
    'Documents & ID': 'bg-sky-50 text-sky-800 border-sky-100',
    'Books & Stationery': 'bg-teal-50 text-teal-800 border-teal-100',
    'Sports & Fitness': 'bg-emerald-50 text-emerald-800 border-emerald-100',
    'Toys & Games': 'bg-cyan-50 text-cyan-800 border-cyan-100',
    Other: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const catStyle = categoryPills[item.category] || 'bg-gray-100 text-gray-700 border-gray-200';

  function handleCardClick(e) {
    // If the click originated from an interactive element like a link/button, do not duplicate
    if (e.target.closest('button, a')) {
      return;
    }
    navigate(`/items/${item.id}`);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/items/${item.id}`);
    }
  }

  return (
    <article
      tabIndex={0}
      role="button"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${item.name}`}
      className="group bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#101D36]/30 shadow-[0_2px_12px_rgba(16,29,54,0.04)] hover:shadow-[0_16px_36px_rgba(16,29,54,0.09)] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 select-none"
    >
      {/* Photographic View Container with Consistent Aspect Ratio */}
      <div className="relative h-52 w-full bg-stone-100 overflow-hidden shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F7F5EF] to-[#DCE5EF]/40 text-stone-400">
            <span className="text-4xl opacity-40">📦</span>
          </div>
        )}

        {/* Subtle Vignette Gradient for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101D36]/60 via-transparent to-black/20 pointer-events-none" />

        {/* Classification Type Pill Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider backdrop-blur-md border shadow-xs ${
              isLost
                ? 'bg-rose-950/85 text-rose-100 border-rose-400/40'
                : 'bg-emerald-950/85 text-emerald-100 border-emerald-400/40'
            }`}
          >
            {isLost ? 'Lost Property' : 'Found Property'}
          </span>
        </div>

        {/* Listing Status Badge */}
        <div className="absolute top-3 right-3">
          {isReturned ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider backdrop-blur-md bg-teal-950/90 text-teal-200 border border-teal-400/50 shadow-xs">
              <CheckCircle2 className="w-3 h-3 text-teal-400" />
              Returned
            </span>
          ) : isClaimed ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider backdrop-blur-md bg-purple-950/90 text-purple-200 border border-purple-400/50 shadow-xs">
              <Clock className="w-3 h-3 text-purple-300" />
              Claim Pending
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider backdrop-blur-md bg-black/40 text-white/90 border border-white/20 shadow-xs">
              Open
            </span>
          )}
        </div>

        {/* Hover Arrow Indicator */}
        <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all duration-200 text-[#101D36] shadow-sm pointer-events-none">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>

      {/* Card Content & Metadata */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Category & Date Metadata Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md border ${catStyle}`}>
              <Tag className="w-3 h-3" />
              {item.category}
            </span>
            <span className="text-[11px] text-[#8999AE] font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#8999AE]" />
              {formatDate(item.date)}
            </span>
          </div>

          {/* Title & Description with safe line clamps */}
          <h3 className="font-serif font-bold text-[#101D36] text-base group-hover:text-[#172944] transition-colors line-clamp-1 tracking-tight">
            {item.name}
          </h3>
          <p className="text-xs text-[#5A6A80] mt-1.5 line-clamp-2 leading-relaxed break-words">
            {item.description}
          </p>
        </div>

        {/* Card Footer: Location & Visual Action Cue */}
        <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#8999AE]">
          <span className="flex items-center gap-1.5 truncate max-w-[210px] text-xs">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#8999AE]" />
            <span className="truncate">{item.location}</span>
          </span>
          <span className="text-xs text-[#101D36] font-semibold group-hover:underline flex items-center gap-0.5 shrink-0">
            <span>Details</span>
            <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </article>
  );
}